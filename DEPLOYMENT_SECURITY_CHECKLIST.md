# Production Deployment Security Checklist & Operational Runbook

**Target**: Otakuverse Production Deployment  
**Hosting Platforms**: Vercel (Next.js 16 Web/API) & Railway / Render (Express Monolith Backend)  
**Database**: MongoDB Atlas Production Replica Set  
**Identity & Gateway**: Firebase Authentication & Razorpay Payments

---

## 1. Mandatory Production Environment Variables

### A. Next.js 16 (`otakuverse` on Vercel)
| Variable | Description | Secret? | Production Requirement |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | No | Must be set to `production` |
| `NEXTAUTH_SECRET` | NextAuth session encryption key | **YES** | 32+ character high-entropy cryptographic secret |
| `NEXTAUTH_URL` | Canonical application URL | No | `https://otakuverse.in` (or custom domain) |
| `ADMIN_EMAILS` | Comma-separated admin whitelist | No | Verified staff emails only |
| `MONGODB_URI` | MongoDB Atlas Connection String | **YES** | Dedicated production database user with strict IP allowlist |
| `RAZORPAY_KEY_ID` | Razorpay Public Key ID | No | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Merchant Secret | **YES** | Live merchant secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook Signature Verification Secret | **YES** | Configured in Razorpay Webhook Dashboard |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage Token | **YES** | Production Blob store token |

### B. Express Monolith Backend (`backend/`)
| Variable | Description | Secret? | Production Requirement |
| :--- | :--- | :--- | :--- |
| `PORT` | Listening Port | No | Default `5001` or injected by cloud host |
| `NODE_ENV` | Environment | No | `production` |
| `MONGODB_URI` | MongoDB Atlas Connection String | **YES** | Production cluster URI |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | No | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | **YES** | Live merchant secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | **YES** | Secret matching gateway webhook settings |
| `ADMIN_EMAILS` | Admin Whitelist | No | Comma-separated admin email addresses |

---

## 2. Operational Security Checks Before Go-Live

1. **Verify No Hardcoded Secrets in Git**:
   Run repository secret scanner (`git log -S "rzp_live_" -p`). Ensure all keys are sourced from environment variables.
2. **Deploy Hardened Firestore Security Rules**:
   Run `firebase deploy --only firestore:rules` to deploy the rules enforcing `request.auth.token.email_verified == true`.
3. **Configure Razorpay Webhook Endpoint**:
   In the Razorpay Dashboard (`Settings > Webhooks`):
   - Add URL: `https://your-domain.com/api/webhooks/razorpay` (or backend `/api/v1/payments/webhook`).
   - Active Events: `order.paid`, `payment.captured`, `payment.failed`.
   - Secret: Enter high-entropy secret matching `RAZORPAY_WEBHOOK_SECRET`.
4. **MongoDB Atlas Production Indexes**:
   Verify the following compound indexes are created:
   - `orders`: `{ orderNumber: 1 }` (unique), `{ 'payment.razorpayOrderId': 1 }`, `{ firebaseUid: 1 }`
   - `addresses`: `{ firebaseUid: 1, isDefault: -1 }`
   - `products`: `{ slug: 1 }` (unique), `{ categorySlug: 1 }`, `{ animeSlug: 1 }`, `{ stock: 1 }`
   - `users`: `{ firebaseUid: 1 }` (unique), `{ email: 1 }`

---

## 3. Rollback & Emergency Incident Response Runbook

### If a Deployment Regression Occurs
1. **Instant Vercel Instant Rollback**:
   Navigate to Vercel Dashboard > Deployments > Select previous verified deployment > Click "Promote to Production".
2. **Database Reversion**:
   MongoDB Atlas maintains continuous Point-In-Time Restore (PITR). If data corruption occurs, initiate restore from the Atlas web console.
3. **Secret Compromise Procedure**:
   If `RAZORPAY_KEY_SECRET` or `NEXTAUTH_SECRET` is leaked:
   - Immediately regenerate the key pair in the Razorpay dashboard.
   - Update Vercel and Railway environment variables.
   - Redeploy both application containers.
   - Invalidate all existing user sessions by rotating `NEXTAUTH_SECRET`.
