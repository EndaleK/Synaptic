import React, { useEffect } from "react";
import { Sequence, useVideoConfig, AbsoluteFill, Audio, staticFile } from "remotion";
import { loadFonts } from "../lib/fonts";

// Import all scenes
import { Thumbnail } from "./Thumbnail";
import { IntroScene } from "../scenes/IntroScene";
import { ProblemScene } from "../scenes/ProblemScene";
import { SolutionScene } from "../scenes/SolutionScene";
import { HowToUseScene } from "../scenes/HowToUseScene";
import { FeaturesScene } from "../scenes/FeaturesScene";
import { CoreFeaturesScene } from "../scenes/CoreFeaturesScene";
import { SocialProofScene } from "../scenes/SocialProofScene";
import { CTAScene } from "../scenes/CTAScene";
import { Narration } from "../components/Narration";

/**
 * Synaptic Product Demo Video
 *
 * Total Duration: 2950 frames (~98 seconds at 30fps)
 *
 * Extended timeline to accommodate full narration playback WITHOUT overlaps.
 * Audio durations (from ElevenLabs):
 * - intro: 5.69s (171 frames)
 * - problem: 8.02s (241 frames)
 * - solution: 8.18s (245 frames)
 * - howto: 8.36s (251 frames)
 * - features: 7.13s (214 frames)
 * - chat: 9.98s (299 frames)
 * - flashcards: 8.86s (266 frames)
 * - mockexam: 8.62s (259 frames)
 * - studybuddy: 8.49s (255 frames)
 * - socialproof: 8.20s (246 frames)
 * - cta: 7.84s (235 frames)
 *
 * AUDIO TIMELINE (sequential, no overlaps):
 * - Chat: 1230-1540 (310 frames)
 * - Flashcards: 1550-1825 (275 frames)
 * - MockExam: 1835-2105 (270 frames)
 * - StudyBuddy: 2115-2380 (265 frames)
 * - SocialProof: 2390-2645 (255 frames)
 * - CTA: 2655-2905 (250 frames)
 *
 * Scene Breakdown (with buffer for transitions):
 * - Intro: 0-200 frames (0-6.7s)
 * - Problem: 200-460 frames (6.7-15.3s)
 * - Solution: 460-720 frames (15.3-24s)
 * - How To Use: 720-990 frames (24-33s)
 * - Study Tools: 990-1220 frames (33-40.7s)
 * - Core Features: 1220-2380 frames (40.7-79.3s) - extended for sequential audio
 * - Social Proof: 2380-2650 frames (79.3-88.3s)
 * - CTA: 2650-2950 frames (88.3-98.3s)
 */
