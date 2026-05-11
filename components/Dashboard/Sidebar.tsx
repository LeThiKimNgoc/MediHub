import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

const menuItems = [
  { id: 'admin', icon: 'home-variant-outline', label: 'Trang chủ', route: '/admin' },
  { id: 'patient', icon: 'account-outline', label: 'Hồ sơ bệnh nhân', route: '/patient' },
  { id: 'calendar', icon: 'calendar-blank-outline', label: 'Lịch hẹn & Nhắc nhở', route: '/add-patient' },
  { id: 'home', icon: 'format-list-bulleted', label: 'Danh mục D&C', route: '/home' },
  { id: 'report', icon: 'chart-bar', label: 'Báo cáo thống kê', route: '/report' },
  { id: 'users', icon: 'account-group-outline', label: 'Quản lý người dùng', route: '/users' },
  // 🔥 ĐÃ FIX: Đổi '#' thành '/settings'
  { id: 'settings', icon: 'cog-outline', label: 'Cài đặt hệ thống', route: '/settings' },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname(); 
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hoverProps = (id: string) => Platform.OS === 'web' ? {
    onMouseEnter: () => setHoveredId(id),
    onMouseLeave: () => setHoveredId(null)
  } : {};

  const renderTooltip = (id: string, text: string) => {
    if (isCollapsed && hoveredId === id && Platform.OS === 'web') {
      return (
        <View style={styles.tooltipWrapper} pointerEvents="none">
          <View style={styles.tooltipArrow} />
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>{text}</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View 
      style={[
        styles.sidebarContainer, 
        { width: isCollapsed ? 84 : 260 },
        Platform.OS === 'web' && { transition: 'width 0.3s ease' } as any 
      ]}
    >
      {/* Logo */}
      <View style={[styles.logoSection, isCollapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
        <Image source={require('../../assets/images/favicon.png')} style={styles.logoImage} resizeMode="contain" />
        {!isCollapsed && <Text style={styles.brandText}>Medi<Text style={{ fontWeight: '900', color: '#0F766E' }}>Hub</Text></Text>}
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.menuItem, 
                isActive && styles.menuItemActive,
                isCollapsed && { justifyContent: 'center', paddingHorizontal: 0 } 
              ]}
              onPress={() => item.route !== '#' && router.push(item.route as any)}
              {...hoverProps(item.id) as any} 
            >
              <MaterialCommunityIcons 
                name={item.icon as any} 
                size={24} 
                color={isActive ? '#0F766E' : '#64748B'} 
              />
              {!isCollapsed && (
                <Text style={[styles.menuText, isActive && styles.menuTextActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
              {renderTooltip(item.id, item.label)}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footerSection}>
        <TouchableOpacity 
          style={[styles.menuItem, isCollapsed && { justifyContent: 'center', paddingHorizontal: 0 }]} 
          onPress={onToggleCollapse}
          {...hoverProps('toggle') as any}
        >
          <MaterialCommunityIcons 
            name={isCollapsed ? "chevron-right-circle-outline" : "chevron-left-circle-outline"} 
            size={24} 
            color="#64748B" 
          />
          {!isCollapsed && <Text style={styles.menuText}>Thu gọn</Text>}
          {renderTooltip('toggle', 'Mở rộng Menu')}
        </TouchableOpacity>
        
        <View 
          style={[styles.supportBox, isCollapsed && { justifyContent: 'center', padding: 12, backgroundColor: 'transparent' }]}
          {...hoverProps('support') as any}
        >
          <MaterialCommunityIcons name="headset" size={24} color="#0F766E" />
          {!isCollapsed && (
            <View style={styles.supportTextGroup}>
              <Text style={styles.supportTitle}>Hỗ trợ</Text>
              <Text style={styles.supportPhone}>1900 1234</Text>
            </View>
          )}
          {renderTooltip('support', 'Hotline: 1900 1234')}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0', 
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    height: '100%',
    zIndex: 100, 
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 40,
  },
  logoImage: { width: 48, height: 48 },
  brandText: { fontSize: 32, fontWeight: '700', color: '#0F172A', marginLeft: 16, letterSpacing: -0.5 },
  
  menuSection: { flex: 1, gap: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuItemActive: { backgroundColor: '#F0FDFA' }, 
  menuText: { fontSize: 15, fontWeight: '600', color: '#64748B', marginLeft: 16, flexShrink: 1 },
  menuTextActive: { color: '#0F766E', fontWeight: '800' },
  
  footerSection: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 20 },
  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  supportTextGroup: { marginLeft: 12 },
  supportTitle: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  supportPhone: { fontSize: 15, fontWeight: '800', color: '#0F766E', marginTop: 2 },

  tooltipWrapper: {
    position: 'absolute',
    left: 60, 
    top: '50%',
    transform: [{ translateY: -15 }], 
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999, 
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#1E293B', 
  },
  tooltipBox: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' } as any) 
  }
});