import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications'; // 🔥 Thêm thư viện gọi thông báo

export default function PatientHeader({ patientName, notiCount, onPressNoti }: any) {
  
  // 🔥 HÀM ẨN CỦA IT: Nhấn giữ Logo 2 giây để test thông báo Push Notification
  const handleSecretTestNotification = async () => {
    if (Platform.OS === 'web') {
      window.alert("Tính năng test Push Notification chỉ hoạt động trên thiết bị điện thoại thật (iOS/Android).");
      return;
    }

    Alert.alert("⚙️ Chế độ Debug", "Đang gửi thông báo thử nghiệm để kiểm tra đường truyền...");

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚙️ Phản hồi hệ thống",
          body: "Push Notification trên thiết bị này đang hoạt động tốt!",
          sound: true,
          badge: 1,
        },
        trigger: { seconds: 2 } as any, // 2 giây sau sẽ nổ thông báo
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi thông báo. Hãy kiểm tra lại quyền cho phép thông báo trong Cài đặt của máy.");
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {/* 🔥 ĐÃ ĐỔI VIEW THÀNH TOUCHABLE & GẮN SỰ KIỆN onLongPress (Nhấn giữ) */}
        <TouchableOpacity 
          style={styles.logoContainer} 
          onLongPress={handleSecretTestNotification} 
          delayLongPress={2000} // Phải nhấn giữ chính xác 2 giây mới kích hoạt
        >
          <Image source={require('../../assets/images/favicon.png')} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>
        
        <View>
          <Text style={styles.appName}>Medi<Text style={{fontWeight: '900', color: '#0F766E'}}>Hub</Text></Text>
          <Text style={styles.headerSubtitle}>Đồng hành cùng sức khỏe</Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.notiBtn} onPress={onPressNoti}>
          <MaterialCommunityIcons name="bell-outline" size={22} color="#1E293B" />
          {notiCount > 0 && (
            <View style={styles.notiBadge}>
              <Text style={styles.notiBadgeText}>{notiCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileBtn}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{patientName ? patientName.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { width: 40, height: 40, backgroundColor: '#CCFBF1', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logo: { width: 28, height: 28 },
  appName: { fontSize: 20, fontWeight: '700', color: '#334155', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: -2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notiBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  notiBadge: { position: 'absolute', top: 0, right: -2, backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: '#FFF' },
  notiBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  profileBtn: { padding: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' }
});