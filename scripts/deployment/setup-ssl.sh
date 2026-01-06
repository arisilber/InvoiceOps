#!/bin/bash

# InvoiceOps SSL Setup Script
# This script sets up SSL/TLS certificates using Let's Encrypt (Certbot)
# 
# IMPORTANT: This requires a domain name pointing to your server IP
# Let's Encrypt does not issue certificates for IP addresses
#
# Usage: 
#   bash setup-ssl.sh your-domain.com
#   OR
#   bash setup-ssl.sh your-domain.com your-email@example.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 InvoiceOps SSL Setup Script${NC}"
echo "======================================"
echo ""

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Domain name is required${NC}"
    echo ""
    echo "Usage: bash setup-ssl.sh your-domain.com [your-email@example.com]"
    echo ""
    echo "IMPORTANT:"
    echo "  - You must have a domain name pointing to your server IP"
    echo "  - The domain's A record should point to your droplet IP"
    echo "  - Let's Encrypt cannot issue certificates for IP addresses"
    echo ""
    echo "Example:"
    echo "  bash setup-ssl.sh invoiceops.example.com admin@example.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@${DOMAIN}}"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Error: This script must be run as root${NC}"
    echo "  Run: sudo bash setup-ssl.sh $DOMAIN"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}❌ Error: Nginx is not installed${NC}"
    echo "  Please install nginx first: apt-get install -y nginx"
    exit 1
fi

# Check if domain resolves to this server
echo -e "${YELLOW}🔍 Verifying domain DNS configuration...${NC}"
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -1)

if [ -z "$DOMAIN_IP" ]; then
    echo -e "${RED}❌ Error: Domain $DOMAIN does not resolve to any IP address${NC}"
    echo ""
    echo "Please ensure:"
    echo "  1. Your domain's A record points to your server IP: $SERVER_IP"
    echo "  2. DNS propagation has completed (can take up to 48 hours)"
    echo ""
    echo "You can check DNS with: dig $DOMAIN"
    exit 1
fi

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  Warning: Domain $DOMAIN resolves to $DOMAIN_IP, but this server's IP is $SERVER_IP${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Domain DNS is correctly configured${NC}"
fi

echo ""

# Install Certbot
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
apt-get update
apt-get install -y certbot python3-certbot-nginx

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Certbot${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certbot installed${NC}"
echo ""

# Check if nginx config exists
NGINX_CONFIG="/etc/nginx/sites-available/invoiceops"
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Nginx config not found at $NGINX_CONFIG${NC}"
    echo "  Creating basic configuration..."
    
    # Create nginx config directory if it doesn't exist
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    
    # Create basic nginx config
    cat > "$NGINX_CONFIG" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Serve static files from Vite build
    location / {
        root /var/www/invoiceops/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Enable the site
    ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/invoiceops
    
    # Test nginx config
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configuration created${NC}"
    echo ""
fi

# Obtain SSL certificate
echo -e "${YELLOW}🔐 Obtaining SSL certificate from Let's Encrypt...${NC}"
echo "  This may take a few moments..."
echo ""

# Use certbot with nginx plugin to automatically configure nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Domain DNS not properly configured"
    echo "  2. Port 80 not accessible from the internet"
    echo "  3. Firewall blocking Let's Encrypt validation"
    echo ""
    echo "Check firewall: ufw status"
    echo "Allow HTTP/HTTPS: ufw allow 'Nginx Full'"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"
echo ""

# Test nginx configuration
echo -e "${YELLOW}🔍 Testing nginx configuration...${NC}"
nginx -t

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    exit 1
fi

# Reload nginx
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
systemctl reload nginx

echo ""
echo -e "${GREEN}✅ SSL setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Domain: $DOMAIN"
echo "  HTTPS URL: https://$DOMAIN"
echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo -e "${BLUE}📝 Certificate Renewal:${NC}"
echo "  Certbot automatically sets up renewal. Certificates expire every 90 days."
echo "  Test renewal: certbot renew --dry-run"
echo "  Manual renewal: certbot renew"
echo ""
echo -e "${BLUE}🌐 Your application is now available at:${NC}"
echo "   https://$DOMAIN"
echo ""
echo -e "${GREEN}🎉 SSL setup completed!${NC}"
echo ""

