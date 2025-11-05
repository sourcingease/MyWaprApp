/**
 * Complytex DB setup runner
 * Reads SQL files and executes batches against Azure SQL using env credentials
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { AzureSQLConnector } = require('./index.js');

function readSql(file) {
  const p = path.join(__dirname, '..', 'db', file);
  return fs.readFileSync(p, 'utf8');
}

function splitBatches(sqlText) {
  // Split on lines that contain only GO (case-insensitive) possibly with whitespace
  const lines = sqlText.replace(/\r\n/g, '\n').split('\n');
  const batches = [];
  let cur = [];
  for (const line of lines) {
    if (/^\s*GO\s*$/i.test(line)) {
      if (cur.length) batches.push(cur.join('\n'));
      cur = [];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) batches.push(cur.join('\n'));
  return batches.filter(b => b.trim().length > 0);
}

(async () => {
  const connector = new AzureSQLConnector();
  try {
    console.log('Connecting to Azure SQL...');
    await connector.connect();

    const files = ['complytex_schema.sql', 'complytex_seed.sql', 'complytex_procs.sql'];
    for (const f of files) {
      console.log(`\n=== Executing ${f} ===`);
      const sqlText = readSql(f);
      const batches = splitBatches(sqlText);
      let i = 0;
      for (const batch of batches) {
        i += 1;
        const preview = batch.trim().split('\n')[0].slice(0, 120);
        console.log(`  -> batch ${i}/${batches.length}: ${preview}`);
        try {
          await connector.executeQuery(batch);
        } catch (e) {
          console.error(`Error in ${f} batch ${i}:`, e.message);
          throw e;
        }
      }
      console.log(`Done: ${f} (${batches.length} batches)`);
    }

    console.log('\nAll scripts executed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
  } finally {
    try { await connector.disconnect(); } catch {}
  }
})();
