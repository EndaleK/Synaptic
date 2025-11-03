import OpenAI from 'openai';
import type { AIProvider, Message, CompletionOptions, CompletionResponse, TTSOptions } from './base';

/**
 * OpenAI Provider
 * Full-featured provider with chat completion and TTS support
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (key) {
      this.client = new OpenAI({
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
      throw new Error('OpenAI API key not configured');
    }

    const completion = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stream: false,
    });

    // Add null check for completion object
    if (!completion) {
      throw new Error('OpenAI API returned null response');
    }

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('OpenAI API returned no choices in response');
    }

    const choice = completion.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No valid response from OpenAI API');
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
      throw new Error('OpenAI API key not configured');
    }

    const stream = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
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

  async generateSpeech(
    text: string,
    options?: TTSOptions
  ): Promise<Buffer> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const mp3 = await this.client.audio.speech.create({
      model: options?.model || 'tts-1',
      voice: (options?.voice as any) || 'alloy',
      input: text,
      speed: options?.speed || 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  }
}
