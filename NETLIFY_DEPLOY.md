# Deploying to Netlify

Since Netlify only hosts static sites and doesn't support WebSocket connections (needed for Socket.io), you'll need to:

1. **Deploy Frontend to Netlify** (this guide)
2. **Deploy Backend separately** (Railway, Heroku, or Render)

## Step 1: Deploy Frontend to Netlify

### Option A: Using Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Build your app**:
   ```bash
   npm run build
   ```

4. **Deploy**:
   ```bash
   netlify deploy --prod --dir=build
   ```

### Option B: Using Netlify Dashboard (Recommended)

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Go to Netlify**: https://app.netlify.com

3. **Click "Add new site" → "Import an existing project"**

4. **Connect to GitHub** and select your repository

5. **Configure build settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
   - **Base directory**: (leave empty)

6. **Set Environment Variables**:
   - Go to Site settings → Environment variables
   - Add: `REACT_APP_SOCKET_URL` = `https://your-backend-url.com`
     (You'll get this URL after deploying the backend)

7. **Deploy!**

## Step 2: Deploy Backend (Required!)

The backend MUST be deployed separately because Netlify can't run Socket.io.

### Quick Backend Deployment Options:

#### Option 1: Railway (Easiest)
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

Set environment variables in Railway:
- `NODE_ENV=production`
- `CLIENT_URL=https://your-netlify-app.netlify.app`
- `PORT` (auto-set by Railway)

#### Option 2: Render
1. Create new Web Service
2. Connect GitHub repo
3. Build: `npm install && npm run build`
4. Start: `NODE_ENV=production node server.js`
5. Set `CLIENT_URL` to your Netlify URL

#### Option 3: Heroku
```bash
heroku create your-backend-name
heroku config:set NODE_ENV=production
heroku config:set CLIENT_URL=https://your-netlify-app.netlify.app
git push heroku main
```

## Step 3: Update Frontend Environment Variable

After deploying the backend:

1. **Get your backend URL** (e.g., `https://your-app.railway.app`)

2. **Update Netlify environment variable**:
   - Go to Netlify dashboard → Site settings → Environment variables
   - Update `REACT_APP_SOCKET_URL` to your backend URL
   - Trigger a new deploy

## Important Notes

- ✅ Frontend: Netlify (static hosting)
- ✅ Backend: Railway/Heroku/Render (WebSocket support)
- ⚠️ Both must be deployed for the app to work
- ⚠️ Update `REACT_APP_SOCKET_URL` in Netlify after backend is deployed
- ⚠️ Update `CLIENT_URL` in backend to your Netlify URL

## Testing Locally Before Deploying

1. **Start backend**:
   ```bash
   npm run server
   ```

2. **Build frontend**:
   ```bash
   npm run build
   ```

3. **Test production build**:
   ```bash
   npm run start:prod
   ```

Visit `http://localhost:3001` to test!

