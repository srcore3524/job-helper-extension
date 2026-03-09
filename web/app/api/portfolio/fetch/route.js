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

    // Extract all links from the page before stripping HTML
    const links = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1].trim();
      const text = linkMatch[2].replace(/<[^>]+>/g, '').trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && text) {
        links.push(`[${text}](${href})`);
      }
    }
    const linksSection = links.length > 0 ? '\n\nLinks found on page:\n' + links.join('\n') : '';

    // Trim HTML to reasonable size for Claude
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000) + linksSection;

    const metaTitle = titleMatch ? titleMatch[1].trim() : '';
    const metaDesc = (descMatch ? descMatch[1] : ogDescMatch ? ogDescMatch[1] : '').trim();

    // Use Claude to extract all projects from the portfolio
    const result = await askClaudeJSON(
      `You are a portfolio data extractor. Given a webpage URL and its content, extract ALL individual projects/works listed on the page. Return a JSON array of objects, each with:
- project_name: The project name (string)
- description: A concise 1-3 sentence description of what the project does (string)
- tech_stack: Comma-separated list of technologies used (string)
- url: The project's URL/link if available, otherwise empty string (string)

Extract every project you can find. Do NOT treat the portfolio website itself as a project. Only extract the individual projects/works showcased in the portfolio. Return a JSON array, even if there's only one project.`,
      `Portfolio URL: ${url}
Page title: ${metaTitle}
Meta description: ${metaDesc}
Page content: ${textContent}`
    );

    const projects = Array.isArray(result) ? result : result.projects || [result];

    return NextResponse.json({
      projects: projects.map(p => ({
        project_name: p.project_name || '',
        description: p.description || '',
        tech_stack: p.tech_stack || '',
        url: p.url || '',
      })),
    });
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    return NextResponse.json({ error: 'Failed to fetch and parse URL' }, { status: 500 });
  }
}
