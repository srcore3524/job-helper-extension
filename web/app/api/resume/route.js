import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { askClaudeJSON } from '@/lib/claude';
import pdf from 'pdf-parse';

export async function GET(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const applicant_id = searchParams.get('applicant_id');

    if (!applicant_id) {
      return NextResponse.json({ error: 'applicant_id is required' }, { status: 400 });
    }

    const resume = await prisma.resume.findFirst({
      where: { applicant_id },
      orderBy: { uploaded_at: 'desc' },
    });

    return NextResponse.json({ resume });
  } catch (error) {
    console.error('GET resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const formData = await request.formData();
    const file = formData.get('file');
    const applicant_id = formData.get('applicant_id');

    if (!file || !applicant_id) {
      return NextResponse.json({ error: 'File and applicant_id are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdf(buffer);
    const content = parsed.text;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Upsert: delete old resumes for this applicant and create new one
    await prisma.resume.deleteMany({ where: { applicant_id } });

    const resume = await prisma.resume.create({
      data: {
        applicant_id,
        content: content.trim(),
      },
    });

    // Auto-extract skills from resume using Claude
    let extractedSkills = [];
    try {
      const skillsResult = await askClaudeJSON(
        `You are a skill extractor. Given a resume, extract all technical and professional skills. Return a JSON array of objects with fields:
- name: skill name (string)
- category: one of "Language", "Framework", "Database", "Cloud", "Tool", "Soft Skill", "Other" (string)
- proficiency_level: one of "Beginner", "Intermediate", "Advanced", "Expert" - infer from context (string)

Only include skills clearly mentioned or strongly implied. Be concise.`,
        content.trim().slice(0, 6000)
      );

      if (Array.isArray(skillsResult)) {
        extractedSkills = skillsResult;
      } else if (skillsResult.skills && Array.isArray(skillsResult.skills)) {
        extractedSkills = skillsResult.skills;
      }

      if (extractedSkills.length > 0) {
        // Clear existing skills and insert new ones
        await prisma.skill.deleteMany({ where: { applicant_id } });
        await prisma.skill.createMany({
          data: extractedSkills.map((s) => ({
            applicant_id,
            name: s.name || '',
            category: s.category || 'Other',
            proficiency_level: s.proficiency_level || 'Intermediate',
          })),
        });
      }
    } catch (skillError) {
      console.error('Skill extraction error:', skillError);
      // Non-blocking: resume still saved even if skill extraction fails
    }

    return NextResponse.json({ resume, skills_extracted: extractedSkills.length }, { status: 201 });
  } catch (error) {
    console.error('POST resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
