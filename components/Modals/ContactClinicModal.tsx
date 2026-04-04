import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface ContactClinicModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ContactClinicModal: React.FC<ContactClinicModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons name="hospital-building" size={36} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={styles.modalTitle}>Liên Hệ Phòng Khám</Text>
          </View>
          <View style={{ gap: 16 }}>
            <TouchableOpacity style={[styles.sosMenuBtn, { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]} onPress={() => { onClose(); Linking.openURL('https://zalo.me/0901234567'); }}>
              <MaterialCommunityIcons name="chat-processing" size={32} color="#0284C7" />
              <Text style={[styles.sosMenuText, { color: '#0284C7' }]}>Nhắn tin Zalo ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sosMenuBtn, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]} onPress={onClose}>
              <Text style={[styles.sosMenuText, { color: colors.danger, marginLeft: 0, textAlign: 'center', width: '100%' }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  sosMenuBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1 },
  sosMenuText: { fontSize: 18, fontWeight: 'bold', marginLeft: 16 },
});