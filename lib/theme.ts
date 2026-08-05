// AutoHub design system — single source of truth for colors, spacing, radii.
export const colors = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  primary: '#101C33', // deep navy
  primarySoft: '#1E2F52',
  accent: '#F59E0B', // amber
  accentSoft: '#FEF3C7',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  border: '#E2E8F0',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  chipBg: '#EEF2F7',
  overlay: 'rgba(15, 23, 42, 0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

/**
 * Elevation recipes (iOS shadow + Android elevation).
 * `card` is the workhorse; `float` lifts app chrome off the canvas;
 * `cta` gives primary buttons an amber glow.
 */
export const shadow = {
  /** Soft lift for cards sitting on the canvas. */
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Stronger lift for floating chrome (top bar, sticky footers). */
  float: {
    shadowColor: '#0B1426',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  /** Amber glow for primary calls to action. */
  cta: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
};

/** The brand gradient used by the splash, auth hero and dark surfaces. */
export const brandGradient = ['#1A2C55', '#0C1B33', '#070D1B'] as const;

export const CURRENCY = '₪';

export function formatPrice(price: number): string {
  return `${CURRENCY}${price.toLocaleString('en-US')}`;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString('en-US')} km`;
}
