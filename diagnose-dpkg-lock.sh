#!/bin/bash

# Diagnose dpkg lock issue on Digital Ocean droplet

DROPLET_IP=$(cat .do-droplet-ip 2>/dev/null || echo "159.223.119.181")

echo "🔍 Diagnosing dpkg lock issue on droplet $DROPLET_IP..."
echo ""

# Check for running apt/dpkg processes
echo "1️⃣ Checking for running apt-get/dpkg processes:"
ssh root@$DROPLET_IP "ps aux | grep -E 'apt-get|dpkg|apt' | grep -v grep || echo '  ✅ No apt/dpkg processes running'"
echo ""

# Check for lock files
echo "2️⃣ Checking for dpkg lock files:"
ssh root@$DROPLET_IP "
  if [ -f /var/lib/dpkg/lock-frontend ]; then
    echo '  ⚠️  Lock file exists: /var/lib/dpkg/lock-frontend'
    ls -lh /var/lib/dpkg/lock-frontend
    echo ''
    echo '  Checking if process holding lock is still running:'
    lsof /var/lib/dpkg/lock-frontend 2>/dev/null || echo '    No process found holding lock (stale lock)'
  else
    echo '  ✅ No lock-frontend file found'
  fi
  echo ''
  if [ -f /var/lib/dpkg/lock ]; then
    echo '  ⚠️  Lock file exists: /var/lib/dpkg/lock'
    ls -lh /var/lib/dpkg/lock
    lsof /var/lib/dpkg/lock 2>/dev/null || echo '    No process found holding lock (stale lock)'
  else
    echo '  ✅ No lock file found'
  fi
"
echo ""

# Check for processes waiting for input
echo "3️⃣ Checking for processes in 'D' (uninterruptible sleep) state:"
ssh root@$DROPLET_IP "ps aux | awk '\$8 ~ /D/ {print \$0}' | head -5 || echo '  ✅ No processes in uninterruptible sleep'"
echo ""

# Check system load
echo "4️⃣ System load:"
ssh root@$DROPLET_IP "uptime"
echo ""

echo "💡 Recommendations:"
echo ""
echo "If you see running apt-get/dpkg processes:"
echo "  → Wait for them to complete, or check if they're stuck"
echo ""
echo "If you see lock files but NO running processes:"
echo "  → The lock is stale. You can safely remove it with:"
echo "     ssh root@$DROPLET_IP 'rm /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock'"
echo ""
echo "If a process is waiting for input:"
echo "  → You may need to SSH into the droplet and interact with it"
echo "  → Or kill the stuck process if it's safe to do so"

