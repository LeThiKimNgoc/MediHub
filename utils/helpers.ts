import { colors } from '../constants/theme';

// Hàm phân loại Mắt Trái/Phải
export const getEyeIndicator = (text: string) => {
  const lower = (text || '').toLowerCase();
  if (lower.includes('trái')) return { label: 'Mắt Trái', color: colors.eyeLeft, icon: 'eye-outline' };
  if (lower.includes('phải')) return { label: 'Mắt Phải', color: colors.eyeRight, icon: 'eye-outline' };
  if (lower.includes('2 mắt') || lower.includes('hai mắt') || lower.includes('cả hai')) return { label: 'Cả 2 Mắt', color: colors.eyeBoth, icon: 'eye-settings-outline' };
  return null;
};

// Hàm phân loại icon Giọt/Tuýp
export const getMedIcon = (name: string, dose: string) => {
  const combined = `${name} ${dose}`.toLowerCase();
  if (combined.includes('mỡ') || combined.includes('gel') || combined.includes('tuýp')) return 'tube';
  return 'water';
};
