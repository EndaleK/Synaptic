/**
 * Test Script: Anthropic API Key Health Check
 *
 * Verifies the Anthropic API key is valid and working
 */

import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'

// Force override environment variables to ensure we get the latest from .env.local
dotenv.config({ path: '.env.local', override: true })

async function testAnthropicAPIKey() {
  console.log('🔍 Testing Anthropic API Key...\n')
  console.log('='.repeat(60))

  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not found in .env.local')
      process.exit(1)
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...${apiKey.slice(-10)}`)

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    console.log('\n📡 Sending test request to Anthropic API...')

    // Make a minimal test request
    const startTime = Date.now()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Hi',
        },
      ],
    })
    const duration = Date.now() - startTime

    console.log(`✅ API Response received in ${duration}ms`)
    console.log('\n📊 Response Details:')
    console.log(`   Model: ${message.model}`)
    console.log(`   Role: ${message.role}`)
    console.log(`   Stop Reason: ${message.stop_reason}`)
    console.log(`   Input Tokens: ${message.usage.input_tokens}`)
    console.log(`   Output Tokens: ${message.usage.output_tokens}`)

    if (message.content && message.content.length > 0 && message.content[0].type === 'text') {
      console.log(`   Response: "${message.content[0].text}"`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Anthropic API Key is HEALTHY and WORKING!')
    console.log('='.repeat(60))
    console.log('\n✨ Your Anthropic integration is ready for production!\n')

  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ API Test FAILED!')
    console.error('='.repeat(60))

    if (error.status === 401) {
      console.error('\n🔑 Error: Invalid API Key')
      console.error('   The API key is not valid or has been revoked.')
      console.error('   Please check your Anthropic Console: https://console.anthropic.com/')
    } else if (error.status === 429) {
      console.error('\n⚠️  Error: Rate Limit Exceeded')
      console.error('   Your API key has hit rate limits.')
      console.error('   Check your usage at: https://console.anthropic.com/settings/billing')
    } else if (error.status === 403) {
      console.error('\n🚫 Error: Access Denied')
      console.error('   Your API key does not have access to the requested model.')
    } else {
      console.error('\n💥 Error:', error.message)
      console.error('   Status:', error.status || 'unknown')
      console.error('   Type:', error.type || 'unknown')
    }

    console.error('\n📋 Troubleshooting:')
    console.error('  1. Verify API key at: https://console.anthropic.com/settings/keys')
    console.error('  2. Check billing status: https://console.anthropic.com/settings/billing')
    console.error('  3. Ensure API key has not been revoked')
    console.error('  4. Check for any service outages: https://status.anthropic.com\n')

    process.exit(1)
  }
}

testAnthropicAPIKey()
