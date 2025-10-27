// Quick test for mind map generation API
// Run with: node test-mindmap-api.js

const testText = `
The Water Cycle
Water constantly moves through Earth's systems in a process called the water cycle.

Evaporation: Water from oceans, lakes, and rivers turns into water vapor due to heat from the sun.
Condensation: Water vapor cools and forms clouds in the atmosphere.
Precipitation: Water falls back to Earth as rain, snow, or hail.
Collection: Water collects in bodies of water and the cycle begins again.
`;

console.log('Testing DeepSeek API connection...\n');

async function testMindMapGeneration() {
  try {
    const { DeepSeekProvider } = await import('./lib/ai/providers/deepseek.ts');
    const provider = new DeepSeekProvider();

    if (!provider.isConfigured()) {
      console.error('❌ DeepSeek API key not configured!');
      console.log('Please check your .env.local file has: DEEPSEEK_API_KEY=...');
      return;
    }

    console.log('✅ DeepSeek provider configured');
    console.log('🔄 Testing simple completion...\n');

    const response = await provider.complete(
      [
        { role: 'user', content: 'Say "Hello from DeepSeek!" in exactly those words.' }
      ],
      { temperature: 0, maxTokens: 50 }
    );

    console.log('Response:', response.content);
    console.log('\n✅ DeepSeek API is working!');
    console.log('Tokens used:', response.usage);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testMindMapGeneration();
