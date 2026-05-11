import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getEyeIndicator, getMedTerminology, getMedIcon } from '../../utils/helpers'; 

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
  const terms = getMedTerminology(med); 

  // 🔥 KIỂM TRA SỐ LẦN SNOOZE 🔥
  const snoozeCount = med.snoozeCount || 0;
  const MAX_SNOOZE = 2; // Giới hạn tối đa 2 lần nhắc lại
  const canSnooze = snoozeCount < MAX_SNOOZE;

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} disabled={isLogging}>
              <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Xác nhận {terms.btn.toLowerCase()}</Text>
          </View>
          
          <View style={styles.medInfoBox}>
            <View style={styles.imageContainer}>
              {med.ImageUrl ? (
                <Image source={{ uri: med.ImageUrl }} style={styles.medImage} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name={getMedIcon(med) as any} size={50} color={colors.primary} />
              )}
            </View>

            <Text style={styles.medNameModal}>{med.MedicineName}</Text>
            <Text style={styles.medTimeModal}>Giờ hẹn: {med.Time}</Text> 
            {eyeInfo && (
               <View style={[styles.eyeBadge, { backgroundColor: eyeInfo.color }]}>
                 <Text style={styles.eyeBadgeText}>{eyeInfo.label}</Text>
               </View>
            )}
          </View>

          {isLogging ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Đang ghi nhận...</Text>
            </View>
          ) : (
            <View style={{ gap: 15 }}>
              <View style={styles.logActions}>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusDone}]} onPress={() => onSubmit('Đã sử dụng')}>
                  <MaterialCommunityIcons name="check-circle" size={32} color="white" />
                  <Text style={styles.logBtnText}>Đã {terms.btn.toLowerCase()}</Text>
                </TouchableOpacity>

                {/* 🔥 NÚT NHẮC LẠI SẼ BỊ LÀM MỜ NẾU QUÁ GIỚI HẠN 🔥 */}
                <TouchableOpacity 
                  style={[styles.logBtn, {backgroundColor: canSnooze ? colors.statusSnooze : '#E2E8F0'}]} 
                  onPress={() => onSubmit('Nhắc lại')}
                  disabled={!canSnooze}
                >
                  <MaterialCommunityIcons name="alarm-snooze" size={32} color={canSnooze ? "white" : "#94A3B8"} />
                  <Text style={[styles.logBtnText, !canSnooze && {color: '#94A3B8'}]}>Chưa {terms.btn.toLowerCase()}</Text>
                </TouchableOpacity>
              </View>

              {/* 🔥 HIỆN CẢNH BÁO NẾU KHÔNG THỂ NHẮC LẠI NỮA 🔥 */}
              {!canSnooze && (
                 <View style={styles.warningBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#D97706" style={{marginTop: 2}} />
                    <Text style={styles.warningText}>
                      Bạn đã lùi lịch {MAX_SNOOZE} lần. Để tránh nguy cơ quá liều do quá sát giờ cữ tiếp theo, hệ thống không cho phép lùi thêm. Vui lòng sử dụng thuốc ngay hoặc chọn Bỏ qua lượt này!
                    </Text>
                 </View>
              )}

              <TouchableOpacity style={styles.skipActionBtn} onPress={() => onSubmit('Bỏ qua')}>
                <MaterialCommunityIcons name="close-circle-outline" size={22} color="#EF4444" />
                <Text style={styles.skipActionText}>Bỏ qua lượt này</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 15, marginRight: 12 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark }, 
  medInfoBox: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0' },
  imageContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'white', elevation: 2 },
  medImage: { width: '100%', height: '100%' },
  medNameModal: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 6, textAlign: 'center' },
  medTimeModal: { fontSize: 16, color: colors.timeColor, fontWeight: 'bold', marginBottom: 4 },
  eyeBadge: { alignSelf: 'center', marginVertical: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  logActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  logBtn: { flex: 1, paddingVertical: 15, borderRadius: 20, alignItems: 'center', elevation: 3 },
  logBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 6, textAlign: 'center' },
  loadingBox: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.textLight, fontWeight: '500' },
  skipActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 18, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECACA' },
  skipActionText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  
  // Style cho thông báo cảnh báo Y khoa
  warningBox: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 5 },
  warningText: { color: '#92400E', fontSize: 13, flex: 1, marginLeft: 10, lineHeight: 20, fontWeight: '500' }
});