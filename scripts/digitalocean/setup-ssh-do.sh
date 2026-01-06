#!/bin/bash

# Setup SSH Key for Digital Ocean Droplet
# This script copies your SSH key to the Digital Ocean droplet

set -e

echo "🔐 Setting up SSH Key for Digital Ocean Droplet"
echo "================================================"
echo ""

# Get droplet IP
if [ -f .do-droplet-ip ]; then
    DROPLET_IP=$(cat .do-droplet-ip)
else
    read -p "Enter your Digital Ocean droplet IP: " DROPLET_IP
fi

if [ -z "$DROPLET_IP" ]; then
    echo "❌ Error: Droplet IP is required"
    exit 1
fi

echo "📋 Droplet IP: $DROPLET_IP"
echo ""
echo "📝 You'll be prompted for the root password."
echo "   (Check your Digital Ocean email for the password)"
echo ""
read -p "Press Enter to continue, or Ctrl+C to cancel..."

echo ""
echo "🔑 Copying SSH key to droplet..."
ssh-copy-id -o StrictHostKeyChecking=no root@$DROPLET_IP

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSH key copied successfully!"
    echo ""
    echo "🧪 Testing passwordless SSH..."
    ssh -o StrictHostKeyChecking=no root@$DROPLET_IP "echo '✅ SSH keys working! No password needed.'"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Success! You can now SSH without a password:"
        echo "   ssh root@$DROPLET_IP"
        echo ""
        echo "📋 Next steps:"
        echo "   1. Run: scp scripts/deployment/setup-server-supabase.sh root@$DROPLET_IP:/root/"
        echo "   2. SSH in: ssh root@$DROPLET_IP"
        echo "   3. Run setup: bash /root/setup-server-supabase.sh"
    fi
else
    echo ""
    echo "❌ Failed to copy SSH key"
    echo ""
    echo "💡 Alternative: Manual copy"
    echo "   1. Display your public key: cat ~/.ssh/id_rsa.pub"
    echo "   2. SSH into server: ssh root@$DROPLET_IP"
    echo "   3. Run on server:"
    echo "      mkdir -p ~/.ssh"
    echo "      chmod 700 ~/.ssh"
    echo "      echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys"
    echo "      chmod 600 ~/.ssh/authorized_keys"
fi

