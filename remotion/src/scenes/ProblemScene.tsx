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

const painPoints = [
  { icon: "📚", text: "Drowning in textbooks and lecture notes" },
  { icon: "⏰", text: "Never enough time to study everything" },
  { icon: "🔄", text: "Forgetting what you learned days ago" },
  { icon: "😰", text: "Exam stress and cramming sessions" },
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        padding: 80,
      }}
    >
      {/* Main headline */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES["5xl"],
          fontWeight: FONT_WEIGHTS.bold,
          color: COLORS.textPrimary,
          marginBottom: 8,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [0, 20],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        Studying Shouldn't Feel
      </div>

      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES["6xl"],
          fontWeight: FONT_WEIGHTS.extrabold,
          background: GRADIENTS.primary,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          marginBottom: 60,
          opacity: interpolate(frame, [10, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [10, 30],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        Overwhelming
      </div>

      {/* Pain points grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          maxWidth: 1000,
        }}
      >
        {painPoints.map((point, index) => {
          // Scaled for 260 frame duration (was 120)
          const delay = 50 + index * 25;
          const delayedFrame = Math.max(0, frame - delay);

          const springValue = spring({
            frame: delayedFrame,
            fps,
            config: {
              damping: 15,
              stiffness: 90,
              mass: 0.7,
            },
          });

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
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                border: "1px solid rgba(0, 0, 0, 0.04)",
                opacity: springValue,
                transform: `translateX(${interpolate(
                  springValue,
                  [0, 1],
                  [index % 2 === 0 ? -30 : 30, 0]
                )}px)`,
              }}
            >
              <span style={{ fontSize: 36 }}>{point.icon}</span>
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: FONT_SIZES.xl,
                  fontWeight: FONT_WEIGHTS.medium,
                  color: COLORS.textSecondary,
                }}
              >
                {point.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Transition text - appears in second half of scene */}
      <div
        style={{
          marginTop: 60,
          opacity: interpolate(frame, [180, 230], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [180, 230],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: FONT_SIZES["2xl"],
            fontWeight: FONT_WEIGHTS.medium,
            color: COLORS.textMuted,
          }}
        >
          There's a better way...
        </span>
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
