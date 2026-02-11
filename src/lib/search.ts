/**
 * Web Search & YouTube Search Module
 * 
 * Uses DuckDuckGo (no API key needed) for:
 * - General web search
 * - YouTube-specific video search
 */

const DDG_URL = 'https://html.duckduckgo.com/html/';
const SEARCH_TIMEOUT = 15_000;

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface YouTubeResult {
  title: string;
  url: string;
  snippet: string;
  videoId: string;
}

// ─── Web Search ────────────────────────────────────────────

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    console.log(`[Search] Searching web: "${query}"`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

    const params = new URLSearchParams({ q: query });
    const res = await fetch(`${DDG_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.error(`[Search] DuckDuckGo returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    return parseDDGResults(html, maxResults);
  } catch (err: any) {
    console.error('[Search] Web search failed:', err.message);
    return [];
  }
}

// ─── YouTube Search ────────────────────────────────────────

export async function youtubeSearch(query: string, maxResults = 5): Promise<YouTubeResult[]> {
  // Search DuckDuckGo with site:youtube.com filter
  const results = await webSearch(`site:youtube.com ${query}`, maxResults + 3);

  return results
    .filter((r) => r.url.includes('youtube.com/watch') || r.url.includes('youtu.be/'))
    .map((r) => {
      const videoId = extractYouTubeId(r.url);
      return {
        title: r.title,
        url: r.url.startsWith('//') ? `https:${r.url}` : r.url,
        snippet: r.snippet,
        videoId: videoId || '',
      };
    })
    .filter((r) => r.videoId)
    .slice(0, maxResults);
}

// ─── DuckDuckGo HTML Result Parser ─────────────────────────

function parseDDGResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML format has results in <a class="result__a"> for title/URL
  // and <a class="result__snippet"> for description

  // Extract result blocks — each result__body contains one result
  const resultBlocks = html.split(/class="result\s/g).slice(1);

  for (const block of resultBlocks) {
    if (results.length >= maxResults) break;

    // Extract URL and title from result__a
    const titleMatch = block.match(
      /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i
    );

    // Extract snippet from result__snippet
    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i
    );

    if (titleMatch) {
      let url = titleMatch[1] || '';
      const title = stripHtml(titleMatch[2] || '').trim();
      const snippet = snippetMatch ? stripHtml(snippetMatch[1] || '').trim() : '';

      // DuckDuckGo wraps URLs in a redirect — extract actual URL
      if (url.includes('uddg=')) {
        const decoded = decodeURIComponent(url.split('uddg=')[1]?.split('&')[0] || '');
        if (decoded) url = decoded;
      }

      if (title && url && !url.includes('duckduckgo.com')) {
        results.push({ title, url, snippet });
      }
    }
  }

  // Fallback: try simpler regex if structured parsing failed
  if (results.length === 0) {
    const linkRegex = /href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    const seen = new Set<string>();
    while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
      const url = match[1];
      const title = match[2].trim();
      if (
        title.length > 5 &&
        !url.includes('duckduckgo.com') &&
        !seen.has(url)
      ) {
        seen.add(url);
        results.push({ title, url, snippet: '' });
      }
    }
  }

  return results;
}

// ─── Helpers ───────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─── Format results for AI context ─────────────────────────

export function formatSearchResultsForContext(
  results: SearchResult[],
  label = 'Web Search Results'
): string {
  if (results.length === 0) return '';
  return (
    `## ${label}:\n\n` +
    results
      .map((r, i) => `${i + 1}. **[${r.title}](${r.url})**\n   ${r.snippet}`)
      .join('\n\n')
  );
}

export function formatYouTubeResultsForContext(results: YouTubeResult[]): string {
  if (results.length === 0) return '';
  return (
    '## YouTube Videos Found:\n\n' +
    results
      .map(
        (r, i) =>
          `${i + 1}. **[${r.title}](${r.url})**\n   ${r.snippet}\n   🎬 Watch: ${r.url}`
      )
      .join('\n\n')
  );
}
