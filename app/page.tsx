'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  leads: {
    total: number;
    new: number;
    applied: number;
    won: number;
    skipped: number;
  };
  proposals: {
    total: number;
    draft: number;
    sent: number;
    won: number;
    lost: number;
  };
  clients: {
    total: number;
  };
  recentLeads: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    score: number | null;
  }>;
  recentProposals: Array<{
    id: string;
    clientName: string;
    status: string;
    updatedAt: string;
  }>;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-red-600">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leads Card */}
        <Link href="/leads" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Upwork Leads</h2>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z"/>
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{data.leads.new}</span>
                <span className="text-sm text-gray-500">new</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">{data.leads.applied} applied</span>
                <span className="text-emerald-600">{data.leads.won} won</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Proposals Card */}
        <Link href="/proposals" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Proposals</h2>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{data.proposals.draft}</span>
                <span className="text-sm text-gray-500">drafts</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">{data.proposals.sent} sent</span>
                <span className="text-emerald-600">{data.proposals.won} won</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Clients Card */}
        <Link href="/clients" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Clients</h2>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{data.clients.total}</span>
                <span className="text-sm text-gray-500">total</span>
              </div>
              <div className="text-sm text-gray-500">
                CRM contacts
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Recent Leads</h3>
            <Link href="/leads" className="text-sm text-emerald-600 hover:text-emerald-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentLeads.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No leads yet
              </div>
            ) : (
              data.recentLeads.map(lead => (
                <Link key={lead.id} href={`/leads`} className="block px-6 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.score !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          lead.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                          lead.score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {lead.score}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'applied' ? 'bg-purple-100 text-purple-700' :
                        lead.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Proposals */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Recent Proposals</h3>
            <Link href="/proposals" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentProposals.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No proposals yet
              </div>
            ) : (
              data.recentProposals.map(proposal => (
                <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block px-6 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{proposal.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(proposal.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      proposal.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      proposal.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      proposal.status === 'won' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
