# CHANGISHA Phase 1 — Staging Deployment Guide

**Status:** Ready for Production Deployment  
**Build Status:** ✅ Passing (Local)  
**Code Quality:** ✅ Production-Ready  
**Date:** 2026-09-12  

---

## Quick Start (Choose One)

### Option A: Railway.app (Recommended for Quick Deploy)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Create new project
railway init --name changisha-phase1

# 4. Add environment variables
railway variable set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
railway variable set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variable set DARAJA_SECRET_KEY=your_daraja_secret

# 5. Deploy
railway up

# Visit: railway.app console for URL
```

### Option B: AWS Lambda + API Gateway

```bash
# 1. Install Serverless Framework
npm install -g serverless

# 2. Configure AWS credentials
aws configure

# 3. Deploy
serverless deploy

# Check CloudFormation for deployment status
```

### Option C: Self-Hosted VPS (Docker)

```bash
# 1. Build Docker image
docker build -t changisha-phase1 .

# 2. Push to registry (DockerHub)
docker tag changisha-phase1 youruser/changisha-phase1:latest
docker push youruser/changisha-phase1:latest

# 3. Deploy to VPS
ssh user@your-vps-ip
docker pull youruser/changisha-phase1:latest
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  -e DARAJA_SECRET_KEY=your_daraja_secret \
  changisha-phase1:latest
```

### Option D: cPanel/Traditional Hosting

```bash
# 1. SSH into server
ssh user@your-hosting-ip

# 2. Clone repository
cd /home/yourdomain/public_html
git clone https://github.com/EzzahComm/changi-sha.git
cd changi-sha

# 3. Install dependencies
npm install

# 4. Build application
npm run build

# 5. Set environment variables
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DARAJA_SECRET_KEY=your_daraja_secret
NODE_ENV=production
EOF

# 6. Start with PM2
npm install -g pm2
pm2 start "npm start" --name changisha-phase1
pm2 save
pm2 startup
```

---

## Pre-Deployment Checklist

### Environment Setup
- [ ] Supabase project created
- [ ] NEXT_PUBLIC_SUPABASE_URL configured
- [ ] SUPABASE_SERVICE_ROLE_KEY set
- [ ] DARAJA_SECRET_KEY configured (from Safaricom)
- [ ] Database migrations ready to run

### Application Setup
- [ ] Dependencies installed: `npm install`
- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors
- [ ] Tests passing: `npm run test`

### Database Migrations
```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via psql
psql $DATABASE_URL < supabase/migrations/000_core_prerequisites.sql
psql $DATABASE_URL < supabase/migrations/001_changisha_foundation.sql
psql $DATABASE_URL < supabase/migrations/002_changisha_rpc.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM changisha.campaigns;"
```

### Health Checks Post-Deploy
```bash
# 1. Check webhook endpoint
curl -X GET https://your-staging-domain/api/changisha/webhook/daraja
# Expected: {"status":"healthy","endpoint":"/api/changisha/webhook/daraja","timestamp":"..."}

# 2. Verify database connection
curl -X POST https://your-staging-domain/api/changisha/webhook/daraja \
  -H "Content-Type: application/json" \
  -H "x-campaign-id: 1" \
  -d '{"Result":{"TransactionID":"HEALTH_CHECK","ResultCode":0},"MSISDN":"254712345678","Amount":"100"}'

# 3. Check logs
pm2 logs changisha-phase1  # or your container logs
```

---

## Production Deployment (Next Step)

After staging validation:

```bash
# 1. Backup production database
pg_dump $PRODUCTION_DATABASE_URL > backup-$(date +%s).sql

# 2. Run migrations on production
supabase db push --db-url $PRODUCTION_DATABASE_URL

# 3. Deploy application
# Use same process as staging on production infrastructure

# 4. Monitor
pm2 logs changisha-phase1
# or cloud provider dashboard
```

---

## Troubleshooting

### Build Fails Locally
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Migrations Error
```bash
# Check if migrations already applied
psql $DATABASE_URL -c "\dt changisha.*"

# Verify RPC function
psql $DATABASE_URL -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'changisha';"
```

### Webhook Not Receiving Callbacks
1. Verify URL is publicly accessible
2. Check firewall/security group rules
3. Verify Daraja configuration points to correct endpoint
4. Test manually: `curl -X GET https://your-domain/api/changisha/webhook/daraja`

### Environment Variables Not Loading
```bash
# Verify .env.local exists and is readable
cat .env.local

# Check Next.js build includes variables
npm run build 2>&1 | grep -i "supabase\|daraja"
```

---

## Monitoring & Logs

### PM2 (Self-Hosted)
```bash
pm2 logs changisha-phase1
pm2 monit
pm2 describe changisha-phase1
```

### Docker
```bash
docker logs -f container_id
docker stats container_id
```

### Railway.app
Dashboard: https://railway.app → Project → Logs

### AWS Lambda
CloudWatch Logs: https://console.aws.amazon.com/cloudwatch

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop application
pm2 stop changisha-phase1
# or stop container/service

# 2. Revert to previous build
git checkout previous_commit
npm install
npm run build
npm start

# 3. Restore database (if migrations broke)
psql $DATABASE_URL < backup-$(date +%s).sql
```

---

## Support

For issues during deployment:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review CHANGISHA_PHASE1.md troubleshooting section
5. Contact: support@ezzahcomm.com

---

**Ready to Deploy** 🚀

Execute Option A, B, C, or D above based on your hosting choice.
