import { NextResponse } from 'next/server';
import { getAllProposals } from '@/lib/storage';

export interface Notification {
  id: string;
  type: 'chase_ready' | 'follow_up';
  proposalId: string;
  clientName: string;
  message: string;
  chaseLabel: string;
  daysAgo: number;
}

const CHASE_LABELS: Record<string, string> = {
  chase_1: '3-Day Chase',
  chase_2: '6-Day Chase',
  chase_3: 'Final Chase',
};

export async function GET() {
  try {
    const proposals = await getAllProposals();
    const now = new Date();
    const notifications: Notification[] = [];

    for (const proposal of proposals) {
      if (['won', 'lost', 'draft', 'ready', 'sent'].includes(proposal.status)) continue;
      if (!proposal.sentAt) continue;

      const chaseLabel = CHASE_LABELS[proposal.status];
      if (!chaseLabel) continue;

      const sentDate = new Date(proposal.sentAt);
      const daysAgo = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

      const hasCopy = !!proposal.sections.chaseCopies?.[proposal.status];

      notifications.push({
        // Include status in ID so each stage gets independent dismissal
        id: `chase-${proposal.id}-${proposal.status}`,
        type: 'chase_ready',
        proposalId: proposal.id,
        clientName: proposal.clientName,
        message: hasCopy
          ? `${proposal.clientName} - ${chaseLabel} copy ready to send`
          : `${proposal.clientName} - ${chaseLabel} due`,
        chaseLabel,
        daysAgo,
      });
    }

    // Sort by days ago (oldest first = most urgent)
    notifications.sort((a, b) => b.daysAgo - a.daysAgo);

    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
