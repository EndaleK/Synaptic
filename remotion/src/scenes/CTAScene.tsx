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

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered animations - scaled for 320 frame duration (was 150)
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.8 },
  });

  const headlineSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const stepsSpring = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const qrSpring = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const socialProofSpring = spring({
    frame: Math.max(0, frame - 90),
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  const ctaSpring = spring({
    frame: Math.max(0, frame - 120),
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.6 },
  });

  // Action steps
  const steps = [
    { number: "1", action: "Paste", color: COLORS.purple },
    { number: "2", action: "Generate", color: COLORS.pink },
    { number: "3", action: "Master", color: COLORS.green },
  ];

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
      {/* Subtle purple glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: 800,
          height: 800,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${COLORS.purple}10 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoSpring,
          transform: `scale(${interpolate(logoSpring, [0, 1], [0.5, 1])})`,
          marginBottom: 20,
        }}
      >
        <Img
          src={staticFile("logo-brain-transparent.png")}
          style={{
            width: 70,
            height: 70,
          }}
        />
      </div>

      {/* Main headline - Specific Hook */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 8,
          opacity: headlineSpring,
          transform: `translateY(${interpolate(headlineSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["5xl"],
            fontWeight: FONT_WEIGHTS.extrabold,
            color: COLORS.textPrimary,
            lineHeight: 1.1,
          }}
        >
          Turn Any Content Into Flashcards
        </div>
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["5xl"],
            fontWeight: FONT_WEIGHTS.extrabold,
            background: GRADIENTS.primary,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            lineHeight: 1.1,
          }}
        >
          In Seconds, Not Hours
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES.xl,
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.textSecondary,
          marginBottom: 24,
          opacity: headlineSpring,
        }}
      >
        AI-Powered Learning That Actually Works
      </div>

      {/* Action Steps: Paste → Generate → Master */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 28,
          opacity: stepsSpring,
          transform: `translateY(${interpolate(stepsSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: `${step.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONTS.heading,
                  fontSize: FONT_SIZES["2xl"],
                  fontWeight: FONT_WEIGHTS.bold,
                  color: step.color,
                }}
              >
                {step.number}
              </div>
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontSize: FONT_SIZES.lg,
                  fontWeight: FONT_WEIGHTS.semibold,
                  color: COLORS.textPrimary,
                }}
              >
                {step.action}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: FONT_SIZES["2xl"],
                  color: COLORS.textMuted,
                  marginTop: -20,
                }}
              >
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* QR Code and Social Proof side by side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 60,
        }}
      >
        {/* QR Code */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: qrSpring,
            transform: `scale(${interpolate(qrSpring, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              width: 160,
              height: 160,
              backgroundColor: COLORS.white,
              borderRadius: 16,
              padding: 12,
              boxShadow: "0 8px 32px rgba(123, 63, 242, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={staticFile("qr-code.png")}
              style={{
                width: 136,
                height: 136,
                objectFit: "contain",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.base,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.textMuted,
            }}
          >
            Scan to get started FREE
          </div>
        </div>

        {/* Social Proof */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: socialProofSpring,
            transform: `translateX(${interpolate(socialProofSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 72,
              fontWeight: FONT_WEIGHTS.extrabold,
              background: GRADIENTS.primary,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
            }}
          >
            1,000+
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.xl,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.textSecondary,
              marginTop: 4,
            }}
          >
            learners already hooked
          </div>
        </div>
      </div>

      {/* URL and Trust Signals */}
      <div
        style={{
          marginTop: 28,
          textAlign: "center",
          opacity: ctaSpring,
          transform: `translateY(${interpolate(ctaSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["3xl"],
            fontWeight: FONT_WEIGHTS.bold,
            background: GRADIENTS.primary,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          synaptic.study
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 20,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.base,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.green,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>✓</span> Free to Start
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.base,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.green,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>✓</span> No Credit Card
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: FONT_SIZES.base,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.green,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>✓</span> 500MB+ Documents
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            marginTop: 12,
            fontFamily: FONTS.body,
            fontSize: FONT_SIZES.sm,
            fontWeight: FONT_WEIGHTS.medium,
            color: COLORS.textMuted,
            fontStyle: "italic",
          }}
        >
          Flashcards created by AI, retained by you
        </div>
      </div>
    </div>
  );
};
