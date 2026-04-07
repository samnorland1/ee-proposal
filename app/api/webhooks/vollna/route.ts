import { NextRequest, NextResponse } from 'next/server';
import { upsertLead } from '@/lib/leads';
import { generateLeadProposal } from '@/lib/ai/lead-proposal-writer';
import { UpworkLead } from '@/types';

interface VollnaWebhookPayload {
  event?: string;
  data?: {
    id: string;
    title: string;
    description: string;
    budget?: {
      amount?: number;
      type?: 'fixed' | 'hourly';
      min?: number;
      max?: number;
    };
    category?: string;
    skills?: string[];
    client?: {
      country?: string;
      totalSpend?: number;
      hireRate?: number;
      reviewScore?: number;
    };
    postedAt?: string;
    url?: string;
    questions?: string[];
  };
  // Alternative flat structure
  id?: string;
  title?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload: VollnaWebhookPayload = await request.json();

    // Handle both nested (data.X) and flat payload structures
    const rawData = payload.data ?? payload;
    if (!rawData.id || !rawData.title || !rawData.description) {
      return NextResponse.json({ error: 'Missing required fields: id, title, description' }, { status: 400 });
    }

    // After validation, we know these fields exist
    const data = rawData as NonNullable<VollnaWebhookPayload['data']>;

    // Transform payload to lead format
    const jobData = transformPayload(data);

    // Generate proposal using Claude
    const { proposal, screeningAnswers, score } = await generateLeadProposal(
      jobData,
      data.questions || []
    );

    // Build lead object
    const lead: Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt'> = {
      ...jobData,
      proposal,
      screeningAnswers,
      score,
      status: 'new',
    };

    // Upsert to database (updates if job_id exists)
    const savedLead = await upsertLead(lead, payload);

    return NextResponse.json({ success: true, leadId: savedLead.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

function transformPayload(data: NonNullable<VollnaWebhookPayload['data']>): Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt' | 'proposal' | 'screeningAnswers' | 'score' | 'status'> {
  let budget: string | null = null;
  if (data.budget) {
    if (data.budget.amount) {
      budget = `$${data.budget.amount}`;
    } else if (data.budget.min && data.budget.max) {
      budget = `$${data.budget.min} - $${data.budget.max}`;
    } else if (data.budget.min) {
      budget = `$${data.budget.min}+`;
    }
  }

  return {
    jobId: data.id,
    title: data.title,
    description: data.description,
    budget,
    budgetType: data.budget?.type || null,
    category: data.category || null,
    skills: data.skills || [],
    clientCountry: data.client?.country || null,
    clientSpend: data.client?.totalSpend ? `$${data.client.totalSpend}` : null,
    clientHireRate: data.client?.hireRate ? `${data.client.hireRate}%` : null,
    clientReviewScore: data.client?.reviewScore?.toString() || null,
    postedAt: data.postedAt || new Date().toISOString(),
    jobUrl: data.url || `https://www.upwork.com/jobs/${data.id}`,
  };
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    usage: 'POST job data to this endpoint',
  });
}
