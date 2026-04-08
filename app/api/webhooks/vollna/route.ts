import { NextRequest, NextResponse } from 'next/server';
import { upsertLead } from '@/lib/leads';
import { generateLeadProposal } from '@/lib/ai/lead-proposal-writer';
import { UpworkLead } from '@/types';

// Vollna's actual Project schema from their OpenAPI spec
interface VollnaProject {
  title: string;
  description: string;
  skills?: string; // comma-separated string
  url?: string;
  publishedAt?: string;
  clientQuestions?: string[];
  categories?: string[];
  site?: string;
  budget?: {
    type?: string; // "Fixed price" or "Hourly rate"
    amount?: string; // string with currency symbol like "$500"
  };
  clientDetails?: {
    paymentMethodVerified?: boolean;
    country?: string;
    totalSpent?: number;
    totalHires?: number;
    hireRate?: number;
    rating?: number;
    reviews?: number;
  };
  clientWorkHistory?: Array<{
    feedback?: {
      score?: number;
      comment?: string;
    };
    feedback_to_client?: {
      score?: number;
      comment?: string;
    };
  }>;
}

// Extract job ID from Upwork URL
function extractJobId(url?: string): string {
  if (!url) return `vollna-${Date.now()}`;

  // Try to extract from URL like https://www.upwork.com/jobs/~01abc123
  const match = url.match(/jobs\/~?([a-zA-Z0-9]+)/);
  if (match) return match[1];

  // Fallback to hash of URL
  return `vollna-${url.split('/').pop() || Date.now()}`;
}

// Extract first name from review comments
function extractFirstNameFromReviews(workHistory?: VollnaProject['clientWorkHistory']): string | null {
  if (!workHistory || workHistory.length === 0) return null;

  const namePatterns = [
    /^([A-Z][a-z]{2,12})\s+(?:was|is|has been)/i,
    /working with\s+([A-Z][a-z]{2,12})/i,
    /thanks?\s*,?\s+([A-Z][a-z]{2,12})/i,
    /([A-Z][a-z]{2,12})\s+(?:is a|was a|is an|was an)\s+(?:great|excellent|amazing|wonderful|fantastic)/i,
    /recommend\s+([A-Z][a-z]{2,12})/i,
    /hired\s+([A-Z][a-z]{2,12})/i,
  ];

  const commonNames = new Set([
    'james', 'john', 'robert', 'michael', 'david', 'william', 'richard', 'joseph', 'thomas', 'charles',
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth',
    'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna', 'michelle',
    'alex', 'sam', 'chris', 'pat', 'jordan', 'taylor', 'morgan', 'casey', 'jamie', 'jesse',
    'mike', 'dave', 'dan', 'tom', 'bob', 'joe', 'bill', 'jim', 'steve', 'matt',
    'kate', 'jen', 'liz', 'sue', 'kim', 'amy', 'lisa', 'anna', 'emma', 'olivia',
    'raj', 'priya', 'amit', 'sanjay', 'deepak', 'wei', 'chen', 'ahmed', 'omar', 'ali',
  ]);

  const nameCounts: Record<string, number> = {};

  for (const item of workHistory) {
    const comment = item.feedback_to_client?.comment || item.feedback?.comment;
    if (!comment) continue;

    for (const pattern of namePatterns) {
      const match = comment.match(pattern);
      if (match && match[1]) {
        const name = match[1].toLowerCase();
        if (commonNames.has(name)) {
          nameCounts[match[1]] = (nameCounts[match[1]] || 0) + 1;
        }
      }
    }
  }

  const entries = Object.entries(nameCounts);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await request.json();

    // Log payload for debugging
    console.log('Vollna webhook received:', JSON.stringify(payload, null, 2));

    // Handle test/ping requests
    if (payload.event === 'test' || payload.type === 'test' || payload.ping || Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true, message: 'Webhook active' });
    }

    // Handle both nested (data.X) and flat payload structures
    const project: VollnaProject = payload.data ?? payload;

    // Validate required fields - but allow test requests through
    if (!project.title || !project.description) {
      console.log('Missing fields. Received:', JSON.stringify(payload));
      // Return success for test/ping - Vollna test might send empty or minimal payload
      return NextResponse.json({ success: true, message: 'Webhook received', keys: Object.keys(payload) });
    }

    // Transform payload to lead format
    const jobData = transformPayload(project);

    // Generate proposal using Claude
    const { proposal, screeningAnswers, score } = await generateLeadProposal(
      jobData,
      project.clientQuestions || []
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
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function transformPayload(project: VollnaProject): Omit<UpworkLead, 'id' | 'createdAt' | 'updatedAt' | 'proposal' | 'screeningAnswers' | 'score' | 'status'> {
  // Parse budget - Vollna sends it as string like "$500" or object with amount string
  let budget: string | null = null;
  let budgetType: 'fixed' | 'hourly' | null = null;

  if (project.budget) {
    budget = project.budget.amount || null;
    if (project.budget.type) {
      budgetType = project.budget.type.toLowerCase().includes('hour') ? 'hourly' : 'fixed';
    }
  }

  // Parse skills - Vollna sends comma-separated string
  const skills = project.skills
    ? project.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Extract client first name from work history reviews
  const clientFirstName = extractFirstNameFromReviews(project.clientWorkHistory);

  // Extract job ID from URL
  const jobId = extractJobId(project.url);

  return {
    jobId,
    title: project.title,
    description: project.description,
    budget,
    budgetType,
    category: project.categories?.[0] || null,
    skills,
    clientCountry: project.clientDetails?.country || null,
    clientSpend: project.clientDetails?.totalSpent ? `$${project.clientDetails.totalSpent}` : null,
    clientHireRate: project.clientDetails?.hireRate ? `${Math.round(project.clientDetails.hireRate * 100)}%` : null,
    clientReviewScore: project.clientDetails?.rating?.toString() || null,
    clientFirstName,
    postedAt: project.publishedAt || new Date().toISOString(),
    jobUrl: project.url || '',
  };
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    usage: 'POST job data to this endpoint',
  });
}
