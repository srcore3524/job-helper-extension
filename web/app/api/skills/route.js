import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const applicant_id = searchParams.get('applicant_id');

    if (!applicant_id) {
      return NextResponse.json({ error: 'applicant_id is required' }, { status: 400 });
    }

    const skills = await prisma.skill.findMany({
      where: { applicant_id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('GET skills error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { applicant_id, name, category, proficiency_level } = await request.json();

    if (!applicant_id || !name) {
      return NextResponse.json({ error: 'applicant_id and name are required' }, { status: 400 });
    }

    const skill = await prisma.skill.create({
      data: {
        applicant_id,
        name,
        category: category || null,
        proficiency_level: proficiency_level || null,
      },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error('POST skill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { id, name, category, proficiency_level } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const skill = await prisma.skill.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(proficiency_level !== undefined && { proficiency_level }),
      },
    });

    return NextResponse.json({ skill });
  } catch (error) {
    console.error('PUT skill error:', error);
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

    await prisma.skill.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE skill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
