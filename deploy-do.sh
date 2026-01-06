#!/bin/bash

# InvoiceOps Digital Ocean Deployment Script
# This script deploys the InvoiceOps application to a Digital Ocean Droplet

set -e

echo "🚀 InvoiceOps Digital Ocean Deployment Script"
echo "=============================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Check if DO_API_TOKEN is set
if [ -z "$DO_API_TOKEN" ]; then
    echo "❌ Error: DO_API_TOKEN environment variable is not set"
    echo ""
    echo "Please add DO_API_TOKEN to your .env file or set it as:"
    echo "  export DO_API_TOKEN=your_api_token_here"
    echo ""
    echo "You can get your API token from: https://cloud.digitalocean.com/account/api/tokens"
    echo "Create a new token with 'Write' scope"
    exit 1
fi

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ Error: Digital Ocean CLI (doctl) is not installed"
    echo ""
    echo "Install it with:"
    echo "  brew install doctl"
    echo ""
    echo "Then authenticate:"
    echo "  doctl auth init"
    exit 1
fi

# Authenticate doctl if not already done
if ! doctl auth list &> /dev/null; then
    echo "🔐 Authenticating with Digital Ocean..."
    doctl auth init --access-token "$DO_API_TOKEN"
fi

# Configuration
REGION="${DO_REGION:-nyc1}"  # New York 1 (nyc1) - change as needed
SIZE="${DO_SIZE:-s-1vcpu-1gb}"  # Basic plan: 1 CPU, 1 GB RAM (~$6/month)
IMAGE="${DO_IMAGE:-ubuntu-22-04-x64}"  # Ubuntu 22.04 LTS
NAME="${DO_NAME:-invoiceops}"
SSH_KEYS="${DO_SSH_KEYS:-}"  # Optional: comma-separated SSH key IDs or fingerprints

echo "📋 Deployment Configuration:"
echo "  Region: $REGION"
echo "  Size: $SIZE"
echo "  Image: $IMAGE"
echo "  Name: $NAME"
if [ -n "$SSH_KEYS" ]; then
    echo "  SSH Keys: $SSH_KEYS"
fi
echo ""

# Check if droplet already exists
EXISTING_DROPLET=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep -i "$NAME" || echo "")
if [ -n "$EXISTING_DROPLET" ]; then
    echo "⚠️  Warning: A droplet named '$NAME' may already exist"
    echo "  Existing droplets:"
    echo "$EXISTING_DROPLET"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🔍 Fetching available sizes..."
doctl compute size list --format Slug,Memory,VCPUs,Disk,PriceMonthly | head -10

echo ""
echo "🔍 Fetching available regions..."
doctl compute region list --format Slug,Name | head -10

echo ""
if [ -t 0 ]; then
    # Interactive mode - only prompt if running in a terminal
    read -p "Press Enter to create the Droplet, or Ctrl+C to cancel..."
else
    echo "⏳ Non-interactive mode: Proceeding with Droplet creation..."
fi

echo ""
echo "📦 Creating Droplet..."

# Build doctl command
CREATE_CMD="doctl compute droplet create $NAME --region=$REGION --size=$SIZE --image=$IMAGE --wait --format ID,Name,PublicIPv4,Status"

# Add SSH keys if provided
if [ -n "$SSH_KEYS" ]; then
    CREATE_CMD="$CREATE_CMD --ssh-keys=$SSH_KEYS"
fi

# Execute creation
DROPLET_INFO=$($CREATE_CMD)

if [ $? -ne 0 ]; then
    echo "❌ Failed to create Droplet"
    exit 1
fi

# Extract Droplet ID and IP
DROPLET_ID=$(echo "$DROPLET_INFO" | tail -n +2 | awk '{print $1}' | head -1)
DROPLET_IP=$(echo "$DROPLET_INFO" | tail -n +2 | awk '{print $3}' | head -1)
DROPLET_STATUS=$(echo "$DROPLET_INFO" | tail -n +2 | awk '{print $4}' | head -1)

echo "✅ Droplet created successfully!"
echo "  Droplet ID: $DROPLET_ID"
echo "  IP Address: $DROPLET_IP"
echo "  Status: $DROPLET_STATUS"
echo ""

# Wait for Droplet to be ready (doctl --wait should handle this, but double-check)
echo "⏳ Waiting for Droplet to be ready..."
sleep 10

# Check Droplet status
MAX_ATTEMPTS=12
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    STATUS=$(doctl compute droplet get "$DROPLET_ID" --format Status --no-header 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "active" ]; then
        echo "✅ Droplet is active!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS: Status is $STATUS, waiting..."
    sleep 10
done

if [ "$STATUS" != "active" ]; then
    echo "⚠️  Droplet may not be fully ready. Proceeding anyway..."
fi

# Get final IP address
FINAL_IP=$(doctl compute droplet get "$DROPLET_ID" --format PublicIPv4 --no-header)

echo ""
echo "📝 Droplet Details:"
echo "  Droplet ID: $DROPLET_ID"
echo "  IP Address: $FINAL_IP"
echo "  SSH Command: ssh root@$FINAL_IP"
echo ""

# Save Droplet info
echo "$DROPLET_ID" > .do-droplet-id
echo "$FINAL_IP" > .do-droplet-ip

echo "✅ Deployment script completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Wait 1-2 minutes for the Droplet to fully initialize"
echo "2. SSH into the server: ssh root@$FINAL_IP"
echo "   (The root password will be emailed to you by Digital Ocean if no SSH keys were used)"
echo "3. Run the server setup script:"
echo "   - Copy setup-server-supabase.sh to the server"
echo "   - Or run the setup commands manually (see DIGITALOCEAN_DEPLOYMENT.md)"
echo ""
echo "💡 Tip: Set up SSH keys for passwordless authentication:"
echo "   doctl compute ssh-key list"
echo "   doctl compute droplet create ... --ssh-keys=YOUR_KEY_ID"

