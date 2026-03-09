import { NextResponse } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';
import { askClaudeJSON } from '@/lib/claude';

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorizedResponse();

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page HTML
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobHelper/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch URL (${res.status})` }, { status: 400 });
    }

    const html = await res.text();

    // Extract basic meta info first
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is)
      || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/is);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is)
      || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*property=["']og:description["']/is);

    // Trim HTML to reasonable size for Claude (first 8000 chars of visible text)
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);

    const metaTitle = titleMatch ? titleMatch[1].trim() : '';
    const metaDesc = (descMatch ? descMatch[1] : ogDescMatch ? ogDescMatch[1] : '').trim();

    // Use Claude to extract structured portfolio info
    const result = await askClaudeJSON(
      `You are a portfolio data extractor. Given a webpage URL and its content, extract project information. Return a JSON object with these fields:
- project_name: The project/repo name (string)
- description: A concise 1-3 sentence description of what the project does (string)
- tech_stack: Comma-separated list of technologies used (string)

Be concise and accurate. Only include information you can confirm from the content.`,
      `URL: ${url}
Page title: ${metaTitle}
Meta description: ${metaDesc}
Page content: ${textContent}`
    );

    return NextResponse.json({
      project_name: result.project_name || metaTitle || '',
      description: result.description || metaDesc || '',
      tech_stack: result.tech_stack || '',
      url: url,
    });
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    return NextResponse.json({ error: 'Failed to fetch and parse URL' }, { status: 500 });
  }
}
