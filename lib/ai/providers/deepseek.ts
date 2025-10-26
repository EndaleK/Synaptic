import OpenAI from 'openai';
import type { AIProvider, Message, CompletionOptions, CompletionResponse } from './base';

/**
 * DeepSeek AI Provider
 * Uses OpenAI-compatible API with DeepSeek's endpoint
 */
export class DeepSeekProvider implements AIProvider {
  name = 'deepseek';
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;

    if (key) {
      this.client = new OpenAI({
        apiKey: key,
        baseURL: 'https://api.deepseek.com/v1',
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
      throw new Error('DeepSeek API key not configured');
    }

    const completion = await this.client.chat.completions.create({
      model: 'deepseek-chat', // DeepSeek's default model
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stream: false,
    });

    const choice = completion.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No response from DeepSeek API');
    }

    return {
      content: choice.message.content || '',
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined,
    };
  }

  async *streamComplete(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('DeepSeek API key not configured');
    }

    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
