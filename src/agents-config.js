// Multi-module agent configuration
// Defines modules, their tabs, and high-level metadata used by the multi-agent runtime.

/**
 * Each module has:
 *  - id: stable identifier (e.g. "safety", "hr")
 *  - name: display name
 *  - tabs: high-level functional areas within the module
 */

const agentModules = [
  {
    id: 'safety',
    name: 'Safety Office',
    tabs: [
      { id: 'overview', name: 'Overview', description: 'Overview dashboard and quick links' },
      { id: 'incidents', name: 'Incidents', description: 'Incident reporting and tracking' },
      { id: 'search-incident', name: 'Search Incidents', description: 'Search existing incident reports' },
      { id: 'grievances', name: 'Grievances', description: 'Worker complaints and grievances' },
      { id: 'search-grievance', name: 'Search Grievances', description: 'Search grievance records' },
      { id: 'safety-training', name: 'Safety Training', description: 'Trainings and attendance' },
      { id: 'ungp', name: 'UNGP Checklist', description: 'UN Guiding Principles checklist' },
      { id: 'fire', name: 'Fire Safety', description: 'Fire safety checklist and controls' },
      { id: 'electrical', name: 'Electrical Safety', description: 'Electrical safety inspections' },
      { id: 'structural', name: 'Structural Safety', description: 'Building and structural checks' },
      { id: 'health', name: 'Health Hazards', description: 'Health hazard identification and mitigation' },
      { id: 'usc-safe', name: 'USC-Safe', description: 'USC-Safe unified safety programme' },
      { id: 'gas', name: 'Gas Safety', description: 'Gas cylinder and storage safety' },
      { id: 'boiler', name: 'Boiler Safety', description: 'Boiler safety inspection and logs' },
      { id: 'consultant', name: 'Consultant Engagement', description: 'External consultant engagement' },
      { id: 'dsa', name: 'DSA', description: 'Detailed structural assessment (DSA)' },
      { id: 'emergency-power', name: 'Emergency Power', description: 'Emergency power and generators' },
      { id: 'audits', name: 'Safety Audits', description: 'Audit planning and history' },
      { id: 'rfq', name: 'RFQ & Procurement', description: 'Safety procurement RFQs and orders' }
    ]
  },
  {
    id: 'hr',
    name: 'HR & Payroll',
    tabs: [
      { id: 'employees', name: 'Employees', description: 'Employee records and profiles' },
      { id: 'jobs', name: 'Job Postings', description: 'Job postings and openings' },
      { id: 'candidates', name: 'Candidates', description: 'Applicants and shortlisted candidates' },
      { id: 'payroll', name: 'Payroll', description: 'Payroll runs and salary scales (coming soon)' }
    ]
  },
  {
    id: 'crm',
    name: 'CRM',
    tabs: [
      { id: 'contacts', name: 'Contacts', description: 'Company and contact management' },
      { id: 'leads', name: 'Leads', description: 'Lead tracking and qualification' },
      { id: 'accounts', name: 'Accounts', description: 'Converted customers and accounts' },
      { id: 'mailbox', name: 'Mailbox', description: 'Email mailbox and campaigns' },
      { id: 'chat', name: 'Chat', description: 'Internal chat and collaboration' },
      { id: 'phone-notes', name: 'Phone Notes', description: 'Call notes and follow-up tasks' }
    ]
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tabs: [
      { id: 'dashboard', name: 'Dashboard', description: 'Bank balances and summary KPIs' },
      { id: 'petty-cash', name: 'Petty Cash', description: 'Petty cash ledger and balance' },
      { id: 'payables', name: 'Accounts Payable', description: 'Supplier invoices and payments' },
      { id: 'receivables', name: 'Accounts Receivable', description: 'Customer invoices and receipts' },
      { id: 'banks', name: 'Banks & Ledger', description: 'Bank accounts and bank ledger' },
      { id: 'transfers', name: 'Bank Transfers', description: 'Internal bank transfers' }
    ]
  },
  {
    id: 'reports',
    name: 'Reports',
    tabs: [
      { id: 'summary', name: 'Summary', description: 'Summary of key BI reports' }
    ]
  },
  {
    id: 'ai',
    name: 'AI',
    tabs: [
      { id: 'prompts', name: 'Prompt Library', description: 'AI Data Analyst prompts and templates' }
    ]
  }
];

module.exports = {
  agentModules
};
