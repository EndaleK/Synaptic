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

const solutionPoints = [
  { icon: "🧠", text: "Adapts to how YOU learn", color: COLORS.purple },
  { icon: "⚡", text: "Creates study materials in seconds", color: COLORS.pink },
  { icon: "🎯", text: "Focuses on what matters most", color: COLORS.cyan },
];

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main reveal animation
  const mainSpring = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 60,
      mass: 1.2,
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
      }}
    >
      {/* Subtle background accent */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: 600,
          height: 600,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${COLORS.purple}08 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* "Introducing" pre-text */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES.lg,
          fontWeight: FONT_WEIGHTS.semibold,
          color: COLORS.textMuted,
          letterSpacing: "4px",
          textTransform: "uppercase",
          marginBottom: 24,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Introducing
      </div>

      {/* Main title - clean gradient text */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES["7xl"],
          fontWeight: FONT_WEIGHTS.extrabold,
          background: GRADIENTS.primary,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          marginBottom: 16,
          opacity: mainSpring,
          transform: `translateY(${interpolate(mainSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        AI-Powered Learning
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES["2xl"],
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.textSecondary,
          marginBottom: 60,
          opacity: interpolate(frame, [20, 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [20, 50],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        Your personal AI study companion
      </div>

      {/* Solution points - clean cards - scaled for 260 frames */}
      <div
        style={{
          display: "flex",
          gap: 32,
          justifyContent: "center",
        }}
      >
        {solutionPoints.map((point, index) => {
          const delay = 80 + index * 35;
          const delayedFrame = Math.max(0, frame - delay);

          const springValue = spring({
            frame: delayedFrame,
            fps,
            config: {
              damping: 12,
              stiffness: 100,
              mass: 0.6,
            },
          });

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "20px 32px",
                backgroundColor: COLORS.backgroundWhite,
                borderRadius: 16,
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
                border: `1px solid ${point.color}20`,
                opacity: springValue,
                transform: `translateY(${interpolate(
                  springValue,
                  [0, 1],
                  [20, 0]
                )}px)`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${point.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 24 }}>{point.icon}</span>
              </div>
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: FONT_SIZES.xl,
                  fontWeight: FONT_WEIGHTS.medium,
                  color: COLORS.textPrimary,
                }}
              >
                {point.text}
              </span>
            </div>
          );
        })}
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
