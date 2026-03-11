'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Proposal } from '@/types';

function StatusBadge({ status }: { status: Proposal['status'] }) {
  const styles: Record<Proposal['status'], string> = {
    draft: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    ready: 'bg-blue-50 text-blue-700 border border-blue-200',
    sent: 'bg-purple-50 text-purple-700 border border-purple-200',
    won: 'bg-green-100 text-green-800 border border-green-300',
    lost: 'bg-red-50 text-red-600 border border-red-200',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ProposalList({ proposals }: { proposals: Proposal[] }) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? proposals.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.clientName.toLowerCase().includes(q) ||
          p.clientContact?.toLowerCase().includes(q) ||
          p.projectTitle?.toLowerCase().includes(q) ||
          p.pricing?.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
        );
      })
    : proposals;

  const won = proposals.filter(p => p.status === 'won').length;
  const lost = proposals.filter(p => p.status === 'lost').length;

  return (
    <>
      {/* Stats row */}
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-gray-500">{proposals.length} total</p>
        {won > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300">
            {won} won
          </span>
        )}
        {lost > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
            {lost} lost
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by client, status, title..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1a2744]/40 focus:ring-2 focus:ring-[#1a2744]/10 bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Empty state */}
      {proposals.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 font-medium">No proposals yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Generate your first proposal from a Notion transcript</p>
          <Link href="/new" className="text-[#1a2744] font-medium text-sm underline underline-offset-2">
            Create one now →
          </Link>
        </div>
      )}

      {/* No search results */}
      {proposals.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">No proposals match &ldquo;{query}&rdquo;</p>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.map((proposal) => (
          <Link
            key={proposal.id}
            href={`/proposals/${proposal.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-[#1a2744]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{proposal.clientName}</h3>
                {proposal.projectTitle && (
                  <p className="text-sm text-gray-500 mt-0.5">{proposal.projectTitle}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={proposal.status} />
                <span className="text-sm font-semibold text-gray-900">{proposal.pricing}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {new Date(proposal.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
