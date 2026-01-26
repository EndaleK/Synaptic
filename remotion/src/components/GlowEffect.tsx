import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../lib/colors";

interface GlowEffectProps {
  children: React.ReactNode;
  color?: string;
  intensity?: number;
  delay?: number;
  animated?: boolean;
  style?: React.CSSProperties;
}

export const GlowEffect: React.FC<GlowEffectProps> = ({
  children,
  color = COLORS.purple,
  intensity = 1,
  delay = 0,
  animated = true,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
      mass: 1,
    },
  });

  // Pulsing glow effect
  const pulseValue = animated
    ? Math.sin((frame - delay) / 20) * 0.2 + 0.8
    : 1;

  const glowIntensity = springValue * intensity * pulseValue;
  const blur = 40 * glowIntensity;
  const spread = 20 * glowIntensity;

  return (
    <div
      style={{
        position: "relative",
        ...style,
      }}
    >
      {/* Glow layer */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          filter: `blur(${blur}px)`,
          background: color,
          opacity: 0.4 * glowIntensity,
          transform: `scale(${1 + spread / 100})`,
          borderRadius: "inherit",
        }}
      />
      {/* Content layer */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

// Neon text effect
interface NeonTextProps {
  text: string;
  color?: string;
  delay?: number;
  fontSize?: number;
  fontWeight?: number;
  style?: React.CSSProperties;
}

export const NeonText: React.FC<NeonTextProps> = ({
  text,
  color = COLORS.purple,
  delay = 0,
  fontSize = 72,
  fontWeight = 700,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    },
  });

  // Subtle flicker effect
  const flickerValue = 0.95 + Math.sin(frame * 0.5) * 0.05;

  const opacity = springValue * flickerValue;

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        opacity,
        textShadow: `
          0 0 10px ${color},
          0 0 20px ${color},
          0 0 40px ${color},
          0 0 80px ${color}
        `,
        transform: `translateY(${interpolate(springValue, [0, 1], [20, 0])}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// Gradient glow background
interface GradientGlowBackgroundProps {
  delay?: number;
  style?: React.CSSProperties;
}

export const GradientGlowBackground: React.FC<GradientGlowBackgroundProps> = ({
  delay = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 30,
      stiffness: 50,
      mass: 1,
    },
  });

  // Slow rotation for subtle movement
  const rotation = (frame - delay) * 0.1;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "150%",
        height: "150%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        opacity: springValue * 0.3,
        background: `
          radial-gradient(ellipse at 30% 30%, ${COLORS.purple}40 0%, transparent 50%),
          radial-gradient(ellipse at 70% 70%, ${COLORS.pink}40 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, ${COLORS.blue}20 0%, transparent 70%)
        `,
        filter: "blur(60px)",
        ...style,
      }}
    />
  );
};
