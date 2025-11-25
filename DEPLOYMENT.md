# Vercel Deployment Checklist

## Quick Start

### 1. Connect Repository
- [ ] Sign in to [Vercel](https://vercel.com)
- [ ] Click "New Project"
- [ ] Import your Git repository
- [ ] Select the repository

### 2. Configure Project
- [ ] Framework: Auto-detected (Next.js)
- [ ] Root Directory: `./` (default)
- [ ] Build Command: `npm run build` (auto-detected)
- [ ] Output Directory: `.next` (auto-detected)
- [ ] Install Command: `npm install` (auto-detected)

### 3. Set Environment Variables
Add these in Vercel Project Settings → Environment Variables:

**Required:**
- [ ] `NEXT_PUBLIC_API_URL` = `https://your-api-domain.com`

**Optional (if not using NEXT_PUBLIC_API_URL):**
- [ ] `NEXT_PUBLIC_API_HOST` = `your-api-domain.com`
- [ ] `NEXT_PUBLIC_API_PORT` = `8002` (or your port)

### 4. Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Verify deployment is successful

### 5. Post-Deployment
- [ ] Test the deployed application
- [ ] Verify API connections work
- [ ] Check console for any errors
- [ ] Set up custom domain (optional)

## Environment Variables Setup

### Via Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend-api.com`
   - Environment: Production, Preview, Development (select all)
3. Click "Save"
4. **Important:** Redeploy after adding/changing variables

### Via Vercel CLI:
```bash
# Add environment variable
vercel env add NEXT_PUBLIC_API_URL

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

## Common Issues & Solutions

### Build Fails
- **Issue:** Build command fails
- **Solution:** 
  - Check Node.js version (should be 18+)
  - Verify all dependencies are in package.json
  - Check build logs in Vercel dashboard

### API Connection Errors
- **Issue:** Frontend can't connect to backend
- **Solution:**
  - Verify `NEXT_PUBLIC_API_URL` is set correctly
  - Ensure backend API has CORS enabled for your Vercel domain
  - Check backend API is accessible from internet

### Environment Variables Not Working
- **Issue:** Variables not available in app
- **Solution:**
  - Variables must start with `NEXT_PUBLIC_` to be exposed to browser
  - Redeploy after adding/changing variables
  - Check variable names for typos

### 404 Errors on Routes
- **Issue:** Routes return 404 after deployment
- **Solution:**
  - Verify Next.js routing is configured correctly
  - Check `next.config.js` for any routing issues
  - Ensure all pages are in the `app/` directory

## Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Follow DNS configuration instructions:
   - Add CNAME record pointing to Vercel
   - Or add A record with Vercel's IP
4. Wait for DNS propagation (can take up to 48 hours)
5. SSL certificate is automatically provisioned

## Continuous Deployment

Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every pull request
- **Development:** Pushes to other branches (optional)

To disable auto-deployment:
- Go to Project Settings → Git
- Configure deployment settings

## Monitoring & Analytics

- View deployment logs in Vercel dashboard
- Check function logs for serverless functions
- Monitor performance in Analytics tab
- Set up error tracking (Sentry, etc.)

## Rollback

To rollback to a previous deployment:
1. Go to Deployments tab
2. Find the deployment you want to restore
3. Click the three dots menu
4. Select "Promote to Production"

## Useful Vercel CLI Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List all deployments
vercel ls

# Remove deployment
vercel rm [deployment-url]
```

