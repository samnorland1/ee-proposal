'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Proposal } from '@/types';

type Column = 'draft' | 'won' | 'lost';

const COLUMNS: {
  id: Column;
  label: string;
  statuses: Proposal['status'][];
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: 'draft',
    label: 'Draft',
    statuses: ['draft', 'ready', 'sent'],
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  {
    id: 'won',
    label: 'Won',
    statuses: ['won'],
    color: 'text-green-800',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  {
    id: 'lost',
    label: 'Lost',
    statuses: ['lost'],
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
];

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

function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-[#02210C]/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{proposal.clientName}</h3>
        <StatusBadge status={proposal.status} />
      </div>
      {proposal.projectTitle && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{proposal.projectTitle}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {new Date(proposal.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span className="text-xs font-semibold text-gray-700">{proposal.pricing}</span>
      </div>
    </Link>
  );
}

export function ProposalList({ proposals }: { proposals: Proposal[] }) {
  const [activeCol, setActiveCol] = useState<Column>('draft');

  const getCards = (col: (typeof COLUMNS)[0]) =>
    proposals.filter((p) => col.statuses.includes(p.status));

  if (proposals.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 font-medium">No proposals yet</p>
        <Link href="/new" className="text-[#02210C] font-medium text-sm underline underline-offset-2 mt-2 inline-block">
          Create one now →
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: filter tabs + single column ── */}
      <div className="md:hidden overflow-hidden">
        <div className="flex gap-2 mb-4 w-full">
          {COLUMNS.map((col) => {
            const count = getCards(col).length;
            const active = activeCol === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveCol(col.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  active
                    ? `${col.bg} ${col.color} ${col.border}`
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {col.label}{' '}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-0.5 ${active ? 'bg-white/60' : 'bg-gray-100 text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {getCards(COLUMNS.find((c) => c.id === activeCol)!).length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No proposals here</p>
          ) : (
            getCards(COLUMNS.find((c) => c.id === activeCol)!).map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))
          )}
        </div>
      </div>

      {/* ── Desktop: 3-column Kanban ── */}
      <div className="hidden md:grid md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const cards = getCards(col);
          return (
            <div key={col.id} className="flex flex-col min-w-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 border ${col.bg} ${col.border}`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${col.color}`}>
                  {cards.length}
                </span>
              </div>
              <div className="space-y-3 flex-1">
                {cards.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
                    <p className="text-xs text-gray-400">No proposals</p>
                  </div>
                ) : (
                  cards.map((p) => <ProposalCard key={p.id} proposal={p} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
