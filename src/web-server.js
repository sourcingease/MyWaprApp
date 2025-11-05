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

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', true);

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
app.use(express.json());
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
    if(!connector){ connector = new AzureSQLConnector(); await connector.connect(); created = true; }
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
    END;`);
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
});

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
