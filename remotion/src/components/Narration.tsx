import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS } from "../lib/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../lib/fonts";

interface NarrationProps {
  text: string;
  delay?: number;
  duration?: number;
  position?: "bottom" | "top";
  style?: React.CSSProperties;
}

export const Narration: React.FC<NarrationProps> = ({
  text,
  delay = 0,
  duration = 90,
  position = "bottom",
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  // Fade in
  const fadeIn = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // Fade out near the end
  const fadeOut = interpolate(
    delayedFrame,
    [duration - 20, duration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(fadeIn, fadeOut);

  if (delayedFrame < 0 || delayedFrame > duration) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        [position]: 80,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 100,
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          padding: "16px 32px",
          borderRadius: 12,
          maxWidth: "80%",
          opacity,
          transform: `translateY(${interpolate(fadeIn, [0, 1], [10, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: FONT_SIZES.xl,
            fontWeight: FONT_WEIGHTS.medium,
            color: COLORS.white,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
