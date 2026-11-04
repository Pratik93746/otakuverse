# Security Remediation & Code Implementation Report

**Application**: Otakuverse E-Commerce Architecture  
**Scope**: Server-Side Hardening across Next.js and Express Backends  
**Status**: Implemented, Verified, and Tested

---

## 1. Remediation Detail: Administrative Privilege Escalation (SEC-CRIT-01)

### Files Modified
- [`otakuverse/lib/firebase-admin.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/lib/firebase-admin.ts)
- [`otakuverse/lib/admin-auth.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/lib/admin-auth.ts)
- [`backend/src/middleware/authorizeAdmin.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/middleware/authorizeAdmin.js)
- [`otakuverse/firestore.rules`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/firestore.rules)
- [`backend/src/services/user.service.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/services/user.service.js)

### Implementation Mechanics
1. **Verified Email Requirement**:
   `isAllowedAdminEmail(email, isEmailVerified)` now strictly requires `isEmailVerified === true`. If a token does not assert `email_verified: true`, administrative access is immediately rejected.
2. **Elimination of Hardcoded Admin Fallbacks**:
   Removed hardcoded personal developer emails (`pratikraj...`) from source code fallback lists. Allowed admin emails must be provided via the `ADMIN_EMAILS` environment variable.
3. **Database Identity Pinning**:
   In `authorizeAdmin.js`, user lookups are keyed by `authProviderId: req.user.uid` rather than mutable email strings, ensuring that changing an email address cannot spoof administrative privileges.
4. **Firestore Rules Enforcement**:
   In `firestore.rules`:
   ```cel
   function isAdmin() {
     return isAuthenticated() &&
       request.auth.token.email_verified == true &&
       (request.auth.token.role == 'ADMIN' || ...);
   }
   ```

---

## 2. Remediation Detail: Server-Authoritative Pricing & Discount Protection (SEC-CRIT-02)

### Files Modified
- [`backend/src/validators/order.validator.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/validators/order.validator.js)
- [`backend/src/controllers/order.controller.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/controllers/order.controller.js)
- [`backend/src/services/order.service.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/services/order.service.js)
- [`otakuverse/app/api/orders/route.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/app/api/orders/route.ts)

### Implementation Mechanics
1. **Rejection of Client Discounts**:
   In `validateOrderCreate`:
   ```javascript
   if (req.body.discount !== undefined && Number(req.body.discount) > 0) {
     return 'Arbitrary client discount values are not permitted. Please provide a valid couponCode instead.';
   }
   ```
2. **Server-Side Pricing Engine**:
   In `order.service.js` and Next.js `orders/route.ts`, catalog products are fetched directly from MongoDB by ID. Unit prices (`purchasePrice`) are populated from trusted database fields, subtotal is summed on the server, and coupons are validated against authoritative database rules (`calculateCouponDiscount`).
3. **Order Total Clamping**:
   Order totals are calculated as:
   ```typescript
   const total = Math.max(1, subtotal + shipping + tax - validDiscount);
   ```
   Preventing zero or negative invoice totals.

---

## 3. Remediation Detail: Payment Verification Binding & Order Substitution Prevention (SEC-CRIT-03)

### Files Modified
- [`otakuverse/app/api/verify-payment/route.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/app/api/verify-payment/route.ts)
- [`backend/src/services/payment.service.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/services/payment.service.js)

### Implementation Mechanics
1. **Binding to Razorpay Order ID**:
   `verify-payment` retrieves the order from MongoDB using the verified `razorpayOrderId`.
2. **Order Number Cross-Verification**:
   ```typescript
   if (matchedOrder.orderNumber !== orderNumber) {
     return NextResponse.json({ error: 'Order mismatch detected.' }, { status: 400 });
   }
   ```
3. **Cryptographic Signature Verification**:
   Uses HMAC-SHA256 with `crypto.timingSafeEqual` between calculated hash and client signature:
   ```typescript
   const generatedSignature = crypto
     .createHmac('sha256', keySecret)
     .update(`${razorpayOrderId}|${razorpayPaymentId}`)
     .digest('hex');
   ```

---

## 4. Remediation Detail: Webhook Signature Verification & Stream Conflict (SEC-CRIT-04)

