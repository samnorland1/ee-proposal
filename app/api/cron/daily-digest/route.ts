import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

function scoreColor(score: number): string {
  if (score >= 85) return '#16a34a';
  if (score >= 70) return '#ca8a04';
  return '#dc2626';
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Hot';
  if (score >= 70) return 'Good';
  return 'Weak';
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('upwork_leads')
      .select('id, title, budget, budget_type, score, job_url, proposal, client_country, skills, created_at')
      .gte('created_at', since)
      .not('score', 'is', null)
      .order('score', { ascending: false });

    if (error) throw new Error(error.message);

    const leads = data ?? [];

    if (leads.length === 0) {
      return NextResponse.json({ message: 'No leads in last 24 hours', count: 0 });
    }

    const topLeads = leads.slice(0, 10);
    const hotCount = leads.filter((l) => l.score >= 85).length;

    const leadRows = topLeads
      .map((lead) => {
        const color = scoreColor(lead.score);
        const label = scoreLabel(lead.score);
        const budgetStr = lead.budget ? `${lead.budget}${lead.budget_type === 'hourly' ? '/hr' : ''}` : 'Budget TBC';
        const skills = Array.isArray(lead.skills) ? lead.skills.slice(0, 3).join(', ') : '';
        const hasProposal = !!lead.proposal;
        const appUrl = `https://proposal-app-nine.vercel.app/leads`;

        return `
          <tr>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
              <div style="font-weight: 600; color: #111; margin-bottom: 4px; font-size: 14px;">
                <a href="${appUrl}" style="color: #111; text-decoration: none;">${lead.title}</a>
              </div>
              <div style="color: #666; font-size: 12px;">${skills}</div>
              ${lead.client_country ? `<div style="color: #999; font-size: 12px; margin-top: 2px;">${lead.client_country}</div>` : ''}
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; white-space: nowrap; color: #444; font-size: 13px;">
              ${budgetStr}
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; text-align: center;">
              <span style="display: inline-block; background: ${color}; color: #fff; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 12px;">
                ${lead.score} ${label}
              </span>
            </td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; text-align: center; font-size: 12px; color: #666;">
              ${hasProposal ? '<span style="color:#16a34a;">&#10003; Ready</span>' : '<span style="color:#999;">Pending</span>'}
            </td>
          </tr>`;
      })
      .join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 660px; margin: 0 auto; background: #fff;">
        <div style="background: #02210C; padding: 28px 32px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">Daily Job Digest</h1>
          <p style="color: #6ee7b7; margin: 6px 0 0; font-size: 14px;">
            ${leads.length} new lead${leads.length !== 1 ? 's' : ''} in the last 24 hours
            ${hotCount > 0 ? ` &mdash; <strong>${hotCount} hot</strong>` : ''}
          </p>
        </div>

        <div style="padding: 24px 32px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f8f8;">
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Job</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Budget</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Score</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Proposal</th>
              </tr>
            </thead>
            <tbody>
              ${leadRows}
            </tbody>
          </table>
        </div>

        <div style="padding: 20px 32px 32px; text-align: center;">
          <a href="https://proposal-app-nine.vercel.app/leads"
            style="display: inline-block; background: #02210C; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
            View All Leads
          </a>
        </div>

        <div style="border-top: 1px solid #f0f0f0; padding: 16px 32px; color: #bbb; font-size: 12px; text-align: center;">
          Proposal App &mdash; Daily digest sent at 3pm UK time
        </div>
      </div>`;

    await resend.emails.send({
      from: 'Proposal App <ai@emailevolution.online>',
      to: [process.env.NOTIFICATION_EMAIL || 'samnor88@googlemail.com'],
      subject: `Daily Digest: ${leads.length} new lead${leads.length !== 1 ? 's' : ''}${hotCount > 0 ? ` (${hotCount} hot)` : ''}`,
      html,
    });

    return NextResponse.json({ success: true, count: leads.length, hotCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send digest';
    console.error('Daily digest error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
