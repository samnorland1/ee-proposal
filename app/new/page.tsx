'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotionTranscript } from '@/types';

type Step = 1 | 2 | 3;

export default function NewProposalPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [transcripts, setTranscripts] = useState<NotionTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<NotionTranscript | null>(null);
  const [pricing, setPricing] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [error, setError] = useState('');
  const [generatingStatus, setGeneratingStatus] = useState('');

  async function loadTranscripts() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notion/transcripts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setTranscripts(data.transcripts);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transcripts');
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!selected || !pricing) return;
    setStep(3);
    setGeneratingStatus('Extracting information from transcript...');
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selected.pageId, pricing, extraContext: extraContext.trim() || undefined }),
      });

      setGeneratingStatus('Writing proposal sections...');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      router.push(`/proposals/${data.proposal.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setStep(2);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">New Proposal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate from a Notion meeting transcript</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? 'bg-[#02210C] text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-px w-8 ${step > s ? 'bg-[#02210C]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 1 && 'Load from Notion'}
          {step === 2 && 'Select & configure'}
          {step === 3 && 'Generating...'}
        </span>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-600 mb-6">
            This will fetch all Notion pages with status{' '}
            <span className="font-medium text-gray-900">&quot;Ready for Proposal&quot;</span>.
          </p>
          <button
            onClick={loadTranscripts}
            disabled={loading}
            className="bg-[#02210C] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </>
            ) : (
              'Load from Notion'
            )}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Select transcript</h3>
            {transcripts.length === 0 ? (
              <p className="text-sm text-gray-500">
                No transcripts with status &quot;Ready for Proposal&quot; found in Notion.
              </p>
            ) : (
              <div className="space-y-2">
                {transcripts.map((t) => (
                  <button
                    key={t.pageId}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      selected?.pageId === t.pageId
                        ? 'border-[#02210C] bg-[#02210C]/5 text-[#02210C] font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{t.clientName || 'Untitled'}</span>
                    {t.clientContact && (
                      <span className="text-gray-500"> · {t.clientContact}</span>
                    )}
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing</h3>
              <input
                type="text"
                value={pricing}
                onChange={(e) => setPricing(e.target.value)}
                placeholder="e.g. $5,000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#02210C] focus:ring-1 focus:ring-[#02210C]/20"
              />

              <h3 className="text-sm font-semibold text-gray-900 mt-5 mb-2">
                Extra context <span className="font-normal text-gray-400">(optional)</span>
              </h3>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Add any info not in the meeting notes — scope changes, pricing details, specific requirements..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#02210C] focus:ring-1 focus:ring-[#02210C]/20 resize-none"
              />
              <button
                onClick={generate}
                disabled={!pricing.trim()}
                className="mt-4 w-full bg-[#02210C] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-40"
              >
                Generate Proposal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — generating */}
      {step === 3 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <div className="w-12 h-12 border-2 border-[#02210C] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <p className="font-medium text-gray-900 mb-1">{generatingStatus}</p>
          <p className="text-sm text-gray-500">This takes about 60 seconds.</p>
        </div>
      )}
    </div>
  );
}
