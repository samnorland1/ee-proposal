'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Proposal } from '@/types';
import { ProposalPreview } from '@/components/proposal-preview';

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((d) => setProposal(d.proposal));
  }, [id]);

  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm gap-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        Loading preview...
      </div>
    );
  }

  return (
    <>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-[#02210C] text-white px-6 py-3 flex items-center justify-between shadow">
        <a
          href={`/proposals/${id}`}
          className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to editor
        </a>
        <p className="text-sm font-medium">
          {proposal.clientName}
        </p>
        <a
          href={`/api/proposals/${id}/pdf`}
          className="bg-white text-[#02210C] text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </a>
      </div>

      <ProposalPreview proposal={proposal} />
    </>
  );
}
