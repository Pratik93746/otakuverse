'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  User,
  Shield,
  Trash2,
  X,
  Loader2,
  Calendar,
  RefreshCw,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface AdminUserItem {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export function AdminUsersClient({ initialUsers }: { initialUsers: AdminUserItem[] }) {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'USER' | 'ADMIN'>('USER');

  // Auto-sync active Firebase user if not already in list
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const userEmail = fbUser.email.toLowerCase();
        setUsers((prev) => {
          const exists = prev.some((u) => u.email.toLowerCase() === userEmail);
          if (!exists) {
            const newUser: AdminUserItem = {
              uid: fbUser.uid,
              name: fbUser.displayName || userEmail.split('@')[0],
              email: fbUser.email!,
              phone: fbUser.phoneNumber || '',
              role: userEmail === 'gojo@otakuverse.com' || userEmail === 'admin@otakuverse.in' ? 'ADMIN' : 'USER',
              createdAt: new Date().toISOString(),
            };
            // Persist to backend
            fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUser),
            }).catch(() => {});
            return [newUser, ...prev];
          }
          return prev;
        });
      }
    });
    return () => unsub();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));

      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'ADMIN' && u.role === 'ADMIN') ||
        (roleFilter === 'USER' && u.role !== 'ADMIN');

      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        toast.success('Collector database refreshed! 🔄');
      }
    } catch {
      toast.error('Failed to refresh users');
    } finally {
      setRefreshing(false);
    }
  };

  // Add user submit
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim() || formEmail.split('@')[0],
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          role: formRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save collector');

      setUsers((prev) => {
        const filtered = prev.filter((u) => u.email.toLowerCase() !== data.user.email.toLowerCase());
        return [data.user, ...filtered];
      });

      toast.success(`Collector ${data.user.name} added successfully! 👤`);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormRole('USER');
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save collector profile');
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!confirm(`Are you sure you want to remove ${user.name} (${user.email})?`)) return;

    try {
      await fetch(`/api/admin/users?id=${encodeURIComponent(user.uid || user.email)}`, {
        method: 'DELETE',
      });
      setUsers((prev) => prev.filter((u) => u.email !== user.email && u.uid !== user.uid));
      toast.success(`Removed ${user.name}`);
    } catch {
      toast.error('Failed to remove user');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  };

  return (
    <div>
      {/* Action and Search Bar */}
      <div className="bg-white border border-gray-200 p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by User Name, Mail ID, or Phone Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:bg-white focus:border-brand-red outline-none"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                roleFilter === 'ALL'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('USER')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                roleFilter === 'USER'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Collectors ({users.filter((u) => u.role !== 'ADMIN').length})
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                roleFilter === 'ADMIN'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Admins ({users.filter((u) => u.role === 'ADMIN').length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 border border-gray-200 text-gray-600 hover:text-gray-900 bg-gray-50 rounded-sm hover:bg-gray-100 transition-colors"
              title="Refresh User Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Collector
            </button>
          </div>
        </div>
      </div>

      {/* Collectors Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="font-heading text-2xl text-gray-400 tracking-wide">NO MATCHING USERS</p>
          <p className="text-xs text-gray-500 mt-1">
            {search ? `No user found matching "${search}"` : 'No registered users found.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Collector / User Name</th>
                  <th className="py-3.5 px-4 font-bold">Mail ID (Email)</th>
                  <th className="py-3.5 px-4 font-bold">Phone Number</th>
                  <th className="py-3.5 px-4 font-bold">Account Role</th>
                  <th className="py-3.5 px-4 font-bold">Joined Date</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'ADMIN';
                  return (
                    <tr key={u.uid || u.email} className="hover:bg-gray-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                              isAdmin
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">UID: {u.uid.substring(0, 14)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-medium text-gray-700">
                        <div className="flex items-center gap-1.5 group">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <a
                            href={`mailto:${u.email}`}
                            className="hover:text-brand-red hover:underline font-mono text-xs"
                          >
                            {u.email}
                          </a>
                          <button
                            onClick={() => copyToClipboard(u.email, 'Email')}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 transition-opacity"
                            title="Copy email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5 group">
                            <Phone className="w-3.5 h-3.5 text-green-600" />
                            <a
                              href={`tel:${u.phone}`}
                              className="font-bold text-gray-900 hover:text-brand-red hover:underline font-mono"
                            >
                              {u.phone}
                            </a>
                            <button
                              onClick={() => copyToClipboard(u.phone!, 'Phone')}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 transition-opacity"
                              title="Copy phone"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Not provided</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                          {isAdmin ? 'ADMINISTRATOR' : 'COLLECTOR'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                          title="Delete Collector"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Collector Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gray-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-red" />
                <h3 className="font-heading text-lg tracking-wide uppercase">Add Collector Account</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddUser} className="p-6 space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  User Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Satoru Gojo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm focus:bg-white focus:border-brand-red outline-none text-xs"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mail ID (Email Address) *
                </label>
                <input
                  type="email"
                  placeholder="e.g. collector@otakuverse.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm focus:bg-white focus:border-brand-red outline-none text-xs"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm focus:bg-white focus:border-brand-red outline-none text-xs"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRole('USER')}
                    className={`py-2 px-3 border text-center font-bold transition-all ${
                      formRole === 'USER'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Collector (User)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole('ADMIN')}
                    className={`py-2 px-3 border text-center font-bold transition-all ${
                      formRole === 'ADMIN'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2.5 px-5 flex items-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Collector Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
