import { AIThinking, ExtractedData } from '@/types';
import { complete } from './client';

const AI_THINKING_PROMPT = `You are a business analyst quantifying problems and projecting ROI for proposals.

Your job is to:
1. Identify quantified problems from the transcript data (numbers MUST be accurate or extremely realistic)
2. Project solutions with specific improvements
3. Calculate realistic ROI based on the improvements

## CRITICAL RULES

### For Problems:
- FIRST: Use exact numbers from the transcript if mentioned (mark as "transcript")
- SECOND: If no numbers, estimate realistic industry-standard metrics (mark as "estimated")
- Estimated numbers must be conservative and defensible
- Always include the unit (hours/week, $/month, % of revenue, etc.)

### For Solutions:
- Project realistic improvements based on the service type
- Email marketing: 2x open rates, 2-4x click rates, 20-40% more revenue from email
- Automation: 60-80% time savings on manual tasks
- Be specific about what improves and by how much

### For ROI:
- Calculate based on the quantified improvements
- If doubling email performance on a channel doing $10k/month → $10-20k additional
- If saving 20 hours/week at $50/hr → $4k/month saved
- Express as a range (e.g., "2-4x ROI" or "$5k-10k/month additional revenue")

Return ONLY valid JSON matching this structure:
{
  "quantifiedProblems": [
    {
      "problem": "Brief description of the problem",
      "metric": "The number with unit (e.g., '20 hours/week', '$5,000/month lost')",
      "source": "transcript" or "estimated"
    }
  ],
  "quantifiedSolutions": [
    {
      "solution": "Brief description of what we'll do",
      "improvement": "The projected improvement (e.g., '2x increase', '80% reduction')",
      "projectedValue": "What this means in real terms (e.g., 'Save 16 hours/week')"
    }
  ],
  "roiSummary": "One sentence explaining the ROI logic",
  "roiRange": "The ROI expressed simply (e.g., '2-4x' or '$5k-10k/month')"
}

## Examples

Good (realistic, defensible):
{
  "quantifiedProblems": [
    {"problem": "Manual email sends", "metric": "8 hours/week", "source": "transcript"},
    {"problem": "Low email engagement", "metric": "12% open rate (industry avg: 20%)", "source": "estimated"}
  ],
  "quantifiedSolutions": [
    {"solution": "Automated email flows", "improvement": "80% time reduction", "projectedValue": "Save 6+ hours/week"},
    {"solution": "Optimized subject lines & segmentation", "improvement": "1.5-2x open rate increase", "projectedValue": "18-24% open rate"}
  ],
  "roiSummary": "Automation saves 6 hours/week ($300/week at $50/hr) while doubled engagement could increase email revenue 40-80%",
  "roiRange": "2-3x ROI in first 90 days"
}

Bad (inflated, undefensible):
{
  "quantifiedProblems": [
    {"problem": "Inefficient processes", "metric": "massive time waste", "source": "estimated"}
  ],
  "quantifiedSolutions": [
    {"solution": "Our amazing system", "improvement": "10x improvement", "projectedValue": "Transform everything"}
  ]
}`;

export async function generateAIThinking(
  extractedData: ExtractedData,
  transcript: string
): Promise<AIThinking> {
  const text = await complete({
    system: AI_THINKING_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this data and generate quantified problems, solutions, and ROI projection.

SERVICE TYPE: ${extractedData.service_type}

PROBLEMS MENTIONED:
${extractedData.problems.map(p => `- ${p}`).join('\n')}

GOALS:
${extractedData.goals.map(g => `- ${g}`).join('\n')}

BUDGET SIGNALS:
- Mentioned budget: ${extractedData.budget_signals.mentioned_budget || 'Not mentioned'}
- Current costs: ${extractedData.budget_signals.current_costs || 'Not mentioned'}
- ROI expectations: ${extractedData.budget_signals.roi_expectations || 'Not mentioned'}

SCOPE:
${extractedData.project_scope.map(s => `- ${s}`).join('\n')}

TRANSCRIPT EXCERPT (for finding specific numbers):
${transcript.slice(0, 3000)}

Return ONLY valid JSON.`,
      },
    ],
    maxTokens: 2048,
  });

  let json = text.trim();
  json = json.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

  return JSON.parse(json) as AIThinking;
}
