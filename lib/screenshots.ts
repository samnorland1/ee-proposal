import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;
const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');

/**
 * Scan public/screenshots/ folders and return relative paths (from public/) for
 * folders whose name matches any of the provided keywords.
 * Maximum 4 screenshots total across all matched folders.
 *
 * @param keywords  Terms to match against folder names (tools, service type, etc.)
 * @param maxTotal  Max total images to return (default 4)
 */
export function findRelevantScreenshots(keywords: string[], maxTotal = 4): string[] {
  if (!fs.existsSync(SCREENSHOTS_DIR)) return [];

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normKeywords = keywords
    .map(normalise)
    .filter((k) => k.length >= 4);

  if (normKeywords.length === 0) return [];

  const folders = fs
    .readdirSync(SCREENSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const results: string[] = [];

  for (const folder of folders) {
    if (results.length >= maxTotal) break;

    const normFolder = normalise(folder);
    const matched = normKeywords.some(
      (kw) => normFolder.includes(kw) || kw.includes(normFolder)
    );
    if (!matched) continue;

    const folderPath = path.join(SCREENSHOTS_DIR, folder);
    const images = fs
      .readdirSync(folderPath)
      .filter((f) => IMAGE_EXTENSIONS.test(f))
      .sort()
      .slice(0, maxTotal - results.length)
      .map((f) => `screenshots/${folder}/${f}`);

    results.push(...images);
  }

  return results;
}

/** Convert a stored relative path (from public/) to an absolute filesystem path. */
export function screenshotToAbsPath(relativePath: string): string {
  return path.join(process.cwd(), 'public', relativePath);
}

/** Convert a stored relative path to a URL path (for web preview). */
export function screenshotToUrl(relativePath: string): string {
  return `/${relativePath}`;
}

/**
 * Given a screenshot path like "screenshots/Deliverability/Spam to Primary.png",
 * return a professional, client-facing caption describing the result shown.
 */
export async function generateCaption(relativePath: string): Promise<string> {
  const parts = relativePath.split('/');
  const folder = parts[1] ?? '';
  const filename = parts[2]?.replace(/\.[^.]+$/, '') ?? '';

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 80,
    messages: [
      {
        role: 'user',
        content: `Write a single professional caption for a screenshot that will appear in a client proposal under "Results".

Folder: ${folder}
Filename: ${filename}

Rules:
- One sentence only, max 12 words
- Written from the service provider's perspective ("Moved client emails...", "Achieved...", "Drove...")
- Focus on the concrete result the image shows
- No quotes, no punctuation at end
- Make it specific and impressive, not generic

Caption:`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === 'text');
  return text?.type === 'text' ? text.text.trim().replace(/[."']$/, '') : filename;
}

/**
 * Generate professional captions for multiple screenshots in a single batch.
 * Returns a Record<relativePath, caption>.
 */
export async function generateCaptions(relativePaths: string[]): Promise<Record<string, string>> {
  if (relativePaths.length === 0) return {};

  const items = relativePaths.map((p) => {
    const parts = p.split('/');
    return `- Folder: ${parts[1] ?? ''}, Filename: ${parts[2]?.replace(/\.[^.]+$/, '') ?? ''}`;
  }).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Write professional captions for these screenshots that will appear in a client proposal under "Results". Return ONLY a JSON array of strings in the same order as the inputs — one caption per screenshot.

Screenshots:
${items}

Rules for each caption:
- One sentence, max 12 words
- Written from service provider perspective ("Moved client emails...", "Achieved...", "Drove...", "Grew...")
- Focus on the concrete result shown
- No quotes, no trailing punctuation
- Specific and impressive, not generic

Return ONLY a valid JSON array like: ["caption 1", "caption 2"]`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') return {};

  try {
    const raw = text.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const captions: string[] = JSON.parse(raw);
    const result: Record<string, string> = {};
    relativePaths.forEach((p, i) => {
      result[p] = captions[i] ?? p.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    });
    return result;
  } catch {
    return {};
  }
}
