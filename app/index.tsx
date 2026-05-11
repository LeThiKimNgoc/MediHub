import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Modal, Image, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';

const colors = {
  brandPrimary: '#0F766E', brandLight: '#CCFBF1', brandDark: '#115E59', surface: '#FFFFFF',
  bgLight: '#F8FAFC', textDark: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', inputBg: '#F1F5F9', 
};

// 🚨 LINK API ĐÃ GIỮ NGUYÊN
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992; 

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [role, setRole] = useState('patient'); 
  
  const [patientId, setPatientId] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [showPatientPwd, setShowPatientPwd] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);

  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

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
          const response = await fetch(`${SCRIPT_URL}?action=getUserList`, { cache: 'no-store' });
          const result = await response.json();
          if (result.status === 'success') {
            const isValidUser = result.data.find((u: any) => 
              (u['Mã NV'] === savedId || u['Mã BN'] === savedId || u['ID'] === savedId) && 
              (!u['Trạng thái'].toLowerCase().includes('ngừng')) 
            );
            if (isValidUser) {
              router.replace({ pathname: '/patient-home', params: { id: savedId, name: savedName } } as any);
              return;
            }
          }
          await AsyncStorage.removeItem('patientId');
          await AsyncStorage.removeItem('patientName');
          setIsCheckingMemory(false);
        } else { setIsCheckingMemory(false); }
      } catch (error) { setIsCheckingMemory(false); }
    };
    checkAutoLogin();
  }, []);

  const executeLogin = async (id: string, pass: string, expectedRoleGroup: 'patient' | 'admin') => {
    if (!id.trim() || !pass.trim()) {
      if (Platform.OS === 'web') window.alert('Vui lòng nhập đầy đủ Mã định danh và Mật khẩu.');
      else Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    setLoading(true);

    const payload = {
      action: 'login',
      data: { username: id, password: pass }
    };

    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.status === 'success') {
        const isPatient = result.role === 'Bệnh nhân';
        if (expectedRoleGroup === 'patient' && !isPatient) {
          if (Platform.OS === 'web') window.alert('Sai khu vực: Đây là tài khoản Nhân viên. Vui lòng chuyển sang tab Nhân Viên Y Tế.');
          else Alert.alert('Sai khu vực', 'Đây là tài khoản Nhân viên. Chuyển sang tab Nhân Viên Y Tế.');
          setLoading(false); return;
        }
        if (expectedRoleGroup === 'admin' && isPatient) {
          if (Platform.OS === 'web') window.alert('Sai khu vực: Đây là tài khoản Bệnh nhân. Vui lòng chuyển sang tab Bệnh Nhân.');
          else Alert.alert('Sai khu vực', 'Đây là tài khoản Bệnh nhân. Chuyển sang tab Bệnh Nhân.');
          setLoading(false); return;
        }

        if (isPatient) {
          setPatientId(''); setPatientPassword('');
          await AsyncStorage.setItem('patientId', result.user);
          await AsyncStorage.setItem('patientName', result.name);
          router.replace({ pathname: '/patient-home', params: { id: result.user, name: result.name } } as any);
        } else { 
          // 🔥 ĐÃ FIX LỖI ADMIN KHÔNG LƯU TÊN: 
          await AsyncStorage.setItem('patientId', result.user);
          await AsyncStorage.setItem('patientName', result.name);
          router.replace('/users'); 
        }
      } else {
        if (Platform.OS === 'web') window.alert(result.message || 'Sai thông tin!');
        else Alert.alert('Lỗi đăng nhập', result.message || 'Sai thông tin!');
      }
    } catch (error) { 
      if (Platform.OS === 'web') window.alert('Lỗi kết nối máy chủ.');
      else Alert.alert('Lỗi kết nối', 'Không thể kết nối máy chủ.'); 
    } 
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!regId.trim() || !regName.trim() || !regPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ ID, Họ tên và Mật khẩu.');
      return;
    }
    setLoading(true);
    const payload = {
      action: 'addUser',
      data: {
        'Mã NV': regId.trim().toUpperCase(),
        'Họ tên': regName.trim(),
        'Mật khẩu': regPassword.trim(),
        'Email': '',
        'Vai trò': 'Bệnh nhân',
        'Trạng thái': 'Đang hoạt động',
        'Truy cập cuối': '-'
      }
    };

    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.status === 'success') {
        Alert.alert("Thành công!", "Đăng ký thành công. Vui lòng đăng nhập.");
        setPatientId(regId.trim().toUpperCase());
        setRole('patient');
        setIsLoginMode(true);
        setRegId(''); setRegName(''); setRegPassword('');
      } else { Alert.alert("Lỗi", "Không thể tạo tài khoản. Mã ID có thể đã tồn tại."); }
    } catch (error) { Alert.alert("Lỗi", "Lỗi kết nối máy chủ."); } 
    finally { setLoading(false); }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') { Alert.alert('Lỗi', 'Cần quyền Camera.'); return; }
    }
    setShowScanner(true);
  };
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    setPatientId(data.trim().toUpperCase());
  };

  if (isCheckingMemory) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </SafeAreaView>
    );
  }

  const renderFormContent = () => (
    <View style={styles.formContent}>
      <View style={styles.formHeader}>
        <View style={styles.formLogoRow}>
          <View style={styles.logoCircleMobile}>
            <Image source={require('../assets/images/favicon.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
          </View>
          <Text style={styles.formBrandText}>Medi<Text style={{fontWeight: '900', color: colors.brandPrimary}}>Hub</Text></Text>
        </View>

        <Text style={styles.title}>{isLoginMode ? 'Chào mừng trở lại' : 'Tạo hồ sơ Bệnh nhân'}</Text>
        <Text style={styles.subtitle}>
          {isLoginMode ? 'Vui lòng đăng nhập để tiếp tục truy cập hệ thống MediHub.' : 'Đăng ký tài khoản để theo dõi lịch uống thuốc và báo cáo triệu chứng.'}
        </Text>
      </View>

      {isLoginMode ? (
        <>
          <View style={styles.roleTabs}>
            <TouchableOpacity style={[styles.roleTab, role === 'patient' && styles.roleTabActive]} onPress={() => setRole('patient')}>
              <Text style={[styles.roleTabText, role === 'patient' && styles.roleTabTextActive]}>Bệnh Nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleTab, role === 'admin' && styles.roleTabActive]} onPress={() => setRole('admin')}>
              <Text style={[styles.roleTabText, role === 'admin' && styles.roleTabTextActive]}>Nhân Viên Y Tế</Text>
            </TouchableOpacity>
          </View>

          {role === 'patient' && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Mã hồ sơ / Định danh</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ví dụ: BN001" placeholderTextColor={colors.textMuted} value={patientId} onChangeText={setPatientId} autoCapitalize="characters" outlineStyle="none" as any/>
                <TouchableOpacity onPress={handleOpenScanner} style={styles.qrScanBtn}>
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.brandPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Mã PIN / Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Nhập mật khẩu" placeholderTextColor={colors.textMuted} secureTextEntry={!showPatientPwd} value={patientPassword} onChangeText={setPatientPassword} outlineStyle="none" as any/>
                <TouchableOpacity onPress={() => setShowPatientPwd(!showPatientPwd)} style={{ padding: 10 }}>
                  <MaterialCommunityIcons name={showPatientPwd ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => executeLogin(patientId, patientPassword, 'patient')} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryBtnText}>Đăng Nhập Ngay</Text>}
              </TouchableOpacity>
            </View>
          )}

          {role === 'admin' && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>Tên đăng nhập (Mã NV)</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Ví dụ: admin" placeholderTextColor={colors.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" outlineStyle="none" as any/>
              </View>
              <Text style={styles.label}>Mật khẩu hệ thống</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="Nhập mật khẩu" placeholderTextColor={colors.textMuted} secureTextEntry={!showAdminPwd} value={password} onChangeText={setPassword} outlineStyle="none" as any/>
                <TouchableOpacity onPress={() => setShowAdminPwd(!showAdminPwd)} style={{ padding: 10 }}>
                  <MaterialCommunityIcons name={showAdminPwd ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => executeLogin(username, password, 'admin')} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryBtnText}>Truy Cập Hệ Thống</Text>}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={{ marginTop: 25, alignItems: 'center' }} onPress={() => setIsLoginMode(false)}>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '500' }}>Chưa có tài khoản? <Text style={{ color: colors.brandPrimary, fontWeight: '800' }}>Đăng ký ngay</Text></Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.inputSection}>
          <Text style={styles.label}>Mã định danh (Bắt đầu bằng BN...)</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} placeholder="Ví dụ: BN009" placeholderTextColor={colors.textMuted} value={regId} onChangeText={setRegId} autoCapitalize="characters" outlineStyle="none" as any/>
          </View>
          
          <Text style={styles.label}>Họ và tên đầy đủ</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} placeholder="Ví dụ: Nguyễn Văn A" placeholderTextColor={colors.textMuted} value={regName} onChangeText={setRegName} outlineStyle="none" as any/>
          </View>

          <Text style={styles.label}>Mã PIN / Mật khẩu mới</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} placeholder="Tạo mật khẩu (Ít nhất 6 ký tự)" placeholderTextColor={colors.textMuted} secureTextEntry={!showRegPwd} value={regPassword} onChangeText={setRegPassword} outlineStyle="none" as any/>
            <TouchableOpacity onPress={() => setShowRegPwd(!showRegPwd)} style={{ padding: 10 }}>
              <MaterialCommunityIcons name={showRegPwd ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryBtnText}>Tạo Tài Khoản</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 25, alignItems: 'center' }} onPress={() => setIsLoginMode(true)}>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '500' }}>Đã có tài khoản? <Text style={{ color: colors.brandPrimary, fontWeight: '800' }}>Đăng nhập</Text></Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.footerText}>Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của MediHub.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {showScanner && (
        <Modal visible={showScanner} animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Quét Mã HIS / Toa Thuốc</Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}><MaterialCommunityIcons name="close" size={30} color="#fff" /></TouchableOpacity>
            </View>
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr", "code128"] }} onBarcodeScanned={handleBarcodeScanned}>
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerBox} />
                <Text style={styles.scannerText}>Đưa mã QR vào khung hình</Text>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainLayout}>
        {isDesktop && (
          <View style={styles.brandingPanel}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.brandContent}>
              <View style={styles.logoRow}>
                <View style={styles.logoWhiteBg}>
                  <Image source={require('../assets/images/favicon.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                </View>
                <Text style={styles.brandLogoText}>Medi<Text style={{fontWeight: '900'}}>Hub</Text></Text>
              </View>
              <Text style={styles.brandHeadline}>Giải pháp Quản lý Y tế &{'\n'}Đồng hành cùng Bệnh nhân.</Text>
              <Text style={styles.brandDescription}>Nền tảng chuyển đổi số toàn diện, giúp tối ưu hóa quy trình điều trị, theo dõi tỷ lệ tuân thủ và nâng cao chất lượng dịch vụ chăm sóc sức khỏe.</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}><MaterialCommunityIcons name="check-circle" size={20} color={colors.brandLight} /><Text style={styles.featureText}>Quản lý hồ sơ thông minh</Text></View>
                <View style={styles.featureItem}><MaterialCommunityIcons name="check-circle" size={20} color={colors.brandLight} /><Text style={styles.featureText}>Theo dõi tuân thủ điều trị (Adherence)</Text></View>
                <View style={styles.featureItem}><MaterialCommunityIcons name="check-circle" size={20} color={colors.brandLight} /><Text style={styles.featureText}>Bảo mật dữ liệu chuẩn y tế</Text></View>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.formPanel, !isDesktop && styles.formPanelMobile]}>
          {!isDesktop && <View style={styles.mobileBgDecor} />}
          <View style={styles.formWrapper}>{renderFormContent()}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgLight },
  mainLayout: { flex: 1, flexDirection: 'row' },
  brandingPanel: { flex: 1, backgroundColor: colors.brandPrimary, overflow: 'hidden', position: 'relative', justifyContent: 'center', padding: 60 },
  decorCircle1: { position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.05)' },
  decorCircle2: { position: 'absolute', bottom: -150, right: -50, width: 500, height: 500, borderRadius: 250, backgroundColor: 'rgba(255,255,255,0.03)' },
  brandContent: { zIndex: 10, maxWidth: 500 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  logoWhiteBg: { width: 56, height: 56, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  brandLogoText: { fontSize: 36, color: colors.surface, marginLeft: 16, letterSpacing: -1 },
  brandHeadline: { fontSize: 42, fontWeight: '800', color: colors.surface, lineHeight: 52, marginBottom: 20 },
  brandDescription: { fontSize: 16, color: colors.brandLight, lineHeight: 26, marginBottom: 40, opacity: 0.9 },
  featureList: { gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: colors.surface, fontSize: 16, fontWeight: '500' },
  formPanel: { flex: 1.2, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  formPanelMobile: { backgroundColor: colors.bgLight, padding: 20 },
  mobileBgDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: colors.brandPrimary, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  formWrapper: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 30, elevation: 10, zIndex: 10 },
  formContent: { width: '100%' },
  formHeader: { marginBottom: 30 },
  formLogoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  logoCircleMobile: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandLight, justifyContent: 'center', alignItems: 'center' },
  formBrandText: { fontSize: 24, fontWeight: '700', color: colors.textDark, marginLeft: 10, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textDark, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  roleTabs: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 4, marginBottom: 24 },
  roleTab: { flex: 1, paddingVertical: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  roleTabActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roleTabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  roleTabTextActive: { color: colors.textDark, fontWeight: '700' },
  inputSection: { gap: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginBottom: -8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 16 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.textDark, outlineStyle: 'none' } as any,
  qrScanBtn: { padding: 8, backgroundColor: colors.surface, borderRadius: 8, elevation: 1 },
  primaryBtn: { backgroundColor: colors.brandPrimary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10, shadowColor: colors.brandPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  footerText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 30, lineHeight: 18 },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: colors.brandLight, backgroundColor: 'transparent', borderRadius: 16 },
  scannerText: { color: colors.surface, fontSize: 14, fontWeight: '600', marginTop: 24, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});