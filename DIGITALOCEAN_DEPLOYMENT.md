# InvoiceOps Digital Ocean Deployment Guide

This guide walks you through deploying InvoiceOps to a Digital Ocean Droplet.

## Prerequisites

1. **Digital Ocean Account**: Sign up at [digitalocean.com](https://www.digitalocean.com) if you don't have one
2. **Digital Ocean API Token**: Get your API token from [Digital Ocean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
   - Create a new token with **Write** scope
3. **Digital Ocean CLI (doctl)**: Install the Digital Ocean CLI:
   ```bash
   brew install doctl
   ```

## Configuration

### 1. Set up API Token

Add your Digital Ocean API token to your `.env` file:

```bash
DO_API_TOKEN=your_api_token_here
```

The deployment script will automatically load this from your `.env` file.

### 2. Authenticate doctl

After installing doctl, authenticate it:

```bash
doctl auth init
```

Or use your API token directly:
```bash
doctl auth init --access-token YOUR_API_TOKEN
```

### 3. Optional Configuration

You can customize the deployment by setting these environment variables (optional):

```bash
# In .env or export before running deploy-do.sh
DO_REGION=nyc1              # Region code (nyc1 = New York, default)
DO_SIZE=s-1vcpu-1gb         # Size (s-1vcpu-1gb = 1 CPU, 1 GB RAM, ~$6/month)
DO_NAME=invoiceops          # Droplet name
DO_SSH_KEYS=key1,key2       # Optional: SSH key IDs or fingerprints (comma-separated)
```

**Available Regions** (run `doctl compute region list` to see all):
- `nyc1`, `nyc2`, `nyc3` - New York (US East)
- `sfo1`, `sfo2`, `sfo3` - San Francisco (US West)
- `ams2`, `ams3` - Amsterdam (Europe)
- `sgp1` - Singapore (Asia)
- `lon1` - London (Europe)
- `fra1` - Frankfurt (Europe)

**Available Sizes** (run `doctl compute size list` to see all):
- `s-1vcpu-512mb-10gb` - 1 CPU, 512 MB RAM, 10 GB SSD (~$4/month) ⚠️ Very tight for Node.js
- `s-1vcpu-1gb` - 1 CPU, 1 GB RAM, 25 GB SSD (~$6/month) ⭐ Recommended minimum
- `s-2vcpu-2gb` - 2 CPU, 2 GB RAM, 50 GB SSD (~$12/month) 💰 Good for production
- `s-2vcpu-4gb` - 2 CPU, 4 GB RAM, 80 GB SSD (~$24/month)

## Database Options

InvoiceOps supports two database deployment options:

### Option A: Supabase (Recommended) 🌟

**Advantages:**
- ✅ Managed database service (no maintenance)
- ✅ Automatic backups and scaling
- ✅ Lower Droplet resource usage (can use smaller/cheaper plans)
- ✅ Built-in connection pooling
- ✅ Free tier available
- ✅ Simpler setup (no PostgreSQL installation needed)

**When to use:** Most deployments, especially if you want a managed database solution.

**Setup:** Use `setup-server-supabase.sh` (see [Deploying with Supabase](#deploying-with-supabase) below)

### Option B: Local PostgreSQL

**Advantages:**
- ✅ Full database control
- ✅ No external dependencies
- ✅ Lower latency (database on same server)

**When to use:** If you need full control over the database or want to avoid external dependencies.

**Setup:** Use `setup-server.sh` (see [Deploying with Local PostgreSQL](#deploying-with-local-postgresql) below)

## Deployment Steps

### Step 1: Deploy Droplet

Run the deployment script:

```bash
chmod +x deploy-do.sh
./deploy-do.sh
```

The script will:
1. ✅ Check for doctl and API token
2. 📋 Show available sizes and regions
3. 📦 Create a Droplet
4. ⏳ Wait for the Droplet to be ready
5. 💾 Save Droplet ID and IP to `.do-droplet-id` and `.do-droplet-ip`

**Note**: 
- If you didn't provide SSH keys, the root password will be emailed to you by Digital Ocean. Save it securely!
- If you provided SSH keys, you can SSH in without a password.

### Step 2: Connect to Your Server

SSH into your server using the IP address from the deployment:

```bash
# Get the IP address
cat .do-droplet-ip

# SSH into the server
ssh root@<your-droplet-ip>
```

When prompted, enter the root password that Digital Ocean emailed you (if no SSH keys were used).

### Step 3: Set Up the Server

Choose your database option and follow the corresponding instructions:

#### Deploying with Supabase

1. **Set up your Supabase database** (if not already done):
   - Follow the [Supabase Setup Guide](SUPABASE_SETUP.md)
   - Make sure your database schema is set up
   - Get your Supabase connection string from the Supabase dashboard

2. **Run the Supabase setup script**:

```bash
# Copy the setup script to the server
scp setup-server-supabase.sh root@<your-droplet-ip>:/root/

# SSH into the server
ssh root@<your-droplet-ip>

# Run the setup script
bash /root/setup-server-supabase.sh
```

This script installs:
- ✅ Node.js 20.x LTS
- ✅ Nginx (web server)
- ✅ PM2 (process manager)
- ✅ Git
- ✅ Application directory structure
- ❌ **PostgreSQL is NOT installed** (using Supabase instead)

3. **Continue to Step 4** (Deploy Your Application) below, but skip database initialization steps and use Supabase connection details in your `.env` file.

#### Deploying with Local PostgreSQL

1. **Run the local PostgreSQL setup script**:

```bash
# Copy the setup script to the server
scp setup-server.sh root@<your-droplet-ip>:/root/

# SSH into the server
ssh root@<your-droplet-ip>

# Run the setup script
bash /root/setup-server.sh
```

This script installs:
- ✅ Node.js 20.x LTS
- ✅ PostgreSQL
- ✅ Nginx (web server)
- ✅ PM2 (process manager)
- ✅ Git
- ✅ Application directory structure

2. **Continue to Step 4** (Deploy Your Application) below with local database configuration.

### Step 4: Deploy Your Application

#### 4.1 Copy Files to Server

From your local machine:

```bash
# Get server IP
SERVER_IP=$(cat .do-droplet-ip)

# Copy project files (excluding node_modules and .env)
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' \
  ./ root@$SERVER_IP:/var/www/invoiceops/

# Or use scp
scp -r --exclude 'node_modules' --exclude '.env' --exclude '.git' \
  . root@$SERVER_IP:/var/www/invoiceops/
```

#### 4.2 Set Up Environment Variables on Server

SSH into the server and create a production `.env` file:

```bash
ssh root@$SERVER_IP
cd /var/www/invoiceops

# Create .env file
nano .env
```

**If using Supabase**, add these environment variables:

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

Get your connection details from:
- **IPv4 Address (Recommended)**: Supabase Dashboard → Settings → Database → Look for IPv4 address
  - Or resolve on your Droplet: `nslookup db.[YOUR-PROJECT-REF].supabase.co`
- **Hostname**: Supabase Dashboard → Settings → Database → Connection String → URI

**If using Local PostgreSQL**, add these environment variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoiceops
DB_USER=invoiceops
DB_PASSWORD=your_secure_password_here

# Server Configuration
PORT=3001
NODE_ENV=production

# Note: Update DB_PASSWORD to match what was set in setup-server.sh
# (default in setup-server.sh is 'changeme_in_production' - CHANGE THIS!)
```

**⚠️ IMPORTANT**: 
- For Supabase: Replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]` with your actual Supabase credentials
- For Local PostgreSQL: Change the database password from the default!

#### 4.3 Initialize Database

**If using Supabase:**
- Your database schema should already be set up in Supabase
- If not, run the schema from your local machine or Supabase SQL Editor:
  ```bash
  # From local machine (if you have psql)
  psql "your-supabase-connection-string" -f database/schema.sql
  ```
  Or use the Supabase Dashboard → SQL Editor to run `database/schema.sql`

**If using Local PostgreSQL:**

On the server:

```bash
cd /var/www/invoiceops

# Initialize the database
sudo -u postgres psql -d invoiceops -f database/schema.sql

# Or if the schema file needs adjustment:
sudo -u postgres psql invoiceops < database/schema.sql
```

#### 4.4 Install Dependencies and Build

```bash
cd /var/www/invoiceops

# Install dependencies
npm install --production

# Build the frontend
npm run build
```

#### 4.5 Configure Nginx

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/invoiceops
```

Add the following configuration:

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
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

#### 4.6 Start the Application with PM2

```bash
cd /var/www/invoiceops

# Start the server with PM2
pm2 start server/index.js --name invoiceops-api

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

Check status:

```bash
pm2 status
pm2 logs invoiceops-api
```

### Step 5: Firewall Configuration

Allow HTTP and HTTPS traffic:

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## Accessing Your Application

After deployment, your application will be available at:

- **Frontend**: `http://<your-droplet-ip>`
- **API**: `http://<your-droplet-ip>/api`

## Useful Commands

### Digital Ocean CLI Commands

```bash
# List all droplets
doctl compute droplet list

# Get droplet details
doctl compute droplet get <droplet-id>

# Stop droplet
doctl compute droplet shutdown <droplet-id>

# Start droplet
doctl compute droplet power-on <droplet-id>

# Delete droplet (⚠️ destructive!)
doctl compute droplet delete <droplet-id>

# List SSH keys
doctl compute ssh-key list
```

### Server Management

```bash
# View PM2 logs
pm2 logs invoiceops-api

# Restart application
pm2 restart invoiceops-api

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check PostgreSQL status (if using local)
sudo systemctl status postgresql

# Connect to database (if using local)
sudo -u postgres psql -d invoiceops
```

## Updating Your Application

To update your application after making changes:

```bash
# 1. Build locally (optional, can build on server)
npm run build

# 2. Copy files to server
SERVER_IP=$(cat .do-droplet-ip)
rsync -avz --exclude 'node_modules' --exclude '.env' \
  ./ root@$SERVER_IP:/var/www/invoiceops/

# 3. SSH and rebuild/restart
ssh root@$SERVER_IP
cd /var/www/invoiceops
npm install --production
npm run build
pm2 restart invoiceops-api
```

## Troubleshooting

### Can't SSH into server
- Wait a few minutes after Droplet creation
- Check that you're using the correct IP
- Verify the root password from Digital Ocean email
- If using SSH keys, verify they're added to your Digital Ocean account

### Application not starting
- Check PM2 logs: `pm2 logs invoiceops-api`
- Verify environment variables in `.env`
- Check database connection (if using local): `sudo -u postgres psql -d invoiceops`
- Verify Node.js version: `node --version` (should be 20.x)

### Database connection errors
- Verify PostgreSQL is running (if using local): `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Verify database exists (if using local): `sudo -u postgres psql -l`
- For Supabase: Check connection string and SSL settings

### Nginx 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Verify backend is listening on port 3001: `netstat -tlnp | grep 3001`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Cost Estimation

### With Supabase (Recommended)

**Minimum Setup** (recommended for development/small projects):
- Droplet: `s-1vcpu-1gb` - **~$6/month**
- Supabase: **Free tier** (or paid plans start at ~$25/month for production)
- Bandwidth: Included (1 TB/month)
- Total: **~$6/month** 💰 (free Supabase tier) or **~$31/month** (with paid Supabase)

**Recommended for Production** (with Supabase):
- Droplet: `s-1vcpu-1gb` - **~$6/month** (smaller Droplet since no PostgreSQL)
- Supabase: **Paid plan** - ~$25/month
- Bandwidth: Included (1 TB/month)
- Total: **~$31/month** 💰

### With Local PostgreSQL

**Minimum Setup** (recommended for development/small projects):
- Droplet: `s-1vcpu-1gb` - **~$6/month**
- Bandwidth: Included (1 TB/month)
- Total: **~$6/month** 💰

**Recommended for Production**:
- Droplet: `s-2vcpu-2gb` - **~$12/month**
- Bandwidth: Included (2 TB/month)
- Total: **~$12/month**

## Security Notes

1. ⚠️ **Change default passwords** - Update database passwords immediately
2. 🔐 **Use SSH keys** - Set up SSH key authentication instead of passwords
3. 🔒 **Set up firewall** - Only allow necessary ports (22, 80, 443)
4. 🔑 **Keep API token secret** - Never commit `.env` to git
5. 🔐 **Use HTTPS** - Set up SSL certificate (Let's Encrypt is free)
6. 🔒 **Regular updates** - Keep system packages updated: `apt update && apt upgrade`

## Next Steps

- [ ] Set up a domain name and point it to your Droplet IP
- [ ] Configure SSL certificate with Let's Encrypt
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Set up SSH key authentication

