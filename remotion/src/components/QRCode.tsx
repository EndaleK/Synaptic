import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { COLORS } from "../lib/colors";

interface QRCodeProps {
  delay?: number;
  size?: number;
  style?: React.CSSProperties;
}

// QR code component that uses the actual synaptic.study QR code image
export const QRCode: React.FC<QRCodeProps> = ({
  delay = 0,
  size = 200,
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
      stiffness: 80,
      mass: 0.8,
    },
  });

  const opacity = springValue;
  const scale = interpolate(springValue, [0, 1], [0.8, 1]);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 12,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <Img
        src={staticFile("qr-code.png")}
        style={{
          width: size - 24,
          height: size - 24,
          objectFit: "contain",
        }}
      />
    </div>
  );
};
