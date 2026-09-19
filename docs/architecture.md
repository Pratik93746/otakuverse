# Otakuverse System Architecture

## 1. Architectural Overview

Otakuverse is built on a **Modular Monolith** pattern designed for high performance, cost efficiency, minimal memory/CPU footprint, and zero code duplication.

```
Browser (Client Device)
  │
  ├─────────────────────────────────────────┐
  │                                         │
  ▼                                         ▼
Next.js 16 (App Router)            Node.js + Express.js API
• Server & Client Components        • REST API (/api/v1/*)
• SSR / ISR / Static Pages          • Centralized Validation & Rate Limiting
• Interactive 3D & UI Stores        • Firebase Token Verification
• Centralized API Client Layer      • Mongoose Connection Pooling
  │                                         │
  ├─────────────────────────────────────────┤
  ▼                                         ▼
External CDNs / Edge               MongoDB Atlas (Primary Data Store)
• jsDelivr CDN (Catalog Media)      • products (889+ active items)
• Razorpay Test/Live Gateway        • users & addresses
• Firebase Authentication (Auth Id) • orders & payments
                                    • carts (lightweight)
```

---

## 2. Key Design Tenets

1. **Lightweight Cart Pattern**:
   - Cart documents in MongoDB store only `{ productId, quantity }`.
   - Stale product names, prices, and image blobs are never persisted in the cart collection.
   - Live product details are hydrated in a single indexed batch query on `GET /api/v1/cart`.

2. **Zero-Trust Pricing**:
   - The frontend never calculates or dictates order totals.
   - Order creation (`POST /api/v1/orders`) inspects the active database price for every item and verifies inventory availability atomically.

3. **Cryptographic Payment Integrity**:
   - Client sends Razorpay response credentials (`order_id`, `payment_id`, `signature`).
   - Server verifies HMAC-SHA256 signature using `crypto.timingSafeEqual` and `RAZORPAY_KEY_SECRET`.
   - Inventory stock is atomically decremented only after verified payment capture.

4. **Zero Bloat Image Pipeline**:
   - Zero image binaries in MongoDB or the application server filesystem.
   - Catalog media is served via jsDelivr CDN and Next.js image optimization pipelines.

5. **Tiered Protection & Authorization**:
   - Public read routes (products, categories) with query sanitization.
   - Protected user routes (`/cart`, `/orders`, `/users/me`) requiring Firebase Bearer tokens.
   - Admin routes (`/admin/*`) requiring server-side role validation (`ADMIN`).
