#!/bin/bash

# Update Environment Variables to Use Supabase (Digital Ocean)
# Uses doctl to get droplet info, then updates .env file via SSH

set -e

echo "🔧 Update Environment Variables to Supabase (Digital Ocean)"
echo "==========================================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    # Export variables from .env file, handling values with spaces/special chars
    set -a
    source .env
    set +a
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ Error: Digital Ocean CLI (doctl) is not installed"
    echo ""
    echo "Install it with: brew install doctl"
    exit 1
fi

# Get droplet IP
DROPLET_IP=""
DROPLET_ID=""

# Try to get droplet ID from saved file
if [ -f .do-droplet-id ]; then
    DROPLET_ID=$(cat .do-droplet-id)
    echo "📋 Found saved droplet ID: $DROPLET_ID"
fi

# Try to get droplet IP from saved file first
if [ -f .do-droplet-ip ]; then
    DROPLET_IP=$(cat .do-droplet-ip)
    echo "📋 Found saved droplet IP: $DROPLET_IP"
else
    # If no saved IP, try to get it from doctl
    if [ -n "$DROPLET_ID" ]; then
        echo "🔍 Fetching droplet IP from Digital Ocean..."
        DROPLET_IP=$(doctl compute droplet get "$DROPLET_ID" --format PublicIPv4 --no-header 2>/dev/null || echo "")
    fi
    
    # If still no IP, try to find droplet by name
    if [ -z "$DROPLET_IP" ]; then
        NAME="${DO_NAME:-invoiceops}"
        echo "🔍 Searching for droplet with name: $NAME"
        DROPLET_LIST=$(doctl compute droplet list --format ID,Name,PublicIPv4 --no-header 2>/dev/null || echo "")
        if [ -n "$DROPLET_LIST" ]; then
            DROPLET_IP=$(echo "$DROPLET_LIST" | grep -i "$NAME" | awk '{print $3}' | head -1 || echo "")
        fi
    fi
fi

# If still no IP, prompt for it
if [ -z "$DROPLET_IP" ]; then
    echo ""
    echo "❌ Could not automatically find droplet IP"
    echo ""
    read -p "Enter your Digital Ocean droplet IP address: " DROPLET_IP
fi

if [ -z "$DROPLET_IP" ]; then
    echo "❌ Error: Droplet IP is required"
    exit 1
fi

echo ""
echo "✅ Using server IP: $DROPLET_IP"
echo ""

# Get Supabase connection details
# Check if DATABASE_URL or SUPABASE_CONNECTION_STRING is already loaded from .env
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_CONNECTION_STRING" ]; then
    echo "📝 Enter your Supabase connection details:"
    echo ""
    echo "   Option 1: IPv4 Address (Recommended):"
    echo "   Format: postgresql://postgres:[PASSWORD]@[IPv4-ADDRESS]:5432/postgres"
    echo "   Find IPv4: nslookup db.[PROJECT-REF].supabase.co"
    echo ""
    echo "   Option 2: Hostname (Default):"
    echo "   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
    echo "   Get from: Supabase Dashboard → Settings → Database → Connection String → URI"
    echo ""
    echo "   See SUPABASE_IPV4_SETUP.md for IPv4 configuration guide"
    echo ""
    
    read -p "Supabase DATABASE_URL: " DATABASE_URL
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Error: DATABASE_URL is required"
        exit 1
    fi
else
    # If SUPABASE_CONNECTION_STRING is set but DATABASE_URL is not, use it
    if [ -n "$SUPABASE_CONNECTION_STRING" ] && [ -z "$DATABASE_URL" ]; then
        export DATABASE_URL="$SUPABASE_CONNECTION_STRING"
        echo "✅ Using SUPABASE_CONNECTION_STRING from .env file as DATABASE_URL"
    else
        echo "✅ Using DATABASE_URL from .env file"
    fi
fi

# Confirm
echo ""
echo "📋 Configuration:"
echo "  Server IP: $DROPLET_IP"
echo "  Database URL: ${DATABASE_URL:0:50}..."
if [ -n "$OPENAI_API_KEY" ]; then
    echo "  OpenAI API Key: ${OPENAI_API_KEY:0:20}... (configured)"
else
    echo "  OpenAI API Key: (not set in local .env)"
fi
echo ""
read -p "Update environment variables on server? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🔧 Updating .env file on server..."

# Create .env content
ENV_CONTENT="# Supabase Database Configuration
DATABASE_URL=$DATABASE_URL
DB_SSL=true

# Server Configuration
PORT=3001
NODE_ENV=production

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY:-}"

# Use SSH to update the file
ssh root@$DROPLET_IP "cat > /var/www/invoiceops/.env << 'ENVEOF'
$ENV_CONTENT
ENVEOF"

if [ $? -eq 0 ]; then
    echo "✅ .env file updated successfully!"
    echo ""
    echo "🔄 Restarting application..."
    
    # Restart PM2
    ssh root@$DROPLET_IP "cd /var/www/invoiceops && pm2 restart invoiceops-api"
    
    if [ $? -eq 0 ]; then
        echo "✅ Application restarted!"
        echo ""
        echo "📊 Checking logs..."
        ssh root@$DROPLET_IP "cd /var/www/invoiceops && pm2 logs invoiceops-api --lines 20 --nostream"
        
        echo ""
        echo "✅ Update complete!"
        echo ""
        echo "📝 Next steps:"
        echo "  - Check logs: ssh root@$DROPLET_IP 'cd /var/www/invoiceops && pm2 logs invoiceops-api'"
        echo "  - Test API: curl http://$DROPLET_IP/api/health"
    else
        echo "⚠️  .env file updated, but failed to restart application"
        echo "   SSH into the server and run: pm2 restart invoiceops-api"
    fi
else
    echo "❌ Failed to update .env file"
    echo "   You may need to SSH in manually: ssh root@$DROPLET_IP"
    exit 1
fi

