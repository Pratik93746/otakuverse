import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { getAllUsers, upsertUser, deleteUser, updateUserRole } from '@/lib/db/users';
import { adminAuth } from '@/lib/firebase-admin';
import { recordAudit } from '@/lib/db/audit';

export async function GET(request: NextRequest) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) {
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
    console.error('Admin users GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { firebaseUid, name, email, phone, role } = body;
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 20)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (firebaseUid !== undefined && (typeof firebaseUid !== 'string' || firebaseUid.length > 128)) {
      return NextResponse.json({ error: 'Invalid Firebase user ID' }, { status: 400 });
    }

    const requestedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
    let targetEmail = email.trim().toLowerCase();
    const targetUid = firebaseUid || `user_${Date.now()}`;

    // An admin cannot demote themselves: this prevents locking the shop out of its own admin panel.
    if (requestedRole !== 'ADMIN' && role !== undefined && targetUid === actor.uid) {
      return NextResponse.json({ error: 'You cannot remove your own administrator access.' }, { status: 400 });
    }

    if (requestedRole === 'ADMIN') {
      if (!firebaseUid || !adminAuth) {
        return NextResponse.json({ error: 'A verified Firebase account is required for administrator access' }, { status: 400 });
      }

      try {
        const target = await adminAuth.getUser(firebaseUid);
        if (!target.email || target.emailVerified !== true) {
          return NextResponse.json({ error: 'Administrator email must be verified by Firebase' }, { status: 400 });
        }
        targetEmail = target.email.toLowerCase().trim();
      } catch {
        return NextResponse.json({ error: 'Firebase account not found' }, { status: 400 });
      }
    }

    const saved = await upsertUser(targetUid, {
      name: typeof name === 'string' ? name.trim().slice(0, 120) : undefined,
      email: targetEmail,
      phone,
      role: requestedRole,
    });

    // upsertUser deliberately never lowers an existing ADMIN, so an explicit demotion is applied here.
    if (role === 'USER' && saved.role === 'ADMIN') {
      await updateUserRole(targetUid, 'USER');
      saved.role = 'USER';
    }

    await recordAudit({
      actor: actor.email || actor.uid,
      action: 'user.upsert',
      target: targetUid,
      detail: { role: saved.role, email: targetEmail },
    });

    return NextResponse.json({ success: true, user: saved });
  } catch (err: any) {
    console.error('Admin users POST error:', err);
    return NextResponse.json({ error: 'Failed to save user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await authenticateAdmin(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (id === actor.uid) {
      return NextResponse.json({ error: 'You cannot delete your own account from the admin panel.' }, { status: 400 });
    }

    const deleted = await deleteUser(id);
    if (deleted) {
      await recordAudit({
        actor: actor.email || actor.uid,
        action: 'user.delete',
        target: id,
      });
    }
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    console.error('Admin users DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
