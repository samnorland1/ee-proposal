'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { UpworkLead, ProposalComponentKey, ProposalComponents } from '@/types';

const COMPONENT_LABELS: { key: ProposalComponentKey; label: string }[] = [
  { key: 'hook', label: 'Hook' },
  { key: 'proof', label: 'Proof' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'whyMe', label: 'Why Me' },
  { key: 'plan', label: 'Plan' },
  { key: 'tip', label: 'Tip' },
  { key: 'list', label: 'List' },
  { key: 'freeAsset', label: 'Free Asset' },
  { key: 'design', label: 'Design' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'flows', label: 'Flows' },
  { key: 'deliverability', label: 'Deliverability' },
  { key: 'copywriting', label: 'Copywriting' },
  { key: 'question', label: 'Question' },
  { key: 'ps', label: 'PS' },
];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [lead, setLead] = useState<UpworkLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [initialInstructions, setInitialInstructions] = useState('');
  const [qaResults, setQaResults] = useState<{ passed: boolean; issues: string[] } | null>(null);
  const [componentsState, setComponentsState] = useState<ProposalComponents | null>(null);

  useEffect(() => {
    fetchLead();
  }, [id]);

  async function fetchLead() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setLead(data);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function toggleStar() {
    if (!lead) return;
    const newStarred = !lead.starred;
    setLead(prev => prev ? { ...prev, starred: newStarred } : prev);
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newStarred }),
      });
    } catch {
      setLead(prev => prev ? { ...prev, starred: !newStarred } : prev);
    }
  }

  async function updateStatus(status: string) {
    if (!lead) return;
    setLead(prev => prev ? { ...prev, status: status as UpworkLead['status'] } : prev);
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchLead();
    }
  }

  async function generateProposal(feedback?: string) {
    setGeneratingId(id);
    try {
      const res = await fetch(`/api/leads/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackText('');
        if (data.qa) setQaResults(data.qa);
        if (data.components) setComponentsState(data.components);
        fetchLead();
      } else {
        const data = await res.json();
        alert(`Failed to generate: ${data.error || 'Unknown error'}`);
      }
    } catch {
      alert('Failed to generate proposal');
    }
    setGeneratingId(null);
  }

  function formatSpend(spend: string | null) {
    if (!spend) return '—';
    const match = spend.match(/[\d,.]+/);
    if (!match) return spend;
    const num = parseFloat(match[0].replace(/,/g, ''));
    if (isNaN(num)) return spend;
    if (num >= 1000) return `$${Math.round(num / 1000)}k`;
    return `$${Math.round(num / 100) * 100}`;
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      applied: 'bg-green-100 text-green-700 border-green-200',
      skipped: 'bg-gray-100 text-gray-600 border-gray-200',
      won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      lost: 'bg-red-100 text-red-600 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-16 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <div className="text-gray-500 mb-4">Lead not found</div>
          <button onClick={() => router.push('/leads')} className="text-[#02210C] hover:underline text-sm font-medium">
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  const activeComponents = componentsState ?? lead.components;
  const isGenerating = generatingId === id;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Back link + title */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Leads
        </button>

        <div className="flex flex-wrap items-start gap-3">
          <button onClick={toggleStar} className="text-xl leading-none mt-0.5">
            {lead.starred ? '⭐' : '☆'}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{lead.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
              <span>{formatTimeAgo(lead.postedAt)}</span>
              {lead.budget && <span>{lead.budget}</span>}
              {lead.clientCountry && <span>{lead.clientCountry}</span>}
              <span className={`font-bold ${getScoreColor(lead.score)}`}>
                {lead.score ? `Score: ${lead.score}%` : 'No score'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(lead.status)}`}>
                {lead.status}
              </span>
            </div>
          </div>

          {/* Status actions */}
          <div className="flex gap-2 flex-wrap">
            {lead.status === 'new' && (
              <>
                <button onClick={() => updateStatus('applied')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 hover:bg-green-200 text-green-700 transition-colors">Applied</button>
                <button onClick={() => updateStatus('skipped')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Skip</button>
              </>
            )}
            {lead.status === 'applied' && (
              <>
                <button onClick={() => updateStatus('won')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors">Won</button>
                <button onClick={() => updateStatus('lost')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 hover:bg-red-200 text-red-600 transition-colors">Lost</button>
              </>
            )}
            {lead.jobUrl && (
              <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                View on Upwork →
              </a>
            )}
          </div>
        </div>

        {lead.skills.length > 0 && (
          <div className="mt-2 text-sm text-gray-500">{lead.skills.join(' · ')}</div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Job + Proposal */}
        <div className="space-y-6">
          {/* Job description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Job Description</h2>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {lead.description}
            </div>
          </div>

          {/* Client info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Client Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Country:</span> <span className="font-medium">{lead.clientCountry || '—'}</span></div>
              <div><span className="text-gray-500">Spend:</span> <span className="font-medium">{formatSpend(lead.clientSpend)}</span></div>
              <div><span className="text-gray-500">Hire Rate:</span> <span className="font-medium">{lead.clientHireRate || '—'}</span></div>
              <div><span className="text-gray-500">Rating:</span> <span className="font-medium">{lead.clientReviewScore || '—'}</span></div>
            </div>
          </div>

          {/* Proposal */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Generated Proposal</h2>
                {qaResults && (
                  qaResults.passed ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">QA Passed</span>
                  ) : (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 cursor-help"
                      title={qaResults.issues.join('\n')}
                    >
                      QA Fixed {qaResults.issues.length} issue{qaResults.issues.length !== 1 ? 's' : ''}
                    </span>
                  )
                )}
              </div>
              {lead.proposal ? (
                <button
                  onClick={() => copyToClipboard(lead.proposal!, 'proposal')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    copiedId === 'proposal' ? 'bg-green-600 text-white' : 'bg-[#02210C] hover:bg-[#033612] text-white'
                  }`}
                >
                  {copiedId === 'proposal' ? 'Copied!' : 'Copy Proposal'}
                </button>
              ) : (
                <button
                  onClick={() => generateProposal(initialInstructions || undefined)}
                  disabled={isGenerating}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isGenerating ? 'bg-gray-300 text-gray-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              )}
            </div>

            {qaResults && !qaResults.passed && qaResults.issues.length > 0 && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-amber-800 mb-1">QA caught and fixed:</div>
                <ul className="space-y-0.5">
                  {qaResults.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-amber-700">- {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {!lead.proposal && (
              <textarea
                value={initialInstructions}
                onChange={(e) => setInitialInstructions(e.target.value)}
                placeholder="Any specific instructions? e.g. focus on their Shopify migration pain, mention the audit offer..."
                className="w-full mb-3 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#02210C] focus:border-transparent"
                rows={2}
              />
            )}

            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[80px]">
              {lead.proposal || <span className="text-gray-400 italic">No proposal yet</span>}
            </div>

            {lead.proposal && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What needs to change? e.g. hook is too generic, use the ecom checklist as the free offer..."
                  className="w-full p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#02210C] focus:border-transparent"
                  rows={2}
                />
                <button
                  onClick={() => generateProposal(feedbackText)}
                  disabled={isGenerating || !feedbackText.trim()}
                  className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isGenerating ? 'bg-gray-300 text-gray-500 cursor-wait'
                    : !feedbackText.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {isGenerating ? 'Regenerating...' : 'Regenerate with Feedback'}
                </button>
              </div>
            )}
          </div>

          {/* Screening answers */}
          {lead.screeningAnswers && Object.keys(lead.screeningAnswers).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Screening Questions</h2>
              <div className="space-y-3">
                {Object.entries(lead.screeningAnswers).map(([question, answer], i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">{question}</div>
                    <div className="text-sm text-gray-700 flex items-start justify-between gap-2">
                      <span>{answer}</span>
                      <button
                        onClick={() => copyToClipboard(answer, `answer-${i}`)}
                        className={`shrink-0 px-2 py-0.5 rounded text-xs transition-colors ${
                          copiedId === `answer-${i}` ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {copiedId === `answer-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Component Library */}
        <div>
          {activeComponents && Object.keys(activeComponents).length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden sticky top-6">
              <div className="px-4 py-3 bg-[#02210C]">
                <h3 className="text-white text-sm font-semibold uppercase tracking-wide">Component Library</h3>
                <p className="text-green-300 text-xs mt-0.5">Pick and mix to build your proposal</p>
              </div>
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-160px)] overflow-y-auto">
                {COMPONENT_LABELS.map(({ key, label }) => {
                  const variants = activeComponents[key];
                  if (!variants?.length) return null;
                  return (
                    <div key={key} className="p-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</div>
                      <div className="space-y-2">
                        {variants.map((variant, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                            <span className="text-xs font-bold text-gray-400 shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-sm text-gray-800 leading-snug flex-1 whitespace-pre-wrap">{variant}</span>
                            <div className="flex gap-1 shrink-0">
                              {key === 'hook' && (
                                <button
                                  onClick={() => setFeedbackText(`Use this hook instead: "${variant}"`)}
                                  className="px-2 py-0.5 rounded text-xs font-medium bg-[#02210C] hover:bg-[#033612] text-white transition-colors"
                                >
                                  Use
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(variant, `comp-${key}-${i}`)}
                                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                  copiedId === `comp-${key}-${i}` ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-600'
                                }`}
                              >
                                {copiedId === `comp-${key}-${i}` ? '✓' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : lead.hooks?.length ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sticky top-6">
              <h3 className="font-semibold text-amber-900 text-sm uppercase tracking-wide mb-3">Hook Options</h3>
              <div className="space-y-2">
                {lead.hooks.map((hook, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-amber-100 flex items-start justify-between gap-2">
                    <span className="text-sm text-gray-800 leading-snug">
                      <span className="text-amber-600 font-bold mr-1">{i + 1}.</span>{hook}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setFeedbackText(`Use this hook instead: "${hook}"`)}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => copyToClipboard(hook, `hook-${i}`)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          copiedId === `hook-${i}` ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        {copiedId === `hook-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400 sticky top-6">
              Component library will appear here after generating a proposal
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
