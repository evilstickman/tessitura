#!/bin/bash
set -euo pipefail

SERVER="root@159.223.198.58"
APP_DIR="/home/tessitura/app"

echo "=== Deploying Tessitura ==="

# Sync code to server
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.git' \
  --exclude 'test-results' \
  --exclude 'playwright-report' \
  --exclude '.next' \
  -e ssh \
  ./ ${SERVER}:${APP_DIR}/

# Build and restart on server
ssh ${SERVER} << 'REMOTE'
set -euo pipefail
cd /home/tessitura/app

# Install dependencies (before sourcing .env so NODE_ENV=production doesn't skip devDeps)
npm ci

# Load environment variables for database access (after npm ci, before prisma)
set -a
source /home/tessitura/.env
set +a

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build Next.js
npm run build

# Fix ownership
chown -R tessitura:tessitura /home/tessitura/app

# Restart service
systemctl restart tessitura-next
echo "=== Deploy complete ==="
REMOTE
