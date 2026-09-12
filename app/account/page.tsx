import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserFirestoreOrders, getFirestoreAddresses } from '@/lib/firestore';
import Link from 'next/link';
import { Package, User, Heart, LogOut, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login?callbackUrl=/account');
  }

  const userId = session.user.id;
  const userEmail = session.user.email || undefined;

  // 1. Fetch orders from Firestore with Prisma fallback
  let orders: any[] = [];
  try {
    const fsOrders = await getUserFirestoreOrders(userId, userEmail);
    if (fsOrders.length > 0) {
      orders = fsOrders.slice(0, 5).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.orderStatus,
        createdAt: new Date(o.createdAt),
        items: o.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.purchasePrice,
        })),
      }));
    }
  } catch (err) {
    console.debug('Firestore user orders notice:', err);
  }

  if (orders.length === 0) {
    try {
      const dbOrders = await prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      orders = dbOrders;
    } catch {
      // ignore
    }
  }

  // 2. Fetch saved addresses from Firestore with Prisma fallback
  let addresses: any[] = [];
  try {
    const fsAddresses = await getFirestoreAddresses(userId);
    if (fsAddresses.length > 0) {
      addresses = fsAddresses.map((a) => ({
        id: a.id,
        name: a.fullName,
        line1: a.addressLine1,
        line2: a.addressLine2,
        city: a.city,
        state: a.state,
        pincode: a.pinCode,
        phone: a.phone,
      }));
    }
  } catch (err) {
    console.debug('Firestore user addresses notice:', err);
  }

  if (addresses.length === 0) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { addresses: true },
      });
      if (dbUser?.addresses) {
        addresses = dbUser.addresses;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container-wide">
        {/* Header */}
        <div className="bg-white border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-red text-white flex items-center justify-center font-heading text-2xl">
              {session.user.name?.slice(0, 2).toUpperCase() ?? 'OV'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl md:text-3xl tracking-wide uppercase">
                  {session.user.name ?? 'Collector'}
                </h1>
                {session.user.role === 'ADMIN' && (
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{session.user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {session.user.role === 'ADMIN' && (
              <Link href="/admin" className="btn-dark text-xs py-2 px-4">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Admin Dashboard
              </Link>
            )}
            <Link href="/wishlist" className="btn-ghost border border-gray-200 text-xs py-2 px-4 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-brand-red" /> Wishlist
            </Link>
            <Link href="/api/auth/signout" className="btn-ghost border border-gray-200 text-xs py-2 px-4 flex items-center gap-1.5 text-red-600 hover:bg-red-50">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-red" />
                  <h2 className="font-heading text-xl tracking-wider uppercase">
                    RECENT ORDERS
                  </h2>
                </div>
                <Link
                  href="/account/orders"
                  className="text-xs font-bold text-brand-red uppercase tracking-wider hover:underline"
                >
                  View All ({orders.length})
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm mb-4">You haven&apos;t placed any orders yet.</p>
                  <Link href="/shop" className="btn-primary text-xs py-2.5">
                    Start Collecting
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-sm">
                            Order #{order.orderNumber}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-red">{formatPrice(order.total)}</p>
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                              order.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-700'
                                : order.status === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-700'
                                : order.status === 'PROCESSING'
                                ? 'bg-purple-100 text-purple-700'
                                : order.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {order.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account Details & Addresses */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-brand-red" />
                <h3 className="font-heading text-lg tracking-wider uppercase">
                  SAVED ADDRESSES
                </h3>
              </div>

              {addresses && addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-3 bg-gray-50 text-xs text-gray-700 space-y-1 border border-gray-100">
                      <p className="font-semibold text-gray-900">{addr.name}</p>
                      <p>{addr.line1}</p>
                      {addr.line2 && <p>{addr.line2}</p>}
                      <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-gray-500">Phone: {addr.phone}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Addresses will be automatically saved when you complete a checkout.
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-brand-red to-red-700 text-white p-6">
              <p className="font-heading text-xl tracking-wider mb-2">OTAKU CLUB REWARDS</p>
              <p className="text-xs text-red-100 mb-4 leading-relaxed">
                Earn 50 Collector Points on every ₹1000 spent. Redeem points for exclusive discounts!
              </p>
              <div className="bg-white/20 backdrop-blur-sm p-3 flex justify-between items-center text-xs">
                <span>Available Points:</span>
                <span className="font-bold text-sm">250 PTS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
