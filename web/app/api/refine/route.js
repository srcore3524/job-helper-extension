import { NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { askClaude } from '@/lib/claude';

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { currentText, instruction, type } = await request.json();

    if (!currentText || !instruction) {
      return NextResponse.json(
        { error: 'currentText and instruction are required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a writing assistant helping refine ${type === 'bid' ? 'an Upwork proposal/bid' : 'a job application answer'}.

The user will give you the current text and an instruction for how to change it.
Apply the instruction while keeping the same overall tone and style.
Do NOT add hyphens, dashes, or bullet lists.
Keep it conversational and human sounding.
Return ONLY the refined text, nothing else. No quotes, no explanation, no prefixes.`;

    const userMessage = `CURRENT TEXT:
${currentText}

INSTRUCTION:
${instruction}`;

    const refined = await askClaude(systemPrompt, userMessage);

    return NextResponse.json({ text: refined.trim() });
  } catch (error) {
    console.error('Refine error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
