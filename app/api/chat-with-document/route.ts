import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

interface ChatRequest {
  message: string
  fileName?: string
  documentContent?: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, fileName, documentContent }: ChatRequest = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        response: `I notice you haven't configured an OpenAI API key yet. To enable real document chat functionality:

1. Create a .env.local file in your project root
2. Add your OpenAI API key: OPENAI_API_KEY=your_key_here
3. Restart the development server

For now, I can see you asked: "${message}" about "${fileName || 'your document'}", but I need the API key to provide intelligent responses based on the document content.`,
        timestamp: new Date().toISOString()
      })
    }

    // If no document content, provide guidance
    if (!documentContent || documentContent.trim().length === 0) {
      return NextResponse.json({
        response: `I don't have access to the document content yet. This could be because:

• The document is still being processed
• The document format isn't supported for text extraction  
• There was an error reading the document

Please try uploading a text-based document (TXT, DOCX) or a PDF with selectable text. Once I can access the content, I'll be able to answer your question: "${message}"`,
        timestamp: new Date().toISOString()
      })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Create a focused prompt for document-based Q&A
    const systemPrompt = `You are a helpful AI assistant that answers questions based strictly on the provided document content. 

Key guidelines:
- Only use information from the provided document to answer questions
- If the document doesn't contain information to answer the question, clearly state that
- Be specific and cite relevant parts of the document when possible
- Provide clear, educational answers
- If asked about topics not in the document, politely redirect to document content`

    const userPrompt = `Document: "${fileName || 'Uploaded Document'}"

Document Content:
${documentContent}

---

User Question: ${message}

Please answer this question based only on the information provided in the document above. If the document doesn't contain relevant information to answer the question, please let me know.`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userPrompt
        }
      ],
      temperature: 0.1, // Lower temperature for more focused, factual responses
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0]?.message?.content || 
      "I apologize, but I'm having trouble processing your question at the moment. Please try rephrasing your question or try again."

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("Chat API error:", error)
    
    // Handle OpenAI specific errors
    if (error.response) {
      console.error("OpenAI API error:", error.response.data)
      return NextResponse.json({
        response: `I encountered an error while processing your question. This might be due to API rate limits or configuration issues. Please try again in a moment.`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}