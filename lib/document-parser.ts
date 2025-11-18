import mammoth from "mammoth"

interface ParseResult {
  text: string
  pageCount?: number
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
        // PDFs are now handled server-side only via API routes
        // Client-side PDF parsing is not supported to avoid bundling server dependencies
        return {
          text: "",
          error: "PDF parsing must be done server-side. Please upload the PDF through the document upload interface."
        }

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

    // Mammoth.js accepts arrayBuffer directly in browser environment
    const result = await mammoth.extractRawText({ arrayBuffer })

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

    // Mammoth.js accepts arrayBuffer directly in browser environment
    const result = await mammoth.extractRawText({ arrayBuffer })

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

// PDF parsing is now handled by server-pdf-parser.ts