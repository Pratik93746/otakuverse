import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllUsers, upsertUser, deleteUser } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }
    const users = await getAllUsers();

    return NextResponse.json({
      users: users.map((u) => ({
        uid: u.firebaseUid,
        firebaseUid: u.firebaseUid,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        image: u.image || '',
        createdAt: u.createdAt?.toISOString(),
        updatedAt: u.updatedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }
    const body = await request.json();
    const { firebaseUid, name, email, phone, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const targetUid = firebaseUid || `user_${Date.now()}`;
    const saved = await upsertUser(targetUid, {
      name,
      email,
      phone,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
    });

    return NextResponse.json({ success: true, user: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const deleted = await deleteUser(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete user' }, { status: 500 });
  }
}
