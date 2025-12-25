/**
 * Web Server for SaaS Agent GUI
 * Provides a web interface for managing the agent and database
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { AzureSQLConnector } = require('./index.js');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const sql = require('mssql');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { agentModules } = require('./agents-config');
const { buildAgentGraph, createCrmContactFromText } = require('./multi-agent');

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", function () {
  console.log("SaaS Agent Web UI started on port " + PORT);
});
app.set('trust proxy', true);

// File upload (binary) for ingestion APIs
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB per file
});

// Build in-memory multi-agent graph (supervisor + per-tab agents for each module)
const { moduleSupervisors } = buildAgentGraph(agentModules);

// mailer
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

// stripe
const stripe = process.env.STRIPE_SECRET ? new Stripe(process.env.STRIPE_SECRET) : null;

// Middleware
app.use(cors());
// Increase JSON body limit so data URL images (audit attachments, logos, etc.) don't fail
// with "request entity too large" when saving. Some auditor sheets can include
// multiple embedded images, so allow up to ~50 MB per request.
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Helpers for password hashing (Node built-in)
function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = crypto.scryptSync(password, salt, 64);
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(hash, testHash);
}

// JWT helpers
function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '7d' });
}
function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.cookies?.auth;
  if (!token) return res.status(401).json({ success: false, error: 'unauthorized' });
  try {
    const decoded = verifyToken(token);
    req.auth = decoded; // { uid, tid }
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'invalid token' });
  }
}

async function requireMembership(req, res, next) {
  // ensures req.params.tenantId belongs to req.auth.uid
  const tenantId = parseInt(req.params.tenantId || req.auth?.tid);
  if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const q = `SELECT 1 AS ok FROM dbo.CompanyUsers WHERE TenantId=@tid AND UserId=@uid`;
    const r = await connector.pool.request().input('tid', tenantId).input('uid', req.auth.uid).query(q);
    await connector.disconnect();
    if (r.recordset.length === 0) return res.status(403).json({ success: false, error: 'forbidden' });
    req.auth.tid = tenantId; // pin
    next();
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
}

function requirePerm(code) {
  return async function (req, res, next) {
    if (!req.auth?.uid || !req.auth?.tid) return res.status(401).json({ success: false, error: 'unauthorized' });
    try {
      const connector = new AzureSQLConnector();
      await connector.connect();
      const request = connector.pool.request();
      request.input('tid', req.auth.tid);
      request.input('uid', req.auth.uid);
      request.input('code', code);
      const result = await request.query('SELECT dbo.fn_HasPermission(@tid, @uid, @code) AS Allowed');
      await connector.disconnect();
      if (result.recordset[0].Allowed !== 1) return res.status(403).json({ success: false, error: 'permission denied' });
      next();
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  };
}

// Utility: determine redirect path from roles
async function determineRedirect(connectorOrNull, uid, tid){
  let connector = connectorOrNull;
  let created = false;
  try{
    if(!tid) return '/dashboard';
    // If no connector or the connector has not been connected yet, create+connect our own
    if(!connector || !connector.pool){ connector = new AzureSQLConnector(); await connector.connect(); created = true; }
    const r = await connector.pool.request()
      .input('uid', uid).input('tid', tid)
      .query('SELECT r.Name FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=@uid AND ur.TenantId=@tid');
    const names = r.recordset.map(x=> (x.Name||'').toLowerCase());
    const map = [
      ['safety officer','/masters/safety-office.html'],
      ['safety office','/masters/safety-office.html'],
      ['safety auditor','/masters/safety-auditor.html'],
      ['inspector','/masters/inspection.html'],
      ['inspection','/masters/inspection.html'],
      ['buyer','/masters/buyer.html'],
      ['supplier','/masters/supplier.html'],
      ['designer','/masters/designer.html'],
    ];
    for(const [needle, path] of map){ if(names.includes(needle)) { if(created) await connector.disconnect(); return path; } }
    if(created) await connector.disconnect();
    return '/dashboard';
  }catch{
    try{ if(created && connector) await connector.disconnect(); }catch{}
    return '/dashboard';
  }
}

// Auto-seed demo users if missing (dev convenience)
async function autoSeedDemoIfNeeded(){
  if(process.env.AUTO_SEED_DEMO === '0') return; // opt-out
  try{
    const connector = new AzureSQLConnector();
    await connector.connect();
    const hasOwner = await connector.pool.request().input('email','owner@demo.example').query('SELECT UserId FROM dbo.Users WHERE Email=@email');
    if(hasOwner.recordset.length===0){
      const { hash, salt } = (function(){ const crypto=require('crypto'); const s=crypto.randomBytes(16); const h=crypto.scryptSync('DemoPass123!', s, 64); return {hash:h, salt:s}; })();
      // Register owner + tenant
      const r = await connector.pool.request()
        .input('Email','owner@demo.example')
        .input('FullName','Demo Owner')
        .input('PasswordHash', hash)
        .input('PasswordSalt', salt)
        .input('BusinessTypeCode','Manufacturer')
        .input('TenantName','Demo Factory')
        .execute('sp_RegisterOwner');
      var tenantId = r.recordset?.[0]?.TenantId;
      // Create roles
      async function createRole(roleName, codes){ const tvp=new sql.Table('dbo.StringList'); tvp.columns.add('Value', sql.NVarChar(256)); (codes||[]).forEach(c=>tvp.rows.add(c)); await connector.pool.request().input('TenantId', tenantId).input('RoleName', roleName).input('PermissionCodes', tvp).execute('sp_CreateRole'); }
      await createRole('HR Manager',['MODULE_VIEW_HR','MODULE_MANAGE_HR','USER_MANAGE']);
      await createRole('Sales Manager',['MODULE_VIEW_CRM','MODULE_MANAGE_CRM']);
      await createRole('Buyer',['MODULE_VIEW_CRM']);
      await createRole('Supplier',['MODULE_VIEW_SUPPLIERS']);
      await createRole('Designer',['MODULE_VIEW_MARKETING']);
      await createRole('Safety Auditor',['MODULE_VIEW_CERTIFICATION']);
      await createRole('Safety Office',['MODULE_VIEW_CERTIFICATION','MODULE_VIEW_HR']);
      await createRole('Inspection',['MODULE_VIEW_CERTIFICATION']);
      // Employees with default password Welcome123!
      async function createEmp(email,fullName,title,role){ const crypto=require('crypto'); const s=crypto.randomBytes(16); const h=crypto.scryptSync('Welcome123!', s, 64); await connector.pool.request().input('TenantId', tenantId).input('Email', email).input('FullName', fullName).input('PasswordHash', h).input('PasswordSalt', s).input('RoleName', role).input('Title', title).execute('sp_CreateEmployee'); }
      await createEmp('hr@demo.example','Demo HR','HR Manager','HR Manager');
      await createEmp('sales@demo.example','Demo Sales','Sales Manager','Sales Manager');
      await createEmp('buyer@demo.example','Demo Buyer','Buyer','Buyer');
      await createEmp('supplier@demo.example','Demo Supplier','Supplier','Supplier');
      await createEmp('designer@demo.example','Demo Designer','Designer','Designer');
      await createEmp('auditor@demo.example','Demo Safety Auditor','Safety Auditor','Safety Auditor');
      await createEmp('safety@demo.example','Demo Safety Office','Safety Office','Safety Office');
      await createEmp('inspection@demo.example','Demo Inspection','Inspection','Inspection');
    }
    await connector.disconnect();
  }catch(e){ console.warn('Auto-seed skipped:', e.message); }
}

// Routes
app.get('/', (req, res) => {
  // If authenticated, serve the unified app shell; else go to login
  if (req.cookies && req.cookies.auth) {
    return res.sendFile(path.join(__dirname, '../public/app.html'));
  }
  return res.redirect('/login');
});

// Auth pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Owner dashboards and admin pages
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/employees', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/employees.html'));
});

app.get('/roles', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/roles.html'));
});

app.get('/support', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/support.html'));
});

app.get('/billing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/billing.html'));
});

// Master app shell
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app.html'));
});

// Alias for legacy link /profile.htm -> profile.html
app.get('/profile.htm', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

// Tracking middleware for API
app.use('/api', async (req, _res, next) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('TenantId', req.auth?.tid || null);
    request.input('UserId', req.auth?.uid || null);
    request.input('Path', req.path);
    request.input('Method', req.method);
    request.input('IP', req.ip);
    request.input('UserAgent', req.headers['user-agent'] || null);
    request.input('Referrer', req.headers['referer'] || null);
    await request.query(`INSERT INTO dbo.VisitorLogs(TenantId, UserId, Path, Method, IP, UserAgent, Referrer)
                         VALUES(@TenantId,@UserId,@Path,@Method,@IP,@UserAgent,@Referrer)`);
    await connector.disconnect();
  } catch (e) { /* ignore logging errors */ }
  next();
});

// API Routes

