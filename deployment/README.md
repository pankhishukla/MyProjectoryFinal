# MyProjectory (CareerStack AI) – cPanel Deployment Guide

## Overview

This package contains the production-ready API server and static frontend for
MyProjectory. The frontend is a Vite-built React SPA; the backend is an
Express 5 server bundled with esbuild.

**Production domain:** `https://projectory.com`

---

## Architecture

```
cPanel Server
├── public_html/                    ← Apache document root
│   ├── index.html                  ← Frontend SPA (Vite build output)
│   ├── assets/                     ← JS/CSS bundles
│   └── api/ → Node.js:3001         ← Apache ProxyPass to Node backend
│
└── ~/careerstack-api/              ← Node.js application directory
    ├── .env.production             ← Secret environment variables
    ├── dist/index.js               ← esbuild bundle
    └── node_modules/
```

**Two deployment strategies are documented below.** Choose the one that matches
your cPanel setup.

---

## Strategy A: cPanel Node.js Application (Recommended)

cPanel's built-in **Setup Node.js App** feature manages the Node process,
installs dependencies, and sets up a reverse proxy automatically.

### Steps

1. **Build the frontend locally:**
   ```bash
   cd /path/to/MyProjectoryFinal
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_... pnpm --filter @workspace/careerstack run build
   ```

2. **Upload frontend files** to `public_html/` (or the subdomain document root):
   ```bash
   scp -r artifacts/careerstack/dist/public/* user@server:~/public_html/
   ```

3. **Create the Node.js app in cPanel:**
   - Go to **Setup Node.js App** (or **Application Manager**)
   - Click **Create Application**
   - Set:
     - **Node.js version:** 20+ (or latest available)
     - **Application mode:** Production
     - **Application root:** `careerstack-api`
     - **Application URL:** `https://projectory.com/api` (or set up as a
       reverse proxy manually)
   - Click **Create**

4. **Upload the backend** to `~/careerstack-api/`:
   ```bash
   scp -r deployment/* user@server:~/careerstack-api/
   ```

5. **Install production dependencies:**
   ```bash
   ssh user@server
   cd ~/careerstack-api
   npm install --omit=dev
   ```

6. **Create `.env.production`** in `~/careerstack-api/`:
   ```env
   DATABASE_URL=mysql2://prod_user:prod_pass@localhost:3306/prod_dbname
   CLERK_SECRET_KEY=sk_live_...
   SERPAPI_API_KEY=your_key
   NODE_ENV=production
   PORT=3001
   SKIP_ADMIN_CHECK=false
   LOG_LEVEL=info
   ```

7. **Start the app** via cPanel Node.js interface, or:
   ```bash
   cd ~/careerstack-api
   NODE_ENV=production node --env-file=.env.production --enable-source-maps ./dist/index.mjs
   ```

8. **Configure Apache reverse proxy** (if cPanel doesn't do it automatically):
   Add to your `.htaccess` or Apache config:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTP:Upgrade} =websocket [NC]
   RewriteRule /api/(.*) ws://127.0.0.1:3001/$1 [P,L]
   RewriteCond %{HTTP:Upgrade} !=websocket [NC]
   RewriteRule /api/(.*) http://127.0.0.1:3001/$1 [P,L]
   ProxyPreserveHost On
   RequestHeader set X-Forwarded-Proto "https"
   ```

---

## Strategy B: Manual Deployment (No cPanel Node.js App)

If cPanel doesn't have the Node.js app feature, you can run the process
manually with a process manager.

### Steps

1. **SSH into the server**

2. **Install Node.js** (if not present):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install pm2** globally:
   ```bash
   npm install -g pm2
   ```

4. **Upload and set up the project:**
   ```bash
   mkdir -p ~/careerstack
   # Upload all project files, or clone the git repo
   cd ~/careerstack
   npm install --omit=dev
   ```

5. **Create `.env.production`** (same as Strategy A step 6)

6. **Build the frontend:**
   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_... npm run build --workspace=@workspace/careerstack
   cp -r artifacts/careerstack/dist/public/* ~/public_html/
   ```

