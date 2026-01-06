# Supabase PostgreSQL Setup Guide

This guide will help you set up a Supabase PostgreSQL database for InvoiceOps.

## Prerequisites

1. A Supabase account ([sign up here](https://supabase.com))
2. A new Supabase project

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in your project details:
   - Name: `invoiceops` (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest region
4. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Connection Details

### Option A: Using Hostname (Default)

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String**
3. Select **URI** from the dropdown
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Option B: Using IPv4 Address (Alternative)

Using IPv4 addresses can provide more reliable connections:

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection String**
3. Look for **IPv4** or **Direct Connection** section
4. You'll find the IPv4 address (looks like: `xxx.xxx.xxx.xxx`)
5. Use this IPv4 address in your connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@[IPv4-ADDRESS]:5432/postgres
   ```

**To find the IPv4 address:**
- In Supabase Dashboard → Settings → Database
- Look for "Connection pooling" or "Direct connection" section
- The IPv4 address is listed there (or you can resolve the hostname: `nslookup db.[PROJECT-REF].supabase.co`)

### Individual Connection Parameters

You can also use individual connection parameters:
- **Host**: `db.[PROJECT-REF].supabase.co` (or IPv4 address like `xxx.xxx.xxx.xxx`)
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: (the one you set during project creation)

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root of the project:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase connection string:

   **Using hostname (default):**
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
   DB_SSL=true
   PORT=3001
   NODE_ENV=development
   ```

   **Using IPv4 address (alternative):**
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@xxx.xxx.xxx.xxx:5432/postgres
   DB_SSL=true
   PORT=3001
   NODE_ENV=development
   ```

   **Or use individual parameters with hostname:**
   ```env
   DB_HOST=db.YOUR_PROJECT_REF.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=YOUR_PASSWORD
   DB_SSL=true
   PORT=3001
   NODE_ENV=development
   ```

   **Or use individual parameters with IPv4:**
   ```env
   DB_HOST=xxx.xxx.xxx.xxx
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=YOUR_PASSWORD
   DB_SSL=true
   PORT=3001
   NODE_ENV=development
   ```

## Step 4: Set Up the Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `database/schema.sql` from this project
3. Copy the entire SQL content
4. Paste it into the Supabase SQL Editor
5. Click "Run" to execute the schema

Alternatively, you can run the schema using psql or any PostgreSQL client:
```bash
psql "your-database-url" -f database/schema.sql
```

## Step 5: Verify the Connection

1. Start your server:
   ```bash
   npm run server
   ```

2. You should see:
   ```
   ✅ Database connected successfully
   🚀 Server running on http://localhost:3001
   ```

## Environment Variables Reference

### Required for Supabase:

- **DATABASE_URL** (recommended): Full PostgreSQL connection string from Supabase
  - OR use individual parameters:
    - **DB_HOST**: Your Supabase project host
    - **DB_PORT**: `5432` (default)
    - **DB_NAME**: `postgres` (default)
    - **DB_USER**: `postgres` (default)
    - **DB_PASSWORD**: Your database password
- **DB_SSL**: Set to `true` for Supabase (required for secure connections)

### Optional:

- **PORT**: Server port (default: `3001`)
- **NODE_ENV**: Environment mode (default: `development`)

## Troubleshooting

### Connection Refused
- Verify your `DATABASE_URL` or connection parameters are correct
- Check that `DB_SSL=true` is set
- Ensure your IP is allowed (Supabase allows all IPs by default, but check if you have restrictions)

### SSL Error
- Make sure `DB_SSL=true` is set in your `.env` file
- The connection uses `rejectUnauthorized: false` which is acceptable for Supabase

### Authentication Failed
- Double-check your database password
- Verify the user is `postgres` (default)
- Check that you're using the correct project reference in the host/URL

## Security Notes

- **Never commit your `.env` file** to version control
- The `.env.example` file is safe to commit (it contains placeholder values)
- Keep your database password secure
- Supabase provides connection pooling by default

## Next Steps

Once your database is set up, you can:
- Start using the InvoiceOps application
- Access your database via Supabase Dashboard → Table Editor
- Set up Row Level Security (RLS) policies if needed (currently not required for this app)
- Monitor your database usage in the Supabase Dashboard


