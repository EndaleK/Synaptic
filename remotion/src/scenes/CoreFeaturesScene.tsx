import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { COLORS, GRADIENTS } from "../lib/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../lib/fonts";
import {
  ChatIcon,
  FlashcardsIcon,
  MockExamIcon,
  PodcastIcon,
} from "../components/StudyToolIcons";

interface CoreFeature {
  Icon: React.FC<{ size?: number; color?: string }>;
  name: string;
  tagline: string;
  features: string[];
  color: string;
  accentColor: string;
}

const coreFeatures: CoreFeature[] = [
  {
    Icon: ChatIcon,
    name: "Chat",
    tagline: "Your AI Study Partner",
    features: [
      "Ask questions about any document",
      "Get instant, accurate answers",
      "Socratic teaching method",
    ],
    color: COLORS.cardBlue,
    accentColor: COLORS.purple,
  },
  {
    Icon: FlashcardsIcon,
    name: "Flashcards",
    tagline: "Smart Spaced Repetition",
    features: [
      "AI-generated from your notes",
      "SM-2 algorithm for retention",
      "Track your progress",
    ],
    color: COLORS.cardPurple,
    accentColor: COLORS.purple,
  },
  {
    Icon: MockExamIcon,
    name: "Mock Exam",
    tagline: "Test Your Knowledge",
    features: [
      "Custom practice tests",
      "Multiple question formats",
      "Detailed explanations",
    ],
    color: COLORS.cardGreen,
    accentColor: COLORS.green,
  },
  {
    Icon: PodcastIcon,
    name: "Podcast",
    tagline: "Learn On The Go",
    features: [
      "Convert notes to audio",
      "Listen while commuting",
      "AI-generated narration",
    ],
    color: COLORS.cardPink,
    accentColor: COLORS.pink,
  },
];

// Duration per feature card: 225 frames (7.5 seconds each)
// Total: 900 frames for 4 features - allows full narration playback
const FRAMES_PER_FEATURE = 225;

export const CoreFeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Determine which feature is currently showing
  const currentFeatureIndex = Math.min(
    Math.floor(frame / FRAMES_PER_FEATURE),
    coreFeatures.length - 1
  );
  const featureFrame = frame - currentFeatureIndex * FRAMES_PER_FEATURE;

  const currentFeature = coreFeatures[currentFeatureIndex];

  // Card entrance animation
  const cardSpring = spring({
    frame: featureFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 0.8,
    },
  });

  // Icon bounce
  const iconSpring = spring({
    frame: Math.max(0, featureFrame - 5),
    fps,
    config: {
      damping: 8,
      stiffness: 120,
      mass: 0.5,
    },
  });

  // Title entrance
  const titleSpring = spring({
    frame: Math.max(0, featureFrame - 10),
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 0.6,
    },
  });

  // Feature list items stagger - scaled for 225 frames per feature
  const getFeatureItemSpring = (index: number) => {
    return spring({
      frame: Math.max(0, featureFrame - 40 - index * 15),
      fps,
      config: {
        damping: 12,
        stiffness: 90,
        mass: 0.7,
      },
    });
  };

  // Progress indicator
  const progress = (currentFeatureIndex + 1) / coreFeatures.length;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: GRADIENTS.lightBackground,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: FONT_SIZES.lg,
            fontWeight: FONT_WEIGHTS.semibold,
            color: COLORS.purple,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 8,
          }}
        >
          Core Features
        </div>
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["3xl"],
            fontWeight: FONT_WEIGHTS.bold,
            color: COLORS.textPrimary,
          }}
        >
          Powerful Tools for{" "}
          <span
            style={{
              background: GRADIENTS.primary,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Smarter Learning
          </span>
        </div>
      </div>

      {/* Main feature card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 80,
          marginTop: 40,
          opacity: cardSpring,
          transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
        }}
      >
        {/* Left: Icon and name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Large icon with background - light purple for all */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 40,
              background: `${COLORS.purple}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 20px 60px ${COLORS.purple}20`,
              transform: `scale(${interpolate(iconSpring, [0, 1], [0.5, 1])})`,
            }}
          >
            <currentFeature.Icon size={100} color={currentFeature.accentColor} />
          </div>

          {/* Feature name */}
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: FONT_SIZES["5xl"],
              fontWeight: FONT_WEIGHTS.extrabold,
              background: GRADIENTS.primary,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              opacity: titleSpring,
              transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
            }}
          >
            {currentFeature.name}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.xl,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.textSecondary,
              opacity: titleSpring,
            }}
          >
            {currentFeature.tagline}
          </div>
        </div>

        {/* Right: Feature list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            minWidth: 450,
          }}
        >
          {currentFeature.features.map((feature, index) => {
            const itemSpring = getFeatureItemSpring(index);
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "24px 32px",
                  backgroundColor: COLORS.backgroundWhite,
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
                  border: `2px solid ${currentFeature.accentColor}20`,
                  opacity: itemSpring,
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [50, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: GRADIENTS.primary,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: FONT_SIZES.xl,
                    fontWeight: FONT_WEIGHTS.medium,
                    color: COLORS.textPrimary,
                  }}
                >
                  {feature}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          display: "flex",
          gap: 16,
        }}
      >
        {coreFeatures.map((_, index) => (
          <div
            key={index}
            style={{
              width: index === currentFeatureIndex ? 40 : 12,
              height: 12,
              borderRadius: 6,
              background:
                index === currentFeatureIndex
                  ? GRADIENTS.primary
                  : COLORS.textMuted + "40",
              transition: "width 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Feature counter */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 60,
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES.lg,
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.textMuted,
        }}
      >
        {currentFeatureIndex + 1} / {coreFeatures.length}
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 40,
          opacity: 0.4,
        }}
      >
        <Img
          src={staticFile("logo-brain-transparent.png")}
          style={{
            width: 40,
            height: 40,
          }}
        />
      </div>
    </div>
  );
};
