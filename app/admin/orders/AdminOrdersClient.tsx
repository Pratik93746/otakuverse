'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Package,
  ArrowUpRight,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';
import toast from 'react-hot-toast';

export interface AdminOrderItem {
  productId: string;
  name: string;
  slug?: string;
  image?: string;
  quantity: number;
  price: number;
  characterName?: string;
  animeName?: string;
}

export interface AdminOrderAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  country?: string;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: AdminOrderAddress;
  fullAddressText: string;
  items: AdminOrderItem[];
  totalQuantity: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export function AdminOrdersClient({ initialOrders }: { initialOrders: AdminOrderRow[] }) {
  const [orders, setOrders] = useState<AdminOrderRow[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Quick order status update directly from table
  const handleQuickStatusChange = async (orderNumber: string, newStatus: string) => {
    setUpdatingId(orderNumber);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: newStatus } : o))
        );
        toast.success(`Order #${orderNumber} updated to ${newStatus}`);
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Network error updating order status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.fullAddressText.toLowerCase().includes(q) ||
        o.items.some((i) => (i.name || '').toLowerCase().includes(q));

      // Status Filter
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;

      // Payment Filter
      let matchPayment = true;
      if (paymentFilter === 'COD') {
        matchPayment = o.paymentMethod.toUpperCase() === 'COD';
      } else if (paymentFilter === 'ONLINE') {
        matchPayment = o.paymentMethod.toUpperCase() !== 'COD';
      } else if (paymentFilter === 'PAID') {
        matchPayment = o.paymentStatus === 'PAID';
      } else if (paymentFilter === 'PENDING') {
        matchPayment = o.paymentStatus === 'PENDING';
      }

      return matchSearch && matchStatus && matchPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  // Metric stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const codCount = orders.filter((o) => o.paymentMethod.toUpperCase() === 'COD').length;
  const paidCount = orders.filter((o) => o.paymentStatus === 'PAID').length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6">
      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Orders</p>
          <p className="font-heading text-2xl text-gray-900">{orders.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">Live customer orders</p>
        </div>

        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Value</p>
          <p className="font-heading text-2xl text-green-700">{formatPrice(totalRevenue)}</p>
          <p className="text-[10px] text-green-600 mt-1">Gross order revenue</p>
        </div>

        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Cash on Delivery</p>
          <p className="font-heading text-2xl text-amber-700">{codCount}</p>
          <p className="text-[10px] text-amber-600 mt-1">Pay upon delivery</p>
        </div>

        <div className="bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Active / Pending</p>
          <p className="font-heading text-2xl text-blue-700">{pendingCount}</p>
          <p className="text-[10px] text-blue-600 mt-1">Awaiting dispatch/delivery</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username, customer, phone, product, address, order #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:bg-white focus:border-brand-red outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:border-brand-red outline-none font-semibold text-gray-700"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:border-brand-red outline-none font-semibold text-gray-700"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="COD">💵 Cash on Delivery (COD)</option>
            <option value="ONLINE">💳 Online / Razorpay</option>
            <option value="PAID">✅ Paid Only</option>
            <option value="PENDING">⏳ Payment Pending</option>
          </select>
        </div>
      </div>

      {/* Main Tabular Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="font-heading text-xl text-gray-700 uppercase tracking-wider">No Orders Found</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL' || paymentFilter !== 'ALL'
              ? 'Try changing your search keywords or filter selections.'
              : 'As customers order figures and items from the store, they will automatically reflect here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider border-b text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Order # & Date</th>
                  <th className="py-3.5 px-4 font-bold">Username</th>
                  <th className="py-3.5 px-4 font-bold">Phone Number</th>
                  <th className="py-3.5 px-4 font-bold">Product</th>
                  <th className="py-3.5 px-4 font-bold text-center">Quantity</th>
                  <th className="py-3.5 px-4 font-bold">Address</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Mode of Payment</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors align-top">
                    {/* 1. Order Number & Date */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.orderNumber || order.id}`}
                        className="font-mono font-bold text-gray-900 hover:text-brand-red text-xs block"
                      >
                        #{order.orderNumber}
                      </Link>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <span className="text-[9px] text-gray-400 font-mono">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* 2. Username / Customer */}
                    <td className="py-4 px-4 min-w-[170px]">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          {order.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 leading-snug">
                            {order.customerName}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate" title={order.customerEmail}>
                            {order.customerEmail || '—'}
                          </p>
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded">
                            Collector
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Phone Number */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {order.customerPhone ? (
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="inline-flex items-center gap-1 text-gray-900 hover:text-brand-red font-semibold font-mono text-[11px] bg-gray-50 border border-gray-200 px-2 py-1 rounded transition-colors"
                          title="Click to call customer"
                        >
                          <Phone className="w-3 h-3 text-green-600" />
                          {order.customerPhone}
                        </a>
                      ) : (
                        <span className="text-gray-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 4. Product */}
                    <td className="py-4 px-4 min-w-[240px]">
                      <div className="space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => {
                            const catalog = MOCK_PRODUCTS.find(
                              (p) =>
                                p.id === item.productId ||
                                p.slug === item.productId ||
                                (item.slug && p.slug === item.slug) ||
                                (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                            );
                            const itemName = item.name || catalog?.name || 'Anime Collectible';
                            const itemImg = item.image || catalog?.image || '';

                            return (
                              <div key={idx} className="flex items-center gap-2.5">
                                <div className="w-9 h-11 bg-gray-100 border border-gray-200 relative overflow-hidden flex-shrink-0 rounded-xs">
                                  {itemImg ? (
                                    <Image src={itemImg} alt={itemName} fill className="object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">
                                      OTV
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 text-xs leading-snug line-clamp-2" title={itemName}>
                                    {itemName}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-mono">
                                    {formatPrice(item.price)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-gray-400">No items recorded</span>
                        )}
                      </div>
                    </td>

                    {/* 5. Quantity */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-heading text-base font-black text-gray-900 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                          {order.totalQuantity}
                        </span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">
                          {order.totalQuantity === 1 ? 'Unit' : 'Units'}
                        </span>
                        {order.items && order.items.length > 1 && (
                          <span className="text-[9px] text-purple-700 mt-0.5">
                            ({order.items.length} figures)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Address */}
                    <td className="py-4 px-4 min-w-[220px] max-w-[260px]">
                      <div className="text-[11px] leading-relaxed text-gray-800 bg-gray-50/70 p-2 border border-gray-200 rounded">
                        <div className="flex items-center gap-1 font-bold text-gray-900 mb-0.5">
                          <MapPin className="w-3 h-3 text-brand-red shrink-0" />
                          <span className="truncate">{order.shippingAddress.fullName || order.customerName}</span>
                        </div>
                        <p className="text-gray-600 line-clamp-2">
                          {order.shippingAddress.addressLine1}
                          {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                        </p>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                          <span className="font-mono text-gray-900">{order.shippingAddress.pinCode}</span>
                        </p>
                      </div>
                    </td>

                    {/* 7. Amount */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <p className="font-heading text-base font-black text-brand-red">
                        {formatPrice(order.total)}
                      </p>
                      <span className="text-[10px] text-gray-500 uppercase font-medium">
                        Pan-India Delivery
                      </span>
                    </td>

                    {/* 8. Mode of Payment */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            order.paymentMethod.toUpperCase() === 'COD'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          }`}
                        >
                          <CreditCard className="w-3 h-3" />
                          {order.paymentMethod.toUpperCase() === 'COD' ? 'Cash On Delivery' : 'Online / Cards'}
                        </span>
                        <div>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            ● {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 9. Order Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="relative inline-block">
                        <select
                          value={order.status}
                          disabled={updatingId === order.orderNumber}
                          onChange={(e) => handleQuickStatusChange(order.orderNumber, e.target.value)}
                          className={`text-[10px] font-bold uppercase py-1 px-2 rounded border appearance-none pr-5 cursor-pointer outline-none transition-colors ${
                            order.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : order.status === 'SHIPPED'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : order.status === 'PROCESSING'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : order.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : order.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="PENDING">PENDING</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>

                    {/* 10. Action */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.orderNumber || order.id}`}
                        className="btn-primary text-[11px] py-1.5 px-3 inline-flex items-center gap-1 font-semibold shadow-xs"
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
  );
}
