import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";
import { COLORS, GRADIENTS } from "../lib/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../lib/fonts";

interface CounterProps {
  from: number;
  to: number;
  delay?: number;
  duration?: number; // in frames
  suffix?: string;
  prefix?: string;
  fontSize?: keyof typeof FONT_SIZES | number;
  fontWeight?: keyof typeof FONT_WEIGHTS;
  color?: string;
  gradient?: boolean;
  style?: React.CSSProperties;
}

export const Counter: React.FC<CounterProps> = ({
  from,
  to,
  delay = 0,
  duration = 60,
  suffix = "",
  prefix = "",
  fontSize = "7xl",
  fontWeight = "extrabold",
  color = COLORS.textPrimary,
  gradient = false,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  // Entrance animation
  const entranceSpring = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // Count animation with easing
  const progress = interpolate(
    delayedFrame,
    [0, duration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const currentValue = Math.round(from + (to - from) * progress);

  const size = typeof fontSize === "number" ? fontSize : FONT_SIZES[fontSize];
  const weight = FONT_WEIGHTS[fontWeight];

  const opacity = entranceSpring;
  const scale = interpolate(entranceSpring, [0, 1], [0.8, 1]);
  const translateY = interpolate(entranceSpring, [0, 1], [30, 0]);

  return (
    <div
      style={{
        fontFamily: FONTS.heading,
        fontSize: size,
        fontWeight: weight,
        color: gradient ? "transparent" : color,
        background: gradient ? GRADIENTS.primary : "transparent",
        backgroundClip: gradient ? "text" : undefined,
        WebkitBackgroundClip: gradient ? "text" : undefined,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        ...style,
      }}
    >
      {prefix}
      {currentValue.toLocaleString()}
      {suffix}
    </div>
  );
};

// Stats display with label
interface StatDisplayProps {
  value: number;
  label: string;
  delay?: number;
  duration?: number;
  suffix?: string;
  accentColor?: string;
}

export const StatDisplay: React.FC<StatDisplayProps> = ({
  value,
  label,
  delay = 0,
  duration = 60,
  suffix = "",
  accentColor = COLORS.purple,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const springValue = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
      mass: 0.8,
    },
  });

  const labelSpring = spring({
    frame: Math.max(0, delayedFrame - 10),
    fps,
    config: {
      damping: 18,
      stiffness: 70,
      mass: 0.9,
    },
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: springValue,
        transform: `translateY(${interpolate(springValue, [0, 1], [30, 0])}px)`,
      }}
    >
      {/* Value */}
      <Counter
        from={0}
        to={value}
        delay={delay}
        duration={duration}
        suffix={suffix}
        fontSize="6xl"
        fontWeight="extrabold"
        gradient
      />

      {/* Label */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES.xl,
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.textSecondary,
          opacity: labelSpring,
          transform: `translateY(${interpolate(labelSpring, [0, 1], [10, 0])}px)`,
        }}
      >
        {label}
      </div>
    </div>
  );
};
