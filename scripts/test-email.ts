/**
 * Email Configuration Test Script
 *
 * Tests that email service is properly configured
 * Run with: npx tsx scripts/test-email.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { isEmailConfigured } from '../lib/email/client'
import { sendWelcomeEmail } from '../lib/email/send'

async function testEmailConfig() {
  console.log('🔍 Testing Email Configuration...\n')

  // Check if Resend API key is configured
  console.log('1. Checking RESEND_API_KEY...')
  if (isEmailConfigured()) {
    console.log('   ✅ RESEND_API_KEY is configured')
  } else {
    console.log('   ❌ RESEND_API_KEY is NOT configured')
    console.log('   Add RESEND_API_KEY to .env.local and try again\n')
    process.exit(1)
  }

  // Check environment variables
  console.log('\n2. Environment Variables:')
  console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`)
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 're_***' + process.env.RESEND_API_KEY.slice(-4) : 'Not set'}`)

  // Test email sending (optional - only if TEST_EMAIL is provided)
  const testEmail = process.env.TEST_EMAIL

  if (testEmail) {
    console.log('\n3. Sending Test Email...')
    console.log(`   Recipient: ${testEmail}`)

    const result = await sendWelcomeEmail({
      userEmail: testEmail,
      userName: 'Test User',
    })

    if (result.success) {
      console.log('   ✅ Test email sent successfully!')
      console.log(`   Message ID: ${result.data?.id}`)
      console.log(`\n   Check ${testEmail} for the welcome email`)
    } else {
      console.log('   ❌ Failed to send test email')
      console.log(`   Error: ${result.error}`)
    }
  } else {
    console.log('\n3. Test Email Sending (Optional):')
    console.log('   To test sending emails, run:')
    console.log('   TEST_EMAIL=your@email.com npx tsx scripts/test-email.ts')
  }

  console.log('\n✨ Email configuration test complete!\n')
}

// Run the test
testEmailConfig().catch(console.error)
