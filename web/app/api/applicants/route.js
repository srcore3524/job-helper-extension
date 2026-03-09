import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const applicants = await prisma.applicant.findMany({
      where: { user_id: auth.userId },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ applicants });
  } catch (error) {
    console.error('GET applicants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const { name, title, email, phone, location, linkedin_url, github_url, website_url } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const applicant = await prisma.applicant.create({
      data: {
        user_id: auth.userId,
        name,
        title: title || null,
        email: email || null,
        phone: phone || null,
        location: location || null,
        linkedin_url: linkedin_url || null,
        github_url: github_url || null,
        website_url: website_url || null,
      },
    });

    return NextResponse.json({ applicant }, { status: 201 });
  } catch (error) {
    console.error('POST applicant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const { id, name, title, email, phone, location, linkedin_url, github_url, website_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = await prisma.applicant.findFirst({
      where: { id, user_id: auth.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    const applicant = await prisma.applicant.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        title: title ?? existing.title,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        location: location ?? existing.location,
        linkedin_url: linkedin_url ?? existing.linkedin_url,
        github_url: github_url ?? existing.github_url,
        website_url: website_url ?? existing.website_url,
      },
    });

    return NextResponse.json({ applicant });
  } catch (error) {
    console.error('PUT applicant error:', error);
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

    const existing = await prisma.applicant.findFirst({
      where: { id, user_id: auth.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    await prisma.applicant.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE applicant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
