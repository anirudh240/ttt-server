# Deploying to Render

Render is perfect for this app because it supports WebSockets! You can deploy everything in one place.

## Option 1: Deploy Everything as One Service (Recommended)

This deploys both frontend and backend together - simplest approach!

### Steps:

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

2. **Go to Render Dashboard**: https://dashboard.render.com

3. **Click "New +" → "Web Service"**

4. **Connect your GitHub repository**

5. **Configure the service**:
   - **Name**: `tictactoe-live` (or any name you like)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `NODE_ENV=production node server.js`
   - **Plan**: Free (or paid if you want)

6. **Set Environment Variables** (IMPORTANT - set these BEFORE first deploy):
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render uses this port)
   - `CLIENT_URL` = `*` (or your Render URL - you can update later)
   - `REACT_APP_SOCKET_URL` = `https://your-service-name.onrender.com`
     - ⚠️ **Important**: Replace `your-service-name` with the actual service name you chose in step 4
     - This must be set BEFORE building because React env vars are baked into the build

7. **Click "Create Web Service"**

8. **Wait for first deploy** (takes 5-10 minutes)

9. **If you need to update `REACT_APP_SOCKET_URL`**:
   - Update it in Render dashboard
   - Trigger a **manual redeploy** (Render → Manual Deploy → Clear build cache & deploy)
   - React env vars require a rebuild to take effect

10. **Done!** Your app will be live at `https://your-app.onrender.com`

## Option 2: Use Render Blueprint (Easiest!)

If you have `render.yaml` in your repo:

1. **Push `render.yaml` to GitHub**

2. **Go to Render Dashboard** → "New +" → "Blueprint"

3. **Select your repository**

4. **Render will auto-configure everything!**

5. **Update environment variables** after first deploy (see step 8 above)

## Option 3: Deploy Frontend and Backend Separately

### Frontend (Static Site):

1. **New +** → **Static Site**
2. **Connect GitHub repo**
3. **Build**: `npm run build`
4. **Publish**: `build`
5. **Environment Variable**: `REACT_APP_SOCKET_URL` = your backend URL

### Backend (Web Service):

1. **New +** → **Web Service**
2. **Connect GitHub repo**
3. **Build**: `npm install` (no build needed for backend)
4. **Start**: `NODE_ENV=production node server.js`
5. **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `CLIENT_URL` = your frontend URL

## Important Notes

- ✅ **Free tier available** - but apps spin down after 15 min of inactivity
- ✅ **WebSocket support** - perfect for Socket.io!
- ✅ **Auto-deploy** from GitHub on push
- ⚠️ **First deploy takes 5-10 minutes**
- ⚠️ **Free tier has cold starts** (first request after inactivity is slow)
- ⚠️ **Update `REACT_APP_SOCKET_URL`** after first deploy with your actual URL

## Testing Locally Before Deploying

```bash
# Build
npm run build

# Test production
NODE_ENV=production PORT=10000 CLIENT_URL=http://localhost:3000 node server.js
```

## Troubleshooting

**Socket.io connection fails?**
- Make sure `REACT_APP_SOCKET_URL` matches your backend URL exactly
- Check that `CLIENT_URL` in backend matches your frontend URL (or is `*`)

**App not loading?**
- Check Render logs in dashboard
- Make sure build completed successfully
- Verify environment variables are set

**WebSocket errors?**
- Render free tier supports WebSockets, but there may be connection limits
- Check browser console for connection errors

## Quick Deploy Command (if using Render CLI)

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy
render deploy
```

