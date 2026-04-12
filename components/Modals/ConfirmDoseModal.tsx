import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
// Import thêm getMedTerminology
import { getEyeIndicator, getMedTerminology } from '../../utils/helpers'; 

interface ConfirmDoseModalProps {
  visible: boolean;
  med: any;
  isLogging: boolean;
  onSubmit: (status: string) => void;
  onClose: () => void;
}

export const ConfirmDoseModal: React.FC<ConfirmDoseModalProps> = ({ visible, med, isLogging, onSubmit, onClose }) => {
  if (!med) return null;
  const eyeInfo = getEyeIndicator(med.Usage || med.Dose);
  
  // Khai báo terms để lấy từ vựng động
  const terms = getMedTerminology(med); 

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            {/* Chữ trên tiêu đề cũng tự đổi theo thuật ngữ */}
            <Text style={styles.modalTitle}>Xác Nhận {terms.btn}</Text>
          </View>
          
          <View style={styles.medInfoBox}>
            <Text style={styles.medNameModal}>{med.MedicineName}</Text>
            <Text style={styles.medTimeModal}>Giờ hẹn: {med.Time}</Text> 
            {eyeInfo && (
               <View style={[styles.eyeBadge, { backgroundColor: eyeInfo.color }]}>
                 <Text style={styles.eyeBadgeText}>{eyeInfo.label}</Text>
               </View>
            )}
          </View>

          {isLogging ? (
            <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 40}} />
          ) : (
            <View style={styles.logActions}>
              <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusDone}]} onPress={() => onSubmit('Đã sử dụng')}>
                <MaterialCommunityIcons name="check-circle" size={36} color="white" />
                {/* Đổi chữ ở đây */}
                <Text style={styles.logBtnText}>Đã {terms.btn}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusSnooze}]} onPress={() => onSubmit('Nhắc lại')}>
                <MaterialCommunityIcons name="alarm-snooze" size={36} color="white" />
                {/* Và ở đây */}
                <Text style={styles.logBtnText}>Chưa {terms.btn}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLogging && (
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose}>
              <Text style={{color: colors.textLight, fontWeight: 'bold', fontSize: 18}}>BỎ QUA</Text>
            </TouchableOpacity>
          )}
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
  medInfoBox: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#E2E8F0' },
  medNameModal: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 10, textAlign: 'center' },
  medTimeModal: { fontSize: 18, color: colors.timeColor, fontWeight: 'bold', marginBottom: 5 },
  eyeBadge: { alignSelf: 'center', marginVertical: 8, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  logBtn: { flex: 1, paddingVertical: 18, borderRadius: 20, alignItems: 'center', elevation: 3 },
  logBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 8, textAlign: 'center' },
  modalBtnCancel: { marginTop: 25, padding: 15, alignItems: 'center' },
});