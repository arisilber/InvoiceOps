# Digital Ocean + Supabase Quick Setup Guide

This guide provides a quick reference for deploying InvoiceOps to Digital Ocean with Supabase as the database.

## Overview

Deploy your application to a Digital Ocean Droplet while using Supabase as your managed database. This setup:
- ✅ Reduces server resource usage (no PostgreSQL on Droplet)
- ✅ Provides managed database with backups and scaling
- ✅ Simplifies deployment (no database setup on server)
- ✅ Allows using smaller/cheaper Droplet plans

> **💡 Tip**: For Digital Ocean deployments, using IPv4 addresses instead of hostnames provides more reliable connections. See [SUPABASE_IPV4_SETUP.md](SUPABASE_IPV4_SETUP.md) for detailed IPv4 configuration instructions.

## Quick Steps

### 1. Set Up Supabase (if not already done)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use an existing one
3. Get your connection string: **Settings** → **Database** → **Connection String** → **URI**
4. Set up your database schema in Supabase (use `database/schema.sql`)

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions.

### 2. Deploy Droplet

```bash
# Make sure you have DO_API_TOKEN in your .env file
# Install doctl if not already: brew install doctl
# Authenticate: doctl auth init

./deploy-do.sh
```

This creates a Digital Ocean Droplet and saves the IP to `.do-droplet-ip`.

### 3. Set Up Server (with Supabase)

```bash
# Get server IP
SERVER_IP=$(cat .do-droplet-ip)

# Copy setup script to server
scp setup-server-supabase.sh root@$SERVER_IP:/root/

# SSH into server
ssh root@$SERVER_IP

# Run setup script
bash /root/setup-server-supabase.sh
```

This installs Node.js, Nginx, PM2, and Git (but NOT PostgreSQL since we're using Supabase).

### 4. Copy Application Files

```bash
# From your local machine
SERVER_IP=$(cat .do-droplet-ip)

# Copy files (excluding node_modules and .env)
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' \
  ./ root@$SERVER_IP:/var/www/invoiceops/
```

### 5. Configure Environment Variables

```bash
# SSH into server
ssh root@$SERVER_IP
cd /var/www/invoiceops

# Create .env file
nano .env
```

Add your Supabase connection details:

**Option 1: Using IPv4 Address (Recommended)**

```env
# Supabase Database Configuration (IPv4)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[IPv4-ADDRESS]:5432/postgres
DB_SSL=true

# Server Configuration
PORT=3001
NODE_ENV=production
```

**Option 2: Using Hostname**

```env
# Supabase Database Configuration (Hostname)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DB_SSL=true

# Server Configuration
PORT=3001
NODE_ENV=production
```

**Get your connection details from:**
- **IPv4 Address (Recommended)**: Supabase Dashboard → Settings → Database → Look for IPv4 address or "Direct Connection"
  - You can also resolve the hostname: `nslookup db.[YOUR-PROJECT-REF].supabase.co` (run this on your Digital Ocean Droplet)
- **Hostname**: Supabase Dashboard → Settings → Database → Connection String → URI
- Replace `[YOUR-PASSWORD]` with your database password
- Replace `[YOUR-PROJECT-REF]` with your Supabase project reference
- Replace `[IPv4-ADDRESS]` with the IPv4 address (e.g., `54.123.45.67`)

### 6. Install Dependencies and Build

```bash
cd /var/www/invoiceops

# Install dependencies
npm install --production

# Build the frontend
npm run build
```

### 7. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/invoiceops
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com _;  # Replace with your domain or use IP

    # Serve static files from Vite build
    location / {
        root /var/www/invoiceops/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/invoiceops /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Start Application with PM2

```bash
cd /var/www/invoiceops

# Start the server
pm2 start server/index.js --name invoiceops-api

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs invoiceops-api
```

### 9. Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Verify Connection

1. Check PM2 logs for database connection:
   ```bash
   pm2 logs invoiceops-api
   ```
   You should see: `✅ Database connected successfully`

2. Test the API:
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return: `{"status":"ok","message":"InvoiceOps API is running"}`

3. Access your application:
   - Open browser to: `http://<your-droplet-ip>`
   - API endpoint: `http://<your-droplet-ip>/api`

## Troubleshooting

### Database Connection Errors

- Verify your `DATABASE_URL` is correct in `.env`
- Check that `DB_SSL=true` is set
- Verify your Supabase project is active
- Check Supabase Dashboard → Settings → Database for connection limits
- For IPv4 issues, see [SUPABASE_IPV4_SETUP.md](SUPABASE_IPV4_SETUP.md)

### Application Not Starting

- Check PM2 logs: `pm2 logs invoiceops-api`
- Verify environment variables: `cat /var/www/invoiceops/.env`
- Test database connection manually (if you have psql):
  ```bash
  psql "your-database-url" -c "SELECT 1;"
  ```

### Nginx 502 Bad Gateway

- Check if backend is running: `pm2 status`
- Verify backend is listening: `netstat -tlnp | grep 3001`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Key Differences from Local PostgreSQL Setup

| Aspect | Local PostgreSQL | Supabase |
|--------|------------------|----------|
| Setup Script | `setup-server.sh` | `setup-server-supabase.sh` |
| PostgreSQL Installation | ✅ Installed on Droplet | ❌ Not installed (managed) |
| Database Connection | `localhost:5432` | Supabase connection string |
| Database Setup | Run `schema.sql` on server | Run in Supabase SQL Editor |
| Droplet Resource Usage | Higher (PostgreSQL running) | Lower (no PostgreSQL) |
| Database Management | Manual (on server) | Managed (Supabase Dashboard) |
| Backups | Manual setup needed | Automatic (Supabase) |

## Cost Savings

Using Supabase allows you to:
- Use smaller Droplet plans (e.g., `s-1vcpu-1gb` for ~$6/month)
- Skip PostgreSQL maintenance and backups
- Scale database independently from application server

## Next Steps

- Set up a domain name and point it to your Droplet IP
- Configure SSL certificate with Let's Encrypt
- Set up monitoring and alerts
- Configure automated deployments
- Review Supabase usage and optimize queries

