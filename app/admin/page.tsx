import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllOrders } from '@/lib/db/orders';
import { getAllCarts } from '@/lib/db/carts';
import { getAllUsers } from '@/lib/db/users';
import { getAllProductsAdmin } from '@/lib/db/products';
import Link from 'next/link';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { AdminNav } from '@/components/Admin/AdminNav';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin" pageTitle="Store Management Dashboard" />;
  }

  // 1. Fetch live metrics from MongoDB
  let orders: any[] = [];
  let carts: any[] = [];
  let products: any[] = [];
  let users: any[] = [];

  try {
    const [ordersData, cartsData, productsData, usersData] = await Promise.all([
      getAllOrders(),
      getAllCarts(),
      getAllProductsAdmin(),
      getAllUsers(),
    ]);
    orders = ordersData || [];
    carts = cartsData || [];
    products = productsData || [];
    users = usersData || [];
  } catch (err) {
    console.error('MongoDB dashboard metrics error:', err);
  }

  const productCount = products.length;
  const userCount = users.length;
  const orderCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeCartCount = carts.length;

  // Recent orders
  const recentOrders = orders.slice(0, 6).map((o) => ({
    id: o._id?.toString() || o.orderNumber,
    orderNumber: o.orderNumber,
    customerName: o.customer?.name || o.shippingAddress?.fullName || 'Valued Collector',
    customerEmail: o.customer?.email || '',
    total: o.total,
    status: o.orderStatus || 'CONFIRMED',
    paymentMethod: o.payment?.paymentMethod || 'RAZORPAY',
    createdAt: o.createdAt?.toISOString() || new Date().toISOString(),
  }));

  // Low stock products (stock <= 5)
  const lowStockProducts = products
    .filter((p) => (Number(p.stock) || 0) <= 5)
    .slice(0, 6);

  // Category distribution
  const categoryStats = [
    {
      name: 'Figures',
      slug: 'figures',
      emoji: '🥷',
      tagline: 'Action Figures & Statues',
      count: products.filter((p: any) => {
        const c = (p.category || p.categoryName || '').toLowerCase();
        return c.includes('figure') || c.includes('statue');
      }).length,
    },
    {
      name: 'Katanas',
      slug: 'katanas',
      emoji: '🗡️',
      tagline: 'Nichirin Blades & Swords',
      count: products.filter((p: any) => (p.category || p.categoryName || '').toLowerCase().includes('katana')).length,
    },
    {
      name: 'Keychains',
      slug: 'keychains',
      emoji: '🗝️',
      tagline: 'Spinners, Charms & Emblems',
      count: products.filter((p: any) => (p.category || p.categoryName || '').toLowerCase().includes('keychain')).length,
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      emoji: '🥋',
      tagline: 'Streetwear, Hoodies & Tees',
      count: products.filter((p: any) => (p.category || p.categoryName || '').toLowerCase().includes('cloth')).length,
    },
    {
      name: 'Collectables',
      slug: 'collectables',
      emoji: '💎',
      tagline: 'Plushies, Devil Fruits & Replicas',
      count: products.filter((p: any) => {
        const c = (p.category || p.categoryName || '').toLowerCase();
        return c.includes('collect') || c.includes('plush');
      }).length,
    },
    {
      name: 'Limited Editions',
      slug: 'limited-editions',
      emoji: '⭐',
      tagline: 'Vault Collector Pieces',
      count: products.filter((p: any) => (p.category || p.categoryName || '').toLowerCase().includes('limited') || p.isLimitedEdition).length,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container-wide">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 border border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500">OTAKUVERSE v1.0</span>
            </div>
            <h1 className="font-heading text-3xl tracking-wide uppercase">
              STORE MANAGEMENT DASHBOARD
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Real-time overview of sales revenue, orders, catalog figures, active customer carts, and inventory
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add New Figure
            </Link>
            <Link
              href="/shop"
              target="_blank"
              className="btn-ghost border border-gray-200 text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <span>Live Storefront</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <AdminNav />

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Revenue */}
          <div className="bg-white p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="font-heading text-2xl text-gray-900">{formatPrice(totalRevenue)}</p>
            <p className="text-[11px] text-green-600 mt-2 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Real-time Store Sales
            </p>
          </div>

          {/* Orders */}
          <div className="bg-white p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-brand-red" />
            </div>
            <p className="font-heading text-2xl text-gray-900">{orderCount}</p>
            <Link
              href="/admin/orders"
              className="text-[11px] text-brand-red hover:underline mt-2 inline-flex items-center gap-0.5 font-semibold"
            >
              Manage Orders <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Figures & Inventory */}
          <div className="bg-white p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Figures</span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="font-heading text-2xl text-gray-900">{productCount}</p>
            <Link
              href="/admin/products"
              className="text-[11px] text-blue-600 hover:underline mt-2 inline-flex items-center gap-0.5 font-semibold"
            >
              Inventory Catalog <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Collectors */}
          <div className="bg-white p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Collectors</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="font-heading text-2xl text-gray-900">{userCount}</p>
            <Link
              href="/admin/users"
              className="text-[11px] text-purple-600 hover:underline mt-2 inline-flex items-center gap-0.5 font-semibold"
            >
              View Users <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Active Carts */}
          <div className="bg-white p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Carts</span>
              <ShoppingCart className="w-4 h-4 text-amber-600" />
            </div>
            <p className="font-heading text-2xl text-gray-900">{activeCartCount}</p>
            <Link
              href="/admin/carts"
              className="text-[11px] text-amber-600 hover:underline mt-2 inline-flex items-center gap-0.5 font-semibold"
            >
              Customer Carts <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Tables & Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders Table */}
          <div className="lg:col-span-2 bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl tracking-wider uppercase">
                RECENT ORDERS
              </h2>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-brand-red hover:underline uppercase inline-flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-500">No customer orders recorded yet.</p>
                <p className="text-xs text-gray-400 mt-1">Orders placed by customers will appear here in real-time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                    <tr>
                      <th className="py-3 px-3">Order #</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Payment</th>
                      <th className="py-3 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono font-semibold text-gray-900">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-900">{ord.customerName}</p>
                          <p className="text-[11px] text-gray-400">{ord.customerEmail}</p>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {formatPrice(ord.total)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${ord.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-800'
                                : ord.status === 'SHIPPED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ord.status === 'PROCESSING'
                                    ? 'bg-purple-100 text-purple-800'
                                    : ord.status === 'CONFIRMED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 uppercase text-[11px] text-gray-500 font-semibold">
                          {ord.paymentMethod}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/admin/orders/${ord.orderNumber || ord.id}`}
                            className="text-xs font-semibold text-brand-red hover:underline inline-flex items-center gap-1"
                          >
                            Manage <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h2 className="font-heading text-xl tracking-wider uppercase">
                  LOW STOCK ALERTS
                </h2>
              </div>
              <Link
                href="/admin/products"
                className="text-xs font-bold text-brand-red hover:underline uppercase"
              >
                Catalog
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-green-600 py-4 font-semibold">All figures are well stocked! 🎉</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((p: any) => (
                  <div
                    key={p._id?.toString() || p.slug || p.name}
                    className="p-3 bg-red-50 border border-red-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900 truncate max-w-[180px]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-red-600 font-bold">
                        Only {p.stock} remaining in stock
                      </p>
                    </div>
                    <Link
                      href={`/admin/products`}
                      className="text-[11px] font-bold text-brand-red uppercase underline hover:text-brand-red/80"
                    >
                      Adjust
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories Inventory Breakdown */}
        <div className="bg-white border border-gray-200 p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded">
                  Store Catalog
                </span>
                <span className="text-xs text-gray-500">Live Inventory Breakdown</span>
              </div>
              <h2 className="font-heading text-xl tracking-wider uppercase">
                INVENTORY BY STORE CATEGORY
              </h2>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-bold text-brand-red hover:underline uppercase inline-flex items-center gap-1"
            >
              Manage Catalog <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categoryStats.map((cat) => (
              <Link
                key={cat.slug}
                href={`/admin/products`}
                className="p-4 border rounded border-gray-200 hover:border-gray-400 bg-gray-50/70 hover:bg-white hover:shadow-xs transition-all text-center group"
              >
                <span className="text-3xl block mb-2 group-hover:scale-115 transition-transform">
                  {cat.emoji}
                </span>
                <p className="font-bold text-xs text-gray-900 uppercase tracking-wider leading-tight">
                  {cat.name}
                </p>
                <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                  {cat.tagline}
                </p>
                <span className="inline-block mt-2 font-mono text-[11px] font-bold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded">
                  {cat.count} items
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
