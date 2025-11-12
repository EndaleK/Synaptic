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

// Register all Inngest functions here
const functions = [
  processPDFFunction,
  // Add more functions as needed:
  // ragIndexFunction,
  // ocrProcessFunction,
]

// Create the Inngest handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
