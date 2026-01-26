import React from "react";
import { COLORS } from "../lib/colors";

interface IconProps {
  size?: number;
  color?: string;
}

// Flashcards icon - stacked cards with purple swipe matching app style
export const FlashcardsIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.purple }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Back card */}
    <rect x="5" y="4" width="14" height="11" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
    {/* Front card */}
    <rect x="3" y="7" width="14" height="11" rx="2" stroke={color} strokeWidth="1.5" fill="white" />
    {/* Card lines */}
    <line x1="6" y1="11" x2="14" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6" y1="14" x2="11" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    {/* Purple swipe/underline */}
    <path d="M4 20C8 18 16 18 20 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Chat icon - speech bubbles matching app style
export const ChatIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.purple }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Back bubble */}
    <path
      d="M6 14C4.34 14 3 12.66 3 11V7C3 5.34 4.34 4 6 4H14C15.66 4 17 5.34 17 7V8"
      stroke={color}
      strokeWidth="1.5"
      fill={`${color}15`}
      strokeLinecap="round"
    />
    {/* Front bubble */}
    <rect x="8" y="9" width="13" height="9" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}25`} />
    {/* Three dots */}
    <circle cx="11.5" cy="13.5" r="1" fill={color} />
    <circle cx="14.5" cy="13.5" r="1" fill={color} />
    <circle cx="17.5" cy="13.5" r="1" fill={color} />
  </svg>
);

// Podcast icon - microphone
export const PodcastIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.pink }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="8" y="3" width="8" height="12" rx="4" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <path d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Quick Summary icon - clock with lightning/speed
export const QuickSummaryIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.blue }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 4L22 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 4L2 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Mock Exam icon - clipboard with lines matching app style
export const MockExamIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Clipboard body */}
    <rect x="5" y="4" width="14" height="17" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
    {/* Clipboard top */}
    <rect x="8" y="2" width="8" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="white" />
    {/* Lines */}
    <line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Mind Map icon - connected nodes with S center matching app style
export const MindMapIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.purple }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Connection lines */}
    <line x1="12" y1="12" x2="5" y2="5" stroke={color} strokeWidth="1.5" />
    <line x1="12" y1="12" x2="19" y2="5" stroke={color} strokeWidth="1.5" />
    <line x1="12" y1="12" x2="5" y2="19" stroke={color} strokeWidth="1.5" />
    <line x1="12" y1="12" x2="19" y2="19" stroke={color} strokeWidth="1.5" />
    {/* Center node with S */}
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.5" fill={`${color}30`} />
    <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill={color}>S</text>
    {/* Outer nodes - colorful */}
    <circle cx="5" cy="5" r="3" fill="#FFB347" stroke={color} strokeWidth="1" />
    <circle cx="19" cy="5" r="3" fill="#87CEEB" stroke={color} strokeWidth="1" />
    <circle cx="5" cy="19" r="3" fill="#98D8AA" stroke={color} strokeWidth="1" />
    <circle cx="19" cy="19" r="3" fill="#DDA0DD" stroke={color} strokeWidth="1" />
  </svg>
);

// Writer icon - pencil/paper
export const WriterIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.orange }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="12" height="18" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <line x1="7" y1="8" x2="13" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="7" y1="12" x2="13" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 8L21 4L20 7L17 8Z" fill={color} />
    <line x1="14" y1="11" x2="20" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Video icon - monitor with play button
export const VideoIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.blue }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="13" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <polygon points="10,8 10,14 15,11" fill={color} />
    <line x1="8" y1="20" x2="16" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="17" x2="12" y2="20" stroke={color} strokeWidth="1.5" />
  </svg>
);

// Library icon - books
export const LibraryIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.blue }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth="1.5" fill={`${color}30`} />
    <rect x="8" y="6" width="4" height="14" rx="1" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <rect x="13" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth="1.5" fill={`${color}40`} />
    <path d="M18 5L21 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M18.5 5L21.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20.5 19L21.5 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Pathway icon - road/path
export const PathwayIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 20C4 20 8 16 8 12C8 8 4 4 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M20 20C20 20 16 16 16 12C16 8 20 4 20 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="12" cy="6" r="2" fill={color} />
    <circle cx="12" cy="12" r="2" fill={color} />
    <circle cx="12" cy="18" r="2" fill={color} />
  </svg>
);

// Study Buddy icon - cute gray robot with heart (small version for features grid)
export const StudyBuddyIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.pink }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Heart floating above */}
    <path d="M19 3C18 2 16.5 2 16 3C15.5 2 14 2 13 3C12 4 12 5.5 13 6.5L16 9L19 6.5C20 5.5 20 4 19 3Z" fill="#FF6B9D" />
    {/* Robot head - rounded square, gray */}
    <rect x="3" y="8" width="16" height="13" rx="3" stroke="#6B7280" strokeWidth="1.5" fill="#E5E7EB" />
    {/* Eyes - cute dots */}
    <circle cx="8" cy="13" r="1.5" fill="#374151" />
    <circle cx="14" cy="13" r="1.5" fill="#374151" />
    {/* Cute smile */}
    <path d="M9 17C9 17 10 18 11 18C12 18 13 17 13 17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
    {/* Antenna */}
    <line x1="11" y1="5" x2="11" y2="8" stroke="#6B7280" strokeWidth="1.5" />
    <circle cx="11" cy="4.5" r="1.5" fill="#6B7280" />
    {/* Ear accents */}
    <rect x="0" y="12" width="3" height="4" rx="1" fill="#9CA3AF" />
    <rect x="19" y="12" width="3" height="4" rx="1" fill="#9CA3AF" />
  </svg>
);

// Study Buddy Large icon - pink rounded square with face (for Core Features)
export const StudyBuddyLargeIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.pink }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Antenna dot */}
    <circle cx="17" cy="3" r="2" fill="#98D8AA" />
    {/* Pink rounded square body */}
    <rect x="2" y="4" width="20" height="18" rx="5" fill={color} />
    {/* Eyes - simple dots */}
    <circle cx="9" cy="12" r="1.5" fill="white" fillOpacity="0.9" />
    <circle cx="15" cy="12" r="1.5" fill="white" fillOpacity="0.9" />
    {/* Subtle mouth area dot */}
    <circle cx="12" cy="16" r="1" fill="white" fillOpacity="0.5" />
  </svg>
);

// Upload icon - document with arrow
export const UploadIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.purple }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="18" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <path d="M12 10V16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 13L12 10L15 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Choose/Target icon - crosshair
export const ChooseIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.purple }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5" fill={`${color}30`} />
    <circle cx="12" cy="12" r="1.5" fill={color} />
    <line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2" y1="12" x2="6" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="18" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Learn/Rocket icon - graduation cap or rocket
export const LearnIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.purple }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3L2 9L12 15L22 9L12 3Z" stroke={color} strokeWidth="1.5" fill={`${color}20`} strokeLinejoin="round" />
    <path d="M6 11V17C6 17 8 20 12 20C16 20 18 17 18 17V11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="22" y1="9" x2="22" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Export all icons as a map for easy access
export const StudyToolIcons = {
  Flashcards: FlashcardsIcon,
  Chat: ChatIcon,
  Podcast: PodcastIcon,
  "Quick Summary": QuickSummaryIcon,
  "Mock Exam": MockExamIcon,
  "Mind Map": MindMapIcon,
  Writer: WriterIcon,
  Video: VideoIcon,
  Library: LibraryIcon,
  Pathway: PathwayIcon,
  "Study Buddy": StudyBuddyIcon,
  Upload: UploadIcon,
  Choose: ChooseIcon,
  Learn: LearnIcon,
};
