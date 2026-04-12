import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

const SYMPTOMS_LIST = ['Đỏ mắt', 'Cộm xốn', 'Nhức mỏi', 'Chảy nước mắt', 'Mờ mắt', 'Ngứa mắt', 'Sợ ánh sáng', 'Đổ ghèn'];

interface SymptomModalProps {
  visible: boolean;
  isLogging: boolean;
  onSubmit: (symptoms: string) => void;
  onClose: () => void;
}

export const SymptomModal: React.FC<SymptomModalProps> = ({ visible, isLogging, onSubmit, onClose }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSymptom = (symptom: string) => {
    if (selected.includes(symptom)) {
      setSelected(selected.filter(item => item !== symptom));
    } else {
      setSelected([...selected, symptom]);
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      onSubmit('Bình thường, không có triệu chứng');
    } else {
      onSubmit(selected.join(', '));
    }
    // Xóa form sau khi gửi
    setTimeout(() => setSelected([]), 1000);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons name="clipboard-pulse" size={32} color="#EF4444" style={{marginRight: 10}} />
            <Text style={styles.modalTitle}>Nhật ký triệu chứng</Text>
          </View>
          
          <Text style={styles.subtitle}>Hôm nay mắt bạn cảm thấy thế nào? (Có thể chọn nhiều)</Text>

          <ScrollView contentContainerStyle={styles.chipContainer}>
            {SYMPTOMS_LIST.map((symptom, index) => {
              const isSelected = selected.includes(symptom);
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.chip, isSelected && styles.chipSelected]} 
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{symptom}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isLogging ? (
            <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 20}} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <MaterialCommunityIcons name="send-check" size={24} color="white" />
              <Text style={styles.submitBtnText}>
                {selected.length === 0 ? 'TÔI CẢM THẤY BÌNH THƯỜNG' : 'GỬI TÌNH TRẠNG'}
              </Text>
            </TouchableOpacity>
          )}

          {!isLogging && (
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose}>
              <Text style={{color: colors.textLight, fontWeight: 'bold', fontSize: 16}}>ĐÓNG</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '90%', borderRadius: 24, padding: 25, elevation: 10, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textDark },
  subtitle: { fontSize: 15, color: colors.textLight, marginBottom: 20, fontStyle: 'italic' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  chipSelected: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  chipText: { color: colors.textDark, fontSize: 15, fontWeight: '500' },
  chipTextSelected: { color: '#B91C1C', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#EF4444', flexDirection: 'row', padding: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  modalBtnCancel: { marginTop: 20, padding: 10, alignItems: 'center' },
});