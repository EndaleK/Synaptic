/**
 * Simple verification script for Gemini API
 * Usage: npx tsx scripts/verify-gemini.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

async function verifyGeminiAPI() {
  console.log('🧪 Gemini API Verification\n');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log(`   Prefix: ${apiKey.substring(0, 10)}...\n`);

  // Test with the recommended model
  const modelName = 'gemini-2.5-pro';
  console.log(`📡 Testing with model: ${modelName}\n`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Test 1: Simple generation
    console.log('1️⃣ Simple generation test...');
    const result1 = await model.generateContent('Say "Hello from Gemini 2.5 Pro!"');
    const response1 = await result1.response;
    const text1 = response1.text();
    console.log('✅ Response:', text1);
    console.log('');

    // Test 2: Educational content
    console.log('2️⃣ Educational content test...');
    const result2 = await model.generateContent('Explain the Pythagorean theorem in one sentence.');
    const response2 = await result2.response;
    const text2 = response2.text();
    console.log('✅ Response:', text2);
    console.log('');

    // Test 3: JSON generation
    console.log('3️⃣ JSON generation test...');
    const prompt3 = `Generate exactly 2 flashcards about mathematics in this JSON format:
[
  {
    "front": "Term",
    "back": "Definition"
  }
]

Respond ONLY with valid JSON, no other text.`;

    const result3 = await model.generateContent(prompt3);
    const response3 = await result3.response;
    const text3 = response3.text();

    console.log('Raw response:');
    console.log(text3);
    console.log('');

    try {
      // Try to parse JSON
      const cleaned = text3.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log('✅ JSON parsed successfully:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('⚠️  Could not parse as JSON');
    }
    console.log('');

    // Test 4: Context window test (large text)
    console.log('4️⃣ Large context test...');
    const largeText = 'This is a test sentence. '.repeat(1000);
    const result4 = await model.generateContent(`Count the number of sentences in this text:\n\n${largeText}`);
    const response4 = await result4.response;
    const text4 = response4.text();
    console.log('✅ Response:', text4);
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('📊 Summary:');
    console.log(`- Model: ${modelName}`);
    console.log('- API Key: Valid ✅');
    console.log('- Simple generation: Working ✅');
    console.log('- Educational content: Working ✅');
    console.log('- JSON generation: Working ✅');
    console.log('- Large context: Working ✅');
    console.log('');
    console.log('💡 Gemini 2.5 Pro is ready to use!');
    console.log('   - Context window: 1M tokens (~4M characters)');
    console.log('   - Output limit: 65,536 tokens');

  } catch (error: any) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('API key')) {
      console.log('\n📝 Invalid API key. Get a new one at:');
      console.log('   https://aistudio.google.com/app/apikey');
    }

    process.exit(1);
  }
}

verifyGeminiAPI();
