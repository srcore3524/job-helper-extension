import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { email, current_password, new_password } = await request.json();

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return unauthorizedResponse();

    const updates = {};

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      updates.email = email;
    }

    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      if (new_password.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }
      updates.password_hash = await bcrypt.hash(new_password, 12);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: updates,
    });

    return NextResponse.json({ message: 'Updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
