import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/leads';
import { generateLeadProposal } from '@/lib/ai/lead-proposal-writer';
import { notifyHighScoreLead } from '@/lib/slack';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get optional feedback from request body
    let feedback: string | undefined;
    try {
      const body = await request.json();
      feedback = body?.feedback || undefined;
    } catch {
      // No body or not JSON — fine, feedback stays undefined
    }

    // Get the lead
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Generate proposal with screening questions and optional feedback
    const { proposal, screeningAnswers, components, score, qaIssues, qaPassed } = await generateLeadProposal(
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
      lead.screeningQuestions || [],
      feedback
    );

    // Update the lead with generated proposal
    const updatedLead = await updateLead(id, {
      proposal,
      screeningAnswers,
      components,
      score,
      ...(score !== null && score >= 80 ? { starred: true } : {}),
    });

    // Notify Slack if score jumped to >= 80 after proposal generation
    if (score !== null && score >= 80) {
      await notifyHighScoreLead(updatedLead);
    }

    return NextResponse.json({ lead: updatedLead, components, qa: { passed: qaPassed, issues: qaIssues } });
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to generate proposal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
