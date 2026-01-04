/**
 * Inngest API Endpoint
 *
 * This endpoint handles communication between Inngest and our application.
 * Inngest uses this to:
 * - Register functions
 * - Execute background jobs
 * - Report status and logs
 *
 * URL: /api/inngest
 * Method: POST, PUT, GET
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { processPDFFunction } from '@/lib/inngest/functions/process-pdf'
import { indexDocumentV2Functions } from '@/lib/inngest/functions/index-document-v2'

// Register all Inngest functions here
const functions = [
  processPDFFunction,
  // V2 split workers for large document indexing
  ...indexDocumentV2Functions,
]

// Create the Inngest handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  // Customize the Inngest dev server UI
  servePath: '/api/inngest',
  landingPage: true,
  // Custom branding for the Inngest UI
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
