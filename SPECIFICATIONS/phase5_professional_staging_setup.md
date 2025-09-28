# Phase 5: Professional Staging Environment Setup

## Overview

Implement a staging environment for final acceptance testing before production deployment. This provides a production-like environment for risk-free testing while maintaining cost efficiency by sharing the same database.

**Target Architecture:**
```
Development (localhost:8080)
    ↓
Staging (staging.restaurants.hultberg.org) - Same database
    ↓
Production (restaurants.hultberg.org) - Same database
```

## Benefits

✅ **Risk-free testing** of new features in production environment
✅ **Client demos** without affecting live production site
✅ **Performance testing** under real CloudFlare Workers conditions
✅ **Rollback confidence** - staging becomes "last known good" state
✅ **Professional workflow** - matches industry best practices

## Cost Analysis

- **CloudFlare Workers**: One additional worker (free tier sufficient)
- **Database**: Shared Supabase instance (no additional cost)
- **GitHub Actions**: Same runner minutes (free tier sufficient)
- **Domain**: Subdomain routing (no additional cost)
- **Total Additional Cost**: $0/month

## Implementation Steps

### Step 1: CloudFlare Workers Configuration

1. **Create Staging Worker**
   ```bash
   # Create new worker in CloudFlare dashboard
   # Name: wandering-paths-staging
   # Use same wrangler.toml as base
   ```

2. **Configure Staging Domain**
   ```bash
   # Add DNS record for staging subdomain
   # Type: CNAME
   # Name: staging
   # Target: wandering-paths-staging.herrings.workers.dev
   ```

3. **Create staging wrangler.toml**
   ```toml
   # wrangler.staging.toml
   name = "wandering-paths-staging"
   compatibility_date = "2025-01-01"
   compatibility_flags = ["nodejs_compat"]
   main = "./src/worker.js"

   [assets]
   directory = "./dist/client"

   [[routes]]
   pattern = "staging.restaurants.hultberg.org/"
   zone_name = "hultberg.org"

   [[routes]]
   pattern = "staging.restaurants.hultberg.org/*"
   zone_name = "hultberg.org"

   # Same environment variables as production
   [vars]
   SUPABASE_URL = "https://drtjfbvudzacixvqkzav.supabase.co"
   AUTHORIZED_ADMIN_EMAIL = "magnus.hultberg@gmail.com"
   ```

### Step 2: GitHub Actions Workflow

1. **Create Staging Deployment Workflow**
   ```yaml
   # .github/workflows/deploy-staging.yml
   name: Deploy to Staging

   on:
     push:
       branches:
         - staging
     workflow_dispatch: # Allow manual triggering

   jobs:
     deploy-staging:
       runs-on: ubuntu-latest
       name: Deploy to Staging Environment

       steps:
         - name: Checkout code
           uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Run linter
           run: npm run lint

         - name: Build application
           run: npm run build
           env:
             VITE_SUPABASE_URL: https://drtjfbvudzacixvqkzav.supabase.co
             VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
             VITE_AUTHORIZED_ADMIN_EMAIL: magnus.hultberg@gmail.com
             VITE_GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
             VITE_MAPBOX_ACCESS_TOKEN: ${{ secrets.MAPBOX_ACCESS_TOKEN }}

         - name: Set CloudFlare Workers secrets (staging)
           run: |
             echo ${{ secrets.SUPABASE_ANON_KEY }} | npx wrangler secret put SUPABASE_ANON_KEY --config wrangler.staging.toml
           env:
             CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

         - name: Deploy to CloudFlare Workers (staging)
           uses: cloudflare/wrangler-action@v3
           with:
             apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
             command: deploy --config wrangler.staging.toml

         - name: Staging Deployment Success
           run: |
             echo "🚀 Staging deployment completed successfully!"
             echo "📄 Asset references automatically synchronized"
             echo "🔍 Staging URL: https://staging.restaurants.hultberg.org"
   ```

2. **Update Production Workflow Name**
   ```yaml
   # .github/workflows/deploy.yml (rename to deploy-production.yml)
   name: Deploy to Production
   # ... rest stays the same
   ```

### Step 3: Git Branch Strategy

1. **Create Staging Branch**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. **Configure Branch Protection** (Optional but recommended)
   - Go to GitHub Settings → Branches
   - Add protection rule for `staging` branch
   - Require pull request reviews for staging
   - Add protection rule for `main` branch (production)

### Step 4: Development Workflow

#### Feature Development
```bash
# Start new feature
git checkout -b feature/new-functionality
# Make changes, commit frequently
git add . && git commit -m "Implement new functionality"
# Push feature branch (no deployment)
git push origin feature/new-functionality
```

