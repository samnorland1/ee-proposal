import { getAllProposals } from '@/lib/storage';
import Link from 'next/link';
import { ProposalList } from './proposal-list';

export const dynamic = 'force-dynamic';

export default async function ProposalsPage() {
  const proposals = await getAllProposals();

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">All Proposals</h2>
        <Link
          href="/new"
          className="bg-[#1a2744] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#243561] transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Proposal
        </Link>
      </div>

      <ProposalList proposals={proposals} />
    </div>
  );
}
