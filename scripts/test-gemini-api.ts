/**
 * Test script to verify Gemini API is working correctly
 * Usage: npx tsx scripts/test-gemini-api.ts
 */

import { generateGeminiCompletion, generateFlashcardsWithGemini, chatWithGemini } from '../lib/gemini';

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API...\n');
  console.log('='.repeat(60));

  // Test 1: Check if API key is configured
  console.log('\n1️⃣ Checking configuration...');
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment');
    console.log('\n📝 Fix: Add to .env.local:');
    console.log('   GEMINI_API_KEY=AIzaSy...');
    return;
  }

  console.log('✅ GEMINI_API_KEY found');
  console.log(`   Length: ${apiKey.length} characters`);
  console.log(`   Prefix: ${apiKey.substring(0, 10)}...`);

  // Test 2: Simple completion test
  console.log('\n2️⃣ Testing simple completion...');
  try {
    const response = await generateGeminiCompletion([
      { role: 'user', content: 'Say "Hello from Gemini!" and nothing else.' }
    ], { temperature: 0.1, maxTokens: 50 });

    console.log('✅ Completion successful!');
    console.log('Response:', response.content);
    console.log('Tokens used:', response.usage.totalTokens, '(estimated)');
    console.log('');
  } catch (error: any) {
    console.error('❌ Completion failed:', error.message);

    if (error.message.includes('API key')) {
      console.log('\n📝 API key is invalid. Please check:');
      console.log('   1. Go to https://aistudio.google.com/app/apikey');
      console.log('   2. Create a new API key');
      console.log('   3. Update .env.local with the new key');
      console.log('   4. Restart your dev server');
    }

    process.exit(1);
  }

  // Test 3: Educational content test
  console.log('3️⃣ Testing educational content generation...');
  try {
    const response = await generateGeminiCompletion([
      {
        role: 'user',
        content: 'Explain the Pythagorean theorem in exactly one sentence.'
      }
    ], { temperature: 0.7, maxTokens: 100 });

    console.log('✅ Educational content generation successful!');
    console.log('Response:', response.content);
    console.log('Tokens used:', response.usage.totalTokens, '(estimated)');
    console.log('');
  } catch (error: any) {
    console.error('❌ Educational content generation failed:', error.message);
    process.exit(1);
  }

  // Test 4: Flashcard generation test
  console.log('4️⃣ Testing flashcard generation...');
  try {
    const sampleText = `
      The Pythagorean theorem states that in a right triangle, the square of the hypotenuse
      (the side opposite the right angle) is equal to the sum of the squares of the other two sides.
      This can be written as: a² + b² = c², where c represents the length of the hypotenuse
      and a and b represent the lengths of the other two sides.

      A corollary is a statement that follows readily from a previous statement. In mathematics,
      a corollary is a theorem that can be deduced as a consequence of another theorem.
    `;

    const flashcards = await generateFlashcardsWithGemini(sampleText, 2);

    console.log('✅ Flashcard generation successful!');
    console.log(`Generated ${flashcards.length} flashcards:`);
    flashcards.forEach((card, i) => {
      console.log(`\n   Card ${i + 1}:`);
      console.log(`   Front: ${card.front}`);
      console.log(`   Back: ${card.back}`);
    });
    console.log('');
  } catch (error: any) {
    console.error('❌ Flashcard generation failed:', error.message);
    process.exit(1);
  }

  // Test 5: Chat test
  console.log('5️⃣ Testing chat functionality...');
  try {
    const documentContext = 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar.';
    const response = await chatWithGemini(
      documentContext,
      [],
      'What is photosynthesis?',
      'direct'
    );

    console.log('✅ Chat functionality successful!');
    console.log('Response:', response);
    console.log('');
  } catch (error: any) {
    console.error('❌ Chat functionality failed:', error.message);
    process.exit(1);
  }

  // Test 6: Context window test (large document simulation)
  console.log('6️⃣ Testing large context handling...');
  try {
    const largeText = 'This is a test sentence. '.repeat(1000); // ~25K chars
    const response = await generateGeminiCompletion([
      {
        role: 'user',
        content: `Summarize the following text in one sentence:\n\n${largeText}`
      }
    ], { temperature: 0.3, maxTokens: 100 });

    console.log('✅ Large context handling successful!');
    console.log('Input size:', largeText.length, 'characters');
    console.log('Response:', response.content.substring(0, 100) + '...');
    console.log('');
  } catch (error: any) {
    console.error('❌ Large context handling failed:', error.message);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('\n🎉 All tests passed! Gemini API is working correctly.\n');
  console.log('📊 Summary:');
  console.log('- API Key: Valid and authenticated');
  console.log('- Completion: Working');
  console.log('- Educational content: Working');
  console.log('- Flashcard generation: Working');
  console.log('- Chat functionality: Working');
  console.log('- Large context: Working (2M token window available)');
  console.log('\n💡 Gemini 1.5 Pro Features:');
  console.log('- Context window: 2M tokens (~8M characters)');
  console.log('- Best for: Very large textbooks and documents');
  console.log('- Cost: $7/M input, $21/M output');
}

// Run tests
testGeminiAPI().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