// Lightweight tasks API for planner (file-backed JSON store)
const fsPromises = require('fs').promises;
const TASKS_FILE = path.join(__dirname, '../database/tasks.json');
async function loadTasks(){ try{ const s = await fsPromises.readFile(TASKS_FILE, 'utf8'); return JSON.parse(s); }catch{ return []; } }
async function saveTasks(list){ try{ await fsPromises.mkdir(path.dirname(TASKS_FILE), { recursive:true }); await fsPromises.writeFile(TASKS_FILE, JSON.stringify(list, null, 2), 'utf8'); }catch{} }
app.get('/api/tasks', async (req, res)=>{
  try{
    const date = (req.query.date||'').toString();
    const all = await loadTasks();
    const rows = date ? all.filter(t=>t.date===date) : all;
    return res.json({ success:true, data: rows });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/tasks', async (req, res)=>{
  try{
    const p = req.body||{}; if(!p.date) return res.status(400).json({ success:false, error:'date required' });
    const all = await loadTasks();
    const id = 't_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
    const row = { id, title:p.title||'Task', date:p.date, assigneeId:parseInt(p.assigneeId)||1, startHour:parseInt(p.startHour)||0, endHour:parseInt(p.endHour)||1, priority:p.priority||'High', note:p.note||null };
    all.push(row); await saveTasks(all);
    return res.json({ success:true, id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/tasks/:id', async (req, res)=>{
  try{
    const id = (req.params.id||'').toString(); const p=req.body||{};
    const all = await loadTasks(); const idx = all.findIndex(x=>x.id===id); if(idx<0) return res.status(404).json({ success:false, error:'not found' });
    const t = all[idx]; Object.assign(t, { title: p.title??t.title, date: p.date??t.date, assigneeId: p.assigneeId!=null?parseInt(p.assigneeId):t.assigneeId, startHour: p.startHour!=null?parseInt(p.startHour):t.startHour, endHour: p.endHour!=null?parseInt(p.endHour):t.endHour, priority: p.priority??t.priority, note: p.note??t.note });
    await saveTasks(all); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/tasks/:id', async (req, res)=>{
  try{ const id=(req.params.id||'').toString(); const all=await loadTasks(); const next=all.filter(x=>x.id!==id); if(next.length===all.length) return res.status(404).json({ success:false, error:'not found' }); await saveTasks(next); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== MULTI-AGENT API ====================

// Helper: describe modules with synthetic agents (1 supervisor + per-tab agent)
function describeAgentModules() {
  return (agentModules || []).map(mod => {
    const moduleId = mod.id;
    const moduleName = mod.name || mod.id;
    const tabs = mod.tabs || [];
    const supervisorId = `${moduleId}_supervisor`;
    const agents = [
      {
        id: supervisorId,
        name: `${moduleName} Supervisor`,
        role: 'supervisor'
      },
      ...tabs.map(tab => ({
        id: `${moduleId}_${tab.id}_agent`,
        name: (tab.agentName || `${tab.name || tab.id} Agent`),
        role: 'tab',
        tabId: tab.id
      }))
    ];
    return {
      id: moduleId,
      name: moduleName,
      tabs,
      agents
    };
  });
}

// List all modules, their tabs and agents (used by front-end panels)
app.get('/api/agents/modules', requireAuth, (req, res) => {
  try {
    const modules = describeAgentModules();
    return res.json({ success: true, data: modules });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Chat endpoint: routes a message to the module supervisor, then to the tab agent
app.post('/api/agents/chat', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const moduleId = (body.moduleId || '').toString();
    const tabId = (body.tabId || '').toString();
    const message = (body.message || '').toString();

    if (!moduleId || !tabId || !message) {
      return res.status(400).json({ success: false, error: 'moduleId, tabId and message are required' });
    }

    const supervisor = moduleSupervisors.get(moduleId);
    if (!supervisor) {
      return res.status(404).json({ success: false, error: `Unknown module: ${moduleId}` });
    }

    const history = [
      { role: 'user', content: message }
    ];

    const context = {
      moduleId,
      tabId,
      userId: req.auth && req.auth.uid,
      tenantId: req.auth && req.auth.tid
    };

    const reply = await supervisor.handleMessage(history, context);
    return res.json({ success: true, data: reply });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/test-connection', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    
    const connector = new AzureSQLConnector();
    await connector.connect();
    
    const connectionTest = await connector.testConnection();
    const tables = await connector.getTableList();
    
    const server = process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net';
    
    await connector.disconnect();
    
    res.json({
      success: true,
      message: 'Connection successful!',
      data: {
        database: connectionTest.DatabaseName,
        server: server,
        connectionTime: connectionTest.CurrentTime,
        tables: tables.length,
        tableNames: tables.map(t => t.TABLE_NAME)
      }
    });
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    res.json({
      success: false,
      message: 'Connection failed',
      error: error.message
    });
  }
});

// Registration (Owner signup creates tenant)
app.post('/api/auth/register', async (req, res) => {
  const { 
    email, password, fullName, businessType, tenantName, termsAccepted, captchaToken,
    firstName, lastName, country, cellPhone, companyPhone, companyName, designation, registerAs
  } = req.body;
  
  // Use new fields if available, fall back to old fields for backward compatibility
  const finalEmail = email || req.body.companyEmail;
  const finalFullName = fullName || (firstName && lastName ? `${firstName} ${lastName}` : '');
  const finalTenantName = tenantName || companyName;
  const finalBusinessType = businessType || registerAs;
  
  if (!finalEmail || !password || !finalFullName || !finalBusinessType || !finalTenantName) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (!termsAccepted) {
    return res.status(400).json({ success: false, error: 'Please accept Terms & Conditions' });
  }

  // Verify reCAPTCHA if configured
  try {
    if (process.env.RECAPTCHA_SECRET) {
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET,
          response: captchaToken || '',
          remoteip: req.ip || ''
        }).toString()
      });
      const v = await verifyRes.json();
      if (!v.success) return res.status(400).json({ success: false, error: 'Captcha validation failed' });
    }
  } catch (e) { /* ignore if not configured */ }

  try {
    const connector = new AzureSQLConnector();
    await connector.connect();

    // Hash password on server side
    const { hash, salt } = hashPassword(password);

    // Execute registration stored procedure
    const request = connector.pool.request();
    request.input('Email', finalEmail);
    request.input('FullName', finalFullName);
    request.input('PasswordHash', hash);
    request.input('PasswordSalt', salt);
    request.input('BusinessTypeCode', finalBusinessType);
    request.input('TenantName', finalTenantName);

    const result = await request.execute('sp_RegisterOwner');
    
    // Store additional user information in a separate table if needed
    const userId = result.recordset?.[0]?.UserId;
    if (userId && (firstName || lastName || country || cellPhone || companyPhone || designation)) {
      try {
        // Update user with additional information if tables support it
        const updateRequest = connector.pool.request();
        updateRequest.input('UserId', userId);
        
        const updates = [];
        if (country) { updateRequest.input('Country', country); updates.push('Country = @Country'); }
        if (cellPhone) { updateRequest.input('CellPhone', cellPhone); updates.push('CellPhone = @CellPhone'); }
        if (companyPhone) { updateRequest.input('CompanyPhone', companyPhone); updates.push('CompanyPhone = @CompanyPhone'); }
        if (designation) { updateRequest.input('Designation', designation); updates.push('Designation = @Designation'); }
        
        if (updates.length > 0) {
          await updateRequest.query(`UPDATE dbo.Users SET ${updates.join(', ')} WHERE UserId = @UserId`);
        }
      } catch (updateError) {
        console.warn('⚠️ Could not save additional user information:', updateError.message);
        // Don't fail registration if additional info can't be saved
      }
    }

    // email verification token
    const token = crypto.randomBytes(24).toString('hex');
    const exp = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const ids = result.recordset?.[0];
    let emailSent = false;
    
    if (ids?.UserId) {
      await connector.pool.request()
        .input('uid', ids.UserId)
        .input('token', token)
        .input('exp', exp)
        .query('INSERT INTO dbo.EmailVerifications(UserId, Token, ExpiresAt) VALUES(@uid,@token,@exp)');
      
      if (transporter) {
        try {
          const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
          await transporter.sendMail({
            to: finalEmail,
            from: process.env.SMTP_FROM || 'noreply@complytex.com',
            subject: 'Verify your ComplytEX email',
            text: `Hello ${finalFullName}, please verify your email: ${verifyUrl}`,
            html: `<p>Hello ${finalFullName},</p><p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>`
          });
          emailSent = true;
          console.log('✅ Verification email sent to:', finalEmail);
        } catch (emailError) {
          console.error('❌ Failed to send verification email:', emailError.message);
        }
      } else {
        console.log('⚠️ No SMTP configuration found. Email verification disabled.');
        console.log('📧 Verification URL (for testing):', `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        
        // Auto-verify user since we can't send email
        await connector.pool.request().input('uid', ids.UserId).query('UPDATE dbo.Users SET EmailVerified=1 WHERE UserId=@uid');
        console.log('✅ User auto-verified due to missing SMTP configuration');
      }
    }

    await connector.disconnect();

    // Send appropriate response based on email status
    const responseData = result.recordset?.[0] || { message: 'Registered' };
    if (transporter) {
      responseData.message = emailSent ? 
        'Account created successfully! Please check your email to verify your account.' :
        'Account created successfully! However, we could not send the verification email. Please contact support.';
    } else {
      responseData.message = 'Account created and verified successfully! You can now log in.';
    }
    
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ success: true });
});

// Test SMTP configuration
app.post('/api/auth/test-smtp', async (req, res) => {
  if (!transporter) {
    return res.json({ success: false, error: 'SMTP not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS in .env file' });
  }
  
  try {
    const testEmail = req.body.email || 'test@example.com';
    await transporter.sendMail({
      to: testEmail,
      from: process.env.SMTP_FROM || 'noreply@complytex.com',
      subject: 'ComplytEX SMTP Test',
      text: 'This is a test email from ComplytEX. SMTP is working correctly!',
      html: '<p>This is a test email from ComplytEX.</p><p>✅ SMTP is working correctly!</p>'
    });
    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// Manual email verification (for development/testing)
app.post('/api/auth/manual-verify', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const result = await connector.pool.request()
      .input('email', email)
      .query('UPDATE dbo.Users SET EmailVerified=1 WHERE Email=@email; SELECT @@ROWCOUNT as Updated');
    await connector.disconnect();
    
    if (result.recordset[0].Updated > 0) {
      res.json({ success: true, message: `Email ${email} has been manually verified.` });
    } else {
      res.json({ success: false, error: 'User not found or already verified.' });
    }
  } catch (error) {
    console.error('❌ Manual verification failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify email
app.get('/api/auth/verify-email', async (req, res) => {
  const token = (req.query.token || '').toString();
  if (!token) return res.status(400).send('Invalid token');
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r = await connector.pool.request().input('token', token).query(`
      SELECT TOP 1 ev.TokenId, ev.UserId, ev.ExpiresAt, ev.Used FROM dbo.EmailVerifications ev WHERE ev.Token=@token`);
    if (r.recordset.length === 0) { await connector.disconnect(); return res.status(400).send('Invalid token'); }
    const row = r.recordset[0];
    if (row.Used || new Date(row.ExpiresAt) < new Date()) { await connector.disconnect(); return res.status(400).send('Token expired/used'); }
    await connector.pool.request().input('uid', row.UserId).query('UPDATE dbo.Users SET EmailVerified=1 WHERE UserId=@uid');
    await connector.pool.request().input('tid', row.TokenId).query('UPDATE dbo.EmailVerifications SET Used=1 WHERE TokenId=@tid');
    await connector.disconnect();
    res.send('Email verified successfully! You can now close this window and log in.');
  } catch (e) { 
    console.error('❌ Email verification failed:', e.message);
    res.status(500).send('Verification failed. Please contact support.'); 
  }
});

// Current user
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const u = await connector.pool.request().input('uid', req.auth.uid).query('SELECT UserId, Email, FullName, IsActive FROM dbo.Users WHERE UserId=@uid');
    await connector.disconnect();
    res.json({ success: true, data: { user: u.recordset[0], tenantId: req.auth.tid } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// List tenants for current user
app.get('/api/auth/tenants', requireAuth, async (req, res) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r = await connector.pool.request().input('uid', req.auth.uid).query(`
      SELECT t.TenantId, t.Name AS TenantName, bt.Code AS BusinessType
      FROM dbo.CompanyUsers cu
      JOIN dbo.Tenants t ON t.TenantId = cu.TenantId
      JOIN dbo.BusinessTypes bt ON bt.BusinessTypeId = t.BusinessTypeId
      WHERE cu.UserId = @uid AND cu.IsActive = 1
      ORDER BY cu.IsOwner DESC, t.Name`);
    await connector.disconnect();
    res.json({ success: true, data: r.recordset });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Switch tenant
app.post('/api/auth/switch-tenant', requireAuth, async (req, res) => {
  const { tenantId } = req.body || {};
  if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r = await connector.pool.request().input('tid', parseInt(tenantId)).input('uid', req.auth.uid).query('SELECT 1 AS ok FROM dbo.CompanyUsers WHERE TenantId=@tid AND UserId=@uid');
    await connector.disconnect();
    if (r.recordset.length === 0) return res.status(403).json({ success: false, error: 'forbidden' });
    const token = signToken({ uid: req.auth.uid, tid: parseInt(tenantId) });
    res.cookie('auth', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Demo helper to ensure a demo user exists (when AUTO_SEED_DEMO not disabled)
async function ensureDemoUser(email){
  if(process.env.AUTO_SEED_DEMO === '0') return null;
  const map = {
    'hr@demo.example': { fullName:'Demo HR', title:'HR Manager', role:'HR Manager' },
    'sales@demo.example': { fullName:'Demo Sales', title:'Sales Manager', role:'Sales Manager' },
    'buyer@demo.example': { fullName:'Demo Buyer', title:'Buyer', role:'Buyer' },
    'supplier@demo.example': { fullName:'Demo Supplier', title:'Supplier', role:'Supplier' },
    'designer@demo.example': { fullName:'Demo Designer', title:'Designer', role:'Designer' },
    'auditor@demo.example': { fullName:'Demo Safety Auditor', title:'Safety Auditor', role:'Safety Auditor' },
    'safety@demo.example': { fullName:'Demo Safety Office', title:'Safety Office', role:'Safety Office' },
    'inspection@demo.example': { fullName:'Demo Inspection', title:'Inspection', role:'Inspection' }
  };
  const cfg = map[email.toLowerCase()];
  if(!cfg) return null;
  const connector = new AzureSQLConnector(); await connector.connect();
  // Find demo tenant via owner
  let tidRes = await connector.pool.request().input('email','owner@demo.example').query(`
    SELECT TOP 1 t.TenantId FROM dbo.Users u
    JOIN dbo.CompanyUsers cu ON cu.UserId=u.UserId
    JOIN dbo.Tenants t ON t.TenantId=cu.TenantId
    WHERE u.Email=@email ORDER BY cu.IsOwner DESC`);
  let tenantId = tidRes.recordset[0]?.TenantId;
  if(!tenantId){ await connector.disconnect(); await autoSeedDemoIfNeeded(); await connector.connect(); tidRes = await connector.pool.request().input('email','owner@demo.example').query(`SELECT TOP 1 t.TenantId FROM dbo.Users u JOIN dbo.CompanyUsers cu ON cu.UserId=u.UserId JOIN dbo.Tenants t ON t.TenantId=cu.TenantId WHERE u.Email=@email ORDER BY cu.IsOwner DESC`); tenantId = tidRes.recordset[0]?.TenantId; }
  if(!tenantId){ await connector.disconnect(); return null; }
  // Ensure role exists
  async function createRoleIfNeeded(roleName){ try{ const tvp=new sql.Table('dbo.StringList'); tvp.columns.add('Value', sql.NVarChar(256)); await connector.pool.request().input('TenantId', tenantId).input('RoleName', roleName).input('PermissionCodes', tvp).execute('sp_CreateRole'); }catch(e){} }
  await createRoleIfNeeded(cfg.role);
  // Create employee with default password Welcome123!
  try{
    const crypto = require('crypto'); const s=crypto.randomBytes(16); const h=crypto.scryptSync('Welcome123!', s, 64);
    await connector.pool.request().input('TenantId', tenantId).input('Email', email).input('FullName', cfg.fullName).input('PasswordHash', h).input('PasswordSalt', s).input('RoleName', cfg.role).input('Title', cfg.title).execute('sp_CreateEmployee');
  }catch(e){}
  await connector.disconnect();
  return true;
}

// Dev helper: seed standard demo employees and return list
app.post('/api/demo/seed-employees', async (_req, res) => {
  try{
    const emails = ['hr@demo.example','sales@demo.example','buyer@demo.example','supplier@demo.example','designer@demo.example','auditor@demo.example','safety@demo.example','inspection@demo.example'];
    const out = [];
    for(const e of emails){ try{ await ensureDemoUser(e); out.push(e); }catch{} }
    res.json({ success:true, data: out });
  }catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    const connector = new AzureSQLConnector();
    await connector.connect();

    const query = `
      SELECT TOP 1 u.UserId, u.Email, u.FullName, u.PasswordHash, u.PasswordSalt, u.IsActive
      FROM dbo.Users u
      WHERE u.Email = @email
    `;
    const request = connector.pool.request();
    request.input('email', email);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      // Attempt to auto-provision demo users on demand
      try { await ensureDemoUser(email); } catch {}
      const retry = await connector.pool.request().input('email', email).query(query);
      if (retry.recordset.length === 0) {
        await connector.disconnect();
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      } else {
        result.recordset = retry.recordset;
      }
    }

    const user = result.recordset[0];
    if (!user.IsActive) {
      await connector.disconnect();
      return res.status(403).json({ success: false, error: 'Account disabled' });
    }

    const ok = verifyPassword(password, user.PasswordHash, user.PasswordSalt);

    // fetch tenant memberships
    const tenants = await connector.pool.request().input('uid', user.UserId).query(`
      SELECT t.TenantId, t.Name AS TenantName, bt.Code AS BusinessType
      FROM dbo.CompanyUsers cu
      JOIN dbo.Tenants t ON t.TenantId = cu.TenantId
      JOIN dbo.BusinessTypes bt ON bt.BusinessTypeId = t.BusinessTypeId
      WHERE cu.UserId = @uid AND cu.IsActive = 1
      ORDER BY cu.IsOwner DESC, t.Name`);

    await connector.disconnect();

    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const firstTenantId = tenants.recordset[0]?.TenantId || null;
    const token = signToken({ uid: user.UserId, tid: firstTenantId });
    res.cookie('auth', token, { httpOnly: true, sameSite: 'lax' });

    let redirect = '/dashboard';
    try { redirect = await determineRedirect(new AzureSQLConnector(), user.UserId, firstTenantId); } catch {}

    // Return the module page directly (no app shell mapping)
    // For Safety Officer, this will be '/masters/safety-office.html'

    res.json({ success: true, data: { userId: user.UserId, email: user.Email, fullName: user.FullName, tenants: tenants.recordset, tenantId: firstTenantId, redirect } });
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Demo contacts endpoints (unchanged)
app.get('/api/contacts', requireAuth, async (req, res) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    
    const result = await connector.executeQuery(`
      SELECT Id, Name, CreatedDate 
      FROM contactTest 
      ORDER BY CreatedDate DESC
    `);
    
    await connector.disconnect();
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('❌ Failed to get contacts:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/contacts', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.json({
        success: false,
        error: 'Name is required'
      });
    }
    
    const connector = new AzureSQLConnector();
    await connector.connect();
    
    // Insert new contact
    const cleanName = name.trim().replace(/'/g, "''");
    const insertQuery = `INSERT INTO contactTest (Name) VALUES ('${cleanName}')`;
    await connector.executeQuery(insertQuery);
    
    // Get updated count
    const countResult = await connector.executeQuery('SELECT COUNT(*) as total FROM contactTest');
    
    await connector.disconnect();
    
    res.json({
      success: true,
      message: `Contact "${name.trim()}" added successfully!`,
      totalContacts: countResult.recordset[0].total
    });
    
  } catch (error) {
    console.error('❌ Failed to add contact:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/contacts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.json({
        success: false,
        error: 'Name is required'
      });
    }
    
    const connector = new AzureSQLConnector();
    await connector.connect();
    
    // Update contact
    const cleanName = name.trim().replace(/'/g, "''");
    const updateQuery = `UPDATE contactTest SET Name = '${cleanName}' WHERE Id = ${parseInt(id)}`;
    const result = await connector.executeQuery(updateQuery);
    
    await connector.disconnect();
    
    if (result.rowsAffected[0] > 0) {
      res.json({
        success: true,
        message: `Contact "${name.trim()}" updated successfully!`
      });
    } else {
      res.json({
        success: false,
        error: 'Contact not found'
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to update contact:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/contacts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const connector = new AzureSQLConnector();
    await connector.connect();
    
    const result = await connector.executeQuery(`DELETE FROM contactTest WHERE Id = ${parseInt(id)}`);
    
    await connector.disconnect();
    
    if (result.rowsAffected[0] > 0) {
      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } else {
      res.json({
        success: false,
        error: 'Contact not found'
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to delete contact:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/contacts', requireAuth, async (req, res) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    
    const result = await connector.executeQuery('DELETE FROM contactTest');
    
    await connector.disconnect();
    
    res.json({
      success: true,
      message: `Deleted ${result.rowsAffected[0]} contacts`,
      deletedCount: result.rowsAffected[0]
    });
    
  } catch (error) {
    console.error('❌ Failed to delete all contacts:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/agent/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'running',
      database: process.env.AZURE_SQL_DATABASE || 'SeApp2',
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      uptime: process.uptime(),
      version: '1.0.0'
    }
  });
});

// Tenant summary for dashboard
app.get('/api/tenants/by-email', async (req, res) => {
  const email = (req.query.email || '').toString();
  if (!email) return res.status(400).json({ success: false, error: 'email required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('email', email);
    const q = `
      SELECT t.TenantId, t.Name AS TenantName, bt.Code AS BusinessType
      FROM dbo.Users u
      JOIN dbo.CompanyUsers cu ON cu.UserId = u.UserId
      JOIN dbo.Tenants t ON t.TenantId = cu.TenantId
      JOIN dbo.BusinessTypes bt ON bt.BusinessTypeId = t.BusinessTypeId
      WHERE u.Email = @email
      ORDER BY t.Name`;
    const result = await request.query(q);
    await connector.disconnect();
    res.json({ success: true, data: result.recordset });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/tenant/:tenantId/summary', requireAuth, requireMembership, async (req, res) => {
  const { tenantId } = req.params;
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('tenantId', tenantId);

    const btQuery = `
      SELECT t.TenantId, t.Name AS TenantName, bt.Code AS BusinessType
      FROM dbo.Tenants t JOIN dbo.BusinessTypes bt ON bt.BusinessTypeId = t.BusinessTypeId
      WHERE t.TenantId = @tenantId`;
    const modulesQuery = `SELECT Code, Name FROM dbo.Modules ORDER BY Name`;
    const countsQuery = `
      SELECT (SELECT COUNT(*) FROM dbo.CompanyUsers cu WHERE cu.TenantId = @tenantId) AS Employees,
             (SELECT COUNT(*) FROM dbo.Customers c WHERE c.TenantId = @tenantId) AS Customers,
             (SELECT COUNT(*) FROM dbo.Suppliers s WHERE s.TenantId = @tenantId) AS Suppliers,
             (SELECT COUNT(*) FROM dbo.Certifications k WHERE k.TenantId = @tenantId) AS Certifications`;

    const [bt, mods, cnt] = await Promise.all([
      request.query(btQuery),
      connector.executeQuery(modulesQuery),
      request.query(countsQuery)
    ]);

    await connector.disconnect();
    res.json({ success: true, data: { tenant: bt.recordset[0] || null, modules: mods.recordset, counts: cnt.recordset[0] } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Employees list
app.get('/api/tenant/:tenantId/employees', requireAuth, requireMembership, async (req, res) => {
  const { tenantId } = req.params;
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('tenantId', tenantId);
    const q = `
      SELECT cu.CompanyUserId, u.UserId, u.Email, u.FullName, cu.Title, cu.IsOwner,
             STRING_AGG(r.Name, ', ') WITHIN GROUP (ORDER BY r.Name) AS Roles
      FROM dbo.CompanyUsers cu
      JOIN dbo.Users u ON u.UserId = cu.UserId
      LEFT JOIN dbo.UserRoles ur ON ur.TenantId = cu.TenantId AND ur.UserId = cu.UserId
      LEFT JOIN dbo.Roles r ON r.RoleId = ur.RoleId
      WHERE cu.TenantId = @tenantId
      GROUP BY cu.CompanyUserId, u.UserId, u.Email, u.FullName, cu.Title, cu.IsOwner
      ORDER BY cu.IsOwner DESC, u.FullName ASC`;
    const result = await request.query(q);
    await connector.disconnect();
    res.json({ success: true, data: result.recordset });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create employee (and optional role assignment)
app.post('/api/tenant/:tenantId/employees', requireAuth, requireMembership, requirePerm('USER_MANAGE'), async (req, res) => {
  const { tenantId } = req.params;
  const { email, fullName, password, roleName, title } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('TenantId', parseInt(tenantId));
    request.input('Email', email);
    request.input('FullName', fullName || null);

    if (password) {
      const { hash, salt } = hashPassword(password);
      request.input('PasswordHash', hash);
      request.input('PasswordSalt', salt);
    } else {
      request.input('PasswordHash', null);
      request.input('PasswordSalt', null);
    }

    request.input('RoleName', roleName || null);
    request.input('Title', title || null);

    const result = await request.execute('sp_CreateEmployee');
    await connector.disconnect();
    res.json({ success: true, data: result.recordset?.[0] || { ok: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Roles APIs
app.get('/api/tenant/:tenantId/roles', requireAuth, requireMembership, async (req, res) => {
  const { tenantId } = req.params;
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('tenantId', tenantId);
    const roles = await request.query(`SELECT RoleId, Name, IsSystem FROM dbo.Roles WHERE TenantId = @tenantId ORDER BY Name`);
    await connector.disconnect();
    res.json({ success: true, data: roles.recordset });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/permissions', requireAuth, async (_req, res) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const q = `SELECT p.PermissionId, p.Code, p.Description, m.Name AS ModuleName FROM dbo.Permissions p LEFT JOIN dbo.Modules m ON m.ModuleId = p.ModuleId ORDER BY p.Code`;
    const result = await connector.executeQuery(q);
    await connector.disconnect();
    res.json({ success: true, data: result.recordset });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/tenant/:tenantId/roles', requireAuth, requireMembership, requirePerm('USER_MANAGE'), async (req, res) => {
  const { tenantId } = req.params;
  const { roleName, permissionCodes } = req.body || {};
  if (!roleName) return res.status(400).json({ success: false, error: 'roleName required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const tvp = new (require('mssql')).Table('dbo.StringList');
    tvp.columns.add('Value', (require('mssql')).NVarChar(256));
    (permissionCodes || []).forEach(c => tvp.rows.add(c));

    const request = connector.pool.request();
    request.input('TenantId', parseInt(tenantId));
    request.input('RoleName', roleName);
    request.input('PermissionCodes', tvp);
    const result = await request.execute('sp_CreateRole');
    await connector.disconnect();
    res.json({ success: true, data: result.recordset?.[0] || { ok: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/tenant/:tenantId/assign-role', requireAuth, requireMembership, requirePerm('USER_MANAGE'), async (req, res) => {
  const { tenantId } = req.params;
  const { userId, roleId } = req.body || {};
  if (!userId || !roleId) return res.status(400).json({ success: false, error: 'userId and roleId required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const request = connector.pool.request();
    request.input('TenantId', parseInt(tenantId));
    request.input('UserId', parseInt(userId));
    request.input('RoleId', parseInt(roleId));
    const result = await request.execute('sp_AssignUserRole');
    await connector.disconnect();
    res.json({ success: true, data: result.recordset?.[0] || { ok: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Support Tickets
app.get('/api/support/tickets', requireAuth, async (req, res) => {
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r = await connector.pool.request().input('uid', req.auth.uid).query(`
      SELECT TOP 200 t.* FROM dbo.Tickets t WHERE t.CreatedBy=@uid OR t.TenantId=@tid ORDER BY t.CreatedAt DESC`);
    await connector.disconnect();
    res.json({ success: true, data: r.recordset });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/support/tickets', requireAuth, async (req, res) => {
  const { subject, message, tenantId } = req.body || {};
  if (!subject || !message) return res.status(400).json({ success: false, error: 'subject and message required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r = await connector.pool.request()
      .input('tid', tenantId || req.auth.tid || null)
      .input('uid', req.auth.uid)
      .input('sub', subject)
      .input('msg', message)
      .query(`DECLARE @id INT; INSERT INTO dbo.Tickets(TenantId, CreatedBy, Subject) VALUES(@tid,@uid,@sub); SET @id=SCOPE_IDENTITY(); INSERT INTO dbo.TicketMessages(TicketId, UserId, Message) VALUES(@id,@uid,@msg); SELECT @id AS TicketId;`);
    await connector.disconnect();
    res.json({ success: true, data: r.recordset[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/support/tickets/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params; const { message } = req.body || {};
  if (!message) return res.status(400).json({ success: false, error: 'message required' });
  try {
    const connector = new AzureSQLConnector();
    await connector.connect();
    await connector.pool.request().input('id', parseInt(id)).input('uid', req.auth.uid).input('msg', message)
      .query('INSERT INTO dbo.TicketMessages(TicketId, UserId, Message) VALUES(@id,@uid,@msg)');
    await connector.disconnect();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Billing (Stripe) - create checkout session
app.post('/api/billing/subscribe', requireAuth, requireMembership, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, error: 'Stripe not configured' });
    const priceId = process.env.STRIPE_PRICE_ID;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.BILLING_SUCCESS_URL || 'http://localhost:3000/dashboard',
      cancel_url: process.env.BILLING_CANCEL_URL || 'http://localhost:3000/billing'
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ==================== PROFILE (User Settings) ====================
// Get current user's profile
app.get('/api/profile', requireAuth, async (req, res) => {
  try{
    const connector = new AzureSQLConnector();
    await connector.connect();
    const u = await connector.pool.request()
      .input('uid', req.auth.uid)
      .query(`SELECT TOP 1 UserId, Email, FullName, CellPhone, Designation, AvatarUrl FROM dbo.Users WHERE UserId=@uid`);
    let title = null;
    if(req.auth.tid){
      try{ const t = await connector.pool.request().input('tid', req.auth.tid).input('uid', req.auth.uid)
        .query('SELECT TOP 1 Title FROM dbo.CompanyUsers WHERE TenantId=@tid AND UserId=@uid');
        title = t.recordset[0]?.Title || null; }catch{ title = null; }
    }
    await connector.disconnect();
    const user = u.recordset[0] || {};
    return res.json({ success:true, data: { email:user.Email, fullName:user.FullName, cellPhone:user.CellPhone||'', designation:user.Designation||title||'', avatarUrl:user.AvatarUrl||null } });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Update profile (name, title, phone)
app.put('/api/profile', requireAuth, async (req, res) => {
  try{
    const { firstName, lastName, fullName, cellPhone, designation } = req.body || {};
    const name = fullName || [firstName||'', lastName||''].join(' ').trim();
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r1 = await connector.pool.request()
      .input('uid', req.auth.uid)
      .input('FullName', name || null)
      .input('CellPhone', cellPhone || null)
      .input('Designation', designation || null)
      .query('UPDATE dbo.Users SET FullName = COALESCE(@FullName, FullName), CellPhone = COALESCE(@CellPhone, CellPhone), Designation = COALESCE(@Designation, Designation) WHERE UserId=@uid');
    if(req.auth.tid && designation){
      try{ await connector.pool.request().input('tid', req.auth.tid).input('uid', req.auth.uid).input('Title', designation)
        .query('UPDATE dbo.CompanyUsers SET Title=@Title WHERE TenantId=@tid AND UserId=@uid'); }catch{}
    }
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Change password
app.post('/api/profile/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if(!currentPassword || !newPassword) return res.status(400).json({ success:false, error:'currentPassword and newPassword required' });
  try{
    const connector = new AzureSQLConnector();
    await connector.connect();
    const r = await connector.pool.request().input('uid', req.auth.uid).query('SELECT PasswordHash, PasswordSalt FROM dbo.Users WHERE UserId=@uid');
    const row = r.recordset[0];
    if(!row){ await connector.disconnect(); return res.status(404).json({ success:false, error:'user not found' }); }
    const ok = verifyPassword(currentPassword, row.PasswordHash, row.PasswordSalt);
    if(!ok){ await connector.disconnect(); return res.status(400).json({ success:false, error:'Current password is incorrect' }); }
    const { hash, salt } = hashPassword(newPassword);
    await connector.pool.request().input('uid', req.auth.uid).input('hash', hash).input('salt', salt)
      .query('UPDATE dbo.Users SET PasswordHash=@hash, PasswordSalt=@salt WHERE UserId=@uid');
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Upload avatar as data URL (PNG/JPG), save under public/uploads and store path in Users.AvatarUrl if available
const fs = require('fs');
app.post('/api/profile/avatar', requireAuth, express.json({ limit: '12mb' }), async (req, res) => {
  try{
    const dataUrl = req.body?.dataUrl || '';
    const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);
    if(!m) return res.status(400).json({ success:false, error:'Invalid image' });
    const ext = m[2].toLowerCase()==='jpeg'?'jpg':m[2].toLowerCase();
    const buf = Buffer.from(m[3], 'base64');
    const dir = path.join(__dirname, '../public/uploads');
    try{ fs.mkdirSync(dir, { recursive:true }); }catch{}
    const filename = `user-${req.auth.uid}.${ext}`;
    const fpath = path.join(dir, filename);
    fs.writeFileSync(fpath, buf);
    const publicUrl = `/uploads/${filename}`;
    try{
      const connector = new AzureSQLConnector();
      await connector.connect();
      await connector.pool.request().input('uid', req.auth.uid).input('url', publicUrl)
        .query('UPDATE dbo.Users SET AvatarUrl=@url WHERE UserId=@uid');
      await connector.disconnect();
    }catch{}
    return res.json({ success:true, url: publicUrl });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Company profile tables and endpoints
async function ensureCompanyProfileTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.CompanyProfile','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanyProfile(
        TenantId INT PRIMARY KEY,
        Address1 NVARCHAR(255) NULL,
        Address2 NVARCHAR(255) NULL,
        City NVARCHAR(100) NULL,
        State NVARCHAR(100) NULL,
        PostalCode NVARCHAR(50) NULL,
        Employees INT NULL,
        CapacityType NVARCHAR(50) NULL,
        CapacityQty INT NULL,
        MinOrderQty INT NULL,
        SalesProfitType NVARCHAR(20) NULL,
        SalesProfitValue DECIMAL(18,2) NULL,
        MinWage DECIMAL(18,2) NULL,
        MinAge INT NULL,
        RetirementAge INT NULL,
        DealInGarments BIT NOT NULL DEFAULT(0),
        DealInHomeTextile BIT NOT NULL DEFAULT(0),
        LogoUrl NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
    END;
    IF OBJECT_ID('dbo.CompanyProductLine','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanyProductLine(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
    END;
    IF OBJECT_ID('dbo.CompanyWarehouse','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanyWarehouse(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        AddressType NVARCHAR(50) NULL,
        WarehouseType NVARCHAR(50) NULL,
        Address1 NVARCHAR(255) NULL,
        Address2 NVARCHAR(255) NULL,
        City NVARCHAR(100) NULL,
        State NVARCHAR(100) NULL,
        PostalCode NVARCHAR(50) NULL,
        Country NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME2 NULL
      );
    END;
    IF OBJECT_ID('dbo.CompanySpace','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanySpace(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Type NVARCHAR(100) NULL,
        Purpose NVARCHAR(255) NULL,
        Floor INT NULL,
        Width DECIMAL(18,2) NULL,
        Length DECIMAL(18,2) NULL,
        Height DECIMAL(18,2) NULL,
        Unit NVARCHAR(20) NULL,
        Capacity NVARCHAR(100) NULL,
        Ventilation NVARCHAR(50) NULL,
        Doors INT NULL,
        Windows INT NULL,
        ExitPlanUrl NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME2 NULL
      );
    END;
    IF OBJECT_ID('dbo.CompanyAssets','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanyAssets(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        AssetName NVARCHAR(255) NOT NULL,
        AssetType NVARCHAR(100) NULL,
        Quantity INT NULL,
        PurchaseDate DATE NULL,
        PurchasePrice DECIMAL(18,2) NULL,
        Supplier NVARCHAR(255) NULL,
        Notes NVARCHAR(MAX) NULL,
        SavedOn DATE NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME2 NULL
      );
    END;
    IF OBJECT_ID('dbo.CompanyCertification','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanyCertification(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Type NVARCHAR(100) NULL,
        Policy NVARCHAR(255) NULL,
        Name NVARCHAR(255) NOT NULL,
        ValidFrom DATE NULL,
        ValidTill DATE NULL,
        Detail NVARCHAR(MAX) NULL,
        CertImageUrl NVARCHAR(MAX) NULL,
        LogoUrl NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME2 NULL
      );
    END;
    IF OBJECT_ID('dbo.CompanyUnion','U') IS NULL BEGIN
      CREATE TABLE dbo.CompanyUnion(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME2 NULL
      );
    END;`)
}

// Get company profile
app.get('/api/company/profile', requireAuth, async (req, res)=>{
  try{
    if(!req.auth.tid) return res.status(400).json({ success:false, error:'tenantId required' });
    const connector = new AzureSQLConnector(); await connector.connect();
    await ensureCompanyProfileTables(connector);
    const r = await connector.pool.request().input('tid', req.auth.tid)
      .query('SELECT TOP 1 * FROM CompanyProfile WHERE TenantId=@tid');
    const lines = await connector.pool.request().input('tid', req.auth.tid)
      .query('SELECT Id, Name FROM CompanyProductLine WHERE TenantId=@tid ORDER BY Name');
    await connector.disconnect();
    return res.json({ success:true, data: r.recordset[0] || {}, productLines: lines.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Upsert company profile
app.put('/api/company/profile', requireAuth, async (req, res)=>{
  try{
    if(!req.auth.tid) return res.status(400).json({ success:false, error:'tenantId required' });
    const p = req.body || {};
    const connector = new AzureSQLConnector(); await connector.connect();
    await ensureCompanyProfileTables(connector);
    const rq = connector.pool.request();
    rq.input('tid', req.auth.tid);
    rq.input('Address1', p.address1||null);
    rq.input('Address2', p.address2||null);
    rq.input('City', p.city||null);
    rq.input('State', p.state||null);
    rq.input('PostalCode', p.postalCode||null);
    rq.input('Employees', p.employees||null);
    rq.input('CapacityType', p.capacityType||null);
    rq.input('CapacityQty', p.capacityQty||null);
    rq.input('MinOrderQty', p.minOrderQty||null);
    rq.input('SalesProfitType', p.salesProfitType||null);
    rq.input('SalesProfitValue', p.salesProfitValue||null);
    rq.input('MinWage', p.minWage||null);
    rq.input('MinAge', p.minAge||null);
    rq.input('RetirementAge', p.retirementAge||null);
    rq.input('DealInGarments', p.dealInGarments?1:0);
    rq.input('DealInHomeTextile', p.dealInHomeTextile?1:0);
    await rq.query(`
      MERGE CompanyProfile AS t
      USING (SELECT @tid AS TenantId) AS s
      ON (t.TenantId = s.TenantId)
      WHEN MATCHED THEN UPDATE SET
        Address1=@Address1, Address2=@Address2, City=@City, State=@State, PostalCode=@PostalCode,
        Employees=@Employees, CapacityType=@CapacityType, CapacityQty=@CapacityQty,
        MinOrderQty=@MinOrderQty, SalesProfitType=@SalesProfitType, SalesProfitValue=@SalesProfitValue,
        MinWage=@MinWage, MinAge=@MinAge, RetirementAge=@RetirementAge,
        DealInGarments=@DealInGarments, DealInHomeTextile=@DealInHomeTextile, UpdatedAt=GETDATE()
      WHEN NOT MATCHED THEN INSERT(TenantId, Address1, Address2, City, State, PostalCode, Employees, CapacityType, CapacityQty, MinOrderQty, SalesProfitType, SalesProfitValue, MinWage, MinAge, RetirementAge, DealInGarments, DealInHomeTextile)
        VALUES(@tid, @Address1, @Address2, @City, @State, @PostalCode, @Employees, @CapacityType, @CapacityQty, @MinOrderQty, @SalesProfitType, @SalesProfitValue, @MinWage, @MinAge, @RetirementAge, @DealInGarments, @DealInHomeTextile);`);
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Upload company logo (data URL)
app.post('/api/company/logo', requireAuth, express.json({ limit:'12mb' }), async (req, res)=>{
  try{
    if(!req.auth.tid) return res.status(400).json({ success:false, error:'tenantId required' });
    const dataUrl = req.body?.dataUrl || '';
    const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);
    if(!m) return res.status(400).json({ success:false, error:'Invalid image' });
    const ext = m[2].toLowerCase()==='jpeg'?'png':m[2].toLowerCase();
    const buf = Buffer.from(m[3], 'base64');
    const dir = path.join(__dirname, '../public/uploads'); try{ fs.mkdirSync(dir,{recursive:true}); }catch{}
    const filename = `tenant-${req.auth.tid}-logo.${ext}`; const fpath = path.join(dir, filename);
    fs.writeFileSync(fpath, buf); const publicUrl = `/uploads/${filename}`;
    const connector = new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector);
    await connector.pool.request().input('tid', req.auth.tid).input('url', publicUrl).query('MERGE CompanyProfile AS t USING (SELECT @tid AS TenantId) s ON t.TenantId=s.TenantId WHEN MATCHED THEN UPDATE SET LogoUrl=@url, UpdatedAt=GETDATE() WHEN NOT MATCHED THEN INSERT(TenantId, LogoUrl) VALUES(@tid, @url);');
    await connector.disconnect();
    return res.json({ success:true, url: publicUrl });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Product lines
app.get('/api/company/product-lines', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).query('SELECT Id, Name FROM CompanyProductLine WHERE TenantId=@tid ORDER BY Name'); await connector.disconnect(); return res.json({ success:true, data:r.recordset }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/product-lines', requireAuth, async (req, res)=>{
  try{ const name=(req.body?.name||'').trim(); if(!name) return res.status(400).json({ success:false, error:'name required' }); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).input('Name', name).query('INSERT INTO CompanyProductLine(TenantId,Name) VALUES(@tid,@Name); SELECT SCOPE_IDENTITY() AS Id'); await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/company/product-lines/:id', requireAuth, async (req, res)=>{  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', parseInt(req.params.id)).query('DELETE FROM CompanyProductLine WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Warehouses CRUD
app.get('/api/company/warehouses', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).query('SELECT * FROM CompanyWarehouse WHERE TenantId=@tid ORDER BY Name'); await connector.disconnect(); return res.json({ success:true, data:r.recordset }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/warehouses', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; if(!p.name) return res.status(400).json({ success:false, error:'name required' }); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request()
      .input('tid', req.auth.tid)
      .input('Name', p.name)
      .input('AddressType', p.addressType||null)
      .input('WarehouseType', p.warehouseType||null)
      .input('Address1', p.address1||null)
      .input('Address2', p.address2||null)
      .input('City', p.city||null)
      .input('State', p.state||null)
      .input('PostalCode', p.postalCode||null)
      .input('Country', p.country||null)
      .query('INSERT INTO CompanyWarehouse(TenantId,Name,AddressType,WarehouseType,Address1,Address2,City,State,PostalCode,Country) VALUES(@tid,@Name,@AddressType,@WarehouseType,@Address1,@Address2,@City,@State,@PostalCode,@Country); SELECT SCOPE_IDENTITY() AS Id'); await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/company/warehouses/:id', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const p=req.body||{}; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request()
      .input('tid', req.auth.tid)
      .input('Id', id)
      .input('Name', p.name||null)
      .input('AddressType', p.addressType||null)
      .input('WarehouseType', p.warehouseType||null)
      .input('Address1', p.address1||null)
      .input('Address2', p.address2||null)
      .input('City', p.city||null)
      .input('State', p.state||null)
      .input('PostalCode', p.postalCode||null)
      .input('Country', p.country||null)
      .query('UPDATE CompanyWarehouse SET Name=COALESCE(@Name,Name), AddressType=COALESCE(@AddressType,AddressType), WarehouseType=COALESCE(@WarehouseType,WarehouseType), Address1=COALESCE(@Address1,Address1), Address2=COALESCE(@Address2,Address2), City=COALESCE(@City,City), State=COALESCE(@State,State), PostalCode=COALESCE(@PostalCode,PostalCode), Country=COALESCE(@Country,Country), UpdatedAt=GETDATE() WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/company/warehouses/:id', requireAuth, async (req, res)=>{  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', parseInt(req.params.id)).query('DELETE FROM CompanyWarehouse WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Spaces CRUD
app.get('/api/company/spaces', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).query('SELECT * FROM CompanySpace WHERE TenantId=@tid ORDER BY Name'); await connector.disconnect(); return res.json({ success:true, data:r.recordset }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/spaces', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; if(!p.name) return res.status(400).json({ success:false, error:'name required' }); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request()
      .input('tid', req.auth.tid)
      .input('Name', p.name)
      .input('Type', p.type||null)
      .input('Purpose', p.purpose||null)
      .input('Floor', p.floor||0)
      .input('Width', p.width||null)
      .input('Length', p.length||null)
      .input('Height', p.height||null)
      .input('Unit', p.unit||null)
      .input('Capacity', p.capacity||null)
      .input('Ventilation', p.ventilation||null)
      .input('Doors', p.doors||0)
      .input('Windows', p.windows||0)
      .query('INSERT INTO CompanySpace(TenantId,Name,Type,Purpose,Floor,Width,Length,Height,Unit,Capacity,Ventilation,Doors,Windows) VALUES(@tid,@Name,@Type,@Purpose,@Floor,@Width,@Length,@Height,@Unit,@Capacity,@Ventilation,@Doors,@Windows); SELECT SCOPE_IDENTITY() AS Id'); await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/spaces/:id/exit-plan', requireAuth, express.json({limit:'12mb'}), async (req, res)=>{
  try{ const id=parseInt(req.params.id); const dataUrl=req.body?.dataUrl||''; const m=dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i); if(!m) return res.status(400).json({ success:false, error:'Invalid image' }); const ext=m[2].toLowerCase()==='jpeg'?'jpg':m[2].toLowerCase(); const buf=Buffer.from(m[3],'base64'); const fs=require('fs'); const dir=path.join(__dirname,'../public/uploads'); try{ fs.mkdirSync(dir,{recursive:true}); }catch{} const filename=`tenant-${req.auth.tid}-space-${id}.${ext}`; const fpath=path.join(dir,filename); fs.writeFileSync(fpath, buf); const publicUrl='/uploads/'+filename; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', id).input('url', publicUrl).query('UPDATE CompanySpace SET ExitPlanUrl=@url, UpdatedAt=GETDATE() WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true, url: publicUrl }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/company/spaces/:id', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', parseInt(req.params.id)).query('DELETE FROM CompanySpace WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Assets CRUD
app.get('/api/company/assets', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).query('SELECT * FROM CompanyAssets WHERE TenantId=@tid ORDER BY AssetName'); await connector.disconnect(); return res.json({ success:true, data:r.recordset }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/assets', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; if(!p.assetName) return res.status(400).json({ success:false, error:'assetName required' }); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request()
      .input('tid', req.auth.tid)
      .input('AssetName', p.assetName)
      .input('AssetType', p.assetType||null)
      .input('Quantity', p.quantity||null)
      .input('PurchaseDate', p.purchaseDate||null)
      .input('PurchasePrice', p.purchasePrice||null)
      .input('Supplier', p.supplier||null)
      .input('Notes', p.notes||null)
      .input('SavedOn', new Date())
      .query('INSERT INTO CompanyAssets(TenantId,AssetName,AssetType,Quantity,PurchaseDate,PurchasePrice,Supplier,Notes,SavedOn) VALUES(@tid,@AssetName,@AssetType,@Quantity,@PurchaseDate,@PurchasePrice,@Supplier,@Notes,@SavedOn); SELECT SCOPE_IDENTITY() AS Id'); await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/company/assets/:id', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const p=req.body||{}; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request()
      .input('tid', req.auth.tid)
      .input('Id', id)
      .input('AssetName', p.assetName||null)
      .input('AssetType', p.assetType||null)
      .input('Quantity', p.quantity||null)
      .input('PurchaseDate', p.purchaseDate||null)
      .input('PurchasePrice', p.purchasePrice||null)
      .input('Supplier', p.supplier||null)
      .input('Notes', p.notes||null)
      .query('UPDATE CompanyAssets SET AssetName=COALESCE(@AssetName,AssetName), AssetType=COALESCE(@AssetType,AssetType), Quantity=COALESCE(@Quantity,Quantity), PurchaseDate=COALESCE(@PurchaseDate,PurchaseDate), PurchasePrice=COALESCE(@PurchasePrice,PurchasePrice), Supplier=COALESCE(@Supplier,Supplier), Notes=COALESCE(@Notes,Notes), UpdatedAt=GETDATE() WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/company/assets/:id', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', parseInt(req.params.id)).query('DELETE FROM CompanyAssets WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== HR (Job Postings, Candidates & Employees) ====================
async function ensureHrTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.JobPosting','U') IS NULL BEGIN
      CREATE TABLE dbo.JobPosting(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        Department NVARCHAR(100) NULL,
        Type NVARCHAR(50) NULL,
        Openings INT NOT NULL DEFAULT(1),
        Location NVARCHAR(100) NULL,
        SalaryRange NVARCHAR(100) NULL,
        Description NVARCHAR(MAX) NULL,
        RequiredQualification NVARCHAR(MAX) NULL,
        DesiredQualification NVARCHAR(MAX) NULL,
        ApplicationDeadline DATE NULL,
        DiversityFlag BIT NOT NULL DEFAULT(0),
        EOEFlag BIT NOT NULL DEFAULT(0),
        PostedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_JobPosting_Tenant ON dbo.JobPosting(TenantId, PostedAt DESC);
    END;
    IF COL_LENGTH('dbo.JobPosting','RequiredQualification') IS NULL ALTER TABLE dbo.JobPosting ADD RequiredQualification NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.JobPosting','DesiredQualification') IS NULL ALTER TABLE dbo.JobPosting ADD DesiredQualification NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.JobPosting','ApplicationDeadline') IS NULL ALTER TABLE dbo.JobPosting ADD ApplicationDeadline DATE NULL;
    IF COL_LENGTH('dbo.JobPosting','DiversityFlag') IS NULL ALTER TABLE dbo.JobPosting ADD DiversityFlag BIT NOT NULL DEFAULT(0);
    IF COL_LENGTH('dbo.JobPosting','EOEFlag') IS NULL ALTER TABLE dbo.JobPosting ADD EOEFlag BIT NOT NULL DEFAULT(0);

    IF OBJECT_ID('dbo.Candidate','U') IS NULL BEGIN
      CREATE TABLE dbo.Candidate(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        JobPostingId INT NULL,
        Name NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(50) NULL,
        Address NVARCHAR(255) NULL,
        LinkedinUrl NVARCHAR(500) NULL,
        WorkAuthStatus NVARCHAR(100) NULL,
        PreferredStartDate DATE NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT('Applied'),
        AppliedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        Shortlisted BIT NOT NULL DEFAULT(0),
        ShortlistedAt DATETIME2 NULL
      );
      CREATE INDEX IX_Candidate_Tenant ON dbo.Candidate(TenantId, AppliedAt DESC);
    END;
    IF COL_LENGTH('dbo.Candidate','JobPostingId') IS NULL ALTER TABLE dbo.Candidate ADD JobPostingId INT NULL;
    IF COL_LENGTH('dbo.Candidate','Phone') IS NULL ALTER TABLE dbo.Candidate ADD Phone NVARCHAR(50) NULL;
    IF COL_LENGTH('dbo.Candidate','Address') IS NULL ALTER TABLE dbo.Candidate ADD Address NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.Candidate','LinkedinUrl') IS NULL ALTER TABLE dbo.Candidate ADD LinkedinUrl NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.Candidate','WorkAuthStatus') IS NULL ALTER TABLE dbo.Candidate ADD WorkAuthStatus NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.Candidate','PreferredStartDate') IS NULL ALTER TABLE dbo.Candidate ADD PreferredStartDate DATE NULL;
    IF COL_LENGTH('dbo.Candidate','Status') IS NULL ALTER TABLE dbo.Candidate ADD Status NVARCHAR(50) NOT NULL DEFAULT('Applied');

    IF OBJECT_ID('dbo.CandidateInterview','U') IS NULL BEGIN
      CREATE TABLE dbo.CandidateInterview(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CandidateId INT NOT NULL,
        TenantId INT NOT NULL,
        InterviewDate DATE NULL,
        InterviewTimeSlot NVARCHAR(50) NULL,
        InterviewType NVARCHAR(50) NULL,
        InterviewerName NVARCHAR(255) NULL,
        InterviewerTitle NVARCHAR(255) NULL,
        Reason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CandidateInterview_Tenant ON dbo.CandidateInterview(TenantId, CandidateId);
    END;

    IF OBJECT_ID('dbo.CandidateEvaluation','U') IS NULL BEGIN
      CREATE TABLE dbo.CandidateEvaluation(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CandidateId INT NOT NULL,
        TenantId INT NOT NULL,
        EvaluatorName NVARCHAR(255) NULL,
        TechnicalSkills NVARCHAR(MAX) NULL,
        Teamwork NVARCHAR(MAX) NULL,
        Leadership NVARCHAR(MAX) NULL,
        ProblemSolving NVARCHAR(MAX) NULL,
        Communication NVARCHAR(MAX) NULL,
        TestDetails NVARCHAR(MAX) NULL,
        Agenda NVARCHAR(MAX) NULL,
        Recommendation NVARCHAR(50) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CandidateEvaluation_Tenant ON dbo.CandidateEvaluation(TenantId, CandidateId);
    END;

    IF OBJECT_ID('dbo.CandidateOffer','U') IS NULL BEGIN
      CREATE TABLE dbo.CandidateOffer(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CandidateId INT NOT NULL,
        TenantId INT NOT NULL,
        EmploymentType NVARCHAR(50) NULL,
        Benefits NVARCHAR(MAX) NULL,
        SalaryOffer NVARCHAR(100) NULL,
        StartDate DATE NULL,
        Confidentiality BIT NOT NULL DEFAULT(0),
        NonCompete BIT NOT NULL DEFAULT(0),
        AtWill BIT NOT NULL DEFAULT(0),
        OfferStatus NVARCHAR(50) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CandidateOffer_Tenant ON dbo.CandidateOffer(TenantId, CandidateId);
    END;

    -- Extended employee HR profile (basic subset of the spec; can be expanded later)
    IF OBJECT_ID('dbo.HrEmployeeProfile','U') IS NULL BEGIN
      CREATE TABLE dbo.HrEmployeeProfile(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        EmployeeId INT NOT NULL, -- FK to CompanyUsers or Users depending on sp_CreateEmployee implementation
        Address1 NVARCHAR(255) NULL,
        Address2 NVARCHAR(255) NULL,
        Active BIT NOT NULL DEFAULT(1),
        Phone NVARCHAR(50) NULL,
        Country NVARCHAR(100) NULL,
        State NVARCHAR(100) NULL,
        Zip NVARCHAR(50) NULL,
        Fax NVARCHAR(50) NULL,
        Department NVARCHAR(100) NULL,
        EmployeeType NVARCHAR(50) NULL,
        SSN NVARCHAR(50) NULL,
        Email NVARCHAR(255) NULL,
        HireDate DATE NULL,
        BirthDate DATE NULL,
        Commissionable BIT NOT NULL DEFAULT(0),
        CommissionPercent DECIMAL(5,2) NULL,
        NextOfKinName NVARCHAR(255) NULL,
        NextOfKinNumber NVARCHAR(50) NULL,
        SourceType NVARCHAR(50) NULL,
        Industry NVARCHAR(100) NULL,
        GeoLocation NVARCHAR(50) NULL,
        Disability NVARCHAR(10) NULL,
        WorkInjury NVARCHAR(10) NULL,
        HealthInsurance NVARCHAR(10) NULL,
        IdNumber NVARCHAR(100) NULL,
        Notes NVARCHAR(MAX) NULL,
        Heritage NVARCHAR(100) NULL,
        SexualOrientation NVARCHAR(100) NULL,
        JobDescription NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        UpdatedAt DATETIME2 NULL
      );
      CREATE INDEX IX_HrEmployeeProfile_Tenant ON dbo.HrEmployeeProfile(TenantId, EmployeeId);
    END;

    IF OBJECT_ID('dbo.HrEmployeeTotals','U') IS NULL BEGIN
      CREATE TABLE dbo.HrEmployeeTotals(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        EmployeeId INT NOT NULL,
        MTD_Gross DECIMAL(18,2) NULL,
        MTD_State DECIMAL(18,2) NULL,
        QTD_Gross DECIMAL(18,2) NULL,
        QTD_State DECIMAL(18,2) NULL,
        YTD_Gross DECIMAL(18,2) NULL,
        YTD_State DECIMAL(18,2) NULL,
        MTD_Fica DECIMAL(18,2) NULL,
        QTD_Fica DECIMAL(18,2) NULL,
        YTD_Fica DECIMAL(18,2) NULL,
        MTD_Local DECIMAL(18,2) NULL,
        QTD_Local DECIMAL(18,2) NULL,
        YTD_Local DECIMAL(18,2) NULL,
        MTD_Federal DECIMAL(18,2) NULL,
        QTD_Federal DECIMAL(18,2) NULL,
        YTD_Federal DECIMAL(18,2) NULL,
        MTD_Other DECIMAL(18,2) NULL,
        QTD_Other DECIMAL(18,2) NULL,
        YTD_Other DECIMAL(18,2) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_HrEmployeeTotals_Tenant ON dbo.HrEmployeeTotals(TenantId, EmployeeId);
    END;`);
}

// Job postings
app.get('/api/hr/postings', requireAuth, async (req, res)=>{
  try{
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0)
      .query('SELECT * FROM dbo.JobPosting WHERE TenantId=@tid ORDER BY PostedAt DESC');
    await connector.disconnect();
    return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/hr/postings', requireAuth, async (req, res)=>{
  try{
    const p=req.body||{}; const title=(p.title||'').trim(); if(!title) return res.status(400).json({ success:false, error:'title required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('Title', title)
      .input('Department', p.department||null)
      .input('Type', p.employmentType||null)
      .input('Openings', parseInt(p.openings||1)||1)
      .input('Location', p.location||null)
      .input('SalaryRange', p.salaryRange||null)
      .input('Description', p.jobDescription||null)
      .input('RequiredQualification', p.requiredQualification||null)
      .input('DesiredQualification', p.desiredQualification||null)
      .input('ApplicationDeadline', p.applicationDeadline||null)
      .input('DiversityFlag', p.diversityFlag?1:0)
      .input('EOEFlag', p.eoeFlag?1:0);
    const r=await rq.query(`INSERT INTO dbo.JobPosting(TenantId,Title,Department,Type,Openings,Location,SalaryRange,Description,RequiredQualification,DesiredQualification,ApplicationDeadline,DiversityFlag,EOEFlag)
      VALUES(@tid,@Title,@Department,@Type,@Openings,@Location,@SalaryRange,@Description,@RequiredQualification,@DesiredQualification,@ApplicationDeadline,@DiversityFlag,@EOEFlag);
      SELECT SCOPE_IDENTITY() AS Id`);
    await connector.disconnect();
    return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/hr/postings/:id', requireAuth, async (req, res)=>{
  try{
    const id=parseInt(req.params.id);
    const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0).input('Id', id)
      .input('Title', p.title||null)
      .input('Department', p.department||null)
      .input('Type', p.employmentType||null)
      .input('Openings', p.openings!=null?parseInt(p.openings):null)
      .input('Location', p.location||null)
      .input('SalaryRange', p.salaryRange||null)
      .input('Description', p.jobDescription||null)
      .input('RequiredQualification', p.requiredQualification||null)
      .input('DesiredQualification', p.desiredQualification||null)
      .input('ApplicationDeadline', p.applicationDeadline||null)
      .input('DiversityFlag', p.diversityFlag!=null?(p.diversityFlag?1:0):null)
      .input('EOEFlag', p.eoeFlag!=null?(p.eoeFlag?1:0):null);
    await rq.query(`UPDATE dbo.JobPosting SET
        Title = COALESCE(@Title, Title),
        Department = COALESCE(@Department, Department),
        Type = COALESCE(@Type, Type),
        Openings = COALESCE(@Openings, Openings),
        Location = COALESCE(@Location, Location),
        SalaryRange = COALESCE(@SalaryRange, SalaryRange),
        Description = COALESCE(@Description, Description),
        RequiredQualification = COALESCE(@RequiredQualification, RequiredQualification),
        DesiredQualification = COALESCE(@DesiredQualification, DesiredQualification),
        ApplicationDeadline = COALESCE(@ApplicationDeadline, ApplicationDeadline),
        DiversityFlag = COALESCE(@DiversityFlag, DiversityFlag),
        EOEFlag = COALESCE(@EOEFlag, EOEFlag)
      WHERE Id=@Id AND TenantId=@tid`);
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/hr/postings/:id', requireAuth, async (req, res)=>{
  try{
    const id=parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).query('DELETE FROM dbo.JobPosting WHERE Id=@Id AND TenantId=@tid');
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Candidates & applicants
app.get('/api/hr/applicants', requireAuth, async (req, res)=>{
  try{
    const { jobTitle, name, email, phone, address, status, shortlisted } = req.query;
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    let sqlTxt = `SELECT c.*, jp.Title AS JobTitle FROM dbo.Candidate c
      LEFT JOIN dbo.JobPosting jp ON jp.Id = c.JobPostingId
      WHERE c.TenantId=@tid`;
    const rq = connector.pool.request().input('tid', req.auth.tid||0);
    if(jobTitle){ sqlTxt += ' AND jp.Title LIKE @jobTitle'; rq.input('jobTitle','%'+jobTitle+'%'); }
    if(name){ sqlTxt += ' AND c.Name LIKE @name'; rq.input('name','%'+name+'%'); }
    if(email){ sqlTxt += ' AND c.Email LIKE @email'; rq.input('email','%'+email+'%'); }
    if(phone){ sqlTxt += ' AND c.Phone LIKE @phone'; rq.input('phone','%'+phone+'%'); }
    if(address){ sqlTxt += ' AND c.Address LIKE @address'; rq.input('address','%'+address+'%'); }
    if(status){ sqlTxt += ' AND c.Status = @status'; rq.input('status', status); }
    if(shortlisted==='1'){ sqlTxt += ' AND c.Shortlisted=1'; }
    sqlTxt += ' ORDER BY c.AppliedAt DESC';
    const r=await rq.query(sqlTxt);
    await connector.disconnect();
    return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/hr/applicants', requireAuth, async (req, res)=>{
  try{
    const p=req.body||{};
    const name=(p.fullName||'').trim();
    const email=(p.email||'').trim();
    if(!name||!email) return res.status(400).json({ success:false, error:'fullName and email required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('JobPostingId', p.jobPostingId||null)
      .input('Name', name)
      .input('Email', email)
      .input('Phone', p.phone||null)
      .input('Address', p.address||null)
      .input('LinkedinUrl', p.linkedin||null)
      .input('WorkAuthStatus', p.workAuthStatus||null)
      .input('PreferredStartDate', p.preferredStartDate||null)
      .input('Status', 'Applied');
    const r=await rq.query(`INSERT INTO dbo.Candidate(TenantId,JobPostingId,Name,Email,Phone,Address,LinkedinUrl,WorkAuthStatus,PreferredStartDate,Status)
      VALUES(@tid,@JobPostingId,@Name,@Email,@Phone,@Address,@LinkedinUrl,@WorkAuthStatus,@PreferredStartDate,@Status);
      SELECT SCOPE_IDENTITY() AS Id`);
    await connector.disconnect();
    return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/hr/applicants/:id/shortlist', requireAuth, async (req, res)=>{
  try{
    const id=parseInt(req.params.id); const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    // Save interview details
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('CandidateId', id)
      .input('InterviewDate', p.interviewDate||null)
      .input('InterviewTimeSlot', p.interviewTime||null)
      .input('InterviewType', p.interviewType||null)
      .input('InterviewerName', p.interviewerName||null)
      .input('InterviewerTitle', p.interviewerTitle||null)
      .input('Reason', p.reason||null);
    await rq.query('INSERT INTO dbo.CandidateInterview(CandidateId,TenantId,InterviewDate,InterviewTimeSlot,InterviewType,InterviewerName,InterviewerTitle,Reason) VALUES(@CandidateId,@tid,@InterviewDate,@InterviewTimeSlot,@InterviewType,@InterviewerName,@InterviewerTitle,@Reason)');
    // Update candidate status
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id)
      .query("UPDATE dbo.Candidate SET Shortlisted=1, ShortlistedAt=GETDATE(), Status='Shortlisted' WHERE Id=@Id AND TenantId=@tid");
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/hr/applicants/:id/evaluation', requireAuth, async (req, res)=>{
  try{
    const id=parseInt(req.params.id); const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('CandidateId', id)
      .input('EvaluatorName', p.interviewerName||null)
      .input('TechnicalSkills', p.technicalSkills||null)
      .input('Teamwork', p.teamwork||null)
      .input('Leadership', p.leadership||null)
      .input('ProblemSolving', p.problemSolving||null)
      .input('Communication', p.communication||null)
      .input('TestDetails', p.testDetails||null)
      .input('Agenda', p.agenda||null)
      .input('Recommendation', p.recommendation||null);
    await rq.query('INSERT INTO dbo.CandidateEvaluation(CandidateId,TenantId,EvaluatorName,TechnicalSkills,Teamwork,Leadership,ProblemSolving,Communication,TestDetails,Agenda,Recommendation) VALUES(@CandidateId,@tid,@EvaluatorName,@TechnicalSkills,@Teamwork,@Leadership,@ProblemSolving,@Communication,@TestDetails,@Agenda,@Recommendation)');
    // Optionally update candidate status based on recommendation
    if(p.recommendation){
      await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).input('Status', p.recommendation)
        .query('UPDATE dbo.Candidate SET Status=@Status WHERE Id=@Id AND TenantId=@tid');
    }
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/hr/applicants/:id/offer', requireAuth, async (req, res)=>{
  try{
    const id=parseInt(req.params.id); const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('CandidateId', id)
      .input('EmploymentType', p.employmentType||null)
      .input('Benefits', p.benefits||null)
      .input('SalaryOffer', p.salaryOffer||null)
      .input('StartDate', p.startDate||null)
      .input('Confidentiality', p.confidentiality?1:0)
      .input('NonCompete', p.nonCompete?1:0)
      .input('AtWill', p.atWill?1:0)
      .input('OfferStatus', p.offerStatus||null);
    await rq.query('INSERT INTO dbo.CandidateOffer(CandidateId,TenantId,EmploymentType,Benefits,SalaryOffer,StartDate,Confidentiality,NonCompete,AtWill,OfferStatus) VALUES(@CandidateId,@tid,@EmploymentType,@Benefits,@SalaryOffer,@StartDate,@Confidentiality,@NonCompete,@AtWill,@OfferStatus)');
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).input('Status', p.offerStatus||'Offered')
      .query('UPDATE dbo.Candidate SET Status=@Status WHERE Id=@Id AND TenantId=@tid');
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Create a new employee (User + CompanyUser) from HR module
app.post('/api/hr/employees', requireAuth, async (req, res)=>{
  try{
    const p = req.body || {};
    const fullName = (p.fullName||'').trim();
    const email = (p.email||'').trim();
    if (!fullName || !email) {
      return res.status(400).json({ success:false, error:'fullName and email required' });
    }
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const tenantId = req.auth.tid || 0;
    const rq = connector.pool.request();
    rq.input('TenantId', parseInt(tenantId))
      .input('Email', email)
      .input('FullName', fullName)
      .input('PasswordHash', null)
      .input('PasswordSalt', null)
      .input('RoleName', p.roleName || null)
      .input('Title', p.title || null);
    const result = await rq.execute('sp_CreateEmployee');
    await connector.disconnect();
    const row = result.recordset?.[0] || {};
    const employeeId = row.CompanyUserId || row.EmployeeId || null;
    return res.json({ success:true, data: row, employeeId });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// HR Employee profile APIs (used by Add New Employee form)
app.get('/api/hr/employees', requireAuth, async (req, res)=>{
  try{
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request().input('tid', req.auth.tid||0);
    const q=`SELECT p.Id AS ProfileId, cu.CompanyUserId, u.UserId, u.FullName, u.Email,
                    p.Department, p.Active, p.Phone, p.Country, p.State, p.Zip
             FROM dbo.CompanyUsers cu
             JOIN dbo.Users u ON u.UserId = cu.UserId
             LEFT JOIN dbo.HrEmployeeProfile p ON p.EmployeeId = cu.CompanyUserId AND p.TenantId = cu.TenantId
             WHERE cu.TenantId=@tid
             ORDER BY u.FullName`;
    const r=await rq.query(q);
    await connector.disconnect();
    return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.get('/api/hr/employees/:id', requireAuth, async (req, res)=>{
  try{
    const empId=parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request().input('tid', req.auth.tid||0).input('Eid', empId);
    const q=`SELECT TOP 1 cu.CompanyUserId, u.UserId, u.FullName, u.Email,
                    p.*
             FROM dbo.CompanyUsers cu
             JOIN dbo.Users u ON u.UserId = cu.UserId
             LEFT JOIN dbo.HrEmployeeProfile p ON p.EmployeeId = cu.CompanyUserId AND p.TenantId = cu.TenantId
             WHERE cu.TenantId=@tid AND cu.CompanyUserId=@Eid`;
    const r=await rq.query(q);
    await connector.disconnect();
    if(!r.recordset.length) return res.status(404).json({ success:false, error:'not found' });
    return res.json({ success:true, data:r.recordset[0] });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.put('/api/hr/employees/:id', requireAuth, async (req, res)=>{
  try{
    const empId=parseInt(req.params.id); const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('EmployeeId', empId)
      .input('Address1', p.address1||null)
      .input('Address2', p.address2||null)
      .input('Active', p.active?1:0)
      .input('Phone', p.phone||null)
      .input('Country', p.country||null)
      .input('State', p.state||null)
      .input('Zip', p.zip||null)
      .input('Fax', p.fax||null)
      .input('Department', p.department||null)
      .input('EmployeeType', p.employeeType||null)
      .input('SSN', p.ssn||null)
      .input('Email', p.email||null)
      .input('HireDate', p.hireDate||null)
      .input('BirthDate', p.birthDate||null)
      .input('Commissionable', p.commissionable?1:0)
      .input('CommissionPercent', p.commissionPercent!=null?parseFloat(p.commissionPercent):null)
      .input('NextOfKinName', p.nextOfKinName||null)
      .input('NextOfKinNumber', p.nextOfKinNumber||null)
      .input('SourceType', p.sourceType||null)
      .input('Industry', p.industry||null)
      .input('GeoLocation', p.geoLocation||null)
      .input('Disability', p.disability||null)
      .input('WorkInjury', p.workInjury||null)
      .input('HealthInsurance', p.healthInsurance||null)
      .input('IdNumber', p.idNumber||null)
      .input('Notes', p.notes||null)
      .input('Heritage', p.heritage||null)
      .input('SexualOrientation', p.sexualOrientation||null)
      .input('JobDescription', p.jobDescription||null);
    await rq.query(`MERGE dbo.HrEmployeeProfile AS t
      USING (SELECT @tid AS TenantId, @EmployeeId AS EmployeeId) s
      ON t.TenantId=s.TenantId AND t.EmployeeId=s.EmployeeId
      WHEN MATCHED THEN UPDATE SET
        Address1=@Address1, Address2=@Address2, Active=@Active, Phone=@Phone,
        Country=@Country, State=@State, Zip=@Zip, Fax=@Fax, Department=@Department,
        EmployeeType=@EmployeeType, SSN=@SSN, Email=@Email, HireDate=@HireDate, BirthDate=@BirthDate,
        Commissionable=@Commissionable, CommissionPercent=@CommissionPercent, NextOfKinName=@NextOfKinName,
        NextOfKinNumber=@NextOfKinNumber, SourceType=@SourceType, Industry=@Industry, GeoLocation=@GeoLocation,
        Disability=@Disability, WorkInjury=@WorkInjury, HealthInsurance=@HealthInsurance, IdNumber=@IdNumber,
        Notes=@Notes, Heritage=@Heritage, SexualOrientation=@SexualOrientation, JobDescription=@JobDescription,
        UpdatedAt=GETDATE()
      WHEN NOT MATCHED THEN INSERT(TenantId,EmployeeId,Address1,Address2,Active,Phone,Country,State,Zip,Fax,Department,EmployeeType,SSN,Email,HireDate,BirthDate,Commissionable,CommissionPercent,NextOfKinName,NextOfKinNumber,SourceType,Industry,GeoLocation,Disability,WorkInjury,HealthInsurance,IdNumber,Notes,Heritage,SexualOrientation,JobDescription)
        VALUES(@tid,@EmployeeId,@Address1,@Address2,@Active,@Phone,@Country,@State,@Zip,@Fax,@Department,@EmployeeType,@SSN,@Email,@HireDate,@BirthDate,@Commissionable,@CommissionPercent,@NextOfKinName,@NextOfKinNumber,@SourceType,@Industry,@GeoLocation,@Disability,@WorkInjury,@HealthInsurance,@IdNumber,@Notes,@Heritage,@SexualOrientation,@JobDescription);`);
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// HR Employee Totals (Month/Quarter/Year to date)
app.get('/api/hr/employees/:id/totals', requireAuth, async (req, res)=>{
  try{
    const empId=parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request().input('tid', req.auth.tid||0).input('Eid', empId);
    const r=await rq.query('SELECT TOP 1 * FROM dbo.HrEmployeeTotals WHERE TenantId=@tid AND EmployeeId=@Eid');
    await connector.disconnect();
    return res.json({ success:true, data:r.recordset[0] || {} });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.put('/api/hr/employees/:id/totals', requireAuth, async (req, res)=>{
  try{
    const empId=parseInt(req.params.id); const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureHrTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0)
      .input('EmployeeId', empId)
      .input('MTD_Gross', p.MTD_Gross!=null?parseFloat(p.MTD_Gross):null)
      .input('MTD_State', p.MTD_State!=null?parseFloat(p.MTD_State):null)
      .input('QTD_Gross', p.QTD_Gross!=null?parseFloat(p.QTD_Gross):null)
      .input('QTD_State', p.QTD_State!=null?parseFloat(p.QTD_State):null)
      .input('YTD_Gross', p.YTD_Gross!=null?parseFloat(p.YTD_Gross):null)
      .input('YTD_State', p.YTD_State!=null?parseFloat(p.YTD_State):null)
      .input('MTD_Fica', p.MTD_Fica!=null?parseFloat(p.MTD_Fica):null)
      .input('QTD_Fica', p.QTD_Fica!=null?parseFloat(p.QTD_Fica):null)
      .input('YTD_Fica', p.YTD_Fica!=null?parseFloat(p.YTD_Fica):null)
      .input('MTD_Local', p.MTD_Local!=null?parseFloat(p.MTD_Local):null)
      .input('QTD_Local', p.QTD_Local!=null?parseFloat(p.QTD_Local):null)
      .input('YTD_Local', p.YTD_Local!=null?parseFloat(p.YTD_Local):null)
      .input('MTD_Federal', p.MTD_Federal!=null?parseFloat(p.MTD_Federal):null)
      .input('QTD_Federal', p.QTD_Federal!=null?parseFloat(p.QTD_Federal):null)
      .input('YTD_Federal', p.YTD_Federal!=null?parseFloat(p.YTD_Federal):null)
      .input('MTD_Other', p.MTD_Other!=null?parseFloat(p.MTD_Other):null)
      .input('QTD_Other', p.QTD_Other!=null?parseFloat(p.QTD_Other):null)
      .input('YTD_Other', p.YTD_Other!=null?parseFloat(p.YTD_Other):null);
    await rq.query(`MERGE dbo.HrEmployeeTotals AS t
      USING (SELECT @tid AS TenantId, @EmployeeId AS EmployeeId) s
      ON t.TenantId=s.TenantId AND t.EmployeeId=s.EmployeeId
      WHEN MATCHED THEN UPDATE SET
        MTD_Gross=@MTD_Gross, MTD_State=@MTD_State, QTD_Gross=@QTD_Gross, QTD_State=@QTD_State,
        YTD_Gross=@YTD_Gross, YTD_State=@YTD_State,
        MTD_Fica=@MTD_Fica, QTD_Fica=@QTD_Fica, YTD_Fica=@YTD_Fica,
        MTD_Local=@MTD_Local, QTD_Local=@QTD_Local, YTD_Local=@YTD_Local,
        MTD_Federal=@MTD_Federal, QTD_Federal=@QTD_Federal, YTD_Federal=@YTD_Federal,
        MTD_Other=@MTD_Other, QTD_Other=@QTD_Other, YTD_Other=@YTD_Other,
        UpdatedAt=GETDATE()
      WHEN NOT MATCHED THEN INSERT(TenantId,EmployeeId,MTD_Gross,MTD_State,QTD_Gross,QTD_State,YTD_Gross,YTD_State,MTD_Fica,QTD_Fica,YTD_Fica,MTD_Local,QTD_Local,YTD_Local,MTD_Federal,QTD_Federal,YTD_Federal,MTD_Other,QTD_Other,YTD_Other)
        VALUES(@tid,@EmployeeId,@MTD_Gross,@MTD_State,@QTD_Gross,@QTD_State,@YTD_Gross,@YTD_State,@MTD_Fica,@QTD_Fica,@YTD_Fica,@MTD_Local,@QTD_Local,@YTD_Local,@MTD_Federal,@QTD_Federal,@YTD_Federal,@MTD_Other,@QTD_Other,@YTD_Other);`);
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== CRM EXTRA (Notes & Segments) ====================
async function ensureCrmExtraTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.PhoneNotes','U') IS NULL BEGIN
      CREATE TABLE dbo.PhoneNotes(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Subject NVARCHAR(255) NULL,
        Body NVARCHAR(MAX) NOT NULL,
        FollowUpAt DATETIME2 NULL,
        CustomerName NVARCHAR(255) NULL,
        SalesPersonName NVARCHAR(255) NULL,
        CreatedBy INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_PhoneNotes_Tenant ON dbo.PhoneNotes(TenantId, CreatedAt DESC);
    END;
    IF COL_LENGTH('dbo.PhoneNotes','FollowUpAt') IS NULL ALTER TABLE dbo.PhoneNotes ADD FollowUpAt DATETIME2 NULL;
    IF COL_LENGTH('dbo.PhoneNotes','CustomerName') IS NULL ALTER TABLE dbo.PhoneNotes ADD CustomerName NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.PhoneNotes','SalesPersonName') IS NULL ALTER TABLE dbo.PhoneNotes ADD SalesPersonName NVARCHAR(255) NULL;
    IF OBJECT_ID('dbo.Segments','U') IS NULL BEGIN
      CREATE TABLE dbo.Segments(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_Segments_Tenant ON dbo.Segments(TenantId, Name);
    END;
    IF OBJECT_ID('dbo.CrmSegmentCompanies','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmSegmentCompanies(
        SegmentId INT NOT NULL,
        CompanyId INT NOT NULL,
        TenantId INT NOT NULL,
        CONSTRAINT PK_CrmSegmentCompanies PRIMARY KEY(SegmentId, CompanyId, TenantId)
      );
    END;`);
}

// CRM Notes
app.get('/api/crm/notes', requireAuth, async (req, res)=>{
  try{
    const { customer, salesperson, from, to } = req.query;
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector);
    let sqlTxt = 'SELECT Id, Subject, Body, FollowUpAt, CreatedAt, CustomerName, SalesPersonName FROM dbo.PhoneNotes WHERE TenantId=@tid';
    const rq = connector.pool.request().input('tid', req.auth.tid||0);
    if (customer) { sqlTxt += ' AND CustomerName = @cust'; rq.input('cust', customer); }
    if (salesperson) { sqlTxt += ' AND SalesPersonName = @sales'; rq.input('sales', salesperson); }
    if (from) { sqlTxt += ' AND CreatedAt >= @fromd'; rq.input('fromd', new Date(from)); }
    if (to) { sqlTxt += ' AND CreatedAt <= @tod'; rq.input('tod', new Date(to)); }
    sqlTxt += ' ORDER BY COALESCE(FollowUpAt, CreatedAt) DESC';
    const r=await rq.query(sqlTxt);
    await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/crm/notes', requireAuth, async (req, res)=>{
  try{
    const p=req.body||{};
    const body=(p.body||'').trim();
    const subject=(p.subject||'').trim();
    if(!body) return res.status(400).json({ success:false, error:'body required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector);
    const rq = connector.pool.request()
      .input('tid', req.auth.tid||0)
      .input('uid', req.auth.uid)
      .input('sub', subject||null)
      .input('body', body)
      .input('fua', p.followUpAt? new Date(p.followUpAt): null)
      .input('cust', p.customerName||null)
      .input('sales', p.salesPersonName||null);
    const r=await rq.query('INSERT INTO dbo.PhoneNotes(TenantId,Subject,Body,FollowUpAt,CustomerName,SalesPersonName,CreatedBy) VALUES(@tid,@sub,@body,@fua,@cust,@sales,@uid); SELECT SCOPE_IDENTITY() AS Id');
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// CRM Segments
app.get('/api/crm/segments', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).query('SELECT Id, Name, CreatedAt FROM dbo.Segments WHERE TenantId=@tid ORDER BY Name');
    await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/crm/segments', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const name=(p.name||'').trim(); if(!name) return res.status(400).json({ success:false, error:'name required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).input('Name', name).query('INSERT INTO dbo.Segments(TenantId,Name) VALUES(@tid,@Name); SELECT SCOPE_IDENTITY() AS Id');
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/crm/segments/:id', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector);
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).query('DELETE FROM dbo.Segments WHERE Id=@Id AND TenantId=@tid; DELETE FROM dbo.CrmSegmentCompanies WHERE SegmentId=@Id AND TenantId=@tid;');
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Segment companies membership
app.get('/api/crm/segments/:id/companies', requireAuth, async (req, res)=>{
  try{
    const segId = parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector); await ensureCrmCoreTables(connector);
    const rq = connector.pool.request().input('tid', req.auth.tid||0).input('sid', segId);
    const sql = `SELECT c.Id, c.CompanyName, c.City, c.Country, c.Status
                 FROM dbo.CrmSegmentCompanies sc
                 JOIN dbo.CrmCompanies c ON c.Id=sc.CompanyId AND c.TenantId=sc.TenantId
                 WHERE sc.TenantId=@tid AND sc.SegmentId=@sid
                 ORDER BY c.CompanyName`;
    const r = await rq.query(sql);
    await connector.disconnect();
    return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/crm/segments/:id/companies', requireAuth, express.json(), async (req, res)=>{
  try{
    const segId = parseInt(req.params.id);
    const body = req.body||{};
    const ids = Array.isArray(body.companyIds)? body.companyIds.map(x=>parseInt(x)).filter(x=>x>0): [];
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmExtraTables(connector); await ensureCrmCoreTables(connector);
    const tid = req.auth.tid||0;
    await connector.pool.request().input('sid', segId).input('tid', tid).query('DELETE FROM dbo.CrmSegmentCompanies WHERE SegmentId=@sid AND TenantId=@tid');
    for(const cid of ids){ await connector.pool.request().input('sid', segId).input('cid', cid).input('tid', tid).query('INSERT INTO dbo.CrmSegmentCompanies(SegmentId,CompanyId,TenantId) VALUES(@sid,@cid,@tid)'); }
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// CRM Core tables (Companies, Persons, Categories)
async function ensureCrmCoreTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.CrmCompanies','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmCompanies(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        CompanyName NVARCHAR(255) NOT NULL,
        CompanyDetails NVARCHAR(MAX) NULL,
        CompanyType NVARCHAR(50) NULL,
        Product NVARCHAR(255) NULL,
        HSCode NVARCHAR(100) NULL,
        Phone NVARCHAR(100) NULL,
        CellPhone NVARCHAR(100) NULL,
        Whatsapp NVARCHAR(100) NULL,
        Website NVARCHAR(255) NULL,
        Address NVARCHAR(255) NULL,
        City NVARCHAR(100) NULL,
        State NVARCHAR(100) NULL,
        Zip NVARCHAR(50) NULL,
        Country NVARCHAR(100) NULL,
        NTN NVARCHAR(100) NULL,
        Instagram NVARCHAR(255) NULL,
        Facebook NVARCHAR(255) NULL,
        Twitter NVARCHAR(255) NULL,
        Linkedin NVARCHAR(255) NULL,
        Skype NVARCHAR(255) NULL,
        SourceOfContact NVARCHAR(100) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT('Lead'), -- Lead, Account, NA
        SavedUpdatedOn DATETIME2 NULL,
        SendEmailOnSave BIT NOT NULL DEFAULT(0),
        CreatedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CrmCompanies_Tenant ON dbo.CrmCompanies(TenantId, CompanyName);
    END;
    IF OBJECT_ID('dbo.CrmContactPersons','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmContactPersons(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CompanyId INT NOT NULL,
        FirstName NVARCHAR(100) NULL,
        LastName NVARCHAR(100) NULL,
        Designation NVARCHAR(100) NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(100) NULL,
        CellPhone NVARCHAR(100) NULL,
        Whatsapp NVARCHAR(100) NULL,
        Linkedin NVARCHAR(255) NULL,
        Skype NVARCHAR(255) NULL
      );
      CREATE INDEX IX_CrmPersons_Company ON dbo.CrmContactPersons(CompanyId);
    END;
    IF OBJECT_ID('dbo.CrmCategories','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmCategories(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        RoleCode NVARCHAR(50) NOT NULL, -- buyer, manufacturer, supplier, etc
        Name NVARCHAR(100) NOT NULL
      );
      CREATE INDEX IX_CrmCategories_TenantRole ON dbo.CrmCategories(TenantId, RoleCode);
    END;
    IF OBJECT_ID('dbo.CrmCompanyCategoryMap','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmCompanyCategoryMap(
        CompanyId INT NOT NULL,
        CategoryId INT NOT NULL,
        PRIMARY KEY(CompanyId, CategoryId)
      );
    END;`);
}

app.get('/api/crm/countries', requireAuth, async (_req, res)=>{
  const list = [
    'United States','United Kingdom','Canada','Germany','France','Italy','Spain','Netherlands','Sweden','Norway','Denmark','Finland','Poland','Czech Republic','Switzerland','Austria','Ireland','Portugal','Belgium','Australia','New Zealand','India','Pakistan','Bangladesh','China','Japan','South Korea','Singapore','Malaysia','Thailand','Vietnam','Indonesia','United Arab Emirates','Saudi Arabia','Qatar','Bahrain','Oman','Kuwait','Egypt','South Africa','Brazil','Mexico','Argentina','Chile'
  ];
  res.json({ success:true, data:list });
});

app.get('/api/crm/categories', requireAuth, async (req, res)=>{
  try{ const role=(req.query.role||'').toLowerCase()||'buyer'; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    // seed a few if missing
    const r1=await connector.pool.request().input('tid', req.auth.tid||0).input('role', role).query('SELECT Id, Name FROM dbo.CrmCategories WHERE TenantId=@tid AND RoleCode=@role ORDER BY Name');
    if(r1.recordset.length===0){
      const defaults = role==='buyer'? ['Retailer','Wholesaler','Brand','Other'] : role==='manufacturer'? ['OEM','ODM','Contract','Other'] : ['Preferred','Standard','Blocked','Other'];
      for(const n of defaults){ await connector.pool.request().input('tid', req.auth.tid||0).input('role', role).input('Name', n).query('INSERT INTO dbo.CrmCategories(TenantId,RoleCode,Name) VALUES(@tid,@role,@Name)'); }
    }
    const r=await connector.pool.request().input('tid', req.auth.tid||0).input('role', role).query('SELECT Id, Name FROM dbo.CrmCategories WHERE TenantId=@tid AND RoleCode=@role ORDER BY Name');
    await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Create company with persons and category ids
app.post('/api/crm/companies', requireAuth, async (req, res)=>{
  try{
    const p=req.body||{}; const name=(p.companyName||'').trim(); if(!name) return res.status(400).json({success:false,error:'companyName required'});
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    const rq=connector.pool.request();
    rq.input('tid', req.auth.tid||0).input('uid', req.auth.uid||null)
      .input('CompanyName', name).input('CompanyDetails', p.companyDetails||null).input('CompanyType', p.companyType||null)
      .input('Product', p.product||null).input('HSCode', p.hsCode||null)
      .input('Phone', p.phone||null).input('CellPhone', p.cellPhone||null).input('Whatsapp', p.whatsapp||null)
      .input('Website', p.website||null).input('Address', p.address||null).input('City', p.city||null).input('State', p.state||null)
      .input('Zip', p.zip||null).input('Country', p.country||null).input('NTN', p.ntn||null)
      .input('Instagram', p.instagram||null).input('Facebook', p.facebook||null).input('Twitter', p.twitter||null)
      .input('Linkedin', p.linkedin||null).input('Skype', p.skype||null)
      .input('SourceOfContact', p.sourceOfContact||null).input('Status', p.status||'Lead')
      .input('SavedUpdatedOn', p.savedUpdatedOn? new Date(p.savedUpdatedOn): null).input('SendEmailOnSave', p.sendEmailOnSave?1:0);
    const r=await rq.query(`INSERT INTO dbo.CrmCompanies(TenantId,CompanyName,CompanyDetails,CompanyType,Product,HSCode,Phone,CellPhone,Whatsapp,Website,Address,City,State,Zip,Country,NTN,Instagram,Facebook,Twitter,Linkedin,Skype,SourceOfContact,Status,SavedUpdatedOn,SendEmailOnSave,CreatedBy)
      VALUES(@tid,@CompanyName,@CompanyDetails,@CompanyType,@Product,@HSCode,@Phone,@CellPhone,@Whatsapp,@Website,@Address,@City,@State,@Zip,@Country,@NTN,@Instagram,@Facebook,@Twitter,@Linkedin,@Skype,@SourceOfContact,@Status,@SavedUpdatedOn,@SendEmailOnSave,@uid);
      SELECT SCOPE_IDENTITY() AS Id`);
    const companyId = r.recordset[0].Id;
    // Persons
    const persons = Array.isArray(p.persons)? p.persons: [];
    for(const person of persons){ await connector.pool.request().input('CompanyId', companyId)
      .input('FirstName', person.firstName||null).input('LastName', person.lastName||null).input('Designation', person.designation||null)
      .input('Email', person.email||null).input('Phone', person.phone||null).input('CellPhone', person.cellPhone||null).input('Whatsapp', person.whatsapp||null)
      .input('Linkedin', person.linkedin||null).input('Skype', person.skype||null)
      .query('INSERT INTO dbo.CrmContactPersons(CompanyId,FirstName,LastName,Designation,Email,Phone,CellPhone,Whatsapp,Linkedin,Skype) VALUES(@CompanyId,@FirstName,@LastName,@Designation,@Email,@Phone,@CellPhone,@Whatsapp,@Linkedin,@Skype)'); }
    // Categories
    const catIds = Array.isArray(p.categoryIds)? p.categoryIds: [];
    for(const cid of catIds){ const id=parseInt(cid); if(id>0){ await connector.pool.request().input('CompanyId', companyId).input('CategoryId', id).query('INSERT INTO dbo.CrmCompanyCategoryMap(CompanyId,CategoryId) VALUES(@CompanyId,@CategoryId)'); }}
    await connector.disconnect();
    return res.json({ success:true, id: companyId });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Get single company with persons and categories
app.get('/api/crm/companies/:id', requireAuth, async (req, res)=>{
  try{
    const id = parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    const rq = connector.pool.request().input('Id', id).input('tid', req.auth.tid||0);
    const c = await rq.query('SELECT TOP 1 * FROM dbo.CrmCompanies WHERE Id=@Id AND TenantId=@tid');
    if(!c.recordset.length){ await connector.disconnect(); return res.status(404).json({ success:false, error:'not found' }); }
    const company = c.recordset[0];
    const persons = (await connector.pool.request().input('CompanyId', id).query('SELECT * FROM dbo.CrmContactPersons WHERE CompanyId=@CompanyId ORDER BY Id')).recordset;
    const cats = (await connector.pool.request().input('CompanyId', id).query('SELECT CategoryId FROM dbo.CrmCompanyCategoryMap WHERE CompanyId=@CompanyId')).recordset.map(r=>r.CategoryId);
    await connector.disconnect();
    return res.json({ success:true, data:{ company, persons, categoryIds: cats } });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Update company
app.put('/api/crm/companies/:id', requireAuth, async (req, res)=>{
  try{
    const id = parseInt(req.params.id);
    const p=req.body||{};
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    const rq=connector.pool.request().input('Id', id).input('tid', req.auth.tid||0)
      .input('CompanyName', p.companyName||null).input('CompanyDetails', p.companyDetails||null).input('CompanyType', p.companyType||null)
      .input('Product', p.product||null).input('HSCode', p.hsCode||null)
      .input('Phone', p.phone||null).input('CellPhone', p.cellPhone||null).input('Whatsapp', p.whatsapp||null)
      .input('Website', p.website||null).input('Address', p.address||null).input('City', p.city||null).input('State', p.state||null)
      .input('Zip', p.zip||null).input('Country', p.country||null).input('NTN', p.ntn||null)
      .input('Instagram', p.instagram||null).input('Facebook', p.facebook||null).input('Twitter', p.twitter||null)
      .input('Linkedin', p.linkedin||null).input('Skype', p.skype||null)
      .input('SourceOfContact', p.sourceOfContact||null).input('Status', p.status||null)
      .input('SavedUpdatedOn', p.savedUpdatedOn? new Date(p.savedUpdatedOn): null).input('SendEmailOnSave', p.sendEmailOnSave?1:0);
    await rq.query(`UPDATE dbo.CrmCompanies SET
        CompanyName = COALESCE(@CompanyName, CompanyName),
        CompanyDetails = COALESCE(@CompanyDetails, CompanyDetails),
        CompanyType = COALESCE(@CompanyType, CompanyType),
        Product = COALESCE(@Product, Product),
        HSCode = COALESCE(@HSCode, HSCode),
        Phone = COALESCE(@Phone, Phone),
        CellPhone = COALESCE(@CellPhone, CellPhone),
        Whatsapp = COALESCE(@Whatsapp, Whatsapp),
        Website = COALESCE(@Website, Website),
        Address = COALESCE(@Address, Address),
        City = COALESCE(@City, City),
        State = COALESCE(@State, State),
        Zip = COALESCE(@Zip, Zip),
        Country = COALESCE(@Country, Country),
        NTN = COALESCE(@NTN, NTN),
        Instagram = COALESCE(@Instagram, Instagram),
        Facebook = COALESCE(@Facebook, Facebook),
        Twitter = COALESCE(@Twitter, Twitter),
        Linkedin = COALESCE(@Linkedin, Linkedin),
        Skype = COALESCE(@Skype, Skype),
        SourceOfContact = COALESCE(@SourceOfContact, SourceOfContact),
        Status = COALESCE(@Status, Status),
        SavedUpdatedOn = COALESCE(@SavedUpdatedOn, SavedUpdatedOn),
        SendEmailOnSave = COALESCE(@SendEmailOnSave, SendEmailOnSave)
      WHERE Id=@Id AND TenantId=@tid`);
    // Replace persons
    const persons = Array.isArray(p.persons)? p.persons: [];
    await connector.pool.request().input('CompanyId', id).query('DELETE FROM dbo.CrmContactPersons WHERE CompanyId=@CompanyId');
    for(const person of persons){ await connector.pool.request().input('CompanyId', id)
      .input('FirstName', person.firstName||null).input('LastName', person.lastName||null).input('Designation', person.designation||null)
      .input('Email', person.email||null).input('Phone', person.phone||null).input('CellPhone', person.cellPhone||null).input('Whatsapp', person.whatsapp||null)
      .input('Linkedin', person.linkedin||null).input('Skype', person.skype||null)
      .query('INSERT INTO dbo.CrmContactPersons(CompanyId,FirstName,LastName,Designation,Email,Phone,CellPhone,Whatsapp,Linkedin,Skype) VALUES(@CompanyId,@FirstName,@LastName,@Designation,@Email,@Phone,@CellPhone,@Whatsapp,@Linkedin,@Skype)'); }
    // Replace categories
    await connector.pool.request().input('CompanyId', id).query('DELETE FROM dbo.CrmCompanyCategoryMap WHERE CompanyId=@CompanyId');
    const catIds = Array.isArray(p.categoryIds)? p.categoryIds: [];
    for(const cid of catIds){ const cidNum=parseInt(cid); if(cidNum>0){ await connector.pool.request().input('CompanyId', id).input('CategoryId', cidNum).query('INSERT INTO dbo.CrmCompanyCategoryMap(CompanyId,CategoryId) VALUES(@CompanyId,@CategoryId)'); }}
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// List/search companies
app.get('/api/crm/companies', requireAuth, async (req, res)=>{
  try{ const q=(req.query.q||'').toString().trim(); const role=(req.query.role||'').toLowerCase(); const status=(req.query.status||'').toString();
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    let sqlTxt = `SELECT TOP 200 c.Id, c.CompanyName, c.CompanyType, c.Product, c.Phone, c.City, c.State, c.Zip, c.Country, c.Status,
                    (SELECT TOP 1 (COALESCE(p.FirstName,'')+' '+COALESCE(p.LastName,'')) FROM dbo.CrmContactPersons p WHERE p.CompanyId=c.Id) AS ContactName,
                    (SELECT TOP 1 p.Email FROM dbo.CrmContactPersons p WHERE p.CompanyId=c.Id AND p.Email IS NOT NULL) AS Email
                  FROM dbo.CrmCompanies c WHERE c.TenantId=@tid`;
    const rq = connector.pool.request().input('tid', req.auth.tid||0);
    if(q){ sqlTxt += ' AND (c.CompanyName LIKE @q OR c.City LIKE @q OR c.State LIKE @q)'; rq.input('q','%'+q+'%'); }
    if(status){ sqlTxt += ' AND c.Status=@status'; rq.input('status', status); }
    if(role){ sqlTxt += ` AND EXISTS(SELECT 1 FROM dbo.CrmCategories cc JOIN dbo.CrmCompanyCategoryMap m ON m.CategoryId=cc.Id AND m.CompanyId=c.Id WHERE cc.TenantId=c.TenantId AND LOWER(cc.RoleCode)=@role)`; rq.input('role', role); }
    sqlTxt += ' ORDER BY c.CompanyName';
    const r=await rq.query(sqlTxt); await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.delete('/api/crm/companies/:id', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    await connector.pool.request().input('Id', id).query('DELETE FROM dbo.CrmCompanyCategoryMap WHERE CompanyId=@Id; DELETE FROM dbo.CrmContactPersons WHERE CompanyId=@Id; DELETE FROM dbo.CrmCompanies WHERE Id=@Id');
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Upgrade: Lead -> Account -> NA
app.post('/api/crm/companies/:id/upgrade', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmCoreTables(connector);
    const r=await connector.pool.request().input('Id', id).query('SELECT TOP 1 Status FROM dbo.CrmCompanies WHERE Id=@Id');
    if(r.recordset.length===0){ await connector.disconnect(); return res.status(404).json({ success:false, error:'not found' }); }
    const st=(r.recordset[0].Status||'Lead'); const next = st==='Lead'? 'Account' : st==='Account'? 'NA' : 'Lead';
    await connector.pool.request().input('Id', id).input('Status', next).query('UPDATE dbo.CrmCompanies SET Status=@Status WHERE Id=@Id');
    await connector.disconnect(); return res.json({ success:true, status: next });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// CRM Dashboard core tables (Appointments, Campaigns, Accounts, Leads)
async function ensureCrmDashboardTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.CrmAppointments','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmAppointments(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Company NVARCHAR(255) NULL,
        Notes NVARCHAR(MAX) NULL,
        WhenAt DATETIME2 NOT NULL,
        CreatedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CrmAppointments_Tenant ON dbo.CrmAppointments(TenantId, WhenAt);
    END;
    IF OBJECT_ID('dbo.CrmEmailCampaigns','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmEmailCampaigns(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Subject NVARCHAR(255) NULL,
        ScheduledAt DATETIME2 NULL,
        CreatedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CrmCampaigns_Tenant ON dbo.CrmEmailCampaigns(TenantId, CreatedAt DESC);
    END;
    IF OBJECT_ID('dbo.CrmAccounts','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmAccounts(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CrmAccounts_Tenant ON dbo.CrmAccounts(TenantId);
    END;
    IF OBJECT_ID('dbo.CrmLeads','U') IS NULL BEGIN
      CREATE TABLE dbo.CrmLeads(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_CrmLeads_Tenant ON dbo.CrmLeads(TenantId);
    END;`);
}

// CRM Dashboard APIs
app.get('/api/crm/appointments', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmDashboardTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).query(`SELECT TOP 50 Id, Company, Notes, WhenAt, CreatedAt FROM dbo.CrmAppointments WHERE TenantId=@tid ORDER BY WhenAt ASC`);
    await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/crm/appointments', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const whenAt=p.whenAt? new Date(p.whenAt): null; if(!whenAt) return res.status(400).json({success:false,error:'whenAt required'});
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmDashboardTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).input('comp', (p.company||null)).input('notes', (p.notes||null)).input('whenAt', whenAt).input('uid', req.auth.uid||null)
      .query(`INSERT INTO dbo.CrmAppointments(TenantId,Company,Notes,WhenAt,CreatedBy) VALUES(@tid,@comp,@notes,@whenAt,@uid); SELECT SCOPE_IDENTITY() AS Id`);
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.get('/api/crm/campaigns', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmDashboardTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).query(`SELECT TOP 50 Id, Name, Subject, ScheduledAt, CreatedAt FROM dbo.CrmEmailCampaigns WHERE TenantId=@tid ORDER BY CreatedAt DESC`);
    await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/crm/campaigns', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const name=(p.name||'').trim(); if(!name) return res.status(400).json({ success:false, error:'name required' });
    const when = p.scheduledAt? new Date(p.scheduledAt): null;
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmDashboardTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).input('Name', name).input('Subject', p.subject||null).input('ScheduledAt', when).input('uid', req.auth.uid||null)
      .query(`INSERT INTO dbo.CrmEmailCampaigns(TenantId,Name,Subject,ScheduledAt,CreatedBy) VALUES(@tid,@Name,@Subject,@ScheduledAt,@uid); SELECT SCOPE_IDENTITY() AS Id`);
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.get('/api/crm/summary', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCrmDashboardTables(connector);
    const qContacts = await connector.pool.request().query('SELECT COUNT(*) AS C FROM contactTest');
    const qLeads = await connector.pool.request().input('tid', req.auth.tid||0).query('SELECT COUNT(*) AS C FROM dbo.CrmLeads WHERE TenantId=@tid');
    const qAccounts = await connector.pool.request().input('tid', req.auth.tid||0).query('SELECT COUNT(*) AS C FROM dbo.CrmAccounts WHERE TenantId=@tid');
    await connector.disconnect(); return res.json({ success:true, data:{ contacts: qContacts.recordset[0]?.C||0, leads: qLeads.recordset[0]?.C||0, accounts: qAccounts.recordset[0]?.C||0 } });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== EMAIL / MAILBOX ====================
async function ensureEmailTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.Emails','U') IS NULL BEGIN
      CREATE TABLE dbo.Emails(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        UserId INT NULL,
        Folder NVARCHAR(20) NOT NULL DEFAULT('Inbox'),
        FromAddress NVARCHAR(320) NULL,
        ToAddresses NVARCHAR(MAX) NULL,
        CcAddresses NVARCHAR(MAX) NULL,
        Subject NVARCHAR(500) NULL,
        Body NVARCHAR(MAX) NULL,
        AttachmentsJson NVARCHAR(MAX) NULL,
        SentAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_Emails_TenantUserFolder ON dbo.Emails(TenantId, UserId, Folder, CreatedAt DESC);
    END;
    IF COL_LENGTH('dbo.Emails','CcAddresses') IS NULL ALTER TABLE dbo.Emails ADD CcAddresses NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.Emails','AttachmentsJson') IS NULL ALTER TABLE dbo.Emails ADD AttachmentsJson NVARCHAR(MAX) NULL;
  `);
}

app.get('/api/crm/email', requireAuth, async (req, res)=>{
  try{
    const folder = (req.query.folder||'Inbox').toString();
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureEmailTables(connector);
    const rq = connector.pool.request().input('tid', req.auth.tid||0).input('uid', req.auth.uid||null).input('folder', folder);
    const sql = `SELECT Id, Folder, FromAddress, ToAddresses, CcAddresses, Subject, Body, AttachmentsJson, SentAt, CreatedAt
                 FROM dbo.Emails WHERE TenantId=@tid AND (UserId=@uid OR @uid IS NULL) AND Folder=@folder
                 ORDER BY COALESCE(SentAt, CreatedAt) DESC`;
    const r = await rq.query(sql);
    await connector.disconnect();
    return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.get('/api/crm/email/:id', requireAuth, async (req, res)=>{
  try{
    const id = parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureEmailTables(connector);
    const rq = connector.pool.request().input('tid', req.auth.tid||0).input('uid', req.auth.uid||null).input('id', id);
    const sql = `SELECT TOP 1 Id, Folder, FromAddress, ToAddresses, CcAddresses, Subject, Body, AttachmentsJson, SentAt, CreatedAt
                 FROM dbo.Emails WHERE TenantId=@tid AND (UserId=@uid OR @uid IS NULL) AND Id=@id`;
    const r = await rq.query(sql);
    await connector.disconnect();
    if(!r.recordset.length) return res.status(404).json({ success:false, error:'not found' });
    return res.json({ success:true, data:r.recordset[0] });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.post('/api/crm/email', requireAuth, express.json({ limit:'2mb' }), async (req, res)=>{
  try{
    const p = req.body||{};
    const folder = (p.folder||'Sent').toString();
    const toAddresses = (p.toAddresses||'').toString();
    const ccAddresses = (p.ccAddresses||'').toString()||null;
    const subject = (p.subject||'').toString();
    const body = (p.body||'').toString();
    const attachments = Array.isArray(p.attachments)? p.attachments: [];
    const attachmentsJson = attachments.length? JSON.stringify(attachments): null;
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureEmailTables(connector);
    const rq = connector.pool.request()
      .input('tid', req.auth.tid||0)
      .input('uid', req.auth.uid||null)
      .input('folder', folder)
      .input('from', null)
      .input('to', toAddresses||null)
      .input('cc', ccAddresses)
      .input('sub', subject||null)
      .input('body', body||null)
      .input('att', attachmentsJson)
      .input('sent', folder==='Sent'? new Date(): null);
    const sql = `INSERT INTO dbo.Emails(TenantId,UserId,Folder,FromAddress,ToAddresses,CcAddresses,Subject,Body,AttachmentsJson,SentAt)
                 VALUES(@tid,@uid,@folder,@from,@to,@cc,@sub,@body,@att,@sent);
                 SELECT SCOPE_IDENTITY() AS Id`;
    const r = await rq.query(sql);
    await connector.disconnect();
    return res.json({ success:true, id: r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

app.delete('/api/crm/email/:id', requireAuth, async (req, res)=>{
  try{
    const id = parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureEmailTables(connector);
    await connector.pool.request().input('tid', req.auth.tid||0).input('uid', req.auth.uid||null).input('id', id)
      .query('DELETE FROM dbo.Emails WHERE TenantId=@tid AND (UserId=@uid OR @uid IS NULL) AND Id=@id');
    await connector.disconnect();
    return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== ACCOUNTING (Banks & Ledger) ====================
async function ensureAccountingTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.Banks','U') IS NULL BEGIN
      CREATE TABLE dbo.Banks(
        BankId INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        AccountTitle NVARCHAR(200) NULL,
        AccountNumber NVARCHAR(100) NULL,
        BranchName NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        OpeningBalance DECIMAL(18,2) NOT NULL DEFAULT(0),
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_Banks_Tenant ON dbo.Banks(TenantId);
    END;
    IF COL_LENGTH('dbo.Banks','BranchName') IS NULL ALTER TABLE dbo.Banks ADD BranchName NVARCHAR(200) NULL;
    IF COL_LENGTH('dbo.Banks','Notes') IS NULL ALTER TABLE dbo.Banks ADD Notes NVARCHAR(MAX) NULL;
    IF OBJECT_ID('dbo.BankLedger','U') IS NULL BEGIN
      CREATE TABLE dbo.BankLedger(
        LedgerId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        BankId INT NOT NULL,
        EntryType CHAR(2) NOT NULL, -- CR or DR
        Amount DECIMAL(18,2) NOT NULL,
        Quantity INT NULL,
        Reference NVARCHAR(256) NULL,
        Party NVARCHAR(256) NULL,
        SlipNumber NVARCHAR(100) NULL,
        DocUrl NVARCHAR(MAX) NULL,
        EntryDate DATETIME2 NOT NULL DEFAULT(GETDATE()),
        CreatedBy INT NULL
      );
      CREATE INDEX IX_Ledger_TenantBank ON dbo.BankLedger(TenantId, BankId, EntryDate);
    END;
    IF COL_LENGTH('dbo.BankLedger','SlipNumber') IS NULL ALTER TABLE dbo.BankLedger ADD SlipNumber NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.BankLedger','DocUrl') IS NULL ALTER TABLE dbo.BankLedger ADD DocUrl NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.BankLedger','Quantity') IS NULL ALTER TABLE dbo.BankLedger ADD Quantity INT NULL;
  `);
}

// Banks: list
app.get('/api/accounting/banks', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).query("SELECT BankId, Name, AccountTitle, AccountNumber, BranchName, Notes, OpeningBalance, CreatedAt FROM dbo.Banks WHERE TenantId=@tid ORDER BY Name");
    await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
// Banks: get
app.get('/api/accounting/banks/:id', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const r=await connector.pool.request().input('tid', req.auth.tid||0).input('id', id).query("SELECT TOP 1 BankId, Name, AccountTitle, AccountNumber, BranchName, Notes, OpeningBalance, CreatedAt FROM dbo.Banks WHERE TenantId=@tid AND BankId=@id");
    await connector.disconnect(); return res.json({ success:true, data:r.recordset[0]||null });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
// Banks: create
app.post('/api/accounting/banks', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const name=(p.name||'').trim(); if(!name) return res.status(400).json({success:false,error:'name required'});
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const rq=connector.pool.request(); rq.input('tid', req.auth.tid||0); rq.input('Name', name); rq.input('AccountTitle', p.title||null); rq.input('AccountNumber', p.number||null); rq.input('BranchName', p.branchName||null); rq.input('Notes', p.notes||null); rq.input('OpeningBalance', parseFloat(p.openingBalance||0)||0);
    const r=await rq.query("INSERT INTO dbo.Banks(TenantId,Name,AccountTitle,AccountNumber,BranchName,Notes,OpeningBalance) VALUES(@tid,@Name,@AccountTitle,@AccountNumber,@BranchName,@Notes,@OpeningBalance); SELECT SCOPE_IDENTITY() AS BankId");
    await connector.disconnect(); return res.json({ success:true, id: r.recordset[0].BankId });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Ledger: list (optional filters: bankId, type, ref)
app.get('/api/accounting/ledger', requireAuth, async (req, res)=>{
  try{
    const bankId = parseInt(req.query.bankId||'')||null;
    const type = (req.query.type||'').toUpperCase()==='CR' ? 'CR' : (req.query.type||'').toUpperCase()==='DR' ? 'DR' : null;
    const limit = parseInt(req.query.limit||'') || 0;
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    let sqlTxt = 'SELECT ' + (limit>0 ? 'TOP (@lim) ' : '') + 'LedgerId, BankId, EntryType, Amount, Quantity, Reference, Party, SlipNumber, DocUrl, EntryDate FROM dbo.BankLedger WHERE TenantId=@tid';
    const rq=connector.pool.request().input('tid', req.auth.tid||0);
    if(limit>0){ rq.input('lim', limit); }
    if(bankId){ sqlTxt+=' AND BankId=@bid'; rq.input('bid', bankId); }
    if(type){ sqlTxt+=' AND EntryType=@et'; rq.input('et', type); }
    sqlTxt+=' ORDER BY EntryDate DESC, LedgerId DESC';
    const r=await rq.query(sqlTxt); await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
// Ledger: add single entry
app.post('/api/accounting/ledger', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const bankId=parseInt(p.bankId||''); const amount=Number(p.amount||0); const type=(p.type||'').toUpperCase(); if(!bankId||!amount||!(type==='CR'||type==='DR')) return res.status(400).json({success:false,error:'bankId, amount, type required'});
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const rq=connector.pool.request(); rq.input('tid', req.auth.tid||0); rq.input('bid', bankId); rq.input('et', type); rq.input('amt', amount); rq.input('qty', p.quantity!=null? parseInt(p.quantity)||0 : null); rq.input('ref', p.reference||null); rq.input('party', p.party||null); rq.input('slip', p.slipNumber||null); rq.input('doc', p.docUrl||null); rq.input('dt', p.entryDate? new Date(p.entryDate): new Date()); rq.input('uid', req.auth.uid||null);
    const r=await rq.query("INSERT INTO dbo.BankLedger(TenantId,BankId,EntryType,Amount,Quantity,Reference,Party,SlipNumber,DocUrl,EntryDate,CreatedBy) VALUES(@tid,@bid,@et,@amt,@qty,@ref,@party,@slip,@doc,@dt,@uid); SELECT SCOPE_IDENTITY() AS LedgerId");
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].LedgerId });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
// Transfer: DR from source, CR to target
app.post('/api/accounting/transfer', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const fromId=parseInt(p.fromId||''); const toId=parseInt(p.toId||''); const amount=Number(p.amount||0); const reference=p.reference||'Internal transfer'; if(!fromId||!toId||!amount||fromId===toId) return res.status(400).json({success:false,error:'Invalid params'});
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const now=new Date();
    const rq=connector.pool.request(); rq.input('tid', req.auth.tid||0); rq.input('uid', req.auth.uid||null); rq.input('amt', amount); rq.input('ref', reference); rq.input('dt', now); rq.input('from', fromId); rq.input('to', toId);
    await rq.query(`INSERT INTO dbo.BankLedger(TenantId,BankId,EntryType,Amount,Reference,Party,EntryDate,CreatedBy) VALUES(@tid,@from,'DR',@amt,@ref,'Transfer to '+CAST(@to AS NVARCHAR(50)),@dt,@uid);
                    INSERT INTO dbo.BankLedger(TenantId,BankId,EntryType,Amount,Reference,Party,EntryDate,CreatedBy) VALUES(@tid,@to,'CR',@amt,@ref,'Transfer from '+CAST(@from AS NVARCHAR(50)),@dt,@uid);`);
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== ACCOUNTING (AP/AR/Deposits & Summary) ====================
async function ensureApArTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.APInvoices','U') IS NULL BEGIN
      CREATE TABLE dbo.APInvoices(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        OrderId NVARCHAR(100) NULL,
        ProductName NVARCHAR(255) NULL,
        DueDate DATE NULL,
        SupplierName NVARCHAR(255) NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT('Pending'), -- Pending, Approved, Paid
        DocUrl NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        BankId INT NULL,
        CreatedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        ApprovedBy INT NULL,
        ApprovedAt DATETIME2 NULL,
        PaidBy INT NULL,
        PaidAt DATETIME2 NULL
      );
      CREATE INDEX IX_AP_Tenant_Status ON dbo.APInvoices(TenantId, Status);
    END;
    IF OBJECT_ID('dbo.ARInvoices','U') IS NULL BEGIN
      CREATE TABLE dbo.ARInvoices(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL,
        OrderId NVARCHAR(100) NULL,
        ProductName NVARCHAR(255) NULL,
        DueDate DATE NULL,
        CustomerName NVARCHAR(255) NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT('Pending'), -- Pending, Received
        DocUrl NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        BankId INT NULL,
        CreatedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
        ReceivedBy INT NULL,
        ReceivedAt DATETIME2 NULL
      );
      CREATE INDEX IX_AR_Tenant_Status ON dbo.ARInvoices(TenantId, Status);
    END;`);
}

// AP: list/create/approve/pay
app.get('/api/accounting/ap', requireAuth, async (req, res)=>{
  try{ const status=((req.query.status||'').toString()||null); const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector); await ensureApArTables(connector);
    let sqlTxt = 'SELECT Id, OrderId, ProductName, DueDate, SupplierName, Amount, Status, DocUrl, Notes, BankId, CreatedAt, ApprovedAt, PaidAt FROM dbo.APInvoices WHERE TenantId=@tid';
    const rq = connector.pool.request().input('tid', req.auth.tid||0);
    if(status){ sqlTxt += ' AND Status=@st'; rq.input('st', status); }
    sqlTxt += ' ORDER BY CreatedAt DESC, Id DESC';
    const r=await rq.query(sqlTxt); await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/accounting/ap', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const amt=Number(p.amount||0); if(!amt) return res.status(400).json({ success:false, error:'amount required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector); await ensureApArTables(connector);
    const rq=connector.pool.request(); rq.input('tid', req.auth.tid||0).input('OrderId', p.orderId||null).input('ProductName', p.productName||null).input('DueDate', p.dueDate? new Date(p.dueDate): null).input('SupplierName', p.supplierName||null).input('Amount', amt).input('DocUrl', p.docUrl||null).input('Notes', p.notes||null).input('uid', req.auth.uid||null);
    const r=await rq.query("INSERT INTO dbo.APInvoices(TenantId,OrderId,ProductName,DueDate,SupplierName,Amount,DocUrl,Notes,CreatedBy) VALUES(@tid,@OrderId,@ProductName,@DueDate,@SupplierName,@Amount,@DocUrl,@Notes,@uid); SELECT SCOPE_IDENTITY() AS Id");
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/accounting/ap/:id/approve', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id||''); if(!id) return res.status(400).json({ success:false, error:'id required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureApArTables(connector);
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).input('uid', req.auth.uid||null).query("UPDATE dbo.APInvoices SET Status='Approved', ApprovedAt=GETDATE(), ApprovedBy=@uid WHERE TenantId=@tid AND Id=@Id AND Status='Pending'");
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/accounting/ap/:id/pay', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id||''); const p=req.body||{}; const bankId=parseInt(p.bankId||''); if(!id||!bankId) return res.status(400).json({ success:false, error:'id and bankId required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector); await ensureApArTables(connector);
    // Load invoice
    const invRes = await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).query('SELECT TOP 1 * FROM dbo.APInvoices WHERE TenantId=@tid AND Id=@Id');
    const inv = invRes.recordset[0]; if(!inv) { await connector.disconnect(); return res.status(404).json({ success:false, error:'not found' }); }
    const payAmt = Number(p.amount||inv.Amount||0);
    const reference = p.reference || (inv.OrderId? ('AP '+inv.OrderId): ('AP#'+id));
    const party = inv.SupplierName || 'Supplier';
    const rq = connector.pool.request(); rq.input('tid', req.auth.tid||0).input('bid', bankId).input('amt', payAmt).input('ref', reference).input('party', party).input('slip', p.slipNumber||null).input('doc', p.docUrl||null).input('dt', new Date()).input('uid', req.auth.uid||null);
    await rq.query("INSERT INTO dbo.BankLedger(TenantId,BankId,EntryType,Amount,Reference,Party,SlipNumber,DocUrl,EntryDate,CreatedBy) VALUES(@tid,@bid,'DR',@amt,@ref,@party,@slip,@doc,@dt,@uid)");
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).input('uid', req.auth.uid||null).input('bid', bankId).query("UPDATE dbo.APInvoices SET Status='Paid', PaidAt=GETDATE(), PaidBy=@uid, BankId=@bid WHERE TenantId=@tid AND Id=@Id");
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// AR: list/create/receive
app.get('/api/accounting/ar', requireAuth, async (req, res)=>{
  try{ const status=((req.query.status||'').toString()||null); const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector); await ensureApArTables(connector);
    let sqlTxt = 'SELECT Id, OrderId, ProductName, DueDate, CustomerName, Amount, Status, DocUrl, Notes, BankId, CreatedAt, ReceivedAt FROM dbo.ARInvoices WHERE TenantId=@tid';
    const rq = connector.pool.request().input('tid', req.auth.tid||0);
    if(status){ sqlTxt += ' AND Status=@st'; rq.input('st', status); }
    sqlTxt += ' ORDER BY CreatedAt DESC, Id DESC';
    const r=await rq.query(sqlTxt); await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/accounting/ar', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const amt=Number(p.amount||0); if(!amt) return res.status(400).json({ success:false, error:'amount required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector); await ensureApArTables(connector);
    const rq=connector.pool.request(); rq.input('tid', req.auth.tid||0).input('OrderId', p.orderId||null).input('ProductName', p.productName||null).input('DueDate', p.dueDate? new Date(p.dueDate): null).input('CustomerName', p.customerName||null).input('Amount', amt).input('DocUrl', p.docUrl||null).input('Notes', p.notes||null).input('uid', req.auth.uid||null);
    const r=await rq.query("INSERT INTO dbo.ARInvoices(TenantId,OrderId,ProductName,DueDate,CustomerName,Amount,DocUrl,Notes,CreatedBy) VALUES(@tid,@OrderId,@ProductName,@DueDate,@CustomerName,@Amount,@DocUrl,@Notes,@uid); SELECT SCOPE_IDENTITY() AS Id");
    await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/accounting/ar/:id/receive', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id||''); const p=req.body||{}; const bankId=parseInt(p.bankId||''); if(!id||!bankId) return res.status(400).json({ success:false, error:'id and bankId required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector); await ensureApArTables(connector);
    const invRes = await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).query('SELECT TOP 1 * FROM dbo.ARInvoices WHERE TenantId=@tid AND Id=@Id');
    const inv = invRes.recordset[0]; if(!inv){ await connector.disconnect(); return res.status(404).json({ success:false, error:'not found' }); }
    const recAmt = Number(p.amount||inv.Amount||0);
    const reference = p.reference || (inv.OrderId? ('AR '+inv.OrderId): ('AR#'+id));
    const party = inv.CustomerName || 'Customer';
    const rq = connector.pool.request(); rq.input('tid', req.auth.tid||0).input('bid', bankId).input('amt', recAmt).input('ref', reference).input('party', party).input('slip', p.slipNumber||null).input('doc', p.docUrl||null).input('dt', new Date()).input('uid', req.auth.uid||null);
    await rq.query("INSERT INTO dbo.BankLedger(TenantId,BankId,EntryType,Amount,Reference,Party,SlipNumber,DocUrl,EntryDate,CreatedBy) VALUES(@tid,@bid,'CR',@amt,@ref,@party,@slip,@doc,@dt,@uid)");
    await connector.pool.request().input('tid', req.auth.tid||0).input('Id', id).input('uid', req.auth.uid||null).input('bid', bankId).query("UPDATE dbo.ARInvoices SET Status='Received', ReceivedAt=GETDATE(), ReceivedBy=@uid, BankId=@bid WHERE TenantId=@tid AND Id=@Id");
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Bank deposit endpoint (CR into bank with slip/doc)
app.post('/api/accounting/deposits', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const bankId=parseInt(p.bankId||''); const amt=Number(p.amount||0)||0; if(!bankId||!amt) return res.status(400).json({ success:false, error:'bankId and amount required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const rq=connector.pool.request(); rq.input('tid', req.auth.tid||0).input('bid', bankId).input('amt', amt).input('ref', p.reference||'Deposit').input('party', p.notes||null).input('slip', p.slipNumber||null).input('doc', p.docUrl||null).input('dt', new Date()).input('uid', req.auth.uid||null);
    await rq.query("INSERT INTO dbo.BankLedger(TenantId,BankId,EntryType,Amount,Reference,Party,SlipNumber,DocUrl,EntryDate,CreatedBy) VALUES(@tid,@bid,'CR',@amt,@ref,@party,@slip,@doc,@dt,@uid)");
    await connector.disconnect(); return res.json({ success:true });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Bank summary (with current balance)
app.get('/api/accounting/bank-summary', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureAccountingTables(connector);
    const rq = connector.pool.request().input('tid', req.auth.tid||0);
    const q = `SELECT b.BankId, b.Name, b.AccountTitle, b.AccountNumber, b.BranchName, b.Notes, b.OpeningBalance,
      b.OpeningBalance + (
        SELECT COALESCE(SUM(CASE WHEN l.EntryType='CR' THEN l.Amount ELSE -l.Amount END),0)
        FROM dbo.BankLedger l WHERE l.TenantId=b.TenantId AND l.BankId=b.BankId
      ) AS Balance
      FROM dbo.Banks b WHERE b.TenantId=@tid ORDER BY b.Name`;
    const r = await rq.query(q); await connector.disconnect(); return res.json({ success:true, data:r.recordset });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Generic upload (data URL -> /public/uploads)
app.post('/api/uploads', requireAuth, express.json({ limit:'20mb' }), async (req, res)=>{
  try{ const dataUrl=(req.body?.dataUrl||'').toString(); const filename=(req.body?.filename||'upload').toString(); const m=dataUrl.match(/^data:([\w\-/]+);base64,(.+)$/i); if(!m) return res.status(400).json({ success:false, error:'invalid dataUrl' });
    const extGuess = (m[1]||'').split('/')[1] || 'bin'; const safeExt = extGuess.replace(/[^a-z0-9]/gi,'');
    const buf = Buffer.from(m[2], 'base64'); const fs=require('fs'); const dir=path.join(__dirname,'../public/uploads'); try{ fs.mkdirSync(dir,{recursive:true}); }catch{}
    const unique = Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    const out = path.join(dir, `${filename}-${unique}.${safeExt||'bin'}`);
    fs.writeFileSync(out, buf);
    const publicUrl = '/uploads/'+path.basename(out);
    return res.json({ success:true, url: publicUrl });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== INGESTION APIS (OCR / PDF / Excel / DOCX) ====================

// OCR for images (e.g., visiting cards)
app.post('/api/ingest/ocr', requireAuth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'file required' });
    }
    const result = await Tesseract.recognize(req.file.buffer, 'eng');
    const text = (result && result.data && result.data.text) ? result.data.text : '';
    return res.json({ success: true, data: { text } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Extract plain text from PDF
app.post('/api/ingest/pdf', requireAuth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'file required' });
    }
    const data = await pdfParse(req.file.buffer);
    const text = (data && data.text) ? data.text : '';
    return res.json({ success: true, data: { text } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Read Excel / CSV (first sheet) into JSON rows
app.post('/api/ingest/excel', requireAuth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'file required' });
    }
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return res.json({ success: true, data: { rows: [] } });
    const sheet = wb.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (rows.length > 500) rows = rows.slice(0, 500);
    return res.json({ success: true, data: { sheetName, rows } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Extract text from DOCX (Word)
app.post('/api/ingest/docx', requireAuth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'file required' });
    }
    const r = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = (r && r.value) ? r.value : '';
    return res.json({ success: true, data: { text } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// CRM-specific: visiting card -> CRM company/contact (uses OCR + helper)
app.post('/api/crm/contacts/ingest-card', requireAuth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'file required' });
    }
    const result = await Tesseract.recognize(req.file.buffer, 'eng');
    const text = (result && result.data && result.data.text) ? result.data.text : '';
    const ctx = { tenantId: req.auth && req.auth.tid, userId: req.auth && req.auth.uid };
    const saveRes = await createCrmContactFromText(text, ctx);
    return res.json({ success: true, data: { ocrText: text, saveResult: saveRes } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== CHAT MODULE ====================
async function ensureChatTables(connector){
  await connector.pool.request().query(`
    IF OBJECT_ID('dbo.Conversations','U') IS NULL BEGIN
      CREATE TABLE dbo.Conversations(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NULL,
        Title NVARCHAR(255) NOT NULL,
        CreatedBy INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
    END;
    IF OBJECT_ID('dbo.ConversationMembers','U') IS NULL BEGIN
      CREATE TABLE dbo.ConversationMembers(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ConversationId INT NOT NULL,
        UserId INT NOT NULL,
        AddedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE UNIQUE INDEX IX_ConvMembers_Conv_User ON dbo.ConversationMembers(ConversationId, UserId);
    END;
    IF OBJECT_ID('dbo.Messages','U') IS NULL BEGIN
      CREATE TABLE dbo.Messages(
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ConversationId INT NOT NULL,
        UserId INT NOT NULL,
        Body NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
      );
      CREATE INDEX IX_Messages_Conv ON dbo.Messages(ConversationId, CreatedAt DESC);
    END;`);
}

// List selectable users (same tenant first)
app.get('/api/chat/users', requireAuth, async (req, res) => {
  try{
    const connector = new AzureSQLConnector(); await connector.connect();
    const tidParam = parseInt(req.query.tenantId || '') || null;
    const effectiveTid = tidParam || req.auth.tid || null;
    let qres;
    if(effectiveTid){
      qres = await connector.pool.request().input('tid', effectiveTid).query(`
        SELECT u.UserId, u.FullName, u.Email, u.AvatarUrl
        FROM dbo.CompanyUsers cu JOIN dbo.Users u ON u.UserId = cu.UserId
        WHERE cu.TenantId = @tid AND ISNULL(u.IsActive,1)=1
        ORDER BY u.FullName`);
    } else {
      qres = await connector.pool.request().query(`SELECT TOP 200 UserId, FullName, Email, AvatarUrl FROM dbo.Users WHERE ISNULL(IsActive,1)=1 ORDER BY FullName`);
    }
    let list = qres.recordset || [];

    // Fallback 1: if empty, use the user's primary tenant membership
    if(list.length === 0){
      try{
        const mid = await connector.pool.request().input('uid', req.auth.uid).query(`SELECT TOP 1 TenantId FROM dbo.CompanyUsers WHERE UserId=@uid ORDER BY IsOwner DESC`);
        const mtid = mid.recordset[0]?.TenantId || null;
        if(mtid){
          const r2 = await connector.pool.request().input('tid', mtid).query(`
            SELECT u.UserId, u.FullName, u.Email, u.AvatarUrl
            FROM dbo.CompanyUsers cu JOIN dbo.Users u ON u.UserId = cu.UserId
            WHERE cu.TenantId = @tid AND ISNULL(u.IsActive,1)=1
            ORDER BY u.FullName`);
          list = r2.recordset || [];
        }
      }catch{}
    }

    // Fallback 2: auto-seed demo users when enabled, then re-query with membership
    if(list.length === 0 && process.env.AUTO_SEED_DEMO !== '0'){
      try{
        const emails = ['hr@demo.example','sales@demo.example','buyer@demo.example','supplier@demo.example','designer@demo.example','auditor@demo.example','safety@demo.example','inspection@demo.example'];
        for(const e of emails){ try{ await ensureDemoUser(e); }catch{} }
        const mid = await connector.pool.request().input('uid', req.auth.uid).query(`SELECT TOP 1 TenantId FROM dbo.CompanyUsers WHERE UserId=@uid ORDER BY IsOwner DESC`);
        const mtid = mid.recordset[0]?.TenantId || effectiveTid || null;
        if(mtid){
          const r3 = await connector.pool.request().input('tid', mtid).query(`
            SELECT u.UserId, u.FullName, u.Email, u.AvatarUrl
            FROM dbo.CompanyUsers cu JOIN dbo.Users u ON u.UserId = cu.UserId
            WHERE cu.TenantId = @tid AND ISNULL(u.IsActive,1)=1
            ORDER BY u.FullName`);
          list = r3.recordset || [];
        }
      }catch{}
    }

    await connector.disconnect();
    res.json({ success:true, data: list });
  }catch(e){ res.status(500).json({ success:false, error: e.message }); }
});

// List conversations for current user
app.get('/api/chat/conversations', requireAuth, async (req, res) => {
  try{
    const connector = new AzureSQLConnector(); await connector.connect(); await ensureChatTables(connector);
const r = await connector.pool.request().input('uid', req.auth.uid).query(`
      SELECT c.Id, c.Title, c.CreatedAt,
             (SELECT TOP 1 Body FROM dbo.Messages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC) AS LastBody,
             (SELECT TOP 1 CreatedAt FROM dbo.Messages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC) AS LastAt
      FROM dbo.Conversations c
      WHERE EXISTS(SELECT 1 FROM dbo.ConversationMembers m WHERE m.ConversationId=c.Id AND m.UserId=@uid)
      ORDER BY COALESCE((SELECT TOP 1 CreatedAt FROM dbo.Messages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC), c.CreatedAt) DESC`);
    await connector.disconnect();
    res.json({ success:true, data: r.recordset });
  }catch(e){ res.status(500).json({ success:false, error: e.message }); }
});

// Create conversation (handler)
async function createConversation(req, res){
  try{
    const title = (req.body?.title||'').trim();
    const memberIds = Array.isArray(req.body?.memberIds)? req.body.memberIds.map(x=>parseInt(x)).filter(n=>Number.isFinite(n)&&n>0): [];
    if(!title) return res.status(400).json({ success:false, error:'title required' });
    const connector = new AzureSQLConnector(); await connector.connect(); await ensureChatTables(connector);
    const tenantId = parseInt(req.body?.tenantId||'') || req.auth.tid || null;
    const rq = connector.pool.request();
    rq.input('Title', title); rq.input('uid', req.auth.uid); rq.input('tid', tenantId);
    const conv = await rq.query('INSERT INTO dbo.Conversations(Title, CreatedBy, TenantId) VALUES(@Title, @uid, @tid); SELECT SCOPE_IDENTITY() AS Id');
    const convId = conv.recordset[0].Id;
    const uniqueIds = Array.from(new Set([req.auth.uid].concat(memberIds)));
    for(const id of uniqueIds){ await connector.pool.request().input('cid', convId).input('uid', id).query('INSERT INTO dbo.ConversationMembers(ConversationId, UserId) VALUES(@cid, @uid)'); }
    await connector.disconnect();
    return res.json({ success:true, data: { id: convId } });
  }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
}

// Create conversation (routes)
app.post('/api/chat/conversations', requireAuth, express.json(), createConversation);
app.post('/api/chat/create', requireAuth, express.json(), createConversation);
app.post('/api/chat/conversations/create', requireAuth, express.json(), createConversation);
app.post('/api/chat/start', requireAuth, express.json(), createConversation);

// Get messages for a conversation
app.get('/api/chat/conversations/:id/messages', requireAuth, async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureChatTables(connector);
    // verify membership
    const mem = await connector.pool.request().input('cid', id).input('uid', req.auth.uid)
      .query('SELECT 1 FROM dbo.ConversationMembers WHERE ConversationId=@cid AND UserId=@uid');
    if(mem.recordset.length===0){ await connector.disconnect(); return res.status(403).json({ success:false, error:'forbidden' }); }
    const r = await connector.pool.request().input('cid', id)
      .query(`SELECT m.Id, m.Body, m.CreatedAt, u.UserId, u.FullName, u.AvatarUrl
              FROM dbo.Messages m JOIN dbo.Users u ON u.UserId = m.UserId
              WHERE m.ConversationId = @cid ORDER BY m.CreatedAt ASC`);
    await connector.disconnect();
    res.json({ success:true, data: r.recordset });
  }catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// Post a message
app.post('/api/chat/conversations/:id/messages', requireAuth, express.json(), async (req, res) => {
  try{
    const id = parseInt(req.params.id); const body = (req.body?.body||'').trim();
    if(!body) return res.status(400).json({ success:false, error:'body required' });
    const connector=new AzureSQLConnector(); await connector.connect(); await ensureChatTables(connector);
    // verify membership
    const mem = await connector.pool.request().input('cid', id).input('uid', req.auth.uid)
      .query('SELECT 1 FROM dbo.ConversationMembers WHERE ConversationId=@cid AND UserId=@uid');
    if(mem.recordset.length===0){ await connector.disconnect(); return res.status(403).json({ success:false, error:'forbidden' }); }
    const r = await connector.pool.request().input('cid', id).input('uid', req.auth.uid).input('Body', body)
      .query('INSERT INTO dbo.Messages(ConversationId, UserId, Body) VALUES(@cid, @uid, @Body); SELECT SCOPE_IDENTITY() AS Id');
    await connector.disconnect();
    res.json({ success:true, id: r.recordset[0].Id });
  }catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// ==================== PROFILE/COMPANY CONTINUES ====================
// Certifications CRUD
app.get('/api/company/certifications', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).query('SELECT * FROM CompanyCertification WHERE TenantId=@tid ORDER BY Name'); await connector.disconnect(); return res.json({ success:true, data:r.recordset }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/certifications', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; if(!p.name) return res.status(400).json({ success:false, error:'name required' }); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request()
      .input('tid', req.auth.tid)
      .input('Type', p.type||null)
      .input('Policy', p.policy||null)
      .input('Name', p.name)
      .input('ValidFrom', p.validFrom||null)
      .input('ValidTill', p.validTill||null)
      .input('Detail', p.detail||null)
      .query('INSERT INTO CompanyCertification(TenantId,Type,Policy,Name,ValidFrom,ValidTill,Detail) VALUES(@tid,@Type,@Policy,@Name,@ValidFrom,@ValidTill,@Detail); SELECT SCOPE_IDENTITY() AS Id'); await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/certifications/:id/image', requireAuth, express.json({limit:'12mb'}), async (req, res)=>{
  try{ const id=parseInt(req.params.id); const dataUrl=req.body?.dataUrl||''; const m=dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i); if(!m) return res.status(400).json({ success:false, error:'Invalid image' }); const ext=m[2].toLowerCase()==='jpeg'?'jpg':m[2].toLowerCase(); const buf=Buffer.from(m[3],'base64'); const fs=require('fs'); const dir=path.join(__dirname,'../public/uploads'); try{ fs.mkdirSync(dir,{recursive:true}); }catch{} const filename=`tenant-${req.auth.tid}-cert-${id}.${ext}`; const fpath=path.join(dir,filename); fs.writeFileSync(fpath, buf); const publicUrl='/uploads/'+filename; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', id).input('url', publicUrl).query('UPDATE CompanyCertification SET CertImageUrl=@url, UpdatedAt=GETDATE() WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true, url: publicUrl }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/certifications/:id/logo', requireAuth, express.json({limit:'12mb'}), async (req, res)=>{
  try{ const id=parseInt(req.params.id); const dataUrl=req.body?.dataUrl||''; const m=dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i); if(!m) return res.status(400).json({ success:false, error:'Invalid image' }); const ext=m[2].toLowerCase()==='jpeg'?'jpg':m[2].toLowerCase(); const buf=Buffer.from(m[3],'base64'); const fs=require('fs'); const dir=path.join(__dirname,'../public/uploads'); try{ fs.mkdirSync(dir,{recursive:true}); }catch{} const filename=`tenant-${req.auth.tid}-certlogo-${id}.${ext}`; const fpath=path.join(dir,filename); fs.writeFileSync(fpath, buf); const publicUrl='/uploads/'+filename; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', id).input('url', publicUrl).query('UPDATE CompanyCertification SET LogoUrl=@url, UpdatedAt=GETDATE() WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true, url: publicUrl }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/company/certifications/:id', requireAuth, async (req, res)=>{  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', parseInt(req.params.id)).query('DELETE FROM CompanyCertification WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// Unions CRUD
app.get('/api/company/unions', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).query('SELECT Id, Name, Description FROM CompanyUnion WHERE TenantId=@tid ORDER BY Name'); await connector.disconnect(); return res.json({ success:true, data:r.recordset }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.post('/api/company/unions', requireAuth, async (req, res)=>{
  try{ const p=req.body||{}; const name=(p.name||'').trim(); if(!name) return res.status(400).json({ success:false, error:'name required' }); const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); const r=await connector.pool.request().input('tid', req.auth.tid).input('Name', name).input('Description', (p.description||null)).query('INSERT INTO CompanyUnion(TenantId,Name,Description) VALUES(@tid,@Name,@Description); SELECT SCOPE_IDENTITY() AS Id'); await connector.disconnect(); return res.json({ success:true, id:r.recordset[0].Id }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.put('/api/company/unions/:id', requireAuth, async (req, res)=>{
  try{ const id=parseInt(req.params.id); const p=req.body||{}; const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', id).input('Name', (p.name||null)).input('Description', (p.description||null)).query('UPDATE CompanyUnion SET Name=COALESCE(@Name,Name), Description=COALESCE(@Description,Description), UpdatedAt=GETDATE() WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});
app.delete('/api/company/unions/:id', requireAuth, async (req, res)=>{
  try{ const connector=new AzureSQLConnector(); await connector.connect(); await ensureCompanyProfileTables(connector); await connector.pool.request().input('tid', req.auth.tid).input('Id', parseInt(req.params.id)).query('DELETE FROM CompanyUnion WHERE Id=@Id AND TenantId=@tid'); await connector.disconnect(); return res.json({ success:true }); }catch(e){ return res.status(500).json({ success:false, error:e.message }); }
});

// ==================== SAFETY OFFICER API ROUTES ====================

// ==================== SAFETY OFFICER API ROUTES ====================
// Setup safety routes
const { setupSafetyRoutes } = require('./safety-api');
let safetyPool = null;

// Initialize database connection for safety routes
async function initSafetyPool() {
  if (safetyPool && safetyPool.connected) return safetyPool;
  
  try {
    const config = {
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'SeApp2',
      user: process.env.AZURE_SQL_USERNAME || 'turtle',
      password: process.env.AZURE_SQL_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectionTimeout: 30000,
        requestTimeout: 30000,
      },
      pool: {
        max: 10,
        min: 2,  // Keep at least 2 connections alive
        idleTimeoutMillis: 300000  // 5 minutes instead of 30 seconds
      }
    };
    
    // IMPORTANT: use a dedicated pool instance, not the global default
    safetyPool = new sql.ConnectionPool(config);
    await safetyPool.connect();
    console.log('✅ Safety Officer database connection established');
    
    // Handle connection errors
    safetyPool.on('error', err => {
      console.error('❌ Database pool error:', err.message);
    });
    
    return safetyPool;
  } catch (err) {
    console.error('❌ Failed to connect safety database:', err.message);
    throw err;
  }
}

// Initialize safety pool and start server after routes are ready
initSafetyPool()
  .then(pool => {
    setupSafetyRoutes(app, pool);
    // Safety Agent (document ingestion with approval)
    try { require('./safety-agent-api').setupSafetyAgentRoutes(app, pool, requireAuth); } catch (e) { console.warn('SafetyAgent not loaded:', e.message); }
    return autoSeedDemoIfNeeded();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log('🌐 SaaS Agent Web GUI started!');
      console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
      console.log(`🔧 API available at: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  - GET  / (Home page)');
      console.log('  - GET  /login (Login page)');
      console.log('  - GET  /register (Registration page)');
      console.log('  - POST /api/auth/register (Register owner)');
      console.log('  - POST /api/auth/login (Login)');
      console.log('  - POST /api/auth/logout (Logout)');
      console.log('  - POST /api/test-connection (Test database)');
      console.log('  - GET  /api/contacts (View contacts)');
      console.log('  - POST /api/contacts (Add contact)');
      console.log('  - PUT  /api/contacts/:id (Edit contact)');
      console.log('  - DELETE /api/contacts/:id (Delete contact)');
      console.log('  - DELETE /api/contacts (Delete all contacts)');
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ Failed to start web server:', err.message);
    process.exit(1);
  });
