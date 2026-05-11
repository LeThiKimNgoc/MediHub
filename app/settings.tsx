import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, TextInput, Alert, ActivityIndicator, SafeAreaView, Platform, Modal, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTheme } from './_layout'; // 🔥 MƯỢN BỘ NÃO TRUNG TÂM

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme(); // Lấy theme và lệnh toggle
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ id: '', name: '', role: '' });
  const [showPassModal, setShowPassModal] = useState(false);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const id = await AsyncStorage.getItem('patientId') || 'Chưa rõ';
    const name = await AsyncStorage.getItem('patientName') || 'Người dùng';
    setUserInfo({ id, name, role: id.toLowerCase().includes('bn') ? 'Bệnh nhân' : 'Quản trị viên' });
  };

  const SettingItem = ({ icon, label, value, onPress, type = 'chevron', color = theme.text }: any) => (
    <TouchableOpacity style={[styles.item, { borderBottomColor: theme.border }]} onPress={onPress} disabled={type === 'switch'}>
      <View style={styles.itemLeft}>
        <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
      </View>
      {type === 'chevron' && <MaterialCommunityIcons name="chevron-right" size={20} color={theme.muted} />}
      {type === 'switch' && <Switch value={value} onValueChange={onPress} trackColor={{ true: theme.primary }} />}
      {type === 'text' && <Text style={{ color: theme.muted }}>{value}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.container}>
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}><Text style={styles.avatarText}>{userInfo.name.charAt(0).toUpperCase()}</Text></View>
          <View style={{ marginLeft: 20, flex: 1 }}>
            <Text style={[styles.userName, { color: theme.text }]}>{userInfo.name}</Text>
            <Text style={{ color: theme.muted }}>{userInfo.role} • ID: {userInfo.id}</Text>
          </View>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#EF4444' }]} onPress={async () => { await AsyncStorage.clear(); router.replace('/'); }}>
            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.gridContainer, !isDesktop && { flexDirection: 'column' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.muted }]}>Bảo mật</Text>
            <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <SettingItem icon="lock-reset" label="Đổi mật khẩu" onPress={() => setShowPassModal(true)} />
              <SettingItem icon="shield-check" label="Xác thực 2 lớp" type="switch" value={false} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.muted }]}>Giao diện</Text>
            <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* 🔥 NÚT GẠT QUYẾT ĐỊNH VẬN MỆNH CẢ APP */}
              <SettingItem icon="palette-outline" label="Chế độ tối (Dark Mode)" type="switch" value={isDark} onPress={toggleTheme} />
              <SettingItem icon="translate" label="Ngôn ngữ" type="text" value="Tiếng Việt" />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 20, marginBottom: 30, borderWidth: 1 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  userName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  outlineBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  gridContainer: { flexDirection: 'row', gap: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginLeft: 12, marginBottom: 12, letterSpacing: 1 },
  group: { borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 1 },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 15, fontWeight: '600', marginLeft: 14 },
});