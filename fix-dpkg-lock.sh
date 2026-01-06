#!/bin/bash

# Fix dpkg lock issue on Digital Ocean droplet
# Use this if diagnose-dpkg-lock.sh shows stale locks

DROPLET_IP=$(cat .do-droplet-ip 2>/dev/null || echo "159.223.119.181")

echo "🔧 Fixing dpkg lock issue on droplet $DROPLET_IP..."
echo ""

# First, check if there are actually running processes
echo "Checking for running apt/dpkg processes..."
RUNNING=$(ssh root@$DROPLET_IP "ps aux | grep -E 'apt-get|dpkg' | grep -v grep" || echo "")

if [ -n "$RUNNING" ]; then
  echo "⚠️  WARNING: There are still apt-get/dpkg processes running!"
  echo ""
  echo "$RUNNING"
  echo ""
  echo "❌ Cannot safely remove locks while processes are running."
  echo "   Please wait for them to complete, or investigate why they're stuck."
  exit 1
fi

# Remove stale lock files
echo "Removing stale lock files..."
ssh root@$DROPLET_IP "
  if [ -f /var/lib/dpkg/lock-frontend ]; then
    rm -f /var/lib/dpkg/lock-frontend
    echo '  ✅ Removed /var/lib/dpkg/lock-frontend'
  fi
  if [ -f /var/lib/dpkg/lock ]; then
    rm -f /var/lib/dpkg/lock
    echo '  ✅ Removed /var/lib/dpkg/lock'
  fi
  if [ -f /var/cache/apt/archives/lock ]; then
    rm -f /var/cache/apt/archives/lock
    echo '  ✅ Removed /var/cache/apt/archives/lock'
  fi
  if [ -f /var/lib/apt/lists/lock ]; then
    rm -f /var/lib/apt/lists/lock
    echo '  ✅ Removed /var/lib/apt/lists/lock'
  fi
"

echo ""
echo "✅ Lock files removed (if they existed)"
echo ""
echo "You can now try running ./check-setup-status.sh again"

