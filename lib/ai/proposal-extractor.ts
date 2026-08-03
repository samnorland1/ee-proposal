import { complete } from './client';

const EXTRACTOR_SYSTEM = `You extract specific facts from Upwork job posts to plan a proposal. Be precise and literal. Quote or closely paraphrase the client's actual words. Do not generalise.`;

export interface JobContext {
  niche: string;
  currentSituation: string;
  specificGoals: string[];
  specificConcern: string;
  uniqueDetail: string;
  bestCaseStudy: string;
  bestFreeAsset: string;
  hookDraft: string;
}

export async function extractJobContext(
  jobTitle: string,
  jobDescription: string,
  accomplishments: string
): Promise<JobContext> {
  const prompt = `Read this job post and the accomplishments doc. Output a JSON with exactly the fields below. Be literal and specific — use the client's actual words, not generalisations.

## JOB POST
Title: ${jobTitle}

${jobDescription}

## ACCOMPLISHMENTS DOC (Sam's results and free assets)
${accomplishments}

## OUTPUT FORMAT
Return only this JSON, nothing else:
{
  "niche": "The exact type of business. e.g. 'boxing sport DTC ecom brand on Shopify', not just 'ecom brand'",
  "currentSituation": "What specific situation did they describe right now? Quote or closely paraphrase their words. e.g. 'zero email flows built', 'emails going to spam', 'previous agency did poor work'",
  "specificGoals": ["Each goal they explicitly stated — use their words, not generic email goals. e.g. 'increase abandoned cart recovery', 'grow subscriber list', 'automate post-purchase follow-up'"],
  "specificConcern": "What requirement or concern did they specifically call out? e.g. 'must show proof of recent work with ecom Shopify brands', 'need Klaviyo certified'. If none stated, write 'None specified'",
  "uniqueDetail": "One specific detail that makes this job stand out — a product type, a platform mentioned, a number, a constraint. Something that distinguishes this client.",
  "bestCaseStudy": "From the accomplishments doc, pick the ONE result that most closely matches this specific client's niche and situation. Rules: if the job is about deliverability or inbox issues, pick a deliverability stat. If it's about booked calls or high-ticket, pick a booked-calls stat. If it's about ecom flows, pick an ecom flow stat that BEST FITS their specific situation (not always the same one — match the context). If it's about campaigns, pick a campaign/revenue stat. Name the exact numbers from the doc. Do NOT always pick the same default.",
  "bestFreeAsset": "From the WHAT I CAN GIVE FOR FREE list in the accomplishments doc, which specific asset is most useful for this exact client? Name it exactly.",
  "hookDraft": "One sentence. Leads with what this specific client will GAIN based on their exact situation and niche. References their niche and situation specifically. No generic email marketing statements. No 'Picture your', 'Imagine', 'while you sleep', 'brands that win', 'leaving money on the table'."
}`;

  const text = await complete({
    system: EXTRACTOR_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1024,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in extractor response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      niche: parsed.niche || '',
      currentSituation: parsed.currentSituation || '',
      specificGoals: Array.isArray(parsed.specificGoals) ? parsed.specificGoals : [],
      specificConcern: parsed.specificConcern || '',
      uniqueDetail: parsed.uniqueDetail || '',
      bestCaseStudy: parsed.bestCaseStudy || '',
      bestFreeAsset: parsed.bestFreeAsset || '',
      hookDraft: parsed.hookDraft || '',
    };
  } catch {
    return {
      niche: '',
      currentSituation: '',
      specificGoals: [],
      specificConcern: '',
      uniqueDetail: '',
      bestCaseStudy: '',
      bestFreeAsset: '',
      hookDraft: '',
    };
  }
}
