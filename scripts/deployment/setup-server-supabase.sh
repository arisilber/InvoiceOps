#!/bin/bash

# InvoiceOps Server Setup Script (for Supabase)
# Run this script on your VPS/Droplet when using Supabase as the database
# Works with Digital Ocean and other Ubuntu-based VPS providers
# Usage: bash setup-server-supabase.sh

set -e

echo "🔧 InvoiceOps Server Setup (Supabase)"
echo "======================================"
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js (using NodeSource repository for Node 20 LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Note: PostgreSQL is NOT installed since we're using Supabase
echo "ℹ️  Skipping PostgreSQL installation (using Supabase)"

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

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

echo ""
echo "✅ Server setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy your application files to $APP_DIR"
echo "2. Set up environment variables in $APP_DIR/.env with your Supabase connection details"
echo "3. Install dependencies: cd $APP_DIR && npm install"
echo "4. Build the frontend: npm run build"
echo "5. Start the application with PM2"
echo ""
echo "📝 Your .env file should include:"
echo ""
echo "   Option 1: Using IPv4 (Recommended):"
echo "   DATABASE_URL=postgresql://postgres:[PASSWORD]@[IPv4-ADDRESS]:5432/postgres"
echo ""
echo "   Option 2: Using hostname:"
echo "   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
echo ""
echo "   Common settings:"
echo "   DB_SSL=true"
echo "   PORT=3001"
echo "   NODE_ENV=production"
echo ""
echo "   To find IPv4 address: nslookup db.[PROJECT-REF].supabase.co"
echo "   See SUPABASE_IPV4_SETUP.md for IPv4 configuration details"
echo "   See DIGITALOCEAN_DEPLOYMENT.md for detailed instructions"


