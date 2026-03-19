import { NotionTranscript } from '@/types';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_DB_ID = process.env.NOTION_TRANSCRIPTS_DATABASE_ID!;
const NOTION_VERSION = '2022-06-28';

const headers = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

function extractRichText(richText: { plain_text: string }[]): string {
  return richText?.map((t) => t.plain_text).join('') ?? '';
}

async function getPageContent(pageId: string): Promise<string> {
  let content = '';
  let cursor: string | undefined;

  do {
    const url = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Notion blocks error: ${res.status}`);
    const data = await res.json();

    for (const block of data.results) {
      const type = block.type as string;
      const blockData = block[type];
      if (blockData?.rich_text) {
        content += extractRichText(blockData.rich_text) + '\n';
      } else if (type === 'paragraph' || type === 'bulleted_list_item' || type === 'numbered_list_item') {
        content += '\n';
      }
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return content.trim();
}

export async function getTranscriptsReadyForProposal(): Promise<NotionTranscript[]> {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: {
        property: 'Status',
        status: { equals: 'Ready For Proposal' },
      },
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion query error: ${res.status} ${err}`);
  }

  const data = await res.json();

  return data.results.map((page: Record<string, unknown>) => {
    const props = page.properties as Record<string, Record<string, unknown>>;
    const getTitle = (prop: Record<string, unknown>) =>
      extractRichText((prop?.title as { plain_text: string }[]) ?? []);
    const getRichText = (prop: Record<string, unknown>) =>
      extractRichText((prop?.rich_text as { plain_text: string }[]) ?? []);
    const getEmail = (prop: Record<string, unknown>) =>
      (prop?.email as string) ?? '';

    return {
      pageId: page.id as string,
      clientName: getTitle(props['Name'] ?? props['Title'] ?? {}),
      clientEmail: getEmail(props['Email'] ?? {}),
      clientContact: getRichText(props['Contact'] ?? {}),
      transcript: '',
      notionUrl: (page.url as string) ?? '',
      createdAt: page.created_time as string,
    };
  });
}

export async function getTranscriptById(pageId: string): Promise<NotionTranscript> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
  if (!res.ok) throw new Error(`Notion page error: ${res.status}`);
  const page = await res.json();

  const props = page.properties as Record<string, Record<string, unknown>>;
  const getTitle = (prop: Record<string, unknown>) =>
    extractRichText((prop?.title as { plain_text: string }[]) ?? []);
  const getRichText = (prop: Record<string, unknown>) =>
    extractRichText((prop?.rich_text as { plain_text: string }[]) ?? []);
  const getEmail = (prop: Record<string, unknown>) =>
    (prop?.email as string) ?? '';

  const transcript = await getPageContent(pageId);

  return {
    pageId,
    clientName: getTitle(props['Name'] ?? props['Title'] ?? {}),
    clientEmail: getEmail(props['Email'] ?? {}),
    clientContact: getRichText(props['Contact'] ?? {}),
    transcript,
    notionUrl: page.url ?? '',
    createdAt: page.created_time,
  };
}

export async function updateTranscriptStatus(pageId: string, status: string): Promise<void> {
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      properties: {
        Status: { status: { name: status } },
      },
    }),
  });
}
