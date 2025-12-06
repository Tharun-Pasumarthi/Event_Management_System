# Deployment Guide - Event Management System

## ✅ Build Status: SUCCESSFUL

The project builds successfully with only ESLint warnings (no errors).

---

## Deployment Options

### Option 1: Vercel (Recommended - Free & Easy)

**Steps:**

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Event Management System"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Click "Deploy"

3. **Environment Variables on Vercel**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC0bNecBonwYHlOUbBf50KLytl62nTKKkU
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=event-handler-cc1ed.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=event-handler-cc1ed
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=event-handler-cc1ed.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=853927601102
   NEXT_PUBLIC_FIREBASE_APP_ID=1:853927601102:web:7930029268302ad369819f
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dd1undpie
   CLOUDINARY_API_KEY=272759234627664
   CLOUDINARY_API_SECRET=xNXSGJUcbji_mB3VFKYGdoQGzLs
   EMAIL_USER=tharunplatinum06@gmail.com
   EMAIL_PASS=gvcg oghp xwzy ibpc
   ADMIN_EMAIL=admin@yourdomain.com
   ```

---

### Option 2: Netlify

**Steps:**

1. **Push to GitHub** (same as Vercel)

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repo
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Add environment variables
   - Click "Deploy"

---

### Option 3: Self-Hosted (VPS/Cloud Server)

**Requirements:**
- Node.js 18+ installed
- PM2 for process management
- Nginx for reverse proxy

**Steps:**

1. **On your server:**
   ```bash
   git clone YOUR_REPO_URL
   cd event-management-system
   npm install
   npm run build
   ```

2. **Create .env.local** with all environment variables

3. **Start with PM2:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "event-app" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Post-Deployment Checklist

### 1. **Firebase Configuration**
- [ ] Deploy Firestore rules (see DEPLOY_FIRESTORE_RULES.md)
- [ ] Enable Email/Password authentication
- [ ] Add authorized domains in Firebase Console

### 2. **Firebase Authorized Domains**
Add your deployment domain:
- Go to Firebase Console → Authentication → Settings
- Add your domain (e.g., `your-app.vercel.app`)

### 3. **Test All Features**
- [ ] Homepage loads events without login
- [ ] User registration works
- [ ] Event registration with QR code generation
- [ ] Email confirmations sent
- [ ] Admin dashboard accessible
- [ ] QR code scanning works
- [ ] Certificate generation
- [ ] Support form submissions

### 4. **Cloudinary Settings**
- Verify image uploads work
- Check storage limits (25GB free tier)

### 5. **Email Settings**
- Test registration confirmation emails
- Test reminder emails
- Test support request emails
- Test support status update emails

---

## Environment Variables Reference

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config | ✅ Yes |
| `CLOUDINARY_*` | Image upload service | ✅ Yes |
| `EMAIL_USER` | Gmail for sending emails | ✅ Yes |
| `EMAIL_PASS` | Gmail app password | ✅ Yes |
| `ADMIN_EMAIL` | Admin contact email | ⚠️ Optional |

---

## Troubleshooting

### Build Fails
- Run `npm run build` locally first
- Check all dependencies are installed
- Verify Node.js version (18+)

### Events Not Loading
- Ensure Firestore rules are deployed
- Check Firebase authorized domains

### Email Not Sending
- Verify `EMAIL_USER` and `EMAIL_PASS` are correct
- Check Gmail app password is valid
- Ensure "Less secure app access" is enabled (if needed)

### Images Not Uploading
- Verify Cloudinary credentials
- Check API key and secret are correct

---

## Performance Optimization

The build output shows:
- **21 pages** generated
- **6 API routes** configured
- **Dynamic rendering** for event-specific pages
- **Static pages** for faster loading

**Bundle sizes are optimized:**
- Admin pages: ~210-320 KB
- Public pages: ~210-220 KB

---

## Security Notes

1. **Never commit `.env.local`** to version control
2. Use Firebase Security Rules for data protection
3. Validate all user inputs on server side
4. Keep dependencies updated: `npm audit`
5. Use HTTPS in production (automatic on Vercel/Netlify)

---

## Support

For issues or questions:
- Check logs in deployment platform
- Review Firebase Console for errors
- Test locally first: `npm run dev`
