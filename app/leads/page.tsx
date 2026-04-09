'use client';

import { useState, useEffect } from 'react';
import { UpworkLead, LeadStatus } from '@/types';

type FilterStatus = 'all' | LeadStatus;

interface VollnaStats {
  sent: number;
  viewed: number;
  replies: number;
  hires: number;
  connectsSpent: number;
  connectsBalance: number;
  viewRate: string;
  replyRate: string;
  hireRate: string;
  avgConnectsPerBid: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<UpworkLead[]>([]);
  const [allLeads, setAllLeads] = useState<UpworkLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('new');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [vollnaStats, setVollnaStats] = useState<VollnaStats | null>(null);
  const [vollnaLoading, setVollnaLoading] = useState(false);
  const [vollnaError, setVollnaError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllLeads();
    // Load cached Vollna stats from localStorage
    const cached = localStorage.getItem('vollnaStats');
    if (cached) {
      try {
        const { stats, timestamp } = JSON.parse(cached);
        // Use cached data if less than 1 hour old
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          setVollnaStats(stats);
        }
      } catch {
        // Ignore cache errors
      }
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  async function fetchAllLeads() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setAllLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch all leads:', error);
    }
  }

  async function fetchVollnaStats() {
    setVollnaLoading(true);
    setVollnaError(null);
    try {
      const res = await fetch('/api/vollna/stats');
      const data = await res.json();
      if (data.error) {
        setVollnaError(data.error);
      } else {
        setVollnaStats(data);
        // Cache the results
        localStorage.setItem('vollnaStats', JSON.stringify({
          stats: data,
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      setVollnaError('Failed to fetch Vollna stats');
      console.error('Failed to fetch Vollna stats:', error);
    }
    setVollnaLoading(false);
  }

  async function fetchLeads() {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/leads' : `/api/leads?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: LeadStatus) {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchLeads();
      fetchAllLeads(); // Refresh stats
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function generateProposal(id: string) {
    setGeneratingId(id);
    try {
      const res = await fetch(`/api/leads/${id}/generate`, { method: 'POST' });
      if (res.ok) {
        fetchLeads();
        fetchAllLeads();
      } else {
        const data = await res.json();
        alert(`Failed to generate: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate proposal:', error);
      alert('Failed to generate proposal');
    }
    setGeneratingId(null);
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  }

  function formatSpend(spend: string | null) {
    if (!spend) return '—';
    // Extract number from string like "$15126.04"
    const match = spend.match(/[\d,.]+/);
    if (!match) return spend;
    const num = parseFloat(match[0].replace(/,/g, ''));
    if (isNaN(num)) return spend;

    if (num >= 1000) {
      // Round to nearest $1k
      const rounded = Math.round(num / 1000) * 1000;
      return `$${(rounded / 1000).toFixed(0)}k`;
    } else {
      // Round to nearest $100
      const rounded = Math.round(num / 100) * 100;
      return `$${rounded}`;
    }
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  }

  function getStatusBadge(status: LeadStatus) {
    const styles: Record<LeadStatus, string> = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      applied: 'bg-green-100 text-green-700 border-green-200',
      skipped: 'bg-gray-100 text-gray-600 border-gray-200',
      won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      lost: 'bg-red-100 text-red-600 border-red-200',
    };
    return styles[status];
  }

  // Calculate stats from ALL leads (not filtered)
  const stats = {
    total: allLeads.length,
    new: allLeads.filter(l => l.status === 'new').length,
    applied: allLeads.filter(l => l.status === 'applied').length,
    skipped: allLeads.filter(l => l.status === 'skipped').length,
    won: allLeads.filter(l => l.status === 'won').length,
    lost: allLeads.filter(l => l.status === 'lost').length,
    avgScore: allLeads.length > 0
      ? Math.round(allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / allLeads.length)
      : 0,
  };

  // Calculate rates
  const applyRate = stats.total > 0 ? ((stats.applied + stats.won + stats.lost) / stats.total * 100).toFixed(1) : '0';
  const winRate = (stats.applied + stats.won + stats.lost) > 0
    ? (stats.won / (stats.applied + stats.won + stats.lost) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Upwork Leads</h1>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['all', 'new', 'applied', 'won', 'lost', 'skipped'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === status
                    ? 'bg-[#02210C] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-6">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showStats ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>

          {showStats && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              {/* Pipeline Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-blue-600">{stats.new}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">New</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-amber-600">{stats.applied}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Applied</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-emerald-600">{stats.won}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Won</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-red-500">{stats.lost}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Lost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-400">{stats.skipped}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-purple-600">{stats.avgScore}%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</div>
                </div>
              </div>

              {/* Rate Stats */}
              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-gray-900">{applyRate}%</div>
                    <div className="text-xs text-gray-500">Apply Rate</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-emerald-600">{winRate}%</div>
                    <div className="text-xs text-gray-500">Win Rate</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-gray-900">
                      {vollnaStats ? `${vollnaStats.viewRate}%` : '—'}
                    </div>
                    <div className="text-xs text-gray-500">View Rate</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-gray-900">
                      {vollnaStats ? `${vollnaStats.replyRate}%` : '—'}
                    </div>
                    <div className="text-xs text-gray-500">Reply Rate</div>
                  </div>
                </div>
              </div>

              {/* Vollna Stats */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">Vollna Proposal Stats</div>
                  <button
                    onClick={fetchVollnaStats}
                    disabled={vollnaLoading}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {vollnaLoading ? (
                      <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </>
                    )}
                  </button>
                </div>
                {vollnaError && (
                  <div className="text-xs text-red-500 mb-3">{vollnaError}</div>
                )}
                {vollnaStats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-blue-700">{vollnaStats.sent}</div>
                      <div className="text-xs text-blue-600">Sent</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-amber-700">{vollnaStats.viewed}</div>
                      <div className="text-xs text-amber-600">Viewed</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-purple-700">{vollnaStats.replies}</div>
                      <div className="text-xs text-purple-600">Replies</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-emerald-700">{vollnaStats.hires}</div>
                      <div className="text-xs text-emerald-600">Hires</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="text-lg font-bold text-gray-700">{vollnaStats.connectsSpent}</div>
                      <div className="text-xs text-gray-600">Connects Spent</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-lg font-bold text-green-700">{vollnaStats.connectsBalance}</div>
                      <div className="text-xs text-green-600">Connects Left</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Click refresh to load Vollna stats (uses 1 API credit)</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Leads */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No leads yet. Connect Vollna webhook to start receiving jobs.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs min-w-[300px]">Job</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-20">Budget</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-24">Spend</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-24">Location</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-14">Rating</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-20">Hires</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-16">Posted</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-14">Score</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-16">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-44">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <>
                      <tr
                        key={lead.id}
                        onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3">
                          <div className="font-medium text-gray-900 text-sm">{lead.title}</div>
                          <div className="text-xs text-gray-500">
                            {lead.skills.slice(0, 3).join(' · ')}
                            {lead.skills.length > 3 && ` +${lead.skills.length - 3}`}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-xs">{lead.budget || '—'}</td>
                        <td className="py-2 px-3 text-gray-600 text-xs">{formatSpend(lead.clientSpend)}</td>
                        <td className="py-2 px-3 text-gray-600 text-xs">{lead.clientCountry || '—'}</td>
                        <td className="py-2 px-3 text-gray-600 text-xs">{lead.clientReviewScore || '—'}</td>
                        <td className="py-2 px-3 text-gray-600 text-xs">{lead.clientHireRate || '—'}</td>
                        <td className="py-2 px-3 text-gray-500 text-xs">{formatTimeAgo(lead.postedAt)}</td>
                        <td className={`py-2 px-3 font-bold text-xs ${getScoreColor(lead.score)}`}>
                          {lead.score ? `${lead.score}%` : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {lead.proposal ? (
                              <button
                                onClick={() => copyToClipboard(lead.proposal || '', `proposal-${lead.id}`)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  copiedId === `proposal-${lead.id}`
                                    ? 'bg-green-600 text-white'
                                    : 'bg-[#02210C] hover:bg-[#033612] text-white'
                                }`}
                              >
                                {copiedId === `proposal-${lead.id}` ? 'Copied!' : 'Copy'}
                              </button>
                            ) : (
                              <button
                                onClick={() => generateProposal(lead.id)}
                                disabled={generatingId === lead.id}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  generatingId === lead.id
                                    ? 'bg-gray-300 text-gray-500 cursor-wait'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                              >
                                {generatingId === lead.id ? '...' : 'Generate'}
                              </button>
                            )}
                            {lead.status === 'new' && (
                              <>
                                <button
                                  onClick={() => updateStatus(lead.id, 'applied')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                                >
                                  Applied
                                </button>
                                <button
                                  onClick={() => updateStatus(lead.id, 'skipped')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                  Skip
                                </button>
                              </>
                            )}
                            {lead.status === 'applied' && (
                              <>
                                <button
                                  onClick={() => updateStatus(lead.id, 'won')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                                >
                                  Won
                                </button>
                                <button
                                  onClick={() => updateStatus(lead.id, 'lost')}
                                  className="px-2 py-1 rounded text-xs font-medium bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                                >
                                  Lost
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedLead === lead.id && (
                        <tr key={`${lead.id}-expanded`} className="bg-gray-50">
                          <td colSpan={10} className="p-6">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Left: Job Details */}
                              <div>
                                <h3 className="font-semibold mb-3 text-gray-900">Job Details</h3>
                                <div className="bg-white rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto border border-gray-200">
                                  {lead.description}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                  <div><span className="text-gray-500">Client:</span> {lead.clientCountry || 'Unknown'}</div>
                                  <div><span className="text-gray-500">Spend:</span> {formatSpend(lead.clientSpend)}</div>
                                  <div><span className="text-gray-500">Hire Rate:</span> {lead.clientHireRate || 'Unknown'}</div>
                                  <div><span className="text-gray-500">Rating:</span> {lead.clientReviewScore || 'Unknown'}</div>
                                </div>
                                {lead.jobUrl && (
                                  <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-[#02210C] hover:underline text-sm font-medium">
                                    View on Upwork →
                                  </a>
                                )}
                              </div>

                              {/* Right: Proposal */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-semibold text-gray-900">Generated Proposal</h3>
                                  <button
                                    onClick={() => copyToClipboard(lead.proposal || '', `expanded-${lead.id}`)}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${
                                      copiedId === `expanded-${lead.id}`
                                        ? 'bg-green-600 text-white'
                                        : 'bg-[#02210C] hover:bg-[#033612] text-white'
                                    }`}
                                  >
                                    {copiedId === `expanded-${lead.id}` ? 'Copied!' : 'Copy Proposal'}
                                  </button>
                                </div>
                                <div className="bg-white rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto border border-gray-200">
                                  {lead.proposal || 'No proposal generated'}
                                </div>

                                {/* Screening Answers */}
                                {lead.screeningAnswers && Object.keys(lead.screeningAnswers).length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Screening Questions</h4>
                                    <div className="space-y-3">
                                      {Object.entries(lead.screeningAnswers).map(([question, answer], i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                                          <div className="text-xs text-gray-500 mb-1">{question}</div>
                                          <div className="text-sm text-gray-700 flex items-start justify-between gap-2">
                                            <span>{answer}</span>
                                            <button
                                              onClick={() => copyToClipboard(answer, `answer-${lead.id}-${i}`)}
                                              className={`shrink-0 px-2 py-0.5 rounded text-xs transition-colors ${
                                                copiedId === `answer-${lead.id}-${i}`
                                                  ? 'bg-green-600 text-white'
                                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                              }`}
                                            >
                                              {copiedId === `answer-${lead.id}-${i}` ? '✓' : 'Copy'}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Hooks */}
                                {lead.hooks && lead.hooks.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Hook Options</h4>
                                    <div className="space-y-2">
                                      {lead.hooks.map((hook, i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 flex items-start justify-between gap-2">
                                          <span className="text-sm text-gray-700">{hook}</span>
                                          <button
                                            onClick={() => copyToClipboard(hook, `hook-${lead.id}-${i}`)}
                                            className={`shrink-0 px-2 py-0.5 rounded text-xs transition-colors ${
                                              copiedId === `hook-${lead.id}-${i}`
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                            }`}
                                          >
                                            {copiedId === `hook-${lead.id}-${i}` ? '✓' : 'Copy'}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{lead.title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {lead.skills.slice(0, 2).join(' · ')}
                          {lead.skills.length > 2 && ` +${lead.skills.length - 2}`}
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-gray-600">{lead.budget || 'No budget'}</span>
                      <span className="text-gray-500">{formatTimeAgo(lead.postedAt)}</span>
                      <span className={`font-bold ${getScoreColor(lead.score)}`}>
                        {lead.score ? `${lead.score}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {expandedLead === lead.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Job Description */}
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2 text-sm text-gray-900">Job Details</h3>
                        <div className="bg-white rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto border border-gray-200">
                          {lead.description}
                        </div>
                      </div>

                      {/* Client Info */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                        <div><span className="text-gray-500">Client:</span> {lead.clientCountry || 'Unknown'}</div>
                        <div><span className="text-gray-500">Spend:</span> {formatSpend(lead.clientSpend)}</div>
                        <div><span className="text-gray-500">Hire Rate:</span> {lead.clientHireRate || 'Unknown'}</div>
                        <div><span className="text-gray-500">Rating:</span> {lead.clientReviewScore || 'Unknown'}</div>
                      </div>

                      {/* Proposal */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm text-gray-900">Proposal</h3>
                          {lead.proposal ? (
                            <button
                              onClick={() => copyToClipboard(lead.proposal || '', `mobile-${lead.id}`)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                copiedId === `mobile-${lead.id}`
                                  ? 'bg-green-600 text-white'
                                  : 'bg-[#02210C] hover:bg-[#033612] text-white'
                              }`}
                            >
                              {copiedId === `mobile-${lead.id}` ? 'Copied!' : 'Copy'}
                            </button>
                          ) : (
                            <button
                              onClick={() => generateProposal(lead.id)}
                              disabled={generatingId === lead.id}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                generatingId === lead.id
                                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {generatingId === lead.id ? 'Generating...' : 'Generate'}
                            </button>
                          )}
                        </div>
                        <div className="bg-white rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto border border-gray-200">
                          {lead.proposal || 'Click Generate to create proposal'}
                        </div>
                      </div>

                      {/* Screening Answers */}
                      {lead.screeningAnswers && Object.keys(lead.screeningAnswers).length > 0 && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-sm mb-2 text-gray-900">Screening Questions</h3>
                          <div className="space-y-2">
                            {Object.entries(lead.screeningAnswers).map(([question, answer], i) => (
                              <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">{question}</div>
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-sm text-gray-700">{answer}</span>
                                  <button
                                    onClick={() => copyToClipboard(answer, `mobile-answer-${lead.id}-${i}`)}
                                    className={`shrink-0 px-2 py-0.5 rounded text-xs transition-colors ${
                                      copiedId === `mobile-answer-${lead.id}-${i}`
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {copiedId === `mobile-answer-${lead.id}-${i}` ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hooks */}
                      {lead.hooks && lead.hooks.length > 0 && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-sm mb-2 text-gray-900">Hook Options</h3>
                          <div className="space-y-2">
                            {lead.hooks.map((hook, i) => (
                              <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 flex items-start justify-between gap-2">
                                <span className="text-sm text-gray-700">{hook}</span>
                                <button
                                  onClick={() => copyToClipboard(hook, `mobile-hook-${lead.id}-${i}`)}
                                  className={`shrink-0 px-2 py-0.5 rounded text-xs transition-colors ${
                                    copiedId === `mobile-hook-${lead.id}-${i}`
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  {copiedId === `mobile-hook-${lead.id}-${i}` ? '✓' : 'Copy'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {lead.jobUrl && (
                          <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer" className="text-[#02210C] hover:underline text-sm font-medium">
                            View on Upwork →
                          </a>
                        )}
                        {lead.status === 'new' && (
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => updateStatus(lead.id, 'applied')}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                            >
                              Applied
                            </button>
                            <button
                              onClick={() => updateStatus(lead.id, 'skipped')}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            >
                              Skip
                            </button>
                          </div>
                        )}
                        {lead.status === 'applied' && (
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => updateStatus(lead.id, 'won')}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                            >
                              Won
                            </button>
                            <button
                              onClick={() => updateStatus(lead.id, 'lost')}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                            >
                              Lost
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
  );
}
