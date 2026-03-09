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

    const isUpwork = trainingType === 'upwork';

    const bidField = isUpwork
      ? `\n  "bid_draft": "A full proposal/bid text following the training materials style and rules exactly. Write as the applicant in first person. This must be ready to paste into Upwork as is.",`
      : '';

    const bidInstruction = isUpwork
      ? `\n\nFor the bid_draft: Follow the training materials EXACTLY for tone, structure, and rules. Write as the applicant. The bid must sound human and conversational, not like AI. Each sentence on its own line. No hyphens, no dashes, no bullet lists in the bid text.`
      : '';

    const systemPrompt = `You are a job analysis assistant. Analyze the job description against the applicant's profile and return a JSON object with the following structure:
{
  "title": "job title extracted from description",
  "company": "company name if found",
  "location": "job location",
  "country": "country",
  "remote_type": "remote/hybrid/onsite/unknown",
  "is_actually_hiring": true/false (boolean),
  "match_percent": 0-100,
  "summary": "2-3 sentence summary of what the job/role is about (do NOT mention the applicant or fit, only describe the job itself)",
  "required_skills": [{"name": "skill name", "matched": true/false}],
  "relevant_applicant_skills": ["applicant skills from their profile that are relevant to this job but NOT listed in required_skills, e.g. transferable skills, similar technologies, related experience"],
  "external_links": ["any URLs found in the description"],
  "hiring_signals": "one or two words ONLY: Active, Likely Hiring, Uncertain, or Likely Stale"${bidField}
}

Be accurate with match_percent based on how well the applicant's skills, experience, and background match the job requirements.${bidInstruction}
Return ONLY valid JSON, no additional text.`;

    const userMessage = `APPLICANT PROFILE:
${applicantContext}${resumeText}${portfolioText}${skillsText}${trainingText}

---

JOB DESCRIPTION:
${job_description}`;

    const result = await askClaudeJSON(systemPrompt, userMessage);

    // Map to the field names the extension expects
    const matched = (result.required_skills || []).filter(s => s.matched).map(s => s.name);
    const missing = (result.required_skills || []).filter(s => !s.matched).map(s => s.name);

    return NextResponse.json({
      jobTitle: result.title || '',
      company: result.company || '',
      location: result.location || '',
      country: result.country || '',
      remoteType: result.remote_type || 'unknown',
      hiringSignal: result.hiring_signals || '',
      matchScore: result.match_percent || 0,
      summary: result.summary || '',
      matchedSkills: matched,
      missingSkills: missing,
      relevantSkills: result.relevant_applicant_skills || [],
      applyLinks: result.external_links || [],
      bidDraft: result.bid_draft || '',
      status: 'not_applied',
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
