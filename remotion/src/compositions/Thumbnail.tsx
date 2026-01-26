import React, { useEffect } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFonts } from "../lib/fonts";
import { COLORS, GRADIENTS } from "../lib/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../lib/fonts";

/**
 * Thumbnail composition for the Synaptic Demo video
 * 1920x1080 static image designed for YouTube/social media
 */
export const Thumbnail: React.FC = () => {
  useEffect(() => {
    loadFonts();
  }, []);

  return (
    <AbsoluteFill
      style={{
        background: GRADIENTS.lightBackground,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.purple}15 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.pink}12 0%, transparent 70%)`,
        }}
      />

      {/* Main content container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 100px",
        }}
      >
        {/* Left side - Text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            maxWidth: "55%",
          }}
        >
          {/* Logo and brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 40,
            }}
          >
            <Img
              src={staticFile("logo-brain-transparent.png")}
              style={{
                width: 80,
                height: 80,
              }}
            />
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 64,
                fontWeight: FONT_WEIGHTS.extrabold,
                background: GRADIENTS.primary,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                letterSpacing: "-1px",
              }}
            >
              Synaptic.study
            </div>
          </div>

          {/* Main headline */}
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 88,
              fontWeight: FONT_WEIGHTS.extrabold,
              color: COLORS.textPrimary,
              lineHeight: 1.1,
              marginBottom: 30,
              letterSpacing: "-2px",
            }}
          >
            Study Smarter
            <br />
            <span
              style={{
                background: GRADIENTS.primary,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Not Harder
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 32,
              fontWeight: FONT_WEIGHTS.medium,
              color: COLORS.textSecondary,
              marginBottom: 40,
            }}
          >
            AI-Powered Learning for the Modern Student
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            {[
              "AI Flashcards",
              "Study Podcasts",
              "Mind Maps",
              "Mock Exams",
              "Socratic Chat",
            ].map((feature) => (
              <div
                key={feature}
                style={{
                  padding: "12px 28px",
                  backgroundColor: COLORS.backgroundWhite,
                  borderRadius: 100,
                  border: `2px solid ${COLORS.purple}25`,
                  boxShadow: "0 4px 12px rgba(123, 63, 242, 0.08)",
                  fontFamily: FONTS.body,
                  fontSize: 22,
                  fontWeight: FONT_WEIGHTS.semibold,
                  color: COLORS.purple,
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Visual elements */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Glowing background for visual interest */}
          <div
            style={{
              position: "absolute",
              width: 450,
              height: 450,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.purple}20 0%, ${COLORS.pink}10 50%, transparent 70%)`,
              filter: "blur(40px)",
            }}
          />

          {/* Study tools icons grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 24,
              position: "relative",
              zIndex: 1,
            }}
          >
            {[
              { icon: "📚", label: "Flashcards", color: COLORS.purple },
              { icon: "🎧", label: "Podcasts", color: COLORS.pink },
              { icon: "🧠", label: "Mind Maps", color: COLORS.blueBright },
              { icon: "📝", label: "Exams", color: COLORS.orange },
            ].map((tool) => (
              <div
                key={tool.label}
                style={{
                  width: 180,
                  height: 180,
                  backgroundColor: COLORS.backgroundWhite,
                  borderRadius: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 8px 32px ${tool.color}20`,
                  border: `2px solid ${tool.color}30`,
                }}
              >
                <div style={{ fontSize: 64, marginBottom: 8 }}>{tool.icon}</div>
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 20,
                    fontWeight: FONT_WEIGHTS.semibold,
                    color: tool.color,
                  }}
                >
                  {tool.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Play button - centered overlay */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: GRADIENTS.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 12px 40px rgba(123, 63, 242, 0.5)",
          border: "4px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "24px solid transparent",
            borderBottom: "24px solid transparent",
            borderLeft: "40px solid white",
            marginLeft: 10,
          }}
        />
      </div>

      {/* Bottom accent bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: GRADIENTS.primary,
        }}
      />
    </AbsoluteFill>
  );
};
