import { NextResponse } from 'next/server'

export async function GET() {
  const hasGemini = !!process.env.GEMINI_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasChroma = !!process.env.CHROMA_URL

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    gemini_configured: hasGemini,
    gemini_key_prefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
    openai_configured: hasOpenAI,
    chroma_configured: hasChroma,
    chroma_url: process.env.CHROMA_URL || 'not set'
  })
}
