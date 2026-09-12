import fs from 'fs';
import path from 'path';

export interface StoredUser {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

const STORAGE_FILE = path.join(process.cwd(), 'lib', 'custom-users.json');

const INITIAL_USERS: StoredUser[] = [
  {
    uid: 'usr_admin_gojo',
    name: 'Gojo Satoru',
    email: 'gojo@otakuverse.com',
    phone: '+91 98765 43210',
    role: 'ADMIN',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'usr_admin_otaku',
    name: 'Otakuverse Staff',
    email: 'admin@otakuverse.in',
    phone: '+91 91234 56789',
    role: 'ADMIN',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function ensureFileExists() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(INITIAL_USERS, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('⚠️ [customUsersStore] Could not initialize storage file:', err);
  }
}

export function getStoredUsers(): StoredUser[] {
  try {
    ensureFileExists();
    if (!fs.existsSync(STORAGE_FILE)) return INITIAL_USERS;
    const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(content || '[]');
    return parsed.length > 0 ? parsed : INITIAL_USERS;
  } catch (err) {
    console.warn('⚠️ [customUsersStore] Error reading users:', err);
    return INITIAL_USERS;
  }
}

export function saveStoredUser(user: Partial<StoredUser> & { email: string }): StoredUser {
  try {
    ensureFileExists();
    const existing = getStoredUsers();
    const cleanEmail = user.email.toLowerCase().trim();
    const now = new Date().toISOString();
    
    const index = existing.findIndex(
      (u) => u.email.toLowerCase() === cleanEmail || (user.uid && u.uid === user.uid)
    );

    let savedUser: StoredUser;

    if (index >= 0) {
      savedUser = {
        ...existing[index],
        name: user.name || existing[index].name,
        phone: user.phone || existing[index].phone,
        role: user.role || existing[index].role,
        updatedAt: now,
      };
      existing[index] = savedUser;
    } else {
      savedUser = {
        uid: user.uid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: user.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: user.phone || '',
        role: user.role || (cleanEmail === 'gojo@otakuverse.com' || cleanEmail === 'admin@otakuverse.in' ? 'ADMIN' : 'USER'),
        createdAt: user.createdAt || now,
        updatedAt: now,
      };
      existing.unshift(savedUser);
    }

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    return savedUser;
  } catch (err) {
    console.warn('⚠️ [customUsersStore] Error saving user:', err);
    return {
      uid: user.uid || 'usr_fallback',
      name: user.name || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export function deleteStoredUser(uidOrEmail: string): boolean {
  try {
    ensureFileExists();
    const existing = getStoredUsers();
    const filtered = existing.filter(
      (u) => u.uid !== uidOrEmail && u.email.toLowerCase() !== uidOrEmail.toLowerCase()
    );
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('⚠️ [customUsersStore] Error deleting user:', err);
    return false;
  }
}
