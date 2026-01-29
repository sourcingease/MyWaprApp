const sql = require('mssql');
require('dotenv').config();

async function disableTwoFactor() {
  try {
    const pool = await sql.connect({
      user: process.env.AZURE_SQL_USERNAME || 'turtle',
      password: process.env.AZURE_SQL_PASSWORD,
      server: process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net',
      database: process.env.AZURE_SQL_DATABASE || 'Complytex',
      options: { encrypt: true, trustServerCertificate: false }
    });

    console.log('✅ Connected to database\n');

    // Disable 2FA for safety@demo.example
    const result = await pool.request()
      .input('email', sql.NVarChar, 'safety@demo.example')
      .query(`
        UPDATE Users 
        SET TwoFAEnabled = 0, 
            TwoFASecret = NULL 
        WHERE Email = @email
      `);

    console.log(`✅ 2FA Disabled for safety@demo.example`);
    console.log(`   Rows affected: ${result.rowsAffected[0]}`);

    // Also clear from UserTwoFactor table if it exists
    try {
      const userResult = await pool.request()
        .input('email', sql.NVarChar, 'safety@demo.example')
        .query(`SELECT UserId FROM Users WHERE Email = @email`);
      
      if (userResult.recordset.length > 0) {
        const userId = userResult.recordset[0].UserId;
        
        await pool.request()
          .input('userId', sql.Int, userId)
          .query(`DELETE FROM UserTwoFactor WHERE UserId = @userId`);
        
        console.log(`✅ Cleared UserTwoFactor table entry`);
      }
    } catch (e) {
      console.log('ℹ️  UserTwoFactor table may not exist (OK)');
    }

    // Verify
    const verify = await pool.request()
      .input('email', sql.NVarChar, 'safety@demo.example')
      .query(`SELECT Email, TwoFAEnabled, TwoFASecret FROM Users WHERE Email = @email`);

    console.log('\n📋 Current Status:');
    console.log(JSON.stringify(verify.recordset[0], null, 2));

    await pool.close();
    console.log('\n✅ 2FA completely disabled! You can now login with just email and password.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

disableTwoFactor();
