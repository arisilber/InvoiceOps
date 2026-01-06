# Database Migrations

This directory contains database migration files that manage schema changes over time.

## Migration Files

Migrations are SQL files named with a numeric prefix to ensure execution order:
- `0001_create_migrations_table.sql` - Creates the migrations tracking table
  - `0001_create_migrations_table.rollback.sql` - Rollback for the migrations table
- `0002_add_authentication_tables.sql` - Adds user authentication tables
  - `0002_add_authentication_tables.rollback.sql` - Rollback for authentication tables

Each migration should have a corresponding `.rollback.sql` file that can undo the changes.

## Running Migrations

### Run all pending migrations:
```bash
npm run migrate
```

Or directly:
```bash
node database/run-migrations.js
```

### List migration status:
```bash
npm run migrate:list
```

Or:
```bash
node database/run-migrations.js list
```

### How It Works

1. The migration system tracks which migrations have been executed in the `migrations` table
2. Migrations are executed in alphabetical/numerical order
3. Each migration runs in a transaction - if it fails, it's rolled back
4. Only pending migrations are executed
5. Rollback files (`.rollback.sql`) allow you to undo migrations

## Rolling Back Migrations

### Rollback the last migration:
```bash
npm run migrate:rollback
```

Or:
```bash
node database/run-migrations.js rollback
```

### Rollback the last N migrations:
```bash
node database/run-migrations.js rollback 3
```

### Rollback a specific migration:
```bash
node database/run-migrations.js rollback 0002_add_authentication_tables.sql
```

**Important Notes:**
- Rollback files must be named with `.rollback.sql` suffix (e.g., `0002_add_authentication_tables.rollback.sql`)
- Rollbacks run in reverse order (most recent first)
- Rollbacks are transactional - if one fails, the transaction is rolled back
- Missing rollback files will be skipped with a warning

## Creating New Migrations

1. Create a new SQL file in this directory with a numeric prefix:
   ```
   0003_your_migration_name.sql
   ```

2. Write your SQL statements:
   ```sql
   -- Migration: Description of what this migration does
   
   CREATE TABLE IF NOT EXISTS new_table (
       id SERIAL PRIMARY KEY,
       ...
   );
   ```

3. **Create a rollback file** with the same name but `.rollback.sql` suffix:
   ```
   0003_your_migration_name.rollback.sql
   ```

4. Write the rollback SQL:
   ```sql
   -- Rollback: Description of what this rollback does
   
   DROP TABLE IF EXISTS new_table;
   ```

5. Run migrations:
   ```bash
   npm run migrate
   ```

## Best Practices

- **Always use `IF NOT EXISTS`** for tables, indexes, etc. to make migrations idempotent
- **Always create rollback files** - every migration should have a corresponding `.rollback.sql` file
- **Use transactions** - migrations run in transactions automatically
- **Test migrations and rollbacks** on a development database first
- **Never modify existing migrations** - create a new migration to fix issues
- **Use descriptive names** that explain what the migration does
- **Number migrations sequentially** to maintain order
- **Order rollback operations correctly** - drop in reverse order of creation (tables with foreign keys first)
- **Use `IF EXISTS` in rollbacks** to make them safe to run multiple times

## Migration File Naming

Use the format: `NNNN_description.sql` where:
- `NNNN` is a 4-digit number (0001, 0002, etc.)
- `description` is a short, descriptive name in snake_case

Examples:
- `0001_create_migrations_table.sql` (with `0001_create_migrations_table.rollback.sql`)
- `0002_add_authentication_tables.sql` (with `0002_add_authentication_tables.rollback.sql`)
- `0003_add_user_preferences.sql` (with `0003_add_user_preferences.rollback.sql`)

**Rollback files** use the same name with `.rollback.sql` suffix:
- `0001_create_migrations_table.rollback.sql`
- `0002_add_authentication_tables.rollback.sql`
- `0003_add_user_preferences.rollback.sql`

