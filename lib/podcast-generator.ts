import OpenAI from "openai"

export type PodcastFormat = 'deep-dive' | 'brief' | 'critique' | 'debate'
export type Speaker = 'host_a' | 'host_b'
export type Emotion = 'neutral' | 'excited' | 'thoughtful' | 'curious'

export interface ScriptLine {
  speaker: Speaker
  text: string
  emotion: Emotion
  timestamp?: number // Will be populated after TTS generation
}

export interface PodcastScript {
  title: string
  description: string
  estimatedDuration: number // in seconds
  lines: ScriptLine[]
}

interface GeneratePodcastScriptOptions {
  text: string
  format?: PodcastFormat
  customPrompt?: string
  targetDuration?: number // in minutes, default 10
}

/**
 * Generate a conversational podcast script from document text
 * Mimics NotebookLM's Audio Overview feature
 */
export async function generatePodcastScript(
  options: GeneratePodcastScriptOptions
): Promise<PodcastScript> {
  const {
    text,
    format = 'deep-dive',
    customPrompt,
    targetDuration = 10
  } = options

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Truncate if necessary (similar to flashcard generation)
  const maxChars = 48000
  let processedText = text
  if (text.length > maxChars) {
    processedText = text.substring(0, maxChars)
    const lastSentence = processedText.lastIndexOf('. ')
    if (lastSentence > maxChars * 0.8) {
      processedText = processedText.substring(0, lastSentence + 1)
    }
    console.log(`Podcast: Text truncated from ${text.length} to ${processedText.length} characters`)
  }

  const formatInstructions = {
    'deep-dive': 'Create an in-depth, enthusiastic exploration of all major concepts. Hosts should ask probing questions, make connections, and dive deep into interesting details.',
    'brief': 'Create a concise, focused overview hitting only the key points. Keep it efficient and clear.',
    'critique': 'Hosts should critically analyze the content, questioning assumptions, pointing out weaknesses, and offering alternative perspectives.',
    'debate': 'Hosts should take opposing viewpoints on the main topics, presenting counterarguments and debating the merits of different interpretations.'
  }

  const wordCount = Math.floor(targetDuration * 150) // ~150 words per minute of speech

  const systemPrompt = `You are an expert podcast script writer for an educational AI audio series. You create engaging, natural-sounding conversations between two hosts who discuss documents.

Host Personalities:
- **Alex** (host_a): Curious, asks great questions, makes complex topics accessible. Slightly more enthusiastic.
- **Jordan** (host_b): Knowledgeable, provides clear explanations, makes connections to broader concepts. More analytical.

Script Requirements:
- Natural conversation flow with back-and-forth dialogue
- Include conversational fillers: "That's fascinating!", "Wait, so...", "Right!", "Mm-hmm", "Exactly!"
- Vary sentence length and structure
- Show genuine curiosity and discovery
- Make it feel like a real podcast conversation
- Target ~${wordCount} words total (${targetDuration} minutes)

${formatInstructions[format]}

${customPrompt ? `\nCustom Instructions: ${customPrompt}` : ''}

Return ONLY a valid JSON object in this exact format:
{
  "title": "A catchy, descriptive podcast episode title",
  "description": "A one-sentence description of what this episode covers",
  "lines": [
    {
      "speaker": "host_a" or "host_b",
      "text": "What the host says",
      "emotion": "neutral" or "excited" or "thoughtful" or "curious"
    }
  ]
}

DO NOT include any text outside the JSON object.`

  const userPrompt = `Create a podcast script based on this content:

<content>
${processedText}
</content>

Structure:
1. Introduction (30-60 seconds): Welcoming intro, what the episode is about
2. Main Discussion (${targetDuration - 2} minutes): Conversational exploration of key topics
3. Conclusion (60-90 seconds): Summary and key takeaways

Make it engaging and educational!`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8, // Higher creativity for natural conversation
      max_tokens: 4000,
    })

    let responseText = completion.choices[0]?.message?.content || "{}"

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    try {
      const parsed = JSON.parse(responseText)

      if (!parsed.lines || !Array.isArray(parsed.lines)) {
        throw new Error("Invalid script format: missing lines array")
      }

      // Validate and normalize script lines
      const validatedLines: ScriptLine[] = parsed.lines.map((line: any, index: number) => {
        if (!line.speaker || !line.text) {
          throw new Error(`Invalid line ${index}: missing speaker or text`)
        }

        return {
          speaker: line.speaker === 'host_a' ? 'host_a' : 'host_b',
          text: line.text.trim(),
          emotion: ['neutral', 'excited', 'thoughtful', 'curious'].includes(line.emotion)
            ? line.emotion
            : 'neutral'
        }
      })

      // Estimate duration (150 words per minute)
      const totalWords = validatedLines.reduce((sum, line) => {
        return sum + line.text.split(/\s+/).length
      }, 0)
      const estimatedDuration = Math.ceil((totalWords / 150) * 60) // in seconds

      const script: PodcastScript = {
        title: parsed.title || "Untitled Podcast",
        description: parsed.description || "An AI-generated audio overview",
        estimatedDuration,
        lines: validatedLines
      }

      console.log(`Generated podcast script: "${script.title}", ${validatedLines.length} lines, ~${estimatedDuration}s`)

      return script

    } catch (parseError) {
      console.error("Failed to parse podcast script:", responseText)
      throw new Error(`Failed to parse podcast script: ${parseError}`)
    }

  } catch (error: any) {
    console.error("OpenAI API error (podcast script):", error)
    if (error.response) {
      console.error("Response:", error.response.data)
      throw new Error(`OpenAI API error: ${error.response.data?.error?.message || error.message}`)
    }
    throw new Error(`Failed to generate podcast script: ${error.message}`)
  }
}
