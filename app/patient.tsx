import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Alert, useWindowDimensions, Platform, RefreshControl, Modal, Image, FlatList } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'; 
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import * as ImagePicker from 'expo-image-picker'; 

// GỌI COMPONENT
import { AssignMedModal } from '../components/Modals/AssignMedModal';

const colors = {
  bg: '#F8FAFC', headerBgPastel: '#FB923C', white: '#FFFFFF', carbonDark: '#1E293B',     
  tableHeader: '#FFE0B2', textLight: '#78909C', dangerPastel: '#FFCDD2', dangerText: '#D32F2F',
  warningPastel: '#FFF9C4', warningText: '#F57F17', successPastel: '#E8F5E9',
  successText: '#2E7D32', infoBadgeBg: '#E3F2FD', infoBadgeText: '#1565C0',
  zoomBtnBg: '#EA580C' 
};

export default function PatientScreen() {
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900; 
  const isMobile = width < 768;

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const params = useLocalSearchParams();
  useEffect(() => {
    if (params.autoAssignId && params.autoAssignName) {
      setSelectedPatient({ PatientID: params.autoAssignId, Name: params.autoAssignName });
      setActiveModal('assign');
      router.setParams({ autoAssignId: '', autoAssignName: '' }); 
    }
  }, [params.autoAssignId]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isScanningPatient, setIsScanningPatient] = useState(false);

  const [addForm, setAddForm] = useState({ id: '', name: '', age: '', gender: 'Nam', icd: '', dayStart: '', dateMode: 'auto' });
  const [editForm, setEditForm] = useState({ id: '', name: '', age: '', gender: '', icd: '', dayStart: '' });
  
  const idRef = useRef<TextInput>(null); const nameRef = useRef<TextInput>(null); const ageRef = useRef<TextInput>(null); const icdRef = useRef<TextInput>(null); const dateRef = useRef<TextInput>(null);
  
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

  const fetchData = (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true); 
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    const t = new Date().getTime();
    Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1532424446&t=${t}`, { cache: 'no-store' }).then(res => res.text())
    ]).then(([csvPatients, csvMeds]) => {
      Papa.parse(csvPatients, { header: true, skipEmptyLines: true, complete: (res) => { setPatients(res.data); } });
      Papa.parse(csvMeds, { header: true, skipEmptyLines: true, complete: (res) => { setMedicines(res.data); } });
      setLoading(false); setRefreshing(false);
    }).catch(() => { setLoading(false); setRefreshing(false); });
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(true); }, []);

  const handleScanPatientInfo = async () => {
    if (Platform.OS === 'web') alert("Tính năng quét camera hoạt động tốt nhất trên App điện thoại.");

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Cần quyền truy cập camera để quét!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setIsScanningPatient(true);
      try {
        // 🔥 DÁN LẠI API KEY CỦA BẠN VÀO ĐÂY NHÉ 🔥
        const API_KEY = 'AIzaSyDH_khyIyH5OJVh_NrEQIs6E3aJrx6JMXk';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Trích xuất thông tin bệnh nhân từ ảnh này. Trả về đúng định dạng JSON với các key: 'id' (Mã bệnh nhân), 'name' (Họ tên), 'age' (Tuổi, chỉ lấy số), 'gender' (Giới tính: Nam, Nữ, hoặc Khác), 'icd' (Chẩn đoán bệnh hoặc Mã ICD). Chỉ xuất ra JSON, không kèm giải thích." },
                { inline_data: { mime_type: "image/jpeg", data: result.assets[0].base64 } }
              ]
            }]
          })
        });

        const json = await response.json();
        if (json.error) throw new Error(json.error.message);

        const aiText = json.candidates[0].content.parts[0].text;
        const cleanJson = aiText.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        setAddForm(prev => ({
          ...prev,
          id: data.id || prev.id,
          name: data.name || prev.name,
          age: data.age?.toString() || prev.age,
          gender: ['Nam', 'Nữ', 'Khác'].includes(data.gender) ? data.gender : 'Nam',
          icd: data.icd || prev.icd
        }));

        Alert.alert("Quét thành công!", `Đã tìm thấy thông tin của BN: ${data.name || 'Không rõ'}. Vui lòng kiểm tra lại trước khi lưu.`);
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi AI", "Không đọc rõ thông tin bệnh nhân. Vui lòng chụp rõ hơn hoặc nhập tay.");
      } finally {
        setIsScanningPatient(false);
      }
    }
  };

  const deletePatient = (id: any, name: any) => {
    const exec = async () => {
      setLoading(true);
      try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deletePatient', id: id }) });
        const result = await res.json();
        if (result.status === 'success') { fetchData(); Alert.alert('Thành công', 'Đã xóa hồ sơ.'); }
      } catch(e) { Alert.alert('Lỗi mạng', 'Không thể xóa'); } finally { setLoading(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(`Xóa hồ sơ ${name}?`)) exec(); }
    else { Alert.alert("Xác nhận", `Xóa hồ sơ ${name}?`, [{ text: "Hủy" }, { text: "Xóa", style: "destructive", onPress: exec }]); }
  };

  const handleAddSubmit = async () => {
    if (!addForm.id || !addForm.name) {
        if (Platform.OS === 'web') window.alert('Vui lòng nhập Mã BN và Họ tên.');
        else Alert.alert('Lỗi', 'Vui lòng nhập Mã BN và Họ tên.');
        return;
    }
    setIsSubmitting(true);
    const date = addForm.dateMode === 'auto' ? new Date().toLocaleDateString('vi-VN') : addForm.dayStart;
    
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addPatient', data: { PatientID: addForm.id, Name: addForm.name, Age: addForm.age, Gender: addForm.gender, ICD: addForm.icd, DayStart: date } }) });
      const result = await res.json();
      
      if (result.status === 'success') { 
        const newPatient = { PatientID: addForm.id, Name: addForm.name };
        setShowAddModal(false); setAddForm({ id: '', name: '', age: '', gender: 'Nam', icd: '', dayStart: '', dateMode: 'auto' }); fetchData(); 
        const jumpToAssign = () => { setSelectedPatient(newPatient); setActiveModal('assign'); };
        if (Platform.OS === 'web') { if (window.confirm(`Đã tạo hồ sơ cho ${newPatient.Name}!\nChuyển sang gán lịch thuốc ngay?`)) jumpToAssign(); } 
        else { Alert.alert('Thành công', `Gán thuốc cho ${newPatient.Name} luôn không?`, [{ text: 'Lúc khác', style: 'cancel' }, { text: 'Gán Thuốc Ngay', onPress: jumpToAssign }]); }
      } else { 
        if (Platform.OS === 'web') window.alert('Lỗi Server: ' + result.message); else Alert.alert('Lỗi Server', result.message); 
      }
    } catch (e) { if (Platform.OS === 'web') window.alert('Lỗi mạng'); else Alert.alert('Lỗi mạng', 'Không kết nối được'); } 
    finally { setIsSubmitting(false); }
  };

  const handleEditSubmit = async () => {
    if (!editForm.id || !editForm.name) { if (Platform.OS === 'web') window.alert('Thiếu Mã BN/Tên.'); else Alert.alert('Lỗi', 'Thiếu Mã BN/Tên.'); return; }
    setIsSubmitting(true);
    const payload = { action: 'editPatient', data: { PatientID: editForm.id, Name: editForm.name, Age: editForm.age, Gender: editForm.gender, ICD: editForm.icd, DayStart: editForm.dayStart } };
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.status === 'success') { setShowEditModal(false); fetchData(); if (Platform.OS === 'web') window.alert('Thành công'); else Alert.alert('Thành công', 'Đã cập nhật hồ sơ'); } 
      else { if (Platform.OS === 'web') window.alert('Lỗi Server: ' + result.message); else Alert.alert('Lỗi Server', result.message); }
    } catch (e) { if (Platform.OS === 'web') window.alert('Lỗi mạng'); else Alert.alert('Lỗi mạng', 'Không kết nối được'); } 
    finally { setIsSubmitting(false); }
  };

  const handleOpenScanner = async () => {
    if (Platform.OS === 'web') { alert("Camera chỉ hỗ trợ thiết bị di động."); return; }
    if (!permission?.granted) { const { status } = await requestPermission(); if (status !== 'granted') { Alert.alert('Chưa cấp quyền', 'Vui lòng cho phép Camera.'); return; } }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ type, data }: any) => {
    setShowScanner(false); const scannedId = data.trim(); setSearchQuery(scannedId); 
    const existingPatient = patients.find(pt => (pt.PatientID || '').toString().toLowerCase() === scannedId.toLowerCase());
    
    if (existingPatient) {
      setSelectedPatient(existingPatient);
      setActiveModal('assign');
    } else {
      Alert.alert('Bệnh nhân mới!', `Chưa có hồ sơ mã [${scannedId}]. Bạn có muốn tạo mới ngay?`, [ { text: 'Để sau', style: 'cancel' }, { text: 'Tạo hồ sơ ngay', onPress: () => { setAddForm({ id: scannedId, name: '', age: '', gender: 'Nam', icd: '', dayStart: '', dateMode: 'auto' }); setShowAddModal(true); } } ]);
    }
  };

  const filteredPatients = patients.filter(pt => {
    const s = searchQuery.toLowerCase();
    return (pt.Name || '').toLowerCase().includes(s) || (pt.PatientID || '').toString().toLowerCase().includes(s) || (pt.ICD || '').toLowerCase().includes(s);
  });

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => router.replace('/') } 
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* HEADER */}
        {isMobile ? (
          <View style={[styles.header, styles.headerMobile]}>
             <View style={styles.headerTopRowMobile}>
               <View style={styles.brandBoxMobile}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircleMobile}><Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" /></View>
                    <Text style={styles.brandMediMobile}>Medi<Text style={styles.brandHubMobile}>Hub</Text></Text>
                  </View>
               </View>
               <View style={{flexDirection: 'row'}}>
                 <TouchableOpacity style={styles.headerIconBtnMobile} onPress={() => router.push('/admin')}><MaterialCommunityIcons name="home-outline" size={22} color={colors.white} /></TouchableOpacity>
                 <TouchableOpacity style={[styles.headerIconBtnMobile, {marginLeft: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)'}]} onPress={handleLogout}><MaterialCommunityIcons name="power" size={22} color="#FECACA" /></TouchableOpacity>
               </View>
             </View>
             <View style={styles.headerBottomRowMobile}><Text style={styles.pageTitleMobile}>HỒ SƠ BỆNH NHÂN</Text></View>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.brandBox}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircle}><Image source={require('../assets/images/favicon.png')} style={{ width: 26, height: 26 }} resizeMode="contain" /></View>
                    <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                  </View>
                </View>
                <Text style={styles.brandSlogan}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
              </View>

              <View style={styles.headerCenter}>
                <Text style={styles.pageTitle}>HỒ SƠ BỆNH NHÂN</Text>
                <View style={styles.titleUnderline} />
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/admin')}>
                  <MaterialCommunityIcons name="home-outline" size={20} color={colors.white} />
                  <Text style={styles.navText}>Trang chủ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                  <MaterialCommunityIcons name="power" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {showScanner && Platform.OS !== 'web' && (
          <Modal visible={showScanner} animationType="slide" transparent={false}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              <View style={{ padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Quét Mã HIS (Barcode)</Text>
                <TouchableOpacity onPress={() => setShowScanner(false)}><MaterialCommunityIcons name="close" size={30} color="#fff" /></TouchableOpacity>
              </View>
              <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"] }} onBarcodeScanned={handleBarcodeScanned}>
                <View style={styles.scannerOverlay}><View style={styles.scannerBox} /><Text style={styles.scannerText}>Đưa mã Barcode vào khung hình</Text></View>
              </CameraView>
            </View>
          </Modal>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.textLight} />
            <TextInput style={styles.searchInput} placeholder="Tìm mã BN hoặc tên bệnh nhân..." value={searchQuery} onChangeText={setSearchQuery} outlineStyle="none" />
            <TouchableOpacity style={styles.scanBtn} onPress={handleOpenScanner}><MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.white} /></TouchableOpacity>
          </View>
          
          {/* 🔥 BỔ SUNG TIÊU ĐỀ VÀ NÚT REFRESH BÊN TRÊN BẢNG 🔥 */}
          <View style={styles.tableTitleRow}>
            <Text style={styles.tableTitle}>Danh Sách Bệnh Nhân</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <MaterialCommunityIcons name="refresh" size={22} color={colors.carbonDark} />
            </TouchableOpacity>
          </View>

          {loading && patients.length === 0 ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.headerBgPastel} /><Text style={styles.loadingText}>Đang tải dữ liệu...</Text></View>
          ) : (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
                    {/* 🔥 PHỤC HỒI CHIỀU RỘNG ĐỂ HIỂN THỊ ĐỦ 8 CỘT 🔥 */}
                    <View style={{ minWidth: 1000, flex: 1, backgroundColor: colors.white }}>
                    <FlatList 
                        data={filteredPatients}
                        keyExtractor={(_, index) => index.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.headerBgPastel]} />}
                        ListHeaderComponent={
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.headerCell, { width: 120, paddingVertical: 16, textAlign: 'center' }]}>Thao tác</Text>
                                <Text style={[styles.headerCell, { width: 60, paddingVertical: 16, textAlign: 'center' }]}>STT</Text>
                                <Text style={[styles.headerCell, { width: 100, paddingVertical: 16, textAlign: 'center' }]}>Mã BN</Text>
                                <Text style={[styles.headerCell, { width: 200, paddingVertical: 16 }]}>Họ và Tên</Text>
                                <Text style={[styles.headerCell, { width: 60, paddingVertical: 16, textAlign: 'center' }]}>Tuổi</Text>
                                <Text style={[styles.headerCell, { width: 80, paddingVertical: 16, textAlign: 'center' }]}>Giới</Text>
                                <Text style={[styles.headerCell, { flex: 1, minWidth: 150, paddingVertical: 16 }]}>Mã ICD</Text>
                                <Text style={[styles.headerCell, { width: 120, paddingVertical: 16, textAlign: 'center' }]}>Ngày Khám</Text>
                            </View>
                        }
                        renderItem={({ item, index }) => (
                            <View style={styles.tableRow}>
                                <View style={[styles.dataCell, { width: 120, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.successPastel, padding: 6}]} onPress={() => { setSelectedPatient(item); setActiveModal('assign'); }}><MaterialCommunityIcons name="pill" size={18} color={colors.successText} /></TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.warningPastel, padding: 6}]} onPress={() => { setEditForm({ id: item.PatientID, name: item.Name, age: item.Age, gender: item.Gender, icd: item.ICD, dayStart: item.DayStart }); setShowEditModal(true); }}><MaterialCommunityIcons name="pencil-outline" size={18} color={colors.warningText} /></TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.dangerPastel, padding: 6}]} onPress={() => deletePatient(item.PatientID, item.Name)}><MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.dangerText} /></TouchableOpacity>
                                </View>
                                {/* 🔥 CỘT STT 🔥 */}
                                <Text style={[styles.dataCell, { width: 60, textAlign: 'center', color: '#64748B' }]}>{index + 1}</Text>
                                {/* 🔥 CỘT MÃ BN (VIÊN THUỐC XANH) 🔥 */}
                                <View style={[styles.dataCell, { width: 100, alignItems: 'center' }]}><View style={styles.patientIdBadge}><Text style={styles.patientIdText}>{item.PatientID}</Text></View></View>
                                {/* 🔥 CỘT TÊN MÀU CAM 🔥 */}
                                <Text style={[styles.dataCell, styles.boldText, { width: 200, color: '#EA580C' }]}>{item.Name}</Text>
                                {/* 🔥 CỘT TUỔI 🔥 */}
                                <Text style={[styles.dataCell, { width: 60, textAlign: 'center' }]}>{item.Age}</Text>
                                {/* 🔥 CỘT GIỚI TÍNH 🔥 */}
                                <Text style={[styles.dataCell, { width: 80, textAlign: 'center' }]}>{item.Gender}</Text>
                                {/* 🔥 CỘT CHẨN ĐOÁN MÀU XANH 🔥 */}
                                <Text style={[styles.dataCell, { flex: 1, minWidth: 150, color: '#0284C7', fontWeight: '600' }]}>{item.ICD}</Text>
                                {/* 🔥 CỘT NGÀY KHÁM 🔥 */}
                                <Text style={[styles.dataCell, { width: 120, textAlign: 'center', color: '#64748B' }]}>{item.DayStart}</Text>
                            </View>
                        )}
                    />
                    </View>
                </ScrollView>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}><MaterialCommunityIcons name="account-plus" size={30} color="#fff" /></TouchableOpacity>

        <Modal visible={showAddModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}><View style={[styles.modalContainer, { width: isDesktop ? 600 : '95%' }]}>
            <View style={styles.modalHeaderAdd}><TouchableOpacity onPress={() => setShowAddModal(false)}><MaterialCommunityIcons name="arrow-left" size={26} color={colors.carbonDark} /></TouchableOpacity><Text style={styles.modalTitleAdd}>Thêm Hồ Sơ Bệnh Nhân</Text><View style={{width: 26}} /></View>
            <ScrollView style={styles.modalBody}>
              
              <TouchableOpacity 
                style={[styles.scanPhotoBtn, { backgroundColor: '#F97316' }]} 
                onPress={handleScanPatientInfo}
                disabled={isScanningPatient}
              >
                  {isScanningPatient ? (
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <ActivityIndicator color="#fff" style={{marginRight: 10}} />
                          <Text style={styles.scanPhotoText}>AI ĐANG TRÍCH XUẤT...</Text>
                      </View>
                  ) : (
                      <>
                          <MaterialCommunityIcons name="line-scan" size={24} color="#fff" />
                          <Text style={styles.scanPhotoText}>QUÉT TOA THUỐC ĐIỀN THÔNG TIN</Text>
                      </>
                  )}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Mã Bệnh Nhân (*)</Text>
              <TextInput ref={idRef} style={styles.fieldInput} value={addForm.id} onChangeText={(t) => setAddForm({...addForm, id: t})} onSubmitEditing={() => nameRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" />
              <Text style={styles.fieldLabel}>Họ và Tên (*)</Text>
              <TextInput ref={nameRef} style={styles.fieldInput} value={addForm.name} onChangeText={(t) => setAddForm({...addForm, name: t})} onSubmitEditing={() => ageRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" />
              <View style={{flexDirection:'row', gap: 15}}>
                <View style={{flex: 1}}>
                  <Text style={styles.fieldLabel}>Tuổi (*)</Text>
                  <TextInput ref={ageRef} style={styles.fieldInput} keyboardType="numeric" value={addForm.age} onChangeText={(t) => setAddForm({...addForm, age: t})} onSubmitEditing={() => icdRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.fieldLabel}>Giới Tính</Text>
                  <View style={styles.genderRow}>{['Nam', 'Nữ', 'Khác'].map(g => (
                    <TouchableOpacity key={g} style={[styles.genderBtnAdd, addForm.gender === g && styles.genderBtnActive]} onPress={() => setAddForm({...addForm, gender: g})}><Text style={[styles.genderBtnText, addForm.gender === g && {color: '#fff'}]}>{g}</Text></TouchableOpacity>
                  ))}</View>
                </View>
              </View>
              <Text style={styles.fieldLabel}>Mã ICD / Chẩn đoán</Text>
              <TextInput ref={icdRef} style={[styles.fieldInput, {height: 50}]} multiline value={addForm.icd} onChangeText={(t) => setAddForm({...addForm, icd: t})} 
                onSubmitEditing={() => { if (addForm.dateMode === 'manual') dateRef.current?.focus(); else handleAddSubmit(); }} blurOnSubmit={true} returnKeyType={addForm.dateMode === 'manual' ? "next" : "done"}
              />
              <Text style={styles.fieldLabel}>Ngày khám</Text>
              <View style={styles.dateOptionRow}>
                <TouchableOpacity style={[styles.dateOptBtn, addForm.dateMode === 'auto' && styles.dateOptActive]} onPress={() => setAddForm({...addForm, dateMode: 'auto'})}><Text style={[styles.dateOptText, addForm.dateMode === 'auto' && {color: '#fff'}]}>Hệ thống tạo</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.dateOptBtn, addForm.dateMode === 'manual' && styles.dateOptActive]} onPress={() => setAddForm({...addForm, dateMode: 'manual'})}><Text style={[styles.dateOptText, addForm.dateMode === 'manual' && {color: '#fff'}]}>Thủ công</Text></TouchableOpacity></View>
              {addForm.dateMode === 'manual' && <TextInput ref={dateRef} style={[styles.fieldInput, {marginTop: 10}]} placeholder="DD/MM/YYYY" value={addForm.dayStart} onChangeText={(t) => setAddForm({...addForm, dayStart: t})} onSubmitEditing={handleAddSubmit} returnKeyType="done" />}
              <View style={{ height: 40 }} /> 
            </ScrollView>
            <View style={styles.modalFooterAdd}><TouchableOpacity style={styles.createBtn} onPress={handleAddSubmit} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color={colors.carbonDark} /> : <Text style={styles.createBtnText}>TẠO HỒ SƠ</Text>}</TouchableOpacity></View>
          </View></View>
        </Modal>

        <AssignMedModal 
          visible={activeModal === 'assign'} 
          patient={selectedPatient} 
          medicines={medicines}
          onClose={() => setActiveModal(null)} 
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg }, container: { flex: 1, width: '100%' }, 
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }, loadingText: { marginTop: 15, fontSize: 16, color: colors.textLight, fontWeight: '600' },
  
  header: { backgroundColor: colors.headerBgPastel, paddingVertical: 18, paddingHorizontal: '2%', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: colors.headerBgPastel, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 15 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  brandBox: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', flexDirection: 'row', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  brandMedi: { fontSize: 30, fontWeight: '600', color: '#FFFFFF', marginLeft: 12, letterSpacing: 1, fontStyle: 'italic', textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
  brandHub: { fontWeight: '900', color: '#FFFFFF' },
  brandSlogan: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginLeft: 12, marginTop: 6, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowRadius: 2 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  titleUnderline: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginTop: 4 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
  navText: { marginLeft: 6, fontWeight: '700', color: '#FFFFFF', fontSize: 14 }, 
  iconBtn: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  
  headerMobile: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 15 },
  headerTopRowMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBoxMobile: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  logoCircleMobile: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  brandMediMobile: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginLeft: 10, fontStyle: 'italic' },
  brandHubMobile: { fontWeight: '900' },
  headerIconBtnMobile: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerBottomRowMobile: { marginTop: 15, alignItems: 'center' },
  pageTitleMobile: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, paddingLeft: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, marginLeft: 10 },
  scanBtn: { backgroundColor: colors.headerBgPastel, paddingHorizontal: 20, paddingVertical: 14, borderTopRightRadius: 15, borderBottomRightRadius: 15, justifyContent: 'center', alignItems: 'center' },
  
  // 🔥 BỔ SUNG STYLE CHO TIÊU ĐỀ BẢNG VÀ NÚT REFRESH 🔥
  tableTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tableTitle: { fontSize: 18, fontWeight: '900', color: colors.carbonDark },
  refreshBtn: { padding: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },

  scanPhotoBtn: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  scanPhotoText: {
    color: '#fff',
    fontWeight: '900',
    marginLeft: 10,
    fontSize: 15,
    letterSpacing: 1
  },

  tableWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.tableHeader, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10, elevation: 1 },
  headerCell: { color: colors.carbonDark, fontWeight: '900', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center', minHeight: 60 },
  dataCell: { color: colors.carbonDark, borderRightWidth: 1, borderRightColor: '#F1F5F9', paddingHorizontal: 12 },
  boldText: { fontWeight: '800' }, 
  patientIdBadge: { backgroundColor: colors.infoBadgeBg, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', alignItems: 'center' },
  patientIdText: { fontWeight: '800', color: colors.infoBadgeText }, actionButton: { borderRadius: 8 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: colors.headerBgPastel, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 6, borderWidth: 3, borderColor: colors.white },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 20, maxHeight: '90%' },
  modalHeaderAdd: { backgroundColor: '#FFE5C4', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitleAdd: { fontSize: 18, fontWeight: '800', color: colors.carbonDark }, modalBody: { padding: 20 },
  noticeBox: { backgroundColor: '#FFD7D1', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#FFAB91', marginBottom: 20 }, noticeText: { fontSize: 13, color: '#D84315', fontStyle: 'italic', lineHeight: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#455A64', marginBottom: 8, marginTop: 10 },
  fieldInput: { borderWidth: 1, borderColor: '#CFD8DC', borderRadius: 10, padding: 12, fontSize: 16, color: colors.carbonDark, backgroundColor: '#fff' },
  genderRow: { flexDirection: 'row', gap: 8 }, genderBtnAdd: { flex: 1, padding: 10, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' }, genderBtnActive: { backgroundColor: '#FFB74D', borderColor: '#FFB74D' }, genderBtnText: { fontWeight: '700', color: '#757575' },
  dateOptionRow: { flexDirection: 'row', gap: 10 }, dateOptBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CFD8DC' }, dateOptActive: { backgroundColor: colors.carbonDark, borderColor: colors.carbonDark }, dateOptText: { fontSize: 12, fontWeight: '700', color: '#546E7A' },
  modalFooterAdd: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  createBtn: { backgroundColor: '#FFD1A4', padding: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }, createBtnText: { color: colors.carbonDark, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, scannerBox: { width: 250, height: 250, borderWidth: 3, borderColor: '#10B981', backgroundColor: 'transparent', borderRadius: 20 }, scannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10 },
  contentContainer: { flex: 1, paddingHorizontal: '2%', paddingBottom: 10, width: '100%' }
});