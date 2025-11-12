/**
 * Script to check API credits and status for all configured AI providers
 * Run with: npx tsx scripts/check-api-credits.ts
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface APIStatus {
  provider: string;
  configured: boolean;
  working: boolean;
  error?: string;
  details?: any;
}

async function checkOpenAI(): Promise<APIStatus> {
  const status: APIStatus = {
    provider: 'OpenAI',
    configured: !!process.env.OPENAI_API_KEY,
    working: false,
  };

  if (!status.configured) {
    status.error = 'API key not configured';
    return status;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Test with a minimal completion request
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OK"' }],
      max_tokens: 5,
    });

    status.working = true;
    status.details = {
      model: completion.model,
      usage: completion.usage,
    };
  } catch (error: any) {
    status.error = error.message;

    // Check for specific error types
    if (error.status === 401) {
      status.error = 'Invalid API key';
    } else if (error.status === 429) {
      status.error = 'Rate limit exceeded or quota exhausted';
    } else if (error.code === 'insufficient_quota') {
      status.error = 'QUOTA EXCEEDED - No credits remaining';
    }
  }

  return status;
}

async function checkDeepSeek(): Promise<APIStatus> {
  const status: APIStatus = {
    provider: 'DeepSeek',
    configured: !!process.env.DEEPSEEK_API_KEY,
    working: false,
  };

  if (!status.configured) {
    status.error = 'API key not configured';
    return status;
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      status.error = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401) {
        status.error = 'Invalid API key';
      } else if (response.status === 429) {
        status.error = 'Rate limit exceeded or quota exhausted';
      }
    } else {
      const data = await response.json();
      status.working = true;
      status.details = {
        model: data.model,
        usage: data.usage,
      };
    }
  } catch (error: any) {
    status.error = error.message;
  }

  return status;
}

async function checkAnthropic(): Promise<APIStatus> {
  const status: APIStatus = {
    provider: 'Anthropic',
    configured: !!process.env.ANTHROPIC_API_KEY,
    working: false,
  };

  if (!status.configured) {
    status.error = 'API key not configured';
    return status;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const completion = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Say "OK"' }],
    });

    status.working = true;
    status.details = {
      model: completion.model,
      usage: completion.usage,
    };
  } catch (error: any) {
    status.error = error.message;

    if (error.status === 401) {
      status.error = 'Invalid API key';
    } else if (error.status === 429) {
      status.error = 'Rate limit exceeded or quota exhausted';
    }
  }

  return status;
}

async function checkYouTube(): Promise<APIStatus> {
  const status: APIStatus = {
    provider: 'YouTube Data API',
    configured: !!process.env.YOUTUBE_API_KEY,
    working: false,
  };

  if (!status.configured) {
    status.error = 'API key not configured';
    return status;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      status.error = errorData.error?.message || `HTTP ${response.status}`;

      if (response.status === 403) {
        status.error = 'API key invalid or quota exceeded';
      }
    } else {
      const data = await response.json();
      status.working = true;
      status.details = {
        quotaUsed: data.pageInfo?.totalResults !== undefined,
      };
    }
  } catch (error: any) {
    status.error = error.message;
  }

  return status;
}

async function checkLemonFox(): Promise<APIStatus> {
  const status: APIStatus = {
    provider: 'LemonFox TTS',
    configured: !!process.env.LEMONFOX_API_KEY,
    working: false,
  };

  if (!status.configured) {
    status.error = 'API key not configured';
    return status;
  }

  try {
    // Test with a minimal TTS request
    const response = await fetch('https://api.lemonfox.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LEMONFOX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Test',
        voice: 'alloy',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      status.error = `HTTP ${response.status}: ${errorData}`;

      if (response.status === 401) {
        status.error = 'Invalid API key';
      } else if (response.status === 429) {
        status.error = 'Rate limit exceeded or quota exhausted';
      }
    } else {
      status.working = true;
      status.details = {
        responseSize: response.headers.get('content-length'),
      };
    }
  } catch (error: any) {
    status.error = error.message;
  }

  return status;
}

async function main() {
  console.log('🔍 Checking AI API Credits and Status...\n');
  console.log('=' .repeat(80));

  const checks = [
    checkOpenAI(),
    checkDeepSeek(),
    checkAnthropic(),
    checkYouTube(),
    checkLemonFox(),
  ];

  const results = await Promise.all(checks);

  let allWorking = true;

  results.forEach((result) => {
    console.log(`\n${result.provider}:`);
    console.log(`  Configured: ${result.configured ? '✅' : '❌'}`);
    console.log(`  Working: ${result.working ? '✅' : '❌'}`);

    if (result.error) {
      console.log(`  ⚠️  Error: ${result.error}`);
      allWorking = false;
    }

    if (result.details) {
      console.log(`  Details:`, JSON.stringify(result.details, null, 4));
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n${allWorking ? '✅' : '❌'} Overall Status: ${allWorking ? 'All APIs Working' : 'Some APIs Have Issues'}\n`);

  // Exit with error code if any API is broken
  process.exit(allWorking ? 0 : 1);
}

main().catch(console.error);
