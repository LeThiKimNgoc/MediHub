import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Platform, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

// === BẢNG MÀU CAM PASTEL ===
const colors = {
  bg: '#F5F9FC',
  primary: '#FFDDB0', 
  headerText: '#4E342E',
  textDark: '#455A64',
  textLight: '#78909C',
  white: '#FFFFFF',
  chipBg: '#FFF3E0',      
  chipSelectedBg: '#FFB74D', 
  chipText: '#6D4C41',
  chipSelectedText: '#FFFFFF',
  success: '#43A047'
};

export default function AddPatientScreen() {
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  
  const params = useLocalSearchParams();
  
  const [formData, setFormData] = useState({
    PatientID: '', 
    Name: '',
    Age: '',
    Gender: 'Nam',
    ICD: ''
  });

  const genderOptions = ['Nam', 'Nữ', 'Khác'];

  useEffect(() => {
    if (params?.scannedId) {
      setFormData(prev => ({ ...prev, PatientID: params.scannedId as string }));
    }
  }, [params?.scannedId]);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const submitData = async () => {
    if (!formData.PatientID || !formData.Name || !formData.Age) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập Mã BN, Tên và Tuổi của bệnh nhân!');
      else Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập Mã BN, Tên và Tuổi của bệnh nhân!');
      return;
    }

    setLoading(true);
    
    // Link Web App mới nhất của bạn
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';
    
    // 🔥 ĐÃ SỬA LẠI ACTION THÀNH 'addPatient' ĐỂ KHỚP VỚI BACKEND 🔥
    const payload = {
      action: 'addPatient',
      data: {
        PatientID: formData.PatientID,
        Name: formData.Name,
        Age: formData.Age,
        Gender: formData.Gender,
        ICD: formData.ICD
      }
    };

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      const textResult = await response.text();
      let result;
      
      try {
        result = JSON.parse(textResult);
      } catch (jsonError) {
        throw new Error('Lỗi từ Server: ' + textResult.substring(0, 50));
      }

      if (result.status === 'success') {
        setToastVisible(true);
        const tempName = formData.Name; 
        const tempId = formData.PatientID; 
        
        setFormData({ PatientID: '', Name: '', Age: '', Gender: 'Nam', ICD: '' });
        
        setTimeout(() => {
          setToastVisible(false);
          
          const routeParams = { pathname: '/patient', params: { autoAssignId: tempId, autoAssignName: tempName } };

          if (Platform.OS === 'web') {
              if (window.confirm(`Đã tạo hồ sơ cho ${tempName} thành công!\nBạn có muốn di chuyển đến Danh sách bệnh nhân để gán thuốc ngay không?`)) {
                  router.push(routeParams as any);
              }
          } else {
              Alert.alert(
                  'Tạo hồ sơ thành công!',
                  `Bạn có muốn di chuyển đến Danh sách bệnh nhân để gán thuốc cho ${tempName} ngay không?`,
                  [
                      { text: 'Lúc khác', style: 'cancel' },
                      { text: 'Đến trang Gán Thuốc', onPress: () => router.push(routeParams as any) }
                  ]
              );
          }
        }, 1000); 

      } else {
        if (Platform.OS === 'web') window.alert('Lỗi từ hệ thống: ' + (result.message || 'Có lỗi xảy ra.'));
        else Alert.alert('Lỗi từ hệ thống', result.message || 'Có lỗi xảy ra.');
      }

    } catch (error) {
      if (Platform.OS === 'web') window.alert('Lỗi mạng: Không thể gửi dữ liệu đi.');
      else Alert.alert('Lỗi mạng', 'Không thể gửi dữ liệu đi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {toastVisible && (
        <View style={styles.toastContainer}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
          <Text style={styles.toastText}>Đã lưu thành công!</Text>
        </View>
      )}

      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.headerText} />
        </TouchableOpacity>
        
        <View style={styles.logoCircleHeader}>
          <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
        </View>

        <Text style={styles.headerTitle}>Thêm Hồ Sơ</Text>
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.instruction}>Nhập thông tin bệnh nhân. Các trường STT và Ngày Khám sẽ được hệ thống tạo tự động.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mã Bệnh Nhân (*)</Text>
          <View style={[styles.inputContainer, { borderColor: colors.primary, borderWidth: 2 }]}>
            <TextInput 
              style={styles.inputWithIcon} 
              placeholder="Vd: BN-001" 
              placeholderTextColor={colors.textLight} 
              value={formData.PatientID} 
              onChangeText={(text) => handleChange('PatientID', text)} 
            />
            <TouchableOpacity 
              style={styles.qrButton} 
              onPress={() => router.push({ pathname: '/scan', params: { returnTo: '/add-patient' } } as any)}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và Tên (*)</Text>
          <TextInput style={styles.input} placeholder="Vd: Nguyễn Văn A" placeholderTextColor={colors.textLight} value={formData.Name} onChangeText={(text) => handleChange('Name', text)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tuổi (*)</Text>
          <TextInput style={styles.input} placeholder="Vd: 35" placeholderTextColor={colors.textLight} keyboardType="numeric" value={formData.Age} onChangeText={(text) => handleChange('Age', text)} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giới Tính</Text>
          <View style={styles.chipsContainer}>
            {genderOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.chip, formData.Gender === option ? styles.chipSelected : null]}
                onPress={() => handleChange('Gender', option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, formData.Gender === option ? styles.chipTextSelected : null]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mã ICD / Chẩn đoán</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Vd: J00, Viêm họng cấp..." multiline={true} numberOfLines={2} value={formData.ICD} onChangeText={(text) => handleChange('ICD', text)} />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={submitData} disabled={loading}>
          {loading ? (
             <ActivityIndicator color={colors.headerText} />
          ) : (
             <>
               <MaterialCommunityIcons name="account-check" size={24} color={colors.headerText} style={{marginRight: 8}} />
               <Text style={styles.submitText}>TẠO HỒ SƠ</Text>
             </>
          )}
        </TouchableOpacity>
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  
  toastContainer: {
    position: 'absolute',
    top: 75,
    right: 20,
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  toastText: { color: colors.white, fontSize: 14, fontWeight: 'bold', marginLeft: 8 },

  appHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 18, paddingHorizontal: 15, elevation: 4 },
  backButton: { marginRight: 15, padding: 5 },
  
  logoCircleHeader: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.headerText },
  formContainer: { flex: 1, padding: 20 },
  instruction: { fontSize: 14, color: '#D84315', marginBottom: 20, fontStyle: 'italic', backgroundColor: '#FFCCBC', padding: 10, borderRadius: 8 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: colors.textDark },
  textArea: { height: 70, textAlignVertical: 'top' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
  inputWithIcon: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: colors.textDark },
  qrButton: { padding: 12, backgroundColor: '#FFEDD5', borderLeftWidth: 1, borderLeftColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  chip: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.chipBg, borderRadius: 25, borderWidth: 1, borderColor: colors.chipBg },
  chipSelected: { backgroundColor: colors.chipSelectedBg, borderColor: colors.chipSelectedBg },
  chipText: { fontSize: 15, color: colors.chipText, fontWeight: '500' },
  chipTextSelected: { color: colors.chipSelectedText, fontWeight: '700' },

  submitButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3, borderWidth: 2, borderColor: colors.white },
  submitText: { color: colors.headerText, fontSize: 16, fontWeight: 'bold' }
});