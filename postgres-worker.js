const fs = require('fs');
const { parentPort, workerData } = require('worker_threads');
const { Pool, types } = require('pg');

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const pool = new Pool({
  connectionString: workerData.connectionString,
  max: Number(workerData.max || 4),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: workerData.ssl === false ? false : { rejectUnauthorized: false }
});

async function runQuery(message) {
  const view = new Int32Array(message.sharedBuffer);
  try {
    const result = await pool.query(message.sql, message.params || []);
    fs.writeFileSync(message.outFile, JSON.stringify({
      ok: true,
      rows: result.rows || [],
      rowCount: result.rowCount || 0
    }));
    Atomics.store(view, 0, 1);
  } catch (error) {
    fs.writeFileSync(message.outFile, JSON.stringify({
      ok: false,
      error: error.message,
      code: error.code || '',
      sql: message.sql
    }));
    Atomics.store(view, 0, 2);
  } finally {
    Atomics.notify(view, 0, 1);
  }
}

parentPort.on('message', (message) => {
  runQuery(message).catch((error) => {
    const view = new Int32Array(message.sharedBuffer);
    fs.writeFileSync(message.outFile, JSON.stringify({
      ok: false,
      error: error.message
    }));
    Atomics.store(view, 0, 2);
    Atomics.notify(view, 0, 1);
  });
});
