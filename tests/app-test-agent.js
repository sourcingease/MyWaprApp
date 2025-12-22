/**
 * Application Test Agent
 *
 * - Connects to Azure SQL using AzureSQLConnector
 * - Runs your existing automated test command (default: `npm test`)
 * - After tests finish, scans tables for recent inserts and prints them
 *
 * You can customize which command to run by passing it via CLI, e.g.
 *   node tests/app-test-agent.js "npm run health-check"
 */

require('dotenv').config();

const { spawn } = require('child_process');
const { AzureSQLConnector } = require('../src/index.js');

// Common timestamp column names we will look for
const DATE_COLUMNS = [
  'CreatedDate',
  'Created',
  'DateCreated',
  'Timestamp',
  'ModifiedDate',
  'UpdatedAt',
  'CreatedAt'
];

async function runCommand(commandLine) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = commandLine.split(' ').filter(Boolean);
    console.log(`\n▶ Running test command: ${cmd} ${args.join(' ')}`);

    const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`\n✅ Test command completed with exit code 0`);
        resolve();
      } else {
        console.log(`\n⚠️  Test command exited with code ${code}`);
        resolve(); // still continue to DB inspection
      }
    });

    child.on('error', (err) => {
      console.error('❌ Failed to start test command:', err.message);
      reject(err);
    });
  });
}

async function findTablesWithDateColumns(conn) {
  const placeholders = DATE_COLUMNS.map((_, idx) => `@c${idx}`).join(',');
  const params = {};
  DATE_COLUMNS.forEach((name, idx) => {
    params[`c${idx}`] = name;
  });

  const query = `
    SELECT DISTINCT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE COLUMN_NAME IN (${DATE_COLUMNS.map(n => `'${n}'`).join(',')})
    ORDER BY TABLE_NAME, COLUMN_NAME
  `;

  const result = await conn.executeQuery(query);
  return result.recordset || [];
}

async function showRecentInsertsSince(conn, sinceDate) {
  console.log(`\n🔎 Scanning for records inserted since ${sinceDate.toISOString()}...`);

  const mappings = await findTablesWithDateColumns(conn);
  if (!mappings.length) {
    console.log('⚠️  No tables found with common Created*/Timestamp date columns.');
    return;
  }

  for (const row of mappings) {
    const table = row.TABLE_NAME;
    const col = row.COLUMN_NAME;

    const query = `
      SELECT TOP 20 *
      FROM [${table}]
      WHERE [${col}] >= @since
      ORDER BY [${col}] DESC
    `;

    try {
      const result = await conn.executeQuery(query, { since: sinceDate });
      const records = result.recordset || [];
      if (!records.length) continue;

      console.log(`\n📈 Table ${table} (by ${col}) - ${records.length} recent record(s):`);
      records.forEach((rec, idx) => {
        // Print a compact snapshot of each row
        const keys = Object.keys(rec);
        const preview = {};
        keys.slice(0, 8).forEach(k => {
          preview[k] = rec[k];
        });
        console.log(`  #${idx + 1}:`, preview);
      });
    } catch (err) {
      // Skip tables we cannot query for some reason
      console.log(`⚠️  Could not inspect table ${table} using ${col}: ${err.message}`);
    }
  }
}

async function main() {
  const testCommand = process.argv[2] || 'npm test';
  const startTime = new Date();

  console.log('🤖 App Test Agent starting...');
  console.log(`Database server: ${process.env.AZURE_SQL_SERVER || 'zlnsw9feuf.database.windows.net'}`);
  console.log(`Database name : ${process.env.AZURE_SQL_DATABASE || 'SeApp2'}`);

  const connector = new AzureSQLConnector();

  try {
    await connector.connect();

    // Optional: quick connection test
    await connector.testConnection();

    // Run tests
    await runCommand(testCommand);

    // Inspect DB for recent data
    await showRecentInsertsSince(connector, startTime);

    console.log('\n✅ App Test Agent finished.');
  } catch (err) {
    console.error('\n❌ App Test Agent failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await connector.disconnect();
  }
}

if (require.main === module) {
  main();
}
