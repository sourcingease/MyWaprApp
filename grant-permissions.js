const sql = require('mssql');
require('dotenv').config();

async function grantPermissions() {
  try {
    const pool = await sql.connect({
      user: process.env.AZURE_SQL_USERNAME || 'turtle',
      password: process.env.AZURE_SQL_PASSWORD,
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'Complytex',
      options: { encrypt: true, trustServerCertificate: false }
    });

    console.log('✅ Connected to database');

    // First, find the safety user
    const userResult = await pool.request().query(`
      SELECT u.UserId, u.Email, u.FullName, cu.TenantId, r.RoleId, r.Name as RoleName 
      FROM Users u 
      LEFT JOIN CompanyUsers cu ON u.UserId = cu.UserId
      LEFT JOIN UserRoles ur ON u.UserId = ur.UserId AND cu.TenantId = ur.TenantId
      LEFT JOIN Roles r ON ur.RoleId = r.RoleId 
      WHERE u.Email = 'safety@demo.example'
    `);
    
    console.log('\n📋 Current User Info:');
    console.log(JSON.stringify(userResult.recordset, null, 2));

    if (userResult.recordset.length === 0) {
      console.log('❌ User not found');
      await pool.close();
      return;
    }

    const user = userResult.recordset[0];
    const tenantId = user.TenantId;
    const userId = user.UserId;

    console.log(`\n👤 User ID: ${userId}, Tenant ID: ${tenantId}`);

    // Get all available roles for this tenant
    const rolesResult = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .query(`SELECT RoleId, Name FROM Roles WHERE TenantId = @tenantId OR TenantId IS NULL`);

    console.log('\n📋 Available Roles:');
    console.log(JSON.stringify(rolesResult.recordset, null, 2));

    // Find Admin or Owner role
    const adminRole = rolesResult.recordset.find(r => r.Name === 'Admin' || r.Name === 'Owner');
    
    if (adminRole) {
      console.log(`\n✨ Found ${adminRole.Name} role (ID: ${adminRole.RoleId})`);
      
      // Check if already assigned
      const existingRole = await pool.request()
        .input('tenantId', sql.Int, tenantId)
        .input('userId', sql.Int, userId)
        .input('roleId', sql.Int, adminRole.RoleId)
        .query(`SELECT * FROM UserRoles WHERE TenantId = @tenantId AND UserId = @userId AND RoleId = @roleId`);

      if (existingRole.recordset.length > 0) {
        console.log('✅ User already has this role');
      } else {
        // Assign the admin role
        await pool.request()
          .input('tenantId', sql.Int, tenantId)
          .input('userId', sql.Int, userId)
          .input('roleId', sql.Int, adminRole.RoleId)
          .query(`INSERT INTO UserRoles (TenantId, UserId, RoleId) VALUES (@tenantId, @userId, @roleId)`);
        
        console.log(`✅ Granted ${adminRole.Name} role to safety@demo.example`);
      }
    } else {
      console.log('\n⚠️ No Admin/Owner role found. Checking for other roles...');
      
      // Try to find or create roles with permissions
      const managerRole = rolesResult.recordset.find(r => r.Name.includes('Manager') || r.Name.includes('manager'));
      if (managerRole) {
        await pool.request()
          .input('tenantId', sql.Int, tenantId)
          .input('userId', sql.Int, userId)
          .input('roleId', sql.Int, managerRole.RoleId)
          .query(`
            IF NOT EXISTS (SELECT * FROM UserRoles WHERE TenantId = @tenantId AND UserId = @userId AND RoleId = @roleId)
            INSERT INTO UserRoles (TenantId, UserId, RoleId) VALUES (@tenantId, @userId, @roleId)
          `);
        console.log(`✅ Granted ${managerRole.Name} role`);
      }
    }

    // Verify new roles
    const verifyResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT r.RoleId, r.Name as RoleName 
        FROM UserRoles ur 
        JOIN Roles r ON ur.RoleId = r.RoleId 
        WHERE ur.UserId = @userId
      `);

    console.log('\n✅ Final Roles for safety@demo.example:');
    console.log(JSON.stringify(verifyResult.recordset, null, 2));

    await pool.close();
    console.log('\n✅ Permissions granted successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

grantPermissions();
