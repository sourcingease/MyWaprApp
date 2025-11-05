/**
 * Seed sample data for Complytex
 */
require('dotenv').config();
const sql = require('mssql');
const crypto = require('crypto');
const { AzureSQLConnector } = require('./index.js');

function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = crypto.scryptSync(password, salt, 64);
  return { hash, salt };
}

async function seed() {
  const connector = new AzureSQLConnector();
  await connector.connect();
  console.log('Connected. Seeding demo data...');

  const owner = {
    fullName: 'Demo Owner',
    email: 'owner@demo.example',
    password: 'DemoPass123!'
  };
  const businessType = 'Manufacturer';
  const tenantName = 'Demo Factory';

  // Register owner and tenant
  const { hash, salt } = hashPassword(owner.password);
  const req = connector.pool.request();
  req.input('Email', owner.email);
  req.input('FullName', owner.fullName);
  req.input('PasswordHash', hash);
  req.input('PasswordSalt', salt);
  req.input('BusinessTypeCode', businessType);
  req.input('TenantName', tenantName);
  const reg = await req.execute('sp_RegisterOwner');
  const ids = reg.recordset[0];
  const tenantId = ids.TenantId;
  console.log('Created tenant', tenantId);

  // Create roles
  async function createRole(roleName, codes) {
    const tvp = new sql.Table('dbo.StringList');
    tvp.columns.add('Value', sql.NVarChar(256));
    codes.forEach(c => tvp.rows.add(c));
    const r = await connector.pool.request()
      .input('TenantId', tenantId)
      .input('RoleName', roleName)
      .input('PermissionCodes', tvp)
      .execute('sp_CreateRole');
    return r.recordset[0].RoleId;
  }

  const hrRoleId = await createRole('HR Manager', [
    'MODULE_VIEW_HR','MODULE_MANAGE_HR','USER_MANAGE'
  ]);
  const salesRoleId = await createRole('Sales Manager', [
    'MODULE_VIEW_CRM','MODULE_MANAGE_CRM','MODULE_VIEW_WHOLESALE','MODULE_VIEW_RETAIL'
  ]);
  const buyerRoleId = await createRole('Buyer', [
    'MODULE_VIEW_CRM','MODULE_VIEW_WHOLESALE','MODULE_VIEW_EMAIL'
  ]);
  const supplierRoleId = await createRole('Supplier', [
    'MODULE_VIEW_SUPPLIERS','MODULE_VIEW_ACCOUNTING','MODULE_VIEW_EMAIL'
  ]);
  const designerRoleId = await createRole('Designer', [
    'MODULE_VIEW_MARKETING','MODULE_VIEW_TASKS','MODULE_VIEW_EMAIL'
  ]);
  const auditorRoleId = await createRole('Safety Auditor', [
    'MODULE_VIEW_CERTIFICATION','MODULE_VIEW_TASKS','MODULE_VIEW_EMAIL'
  ]);
  const officeRoleId = await createRole('Safety Office', [
    'MODULE_VIEW_CERTIFICATION','MODULE_VIEW_HR','MODULE_VIEW_TASKS','MODULE_VIEW_EMAIL'
  ]);
  const inspectionRoleId = await createRole('Inspection', [
    'MODULE_VIEW_CERTIFICATION','MODULE_VIEW_TASKS','MODULE_VIEW_EMAIL'
  ]);
  console.log('Created roles HR:', hrRoleId, 'Sales:', salesRoleId);

  // Employees
  async function createEmployee(email, fullName, title, roleName, password='Welcome123!') {
    const { hash: h, salt: s } = hashPassword(password);
    const r = await connector.pool.request()
      .input('TenantId', tenantId)
      .input('Email', email)
      .input('FullName', fullName)
      .input('PasswordHash', h)
      .input('PasswordSalt', s)
      .input('RoleName', roleName)
      .input('Title', title)
      .execute('sp_CreateEmployee');
    return r.recordset[0];
  }

  await createEmployee('hr@demo.example', 'Demo HR', 'HR Manager', 'HR Manager');
  await createEmployee('sales@demo.example', 'Demo Sales', 'Sales Manager', 'Sales Manager');
  await createEmployee('buyer@demo.example', 'Demo Buyer', 'Buyer', 'Buyer');
  await createEmployee('supplier@demo.example', 'Demo Supplier', 'Supplier', 'Supplier');
  await createEmployee('designer@demo.example', 'Demo Designer', 'Designer', 'Designer');
  await createEmployee('auditor@demo.example', 'Demo Safety Auditor', 'Safety Auditor', 'Safety Auditor');
  await createEmployee('safety@demo.example', 'Demo Safety Office', 'Safety Office', 'Safety Office');
  await createEmployee('inspection@demo.example', 'Demo Inspection', 'Inspection', 'Inspection');

  // Sample customers/suppliers/certifications
  await connector.executeQuery(`INSERT INTO dbo.Customers(TenantId, Name, Email, Phone) VALUES
    (${tenantId}, 'Acme Buyers', 'buyer@acme.com', '+1-555-0100'),
    (${tenantId}, 'Globex Imports', 'contact@globex.com', '+1-555-0101')`);
  await connector.executeQuery(`INSERT INTO dbo.Suppliers(TenantId, Name, Email, Phone) VALUES
    (${tenantId}, 'Textile Supplies Ltd', 'hello@textsup.com', '+1-555-0200')`);
  await connector.executeQuery(`INSERT INTO dbo.Certifications(TenantId, Name, Issuer, IssueDate, ExpiryDate) VALUES
    (${tenantId}, 'Fire Safety', 'City Authority', GETDATE(), DATEADD(year,1,GETDATE()))`);

  // Demo contacts table
  try { await connector.executeQuery("CREATE TABLE contactTest (Id int IDENTITY(1,1) PRIMARY KEY, Name nvarchar(255) NOT NULL, CreatedDate datetime2 DEFAULT GETDATE())"); } catch {}
  await connector.executeQuery("INSERT INTO contactTest(Name) VALUES ('Alice'),('Bob'),('Charlie')");

  console.log('Seeding completed.');
  await connector.disconnect();
}

seed().catch(async e => { console.error('Seed failed:', e.message); process.exit(1); });
