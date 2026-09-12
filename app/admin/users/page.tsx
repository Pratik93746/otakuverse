import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllFirestoreUsers, getAllFirestoreOrders } from '@/lib/firestore';
import { getStoredUsers } from '@/lib/customUsersStore';
import { AdminNav } from '@/components/Admin/AdminNav';
import { AdminUsersClient, AdminUserItem } from './AdminUsersClient';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/users" pageTitle="Registered Collectors Directory" />;
  }

  const localUsers = getStoredUsers();
  let fsUsers: any[] = [];
  try {
    fsUsers = await getAllFirestoreUsers();
  } catch {
    // ignore
  }

  // Also extract any customer contact profiles from orders
  let orderCustomers: any[] = [];
  try {
    const fsOrders = await getAllFirestoreOrders();
    fsOrders.forEach((o) => {
      const email = o.customer?.email || '';
      const phone = o.customer?.phone || o.shippingAddress?.phone || '';
      const name = o.customer?.name || o.shippingAddress?.fullName || '';
      if (email) {
        orderCustomers.push({
          uid: o.userId || `usr_${email.split('@')[0]}`,
          name: name || email.split('@')[0],
          email,
          phone,
          role: 'USER',
          createdAt: o.createdAt || new Date().toISOString(),
        });
      }
    });
  } catch {
    // ignore
  }

  // Deduplicate and merge by email
  const userMap = new Map<string, AdminUserItem>();

  [...localUsers, ...fsUsers, ...orderCustomers].forEach((u) => {
    const emailKey = (u.email || '').toLowerCase().trim();
    if (emailKey) {
      const existing = userMap.get(emailKey);
      userMap.set(emailKey, {
        uid: u.uid || existing?.uid || `usr_${Math.random().toString(36).substring(2, 7)}`,
        name: u.name || existing?.name || emailKey.split('@')[0],
        email: emailKey,
        phone: u.phone || existing?.phone || '',
        role: u.role || existing?.role || (emailKey === 'gojo@otakuverse.com' || emailKey === 'admin@otakuverse.in' ? 'ADMIN' : 'USER'),
        createdAt: u.createdAt || existing?.createdAt || new Date().toISOString(),
      });
    }
  });

  const users = Array.from(userMap.values());

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container-wide">
        {/* Header */}
        <div className="bg-white border border-gray-200 p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500">OTAKUVERSE v1.0</span>
            </div>
            <h1 className="font-heading text-3xl tracking-wide uppercase">
              REGISTERED COLLECTORS ({users.length})
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Live directory of collector accounts, contact details, email addresses, and phone numbers
            </p>
          </div>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Client Interactive Table, Search, and Add Modal */}
        <AdminUsersClient initialUsers={users} />
      </div>
    </div>
  );
}
