/**
 * ComplytEX Database Connection Test & User Verification
 */

const sql = require('mssql');

const config = {
  server: 'zlnsw9feuf.database.windows.net',
  database: 'Complytex',
  user: 'cloudsa',
  password: 'Pk@12345',
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function checkUsers() {
  try {
    console.log('🔌 Connecting to database...');
    await sql.connect(config);
    console.log('✅ Connected successfully!\n');

    // Check users
    console.log('👥 Checking Users table...');
    const usersResult = await sql.query(`
      SELECT TOP 10 
        UserId, Email, TenantId, 
        CASE WHEN PasswordHash IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPassword,
        CreatedAt
      FROM Users 
      ORDER BY CreatedAt DESC
    `);
    console.log(`Found ${usersResult.recordset.length} users:`);
    console.table(usersResult.recordset);

    // Check tenants
    console.log('\n🏢 Checking Tenants...');
    const tenantsResult = await sql.query(`
      SELECT TenantId, TenantName, OwnerEmail, CreatedAt
      FROM Tenants
      ORDER BY CreatedAt DESC
    `);
    console.log(`Found ${tenantsResult.recordset.length} tenants:`);
    console.table(tenantsResult.recordset);

    // Check company users
    console.log('\n👔 Checking CompanyUsers...');
    const companyUsersResult = await sql.query(`
      SELECT TOP 10 
        cu.CompanyUserId, cu.FullName, cu.Email, cu.TenantId,
        CASE WHEN cu.Active IS NULL THEN 'NULL' 
             WHEN cu.Active = 1 THEN 'Active' 
             ELSE 'Inactive' END as Status
      FROM CompanyUsers cu
      ORDER BY cu.CompanyUserId DESC
    `);
    console.log(`Found ${companyUsersResult.recordset.length} company users:`);
    console.table(companyUsersResult.recordset);

    // Check employees with salary
    console.log('\n💼 Checking Employees with Salary...');
    const employeesResult = await sql.query(`
      SELECT TOP 5
        cu.CompanyUserId, cu.FullName, cu.Email,
        pd.Salary, pd.PayFrequency, pd.PayType
      FROM CompanyUsers cu
      LEFT JOIN HrEmployeePayDetails pd ON cu.CompanyUserId = pd.CompanyUserId
      WHERE pd.Salary IS NOT NULL
      ORDER BY cu.CompanyUserId DESC
    `);
    console.log(`Found ${employeesResult.recordset.length} employees with salary:`);
    console.table(employeesResult.recordset);

    // Check AP Invoices
    console.log('\n💰 Checking AP Invoices...');
    const apResult = await sql.query(`
      SELECT TOP 10 
        InvoiceId, SupplierName, Amount, Status, OrderId, CreatedAt
      FROM APInvoices
      ORDER BY CreatedAt DESC
    `);
    console.log(`Found ${apResult.recordset.length} AP invoices:`);
    console.table(apResult.recordset);

    // Check Banks
    console.log('\n🏦 Checking Banks...');
    const banksResult = await sql.query(`
      SELECT BankId, BankName, AccountNumber, Balance
      FROM Banks
    `);
    console.log(`Found ${banksResult.recordset.length} banks:`);
    console.table(banksResult.recordset);

    // Check Fire Safety
    console.log('\n🔥 Checking Fire Safety Data...');
    const fireResult = await sql.query(`
      SELECT COUNT(*) as Count FROM FireSafety
    `);
    console.log(`Fire Safety records: ${fireResult.recordset[0].Count}`);

    // Check Safety Audits
    console.log('\n✅ Checking Safety Audits...');
    const auditResult = await sql.query(`
      SELECT TOP 5 AuditId, AuditType, Status, CreatedAt
      FROM SafetyAudits
      ORDER BY CreatedAt DESC
    `);
    console.log(`Found ${auditResult.recordset.length} safety audits:`);
    console.table(auditResult.recordset);

    console.log('\n✅ Database verification complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.close();
  }
}

checkUsers();
