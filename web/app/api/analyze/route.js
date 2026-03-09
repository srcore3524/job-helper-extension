import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { askClaudeJSON } from '@/lib/claude';

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const job_description = body.job_description || body.description;
    const applicant_id = body.applicant_id || body.applicantId;
    const type = body.type;

    if (!job_description || !applicant_id) {
      return NextResponse.json(
        { error: 'job_description and applicant_id are required' },
        { status: 400 }
      );
    }

    // Fetch applicant data
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicant_id },
    });

    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    const resume = await prisma.resume.findFirst({
      where: { applicant_id },
      orderBy: { uploaded_at: 'desc' },
    });

    const portfolios = await prisma.portfolio.findMany({
      where: { applicant_id },
    });

    const skills = await prisma.skill.findMany({
      where: { applicant_id },
    });

    const trainingType = type || 'job';
    const trainingMaterials = await prisma.trainingMaterial.findMany({
      where: { applicant_id, type: trainingType },
    });

    // Build context
    const applicantContext = [
      `Name: ${applicant.name}`,
      applicant.title ? `Title: ${applicant.title}` : null,
      applicant.location ? `Location: ${applicant.location}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const resumeText = resume ? `\n\nRESUME:\n${resume.content}` : '';

    const portfolioText =
      portfolios.length > 0
        ? `\n\nPORTFOLIO:\n${portfolios
            .map(
              (p) =>
                `- ${p.project_name}: ${p.description}${p.tech_stack ? ` (Tech: ${p.tech_stack})` : ''}`
            )
            .join('\n')}`
        : '';

    const skillsText =
      skills.length > 0
        ? `\n\nSKILLS:\n${skills
            .map(
              (s) =>
                `- ${s.name}${s.category ? ` [${s.category}]` : ''}${s.proficiency_level ? ` - ${s.proficiency_level}` : ''}`
            )
            .join('\n')}`
        : '';

    const trainingText =
      trainingMaterials.length > 0
        ? `\n\nTRAINING MATERIALS:\n${trainingMaterials.map((t) => t.content).join('\n---\n')}`
        : '';

    const systemPrompt = `You are a job analysis assistant. Analyze the job description against the applicant's profile and return a JSON object with the following structure:
{
  "title": "job title extracted from description",
  "company": "company name if found",
  "location": "job location",
  "country": "country",
  "remote_type": "remote/hybrid/onsite/unknown",
  "is_actually_hiring": true/false,
  "match_percent": 0-100,
  "summary": "2-3 sentence summary of the role and fit",
  "required_skills": [{"name": "skill name", "matched": true/false}],
  "external_links": ["any URLs found in the description"],
  "hiring_signals": "analysis of whether this is a real active job posting"
}

Be accurate with match_percent based on how well the applicant's skills, experience, and background match the job requirements.
Return ONLY valid JSON, no additional text.`;

    const userMessage = `APPLICANT PROFILE:
${applicantContext}${resumeText}${portfolioText}${skillsText}${trainingText}

---

JOB DESCRIPTION:
${job_description}`;

    const result = await askClaudeJSON(systemPrompt, userMessage);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
