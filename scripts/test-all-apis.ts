/**
 * Test All API Keys Health Check
 *
 * Tests OpenAI, DeepSeek, and Anthropic API keys
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local', override: true })

async function testOpenAI() {
  console.log('\n🔍 Testing OpenAI API Key...')
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('   ⚠️  OPENAI_API_KEY not configured')
      return false
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    })

    console.log('   ✅ OpenAI API: HEALTHY')
    console.log(`   Response: "${completion.choices[0].message.content}"`)
    return true
  } catch (error: any) {
    console.log(`   ❌ OpenAI API: FAILED - ${error.message}`)
    return false
  }
}

async function testDeepSeek() {
  console.log('\n🔍 Testing DeepSeek API Key...')
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('   ⚠️  DEEPSEEK_API_KEY not configured')
      return false
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ DeepSeek API: HEALTHY')
      console.log(`   Response: "${data.choices[0].message.content}"`)
      return true
    } else {
      const error = await response.text()
      console.log(`   ❌ DeepSeek API: FAILED - ${response.status} ${error}`)
      return false
    }
  } catch (error: any) {
    console.log(`   ❌ DeepSeek API: FAILED - ${error.message}`)
    return false
  }
}

async function testAnthropic() {
  console.log('\n🔍 Testing Anthropic API Key...')
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('   ⚠️  ANTHROPIC_API_KEY not configured')
      return false
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Hi' }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('   ✅ Anthropic API: HEALTHY')
    console.log(`   Response: "${responseText}"`)
    return true
  } catch (error: any) {
    console.log(`   ❌ Anthropic API: FAILED - ${error.message}`)
    return false
  }
}

async function testAllAPIs() {
  console.log('='.repeat(60))
  console.log('🧪 API Health Check - All Providers')
  console.log('='.repeat(60))

  const results = {
    openai: await testOpenAI(),
    deepseek: await testDeepSeek(),
    anthropic: await testAnthropic(),
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))
  console.log(`OpenAI:    ${results.openai ? '✅ HEALTHY' : '❌ FAILED'}`)
  console.log(`DeepSeek:  ${results.deepseek ? '✅ HEALTHY' : '❌ FAILED'}`)
  console.log(`Anthropic: ${results.anthropic ? '✅ HEALTHY' : '❌ FAILED'}`)
  console.log('='.repeat(60))

  const healthyCount = Object.values(results).filter(Boolean).length
  console.log(`\n${healthyCount}/3 API keys are working`)

  if (results.openai && results.deepseek && results.anthropic) {
    console.log('\n🎉 ALL API KEYS WORKING! Your app is 100% ready for launch!\n')
    process.exit(0)
  } else if (results.openai && results.deepseek) {
    console.log('\n✨ Your app will work! OpenAI + DeepSeek cover all features.')
    console.log('⚠️  Fix Anthropic key for complex mind maps (optional)\n')
    process.exit(0)
  } else {
    console.log('\n⚠️  Critical: Fix API keys before launching!\n')
    process.exit(1)
  }
}

testAllAPIs()
