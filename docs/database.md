# Otakuverse MongoDB Atlas Database Design

**Primary Database Engine**: MongoDB Atlas (Replica Set)
**Mongoose ODM**: Structured validation, strict schema mapping, indexes, connection pooling (`maxPoolSize: 10`).

---

## 1. Collections & Schemas

### 1. `products`
Stores merchandise catalog items.
```json
{
  "_id": "6aa870e61f7a68a476ee1673",
  "name": "String",
  "slug": "String (unique)",
  "description": "String",
  "shortDescription": "String",
  "price": "Number",
  "compareAtPrice": "Number | null",
  "categoryName": "String",
  "categorySlug": "String (indexed)",
  "brandName": "String",
  "characterName": "String",
  "animeName": "String",
  "image": "String (CDN URL)",
  "images": ["String"],
  "stock": "Number",
  "isActive": "Boolean (indexed)",
  "isFeatured": "Boolean (indexed)",
  "createdAt": "Date (indexed)",
  "updatedAt": "Date"
}
```

### 2. `categories`
Stores store classification taxonomies.
```json
{
  "_id": "ObjectId",
  "name": "String",
  "slug": "String (unique)",
  "description": "String",
  "image": "String",
  "isActive": "Boolean"
}
```

### 3. `carts`
Stores lightweight cart pointers (zero redundant product data).
```json
{
  "_id": "ObjectId",
  "userId": "String (unique index)",
  "items": [
    {
      "productId": "ObjectId / String",
      "quantity": "Number"
    }
  ],
  "updatedAt": "Date"
}
```

### 4. `orders`
Stores finalized purchases with immutable historical product snapshot.
```json
{
  "_id": "ObjectId",
  "orderNumber": "String (unique index)",
  "userId": "String (indexed)",
  "customer": {
    "name": "String",
    "email": "String",
    "phone": "String"
  },
  "items": [
    {
      "productId": "Mixed",
      "name": "String",
      "sku": "String",
      "price": "Number",
      "quantity": "Number",
      "image": "String"
    }
  ],
  "subtotal": "Number",
  "discount": "Number",
  "shippingFee": "Number",
  "tax": "Number",
  "totalAmount": "Number",
  "currency": "INR",
  "shippingAddress": {
    "fullName": "String",
    "phone": "String",
    "addressLine1": "String",
    "city": "String",
    "state": "String",
    "pinCode": "String",
    "country": "India"
  },
  "paymentStatus": "String (PENDING | PAID | FAILED | REFUNDED)",
  "orderStatus": "String (PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED)",
  "razorpayOrderId": "String (indexed)",
  "razorpayPaymentId": "String"
}
```

### 5. `users`
Stores user profile data linked to authentication provider identity.
```json
{
  "_id": "ObjectId",
  "authProviderId": "String (unique index)",
  "email": "String (unique index)",
  "name": "String",
  "phone": "String",
  "role": "USER | ADMIN",
  "addresses": [
    {
      "fullName": "String",
      "phone": "String",
      "addressLine1": "String",
      "city": "String",
      "state": "String",
      "pinCode": "String",
      "country": "India",
      "isDefault": "Boolean"
    }
  ],
  "isActive": "Boolean"
}
```

### 6. `payments`
Audit log of Razorpay transactions.
```json
{
  "_id": "ObjectId",
  "orderId": "ObjectId (ref Order)",
  "orderNumber": "String",
  "userId": "String",
  "provider": "razorpay",
  "providerOrderId": "String (indexed)",
  "providerPaymentId": "String (indexed)",
  "amount": "Number",
  "currency": "INR",
  "status": "PENDING | CAPTURED | FAILED",
  "signatureVerified": "Boolean"
}
```

---

## 2. Query Optimization Rules
1. **Projection**: Catalog queries exclude bulky fields (`description`, internal metadata).
2. **Capped Limits**: Pagination maximum is strictly clamped to `50` documents per request.
3. **Lean Queries**: Queries use `.lean()` to bypass Mongoose hydration overhead for read operations.
4. **No N+1 Queries**: Cart and order hydration executes single indexed `$in` queries.
