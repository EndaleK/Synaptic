// Server-side PDF text extraction using pdf2json
// This library is specifically designed for Node.js environments

interface PDFParseResult {
  text: string
  error?: string
}

export async function parseServerPDF(file: File): Promise<PDFParseResult> {
  try {
    console.log(`Server PDF parsing: ${file.name}, size: ${file.size} bytes`)
    
    // Check file size limit (100MB max for server processing)
    if (file.size > 100 * 1024 * 1024) {
      return { 
        text: "", 
        error: "PDF file is too large for server processing (max 100MB). Please use the PDF viewer mode to read the document, or try splitting it into smaller sections." 
      }
    }

    // Convert File to Buffer for pdf2json
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return new Promise((resolve) => {
      try {
        // Dynamic import to ensure it only runs on server
        import('pdf2json').then(({ default: PDFParser }) => {
          const pdfParser = new PDFParser()
          
          // Set up event handlers
          pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error("PDF parsing error:", errData.parserError)
            
            const errorMessage = errData.parserError?.message || errData.parserError || 'Unknown error'
            
            if (errorMessage.includes('encrypted') || errorMessage.includes('password')) {
              resolve({
                text: "",
                error: "This PDF appears to be password-protected or encrypted. Please unlock it before uploading."
              })
            } else if (errorMessage.includes('Invalid')) {
              resolve({
                text: "",
                error: "This file appears to be corrupted or is not a valid PDF. Please check the file and try again."
              })
            } else {
              resolve({
                text: "",
                error: `Unable to parse PDF: ${errorMessage}. You can still use the PDF viewer mode to read the document.`
              })
            }
          })
          
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              // Extract text from all pages
              let extractedText = ''
              
              if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
                for (const page of pdfData.Pages) {
                  if (page.Texts && Array.isArray(page.Texts)) {
                    for (const textItem of page.Texts) {
                      if (textItem.R && Array.isArray(textItem.R)) {
                        for (const textRun of textItem.R) {
                          if (textRun.T) {
                            // Decode URI component to get actual text
                            extractedText += decodeURIComponent(textRun.T) + ' '
                          }
                        }
                      }
                    }
                  }
                  // Add page break
                  extractedText += '\n\n'
                }
              }
              
              // Clean up the extracted text
              extractedText = extractedText
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
                .trim()
              
              if (!extractedText || extractedText.length === 0) {
                resolve({
                  text: "",
                  error: "No text could be extracted from this PDF. It might be a scanned document or contain only images. Consider using OCR software to convert it to text first."
                })
              } else {
                console.log(`Successfully extracted ${extractedText.length} characters from PDF`)
                
                // Handle very large text documents that might exceed token limits
                // Estimate tokens (roughly 4 characters per token)
                const estimatedTokens = extractedText.length / 4
                const maxTokens = 12000 // Leave room for system prompts and response
                
                if (estimatedTokens > maxTokens) {
                  // Truncate to approximately the right size, but try to end at a sentence
                  const maxChars = maxTokens * 4
                  let truncatedText = extractedText.substring(0, maxChars)
                  
                  // Try to end at a sentence boundary
                  const lastSentence = truncatedText.lastIndexOf('. ')
                  if (lastSentence > maxChars * 0.8) { // If we can find a sentence ending in the last 20%
                    truncatedText = truncatedText.substring(0, lastSentence + 1)
                  }
                  
                  console.log(`Large document truncated from ${extractedText.length} to ${truncatedText.length} characters`)
                  
                  resolve({
                    text: truncatedText + "\n\n[Note: This document was truncated due to size. For complete content, use the PDF viewer mode.]",
                    error: undefined
                  })
                } else {
                  resolve({
                    text: extractedText,
                    error: undefined
                  })
                }
              }
            } catch (err) {
              console.error("Error processing PDF data:", err)
              resolve({
                text: "",
                error: "Failed to process PDF content. Please try again or use a different file format."
              })
            }
          })
          
          // Parse the PDF buffer
          pdfParser.parseBuffer(buffer)
        }).catch((importError) => {
          console.error("Failed to import pdf2json:", importError)
          resolve({
            text: "",
            error: "PDF parsing library failed to load. Please try again or use a different file format."
          })
        })
      } catch (error) {
        console.error("PDF parser initialization error:", error)
        resolve({
          text: "",
          error: "Failed to initialize PDF parser. Please try again or use a different file format."
        })
      }
    })
    
  } catch (error) {
    console.error("Server PDF parsing error:", error)
    return {
      text: "",
      error: `Unable to process PDF on the server: ${error instanceof Error ? error.message : 'Unknown error'}. Please try using the PDF viewer mode to read the document.`
    }
  }
}

// Utility function to detect if a file is a PDF
export function isPDFFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')
}