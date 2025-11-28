# 🚀 Vehicle Management System - Deployment Guide

This guide will help you deploy the Vehicle Management System to Vercel (frontend) and Render (backend).

## 📋 Prerequisites

✅ Git repository (GitHub/GitLab)  
✅ [Vercel Account](https://vercel.com) (Free)  
✅ [Render Account](https://render.com) (Free)  
✅ MongoDB Atlas database (already configured)

---

## 🔧 Quick Fixes Applied

### ✅ Fixed Peer Dependency Issue
- **Problem**: `react-leaflet@5.0.0` required React 19, but project uses React 18
- **Solution**: Downgraded to `react-leaflet@4.2.1` (compatible with React 18)
- **Added**: `.npmrc` file with `legacy-peer-deps=true` for npm compatibility

---

## 🖥️ Backend Deployment (Render)

### Step 1: Deploy Backend to Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. Click **"New +"** → **"Web Service"**
3. **Connect your Git repository**

4. **Configure the service**:
   ```
   Name: vehicle-management-backend
   Root Directory: backend
   Environment: Node
   Branch: main (or your default branch)
   Build Command: npm install
   Start Command: npm start
   ```

5. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://srkulkarni196974_db_user:passwordgotilla@cluster0.vkvkwrq.mongodb.net/vehicle_sampa?appName=Cluster0
   JWT_SECRET=c96dd3de0c1ca4f5ffb9939b7478e591
   EMAIL_USER=srkulkarni1969.74@gmail.com
   EMAIL_PASS=dpqe afvn aemt qngc
   NODE_ENV=production
   ```

6. Click **"Create Web Service"**

7. **Wait for deployment** (usually 2-5 minutes)

8. **Copy your backend URL** (e.g., `https://vehicle-management-backend.onrender.com`)

### Step 2: Update Backend CORS

Before deploying frontend, update `backend/server.js` to allow your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app-name.vercel.app', // Add your Vercel URL here
    'https://*.vercel.app' // Or allow all Vercel subdomains
  ],
  credentials: true
}));
```

Commit and push this change to trigger a new Render deployment.

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. Click **"Add New..."** → **"Project"**
3. **Import your Git repository**

4. **Configure the project**:
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

5. **Add Environment Variable**:
   - Click **"Environment Variables"**
   - Add:
     ```
     Name: VITE_API_URL
     Value: https://vehicle-management-backend.onrender.com
     ```
     (Use your actual Render backend URL from Step 1)

6. Click **"Deploy"**

7. **Wait for deployment** (usually 1-2 minutes)

### Step 2: Test Your Deployment

Once deployed, Vercel will give you a URL like `https://your-app-name.vercel.app`

1. Open the URL
2. Try logging in
3. Test vehicle management features
4. Check real-time tracking

---

## 🔍 Troubleshooting

### ❌ "npm install" fails with peer dependency error
**Solution**: Already fixed! The `.npmrc` file and downgraded `react-leaflet` version should resolve this.

### ❌ CORS errors in browser console
**Solution**: 
1. Update `backend/server.js` CORS configuration with your Vercel URL
2. Redeploy backend on Render

### ❌ API calls returning 404
**Solution**:
1. Verify `VITE_API_URL` is set correctly in Vercel
2. Check backend is running on Render
3. Test backend URL directly in browser: `https://your-backend.onrender.com/api/health`

### ❌ MongoDB connection errors
**Solution**:
1. Go to MongoDB Atlas
2. Navigate to "Network Access"
3. Add IP: `0.0.0.0/0` (allow from anywhere)
4. Restart Render service

### ❌ Environment variables not working
**Solution**:
1. In Vercel: Settings → Environment Variables → Check values
2. In Render: Environment → Check values
3. **Important**: Redeploy after changing environment variables

---

## 🔄 Updating Your Deployment

### For Code Changes:
1. Make changes locally
2. Commit and push to Git:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
3. **Automatic**: Both Vercel and Render will auto-deploy on push! 🎉

### For Environment Variable Changes:
- **Render**: Dashboard → Environment → Add/Edit → Save (triggers redeploy)
- **Vercel**: Settings → Environment Variables → Add/Edit → Redeploy

---

## 📊 Post-Deployment Checklist

- [ ] Backend is accessible (test: `https://your-backend.onrender.com`)
- [ ] Frontend loads without errors
- [ ] Login/Authentication works
- [ ] Vehicle CRUD operations work
- [ ] Real-time tracking displays
- [ ] Email notifications send (test OTP)
- [ ] File uploads work
- [ ] MongoDB connection stable

---

## 🎯 Performance Tips

### Render Free Tier
- **Cold starts**: Free services sleep after 15 min of inactivity
- **Solution**: Use a cron job to ping your backend every 10 minutes
- **Upgrade**: Paid tier ($7/month) for always-on service

### MongoDB Atlas
- **Current plan**: Ensure you're on M0 (free tier)
- **Monitor**: Check database size doesn't exceed 512MB
- **Optimize**: Add indexes for frequently queried fields

---

## 🔐 Security Recommendations (Before Going Live)

1. **Change JWT Secret**: Generate a new random secret
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use App-Specific Email Password**: 
   - Don't use your actual Gmail password
   - Generate app password: [Google Account Settings](https://myaccount.google.com/apppasswords)

3. **Secure MongoDB**:
   - Limit IP access if possible
   - Use strong database password
   - Enable MongoDB Atlas encryption

4. **Add Rate Limiting**: Install `express-rate-limit` in backend

5. **Enable HTTPS Only**: Force HTTPS in production

---

## 📱 Custom Domain (Optional)

### Vercel
1. Buy a domain (Namecheap, GoDaddy, etc.)
2. Vercel Dashboard → Your Project → Settings → Domains
3. Add your domain and follow DNS instructions

### Render
1. Render Dashboard → Your Service → Settings → Custom Domain
2. Add domain and configure DNS

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com

---

## 🎉 Your URLs

After deployment, update these:

**Frontend (Vercel)**: `https://your-app-name.vercel.app`  
**Backend (Render)**: `https://vehicle-management-backend.onrender.com`

Save these URLs and share your application! 🚀