export const SynapticDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Load fonts on mount
  useEffect(() => {
    loadFonts();
  }, []);

  return (
    <AbsoluteFill>
      {/* Thumbnail Frame (frame 0) - Shows as video preview/poster */}
      <Sequence from={0} durationInFrames={1} name="Thumbnail">
        <Thumbnail />
      </Sequence>

      {/* Scene 1: Intro (1-201 frames / starts after thumbnail) */}
      <Sequence from={1} durationInFrames={200} name="Intro">
        <IntroScene />
      </Sequence>

      {/* Scene 2: Problem (200-460 frames / 6.7-15.3 seconds) */}
      <Sequence from={200} durationInFrames={260} name="Problem">
        <ProblemScene />
      </Sequence>

      {/* Scene 3: Solution (460-720 frames / 15.3-24 seconds) */}
      <Sequence from={460} durationInFrames={260} name="Solution">
        <SolutionScene />
      </Sequence>

      {/* Scene 4: How To Use (720-990 frames / 24-33 seconds) */}
      <Sequence from={720} durationInFrames={270} name="How To Use">
        <HowToUseScene />
      </Sequence>

      {/* Scene 5: Study Tools - All 8 (990-1220 frames / 33-40.7 seconds) */}
      <Sequence from={990} durationInFrames={230} name="Study Tools">
        <FeaturesScene />
      </Sequence>

      {/* Scene 6: Core Features - Deep dive (1220-2380 frames / 40.7-79.3 seconds) */}
      {/* Extended to cover all 4 feature audios without overlap */}
      <Sequence from={1220} durationInFrames={1160} name="Core Features">
        <CoreFeaturesScene />
      </Sequence>

      {/* Scene 7: Social Proof (2380-2650 frames / 79.3-88.3 seconds) */}
      <Sequence from={2380} durationInFrames={270} name="Social Proof">
        <SocialProofScene />
      </Sequence>

      {/* Scene 8: CTA (2650-2950 frames / 88.3-98.3 seconds) */}
      <Sequence from={2650} durationInFrames={300} name="CTA">
        <CTAScene />
      </Sequence>

      {/* Narration Overlays - Timed for continuous coverage */}
      {/* Intro narration */}
      <Sequence from={10} durationInFrames={180} name="Narration-Intro">
        <Narration
          text="Meet Synaptic.study — your AI-powered study companion that transforms the way you learn"
          duration={180}
        />
      </Sequence>

      {/* Problem narration */}
      <Sequence from={210} durationInFrames={250} name="Narration-Problem">
        <Narration
          text="We know studying can feel overwhelming. Endless notes, complex topics, and tight deadlines"
          duration={250}
        />
      </Sequence>

      {/* Solution narration */}
      <Sequence from={470} durationInFrames={250} name="Narration-Solution">
        <Narration
          text="Synaptic uses advanced AI to transform any document into personalized study materials"
          duration={250}
        />
      </Sequence>

      {/* How to Use narration */}
      <Sequence from={730} durationInFrames={260} name="Narration-HowToUse">
        <Narration
          text="Getting started is simple. Upload any document, choose your study tool, and start learning smarter"
          duration={260}
        />
      </Sequence>

      {/* Features narration */}
      <Sequence from={1000} durationInFrames={220} name="Narration-Features">
        <Narration
          text="Eight intelligent study tools, all designed to help you truly understand and remember"
          duration={220}
        />
      </Sequence>

      {/* Core Features narrations - one per feature */}
      {/* Chat: 1220-1445 (225 frames per feature) */}
      <Sequence from={1230} durationInFrames={300} name="Narration-Chat">
        <Narration
          text="Chat with your documents using Socratic teaching methods"
          duration={300}
        />
      </Sequence>

      {/* Flashcards: starts at 1550, ends at 1825 */}
      <Sequence from={1550} durationInFrames={275} name="Narration-Flashcards">
        <Narration
          text="AI-generated flashcards with scientifically-proven spaced repetition"
          duration={275}
        />
      </Sequence>

      {/* Mock Exam: starts at 1835, ends at 2105 */}
      <Sequence from={1835} durationInFrames={270} name="Narration-MockExam">
        <Narration
          text="Create custom practice exams with detailed explanations"
          duration={270}
        />
      </Sequence>

      {/* Study Buddy: starts at 2115, ends at 2380 */}
      <Sequence from={2115} durationInFrames={265} name="Narration-StudyBuddy">
        <Narration
          text="Your personal AI study companion, available whenever you need"
          duration={265}
        />
      </Sequence>

      {/* Social Proof narration: starts at 2390, ends at 2645 */}
      <Sequence from={2390} durationInFrames={255} name="Narration-SocialProof">
        <Narration
          text="Join thousands of students who have discovered a smarter way to learn"
          duration={255}
        />
      </Sequence>

      {/* CTA narration: starts at 2655, ends at 2905 */}
      <Sequence from={2655} durationInFrames={250} name="Narration-CTA">
        <Narration
          text="Ready to transform your studying? Scan the QR code to start learning smarter today or visit synaptic.study"
          duration={250}
        />
      </Sequence>

      {/* Background Music - plays throughout at lower volume */}
      <Audio
        src={staticFile("audio/background-music.mp3")}
        volume={0.07}
        startFrom={0}
      />

      {/* Voice Narration Audio Tracks - Full durations to prevent cutoff */}
      {/* Intro: 5.69s = 171 frames, but allow full playback */}
      <Sequence from={10} durationInFrames={180}>
        <Audio src={staticFile("audio/narration-intro.mp3")} volume={1} />
      </Sequence>

      {/* Problem: 8.02s = 241 frames */}
      <Sequence from={210} durationInFrames={250}>
        <Audio src={staticFile("audio/narration-problem.mp3")} volume={1} />
      </Sequence>

      {/* Solution: 8.18s = 245 frames */}
      <Sequence from={470} durationInFrames={255}>
        <Audio src={staticFile("audio/narration-solution.mp3")} volume={1} />
      </Sequence>

      {/* How To: 8.36s = 251 frames */}
      <Sequence from={730} durationInFrames={260}>
        <Audio src={staticFile("audio/narration-howto.mp3")} volume={1} />
      </Sequence>

      {/* Features: 7.13s = 214 frames */}
      <Sequence from={1000} durationInFrames={220}>
        <Audio src={staticFile("audio/narration-features.mp3")} volume={1} />
      </Sequence>

      {/* Chat: 9.98s = 299 frames */}
      <Sequence from={1230} durationInFrames={310}>
        <Audio src={staticFile("audio/narration-chat.mp3")} volume={1} />
      </Sequence>

      {/* Flashcards: 8.86s = 266 frames - starts AFTER chat ends (1230+310=1540) */}
      <Sequence from={1550} durationInFrames={275}>
        <Audio src={staticFile("audio/narration-flashcards.mp3")} volume={1} />
      </Sequence>

      {/* Mock Exam: 8.62s = 259 frames - starts AFTER flashcards ends (1550+275=1825) */}
      <Sequence from={1835} durationInFrames={270}>
        <Audio src={staticFile("audio/narration-mockexam.mp3")} volume={1} />
      </Sequence>

      {/* Study Buddy: 8.49s = 255 frames - starts AFTER mockexam ends (1835+270=2105) */}
      <Sequence from={2115} durationInFrames={265}>
        <Audio src={staticFile("audio/narration-studybuddy.mp3")} volume={1} />
      </Sequence>

      {/* Social Proof: 8.20s = 246 frames - starts AFTER studybuddy ends (2115+265=2380) */}
      <Sequence from={2390} durationInFrames={255}>
        <Audio src={staticFile("audio/narration-socialproof.mp3")} volume={1} />
      </Sequence>

      {/* CTA: 7.84s = 235 frames - starts AFTER socialproof ends (2390+255=2645) */}
      <Sequence from={2655} durationInFrames={250}>
        <Audio src={staticFile("audio/narration-cta.mp3")} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
