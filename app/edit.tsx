import React, { useState } from 'react';
// 🔥 Bổ sung thêm thẻ Image vào đây 🔥
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const colors = {
  bg: '#F5F9FC', primary: '#AED9E0', headerText: '#37474F', textDark: '#455A64', textLight: '#78909C', white: '#FFFFFF',
  chipBg: '#E0F2F1', chipSelectedBg: '#AED9E0', chipText: '#546E7A', chipSelectedText: '#37474F', warning: '#F57C00'
};

export default function EditMedicineScreen() {
  const [loading, setLoading] = useState(false);
  
  // Nhận dữ liệu cũ từ trang chủ truyền sang
  const params = useLocalSearchParams();
  
  const [formData, setFormData] = useState({
    action: 'update', // Báo cho Google Sheet biết đây là lệnh sửa
    id: params.ID || '',
    MedicineName: params.MedicineName || '',
    ActiveIngredient: params.ActiveIngredient || '',
    PackingSpecifications: params.PackingSpecifications || '',
    Use: params.Use || 'Uống',
    Note: params.Note || 'Thuốc kê đơn'
  });

  const usageOptions = ['Uống', 'Nhỏ mắt', 'Tra mắt', 'Dùng ngoài'];
  const noteOptions = ['Thuốc kê đơn', 'Thuốc không kê đơn'];

  const handleChange = (name, value) => { setFormData({ ...formData, [name]: value }); };

  const submitData = async () => {
    if (!formData.MedicineName) {
      Alert.alert('Lỗi', 'Tên thuốc không được để trống!');
      return;
    }

    setLoading(true);
    // 🔥 ĐIỀN ĐƯỜNG LINK WEB APP URL VÀO ĐÂY:
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.status === 'success') {
        Alert.alert('Thành công', 'Đã cập nhật thông tin thuốc!');
        router.back(); 
      } else { Alert.alert('Lỗi', 'Không thể lưu dữ liệu.'); }
    } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối.'); } 
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.appHeader, { backgroundColor: '#FFF3E0' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.warning} />
        </TouchableOpacity>

        {/* 🔥 BÊ ẢNH FAVICON NỀN TRẮNG VÀO ĐÂY 🔥 */}
        <View style={styles.logoCircleHeader}>
          <Image source={require('../assets/images/favicon.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
        </View>

        <Text style={[styles.headerTitle, { color: colors.warning }]}>Sửa Thông Tin Thuốc</Text>
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}><Text style={styles.label}>Tên Thuốc (*)</Text><TextInput style={styles.input} value={formData.MedicineName} onChangeText={(text) => handleChange('MedicineName', text)} /></View>
        <View style={styles.inputGroup}><Text style={styles.label}>Hoạt Chất</Text><TextInput style={styles.input} value={formData.ActiveIngredient} onChangeText={(text) => handleChange('ActiveIngredient', text)} /></View>
        <View style={styles.inputGroup}><Text style={styles.label}>Quy Cách Đóng Gói</Text><TextInput style={styles.input} value={formData.PackingSpecifications} onChangeText={(text) => handleChange('PackingSpecifications', text)} /></View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cách Dùng</Text>
          <View style={styles.chipsContainer}>
            {usageOptions.map((opt, i) => (
              <TouchableOpacity key={i} style={[styles.chip, formData.Use === opt ? styles.chipSelected : null]} onPress={() => handleChange('Use', opt)}>
                <Text style={[styles.chipText, formData.Use === opt ? styles.chipTextSelected : null]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phân Loại Thuốc</Text>
          <View style={styles.chipsContainer}>
            {noteOptions.map((opt, i) => (
              <TouchableOpacity key={i} style={[styles.chip, formData.Note === opt ? styles.chipSelected : null]} onPress={() => handleChange('Note', opt)}>
                <Text style={[styles.chipText, formData.Note === opt ? styles.chipTextSelected : null]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  appHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 15, elevation: 4 },
  backButton: { marginRight: 15, padding: 5 }, 
  
  // 🔥 Thêm Style cho Logo trên Header 🔥
  logoCircleHeader: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  formContainer: { flex: 1, padding: 20 }, inputGroup: { marginBottom: 18 }, label: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: colors.textDark },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.chipBg, borderRadius: 25, borderWidth: 1, borderColor: colors.chipBg },
  chipSelected: { backgroundColor: colors.chipSelectedBg, borderColor: colors.chipSelectedBg },
  chipText: { fontSize: 14, color: colors.chipText, fontWeight: '500' }, chipTextSelected: { color: colors.chipSelectedText, fontWeight: '700' },
  submitButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: 'bold' }
});