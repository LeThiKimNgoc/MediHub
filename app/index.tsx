import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Modal, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Papa from 'papaparse';

import { CameraView, useCameraPermissions } from 'expo-camera';

const colors = {
  bg: '#F8FAFC',
  brandPrimary: '#0F766E',   
  brandSecondary: '#14B8A6', 
  headerText: '#0F172A',
  cardBg: '#FFFFFF',
  textDark: '#1E293B',
  textLight: '#64748B',
  actionBlack: '#1E293B',  
  actionTeal: '#0F766E',   
  white: '#FFFFFF',
  secondary: '#E0F2FE'
};

export default function LoginScreen() {
  const [role, setRole] = useState('patient'); 
  const [patientId, setPatientId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // 🔥 MÁY QUÉT PWA NÂNG CẤP (Kiểm tra trạng thái Standalone) 🔥
  const checkIsPWA = () => {
    if (Platform.OS !== 'web') return true; 
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      return !!isStandalone;
    }
    return false;
  };

  // --- 1. XỬ LÝ ĐĂNG NHẬP BỆNH NHÂN ---
  const handlePatientLogin = () => {
    const isApp = checkIsPWA();
    const isIOS = Platform.OS === 'web' && /iPhone|iPad|iPod/.test(navigator.userAgent);

    // 🔥 LỐI THOÁT HIỂM: Nếu là iPhone, nhắc nhở nhẹ nhưng KHÔNG CHẶN CHẾT 🔥
    if (Platform.OS === 'web' && !isApp) {
      if (isIOS) {
        // iPhone chưa ẩn được thanh địa chỉ (do cache), hiện thông báo rồi cho vào luôn
        Alert.alert(
          "Thông báo",
          "Để có giao diện tràn viền chuyên nghiệp, sếp hãy Xóa icon cũ và 'Thêm vào MH chính' lại nhé. Giờ sếp cứ vào dùng bình thường!",
          [{ text: "Tôi đã hiểu, vào App", onPress: () => proceedLogin() }]
        );
        return;
      } else {
        // Các thiết bị khác (PC/Android Browser) vẫn bị chặn để bảo mật
        window.alert('⚠️ THÔNG BÁO:\nGiao diện Bệnh nhân chỉ hoạt động trên Ứng dụng điện thoại!');
        return;
      }
    }

    proceedLogin();
  };

  // Hàm thực hiện logic đăng nhập thực tế
  const proceedLogin = () => {
    if (!patientId.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập hoặc quét Mã Bệnh Nhân.');
      return;
    }

    setLoading(true);
    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

    fetch(csvUrl)
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const patient = results.data.find((p: any) => p.PatientID === patientId.trim().toUpperCase());
            setLoading(false);
            if (patient) {
              setPatientId(''); 
              // Dùng replace để tránh iPhone tự ý bật lại thanh địa chỉ khi chuyển trang
              router.replace({ pathname: '/patient-home', params: { id: patient.PatientID, name: patient.Name } });
            } else {
              Alert.alert('Lỗi đăng nhập', 'Không tìm thấy Mã Bệnh Nhân này.');
            }
          }
        });
      })
      .catch(err => {
        setLoading(false);
        Alert.alert('Lỗi kết nối', 'Vui lòng kiểm tra mạng.');
      });
  };

  // --- 2. XỬ LÝ ĐĂNG NHẬP ADMIN ---
  const handleAdminLogin = () => {
    const isApp = checkIsPWA(); 
    if (Platform.OS !== 'web' || isApp) {
      const msg = '⚠️ BẢO MẬT: Giao diện Admin chỉ dành cho Máy tính (Web).';
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Lỗi', msg);
      return;
    }

    if (!username.trim() || !password.trim()) {
      window.alert('Vui lòng nhập đầy đủ Tài khoản/Mật khẩu.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (username === 'admin' && password === '123456') {
        router.replace('/admin');
      } else {
        window.alert('Tài khoản hoặc mật khẩu không chính xác!');
      }
    }, 1000);
  };

  const handleOpenScanner = async () => {
    const isApp = checkIsPWA();
    if (Platform.OS === 'web' && !isApp) {
      window.alert("Chức năng Camera chỉ hoạt động trên App.");
      return;
    }
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert('Lỗi Camera', 'Vui lòng cấp quyền quét mã.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    setShowScanner(false);
    setPatientId(data.trim().toUpperCase());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {showScanner && (
        <Modal visible={showScanner} animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Quét Mã HIS</Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
            <CameraView 
              style={{ flex: 1 }} 
              facing="back"
              onBarcodeScanned={handleBarcodeScanned}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerBox} />
                <Text style={styles.scannerText}>Đưa mã QR vào khung hình</Text>
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
            <Image source={require('../assets/images/favicon.png')} style={{ width: 34, height: 34 }} resizeMode="contain" />
            <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
          </View>
          <Text style={styles.slogan}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.roleTabs}>
            <TouchableOpacity style={[styles.roleTab, role === 'patient' && styles.roleTabActive]} onPress={() => setRole('patient')}>
              <Text style={[styles.roleTabText, role === 'patient' && styles.roleTabTextActive]}>Bệnh Nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleTab, role === 'admin' && styles.roleTabActive]} onPress={() => setRole('admin')}>
              <Text style={[styles.roleTabText, role === 'admin' && styles.roleTabTextActive]}>Quản Trị</Text>
            </TouchableOpacity>
          </View>

          {role === 'patient' ? (
            <View style={styles.inputSection}>
              <View style={[styles.inputWrapper, { borderColor: colors.brandSecondary, borderWidth: 2 }]}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Ví dụ: BN001" 
                  value={patientId}
                  onChangeText={setPatientId}
                  autoCapitalize="characters"
                />
                <TouchableOpacity onPress={handleOpenScanner} style={styles.qrScanBtn}>
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.loginBtn, {backgroundColor: colors.actionTeal}]} onPress={handlePatientLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputSection}>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" /></View>
              <View style={[styles.inputWrapper, {marginTop: 15}]}><TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry={true} value={password} onChangeText={setPassword} /></View>
              <TouchableOpacity style={[styles.loginBtn, {backgroundColor: colors.actionBlack}]} onPress={handleAdminLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.loginBtnText}>ĐĂNG NHẬP</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  brandBox: { backgroundColor: 'rgba(15, 118, 110, 0.1)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, flexDirection: 'row', alignItems: 'center' },
  brandMedi: { fontSize: 36, fontWeight: '600', color: colors.brandPrimary, marginLeft: 12, fontStyle: 'italic' },
  brandHub: { fontWeight: '900', color: colors.textDark },
  slogan: { fontSize: 13, color: colors.textLight, fontWeight: '700', marginTop: 4 },
  formContainer: { backgroundColor: colors.white, borderRadius: 24, padding: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  roleTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 5, marginBottom: 25 },
  roleTab: { flex: 1, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  roleTabActive: { backgroundColor: colors.white, elevation: 2 },
  roleTabText: { fontSize: 14, fontWeight: '700', color: colors.textLight },
  roleTabTextActive: { color: colors.brandPrimary },
  inputSection: { paddingHorizontal: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 16, paddingLeft: 15, paddingRight: 5 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.textDark, fontWeight: '600' },
  qrScanBtn: { backgroundColor: colors.brandPrimary, padding: 10, borderRadius: 12 },
  loginBtn: { borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 25 },
  loginBtnText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scannerBox: { width: 250, height: 250, borderWidth: 3, borderColor: '#14B8A6', borderRadius: 20 },
  scannerText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 20 },
});