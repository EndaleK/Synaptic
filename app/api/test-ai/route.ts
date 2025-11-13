import { NextResponse } from 'next/server'
import { getProviderForFeature } from '@/lib/ai'

export async function GET() {
  try {
    // Test if AI provider is configured
    const provider = getProviderForFeature('chat')

    if (!provider.isConfigured()) {
      return NextResponse.json({
        status: 'error',
        message: 'No AI provider configured',
        help: 'Add OPENAI_API_KEY or DEEPSEEK_API_KEY to your .env.local file'
      }, { status: 500 })
    }

    // Try a simple completion
    const completion = await provider.complete([
      {
        role: 'user',
        content: 'Say "Hello, AI is working!" if you can read this.'
      }
    ], {
      temperature: 0.7,
      maxTokens: 50
    })

    return NextResponse.json({
      status: 'success',
      message: 'AI provider is working!',
      provider: provider.name,
      response: completion.content,
      usage: completion.usage
    })

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Unknown error',
      provider: error.provider || 'unknown',
      details: error.response?.data || error.toString()
    }, { status: 500 })
  }
}
