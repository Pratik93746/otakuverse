'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

const adminTabs = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Customer Carts', href: '/admin/carts', icon: ShoppingCart },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-gray-200 mb-8 sticky top-0 z-20 shadow-xs">
      <div className="container-wide">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
          <nav className="flex items-center space-x-1 sm:space-x-2 py-2">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold tracking-wider uppercase transition-all rounded-sm whitespace-nowrap ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          <Link
            href="/shop"
            target="_blank"
            className="hidden md:flex items-center gap-1.5 text-xs text-brand-red font-semibold hover:underline px-3 py-2"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
