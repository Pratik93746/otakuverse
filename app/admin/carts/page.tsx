import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllFirestoreCarts } from '@/lib/firestore';
import { AdminNav } from '@/components/Admin/AdminNav';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';
import { ShoppingCart, Info, Clock, ExternalLink } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { MOCK_PRODUCTS } from '@/lib/mockProducts';

export default async function AdminCartsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/carts" pageTitle="Active Customer Carts" />;
  }

  // Fetch all active carts from Firestore
  let carts: any[] = [];
  try {
    carts = await getAllFirestoreCarts();
  } catch (err) {
    console.debug('Firestore carts fetch notice:', err);
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
            ACTIVE CUSTOMER CARTS ({carts.length})
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Monitor real-time collector intent, unpurchased items, and active shopper sessions
          </p>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Informational Banner (CART != ORDER) */}
        <div className="bg-amber-50 border border-amber-200 p-4 mb-6 flex items-start gap-3 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider">Cart Activity Notice (CART ≠ ORDER)</p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Items in customer carts represent active shopping sessions and uncompleted intent.
              Cart items do not deduct permanent stock or create billing orders until the customer
              completes checkout and payment verification.
            </p>
          </div>
        </div>

        {/* Carts List */}
        {carts.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="font-heading text-2xl text-gray-400 tracking-wide">NO ACTIVE CARTS</p>
            <p className="text-xs text-gray-500 mt-1">
              Active carts from logged-in collectors will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {carts.map((cart) => (
              <div
                key={cart.userId}
                className="bg-white border border-gray-200 shadow-xs overflow-hidden"
              >
                {/* Cart Customer Bar */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-sm">
                      {cart.userName?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{cart.userName}</p>
                      <p className="text-gray-500">{cart.userEmail}</p>
                      <p className="text-[10px] font-mono text-gray-400">UID: {cart.userId}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block text-[10px]">
                        Total Figures
                      </span>
                      <span className="font-bold text-gray-900">
                        {cart.totalItems} item{cart.totalItems !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block text-[10px]">
                        Cart Total
                      </span>
                      <span className="font-bold text-brand-red text-sm">
                        {formatPrice(cart.subtotal)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 uppercase tracking-wider block text-[10px]">
                        Last Updated
                      </span>
                      <span className="text-gray-600 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {cart.updatedAt
                          ? new Date(cart.updatedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items in Cart Table */}
                <div className="p-4 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/50 text-gray-500 uppercase tracking-wider border-b">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Unit Price</th>
                          <th className="py-2.5 px-3">Quantity</th>
                          <th className="py-2.5 px-3">In-Stock Status</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cart.items.map((item: any, idx: number) => {
                          const catalog = MOCK_PRODUCTS.find(
                            (p) =>
                              p.id === item.productId ||
                              p.slug === item.productId ||
                              (item.slug && p.slug === item.slug) ||
                              (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                          );
                          const name = item.name || catalog?.name || 'Anime Collectible';
                          const img = item.image || catalog?.image || '';
                          const slug = item.slug || catalog?.slug || item.productId;
                          const anime = item.animeName || catalog?.animeName;
                          const character = item.characterName || catalog?.characterName;

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-3 px-3">
                                <div className="flex items-start gap-3">
                                  <Link
                                    href={`/product/${slug}`}
                                    target="_blank"
                                    className="w-10 h-12 bg-gray-50 border border-gray-200 relative overflow-hidden flex-shrink-0 group rounded-xs"
                                  >
                                    {img ? (
                                      <Image
                                        src={img}
                                        alt={name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 font-bold">
                                        OTV
                                      </div>
                                    )}
                                  </Link>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap gap-1 mb-0.5">
                                      {anime && (
                                        <span className="text-[9px] font-bold text-brand-red bg-red-50 border border-red-200 px-1 rounded-xs">
                                          {anime}
                                        </span>
                                      )}
                                      {character && (
                                        <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded-xs">
                                          {character}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-semibold text-gray-900 leading-tight text-xs">{name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-gray-400 font-mono">ID: {item.productId}</span>
                                      <Link
                                        href={`/product/${slug}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-red hover:underline"
                                      >
                                        Store <ExternalLink className="w-2.5 h-2.5" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            <td className="py-3 px-3 text-gray-700">{formatPrice(item.price)}</td>
                            <td className="py-3 px-3 font-semibold text-gray-900">
                              × {item.quantity}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-800 font-semibold rounded-sm">
                                Available ({item.stock ?? 'In Stock'})
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-gray-900">
                              {formatPrice(item.price * item.quantity)}
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
