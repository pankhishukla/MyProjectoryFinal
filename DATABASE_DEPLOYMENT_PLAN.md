# DATABASE DEPLOYMENT PLAN

## A. Current Architecture

The MyProjectory application uses a monorepo structure with pnpm workspace:

- **Frontend**: `@workspace/careerstack` - React/Vite app deployed to cPanel at https://myprojectory.com
- **Backend**: `api-server` - Node.js/Express app being deployed to Render
- **Database**: MySQL 8.0 running in Docker (local development only)

### Backend Database Configuration

**Current DATABASE_URL** (from `artifacts/api-server/.env`):
```
mysql://careerstack:careerstack@localhost:3307/careerstack
```

**Docker MySQL details** (from `docker-compose.yml`):
- Image: `mysql:8.0`
- Container name: `careerstack_mysql`
- Port mapping: `3307:3306` (host:container)
- Database name: `careerstack`
- Username: `careerstack`
- Password: `careerstack`
- Root password: `rootpassword`
- Authentication plugin: `mysql_native_password`
- Character set: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`
- Volume: `mysql_data` at `/var/lib/mysql`
- Health check: MySQL ping with root user

### Drizzle ORM Schema

The backend uses Drizzle ORM with 20+ table definitions in `artifacts/api-server/src/lib/db/schema/`:

Key tables:
- `users` - user profiles with Clerk IDs, name, email, college, degree, interests, skills
- `portfolios` - student portfolios with visibility enum, share tokens
- `projects` - student projects with technologies array, links, dates
- `roadmaps` - career roadmaps
- `jobs` / `job_listings` / `scraped_jobs` - job board data
- `domains`, `stacks`, `scoring`, `analysis_config` - supporting data
- `portfolio_projects`, `user_skills`, `user_certifications`, `project_stack_tags` - junction tables

**Important schema features**:
- JSON columns for arrays (`interests`, `skills`, `technologies`)
- MySQL enums for visibility/status values
- Auto-increment primary keys with cascade deletes
- References between tables (portfolios → users, projects → users, etc.)

### Build & Start Commands

**Backend build** (`artifacts/api-server/package.json`):
```
build: node ./build.mjs  (uses esbuild to bundle src/index.ts → dist/)
start: node --env-file=.env --enable-source-maps ./dist/index.js
dev: cross-env NODE_ENV=development node ./build.mjs && node --env-file=.env --enable-source-maps ./dist/index.js
```

**Root level scripts**:
- `pnpm build` - runs typecheck + recursive build
- `pnpm typecheck` - runs tsc on libs and artifacts

### Current Deployment Status

- **Frontend**: Already deployed to cPanel at https://myprojectory.com ✅
- **Backend**: Deploying to Render, but fails at runtime due to missing `DATABASE_URL`
- **Render service**: `myprojectory-api`
- **Render Root Directory**: Repository root (causes workspace issues)
- **Build command**: `pnpm install --frozen-lockfile && pnpm --filter api-server run build`
- **Start command**: `node --enable-source-maps ./dist/index.js`

---

## B. Current Docker Database Architecture

### docker-compose.yml

```yaml
version: "3.9"
services:
  mysql:
    image: mysql:8.0
    container_name: careerstack_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-careerstack}
      MYSQL_USER: ${MYSQL_USER:-careerstack}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-careerstack}
    ports:
      - "3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-rootpassword}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

volumes:
  mysql_data:
    driver: local
