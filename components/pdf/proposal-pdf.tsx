import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import React from 'react';
import { Proposal } from '@/types';

// Disable automatic hyphenation globally
Font.registerHyphenationCallback((word) => [word]);

const BLACK = '#0D0D0D';
const WHITE = '#ffffff';
const ORANGE = '#F97316';
const TEXT = '#D1D5DB';
const MUTED = '#6B7280';
const BORDER = '#ffffff18';
const LIGHT = '#161616';
const GREY_LINE = '#2a2a2a';

const s = StyleSheet.create({
  coverPage: {
    backgroundColor: BLACK,
    padding: 56,
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 36,
  },
  coverServiceLabel: {
    fontSize: 9,
    color: ORANGE,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 24,
    textAlign: 'center',
  },
  coverProjectTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: WHITE,
    lineHeight: 1.1,
    textAlign: 'center',
    maxWidth: 420,
  },
  coverSpacer: {
    flex: 1,
  },
  coverPreparedFor: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  coverClientName: {
    fontSize: 36,
    fontWeight: 700,
    color: WHITE,
    lineHeight: 1.1,
    textAlign: 'center',
    maxWidth: 420,
  },
  contentPage: {
    backgroundColor: BLACK,
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 56,
    paddingRight: 56,
  },
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    borderTopWidth: 0.5,
    borderTopColor: GREY_LINE,
    paddingTop: 20,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 9,
    color: ORANGE,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionContent: {
    paddingBottom: 32,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.8,
    color: TEXT,
    marginBottom: 5,
  },
  subhead: {
    fontSize: 13,
    fontWeight: 700,
    color: WHITE,
    marginBottom: 5,
    marginTop: 16,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bulletMark: {
    width: 16,
    fontSize: 12,
    color: ORANGE,
    fontWeight: 700,
  },
  bulletBody: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.8,
    color: TEXT,
  },
  muted: {
    fontSize: 11,
    lineHeight: 1.7,
    color: MUTED,
    marginBottom: 4,
  },
  table: {
    borderWidth: 0.5,
    borderColor: BORDER,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: ORANGE,
  },
  tableCell: {
    fontSize: 12,
    color: TEXT,
  },
  tableCellBold: {
    fontSize: 12,
    fontWeight: 700,
    color: WHITE,
  },
  tableTotalLabel: {
    fontSize: 9,
    color: WHITE,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tableTotalValue: {
    fontSize: 18,
    fontWeight: 700,
    color: WHITE,
  },
  placeholder: {
    backgroundColor: LIGHT,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 12,
    marginTop: 4,
  },
  placeholderText: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
  },
  screenshotImg: {
    width: '100%',
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 3,
  },
  screenshotCaption: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 10,
  },
});

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

function Markdown({ text, small }: { text: string; small?: boolean }) {
  if (!text) return <View />;
  const bodyStyle = small ? s.muted : s.body;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = renderInline(line.replace(/^[-*]\s+/, ''));
      elements.push(
        <View key={i} style={s.bullet}>
          <Text style={s.bulletMark}>·</Text>
          <Text style={s.bulletBody}>{content}</Text>
        </View>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1] ?? '•';
      const content = renderInline(line.replace(/^\d+\.\s+/, ''));
      elements.push(
        <View key={i} style={s.bullet}>
          <Text style={s.bulletMark}>{num}.</Text>
          <Text style={s.bulletBody}>{content}</Text>
        </View>
      );
    } else if (line.startsWith('### ') || line.startsWith('#### ')) {
      elements.push(
        <Text key={i} style={s.subhead}>{line.replace(/^#{3,4}\s+/, '')}</Text>
      );
    } else if (line.trim() === '') {
      elements.push(<View key={`sp-${i}`} style={{ height: 3 }} />);
    } else {
      elements.push(
        <Text key={i} style={bodyStyle}>{renderInline(line)}</Text>
      );
    }
  });

  return <View>{elements}</View>;
}

function Section({ title, content, small }: {
  title: string;
  content: string;
  small?: boolean;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader} wrap={false}>
        <Text style={s.sectionLabel}>{title}</Text>
      </View>
      <View style={s.sectionContent}>
        <Markdown text={content} small={small} />
      </View>
    </View>
  );
}

