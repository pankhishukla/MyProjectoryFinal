# MyProjectory – Deployment Guide

Complete deployment guide for MyProjectory (CareerStack AI) to production at
**https://projectory.com** using cPanel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Clerk Dashboard Configuration](#clerk-dashboard-configuration)
4. [SerpAPI Setup](#serpapi-setup)
5. [Production Build](#production-build)
6. [cPanel Deployment](#cpanel-deployment)
7. [Database Setup](#database-setup)
8. [Domain & SSL](#domain--ssl)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 10+ (`npm install -g pnpm`)
- **MySQL** 8.0+ (local Docker for dev, cPanel MySQL for prod)
- **Clerk account** (free tier available at https://clerk.com)
- **SerpAPI account** (free tier: 100 searches/month at https://serpapi.com)
- **cPanel hosting** with Node.js support (or SSH access)

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url> MyProjectoryFinal
cd MyProjectoryFinal
pnpm install
```

### 2. Start MySQL

```bash
docker compose up -d
```

This starts MySQL 8.0 on port 3307 with the careerstack database.

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in:
#   - VITE_CLERK_PUBLISHABLE_KEY (from Clerk dashboard)
#   - CLERK_SECRET_KEY (from Clerk dashboard)
#   - SERPAPI_API_KEY (from SerpAPI dashboard)
```

Also update `artifacts/api-server/.env` with:
```
CLERK_SECRET_KEY=sk_test_...
SERPAPI_API_KEY=your_key
```

### 4. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 5. Start the development servers

In **terminal 1** (API server):
```bash
pnpm --filter api-server run dev
```

In **terminal 2** (Frontend):
```bash
pnpm --filter @workspace/careerstack run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to
`http://localhost:3001`.

### 6. Test authentication

Open `http://localhost:5173` – you should see the Clerk sign-in page.

---

## Clerk Dashboard Configuration

### Create a Clerk application

1. Go to https://dashboard.clerk.com
2. Click **Add application**
3. Name it "MyProjectory" or "CareerStack"
4. Note the **Publishable Key** (starts with `pk_test_` or `pk_live_`)
5. Note the **Secret Key** (starts with `sk_test_` or `sk_live_`)

### Configure production domain

1. In the Clerk dashboard, go to **Paths** (under Configure)
2. Set:
   - **Sign-in URL:** `https://projectory.com/sign-in`
   - **Sign-up URL:** `https://projectory.com/sign-up`
   - **After sign-in URL:** `https://projectory.com/dashboard`
   - **After sign-up URL:** `https://projectory.com/dashboard`

### Configure allowed origins

1. Go to **Configure →lements → CORS**
2. Add:
   - `https://projectory.com`
   - `https://www.projectory.com`
   - `http://localhost:5173` (for local development)

### Set API keys

| Key | Where to use |
|-----|-------------|
| `pk_test_...` / `pk_live_...` | Frontend: `VITE_CLERK_PUBLISHABLE_KEY` |
| `sk_test_...` / `sk_live_...` | Backend: `CLERK_SECRET_KEY` |

### User roles (for admin features)

To make a user an admin:
1. In Clerk dashboard, go to **Users**
2. Click on the user
3. Under **Public metadata**, add:
   ```json
   { "role": "admin" }
   ```

---

## SerpAPI Setup

1. Go to https://serpapi.com and create an account
2. Go to **Dashboard → API Key**
3. Copy your API key
4. Add it to your `.env` file:
   ```
   SERPAPI_API_KEY=your_key_here
   ```

### Free tier limits
- 100 searches per month
- 1 search per second
- Google Jobs engine included

### Testing the integration

```bash
# Test via API endpoint (requires auth):
curl -X POST http://localhost:3001/api/jobs/search-serpapi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-token>" \
  -d '{"query": "AI Engineer jobs", "numResults": 5}'
```

---

## Production Build

### 1. Build the frontend

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_... \
pnpm --filter @workspace/careerstack run build
```

The output is in `artifacts/careerstack/dist/public/`.

### 2. Build the API server

```bash
pnpm --filter api-server run build
```

The output is in `artifacts/api-server/dist/`.

### 3. Prepare the deployment package

```bash
# Create a deployment directory
mkdir -p ~/careerstack-deploy

# Copy the built API server
cp -r artifacts/api-server/dist ~/careerstack-deploy/
cp -r artifacts/api-server/config ~/careerstack-deploy/
cp artifacts/api-server/package.json ~/careerstack-deploy/

# Copy the built frontend
cp -r artifacts/careerstack/dist/public ~/careerstack-deploy/frontend

# Copy deployment config
cp deployment/package.json ~/careerstack-deploy/

# Install production dependencies only
cd ~/careerstack-deploy
npm install --omit=dev
```

---

## cPanel Deployment

### Step 1: Upload files

Upload the deployment package to your cPanel server via:
- **File Manager** (web UI)
- **SCP/SFTP** (command line)
- **Git** (if cPanel has Git integration)

```bash
# Example SCP upload:
scp -r ~/careerstack-deploy/* user@server:~/careerstack-api/
```

### Step 2: Set up the Node.js application

**Option A: cPanel Node.js App (recommended)**

1. In cPanel, find **Setup Node.js App** or **Application Manager**
2. Create a new application:
   - **Node.js version:** 20+
   - **Mode:** Production
   - **App root:** `careerstack-api`
   - **App URL:** Leave blank (we'll use Apache proxy)
3. Upload files to the app root

**Option B: Manual with pm2**

```bash
ssh user@server
cd ~/careerstack-api
npm install -g pm2
pm2 start "node --env-file=.env.production ./dist/index.js" --name careerstack-api
pm2 save
pm2 startup  # Follow instructions to auto-start on boot
```

### Step 3: Set environment variables

Create `~/careerstack-api/.env.production`:

```env
DATABASE_URL=mysql2://username:password@localhost:3306/careerstack
CLERK_SECRET_KEY=sk_live_...
SERPAPI_API_KEY=your_key
NODE_ENV=production
PORT=3001
SKIP_ADMIN_CHECK=false
LOG_LEVEL=info
CORS_ORIGIN=https://projectory.com,https://www.projectory.com
```

### Step 4: Configure Apache proxy

Add to your `.htaccess` or Apache virtual host config:

```apache
RewriteEngine On

# Proxy API requests to Node.js backend
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule ^api/(.*)$ ws://127.0.0.1:3001/$1 [P,L]

RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule ^api/(.*)$ http://127.0.0.1:3001/$1 [P,L]

# Preserve host header for correct CORS behavior
ProxyPreserveHost On

# Set forwarded headers for HTTPS detection
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Host "projectory.com"
```

### Step 5: Deploy frontend files

Copy the Vite build output to your document root:

```bash
# If using public_html as document root:
cp -r ~/careerstack-deploy/frontend/* ~/public_html/

# Or if the frontend is served from a subdirectory:
cp -r ~/careerstack-deploy/frontend/* ~/public_html/projectory/
```

### Step 6: Configure the domain

1. In cPanel, go to **Domains** or **Addon Domains**
2. Ensure `projectory.com` points to the correct document root
3. Set up `www.projectory.com` redirect if needed

---

## Database Setup

### Create the database (via cPanel MySQL)

1. In cPanel, go **MySQL Databases**
2. Create a new database: `careerstack`
3. Create a new user with a strong password
4. Add the user to the database with **ALL PRIVILEGES**

### Push schema

```bash
# From your local machine:
DATABASE_URL=mysql2://user:pass@server:3306/careerstack \
pnpm --filter @workspace/db run push
```

Or use the backup file:
```bash
mysql -u user -p careerstack < backup.sql
```

---

## Domain & SSL

### SSL Certificate

1. In cPanel, go to **SSL/TLS** or **Let's Encrypt**
2. Issue a certificate for:
   - `projectory.com`
   - `www.projectory.com`
3. Enable **Force HTTPS Redirect**

### DNS Configuration

Ensure your DNS records point to the cPanel server:
```
projectory.com.    A       <server-ip>
www.projectory.com. CNAME   projectory.com.
```

---

## Post-Deployment Verification

### 1. Health check

```bash
curl https://projectory.com/api/healthz
# Should return: {"status":"ok"}
```

### 2. Authentication

- Open `https://projectory.com` in a browser
- You should be redirected to the Clerk sign-in page
- Sign up for a new account
- You should be redirected to the dashboard after sign-in

### 3. API endpoints

```bash
# Test authenticated endpoint:
curl https://projectory.com/api/profile \
  -H "Authorization: Bearer <your-clerk-session-token>"
# Should return user profile or 404 (if no profile created yet)
```

### 4. SerpAPI integration

```bash
# Test SerpAPI search (as admin):
curl -X POST https://projectory.com/api/jobs/search-serpapi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-clerk-token>" \
  -d '{"query": "Frontend Developer internships", "numResults": 5}'
```

### 5. Scraper (admin only)

Navigate to the admin scraping page in the UI, or:
```bash
curl https://projectory.com/api/jobs/scrape \
  -H "Authorization: Bearer <admin-clerk-token>"
```

---

## Troubleshooting

### 404 errors on page refresh

**Cause:** Apache isn't configured to serve the SPA for all routes.

**Fix:** Add to `.htaccess`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
```

### 500 Internal Server Error

**Check:**
1. PM2 logs: `pm2 logs careerstack-api`
2. Node.js process status: `pm2 list`
3. Environment variables are set correctly
4. MySQL is running and accessible

### CORS errors

**Cause:** The backend doesn't recognize the frontend origin.

**Fix:** Ensure `CORS_ORIGIN` in `.env.production` includes your domain:
```
CORS_ORIGIN=https://projectory.com,https://www.projectory.com
```

### Clerk sign-in redirect loop

**Cause:** Clerk dashboard redirect URLs don't match your domain.

**Fix:** In Clerk dashboard, update:
- Sign-in URL: `https://projectory.com/sign-in`
- Sign-up URL: `https://projectory.com/sign-up`
- After sign-in: `https://projectory.com/dashboard`

### Invalid Clerk session

**Cause:** Frontend and backend use different Clerk keys (test vs live).

**Fix:** Ensure both use the same environment:
- Frontend: `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`
- Backend: `CLERK_SECRET_KEY=sk_live_...`

### Missing environment variables

**Symptom:** Server crashes on startup with "must be set" error.

**Fix:** Check that `.env.production` exists and contains all required variables.

### SerpAPI authentication error

**Symptom:** 503 error with "SERPAPI_API_KEY" message.

**Fix:** Verify `SERPAPI_API_KEY` is set in `.env.production` and is valid.

### Database connection refused

**Symptom:** "Connection refused" or "ECONNREFUSED" error.

**Fix:**
1. Verify MySQL is running: `systemctl status mysql`
2. Check `DATABASE_URL` format: `mysql2://user:pass@host:3306/dbname`
3. Ensure MySQL user has privileges
4. Check if MySQL is listening on the correct port

### Node.js process not starting

**Fix:**
1. Check Node.js version: `node --version` (need 20+)
2. Check for syntax errors: `node --check dist/index.js`
3. Check port availability: `lsof -i :3001`
4. Verify file permissions: `chmod +x dist/index.js`

### Incorrect file permissions

```bash
chmod -R 755 ~/careerstack-api
chmod 600 ~/careerstack-api/.env.production
```

### HTTPS not working

1. Verify SSL certificate is installed in cPanel
2. Check that "Force HTTPS Redirect" is enabled
3. Verify the certificate covers `projectory.com` and `www.projectory.com`
