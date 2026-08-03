import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProposals, updateProposal } from '@/lib/storage';
import { Proposal, ProposalStatus } from '@/types';

export const maxDuration = 120;

const CHASE_STATUS_MAP: Record<1 | 2 | 3, ProposalStatus> = {
  1: 'chase_1',
  2: 'chase_2',
  3: 'chase_3',
};

const STATUS_ORDER: ProposalStatus[] = ['sent', 'chase_1', 'chase_2', 'chase_3'];

function getChaseNumber(daysSinceSent: number): 1 | 2 | 3 | null {
  if (daysSinceSent >= 3 && daysSinceSent < 6) return 1;
  if (daysSinceSent >= 6 && daysSinceSent < 9) return 2;
  if (daysSinceSent >= 9) return 3;
  return null;
}

const CHASE_INSTRUCTIONS: Record<1 | 2 | 3, string> = {
  1: 'Chase 1: Check if they had any questions about the proposal. Reference what they are trying to achieve. The next step should feel easy.',
  2: 'Chase 2: Give something of genuine value — a specific tip or insight relevant to their exact situation (not generic). Ask one direct, casual question — no "can I ask". Tie back to their outcome.',
  3: 'Chase 3: Suggest a quick call. Make it feel low-commitment and easy. Reference the outcome they want. Light urgency — not desperate.',
};

async function generateChaseCopy(
  proposal: Proposal,
  chaseNum: 1 | 2 | 3,
  anthropic: Anthropic
): Promise<string> {
  const goals = (proposal.extractedData.goals ?? []).slice(0, 2).join('; ');
  const problems = (proposal.extractedData.problems ?? []).slice(0, 2).join('; ');

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a short follow-up chase email for a freelance services proposal.

Client: ${proposal.clientName}
Service: ${proposal.extractedData.service_type ?? proposal.projectTitle}
Their goals: ${goals}
Their problems: ${problems}
Pricing: ${proposal.pricing}

Chase type: ${CHASE_INSTRUCTIONS[chaseNum]}

Rules:
- Under 80 words
- No em dashes
- Complete sentences only, no fragments
- Nonchalant tone — not desperate or needy
- Always tie back to the outcome they want
- Hint of urgency without being pushy
- No subject line, no sign-off — just the message body

Return only the email body, nothing else.`,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const proposals = await getAllProposals();
    const now = new Date();

    type Reminder = {
      clientName: string;
      daysAgo: number;
      id: string;
      chaseNum: 1 | 2 | 3;
      chaseLabel: string;
      copy: string;
      proposal: Proposal;
    };

    const reminders: Reminder[] = [];

    for (const proposal of proposals) {
      try {
        if (['won', 'lost'].includes(proposal.status)) continue;

        let sentAt = proposal.sentAt;

        // Recover proposals stuck in a chase stage with no sentAt (caused by the old PATCH bug
        // that wiped sentAt whenever status changed away from 'sent')
        if (!sentAt && STATUS_ORDER.indexOf(proposal.status as ProposalStatus) > 0) {
          // Set sentAt 10 days back so the cron targets the highest chase stage and
          // sends whichever copies haven't been generated yet
          const recovered = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
          await updateProposal(proposal.id, { sentAt: recovered });
          sentAt = recovered;
        }

        if (!sentAt) continue;

        const sentDate = new Date(sentAt);
        const daysSinceSent = Math.floor(
          (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const chaseNum = getChaseNumber(daysSinceSent);
        if (!chaseNum) continue;

        const targetStatus = CHASE_STATUS_MAP[chaseNum];
        const chaseKey = targetStatus;

        // Skip if copy for this chase stage was already generated
        const existingCopy = proposal.sections.chaseCopies?.[chaseKey];
        if (existingCopy) continue;

        // Skip if already ahead of the target stage
        const currentIdx = STATUS_ORDER.indexOf(proposal.status as ProposalStatus);
        const targetIdx = STATUS_ORDER.indexOf(targetStatus);
        if (currentIdx > targetIdx) continue;

        const chaseLabels: Record<1 | 2 | 3, string> = {
          1: '3-Day Chase',
          2: '6-Day Chase',
          3: 'Final Chase',
        };

        const copy = await generateChaseCopy(proposal, chaseNum, anthropic);

        // Save copy and advance status (sentAt is preserved in storage layer)
        const chaseCopies = { ...(proposal.sections.chaseCopies ?? {}), [chaseKey]: copy };
        await updateProposal(proposal.id, {
          status: targetStatus,
          sections: { ...proposal.sections, chaseCopies },
        });

        reminders.push({
          clientName: proposal.clientName,
          daysAgo: daysSinceSent,
          id: proposal.id,
          chaseNum,
          chaseLabel: chaseLabels[chaseNum],
          copy,
          proposal,
        });
      } catch (proposalErr) {
        console.error(`Failed to process proposal ${proposal.id}:`, proposalErr);
        // Continue processing remaining proposals
      }
    }

    if (reminders.length === 0) {
      return NextResponse.json({ message: 'No reminders to send', count: 0 });
    }

    for (const r of reminders) {
      const html = `
        <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
          <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px 0;">${r.proposal.projectTitle ?? r.proposal.extractedData.service_type ?? ''} &mdash; ${r.proposal.pricing}</p>
          <p style="font-size: 13px; color: #9ca3af; margin: 0 0 20px 0;">Sent ${r.daysAgo} days ago</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #02210C; border-radius: 6px; padding: 16px;">
            <p style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0;">Copy to send</p>
            <p style="font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${r.copy}</p>
          </div>
          <p style="margin-top: 16px;">
            <a href="https://proposal-app-nine.vercel.app/proposals/${r.id}" style="font-size: 13px; color: #02210C; text-decoration: underline;">View proposal</a>
          </p>
        </div>
      `;

      await resend.emails.send({
        from: 'Proposal App <ai@emailevolution.online>',
        to: [process.env.NOTIFICATION_EMAIL || 'samnor88@googlemail.com'],
        subject: `${r.clientName} | ${r.chaseLabel}`,
        html,
      });
    }

    return NextResponse.json({
      message: 'Reminders sent',
      count: reminders.length,
      proposals: reminders.map((r) => ({ client: r.clientName, chase: r.chaseLabel })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reminders';
    console.error('Cron error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
