#!/bin/bash

# Fix dpkg lock on droplet - run commands directly on the droplet
# This script helps you fix the issue when you SSH into the droplet

DROPLET_IP=$(cat .do-droplet-ip 2>/dev/null || echo "159.223.119.181")

echo "🔧 Fixing dpkg lock on droplet $DROPLET_IP..."
echo ""
echo "This will:"
echo "  1. Check for running processes"
echo "  2. Stop unattended-upgrades if running"
echo "  3. Remove stale lock files"
echo ""

# Check for running processes
echo "Step 1: Checking for running apt/dpkg processes..."
RUNNING=$(ssh root@$DROPLET_IP "ps aux | grep -E 'apt-get|dpkg|apt' | grep -v grep" || echo "")

if [ -n "$RUNNING" ]; then
  echo "  ⚠️  Found running processes:"
  echo "$RUNNING" | sed 's/^/    /'
  echo ""
  echo "  These processes are still running. Please wait for them to complete,"
  echo "  or manually kill them on the droplet if they're stuck."
  echo ""
  echo "  To manually fix, SSH into the droplet and run:"
  echo "    sudo killall apt-get apt dpkg 2>/dev/null || true"
  echo "    sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock"
  exit 1
else
  echo "  ✅ No apt/dpkg processes running"
fi

# Stop unattended-upgrades
echo ""
echo "Step 2: Stopping unattended-upgrades (if running)..."
ssh root@$DROPLET_IP "
  if systemctl is-active --quiet unattended-upgrades; then
    systemctl stop unattended-upgrades
    echo '  ✅ Stopped unattended-upgrades'
  else
    echo '  ℹ️  unattended-upgrades not running'
  fi
"

# Remove lock files
echo ""
echo "Step 3: Removing stale lock files..."
ssh root@$DROPLET_IP "
  LOCKS_REMOVED=0
  
  if [ -f /var/lib/dpkg/lock-frontend ]; then
    rm -f /var/lib/dpkg/lock-frontend
    echo '  ✅ Removed /var/lib/dpkg/lock-frontend'
    LOCKS_REMOVED=1
  fi
  
  if [ -f /var/lib/dpkg/lock ]; then
    rm -f /var/lib/dpkg/lock
    echo '  ✅ Removed /var/lib/dpkg/lock'
    LOCKS_REMOVED=1
  fi
  
  if [ -f /var/cache/apt/archives/lock ]; then
    rm -f /var/cache/apt/archives/lock
    echo '  ✅ Removed /var/cache/apt/archives/lock'
    LOCKS_REMOVED=1
  fi
  
  if [ -f /var/lib/apt/lists/lock ]; then
    rm -f /var/lib/apt/lists/lock
    echo '  ✅ Removed /var/lib/apt/lists/lock'
    LOCKS_REMOVED=1
  fi
  
  if [ \$LOCKS_REMOVED -eq 0 ]; then
    echo '  ℹ️  No lock files found'
  fi
"

echo ""
echo "✅ Done! You can now try running scripts/diagnostics/check-setup-status.sh again"

