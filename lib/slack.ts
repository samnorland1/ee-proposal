import { UpworkLead } from '@/types';

export async function notifyHighScoreLead(lead: Pick<UpworkLead, 'id' | 'title' | 'score' | 'budget' | 'budgetType' | 'clientSpend' | 'clientHireRate' | 'jobUrl'>) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const score = lead.score ?? 0;
  const budget = lead.budget ? `${lead.budget}${lead.budgetType ? ` (${lead.budgetType})` : ''}` : 'N/A';
  const appUrl = `https://proposal-app-nine.vercel.app/leads?filter=starred`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `*Hot lead: score ${score}/100*\n*${lead.title}*\nBudget: ${budget} | Client spend: ${lead.clientSpend ?? 'N/A'} | Hires: ${lead.clientHireRate ?? 'N/A'}\n<${appUrl}|View starred leads> | <${lead.jobUrl}|Upwork posting>`,
    }),
  });
}
