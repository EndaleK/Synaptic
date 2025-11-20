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
   * Get provider with fallback
   * Tries primary provider, falls back to secondary if not configured
   * Returns fallback provider even if unconfigured (let caller handle check)
   */
  getProviderWithFallback(
    primary: ProviderType,
    fallback: ProviderType = 'openai'
  ): AIProvider {
    const primaryProvider = this.getProvider(primary);
    if (primaryProvider.isConfigured()) {
      return primaryProvider;
    }

    const fallbackProvider = this.getProvider(fallback);
    if (fallbackProvider.isConfigured()) {
      console.warn(`Provider ${primary} not configured, falling back to ${fallback}`);
    }

    // Return fallback provider even if not configured, let caller handle error
    return fallbackProvider;
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
 */
function getDefaultProvider(feature: string): ProviderType {
  const defaults: Record<string, ProviderType> = {
    'mindmap': 'openai',             // CHANGED: OpenAI generates reliable edges for mind maps (DeepSeek produces 0 edges)
    'podcast_script': 'deepseek',    // Cost-effective for script generation
    'podcast_tts': 'openai',         // OpenAI has best TTS
    'flashcards': 'deepseek',        // 60-70% cheaper than OpenAI
    'chat': 'deepseek',              // 60-70% cheaper than OpenAI
    'exam': 'deepseek',              // Cost-effective for exam generation
  };

  return defaults[feature] || 'openai';
}

// Re-export types
export * from './providers/base';
export { OpenAIProvider, DeepSeekProvider, AnthropicProvider };
