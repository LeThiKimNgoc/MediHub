import { colors } from '../constants/theme';

// Hàm phân loại Mắt Trái/Phải
export const getEyeIndicator = (text: string) => {
  const lower = (text || '').toLowerCase();
  if (lower.includes('trái')) return { label: 'Mắt Trái', color: colors.eyeLeft, icon: 'eye-outline' };
  if (lower.includes('phải')) return { label: 'Mắt Phải', color: colors.eyeRight, icon: 'eye-outline' };
  if (lower.includes('2 mắt') || lower.includes('hai mắt') || lower.includes('cả hai')) return { label: 'Cả 2 Mắt', color: colors.eyeBoth, icon: 'eye-settings-outline' };
  return null;
};

// Hàm phân loại Icon theo quy cách đóng gói/sử dụng
export const getMedIcon = (item: any) => {
  if (!item) return 'water';
  
  // Gộp tất cả các trường dữ liệu lại để tìm từ khóa
  const combined = `${item.MedicineName} ${item.Dose} ${item.Usage} ${item.Quantity}`.toLowerCase();

  if (combined.includes('viên')) return 'pill';
  if (combined.includes('tra mắt') || combined.includes('mỡ') || combined.includes('gel') || combined.includes('tuýp')) return 'tube';
  if (combined.includes('dùng ngoài') || combined.includes('chườm')) return 'sleep'; // Icon mặt nạ chườm
  if (combined.includes('lọ') || combined.includes('giọt')) return 'water'; // Icon giọt nước

  return 'water'; // Mặc định nếu không khớp từ khóa nào
};