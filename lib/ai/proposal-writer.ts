import Anthropic from '@anthropic-ai/sdk';
import { PROPOSAL_WRITER_SOP } from '@/lib/prompts/sop';
import { ExtractedData, ProposalSections } from '@/types';
import { withRetry } from './retry';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SECTION_MAP: Record<string, keyof ProposalSections> = {
  'intro': 'intro',
  'current issues': 'currentIssues',
  'current issues & problem': 'currentIssues',
  'problem': 'currentIssues',
  'solution': 'solution',
  "what's included": 'whatsIncluded',
  'included': 'whatsIncluded',
  'what this means for you': 'whatThisMeans',
  'what this means': 'whatThisMeans',
  'timeline': 'timeline',
  'pricing': 'pricing',
  'investment': 'pricing',
};

const COMM_PM_SECTION = `\n\n### COMMUNICATION & PROJECT MANAGEMENT\n- Fast and easy communication at all times via private Slack Channel (or preferred app)\n- Clickup for full project management and campaign/task approval\n- All deadlines met and regular updates sent\n- Regular stat reporting`;

const STATIC_DEFAULTS: Pick<ProposalSections, 'results' | 'clientRequirements' | 'validity' | 'nextSteps'> = {
  results: '',
  clientRequirements: '- Complete market research questionnaire (sent after start)\n- Complete onboarding\n- Approve emails / Communication',
  validity: 'This proposal is valid for 14 days from receipt after which the terms and price are subject to change.',
  nextSteps: "If you agree to this proposal please confirm and I'll get the project setup on Upwork.",
};

function parseSections(text: string): ProposalSections {
  const sections: ProposalSections = {
    intro: '',
    currentIssues: '',
    solution: '',
    whatsIncluded: '',
    whatThisMeans: '',
    results: STATIC_DEFAULTS.results,
    timeline: '',
    pricing: '',
    clientRequirements: STATIC_DEFAULTS.clientRequirements,
    validity: STATIC_DEFAULTS.validity,
    nextSteps: STATIC_DEFAULTS.nextSteps,
  };

  const lines = text.split('\n');
  let currentKey: keyof ProposalSections | null = null;
  const buffers: Partial<Record<keyof ProposalSections, string[]>> = {};

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const headerText = line.replace(/^##\s+/, '').replace(/^\d+\.\s+/, '').toLowerCase().trim();
      const matchedKey = Object.keys(SECTION_MAP).find((k) => headerText.includes(k));
      currentKey = matchedKey ? SECTION_MAP[matchedKey] : null;
      if (currentKey && !buffers[currentKey]) {
        buffers[currentKey] = [];
      }
    } else if (currentKey) {
      buffers[currentKey]!.push(line);
    }
  }

  for (const [key, lines] of Object.entries(buffers)) {
    const k = key as keyof ProposalSections;
    (sections as unknown as Record<string, string>)[k as string] = lines.join('\n').trim();
  }

  // Always ensure Communication & PM section is in whatsIncluded
  if (sections.whatsIncluded && !sections.whatsIncluded.toLowerCase().includes('communication & project management')) {
    sections.whatsIncluded += COMM_PM_SECTION;
  }

  return sections;
}

export async function generateProjectTitle(extractedData: ExtractedData): Promise<string> {
  const response = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 60,
    messages: [{
      role: 'user',
      content: `Generate a compelling 3-6 word project title for a proposal cover page. Be specific to the service. Mention the software/platform if applicable (e.g. Klaviyo, Shopify, Mailchimp). Professional and impactful. Return ONLY the title, no quotes or ending punctuation.

Service: ${extractedData.service_type}
Tools: ${extractedData.technical_context.current_tools.join(', ')}
Scope: ${extractedData.project_scope.slice(0, 3).join(', ')}`,
    }],
  }));
  const block = response.content.find((b) => b.type === 'text');
  return block?.type === 'text' ? block.text.trim() : extractedData.service_type;
}

export async function generateProposal(
  extractedData: ExtractedData,
  pricing: string,
  extraContext?: string
): Promise<ProposalSections> {
  const response = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: PROPOSAL_WRITER_SOP,
    messages: [
      {
        role: 'user',
        content: `Generate a complete professional proposal based on the following extracted meeting data.

EXTRACTED DATA:
${JSON.stringify(extractedData, null, 2)}

PRICING: ${pricing}${extraContext ? `\n\nEXTRA CONTEXT (incorporate these updates into the rewrite):\n${extraContext}` : ''}

Write all 7 sections following the SOP guidelines. Use the exact section headers specified in the Output Format section so they can be parsed reliably.`,
      },
    ],
  }));

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in proposal writer response');
  }

  return parseSections(textBlock.text);
}
