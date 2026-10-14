# Endpoint Authorization & Policy Matrix

**System**: Otakuverse E-Commerce API (Express & Next.js Endpoints)  
**Security Model**: Default-Deny, Role-Based Access Control (RBAC), and Tenant-Scoped Object-Level Permissions

---

## 1. Route Authorization Matrix

| Endpoint / Method | Component / Handler | Required Role | Required Auth Evidence | Object-Level Scope / Tenant Isolation |
| :--- | :--- | :--- | :--- | :--- |
| `GET /health` | Express Core | Public | None | None |
| `GET /api/v1/products` | Express / Next.js | Public | None | Only active products (`isActive != false`) |
| `GET /api/v1/products/:id` | Express / Next.js | Public | None | Public product detail |
| `GET /api/v1/products/slug/:slug` | Express / Next.js | Public | None | Public product detail |
| `GET /api/v1/categories` | Express / Next.js | Public | None | Public category list |
| `POST /api/v1/cart` | Express Cart Controller | Authenticated User | Valid Firebase Bearer Token | Scoped strictly to `req.user.uid` |
| `GET /api/v1/cart` | Express Cart Controller | Authenticated User | Valid Firebase Bearer Token | Scoped strictly to `req.user.uid` |
| `DELETE /api/v1/cart` | Express Cart Controller | Authenticated User | Valid Firebase Bearer Token | Scoped strictly to `req.user.uid` |
| `POST /api/v1/orders` | Express Order Controller | Authenticated User / Guest | Valid Firebase Token or Verified Guest Email | Order pinned to `orderUid`; prices calculated strictly on server |
| `GET /api/v1/orders` | Express Order Controller | Authenticated User | Valid Firebase Bearer Token | Filtered by `{ user: req.user.uid }` |
| `GET /api/v1/orders/:id` | Express Order Controller | Authenticated User | Valid Firebase Bearer Token | Filtered by `{ _id: id, user: req.user.uid }` |
| `POST /api/v1/payments/create-order` | Express Payment Controller | Authenticated User | Valid Firebase Bearer Token | Order must belong to calling `req.user.uid` |
| `POST /api/v1/payments/verify` | Express Payment Controller | Authenticated User | Valid Firebase Bearer Token | Cryptographic signature matched against `razorpayOrderId` |
| `POST /api/v1/payments/webhook` | Express Payment Controller | Razorpay Gateway | Valid `x-razorpay-signature` HMAC-SHA256 | Validated against raw request body bytes |
| `POST /api/v1/users/sync` | Express User Controller | Authenticated User | Valid Firebase Bearer Token | Pinned to `req.user.uid`; role cannot be self-escalated to ADMIN |
| `GET /api/v1/admin/orders` | Express Admin Controller | Admin | Valid Firebase Token + `email_verified: true` + DB Role `ADMIN` | Full administrative order management |
| `GET /api/v1/admin/products` | Express Admin Controller | Admin | Valid Firebase Token + `email_verified: true` + DB Role `ADMIN` | Full catalog management |
| `POST /api/v1/admin/products` | Express Admin Controller | Admin | Valid Firebase Token + `email_verified: true` + DB Role `ADMIN` | Catalog modification |
| `PUT /api/v1/admin/products/:id` | Express Admin Controller | Admin | Valid Firebase Token + `email_verified: true` + DB Role `ADMIN` | Catalog modification |
| `DELETE /api/v1/admin/products/:id` | Express Admin Controller | Admin | Valid Firebase Token + `email_verified: true` + DB Role `ADMIN` | Catalog modification |
| `GET /api/addresses` | Next.js Address Route | Authenticated User | Firebase Bearer Token OR NextAuth Session | Scoped strictly to `user.uid` |
| `POST /api/addresses` | Next.js Address Route | Authenticated User | Firebase Bearer Token OR NextAuth Session | Scoped update via `findOneAndUpdate({ _id, firebaseUid })` |
| `DELETE /api/addresses` | Next.js Address Route | Authenticated User | Firebase Bearer Token OR NextAuth Session | Scoped deletion via `deleteOne({ _id, firebaseUid })` |
| `POST /api/admin/upload` | Next.js Admin Upload Route | Admin | NextAuth Session OR Admin Firebase Token (`email_verified: true`) | Vercel Blob public storage guard |
| `POST /api/webhooks/razorpay` | Next.js Webhook Route | Razorpay Gateway | Valid `x-razorpay-signature` HMAC-SHA256 | Pinned to verified `razorpayOrderId` |

---

## 2. Policy Enforcement Rules

1. **Rule 1: Identity Token Verification**:
   All authenticated endpoints verify the cryptographic signature of the bearer token with Google Firebase Public Keys. Tokens must not be expired, and issuer must match the Firebase project.
2. **Rule 2: Administrative Email Verification**:
   Any administrative claim or whitelist check requires `decodedToken.email_verified === true`. Unverified email addresses are strictly downgraded to standard `USER` status.
3. **Rule 3: Object-Level Isolation**:
   No user can read, mutate, or delete an order, cart, or address belonging to another user. Database queries must explicitly include `{ firebaseUid: user.uid }` or `{ user: user.uid }`.
4. **Rule 4: Zero Trust in Client Pricing**:
   Any request attempting to set `discount`, `unitPrice`, or `total` is rejected or recalculated from trusted MongoDB catalog records.
