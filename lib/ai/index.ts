import type { AIProvider, ProviderType, ProviderConfig } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { DeepSeekProvider } from './providers/deepseek';
import { AnthropicProvider, ANTHROPIC_MODELS } from './providers/anthropic';

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
 * Get the appropriate Anthropic model for a given feature
 *
 * Model selection strategy:
 * - Haiku: Fast, real-time responses (chat, study buddy) - $1/$5 per MTok
 * - Sonnet: Balanced quality for structured output (flashcards, mind maps, exams) - $3/$15 per MTok
 * - Opus: Maximum intelligence for complex tasks (reserved for future use) - $5/$25 per MTok
 */
export function getAnthropicModelForFeature(feature: string): string {
  const modelMap: Record<string, string> = {
    // Real-time conversational features → Haiku (fast, cost-effective)
    'chat': ANTHROPIC_MODELS.HAIKU,
    'study_buddy': ANTHROPIC_MODELS.HAIKU,

    // Quality-focused generation features → Sonnet (balanced quality/cost)
    'mindmap': ANTHROPIC_MODELS.SONNET,
    'flashcards': ANTHROPIC_MODELS.SONNET,
    'exam': ANTHROPIC_MODELS.SONNET,
  };

  return modelMap[feature] || ANTHROPIC_MODELS.SONNET;
}

/**
 * Feature-specific provider selection
 * These can be overridden with environment variables
 *
 * For Anthropic features, also selects the appropriate model (Haiku vs Sonnet)
 */
export function getProviderForFeature(feature: string): AIProvider {
  const envVar = `${feature.toUpperCase()}_PROVIDER` as string;
  const providerType = (process.env[envVar] as ProviderType) || getDefaultProvider(feature);

  // For Anthropic, create provider with feature-specific model
  if (providerType === 'anthropic') {
    const model = getAnthropicModelForFeature(feature);
    const provider = new AnthropicProvider(undefined, model);

    // Check if configured, fallback if not
    if (provider.isConfigured()) {
      return provider;
    }

    // Fallback chain: OpenAI → DeepSeek
    console.warn(`Anthropic not configured for ${feature}, attempting fallback...`);
    const openai = providerFactory.getProvider('openai');
    if (openai.isConfigured()) {
      return openai;
    }

    const deepseek = providerFactory.getProvider('deepseek');
    if (deepseek.isConfigured()) {
      return deepseek;
    }

    return provider; // Return unconfigured provider, let caller handle error
  }

  return providerFactory.getProviderWithFallback(providerType);
}

/**
 * Default provider selection per feature
 *
 * Strategy (December 2025 Update):
 * - Chat & Study Buddy: Anthropic Haiku 4.5 (fast, quality responses)
 * - Mind Map, Flashcards, Exams: Anthropic Sonnet 4.5 (superior structured output)
 * - Podcast & Study Guide: DeepSeek (cost-effective for long-form content)
 * - TTS: OpenAI (best audio quality)
 *
 * Fallback chain: Primary → OpenAI → DeepSeek
 */
function getDefaultProvider(feature: string): ProviderType {
  const defaults: Record<string, ProviderType> = {
    'chat': 'anthropic',             // ⭐ Haiku 4.5 - fast, quality chat responses
    'study_buddy': 'anthropic',      // ⭐ Haiku 4.5 - real-time assistant
    'mindmap': 'anthropic',          // ⭐ Sonnet 4.5 - excels at complex JSON structures
    'exam': 'anthropic',             // ⭐ Sonnet 4.5 - quality questions = strong first impression
    'flashcards': 'anthropic',       // ⭐ Sonnet 4.5 - superior card quality
    'podcast_script': 'deepseek',    // Cost-effective for script generation
    'podcast_tts': 'openai',         // OpenAI has best TTS
    'study_guide': 'deepseek',       // Cost-effective for long-form content
    'chapter_extraction': 'deepseek', // Cost-effective for chapter/section detection
  };

  return defaults[feature] || 'anthropic';
}

// Re-export types and providers
export * from './providers/base';
export { OpenAIProvider, DeepSeekProvider, AnthropicProvider };
export { ANTHROPIC_MODELS } from './providers/anthropic';
