#!/bin/bash

# Install Puppeteer Dependencies Script
# Run this script on your server to install required system libraries for Puppeteer
# Usage: bash install-puppeteer-deps.sh

set -e

echo "🔧 Installing Puppeteer Dependencies"
echo "===================================="
echo ""

# Update package list
echo "📦 Updating package list..."
apt-get update

# Install Puppeteer dependencies
echo "📦 Installing Puppeteer system dependencies..."
apt-get install -y \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  fonts-liberation \
  libasound2

echo ""
echo "✅ Puppeteer dependencies installed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Restart your Node.js application (PM2 restart all)"
echo "2. Test PDF generation by downloading an invoice PDF"
echo ""
