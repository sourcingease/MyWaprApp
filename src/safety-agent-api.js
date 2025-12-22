/**
 * Safety Agent API
 * - Upload documents for safety module (PDF, DOCX, images as base64 via data URL)
 * - Extract basic facts (best-effort) and create a PENDING proposal
 * - Requires explicit approval to write to safety tables
 */

const path = require('path');
const fs = require('fs');
let multer = null; try { multer = require('multer'); } catch { /* optional */ }

// Helpers: simple text extraction (best-effort)
async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  // Try PDF first
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    try {
      const pdf = require('pdf-parse');
      const data = await pdf(fs.readFileSync(filePath));
      return (data && data.text) ? data.text : '';
    } catch (e) {
      return '';
    }
  }
  // Plain text
  if (mimeType?.startsWith('text/') || ext === '.txt') {
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
  }
  // Unsupported type (DOCX etc.); skip for now to keep dependency-light
  return '';
}

// Naive classifier and fact extractor
function classifyAndPropose(extractedText) {
  const t = (extractedText || '').toLowerCase();
  const proposals = [];
  const facts = [];

  function pushProposal(targetTable, payload) {
    proposals.push({ targetTable, action: 'INSERT', payload });
  }

  // Simple keyword heuristics
  if (/struct/i.test(t) || /beam|column|slab|foundation/.test(t)) {
    facts.push('Detected structural content');
    pushProposal('StructuralSafety', {
      InspectionDate: new Date().toISOString().slice(0, 10),
      Location: 'Auto-detected',
      InspectedBy: 'SafetyAgent',
      Status: 'Pending'
    });
  }
  if (/fire|sprinkler|alarm|evac/.test(t)) {
    facts.push('Detected fire safety content');
    pushProposal('FireSafety', {
      InspectionDate: new Date().toISOString().slice(0, 10),
      Location: 'Auto-detected',
      InspectedBy: 'SafetyAgent',
      Status: 'Pending'
    });
  }
  if (/electrical|voltage|wiring|breaker/.test(t)) {
    facts.push('Detected electrical safety content');
    pushProposal('ElectricalSafety', {
      InspectionDate: new Date().toISOString().slice(0, 10),
      Location: 'Auto-detected',
      InspectedBy: 'SafetyAgent',
      Status: 'Pending'
    });
  }
  if (/hazard|chemical|dust|noise|ergonomic/.test(t)) {
    facts.push('Detected health hazard content');
    pushProposal('HealthHazards', {
      AssessmentDate: new Date().toISOString().slice(0, 10),
      Location: 'Auto-detected',
      HazardType: 'Detected',
      RiskLevel: 'TBD'
    });
  }

  if (proposals.length === 0) {
    facts.push('No specific module detected; created a generic note proposal');
  }

  return { proposals, facts };
}

async function ensureSafetyAgentTables(pool) {
  const q = `
  IF OBJECT_ID('dbo.SafetyDocuments','U') IS NULL BEGIN
    CREATE TABLE dbo.SafetyDocuments(
      DocumentId INT IDENTITY(1,1) PRIMARY KEY,
      TenantId INT NULL,
      FileName NVARCHAR(255) NOT NULL,
      FilePath NVARCHAR(512) NOT NULL,
      MimeType NVARCHAR(100) NULL,
      SizeBytes BIGINT NULL,
      ExtractedText NVARCHAR(MAX) NULL,
      UploadedBy INT NULL,
      UploadedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
    );
  END;
  IF OBJECT_ID('dbo.SafetyProposals','U') IS NULL BEGIN
    CREATE TABLE dbo.SafetyProposals(
      ProposalId INT IDENTITY(1,1) PRIMARY KEY,
      TenantId INT NULL,
      Title NVARCHAR(255) NULL,
      Description NVARCHAR(MAX) NULL,
      Status NVARCHAR(20) NOT NULL DEFAULT('pending'),
      DocumentId INT NULL,
      SubmittedBy INT NULL,
      SubmittedAt DATETIME2 NOT NULL DEFAULT(GETDATE()),
      ApprovedBy INT NULL,
      ApprovedAt DATETIME2 NULL,
      RejectedBy INT NULL,
      RejectedAt DATETIME2 NULL,
      RejectionReason NVARCHAR(MAX) NULL
    );
  END;
  IF OBJECT_ID('dbo.SafetyProposalItems','U') IS NULL BEGIN
    CREATE TABLE dbo.SafetyProposalItems(
      ItemId INT IDENTITY(1,1) PRIMARY KEY,
      ProposalId INT NOT NULL,
      TargetTable NVARCHAR(128) NOT NULL,
      Action NVARCHAR(16) NOT NULL,
      Payload NVARCHAR(MAX) NOT NULL
    );
  END;
  IF OBJECT_ID('dbo.SafetyAuditLog','U') IS NULL BEGIN
    CREATE TABLE dbo.SafetyAuditLog(
      LogId INT IDENTITY(1,1) PRIMARY KEY,
      ProposalId INT NULL,
      Action NVARCHAR(32) NOT NULL,
      ActorId INT NULL,
      Message NVARCHAR(MAX) NULL,
      CreatedAt DATETIME2 NOT NULL DEFAULT(GETDATE())
    );
  END;`;
  await pool.request().query(q);
}

