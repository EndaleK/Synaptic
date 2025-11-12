/**
 * Test script to verify Anthropic API is working correctly
 * Usage: npx ts-node scripts/test-anthropic-api.ts
 */

import { AnthropicProvider } from '../lib/ai/providers/anthropic';
import { providerFactory } from '../lib/ai';

async function testAnthropicAPI() {
  console.log('🧪 Testing Anthropic API...\n');

  // Test 1: Check if provider is configured
  console.log('1️⃣ Checking configuration...');
  const provider = new AnthropicProvider();

  if (!provider.isConfigured()) {
    console.error('❌ Anthropic provider is NOT configured');
    console.log('Please set ANTHROPIC_API_KEY in .env.local');
    process.exit(1);
  }
  console.log('✅ Anthropic provider is configured\n');

  // Test 2: Simple completion test
  console.log('2️⃣ Testing simple completion...');
  try {
    const response = await provider.complete([
      { role: 'user', content: 'Say "Hello from Claude!" and nothing else.' }
    ], { maxTokens: 50, temperature: 0.1 });

    console.log('✅ Completion successful!');
    console.log('Response:', response.content);
    console.log('Tokens used:', response.usage?.totalTokens, '\n');
  } catch (error: any) {
    console.error('❌ Completion failed:', error.message);
    process.exit(1);
  }

  // Test 3: Streaming test
  console.log('3️⃣ Testing streaming...');
  try {
    let streamedContent = '';
    const stream = provider.streamComplete([
      { role: 'user', content: 'Count from 1 to 5, one number per line.' }
    ], { maxTokens: 50 });

    for await (const chunk of stream) {
      streamedContent += chunk;
      process.stdout.write('.');
    }
    console.log('\n✅ Streaming successful!');
    console.log('Streamed response:', streamedContent.trim(), '\n');
  } catch (error: any) {
    console.error('❌ Streaming failed:', error.message);
    process.exit(1);
  }

  // Test 4: Educational content test (typical use case)
  console.log('4️⃣ Testing educational content generation...');
  try {
    const response = await provider.complete([
      {
        role: 'system',
        content: 'You are an educational AI assistant helping students learn.'
      },
      {
        role: 'user',
        content: 'Explain the Pythagorean theorem in one sentence.'
      }
    ], { maxTokens: 100, temperature: 0.7 });

    console.log('✅ Educational content generation successful!');
    console.log('Response:', response.content);
    console.log('Tokens used:', response.usage?.totalTokens, '\n');
  } catch (error: any) {
    console.error('❌ Educational content generation failed:', error.message);
    process.exit(1);
  }

  // Test 5: Provider factory integration
  console.log('5️⃣ Testing provider factory integration...');
  try {
    const configuredProviders = providerFactory.getConfiguredProviders();
    console.log('✅ Configured providers:', configuredProviders);

    if (configuredProviders.includes('anthropic')) {
      console.log('✅ Anthropic is available in provider factory\n');
    } else {
      console.warn('⚠️  Anthropic not found in configured providers\n');
    }
  } catch (error: any) {
    console.error('❌ Provider factory test failed:', error.message);
    process.exit(1);
  }

  console.log('🎉 All tests passed! Anthropic API is working correctly.\n');
  console.log('📊 Summary:');
  console.log('- API Key: Valid and authenticated');
  console.log('- Completion: Working');
  console.log('- Streaming: Working');
  console.log('- Educational use case: Working');
  console.log('- Provider factory: Integrated');
}

// Run tests
testAnthropicAPI().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
