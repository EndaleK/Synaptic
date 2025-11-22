import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

interface AssessmentRequest {
  responses: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { responses }: AssessmentRequest = await request.json()

    if (!responses || Object.keys(responses).length === 0) {
      return NextResponse.json(
        { error: "No quiz responses provided" },
        { status: 400 }
      )
    }

    // Calculate scores based on responses
    const scores = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      reading_writing: 0,
    }

    Object.values(responses).forEach((style) => {
      if (style in scores) {
        scores[style as keyof typeof scores]++
      }
    })

    // Determine dominant style
    const dominantStyle = Object.entries(scores).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] as keyof typeof scores

    // Get AI analysis if OpenAI is configured
    let aiAnalysis = null
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })

        const prompt = `Based on a learning style assessment with these scores:
- Visual: ${scores.visual}
- Auditory: ${scores.auditory}
- Kinesthetic: ${scores.kinesthetic}
- Reading/Writing: ${scores.reading_writing}

The dominant learning style is: ${dominantStyle}

Provide a personalized 2-3 paragraph analysis that:
1. Explains what this learning style means
2. Gives specific study recommendations
3. Suggests which features of our platform (flashcards, chat, podcasts, mind maps) would work best for them

Keep it encouraging and actionable.`

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert educational psychologist who helps people understand their learning preferences.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        })

        aiAnalysis = completion.choices[0]?.message?.content || null
      } catch (error) {
        console.error("OpenAI API error:", error)
        // Continue without AI analysis
      }
    }

    // Store in Supabase
    const supabase = await createClient()

    // First, get or create user profile
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single()

    let userProfileId = existingProfile?.id

    if (!userProfileId) {
      // Create user profile if it doesn't exist
      const { data: newProfile, error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          clerk_user_id: userId,
          email: "", // Will be updated from Clerk webhook
          learning_style: dominantStyle,
        })
        .select("id")
        .single()

      if (profileError) {
        console.error("Error creating user profile:", profileError)
      } else {
        userProfileId = newProfile?.id
      }
    } else {
      // Update existing profile with learning style
      await supabase
        .from("user_profiles")
        .update({ learning_style: dominantStyle })
        .eq("id", userProfileId)
    }

    // Save learning profile assessment
    if (userProfileId) {
      await supabase.from("learning_profiles").insert({
        user_id: userProfileId,
        quiz_responses: responses,
        visual_score: scores.visual,
        auditory_score: scores.auditory,
        kinesthetic_score: scores.kinesthetic,
        reading_writing_score: scores.reading_writing,
        dominant_style: dominantStyle,
        learning_preferences: {
          ai_analysis: aiAnalysis,
        },
      })
    }

    return NextResponse.json({
      scores,
      dominantStyle,
      aiAnalysis,
      recommendations: getRecommendations(dominantStyle),
    })
  } catch (error: unknown) {
    console.error("Learning style assessment error:", error)
    return NextResponse.json(
      { error: "Failed to assess learning style" },
      { status: 500 }
    )
  }
}

function getRecommendations(style: string) {
  const recommendations = {
    visual: {
      features: ["Mind Maps", "Flashcards with Images", "Color-coded Notes"],
      studyTips: [
        "Use diagrams and charts when studying",
        "Create visual flashcards with colors",
        "Watch video tutorials",
        "Use mind maps to connect concepts",
      ],
    },
    auditory: {
      features: ["Document Podcasts", "Chat Discussions", "Audio Flashcards"],
      studyTips: [
        "Listen to AI-generated podcasts of your documents",
        "Discuss concepts with the AI chat",
        "Record yourself explaining concepts",
        "Study with background music",
      ],
    },
    kinesthetic: {
      features: ["Interactive Flashcards", "Hands-on Chat", "Practice Exercises"],
      studyTips: [
        "Take breaks to move around while studying",
        "Use physical flashcards you can flip",
        "Practice concepts through application",
        "Create projects based on what you learn",
      ],
    },
    reading_writing: {
      features: ["Flashcards", "Document Chat", "Note-taking"],
      studyTips: [
        "Take detailed written notes",
        "Rewrite flashcards in your own words",
        "Create written summaries",
        "Use the chat to ask detailed questions",
      ],
    },
  }

  return recommendations[style as keyof typeof recommendations] || recommendations.visual
}
