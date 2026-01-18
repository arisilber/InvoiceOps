#!/bin/bash

# InvoiceOps Server Setup Script
# Run this script on your VPS/Droplet after deployment
# Usage: bash setup-server.sh

set -e

echo "🔧 InvoiceOps Server Setup"
echo "=========================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js (using NodeSource repository for Node 20 LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

# Install Puppeteer dependencies (required for PDF generation)
echo "📦 Installing Puppeteer dependencies..."
apt-get install -y \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  fonts-liberation \
  libasound2

# Create application user
echo "👤 Creating application user..."
if ! id -u invoiceops &>/dev/null; then
    useradd -m -s /bin/bash invoiceops
fi

# Create application directory
APP_DIR="/var/www/invoiceops"
echo "📁 Creating application directory: $APP_DIR"
mkdir -p "$APP_DIR"
chown invoiceops:invoiceops "$APP_DIR"

# Set up PostgreSQL database
echo "🗄️  Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
ALTER USER postgres PASSWORD 'changeme_in_production';
CREATE DATABASE invoiceops;
CREATE USER invoiceops WITH PASSWORD 'changeme_in_production';
GRANT ALL PRIVILEGES ON DATABASE invoiceops TO invoiceops;
\c invoiceops
GRANT ALL ON SCHEMA public TO invoiceops;
EOF

echo ""
echo "✅ Server setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy your application files to $APP_DIR"
echo "2. Set up environment variables in $APP_DIR/.env"
echo "3. Install dependencies: cd $APP_DIR && npm install"
echo "4. Build the frontend: npm run build"
echo "5. Initialize the database: psql -U invoiceops -d invoiceops -f database/schema.sql"
echo "6. Start the application with PM2"
echo ""
echo "See DIGITALOCEAN_DEPLOYMENT.md for detailed instructions"


