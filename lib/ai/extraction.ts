import Anthropic from '@anthropic-ai/sdk';
import { EXTRACTION_PROMPT } from '@/lib/prompts/extraction-prompt';
import { ExtractedData } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function extractFromTranscript(transcript: string): Promise<ExtractedData> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract structured information from this meeting transcript:\n\nTRANSCRIPT:\n${transcript}\n\nReturn ONLY a valid JSON object with no additional text.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in extraction response');
  }

  let json = textBlock.text.trim();
  // Strip markdown code fences if present
  json = json.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

  return JSON.parse(json) as ExtractedData;
}
