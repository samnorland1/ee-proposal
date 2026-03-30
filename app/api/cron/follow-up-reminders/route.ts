import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAllProposals } from '@/lib/storage';

const FOLLOW_UP_DAYS = 3;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const proposals = await getAllProposals();
    const now = new Date();
    const reminders: { clientName: string; daysAgo: number; id: string }[] = [];

    for (const proposal of proposals) {
      if (proposal.status === 'sent' && proposal.sentAt) {
        const sentDate = new Date(proposal.sentAt);
        const daysSinceSent = Math.floor(
          (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send reminder at exactly 3 days, then every 3 days after
        if (daysSinceSent >= FOLLOW_UP_DAYS && daysSinceSent % FOLLOW_UP_DAYS === 0) {
          reminders.push({
            clientName: proposal.clientName,
            daysAgo: daysSinceSent,
            id: proposal.id,
          });
        }
      }
    }

    if (reminders.length === 0) {
      return NextResponse.json({ message: 'No reminders to send', count: 0 });
    }

    // Build email content
    const reminderList = reminders
      .map(
        (r) =>
          `- ${r.clientName} (sent ${r.daysAgo} days ago)\n  View: https://proposal-app-nine.vercel.app/proposals/${r.id}`
      )
      .join('\n\n');

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: `Follow-up Reminder: ${reminders.length} proposal${reminders.length > 1 ? 's' : ''} need attention`,
      text: `You have ${reminders.length} proposal${reminders.length > 1 ? 's' : ''} waiting for follow-up:\n\n${reminderList}\n\nDon't let these go cold!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #02210C;">Follow-up Reminder</h2>
          <p>You have <strong>${reminders.length}</strong> proposal${reminders.length > 1 ? 's' : ''} waiting for follow-up:</p>
          <ul style="padding-left: 20px;">
            ${reminders
              .map(
                (r) => `
              <li style="margin-bottom: 12px;">
                <strong>${r.clientName}</strong> - sent ${r.daysAgo} days ago<br/>
                <a href="https://proposal-app-nine.vercel.app/proposals/${r.id}" style="color: #02210C;">View Proposal</a>
              </li>
            `
              )
              .join('')}
          </ul>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">Don't let these go cold!</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: 'Reminders sent',
      count: reminders.length,
      proposals: reminders.map((r) => r.clientName),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reminders';
    console.error('Cron error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
