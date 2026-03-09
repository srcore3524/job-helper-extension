import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const applicant_id = searchParams.get('applicant_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const where = {};

    if (applicant_id) {
      where.applicant_id = applicant_id;
    } else {
      // Only show jobs for applicants owned by this user
      const applicantIds = await prisma.applicant.findMany({
        where: { user_id: auth.userId },
        select: { id: true },
      });
      where.applicant_id = { in: applicantIds.map((a) => a.id) };
    }

    if (date_from || date_to) {
      where.applied_at = {};
      if (date_from) where.applied_at.gte = new Date(date_from);
      if (date_to) where.applied_at.lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { applied_at: 'desc' },
      include: {
        applicant: { select: { name: true } },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('GET jobs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const applicant_id = body.applicant_id || body.applicantId;
    const title = body.title || body.jobTitle || 'Untitled';
    const site = body.site;
    const site_url = body.site_url || body.siteUrl || body.url;
    const summary = body.summary;
    const skills = body.skills;
    const match_percent = body.match_percent || body.matchScore || body.match;
    const location = body.location;
    const remote_type = body.remote_type || body.remoteType;
    const interview_status = body.interview_status || body.interviewStatus;
    const apply_status = body.apply_status || body.applyStatus || body.status;
    const external_link = body.external_link || body.externalLink;
    const applied_at = body.applied_at || body.appliedAt;

    if (!applicant_id || !title) {
      return NextResponse.json({ error: 'applicant_id and title are required' }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: {
        applicant_id,
        site: site || null,
        site_url: site_url || null,
        title,
        summary: summary || null,
        skills: skills || null,
        match_percent: match_percent != null ? parseInt(match_percent) : null,
        location: location || null,
        remote_type: remote_type || null,
        interview_status: interview_status || null,
        apply_status: apply_status || null,
        external_link: external_link || null,
        applied_at: applied_at ? new Date(applied_at) : new Date(),
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('POST job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (updates.match_percent !== undefined) {
      updates.match_percent = updates.match_percent != null ? parseInt(updates.match_percent) : null;
    }
    if (updates.applied_at !== undefined) {
      updates.applied_at = updates.applied_at ? new Date(updates.applied_at) : null;
    }

    const job = await prisma.job.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ job });
  } catch (error) {
    console.error('PUT job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
