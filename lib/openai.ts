import OpenAI from "openai"
import { Flashcard } from "./types"

export async function generateFlashcards(text: string): Promise<Flashcard[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Safety check: truncate if text is still too long (backup safety net)
  const maxChars = 45000 // Conservative limit to ensure we stay under token limits
  let processedText = text
  
  if (text.length > maxChars) {
    // Try to truncate at a sentence boundary
    processedText = text.substring(0, maxChars)
    const lastSentence = processedText.lastIndexOf('. ')
    if (lastSentence > maxChars * 0.8) {
      processedText = processedText.substring(0, lastSentence + 1)
    }
    console.log(`Flashcard generation: Text truncated from ${text.length} to ${processedText.length} characters`)
  }

  const prompt = `You are tasked with extracting flashcard content from a given text chunk. Your goal is to identify key terms and their corresponding definitions or explanations that would be suitable for creating flashcards.

Here's the text chunk you need to analyze:
<text_chunk>
${processedText}
</text_chunk>

Guidelines for extracting flashcard content:
1. Identify important terms, concepts, or phrases that are central to the text's topic.
2. For each term, find a corresponding definition, explanation, or key information from the text.
3. Ensure that the term and definition pairs are concise and clear.
4. Extract only the most relevant and significant information.
5. Aim for a balance between comprehensiveness and brevity.

Create between 5-15 flashcards based on the content available.

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "front": "Term or concept (keep concise, 1-5 words ideal)",
    "back": "Definition or explanation from the text (clear and educational, under 50 words)"
  }
]

DO NOT include any text outside the JSON array.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educator who creates concise, clear flashcards from educational content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    let responseText = completion.choices[0]?.message?.content || "[]"
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    
    try {
      const parsedFlashcards = JSON.parse(responseText)
      
      if (!Array.isArray(parsedFlashcards)) {
        throw new Error("Response is not an array")
      }

      return parsedFlashcards.map((card, index) => ({
        id: `card-${Date.now()}-${index}`,
        front: card.front || "",
        back: card.back || "",
        createdAt: new Date()
      }))
    } catch {
      console.error("Failed to parse AI response:", responseText)
      throw new Error("Failed to parse flashcard data")
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("OpenAI API error:", error)
    if (error.response) {
      console.error("Response data:", error.response.data)
      console.error("Response status:", error.response.status)
      throw new Error(`OpenAI API error: ${error.response.data?.error?.message || error.message}`)
    } else if (error.message) {
      throw new Error(`OpenAI error: ${error.message}`)
    } else {
      throw new Error("Failed to generate flashcards")
    }
  }
}