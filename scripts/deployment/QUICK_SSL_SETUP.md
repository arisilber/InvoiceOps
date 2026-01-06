# Quick SSL Setup Guide

## Prerequisites

⚠️ **You need a domain name** - Let's Encrypt cannot issue certificates for IP addresses.

1. Get a domain name (e.g., from Namecheap, Google Domains, etc.)
2. Point the domain's A record to your droplet IP: `159.223.119.181`
3. Wait for DNS propagation (usually 5-15 minutes)

## Quick Setup (3 Steps)

### Step 1: Copy SSL script to server
```bash
SERVER_IP=$(cat .do-droplet-ip)
scp scripts/deployment/setup-ssl.sh root@$SERVER_IP:/root/
```

### Step 2: SSH into server
```bash
ssh root@$SERVER_IP
```

### Step 3: Run SSL setup
```bash
bash /root/setup-ssl.sh your-domain.com your-email@example.com
```

Replace:
- `your-domain.com` with your actual domain
- `your-email@example.com` with your email

That's it! Your site will be available at `https://your-domain.com`

## Verify DNS First

Before running the SSL setup, verify your domain points to your server:

```bash
dig your-domain.com
# Should show: 159.223.119.181
```

## Troubleshooting

**Domain doesn't resolve?**
- Check DNS settings at your domain registrar
- Wait a few more minutes for DNS propagation
- Try: `dig @8.8.8.8 your-domain.com`

**Certbot fails?**
- Ensure port 80 is open: `ufw allow 'Nginx Full'`
- Check Nginx is running: `systemctl status nginx`
- Verify domain DNS: `dig your-domain.com`

For more details, see: `docs/deployment/SSL_SETUP.md`

