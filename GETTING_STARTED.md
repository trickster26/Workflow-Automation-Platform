# Getting Started - Workflow Automation Platform

<div align="center">

🚀 **Complete Setup Guide for Running the Workflow Automation Platform**

</div>

## 📋 Table of Contents

- [System Requirements](#-system-requirements)
- [Quick Setup (Recommended)](#-quick-setup-recommended)
- [Manual Setup](#-manual-setup)
- [Environment Configuration](#-environment-configuration)
- [Database Setup](#-database-setup)
- [Running the Application](#-running-the-application)
- [Creating Your First Admin User](#-creating-your-first-admin-user)
- [Testing the Installation](#-testing-the-installation)
- [Troubleshooting](#-troubleshooting)

## 🖥️ System Requirements

### Minimum Requirements
- **Node.js**: 18.0+ 
- **npm**: 8.0+ or **yarn**: 1.22+
- **PostgreSQL**: 13+
- **Redis**: 6.0+
- **Memory**: 4GB RAM
- **Storage**: 10GB free space

### Recommended for Production
- **Node.js**: 20.0+
- **PostgreSQL**: 15+
- **Redis**: 7.0+
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ SSD

### Operating System Support
- ✅ **macOS** 10.15+
- ✅ **Ubuntu** 20.04+
- ✅ **CentOS** 8+
- ✅ **Windows** 10+ (with WSL2 recommended)
- ✅ **Docker** (any OS with Docker support)

## 🚀 Quick Setup (Recommended)

### Option 1: Docker Compose (Easiest)

1. **Install Docker and Docker Compose**
   ```bash
   # Check if Docker is installed
   docker --version
   docker-compose --version
   ```

2. **Clone and Start**
   ```bash
   git clone https://github.com/yourusername/workflow-automation-platform.git
   cd workflow-automation-platform
   
   # Copy environment file
   cp .env.example .env
   
   # Start all services
   docker-compose up -d
   ```

3. **Wait for Services to Start**
   ```bash
   # Check service status
   docker-compose ps
   
   # View logs
   docker-compose logs -f
   ```

4. **Access the Platform**
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - Frontend (if deployed): http://localhost:3001

### Option 2: Local Development Setup

1. **Install Dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Or with yarn
   yarn install
   ```

2. **Setup Services**
   ```bash
   # Start PostgreSQL (using Homebrew on macOS)
   brew services start postgresql
   
   # Start Redis
   brew services start redis
   
   # Or use Docker for services only
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:13
   docker run -d --name redis -p 6379:6379 redis:6-alpine
   ```

3. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Initialize Database**
   ```bash
   npm run db:create
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🛠️ Manual Setup

### Step 1: Install Node.js

#### On macOS
```bash
# Using Homebrew
brew install node@20

# Or download from https://nodejs.org/
```

#### On Ubuntu/Debian
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### On CentOS/RHEL
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install PostgreSQL

#### On macOS
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database user
createuser -s postgres
```

#### On Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createuser --interactive --pwprompt
```

#### On CentOS/RHEL
```bash
# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup initdb

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 3: Install Redis

#### On macOS
```bash
brew install redis
brew services start redis
```

#### On Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### On CentOS/RHEL
```bash
sudo yum install redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Step 4: Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/yourusername/workflow-automation-platform.git
cd workflow-automation-platform

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

## 📝 Environment Configuration

### Create .env File

```bash
# Copy the example file
cp .env.example .env
```

### Configure Environment Variables

Edit the `.env` file with your settings:

```env
# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_automation
DB_USER=postgres
DB_PASSWORD=postgres

# ===========================================
# REDIS CONFIGURATION
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ===========================================
# JWT AUTHENTICATION
# ===========================================
# IMPORTANT: Change these in production!
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-min-32-chars

# Token expiration times
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ===========================================
# WEBHOOK CONFIGURATION
# ===========================================
WEBHOOK_BASE_URL=http://localhost:3000

# ===========================================
# EMAIL CONFIGURATION (Optional)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email settings
EMAIL_FROM="Workflow Platform <noreply@yourcompany.com>"
EMAIL_REPLY_TO=support@yourcompany.com

# ===========================================
# STORAGE CONFIGURATION
# ===========================================
STORAGE_PATH=./storage
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
# Session timeout (in milliseconds)
SESSION_TIMEOUT=900000

# Max login attempts before lockout
MAX_LOGIN_ATTEMPTS=5

# Account lockout duration (in milliseconds)
LOCKOUT_DURATION=1800000

# ===========================================
# MONITORING CONFIGURATION
# ===========================================
MONITORING_ENABLED=true
MONITORING_RETENTION_DAYS=30
ALERT_EMAIL_ENABLED=true

# ===========================================
# DEVELOPMENT OPTIONS
# ===========================================
# Set to 'true' to enable detailed logging
DEBUG=false

# Set to 'true' to enable CORS for all origins (DEV ONLY)
CORS_ALLOW_ALL=false
```

### Generate JWT Secrets

For production, generate secure JWT secrets:

```bash
# Generate JWT secrets (Linux/macOS)
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)"

# Or using Node.js
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
```

## 🗄️ Database Setup

### Create Database

#### Option 1: Using npm scripts (Recommended)
```bash
# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

#### Option 2: Manual database creation
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE workflow_automation;
CREATE USER workflow_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE workflow_automation TO workflow_user;

# Exit psql
\q
```

### Verify Database Connection

```bash
# Test database connection
npm run db:test

# Or manually test
psql -h localhost -U postgres -d workflow_automation -c "SELECT version();"
```

### Run Database Migrations

```bash
# Run all migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last migration (if needed)
npm run db:migrate:undo
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start with hot reload
npm run dev

# Or with debug logging
DEBUG=true npm run dev

# Start specific components
npm run dev:server    # Backend only
npm run dev:worker    # Background workers only
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start

# Or with PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.js
```

### Using Docker

```bash
# Development with Docker Compose
docker-compose up -d

# Production with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 👤 Creating Your First Admin User

### Method 1: Using the Registration API

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Register an admin user**
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@yourcompany.com",
       "username": "admin",
       "password": "AdminPass123!",
       "firstName": "System",
       "lastName": "Administrator"
     }'
   ```

3. **Manually promote to admin** (in database)
   ```sql
   UPDATE users 
   SET role = 'admin', status = 'active', "emailVerified" = true 
   WHERE email = 'admin@yourcompany.com';
   ```

### Method 2: Using Database Script

```bash
# Create admin user script
node -e "
const { UserModel } = require('./src/models/User.model');
const { db } = require('./src/config/database');

async function createAdmin() {
  await db.connect();
  
  const admin = await UserModel.create({
    email: 'admin@yourcompany.com',
    username: 'admin',
    password: 'AdminPass123!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    status: 'active',
    emailVerified: true,
  });
  
  console.log('Admin user created:', admin.email);
  process.exit(0);
}

createAdmin().catch(console.error);
"
```

### Method 3: Using Bootstrap Script

Create `scripts/create-admin.js`:

```javascript
const { UserModel } = require('../src/models/User.model');
const { db } = require('../src/config/database');

async function createAdminUser() {
  try {
    await db.connect();
    
    const existingAdmin = await UserModel.findOne({
      where: { email: 'admin@yourcompany.com' }
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    const admin = await UserModel.create({
      email: 'admin@yourcompany.com',
      username: 'admin',
      password: 'AdminPass123!',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Username:', admin.username);
    console.log('Password: AdminPass123!');
    console.log('\n⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await db.close();
  }
}

createAdminUser();
```

Run the script:
```bash
node scripts/create-admin.js
```

## 🧪 Testing the Installation

### 1. Health Check

```bash
# Test server health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "execution": {
      "activeExecutions": 0,
      "queueStats": {...}
    }
  }
}
```

### 2. Authentication Test

```bash
# Test user login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@yourcompany.com",
    "password": "AdminPass123!"
  }'

# Should return JWT tokens
```

### 3. API Endpoints Test

```bash
# Get node types
curl http://localhost:3000/api/node-types

# Get workflows (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/workflows
```

### 4. Database Test

```bash
# Test database connection
npm run db:test

# Check if tables exist
psql -d workflow_automation -c "\dt"
```

### 5. Redis Test

```bash
# Test Redis connection
redis-cli ping

# Should return "PONG"
```

### 6. Run Test Suite

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:api
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Error: EADDRINUSE: address already in use :::3000
# Solution: Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change the port in .env
PORT=3001
```

#### 2. Database Connection Failed

```bash
# Error: connect ECONNREFUSED 127.0.0.1:5432
# Solutions:

# Check if PostgreSQL is running
brew services list | grep postgresql
# or
sudo systemctl status postgresql

# Start PostgreSQL
brew services start postgresql
# or
sudo systemctl start postgresql

# Check connection
psql -h localhost -U postgres -c "SELECT version();"
```

#### 3. Redis Connection Failed

```bash
# Error: connect ECONNREFUSED 127.0.0.1:6379
# Solutions:

# Check if Redis is running
brew services list | grep redis
# or
sudo systemctl status redis

# Start Redis
brew services start redis
# or
sudo systemctl start redis

# Test connection
redis-cli ping
```

#### 4. JWT Secret Error

```bash
# Error: JWT secret must be at least 32 characters
# Solution: Generate proper secrets

openssl rand -base64 64
# Add to .env file
```

#### 5. Database Migration Failed

```bash
# Error: relation "users" does not exist
# Solutions:

# Reset database
npm run db:reset

# Or manually drop and recreate
npm run db:drop
npm run db:create
npm run db:migrate
```

#### 6. Permission Denied Errors

```bash
# Error: EACCES: permission denied
# Solutions:

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix project permissions
sudo chown -R $(whoami) .

# Use node version manager (recommended)
# Install nvm: https://github.com/nvm-sh/nvm
nvm install 20
nvm use 20
```

#### 7. Module Not Found Errors

```bash
# Error: Cannot find module 'some-package'
# Solutions:

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check Node.js version
node --version  # Should be 18+
```

### Logging and Debugging

#### Enable Debug Mode

```bash
# Set debug environment
DEBUG=true npm run dev

# Or set specific debug namespaces
DEBUG=app:*,db:*,auth:* npm run dev
```

#### Check Application Logs

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View access logs
tail -f logs/access.log
```

#### Database Debugging

```bash
# Enable query logging in .env
DB_LOGGING=true

# Or check database logs
tail -f /usr/local/var/log/postgresql@15.log  # macOS
sudo tail -f /var/log/postgresql/postgresql-15-main.log  # Ubuntu
```

### Performance Issues

#### 1. Slow Database Queries

```sql
-- Enable query statistics
SELECT * FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

#### 2. High Memory Usage

```bash
# Check memory usage
ps aux | grep node

# Use Node.js memory profiling
node --inspect src/index.js

# Monitor with htop
htop
```

#### 3. Redis Memory Usage

```bash
# Check Redis memory usage
redis-cli info memory

# Monitor Redis commands
redis-cli monitor
```

### Getting Help

#### 1. Check Documentation
- [API Documentation](./docs/API.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Monitoring Guide](./MONITORING.md)

#### 2. Enable Verbose Logging
```bash
LOG_LEVEL=debug npm run dev
```

#### 3. Check Service Status
```bash
# All services status
npm run status

# Individual service checks
npm run check:db
npm run check:redis
npm run check:health
```

#### 4. Community Support
- 📋 [GitHub Issues](https://github.com/yourusername/workflow-automation-platform/issues)
- 💬 [GitHub Discussions](https://github.com/yourusername/workflow-automation-platform/discussions)
- 📖 [Documentation](./docs/)

---

## 🎉 Success!

If you've reached this point and all tests pass, congratulations! Your Workflow Automation Platform is now running successfully.

### Next Steps:

1. **Login to Admin Panel**: Use the admin credentials you created
2. **Create Your First Workflow**: Try the visual editor
3. **Explore API Documentation**: Check out the REST API
4. **Set Up Monitoring**: Configure alerts and notifications
5. **Deploy to Production**: Follow the deployment guide

### Quick Access URLs:
- **API Health**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api-docs (if Swagger is enabled)
- **Monitoring Dashboard**: http://localhost:3000/api/monitoring/dashboard

**Happy Automating! 🚀**

---

<div align="center">

**Having issues?** Check our [Troubleshooting Section](#-troubleshooting) or [create an issue](https://github.com/yourusername/workflow-automation-platform/issues)

</div>