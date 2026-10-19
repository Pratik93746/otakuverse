import { getServerSession } from 'next-auth';
import { authenticateAdminSession } from '@/lib/admin-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getOrderByNumber } from '@/lib/db/orders';
import { AdminNav } from '@/components/Admin/AdminNav';
import { OrderStatusChanger } from './OrderStatusChanger';
import { OrderInvoicePrint } from '@/components/Admin/OrderInvoicePrint';
import Link from 'next/link';
import Image from 'next/image';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import {
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Package,
  Calendar,
  ExternalLink,
  Phone,
  Truck,
  CheckCircle2,
  Box,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';

export default async function AdminOrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(await authenticateAdminSession())) {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/orders" pageTitle="Order Fulfillment Details" />;
  }

  const { id } = await props.params;

  // Fetch order from MongoDB Atlas
  let order: any = null;
  try {
    const dbOrder = await getOrderByNumber(id);
    if (dbOrder) {
      order = {
        id: dbOrder._id?.toString() || dbOrder.orderNumber,
        orderNumber: dbOrder.orderNumber,
        userId: dbOrder.firebaseUid,
        customerName: dbOrder.customer?.name || 'Valued Collector',
        customerEmail: dbOrder.customer?.email || '',
        customerPhone: dbOrder.customer?.phone || dbOrder.shippingAddress?.phone || '',
        customerUid: dbOrder.firebaseUid,
        shippingAddress: dbOrder.shippingAddress,
        items: dbOrder.items,
        subtotal: dbOrder.subtotal,
        shipping: dbOrder.shipping,
        tax: dbOrder.tax,
        discount: dbOrder.discount,
        total: dbOrder.total,
        couponCode: dbOrder.couponCode,
        deliveryMethod: dbOrder.deliveryMethod,
        orderStatus: dbOrder.orderStatus,
        payment: dbOrder.payment,
        tracking: dbOrder.tracking,
        createdAt: new Date(dbOrder.createdAt),
        updatedAt: new Date(dbOrder.updatedAt),
      };
    }
  } catch (err) {
    console.error('MongoDB order detail error:', err);
  }

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container-wide">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/admin/orders" className="hover:text-brand-red flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold font-mono">Order #{order.orderNumber}</span>
        </div>

        {/* Title Bar */}
        <div className="bg-white border border-gray-200 p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500">Order Management</span>
            </div>
            <h1 className="font-heading text-3xl tracking-wide uppercase">
              ORDER #{order.orderNumber}
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <OrderInvoicePrint order={order} />
            <span
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm ${order.orderStatus === 'DELIVERED'
                  ? 'bg-green-100 text-green-800'
                  : order.orderStatus === 'SHIPPED'
                    ? 'bg-blue-100 text-blue-800'
                    : order.orderStatus === 'PROCESSING'
                      ? 'bg-purple-100 text-purple-800'
                      : order.orderStatus === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.orderStatus === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                }`}
            >
              Status: {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Status Update Component */}
        <div className="mb-6">
          <OrderStatusChanger
            order={JSON.parse(JSON.stringify({
              orderNumber: order.orderNumber,
              orderStatus: order.orderStatus,
              payment: order.payment,
              total: order.total,
              reviewFlags: order.reviewFlags || [],
              tracking: order.tracking,
            }))}
          />
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Order Items & Pricing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Table */}
            <div className="bg-white border border-gray-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-red" />
                  <h2 className="font-heading text-xl tracking-wider uppercase">
                    PURCHASED FIGURES ({order.items.length})
                  </h2>
                </div>
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Historical Price Snapshot
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <tr>
                      <th className="py-3.5 px-4">Figure & Specifications</th>
                      <th className="py-3.5 px-4">Unit Price</th>
                      <th className="py-3.5 px-4">Quantity to Deliver</th>
                      <th className="py-3.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item: any, idx: number) => {
                      const catalogItem = MOCK_PRODUCTS.find(
                        (p) =>
                          p.id === item.productId ||
                          p.slug === item.productId ||
                          (item.slug && p.slug === item.slug) ||
                          (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                      );

                      const name = item.name || catalogItem?.name || 'Authentic Anime Collectible';
                      const image = item.image || catalogItem?.image || '';
                      const slug = item.slug || catalogItem?.slug || item.productId;
                      const anime = item.animeName || catalogItem?.animeName;
                      const character = item.characterName || catalogItem?.characterName;
                      const brand = item.brandName || catalogItem?.brandName;
                      const sku = item.sku || catalogItem?.id || item.productId;

                      return (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-4">
                              {/* Figure Thumbnail with Live Link */}
                              <Link
                                href={`/product/${slug}`}
                                target="_blank"
                                className="w-16 h-20 bg-gray-50 border border-gray-200 relative overflow-hidden flex-shrink-0 group rounded shadow-xs"
                                title="Click to view live product"
                              >
                                {image ? (
                                  <Image
                                    src={image}
                                    alt={name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-300">
                                    OTV
                                  </div>
                                )}
                              </Link>

                              <div className="min-w-0 flex-1 space-y-1">
                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {anime && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-600/10 text-brand-red border border-red-600/20 rounded">
                                      {anime}
                                    </span>
                                  )}
                                  {character && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-purple-600/10 text-purple-700 border border-purple-600/20 rounded">
                                      {character}
                                    </span>
                                  )}
                                  {brand && (
                                    <span className="text-[10px] font-medium text-gray-500">
                                      by {brand}
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <p className="font-bold text-gray-900 text-sm leading-snug">
                                  {name}
                                </p>

                                {/* SKU & Link */}
                                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                                  <span className="text-[11px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                    SKU: {sku}
                                  </span>
                                  <Link
                                    href={`/product/${slug}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-red hover:underline"
                                  >
                                    View Live Store Page <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-medium text-gray-800">
                            {formatPrice(item.purchasePrice || item.price)}
                          </td>

                          <td className="py-4 px-4">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-brand-red font-black text-xs rounded-md shadow-xs">
                              <Box className="w-3.5 h-3.5" />
                              <span>PACK & DELIVER: {item.quantity} UNIT{item.quantity > 1 ? 'S' : ''}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right font-bold text-gray-900 text-sm">
                            {formatPrice(item.subtotal || (item.purchasePrice || item.price) * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warehouse Fulfillment & Packaging Checklist */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 text-white p-6 shadow-md rounded-sm">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-brand-red" />
                  <h3 className="font-heading text-lg tracking-wider uppercase">
                    WAREHOUSE DISPATCH & PACKAGING DIRECTIVE
                  </h3>
                </div>
                <span className="text-xs bg-white/10 px-2.5 py-1 rounded font-mono text-gray-300">
                  Method: {order.deliveryMethod === 'express' ? '⚡ EXPRESS (2-3 Days)' : '🚚 STANDARD (4-7 Days)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 bg-white/[0.04] p-3.5 rounded border border-white/[0.08]">
                  <p className="font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Figure Quality Check
                  </p>
                  <ul className="space-y-1 text-gray-400 pl-5 list-disc">
                    <li>Inspect original factory seals on outer figure box</li>
                    <li>Verify window box is free of dents or scratches</li>
                    <li>Double-check figure character against order specifications</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-white/[0.04] p-3.5 rounded border border-white/[0.08]">
                  <p className="font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-yellow-400" />
                    Collector-Safe Protection
                  </p>
                  <ul className="space-y-1 text-gray-400 pl-5 list-disc">
                    <li>Wrap figure box in 3-layer bubble wrap</li>
                    <li>Pack with custom shock-absorbing foam corners</li>
                    <li>Attach shipping label to destination: <strong className="text-white">{order.shippingAddress?.city || 'India'}</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white border border-gray-200 p-6 shadow-xs">
              <h3 className="font-heading text-lg tracking-wider uppercase mb-4">Financial Ledger</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping ({order.deliveryMethod})</span>
                  <span className="font-medium text-gray-900">
                    {order.shipping === 0 ? (
                      <span className="text-green-600 font-semibold">FREE</span>
                    ) : (
                      formatPrice(order.shipping)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST / Tax</span>
                  <span className="font-medium text-gray-900">
                    {order.tax === 0 ? <span className="text-green-600 font-semibold">Included</span> : formatPrice(order.tax)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount ({order.couponCode || 'Coupon'})</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Grand Total</span>
                  <span className="text-brand-red text-base">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customer, Address & Payment */}
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="bg-white border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-gray-900">
                <User className="w-4 h-4 text-brand-red" />
                <h3 className="font-heading text-base tracking-wider uppercase">Customer Profile</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Name</span>
                  <span className="font-semibold text-gray-900">{order.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Email</span>
                  <span className="text-gray-800">{order.customerEmail}</span>
                </div>
                {order.customerPhone && (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Phone</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-brand-red font-semibold hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {order.customerPhone}
                      </a>
                      <a
                        href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded hover:bg-green-100"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Firebase UID</span>
                  <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 select-all">
                    {order.customerUid}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-white border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin className="w-4 h-4 text-brand-red" />
                  <h3 className="font-heading text-base tracking-wider uppercase">Delivery Address</h3>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  Destination
                </span>
              </div>
              {order.shippingAddress ? (
                <div className="space-y-1.5 text-xs text-gray-700 bg-gray-50/60 p-3 rounded border border-gray-100">
                  <p className="font-bold text-gray-900 text-sm">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p className="font-medium text-gray-800">
                    {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                    <span className="font-bold text-gray-900">{order.shippingAddress.pinCode}</span>
                  </p>
                  <p className="text-gray-500 font-semibold">{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60 mt-2">
                      <Phone className="w-3.5 h-3.5 text-brand-red" />
                      <a
                        href={`tel:${order.shippingAddress.phone}`}
                        className="text-gray-900 font-mono font-bold hover:text-brand-red"
                      >
                        {order.shippingAddress.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No address snapshot recorded.</p>
              )}
            </div>

            {/* Payment Info Card */}
            <div className="bg-white border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-gray-900">
                <CreditCard className="w-4 h-4 text-brand-red" />
                <h3 className="font-heading text-base tracking-wider uppercase">Payment Information</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Payment Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm mt-0.5 ${order.payment?.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-orange-100 text-orange-800'
                      }`}
                  >
                    {order.payment?.paymentStatus === 'PAID' ? 'Paid'
                      : order.payment?.paymentStatus === 'REFUNDED' ? 'Refunded'
                      : order.payment?.paymentStatus === 'FAILED' ? 'Payment failed'
                      : order.payment?.paymentMethod === 'COD' ? 'Pay on delivery' : 'Awaiting payment'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Payment Method</span>
                  <span className="font-semibold text-gray-900 uppercase">
                    {order.payment?.paymentMethod || 'RAZORPAY'}
                  </span>
                </div>
                {order.payment?.paymentId && (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Razorpay Payment ID</span>
                    <span className="font-mono text-[10px] text-gray-700 select-all">
                      {order.payment.paymentId}
                    </span>
                  </div>
                )}
                {order.payment?.razorpayOrderId && (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Razorpay Order ID</span>
                    <span className="font-mono text-[10px] text-gray-700 select-all">
                      {order.payment.razorpayOrderId}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Amount Charged</span>
                  <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Courier Dispatch & Tracking Card */}
            {order.tracking?.trackingNumber && (
              <div className="bg-white border border-gray-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 text-gray-900">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-red" />
                    <h3 className="font-heading text-base tracking-wider uppercase">Logistics & Tracking</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    Dispatched
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Logistics Carrier</span>
                    <span className="font-bold text-gray-900">{order.tracking.carrier || 'Delhivery'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">AWB / Consignment No</span>
                    <span className="font-mono font-bold text-brand-red select-all">{order.tracking.trackingNumber}</span>
                  </div>
                  {order.tracking.trackingUrl && (
                    <div className="pt-1">
                      <a
                        href={order.tracking.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-dark w-full py-2 text-xs flex items-center justify-center gap-1.5"
                      >
                        Track Shipment Live <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
