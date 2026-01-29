// Simple multi-agent runtime primitives (no LLM, just structured routing)

const { AzureSQLConnector } = require('./index');

// ------------------------
// Golden Rules of Accounting (data)
// ------------------------
// These are used by the Accounting module agents to explain
// which accounts to debit/credit for simple transactions.
const ACCOUNTING_RULES = {
  personal: {
    name: 'Personal Account',
    debit: 'Debit the receiver',
    credit: 'Credit the giver'
  },
  real: {
    name: 'Real Account',
    debit: 'Debit what comes in',
    credit: 'Credit what goes out'
  },
  nominal: {
    name: 'Nominal Account',
    debit: 'Debit all expenses and losses',
    credit: 'Credit all incomes and gains'
  }
};

// Very small helper vocabulary for classifying common account names
const REAL_KEYWORDS = ['cash', 'bank', 'building', 'machinery', 'machine', 'furniture', 'vehicle', 'land', 'plant', 'equipment', 'inventory', 'stock'];
const NOMINAL_EXPENSE_KEYWORDS = ['rent', 'salary', 'salaries', 'wages', 'expense', 'expenses', 'loss', 'losses', 'advertising', 'stationery', 'insurance'];
const NOMINAL_INCOME_KEYWORDS = ['commission', 'interest', 'income', 'revenue', 'gain', 'gains', 'discount received'];
const PERSONAL_KEYWORDS = ['debtor', 'creditor', 'customer', 'supplier', 'vendor'];

function classifyAccountName(rawName) {
  const name = (rawName || '').toString().trim();
  if (!name) return { type: null, subtype: null };
  const lower = name.toLowerCase();

  function includesAny(words) {
    return words.some(w => lower.includes(w));
  }

  // Heuristic: look for obvious real accounts (assets)
  if (includesAny(REAL_KEYWORDS)) {
    return { type: 'real', subtype: 'asset' };
  }

  // Nominal: expenses / losses
  if (includesAny(NOMINAL_EXPENSE_KEYWORDS)) {
    return { type: 'nominal', subtype: 'expense' };
  }

  // Nominal: incomes / gains
  if (includesAny(NOMINAL_INCOME_KEYWORDS)) {
    return { type: 'nominal', subtype: 'income' };
  }

  // Personal account indicators
  if (includesAny(PERSONAL_KEYWORDS) || /\bmr\.?\b|\bms\.?\b|\bdr\.?\b/i.test(name)) {
    return { type: 'personal', subtype: 'person' };
  }

  // Fallback guesses: if it clearly ends with 'account' we try to infer from prefix
  if (/account$/i.test(name)) {
    if (includesAny(['capital', 'drawing'])) {
      return { type: 'personal', subtype: 'owner' };
    }
    // Unknown named account – treat as personal rather than misclassify
    return { type: 'personal', subtype: 'other' };
  }

  // Unknown – leave type null so caller can ask user for clarification
  return { type: null, subtype: null };
}

function summarizeGoldenRules() {
  return [
    `Personal Account: ${ACCOUNTING_RULES.personal.debit}; ${ACCOUNTING_RULES.personal.credit}.`,
    `Real Account: ${ACCOUNTING_RULES.real.debit}; ${ACCOUNTING_RULES.real.credit}.`,
    `Nominal Account: ${ACCOUNTING_RULES.nominal.debit}; ${ACCOUNTING_RULES.nominal.credit}.`
  ].join(' ');
}

/**
 * Very small rule engine for simple natural-language accounting prompts.
 * It aims to:
 *  - Identify two main accounts A and B in the sentence.
 *  - Classify each account as personal/real/nominal where possible.
 *  - Infer which one to debit/credit using Golden Rules + verb direction.
 *
 * For anything non-trivial or ambiguous, it will fall back to explaining
 * the rules and asking the user to specify the accounts more clearly.
 */
