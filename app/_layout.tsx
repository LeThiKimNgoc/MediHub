import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect } from 'react';

export default function Layout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      
      // 1. Ép tên Tab (Bạn đã có)
      document.title = "MediHub";

      // 2. 🔥 VŨ KHÍ MỚI: Ép trình duyệt hiểu đây là tiếng Việt
      document.documentElement.lang = 'vi';

      // 3. 🔥 VŨ KHÍ MỚI: Gắn thẻ meta "Cấm dịch" vào đầu trang
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.head.appendChild(meta);

      // 4. Tiêm Icon (Bạn đã có)
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