#### Staging Deployment
```bash
# Deploy to staging for testing
git checkout staging
git merge feature/new-functionality
git push origin staging
# 🚀 Automatic staging deployment triggered
# Test at: https://staging.restaurants.hultberg.org
```

#### Production Deployment
```bash
# After staging acceptance testing
git checkout main
git merge staging
git push origin main
# 🚀 Automatic production deployment triggered
# Live at: https://restaurants.hultberg.org
```

### Step 5: Package.json Scripts (Optional)

Add convenience scripts for staging operations:

```json
{
  "scripts": {
    "deploy:staging": "wrangler deploy --config wrangler.staging.toml",
    "tail:staging": "wrangler tail --config wrangler.staging.toml",
    "build:staging": "npm run build && npm run deploy:staging"
  }
}
```

## Testing Strategy

### Staging Environment Testing Checklist

- [ ] **Authentication Flow**: Magic link login works correctly
- [ ] **Restaurant Management**: CRUD operations function properly
- [ ] **AI Extraction**: Restaurant extraction from URLs works
- [ ] **Maps Integration**: Mapbox maps load and function correctly
- [ ] **Search Functionality**: Text search and "Near Me" work
- [ ] **Mobile Responsiveness**: Test on mobile devices
- [ ] **Performance**: Check load times and responsiveness
- [ ] **Admin Panel**: All admin features accessible and functional

### Acceptance Testing Process

1. **Deploy to staging** via git push to staging branch
2. **Run through testing checklist** on staging.restaurants.hultberg.org
3. **Verify no regressions** in existing functionality
4. **Test new features** thoroughly in production-like environment
5. **Get stakeholder approval** (if applicable)
6. **Deploy to production** via git push to main branch

## Monitoring & Debugging

### Staging-Specific Monitoring
```bash
# Real-time staging logs
npx wrangler tail --config wrangler.staging.toml

# Staging deployment status
npx wrangler deploy --dry-run --config wrangler.staging.toml
```

### Environment Identification

Add environment indicator to staging (optional):
```javascript
// In staging build, add visual indicator
if (import.meta.env.MODE === 'staging') {
  // Add staging banner or styling
}
```

## Rollback Strategy

### Quick Rollback Options

1. **Staging Rollback**
   ```bash
   git checkout staging
   git reset --hard HEAD~1  # Go back one commit
   git push --force origin staging
   ```

2. **Production Rollback**
   ```bash
   git checkout main
   git reset --hard HEAD~1  # Go back one commit
   git push --force origin main
   ```

3. **Emergency Rollback**
   ```bash
   # Direct manual deployment of last known good version
   git checkout <last-good-commit>
   npm run build
   npx wrangler deploy  # Production
   npx wrangler deploy --config wrangler.staging.toml  # Staging
   ```

## Security Considerations

- **Same secrets** used for both staging and production (cost-effective)
- **Same database** ensures staging tests against real data structure
- **Branch protection** prevents accidental direct pushes to main
- **Audit trail** maintained through git history and GitHub Actions logs

## Migration from Current Setup

### Pre-Implementation Checklist

- [ ] Backup current production state
- [ ] Document current git workflow
- [ ] Test staging worker creation in CloudFlare
- [ ] Verify DNS configuration capabilities
- [ ] Confirm GitHub Actions runner capacity

### Implementation Timeline

**Estimated Time**: 2-3 hours total

1. **Hour 1**: CloudFlare Workers and DNS setup
2. **Hour 2**: GitHub Actions workflow configuration
3. **Hour 3**: Testing and validation

### Post-Implementation Validation

- [ ] Both environments deploy successfully
- [ ] Staging URL loads correctly
- [ ] Production URL unchanged and functional
- [ ] Git workflow operates as expected
- [ ] Team understands new process

## Future Enhancements

### Phase 5.1: Advanced Staging Features
- **Environment-specific analytics** tracking
- **Automated testing** integration (Playwright, etc.)
- **Performance monitoring** differences between environments
- **Staging-specific feature flags** for experimental features

### Phase 5.2: Database Considerations
If staging database separation becomes necessary:
- **Staging Supabase project** for complete isolation
- **Data synchronization** scripts for staging refresh
- **Staging-specific test data** generation

## Conclusion

This staging environment setup provides professional-grade deployment confidence with minimal additional complexity or cost. The shared database approach maintains simplicity while providing the key benefit of production-like testing.

The implementation follows industry best practices and scales well for future team growth or increased deployment frequency.

---

**Next Steps**: When ready to implement, follow Step 1 (CloudFlare Workers Configuration) and proceed sequentially through all steps.