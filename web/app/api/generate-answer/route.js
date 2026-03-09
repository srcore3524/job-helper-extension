import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { askClaudeJSON } from '@/lib/claude';

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const questions = body.questions || body.question;
    const job_description = body.job_description || body.jobDescription;
    const applicant_id = body.applicant_id || body.applicantId;
    const type = body.type;

    if (!questions || !applicant_id) {
      return NextResponse.json(
        { error: 'questions and applicant_id are required' },
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
      applicant.email ? `Email: ${applicant.email}` : null,
      applicant.location ? `Location: ${applicant.location}` : null,
      applicant.linkedin_url ? `LinkedIn: ${applicant.linkedin_url}` : null,
      applicant.github_url ? `GitHub: ${applicant.github_url}` : null,
      applicant.website_url ? `Website: ${applicant.website_url}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const resumeText = resume ? `\n\nRESUME:\n${resume.content}` : '';

    const portfolioText =
      portfolios.length > 0
        ? `\n\nPORTFOLIO:\n${portfolios
            .map(
              (p) =>
                `- ${p.project_name}: ${p.description}${p.tech_stack ? ` (Tech: ${p.tech_stack})` : ''}${p.url ? ` URL: ${p.url}` : ''}`
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
        ? `\n\nTRAINING MATERIALS (use these as style and content guidance):\n${trainingMaterials.map((t) => t.content).join('\n---\n')}`
        : '';

    const systemPrompt = `You are an expert job application assistant. Using the applicant's profile, resume, portfolio, skills, and training materials, generate professional, tailored answers to the provided questions.

The training materials show the applicant's preferred writing style and approach - mirror that style in your answers.

Return a JSON object with this structure:
{
  "answers": [
    {
      "question": "the original question",
      "answer": "the generated answer"
    }
  ]
}

Make answers:
- Professional and conversational
- Specific to the applicant's actual experience
- Tailored to the job description if provided
- Concise but thorough
Return ONLY valid JSON, no additional text.`;

    const userMessage = `APPLICANT PROFILE:
${applicantContext}${resumeText}${portfolioText}${skillsText}${trainingText}

${job_description ? `JOB DESCRIPTION:\n${job_description}\n\n` : ''}QUESTIONS TO ANSWER:
${Array.isArray(questions) ? questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : questions}`;

    const result = await askClaudeJSON(systemPrompt, userMessage);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate answer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
