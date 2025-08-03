# NFT Marketplace Deployment Guide

This guide covers deploying the NFT marketplace to production environments.

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+
- Domain name with SSL certificate
- Ethereum node access (Infura/Alchemy)
- IPFS access (Pinata account)
- Email service (Gmail/SendGrid)

## 🚀 Quick Deployment

### 1. Environment Setup

```bash
# Clone repository
git clone <repository-url>
cd nft-marketplace

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp contracts/.env.example contracts/.env

# Configure environment variables (see below)
```

### 2. Smart Contract Deployment

```bash
# Install dependencies
cd contracts
npm install

# Deploy to testnet (Sepolia)
npm run deploy:sepolia

# Deploy to mainnet (when ready)
npm run deploy:mainnet

# Note the deployed contract addresses
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Setup database
cd backend
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### 4. Application Deployment

```bash
# Build all applications
npm run build

# Start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Detailed Configuration

### Backend Environment Variables

```env
# Production settings
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:password@host:5432/nft_marketplace"

# Security
JWT_SECRET="your-super-secret-jwt-key-256-bits-minimum"
JWT_REFRESH_SECRET="your-refresh-secret-key-256-bits-minimum"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Redis
REDIS_URL="redis://your-redis-host:6379"
REDIS_PASSWORD="your-redis-password"

# IPFS (Pinata)
PINATA_API_KEY="your-pinata-api-key"
PINATA_SECRET_API_KEY="your-pinata-secret"
PINATA_JWT="your-pinata-jwt"

# AWS S3 (backup storage)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="nft-marketplace-files"

# Email
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Blockchain
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/your-project-id"
CONTRACT_ADDRESS="your-deployed-contract-address"
USDT_CONTRACT_ADDRESS="0xdAC17F958D2ee523a2206206994597C13D831ec7"

# Security
ALLOWED_ORIGINS="https://your-domain.com"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD="secure-admin-password"
```

### Frontend Environment Variables

```env
REACT_APP_API_URL="https://api.your-domain.com"
REACT_APP_WALLET_CONNECT_PROJECT_ID="your-walletconnect-project-id"
REACT_APP_NETWORK_CHAIN_ID="1"
REACT_APP_CONTRACT_ADDRESS="your-deployed-contract-address"
REACT_APP_USDT_CONTRACT_ADDRESS="0xdAC17F958D2ee523a2206206994597C13D831ec7"
```

## 🏗️ Infrastructure Deployment

### AWS Deployment

#### 1. EC2 Setup

```bash
# Launch EC2 instance (t3.medium or larger)
# Install Docker and Docker Compose
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. RDS Database

```bash
# Create PostgreSQL RDS instance
# - Engine: PostgreSQL 14+
# - Instance class: db.t3.micro (dev) or db.t3.small+ (prod)
# - Storage: 20GB minimum, encrypted
# - Multi-AZ: enabled for production
# - Backup retention: 7+ days
```

#### 3. ElastiCache Redis

```bash
# Create Redis ElastiCache cluster
# - Engine: Redis 6.2+
# - Node type: cache.t3.micro (dev) or larger
# - Multi-AZ: enabled for production
```

#### 4. S3 Storage

```bash
# Create S3 bucket for file storage
# - Versioning: enabled
# - Encryption: enabled
# - Public access: blocked
# - CORS: configured for frontend domain
```

### Digital Ocean Deployment

#### 1. Droplet Setup

```bash
# Create droplet (2GB RAM minimum)
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker $USER
```

#### 2. Managed Database

```bash
# Create managed PostgreSQL database
# - Version: 14+
# - Size: Basic plan or higher
# - Backups: enabled
```

### Vercel/Netlify Frontend

```bash
# Connect GitHub repository
# Configure build settings:
# - Build command: npm run build
# - Publish directory: build
# - Environment variables: see frontend env vars above
```

## 🔒 Security Hardening

### 1. SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### 2. Firewall Configuration

```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/nft-marketplace
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Database Security

```sql
-- Create restricted database user
CREATE USER nft_marketplace_app WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE nft_marketplace TO nft_marketplace_app;
GRANT USAGE ON SCHEMA public TO nft_marketplace_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nft_marketplace_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nft_marketplace_app;
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
```

### 2. Log Aggregation

```bash
# ELK Stack or use managed services like:
# - AWS CloudWatch
# - Digital Ocean Monitoring
# - Datadog
# - New Relic
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/nft-marketplace
            git pull origin main
            docker-compose -f docker-compose.prod.yml up -d --build
```

## 🧪 Testing Deployment

### 1. Health Checks

```bash
# Backend health
curl https://api.your-domain.com/health

# Frontend accessibility
curl https://your-domain.com

# Database connectivity
psql $DATABASE_URL -c "SELECT 1;"
```

### 2. Load Testing

```bash
# Install Artillery
npm install -g artillery

# Run load tests
artillery run load-test.yml
```

### 3. Security Testing

```bash
# SSL Labs test
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Security headers
curl -I https://your-domain.com
```

## 🚨 Backup & Recovery

### 1. Database Backups

```bash
# Automated daily backups
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_${DATE}.sql
aws s3 cp backup_${DATE}.sql s3://your-backup-bucket/
```

### 2. File Storage Backups

```bash
# IPFS backup strategy
# - Pin important files to multiple IPFS nodes
# - Regular S3 backups of metadata
# - Monitor pin status
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
  nginx:
    image: nginx:alpine
    depends_on:
      - backend
```

### 2. Database Scaling

```bash
# Read replicas for PostgreSQL
# Redis Cluster for session storage
# CDN for static assets
```

### 3. Performance Optimization

```bash
# Database indexing
# API response caching
# Image optimization
# Code splitting
# Lazy loading
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check firewall rules

2. **Smart Contract Interaction Failed**
   - Verify contract address
   - Check RPC endpoint
   - Validate wallet connection

3. **File Upload Issues**
   - Check IPFS/Pinata configuration
   - Verify S3 permissions
   - Check file size limits

4. **Email Delivery Problems**
   - Verify SMTP credentials
   - Check spam filters
   - Test email templates

### Support

- Documentation: `/docs`
- Health Check: `/health`
- API Status: `/api/docs`
- Logs: `docker-compose logs -f`

## 📞 Contact

For deployment assistance, contact the development team or create an issue in the repository.