# Scripts Directory

This directory contains all utility scripts organized by category.

## Directory Structure

### `deployment/`
Main deployment and server setup scripts:
- **`deploy.sh`** - Complete deployment script (runs migrations, builds frontend, deploys to Digital Ocean)
- **`deploy-do.sh`** - Creates a Digital Ocean Droplet
- **`setup-server.sh`** - Server setup script for local PostgreSQL deployments
- **`setup-server-supabase.sh`** - Server setup script for Supabase deployments

### `digitalocean/`
Digital Ocean specific management scripts:
- **`setup-ssh-do.sh`** - Sets up SSH keys for Digital Ocean Droplet
- **`update-env-do.sh`** - Updates environment variables on Digital Ocean Droplet

### `diagnostics/`
Troubleshooting and diagnostic scripts:
- **`check-setup-status.sh`** - Checks setup status on Digital Ocean droplet
- **`check-apt-progress.sh`** - Checks apt-get upgrade progress
- **`check-dpkg-status.sh`** - Checks dpkg lock status
- **`diagnose-dpkg-lock.sh`** - Diagnoses dpkg lock issues
- **`fix-dpkg-lock.sh`** - Fixes dpkg lock issues (remotely)
- **`fix-dpkg-on-droplet.sh`** - Fixes dpkg lock issues (on droplet)

### `database/`
Database setup and configuration scripts (Node.js):
- **`setup-auth.js`** - Sets up authentication (runs migrations)
- **`setup-database.js`** - Sets up database schema
- **`enable-rls.js`** - Enables Row Level Security on database tables

## Usage

### Deployment

```bash
# Deploy to Digital Ocean
./scripts/deployment/deploy.sh

# Create a new Digital Ocean Droplet
./scripts/deployment/deploy-do.sh
```

### Database Setup

```bash
# Setup authentication
npm run setup-auth

# Setup database schema
node scripts/database/setup-database.js

# Enable Row Level Security
node scripts/database/enable-rls.js
```

### Diagnostics

```bash
# Check setup status
./scripts/diagnostics/check-setup-status.sh

# Diagnose dpkg issues
./scripts/diagnostics/diagnose-dpkg-lock.sh
```

## Notes

- All scripts should be run from the project root directory
- Shell scripts require execute permissions: `chmod +x scripts/**/*.sh`
- Database scripts require Node.js and access to the database via environment variables

