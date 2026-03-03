import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';

export default function Layout() {
  useEffect(() => {
    // 💥 VŨ KHÍ TỐI THƯỢNG: Tiêm Icon và ÉP ĐỔI TÊN TAB 💥
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      
      // 🔥 ĐÂY RỒI: Lệnh ép trình duyệt đổi tên Tab ngay lập tức! 🔥
      // Bạn có thể sửa chữ trong ngoặc kép thành bất cứ tên gì bạn thích nha
      document.title = "MediHub";

      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: 'material-community';
          src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}