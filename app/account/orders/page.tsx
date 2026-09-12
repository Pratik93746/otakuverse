import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserFirestoreOrders } from '@/lib/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default async function OrdersHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/account/orders');
  }

  const userId = session.user.id;
  const userEmail = session.user.email || undefined;

  // 1. Fetch from Firestore
  let orders: any[] = [];
  try {
    const fsOrders = await getUserFirestoreOrders(userId, userEmail);
    if (fsOrders.length > 0) {
      orders = fsOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.orderStatus,
        paymentStatus: o.payment.paymentStatus,
        createdAt: new Date(o.createdAt),
        address: {
          name: o.shippingAddress.fullName,
          city: o.shippingAddress.city,
          state: o.shippingAddress.state,
        },
        items: o.items.map((i, idx) => ({
          id: `${o.orderNumber}-item-${idx}`,
          name: i.name,
          image: i.image,
          price: i.purchasePrice,
          quantity: i.quantity,
          total: i.subtotal,
        })),
      }));
    }
  } catch (err) {
    console.debug('Firestore orders error:', err);
  }

  // 2. Fallback to Prisma if Firestore returned no orders
  if (orders.length === 0) {
    try {
      const dbOrders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: true,
          address: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      orders = dbOrders;
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-wide">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/account" className="hover:text-brand-red flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Account
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Orders</span>
        </div>

        <h1 className="font-heading text-3xl md:text-4xl tracking-widest uppercase mb-8">
          YOUR ORDERS ({orders.length})
        </h1>

        {orders.length === 0 ? (
          <div className="bg-white border border-gray-100 p-12 text-center">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="font-heading text-2xl tracking-wide text-gray-400 mb-2">
              NO ORDERS YET
            </p>
            <p className="text-sm text-gray-500 mb-6">
              When you purchase figures, your tracking and receipt details will show up here.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse Figures
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-gray-100 overflow-hidden shadow-sm"
              >
                {/* Order Top Bar */}
                <div className="bg-gray-50 border-b border-gray-100 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block">Order Placed</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block">Total Amount</span>
                      <span className="font-bold text-brand-red text-sm">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block">Ship To</span>
                      <span className="font-semibold text-gray-900">
                        {order.address?.name ?? session.user.name ?? 'Customer'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">Order #{order.orderNumber}</span>
                    <span
                      className={`font-bold text-[10px] tracking-wider uppercase px-2.5 py-1 ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'SHIPPED'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'PROCESSING'
                          ? 'bg-purple-100 text-purple-800'
                          : order.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 sm:p-6 divide-y divide-gray-100">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-20 bg-gray-50 border border-gray-100 flex-shrink-0 relative overflow-hidden">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-300">
                              OTV
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-gray-900">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
