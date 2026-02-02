# Local Database for Development

Use a plain PostgreSQL install on your machine so you can develop without Supabase or Docker.

## macOS (Homebrew)

1. **Install Postgres**
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
   If the service doesn’t add the binaries to your PATH, add to `~/.zshrc` (or equivalent):
   ```bash
   export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
   ```

2. **Create the database**
   ```bash
   createdb invoiceops
   ```
   With Homebrew, the default superuser is your **macOS username** (not `postgres`) and there’s no password. In `.env` set `DB_USER` to your macOS username (run `whoami` to see it) and leave `DB_PASSWORD` empty.

## Linux

- **Ubuntu/Debian:** `sudo apt install postgresql postgresql-contrib`, then `sudo -u postgres createdb invoiceops`. Use `DB_USER=postgres` and your postgres password in `.env`.
- **Fedora/RHEL:** `sudo dnf install postgresql-server`, `sudo postgresql-setup --initdb`, `sudo systemctl start postgresql`, then `sudo -u postgres createdb invoiceops`.

## Configure the app

1. **Use local DB only**  
   In `.env`, leave `DATABASE_URL` commented out or remove it so the app uses the `DB_*` variables.

2. **Set connection variables** (or copy from `.env.example`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=invoiceops
   DB_USER=          # macOS Homebrew: your username (whoami). Linux: often postgres
   DB_PASSWORD=      # leave empty for local if you have no password
   DB_SSL=false
   ```

3. **Run migrations**
   ```bash
   npm run migrate
   ```

4. **Seed test data (optional)** — test admin: `admin@test.com` / `password`
   ```bash
   npm run seed
   ```

5. **Start the backend**
   ```bash
   npm run server
   ```

## Useful commands

| Command | Description |
|--------|-------------|
| `brew services start postgresql@16` | Start Postgres (macOS) |
| `brew services stop postgresql@16` | Stop Postgres (macOS) |
| `createdb invoiceops` | Create database (macOS; uses your user) |
| `psql -d invoiceops` | Open psql to the app database |
| `npm run migrate` | Apply migrations |
| `npm run migrate:list` | Show migration status |
| `npm run seed` | Seed test data (admin@test.com / password) |

## Switching back to Supabase

Set `DATABASE_URL` in `.env` to your Supabase connection string (and `DB_SSL=true` if needed). The app uses `DATABASE_URL` when it is set and ignores `DB_*` in that case.
