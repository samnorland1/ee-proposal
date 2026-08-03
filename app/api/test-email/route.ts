import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Proposal App <ai@emailevolution.online>',
      to: [process.env.NOTIFICATION_EMAIL || 'samnor88@googlemail.com'],
      subject: 'Test: Proposal App Email Notifications',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #02210C;">Test Email</h2>
          <p>If you received this, email notifications are working!</p>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            You'll get reminders when proposals sit in "Sent" for 3+ days.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Test email sent!' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
