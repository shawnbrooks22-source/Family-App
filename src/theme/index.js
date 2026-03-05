// ─── Design Tokens ─────────────────────────────────────────────────────────────

export const colors = {
  primary: '#5C5FE4',
  primaryDark: '#3D40C4',
  primaryLight: '#EEEFFE',

  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E8EEF8',
  divider: '#F1F5F9',

  text1: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  errorLight: '#FEF2F2',
};

export const kidColors = [
  '#FF6B6B', // coral red
  '#FF9F43', // orange
  '#FEC600', // yellow
  '#0BDA92', // mint green
  '#18D4D4', // teal
  '#54A8FF', // sky blue
  '#A78BFA', // purple
  '#F472B6', // pink
];

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};
