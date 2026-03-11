'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Proposal, ProposalSections, StringSectionKey } from '@/types';

function screenshotSrc(relativePath: string): string {
  return '/' + relativePath.split('/').map(encodeURIComponent).join('/');
}

function captionFromPath(relativePath: string): string {
  const filename = relativePath.split('/').pop() ?? '';
  return filename.replace(/\.[^.]+$/, '');
}

function ScreenshotManager({ proposal, onChange, onCaptionChange }: {
  proposal: Proposal;
  onChange: (screenshots: string[]) => void;
  onCaptionChange: (path: string, caption: string) => void;
}) {
  const [available, setAvailable] = useState<{ name: string; files: string[] }[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState<string | null>(null);
  const current = proposal.screenshots ?? [];
  const captions = proposal.screenshotCaptions ?? {};

  useEffect(() => {
    if (open && available.length === 0) {
      fetch('/api/screenshots').then(r => r.json()).then(d => setAvailable(d.folders ?? []));
    }
  }, [open, available.length]);

  const remove = (path: string) => onChange(current.filter(s => s !== path));
  const add = async (path: string) => {
    if (current.includes(path)) return;
    onChange([...current, path]);
    // Auto-generate caption if not already set
    if (!captions[path]) {
      setGeneratingCaption(path);
      try {
        const res = await fetch('/api/screenshots/caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        const data = await res.json();
        if (data.caption) onCaptionChange(path, data.caption);
      } finally {
        setGeneratingCaption(null);
      }
    }
  };

  const startEditCaption = (src: string) => {
    setEditingCaption(src);
    setCaptionDraft(captions[src] ?? captionFromPath(src));
  };
  const saveCaption = (src: string) => {
    onCaptionChange(src, captionDraft);
    setEditingCaption(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-[#02210C] rounded-full" />
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Screenshots</h3>
          <span className="text-xs text-gray-400">({current.length})</span>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-[#02210C] hover:underline font-medium"
        >
          {open ? 'Close' : 'Add'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {current.length === 0 && !open && (
          <p className="text-gray-400 text-sm italic">No screenshots — click Add to browse</p>
        )}
        {current.map((src) => (
          <div key={src} className="flex items-center gap-3">
            <img src={screenshotSrc(src)} alt="" className="w-14 h-10 object-cover rounded border border-gray-200 shrink-0" />
            <div className="flex-1 min-w-0">
              {editingCaption === src ? (
                <input
                  autoFocus
                  value={captionDraft}
                  onChange={e => setCaptionDraft(e.target.value)}
                  onBlur={() => saveCaption(src)}
                  onKeyDown={e => { if (e.key === 'Enter') saveCaption(src); if (e.key === 'Escape') setEditingCaption(null); }}
                  className="w-full text-sm border-b border-[#02210C] outline-none py-0.5 bg-transparent"
                />
              ) : generatingCaption === src ? (
                <span className="text-sm text-gray-400 italic flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Writing caption...
                </span>
              ) : (
                <button
                  onClick={() => startEditCaption(src)}
                  className="text-sm text-gray-700 truncate text-left hover:text-[#02210C] group flex items-center gap-1"
                  title="Click to edit caption"
                >
                  <span className="truncate">{captions[src] ?? captionFromPath(src)}</span>
                  <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            <button onClick={() => remove(src)} className="text-red-400 hover:text-red-600 text-xs font-medium shrink-0">Remove</button>
          </div>
        ))}

        {open && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Available screenshots</p>
            {available.length === 0 && <p className="text-gray-400 text-sm italic">Loading...</p>}
            {available.map(folder => (
              <div key={folder.name} className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{folder.name}</p>
                <div className="grid grid-cols-3 gap-2">
                  {folder.files.map(file => {
                    const selected = current.includes(file);
                    return (
                      <button
                        key={file}
                        onClick={() => selected ? remove(file) : add(file)}
                        className={`relative group rounded border-2 overflow-hidden transition-colors ${selected ? 'border-[#02210C]' : 'border-gray-200 hover:border-gray-400'}`}
                        title={captions[file] ?? captionFromPath(file)}
                      >
                        <img src={screenshotSrc(file)} alt="" className="w-full h-16 object-cover" />
                        {selected && (
                          <div className="absolute inset-0 bg-[#02210C]/40 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 p-1 truncate bg-white">{captions[file] ?? captionFromPath(file)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SECTIONS: { key: StringSectionKey; label: string }[] = [
  { key: 'intro', label: 'Intro' },
  { key: 'currentIssues', label: 'Current Issues & Problem' },
  { key: 'solution', label: 'Solution' },
  { key: 'whatsIncluded', label: "What's Included" },
  { key: 'whatThisMeans', label: 'What This Means For You' },
  { key: 'results', label: 'Results' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'clientRequirements', label: "What I'd Need From You" },
  { key: 'validity', label: 'Validity' },
  { key: 'nextSteps', label: 'Next Steps' },
];

function StatusBadge({
  status,
  onChange,
}: {
  status: Proposal['status'];
  onChange: (s: Proposal['status']) => void;
}) {
  const styles: Record<Proposal['status'], string> = {
    draft: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    ready: 'bg-blue-50 text-blue-700 border border-blue-200',
    sent: 'bg-purple-50 text-purple-700 border border-purple-200',
    won: 'bg-green-100 text-green-800 border border-green-300',
    lost: 'bg-red-50 text-red-600 border border-red-200',
  };
  const next: Record<Proposal['status'], Proposal['status']> = {
    draft: 'ready',
    ready: 'sent',
    sent: 'draft',
    won: 'draft',
    lost: 'draft',
  };
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(next[status])}
        className={`text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer ${styles[status]}`}
        title="Click to advance status"
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </button>
      {status !== 'won' && status !== 'lost' && (
        <>
          <button
            onClick={() => onChange('won')}
            className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors"
            title="Mark as won"
          >
            Won
          </button>
          <button
            onClick={() => onChange('lost')}
            className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            title="Mark as lost"
          >
            Lost
          </button>
        </>
      )}
    </div>
  );
}

// Simple markdown preview
function MarkdownPreview({ content }: { content: string }) {
  if (!content) return <p className="text-gray-400 text-sm italic">Empty section</p>;
  return (
    <div className="prose prose-sm max-w-none text-gray-700">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold text-gray-900">{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="ml-4 list-disc">{line.replace(/^[-*]\s+/, '')}</li>;
        }
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editing, setEditing] = useState<StringSectionKey | null>(null);
  const [draft, setDraft] = useState('');
  const [editingHeadline, setEditingHeadline] = useState<StringSectionKey | null>(null);
  const [headlineDraft, setHeadlineDraft] = useState('');
  const [editingClientName, setEditingClientName] = useState(false);
  const [clientNameDraft, setClientNameDraft] = useState('');
  const [editingProjectTitle, setEditingProjectTitle] = useState(false);
  const [projectTitleDraft, setProjectTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const saveScreenshots = useCallback(
    async (screenshots: string[]) => {
      if (!proposal) return;
      const updated = { ...proposal, screenshots };
      setProposal(updated);
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots }),
      });
    },
    [proposal, id]
  );

  const saveScreenshotCaption = useCallback(
    async (path: string, caption: string) => {
      if (!proposal) return;
      const screenshotCaptions = { ...(proposal.screenshotCaptions ?? {}), [path]: caption };
      setProposal({ ...proposal, screenshotCaptions });
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshotCaptions }),
      });
    },
    [proposal, id]
  );

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((d) => setProposal(d.proposal));
  }, [id]);

  const save = useCallback(
    async (key: StringSectionKey, value: string) => {
      if (!proposal) return;
      setSaving(true);
      const updated = {
        ...proposal,
        sections: { ...proposal.sections, [key]: value },
      };
      setProposal(updated);
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updated.sections }),
      });
      setSaving(false);
    },
    [proposal, id]
  );

  const updateStatus = useCallback(
    async (status: Proposal['status']) => {
      if (!proposal) return;
      setProposal({ ...proposal, status });
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    [proposal, id]
  );

  const saveHeadline = useCallback(
    async (key: string, value: string) => {
      if (!proposal) return;
      const headlines = { ...(proposal.sections.headlines ?? {}), [key]: value };
      const updated = { ...proposal, sections: { ...proposal.sections, headlines } };
      setProposal(updated);
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updated.sections }),
      });
    },
    [proposal, id]
  );

  const saveClientName = useCallback(
    async (value: string) => {
      if (!proposal || !value.trim()) return;
      const updated = { ...proposal, clientName: value.trim() };
      setProposal(updated);
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: value.trim() }),
      });
    },
    [proposal, id]
  );

  const saveProjectTitle = useCallback(
    async (value: string) => {
      if (!proposal) return;
      const updated = { ...proposal, projectTitle: value.trim() };
      setProposal(updated);
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectTitle: value.trim() }),
      });
    },
    [proposal, id]
  );

  const toggleSection = useCallback(
    async (key: string) => {
      if (!proposal) return;
      const current = proposal.sections.hiddenSections ?? [];
      const hiddenSections = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      const updated = { ...proposal, sections: { ...proposal.sections, hiddenSections } };
      setProposal(updated);
      await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updated.sections }),
      });
    },
    [proposal, id]
  );

  async function downloadPDF() {
    setDownloading(true);
    const res = await fetch(`/api/proposals/${id}/pdf`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal - ${proposal?.clientName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  async function deleteProposal() {
    if (!confirm('Delete this proposal?')) return;
    await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
    router.push('/proposals');
  }

  if (!proposal) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-start md:justify-between md:mb-8">
        <div className="min-w-0">
          <a href="/proposals" className="text-xs text-gray-400 hover:text-gray-600 mb-2 block">
            ← All Proposals
          </a>
          {editingClientName ? (
            <input
              autoFocus
              value={clientNameDraft}
              onChange={(e) => setClientNameDraft(e.target.value)}
              onBlur={() => { saveClientName(clientNameDraft); setEditingClientName(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { saveClientName(clientNameDraft); setEditingClientName(false); }
                if (e.key === 'Escape') setEditingClientName(false);
              }}
              className="text-2xl font-bold text-gray-900 border-b-2 border-[#02210C] outline-none bg-transparent"
            />
          ) : (
            <button
              onClick={() => { setClientNameDraft(proposal.clientName); setEditingClientName(true); }}
              className="flex items-center gap-2 group"
              title="Click to edit client name"
            >
              <h2 className="text-2xl font-bold text-gray-900">{proposal.clientName}</h2>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {/* Project Title */}
          <div className="mt-1 mb-1">
            {editingProjectTitle ? (
              <input
                autoFocus
                value={projectTitleDraft}
                onChange={(e) => setProjectTitleDraft(e.target.value)}
                onBlur={() => { saveProjectTitle(projectTitleDraft); setEditingProjectTitle(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { saveProjectTitle(projectTitleDraft); setEditingProjectTitle(false); }
                  if (e.key === 'Escape') setEditingProjectTitle(false);
                }}
                className="text-sm text-gray-600 border-b border-[#02210C] outline-none bg-transparent w-72"
                placeholder="Project title..."
              />
            ) : (
              <button
                onClick={() => { setProjectTitleDraft(proposal.projectTitle ?? ''); setEditingProjectTitle(true); }}
                className="flex items-center gap-1.5 group"
                title="Click to edit project title"
              >
                <span className="text-sm text-gray-500 italic">{proposal.projectTitle || 'No project title — click to add'}</span>
                <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={proposal.status} onChange={updateStatus} />
            <span className="text-sm font-semibold text-gray-700">{proposal.pricing}</span>
            {proposal.clientEmail && (
              <span className="text-sm text-gray-500">{proposal.clientEmail}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {saving && <span className="text-xs text-gray-400">Saving...</span>}
          <a
            href={`/proposals/${id}/preview`}
            className="border border-[#02210C] text-[#02210C] text-sm font-medium px-3 py-2 rounded-lg hover:bg-[#02210C]/5 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </a>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="bg-[#02210C] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#033a12] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={deleteProposal}
            className="text-sm text-gray-400 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map(({ key, label }) => {
          const customHeadline = proposal.sections.headlines?.[key];
          const displayLabel = customHeadline ?? label;
          const isHidden = proposal.sections.hiddenSections?.includes(key) ?? false;
          return (
          <div key={key} className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${isHidden ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-0.5 h-4 bg-[#02210C] rounded-full shrink-0" />
                {editingHeadline === key ? (
                  <input
                    autoFocus
                    value={headlineDraft}
                    onChange={(e) => setHeadlineDraft(e.target.value)}
                    onBlur={() => {
                      saveHeadline(key, headlineDraft);
                      setEditingHeadline(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveHeadline(key, headlineDraft);
                        setEditingHeadline(null);
                      }
                      if (e.key === 'Escape') setEditingHeadline(null);
                    }}
                    className="text-xs font-semibold text-gray-700 uppercase tracking-wider bg-white border border-[#02210C]/30 rounded px-2 py-0.5 outline-none w-48"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingHeadline(key); setHeadlineDraft(displayLabel); }}
                    className="flex items-center gap-1.5 group"
                    title="Click to edit headline"
                  >
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {displayLabel}
                    </h3>
                    <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <button
                  onClick={() => toggleSection(key)}
                  className={`text-xs font-medium ${isHidden ? 'text-green-600 hover:text-green-700' : 'text-red-400 hover:text-red-600'}`}
                  title={isHidden ? 'Show in proposal' : 'Hide from proposal'}
                >
                  {isHidden ? 'Show' : 'Hide'}
                </button>
                {!isHidden && (
                  <button
                    onClick={() => {
                      if (editing === key) {
                        save(key, draft);
                        setEditing(null);
                      } else {
                        setEditing(key);
                        setDraft(proposal.sections[key]);
                      }
                    }}
                    className="text-xs text-[#02210C] hover:underline font-medium"
                  >
                    {editing === key ? 'Save' : 'Edit'}
                  </button>
                )}
              </div>
            </div>
            <div className="px-5 py-4">
              {editing === key ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={8}
                  className="w-full text-sm text-gray-700 resize-none outline-none font-mono leading-relaxed"
                  autoFocus
                />
              ) : (
                <MarkdownPreview content={proposal.sections[key]} />
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Screenshots */}
      <div className="mt-4">
        <ScreenshotManager proposal={proposal} onChange={saveScreenshots} onCaptionChange={saveScreenshotCaption} />
      </div>

      {/* Notion link */}
      {proposal.notionUrl && (
        <div className="mt-6 text-xs text-gray-400">
          Source:{' '}
          <a href={proposal.notionUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
            Notion transcript →
          </a>
        </div>
      )}
    </div>
  );
}
