#!/bin/bash

# Quick check for dpkg lock status - run this via SSH on the droplet
# Usage: ssh root@<IP> 'bash -s' < check-dpkg-status.sh

echo "🔍 Checking dpkg/apt status..."
echo ""

# Check for running processes
echo "1. Running apt/dpkg processes:"
ps aux | grep -E 'apt-get|dpkg|apt' | grep -v grep || echo "  ✅ None running"
echo ""

# Check for lock files
echo "2. Lock files:"
if [ -f /var/lib/dpkg/lock-frontend ]; then
  echo "  ⚠️  /var/lib/dpkg/lock-frontend exists"
  ls -lh /var/lib/dpkg/lock-frontend
  echo "  Process holding it:"
  lsof /var/lib/dpkg/lock-frontend 2>/dev/null || echo "    (stale - no process)"
else
  echo "  ✅ No lock-frontend"
fi

if [ -f /var/lib/dpkg/lock ]; then
  echo "  ⚠️  /var/lib/dpkg/lock exists"
  ls -lh /var/lib/dpkg/lock
  lsof /var/lib/dpkg/lock 2>/dev/null || echo "    (stale - no process)"
else
  echo "  ✅ No lock"
fi
echo ""

# Check unattended-upgrades
echo "3. Unattended-upgrades status:"
systemctl status unattended-upgrades --no-pager -l 2>/dev/null | head -5 || echo "  (not running or not installed)"
echo ""

# Check if we can acquire lock
echo "4. Testing if we can use apt (dry-run):"
apt-get update -qq 2>&1 | head -3 || echo "  ❌ Cannot use apt (lock issue confirmed)"
echo ""

echo "💡 If locks exist but no processes are running, you can remove them:"
echo "   sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock"

