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

  return 'water';
}; // <-- Lỗi lúc nãy là do thiếu dấu đóng ngoặc này ở đây

// Hàm phân loại Thuật ngữ (Uống/Nhỏ/Tra/Dùng ngoài)
export const getMedTerminology = (item: any) => {
  if (!item) return { action: 'dùng', note: 'Lưu ý: Đọc kỹ hướng dẫn sử dụng trước khi dùng.', btn: 'DÙNG' };
  
  const combined = `${item.MedicineName} ${item.Dose} ${item.Usage} ${item.Quantity}`.toLowerCase();

  if (combined.includes('viên')) {
    return { action: 'uống', note: 'Lưu ý: Uống thuốc với nhiều nước lọc.', btn: 'UỐNG' };
  }
  if (combined.includes('tra mắt') || combined.includes('mỡ') || combined.includes('gel') || combined.includes('tuýp')) {
    return { action: 'tra', note: 'Lưu ý: Rửa tay sạch bằng xà phòng trước khi tra.', btn: 'TRA THUỐC' };
  }
  if (combined.includes('miếng') || combined.includes('dùng ngoài') || combined.includes('chườm')) {
    return { action: 'dùng ngoài', note: 'Lưu ý: Vệ sinh vùng da/mắt trước khi sử dụng.', btn: 'SỬ DỤNG' };
  }
  // Mặc định là thuốc nhỏ mắt (giọt, lọ...)
  return { action: 'nhỏ', note: 'Lưu ý: Rửa tay sạch bằng xà phòng trước khi nhỏ.', btn: 'NHỎ THUỐC' };
};