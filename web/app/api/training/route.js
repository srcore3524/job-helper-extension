import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const applicant_id = searchParams.get('applicant_id');
    const type = searchParams.get('type');

    if (!applicant_id) {
      return NextResponse.json({ error: 'applicant_id is required' }, { status: 400 });
    }

    const where = { applicant_id };
    if (type) where.type = type;

    const materials = await prisma.trainingMaterial.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error('GET training error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { applicant_id, type, content } = await request.json();

    if (!applicant_id || !type || !content) {
      return NextResponse.json({ error: 'applicant_id, type, and content are required' }, { status: 400 });
    }

    if (!['job', 'upwork'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "job" or "upwork"' }, { status: 400 });
    }

    const material = await prisma.trainingMaterial.create({
      data: { applicant_id, type, content },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error('POST training error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { id, content } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const material = await prisma.trainingMaterial.update({
      where: { id },
      data: { ...(content !== undefined && { content }) },
    });

    return NextResponse.json({ material });
  } catch (error) {
    console.error('PUT training error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.trainingMaterial.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE training error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
