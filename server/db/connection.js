import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase connection configuration
// Supports both hostname and IPv4 addresses
// If DATABASE_URL is provided, use it (Supabase provides this)
// Otherwise, use individual connection parameters
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use connection string (recommended for Supabase)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
} else {
  // Use individual connection parameters
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'invoiceops',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout
  };
}

const pool = new Pool(poolConfig);

// Test the connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};

// Helper function to get a client from the pool (for transactions)
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export default pool;

