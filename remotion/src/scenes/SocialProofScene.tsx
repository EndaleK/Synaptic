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
import { Counter } from "../components/Counter";

export const SocialProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main content animation
  const mainSpring = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 70,
      mass: 1,
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
      {/* Subtle background glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: 1000,
          height: 1000,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${COLORS.purple}10 0%, transparent 60%)`,
          filter: "blur(80px)",
        }}
      />

      {/* Main counter section */}
      <div
        style={{
          textAlign: "center",
          opacity: mainSpring,
          transform: `scale(${interpolate(mainSpring, [0, 1], [0.9, 1])})`,
        }}
      >
        {/* Pre-text */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["3xl"],
            fontWeight: FONT_WEIGHTS.medium,
            color: COLORS.textSecondary,
            marginBottom: 20,
            opacity: interpolate(frame, [0, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Join
        </div>

        {/* Big counter - 1000+ - scaled for 260 frame duration */}
        <Counter
          from={0}
          to={1000}
          delay={20}
          duration={150}
          suffix="+"
          fontSize={160}
          fontWeight="extrabold"
          gradient
          style={{
            lineHeight: 1,
            marginBottom: 20,
          }}
        />

        {/* Label - scaled for 260 frames */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["4xl"],
            fontWeight: FONT_WEIGHTS.semibold,
            color: COLORS.textPrimary,
            marginBottom: 60,
            opacity: interpolate(frame, [50, 100], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(
              frame,
              [50, 100],
              [20, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )}px)`,
          }}
        >
          Students Learning Smarter
        </div>
      </div>

      {/* Trust indicators - scaled for 260 frames */}
      <div
        style={{
          display: "flex",
          gap: 50,
          opacity: interpolate(frame, [100, 160], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(
            frame,
            [100, 160],
            [30, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}px)`,
        }}
      >
        {[
          { icon: "🎓", text: "High School & College" },
          { icon: "📱", text: "Works on Any Device" },
          { icon: "🔒", text: "Your Data is Private" },
        ].map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 28px",
              backgroundColor: COLORS.backgroundWhite,
              borderRadius: 100,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              opacity: interpolate(
                frame,
                [120 + index * 25, 180 + index * 25],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: FONT_SIZES.lg,
                fontWeight: FONT_WEIGHTS.medium,
                color: COLORS.textPrimary,
              }}
            >
              {item.text}
            </span>
          </div>
        ))}
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
