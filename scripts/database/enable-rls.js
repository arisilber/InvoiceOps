import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the same configuration logic as connection.js
let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'invoiceops',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(poolConfig);

async function enableRLS() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Reading RLS configuration file...');
    const rlsPath = join(__dirname, '../../database', 'enable-rls.sql');
    let rlsSQL = readFileSync(rlsPath, 'utf8');
    
    // Remove comments
    rlsSQL = rlsSQL.replace(/--.*$/gm, '');
    
    console.log('🔄 Enabling Row Level Security on all tables...');
    
    await client.query(rlsSQL);
    
    console.log('✅ RLS enabled successfully!');
    
    // Verify RLS is enabled on all tables
    const rlsCheckResult = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'clients', 'work_types', 'invoices', 'time_entries',
          'invoice_lines', 'payments', 'payment_applications'
        )
      ORDER BY tablename;
    `);
    
    console.log('\n📊 RLS Status:');
    rlsCheckResult.rows.forEach(row => {
      const status = row.rowsecurity ? '✅ Enabled' : '❌ Disabled';
      console.log(`   ${status} - ${row.tablename}`);
    });
    
    // Check policies
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    if (policiesResult.rows.length > 0) {
      console.log('\n🔒 Created Policies:');
      policiesResult.rows.forEach(row => {
        console.log(`   ✅ ${row.tablename}.${row.policyname}`);
      });
    }
    
    console.log('\n🎉 RLS setup complete!');
    console.log('\n💡 Note: Service role (postgres) bypasses RLS by default.');
    console.log('   The policies created ensure compatibility if you add user authentication later.');
    
  } catch (error) {
    console.error('❌ Error enabling RLS:');
    console.error(error.message);
    
    // If policy already exists, that's okay
    if (error.message.includes('already exists')) {
      console.error('\n💡 Some policies may already exist. This is okay.');
    }
    
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

enableRLS()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));