```

### Database Details

| Attribute | Value |
|-----------|-------|
| Engine | MySQL 8.0 |
| Host | localhost (container: mysql) |
| Port | 3306 (host: 3307) |
| Database | careerstack |
| User | careerstack |
| Password | careerstack |
| Root password | rootpassword |
| Auth plugin | mysql_native_password |
| Charset | utf8mb4 |
| Collation | utf8mb4_unicode_ci |
| Persistence | mysql_data volume at /var/lib/mysql |
| Data directory | /var/lib/mysql inside container |

### Tables in the Docker Database

The application has these tables (verified via check_db.cjs and schema files):

1. `users` - user profiles
2. `portfolios` - student portfolios
3. `projects` - student projects
4. `roadmaps` - career roadmaps
5. `jobs` - job listings
6. `job_listings` - job list views
7. `scraped_jobs` - scraped job data
8. `domains` - domain configurations
9. `stacks` - tech stacks
10. `scoring` - scoring configurations
11. `analysis_config` - analysis configurations
12. `portfolio_projects` - project-portfolio links
13. `user_saved_jobs` - user-saved jobs
14. `user_certifications` - user certifications
15. `project_stack_tags` - project-stack associations
16. `activity` - activity logs
17. `trends` - trend data
18. `stack_map` - stack mappings
19. `domains` - domain configs
20. `waitlist` - waitlist entries

### Backup

**backup.sql**: File exists at project root but is **empty** (0 bytes). No backup data currently stored.

---

## C. Recommended Production Architecture

### Production Database Strategy

**Move the MySQL database from local Docker to a cloud-managed MySQL service** that Render can connect to.

### Recommended Cloud MySQL Provider

**PlanetScale** (MySQL-compatible)

#### Why PlanetScale:

| Criteria | Rating | Reason |
|----------|--------|--------|
| **Reliability** | ⭐⭐⭐⭐⭐ | Managed SLA, automated backups, point-in-time recovery |
| **Render compatibility** | ⭐⭐⭐⭐⭐ | Standard MySQL connection string, works with mysql2 driver |
| **Security** | ⭐⭐⭐⭐⭐ | SSL/TLS, IP restrictions, credential management |
| **Low cost** | ⭐⭐⭐⭐ | Free tier: 1 database, 1GB storage, 1 branch |
| **Ease of setup** | ⭐⭐⭐⭐ | Quick provisioning, connection string provided |
| **Migrate existing DB** | ⭐⭐⭐⭐ | Data import/export supported |
| **DATABASE_URL support** | ⭐⭐⭐⭐⭐ | Standard `mysql://user:pass@host:port/db` format |

### Alternative Considered: cPanel MySQL

- **Pros**: Already have cPanel, no additional cost, familiar
- **Cons**: Not designed for Render connectivity, may have firewall restrictions, less reliable SLA, harder to scale
- **Verdict**: Not recommended as primary, could be secondary option

### Alternative: Supabase/Neon (PostgreSQL)

- **Pros**: Free tiers, generous limits
- **Cons**: Schema incompatibility - project uses MySQL-specific features (mysqlEnum, mysqlTable, json type handling with mysql2), Drizzle configured for mysql2, not pg. Would require schema rewrite.
- **Verdict**: Rejected - too much code change required

---

## D. Recommended MySQL Provider: PlanetScale

### PlanetScale Free Tier

- **Plan**: Free tier (Hobby)
- **Databases**: 1
- **Storage**: 1 GB
- **Branches**: 1 (main)
- **Queries**: Unlimited (within reasonable limits)
- **SSL**: Included (`?sslaccept=strict`)
- **Support**: Community forum
- **Upgrade**: ~$25/month for Scale-Hawk plan

### PlanetScale Workflow

1. **Provision**: Create database named `careerstack` at app.planetscale.com
2. **Import**: Export from Docker → Import to PlanetScale via UI or CLI
3. **Branch**: PlanetScale creates a `main` branch with the imported data
4. **Connect**: Note the DATABASE_URL from the "Connect" page
5. **Deploy**: Add DATABASE_URL to Render Environment
6. **Verify**: Deploy and test API endpoints

---

## E. Why This Provider Is Preferable

1. **Standard MySQL wire protocol**: Works with existing `mysql2` driver and Drizzle ORM without code changes
2. **DATABASE_URL format**: Produces `mysql://user:pass@host:port/db` format exactly matching current `DATABASE_URL`
3. **SSL/TLS built-in**: Secure connections without additional configuration
4. **IP restrictions**: Can whitelist Render's IP addresses
5. **Branching**: Git-style database branching for safe migrations
6. **Free tier sufficient**: 1 database, 1GB storage covers this project's needs
7. **Render compatibility**: Standard environment variable setup
8. **No Docker required**: Eliminates local Docker dependency for production

---

## F. Exact Database Migration Procedure

### Step 1: Provision the PlanetScale Database

