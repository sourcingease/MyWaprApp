const sql = require('mssql');
require('dotenv').config();

async function disable2FA() {
  try {
    const pool = await sql.connect({
      user: process.env.AZURE_SQL_USERNAME || 'turtle',
      password: process.env.AZURE_SQL_PASSWORD,
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'Complytex',
      options: { encrypt: true, trustServerCertificate: false }
    });

    console.log('✅ Connected to database');

    // Disable 2FA for safety@demo.example
    const result = await pool.request()
      .input('email', sql.NVarChar, 'safety@demo.example')
      .query(`
        UPDATE Users 
        SET TwoFAEnabled = 0 
        WHERE Email = @email
      `);

    console.log(`✅ 2FA disabled for safety@demo.example`);
    console.log(`   Rows affected: ${result.rowsAffected[0]}`);

    // Also clear the 2FA secret from UserTwoFactor table if it exists
    const clearSecret = await pool.request()
      .query(`
        IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserTwoFactor')
        BEGIN
          DELETE FROM UserTwoFactor 
          WHERE UserId IN (SELECT UserId FROM Users WHERE Email = 'safety@demo.example')
        END
      `);

    console.log('✅ 2FA secret cleared from UserTwoFactor table');

    // Verify the change
    const verify = await pool.request()
      .input('email', sql.NVarChar, 'safety@demo.example')
      .query(`
        SELECT UserId, Email, TwoFAEnabled 
        FROM Users 
        WHERE Email = @email
      `);

    console.log('\n📋 Current User Status:');
    console.log(JSON.stringify(verify.recordset, null, 2));

    await pool.close();
    console.log('\n✅ 2FA has been disabled successfully!');
    console.log('   You can now run the video test without 2FA prompts.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

disable2FA();
