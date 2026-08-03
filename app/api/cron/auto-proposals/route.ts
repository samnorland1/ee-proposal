import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLead } from '@/lib/leads';
import { generateLeadProposal } from '@/lib/ai/lead-proposal-writer';

const AUTO_PROPOSAL_THRESHOLD = 78;

export const maxDuration = 300; // 5 minutes — enough for several proposals

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find new leads with high score and no proposal yet
    const { data, error } = await supabase
      .from('upwork_leads')
      .select('*')
      .gte('score', AUTO_PROPOSAL_THRESHOLD)
      .is('proposal', null)
      .eq('status', 'new')
      .order('score', { ascending: false })
      .limit(5); // Process up to 5 per run to stay within time limit

    if (error) throw new Error(error.message);

    const leads = data ?? [];

    if (leads.length === 0) {
      return NextResponse.json({ message: 'No leads needing proposals', count: 0 });
    }

    const results: { id: string; title: string; score: number; success: boolean }[] = [];

    for (const row of leads) {
      try {
        console.log(`Auto-generating proposal for lead ${row.id} (score: ${row.score}): ${row.title}`);

        const { proposal, screeningAnswers, components, score: proposalScore } = await generateLeadProposal(
          {
            title: row.title,
            description: row.description,
            budget: row.budget,
            budgetType: row.budget_type,
            category: row.category,
            skills: row.skills ?? [],
            clientCountry: row.client_country,
            clientSpend: row.client_spend,
            clientHireRate: row.client_hire_rate,
            clientReviewScore: row.client_review_score,
            clientFirstName: row.client_first_name,
          },
          row.screening_questions ?? []
        );

        await updateLead(row.id, { proposal, screeningAnswers, components, score: proposalScore });
        results.push({ id: row.id, title: row.title, score: row.score, success: true });
      } catch (err) {
        console.error(`Auto-proposal failed for lead ${row.id}:`, err);
        results.push({ id: row.id, title: row.title, score: row.score, success: false });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-proposals cron error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
