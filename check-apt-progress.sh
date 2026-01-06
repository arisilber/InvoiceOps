#!/bin/bash

# Check if apt-get upgrade is making progress or stuck
# Run this on the droplet to see what's happening

DROPLET_IP=$(cat .do-droplet-ip 2>/dev/null || echo "159.223.119.181")

echo "🔍 Checking apt-get upgrade progress on droplet $DROPLET_IP..."
echo ""

# Check the main apt-get process
echo "1️⃣ Main apt-get process status:"
ssh root@$DROPLET_IP "
  if ps -p 9315 > /dev/null 2>&1; then
    echo '  Process 9315 (apt-get upgrade) is still running'
    ps -p 9315 -o pid,etime,state,cmd
    echo ''
    echo '  Process state:'
    echo '    R = Running'
    echo '    S = Sleeping (waiting for I/O or event)'
    echo '    D = Uninterruptible sleep (usually I/O)'
    echo '    T = Stopped'
  else
    echo '  ⚠️  Process 9315 no longer exists (may have completed or crashed)'
  fi
"
echo ""

# Check what dpkg is doing
echo "2️⃣ Dpkg configuration status:"
ssh root@$DROPLET_IP "
  if ps -p 12581 > /dev/null 2>&1; then
    echo '  Process 12581 (dpkg --configure) is still running'
    ps -p 12581 -o pid,etime,state,cmd
  else
    echo '  ⚠️  Process 12581 no longer exists'
  fi
"
echo ""

# Check for debconf prompts
echo "3️⃣ Checking for interactive prompts:"
ssh root@$DROPLET_IP "
  if ps aux | grep -E 'debconf|frontend' | grep -v grep > /dev/null; then
    echo '  ⚠️  debconf/frontend process detected - may be waiting for input'
    ps aux | grep -E 'debconf|frontend' | grep -v grep
    echo ''
    echo '  💡 This might be waiting for configuration choices.'
    echo '     Check if there are any prompts in the terminal where apt-get was started.'
  else
    echo '  ✅ No debconf processes found'
  fi
"
echo ""

# Check system load
echo "4️⃣ System activity:"
ssh root@$DROPLET_IP "uptime && echo '' && iostat -x 1 2 2>/dev/null | tail -3 || echo '  (iostat not available)'"
echo ""

# Check apt logs
echo "5️⃣ Recent apt activity (last 5 lines of apt log):"
ssh root@$DROPLET_IP "tail -5 /var/log/apt/history.log 2>/dev/null || echo '  No apt history log'"
echo ""

echo "💡 Recommendations:"
echo ""
echo "If processes are in 'S' (sleeping) state and system load is low:"
echo "  → They might be waiting for input or stuck"
echo ""
echo "If processes are in 'D' (uninterruptible sleep) state:"
echo "  → They're likely doing I/O (disk operations) - wait a bit longer"
echo ""
echo "If you see debconf/frontend:"
echo "  → Check the terminal/session where apt-get was started for prompts"
echo "  → Or set DEBIAN_FRONTEND=noninteractive and restart"

