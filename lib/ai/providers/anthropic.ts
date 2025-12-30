import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, Message, CompletionOptions, CompletionResponse } from './base';

/**
 * Anthropic Claude Model IDs
 * Updated December 2025
 */
export const ANTHROPIC_MODELS = {
  // Haiku 4.5 - Fast, cost-efficient ($1/$5 per MTok)
  // Best for: Real-time assistants, chat, Study Buddy
  HAIKU: 'claude-3-5-haiku-20241022',

  // Sonnet 4.5 - Balanced intelligence/cost ($3/$15 per MTok)
  // Best for: Mind maps, flashcards, exams, structured output
  SONNET: 'claude-sonnet-4-20250514',

  // Opus 4.5 - Most intelligent ($5/$25 per MTok)
  // Best for: Complex reasoning, agents, coding
  OPUS: 'claude-opus-4-5-20251101',
} as const;

export type AnthropicModel = typeof ANTHROPIC_MODELS[keyof typeof ANTHROPIC_MODELS];

/**
 * Anthropic/Claude Provider
 * High-quality reasoning and analysis, great for educational content
 *
 * Supports model selection:
 * - Haiku: Fast, real-time responses (chat, study buddy)
 * - Sonnet: Balanced quality (flashcards, mind maps, exams)
 * - Opus: Maximum intelligence (complex analysis)
 */
export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic | null = null;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = model || ANTHROPIC_MODELS.SONNET; // Default to Sonnet

    if (key) {
      this.client = new Anthropic({
        apiKey: key,
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    // Separate system message from conversation messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      system: systemMessage?.content || undefined,
      messages: conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Anthropic API');
    }

    return {
      content: textContent.text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *streamComplete(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    // Separate system message from conversation messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      system: systemMessage?.content || undefined,
      messages: conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
