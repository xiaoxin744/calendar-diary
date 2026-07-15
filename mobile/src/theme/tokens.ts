export const colors = {
  canvas: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EFEA',
  border: '#DDDCD6',
  borderStrong: '#C9C7BE',
  ink: '#25272A',
  inkMuted: '#6C706F',
  inkSubtle: '#9A9D9A',
  red: '#D64A4A',
  redSoft: '#FBE9E7',
  blue: '#315B78',
  blueSoft: '#E7F0F5',
  green: '#39745A',
  greenSoft: '#E8F3EC',
  yellow: '#B98325',
  yellowSoft: '#FBF1D9',
  danger: '#B73B3B',
  overlay: 'rgba(24, 27, 29, 0.42)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  pill: 999,
} as const;

export const typography = {
  title: 24,
  section: 17,
  body: 15,
  label: 13,
  caption: 11,
} as const;

export const shadows = {
  floating: {
    shadowColor: '#1D2327',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