function analyzeAccountingMessage(rawText) {
  const text = (rawText || '').toString().trim();
  if (!text) {
    return { ok: false, reason: 'empty', message: 'Please describe the transaction (e.g. "Paid rent in cash").' };
  }

  const lower = text.toLowerCase();

  // Try to detect a simple verb-direction pattern
  let verb = null;
  if (lower.includes('paid') || lower.includes('pay ')) verb = 'paid';
  else if (lower.includes('received') || lower.includes('got')) verb = 'received';
  else if (lower.includes('purchased') || lower.includes('bought')) verb = 'purchased';
  else if (lower.includes('sold')) verb = 'sold';

  // Extract obvious medium accounts: cash/bank
  let medium = null;
  if (lower.includes(' cash')) medium = 'Cash';
  if (lower.includes(' bank')) medium = 'Bank';

  // Very simple heuristics for counter-account from keywords
  let counter = null;
  if (lower.includes('rent')) counter = 'Rent Expense';
  if (lower.includes('salary') || lower.includes('salaries') || lower.includes('wages')) counter = 'Salaries/Wages Expense';
  if (lower.includes('commission')) counter = lower.includes('received') ? 'Commission Income' : 'Commission Expense';
  if (lower.includes('interest')) counter = lower.includes('received') ? 'Interest Income' : 'Interest Expense';

  // If we failed to detect even two plausible accounts, bail out early
  if (!medium && !counter) {
    return {
      ok: false,
      reason: 'no-accounts',
      message: 'I could not identify the accounts from this sentence alone. Please specify the two accounts involved and the nature of each (asset, expense, income, receiver/giver).',
      goldenRules: summarizeGoldenRules()
    };
  }

  // Build account objects A and B
  const accounts = [];
  if (counter) accounts.push({ name: counter });
  if (medium) accounts.push({ name: medium });

  // Ensure we have at least two distinct accounts
  const unique = [];
  const seen = new Set();
  for (const a of accounts) {
    const key = a.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }

  if (unique.length < 2) {
    return {
      ok: false,
      reason: 'single-account',
      message: 'I found only one clear account in your description. Please name the other account as well.',
      goldenRules: summarizeGoldenRules(),
      accounts: unique
    };
  }

  const [a1, a2] = unique;
  const c1 = classifyAccountName(a1.name);
  const c2 = classifyAccountName(a2.name);
  a1.classification = c1;
  a2.classification = c2;

  function formatClass(a) {
    if (!a.classification || !a.classification.type) return 'Unclassified account';
    const rule = ACCOUNTING_RULES[a.classification.type];
    if (!rule) return `${a.classification.type} account`;
    return `${rule.name} (${a.classification.subtype || 'general'})`;
  }

  // Decide debit/credit based on verb & account types
  let debit = null;
  let credit = null;
  const explanationParts = [];

  if (verb === 'paid' || verb === 'purchased') {
    // Typically: Expense/Asset (comes in / expense) DR, Cash/Bank CR
    if (c1.type === 'nominal' || c1.type === 'real') {
      debit = a1;
      credit = a2;
    } else if (c2.type === 'nominal' || c2.type === 'real') {
      debit = a2;
      credit = a1;
    }
  } else if (verb === 'received' || verb === 'sold') {
    // Typically: Cash/Bank DR, Income/Asset given up CR
    if (c1.type === 'real') {
      debit = a1;
      credit = a2;
    } else if (c2.type === 'real') {
      debit = a2;
      credit = a1;
    }
  }

  // If the verb heuristic failed but we still have classifications, fall back to a safe guess
  if (!debit || !credit) {
    if (c1.type === 'nominal' && c2.type === 'real') {
      debit = a1; credit = a2;
    } else if (c1.type === 'real' && c2.type === 'nominal') {
      debit = a2; credit = a1;
    }
  }

  if (!debit || !credit) {
    return {
      ok: false,
      reason: 'uncertain',
      message: 'I could partially recognise the accounts but I am not confident enough to propose a journal entry. Please confirm which account should be debited and which credited.',
      goldenRules: summarizeGoldenRules(),
      accounts: unique
    };
  }

  const debitRule = debit.classification && debit.classification.type && ACCOUNTING_RULES[debit.classification.type];
  const creditRule = credit.classification && credit.classification.type && ACCOUNTING_RULES[credit.classification.type];

  if (debitRule) {
    explanationParts.push(`${debit.name} is treated as a ${debitRule.name}. According to the rule: "${debitRule.debit}."`);
  }
  if (creditRule) {
    explanationParts.push(`${credit.name} is treated as a ${creditRule.name}. According to the rule: "${creditRule.credit}."`);
  }

  const explanation = explanationParts.join(' ');

  return {
    ok: true,
    debit: { name: debit.name, classification: debit.classification },
    credit: { name: credit.name, classification: credit.classification },
    explanation,
    goldenRules: summarizeGoldenRules()
  };
}

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

    // Accounting-specific behaviour: suggest journal entry using Golden Rules
    if (lastText && this.moduleId === 'accounting') {
      const result = analyzeAccountingMessage(lastText);
      if (result.ok) {
        const lines = [];
        lines.push('Suggested journal entry (per Golden Rules of Accounting):');
        lines.push(`  Debit: ${result.debit.name}`);
        lines.push(`  Credit: ${result.credit.name}`);
        if (result.explanation) {
          lines.push('');
          lines.push(result.explanation);
        }
        if (result.goldenRules) {
          lines.push('');
          lines.push('Summary of Golden Rules:');
          lines.push(result.goldenRules);
        }
        const textReply = lines.join('\n');
        return {
          text: textReply,
          agentId: this.id,
          agentName: this.name,
          moduleId: this.moduleId,
          tabId: this.tabId
        };
      }
      const fallbackLines = [];
      fallbackLines.push('Here is how the Golden Rules of Accounting apply:');
      fallbackLines.push(result.goldenRules || summarizeGoldenRules());
      if (result.message) {
        fallbackLines.push('');
        fallbackLines.push(result.message);
      }
      if (Array.isArray(result.accounts) && result.accounts.length) {
        fallbackLines.push('I saw these accounts in your text:');
        for (const a of result.accounts) {
          fallbackLines.push(`  - ${a.name || '(unnamed)'}`);
        }
      }
      return {
        text: fallbackLines.join('\n'),
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
