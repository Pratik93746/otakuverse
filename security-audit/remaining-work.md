# Remaining Work & Remediation Backlog

## Phase 1: Critical Remediations
1. [x] **SEC-CRIT-01: Admin Privilege Escalation** (Require `email_verified: true`, remove default admin emails, harden custom claims, verify MongoDB role).
2. [x] **SEC-CRIT-02: Discount Injection** (Removed client discount override, compute discounts strictly server-side using coupon engine).
3. [x] **SEC-CRIT-03: Order Substitution in Payment Verification** (Bound payment strictly to `razorpayOrderId` and assert matching `orderNumber`).
4. [x] **SEC-CRIT-04: Webhook Signature Verification & Stream Conflict** (Fixed body-parser raw body capture, enforced fail-closed HMAC-SHA256 verification).
5. [x] **SEC-MED-04: Google OAuth Token Relay in NextAuth** (Passed Firebase ID token to NextAuth credentials for verified session issuance).

## Phase 2: High & Medium Remediations
1. [x] **SEC-HIGH-01: Address IDOR** (Tenant isolation via atomic `findOneAndUpdate({ _id, firebaseUid })`).
2. [x] **SEC-HIGH-02: Payment & Webhook Concurrency Race** (Atomic Compare-And-Swap for order payment status and stock decrement).
3. [x] **SEC-HIGH-03: Account Takeover via Identity Sync** (Required verified email before account linking in `syncUser`).
4. [x] **SEC-HIGH-04: Firestore Security Rules** (Required `request.auth.token.email_verified == true`).
5. [x] **SEC-MED-01: File Upload Validation** (Validated magic bytes, sharp WebP transcode, eliminated unvalidated buffer fallback).
6. [x] **SEC-MED-02: ReDoS Sanitization** (Escaped regex metacharacters, capped query lengths).
7. [x] **SEC-MED-03: Customer PII in Git JSON Files** (Isolated legacy sample files from production runtime).

## Phase 3: Automated Adversarial Validation & Verification Suites
1. [x] Implement security regression test suites (`backend/test/security.test.js`).
2. [x] Execute all test suites and verify all pass (23/23 tests passed).
3. [x] Run static TypeScript typecheck (`npx tsc --noEmit` passed with 0 errors).
4. [x] Compile full root deliverables (`SECURITY_AUDIT.md`, `SECURITY_REMEDIATION.md`, `THREAT_MODEL.md`, `AUTHORIZATION_MATRIX.md`, `AUTH_STATE_MACHINE.md`, `PAYMENT_INTEGRITY.md`, `SECURITY_TEST_REPORT.md`, `DEPLOYMENT_SECURITY_CHECKLIST.md`, `SECURITY_PROGRESS.md`, `SECURITY_FINAL_REPORT.md`).

## Phase 4: Production Rollout & Operational Handoff
- [ ] Configure production environment secrets on Vercel and Railway/Render (`ADMIN_EMAILS`, `NEXTAUTH_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- [ ] Deploy hardened Firestore security rules via Firebase CLI.
- [ ] Monitor real-time webhook delivery logs and stock decrement metrics.