7. **Start the backend with pm2:**
   ```bash
   cd ~/careerstack
   pm2 start "node --env-file=.env.production --enable-source-maps ./artifacts/api-server/dist/index.js" \
     --name careerstack-api
   pm2 save
   pm2 startup  # Follow the output to enable auto-start on boot
   ```

8. **Configure Apache** (same as Strategy A step 8)

---

## Database Setup

### Create the MySQL database

```sql
CREATE DATABASE careerstack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'careerstack'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON careerstack.* TO 'careerstack'@'localhost';
FLUSH PRIVILEGES;
```

### Push the schema

```bash
cd /path/to/MyProjectoryFinal
DATABASE_URL=mysql2://careerstack:pass@localhost:3306/careerstack pnpm --filter @workspace/db run push
```

Or use the backup:
```bash
mysql -u careerstack -p careerstack < backup.sql
```

---

## Environment Variables

### Required for Backend (API Server)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection URL | `mysql2://user:pass@host:3306/db` |
| `CLERK_SECRET_KEY` | Clerk backend secret key | `sk_live_...` |
| `SERPAPI_API_KEY` | SerpAPI key | `your_key` |
| `NODE_ENV` | `production` | `production` |
| `PORT` | Server port | `3001` |
| `SKIP_ADMIN_CHECK` | `false` in production | `false` |
| `LOG_LEVEL` | Pino log level | `info` |

### Required for Frontend (Vite build-time)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_live_...` |
| `VITE_API_URL` | API base URL (if different origin) | `https://projectory.com` |
| `BASE_PATH` | Vite base path | `/` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ADZUNA_APP_ID` | Adzuna API app ID | (empty) |
| `ADZUNA_API_KEY` | Adzuna API key | (empty) |
| `ADZUNA_REGION` | Adzuna region | `in` |
| `JOBS_SYNC_INTERVAL` | Cron expression | `0 0 * * *` |
| `JOB_INTEL_SCHEDULER_ENABLED` | Auto-start scraper scheduler | `false` |

---

## SSL / HTTPS

1. In cPanel, go to **SSL/TLS** or **Let's Encrypt**
2. Issue a certificate for `projectory.com` and `www.projectory.com`
3. Enable **Force HTTPS Redirect**

---

## Domain Configuration

- Ensure `projectory.com` and `www.projectory.com` both point to the server
- Set up a redirect from `www.projectory.com` → `projectory.com` (or vice versa)
- Configure the Clerk production domain to match (see DEPLOYMENT.md)

---

## CORS Configuration

The backend is configured to accept requests from:
- `https://projectory.com`
- `https://www.projectory.com`
- `http://localhost:3001` (development)

Set `CORS_ORIGIN` in `.env.production` to override (comma-separated for multiple).

---

## Process Management

### Check if the API server is running:
```bash
pm2 list
# or
ps aux | grep "careerstack"
```

### View logs:
```bash
pm2 logs careerstack-api
```

### Restart:
```bash
pm2 restart careerstack-api
```

### Stop:
```bash
pm2 stop careerstack-api
```

---

## Troubleshooting

### 404 on /api/* routes
- Verify Apache proxy rules are in place
- Check that the Node.js app is running on the expected port
- Ensure PORT in .env matches the Apache proxy target

### 500 Internal Server Error
- Check PM2 logs: `pm2 logs careerstack-api`
- Verify DATABASE_URL is correct
- Ensure all environment variables are set

### Clerk authentication fails
- Verify CLERK_SECRET_KEY starts with `sk_live_`
- Check that the Clerk dashboard has `projectory.com` as a allowed origin
- Ensure VITE_CLERK_PUBLISHABLE_KEY matches the production key

### Database connection refused
- Verify MySQL is running: `systemctl status mysql`
- Check credentials in DATABASE_URL
- Ensure the user has privileges on the database

### CORS errors
- Verify CORS_ORIGIN includes `https://projectory.com`
- Check that the frontend is making requests to the correct API URL
