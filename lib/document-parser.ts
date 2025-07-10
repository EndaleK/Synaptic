import mammoth from "mammoth"

// Import PDF.js with dynamic import for Next.js compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjs: any = null

// Function to initialize PDF.js
async function initializePdfJs() {
  if (pdfjs) return pdfjs;
  
  try {
    // Use dynamic import for better Next.js compatibility
    const pdfjsLib = await import('pdfjs-dist');
    pdfjs = pdfjsLib;
    
    // Disable worker for server-side usage
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = null;
    }
    
    console.log('PDF.js initialized successfully');
    return pdfjs;
  } catch (error) {
    console.error('Failed to initialize PDF.js:', error);
    return null;
  }
}

interface ParseResult {
  text: string
  error?: string
}

export async function parseDocument(file: File): Promise<ParseResult> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  const mimeType = file.type
  
  console.log(`Parsing file: ${file.name}, MIME: ${mimeType}, Extension: ${fileExtension}`)
  
  // Enhanced file type detection with better fallbacks
  const getFileType = () => {
    if (mimeType === "application/pdf" || fileExtension === "pdf") return "pdf"
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileExtension === "docx") return "docx"
    if (mimeType === "application/msword" || fileExtension === "doc") return "doc"
    if (mimeType === "text/plain" || fileExtension === "txt") return "txt"
    if (mimeType === "application/json" || fileExtension === "json") return "json"
    return "unknown"
  }
  
  const fileType = getFileType()
  console.log(`Detected file type: ${fileType}`)

  try {
    switch (fileType) {
      case "txt":
        return await parseTextFile(file)
      
      case "json":
        return await parseJsonFile(file)
      
      case "docx":
        return await parseDocxFile(file)
      
      case "doc":
        return await parseDocFile(file)
      
      case "pdf":
        return await parsePdfFile(file)
      
      default:
        return { text: "", error: `Unsupported file type: ${fileType} (MIME: ${mimeType}, Extension: ${fileExtension})` }
    }
  } catch (error) {
    return { text: "", error: error instanceof Error ? error.message : "Failed to parse file" }
  }
}

async function parseTextFile(file: File): Promise<ParseResult> {
  const text = await file.text()
  return { text }
}

async function parseJsonFile(file: File): Promise<ParseResult> {
  const text = await file.text()
  try {
    const json = JSON.parse(text)
    return { text: JSON.stringify(json, null, 2) }
  } catch {
    return { text: text }
  }
}

async function parseDocxFile(file: File): Promise<ParseResult> {
  try {
    console.log(`Parsing DOCX file: ${file.name}`)
    const arrayBuffer = await file.arrayBuffer()
    
    // Convert ArrayBuffer to Buffer for mammoth.js
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    
    console.log(`DOCX extraction result: ${result.value.length} characters`)
    
    if (!result.value || result.value.trim().length === 0) {
      return { text: "", error: "DOCX file appears to be empty or contains no extractable text" }
    }
    
    return { text: result.value }
  } catch (error) {
    console.error("DOCX parsing error:", error)
    return { text: "", error: `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}

async function parseDocFile(file: File): Promise<ParseResult> {
  try {
    console.log(`Parsing DOC file: ${file.name}`)
    const arrayBuffer = await file.arrayBuffer()
    
    // Convert ArrayBuffer to Buffer for mammoth.js
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    
    console.log(`DOC extraction result: ${result.value.length} characters`)
    
    if (!result.value || result.value.trim().length === 0) {
      return { text: "", error: "DOC file appears to be empty or contains no extractable text" }
    }
    
    return { text: result.value }
  } catch (error) {
    console.error("DOC parsing error:", error)
    return { text: "", error: `Failed to parse DOC: ${error instanceof Error ? error.message : "Legacy DOC format may not be fully supported"}` }
  }
}

async function parsePdfFile(file: File): Promise<ParseResult> {
  try {
    console.log(`Parsing PDF file: ${file.name}, size: ${file.size} bytes`)
    
    // Check if file is too large (limit to 75MB)
    if (file.size > 75 * 1024 * 1024) {
      return { text: "", error: "PDF file is too large (max 75MB)" }
    }
    
    // Initialize PDF.js if not already done
    const pdfjsLib = await initializePdfJs();
    
    // Check if pdfjs is available
    if (!pdfjsLib) {
      console.error("pdfjs-dist library not available")
      return { text: "", error: "PDF parsing library not available. Please try a different file format." }
    }
    
    // Ensure getDocument method exists
    if (!pdfjsLib.getDocument) {
      console.error("PDF.js getDocument method not available")
      return { text: "", error: "PDF parsing functionality not available. Please try a different file format." }
    }
    
    const arrayBuffer = await file.arrayBuffer()
    console.log(`PDF arrayBuffer created: ${arrayBuffer.byteLength} bytes`)
    
    // Configure PDF.js with worker disabled for server-side processing
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0, // Reduce logging
      disableWorker: true, // Disable web worker for server-side usage
      disableAutoFetch: true, // Disable auto fetching of resources
      disableFontFace: true, // Disable font face rules
      standardFontDataUrl: undefined, // Disable font loading
      cMapUrl: undefined, // Disable cMap loading
      cMapPacked: true,
      isEvalSupported: false // Disable eval for security
    })
    
    console.log(`Starting PDF parsing with PDF.js`)
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    console.log(`PDF loaded successfully: ${numPages} pages`)
    
    // Limit pages to prevent memory issues
    const maxPages = Math.min(numPages, 50)
    if (numPages > maxPages) {
      console.log(`Limiting PDF parsing to first ${maxPages} of ${numPages} pages`)
    }
    
    let fullText = ""
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Combine text items into readable text
        const pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str)
          .join(' ')
        
        fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`
        
        // Clean up page resources
        page.cleanup()
        
        // Prevent memory issues with very large documents
        if (fullText.length > 500000) { // 500KB limit
          console.log(`Truncating PDF at page ${pageNum} due to size (${fullText.length} characters)`)
          fullText += "\n\n[Content truncated due to size - remaining pages not processed]"
          break
        }
      } catch (pageError) {
        console.warn(`Error processing page ${pageNum}:`, pageError)
        fullText += `\n\n--- Page ${pageNum} (Error reading page) ---\n`
      }
    }
    
    // Clean up PDF resources
    pdf.destroy()
    
    console.log(`PDF extraction completed: ${fullText.length} characters from ${maxPages} pages`)
    
    if (!fullText || fullText.trim().length === 0) {
      return { text: "", error: "PDF contains no extractable text. This may be an image-based PDF or password-protected." }
    }
    
    return { text: fullText.trim() }
  } catch (error) {
    console.error("PDF parsing error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Provide more specific error messages
    if (errorMessage.includes('Invalid PDF') || errorMessage.includes('corrupted')) {
      return { text: "", error: "Invalid or corrupted PDF file. Please ensure the file is a valid PDF." }
    } else if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      return { text: "", error: "PDF is password-protected. Please provide an unprotected PDF." }
    } else if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return { text: "", error: "PDF is too complex to process. Please try a simpler PDF or reduce file size." }
    }
    
    return { 
      text: "", 
      error: `Failed to parse PDF: ${errorMessage}. Please ensure the PDF contains selectable text and is not corrupted.` 
    }
  }
}