# SmashBoard Deployment Guide

This guide will walk you through deploying SmashBoard's backend API and frontend application.

## Architecture Overview

- **Frontend**: React PWA (Progressive Web App) - Can be deployed to GitHub Pages, Vercel, or Netlify
- **Backend**: Node.js + Express API - Deployed to Railway
- **Database**: PostgreSQL - Provided by Railway

---

## Backend Deployment (Railway)

### Step 1: Create Railway Account

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub (recommended for easy deployments)

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your SmashBoard repository
4. Railway will detect the `backend` folder

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automatically creates a PostgreSQL database and sets `DATABASE_URL` environment variable

### Step 4: Configure Environment Variables

In your Railway backend service, go to **Variables** and add:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-random-string-change-this
FRONTEND_URL=https://your-frontend-url.com
PORT=5000
```

**Important**:
- Generate a strong random string for `JWT_SECRET` (use a password generator)
- `DATABASE_URL` is automatically set by Railway
- Update `FRONTEND_URL` after deploying frontend

### Step 5: Set Root Directory

1. In Railway backend service settings, go to **"Settings"** → **"General"**
2. Set **Root Directory** to `backend`
3. Set **Start Command** to `npm start`

### Step 6: Deploy

1. Click **"Deploy"**
2. Railway will:
   - Install dependencies
   - Build the application
   - Start the server

### Step 7: Run Database Migrations

After deployment, you need to create database tables:

1. In Railway, go to your backend service
2. Open the **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"**
5. You can run migrations using Railway CLI or by adding a script

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migrations
railway run npm run migrate
```

**Option B: Temporary migration endpoint** (Remove after use!)

Add this to your `backend/src/server.js` temporarily:
```javascript
app.get('/setup-database', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const pool = require('./config/database');

    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'config/schema.sql'),
      'utf8'
    );

    await pool.query(schemaSQL);
    res.json({ message: 'Database setup complete!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then visit: `https://your-backend-url.railway.app/setup-database`

**Remember to remove this endpoint after setup!**

### Step 8: Get Your Backend URL

1. In Railway, your backend service will have a URL like: `https://smashboard-backend.up.railway.app`
2. Copy this URL - you'll need it for frontend configuration

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. Go to [Vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click **"New Project"**
4. Import your SmashBoard repository
5. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: Leave as `/` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
6. Add Environment Variable:
   - `REACT_APP_API_URL` = Your Railway backend URL (e.g., `https://smashboard-backend.up.railway.app`)
7. Click **"Deploy"**

### Option 2: Netlify

1. Go to [Netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub and select SmashBoard
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
5. Add Environment Variable:
   - `REACT_APP_API_URL` = Your Railway backend URL
6. Click **"Deploy site"**

### Option 3: GitHub Pages (Static Only)

**Note**: You need to update `package.json` homepage field first:

```json
{
  "homepage": "https://yourusername.github.io/SmashBoard"
}
```

Deploy:
```bash
npm run deploy
```

Then add environment variable by creating `.env.production`:
```
REACT_APP_API_URL=https://your-railway-backend-url.railway.app
```

---

## Post-Deployment Configuration

### Update CORS Settings

After deploying frontend, update your Railway backend environment variables:

```
FRONTEND_URL=https://your-frontend-vercel-app.vercel.app
```

This allows your frontend to communicate with the backend.

### Update Railway Backend URL in Frontend

If you need to redeploy frontend with updated backend URL:

1. Go to Vercel/Netlify dashboard
2. Update `REACT_APP_API_URL` environment variable
3. Trigger a redeploy

---

## Testing Your Deployment

1. Visit your frontend URL
2. Try to register a new account
3. Login with the account
4. Create a tournament
5. Add players
6. Verify data persists across sessions

---

## Local Development

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with your local database credentials
# For local PostgreSQL:
DATABASE_URL=postgresql://username:password@localhost:5432/smashboard
JWT_SECRET=local-dev-secret-key
FRONTEND_URL=http://localhost:3000

# Start PostgreSQL (if not running)
# macOS: brew services start postgresql
# Linux: sudo service postgresql start
# Windows: Use PostgreSQL installer

# Create database
psql postgres
CREATE DATABASE smashboard;
\q

# Run migrations
npm run migrate

# Start server
npm run dev
```

### Frontend Setup

```bash
# In root directory
npm install

# Create .env file
cp .env.example .env.local

# Edit .env.local
REACT_APP_API_URL=http://localhost:5000

# Start frontend
npm start
```

Visit: `http://localhost:3000`

---

## Troubleshooting

### Backend Issues

**Database Connection Error**
- Check `DATABASE_URL` is set correctly in Railway
- Verify PostgreSQL service is running
- Check Railway logs for specific error messages

**CORS Error**
- Verify `FRONTEND_URL` matches your actual frontend URL
- Check there's no trailing slash in URLs

**JWT Error**
- Ensure `JWT_SECRET` is set and is the same across deploys
- Clear browser localStorage and login again

### Frontend Issues

**Can't Connect to Backend**
- Verify `REACT_APP_API_URL` is set correctly
- Check browser console for specific errors
- Verify backend is deployed and running

**Environment Variables Not Working**
- Rebuild the application after changing env vars
- For Vercel/Netlify: Trigger a new deployment
- For local: Restart the dev server

---

## Monitoring & Maintenance

### Railway Monitoring

- View logs in Railway dashboard
- Set up notifications for deployment failures
- Monitor database usage (Railway shows metrics)

### Database Backups

Railway automatically backs up your PostgreSQL database. To manually backup:

1. Railway Dashboard → PostgreSQL service → Data tab
2. Use Railway CLI: `railway run pg_dump > backup.sql`

---

## Security Checklist

- [ ] Changed `JWT_SECRET` from default value
- [ ] Set `NODE_ENV=production` in Railway
- [ ] Removed `/setup-database` endpoint (if used)
- [ ] CORS configured with specific frontend URL (not `*`)
- [ ] HTTPS enabled on both frontend and backend
- [ ] Environment variables not committed to Git
- [ ] Strong passwords for production accounts

---

## Cost Estimates

### Railway
- **Free Tier**: $5 credit/month (sufficient for hobby projects)
- **Hobby Plan**: $5/month (500 hours execution time + PostgreSQL)
- **Estimated Cost**: $0-5/month for small-medium usage

### Vercel/Netlify
- **Free Tier**: Generous limits for personal projects
- **Estimated Cost**: $0/month for most use cases

### Total Estimated Monthly Cost: $0-5

---

## Support

If you encounter issues:

1. Check Railway logs: Railway Dashboard → Service → Deployments → View Logs
2. Check browser console: Press F12 → Console tab
3. Verify environment variables are set correctly
4. Review this deployment guide

---

## Next Steps

After successful deployment:

1. **Test thoroughly** - Create accounts, tournaments, add players
2. **Share with users** - Send them your frontend URL
3. **Monitor usage** - Check Railway metrics
4. **Consider upgrades** - If you exceed free tier limits

Congratulations! Your SmashBoard application is now live! 🎉
