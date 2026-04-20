// api/podcast-feed.js
// Fetches and parses the NextUs Conversations RSS feed from Libsyn.
// Caches for 1 hour via Cache-Control. Add to vercel.json functions block:
//   "api/podcast-feed.js": { "maxDuration": 15 }
// Add to vercel.json rewrites:
//   { "source": "/api/podcast-feed", "destination": "/api/podcast-feed" }

const FEED_URL = 'http://feeds.libsyn.com/66392/rss';

// Simple XML text extractor — no external dependencies
function extractText(xml, tag) {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const plainMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(cdataMatch) || xml.match(plainMatch);
  return m ? m[1].trim() : '';
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function parseItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractText(block, 'title');
    const pubDate = extractText(block, 'pubDate');
    const description = extractText(block, 'description');
    const link = extractText(block, 'link');
    const guid = extractText(block, 'guid');
    const duration = extractText(block, 'itunes:duration');
    const episodeNum = extractText(block, 'itunes:episode');
    const image = extractAttr(block, 'itunes:image', 'href');

    // Audio URL from enclosure
    const enclosureMatch = block.match(/<enclosure[^>]*url="([^"]*)"[^>]*\/>/i);
    const audioUrl = enclosureMatch ? enclosureMatch[1] : '';

    // Strip HTML from description
    const plainDescription = description
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (title && audioUrl) {
      items.push({
        title,
        pubDate,
        description: plainDescription,
        link,
        guid,
        duration,
        episodeNum: episodeNum ? parseInt(episodeNum, 10) : null,
        image,
        audioUrl,
      });
    }
  }

  return items;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'NextUs/1.0 (podcast page fetcher)' },
    });

    if (!response.ok) {
      throw new Error(`Feed fetch failed: ${response.status}`);
    }

    const xml = await response.text();

    // Show-level metadata
    const showTitle = extractText(xml.split('<item>')[0], 'title');
    const showDescription = extractText(xml.split('<item>')[0], 'description');
    const showImage = extractAttr(xml.split('<item>')[0], 'itunes:image', 'href');

    const episodes = parseItems(xml);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
      show: {
        title: showTitle || 'NextUs Conversations',
        description: showDescription,
        image: showImage,
        episodeCount: episodes.length,
      },
      episodes,
    });
  } catch (err) {
    console.error('podcast-feed error:', err);
    return res.status(500).json({ error: 'Failed to load podcast feed' });
  }
}
