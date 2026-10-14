# System Architecture & Component Inventory

## 1. Overview & Topography

The Otakuverse (BAKA Style) platform operates as a dual-surface e-commerce architecture:
1. **Next.js 16 Web Application (`otakuverse/`)**:
   - **Framework**: Next.js 16 (React 19, Turbopack, Tailwind CSS v4, Framer Motion, Zustand).
   - **Deployment Target**: Cloudflare Workers / OpenNext (`@opennextjs/cloudflare`) and Vercel.
   - **Routing**: Next.js App Router with serverless API route handlers (`app/api/*`).
   - **Data Layer**: Direct MongoDB Node.js Driver (`mongodb@7.6.0`) with manual collection access and index management (`lib/mongodb.ts`).
   - **Authentication**: NextAuth (`next-auth@4.24.15`) with JWT session strategy, bridged to Firebase Client Auth (`firebase@12.19.0`) and validated server-side via Firebase Admin SDK (`firebase-admin@13.10.0`).
   - **Payment Gateway**: Razorpay (`razorpay@2.9.8`) with standard checkout iframe, custom payment verification, and webhook route handler.
   - **Storage & Assets**: Vercel Blob (`@vercel/blob@2.8.1`) for admin uploads with Sharp (`sharp@0.35.4`) image processing, plus static CDN media (jsDelivr, Unsplash).

2. **Standalone Decoupled Backend (`backend/`)**:
   - **Framework**: Node.js + Express 4.21.2.
   - **Data Layer**: Mongoose 8.9.5 connected to MongoDB Atlas.
   - **Security Middleware**: Helmet 8.0.0, CORS 2.8.5, Express Rate Limit 7.5.0.
   - **Authentication**: Firebase Admin SDK 12.7.0 Bearer token authentication middleware.
   - **Payment Gateway**: Razorpay 2.9.5 with order creation, signature verification, and webhook processing.

3. **Database (MongoDB Atlas `otakuverse` Database)**:
   - Shared database cluster backing both Next.js routes and Express routes.
   - Primary Collections: `users`, `products`, `categories`, `carts`, `orders`, `addresses`, `payments`, `reviews`, `coupons`, `stock_notifications`.

---

## 2. API Routes & Endpoint Inventory

### Next.js API Routes (`otakuverse/app/api`)
- `GET /api/products`: Public paginated product catalog search and filtering.
- `GET /api/search`: Public product search query.
- `GET /api/cart`: Authenticated (Firebase Bearer) cart retrieval.
- `POST /api/cart`: Authenticated cart synchronization.
- `DELETE /api/cart`: Authenticated cart clear.
- `POST /api/coupons/validate`: Public/Authenticated coupon code discount calculation.
- `POST /api/orders`: Authenticated or Guest order placement and Razorpay gateway initiation.
- `GET /api/orders`: Authenticated user order history.
- `POST /api/verify-payment`: Authenticated/Public Razorpay client signature verification & order completion.
- `POST /api/webhooks/razorpay`: Razorpay server-to-server webhook notification handler.
- `GET /api/addresses`: Authenticated user saved addresses.
- `POST /api/addresses`: Authenticated address creation and update.
- `DELETE /api/addresses`: Authenticated address deletion.
- `GET /api/users/me`: Authenticated profile retrieval.
- `POST /api/users/me`: Authenticated profile update.
- `GET /api/pincode/[code]`: Public postal PIN code lookup.
- `GET /api/geocode/reverse`: Public reverse geocoding proxy.
- `POST /api/notify-stock`: Public stock notification request.
- `GET /api/db-status`: Admin-only database connectivity telemetry.
- `GET /api/admin/orders`: Admin-only order listing.
- `GET /api/admin/orders/[id]`: Admin-only order detail retrieval.
- `PATCH /api/admin/orders/[id]`: Admin-only order status and tracking update.
- `GET /api/admin/products`: Admin-only product catalog listing.
- `POST /api/admin/products`: Admin-only product creation.
- `PATCH /api/admin/products`: Admin-only product update.
- `DELETE /api/admin/products`: Admin-only product deletion.
- `GET /api/admin/users`: Admin-only user directory.
- `POST /api/admin/users`: Admin-only user profile & role assignment.
- `DELETE /api/admin/users`: Admin-only user deletion.
- `GET /api/admin/upload`: Admin-only storage status monitor.
- `POST /api/admin/upload`: Admin-only file upload and Sharp compression.

### Express API Routes (`backend/src/routes`)
- `GET /health`, `GET /api/v1/health`: Health status.
- `GET /api/v1/products`: Product listing.
- `GET /api/v1/products/slug/:slug`: Product detail by slug.
- `GET /api/v1/products/:id`: Product detail by ID.
- `GET /api/v1/categories`: Category listing.
- `GET /api/v1/cart`: Authenticated user cart.
- `POST /api/v1/cart/items`: Authenticated add item to cart.
- `PATCH /api/v1/cart/items/:productId`: Authenticated update cart item quantity.
- `DELETE /api/v1/cart/items/:productId`: Authenticated remove cart item.
- `DELETE /api/v1/cart`: Authenticated clear cart.
- `POST /api/v1/orders`: Authenticated order creation.
- `GET /api/v1/orders`: Authenticated user orders.
- `GET /api/v1/orders/:id`: Authenticated order detail with ownership check.
- `POST /api/v1/payments/create-order`: Authenticated Razorpay order initiation.
- `POST /api/v1/payments/verify`: Authenticated payment signature verification.
- `POST /api/v1/payments/webhook`: Public Razorpay webhook endpoint.
- `POST /api/v1/auth/sync`: Authenticated user profile synchronization.
- `GET /api/v1/auth/me`: Authenticated profile retrieval.
- `PATCH /api/v1/auth/me`: Authenticated profile update.
- `POST /api/v1/auth/addresses`: Authenticated address addition.
- `GET /api/v1/admin/products`: Admin product listing.
- `POST /api/v1/admin/products`: Admin product creation.
- `PATCH /api/v1/admin/products/:id`: Admin product modification.
- `DELETE /api/v1/admin/products/:id`: Admin product deletion.
- `GET /api/v1/admin/orders`: Admin order listing.
- `GET /api/v1/admin/orders/:id`: Admin order detail.
- `PATCH /api/v1/admin/orders/:id/status`: Admin order status update.
- `GET /api/v1/admin/users`: Admin user directory.
- `GET /api/v1/admin/analytics`: Admin dashboard metrics.

---

## 3. Dual-Architecture Coherence Strategy
Because the production deployment relies on Next.js on Vercel/Cloudflare alongside an Express container, all security mitigations must be applied symmetrically across both layers:
1. Shared zero-trust rules for pricing and coupon calculations.
2. Synchronized verification of Firebase tokens, ensuring `email_verified === true` everywhere.
3. Equivalent atomic compare-and-swap state transitions for order fulfillment and inventory decrement.
