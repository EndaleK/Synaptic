import type { AIProvider, ProviderType, ProviderConfig } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { DeepSeekProvider } from './providers/deepseek';
import { AnthropicProvider } from './providers/anthropic';

/**
 * Provider Factory
 * Creates and manages AI provider instances
 */
class AIProviderFactory {
  private providers: Map<ProviderType, AIProvider> = new Map();

  constructor() {
    // Initialize all providers
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('deepseek', new DeepSeekProvider());
    this.providers.set('anthropic', new AnthropicProvider());
  }

  /**
   * Get provider by type
   */
  getProvider(type: ProviderType): AIProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found`);
    }
    return provider;
  }

  /**
   * Get provider with cascading fallback
   * Fallback chain: Primary → OpenAI → DeepSeek
   * Ensures maximum availability for free users
   */
  getProviderWithFallback(
    primary: ProviderType,
    fallback: ProviderType = 'openai'
  ): AIProvider {
    // Try primary provider
    const primaryProvider = this.getProvider(primary);
    if (primaryProvider.isConfigured()) {
      return primaryProvider;
    }

    // Try fallback provider (usually OpenAI)
    const fallbackProvider = this.getProvider(fallback);
    if (fallbackProvider.isConfigured()) {
      console.warn(`Provider ${primary} not configured, falling back to ${fallback}`);
      return fallbackProvider;
    }

    // Last resort: Try DeepSeek (most reliable, always configured)
    const deepseekProvider = this.getProvider('deepseek');
    if (deepseekProvider.isConfigured()) {
      console.warn(`Provider ${primary} and ${fallback} not configured, falling back to DeepSeek`);
      return deepseekProvider;
    }

    // Return primary even if not configured, let caller handle error
    return primaryProvider;
  }

  /**
   * Create custom provider instance
   */
  createProvider(config: ProviderConfig): AIProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config.apiKey);
      case 'deepseek':
        return new DeepSeekProvider(config.apiKey);
      case 'anthropic':
        return new AnthropicProvider(config.apiKey);
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): ProviderType[] {
    const configured: ProviderType[] = [];
    Array.from(this.providers.entries()).forEach(([type, provider]) => {
      if (provider.isConfigured()) {
        configured.push(type);
      }
    });
    return configured;
  }
}

// Singleton instance
export const providerFactory = new AIProviderFactory();

/**
 * Feature-specific provider selection
 * These can be overridden with environment variables
 */
export function getProviderForFeature(feature: string): AIProvider {
  const envVar = `${feature.toUpperCase()}_PROVIDER` as string;
  const providerType = (process.env[envVar] as ProviderType) || getDefaultProvider(feature);

  return providerFactory.getProviderWithFallback(providerType);
}

/**
 * Default provider selection per feature
 *
 * Strategy: Use Claude (Anthropic) for first impressions to WOW free users
 * - Superior teaching quality = higher conversion & word-of-mouth growth
 * - Fallback to OpenAI → DeepSeek if Anthropic unavailable
 */
function getDefaultProvider(feature: string): ProviderType {
  const defaults: Record<string, ProviderType> = {
    'chat': 'anthropic',             // ⭐ Claude's Socratic teaching impresses first-time users
    'mindmap': 'anthropic',          // ⭐ Superior structure & relationship detection
    'exam': 'anthropic',             // ⭐ Better quality questions = strong first impression
    'flashcards': 'deepseek',        // Cost-effective, good quality
    'podcast_script': 'deepseek',    // Cost-effective for script generation
    'podcast_tts': 'openai',         // OpenAI has best TTS
    'study_guide': 'deepseek',       // Cost-effective for long-form content
  };

  return defaults[feature] || 'openai';
}

// Re-export types
export * from './providers/base';
export { OpenAIProvider, DeepSeekProvider, AnthropicProvider };
