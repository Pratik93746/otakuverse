import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllUsers } from '@/lib/db/users';
import { getAllOrders } from '@/lib/db/orders';
import { AdminNav } from '@/components/Admin/AdminNav';
import { AdminUsersClient, AdminUserItem } from './AdminUsersClient';
import { AdminAuthGate } from '@/components/Admin/AdminAuthGate';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <AdminAuthGate currentSession={session} callbackUrl="/admin/users" pageTitle="Registered Collectors Directory" />;
  }

  let dbUsers: any[] = [];
  try {
    dbUsers = await getAllUsers();
  } catch (err) {
    console.error('Failed to fetch users from MongoDB:', err);
  }

  // Also extract customer profiles from orders if any
  let orderCustomers: any[] = [];
  try {
    const orders = await getAllOrders();
    orders.forEach((o) => {
      const email = o.customer?.email || '';
      const phone = o.customer?.phone || o.shippingAddress?.phone || '';
      const name = o.customer?.name || o.shippingAddress?.fullName || '';
      if (email) {
        orderCustomers.push({
          uid: o.firebaseUid,
          name: name || email.split('@')[0],
          email,
          phone,
          role: 'USER',
          createdAt: o.createdAt?.toISOString() || new Date().toISOString(),
        });
      }
    });
  } catch {
    // ignore
  }

  // Deduplicate and merge by email
  const userMap = new Map<string, AdminUserItem>();

  [...dbUsers, ...orderCustomers].forEach((u) => {
    const emailKey = (u.email || '').toLowerCase().trim();
    if (emailKey) {
      const existing = userMap.get(emailKey);
      userMap.set(emailKey, {
        uid: u.firebaseUid || u.uid || existing?.uid || `usr_${emailKey.split('@')[0]}`,
        name: u.name || existing?.name || emailKey.split('@')[0],
        email: emailKey,
        phone: u.phone || existing?.phone || '',
        role: u.role || existing?.role || (emailKey === 'gojo@otakuverse.com' || emailKey === 'admin@otakuverse.in' ? 'ADMIN' : 'USER'),
        createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt || existing?.createdAt || new Date().toISOString()),
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
