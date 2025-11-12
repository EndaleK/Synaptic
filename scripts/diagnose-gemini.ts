/**
 * Diagnostic script for Gemini API
 * Lists available models and checks API status
 * Usage: npx tsx scripts/diagnose-gemini.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

async function diagnoseGeminiAPI() {
  console.log('🔍 Gemini API Diagnostics\n');
  console.log('=' .repeat(60));

  // Check 1: Environment variable
  console.log('\n1️⃣ Checking environment variable...');
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

  // Check 2: API key format
  console.log('\n2️⃣ Validating API key format...');

  if (!apiKey.startsWith('AIzaSy')) {
    console.log('⚠️  API key doesn\'t start with expected prefix "AIzaSy"');
    console.log('   This might not be a valid Google AI API key');
  } else {
    console.log('✅ API key format looks correct');
  }

  if (apiKey.length < 30 || apiKey.length > 50) {
    console.log('⚠️  API key length seems unusual');
    console.log(`   Expected: 30-50 characters, Got: ${apiKey.length}`);
  } else {
    console.log('✅ API key length looks reasonable');
  }

  // Check 3: List available models
  console.log('\n3️⃣ Listing available models...');
  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to list models using the REST API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      console.log(`❌ Failed to list models: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);

      if (response.status === 400 || response.status === 403) {
        console.log('\n📝 Common causes:');
        console.log('   1. Invalid API key');
        console.log('   2. API key doesn\'t have Generative Language API enabled');
        console.log('   3. Billing not set up for the project');
        console.log('\n💡 Solution:');
        console.log('   1. Go to https://aistudio.google.com/app/apikey');
        console.log('   2. Create a new API key');
        console.log('   3. Ensure "Generative Language API" is enabled');
        console.log('   4. Update .env.local with the new key');
      }
      return;
    }

    const data = await response.json();

    if (data.models && data.models.length > 0) {
      console.log('✅ Successfully retrieved models list:');
      console.log(`   Total models: ${data.models.length}\n`);

      // Find Gemini models
      const geminiModels = data.models.filter((m: any) =>
        m.name.includes('gemini')
      );

      console.log('📋 Available Gemini Models:\n');
      geminiModels.forEach((model: any) => {
        const modelName = model.name.replace('models/', '');
        console.log(`   • ${modelName}`);
        console.log(`     Description: ${model.displayName || 'N/A'}`);
        console.log(`     Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        if (model.inputTokenLimit) {
          console.log(`     Input token limit: ${model.inputTokenLimit.toLocaleString()}`);
        }
        if (model.outputTokenLimit) {
          console.log(`     Output token limit: ${model.outputTokenLimit.toLocaleString()}`);
        }
        console.log('');
      });

      // Recommend the best model
      const pro2Model = geminiModels.find((m: any) => m.name.includes('gemini-2.0'));
      const pro15Model = geminiModels.find((m: any) => m.name.includes('gemini-1.5-pro'));
      const flashModel = geminiModels.find((m: any) => m.name.includes('gemini-1.5-flash'));

      console.log('💡 Recommendations:');
      if (pro2Model) {
        const modelName = pro2Model.name.replace('models/', '');
        console.log(`   ✨ Use "${modelName}" - Latest and most capable`);
      } else if (pro15Model) {
        const modelName = pro15Model.name.replace('models/', '');
        console.log(`   ✨ Use "${modelName}" - Best for large documents`);
      } else if (flashModel) {
        const modelName = flashModel.name.replace('models/', '');
        console.log(`   ✨ Use "${modelName}" - Fast and cost-effective`);
      }

    } else {
      console.log('⚠️  No models found in the response');
      console.log('   Response:', JSON.stringify(data, null, 2));
    }

  } catch (error: any) {
    console.log('❌ Error listing models:', error.message);
    console.log('\n📝 Check:');
    console.log('   - Internet connection');
    console.log('   - Firewall/proxy settings');
    console.log('   - API key validity');
  }

  // Check 4: Test a simple request with the most likely correct model
  console.log('\n4️⃣ Testing simple request...');
  console.log('   Attempting with different model names...\n');

  const modelsToTry = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`   Trying: ${modelName}...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent('Say "test successful"');
      const response = await result.response;
      const text = response.text();

      console.log(`   ✅ SUCCESS with "${modelName}"`);
      console.log(`   Response: ${text}\n`);

      console.log('💡 Update lib/gemini.ts to use this model:');
      console.log(`   model: '${modelName}'`);
      break;
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message.substring(0, 100)}...`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📚 Resources:');
  console.log('   - Get API keys: https://aistudio.google.com/app/apikey');
  console.log('   - Model docs: https://ai.google.dev/models/gemini');
  console.log('   - API docs: https://ai.google.dev/api');
}

// Run diagnostics
diagnoseGeminiAPI().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
