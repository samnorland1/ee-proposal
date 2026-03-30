import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET() {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.GMAIL_USER,
      subject: 'Test: Proposal App Email Notifications',
      text: 'If you received this, email notifications are working!',
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
