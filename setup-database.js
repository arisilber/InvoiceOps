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

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('🔄 Reading schema file...');
    const schemaPath = join(__dirname, 'database', 'schema.sql');
    let schemaSQL = readFileSync(schemaPath, 'utf8');
    
    // Remove comments
    schemaSQL = schemaSQL.replace(/--.*$/gm, '');
    
    console.log('🔄 Running database schema...');
    
    // Execute the entire schema in one transaction
    // PostgreSQL will validate foreign keys at the end of the transaction
    await client.query(schemaSQL);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('✅ Database schema created successfully!');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Check for default work types
    const workTypesResult = await client.query('SELECT code, description FROM work_types');
    if (workTypesResult.rows.length > 0) {
      console.log('\n📝 Default work types:');
      workTypesResult.rows.forEach(row => {
        console.log(`   • ${row.code}: ${row.description}`);
      });
    }
    
    console.log('\n🎉 Database setup complete!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK').catch(() => {});
    
    console.error('❌ Error setting up database:');
    console.error(error.message);
    
    // Check if error is about foreign key reference
    if (error.message.includes('does not exist') && error.message.includes('time_entries')) {
      console.error('\n💡 This might be a foreign key reference issue.');
      console.error('   Try running the schema manually in Supabase SQL Editor.');
    }
    
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
