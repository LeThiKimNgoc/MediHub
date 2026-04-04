import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ProfileModalProps {
  visible: boolean;
  profileData: any;
  loadingProfile: boolean;
  patientId: string;
  patientName: string;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, profileData, loadingProfile, patientId, patientName, onClose }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.profileModalOverlay}>
        <View style={styles.profileModalContent}>
          <View style={styles.profileHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name="clipboard-account" size={32} color={colors.primary} />
              <Text style={styles.profileTitle}>Hồ Sơ Bệnh Án</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={28} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          {loadingProfile ? (
            <View style={{paddingVertical: 50, alignItems: 'center'}}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{color: colors.textLight, marginTop: 15, fontSize: 16}}>Đang tải hồ sơ...</Text>
            </View>
          ) : (
            <View style={styles.profileDetails}>
              <View style={styles.profileRow}><Text style={styles.profileLabel}>Mã Bệnh Nhân:</Text><Text style={styles.profileValue}>{profileData?.PatientID || patientId}</Text></View>
              <View style={styles.profileRow}><Text style={styles.profileLabel}>Họ và Tên:</Text><Text style={styles.profileValue}>{profileData?.Name || patientName}</Text></View>
              <View style={styles.profileRow}><Text style={styles.profileLabel}>Tuổi:</Text><Text style={styles.profileValue}>{profileData?.Age ? `${profileData.Age} tuổi` : '---'}</Text></View>
              <View style={styles.profileRow}><Text style={styles.profileLabel}>Giới tính:</Text><Text style={styles.profileValue}>{profileData?.Gender || '---'}</Text></View>
              <View style={styles.profileRow}><Text style={styles.profileLabel}>Chẩn đoán:</Text><Text style={[styles.profileValue, {color: colors.timeColor, fontWeight: 'bold'}]}>{profileData?.ICD || 'Chưa cập nhật'}</Text></View>
              <View style={[styles.profileRow, {borderBottomWidth: 0}]}><Text style={styles.profileLabel}>Ngày khám:</Text><Text style={styles.profileValue}>{profileData?.DayStart || '---'}</Text></View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  profileModalContent: { backgroundColor: 'white', width: '90%', borderRadius: 30, padding: 25, elevation: 10 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 20 },
  profileTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark, marginLeft: 12 },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  profileDetails: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  profileLabel: { fontSize: 17, color: colors.textLight, fontWeight: '500' },
  profileValue: { fontSize: 17, color: colors.textDark, fontWeight: 'bold', textAlign: 'right', flex: 1, marginLeft: 15 },
});