# Trust Boundaries & Authorization Model

## 1. Trust Boundaries Diagram

```
[ UNTRUSTED BROWSER CLIENT ]
      │ (Untrusted Request: Claims, Prices, Discounts, Tokens)
      ▼
┌─────────────────────────────────────────────────────────────┐
│ BOUNDARY 1: Edge Ingress & Network Perimeter                │
│ Rate Limiting, CORS, Security Headers, Edge Middleware      │
└──────────────────────────────┬──────────────────────────────┘
                               │
      ┌────────────────────────┴────────────────────────┐
      ▼                                                 ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│ BOUNDARY 2A: Next.js API Layer    │     │ BOUNDARY 2B: Express REST Layer   │
│ - NextAuth & Firebase Validation  │     │ - Firebase Admin SDK Verification │
│ - Zod / Manual Request Schemas    │     │ - Express-Rate-Limit & Validators │
└─────────────────┬─────────────────┘     └─────────────────┬─────────────────┘
                  │                                         │
                  ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BOUNDARY 3: Core Domain Services & Zero-Trust Business Logic                 │
│ - Authoritative Server Pricing & Strict Coupon Rules Engine                 │
│ - Mandatory Gateway Order Binding (razorpayOrderId === order.razorpayOrderId)│
│ - Atomic Compare-And-Swap State Transitions (PENDING -> PAID)               │
│ - Tenant-Scoped IDOR Isolation (all queries forced by firebaseUid/userId)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BOUNDARY 4: Data Layer & Persistence                                        │
│ - MongoDB Atlas Collections with Unique Indexes and Concurrency CAS         │
│ - Vercel Blob Storage with Strict Magic-Byte & Sharp Validation             │
│ - Firebase Firestore Rules enforcing `email_verified == true` & Claims      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariant Rules Across Boundaries

1. **Rule 1 (Identity Verification)**: An email identity is strictly untrusted unless `email_verified: true` is cryptographically certified by the identity provider. No email matching logic may grant elevated permissions on unverified tokens.
2. **Rule 2 (Financial Authority)**: All monetary amounts (order subtotal, discounts, shipping, tax, and total) are strictly computed server-side. Any client-provided `price`, `discount`, or `total` must be ignored or rejected.
3. **Rule 3 (Payment Binding)**: A payment confirmation is only valid if the cryptographic gateway order ID is pre-associated with the target database order document. Payment signatures cannot be transferred between orders.
4. **Rule 4 (State Mutation Atomicity)**: Order state transitions (`PENDING` -> `PAID`, inventory decrement) must execute as atomic compare-and-swap operations to prevent concurrent duplicate side effects.
5. **Rule 5 (Tenant Scoping)**: Every data access query for private customer records (orders, addresses, profile) must include the authenticated user identity in the primary database filter.