function PricingSection({ content, total }: { content: string; total: string }) {
  const lines = content.split('\n').filter((l) => l.trim());
  const lineItems: { label: string; value: string }[] = [];
  const textLines: string[] = [];

  lines.forEach((line) => {
    const clean = line.replace(/^[-*]\s+/, '').trim();
    const match = clean.match(/^(.+?)(?::|—|-{1,2})\s*(\$[\d,]+(?:\.\d{2})?(?:\/\w+)?)$/);
    if (match) {
      lineItems.push({ label: match[1].trim(), value: match[2].trim() });
    } else if (clean && clean !== total) {
      textLines.push(clean);
    }
  });

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>Pricing</Text>
      </View>
      <View style={s.sectionContent}>
        {textLines.map((line, i) => (
          <Text key={i} style={s.body}>{renderInline(line)}</Text>
        ))}
        {lineItems.length > 0 && (
          <View style={s.table}>
            {lineItems.map((item, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableCell}>{item.label}</Text>
                <Text style={s.tableCellBold}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[s.tableTotalValue, { marginTop: 8 }]}>{total}</Text>
      </View>
    </View>
  );
}

function StaticSection({ title, content }: { title: string; content: string }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader} wrap={false}>
        <Text style={s.sectionLabel}>{title}</Text>
      </View>
      <View style={s.sectionContent}>
        {content ? (
          <Markdown text={content} />
        ) : (
          <View style={s.placeholder}>
            <Text style={s.placeholderText}>{title} — add your content in the editor</Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface ProposalPDFProps {
  proposal: Proposal;
  avatarPath?: string | null;
  screenshotAbsPaths?: string[];
  screenshotCaptions?: Record<string, string>; // relativePath → caption
}

export function ProposalPDF({ proposal, avatarPath, screenshotAbsPaths, screenshotCaptions }: ProposalPDFProps) {
  const { sections } = proposal;
  const hidden = new Set(sections.hiddenSections ?? []);
  const show = (key: string) => !hidden.has(key);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document>
      {/* ── COVER PAGE ─────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        {/* Avatar */}
        {avatarPath ? (
          <Image src={avatarPath} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 22, fontWeight: 700, color: WHITE }}>SN</Text>
          </View>
        )}

        {/* Service label */}
        <Text style={s.coverServiceLabel}>
          {proposal.extractedData?.service_type || 'Email Marketing'}
        </Text>

        {/* Project title */}
        <Text style={s.coverProjectTitle}>
          {proposal.projectTitle || 'Email Marketing Proposal'}
        </Text>

        {/* Spacer */}
        <View style={s.coverSpacer} />

        {/* Date */}
        <Text style={s.coverPreparedFor}>{today}</Text>

        {/* Prepared for + client name */}
        <Text style={[s.coverPreparedFor, { marginTop: 20 }]}>Prepared for:</Text>
        <Text style={s.coverClientName}>{proposal.clientName}</Text>
      </Page>

      {/* ── CONTENT ───────────────────────────────────────────── */}
      <Page size="A4" style={s.contentPage}>
        {show('intro') && <Section title="Intro" content={sections.intro} />}
        {show('currentIssues') && <Section title="Current Issues & Problem" content={sections.currentIssues} />}
        {show('solution') && <Section title="Solution" content={sections.solution} />}
        {show('whatsIncluded') && <Section title="What's Included" content={sections.whatsIncluded} />}
        {show('whatThisMeans') && <Section title="What This Means For You" content={sections.whatThisMeans} />}
        {show('results') && (
          <View style={s.section}>
            <View style={s.sectionHeader} wrap={false}>
              <Text style={s.sectionLabel}>Results</Text>
            </View>
            <View style={s.sectionContent}>
              {sections.results ? (
                <Markdown text={sections.results} />
              ) : !screenshotAbsPaths?.length ? (
                <View style={s.placeholder}>
                  <Text style={s.placeholderText}>Results — add your content in the editor</Text>
                </View>
              ) : null}
              {screenshotAbsPaths && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {screenshotAbsPaths.map((absPath, i) => {
                    const relPath = proposal.screenshots?.[i] ?? '';
                    const caption = screenshotCaptions?.[relPath]
                      ?? relPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
                    return (
                      <View key={i} wrap={false} style={{ width: '49%' }}>
                        <Image src={absPath} style={[s.screenshotImg, { marginTop: 0 }]} />
                        {caption ? <Text style={s.screenshotCaption}>{caption}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
        {show('timeline') && <Section title="Timeline" content={sections.timeline} />}
        {show('pricing') && <Section title="Pricing" content={sections.pricing} />}
        {show('clientRequirements') && <Section title="What I'd Need From You" content={sections.clientRequirements ?? ''} small />}
        {show('validity') && <Section title="Validity" content={sections.validity ?? ''} small />}
        {show('nextSteps') && <Section title="Next Steps" content={sections.nextSteps ?? ''} small />}
      </Page>
    </Document>
  );
}
