import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ProfileModalProps {
  visible: boolean;
  profileData: any;
  loadingProfile: boolean;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, profileData, loadingProfile, patientId, patientName, onClose, onLogout }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.profileModalOverlay}>
        <View style={styles.profileModalContent}>
          <View style={styles.indicator} />
          
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>Hồ Sơ Cá Nhân</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          {loadingProfile ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Đang đồng bộ dữ liệu...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* PHẦN AVATAR VÀ TÊN LỚN */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons name="account" size={60} color="white" />
                </View>
                <Text style={styles.nameText}>{profileData?.Name || patientName}</Text>
                <Text style={styles.idText}>ID: {profileData?.PatientID || patientId}</Text>
              </View>

              {/* KHỐI THÔNG TIN CHI TIẾT */}
              <View style={styles.infoContainer}>
                <InfoRow icon="calendar-account" label="Tuổi" value={profileData?.Age ? `${profileData.Age} tuổi` : '---'} />
                <InfoRow icon="gender-male-female" label="Giới tính" value={profileData?.Gender || '---'} />
                <InfoRow icon="file-document-edit-outline" label="Chẩn đoán" value={profileData?.ICD || 'Chưa có'} isStatus />
                <InfoRow icon="calendar-check" label="Ngày khám" value={profileData?.DayStart || '---'} isLast />
              </View>

              {/* NÚT ĐĂNG XUẤT */}
              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
                <Text style={styles.logoutText}>Đăng xuất khỏi thiết bị</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Component con để hiển thị từng dòng thông tin cho đẹp
const InfoRow = ({ icon, label, value, isStatus = false, isLast = false }: any) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.labelGroup}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, isStatus && { color: colors.timeColor, fontWeight: 'bold' }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  profileModalContent: { backgroundColor: 'white', width: '100%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '85%' },
  indicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  profileTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textDark },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  loaderContainer: { paddingVertical: 60, alignItems: 'center' },
  loaderText: { color: colors.textLight, marginTop: 15, fontSize: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 25 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, marginBottom: 15 },
  nameText: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  idText: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  infoContainer: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  labelGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 16, color: colors.textLight, fontWeight: '500' },
  infoValue: { fontSize: 16, color: colors.textDark, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 20 },
  logoutBtn: { flexDirection: 'row', paddingVertical: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 25, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});