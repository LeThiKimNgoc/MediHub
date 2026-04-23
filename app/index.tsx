import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Modal, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Papa from 'papaparse';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';

const colors = {
  bg: '#F8FAFC', brandPrimary: '#0F766E', brandSecondary: '#14B8A6', headerText: '#0F172A',
  cardBg: '#FFFFFF', textDark: '#1E293B', textLight: '#64748B', actionBlack: '#1E293B',  
  actionTeal: '#0F766E', white: '#FFFFFF', secondary: '#E0F2FE'
};

export default function LoginScreen() {
  const [role, setRole] = useState('patient'); 
  const [patientId, setPatientId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingMemory, setIsCheckingMemory] = useState(true);

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    const checkAutoLogin = async () => {
      try {
        const savedId = await AsyncStorage.getItem('patientId');
        const savedName = await AsyncStorage.getItem('patientName');
        
        if (savedId && savedName) {
          router.replace({ pathname: '/patient-home', params: { id: savedId, name: savedName } } as any);
        } else {
          setIsCheckingMemory(false);
        }
      } catch (error) {
        setIsCheckingMemory(false);
      }
    };
    checkAutoLogin();
  }, []);

  // --- 1. XỬ LÝ ĐĂNG NHẬP BỆNH NHÂN ---
  const handlePatientLogin = () => {
    if (!patientId.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập hoặc quét Mã Bệnh Nhân của bạn.');
      return;
    }

    setLoading(true);
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    
    // Thêm thần chú chống lưu cache
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0&t=${new Date().getTime()}`;

    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            const patient = results.data.find((p: any) => p.PatientID === patientId.trim().toUpperCase());
            setLoading(false);
            if (patient) {
              setPatientId(''); 
              await AsyncStorage.setItem('patientId', patient.PatientID);
              await AsyncStorage.setItem('patientName', patient.Name);
              router.replace({ pathname: '/patient-home', params: { id: patient.PatientID, name: patient.Name } } as any);
            } else {
              Alert.alert('Lỗi đăng nhập', 'Không tìm thấy Mã Bệnh Nhân này trên hệ thống.');
            }
          }
        });
      })
      .catch(err => {
        setLoading(false);
        Alert.alert('Lỗi kết nối', 'Vui lòng kiểm tra lại mạng Internet.');
      });
  };

  // --- 2. XỬ LÝ ĐĂNG NHẬP ADMIN BẰNG API GOOGLE SHEET ---
  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu.');
      else Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Tài khoản và Mật khẩu.');
      return;
    }

    setLoading(true);
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';
    
    // Gọi lệnh login qua phương thức GET (đã được định nghĩa trong Mã.gs của bạn)
    const urlWithParams = `${scriptUrl}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    try {
      const response = await fetch(urlWithParams);
      const textResult = await response.text();
      let result;
      try {
         result = JSON.parse(textResult);
      } catch (e) {
         throw new Error('Lỗi máy chủ');
      }

      if (result.status === 'success') {
        router.replace('/admin');
      } else {
        if (Platform.OS === 'web') window.alert('Tài khoản hoặc mật khẩu không chính xác!');
        else Alert.alert('Lỗi đăng nhập', 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch (error) {
      if (Platform.OS === 'web') window.alert('Lỗi kết nối, vui lòng thử lại.');
      else Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert('Chưa cấp quyền', 'Vui lòng cho phép ứng dụng sử dụng Camera để quét mã.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => {
    setShowScanner(false);
    setPatientId(data.trim().toUpperCase());
  };

  if (isCheckingMemory) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={{ marginTop: 15, color: colors.brandPrimary, fontWeight: 'bold' }}>Đang tải dữ liệu hồ sơ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {showScanner && (
        <Modal visible={showScanner} animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Quét Mã HIS / Toa Thuốc</Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <CameraView 
              style={{ flex: 1 }} 
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"] }}
              onBarcodeScanned={handleBarcodeScanned}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerBox} />
                <Text style={styles.scannerText}>Đưa mã QR trên toa thuốc vào khung hình</Text>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        <View style={styles.backgroundIcons}>
          <MaterialCommunityIcons name="pill" size={160} color="#E2E8F0" style={styles.iconPos1} />
          <MaterialCommunityIcons name="heart-pulse" size={180} color="#E2E8F0" style={styles.iconPos2} />
          <MaterialCommunityIcons name="medical-bag" size={120} color="#E2E8F0" style={styles.iconPos3} />
        </View>

        <View style={styles.headerContainer}>
          <View style={styles.brandBox}>
            <View style={styles.brandRow}>
              <View style={styles.logoCircle}>
                <Image source={require('../assets/images/favicon.png')} style={{ width: 34, height: 34 }} resizeMode="contain" />
              </View>
              <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
            </View>
          </View>
          <Text style={styles.slogan}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
        </View>

        <View style={styles.formContainer}>
          
          <View style={styles.roleTabs}>
            <TouchableOpacity style={[styles.roleTab, role === 'patient' && styles.roleTabActive]} onPress={() => setRole('patient')}>
              <MaterialCommunityIcons name="account-heart" size={20} color={role === 'patient' ? colors.brandPrimary : colors.textLight} />
              <Text style={[styles.roleTabText, role === 'patient' && styles.roleTabTextActive]}>Bệnh Nhân</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.roleTab, role === 'admin' && styles.roleTabActive]} onPress={() => setRole('admin')}>
              <MaterialCommunityIcons name="shield-account" size={20} color={role === 'admin' ? colors.brandPrimary : colors.textLight} />
              <Text style={[styles.roleTabText, role === 'admin' && styles.roleTabTextActive]}>Quản Trị</Text>
            </TouchableOpacity>
          </View>

          {role === 'patient' && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Mã hồ sơ bệnh nhân:</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.brandSecondary, borderWidth: 2, paddingRight: 5 }]}>
                <MaterialCommunityIcons name="card-account-details-outline" size={24} color={colors.brandPrimary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Ví dụ: BN001" 
                  placeholderTextColor={colors.textLight}
                  value={patientId}
                  onChangeText={setPatientId}
                  autoCapitalize="characters"
                  outlineStyle="none" // Sửa lỗi viền xanh trên web
                />
                <TouchableOpacity onPress={handleOpenScanner} style={styles.qrScanBtn}>
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>*Nhập tay mã in trên sổ khám hoặc bấm nút quét QR.</Text>
              <TouchableOpacity style={[styles.loginBtn, {backgroundColor: colors.actionTeal}]} onPress={handlePatientLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>}
              </TouchableOpacity>
            </View>
          )}

          {role === 'admin' && (
            <View style={styles.inputSection}>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="account" size={24} color={colors.textLight} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Tên đăng nhập" placeholderTextColor={colors.textLight} value={username} onChangeText={setUsername} autoCapitalize="none" outlineStyle="none" />
              </View>
              <View style={[styles.inputWrapper, {marginTop: 15}]}>
                <MaterialCommunityIcons name="lock" size={24} color={colors.textLight} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor={colors.textLight} secureTextEntry={true} value={password} onChangeText={setPassword} outlineStyle="none" />
              </View>
              <TouchableOpacity style={[styles.loginBtn, {backgroundColor: colors.actionBlack}]} onPress={handleAdminLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>}
              </TouchableOpacity>
            </View>
          )}

        </View>
        <Text style={styles.footerText}>Phiên bản 2.0 • Chuyên nghiệp & Tin cậy</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  backgroundIcons: { ...StyleSheet.absoluteFillObject, zIndex: -1, overflow: 'hidden' },
  iconPos1: { position: 'absolute', top: -40, left: -50, opacity: 0.4, transform: [{rotate: '15deg'}] },
  iconPos2: { position: 'absolute', bottom: 10, right: -60, opacity: 0.4, transform: [{rotate: '-20deg'}] },
  iconPos3: { position: 'absolute', top: '35%', right: '5%', opacity: 0.2 },
  headerContainer: { alignItems: 'center', marginBottom: 35 },
  brandBox: { backgroundColor: 'rgba(15, 118, 110, 0.1)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(15, 118, 110, 0.2)', flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  brandMedi: { fontSize: 36, fontWeight: '600', color: colors.brandPrimary, marginLeft: 12, letterSpacing: 1, fontStyle: 'italic', textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  brandHub: { fontWeight: '900', color: colors.textDark },
  slogan: { fontSize: 13, color: colors.textLight, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  formContainer: { backgroundColor: colors.white, borderRadius: 24, padding: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  roleTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 5, marginBottom: 25 },
  roleTab: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 12, gap: 8 },
  roleTabActive: { backgroundColor: colors.white, elevation: 2 },
  roleTabText: { fontSize: 14, fontWeight: '700', color: colors.textLight },
  roleTabTextActive: { color: colors.brandPrimary },
  inputSection: { paddingHorizontal: 5 },
  label: { fontSize: 14, fontWeight: '800', color: colors.textDark, marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingLeft: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.textDark, fontWeight: '600' },
  qrScanBtn: { backgroundColor: colors.brandPrimary, padding: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  hintText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 12, lineHeight: 18, textAlign: 'center' },
  loginBtn: { borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 25, elevation: 3 },
  loginBtnText: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  footerText: { position: 'absolute', bottom: 30, alignSelf: 'center', fontSize: 12, color: colors.textLight, fontWeight: '600' },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scannerBox: { width: 250, height: 250, borderWidth: 3, borderColor: '#14B8A6', backgroundColor: 'transparent', borderRadius: 20 },
  scannerText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, textAlign: 'center' },
});