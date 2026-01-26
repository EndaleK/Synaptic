import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, GRADIENTS } from "../lib/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../lib/fonts";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  fontSize?: keyof typeof FONT_SIZES | number;
  fontWeight?: keyof typeof FONT_WEIGHTS;
  color?: string;
  gradient?: boolean;
  animation?: "fadeUp" | "fadeIn" | "slideLeft" | "slideRight" | "scale";
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fontSize = "4xl",
  fontWeight = "bold",
  color = COLORS.textPrimary,
  gradient = false,
  animation = "fadeUp",
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  // Spring animation for natural bounce
  const springValue = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // Calculate animation values based on type
  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  switch (animation) {
    case "fadeUp":
      opacity = springValue;
      translateY = interpolate(springValue, [0, 1], [40, 0]);
      break;
    case "fadeIn":
      opacity = springValue;
      break;
    case "slideLeft":
      opacity = springValue;
      translateX = interpolate(springValue, [0, 1], [100, 0]);
      break;
    case "slideRight":
      opacity = springValue;
      translateX = interpolate(springValue, [0, 1], [-100, 0]);
      break;
    case "scale":
      opacity = springValue;
      scale = interpolate(springValue, [0, 1], [0.8, 1]);
      break;
  }

  const size = typeof fontSize === "number" ? fontSize : FONT_SIZES[fontSize];
  const weight = FONT_WEIGHTS[fontWeight];

  const baseStyle: React.CSSProperties = {
    fontFamily: FONTS.heading,
    fontSize: size,
    fontWeight: weight,
    color: gradient ? "transparent" : color,
    background: gradient ? GRADIENTS.primary : "transparent",
    backgroundClip: gradient ? "text" : undefined,
    WebkitBackgroundClip: gradient ? "text" : undefined,
    opacity,
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    ...style,
  };

  return <div style={baseStyle}>{text}</div>;
};

// Character-by-character animation
interface AnimatedCharactersProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  fontSize?: keyof typeof FONT_SIZES | number;
  fontWeight?: keyof typeof FONT_WEIGHTS;
  color?: string;
  style?: React.CSSProperties;
}

export const AnimatedCharacters: React.FC<AnimatedCharactersProps> = ({
  text,
  delay = 0,
  staggerDelay = 2,
  fontSize = "4xl",
  fontWeight = "bold",
  color = COLORS.textPrimary,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const size = typeof fontSize === "number" ? fontSize : FONT_SIZES[fontSize];
  const weight = FONT_WEIGHTS[fontWeight];

  const characters = text.split("");

  return (
    <div
      style={{
        display: "flex",
        fontFamily: FONTS.heading,
        fontSize: size,
        fontWeight: weight,
        color,
        ...style,
      }}
    >
      {characters.map((char, index) => {
        const charDelay = delay + index * staggerDelay;
        const delayedFrame = Math.max(0, frame - charDelay);

        const springValue = spring({
          frame: delayedFrame,
          fps,
          config: {
            damping: 15,
            stiffness: 120,
            mass: 0.5,
          },
        });

        const opacity = springValue;
        const translateY = interpolate(springValue, [0, 1], [20, 0]);

        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px)`,
              whiteSpace: char === " " ? "pre" : undefined,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
