import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COMMON_SYMPTOMS = ['Sốt', 'Ho', 'Mệt mỏi', 'Đau đầu', 'Chóng mặt', 'Buồn nôn', 'Đau bụng', 'Khó thở', 'Mờ mắt', 'Ngứa mắt'];

export default function SymptomModal({ visible, onClose, selectedSymptoms, onToggleSymptom, otherSymptom, onChangeOtherSymptom, onSubmit, sending }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bạn đang gặp vấn đề gì?</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.symptomGrid}>
            {COMMON_SYMPTOMS.map(s => (
              <TouchableOpacity key={s} style={[styles.symptomChip, selectedSymptoms.includes(s) && styles.symptomChipActive]} onPress={() => onToggleSymptom(s)}>
                <Text style={[styles.chipText, selectedSymptoms.includes(s) && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Triệu chứng khác / Mô tả chi tiết:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ví dụ: Tôi thấy cộm ở mắt trái..."
            multiline
            numberOfLines={3}
            value={otherSymptom}
            onChangeText={onChangeOtherSymptom}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={sending}>
            {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Gửi cảnh báo khẩn cấp</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: '55%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  symptomChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  symptomChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  chipText: { fontSize: 14, color: '#1E293B', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  textInput: { backgroundColor: '#F1F5F9', borderRadius: 15, padding: 15, fontSize: 15, textAlignVertical: 'top', marginBottom: 20, height: 80, color: '#1E293B' },
  submitBtn: { backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 15, alignItems: 'center', elevation: 3 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});