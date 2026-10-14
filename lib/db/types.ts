export type UserRole = 'USER' | 'ADMIN';

export interface DbUser {
  _id?: any;
  firebaseUid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProduct {
  _id?: any;
  id?: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  discount?: number | null;
  image: string;
  images?: string[];
  characterName?: string;
  animeName?: string;
  animeSlug?: string;
  brandName?: string;
  categoryName?: string;
  categorySlug?: string;
  stock: number;
  isSoldOut?: boolean;
  /** false = hidden from the storefront and not purchasable. Absent = published. */
  isPublished?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isLimitedEdition?: boolean;
  isPreOrder?: boolean;
  isFeatured?: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface DbCart {
  _id?: any;
  firebaseUid: string;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  updatedAt: Date;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  characterName?: string;
  animeName?: string;
  brandName?: string;
  sku?: string;
  purchasePrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface OrderShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface OrderPayment {
  paymentStatus: PaymentStatus;
  paymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpaySignature?: string | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

export interface OrderTracking {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
}

export interface DbOrder {
  _id?: any;
  orderNumber: string;
  firebaseUid: string;
  customer: OrderCustomer;
  shippingAddress: OrderShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  deliveryMethod: string;
  orderStatus: OrderStatus;
  payment: OrderPayment;
  tracking?: OrderTracking;
  /** Problems the owner must resolve by hand (e.g. paid but out of stock). */
  reviewFlags?: OrderReviewFlag[];
  /** Append-only log of status changes and who made them. */
  statusHistory?: OrderStatusEvent[];
  /** Set once stock for a cancelled order has been returned, so it is never returned twice. */
  stockRestoredAt?: Date | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderReviewFlag =
  | 'OUT_OF_STOCK_AFTER_PAYMENT'
  | 'AMOUNT_MISMATCH'
  | 'PAID_AFTER_CANCELLATION'
  | 'DUPLICATE_PAYMENT'
  | 'REFUND_REQUIRED';

export interface OrderStatusEvent {
  at: Date;
  from: OrderStatus | null;
  to: OrderStatus;
  /** 'system:webhook', 'system:verify', 'system:checkout' or the admin's email. */
  by: string;
  note?: string;
}

export interface DbAddress {
  _id?: any;
  firebaseUid: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
