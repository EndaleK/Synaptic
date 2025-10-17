import { NextRequest, NextResponse } from "next/server"
import { generateFlashcards } from "@/lib/openai"
import { parseDocument } from "@/lib/document-parser"
import { convertTextToDocumentJSON } from "@/lib/document-to-json"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const mode = formData.get("mode") as string
    const variation = parseInt(formData.get("variation") as string || "0")
    let textContent = ""

    if (mode === "file") {
      const file = formData.get("file") as File
      if (!file) {
        console.error("No file provided in request")
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        )
      }

      console.log(`Processing file upload: ${file.name}, type: ${file.type}, size: ${file.size}`)
      
      const parseResult = await parseDocument(file)
      if (parseResult.error) {
        console.error(`File parsing failed for ${file.name}:`, parseResult.error)
        return NextResponse.json(
          { error: parseResult.error },
          { status: 400 }
        )
      }
      
      textContent = parseResult.text
      console.log(`Successfully extracted ${textContent.length} characters from ${file.name}`)
      
      if (textContent.length === 0) {
        console.warn(`File ${file.name} produced no text content`)
        return NextResponse.json(
          { error: "File contains no readable text content" },
          { status: 400 }
        )
      }
    } else if (mode === "text") {
      textContent = formData.get("text") as string
      if (!textContent) {
        return NextResponse.json(
          { error: "No text provided" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Invalid mode" },
        { status: 400 }
      )
    }

    // Convert text to structured JSON first
    let documentJSON = null
    if (mode === "file") {
      const file = formData.get("file") as File
      documentJSON = convertTextToDocumentJSON(
        textContent, 
        file.name, 
        file.type, 
        file.size
      )
      console.log(`Created JSON structure with ${documentJSON.sections.length} sections`)
    }
    
    const flashcards = await generateFlashcards(textContent, variation)
    
    return NextResponse.json({ 
      flashcards,
      documentJSON: documentJSON || null,
      textLength: textContent.length,
      extractedText: textContent // Include extracted text for chat functionality
    })
  } catch (error) {
    console.error("API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof Error && 'response' in error 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (error as any).response?.data?.error?.message || errorMessage
      : errorMessage
    
    return NextResponse.json(
      { error: `Failed to generate flashcards: ${errorDetails}` },
      { status: 500 }
    )
  }
}