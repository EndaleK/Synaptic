#!/usr/bin/env node

/**
 * Test PDF extraction for a specific document
 * This helps debug why extracted_text is empty
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPDFExtraction() {
  console.log('🔍 Testing PDF extraction...\n')

  try {
    // Find the document by name
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_name, file_type, file_size, storage_path, extracted_text, processing_status, metadata')
      .ilike('file_name', '%tran-drivers-guide%')
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !documents || documents.length === 0) {
      console.error('❌ Document not found:', fetchError)
      return
    }

    const document = documents[0]

    console.log('📄 Document Info:')
    console.log(`  ID: ${document.id}`)
    console.log(`  Name: ${document.file_name}`)
    console.log(`  Size: ${(document.file_size / 1024).toFixed(2)} KB`)
    console.log(`  Type: ${document.file_type}`)
    console.log(`  Status: ${document.processing_status}`)
    console.log(`  Storage Path: ${document.storage_path}`)
    console.log(`  Extracted Text Length: ${document.extracted_text?.length || 0} chars`)
    console.log(`  Metadata:`, JSON.stringify(document.metadata, null, 2))
    console.log('')

    if (!document.extracted_text || document.extracted_text.length === 0) {
      console.log('⚠️  No extracted text found!')
      console.log('📥 Attempting to download and extract PDF...\n')

      // Download the file
      const { data: fileBlob, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(document.storage_path)

      if (downloadError || !fileBlob) {
        console.error('❌ Failed to download PDF:', downloadError)
        return
      }

      console.log(`✅ Downloaded PDF: ${(fileBlob.size / 1024).toFixed(2)} KB`)

      // Try to extract text using pdf-parse
      console.log('🔄 Attempting extraction with pdf-parse...')

      try {
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
        const arrayBuffer = await fileBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const data = await pdfParse(buffer)

        console.log(`✅ pdf-parse succeeded!`)
        console.log(`  Pages: ${data.numpages}`)
        console.log(`  Text Length: ${data.text.length} chars`)
        console.log(`  First 200 chars:`, data.text.substring(0, 200))
        console.log('')

        if (data.text.length > 0) {
          console.log('💾 Saving extracted text to database...')

          const { error: updateError } = await supabase
            .from('documents')
            .update({
              extracted_text: data.text,
              metadata: {
                ...document.metadata,
                page_count: data.numpages,
                extraction_method: 'pdf-parse',
                extracted_at: new Date().toISOString()
              }
            })
            .eq('id', document.id)

          if (updateError) {
            console.error('❌ Failed to save:', updateError)
          } else {
            console.log('✅ Text saved successfully!')
            console.log('\n🎉 Your PDF should now work in chat!')
          }
        }

      } catch (parseError) {
        console.error('❌ pdf-parse failed:', parseError.message)
        console.log('\n🔄 Trying PyMuPDF fallback...')

        // Try PyMuPDF
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execPromise = promisify(exec)
        const fs = await import('fs')
        const os = await import('os')
        const path = await import('path')

        // Save to temp file
        const tempPath = path.join(os.tmpdir(), `test-${Date.now()}.pdf`)
        const buffer = Buffer.from(await fileBlob.arrayBuffer())
        fs.writeFileSync(tempPath, buffer)

        try {
          const scriptPath = join(__dirname, 'extract-pdf-pymupdf.py')
          const { stdout, stderr } = await execPromise(
            `python3 ${scriptPath} "${tempPath}"`
          )

          if (stderr && !stderr.includes('Deprecation')) {
            console.error('PyMuPDF stderr:', stderr)
          }

          console.log(`✅ PyMuPDF succeeded!`)
          console.log(`  Text Length: ${stdout.length} chars`)
          console.log(`  First 200 chars:`, stdout.substring(0, 200))

          if (stdout.length > 0) {
            console.log('\n💾 Saving extracted text to database...')

            const { error: updateError } = await supabase
              .from('documents')
              .update({
                extracted_text: stdout,
                metadata: {
                  ...document.metadata,
                  extraction_method: 'pymupdf',
                  extracted_at: new Date().toISOString()
                }
              })
              .eq('id', document.id)

            if (updateError) {
              console.error('❌ Failed to save:', updateError)
            } else {
              console.log('✅ Text saved successfully!')
              console.log('\n🎉 Your PDF should now work in chat!')
            }
          }

          // Cleanup
          fs.unlinkSync(tempPath)

        } catch (pymupdfError) {
          console.error('❌ PyMuPDF also failed:', pymupdfError.message)
          console.log('\n⚠️  This PDF may be scanned/image-based and requires OCR')
        }
      }

    } else {
      console.log('✅ Document already has extracted text!')
      console.log(`   First 200 chars: ${document.extracted_text.substring(0, 200)}`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testPDFExtraction()
