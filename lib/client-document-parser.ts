import mammoth from "mammoth"

interface ParseResult {
  text: string
  html?: string  // HTML content with preserved structure (for DOCX)
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
        return {
          text: "",
          error: "PDF files must be uploaded through the main document upload feature for proper extraction. Please use the document uploader instead."
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

    // Use convertToHtml to preserve document structure (headings, bold, italic, lists)
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
      // Style mapping to preserve semantic structure
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "b => strong",
        "i => em",
        "u => u"
      ]
    })

    // Also extract raw text for fallback/word count
    const textResult = await mammoth.extractRawText({ arrayBuffer })

    console.log(`DOCX extraction result: ${htmlResult.value.length} HTML chars, ${textResult.value.length} text chars`)

    if (!textResult.value || textResult.value.trim().length === 0) {
      return { text: "", error: "DOCX file appears to be empty or contains no extractable text" }
    }

    // Log any conversion warnings
    if (htmlResult.messages.length > 0) {
      console.log('DOCX conversion messages:', htmlResult.messages)
    }

    return {
      text: textResult.value,
      html: htmlResult.value  // Preserve structure for rich text editors
    }
  } catch (error) {
    console.error("DOCX parsing error:", error)
    return { text: "", error: `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}

async function parseDocFile(file: File): Promise<ParseResult> {
  try {
    console.log(`Parsing DOC file: ${file.name}`)
    const arrayBuffer = await file.arrayBuffer()

    // Use convertToHtml to preserve document structure
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "b => strong",
        "i => em",
        "u => u"
      ]
    })

    // Also extract raw text for fallback/word count
    const textResult = await mammoth.extractRawText({ arrayBuffer })

    console.log(`DOC extraction result: ${htmlResult.value.length} HTML chars, ${textResult.value.length} text chars`)

    if (!textResult.value || textResult.value.trim().length === 0) {
      return { text: "", error: "DOC file appears to be empty or contains no extractable text" }
    }

    return {
      text: textResult.value,
      html: htmlResult.value
    }
  } catch (error) {
    console.error("DOC parsing error:", error)
    return { text: "", error: `Failed to parse DOC: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}
