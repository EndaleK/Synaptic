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
  FlashcardsIcon,
  ChatIcon,
  PodcastIcon,
  QuickSummaryIcon,
  MockExamIcon,
  MindMapIcon,
  WriterIcon,
  VideoIcon,
} from "../components/StudyToolIcons";

// All 8 study tools matching the app
const features = [
  { Icon: FlashcardsIcon, name: "Flashcards", description: "Spaced repetition review", color: COLORS.purple },
  { Icon: ChatIcon, name: "Chat", description: "Q&A about your docs", color: COLORS.purple },
  { Icon: PodcastIcon, name: "Podcast", description: "Full audio lesson (10-20 min)", color: COLORS.pink },
  { Icon: QuickSummaryIcon, name: "Quick Summary", description: "5-min audio highlights", color: COLORS.blue },
  { Icon: MockExamIcon, name: "Mock Exam", description: "Test your knowledge", color: COLORS.green },
  { Icon: MindMapIcon, name: "Mind Map", description: "Visualize concepts", color: COLORS.purple },
  { Icon: WriterIcon, name: "Writer", description: "Generate practice content", color: COLORS.orange },
  { Icon: VideoIcon, name: "Video", description: "Learn from YouTube", color: COLORS.blue },
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerSpring = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
      mass: 0.8,
    },
  });

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
        padding: 60,
      }}
    >
      {/* Subtle purple glow in background */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: 800,
          height: 800,
          transform: "translate(-50%, -50%)",
          background: GRADIENTS.subtleGlow,
          filter: "blur(60px)",
        }}
      />

      {/* Section header */}
      <div
        style={{
          marginBottom: 50,
          textAlign: "center",
          opacity: headerSpring,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [-20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES.lg,
            fontWeight: FONT_WEIGHTS.semibold,
            color: COLORS.purple,
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Study Tools
        </div>
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["5xl"],
            fontWeight: FONT_WEIGHTS.bold,
            color: COLORS.textPrimary,
          }}
        >
          Transform How You{" "}
          <span
            style={{
              background: GRADIENTS.primary,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Study
          </span>
        </div>
      </div>

      {/* Features grid - 4 columns x 2 rows */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 28,
          maxWidth: 1200,
          width: "100%",
        }}
      >
        {features.map((feature, index) => {
          // Scaled for 230 frame duration (was 150)
          const delay = 30 + index * 12;
          const delayedFrame = Math.max(0, frame - delay);

          const cardSpring = spring({
            frame: delayedFrame,
            fps,
            config: {
              damping: 15,
              stiffness: 100,
              mass: 0.6,
            },
          });

          const scale = interpolate(cardSpring, [0, 1], [0.8, 1]);
          const opacity = cardSpring;
          const translateY = interpolate(cardSpring, [0, 1], [30, 0]);

          return (
            <div
              key={index}
              style={{
                backgroundColor: COLORS.backgroundWhite,
                borderRadius: 16,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
                border: "1px solid rgba(0, 0, 0, 0.04)",
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
              }}
            >
              {/* Icon container */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: `${feature.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <feature.Icon size={36} color={feature.color} />
              </div>

              {/* Name */}
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: FONT_SIZES.lg,
                  fontWeight: FONT_WEIGHTS.semibold,
                  color: COLORS.textPrimary,
                  marginBottom: 6,
                }}
              >
                {feature.name}
              </div>

              {/* Description */}
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: FONT_SIZES.sm,
                  fontWeight: FONT_WEIGHTS.normal,
                  color: COLORS.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                {feature.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom tagline - adjusted for 230 frame scene */}
      <div
        style={{
          marginTop: 50,
          opacity: interpolate(frame, [150, 200], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [150, 200],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: FONT_SIZES.xl,
            fontWeight: FONT_WEIGHTS.medium,
            color: COLORS.textSecondary,
          }}
        >
          Upload any document • Get study materials in seconds
        </div>
      </div>

      {/* Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          right: 40,
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
