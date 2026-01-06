#!/bin/bash

# InvoiceOps Complete Deployment Script
# This script runs database migrations in Supabase and deploys the application to Digital Ocean
#
# Usage: ./deploy.sh [--skip-migrations] [--skip-build]
#
# Options:
#   --skip-migrations  Skip running database migrations
#   --skip-build       Skip building the frontend (useful if already built)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
SKIP_MIGRATIONS=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --skip-migrations)
      SKIP_MIGRATIONS=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

echo -e "${BLUE}🚀 InvoiceOps Complete Deployment Script${NC}"
echo "=============================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo -e "${BLUE}📄 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
fi

# ============================================================================
# STEP 1: Run Database Migrations
# ============================================================================

if [ "$SKIP_MIGRATIONS" = false ]; then
    echo -e "${BLUE}📊 Step 1: Running Database Migrations${NC}"
    echo "--------------------------------------------"
    echo ""
    
    # Check if DATABASE_URL or SUPABASE_CONNECTION_STRING is set
    if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_CONNECTION_STRING" ]; then
        echo -e "${RED}❌ Error: DATABASE_URL or SUPABASE_CONNECTION_STRING environment variable is not set${NC}"
        echo ""
        echo "Please add one of these to your .env file:"
        echo "  DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
        echo "  SUPABASE_CONNECTION_STRING=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
        echo ""
        echo "For Supabase, get this from:"
        echo "  Supabase Dashboard → Settings → Database → Connection String → URI"
        exit 1
    fi
    
    # If SUPABASE_CONNECTION_STRING is set but DATABASE_URL is not, use it
    if [ -n "$SUPABASE_CONNECTION_STRING" ] && [ -z "$DATABASE_URL" ]; then
        export DATABASE_URL="$SUPABASE_CONNECTION_STRING"
        echo -e "${BLUE}ℹ️  Using SUPABASE_CONNECTION_STRING as DATABASE_URL${NC}"
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Error: Node.js is not installed${NC}"
        echo ""
        echo "Install Node.js to run migrations:"
        echo "  brew install node"
        exit 1
    fi
    
    # Check if migration script exists
    if [ ! -f "database/run-migrations.js" ]; then
        echo -e "${RED}❌ Error: Migration script not found at database/run-migrations.js${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    echo ""
    
    # Run migrations
    if node database/run-migrations.js; then
        echo ""
        echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ Migration failed! Deployment aborted.${NC}"
        echo ""
        echo "Please fix the migration errors and try again."
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping database migrations (--skip-migrations flag set)${NC}"
    echo ""
fi

# ============================================================================
# STEP 2: Build Frontend (if not skipped)
# ============================================================================

if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}🏗️  Step 2: Building Frontend${NC}"
    echo "--------------------------------------------"
    echo ""
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ Error: npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    if ! npm install; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}🔨 Building frontend...${NC}"
    if ! npm run build; then
        echo -e "${RED}❌ Failed to build frontend${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Frontend built successfully!${NC}"
    echo ""
else
    echo -e "${YELLOW}⏭️  Skipping frontend build (--skip-build flag set)${NC}"
    echo ""
fi

# ============================================================================
# STEP 3: Deploy to Digital Ocean
# ============================================================================

echo -e "${BLUE}🌊 Step 3: Deploying to Digital Ocean${NC}"
echo "--------------------------------------------"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ Error: Digital Ocean CLI (doctl) is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  brew install doctl"
    echo ""
    echo "Then authenticate:"
    echo "  doctl auth init"
    exit 1
fi

# Get droplet IP
DROPLET_IP=""
DROPLET_ID=""

# Try to get droplet ID from saved file
if [ -f .do-droplet-id ]; then
    DROPLET_ID=$(cat .do-droplet-id)
    echo -e "${BLUE}📋 Found saved droplet ID: $DROPLET_ID${NC}"
fi

# Try to get droplet IP from saved file first
if [ -f .do-droplet-ip ]; then
    DROPLET_IP=$(cat .do-droplet-ip)
    echo -e "${BLUE}📋 Found saved droplet IP: $DROPLET_IP${NC}"
else
    # If no saved IP, try to get it from doctl
    if [ -n "$DROPLET_ID" ]; then
        echo -e "${BLUE}🔍 Fetching droplet IP from Digital Ocean...${NC}"
        DROPLET_IP=$(doctl compute droplet get "$DROPLET_ID" --format PublicIPv4 --no-header 2>/dev/null || echo "")
    fi
    
    # If still no IP, try to find droplet by name
    if [ -z "$DROPLET_IP" ]; then
        NAME="${DO_NAME:-invoiceops}"
        echo -e "${BLUE}🔍 Searching for droplet with name: $NAME${NC}"
        DROPLET_LIST=$(doctl compute droplet list --format ID,Name,PublicIPv4 --no-header 2>/dev/null || echo "")
        if [ -n "$DROPLET_LIST" ]; then
            DROPLET_IP=$(echo "$DROPLET_LIST" | grep -i "$NAME" | awk '{print $3}' | head -1 || echo "")
        fi
    fi
fi

