// ─── Design Tokens ─────────────────────────────────────────────────────────────

export const colors = {
  // Kindo brand — vivid violet-to-purple, warm and fun
  primary: '#7C3AED',          // vivid purple (more vibrant than before)
  primaryDark: '#5B21B6',
  primaryLight: '#EDE9FE',

  // Accent color for extra pop
  accent: '#EC4899',           // hot pink — kids love it
  accentLight: '#FCE7F3',

  bg: '#FDF8FF',               // barely-there lavender white, warmer than plain white
  surface: '#FFFFFF',
  border: '#E8E0FA',
  divider: '#F3EEFF',

  text1: '#1E0A3C',            // deep purple-black for headings
  text2: '#4B3A7C',            // mid-purple for body
  text3: '#9E88C2',            // muted purple for hints/captions
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
};

// Bright, bold kid colors — feel playful and distinct
export const kidColors = [
  '#FF5FA0', // hot pink
  '#FF7B3A', // vibrant orange
  '#FFCC00', // sunny yellow
  '#22D65F', // bright green
  '#00C2FF', // sky blue
  '#7C3AED', // violet
  '#FF4B7B', // coral red
  '#00D4B4', // teal mint
];

export const shadows = {
  sm: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  full: 999,
};

export const darkColors = {
  primary: '#9D6FFF',
  primaryDark: '#7C3AED',
  primaryLight: '#2D1B69',
  accent: '#F472B6',
  accentLight: '#4A1942',
  bg: '#0F0A1E',
  surface: '#1A1033',
  border: '#2D1F5E',
  divider: '#231848',
  text1: '#F0EAFF',
  text2: '#C4B5F5',
  text3: '#7B6BAA',
  textInverse: '#0F0A1E',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  error: '#F87171',
  errorLight: '#450A0A',
};

export function getColors(isDark) {
  return isDark ? darkColors : colors;
}
