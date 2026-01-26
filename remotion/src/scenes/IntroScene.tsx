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

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoSpring = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 1,
    },
  });

  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = logoSpring;

  // Tagline animations (staggered) - scaled for 200 frame duration
  const taglineDelay = 40;

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
      {/* Subtle accent */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: 800,
          height: 800,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${COLORS.purple}06 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        {/* Brain icon/logo */}
        <Img
          src={staticFile("logo-brain-transparent.png")}
          style={{
            width: 100,
            height: 100,
          }}
        />

        {/* Text logo */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["8xl"],
            fontWeight: FONT_WEIGHTS.extrabold,
            background: GRADIENTS.primary,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            letterSpacing: "-2px",
          }}
        >
          Synaptic.study
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES["4xl"],
          fontWeight: FONT_WEIGHTS.semibold,
          color: COLORS.textPrimary,
          letterSpacing: "1px",
          marginBottom: 16,
          opacity: interpolate(frame, [taglineDelay, taglineDelay + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [taglineDelay, taglineDelay + 20],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        Study Smarter, Not Harder
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES["2xl"],
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.textSecondary,
          marginBottom: 50,
          opacity: interpolate(frame, [taglineDelay + 15, taglineDelay + 35], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [taglineDelay + 15, taglineDelay + 35],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        AI-Powered Learning for the Modern Student
      </div>

      {/* Feature tags - scaled for 200 frame duration */}
      <div
        style={{
          display: "flex",
          gap: 16,
          opacity: interpolate(frame, [80, 120], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {["flashcards", "podcasts", "mind maps", "mock exams"].map((item, i) => (
          <div
            key={item}
            style={{
              padding: "10px 24px",
              backgroundColor: COLORS.backgroundWhite,
              borderRadius: 100,
              border: `1px solid ${COLORS.purple}20`,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.base,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.textSecondary,
              opacity: interpolate(
                frame,
                [80 + i * 10, 120 + i * 10],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
              transform: `translateY(${interpolate(
                frame,
                [80 + i * 10, 120 + i * 10],
                [20, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )}px)`,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
