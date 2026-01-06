# SSL/TLS Setup Guide for InvoiceOps

This guide explains how to set up HTTPS (SSL/TLS) for your InvoiceOps deployment on Digital Ocean.

## Prerequisites

⚠️ **IMPORTANT**: Let's Encrypt (the free SSL certificate provider) **requires a domain name**. It cannot issue certificates for IP addresses.

Before setting up SSL, you need:
1. ✅ A domain name (e.g., `invoiceops.example.com`)
2. ✅ The domain's A record pointing to your Digital Ocean droplet IP
3. ✅ DNS propagation completed (can take up to 48 hours, usually much faster)

## Quick Setup

### Step 1: Point Your Domain to Your Server

1. **Get your droplet IP**:
   ```bash
   cat .do-droplet-ip
   ```

2. **Configure DNS**:
   - Go to your domain registrar's DNS settings
   - Add an A record:
     - **Name**: `@` or your subdomain (e.g., `invoiceops`)
     - **Type**: `A`
     - **Value**: Your droplet IP (e.g., `159.223.119.181`)
     - **TTL**: `3600` (or default)

3. **Verify DNS** (wait a few minutes, then check):
   ```bash
   dig your-domain.com
   # or
   nslookup your-domain.com
   ```
   
   The IP should match your droplet IP.

### Step 2: Set Up SSL Certificate

1. **Copy the SSL setup script to your server**:
   ```bash
   SERVER_IP=$(cat .do-droplet-ip)
   scp scripts/deployment/setup-ssl.sh root@$SERVER_IP:/root/
   ```

2. **SSH into your server**:
   ```bash
   ssh root@$SERVER_IP
   ```

3. **Run the SSL setup script**:
   ```bash
   bash /root/setup-ssl.sh your-domain.com your-email@example.com
   ```
   
   Replace:
   - `your-domain.com` with your actual domain
   - `your-email@example.com` with your email (for certificate expiration notifications)

The script will:
- ✅ Install Certbot (Let's Encrypt client)
- ✅ Verify your domain DNS configuration
- ✅ Obtain SSL certificate from Let's Encrypt
- ✅ Automatically configure Nginx for HTTPS
- ✅ Set up automatic certificate renewal

### Step 3: Verify HTTPS

After setup, your application will be available at:
- **HTTPS**: `https://your-domain.com`
- **HTTP**: Automatically redirects to HTTPS

Test it:
```bash
curl -I https://your-domain.com
```

You should see `HTTP/2 200` or similar.

## Manual Setup (Alternative)

If you prefer to set up SSL manually:

### 1. Install Certbot

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
```

### 2. Configure Nginx (if not already done)

Ensure your Nginx configuration exists at `/etc/nginx/sites-available/invoiceops`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/invoiceops/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -sf /etc/nginx/sites-available/invoiceops /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 3. Obtain SSL Certificate

```bash
certbot --nginx -d your-domain.com --non-interactive --agree-tos --email your-email@example.com --redirect
```

Certbot will:
- ✅ Obtain the certificate
- ✅ Automatically update your Nginx configuration
- ✅ Set up HTTP to HTTPS redirect
- ✅ Configure automatic renewal

### 4. Test Certificate Renewal

```bash
certbot renew --dry-run
```

## Certificate Renewal

Let's Encrypt certificates expire every 90 days. Certbot automatically sets up renewal, but you can:

**Test renewal**:
```bash
certbot renew --dry-run
```

**Manually renew**:
```bash
certbot renew
```

**Check renewal status**:
```bash
certbot certificates
```

## Troubleshooting

### Domain doesn't resolve

**Problem**: `dig your-domain.com` doesn't show your server IP

**Solution**:
1. Verify DNS A record is configured correctly
2. Wait for DNS propagation (can take up to 48 hours)
3. Check with different DNS servers: `dig @8.8.8.8 your-domain.com`

### Certbot validation fails

**Problem**: Certbot can't verify domain ownership

**Solutions**:
1. **Check firewall**: Ensure port 80 is open:
   ```bash
   ufw allow 'Nginx Full'
   ufw status
   ```

2. **Check Nginx is running**:
   ```bash
   systemctl status nginx
   ```

3. **Check domain resolves correctly**:
   ```bash
   dig your-domain.com
   ```

4. **Check Nginx configuration**:
   ```bash
   nginx -t
   ```

### Certificate renewal fails

**Problem**: Automatic renewal doesn't work

**Solution**:
1. Check Certbot logs: `/var/log/letsencrypt/letsencrypt.log`
2. Test renewal manually: `certbot renew --dry-run`
3. Ensure Certbot timer is active:
   ```bash
   systemctl status certbot.timer
   ```

### Mixed content warnings

**Problem**: Browser shows "Not Secure" or mixed content warnings

**Solution**:
1. Ensure all API calls use HTTPS (check your frontend code)
2. Update API base URL to use `https://` instead of `http://`
3. Check browser console for mixed content errors

## Security Best Practices

After setting up SSL:

1. ✅ **Enable HSTS** (already configured by Certbot)
2. ✅ **Keep certificates updated** (automatic renewal is set up)
3. ✅ **Monitor certificate expiration**: `certbot certificates`
4. ✅ **Use strong SSL/TLS settings** (Certbot configures modern settings)
5. ✅ **Regular security updates**: `apt update && apt upgrade`

## Using a Subdomain

You can use a subdomain instead of the root domain:

1. **Set up DNS**: Add A record for `invoiceops.yourdomain.com` pointing to your droplet IP
2. **Run SSL setup**: `bash setup-ssl.sh invoiceops.yourdomain.com your-email@example.com`

## Multiple Domains

To secure multiple domains:

```bash
certbot --nginx -d domain1.com -d domain2.com -d www.domain1.com --non-interactive --agree-tos --email your-email@example.com --redirect
```

## Cost

SSL certificates from Let's Encrypt are **completely free**! 🎉

## Next Steps

After setting up SSL:
- [ ] Update your application's API base URL to use HTTPS
- [ ] Test all functionality with HTTPS
- [ ] Set up monitoring for certificate expiration
- [ ] Consider setting up a CDN (Cloudflare, etc.) for additional security

