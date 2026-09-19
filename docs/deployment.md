# Otakuverse Production Deployment Guide

## 1. Environment Checklist

Before deploying, ensure the following environment variables are set in production:

### Frontend (`otakuverse/` or Vercel / Cloudflare Pages)
```env
NEXT_PUBLIC_SITE_URL=https://otakuverse.in
NEXT_PUBLIC_API_URL=https://api.otakuverse.in
NEXTAUTH_URL=https://otakuverse.in
NEXTAUTH_SECRET=<min-32-chars-random-secret>

# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Razorpay Client
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
```

### Backend (`backend/` or Render / Railway / Docker / AWS ECS)
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://otakuverse.in
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/otakuverse?retryWrites=true&w=majority

# Razorpay Server Credentials (NEVER expose to frontend)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# Firebase Admin SDK Credentials
FIREBASE_ADMIN_PROJECT_ID=otakuverse-5fa52
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Admin Allowed Emails
ADMIN_EMAILS=gojo@baka.style,admin@baka.style
```

---

## 2. Production Build & Run Commands

### Backend Server
```bash
cd backend
npm install --omit=dev
npm start
# Server listens on PORT and verifies MongoDB connection
```

### Frontend
```bash
cd otakuverse
npm install
npm run build
npm start
```

### Health Check Endpoint
- Probe: `GET https://api.otakuverse.in/health`
- Expected Status: `200 OK`
- Body: `{"status":"ok"}`
