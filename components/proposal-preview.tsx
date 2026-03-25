'use client';

import { Proposal, ProposalSections } from '@/types';

function screenshotSrc(relativePath: string): string {
  return '/' + relativePath.split('/').map(encodeURIComponent).join('/');
}

function captionFromPath(relativePath: string): string {
  const filename = relativePath.split('/').pop() ?? '';
  return filename.replace(/\.[^.]+$/, '');
}

function renderInline(text: string, _onAccent?: boolean): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
}

function renderContent(text: string, onAccent?: boolean) {
  if (!text)
    return <p className="text-gray-600 italic text-xl">No content — add this in the editor</p>;

  const bodyColor = onAccent ? 'text-white/90' : 'text-gray-300';

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ') || line.startsWith('#### ')) {
      elements.push(
        <p key={i} className="font-bold text-white mt-12 mb-5 text-2xl tracking-tight">
          {line.replace(/^#{3,4}\s+/, '')}
        </p>
      );
    } else if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      elements.push(
        <p key={i} className="font-bold text-white mt-12 mb-5 text-2xl tracking-tight">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={i} className="flex gap-5 my-4">
          <span className={`shrink-0 pt-[10px] ${onAccent ? 'text-white/60' : 'text-orange-500'}`}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
              <circle cx="4" cy="4" r="4" />
            </svg>
          </span>
          <span className={`${bodyColor} text-xl leading-[1.8]`}>{renderInline(content)}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const content = line.replace(/^\d+\.\s+/, '');
      elements.push(
        <div key={i} className="flex gap-5 my-4">
          <span className={`text-xl font-bold shrink-0 w-7 ${onAccent ? 'text-white/70' : 'text-orange-500'}`}>
            {num}.
          </span>
          <span className={`${bodyColor} text-xl leading-[1.8]`}>{renderInline(content)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={`sp-${i}`} className="h-5" />);
    } else {
      elements.push(
        <p key={i} className={`${bodyColor} text-xl leading-[1.8]`}>
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <>{elements}</>;
}

function SectionLabel({ label, onAccent }: { label: string; onAccent?: boolean }) {
  return (
    <p className={`text-sm font-bold tracking-[0.3em] uppercase mb-12 ${onAccent ? 'text-white/60' : 'text-orange-500'}`}>
      {label}
    </p>
  );
}

function Section({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`px-20 py-24 border-b border-white/[0.07] ${accent ? 'bg-orange-600' : 'bg-[#0D0D0D]'}`}>
      <SectionLabel label={label} onAccent={accent} />
      {children}
    </div>
  );
}

function TimelineDisplay({ content }: { content: string }) {
  if (!content) return <p className="text-gray-600 italic text-xl">No timeline — add in the editor</p>;

  const lines = content.split('\n');
  const phases: { title: string; description: string[] }[] = [];
  const noteLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      phases.push({ title: line.replace(/^###\s+/, ''), description: [] });
    } else if (line.trim().startsWith('Note:') || line.trim().startsWith('**Total') || line.trim().startsWith('**Note')) {
      noteLines.push(line.replace(/\*\*/g, '').trim());
    } else if (line.trim() && phases.length > 0) {
      phases[phases.length - 1].description.push(line.trim());
    }
  }

  if (phases.length === 0) return <>{renderContent(content)}</>;

  return (
    <div>
      {phases.map((phase, i) => (
        <div key={i} className="flex gap-12 pb-16">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0">
              {i + 1}
            </div>
            {i < phases.length - 1 && <div className="w-px flex-1 bg-white/10 mt-5" />}
          </div>
          <div className="pt-3">
            <p className="text-white font-bold text-2xl mb-3">{phase.title}</p>
            {phase.description.map((desc, j) => (
              <p key={j} className="text-gray-400 text-lg leading-relaxed">{desc}</p>
            ))}
          </div>
        </div>
      ))}
      {noteLines.map((note, i) => (
        <p key={i} className="text-gray-500 text-base mt-4 pt-8 border-t border-white/10">{note}</p>
      ))}
    </div>
  );
}

interface ProposalPreviewProps {
  proposal: Proposal;
}

export function ProposalPreview({ proposal }: ProposalPreviewProps) {
  const { sections } = proposal;
  const hidden = new Set(sections.hiddenSections ?? []);
  const show = (key: string) => !hidden.has(key);

  return (
    <div className="bg-[#111111] min-h-screen py-12 px-4">
      <div className="mx-auto shadow-2xl" style={{ maxWidth: 960 }}>

        {/* ── COVER ──────────────────────────────────────────────── */}
        <div className="bg-[#0D0D0D] flex flex-col items-center text-center px-16 pt-20 pb-24" style={{ minHeight: '90vh' }}>
          {/* Avatar */}
          <div className="mb-14">
            <img
              src="/Circle Headshots.png"
              alt=""
              className="w-28 h-28 rounded-full object-cover mx-auto shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          {/* Badge */}
          <p className="text-blue-400 text-xs font-bold tracking-[0.3em] uppercase mb-6">
            100% JSS · Top Rated Plus
          </p>

          {/* Service label */}
          <p className="text-orange-500 text-xs font-bold tracking-[0.45em] uppercase mb-10">
            {proposal.extractedData?.service_type || 'Email Marketing'}
          </p>

          {/* Project title */}
          <h1
            className="font-black text-white leading-[1.05] tracking-tight mb-0"
            style={{ fontSize: 'clamp(44px, 6.5vw, 76px)', maxWidth: 680 }}
          >
            {proposal.projectTitle || 'Email Marketing Proposal'}
          </h1>

          {/* Spacer */}
          <div className="flex-1" style={{ minHeight: 120 }} />

          {/* Date */}
          <p className="text-white/30 text-base font-medium mb-8 tracking-wide">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Prepared for */}
          <p className="text-white/40 text-lg font-medium mb-4 tracking-wide">
            Prepared for:
          </p>
          <h2
            className="font-black text-white leading-[1.05] tracking-tight"
            style={{ fontSize: 'clamp(44px, 6.5vw, 76px)', maxWidth: 680 }}
          >
            {proposal.clientName}
          </h2>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────── */}
        <div className="bg-[#0D0D0D]">

          {show('intro') && <Section label="Intro">{renderContent(sections.intro)}</Section>}
          {show('currentIssues') && <Section label="Current Issues & Problem">{renderContent(sections.currentIssues)}</Section>}
          {show('solution') && <Section label="Solution">{renderContent(sections.solution)}</Section>}
          {show('whatsIncluded') && <Section label="What's Included">{renderContent(sections.whatsIncluded)}</Section>}
          {show('whatThisMeans') && <Section label="What This Means For You" accent>{renderContent(sections.whatThisMeans, true)}</Section>}
          {show('results') && (
            <Section label="Results">
              {sections.results
                ? renderContent(sections.results)
                : !proposal.screenshots?.length
                  ? <p className="text-gray-600 italic text-xl">No content — add this in the editor</p>
                  : null}
              {proposal.screenshots && proposal.screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-10">
                  {proposal.screenshots.map((src, i) => {
                    const caption = proposal.screenshotCaptions?.[src] ?? captionFromPath(src);
                    return (
                      <figure key={i} className="m-0">
                        <img
                          src={screenshotSrc(src)}
                          alt={caption}
                          className="w-full rounded-2xl border border-white/10"
                        />
                        <figcaption className="text-gray-500 text-base mt-3 text-center">
                          {caption}
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              )}
            </Section>
          )}
          {show('timeline') && <Section label="Timeline"><TimelineDisplay content={sections.timeline} /></Section>}
          {show('pricing') && <Section label="Pricing">{renderContent(sections.pricing)}</Section>}

          {(
            [
              { key: 'clientRequirements', label: "What I'd Need From You" },
              { key: 'validity', label: 'Validity' },
              { key: 'nextSteps', label: 'Next Steps' },
            ] as { key: keyof ProposalSections; label: string }[]
          ).filter(({ key }) => show(key)).map(({ key, label }) => (
            <div key={key} className="bg-[#0D0D0D] px-20 py-20 border-b border-white/[0.07]">
              <SectionLabel label={label} />
              {renderContent(sections[key] as string)}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
