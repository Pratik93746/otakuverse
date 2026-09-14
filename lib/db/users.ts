import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbUser, UserRole } from './types';
import { isAllowedAdminEmail } from '@/lib/firebase-admin';

export async function getUsersCollection() {
  await ensureIndexes();
  return await getCollection<DbUser>('users');
}

export async function findUserByFirebaseUid(firebaseUid: string): Promise<DbUser | null> {
  if (!firebaseUid) return null;
  const col = await getUsersCollection();
  return await col.findOne({ firebaseUid });
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  if (!email) return null;
  const col = await getUsersCollection();
  return await col.findOne({ email: email.toLowerCase().trim() });
}

export async function upsertUser(
  firebaseUid: string,
  data: {
    name?: string;
    email: string;
    phone?: string;
    image?: string;
    role?: UserRole;
  }
): Promise<DbUser> {
  if (!firebaseUid) throw new Error('firebaseUid is required to upsert user');

  const col = await getUsersCollection();
  const now = new Date();
  const cleanEmail = data.email.toLowerCase().trim();

  // Determine role: if approved admin email, force ADMIN role
  const isAdmin = isAllowedAdminEmail(cleanEmail) || data.role === 'ADMIN';
  const role: UserRole = isAdmin ? 'ADMIN' : (data.role || 'USER');

  const existing = await col.findOne({ firebaseUid });

  if (existing) {
    const updatedRole = existing.role === 'ADMIN' || isAdmin ? 'ADMIN' : (data.role || existing.role);
    const updateDoc: Partial<DbUser> = {
      name: data.name || existing.name,
      email: cleanEmail,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      image: data.image !== undefined ? data.image : existing.image,
      role: updatedRole,
      updatedAt: now,
    };

    await col.updateOne({ firebaseUid }, { $set: updateDoc });
    return { ...existing, ...updateDoc };
  }

  const newUser: DbUser = {
    firebaseUid,
    name: data.name || cleanEmail.split('@')[0],
    email: cleanEmail,
    phone: data.phone || '',
    role,
    image: data.image || '',
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(newUser as any);
  return newUser;
}

export async function getAllUsers(): Promise<DbUser[]> {
  const col = await getUsersCollection();
  return await col.find({}).sort({ createdAt: -1 }).toArray();
}

export async function updateUserRole(firebaseUid: string, role: UserRole): Promise<boolean> {
  const col = await getUsersCollection();
  const res = await col.updateOne(
    { firebaseUid },
    { $set: { role, updatedAt: new Date() } }
  );
  return res.matchedCount > 0;
}

export async function deleteUser(firebaseUid: string): Promise<boolean> {
  const col = await getUsersCollection();
  const res = await col.deleteOne({ firebaseUid });
  return res.deletedCount > 0;
}
