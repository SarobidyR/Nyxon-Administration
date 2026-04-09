const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min:      parseInt(process.env.DB_POOL_MIN) || 2,
  max:      parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT version()');
    console.log(`✅ PostgreSQL connecté : ${res.rows[0].version.split(',')[0]}`);
    client.release();
  } catch (err) {
    console.error('❌ Impossible de connecter PostgreSQL:', err.message);
    process.exit(1);
  }
};

// Helper : exécuter une requête simple
const query = (text, params) => pool.query(text, params);

// Helper : transaction complète
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, connectDB, withTransaction };