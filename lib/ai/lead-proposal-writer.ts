import { complete } from './client';
import { LEAD_PROPOSAL_SYSTEM } from '@/lib/prompts/lead-proposal';
import { fetchAccomplishments } from '@/lib/case-studies';

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
  clientFirstName: string | null;
}

interface ProposalResult {
  proposal: string;
  screeningAnswers: Record<string, string>;
  hooks: string[];
  score: number;
}

export async function generateLeadProposal(
  job: LeadJobData,
  screeningQuestions: string[] = [],
  feedback?: string
): Promise<ProposalResult> {
  // Fetch live accomplishments from Google Doc
  const accomplishments = await fetchAccomplishments();

  const userPrompt = buildUserPrompt(job, screeningQuestions, accomplishments, feedback);

  const text = await complete({
    system: LEAD_PROPOSAL_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
  });

  return parseResponse(text);
}

function buildUserPrompt(job: LeadJobData, screeningQuestions: string[], accomplishments: string, feedback?: string): string {
  return `Analyze this job and write a proposal:

## Job Details
**Title:** ${job.title}
**Budget:** ${job.budget || 'Not specified'} (${job.budgetType || 'unknown'})
**Category:** ${job.category || 'Not specified'}
**Skills Required:** ${job.skills.join(', ') || 'Not specified'}

## Job Description
${job.description}

## Client Info
- First Name: ${job.clientFirstName || 'Unknown — DO NOT include any greeting at all. No "Hi," no name, nothing. Start directly with the hook.'}
- Country: ${job.clientCountry || 'Unknown'}
- Total Spend: ${job.clientSpend || 'Unknown'}
- Hire Rate: ${job.clientHireRate || 'Unknown'}
- Review Score: ${job.clientReviewScore || 'Unknown'}

## Sam's Accomplishments (PICK THE MOST RELEVANT ONE FOR THIS JOB)
${accomplishments}

${screeningQuestions.length > 0 ? `## Screening Questions (MUST answer each one)\n${screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}

${feedback ? `## Feedback on Previous Proposal\nThe previous version was not right. Address every point in this feedback:\n${feedback}\n` : ''}Write a personalized proposal. Pick ONE case study/result from the accomplishments above that best matches what this client needs. Do NOT make up results - only use what's in the accomplishments section.

BEFORE YOU WRITE THE FIRST LINE: The hook must open with the OUTCOME or RESULT the client wants to achieve — what they stand to GAIN. Do NOT open with their problem, pain point, what's broken, or what you do. Do NOT write things like "most accounts have broken flows" or "a lot of brands struggle with X" — that is pain framing, not outcome framing. The hook should make them picture a better future state, not remind them of their current problem.`;
}

function parseResponse(text: string): ProposalResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      proposal: parsed.proposal || '',
      screeningAnswers: parsed.screeningAnswers || {},
      hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
      score: typeof parsed.score === 'number' ? parsed.score : 50,
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      proposal: text,
      screeningAnswers: {},
      hooks: [],
      score: 50,
    };
  }
}