1. Sign up at [PlanetScale](https://planetscale.com)
2. Create new MySQL database named `careerstack`
3. Note the connection details:
   - Host
   - Port (typically 3306)
   - Username
   - Password
   - Database URL with SSL parameters

### Step 2: Export Existing Docker Database

```bash
# From local machine with Docker running
cd /Users/pankhishukla/Projects/MyProjectoryFinal
docker compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} --routines --triggers careerstack > ~/careerstack_db_dump.sql
```

**Alternative using mysql client**:
```bash
mysqldump -u careerstack -p'careerstack' -h 127.0.0.1 -P 3307 --routines --triggers careerstack > ~/careerstack_db_dump.sql
```

### Step 3: Import into PlanetScale

**PlanetScale UI method**:
1. Go to PlanetScale dashboard → Database → Import
2. Upload the `.sql` dump file
3. Tables will be created with data

**PlanetScale CLI method**:
```bash
# Install planetscale CLI
brew install planetscale

# Connect and import
pscale import create careerstack /tmp/careerstack_dump.sql
# or
pscale database create careerstack --branching
pscale database import careerstack main /tmp/careerstack_dump.sql
```

### Step 4: Verify Data Import

```bash
# Check table count
mysql -u user -p'password' -h host port -D careerstack -e "SHOW TABLES;"

# Check row counts per table
for table in users projects portfolios roadmaps jobs; do
  mysql -u user -p'password' -h host port -D careerstack -e "SELECT COUNT(*) FROM $table;"
done
```

---

## G. How to Export the Existing Docker Database

### Export via Docker Compose

```bash
# From /Users/pankhishukla/Projects/MyProjectoryFinal
docker compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} --routines --triggers careerstack > ~/careerstack_db_dump.sql
```

**Alternative using mysqldump directly on host if MySQL is accessible**:
```bash
mysqldump -u careerstack -p'careerstack' -h 127.0.0.1 -P 3307 --routines --triggers careerstack > ~/careerstack_db_dump.sql
```

### Export Verification

```bash
# Check the dump has content
wc -l ~/careerstack_db_dump.sql
head -20 ~/careerstack_db_dump.sql
```

### What the dump includes

- CREATE TABLE statements for all 20+ tables
- INSERT statements with all existing data
- Routines (stored procedures/triggers) if any
- Database-level settings

---

## H. How to Import backup.sql or the Docker Dump into the New MySQL Database

### PlanetScale Import via UI

1. Log in to [app.planetscale.com](https://app.planetscale.com)
2. Select or create the `careerstack` database
3. Navigate to **Import** tab
4. Upload the `.sql` dump file
5. Click **Import**
6. Wait for the import to complete (shows progress)
7. Review the import summary

### PlanetScale Import via CLI

```bash
# If you've already created the database with branching:
pscale import create main /path/to/careerstack_dump.sql

# Or create first, then import:
pscale database create careerstack --org org-name
pscale import create careerstack main /path/to/careerstack_dump.sql
```

### Aiven Import

1. Go to [aiven.io/console](https://aiven.io/console)
2. Select your MySQL service
3. Navigate to **Database** → **Import**
4. Upload the SQL file
5. Click **Import**

### Verification After Import

```sql
-- Check all tables exist
SHOW TABLES;

-- Check row counts per table
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'careerstack'
ORDER BY TABLE_ROWS DESC;

-- Check sample data
SELECT * FROM users LIMIT 5;
SELECT * FROM portfolios LIMIT 5;
SELECT * FROM projects LIMIT 5;
```

---

## I. How to Obtain the Production DATABASE_URL

### PlanetScale DATABASE_URL Format

After provisioning and importing:

```plaintext
mysql://password-encoded-user:password@host:port/database?sslaccept=strict
```

**PlanetScale automatically URL-encodes** the password in the connection string.

### To Get the DATABASE_URL:

1. In PlanetScale console, go to your database
2. Click **Connect**
3. Select **Prisma / Drizzle / Raw MySQL**
4. Copy the connection string
5. It will look something like:
   ```
   mysql://avn-admin:pscale_pw_YOUR_PASSWORD_ENCODED_VALUE@aws.connect.psdb.cloud/careerstack?sslaccept=strict
   ```

### Alternative: Aiven DATABASE_URL

```
mysql://avnadmin:PASSWORD@careerstack.aivencloud.com:25906/careerstack?sslmode=REQUIRED
```

### Important Notes on SSL

- **PlanetScale**: Use `?sslaccept=strict` at end of URL
- **Aiven**: Requires explicit SSL mode in connection string
- **Without SSL**: Some managed MySQL providers reject non-SSL connections
- **Test connection**: Try connecting with a MySQL client first before updating the env var

---

## J. Environment Variables Required on Render

### Add these to Render Dashboard → Service → Environment

| Variable | Value | Required? |
|----------|-------|-----------|
| `DATABASE_URL` | `mysql://avn-admin:pscale_pw_XXX@aws.connect.psdb.cloud/careerstack?sslaccept=strict` | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `8008` (or your chosen port) | ✅ Yes |
| `FRONTEND_PORT` | `5173` | ✅ Yes (for dev proxy) |
| `CORS_ORIGIN` | `https://myprojectory.com` | ✅ Yes |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_c21vb3RoLWNoaWNrZW4tNDMuY2xlcmsuYWNjb3VudHMuZGV2JA` | ✅ Yes |
| `CLERK_SECRET_KEY` | `sk_test_0imUoGvsv4vCjVq4hUajefoADTu6k2Uy7YL8Iw0SVX` | ✅ Yes |
| `SERPAPI_API_KEY` | Your SerpAPI key | ✅ Yes |
| `SKIP_ADMIN_CHECK` | `false` (production) | ✅ Yes |

### How to Add on Render:

1. Go to **Render Dashboard** → **myprojectory-api** service
2. Click **Environment** → **Add Variable**
3. Add each variable name and value
4. Click **Save**
5. **Deploy Service** (trigger new deployment)

### DATABASE_URL Construction

```bash
# PlanetScale example
export DATABASE_URL="mysql://avn-admin:pscale_pw_YOUR_PASSWORD_ENCODED_VALUE@aws.connect.psdb.cloud/careerstack?sslaccept=strict"

# Verify format
echo $DATABASE_URL | grep -o "mysql://"  # Should output mysql://
```

### Render will automatically:

- Make the variable available as `process.env.DATABASE_URL` in your Node.js code
- The `app.ts` already checks: `if (!process.env.DATABASE_URL) { throw new Error("DATABASE_URL must be set.") }`
- The `check_db.cjs` script also validates the connection

### No code changes required to DATABASE_URL handling

The existing code in `src/lib/db/index.ts` already:
- Checks if `DATABASE_URL` exists
- Creates a mysql2 pool with the URI
- Exports `db` for use throughout the app

No changes needed to `src/lib/db/index.ts` or any other source file.

---

## K. DATABASE_URL: Manual Entry on Render

### Yes, add manually to Render dashboard

1. **Do NOT** use Render's "Secrets" feature for DATABASE_URL unless you want to manage via the UI
2. **Directly add** as an environment variable as described above
3. The value must be the complete MySQL connection string

### Render will automatically:

- Make the variable available as `process.env.DATABASE_URL` in your Node.js code
- The `app.ts` already checks: `if (!process.env.DATABASE_URL) { throw new Error("DATABASE_URL must be set.") }`
- The `check_db.cjs` script also validates the connection

### No code changes required to DATABASE_URL handling

The existing code in `src/lib/db/index.ts` already:
- Checks if `DATABASE_URL` exists
- Creates a mysql2 pool with the URI
- Exports `db` for use throughout the app

No changes needed to `src/lib/db/index.ts` or any other source file.

---

## L. Application Code Changes Required

### No source code changes needed for the database migration

The existing code will work with the new DATABASE_URL because:

1. **Drizzle ORM mysql2 driver**: Standard MySQL wire protocol, compatible with PlanetScale/Aiven
2. **Connection format**: `mysql://user:pass@host:port/db` format supported by both local Docker and cloud providers
3. **No MySQL-specific dialects**: Drizzle ORM uses mysql-core primitives that map directly
4. **JSON columns**: Supported natively by MySQL 8.0 and the mysql2 driver
5. **Enums**: MySQL enums supported directly

### Environment variable changes only

- `DATABASE_URL` value changes from `mysql://careerstack:careerstack@localhost:3307/careerstack` to the cloud provider's connection string
- All other `.env` variables remain the same or get updated as needed

### No schema migration files exist

There are no migration files in the repository (no `prisma migrate`, `drizzle-kit`, etc.). The schema was likely created manually or via another method. This means:

- **Option A**: Export data from Docker, import to cloud, and the existing Drizzle schemas will work directly
- **Option B**: If schema doesn't match exactly, you may need to adjust Drizzle schema files (but this is unlikely given the dump will have the same table structures)

### Recommended: Run Drizzle push after import

```bash
# After DATABASE_URL is set and database has data
cd artifacts/api-server
npx drizzle-kit push  # This will sync any schema differences
```

Or if no schema changes needed:
```bash
# Just verify the app starts
pnpm start
```

---

## M. Database Initialization/Seed Scripts

### Does the app have seed scripts?

**No dedicated seed scripts found** in the repository. The database was likely populated:

1. During Docker setup (initial Docker run creates the `careerstack` database)
2. Via manual SQL commands
3. Through the application's own seeding process (not in this repo)

### What needs to happen

1. **Data migration**: Export from Docker, import to cloud (covered in section F)
2. **Schema verification**: Ensure Drizzle schemas match the cloud database tables
3. **No seed rerun needed**: The imported data should persist

### If you need to reseed

You would need to create seed scripts, but this is not required for the migration. The existing data in the Docker database should be preserved through the export/import process.

### Verifying data after import

```bash
# Run a quick check
cd artifacts/api-server
node check_db.cjs  # Should show tables and columns populated
```

---

## N. Security Considerations

### Database Credentials

| Consideration | Action |
|--------------|--------|
| **Rotate passwords** | After migration, generate new MySQL user passwords for both Docker and cloud |
| **Principle of least privilege** | Create a dedicated database user (not root) with only needed permissions |
| **Store securely** | Use Render Environment variables, never commit .env files with real credentials |
| **Password format** | Current: `careerstack` - change after migration |

### Public Access

| Consideration | Action |
|--------------|--------|
| **Connection from Render only** | Whitelist Render's IP addresses in the MySQL provider's firewall |
| **No public exposure** | Do NOT make the MySQL port publicly accessible |
| **SSL/TLS** | Enable SSL on the cloud database (PlanetScale: `?sslaccept=strict`, Aiven: `?sslmode=REQUIRED`) |
| **Connection pooling** | The mysql2 pool (max 10 connections) handles this adequately |

### SSL/TLS

- **PlanetScale**: Automatically uses TLS, just add `?sslaccept=strict` to DATABASE_URL
- **Aiven**: Requires explicit SSL mode in connection string
- **Test SSL**: `mysql -u user -p'pass' -h host --ssl-careerstack` or use your client's SSL toggle
- **Certificate pinning**: Not needed for these providers - they handle cert validation

### Secrets Management

- **Current**: `.env` files at project root and api-server level (NOT committed to git based on .gitignore)
- **Production**: Use Render Environment variables (encrypted at rest)
- **Never**: Commit `.env` files with real credentials to the repository
- **Rotate**: MySQL passwords after migration, especially the `careerstack` user password

### IP Restrictions

- **PlanetScale**: Automatically allows connections from services deployed on PlanetScale
- **Aiven**: Add Render's outbound IP to firewall rules
- **Render IPs**: Check [Render IP ranges](https://render.com/docs/outbound-ip) and add to MySQL provider
- **Alternative**: Use provider's "allow all from app" feature if available

---

## O. Render Configuration After Database Setup

### 1. Add DATABASE_URL Environment Variable

```
Variable: DATABASE_URL
Value: mysql://avn-admin:pscale_pw_encoded_password@aws.connect.psdb.cloud/careerstack?sslaccept=strict
```

### 2. Verify Other Environment Variables

Ensure these are also set on Render (from `artifacts/api-server/.env`):

```
NODE_ENV=production
PORT=8008
FRONTEND_PORT=5173
CORS_ORIGIN=https://myprojectory.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_c21vb3RoLWNoaWNrZW4tNDMuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_0imUoGvsv4vCjVq4hUajefoADTu6k2Uy7YL8Iw0SVX
SERPAPI_API_KEY=your_serpapi_key
SKIP_ADMIN_CHECK=false
```

### 3. Set Render Root Directory Correctly

**Current (broken)**: Repository root
**Correct**: `artifacts/api-server`

Why: The pnpm workspace has `artifacts/*` as packages, so the build command `pnpm --filter api-server run build` needs to run from the `artifacts/api-server` directory, or from root with the `--filter` flag.

### 4. Build Command

```
pnpm install --frozen-lockfile && pnpm --filter api-server run build
```

Or simply:
```
pnpm --filter api-server run build
```
(from repository root)

### 5. Start Command

```
node --enable-source-maps ./dist/index.js
```

### 6. Health Check Path

- **Path**: `/health` (from the health route at `artifacts/api-server/src/routes/health.ts`)
- **Or**: `/` if using root health check

### 7. Service Settings

- **Instance type**: Free tier (or Paid if needed)
- **Region**: Choose closest to your users (us-east-1, eu-west-1, etc.)
- **Auto-deploy**: Enable so pushes to GitHub trigger deployments
- **Branch**: main (or your production branch)

---

## P. Testing Procedure

### 1. After DATABASE_URL is set and deployment triggers:

1. Go to Render dashboard → your service
2. Click **Deploy Manual** → **Deploy latest**
3. Wait for build to complete
4. Check **Logs** for any errors

### 2. Test Database Connectivity

```bash
# Use the health endpoint
curl https://myprojectory-api.onrender.com/health

# Expected: {"status":"healthy"} or similar

# Or try direct connection via Render console
# Render has a "Open Terminal" feature for the running service
```

### 3. Test API Endpoints

```bash
# Test basic routes
curl https://myprojectory-api.onrender.com/api/health
curl https://myprojectory-api.onrender.com/api/users
curl https://myprojectory-api.onrender.com/api/portfolios

# Expected: JSON responses (200 status)
```

### 4. Test CORS

```bash
# From frontend domain
curl -H "Origin: https://myprojectory.com" https://myprojectory-api.onrender.com/api/users

# Should succeed if CORS_ORIGIN is set correctly
```

### 5. Verify Data Persistence

```bash
# Check a few key tables
curl https://myprojectory-api.onrender.com/api/users
curl https://myprojectory-api.onrender.com/api/portfolios

# Should return the migrated data (not empty)
```

### 6. Test WebSockets (if applicable)

The app has WebSocket support (proxied in development via `ws: true` in app.ts). After database setup:

```bash
# Check if websocket routes work
# This may require frontend testing
```

### 7. Test Scrapers/Jobs

```bash
# If job intelligence scrapers are enabled
# They depend on SerpAPI key and database connectivity
```

---

## Q. Rollback Procedure

### If something goes wrong after database migration:

#### Step 1: Restore Docker Database

```bash
# If Docker is still running
docker compose -f /path/to/docker-compose.yml up -d mysql

# Or restore from dump
mysql -u root -p${MYSQL_ROOT_PASSWORD} -h 127.0.0.1 -P 3307 < /path/to/careerstack_dump.sql
```

#### Step 2: Revert DATABASE_URL on Render

1. Go to Render → Service → Environment
2. Remove or override the `DATABASE_URL` variable
3. Set it back to the local Docker value (if needed for testing):
   ```
   DATABASE_URL=mysql://careerstack:careerstack@localhost:3307/careerstack
   ```
4. Trigger a new deployment

#### Step 3: Data Recovery from Cloud

If data was lost in the cloud:

1. Use the cloud provider's point-in-time recovery (PlanetScale/Aiven have this)
2. Re-import from the Docker dump if cloud recovery fails
3. Contact provider support if needed

#### Step 4: Verify

```bash
# Check the app works
curl https://myprojectory-api.onrender.com/health

# Check data is correct
curl https://myprojectory-api.onrender.com/api/users
```

### Data Loss Prevention

⚠️ **DO NOT delete the local Docker MySQL container or its volume until:**
1. The cloud database has been successfully provisioned
2. Data has been exported and imported successfully
3. All API endpoints return expected data
4. The Render deployment is healthy
5. You have verified the data matches the original

### Rollback Data Preservation

```bash
# Keep the Docker volume intact until verification is complete
docker volume inspect mysql_data

# The volume is at /var/lib/mysql inside the container
# Do not remove until you've verified the cloud data is complete
```

---

## R. Estimated Cost/Free-Tier Limitations

### PlanetScale Free Tier

| Feature | Free Tier | Notes |
|---------|-----------|-------|
| Databases | 1 | Single database allowed |
| Storage | 1 GB | Sufficient for this project |
| Branches | 1 (main) | No branching on free |
| Queries | Unlimited | Within reasonable limits |
| SSL | Included | `?sslaccept=strict` |
| Support | Community | Community forum only |
| Upgrade cost | ~$25/month | Scale-Hawk plan |

### Aiven Free/Trial

| Feature | Free Tier | Notes |
|---------|-----------|-------|
| Trial | 30 days | Full features during trial |
| After trial | Smallest plan ~$7/month | Little Hawk plan |
| Storage | Varies by plan | 1GB+ typically |
| Support | Community | Community forum |

### Render Free Tier

| Feature | Free Tier | Notes |
|---------|-----------|-------|
| Instances | 1 | Free web service |
| Bandwidth | 300 GB/month | Sufficient |
| Disk | 1 GB | Limited, but API data is small |
| Domain | Custom domain | Supported |
| HTTPS | Free Let's Encrypt | Automatic |

### Total Estimated Monthly Cost

| Component | Cost |
|-----------|------|
| Render (Free) | $0 |
| PlanetScale (Free) | $0 |
| cPanel (existing) | Already paid |
| Domain (myprojectory.com) | Already paid |
| **Total** | **$0/month** (within free tiers) |

### Limitations to Be Aware Of

1. **PlanetScale free**: Only 1 branch, no point-in-time recovery
2. **Render free**: 1 web service, 1GB disk, may sleep after inactivity (cold start ~50s)
3. **Database free**: 1GB storage limit - this project should be well under 1GB (no large binary data)
4. **WebSocket**: Free Render may have connection timeouts
5. **Scheduled jobs**: `node-cron` may not run on free tier if the service sleeps

### When to Upgrade

- When you need more than 1 database
- When you need point-in-time recovery
- When you need always-on service (no cold starts)
- When storage exceeds 1GB (unlikely for this project)
- When you need more than 1 branch for safe migrations

---

## S. Manual Steps Required

### 1. Docker/Local Machine

```bash
# 1.1 Export the database from Docker
cd /Users/pankhishukla/Projects/MyProjectoryFinal
docker compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} --routines --triggers careerstack > ~/careerstack_db_dump.sql

# 1.2 Verify the dump
wc -l ~/careerstack_db_dump.sql
head -5 ~/careerstack_db_dump.sql

# 1.3 Keep Docker running until migration is verified
# DO NOT remove the docker volume or container until step 4 is complete
```

### 2. MySQL Provider Dashboard

```bash
# 2.1 Sign up at PlanetScale (or Aiven)
# Visit: https://planetscale.com

# 2.2 Create new database named "careerstack"
# 2.3 Note the connection string shown
# 2.4 Complete the 30-day trial or select free tier
# 2.5 Import the dump file via UI or CLI
# 2.6 Verify data is intact (check table row counts)

# 2.7 Get the final DATABASE_URL from the "Connect" page
# 2.8 URL will include sslaccept=strict or similar
```

### 3. Render Dashboard

```bash
# 3.1 Go to https://render.com/dashboard
# 3.2 Select your service: myprojectory-api
# 3.3 Click "Environment" 
# 3.4 Add new variable: DATABASE_URL
# 3.5 Paste the full connection string from PlanetStep
# 3.6 Add any missing env vars (NODE_ENV, CORS_ORIGIN, etc.)
# 3.7 Click "Save"
# 3.8 Click "Deploy Manual" → "Deploy latest"
# 3.9 Wait for build to complete (2-5 minutes)
# 3.10 Check "Logs" for any errors
# 3.11 Verify deployment is live
```

### 4. cPanel (If Required)

**Check if cPanel MySQL is needed**:

- **Frontend**: Already on cPanel at https://myprojectory.com - works without cloud MySQL
- **Backend**: Moving to Render, only needs DATABASE_URL
- **Database**: No cPanel MySQL required if using PlanetScale/Aiven

**If you still want cPanel MySQL as fallback**:

1. Log into cPanel → MySQL® Databases
2. Create database and user
3. Note the connection string
4. Could use as secondary/backup, but not required for primary setup

**cPanel actions needed**: None for primary deployment. Only if you want to keep a local MySQL alongside Render.

---

## T. Final Deployment Checklist

## FINAL DEPLOYMENT CHECKLIST

### ✅ Phase 1: Database Setup

- [ ] Provision PlanetScale database named `careerstack`
- [ ] Export Docker MySQL data to `~/careerstack_db_dump.sql`
- [ ] Import dump into PlanetScale database
- [ ] Verify all 20+ tables have data
- [ ] Note the DATABASE_URL from PlanetStep "Connect" page
- [ ] Test local connection with the new DATABASE_URL

### ✅ Phase 2: Render Configuration

- [ ] Set `DATABASE_URL` environment variable on Render
- [ ] Set `NODE_ENV=production` on Render
- [ ] Set `PORT=8008` on Render
- [ ] Set `CORS_ORIGIN=https://myprojectory.com` on Render
- [ ] Set `VITE_CLERK_PUBLISHABLE_KEY` on Render
- [ ] Set `CLERK_SECRET_KEY` on Render
- [ ] Set `SERPAPI_API_KEY` on Render
- [ ] Set `SKIP_ADMIN_CHECK=false` on Render
- [ ] Change `SKIP_ADMIN_CHECK` from `true` to `false`
- [ ] Set Render Root Directory to `artifacts/api-server`
- [ ] Set Build Command: `pnpm install --frozen-lockfile && pnpm --filter api-server run build`
- [ ] Set Start Command: `node --enable-source-maps ./dist/index.js`
- [ ] Trigger manual deployment on Render
- [ ] Wait for build to complete
- [ ] Verify deployment is live and healthy

### ✅ Phase 3: Verification

- [ ] Health endpoint returns healthy status
- [ ] API endpoints return data (users, portfolios, projects)
- [ ] CORS works from https://myprojectory.com
- [ ] Database data persists across deploys
- [ ] No errors in Render logs
- [ ] Frontend (cPanel) can communicate with backend (Render)

### ✅ Phase 4: Cleanup

- [ ] **DO NOT delete Docker volume yet** - wait 48 hours verification
- [ ] Rotate MySQL passwords if needed
- [ ] Confirm no secrets in committed .env files
- [ ] Test frontend → backend communication
- [ ] Document the new DATABASE_URL for future reference

### ✅ Phase 5: Post-Launch

- [ ] Monitor Render logs for first week
- [ ] Check database connection metrics
- [ ] Verify free tier limits are not exceeded
- [ ] Set up monitoring alerts if needed
- [ ] Plan upgrade path if project grows

---

## U. Summary

### Recommended Database Provider

**PlanetScale** (MySQL-compatible, free tier sufficient)

### Why PlanetScale

1. **Free tier covers all needs**: 1 database, 1GB storage, unlimited queries
2. **Standard MySQL wire protocol**: Works with existing `mysql2` driver and Drizzle ORM
3. **DATABASE_URL format**: `mysql://avn-admin:pscale_pw_...@aws.connect.psdb.cloud/db?sslaccept=strict`
4. **SSL built-in**: No additional configuration needed
5. **Render compatible**: Standard environment variable setup
6. **No code changes**: Existing Drizzle schemas work directly
7. **Easy migration**: Export from Docker → Import to PlanetScale
8. **Branching** (even on free): Safe schema changes with rollback

### What You Must Do Manually

1. **Export Docker MySQL data** using `docker compose exec mysql mysqldump ...`
2. **Provision PlanetScale database** named `careerstack`
3. **Import the dump** via PlanetStep UI or CLI
4. **Verify data** is intact (check table row counts)
5. **Add DATABASE_URL** to Render Environment variables
6. **Deploy** the Render service
7. **Test** all API endpoints and CORS
8. **Wait 48 hours** before deleting Docker database/volume

### Exact Next Step After Database is Ready

> **Run the Docker export command immediately:**
> ```bash
> cd /Users/pankhishukla/Projects/MyProjectoryFinal
> docker compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} --routines --triggers careerstack > ~/careerstack_db_dump.sql
> ```
> 
> Then proceed to provision PlanetScale and import the data. This is the critical first step - without the dump, you cannot migrate the existing data.

---