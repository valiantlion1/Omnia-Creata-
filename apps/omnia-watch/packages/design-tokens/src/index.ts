export const colorTokens = {
  accent: {
    50: "#E5FCF5",
    100: "#C8F6EA",
    200: "#8BEAD5",
    300: "#49D6B9",
    400: "#23BA96",
    500: "#149075",
    600: "#0D6E5B"
  },
  danger: "#FF607A",
  info: "#68BCFF",
  neutral: {
    950: "#080C18",
    900: "#0D1322",
    800: "#141C31",
    700: "#22304D",
    600: "#33466B",
    500: "#55688A",
    400: "#8E9AB2",
    300: "#B2BDD0",
    200: "#D6DDEA",
    100: "#EDF2F8"
  },
  success: "#40D28E",
  warning: "#FFC15C"
} as const;

export const spacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 56
} as const;

export const typographyTokens = {
  body: {
    fontFamily: "Manrope",
    lineHeight: 1.6
  },
  display: {
    fontFamily: "Space Grotesk",
    lineHeight: 1.08
  }
} as const;

export const radiusTokens = {
  lg: 16,
  xl: 22,
  "2xl": 32
} as const;

export const shadowTokens = {
  ambient: "0 24px 80px rgba(6, 12, 28, 0.32)",
  glow: "0 0 0 1px rgba(73, 214, 185, 0.16), 0 16px 50px rgba(73, 214, 185, 0.14)"
} as const;

export const chartTokens = [
  "#49D6B9",
  "#68BCFF",
  "#FFC15C",
  "#FF607A",
  "#C8F6EA"
] as const;

export const breakpointTokens = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440
} as const;

export const omniaWatchTheme = {
  breakpoints: breakpointTokens,
  charts: chartTokens,
  colors: colorTokens,
  radius: radiusTokens,
  shadows: shadowTokens,
  spacing: spacingTokens,
  typography: typographyTokens
} as const;

export type OmniaWatchTheme = typeof omniaWatchTheme;
