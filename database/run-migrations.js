import pg from 'pg';
import dotenv from 'dotenv';
import { readdir, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

dotenv.config();

const { Pool } = pg;
const readdirAsync = promisify(readdir);

// Database connection
let poolConfig;

// Support both DATABASE_URL and SUPABASE_CONNECTION_STRING
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_CONNECTION_STRING;

if (connectionString) {
  poolConfig = {
    connectionString: connectionString,
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

/**
 * Get all migration files sorted by name (excluding rollback files)
 */
async function getMigrationFiles() {
  const migrationsDir = join(process.cwd(), 'database', 'migrations');
  const files = await readdirAsync(migrationsDir);
  
  // Filter to only .sql files, exclude rollback files, and sort
  return files
    .filter(file => file.endsWith('.sql') && !file.endsWith('.rollback.sql'))
    .sort();
}

/**
 * Get rollback file path for a migration
 */
function getRollbackFilePath(migrationName) {
  const migrationsDir = join(process.cwd(), 'database', 'migrations');
  const rollbackName = migrationName.replace('.sql', '.rollback.sql');
  return join(migrationsDir, rollbackName);
}

/**
 * Check if a rollback file exists for a migration
 */
function hasRollbackFile(migrationName) {
  const rollbackPath = getRollbackFilePath(migrationName);
  return existsSync(rollbackPath);
}

/**
 * Get migrations that have already been executed
 */
async function getExecutedMigrations() {
  try {
    const result = await pool.query('SELECT name FROM migrations ORDER BY name');
    return new Set(result.rows.map(row => row.name));
  } catch (error) {
    // If migrations table doesn't exist, return empty set
    // The first migration should create it
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return new Set();
    }
    throw error;
  }
}

/**
 * Record that a migration has been executed
 */
async function recordMigration(name, client = null) {
  const queryClient = client || pool;
  await queryClient.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
}

/**
 * Remove a migration record (for rollback)
 */
async function removeMigrationRecord(name, client = null) {
  const queryClient = client || pool;
  await queryClient.query('DELETE FROM migrations WHERE name = $1', [name]);
}

/**
 * Run a single migration
 */
async function runMigration(name, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await recordMigration(name, client);
    await client.query('COMMIT');
    console.log(`   ✅ ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...\n');
    
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();
    
    if (migrationFiles.length === 0) {
      console.log('   No migration files found.');
      return;
    }
    
    const migrationsDir = join(process.cwd(), 'database', 'migrations');
    let pendingCount = 0;
    let executedCount = 0;
    
    for (const file of migrationFiles) {
      const migrationName = file;
      
      if (executedMigrations.has(migrationName)) {
        console.log(`   ⏭️  ${migrationName} (already executed)`);
        executedCount++;
        continue;
      }
      
      // Read and execute migration
      const migrationPath = join(migrationsDir, file);
      const sql = readFileSync(migrationPath, 'utf-8');
      
      await runMigration(migrationName, sql);
      pendingCount++;
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Executed: ${pendingCount} new migration(s)`);
    console.log(`   Skipped: ${executedCount} already executed migration(s)`);
    
    if (pendingCount === 0 && executedCount > 0) {
      console.log(`\n💡 Database is up to date.`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error; // Re-throw so caller can handle it
  } finally {
    await pool.end();
  }
}

// Handle command line arguments
const isMainModule = process.argv[1]?.endsWith('run-migrations.js') ||
                     import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  if (command === 'rollback' || command === 'down') {
    // Rollback migrations
    if (arg) {
      // Check if it's a number or migration name
      const numArg = parseInt(arg);
      if (!isNaN(numArg)) {
        rollbackMigrations(numArg).catch((error) => {
          process.exit(1);
        });
      } else {
        rollbackMigrations(arg).catch((error) => {
          process.exit(1);
        });
      }
    } else {
      // Rollback last migration
      rollbackMigrations().catch((error) => {
        process.exit(1);
      });
    }
  } else if (command === 'list' || command === 'status') {
    // List migrations
    listMigrations().catch((error) => {
      process.exit(1);
    });
  } else {
    // Default: run migrations
    runMigrations().catch((error) => {
      process.exit(1);
    });
  }
}

/**
 * Rollback a single migration
 */
async function rollbackMigration(migrationName) {
  const rollbackPath = getRollbackFilePath(migrationName);
  
  if (!existsSync(rollbackPath)) {
    throw new Error(`Rollback file not found for migration: ${migrationName}`);
  }
  
  const sql = readFileSync(rollbackPath, 'utf-8');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await removeMigrationRecord(migrationName, client);
    await client.query('COMMIT');
    console.log(`   ✅ Rolled back: ${migrationName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rollback migrations
 * @param {number|string} countOrName - Number of migrations to rollback, or specific migration name
 */
async function rollbackMigrations(countOrName) {
  try {
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.size === 0) {
      console.log('   No migrations to rollback.');
      return;
    }
    
    // Get executed migrations as sorted array
    const executedArray = Array.from(executedMigrations).sort().reverse();
    
    let migrationsToRollback = [];
    
    if (typeof countOrName === 'number') {
      // Rollback last N migrations
      migrationsToRollback = executedArray.slice(0, countOrName);
      console.log(`🔄 Rolling back last ${countOrName} migration(s)...\n`);
    } else if (typeof countOrName === 'string') {
      // Rollback specific migration
      if (!executedMigrations.has(countOrName)) {
        throw new Error(`Migration "${countOrName}" has not been executed.`);
      }
      migrationsToRollback = [countOrName];
      console.log(`🔄 Rolling back migration: ${countOrName}...\n`);
    } else {
      // Rollback last migration
      migrationsToRollback = [executedArray[0]];
      console.log('🔄 Rolling back last migration...\n');
    }
    
    if (migrationsToRollback.length === 0) {
      console.log('   No migrations to rollback.');
      return;
    }
    
    const migrationsDir = join(process.cwd(), 'database', 'migrations');
    let rolledBackCount = 0;
    let skippedCount = 0;
    
    for (const migrationName of migrationsToRollback) {
      const rollbackPath = getRollbackFilePath(migrationName);
      
      if (!existsSync(rollbackPath)) {
        console.log(`   ⚠️  ${migrationName} (no rollback file found, skipping)`);
        skippedCount++;
        continue;
      }
      
      await rollbackMigration(migrationName);
      rolledBackCount++;
    }
    
    console.log(`\n✅ Rollback complete!`);
    console.log(`   Rolled back: ${rolledBackCount} migration(s)`);
    if (skippedCount > 0) {
      console.log(`   Skipped: ${skippedCount} migration(s) (no rollback file)`);
    }
    
  } catch (error) {
    console.error('\n❌ Rollback failed:');
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * List all migrations and their status
 */
async function listMigrations() {
  try {
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();
    
    console.log('📋 Migration Status:\n');
    
    if (migrationFiles.length === 0) {
      console.log('   No migration files found.');
      return;
    }
    
    for (const file of migrationFiles) {
      const isExecuted = executedMigrations.has(file);
      const rollbackPath = getRollbackFilePath(file);
      const hasRollback = existsSync(rollbackPath);
      
      const status = isExecuted ? '✅ Executed' : '⏳ Pending';
      const rollbackInfo = hasRollback ? ' (has rollback)' : ' (no rollback)';
      
      console.log(`   ${status} - ${file}${rollbackInfo}`);
    }
    
    console.log(`\n   Total: ${migrationFiles.length} migration(s)`);
    console.log(`   Executed: ${executedMigrations.size}`);
    console.log(`   Pending: ${migrationFiles.length - executedMigrations.size}`);
    
  } catch (error) {
    console.error('\n❌ Failed to list migrations:');
    console.error(`   ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

export { runMigrations, rollbackMigrations, listMigrations, getExecutedMigrations, recordMigration };

