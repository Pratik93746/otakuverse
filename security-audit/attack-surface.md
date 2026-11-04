# Attack Surface & Threat Analysis

## 1. External Ingress Points

| Surface Entry Point | Protocol / Method | Authentication | Trust Level | Identified Risk Vectors |
| :--- | :--- | :--- | :--- | :--- |
| `/api/admin/*` (Next.js) | HTTPS / GET, POST, PATCH, DELETE | Firebase Bearer or NextAuth Session | High Privilege | Privilege escalation via unverified email; SSRF/XSS via file upload |
| `/api/v1/admin/*` (Express) | HTTPS / GET, POST, PATCH, DELETE | Firebase Bearer Token | High Privilege | Unverified email escalation; DB query injection |
| `/api/orders` (Next.js) | HTTPS / POST | Optional (Guest supported) | Untrusted | Parameter tampering, pricing override, coupon reuse, inventory bypass |
| `/api/v1/orders` (Express) | HTTPS / POST | Required (Bearer token) | Untrusted Buyer | Arbitrary discount injection, price override, negative totals |
| `/api/verify-payment` | HTTPS / POST | Public / Session | Gateway Data | Order substitution, signature forgery, double stock decrement race |
| `/api/webhooks/razorpay` | HTTPS / POST | Cryptographic HMAC Header | Third-Party Gateway | Signature bypass, raw body mismatch, replayed events, race condition |
| `/api/v1/payments/webhook` | HTTPS / POST | Cryptographic HMAC Header | Third-Party Gateway | Body-parser stream conflict, missing signature header bypass |
| `/api/cart` (Next.js) | HTTPS / POST | Firebase Bearer Token | Authenticated User | Price & stock injection into cart document, schema corruption |
| `/api/v1/cart/items` | HTTPS / POST | Firebase Bearer Token | Authenticated User | Read-Modify-Write race condition, inventory limit circumvention |
| `/api/addresses` | HTTPS / POST, DELETE | Session / Firebase Token | Authenticated User | IDOR data exfiltration via `addressId` retrieval |
| `/api/coupons/validate` | HTTPS / POST | Public | Untrusted | Brute force coupon guessing, timing enumeration |
| `/api/search` & `/products` | HTTPS / GET | Public | Untrusted | ReDoS via regex search filters, NoSQL operator injection |
| `firestore.rules` | Firebase Client SDK | Firebase Auth Token | Untrusted Client | Direct Firestore bypass without email verification |

---

## 2. Threat Actors & Capabilities

1. **Unauthenticated Public Adversary**:
   - Capable of sending arbitrary HTTP requests to public endpoints.
   - Capable of creating unverified Firebase accounts with arbitrary email addresses.
   - Capable of sending malformed webhooks, forged signatures, or ReDoS payloads.
2. **Authenticated Malicious Customer**:
   - Possesses a valid Firebase account and NextAuth session.
   - Capable of manipulating client-side state, intercepting API payloads, sending concurrent requests, and substituting order IDs.
   - Attempts to minimize payment liability, drain inventory, access other users' addresses, or escalate privileges.
3. **Compromised Insider / Stale Administrator**:
   - Possesses a revoked or demoted administrative credential.
   - Attempts to exploit long-lived JWTs, cached claims, or missing revocation checks.
