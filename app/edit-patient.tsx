import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

// === BẢNG MÀU CAM PASTEL ===
const colors = {
  bg: '#F5F9FC', primary: '#FFDDB0', headerText: '#4E342E', textDark: '#455A64', textLight: '#78909C', white: '#FFFFFF',
  chipBg: '#FFF3E0', chipSelectedBg: '#FFB74D', chipText: '#6D4C41', chipSelectedText: '#FFFFFF', success: '#43A047', warning: '#F57C00'
};

export default function EditPatientScreen() {
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  
  // Nhận dữ liệu cũ từ trang danh sách truyền sang
  const params = useLocalSearchParams();
  
  const [formData, setFormData] = useState({
    action: 'update',
    sheetName: 'Patients', 
    id: params.PatientID || '', // Dùng PatientID làm key để báo cho Google Sheet biết cần sửa dòng nào
    PatientID: params.PatientID || '',
    Name: params.Name || '',
    Age: params.Age || '',
    Gender: params.Gender || 'Nam',
    ICD: params.ICD || '',
    DayStart: params.DayStart || '' // Giữ nguyên ngày khám cũ
  });

  const genderOptions = ['Nam', 'Nữ', 'Khác'];

  const handleChange = (name, value) => { setFormData({ ...formData, [name]: value }); };

  const submitData = async () => {
    if (!formData.Name || !formData.Age) {
      Alert.alert('Lỗi', 'Tên và Tuổi không được để trống!');
      return;
    }

    setLoading(true);
    // 🔥 ĐIỀN ĐƯỜNG LINK WEB APP URL CỦA BẠN VÀO ĐÂY:
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbz5AnG5s_o2-nnXYYH0P0kb3-3N0QFgNOzg_Ix0KLDoG4SBvuqmouSLxfGPXRj068-O7A/exec';

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(formData)
      });
      
      const textResult = await response.text();
      const result = JSON.parse(textResult);
        
      if (result.status === 'success') {
        setToastVisible(true);
        setTimeout(() => {
          setToastVisible(false);
          router.back(); // Sửa xong, hiện thông báo 1.5 giây rồi tự động lùi về danh sách
        }, 1500);
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể lưu dữ liệu.');
      }
    } catch (error) {
      Alert.alert('Lỗi mạng', 'Không thể kết nối.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {toastVisible && (
        <View style={styles.toastContainer}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
          <Text style={styles.toastText}>Cập nhật thành công!</Text>
        </View>
      )}

      <View style={[styles.appHeader, { backgroundColor: '#FFF3E0' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.warning} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.warning }]}>Sửa Hồ Sơ Bệnh Nhân</Text>
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mã Bệnh Nhân (Không được sửa)</Text>
          <TextInput style={[styles.input, { backgroundColor: '#EEEEEE', color: '#9E9E9E' }]} value={formData.PatientID} editable={false} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và Tên (*)</Text>
          <TextInput style={styles.input} value={formData.Name} onChangeText={(text) => handleChange('Name', text)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tuổi (*)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={formData.Age} onChangeText={(text) => handleChange('Age', text)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giới Tính</Text>
          <View style={styles.chipsContainer}>
            {genderOptions.map((opt, i) => (
              <TouchableOpacity key={i} style={[styles.chip, formData.Gender === opt ? styles.chipSelected : null]} onPress={() => handleChange('Gender', opt)}>
                <Text style={[styles.chipText, formData.Gender === opt ? styles.chipTextSelected : null]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mã ICD / Chẩn đoán</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline={true} numberOfLines={2} value={formData.ICD} onChangeText={(text) => handleChange('ICD', text)} />
        </View>

        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.warning }]} onPress={submitData} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>CẬP NHẬT DỮ LIỆU</Text>}
        </TouchableOpacity>
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  toastContainer: { position: 'absolute', top: 75, right: 20, backgroundColor: colors.success, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  toastText: { color: colors.white, fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  appHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 15, elevation: 4 }, backButton: { marginRight: 15, padding: 5 }, headerTitle: { fontSize: 22, fontWeight: 'bold' },
  formContainer: { flex: 1, padding: 20 }, inputGroup: { marginBottom: 18 }, label: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: colors.textDark }, textArea: { height: 70, textAlignVertical: 'top' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 }, chip: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.chipBg, borderRadius: 25, borderWidth: 1, borderColor: colors.chipBg }, chipSelected: { backgroundColor: colors.chipSelectedBg, borderColor: colors.chipSelectedBg }, chipText: { fontSize: 15, color: colors.chipText, fontWeight: '500' }, chipTextSelected: { color: colors.chipSelectedText, fontWeight: '700' },
  submitButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3 }, submitText: { color: colors.white, fontSize: 16, fontWeight: 'bold' }
});