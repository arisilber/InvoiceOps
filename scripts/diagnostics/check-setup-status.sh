#!/bin/bash

# Check setup status on Digital Ocean droplet

DROPLET_IP=$(cat .do-droplet-ip 2>/dev/null || echo "159.223.119.181")

echo "🔍 Checking setup status on droplet $DROPLET_IP..."
echo ""

# Check if setup processes are running
echo "📊 Process Status:"
ssh root@$DROPLET_IP "ps aux | grep -E 'apt-get|dpkg|setup-server' | grep -v grep | head -3 || echo '  ✅ No setup processes running'"
echo ""

# Check installed packages
echo "📦 Installed Packages:"
ssh root@$DROPLET_IP "
  echo -n '  Node.js: '; node --version 2>&1 || echo 'Not installed'
  echo -n '  Nginx: '; nginx -v 2>&1 | head -1 || echo 'Not installed'
  echo -n '  PM2: '; pm2 --version 2>&1 || echo 'Not installed'
  echo -n '  Git: '; git --version 2>&1 || echo 'Not installed'
" 2>&1 | grep -v "dpkg frontend lock" || true
echo ""

# Check app directory
echo "📁 Application Directory:"
ssh root@$DROPLET_IP "test -d /var/www/invoiceops && echo '  ✅ /var/www/invoiceops exists' || echo '  ❌ /var/www/invoiceops missing'"
echo ""

# Check setup log
echo "📝 Recent Setup Log (last 10 lines):"
ssh root@$DROPLET_IP "tail -10 /root/setup.log 2>/dev/null || echo '  No setup log found'" 2>&1 | grep -v "dpkg frontend lock" || true
echo ""

# Summary
echo "💡 Summary:"
ssh root@$DROPLET_IP "
  if command -v node &> /dev/null && command -v nginx &> /dev/null && command -v pm2 &> /dev/null && [ -d /var/www/invoiceops ]; then
    echo '  ✅ Setup appears to be COMPLETE!'
  elif ps aux | grep -E 'apt-get|dpkg|setup-server' | grep -v grep > /dev/null; then
    echo '  ⏳ Setup is still IN PROGRESS...'
  else
    echo '  ⚠️  Setup may have encountered an issue. Check logs above.'
  fi
"

