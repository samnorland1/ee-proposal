import { NextResponse } from 'next/server';

const VOLLNA_API_URL = 'https://api.vollna.com';
const VOLLNA_API_KEY = process.env.VOLLNA_API_KEY;

interface VollnaProposal {
  id: string;
  isViewed: boolean;
  isInterviewed: boolean;
  isHired: boolean;
  isWithdrawn: boolean;
  isArchived: boolean;
  connects: number;
  submittedAt: string;
}

interface VollnaProfile {
  id: string;
  connectsBalance: number;
}

export async function GET() {
  if (!VOLLNA_API_KEY) {
    return NextResponse.json({ error: 'Vollna API key not configured' }, { status: 500 });
  }

  try {
    // Fetch proposals
    const proposalsRes = await fetch(`${VOLLNA_API_URL}/proposals`, {
      headers: {
        'X-API-TOKEN': VOLLNA_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!proposalsRes.ok) {
      const errorText = await proposalsRes.text();
      console.error('Vollna proposals error:', proposalsRes.status, errorText);
      return NextResponse.json({
        error: `Vollna API error: ${proposalsRes.status}`,
        details: errorText
      }, { status: proposalsRes.status });
    }

    const proposalsData = await proposalsRes.json();
    const proposals: VollnaProposal[] = proposalsData.data || proposalsData || [];

    // Fetch profiles for connects balance
    let connectsBalance = 0;
    try {
      const profilesRes = await fetch(`${VOLLNA_API_URL}/profiles`, {
        headers: {
          'X-API-TOKEN': VOLLNA_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        const profiles: VollnaProfile[] = profilesData.data || profilesData || [];
        connectsBalance = profiles.reduce((sum, p) => sum + (p.connectsBalance || 0), 0);
      }
    } catch {
      console.error('Failed to fetch profiles');
    }

    // Calculate stats
    const sent = proposals.length;
    const viewed = proposals.filter(p => p.isViewed).length;
    const replies = proposals.filter(p => p.isInterviewed).length;
    const hires = proposals.filter(p => p.isHired).length;
    const connectsSpent = proposals.reduce((sum, p) => sum + (p.connects || 0), 0);

    const viewRate = sent > 0 ? (viewed / sent * 100).toFixed(2) : '0';
    const replyRate = sent > 0 ? (replies / sent * 100).toFixed(2) : '0';
    const hireRate = sent > 0 ? (hires / sent * 100).toFixed(2) : '0';
    const avgConnectsPerBid = sent > 0 ? (connectsSpent / sent).toFixed(1) : '0';

    return NextResponse.json({
      sent,
      viewed,
      replies,
      hires,
      connectsSpent,
      connectsBalance,
      viewRate,
      replyRate,
      hireRate,
      avgConnectsPerBid,
    });
  } catch (error) {
    console.error('Vollna stats error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Vollna stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
