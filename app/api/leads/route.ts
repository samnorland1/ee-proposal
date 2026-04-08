import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, createLead } from '@/lib/leads';
import { LeadStatus, UpworkLead } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as LeadStatus | null;

    const leads = await getAllLeads(status || undefined);
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// Manual job submission (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
    }

    const jobData = {
      jobId: body.jobId || `manual-${Date.now()}`,
      title: body.title,
      description: body.description,
      budget: body.budget || null,
      budgetType: body.budgetType || null,
      category: body.category || null,
      skills: body.skills || [],
      clientCountry: body.clientCountry || null,
      clientSpend: body.clientSpend || null,
      clientHireRate: body.clientHireRate || null,
      clientReviewScore: body.clientReviewScore || null,
      clientFirstName: body.clientFirstName || null,
      postedAt: body.postedAt || new Date().toISOString(),
      jobUrl: body.jobUrl || body.url || '',
    };

    // Don't auto-generate - user clicks Generate button
    const lead: Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt'> = {
      ...jobData,
      proposal: null,
      screeningAnswers: null,
      hooks: null,
      score: null,
      status: 'new',
    };

    const savedLead = await createLead(lead);
    return NextResponse.json(savedLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
