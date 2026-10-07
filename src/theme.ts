import { Platform, type TextStyle } from 'react-native';

export const colors = {
  primary: '#1E3A8A',
  primarySoft: '#E8EDFB',
  accent: '#F59E0B',
  accentSoft: '#FEF3C7',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  error: '#DC2626',
  errorSoft: '#FEE2E2',
  freeze: '#38BDF8',
  freezeSoft: '#E0F2FE',
  bg: '#F7F7F5',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  track: '#ECECE8',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const type = {
  display: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1, fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] },
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23 },
  label: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
} satisfies Record<string, TextStyle>;

export const MAX_WIDTH = 560;

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(17,24,39,0.06), 0 4px 16px rgba(17,24,39,0.05)' },
  default: {
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
}) as object;
