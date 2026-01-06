# Digital Ocean Quick Start Guide

Get started with InvoiceOps on Digital Ocean in minutes!

## Prerequisites

1. **Digital Ocean Account**: [Sign up](https://www.digitalocean.com)
2. **API Token**: Get from [Digital Ocean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
3. **doctl CLI**: Install with `brew install doctl`

## Quick Deploy

### 1. Install and Authenticate doctl

```bash
# Install doctl
brew install doctl

# Authenticate (use your API token)
doctl auth init
```

### 2. Add API Token to .env

```bash
# Add to your .env file
DO_API_TOKEN=your_api_token_here
```

### 3. Deploy Droplet

```bash
chmod +x deploy-do.sh
./deploy-do.sh
```

This creates a Droplet and saves the IP to `.do-droplet-ip`.

### 4. Set Up Server

```bash
SERVER_IP=$(cat .do-droplet-ip)

# Copy setup script
scp setup-server-supabase.sh root@$SERVER_IP:/root/

# SSH and run setup
ssh root@$SERVER_IP
bash /root/setup-server-supabase.sh
```

### 5. Deploy Application

```bash
# From your local machine
SERVER_IP=$(cat .do-droplet-ip)

# Copy files
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' \
  ./ root@$SERVER_IP:/var/www/invoiceops/

# SSH and configure
ssh root@$SERVER_IP
cd /var/www/invoiceops

# Create .env with Supabase connection
nano .env
# Add: DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres
# Add: DB_SSL=true, PORT=3001, NODE_ENV=production

# Install and build
npm install --production
npm run build

# Start with PM2
pm2 start server/index.js --name invoiceops-api
pm2 startup
pm2 save
```

### 6. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/invoiceops
```

Add:
```nginx
server {
    listen 80;
    server_name _;
    
    location / {
        root /var/www/invoiceops/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/invoiceops /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Access Your App

Visit: `http://$(cat .do-droplet-ip)`

## Next Steps

- See [DIGITALOCEAN_DEPLOYMENT.md](./DIGITALOCEAN_DEPLOYMENT.md) for detailed instructions
- See [DIGITALOCEAN_SUPABASE_SETUP.md](./DIGITALOCEAN_SUPABASE_SETUP.md) for Supabase setup
- See [SUPABASE_SETUP.md](../database/SUPABASE_SETUP.md) for Supabase database setup

## Useful Commands

```bash
# View droplet IP
cat .do-droplet-ip

# SSH into server
ssh root@$(cat .do-droplet-ip)

# List droplets
doctl compute droplet list

# View logs (on server)
pm2 logs invoiceops-api

# Restart app (on server)
pm2 restart invoiceops-api
```

