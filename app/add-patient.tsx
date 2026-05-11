import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; 

// 🔥 BẢNG MÀU CHUẨN Y TẾ ĐỒNG BỘ
const colors = {
  bg: '#F8FAFC', 
  primary: '#0F766E', 
  headerText: '#FFFFFF', 
  textDark: '#0F172A', 
  textLight: '#64748B', 
  white: '#FFFFFF',
  chipBg: '#F1F5F9',      
  chipSelectedBg: '#0F766E', 
  chipText: '#475569',
  chipSelectedText: '#FFFFFF',
  success: '#10B981', 
  dangerText: '#EF4444',
  scanBtnColor: '#8B5CF6' // Màu tím nổi bật cho nút Tải ảnh OCR
};

export default function AddPatientScreen() {
  const [loading, setLoading] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false); 
  const [toastVisible, setToastVisible] = useState(false);
  
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; 
  
  const [formData, setFormData] = useState({
    PatientID: '', 
    Name: '',
    Age: '',
    Gender: 'Nam',
    ICD: ''
  });

  const genderOptions = ['Nam', 'Nữ', 'Khác'];

  // Hứng dữ liệu từ trang /scan (Nếu dùng nút quét QR phụ)
  useEffect(() => {
    if (params) {
      setFormData(prev => ({ 
        ...prev, 
        PatientID: (params.scannedId as string) || prev.PatientID,
        Name: (params.scannedName as string) || prev.Name,
        Age: (params.scannedAge as string) || prev.Age,
        Gender: (params.scannedGender as string) || prev.Gender,
        ICD: (params.scannedICD as string) || prev.ICD,
      }));
    }
  }, [params]);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  // =======================================================
  // 🔥 HÀM XỬ LÝ TẢI ẢNH & GỌI GOOGLE GEMINI API 🔥
  // =======================================================
  const handleAIScan = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert("Cấp quyền", "Bạn cần cấp quyền truy cập thư viện ảnh để tải toa thuốc lên!");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: false, 
        quality: 0.8,
        base64: true, 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsAIScanning(true);
        let imageBase64 = result.assets[0].base64 || '';
        let mimeType = result.assets[0].mimeType || 'image/jpeg';
        
        // Xóa tiền tố "data:image/..." nếu chạy trên Web
        if (imageBase64.includes('base64,')) {
            imageBase64 = imageBase64.split('base64,')[1];
        }
        
        // 👉 ĐIỀN API KEY CỦA SẾP VÀO ĐÂY
        const API_KEY = 'AIzaSyCmXOzR1tZkWMno_2q97oVZgN3OWPbktTw';
        
        // Dùng đúng bản 2.5 Flash
        const MODEL_NAME = 'gemini-2.5-flash'; 
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

        const promptText = `
          Phân tích ảnh toa thuốc hoặc hồ sơ bệnh án này và trả về kết quả JSON thuần túy. 
          Định dạng chính xác như sau:
          {
            "PatientID": "Mã bệnh nhân (thường là dãy số/chữ nằm ngay kế bên hoặc bên dưới Tên bệnh nhân)",
            "Name": "Tên bệnh nhân", 
            "Age": "Tuổi (chỉ lấy số)", 
            "Gender": "Nam hoặc Nữ", 
            "ICD": "Chẩn đoán bệnh hoặc mã ICD"
          }
          Nếu không thấy thông tin, để trống "". Chỉ trả về JSON, không giải thích thêm.
        `;

        const response = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType: mimeType, data: imageBase64 } }] }]
          })
        });

        const data = await response.json();
        
        if (response.ok && data.candidates && data.candidates.length > 0) {
           let textResponse = data.candidates[0].content.parts[0].text;
           
           const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
           if (jsonMatch) {
              const extractedData = JSON.parse(jsonMatch[0]);

              setFormData(prev => ({
                ...prev,
                PatientID: extractedData.PatientID || prev.PatientID, 
                Name: extractedData.Name || prev.Name,        
                Age: extractedData.Age ? String(extractedData.Age).replace(/\D/g, '') : prev.Age, 
                Gender: extractedData.Gender || prev.Gender,
                ICD: extractedData.ICD || prev.ICD
              }));
              
              if (Platform.OS === 'web') window.alert('✅ Gemini đã đọc xong toàn bộ toa thuốc!');
              else Alert.alert('Hoàn tất', '✅ Gemini đã đọc xong toàn bộ toa thuốc!');
           } else {
             throw new Error("Không tìm thấy dữ liệu hợp lệ trong ảnh");
           }
        } else {
           const errorMsg = data.error?.message || 'Lỗi không xác định từ Gemini';
           console.error("Lỗi Gemini:", data);
           if (Platform.OS === 'web') window.alert(`Lỗi API: ${errorMsg}`);
           else Alert.alert('Lỗi API', errorMsg);
        }
        setIsAIScanning(false);
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      if (Platform.OS === 'web') window.alert('Lỗi mạng: Không thể phân tích hình ảnh này.');
      else Alert.alert('Lỗi mạng', 'Không thể kết nối với server Gemini.');
      setIsAIScanning(false);
    }
  };
  // =======================================================

  const submitData = async () => {
    if (!formData.PatientID || !formData.Name || !formData.Age) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập Mã BN, Tên và Tuổi của bệnh nhân!');
      else Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập Mã BN, Tên và Tuổi của bệnh nhân!');
      return;
    }

    setLoading(true);
    // Link Apps Script giữ nguyên
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';
    const today = new Date().toLocaleDateString('vi-VN');

    const payload = {
      action: 'addPatient',
      data: {
        PatientID: formData.PatientID,
        Name: formData.Name,
        Age: formData.Age,
        Gender: formData.Gender,
        ICD: formData.ICD,
        DayStart: today
      }
    };

    try {
      const response = await fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const textResult = await response.text();
      let result;
      try { result = JSON.parse(textResult); } catch (jsonError) { throw new Error('Lỗi Server: ' + textResult.substring(0, 50)); }

      if (result.status === 'success') {
        setToastVisible(true);
        const tempName = formData.Name; 
        const tempId = formData.PatientID; 
        
        setFormData({ PatientID: '', Name: '', Age: '', Gender: 'Nam', ICD: '' });
        
        setTimeout(() => {
          setToastVisible(false);
          const routeParams = { pathname: '/patient', params: { autoAssignId: tempId, autoAssignName: tempName } };
          if (Platform.OS === 'web') {
              if (window.confirm(`Đã tạo hồ sơ cho ${tempName}!\nĐến Danh sách bệnh nhân để gán thuốc ngay không?`)) router.push(routeParams as any);
          } else {
              Alert.alert('Thành công', `Đến trang Gán Thuốc cho ${tempName}?`, [{ text: 'Lúc khác', style: 'cancel' }, { text: 'Đến ngay', onPress: () => router.push(routeParams as any) }]);
          }
        }, 1000); 
      } else {
        if (Platform.OS === 'web') window.alert('Lỗi: ' + (result.message || 'Có lỗi xảy ra.'));
        else Alert.alert('Lỗi', result.message || 'Có lỗi xảy ra.');
      }
    } catch (error) {
      if (Platform.OS === 'web') window.alert('Lỗi mạng: Không thể gửi dữ liệu đi.');
      else Alert.alert('Lỗi mạng', 'Không thể gửi dữ liệu đi.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {toastVisible && (
        <View style={styles.toastContainer}><MaterialCommunityIcons name="check-circle" size={20} color={colors.white} /><Text style={styles.toastText}>Đã lưu thành công!</Text></View>
      )}

      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={28} color={colors.headerText} /></TouchableOpacity>
        <View style={styles.logoCircleHeader}><MaterialCommunityIcons name="hospital-box" size={22} color={colors.primary} /></View>
        <Text style={styles.headerTitle}>Thêm Hồ Sơ Mới</Text>
      </View>

      <ScrollView style={styles.scrollWrapper} keyboardShouldPersistTaps="handled">
        <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop]}>
          
          <View style={styles.instructionBox}>
            <MaterialCommunityIcons name="information" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.instructionText}>Các trường <Text style={{fontWeight: 'bold'}}>STT</Text> và <Text style={{fontWeight: 'bold'}}>Ngày Khám</Text> sẽ được hệ thống tạo tự động.</Text>
          </View>

          {/* 🔥 NÚT TẢI ẢNH GỌI GEMINI 🔥 */}
          <TouchableOpacity 
            style={[styles.scanButton, isAIScanning && { opacity: 0.8 }]} 
            onPress={handleAIScan} 
            disabled={isAIScanning}
            activeOpacity={0.8}
          >
            {isAIScanning ? (
              <ActivityIndicator color={colors.white} size="small" style={{ marginRight: 10 }} />
            ) : (
              <MaterialCommunityIcons name="google-circles-extended" size={24} color={colors.white} style={{ marginRight: 10 }} />
            )}
            <Text style={styles.scanButtonText}>
              {isAIScanning ? "AI Đang phân tích toa thuốc..." : "Tải Toa Thuốc Quét Bằng AI OCR"}
            </Text>
            {!isAIScanning && <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={colors.white} style={{ position: 'absolute', right: 20 }} />}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã Bệnh Nhân <Text style={styles.asterisk}>*</Text></Text>
            <View style={[styles.inputWrapper, { borderColor: colors.primary, borderWidth: 2 }]}>
              <MaterialCommunityIcons name="identifier" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput style={styles.inputWithIcon} placeholder="Vd: BN001" placeholderTextColor={'#94A3B8'} value={formData.PatientID} onChangeText={(text) => handleChange('PatientID', text)} outlineStyle="none" />
              
              <TouchableOpacity style={styles.qrButton} onPress={() => router.push({ pathname: '/scan', params: { returnTo: '/add-patient' } } as any)}>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và Tên <Text style={styles.asterisk}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput style={styles.inputWithIcon} placeholder="Vd: Nguyễn Văn A" placeholderTextColor={'#94A3B8'} value={formData.Name} onChangeText={(text) => handleChange('Name', text)} outlineStyle="none" />
            </View>
          </View>

          <View style={[styles.rowGroup, !isDesktop && { flexDirection: 'column', gap: 0 }]}>
            <View style={[styles.inputGroup, isDesktop && { flex: 1, marginRight: 20 }]}>
              <Text style={styles.label}>Tuổi <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <TextInput style={[styles.inputWithIcon, { paddingLeft: 16 }]} placeholder="Vd: 35" placeholderTextColor={'#94A3B8'} keyboardType="numeric" value={formData.Age} onChangeText={(text) => handleChange('Age', text)} outlineStyle="none" />
              </View>
            </View>

            <View style={[styles.inputGroup, isDesktop && { flex: 1 }]}>
              <Text style={styles.label}>Giới Tính</Text>
              <View style={styles.chipsContainer}>
                {genderOptions.map((option, index) => (
                  <TouchableOpacity key={index} style={[styles.chip, formData.Gender === option ? styles.chipSelected : null]} onPress={() => handleChange('Gender', option)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, formData.Gender === option ? styles.chipTextSelected : null]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã ICD / Chẩn đoán ban đầu</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={[styles.inputWithIcon, styles.textArea]} placeholder="Vd: J00, Viêm họng cấp..." placeholderTextColor={'#94A3B8'} multiline={true} numberOfLines={3} value={formData.ICD} onChangeText={(text) => handleChange('ICD', text)} outlineStyle="none" />
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={submitData} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.headerText} /> : <><MaterialCommunityIcons name="content-save-outline" size={20} color={colors.headerText} style={{marginRight: 8}} /><Text style={styles.submitText}>LƯU HỒ SƠ</Text></>}
          </TouchableOpacity>
          <View style={{height: 40}} /> 
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  toastContainer: { position: 'absolute', top: 30, right: 20, backgroundColor: colors.success, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  toastText: { color: colors.white, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  appHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 20, elevation: 4 },
  backButton: { marginRight: 15, padding: 5 },
  logoCircleHeader: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.headerText },
  scrollWrapper: { flex: 1 },
  formContainer: { flex: 1, padding: 20, width: '100%' },
  formContainerDesktop: { maxWidth: 800, alignSelf: 'center', backgroundColor: colors.white, marginTop: 24, padding: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  instructionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#CCFBF1' },
  instructionText: { fontSize: 13, color: '#0F766E', flex: 1, lineHeight: 20 },
  
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.scanBtnColor, paddingVertical: 16, borderRadius: 12, marginBottom: 24, shadowColor: colors.scanBtnColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  scanButtonText: { color: colors.white, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  asterisk: { color: colors.dangerText },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  inputIcon: { padding: 12, paddingTop: 14, backgroundColor: '#F8FAFC', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  inputWithIcon: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: colors.textDark, outlineStyle: 'none' as any },
  textArea: { height: 90, textAlignVertical: 'top' },
  qrButton: { padding: 12, backgroundColor: '#F0FDFA', borderLeftWidth: 1, borderLeftColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center' },
  rowGroup: { flexDirection: 'row' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: colors.chipBg, borderRadius: 25, borderWidth: 1, borderColor: '#E2E8F0' },
  chipSelected: { backgroundColor: colors.chipSelectedBg, borderColor: colors.chipSelectedBg, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  chipText: { fontSize: 14, color: colors.chipText, fontWeight: '600' },
  chipTextSelected: { color: colors.chipSelectedText, fontWeight: '800' },
  submitButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }
});