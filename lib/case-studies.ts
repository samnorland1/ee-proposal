// Fetches Sam's accomplishments from Google Doc
// Doc URL: https://docs.google.com/document/d/1RqiU4kMZfyIAbKes85A5WnGXLpX2bxDXQ2zUgbeIUS4

const DOC_ID = '1RqiU4kMZfyIAbKes85A5WnGXLpX2bxDXQ2zUgbeIUS4';
const EXPORT_URL = `https://docs.google.com/document/d/${DOC_ID}/export?format=txt`;

// Cache for 1 hour to avoid hitting Google too often
let cachedContent: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchAccomplishments(): Promise<string> {
  const now = Date.now();

  // Return cached content if still valid
  if (cachedContent && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedContent;
  }

  try {
    // Google Docs export URL redirects, so we follow it
    const response = await fetch(EXPORT_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch accomplishments:', response.status);
      return getFallbackContent();
    }

    const text = await response.text();

    // Cache the result
    cachedContent = text;
    cacheTimestamp = now;

    return text;
  } catch (error) {
    console.error('Error fetching accomplishments:', error);
    return getFallbackContent();
  }
}

function getFallbackContent(): string {
  // Fallback if Google Doc is unavailable
  return `
Email Marketing Professional

Key Results:
- eCommerce: $60k-$150k monthly revenue, 25-35% attribution from email
- High-ticket: 707 calls booked in 150 days, $1M+ from email
- Deliverability: Open rates from 14% to 42%
- Cold email: 78% open rates, 13% reply rates
- 9,000+ tracked conversions
- 98/100 Klaviyo deliverability score

Specialties: Klaviyo, ActiveCampaign, Omnisend, Shopify, eCommerce, info products, coaching, B2B
`;
}