### Files Modified
- [`backend/src/app.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/app.js)
- [`backend/src/controllers/payment.controller.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/controllers/payment.controller.js)
- [`backend/src/services/payment.service.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/services/payment.service.js)
- [`otakuverse/app/api/webhooks/razorpay/route.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/app/api/webhooks/razorpay/route.ts)

### Implementation Mechanics
1. **Raw Body Capture**:
   In `backend/src/app.js`:
   ```javascript
   app.use(express.json({
     limit: '10mb',
     verify: (req, res, buf) => {
       req.rawBody = buf;
     },
   }));
   ```
2. **Mandatory Header Verification**:
   In `payment.service.js`:
   ```javascript
   if (!signature) {
     throw new Error('Unauthorized: Missing x-razorpay-signature header.');
   }
   const expectedSignature = crypto
     .createHmac('sha256', webhookSecret)
     .update(rawBody)
     .digest('hex');
   const isAuthentic = crypto.timingSafeEqual(
     Buffer.from(signature, 'hex'),
     Buffer.from(expectedSignature, 'hex')
   );
   if (!isAuthentic) {
     throw new Error('Unauthorized: Invalid webhook signature.');
   }
   ```

---

## 5. Remediation Detail: Address IDOR Elimination (SEC-HIGH-01)

### Files Modified
- [`otakuverse/lib/db/addresses.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/lib/db/addresses.ts)

### Implementation Mechanics
Replaced multi-step `updateOne` + `findOne` with atomic scoped update:
```typescript
const updated = await col.findOneAndUpdate(
  { _id: new ObjectId(addressId) as any, firebaseUid },
  { $set: updateData },
  { returnDocument: 'after' }
);
if (updated) return updated as DbAddress;
throw new Error('Address not found or unauthorized');
```
Guarantees that a user can never retrieve or update an address record that does not match their own `firebaseUid`.

---

## 6. Remediation Detail: Concurrency Race & Idempotency Controls (SEC-HIGH-02)

### Files Modified
- [`otakuverse/lib/db/orders.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/lib/db/orders.ts)
- [`otakuverse/app/api/verify-payment/route.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/app/api/verify-payment/route.ts)
- [`otakuverse/app/api/webhooks/razorpay/route.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/app/api/webhooks/razorpay/route.ts)

### Implementation Mechanics
Implemented `claimAndMarkOrderPaid`:
```typescript
export async function claimAndMarkOrderPaid(orderNumber: string, paymentDetails: any): Promise<boolean> {
  const col = await getOrdersCollection();
  const res = await col.findOneAndUpdate(
    {
      orderNumber,
      'payment.paymentStatus': { $ne: 'PAID' },
    },
    {
      $set: {
        'payment.paymentStatus': 'PAID',
        'payment.paymentId': paymentDetails.paymentId,
        'payment.razorpayOrderId': paymentDetails.razorpayOrderId,
        'payment.paidAt': new Date(),
        orderStatus: 'CONFIRMED',
      },
    },
    { returnDocument: 'after' }
  );
  return !!res;
}
```
Only the request that matches `'payment.paymentStatus': { $ne: 'PAID' }` succeeds in claiming the state transition and executing `decrementProductStock`. Subsequent requests return `false` and do not re-decrement stock.

---

## 7. Remediation Detail: Secure Image Upload (SEC-MED-01) & ReDoS Defense (SEC-MED-02)

### Files Modified
- [`otakuverse/app/api/admin/upload/route.ts`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/app/api/admin/upload/route.ts)
- [`backend/src/validators/product.validator.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/backend/src/validators/product.validator.js)
- [`otakuverse/backend/src/validators/product.validator.js`](file:///Users/pratikraj/Antigravity/Project%20Animee/otakuverse/backend/src/validators/product.validator.js)

### Implementation Mechanics
1. **Magic Byte Image Validation**:
   Inspects first 12 bytes for JPEG, PNG, or WebP magic headers. If invalid or if Sharp transcode fails, immediately returns 400 Bad Request. Raw buffers are never uploaded unvalidated.
2. **ReDoS Sanitization**:
   In `sanitizeString`:
   ```javascript
   const clean = val.replace(/^\$/, '').trim().slice(0, 100);
   return clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   ```
   Escapes all regex operators before interpolation into MongoDB `$regex` queries.
