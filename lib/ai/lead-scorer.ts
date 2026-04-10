import { complete } from './client';

interface LeadJobData {
  title: string;
  description: string;
  budget: string | null;
  budgetType: 'fixed' | 'hourly' | null;
  category: string | null;
  skills: string[];
  clientCountry: string | null;
  clientSpend: string | null;
  clientHireRate: string | null;
  clientReviewScore: string | null;
}

const SCORING_PROMPT = `You are scoring Upwork jobs for Sam, a Klaviyo/email marketing specialist.

Rate 0-100 based on:
- Budget reasonable for the work?
- Client history good? (spend, hires, rating)
- Bad reviews? (check client rating - low ratings = lower score)

ONLY return a JSON object with score and one-line reason:
{"score": 85, "reason": "Good budget, experienced client, high rating"}

Nothing else.`;

export async function scoreLeadFast(job: LeadJobData): Promise<{ score: number; reason: string }> {
  const userPrompt = `Score this job:

Title: ${job.title}
Category: ${job.category || 'Not specified'}
Skills: ${job.skills.join(', ') || 'Not specified'}
Budget: ${job.budget || 'Not specified'} (${job.budgetType || 'unknown'})

Description:
${job.description.slice(0, 1000)}${job.description.length > 1000 ? '...' : ''}

Client:
- Country: ${job.clientCountry || 'Unknown'}
- Total Spend: ${job.clientSpend || 'Unknown'}
- Hires: ${job.clientHireRate || 'Unknown'}
- Rating: ${job.clientReviewScore || 'Unknown'}`;

  try {
    const text = await complete({
      system: SCORING_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 100,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 50,
        reason: parsed.reason || '',
      };
    }
  } catch (error) {
    console.error('Scoring error:', error);
  }

  return { score: 50, reason: 'Could not score' };
}
