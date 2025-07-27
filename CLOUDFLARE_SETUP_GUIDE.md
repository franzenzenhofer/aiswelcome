# Complete Cloudflare Stack Setup Guide for AISWelcome

This guide will walk you through setting up the complete Cloudflare stack for AISWelcome, including D1, KV, R2, and proper API token permissions.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [API Token Setup](#api-token-setup)
3. [D1 Database Setup](#d1-database-setup)
4. [KV Namespace Setup](#kv-namespace-setup)
5. [R2 Bucket Setup](#r2-bucket-setup)
6. [Durable Objects Setup](#durable-objects-setup)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Cloudflare account with Workers paid plan ($5/month)
- Node.js 18+ and pnpm installed
- Wrangler CLI installed (`npm install -g wrangler`)
- Domain configured in Cloudflare (e.g., franzai.com)

## API Token Setup

Your current API token lacks D1 and R2 permissions. Here's how to create a proper token:

### Step 1: Create a New API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Custom token" template

### Step 2: Configure Token Permissions

Add these permissions to your token:

```
Account Permissions:
├── Account:Cloudflare Workers Scripts:Edit
├── Account:Cloudflare Workers KV Storage:Edit
├── Account:Cloudflare Workers R2 Storage:Edit
├── Account:D1:Edit
├── Account:Workers Tail:Read
└── Account:Account Settings:Read

Zone Permissions:
├── Zone:Zone:Read
├── Zone:Workers Routes:Edit
└── Zone:DNS:Read
```

### Step 3: Configure Account Resources

- Include: All accounts (or specifically: Franz.enzenhofer@fullstackoptimization.com's Account)
- Zone Resources: All zones

### Step 4: Save and Test Token

```bash
# Export the new token
export CLOUDFLARE_API_TOKEN="your-new-token-here"

# Test it
wrangler whoami
```

## D1 Database Setup

### Step 1: Create D1 Database

```bash
# Create the database
wrangler d1 create aiswelcome-db

# Output will show:
# ✅ Successfully created DB 'aiswelcome-db' in region WEUR
# Created your database using D1's new storage backend.
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "aiswelcome-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 2: Update wrangler.toml

Add the D1 binding to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "aiswelcome-db"
database_id = "your-database-id-here"
```

### Step 3: Run Database Migration

```bash
# Execute the schema
wrangler d1 execute aiswelcome-db --file=./schema.sql

# Or if running locally first:
wrangler d1 execute aiswelcome-db --local --file=./schema.sql
```

### Step 4: Verify Database

```bash
# List tables
wrangler d1 execute aiswelcome-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check admin user
wrangler d1 execute aiswelcome-db --command="SELECT * FROM users WHERE username='franz';"
```

## KV Namespace Setup

### Step 1: Create KV Namespace (Already Done!)

```bash
# You already have this created
# KV namespace "SESSIONS" with ID: b56e1bb7a5c747e5925d3ae8f18511f3

# To create additional namespaces:
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "UPLOADS"
```

### Step 2: Add to wrangler.toml

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "b56e1bb7a5c747e5925d3ae8f18511f3"

[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-namespace-id"

[[kv_namespaces]]
binding = "UPLOADS"
id = "your-uploads-namespace-id"
```

## R2 Bucket Setup

### Step 1: Enable R2 in Dashboard

1. Go to https://dash.cloudflare.com
2. Select your account
3. Click on "R2" in the sidebar
4. Click "Enable R2" if not already enabled
5. Accept the terms

### Step 2: Create R2 Bucket via CLI

```bash
# Once R2 is enabled in dashboard
wrangler r2 bucket create aiswelcome-uploads
wrangler r2 bucket create aiswelcome-avatars
```

### Step 3: Add to wrangler.toml

```toml
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "aiswelcome-uploads"

[[r2_buckets]]
binding = "AVATARS"
bucket_name = "aiswelcome-avatars"
```

### Step 4: Configure CORS (Optional)

Create `cors.json`:

```json
[
  {
    "AllowedOrigins": ["https://aiswelcome.franzai.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply CORS:

```bash
wrangler r2 bucket cors put aiswelcome-uploads --rules cors.json
```

## Durable Objects Setup

Already configured in your wrangler.toml:

```toml
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]
```

## Complete wrangler.toml Example

```toml
name = "aiswelcome"
main = "apps/worker/src/index.ts"
compatibility_date = "2025-07-26"
compatibility_flags = ["nodejs_compat"]

# Routes
[[routes]]
pattern = "aiswelcome.franzai.com/*"
zone_name = "franzai.com"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "aiswelcome-db"
database_id = "your-d1-database-id"

# KV Namespaces
[[kv_namespaces]]
binding = "SESSIONS"
id = "b56e1bb7a5c747e5925d3ae8f18511f3"

[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-namespace-id"

# R2 Buckets
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "aiswelcome-uploads"

[[r2_buckets]]
binding = "AVATARS"
bucket_name = "aiswelcome-avatars"

# Durable Objects
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]

# Environment Variables
[vars]
ENVIRONMENT = "production"
```

## Deployment

### Step 1: Update Environment Interface

Update `apps/worker/src/index.ts`:

```typescript
export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  UPLOADS: R2Bucket;
  AVATARS: R2Bucket;
  RATE_LIMITER: DurableObjectNamespace;
  ENVIRONMENT: string;
}
```

### Step 2: Deploy

```bash
# Run tests first
npm run test:all

# Deploy
npm run deploy
```

## Troubleshooting

### Authentication Error [code: 10000]

Your API token lacks permissions. Create a new token with all required permissions listed above.

### R2 Not Enabled Error

You must enable R2 through the Cloudflare Dashboard first before creating buckets via CLI.

### D1 Location Error

If you get "Please select a location for your database", use:

```bash
wrangler d1 create aiswelcome-db --location=weur
```

Available locations: wnam, enam, weur, eeur, apac, oc

### KV Write Limits

- Max value size: 25 MiB
- Max key size: 512 bytes
- Expiration TTL: 60 seconds minimum

### R2 Limits

- Max object size: 5 TB (multipart required for >5 GB)
- Max upload parts: 10,000
- Request timeout: 30 seconds

## Testing Each Service

### Test D1

```bash
# Insert test data
wrangler d1 execute aiswelcome-db --command="INSERT INTO users (username, password_hash, email) VALUES ('testuser', 'hash', 'test@example.com');"

# Query
wrangler d1 execute aiswelcome-db --command="SELECT * FROM users WHERE username='testuser';"
```

### Test KV

```bash
# Write
wrangler kv:key put --binding=SESSIONS "test-key" "test-value"

# Read
wrangler kv:key get --binding=SESSIONS "test-key"

# Delete
wrangler kv:key delete --binding=SESSIONS "test-key"
```

### Test R2

```bash
# Upload
echo "Hello R2" > test.txt
wrangler r2 object put aiswelcome-uploads/test.txt --file=test.txt

# List
wrangler r2 object list aiswelcome-uploads

# Download
wrangler r2 object get aiswelcome-uploads/test.txt

# Delete
wrangler r2 object delete aiswelcome-uploads/test.txt
```

## Migration Path

1. **Phase 1** (Current): KV for sessions, in-memory for data
2. **Phase 2**: Add D1 for persistent data storage
3. **Phase 3**: Add R2 for file uploads
4. **Phase 4**: Add Cloudflare Queues for async tasks
5. **Phase 5**: Add Analytics Engine for metrics

## Cost Estimation

- **Workers**: $5/month (includes 10M requests)
- **D1**: Free tier includes 5GB storage, 5M rows read/month
- **KV**: Free tier includes 100k reads/day, 1k writes/day
- **R2**: $0.015/GB stored, $0.36/million Class A operations
- **Durable Objects**: $0.15/million requests

## Security Best Practices

1. **API Token**: Never commit to git, use environment variables
2. **Secrets**: Use `wrangler secret put` for sensitive data
3. **CORS**: Configure properly for your domain
4. **Rate Limiting**: Already implemented via Durable Objects
5. **Input Validation**: Always validate user input

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)

## Next Steps

1. Create new API token with full permissions
2. Enable R2 in Cloudflare Dashboard
3. Create D1 database with new token
4. Create R2 buckets
5. Update code to use D1 instead of in-memory storage
6. Deploy and test

Remember to always test locally first:

```bash
wrangler dev --local --persist
```

This will use local versions of D1, KV, and R2 for development.