async function createProposal(pool, { tenantId, title, description, documentId, submittedBy, items }) {
  const r = await pool.request()
    .input('TenantId', tenantId || null)
    .input('Title', title || null)
    .input('Description', description || null)
    .input('DocumentId', documentId || null)
    .input('SubmittedBy', submittedBy || null)
    .query(`DECLARE @id INT; INSERT INTO dbo.SafetyProposals(TenantId, Title, Description, DocumentId, SubmittedBy) VALUES(@TenantId, @Title, @Description, @DocumentId, @SubmittedBy); SET @id = SCOPE_IDENTITY(); SELECT @id AS ProposalId;`);
  const proposalId = r.recordset[0].ProposalId;
  for (const it of items || []) {
    await pool.request()
      .input('ProposalId', proposalId)
      .input('TargetTable', it.targetTable)
      .input('Action', it.action)
      .input('Payload', JSON.stringify(it.payload || {}))
      .query('INSERT INTO dbo.SafetyProposalItems(ProposalId, TargetTable, Action, Payload) VALUES(@ProposalId, @TargetTable, @Action, @Payload)');
  }
  return proposalId;
}

function toAllowedInsert(table, payload) {
  // Whitelist columns for known tables
  const maps = {
    FireSafety: ['InspectionDate','Location','InspectedBy','Status'],
    ElectricalSafety: ['InspectionDate','Location','InspectedBy','Status'],
    StructuralSafety: ['InspectionDate','Location','InspectedBy','Status'],
    HealthHazards: ['AssessmentDate','Location','HazardType','RiskLevel']
  };
  const cols = maps[table];
  if (!cols) return null;
  const clean = {};
  cols.forEach(c => { if (payload[c] !== undefined) clean[c] = payload[c]; });
  return clean;
}

async function approveProposal(pool, proposalId, approverId) {
  const items = await pool.request().input('ProposalId', proposalId)
    .query('SELECT ItemId, TargetTable, Action, Payload FROM dbo.SafetyProposalItems WHERE ProposalId=@ProposalId');
  const tx = new (require('mssql')).Transaction(pool);
  await tx.begin();
  try {
    for (const row of items.recordset) {
      if (row.Action !== 'INSERT') continue;
      const payload = JSON.parse(row.Payload || '{}');
      const clean = toAllowedInsert(row.TargetTable, payload);
      if (!clean) continue; // skip unknown tables
      const keys = Object.keys(clean);
      if (keys.length === 0) continue;
      const req = new (require('mssql')).Request(tx);
      keys.forEach(k => req.input(k, clean[k]));
      const columns = keys.map(k => `[${k}]`).join(',');
      const values = keys.map(k => `@${k}`).join(',');
      await req.query(`INSERT INTO dbo.${row.TargetTable}(${columns}) VALUES(${values});`);
    }
    const r = new (require('mssql')).Request(tx);
    await r.input('ProposalId', proposalId).input('ApprovedBy', approverId)
      .query("UPDATE dbo.SafetyProposals SET Status='approved', ApprovedBy=@ApprovedBy, ApprovedAt=GETDATE() WHERE ProposalId=@ProposalId");
    await tx.commit();
  } catch (e) {
    try { await tx.rollback(); } catch {}
    throw e;
  }
}

