import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStoredUsers, saveStoredUser, deleteStoredUser } from '@/lib/customUsersStore';
import { getAllFirestoreUsers, saveFirestoreUserProfile } from '@/lib/firestore';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const localUsers = getStoredUsers();
    let fsUsers: any[] = [];
    try {
      fsUsers = await getAllFirestoreUsers();
    } catch {
      // ignore
    }

    const userMap = new Map();
    [...fsUsers, ...localUsers].forEach((u) => {
      const key = (u.email || u.uid || '').toLowerCase();
      if (key) {
        userMap.set(key, {
          uid: u.uid || `usr_${Math.random().toString(36).substring(2, 8)}`,
          name: u.name || key.split('@')[0],
          email: u.email || key,
          phone: u.phone || '',
          role: u.role || 'USER',
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        });
      }
    });

    return NextResponse.json({ users: Array.from(userMap.values()) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, role = 'USER' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Save to local persistent store
    const saved = saveStoredUser({
      name: name?.trim() || email.split('@')[0],
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
    });

    // 2. Try non-blocking sync to Firestore
    try {
      await saveFirestoreUserProfile({
        uid: saved.uid,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        role: saved.role,
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, user: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'User ID or Email is required' }, { status: 400 });
    }

    deleteStoredUser(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
