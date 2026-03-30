import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI fallback unavailable - no API key configured');
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CompletionOptions {
  system?: string;
  messages: Message[];
  maxTokens: number;
}

function isOverloadedError(err: unknown): boolean {
  const errObj = err as { status?: number; error?: { type?: string } };
  const errMsg = err instanceof Error ? err.message : String(err);
  return (
    errObj?.status === 529 ||
    errObj?.error?.type === 'overloaded_error' ||
    errMsg.includes('529') ||
    errMsg.includes('overloaded') ||
    errMsg.includes('Overloaded')
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callClaudeWithRetry(
  system: string | undefined,
  messages: Message[],
  maxTokens: number,
  maxRetries = 5
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await getAnthropic().messages.create({
        model: 'claude-opus-4-6',
        max_tokens: maxTokens,
        system: system,
        messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      });

      const block = response.content.find(b => b.type === 'text');
      if (!block || block.type !== 'text') {
        throw new Error('No text in response');
      }
      return block.text;
    } catch (err: unknown) {
      lastError = err;
      if (!isOverloadedError(err)) {
        throw err;
      }
      // Longer delays: 2s, 4s, 8s, 16s, 32s (up to ~1 min total wait)
      const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 2000;
      console.log(`Claude overloaded (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function complete(options: CompletionOptions): Promise<string> {
  const { system, messages, maxTokens } = options;

  try {
    return await callClaudeWithRetry(system, messages, maxTokens);
  } catch (err: unknown) {
    if (!isOverloadedError(err)) {
      throw err;
    }

    console.log('Claude still overloaded after retries, falling back to GPT-4o-mini');

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) {
      openaiMessages.push({ role: 'system', content: system });
    }
    for (const m of messages) {
      openaiMessages.push({ role: m.role, content: m.content });
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: openaiMessages,
    });

    return response.choices[0]?.message?.content || '';
  }
}
