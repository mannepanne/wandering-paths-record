# GitHub Actions Automated Deployment Setup

This document explains how to configure automated deployment to CloudFlare Workers using GitHub Actions.

## Overview

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:
1. Builds the application with asset reference synchronization
2. Runs linting to catch issues
3. Deploys to CloudFlare Workers
4. Ensures asset references are always correct

**Triggers**:
- Automatic deployment on pushes to `main` branch
- Manual deployment via GitHub Actions UI

## Required GitHub Secrets

You need to configure two secrets in your GitHub repository:

### 1. CLOUDFLARE_API_TOKEN

**How to create:**
1. Go to [Cloudflare Dashboard > My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Custom token" option (the "Edit Cloudflare Workers" template may be outdated)
4. Configure permissions:
   - **Account**:
     - `Workers Scripts:Edit`
     - `Workers KV Storage:Edit` (if using KV)
     - `Workers Routes:Edit` (for custom domain routing)
   - **Zone**: `Zone:Read` (for your domain)
5. **Account Resources**: Include your specific account
6. **Zone Resources**: Include `hultberg.org` (if using custom domain)
7. Copy the generated token

**Alternative**: If you see an "Edit Cloudflare Workers" template, you can try that first, but it may not include all necessary permissions.

### 2. CLOUDFLARE_ACCOUNT_ID

**How to find:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. In the right sidebar, copy the "Account ID"

## Setting GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click "New repository secret"
4. Add both secrets:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: [your API token]
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: [your account ID]

## Security Best Practices

- **Minimal Permissions**: API token only has Workers edit permissions
- **Account Restrictions**: Token restricted to your specific account
- **Zone Restrictions**: Token restricted to your domain only
- **GitHub Secrets**: Tokens encrypted and only accessible to workflows

## Workflow Features

### Automatic Asset Synchronization
The workflow runs `npm run build` which automatically:
- Builds the Vite application
- Runs `scripts/update-worker-assets.js` to sync asset references
- Ensures CloudFlare Worker HTML uses correct asset hashes

### Quality Checks
- Runs `npm run lint` before deployment
- Prevents deployment of code with linting errors
- Uses `npm ci` for reliable dependency installation

### Deployment Verification
- Clear success messages with production URL
- Confirms asset reference synchronization completed
- Links to live application for immediate testing

## Usage

### Automatic Deployment
Simply push changes to the `main` branch:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

The workflow will automatically:
1. Check out your code
2. Install dependencies
3. Run linting
4. Build with asset sync
5. Deploy to production

### Manual Deployment
1. Go to **Actions** tab in GitHub
2. Select "Deploy to CloudFlare Workers"
3. Click "Run workflow"
4. Choose the `main` branch
5. Click "Run workflow"

## Monitoring

### GitHub Actions
- View deployment progress in the **Actions** tab
- Check logs for any build or deployment issues
- Monitor deployment duration and success rates

### CloudFlare Workers
- Monitor production logs: `npx wrangler tail`
- Check CloudFlare Dashboard for deployment status
- Verify custom domain routing works correctly

## Troubleshooting

### Common Issues

**Build Failures:**
- Check linting errors in the workflow logs
- Ensure all dependencies are properly installed
- Verify `package-lock.json` is committed

**Deployment Failures:**
- Verify GitHub secrets are correctly configured
- Check CloudFlare API token permissions
- Ensure account ID matches your CloudFlare account

**Asset Reference Issues:**
- The workflow automatically handles asset synchronization
- No manual intervention should be needed
- If issues persist, check `scripts/update-worker-assets.js` logs

### Manual Fallback
If GitHub Actions fails, you can still deploy manually:
```bash
npm run build
npx wrangler deploy
```

## Benefits

✅ **Zero Manual Deployment**: Push to `main` = automatic production deployment
✅ **Asset Sync Guaranteed**: No more MIME type or 404 errors from stale references
✅ **Quality Gates**: Linting prevents broken code from reaching production
✅ **Fast Feedback**: Know immediately if deployment succeeds or fails
✅ **Secure**: API tokens stored safely in GitHub secrets
✅ **Auditable**: Complete deployment history in GitHub Actions

---

**Next Steps**: Configure the GitHub secrets and push a test commit to `main` to verify the automated deployment works correctly.