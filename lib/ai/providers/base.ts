/**
 * Base interface for AI providers
 * Supports multiple AI services (OpenAI, DeepSeek, Anthropic, etc.)
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  model?: string;
}

export interface AIProvider {
  name: string;

  /**
   * Generate text completion
   */
  complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>;

  /**
   * Generate streaming text completion
   */
  streamComplete?(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Text-to-Speech generation (optional, not all providers support this)
   */
  generateSpeech?(
    text: string,
    options?: TTSOptions
  ): Promise<Buffer>;

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;
}

export type ProviderType = 'openai' | 'deepseek' | 'anthropic';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
}
