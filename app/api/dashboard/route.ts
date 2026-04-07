import { NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/leads';
import { getAllProposals } from '@/lib/storage';
import { getAllClients } from '@/lib/clients';

export async function GET() {
  try {
    const [leads, proposals, clients] = await Promise.all([
      getAllLeads(),
      getAllProposals(),
      getAllClients(),
    ]);

    // Lead stats
    const leadStats = {
      total: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      applied: leads.filter(l => l.status === 'applied').length,
      won: leads.filter(l => l.status === 'won').length,
      skipped: leads.filter(l => l.status === 'skipped').length,
    };

    // Proposal stats
    const proposalStats = {
      total: proposals.length,
      draft: proposals.filter(p => p.status === 'draft').length,
      sent: proposals.filter(p => p.status === 'sent').length,
      won: proposals.filter(p => p.status === 'won').length,
      lost: proposals.filter(p => p.status === 'lost').length,
    };

    // Client stats
    const clientStats = {
      total: clients.length,
    };

    // Recent activity
    const recentLeads = leads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        title: l.title,
        status: l.status,
        createdAt: l.createdAt,
        score: l.score,
      }));

    const recentProposals = proposals
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        clientName: p.clientName,
        status: p.status,
        updatedAt: p.updatedAt,
      }));

    return NextResponse.json({
      leads: leadStats,
      proposals: proposalStats,
      clients: clientStats,
      recentLeads,
      recentProposals,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
