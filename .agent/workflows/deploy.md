---
description: Deploy the Vehicle Management System
---

# Vehicle Management System Deployment Guide

This guide covers deploying both the **frontend** (React + Vite) and **backend** (Node.js + Express + MongoDB) of the Vehicle Management System.

## Prerequisites

1. **MongoDB Atlas**: Your database is already configured at `mongodb+srv://srkulkarni196974_db_user:passwordgotilla@cluster0.vkvkwrq.mongodb.net/vehicle_sampa`
2. **Git Repository**: Ensure your code is in a Git repository
3. **Environment Variables**: Keep your sensitive data secure

---

## Option 1: Deploy to Render (Recommended for Full-Stack)

### Backend Deployment on Render

1. **Create a Render account** at https://render.com

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository
   - Configure the service:
     - **Name**: `vehicle-management-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Add Environment Variables** in Render dashboard:
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://srkulkarni196974_db_user:passwordgotilla@cluster0.vkvkwrq.mongodb.net/vehicle_sampa?appName=Cluster0
   JWT_SECRET=c96dd3de0c1ca4f5ffb9939b7478e591
   EMAIL_USER=srkulkarni1969.74@gmail.com
   EMAIL_PASS=dpqe afvn aemt qngc
   ```

4. **Note the deployed URL** (e.g., `https://vehicle-management-backend.onrender.com`)

### Frontend Deployment on Render

1. **Update the API URL** in frontend:
   - Create/update `src/config.ts`:
   ```typescript
   export const API_URL = import.meta.env.VITE_API_URL || 'https://vehicle-management-backend.onrender.com';
   ```
   - Update all API calls to use this config

2. **Create a new Static Site** on Render:
   - Click "New +" → "Static Site"
   - Connect your repository
   - Configure:
     - **Name**: `vehicle-management-frontend`
     - **Root Directory**: `.` (root)
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`

3. **Add Environment Variable**:
   ```
   VITE_API_URL=https://vehicle-management-backend.onrender.com
   ```

---

## Option 2: Deploy to Vercel (Frontend) + Render (Backend)

### Backend on Render
Follow the Backend Deployment steps from Option 1.

### Frontend on Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your Git repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `./`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Add Environment Variables** in Vercel:
   ```
   VITE_API_URL=https://vehicle-management-backend.onrender.com
   ```

4. **Deploy** and note the URL

---

## Option 3: Deploy to Railway (Full-Stack)

### Backend on Railway

1. **Create a Railway account** at https://railway.app

2. **Create a new project**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure Backend Service**:
   - Add a new service → select your repo
   - **Root Directory**: `backend`
   - Railway will auto-detect Node.js
   - **Start Command**: `npm start`

4. **Add Environment Variables**:
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://srkulkarni196974_db_user:passwordgotilla@cluster0.vkvkwrq.mongodb.net/vehicle_sampa?appName=Cluster0
   JWT_SECRET=c96dd3de0c1ca4f5ffb9939b7478e591
   EMAIL_USER=srkulkarni1969.74@gmail.com
   EMAIL_PASS=dpqe afvn aemt qngc
   ```

5. **Generate a domain** for the backend service

### Frontend on Railway

1. **Add another service** to the same project

2. **Configure Frontend Service**:
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run preview`

3. **Add Environment Variable**:
   ```
   VITE_API_URL=https://your-backend-service.railway.app
   ```

---

## Pre-Deployment Checklist

### 1. Update CORS Settings in Backend

Edit `backend/server.js` to allow your frontend domain:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.vercel.app',
    'https://your-frontend-domain.onrender.com',
    'https://your-frontend-domain.railway.app'
  ],
  credentials: true
}));
```

### 2. Create API Configuration File

Create `src/config.ts` in frontend:

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

### 3. Update API Calls

Replace hardcoded `http://localhost:5000` with the config:

```typescript
import { API_URL } from './config';

// Instead of:
// axios.get('http://localhost:5000/api/...')

// Use:
axios.get(`${API_URL}/api/...`)
```

### 4. Build and Test Locally

// turbo
```bash
cd c:\Users\sampa\OneDrive\Desktop\vehicle-minor
npm run build
```

// turbo
```bash
cd c:\Users\sampa\OneDrive\Desktop\vehicle-minor
npm run preview
```

### 5. Initialize Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Prepare for deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## Post-Deployment

### 1. Test All Features
- Login/Authentication
- Vehicle CRUD operations
- Real-time tracking
- Email notifications
- File uploads

### 2. Monitor Logs
- Check backend logs for errors
- Monitor MongoDB Atlas for connection issues
- Review frontend console for API errors

### 3. Set Up Custom Domain (Optional)
- Purchase a domain
- Configure DNS settings in your hosting platform
- Add SSL certificate (usually automatic)

---

## Troubleshooting

### Backend Not Connecting
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Check environment variables are set correctly
- Review backend logs for errors

### CORS Errors
- Ensure frontend domain is whitelisted in backend CORS config
- Check if credentials are properly set

### API Calls Failing
- Verify `VITE_API_URL` is set correctly
- Check if backend is running and accessible
- Test API endpoints using Postman

---

## Recommended: Render (Free Tier)

For a quick free deployment:
1. Deploy backend to Render Web Service
2. Deploy frontend to Render Static Site
3. Both will auto-deploy on Git push
4. Free tier includes:
   - 750 hours/month
   - Auto SSL
   - CI/CD

**Note**: Free tier services may experience cold starts after inactivity.
