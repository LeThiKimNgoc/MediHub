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
          <View style={styles.indicator} />
          
          <View style={styles.modalHeader}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="clipboard-pulse-outline" size={28} color="white" />
            </View>
            <View>
              <Text style={styles.modalTitle}>Nhật Ký Triệu Chứng</Text>
              <Text style={styles.subtitle}>Theo dõi sức khỏe mắt hàng ngày</Text>
            </View>
          </View>
          
          <Text style={styles.questionText}>Hôm nay mắt bạn cảm thấy thế nào?</Text>

          <View style={styles.scrollWrapper}>
            <ScrollView 
              contentContainerStyle={styles.chipContainer}
              showsVerticalScrollIndicator={false}
            >
              {SYMPTOMS_LIST.map((symptom, index) => {
                const isSelected = selected.includes(symptom);
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.chip, isSelected && styles.chipSelected]} 
                    onPress={() => toggleSymptom(symptom)}
                    activeOpacity={0.6}
                  >
                    <MaterialCommunityIcons 
                      name={isSelected ? "check-circle" : "plus-circle-outline"} 
                      size={18} 
                      color={isSelected ? "#B91C1C" : "#94A3B8"} 
                      style={{marginRight: 6}}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{symptom}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            {isLogging ? (
              <ActivityIndicator size="large" color="#EF4444" style={{marginVertical: 10}} />
            ) : (
              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: selected.length === 0 ? '#10B981' : '#EF4444' }]} 
                onPress={handleSubmit}
              >
                <MaterialCommunityIcons 
                  name={selected.length === 0 ? "emoticon-happy-outline" : "send-check"} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.submitBtnText}>
                  {selected.length === 0 ? 'MẮT TÔI BÌNH THƯỜNG' : 'GỬI BÁO CÁO NGAY'}
                </Text>
              </TouchableOpacity>
            )}

            {!isLogging && (
              <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose}>
                <Text style={styles.cancelText}>ĐÓNG</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: 'white', 
    width: '100%', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    padding: 25, 
    maxHeight: '85%' 
  },
  indicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 15 },
  iconCircle: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textDark },
  subtitle: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  questionText: { fontSize: 16, color: colors.textDark, fontWeight: '600', marginBottom: 15, marginLeft: 5 },
  scrollWrapper: { maxHeight: 300, marginBottom: 20 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 5 },
  chip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  chipSelected: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  chipText: { color: '#64748B', fontSize: 15, fontWeight: '500' },
  chipTextSelected: { color: '#B91C1C', fontWeight: 'bold' },
  footer: { marginTop: 5 },
  submitBtn: { 
    flexDirection: 'row', 
    padding: 18, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalBtnCancel: { marginTop: 15, padding: 10, alignItems: 'center' },
  cancelText: { color: colors.textLight, fontWeight: 'bold', fontSize: 16 },
});