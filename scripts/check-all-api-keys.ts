/**
 * Comprehensive API key verification script
 * Tests all AI provider API keys
 * Usage: npx tsx scripts/check-all-api-keys.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

async function checkAllAPIKeys() {
  console.log('🔍 Checking All AI API Keys\n');
  console.log('='.repeat(70));

  const results: Array<{
    provider: string;
    status: 'valid' | 'invalid' | 'missing';
    details: string;
  }> = [];

  // 1. Check OpenAI
  console.log('\n1️⃣ OpenAI API');
  console.log('-'.repeat(70));
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.log('❌ OPENAI_API_KEY not found in environment');
    results.push({ provider: 'OpenAI', status: 'missing', details: 'Not configured' });
  } else {
    console.log(`✅ Key found: ${openaiKey.substring(0, 10)}...`);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ VALID - Access to ${data.data.length} models`);
        results.push({ provider: 'OpenAI', status: 'valid', details: `${data.data.length} models available` });
      } else {
        const errorText = await response.text();
        console.log(`❌ INVALID - ${response.status}: ${errorText.substring(0, 100)}`);
        results.push({ provider: 'OpenAI', status: 'invalid', details: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      console.log(`❌ ERROR - ${error.message}`);
      results.push({ provider: 'OpenAI', status: 'invalid', details: error.message });
    }
  }

  // 2. Check DeepSeek
  console.log('\n2️⃣ DeepSeek API');
  console.log('-'.repeat(70));
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!deepseekKey) {
    console.log('❌ DEEPSEEK_API_KEY not found in environment');
    results.push({ provider: 'DeepSeek', status: 'missing', details: 'Not configured' });
  } else {
    console.log(`✅ Key found: ${deepseekKey.substring(0, 10)}...`);
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${deepseekKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ VALID - Access to ${data.data?.length || 0} models`);
        results.push({ provider: 'DeepSeek', status: 'valid', details: `${data.data?.length || 0} models available` });
      } else {
        const errorText = await response.text();
        console.log(`❌ INVALID - ${response.status}: ${errorText.substring(0, 100)}`);
        results.push({ provider: 'DeepSeek', status: 'invalid', details: `HTTP ${response.status}` });
      }
    } catch (error: any) {
      console.log(`❌ ERROR - ${error.message}`);
      results.push({ provider: 'DeepSeek', status: 'invalid', details: error.message });
    }
  }

  // 3. Check Anthropic
  console.log('\n3️⃣ Anthropic API');
  console.log('-'.repeat(70));
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    console.log('❌ ANTHROPIC_API_KEY not found in environment');
    results.push({ provider: 'Anthropic', status: 'missing', details: 'Not configured' });
  } else {
    console.log(`✅ Key found: ${anthropicKey.substring(0, 15)}...`);
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      console.log(`✅ VALID - Successfully created message`);
      console.log(`   Model: claude-sonnet-4-20250514`);
      console.log(`   Tokens: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);
      results.push({
        provider: 'Anthropic',
        status: 'valid',
        details: `claude-sonnet-4 working`
      });
    } catch (error: any) {
      console.log(`❌ INVALID - ${error.message || error}`);

      if (error.status === 401) {
        console.log('   Issue: Invalid or expired API key');
        console.log('   Fix: Get new key from https://console.anthropic.com/settings/keys');
      }

      results.push({
        provider: 'Anthropic',
        status: 'invalid',
        details: error.message?.substring(0, 50) || 'Authentication failed'
      });
    }
  }

  // 4. Check Gemini
  console.log('\n4️⃣ Gemini API');
  console.log('-'.repeat(70));
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment');
    results.push({ provider: 'Gemini', status: 'missing', details: 'Not configured' });
  } else {
    console.log(`✅ Key found: ${geminiKey.substring(0, 10)}...`);
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await model.generateContent('Hi');
      const response = await result.response;
      const text = response.text();

      console.log(`✅ VALID - Successfully generated content`);
      console.log(`   Model: gemini-2.5-pro`);
      console.log(`   Response: ${text.substring(0, 50)}...`);
      results.push({
        provider: 'Gemini',
        status: 'valid',
        details: 'gemini-2.5-pro working'
      });
    } catch (error: any) {
      console.log(`❌ INVALID - ${error.message || error}`);

      if (error.message?.includes('API key')) {
        console.log('   Issue: Invalid API key');
        console.log('   Fix: Get new key from https://aistudio.google.com/app/apikey');
      }

      results.push({
        provider: 'Gemini',
        status: 'invalid',
        details: error.message?.substring(0, 50) || 'Authentication failed'
      });
    }
  }

  // 5. Check LemonFox (TTS)
  console.log('\n5️⃣ LemonFox API (TTS)');
  console.log('-'.repeat(70));
  const lemonfoxKey = process.env.LEMONFOX_API_KEY;

  if (!lemonfoxKey) {
    console.log('⚠️  LEMONFOX_API_KEY not found (optional for podcast TTS)');
    results.push({ provider: 'LemonFox', status: 'missing', details: 'Optional - not configured' });
  } else {
    console.log(`✅ Key found: ${lemonfoxKey.substring(0, 10)}...`);
    console.log('ℹ️  Cannot verify without making TTS request (costs money)');
    results.push({ provider: 'LemonFox', status: 'valid', details: 'Configured (not tested)' });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Summary Report\n');

  console.log('┌────────────────┬──────────┬─────────────────────────────────┐');
  console.log('│ Provider       │ Status   │ Details                         │');
  console.log('├────────────────┼──────────┼─────────────────────────────────┤');

  results.forEach(({ provider, status, details }) => {
    const statusIcon = status === 'valid' ? '✅ Valid' : status === 'missing' ? '⚠️  Missing' : '❌ Invalid';
    const paddedProvider = provider.padEnd(14);
    const paddedStatus = statusIcon.padEnd(8);
    const paddedDetails = details.substring(0, 29).padEnd(31);
    console.log(`│ ${paddedProvider} │ ${paddedStatus} │ ${paddedDetails} │`);
  });

  console.log('└────────────────┴──────────┴─────────────────────────────────┘');

  // Recommendations
  console.log('\n💡 Recommendations:\n');

  const validCount = results.filter(r => r.status === 'valid').length;
  const invalidCount = results.filter(r => r.status === 'invalid').length;
  const missingCount = results.filter(r => r.status === 'missing').length;

  if (invalidCount > 0) {
    console.log('⚠️  Action Required:');
    results
      .filter(r => r.status === 'invalid')
      .forEach(({ provider }) => {
        if (provider === 'Anthropic') {
          console.log(`   - ${provider}: Get new key from https://console.anthropic.com/settings/keys`);
        } else if (provider === 'Gemini') {
          console.log(`   - ${provider}: Get new key from https://aistudio.google.com/app/apikey`);
        } else if (provider === 'OpenAI') {
          console.log(`   - ${provider}: Get new key from https://platform.openai.com/api-keys`);
        } else if (provider === 'DeepSeek') {
          console.log(`   - ${provider}: Get new key from https://platform.deepseek.com/api_keys`);
        }
      });
    console.log('');
  }

  if (missingCount > 0 && missingCount < 4) {
    console.log('ℹ️  Optional:');
    results
      .filter(r => r.status === 'missing' && r.provider !== 'LemonFox')
      .forEach(({ provider }) => {
        console.log(`   - ${provider}: Configure for additional AI provider options`);
      });
    console.log('');
  }

  if (validCount >= 2) {
    console.log('✅ System Status: Operational');
    console.log(`   You have ${validCount} working AI provider(s) - sufficient for all features`);
  } else if (validCount === 1) {
    console.log('⚠️  System Status: Limited');
    console.log('   Only 1 AI provider working - consider adding more for redundancy');
  } else {
    console.log('❌ System Status: Critical');
    console.log('   No working AI providers - app features will not work');
  }

  console.log('\n' + '='.repeat(70));
}

checkAllAPIKeys().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
