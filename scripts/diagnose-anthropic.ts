/**
 * Diagnostic script for Anthropic API issues
 * Usage: npx tsx scripts/diagnose-anthropic.ts
 */

async function diagnoseAnthropicAPI() {
  console.log('🔍 Anthropic API Diagnostics\n');
  console.log('=' .repeat(60));

  // Check 1: Environment variable
  console.log('\n1️⃣ Checking environment variable...');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('❌ ANTHROPIC_API_KEY not found in environment');
    console.log('\n📝 Fix: Add to .env.local:');
    console.log('   ANTHROPIC_API_KEY=sk-ant-api03-...');
    return;
  }

  console.log('✅ ANTHROPIC_API_KEY found');
  console.log(`   Length: ${apiKey.length} characters`);
  console.log(`   Prefix: ${apiKey.substring(0, 15)}...`);

  // Check 2: API key format
  console.log('\n2️⃣ Validating API key format...');

  const validPrefixes = ['sk-ant-api03-'];
  const hasValidPrefix = validPrefixes.some(prefix => apiKey.startsWith(prefix));

  if (!hasValidPrefix) {
    console.log('⚠️  API key doesn\'t start with expected prefix');
    console.log(`   Expected: ${validPrefixes.join(' or ')}`);
    console.log(`   Got: ${apiKey.substring(0, 15)}...`);
    console.log('\n📝 Note: This might still work if Anthropic changed their key format');
  } else {
    console.log('✅ API key format looks correct');
  }

  // Check 3: API key length
  if (apiKey.length < 50) {
    console.log('⚠️  API key seems too short (< 50 characters)');
    console.log('   This might indicate an incomplete key');
  } else if (apiKey.length > 200) {
    console.log('⚠️  API key seems too long (> 200 characters)');
    console.log('   Check for extra whitespace or characters');
  } else {
    console.log('✅ API key length looks reasonable');
  }

  // Check 4: Test API connection
  console.log('\n3️⃣ Testing API connection...');
  console.log('   Making request to Anthropic API...');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Hi' }
        ],
      }),
    });

    if (response.ok) {
      console.log('✅ API connection successful!');
      const data = await response.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API connection failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);

      if (response.status === 401) {
        console.log('\n📝 Common causes of 401 errors:');
        console.log('   1. Invalid or expired API key');
        console.log('   2. API key copied incorrectly (extra spaces, missing characters)');
        console.log('   3. Using test key in production or vice versa');
        console.log('\n💡 Solution:');
        console.log('   1. Go to https://console.anthropic.com/settings/keys');
        console.log('   2. Create a new API key');
        console.log('   3. Copy it carefully (no extra spaces!)');
        console.log('   4. Update .env.local with the new key');
        console.log('   5. Restart your dev server (npm run dev)');
      }
    }
  } catch (error: any) {
    console.log('❌ Network error:', error.message);
    console.log('\n📝 Check:');
    console.log('   - Internet connection');
    console.log('   - Firewall/proxy settings');
    console.log('   - VPN configuration');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📚 Resources:');
  console.log('   - Get API keys: https://console.anthropic.com/settings/keys');
  console.log('   - API docs: https://docs.anthropic.com/');
  console.log('   - Model info: https://docs.anthropic.com/en/docs/about-claude/models');
}

// Run diagnostics
diagnoseAnthropicAPI().catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