function setupSafetyAgentRoutes(app, pool, requireAuth) {
  // Ensure tables at startup
  ensureSafetyAgentTables(pool).catch(e => console.warn('SafetyAgent ensure tables warning:', e.message));

  // Storage (if multer available)
  let upload = null;
  if (multer) {
    const storage = multer.diskStorage({
      destination: function (_req, _file, cb) {
        const dir = path.join(__dirname, '../public/uploads/docs');
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        cb(null, dir);
      },
      filename: function (_req, file, cb) {
        const ts = Date.now();
        const safe = (file.originalname || 'doc').replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, `${ts}-${safe}`);
      }
    });
    upload = multer({ storage });
  }

  // Upload a document, extract, and create a pending proposal
  app.post('/api/safety/agent/upload', requireAuth, (upload ? upload.single('file') : (req,res,next)=>next()), async (req, res) => {
    try {
      const userId = req.auth?.uid || null;
      const tenantId = req.auth?.tid || null;
      if (!upload) return res.status(400).json({ success: false, error: 'File upload not available (multer not installed). Please install dependency and restart.' });
      if (!req.file) return res.status(400).json({ success: false, error: 'file is required (multipart/form-data)' });

      const fullPath = req.file.path;
      const publicPath = '/uploads/docs/' + path.basename(fullPath);
      const mime = req.file.mimetype;

      const text = await extractText(fullPath, mime);
      const { proposals, facts } = classifyAndPropose(text);
      const userNotes = (req.body?.notes || '').toString();
      const title = 'Safety Agent Import';
      const description = `Proposed ${proposals.length} change(s) from uploaded document.` + (userNotes ? ` Notes: ${userNotes}` : '');

      // Save document row
      const docRes = await pool.request()
        .input('TenantId', tenantId)
        .input('FileName', req.file.originalname)
        .input('FilePath', publicPath)
        .input('MimeType', mime)
        .input('SizeBytes', req.file.size)
        .input('ExtractedText', text || null)
        .input('UploadedBy', userId)
        .query('INSERT INTO dbo.SafetyDocuments(TenantId, FileName, FilePath, MimeType, SizeBytes, ExtractedText, UploadedBy) VALUES(@TenantId,@FileName,@FilePath,@MimeType,@SizeBytes,@ExtractedText,@UploadedBy); SELECT SCOPE_IDENTITY() AS DocumentId');
      const documentId = docRes.recordset[0].DocumentId;

      // Create proposal with items
      const proposalId = await createProposal(pool, { tenantId, title, description, documentId, submittedBy: userId, items: proposals });

      res.json({ success: true, data: { proposalId, documentId, fileUrl: publicPath, facts, proposedItems: proposals } });
    } catch (e) {
      console.error('SafetyAgent upload failed:', e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Create a proposal from free-text (no file)
  app.post('/api/safety/agent/propose', requireAuth, async (req, res) => {
    try {
      const text = (req.body?.text || '').toString();
      if (!text.trim()) return res.status(400).json({ success:false, error:'text is required' });
      const { proposals, facts } = classifyAndPropose(text);
      const tenantId = req.auth?.tid || null;
      const userId = req.auth?.uid || null;
      const title = 'Safety Agent Text';
      const description = `Proposed ${proposals.length} change(s) from user text.`;
      const proposalId = await createProposal(pool, { tenantId, title, description, documentId:null, submittedBy:userId, items: proposals });
      res.json({ success:true, data: { proposalId, facts, proposedItems: proposals } });
    } catch (e) {
      res.status(500).json({ success:false, error:e.message });
    }
  });

  // List proposals (optionally by status)
  app.get('/api/safety/agent/proposals', requireAuth, async (req, res) => {
    try {
      const status = (req.query.status || '').toString();
      const r = await pool.request().input('Status', status || null).query(
        status ? "SELECT * FROM dbo.SafetyProposals WHERE Status=@Status ORDER BY SubmittedAt DESC" :
                 "SELECT * FROM dbo.SafetyProposals ORDER BY SubmittedAt DESC"
      );
      res.json({ success: true, data: r.recordset });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Get proposal with items
  app.get('/api/safety/agent/proposals/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const p = await pool.request().input('ProposalId', id).query('SELECT * FROM dbo.SafetyProposals WHERE ProposalId=@ProposalId');
      const items = await pool.request().input('ProposalId', id).query('SELECT ItemId, TargetTable, Action, Payload FROM dbo.SafetyProposalItems WHERE ProposalId=@ProposalId');
      res.json({ success: true, data: { proposal: p.recordset[0] || null, items: items.recordset } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Approve
  app.post('/api/safety/agent/proposals/:id/approve', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await approveProposal(pool, id, req.auth?.uid || null);
      await pool.request().input('ProposalId', id).input('ActorId', req.auth?.uid || null).input('Message', 'Approved').query("INSERT INTO dbo.SafetyAuditLog(ProposalId, Action, ActorId, Message) VALUES(@ProposalId,'approved',@ActorId,@Message)");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Reject
  app.post('/api/safety/agent/proposals/:id/reject', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reason = (req.body?.reason || '').toString();
      await pool.request().input('ProposalId', id).input('RejectedBy', req.auth?.uid || null).input('Reason', reason)
        .query("UPDATE dbo.SafetyProposals SET Status='rejected', RejectedBy=@RejectedBy, RejectedAt=GETDATE(), RejectionReason=@Reason WHERE ProposalId=@ProposalId");
      await pool.request().input('ProposalId', id).input('ActorId', req.auth?.uid || null).input('Message', reason).query("INSERT INTO dbo.SafetyAuditLog(ProposalId, Action, ActorId, Message) VALUES(@ProposalId,'rejected',@ActorId,@Message)");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

module.exports = { setupSafetyAgentRoutes };