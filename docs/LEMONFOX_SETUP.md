# Lemonfox.ai TTS Setup Guide

## Overview
The podcast generation feature uses **Lemonfox.ai** as the primary TTS (Text-to-Speech) provider with OpenAI as a fallback. Lemonfox offers **83% cost savings** compared to OpenAI TTS.

### Cost Comparison
- **Lemonfox.ai**: $2.50 per 1M characters
- **OpenAI TTS**: $15.00 per 1M characters
- **Savings**: 83% cheaper

## Setup Instructions

### 1. Get Your Lemonfox API Key

1. Visit [Lemonfox.ai](https://lemonfox.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Generate a new API key

### 2. Add to Environment Variables

#### Local Development (.env.local)
```bash
# Lemonfox.ai TTS (Primary provider - 83% cheaper than OpenAI)
# Supports 8 languages: en-us, en-gb, ja, zh, es, fr, hi, it, pt-br
# 50+ natural-sounding voices available
LEMONFOX_API_KEY=your_lemonfox_api_key_here

# OpenAI TTS (Fallback provider)
OPENAI_API_KEY=your_openai_api_key_here
```

#### Vercel Deployment
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `LEMONFOX_API_KEY` with your API key
4. Ensure `OPENAI_API_KEY` is also configured as fallback
5. Redeploy your application

### 3. Verify Configuration

The TTS system will automatically:
1. Try Lemonfox.ai first (if `LEMONFOX_API_KEY` is set)
2. Fall back to OpenAI if Lemonfox fails
3. Log which provider is being used in the console

#### Expected Console Output
```
[TTS] Trying Lemonfox.ai for host_a...
[TTS] ✓ Lemonfox.ai succeeded for host_a
```

## How It Works

### Provider Selection Logic
```typescript
// In lib/tts-generator.ts
export async function generateSpeechForLine(line, language) {
  // Try Lemonfox first (cheaper)
  if (process.env.LEMONFOX_API_KEY) {
    try {
      return await generateSpeechWithLemonfox(...)
    } catch (error) {
      // Fall back to OpenAI
      return await generateSpeechWithOpenAI(...)
    }
  }

  // No Lemonfox key, use OpenAI directly
  return await generateSpeechWithOpenAI(...)
}
```

### Voice Mapping
Both providers support the same voice names:
- **Host A (Alex)**: `alloy` - Warm, balanced male voice
- **Host B (Jordan)**: `nova` - Friendly, engaging female voice

## Supported Languages

Lemonfox.ai supports 8 languages with natural-sounding voices:
- `en-us` - English (US)
- `en-gb` - English (UK)
- `ja` - Japanese
- `zh` - Chinese
- `es` - Spanish
- `fr` - French
- `hi` - Hindi
- `it` - Italian
- `pt-br` - Portuguese (Brazilian)

## Troubleshooting

### Issue: "Lemonfox API error (401)"
**Solution**: Check that your API key is correctly set in environment variables

### Issue: "Failed to generate speech"
**Solution**: Ensure at least one provider (Lemonfox or OpenAI) has a valid API key configured

### Issue: Podcast generation times out
**Solution**:
- Check Vercel function timeout limits (max 300 seconds for hobby plan)
- Reduce document size or target podcast duration
- Verify API keys are configured correctly

### Issue: "Unexpected end of JSON input" on deployed version
**Causes**:
1. Missing `LEMONFOX_API_KEY` in Vercel environment variables
2. Missing `OPENAI_API_KEY` fallback in Vercel
3. Database user_id mapping issue (should be fixed in commit 5b58a21)

**Solution**:
1. Add `LEMONFOX_API_KEY` to Vercel project settings
2. Ensure `OPENAI_API_KEY` is also configured
3. Redeploy the application
4. Check Vercel logs for specific error messages

## Monitoring Usage

The system tracks which provider is used for each segment:
```javascript
// Console output at end of generation
Provider usage: { lemonfox: 28, openai: 2 }
```

This helps you:
- Monitor cost savings
- Identify provider reliability issues
- Track fallback frequency

## Cost Estimation

For a typical 10-minute podcast (~1500 words):
- **Characters**: ~7,500
- **Lemonfox cost**: $0.01875
- **OpenAI cost**: $0.1125
- **You save**: $0.09375 (83%)

For 1000 podcasts:
- **Lemonfox cost**: $18.75
- **OpenAI cost**: $112.50
- **Total savings**: $93.75

## API Rate Limits

- **Lemonfox.ai**: Check their documentation for current limits
- **OpenAI TTS**: 50 requests per minute

The system includes a 200ms delay between segments to avoid rate limiting.
