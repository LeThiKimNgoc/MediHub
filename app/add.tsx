import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AddMedicineScreen() {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    MedicineName: '',
    ActiveIngredient: '',
    PackingSpecifications: '',
    Use: 'Uống',
    Note: 'Thuốc kê đơn' 
  });

  const usageOptions = ['Uống', 'Nhỏ mắt', 'Tra mắt', 'Dùng ngoài'];
  const noteOptions = ['Thuốc kê đơn', 'Thuốc không kê đơn']; 

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const submitData = async () => {
    if (!formData.MedicineName) {
      Alert.alert('Lỗi nhập liệu', 'Tên thuốc không được để trống!');
      return;
    }

    setLoading(true);
    
    // Link Web App mới nhất của bạn
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

    // 🔥 ĐÃ SỬA LẠI CẤU TRÚC GỬI DỮ LIỆU ĐỂ KHỚP VỚI MÃ.GS 🔥
    const payload = {
      action: 'addMedicine', // Nhãn hiệu để phân loại
      data: formData
    };

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } // Cần dùng text/plain để tránh lỗi CORS
      });
      
      const textResult = await response.text();
      let result;
      try {
        result = JSON.parse(textResult);
      } catch (jsonError) {
        throw new Error('Lỗi Server: ' + textResult.substring(0, 50));
      }
      
      if (result.status === 'success') {
        Alert.alert('Thành công!', 'Đã thêm thuốc mới vào hệ thống.');
        router.back(); 
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể lưu dữ liệu.');
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phân Loại Thuốc (Lưu ý)</Text>
          <View style={styles.chipsContainer}>
            {noteOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chip,
                  formData.Note === option ? styles.noteChipSelected : null
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
    backgroundColor: '#0284c7', 
    borderColor: '#0284c7',
  },
  noteChipSelected: {
    backgroundColor: '#059669', 
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