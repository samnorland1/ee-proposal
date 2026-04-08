import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/leads';
import { generateLeadProposal } from '@/lib/ai/lead-proposal-writer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the lead
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Generate proposal
    const { proposal, screeningAnswers, hooks, score } = await generateLeadProposal(
      {
        title: lead.title,
        description: lead.description,
        budget: lead.budget,
        budgetType: lead.budgetType,
        category: lead.category,
        skills: lead.skills,
        clientCountry: lead.clientCountry,
        clientSpend: lead.clientSpend,
        clientHireRate: lead.clientHireRate,
        clientReviewScore: lead.clientReviewScore,
        clientFirstName: lead.clientFirstName,
      },
      [] // No screening questions for now
    );

    // Update the lead with generated proposal
    const updatedLead = await updateLead(id, {
      proposal,
      screeningAnswers,
      hooks,
      score,
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to generate proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
