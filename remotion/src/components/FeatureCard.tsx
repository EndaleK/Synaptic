import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../lib/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../lib/fonts";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  delay?: number;
  accentColor?: string;
  style?: React.CSSProperties;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay = 0,
  accentColor = COLORS.purple,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  // Card entrance animation
  const cardSpring = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
      mass: 0.8,
    },
  });

  // Staggered content animations
  const iconSpring = spring({
    frame: Math.max(0, delayedFrame - 5),
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const titleSpring = spring({
    frame: Math.max(0, delayedFrame - 10),
    fps,
    config: {
      damping: 15,
      stiffness: 90,
      mass: 0.6,
    },
  });

  const descSpring = spring({
    frame: Math.max(0, delayedFrame - 15),
    fps,
    config: {
      damping: 18,
      stiffness: 80,
      mass: 0.7,
    },
  });

  const cardOpacity = cardSpring;
  const cardScale = interpolate(cardSpring, [0, 1], [0.9, 1]);
  const cardTranslateY = interpolate(cardSpring, [0, 1], [30, 0]);

  return (
    <div
      style={{
        width: 380,
        padding: 32,
        backgroundColor: `${COLORS.backgroundLight}CC`,
        borderRadius: 24,
        border: `1px solid ${accentColor}40`,
        opacity: cardOpacity,
        transform: `translateY(${cardTranslateY}px) scale(${cardScale})`,
        boxShadow: `
          0 4px 24px rgba(0, 0, 0, 0.3),
          0 0 40px ${accentColor}20,
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
        ...style,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          opacity: iconSpring,
          transform: `scale(${interpolate(iconSpring, [0, 1], [0.5, 1])})`,
          border: `1px solid ${accentColor}40`,
        }}
      >
        <span style={{ fontSize: 32 }}>{icon}</span>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES["2xl"],
          fontWeight: FONT_WEIGHTS.bold,
          color: COLORS.white,
          marginBottom: 12,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [10, 0])}px)`,
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES.lg,
          fontWeight: FONT_WEIGHTS.normal,
          color: COLORS.textSecondary,
          lineHeight: 1.6,
          opacity: descSpring,
          transform: `translateY(${interpolate(descSpring, [0, 1], [10, 0])}px)`,
        }}
      >
        {description}
      </div>
    </div>
  );
};

// Compact feature pill for quick showcases
interface FeaturePillProps {
  icon: string;
  text: string;
  delay?: number;
  accentColor?: string;
}

export const FeaturePill: React.FC<FeaturePillProps> = ({
  icon,
  text,
  delay = 0,
  accentColor = COLORS.purple,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    },
  });

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 24px",
        backgroundColor: `${accentColor}20`,
        borderRadius: 100,
        border: `1px solid ${accentColor}40`,
        opacity: springValue,
        transform: `translateY(${interpolate(springValue, [0, 1], [20, 0])}px) scale(${interpolate(springValue, [0, 1], [0.9, 1])})`,
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span
        style={{
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES.lg,
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.white,
        }}
      >
        {text}
      </span>
    </div>
  );
};
