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

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const CURRENCY = '₪';

export function formatPrice(price: number): string {
  return `${CURRENCY}${price.toLocaleString('en-US')}`;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString('en-US')} km`;
}
