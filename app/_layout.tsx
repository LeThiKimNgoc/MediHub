import { Stack, usePathname } from 'expo-router';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useEffect, useState, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sidebar from '../components/Dashboard/Sidebar';

// 1. TẠO BẢNG MÀU TOÀN CỤC
export const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
  theme: { bg: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', muted: '#64748B', border: '#E2E8F0', primary: '#0F766E', primaryLight: '#F0FDFA' }
});

export const useTheme = () => useContext(ThemeContext);

export default function Layout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [isDark, setIsDark] = useState(false);

  // Load trạng thái Dark Mode từ bộ nhớ khi mở app
  useEffect(() => {
    AsyncStorage.getItem('appPrefs').then(prefs => {
      if (prefs) {
        const { darkMode } = JSON.parse(prefs);
        setIsDark(darkMode);
      }
    });
  }, []);

  const toggleTheme = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    await AsyncStorage.setItem('appPrefs', JSON.stringify({ darkMode: newDark, notif: true }));
  };

  // Định nghĩa màu dựa trên trạng thái isDark
  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    primary: '#0F766E',
    primaryLight: isDark ? '#134E4A' : '#F0FDFA',
  };

  const noSidebarRoutes = ['/', '/index'];
  const showSidebar = !noSidebarRoutes.includes(pathname) && isDesktop;
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (pathname === '/admin' || pathname === '/home') setIsCollapsed(false);
    else setIsCollapsed(true);
  }, [pathname]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.bg }}>
        {showSidebar && (
          <Sidebar 
            isCollapsed={isCollapsed} 
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
          />
        )}
        <View style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
        </View>
      </View>
    </ThemeContext.Provider>
  );
}