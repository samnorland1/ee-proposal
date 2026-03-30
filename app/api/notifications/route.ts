import { NextResponse } from 'next/server';
import { getAllProposals } from '@/lib/storage';

export interface Notification {
  id: string;
  type: 'follow_up';
  proposalId: string;
  clientName: string;
  message: string;
  daysAgo: number;
}

const FOLLOW_UP_DAYS = 3;

export async function GET() {
  try {
    const proposals = await getAllProposals();
    const now = new Date();
    const notifications: Notification[] = [];

    for (const proposal of proposals) {
      if (proposal.status === 'sent' && proposal.sentAt) {
        const sentDate = new Date(proposal.sentAt);
        const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceSent >= FOLLOW_UP_DAYS) {
          notifications.push({
            id: `followup-${proposal.id}`,
            type: 'follow_up',
            proposalId: proposal.id,
            clientName: proposal.clientName,
            message: `Follow up with ${proposal.clientName} - proposal sent ${daysSinceSent} days ago`,
            daysAgo: daysSinceSent,
          });
        }
      }
    }

    // Sort by days ago (oldest first = most urgent)
    notifications.sort((a, b) => b.daysAgo - a.daysAgo);

    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
