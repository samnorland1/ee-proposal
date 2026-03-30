'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Proposal, ProposalStatus } from '@/types';

const COLUMNS: {
  id: ProposalStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: 'draft',
    label: 'Draft',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  {
    id: 'sent',
    label: 'Sent',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    id: 'won',
    label: 'Won',
    color: 'text-green-800',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  {
    id: 'lost',
    label: 'Lost',
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

function ProposalCard({ proposal, onDragStart }: { proposal: Proposal; onDragStart?: (id: string) => void }) {
  return (
    <Link
      href={`/proposals/${proposal.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('proposalId', proposal.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(proposal.id);
      }}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-[#02210C]/30 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
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

export function ProposalList({ proposals: initialProposals }: { proposals: Proposal[] }) {
  const router = useRouter();
  const [proposals, setProposals] = useState(initialProposals);
  const [activeCol, setActiveCol] = useState<ProposalStatus>('draft');
  const [dragOverCol, setDragOverCol] = useState<ProposalStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const getCards = (status: ProposalStatus) =>
    proposals.filter((p) => p.status === status);

  const handleDrop = async (e: React.DragEvent, newStatus: ProposalStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggingId(null);

    const proposalId = e.dataTransfer.getData('proposalId');
    if (!proposalId) return;

    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal || proposal.status === newStatus) return;

    // Optimistic update
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: newStatus } : p))
    );

    // API call
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch {
      // Revert on error
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: proposal.status } : p))
      );
    }
  };

  const handleDragOver = (e: React.DragEvent, status: ProposalStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

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
        <div className="flex gap-2 mb-4 w-full overflow-x-auto">
          {COLUMNS.map((col) => {
            const count = getCards(col.id).length;
            const active = activeCol === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveCol(col.id)}
                className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-medium border transition-colors ${
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
          {getCards(activeCol).length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No proposals here</p>
          ) : (
            getCards(activeCol).map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))
          )}
        </div>
      </div>

      {/* ── Desktop: 4-column Kanban with drag & drop ── */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const cards = getCards(col.id);
          const isDragOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              className="flex flex-col min-w-0"
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 border ${col.bg} ${col.border}`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${col.color}`}>
                  {cards.length}
                </span>
              </div>
              <div
                className={`space-y-3 flex-1 min-h-[200px] rounded-xl p-2 -m-2 transition-colors ${
                  isDragOver ? 'bg-gray-100 ring-2 ring-[#02210C]/30 ring-dashed' : ''
                }`}
              >
                {cards.length === 0 ? (
                  <div className={`border-2 border-dashed rounded-xl py-8 text-center transition-colors ${
                    isDragOver ? 'border-[#02210C]/30 bg-[#02210C]/5' : 'border-gray-200'
                  }`}>
                    <p className="text-xs text-gray-400">
                      {isDragOver ? 'Drop here' : 'No proposals'}
                    </p>
                  </div>
                ) : (
                  cards.map((p) => (
                    <div
                      key={p.id}
                      className={`transition-opacity ${draggingId === p.id ? 'opacity-50' : ''}`}
                    >
                      <ProposalCard proposal={p} onDragStart={setDraggingId} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
