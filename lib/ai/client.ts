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

export async function complete(options: CompletionOptions): Promise<string> {
  const { system, messages, maxTokens } = options;

  // Try Claude first
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
  } catch (err) {
    const isOverloaded =
      (err as { status?: number })?.status === 529 ||
      (err instanceof Error && err.message.includes('529')) ||
      (err instanceof Error && err.message.includes('overloaded'));

    if (!isOverloaded) {
      throw err;
    }

    console.log('Claude overloaded, falling back to OpenAI GPT-4o');

    // Fallback to OpenAI
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) {
      openaiMessages.push({ role: 'system', content: system });
    }
    for (const m of messages) {
      openaiMessages.push({ role: m.role, content: m.content });
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: openaiMessages,
    });

    return response.choices[0]?.message?.content || '';
  }
}