# If still no IP, prompt for it
if [ -z "$DROPLET_IP" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Could not automatically find droplet IP${NC}"
    echo ""
    read -p "Enter your Digital Ocean droplet IP address: " DROPLET_IP
fi

if [ -z "$DROPLET_IP" ]; then
    echo -e "${RED}❌ Error: Droplet IP is required${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Using server IP: $DROPLET_IP${NC}"
echo ""

# Test SSH connection
echo -e "${YELLOW}🔌 Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH connection successful'" &>/dev/null; then
    echo -e "${RED}❌ Error: Cannot connect to server via SSH${NC}"
    echo ""
    echo "Please ensure:"
    echo "  1. The droplet is running"
    echo "  2. SSH access is configured"
    echo "  3. Your SSH key is added to the droplet"
    echo ""
    echo "Try connecting manually:"
    echo "  ssh root@$DROPLET_IP"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection successful!${NC}"
echo ""

# Check if application directory exists on server
echo -e "${YELLOW}🔍 Checking server setup...${NC}"
if ! ssh root@$DROPLET_IP "test -d /var/www/invoiceops" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Application directory not found on server${NC}"
    echo ""
    echo "The server may not be set up yet. Please run setup-server-supabase.sh first:"
    echo "  scp setup-server-supabase.sh root@$DROPLET_IP:/root/"
    echo "  ssh root@$DROPLET_IP 'bash /root/setup-server-supabase.sh'"
    exit 1
fi

echo -e "${GREEN}✅ Server setup verified${NC}"
echo ""

# Show deployment preview
echo -e "${BLUE}📋 Deployment Preview${NC}"
echo "--------------------------------------------"
echo "  Server IP: $DROPLET_IP"
echo "  Target Directory: /var/www/invoiceops"
echo "  Migrations: $([ "$SKIP_MIGRATIONS" = false ] && echo "Will run" || echo "Skipped")"
echo "  Frontend Build: $([ "$SKIP_BUILD" = false ] && echo "Will build locally" || echo "Skipped (will build on server)")"
echo ""

# Ask for confirmation
if [ -t 0 ]; then
    read -p "Proceed with deployment? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

echo ""

# Sync files to server
echo -e "${YELLOW}📤 Syncing files to server...${NC}"
echo ""

# Check if rsync is available
if command -v rsync &> /dev/null; then
    echo "Using rsync for file transfer..."
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.env' \
        --exclude '.git' \
        --exclude '.do-droplet-id' \
        --exclude '.do-droplet-ip' \
        --exclude 'dist' \
        --exclude '.DS_Store' \
        --exclude '*.log' \
        ./ root@$DROPLET_IP:/var/www/invoiceops/
else
    echo "rsync not found, using scp..."
    # Create a temporary tar archive
    TAR_FILE="/tmp/invoiceops-deploy-$$.tar.gz"
    tar -czf "$TAR_FILE" \
        --exclude='node_modules' \
        --exclude='.env' \
        --exclude='.git' \
        --exclude='.do-droplet-id' \
        --exclude='.do-droplet-ip' \
        --exclude='dist' \
        --exclude='.DS_Store' \
        --exclude='*.log' \
        .
    
    # Copy to server
    scp "$TAR_FILE" root@$DROPLET_IP:/tmp/
    
    # Extract on server
    ssh root@$DROPLET_IP "cd /var/www/invoiceops && tar -xzf /tmp/$(basename $TAR_FILE) && rm /tmp/$(basename $TAR_FILE)"
    
    # Clean up local tar
    rm "$TAR_FILE"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to sync files to server${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Files synced successfully!${NC}"
echo ""

# Install dependencies and build on server
echo -e "${YELLOW}📦 Installing dependencies on server...${NC}"
ssh root@$DROPLET_IP "cd /var/www/invoiceops && npm install"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies on server${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔨 Building frontend on server...${NC}"
ssh root@$DROPLET_IP "cd /var/www/invoiceops && npm run build"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build frontend on server${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build completed on server!${NC}"
echo ""

# Restart application with PM2
echo -e "${YELLOW}🔄 Restarting application...${NC}"

# Check if PM2 process exists
if ssh root@$DROPLET_IP "pm2 list | grep -q invoiceops-api" 2>/dev/null; then
    # Restart existing process
    ssh root@$DROPLET_IP "cd /var/www/invoiceops && pm2 restart invoiceops-api"
else
    # Start new process
    echo -e "${YELLOW}⚠️  PM2 process not found, starting new process...${NC}"
    ssh root@$DROPLET_IP "cd /var/www/invoiceops && pm2 start server/index.js --name invoiceops-api"
    ssh root@$DROPLET_IP "pm2 save"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restart application${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Application restarted!${NC}"
echo ""

# Show deployment summary
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo "=============================================="
echo ""
echo -e "${GREEN}✅ Migrations:${NC} $([ "$SKIP_MIGRATIONS" = false ] && echo "Completed" || echo "Skipped")"
echo -e "${GREEN}✅ Frontend Build:${NC} $([ "$SKIP_BUILD" = false ] && echo "Completed" || echo "Skipped")"
echo -e "${GREEN}✅ Files Synced:${NC} Completed"
echo -e "${GREEN}✅ Server Build:${NC} Completed"
echo -e "${GREEN}✅ Application Restarted:${NC} Completed"
echo ""
echo -e "${BLUE}🌐 Your application is now live at:${NC}"
echo "   Frontend: http://$DROPLET_IP"
echo "   API: http://$DROPLET_IP/api"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo "   View logs: ssh root@$DROPLET_IP 'cd /var/www/invoiceops && pm2 logs invoiceops-api'"
echo "   Check status: ssh root@$DROPLET_IP 'pm2 status'"
echo "   Restart: ssh root@$DROPLET_IP 'cd /var/www/invoiceops && pm2 restart invoiceops-api'"
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""

