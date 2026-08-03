import { complete } from './client';
import { LEAD_PROPOSAL_SYSTEM } from '@/lib/prompts/lead-proposal';
import { fetchAccomplishments } from '@/lib/case-studies';
import { getRecentProposals } from '@/lib/leads';
import { runProposalQA } from './proposal-qa';
import { extractJobContext, JobContext } from './proposal-extractor';
import { ProposalComponents } from '@/types';

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

export interface ProposalResult {
  proposal: string;
  screeningAnswers: Record<string, string>;
  components: ProposalComponents;
  score: number;
  qaIssues: string[];
  qaPassed: boolean;
}

export async function generateLeadProposal(
  job: LeadJobData,
  screeningQuestions: string[] = [],
  feedback?: string
): Promise<ProposalResult> {
  // Fetch live accomplishments from Google Doc
  const [accomplishments, recentProposals] = await Promise.all([
    fetchAccomplishments(),
    getRecentProposals(4),
  ]);

  // Step 1: Extract specific facts from the job post before writing a word
  const context = await extractJobContext(job.title, job.description, accomplishments);

  const userPrompt = buildUserPrompt(job, screeningQuestions, accomplishments, feedback, recentProposals, context);

  const text = await complete({
    system: LEAD_PROPOSAL_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 8192,
  });

  const initial = parseResponse(text);

  // QA pass — second Opus call that checks every SOP rule and fixes violations
  const qa = await runProposalQA(initial.proposal, job.clientFirstName, accomplishments);

  return {
    ...initial,
    proposal: qa.proposal,
    qaIssues: qa.issues,
    qaPassed: qa.passed,
  };
}

function buildUserPrompt(job: LeadJobData, screeningQuestions: string[], accomplishments: string, feedback?: string, recentProposals: string[] = [], context?: JobContext): string {
  const contextBlock = context && context.niche ? `
## EXTRACTED JOB CONTEXT — USE THESE FACTS. DO NOT DEVIATE.
These facts were extracted directly from the job post. Every sentence you write must be grounded in at least one of them.

- NICHE: ${context.niche}
- THEIR SITUATION RIGHT NOW: ${context.currentSituation}
- THEIR STATED GOALS: ${context.specificGoals.join(', ')}
- THEIR SPECIFIC CONCERN: ${context.specificConcern}
- UNIQUE DETAIL: ${context.uniqueDetail}
- CASE STUDY TO USE (use this one, do not substitute): ${context.bestCaseStudy}
- FREE ASSET TO ATTACH (name this exactly): ${context.bestFreeAsset}
- HOOK DRAFT (use this as your opening or a close variant — it references their specific situation): ${context.hookDraft}

Any sentence that is NOT grounded in the above facts is generic filler. Delete it.
` : '';

  return `Write a proposal for this Upwork job. Every sentence must be specific to this client. No generic email marketing statements.

## Client Info
- First Name: ${job.clientFirstName || 'Unknown — DO NOT include any greeting. Start directly with the hook.'}
- Country: ${job.clientCountry || 'Unknown'}
${contextBlock}
## Full Job Post (for reference)
**Title:** ${job.title}
${job.description}

## Sam's Accomplishments Doc
${accomplishments}

${screeningQuestions.length > 0 ? `## Screening Questions (answer each one)\n${screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n` : ''}
${recentProposals.length > 0 ? `## DO NOT REPEAT THESE RECENTLY USED CASE STUDIES
${recentProposals.map((p, i) => `--- Recent proposal ${i + 1} ---\n${p.slice(0, 300)}`).join('\n')}
---
` : ''}${feedback ? `## Feedback on Previous Proposal — address every point:\n${feedback}\n` : ''}
BEFORE OUTPUTTING, CHECK ALL 3 CORE RULES:
1. UNDERSTAND — Every sentence references this client's specific niche, situation, or goals. No generic email marketing statements. No sentence that could apply to a different client unchanged.
2. PROOF — The specific case study named above with its exact numbers. Includes "(see attached screenshots)".
3. FREE ASSET — The specific asset named above, stated as attached or being sent. Not an action plan. Not bullet points. A named deliverable.

If any fail, rewrite before outputting.`;
}

function parseResponse(text: string): Omit<ProposalResult, 'qaIssues' | 'qaPassed'> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      proposal: parsed.proposal || '',
      screeningAnswers: parsed.screeningAnswers || {},
      components: (parsed.components && typeof parsed.components === 'object') ? parsed.components : {},
      score: typeof parsed.score === 'number' ? parsed.score : 50,
    };
  } catch {
    return {
      proposal: text,
      screeningAnswers: {},
      components: {},
      score: 50,
    };
  }
}
