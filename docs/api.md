# Otakuverse REST API Documentation

**Base URL**: `/api/v1`

All responses follow standard format:
- **Success**: `{ "success": true, "data": <payload>, "pagination"?: <pagination> }`
- **Error**: `{ "success": false, "error": { "code": "<ERROR_CODE>", "message": "<Description>" } }`

---

## 1. Public Catalog Endpoints

### `GET /api/v1/products`
Retrieve paginated product catalog with projection and filters.

**Query Parameters**:
- `page` (default: 1): Page number
- `limit` (default: 24, max: 50): Number of items per page
- `category`: Filter by category slug or name
- `anime`: Filter by anime franchise
- `brand`: Filter by brand
- `filter`: Preset filter (`new`, `bestsellers`, `limited`, `preorder`, `sale`)
- `minPrice` / `maxPrice`: Price range boundaries
- `inStock`: Boolean (`true` to show only in-stock products)
- `sort`: `featured` (default), `newest`, `price-asc`, `price-desc`, `bestselling`
- `q`: Search string

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "6aa870e61f7a68a476ee1673",
      "name": "All-Star Anime Vault Ultimate Collection",
      "slug": "all-star-anime-vault",
      "price": 9999,
      "compareAtPrice": 12999,
      "categoryName": "Bundles",
      "categorySlug": "figures",
      "image": "/custom/anime_allstar_bg.jpg",
      "stock": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 889,
    "totalPages": 38,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `GET /api/v1/products/:id`
Retrieve product by MongoDB ID or slug.

### `GET /api/v1/products/slug/:slug`
Retrieve product by URL slug.

### `GET /api/v1/categories`
Retrieve all active store categories.

---

## 2. Cart Endpoints (Authenticated)

**Headers**: `Authorization: Bearer <firebase_id_token>`

### `GET /api/v1/cart`
Retrieve current user's hydrated cart.

### `POST /api/v1/cart/items`
Add item to cart.
**Body**:
```json
{
  "productId": "6aa870e61f7a68a476ee1673",
  "quantity": 1
}
```

### `PATCH /api/v1/cart/items/:productId`
Update cart item quantity.
**Body**: `{ "quantity": 3 }`

### `DELETE /api/v1/cart/items/:productId`
Remove item from cart.

### `DELETE /api/v1/cart`
Clear all items in cart.

---

## 3. Order Endpoints (Authenticated)

### `POST /api/v1/orders`
Place a zero-trust validated order.
**Body**:
```json
{
  "items": [{ "productId": "6aa870e61f7a68a476ee1673", "quantity": 1 }],
  "shippingAddress": {
    "fullName": "Satoru Gojo",
    "phone": "9876543210",
    "addressLine1": "Tokyo Metropolitan Jujutsu High School",
    "city": "Tokyo",
    "state": "Kanto",
    "pinCode": "110001"
  },
  "customer": {
    "name": "Satoru Gojo",
    "email": "gojo@baka.style",
    "phone": "9876543210"
  },
  "discount": 0
}
```

### `GET /api/v1/orders`
Retrieve user's paginated order history.

### `GET /api/v1/orders/:id`
Retrieve order detail (protected by IDOR ownership check).

---

## 4. Payment Endpoints (Authenticated)

### `POST /api/v1/payments/create-order`
Create Razorpay order for an existing order document.
**Body**: `{ "orderId": "6aa871091f7a68a476ee19eb" }`

### `POST /api/v1/payments/verify`
Verify HMAC-SHA256 signature and finalize order + inventory decrement.
**Body**:
```json
{
  "razorpay_order_id": "order_XXXXXX",
  "razorpay_payment_id": "pay_XXXXXX",
  "razorpay_signature": "cryptographic_hmac_hex_string"
}
```

---

## 5. Admin Endpoints (Authenticated + ADMIN Role)

- `GET /api/v1/admin/products` - Paginated product catalog management
- `POST /api/v1/admin/products` - Create new product
- `PATCH /api/v1/admin/products/:id` - Update price, stock, active status
- `DELETE /api/v1/admin/products/:id` - Soft deactivate product
- `GET /api/v1/admin/orders` - Paginated orders across all users
- `PATCH /api/v1/admin/orders/:id/status` - Update status & tracking number
- `GET /api/v1/admin/users` - Paginated customer directory
- `GET /api/v1/admin/analytics` - Fast precomputed revenue & order metrics

---

## 6. System & Health

- `GET /health` -> `{ "status": "ok" }`
- `GET /api/v1/health` -> `{ "status": "ok", "uptime": 123, "timestamp": "..." }`
