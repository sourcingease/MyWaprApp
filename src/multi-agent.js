// Simple multi-agent runtime primitives (no LLM, just structured routing)

const { AzureSQLConnector } = require('./index');

async function createDemoContactFallback(rawText) {
  const text = (rawText || '').toString().trim();
  if (!text) {
    return { ok: false, message: 'No text to save as contact.' };
  }

  // Very lightweight parser: look for "name:" pattern, else use the first line as the name.
  let name = null;
  const m = text.match(/name\s*[:=]\s*([^,;\n]+)/i);
  if (m && m[1]) {
    name = m[1].trim();
  }
  if (!name) {
    name = text.split(/\r?\n/)[0];
    if (name.length > 200) {
      name = name.slice(0, 200);
    }
  }

  const connector = new AzureSQLConnector();
  try {
    await connector.connect();
    const cleanName = name.replace(/'/g, "''");
    const insertSql = `INSERT INTO contactTest (Name) VALUES ('${cleanName}')`;
    await connector.executeQuery(insertSql);
    const countRes = await connector.executeQuery('SELECT COUNT(*) AS total FROM contactTest');
    const total = countRes && countRes.recordset && countRes.recordset[0] && countRes.recordset[0].total;
    await connector.disconnect();
    return { ok: true, companyName: name, total: total || 0 };
  } catch (e) {
    try { await connector.disconnect(); } catch (_) {}
    return { ok: false, message: e.message || 'Failed to save contact in fallback table.' };
  }
}

async function createCrmContactFromText(rawText, ctx) {
  const text = (rawText || '').toString().trim();
  if (!text) {
    return { ok: false, message: 'No text to save as contact.' };
  }

  const tenantId = ctx && ctx.tenantId;
  const userId = ctx && ctx.userId;
  if (!tenantId) {
    return { ok: false, message: 'No tenant in context; cannot save CRM contact.' };
  }

  // Parse simple fields from free text
  const lower = text.toLowerCase();

  function matchField(re) {
    const m = text.match(re);
    return m && m[1] ? m[1].trim() : null;
  }

  // Company name: look for "company:" or "name:" then fall back to first line
  let companyName = matchField(/company\s*[:=]\s*([^,;\n]+)/i) || matchField(/name\s*[:=]\s*([^,;\n]+)/i);
  if (!companyName) {
    companyName = text.split(/\r?\n/)[0];
    if (companyName.length > 200) companyName = companyName.slice(0, 200);
  }

  // Person/contact name
  const personName = matchField(/(contact|person)\s*[:=]\s*([^,;\n]+)/i);

  // Email (first email-like token)
  const emailMatch = text.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const email = emailMatch && emailMatch[1] ? emailMatch[1].trim() : null;

  // Phone (crude heuristic)
  const phoneMatch = text.match(/(\+?\d[\d\s\-]{6,})/);
  const phone = phoneMatch && phoneMatch[1] ? phoneMatch[1].trim() : null;

  const city = matchField(/city\s*[:=]\s*([^,;\n]+)/i);
  const country = matchField(/country\s*[:=]\s*([^,;\n]+)/i);

  const connector = new AzureSQLConnector();
  try {
    await connector.connect();

    const now = new Date();
    // Insert company into CrmCompanies
    const insertCompany = await connector.executeQuery(`
      INSERT INTO dbo.CrmCompanies(
        TenantId, CompanyName, CompanyDetails, City, Country,
        SourceOfContact, Status, SavedUpdatedOn, SendEmailOnSave, CreatedBy
      ) VALUES(
        @tid, @CompanyName, @CompanyDetails, @City, @Country,
        @SourceOfContact, @Status, @SavedUpdatedOn, @SendEmailOnSave, @CreatedBy
      );
      SELECT SCOPE_IDENTITY() AS Id;
    `, {
      tid: tenantId,
      CompanyName: companyName,
      CompanyDetails: text,
      City: city || null,
      Country: country || null,
      SourceOfContact: 'Agent',
      Status: 'Lead',
      SavedUpdatedOn: now,
      SendEmailOnSave: 0,
      CreatedBy: userId || null
    });

    const companyId = insertCompany && insertCompany.recordset && insertCompany.recordset[0] && insertCompany.recordset[0].Id;

    // Optional: create a primary contact person if we have any person/email/phone info
    if (companyId && (personName || email || phone)) {
      let firstName = null;
      let lastName = null;
      if (personName) {
        const parts = personName.split(/\s+/);
        firstName = parts[0] || null;
        lastName = parts.slice(1).join(' ') || null;
      }

      await connector.executeQuery(`
        INSERT INTO dbo.CrmContactPersons(
          CompanyId, FirstName, LastName, Email, Phone, CellPhone
        ) VALUES(
          @CompanyId, @FirstName, @LastName, @Email, @Phone, @CellPhone
        );
      `, {
        CompanyId: companyId,
        FirstName: firstName,
        LastName: lastName,
        Email: email || null,
        Phone: phone || null,
        CellPhone: null
      });
    }

    const countRes = await connector.executeQuery(
      'SELECT COUNT(*) AS Total FROM dbo.CrmCompanies WHERE TenantId=@tid',
      { tid: tenantId }
    );
    const total = countRes && countRes.recordset && countRes.recordset[0] && countRes.recordset[0].Total;

    await connector.disconnect();
    return {
      ok: true,
      companyName,
      companyId,
      total: total || 0,
      email: email || null,
      personName: personName || null
    };
  } catch (e) {
    try { await connector.disconnect(); } catch (_) {}
    // If CRM core tables are missing, fall back to simple contactTest table
    if (e && /CrmCompanies/i.test(e.message || '')) {
      return await createDemoContactFallback(rawText);
    }
    return { ok: false, message: e.message || 'Failed to save CRM contact.' };
  }
}

class TabAgent {
  constructor(opts) {
    this.id = opts.id;
    this.name = opts.name;
    this.moduleId = opts.moduleId;
    this.tabId = opts.tabId;
    this.description = opts.description || null;
  }

  /**
   * Handle a chat turn for this tab.
   *
   * For now this is a stub implementation that simply echoes the last
   * user message in a structured way. This is where you would later
   * integrate tools + an LLM.
   */
  async handleMessage(history, context) {
    const messages = Array.isArray(history) ? history : [];
    const lastUser = [...messages].reverse().find(m => m && m.role === 'user');
    const lastText = lastUser && typeof lastUser.content === 'string'
      ? lastUser.content
      : null;

    const friendlyModule = (this.moduleId || '').toString().replace(/_/g, ' ');
    const friendlyTab = (this.tabId || '').toString().replace(/[-_]/g, ' ');

    // Special behaviour: CRM Contacts agent writes into full CRM tables.
    if (lastText && this.moduleId === 'crm' && this.tabId === 'contacts') {
      const result = await createCrmContactFromText(lastText, context || {});
      if (result.ok) {
        const extras = [];
        if (result.personName) extras.push(`primary contact ${result.personName}`);
        if (result.email) extras.push(`email ${result.email}`);
        const extrasText = extras.length ? ` (with ${extras.join(', ')})` : '';
        return {
          text: `I’ve created a CRM company "${result.companyName}"${extrasText}. There are now ${result.total} companies for this tenant.`,
          agentId: this.id,
          agentName: this.name,
          moduleId: this.moduleId,
          tabId: this.tabId
        };
      }
      return {
        text: `I tried to save this contact but hit an error: ${result.message}. The message I received was: "${lastText}".`,
        agentId: this.id,
        agentName: this.name,
        moduleId: this.moduleId,
        tabId: this.tabId
      };
    }

    if (!lastText) {
      return {
        text: `You’re in the ${friendlyTab || 'current'} section of ${friendlyModule || 'this module'}. Ask a question and I’ll respond here.`,
        agentId: this.id,
        agentName: this.name,
        moduleId: this.moduleId,
        tabId: this.tabId
      };
    }

    return {
      text: `Thanks for your message. I’ve received: "${lastText}". This assistant is in preview mode, so it’s echoing what you say while we connect it to live data and automation.`,
      agentId: this.id,
      agentName: this.name,
      moduleId: this.moduleId,
      tabId: this.tabId
    };
  }
}

class ModuleSupervisorAgent {
  constructor(opts) {
    this.id = opts.id;
    this.name = opts.name;
    this.moduleId = opts.moduleId;
    // Map of tabId -> TabAgent
    this.tabAgents = opts.tabAgents || new Map();
  }

  /**
   * Supervisor entry point. It picks the correct TabAgent based on
   * context.tabId, delegates the work, and wraps the reply so the
   * caller always gets a consistent structure.
   */
  async handleMessage(history, context) {
    const ctx = context || {};
    const tabId = ctx.tabId;

    if (!tabId) {
      return {
        text: `[${this.moduleId}] supervisor: tabId is required in context`,
        moduleId: this.moduleId,
        supervisorId: this.id,
        tabId: null,
        agentId: null,
        agentName: null
      };
    }

    const agent = this.tabAgents.get(tabId);
    if (!agent) {
      return {
        text: `[${this.moduleId}] supervisor: no agent configured for tab "${tabId}"`,
        moduleId: this.moduleId,
        supervisorId: this.id,
        tabId,
        agentId: null,
        agentName: null
      };
    }

    const reply = await agent.handleMessage(history, context);

    return {
      text: reply && reply.text ? reply.text : '',
      moduleId: this.moduleId,
      supervisorId: this.id,
      tabId,
      agentId: reply && reply.agentId ? reply.agentId : agent.id,
      agentName: reply && reply.agentName ? reply.agentName : agent.name
    };
  }
}

/**
 * Build a graph of module supervisors and tab agents from the static
 * configuration defined in agents-config.js.
 *
 * @param {Array} agentModules - modules from agents-config.js
 * @returns {{ moduleSupervisors: Map<string, ModuleSupervisorAgent> }}
 */
function buildAgentGraph(agentModules) {
  const moduleSupervisors = new Map();

  (agentModules || []).forEach(mod => {
    if (!mod || !mod.id) return;
    const moduleId = mod.id;
    const moduleName = mod.name || mod.id;

    const tabAgents = new Map();
    (mod.tabs || []).forEach(tab => {
      if (!tab || !tab.id) return;
      const tabId = tab.id;
      const agentId = `${moduleId}_${tabId}_agent`;
      const agentName = tab.agentName || `${tab.name || tabId} Agent`;
      const agent = new TabAgent({
        id: agentId,
        name: agentName,
        moduleId,
        tabId,
        description: tab.description || null
      });
      tabAgents.set(tabId, agent);
    });

    const supervisorId = `${moduleId}_supervisor`;
    const supervisorName = `${moduleName} Supervisor`;
    const supervisor = new ModuleSupervisorAgent({
      id: supervisorId,
      name: supervisorName,
      moduleId,
      tabAgents
    });

    moduleSupervisors.set(moduleId, supervisor);
  });

  return { moduleSupervisors };
}

module.exports = {
  TabAgent,
  ModuleSupervisorAgent,
  buildAgentGraph,
  createCrmContactFromText
};
