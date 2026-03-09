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

    const portfolios = await prisma.portfolio.findMany({
      where: { applicant_id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error('GET portfolio error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { applicant_id, project_name, description, tech_stack, url } = await request.json();

    if (!applicant_id || !project_name || !description) {
      return NextResponse.json({ error: 'applicant_id, project_name, and description are required' }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        applicant_id,
        project_name,
        description,
        tech_stack: tech_stack || null,
        url: url || null,
      },
    });

    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (error) {
    console.error('POST portfolio error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { id, project_name, description, tech_stack, url } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.update({
      where: { id },
      data: {
        ...(project_name !== undefined && { project_name }),
        ...(description !== undefined && { description }),
        ...(tech_stack !== undefined && { tech_stack }),
        ...(url !== undefined && { url }),
      },
    });

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error('PUT portfolio error:', error);
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

    await prisma.portfolio.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE portfolio error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
