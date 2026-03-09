import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude(systemPrompt, userMessage) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return text;
}

export async function askClaudeJSON(systemPrompt, userMessage) {
  const text = await askClaude(systemPrompt, userMessage);

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  try {
    return JSON.parse(text.trim());
  } catch {
    return { raw: text };
  }
}
