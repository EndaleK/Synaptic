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
import { UploadIcon, ChooseIcon, LearnIcon } from "../components/StudyToolIcons";

const steps = [
  {
    number: "1",
    title: "Upload",
    description: "Drop any document",
    Icon: UploadIcon,
  },
  {
    number: "2",
    title: "Choose",
    description: "Pick your study tool",
    Icon: ChooseIcon,
  },
  {
    number: "3",
    title: "Learn",
    description: "Study smarter",
    Icon: LearnIcon,
  },
];

export const HowToUseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerSpring = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
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
      }}
    >
      {/* Section header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 60,
          opacity: headerSpring,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [30, 0])}px)`,
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
            marginBottom: 12,
          }}
        >
          How It Works
        </div>
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: FONT_SIZES["5xl"],
            fontWeight: FONT_WEIGHTS.bold,
            color: COLORS.textPrimary,
          }}
        >
          Get Started in{" "}
          <span
            style={{
              background: GRADIENTS.primary,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            3 Simple Steps
          </span>
        </div>
      </div>

      {/* Steps */}
      <div
        style={{
          display: "flex",
          gap: 60,
          alignItems: "center",
        }}
      >
        {steps.map((step, index) => {
          // Scaled for 270 frame duration (was 150)
          const delay = 25 + index * 20;
          const delayedFrame = Math.max(0, frame - delay);

          const stepSpring = spring({
            frame: delayedFrame,
            fps,
            config: {
              damping: 12,
              stiffness: 100,
              mass: 0.7,
            },
          });

          const iconSpring = spring({
            frame: Math.max(0, delayedFrame - 5),
            fps,
            config: {
              damping: 8,
              stiffness: 150,
              mass: 0.5,
            },
          });

          return (
            <React.Fragment key={index}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  opacity: stepSpring,
                  transform: `translateY(${interpolate(stepSpring, [0, 1], [40, 0])}px)`,
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    background: COLORS.backgroundWhite,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 32px rgba(123, 63, 242, 0.15)",
                    border: `3px solid ${COLORS.purple}20`,
                    transform: `scale(${interpolate(iconSpring, [0, 1], [0.5, 1])})`,
                  }}
                >
                  <step.Icon size={64} color={COLORS.purple} />
                </div>

                {/* Step number */}
                <div
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: FONT_SIZES["3xl"],
                    fontWeight: FONT_WEIGHTS.extrabold,
                    background: GRADIENTS.primary,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {step.title}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: FONT_SIZES.xl,
                    fontWeight: FONT_WEIGHTS.medium,
                    color: COLORS.textSecondary,
                  }}
                >
                  {step.description}
                </div>
              </div>

              {/* Arrow between steps - scaled timing */}
              {index < steps.length - 1 && (
                <div
                  style={{
                    opacity: interpolate(
                      frame,
                      [50 + index * 20, 75 + index * 20],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
                    transform: `translateX(${interpolate(
                      frame,
                      [50 + index * 20, 75 + index * 20],
                      [-20, 0],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    )}px)`,
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ marginTop: -60 }}
                  >
                    <path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke={COLORS.purple}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
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
