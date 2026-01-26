import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: path.join(__dirname, "../.env.local") });

interface NarrationSegment {
  id: string;
  text: string;
  startFrame: number;
  durationFrames: number;
}

/**
 * Narration segments timed to cover the entire 46-second video (1380 frames at 30fps)
 * Using continuous narration with minimal gaps for a professional feel.
 *
 * Scene timing reference:
 * - Intro: 0-150 frames (0-5s)
 * - Problem: 150-270 frames (5-9s)
 * - Solution: 270-390 frames (9-13s)
 * - How To Use: 390-540 frames (13-18s)
 * - Study Tools: 540-690 frames (18-23s)
 * - Core Features: 690-1110 frames (23-37s)
 * - Social Proof: 1110-1230 frames (37-41s)
 * - CTA: 1230-1380 frames (41-46s)
 */
const narrationSegments: NarrationSegment[] = [
  {
    id: "intro",
    text: "Meet Synaptic dot study. Your AI-powered study companion that transforms the way you learn.",
    startFrame: 10,
    durationFrames: 140,
  },
  {
    id: "problem",
    text: "We know studying can feel overwhelming. Endless notes, complex topics, and tight deadlines. It doesn't have to be this way.",
    startFrame: 155,
    durationFrames: 110,
  },
  {
    id: "solution",
    text: "Synaptic uses advanced AI to transform any document into personalized study materials, adapting to how you learn best.",
    startFrame: 270,
    durationFrames: 115,
  },
  {
    id: "howto",
    text: "Getting started is simple. Upload any document, choose from our powerful study tools, and start learning smarter in seconds.",
    startFrame: 390,
    durationFrames: 145,
  },
  {
    id: "features",
    text: "Eight intelligent study tools, all designed with one goal: helping you truly understand and remember what you learn.",
    startFrame: 540,
    durationFrames: 145,
  },
  {
    id: "chat",
    text: "Chat with your documents using Socratic teaching methods. Ask questions, explore concepts, and deepen your understanding through guided dialogue.",
    startFrame: 690,
    durationFrames: 115,
  },
  {
    id: "flashcards",
    text: "AI-generated flashcards use scientifically-proven spaced repetition, showing you cards at the optimal time for long-term retention.",
    startFrame: 810,
    durationFrames: 100,
  },
  {
    id: "mockexam",
    text: "Create custom practice exams with detailed explanations. Test yourself before the real thing and identify knowledge gaps.",
    startFrame: 915,
    durationFrames: 100,
  },
  {
    id: "studybuddy",
    text: "Your personal AI study companion, available whenever you need guidance, motivation, or help understanding difficult concepts.",
    startFrame: 1020,
    durationFrames: 85,
  },
  {
    id: "socialproof",
    text: "Join thousands of students who have already discovered a smarter way to learn. Better grades, less stress, more confidence.",
    startFrame: 1110,
    durationFrames: 115,
  },
  {
    id: "cta",
    text: "Ready to transform your studying? Scan the QR code or visit synaptic dot study. Start learning smarter today.",
    startFrame: 1230,
    durationFrames: 140,
  },
];

async function generateNarrationWithElevenLabs() {
  const outputDir = path.join(__dirname, "../remotion/public/audio");
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("Error: ELEVENLABS_API_KEY environment variable is not set");
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Generating voice narration with ElevenLabs...\n");

  // ElevenLabs voice IDs - using "Aria" for a young, upbeat female voice
  // Aria: Young, energetic, friendly American voice - perfect for high school/college students
  // Other options: Alice (Xb7hH8MSUJpSbSDYk0k2), Sarah (EXAVITQu4vr4xnSDxMaL)
  const voiceId = "9BWtsMINqrJLrRacOk9x"; // Aria - Young, Energetic, Friendly

  for (const segment of narrationSegments) {
    const outputPath = path.join(outputDir, `narration-${segment.id}.mp3`);

    console.log(`Generating: ${segment.id}`);
    console.log(`  Text: "${segment.text}"`);

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: segment.text,
            model_id: "eleven_multilingual_v2", // Better quality model
            voice_settings: {
              stability: 0.40, // Lower stability for very dynamic, energetic delivery
              similarity_boost: 0.70, // Good voice consistency
              style: 0.55, // High expressiveness for very upbeat, enthusiastic tone
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

      console.log(`  ✓ Saved to ${outputPath}\n`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ✗ Error generating ${segment.id}:`, error);
    }
  }

  // Generate metadata file for Remotion
  const metadata = narrationSegments.map((s) => ({
    id: s.id,
    file: `narration-${s.id}.mp3`,
    startFrame: s.startFrame,
    durationFrames: s.durationFrames,
  }));

  fs.writeFileSync(
    path.join(outputDir, "narration-metadata.json"),
    JSON.stringify(metadata, null, 2)
  );

  console.log("\n✓ All narration files generated with ElevenLabs!");
  console.log("✓ Metadata saved to narration-metadata.json");
}

generateNarrationWithElevenLabs().catch(console.error);
