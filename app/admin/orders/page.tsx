import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllOrders } from '@/lib/db/orders';
import { AdminNav } from '@/components/Admin/AdminNav';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';
import Link from 'next/link';
import Image from 'next/image';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import { Package, ArrowUpRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/orders" pageTitle="Store Orders & Fulfillment" />;
  }

  // Fetch all orders from MongoDB Atlas
  let orders: any[] = [];
  try {
    const dbOrders = await getAllOrders();
    orders = dbOrders.map((o) => ({
      id: o._id?.toString() || o.orderNumber,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || 'Valued Collector',
      customerEmail: o.customer?.email || '',
      customerPhone: o.customer?.phone || o.shippingAddress?.phone || '',
      addressSummary: o.shippingAddress
        ? `${o.shippingAddress.city}, ${o.shippingAddress.state}`
        : '—',
      itemCount: o.items?.length || 0,
      items: o.items || [],
      itemSummary: o.items?.map((i: any) => `${i.name} (x${i.quantity})`).join(', ') || '',
      total: o.total,
      status: o.orderStatus,
      paymentStatus: o.payment?.paymentStatus || 'PENDING',
      paymentMethod: o.payment?.paymentMethod || 'RAZORPAY',
      createdAt: o.createdAt,
    }));
  } catch (err) {
    console.error('MongoDB admin orders error:', err);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container-wide">
        {/* Header */}
        <div className="bg-white border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
              Admin Panel
            </span>
            <span className="text-xs text-gray-500">OTAKUVERSE v1.0</span>
          </div>
          <h1 className="font-heading text-3xl tracking-wide uppercase">
            ORDER FULFILLMENT & LOGISTICS ({orders.length})
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Track order status, manage delivery dispatches, and inspect customer order items & payments
          </p>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {orders.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="font-heading text-2xl text-gray-400 tracking-wide">NO ORDERS FOUND</p>
            <p className="text-xs text-gray-500 mt-1">
              Customer orders placed via checkout will be listed here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                  <tr>
                    <th className="py-3.5 px-4">Order # & Date</th>
                    <th className="py-3.5 px-4">Customer & Location</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Order Status</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/orders/${order.orderNumber || order.id}`}
                          className="font-mono font-bold text-gray-900 hover:text-brand-red transition-colors"
                        >
                          #{order.orderNumber}
                        </Link>
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-900">{order.customerName}</p>
                        <p className="text-[11px] text-gray-500">{order.customerEmail}</p>
                        <p className="text-[10px] text-gray-400">{order.addressSummary}</p>
                      </td>
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div className="space-y-1.5">
                          {order.items && order.items.length > 0 ? (
                            order.items.slice(0, 3).map((item: any, i: number) => {
                              const catalog = MOCK_PRODUCTS.find(
                                (p) =>
                                  p.id === item.productId ||
                                  p.slug === item.productId ||
                                  (item.slug && p.slug === item.slug) ||
                                  (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                              );
                              const itemName = item.name || catalog?.name || 'Anime Figure';
                              const itemImg = item.image || catalog?.image || '';

                              return (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-7 h-9 bg-gray-100 border border-gray-200 relative overflow-hidden flex-shrink-0 rounded-xs">
                                    {itemImg ? (
                                      <Image src={itemImg} alt={itemName} fill className="object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">
                                        OTV
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 truncate text-[11px] leading-tight">
                                      {itemName}
                                    </p>
                                    <span className="inline-block text-[9px] font-black uppercase tracking-wider text-brand-red bg-red-50 border border-red-200 px-1 py-0.2 rounded">
                                      PACK: ×{item.quantity}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-gray-500 text-[11px]">{order.itemSummary || `${order.itemCount} items`}</p>
                          )}
                          {order.items && order.items.length > 3 && (
                            <p className="text-[10px] text-gray-400 font-semibold">
                              + {order.items.length - 3} more figures
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-brand-red text-sm">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-sm ${order.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'PROCESSING'
                                  ? 'bg-purple-100 text-purple-800'
                                  : order.status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : order.status === 'CANCELLED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-orange-100 text-orange-800'
                            }`}
                        >
                          {order.paymentMethod} • {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/orders/${order.orderNumber || order.id}`}
                          className="btn-primary text-[11px] py-1.5 px-3 inline-flex items-center gap-1 font-semibold"
                        >
                          Manage <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
