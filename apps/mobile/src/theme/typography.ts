import { Platform } from 'react-native';

export const FONT_SIZE = {
  xs: 8,
  sm: 9,
  md: 10,
  base: 11,
  lg: 12,
  xl: 13,
  '2xl': 14,
  '3xl': 16,
  '4xl': 18,
  hero: 20,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const FONT_FAMILY = Platform.OS === 'ios' ? 'System' : 'Roboto';
