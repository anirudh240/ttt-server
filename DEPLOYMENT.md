# Deployment Guide

Your app is now **production-ready**! Here's how to deploy it.

## Quick Deployment Options

### Option 1: Deploy to Railway (Recommended - Easiest)

1. **Install Railway CLI**: `npm i -g @railway/cli`
2. **Login**: `railway login`
3. **Initialize**: `railway init`
4. **Deploy**: `railway up`
5. **Set Environment Variables** in Railway dashboard:
   - `NODE_ENV=production`
   - `CLIENT_URL=*` (or your frontend URL)
   - `REACT_APP_SOCKET_URL` (will be auto-set to Railway URL)

Railway automatically:
- Builds your React app
- Runs your server
- Handles environment variables

### Option 2: Deploy to Heroku

1. **Install Heroku CLI**
2. **Create Heroku app**: `heroku create your-app-name`
3. **Set buildpack**: `heroku buildpacks:set heroku/nodejs`
4. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set CLIENT_URL=*
   ```
5. **Deploy**: `git push heroku main`

**Important**: Add this to `package.json`:
```json
"engines": {
  "node": "18.x",
  "npm": "9.x"
}
```

### Option 3: Deploy to Render

1. **Create new Web Service** on Render
2. **Connect your GitHub repo**
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `NODE_ENV=production node server.js`
5. **Environment Variables**:
   - `NODE_ENV=production`
   - `CLIENT_URL=*`
   - `PORT=10000` (Render uses this port)

### Option 4: Separate Frontend/Backend (Vercel + Railway)

**Backend (Railway/Heroku)**:
- Deploy `server.js` only
- Set `CLIENT_URL` to your frontend URL

**Frontend (Vercel)**:
- Deploy React app
- Set `REACT_APP_SOCKET_URL` to your backend URL
- Build command: `npm run build`
- Output directory: `build`

## Environment Variables

Create a `.env` file for local development:

```env
# Backend
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Frontend
REACT_APP_SOCKET_URL=http://localhost:3001
```

For production, set these in your hosting platform's dashboard.

## Production Build

To test production build locally:

```bash
# Build React app
npm run build

# Start production server
npm run start:prod
```

The server will serve the React app from the `/build` directory.

## Important Notes

1. **CORS**: In production, set `CLIENT_URL` to your frontend URL or `*` for all origins
2. **Socket URL**: Frontend needs `REACT_APP_SOCKET_URL` pointing to your backend
3. **Port**: Most platforms set `PORT` automatically (Heroku, Railway, Render)
4. **Single Server**: The server serves both Socket.io and the React app in production

## Testing Production Build Locally

```bash
# Terminal 1: Build
npm run build

# Terminal 2: Start production server
NODE_ENV=production CLIENT_URL=http://localhost:3000 node server.js
```

Visit `http://localhost:3001` - both frontend and backend are served from one port!

