import React, { useState } from 'react';
// 🔥 Bổ sung thêm thẻ Image vào đây 🔥
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AddMedicineScreen() {
  const [loading, setLoading] = useState(false);
  
  // Nơi lưu trữ dữ liệu
  const [formData, setFormData] = useState({
    MedicineName: '',
    ActiveIngredient: '',
    PackingSpecifications: '',
    Use: 'Uống', // Mặc định
    Note: 'Thuốc kê đơn' // ĐÃ CẬP NHẬT: Mặc định là thuốc kê đơn
  });

  // Danh sách các tùy chọn cài sẵn
  const usageOptions = ['Uống', 'Nhỏ mắt', 'Tra mắt', 'Dùng ngoài'];
  const noteOptions = ['Thuốc kê đơn', 'Thuốc không kê đơn']; // ĐÃ CẬP NHẬT: Danh sách phân loại thuốc

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const submitData = async () => {
    if (!formData.MedicineName) {
      Alert.alert('Lỗi nhập liệu', 'Tên thuốc không được để trống!');
      return;
    }

    setLoading(true);
    
    // 🔥 ĐIỀN ĐƯỜNG LINK WEB APP URL CỦA BẠN VÀO ĐÂY:
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbz5AnG5s_o2-nnXYYH0P0kb3-3N0QFgNOzg_Ix0KLDoG4SBvuqmouSLxfGPXRj068-O7A/exec';

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        Alert.alert('Thành công!', 'Đã thêm thuốc mới vào hệ thống.');
        router.back(); 
      } else {
        Alert.alert('Lỗi', 'Không thể lưu dữ liệu, vui lòng thử lại.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi mạng', 'Không thể kết nối với máy chủ Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        
        {/* 🔥 BÊ ẢNH FAVICON NỀN TRẮNG VÀO ĐÂY 🔥 */}
        <View style={styles.logoCircleHeader}>
          <Image source={require('../assets/images/favicon.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
        </View>

        <Text style={styles.headerTitle}>Thêm Thuốc Mới</Text>
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.instruction}>Nhập thông tin chi tiết của loại thuốc mới để đưa vào cơ sở dữ liệu.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên Thuốc (*)</Text>
          <TextInput style={styles.input} placeholder="Vd: V.Rohto 15ml" value={formData.MedicineName} onChangeText={(text) => handleChange('MedicineName', text)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hoạt Chất</Text>
          <TextInput style={styles.input} placeholder="Vd: Tetrahydrozoline..." value={formData.ActiveIngredient} onChangeText={(text) => handleChange('ActiveIngredient', text)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quy Cách Đóng Gói</Text>
          <TextInput style={styles.input} placeholder="Vd: Lọ 15ml" value={formData.PackingSpecifications} onChangeText={(text) => handleChange('PackingSpecifications', text)} />
        </View>

        {/* --- PHẦN CHỌN CÁCH DÙNG (CÀI SẴN) --- */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cách Dùng</Text>
          <View style={styles.chipsContainer}>
            {usageOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chip,
                  formData.Use === option ? styles.chipSelected : null
                ]}
                onPress={() => handleChange('Use', option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.chipText,
                  formData.Use === option ? styles.chipTextSelected : null
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* --- PHẦN CHỌN LƯU Ý / PHÂN LOẠI (CÀI SẴN) --- */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phân Loại Thuốc (Lưu ý)</Text>
          <View style={styles.chipsContainer}>
            {noteOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chip,
                  formData.Note === option ? styles.noteChipSelected : null // Đổi màu khác một chút cho dễ phân biệt
                ]}
                onPress={() => handleChange('Note', option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.chipText,
                  formData.Note === option ? styles.chipTextSelected : null
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={submitData} disabled={loading}>
          {loading ? (
             <ActivityIndicator color="#fff" />
          ) : (
             <>
               <MaterialCommunityIcons name="content-save" size={24} color="#fff" style={{marginRight: 8}} />
               <Text style={styles.submitText}>LƯU VÀO HỆ THỐNG</Text>
             </>
          )}
        </TouchableOpacity>
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7f6' },
  appHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0056b3', paddingVertical: 18, paddingHorizontal: 15, elevation: 5 },
  backButton: { marginRight: 15, padding: 5 },
  
  // 🔥 Thêm Style cho Logo trên Header 🔥
  logoCircleHeader: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  formContainer: { flex: 1, padding: 20 },
  instruction: { fontSize: 15, color: '#64748b', marginBottom: 20, fontStyle: 'italic' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#0f172a' },
  
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    gap: 8, 
    marginTop: 5,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e2e8f0', 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipSelected: {
    backgroundColor: '#0284c7', // Xanh biển cho Cách dùng
    borderColor: '#0284c7',
  },
  noteChipSelected: {
    backgroundColor: '#059669', // Xanh lá cây cho Phân loại thuốc (để dễ phân biệt)
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#ffffff', 
    fontWeight: 'bold',
  },

  submitButton: { backgroundColor: '#ea580c', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});