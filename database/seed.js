/**
 * Seed local database with test data including a test admin user.
 * Run after migrations: npm run migrate && npm run seed
 *
 * Test admin: admin@test.com / password
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const { Pool } = pg;

const useIndividualParams =
  process.env.DB_HOST != null && String(process.env.DB_HOST).trim() !== '';

let poolConfig;
if (useIndividualParams) {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'invoiceops',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
} else if (process.env.DATABASE_URL || process.env.SUPABASE_CONNECTION_STRING) {
  poolConfig = {
    connectionString:
      process.env.DATABASE_URL || process.env.SUPABASE_CONNECTION_STRING,
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

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'password';
const ADMIN_NAME = 'Test Admin';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Test admin user (skip if already exists)
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );
    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await client.query(
        `INSERT INTO users (email, password_hash, name, company_name)
         VALUES ($1, $2, $3, $4)`,
        [ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'Acme Consulting']
      );
      console.log('   ✅ Test admin user: admin@test.com / password');
    } else {
      console.log('   ⏭️  Admin user already exists (admin@test.com)');
    }

    // 2. Work types (only if empty)
    const wt = await client.query('SELECT id FROM work_types LIMIT 1');
    if (wt.rows.length === 0) {
      await client.query(`
        INSERT INTO work_types (code, description) VALUES
          ('frontend', 'Frontend Development'),
          ('backend', 'Backend Development'),
          ('infra', 'Infrastructure/DevOps')
        ON CONFLICT (code) DO NOTHING
      `);
      console.log('   ✅ Work types');
    } else {
      console.log('   ⏭️  Work types already present');
    }

    // 3. Clients (only if none)
    const cl = await client.query('SELECT id FROM clients LIMIT 1');
    if (cl.rows.length === 0) {
      await client.query(`
        INSERT INTO clients (type, name, email, hourly_rate_cents, discount_percent) VALUES
          ('company', 'Widget Co', 'billing@widgetco.com', 15000, 0),
          ('individual', 'Jane Doe', 'jane@example.com', 12000, 10),
          ('company', 'Startup Inc', 'finance@startup.io', 18000, 5)
      `);
      console.log('   ✅ Test clients (3)');
    } else {
      console.log('   ⏭️  Clients already present');
    }

    // 4. Time entries and invoices only if we have clients and work_types
    const clients = await client.query('SELECT id FROM clients ORDER BY id');
    const workTypes = await client.query('SELECT id, code FROM work_types ORDER BY id');
    const hasTimeEntries = (
      await client.query('SELECT id FROM time_entries LIMIT 1')
    ).rows.length > 0;

    if (
      clients.rows.length > 0 &&
      workTypes.rows.length > 0 &&
      !hasTimeEntries
    ) {
      const clientId = clients.rows[0].id;
      const workTypeId = workTypes.rows[0].id;

      await client.query(
        `INSERT INTO time_entries (client_id, work_type_id, project_name, work_date, minutes_spent, detail)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, workTypeId, 'Website Redesign', '2025-01-15', 120, 'Homepage layout']
      );
      await client.query(
        `INSERT INTO time_entries (client_id, work_type_id, project_name, work_date, minutes_spent, detail)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, workTypeId, 'API Integration', '2025-01-20', 90, 'REST endpoints']
      );
      console.log('   ✅ Time entries (2)');

      // One draft invoice
      const inv = await client.query(
        `INSERT INTO invoices (invoice_number, client_id, invoice_date, due_date, status, subtotal_cents, discount_cents, total_cents)
         VALUES (1001, $1, '2025-01-01', '2025-01-31', 'draft', 52500, 0, 52500)
         RETURNING id`,
        [clientId]
      );
      const invoiceId = inv.rows[0].id;
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, work_type_id, project_name, total_minutes, hourly_rate_cents, amount_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoiceId, workTypeId, 'Website Redesign', 120, 15000, 30000]
      );
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, work_type_id, project_name, total_minutes, hourly_rate_cents, amount_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoiceId, workTypeId, 'API Integration', 90, 15000, 22500]
      );
      console.log('   ✅ Sample invoice (draft)');
    } else if (hasTimeEntries) {
      console.log('   ⏭️  Time entries / invoices already present');
    }

    // 5. Expenses (only if none)
    const ex = await client.query('SELECT id FROM expenses LIMIT 1');
    if (ex.rows.length === 0) {
      await client.query(`
        INSERT INTO expenses (vendor, item, price_cents, quantity, expense_date, is_refund) VALUES
          ('AWS', 'Hosting Q1', 9900, 1, '2025-01-10', false),
          ('Staples', 'Office supplies', 4500, 1, '2025-01-12', false)
      `);
      console.log('   ✅ Expenses (2)');
    } else {
      console.log('   ⏭️  Expenses already present');
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed complete.');
    console.log('\nLogin with: admin@test.com / password\n');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  if (err.message.includes('does not exist')) {
    console.error('\n💡 Run schema and migrations first:');
    console.error('   psql -U postgres -d invoiceops -f database/schema.sql');
    console.error('   npm run migrate');
  }
  process.exit(1);
});
