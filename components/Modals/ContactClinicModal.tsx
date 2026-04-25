import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ContactClinicModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ContactClinicModal: React.FC<ContactClinicModalProps> = ({ visible, onClose }) => {
  // Hàm gọi điện thoại
  const handleCall = () => {
    const phoneNumber = Platform.OS === 'android' ? 'tel:0901234567' : 'telprompt:0901234567';
    Linking.openURL(phoneNumber);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.indicator} />
          
          <View style={styles.modalHeader}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="hospital-building" size={30} color="white" />
            </View>
            <View>
              <Text style={styles.modalTitle}>Hỗ Trợ Y Tế</Text>
              <Text style={styles.modalSubTitle}>Liên hệ với đội ngũ bác sĩ</Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {/* NÚT ZALO */}
            <TouchableOpacity 
              style={[styles.sosMenuBtn, { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' }]} 
              onPress={() => { onClose(); Linking.openURL('https://zalo.me/0901234567'); }}
            >
              <View style={[styles.miniIconBox, { backgroundColor: '#0284C7' }]}>
                <MaterialCommunityIcons name="chat-processing" size={24} color="white" />
              </View>
              <Text style={[styles.sosMenuText, { color: '#0369A1' }]}>Nhắn tin Zalo ngay</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#0369A1" />
            </TouchableOpacity>

            {/* NÚT GỌI ĐIỆN KHẨN CẤP */}
            <TouchableOpacity 
              style={[styles.sosMenuBtn, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]} 
              onPress={handleCall}
            >
              <View style={[styles.miniIconBox, { backgroundColor: colors.danger }]}>
                <MaterialCommunityIcons name="phone-in-talk" size={24} color="white" />
              </View>
              <Text style={[styles.sosMenuText, { color: colors.danger }]}>Gọi điện khẩn cấp</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.danger} />
            </TouchableOpacity>

            {/* NÚT ĐÓNG */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>ĐÓNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40 },
  indicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 15 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textDark },
  modalSubTitle: { fontSize: 14, color: colors.textLight },
  sosMenuBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, gap: 12 },
  miniIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sosMenuText: { fontSize: 17, fontWeight: 'bold', flex: 1 },
  closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeBtnText: { color: colors.textLight, fontWeight: 'bold', fontSize: 16 },
});