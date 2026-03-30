import { EXTRACTION_PROMPT } from '@/lib/prompts/extraction-prompt';
import { ExtractedData } from '@/types';
import { complete } from './client';

export async function extractFromTranscript(transcript: string, extraContext?: string): Promise<ExtractedData> {
  const contextSection = extraContext ? `\n\nEXTRA CONTEXT (additional info not in the transcript — incorporate this):\n${extraContext}` : '';
  const text = await complete({
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract structured information from this meeting transcript:\n\nTRANSCRIPT:\n${transcript}${contextSection}\n\nReturn ONLY a valid JSON object with no additional text.`,
      },
    ],
    maxTokens: 4096,
  });

  let json = text.trim();
  // Strip markdown code fences if present
  json = json.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

  return JSON.parse(json) as ExtractedData;
}
