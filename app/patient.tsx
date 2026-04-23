import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Alert, useWindowDimensions, Platform, RefreshControl, Modal, KeyboardAvoidingView, Image } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'; 
import { CameraView, useCameraPermissions } from 'expo-camera'; 

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
  const [isZoomed, setIsZoomed] = useState(false); 

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const params = useLocalSearchParams();
  useEffect(() => {
    if (params.autoAssignId && params.autoAssignName) {
      setSelectedPatient({ PatientID: params.autoAssignId, Name: params.autoAssignName });
      setTempPrescription([]);
      setActiveModal('assign');
      router.setParams({ autoAssignId: '', autoAssignName: '' }); 
    }
  }, [params.autoAssignId]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addForm, setAddForm] = useState({ id: '', name: '', age: '', gender: 'Nam', icd: '', dayStart: '', dateMode: 'auto' });
  const [editForm, setEditForm] = useState({ id: '', name: '', age: '', gender: '', icd: '', dayStart: '' });
  
  const [tempPrescription, setTempPrescription] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ 
    medName: '', dosageValue: '', dosageUnit: 'viên', usageMethod: 'Uống sau ăn', times: [] as string[], totalQty: '', reminder: true 
  });
  
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  
  const [timeValue, setTimeValue] = useState('');

  const idRef = useRef<TextInput>(null); const nameRef = useRef<TextInput>(null); const ageRef = useRef<TextInput>(null); const icdRef = useRef<TextInput>(null); const dateRef = useRef<TextInput>(null);
  const editNameRef = useRef<TextInput>(null); const editAgeRef = useRef<TextInput>(null); const editIcdRef = useRef<TextInput>(null); const editDateRef = useRef<TextInput>(null);
  const timeRef = useRef<TextInput>(null); const dosageRef = useRef<TextInput>(null); const methodRef = useRef<TextInput>(null); const qtyRef = useRef<TextInput>(null);    

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

  const fetchData = (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true); 
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    
    // 🔥 ĐÃ SỬA: Thêm thần chú chống Cache 🔥
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

  const deletePatient = (id: any, name: any) => {
    const exec = async () => {
      setLoading(true);
      try {
        // 🔥 ĐÃ SỬA: Đổi action thành deletePatient 🔥
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
      // 🔥 ĐÃ SỬA: Đổi action thành addPatient 🔥
      const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addPatient', data: { PatientID: addForm.id, Name: addForm.name, Age: addForm.age, Gender: addForm.gender, ICD: addForm.icd, DayStart: date } }) });
      const result = await res.json();
      
      if (result.status === 'success') { 
        const newPatient = { PatientID: addForm.id, Name: addForm.name };
        setShowAddModal(false); setAddForm({ id: '', name: '', age: '', gender: 'Nam', icd: '', dayStart: '', dateMode: 'auto' }); fetchData(); 
        const jumpToAssign = () => { setSelectedPatient(newPatient); setTempPrescription([]); setActiveModal('assign'); };
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
    // 🔥 ĐÃ SỬA: Đổi action thành editPatient và bỏ sheetName dư thừa 🔥
    const payload = { action: 'editPatient', data: { PatientID: editForm.id, Name: editForm.name, Age: editForm.age, Gender: editForm.gender, ICD: editForm.icd, DayStart: editForm.dayStart } };
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.status === 'success') { setShowEditModal(false); fetchData(); if (Platform.OS === 'web') window.alert('Thành công'); else Alert.alert('Thành công', 'Đã cập nhật hồ sơ'); } 
      else { if (Platform.OS === 'web') window.alert('Lỗi Server: ' + result.message); else Alert.alert('Lỗi Server', result.message); }
    } catch (e) { if (Platform.OS === 'web') window.alert('Lỗi mạng'); else Alert.alert('Lỗi mạng', 'Không kết nối được'); } 
    finally { setIsSubmitting(false); }
  };

  const handleAddToTemp = () => {
    if (!assignForm.medName || !assignForm.dosageValue || assignForm.times.length === 0) {
        if (Platform.OS === 'web') return window.alert('Thiếu thông tin Thuốc, Khung giờ, Liều.');
        return Alert.alert('Thiếu thông tin', 'Kiểm tra Tên thuốc, Khung Giờ, Liều lượng.');
    }
    setTempPrescription([...tempPrescription, { ...assignForm, tempId: Date.now() }]);
    setAssignForm({ ...assignForm, medName: '', dosageValue: '', totalQty: '', times: [] });
  };

  const handleSavePrescription = async () => {
    if (tempPrescription.length === 0) { if (Platform.OS === 'web') return window.alert('Toa trống!'); return Alert.alert('Cảnh báo', 'Toa thuốc trống!'); }
    setIsSubmitting(true); let successCount = 0;
    try {
      for (const med of tempPrescription) {
        // 🔥 ĐÃ SỬA: Đổi action thành addRemind 🔥
        const payload = { action: 'addRemind', data: { PatientsID: selectedPatient.PatientID, MedicineName: med.medName, Time: med.times.join(', '), Reminder_mode: med.reminder ? 'Bật' : 'Tắt', Status: 'Chưa sử dụng', Usage: med.usageMethod, Quantity: med.totalQty, Dose: `${med.dosageValue} ${med.dosageUnit}` } };
        const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const textResult = await res.text(); let jsonResult;
        try { jsonResult = JSON.parse(textResult); } catch (err) { throw new Error('Lỗi Server'); }
        if (jsonResult.status === 'success') successCount++; else throw new Error(jsonResult.message);
      }
      if (successCount === tempPrescription.length) {
        if (Platform.OS === 'web') window.alert(`Đã gán ${successCount} thuốc cho ${selectedPatient.Name}.`); else Alert.alert('Hoàn tất!', `Đã gán ${successCount} thuốc cho ${selectedPatient.Name}.`);
        setTempPrescription([]); setActiveModal(null); 
      }
    } catch (error: any) { if (Platform.OS === 'web') window.alert('Lỗi: ' + error.message); else Alert.alert('Lỗi', error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleOpenScanner = async () => {
    if (Platform.OS === 'web') { alert("Camera chỉ hỗ trợ thiết bị di động."); return; }
    if (!permission?.granted) { const { status } = await requestPermission(); if (status !== 'granted') { Alert.alert('Chưa cấp quyền', 'Vui lòng cho phép Camera.'); return; } }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ type, data }: any) => {
    setShowScanner(false); const scannedId = data.trim(); setSearchQuery(scannedId); 
    const isExist = patients.some(pt => (pt.PatientID || '').toString().toLowerCase() === scannedId.toLowerCase());
    if (!isExist) {
      Alert.alert('Bệnh nhân mới!', `Chưa có hồ sơ mã [${scannedId}]. Tạo mới ngay?`, [ { text: 'Để sau', style: 'cancel' }, { text: 'Tạo hồ sơ ngay', onPress: () => { setAddForm({ id: scannedId, name: '', age: '', gender: 'Nam', icd: '', dayStart: '', dateMode: 'auto' }); setShowAddModal(true); } } ]);
    }
  };

  const filteredMeds = medicines.filter(m => {
    const searchNoAccent = medSearchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const medNoAccent = (m.MedicineName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return medNoAccent.includes(searchNoAccent);
  });

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

  const fSize = isMobile && !isZoomed ? 10 : 14; 
  const padV = isMobile && !isZoomed ? 8 : 16;   
  const padH = isMobile && !isZoomed ? 4 : 12;
  const iconSize = isMobile && !isZoomed ? 14 : 18;

  const renderTableData = () => (
    <FlatList
      style={{ flex: 1 }} 
      data={filteredPatients}
      keyExtractor={(_, index) => index.toString()}
      showsVerticalScrollIndicator={true} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.headerBgPastel]} />}
      
      stickyHeaderIndices={[0]} 

      ListHeaderComponent={
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 110 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Thao tác</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 40 } : { flex: 0.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>STT</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 100 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Mã BN</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 220 } : { flex: 2.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Họ và Tên</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 50 } : { flex: 0.8 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Tuổi</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 60 } : { flex: 0.8 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Giới</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 265 } : { flex: 2.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Mã ICD</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 155 } : { flex: 1.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', borderRightWidth: 0 }]}>Ngày Khám</Text>
        </View>
      }

      renderItem={({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
          <View style={[styles.dataCell, isMobile && isZoomed ? { width: 110 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: isMobile && !isZoomed ? 4 : 6 }]}>
            <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.successPastel, padding: isMobile && !isZoomed ? 4 : 6}]} onPress={() => { setSelectedPatient(item); setTempPrescription([]); setActiveModal('assign'); }}><MaterialCommunityIcons name="pill" size={iconSize} color={colors.successText} /></TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.warningPastel, padding: isMobile && !isZoomed ? 4 : 6}]} onPress={() => { setEditForm({ id: item.PatientID, name: item.Name, age: item.Age, gender: item.Gender, icd: item.ICD, dayStart: item.DayStart }); setShowEditModal(true); }}><MaterialCommunityIcons name="pencil-outline" size={iconSize} color={colors.warningText} /></TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.dangerPastel, padding: isMobile && !isZoomed ? 4 : 6}]} onPress={() => deletePatient(item.PatientID, item.Name)}><MaterialCommunityIcons name="trash-can-outline" size={iconSize} color={colors.dangerText} /></TouchableOpacity>
          </View>
          
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 40 } : { flex: 0.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', color: colors.textLight }]}>{index + 1}</Text>
          
          <TouchableOpacity style={[styles.dataCell, isMobile && isZoomed ? { width: 100 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, justifyContent: 'center', alignItems: 'center' }]} onPress={() => router.push({ pathname: '/patient-meds', params: { id: item.PatientID, name: item.Name } } as any)}>
            <View style={[styles.patientIdBadge, isMobile && !isZoomed && { paddingVertical: 4, paddingHorizontal: 6 }]}><Text style={[styles.patientIdText, {fontSize: fSize - 1}]}>{item.PatientID}</Text></View>
          </TouchableOpacity>
          
          <Text style={[styles.dataCell, styles.boldText, isMobile && isZoomed ? { width: 220 } : { flex: 2.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.headerBgPastel }]} numberOfLines={2}>{item.Name}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 50 } : { flex: 0.8 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>{item.Age}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 60 } : { flex: 0.8 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>{item.Gender}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 265 } : { flex: 2.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.infoBadgeText, fontWeight: '600' }]} numberOfLines={2}>{item.ICD}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 155 } : { flex: 1.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', borderRightWidth: 0 }]}>{item.DayStart}</Text>
        </View>
      )}
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có hồ sơ bệnh nhân nào.</Text></View>}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {showScanner && Platform.OS !== 'web' && (
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

        {isMobile ? (
          <View style={[styles.header, styles.headerMobile]}>
             <View style={styles.headerTopRowMobile}>
               <View style={styles.brandBoxMobile}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircleMobile}>
                        <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.brandMediMobile}>Medi<Text style={styles.brandHubMobile}>Hub</Text></Text>
                  </View>
               </View>
               <View style={{flexDirection: 'row'}}>
                 <TouchableOpacity style={styles.headerIconBtnMobile} onPress={() => router.push('/admin')}>
                    <MaterialCommunityIcons name="home-outline" size={22} color={colors.white} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.headerIconBtnMobile, {marginLeft: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)'}]} onPress={handleLogout}>
                    <MaterialCommunityIcons name="power" size={22} color="#FECACA" />
                 </TouchableOpacity>
               </View>
             </View>
             <View style={styles.headerBottomRowMobile}>
                <Text style={styles.pageTitleMobile}>HỒ SƠ BỆNH NHÂN</Text>
             </View>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.brandBox}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircle}>
                        <Image source={require('../assets/images/favicon.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                  </View>
                </View>
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
                <View style={styles.smallDivider} />
                <TouchableOpacity style={styles.navBtn} onPress={handleLogout}>
                  <MaterialCommunityIcons name="power" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.textLight} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Tìm mã BN hoặc tên bệnh nhân..." 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              outlineStyle="none" // Chống viền xanh khó chịu trên Web
            />
            <TouchableOpacity style={styles.scanBtn} onPress={handleOpenScanner}>
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.sectionTitle}>Danh Sách Bệnh Nhân</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              {isMobile && (
                <TouchableOpacity 
                  onPress={() => setIsZoomed(!isZoomed)} 
                  style={[styles.zoomBtn, {backgroundColor: isZoomed ? '#E2E8F0' : colors.zoomBtnBg}]}
                >
                  <MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.carbonDark : colors.white} />
                  <Text style={[styles.zoomBtnText, {color: isZoomed ? colors.carbonDark : colors.white}]}>
                    {isZoomed ? "Thu nhỏ" : "Phóng to"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
                {refreshing ? <ActivityIndicator size="small" color={colors.headerBgPastel} /> : <MaterialCommunityIcons name="refresh" size={20} color={colors.carbonDark} />}
              </TouchableOpacity>
            </View>
          </View>

          {loading && patients.length === 0 ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.headerBgPastel} /><Text style={styles.loadingText}>Đang tải dữ liệu...</Text></View>
          ) : (
            <View style={styles.tableWrapper}>
              {isMobile && isZoomed ? (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                  <View style={{ width: 1000, flex: 1, backgroundColor: colors.white }}> 
                    {renderTableData()}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ width: '100%', flex: 1, backgroundColor: colors.white }}>
                  {renderTableData()}
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <MaterialCommunityIcons name="account-plus" size={30} color="#fff" />
        </TouchableOpacity>

        <Modal visible={showAddModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}><View style={[styles.modalContainer, { width: isDesktop ? 600 : '95%' }]}>
            <View style={styles.modalHeaderAdd}><TouchableOpacity onPress={() => setShowAddModal(false)}><MaterialCommunityIcons name="arrow-left" size={26} color={colors.carbonDark} /></TouchableOpacity><Text style={styles.modalTitleAdd}>Thêm Hồ Sơ Bệnh Nhân</Text><View style={{width: 26}} /></View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.noticeBox}><Text style={styles.noticeText}>Nhập thông tin bệnh nhân. Bấm phím Tab hoặc Enter để chuyển nhanh sang ô tiếp theo.</Text></View>
              <Text style={styles.fieldLabel}>Mã Bệnh Nhân (*)</Text>
              <TextInput ref={idRef} style={styles.fieldInput} value={addForm.id} onChangeText={(t) => setAddForm({...addForm, id: t})} onSubmitEditing={() => nameRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" autoFocus={true} />
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
                onSubmitEditing={() => { if (addForm.dateMode === 'manual') dateRef.current?.focus(); else handleAddSubmit(); }}
                blurOnSubmit={true} returnKeyType={addForm.dateMode === 'manual' ? "next" : "done"}
              />
              <Text style={styles.fieldLabel}>Ngày khám</Text>
              <View style={styles.dateOptionRow}>
                <TouchableOpacity style={[styles.dateOptBtn, addForm.dateMode === 'auto' && styles.dateOptActive]} onPress={() => setAddForm({...addForm, dateMode: 'auto'})}><Text style={[styles.dateOptText, addForm.dateMode === 'auto' && {color: '#fff'}]}>Hệ thống tạo</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.dateOptBtn, addForm.dateMode === 'manual' && styles.dateOptActive]} onPress={() => setAddForm({...addForm, dateMode: 'manual'})}><Text style={[styles.dateOptText, addForm.dateMode === 'manual' && {color: '#fff'}]}>Thủ công</Text></TouchableOpacity></View>
              {addForm.dateMode === 'manual' && 
                <TextInput ref={dateRef} style={[styles.fieldInput, {marginTop: 10}]} placeholder="DD/MM/YYYY" value={addForm.dayStart} onChangeText={(t) => setAddForm({...addForm, dayStart: t})} onSubmitEditing={handleAddSubmit} returnKeyType="done" />
              }
              <View style={{ height: 40 }} /> 
            </ScrollView>
            <View style={styles.modalFooterAdd}><TouchableOpacity style={styles.createBtn} onPress={handleAddSubmit} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color={colors.carbonDark} /> : <Text style={styles.createBtnText}>TẠO HỒ SƠ</Text>}</TouchableOpacity></View>
          </View></View>
        </Modal>

        <Modal visible={showEditModal} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}><View style={[styles.modalContainer, { width: isDesktop ? 600 : '95%' }]}>
            <View style={[styles.modalHeaderAdd, {backgroundColor: '#E1F5FE'}]}><TouchableOpacity onPress={() => setShowEditModal(false)}><MaterialCommunityIcons name="close" size={26} color={colors.carbonDark} /></TouchableOpacity><Text style={styles.modalTitleAdd}>Chỉnh Sửa Hồ Sơ</Text><View style={{width: 26}} /></View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Mã Bệnh Nhân (Không thể sửa)</Text>
              <TextInput style={[styles.fieldInput, {backgroundColor: '#F5F5F5'}]} value={editForm.id} editable={false} />
              <Text style={styles.fieldLabel}>Họ và Tên</Text>
              <TextInput ref={editNameRef} style={styles.fieldInput} value={editForm.name} onChangeText={(t)=>setEditForm({...editForm, name:t})} onSubmitEditing={() => editAgeRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" autoFocus={true} />
              <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex:1}}>
                  <Text style={styles.fieldLabel}>Tuổi</Text>
                  <TextInput ref={editAgeRef} style={styles.fieldInput} value={editForm.age} onChangeText={(t)=>setEditForm({...editForm, age:t})} onSubmitEditing={() => editIcdRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" />
                </View>
                <View style={{flex:1}}><Text style={styles.fieldLabel}>Giới tính</Text><View style={styles.genderRow}>{['Nam','Nữ','Khác'].map(g=>(<TouchableOpacity key={g} style={[styles.genderBtnAdd, editForm.gender===g && styles.genderBtnActive]} onPress={()=>setEditForm({...editForm, gender:g})}><Text style={[styles.genderBtnText, editForm.gender===g && {color:'#fff'}]}>{g}</Text></TouchableOpacity>))}</View></View>
              </View>
              <Text style={styles.fieldLabel}>Mã ICD / Chẩn đoán</Text>
              <TextInput ref={editIcdRef} style={[styles.fieldInput,{height:50}]} multiline value={editForm.icd} onChangeText={(t)=>setEditForm({...editForm, icd:t})} onSubmitEditing={() => editDateRef.current?.focus()} blurOnSubmit={true} returnKeyType="next" />
              <Text style={styles.fieldLabel}>Ngày khám</Text>
              <TextInput ref={editDateRef} style={styles.fieldInput} value={editForm.dayStart} onChangeText={(t)=>setEditForm({...editForm, dayStart:t})} onSubmitEditing={handleEditSubmit} returnKeyType="done" />
              <View style={{ height: 40 }} /> 
            </ScrollView>
            <View style={styles.modalFooterAdd}>
              <TouchableOpacity style={[styles.createBtn, {backgroundColor:'#81D4FA'}]} onPress={handleEditSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={colors.carbonDark} /> : <Text style={styles.createBtnText}>CẬP NHẬT HỒ SƠ</Text>}
              </TouchableOpacity>
            </View>
          </View></View>
        </Modal>

        <Modal visible={activeModal === 'assign'} animationType="fade" transparent={false}>
          <SafeAreaView style={{flex: 1, backgroundColor: '#F0FDF4'}}>
            <View style={[styles.header, {backgroundColor: '#10B981', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0}]}>
              <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => setActiveModal(null)}><MaterialCommunityIcons name="arrow-left" size={28} color="#fff" /></TouchableOpacity>
                <View style={{flex: 1, marginLeft: 15}}><Text style={{color:'#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1}}>GÁN THUỐC / SẢN PHẨM MỚI</Text><Text style={{color:'#DCFCE7', fontSize:13}}>Cho BN: {selectedPatient?.Name} ({selectedPatient?.PatientID})</Text></View>
                <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15}]} onPress={handleSavePrescription} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{color: '#10B981', fontWeight: '900', fontSize: 14}}>LƯU VÀO LỊCH</Text>}
                </TouchableOpacity>
              </View>
            </View>

            <View style={{flex: 1, flexDirection: isDesktop ? 'row' : 'column', padding: 15, gap: 15}}>
              <ScrollView style={{flex: 1.5, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                
                <View style={{zIndex: 50}}>
                  <Text style={styles.fieldLabel}>Tên Thuốc / Sản phẩm (*)</Text>
                  <TouchableOpacity style={[styles.fieldInput, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]} onPress={() => setShowMedDropdown(!showMedDropdown)}>
                    <Text style={{color: assignForm.medName ? colors.carbonDark : '#9CA3AF', fontSize: 15}}>{assignForm.medName || 'Bấm để chọn từ Kho D&C...'}</Text>
                    <MaterialCommunityIcons name={showMedDropdown ? "chevron-up" : "chevron-down"} size={22} color="#9CA3AF" />
                  </TouchableOpacity>

                  {showMedDropdown && (
                    <View style={styles.dropdownBox}>
                      <View style={styles.dropdownSearch}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                        <TextInput style={styles.dropdownInput} placeholder="Tìm nhanh tên thuốc..." value={medSearchQuery} onChangeText={setMedSearchQuery} outlineStyle="none" />
                      </View>
                      <ScrollView style={{maxHeight: 200}} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                        {filteredMeds.map((med, idx) => (
                          <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => { 
                            let newUnit = assignForm.dosageUnit;
                            let newMethod = assignForm.usageMethod;
                            let newDosage = assignForm.dosageValue;
                            
                            const medFullInfo = Object.values(med).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                            if (medFullInfo.includes('nho') || medFullInfo.includes('dung dich') || medFullInfo.includes('giot')) { newUnit = 'giọt'; if (!newDosage) newDosage = '1'; if (!newMethod.includes('Nhỏ')) newMethod = 'Nhỏ mắt TRÁI'; } 
                            else if (medFullInfo.includes('tra mat') || medFullInfo.includes('mo') || medFullInfo.includes('tuyp')) { newUnit = 'cm'; newDosage = '0,5-1'; if (!newMethod.includes('Tra')) newMethod = 'Tra mắt TRÁI'; } 
                            else if (medFullInfo.includes('vien') || medFullInfo.includes('nang') || medFullInfo.includes('uong')) { newUnit = 'viên'; if (!newDosage) newDosage = '1'; if (!newMethod.includes('Uống')) newMethod = 'Uống sau ăn'; } 
                            else if (medFullInfo.includes('ngoai') || medFullInfo.includes('lau') || medFullInfo.includes('chuom')) { newUnit = 'cái'; if (!newDosage) newDosage = '1'; if (medFullInfo.includes('lau')) newMethod = 'Lau bờ mi'; if (medFullInfo.includes('chuom')) newMethod = 'Chườm ấm mắt 30 phút'; } 
                            else if (medFullInfo.includes('xit')) { newUnit = 'nhát xịt'; } else if (medFullInfo.includes('ml') || medFullInfo.includes('siro')) { newUnit = 'ml'; }
                            
                            setAssignForm({...assignForm, medName: med.MedicineName, dosageUnit: newUnit, usageMethod: newMethod, dosageValue: newDosage}); 
                            setShowMedDropdown(false); setMedSearchQuery(''); 
                            
                            setTimeout(() => timeRef.current?.focus(), 150);
                          }}>
                            <Text style={styles.dropdownItemText}>{med.MedicineName}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <Text style={styles.fieldLabel}>Các Khung Giờ Uống/Nhỏ Mắt (*)</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 5, alignItems: 'center'}}>
                  {assignForm.times.map((time, idx) => (
                    <TouchableOpacity key={idx} style={[styles.timeBadge, {flexDirection: 'row', alignItems: 'center'}]} onPress={() => {
                        const newTimes = [...assignForm.times];
                        newTimes.splice(idx, 1);
                        setAssignForm({...assignForm, times: newTimes});
                    }}>
                      <Text style={{fontWeight:'800', color: '#047857'}}>{time}</Text>
                      <MaterialCommunityIcons name="close-circle" size={16} color="#047857" style={{marginLeft: 5}} />
                    </TouchableOpacity>
                  ))}
                  
                  <TextInput 
                    ref={timeRef}
                    style={[styles.fieldInput, { width: 110, paddingVertical: 8, height: 40, marginTop: 0 }]} 
                    placeholder="Vd: 08:30" 
                    value={timeValue} 
                    onChangeText={setTimeValue} 
                    outlineStyle="none"
                    onSubmitEditing={() => {
                      if(timeValue.trim()) {
                        let formattedTime = timeValue.trim();
                        if (/^\d{1,2}$/.test(formattedTime)) {
                          formattedTime = formattedTime.padStart(2, '0') + ':00';
                        } else if (/^\d{3,4}$/.test(formattedTime)) {
                          let min = formattedTime.slice(-2);
                          let hr = formattedTime.slice(0, -2).padStart(2, '0');
                          formattedTime = `${hr}:${min}`;
                        }
                        if(!assignForm.times.includes(formattedTime)){
                          setAssignForm({...assignForm, times: [...assignForm.times, formattedTime]});
                        }
                        setTimeValue('');
                        timeRef.current?.focus(); 
                      } else {
                        dosageRef.current?.focus();
                      }
                    }} 
                    blurOnSubmit={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10}}>
                    {['08:00', '12:00', '18:00', '20:00'].map(t => (
                        <TouchableOpacity key={t} style={styles.quickTimeBtn} onPress={() => {
                            if(!assignForm.times.includes(t)){
                                setAssignForm({...assignForm, times: [...assignForm.times, t]});
                            }
                        }}>
                            <Text style={styles.quickTimeText}>+ {t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.fieldLabel}>Liều Lượng 1 Lần (*)</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                  <TextInput 
                    ref={dosageRef}
                    style={[styles.fieldInput, {width: 100}]} 
                    placeholder="Vd: 1, 2" 
                    value={assignForm.dosageValue} 
                    onChangeText={(t)=>setAssignForm({...assignForm, dosageValue:t})} 
                    onSubmitEditing={() => methodRef.current?.focus()} 
                    blurOnSubmit={false}
                    returnKeyType="next"
                    outlineStyle="none"
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['giọt','viên','lọ','ống','nhát xịt','ml','cm','cái'].map(u => (
                      <TouchableOpacity key={u} style={[styles.unitBtn, assignForm.dosageUnit === u && styles.unitBtnActive]} onPress={()=>setAssignForm({...assignForm, dosageUnit:u})}>
                        <Text style={[styles.unitBtnText, assignForm.dosageUnit===u && {color:'#fff'}]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.fieldLabel}>Cách Dùng (*)</Text>
                <TextInput 
                  ref={methodRef}
                  style={[styles.fieldInput, { marginBottom: 8 }]} 
                  placeholder="Gõ cách dùng riêng..." 
                  value={assignForm.usageMethod} 
                  onChangeText={(t)=>setAssignForm({...assignForm, usageMethod:t})} 
                  onSubmitEditing={() => qtyRef.current?.focus()} 
                  blurOnSubmit={false}
                  returnKeyType="next"
                  outlineStyle="none"
                />
                <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
                  {['Uống sau ăn','Uống trước ăn 60 phút','Nhỏ mắt TRÁI','Nhỏ mắt PHẢI','Tra mắt TRÁI','Tra mắt PHẢI','Dùng ngoài','Lau bờ mi','Chườm ấm mắt'].map(m => (
                    <TouchableOpacity key={m} style={[styles.methodBtn, assignForm.usageMethod === m && styles.methodBtnActive]} 
                      onPress={() => {
                        let newUnit = assignForm.dosageUnit; let newDosage = assignForm.dosageValue;
                        const noAccentM = m.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        if (noAccentM.includes('nho')) { newUnit = 'giọt'; if(!newDosage) newDosage='1'; }
                        else if (noAccentM.includes('tra mat')) { newUnit = 'cm'; newDosage = '0,5-1'; }
                        else if (noAccentM.includes('uong')) { newUnit = 'viên'; if(!newDosage) newDosage='1'; }
                        else if (noAccentM.includes('ngoai') || noAccentM.includes('lau') || noAccentM.includes('chuom')) { newUnit = 'cái'; if(!newDosage) newDosage='1'; }
                        setAssignForm({...assignForm, usageMethod: m, dosageUnit: newUnit, dosageValue: newDosage});
                        qtyRef.current?.focus(); 
                      }}>
                      <Text style={[styles.methodBtnText, assignForm.usageMethod===m && {color:'#fff'}]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{flexDirection:'row', gap:20, marginTop:15}}>
                  <View style={{flex:1}}>
                    <Text style={styles.fieldLabel}>Cấp Số Lượng Tổng</Text>
                    <TextInput 
                      ref={qtyRef}
                      style={styles.fieldInput} 
                      placeholder="Vd: 30, 1 lọ..." 
                      value={assignForm.totalQty} 
                      onChangeText={(t)=>setAssignForm({...assignForm, totalQty:t})} 
                      onSubmitEditing={handleAddToTemp} 
                      returnKeyType="done"
                      outlineStyle="none"
                    />
                  </View>
                  <View style={{alignItems:'center'}}><Text style={styles.fieldLabel}>Nhắc nhở (App)</Text>
                    <View style={{flexDirection:'row', gap:5}}>
                      <TouchableOpacity style={[styles.toggleBtn, assignForm.reminder && {backgroundColor:'#10B981'}]} onPress={()=>setAssignForm({...assignForm, reminder:true})}><Text style={{color: assignForm.reminder ? '#fff' : '#64748B', fontWeight:'bold'}}>Bật</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.toggleBtn, !assignForm.reminder && {backgroundColor:'#E2E8F0'}]} onPress={()=>setAssignForm({...assignForm, reminder:false})}><Text style={{color: !assignForm.reminder ? '#64748B' : '#fff', fontWeight:'bold'}}>Tắt</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.addTempBtn} onPress={handleAddToTemp}>
                  <MaterialCommunityIcons name="sticker-plus-outline" size={24} color="#fff" />
                  <Text style={{color:'#fff', fontWeight:'900', marginLeft:8, fontSize:16, letterSpacing: 1}}>LƯU VÀO TOA TẠM</Text>
                </TouchableOpacity>
                <View style={{height: 40}} />
              </ScrollView>

              <View style={{flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, borderWidth: 2, borderColor: '#D1FAE5'}}>
                <View style={{backgroundColor:'#A7F3D0', padding:15, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                  <Text style={{fontWeight:'900', color:'#065F46', fontSize: 15, letterSpacing: 1}}>TOA THUỐC ĐANG GÁN</Text>
                  <View style={styles.countBadge}><Text style={{color:'#fff', fontWeight:'bold'}}>{tempPrescription.length}</Text></View>
                </View>
                <FlatList data={tempPrescription} keyExtractor={(item)=>item.tempId.toString()} style={{padding: 10}} renderItem={({item})=>(
                  <View style={styles.tempItem}>
                    <View style={{flex:1}}>
                      <Text style={{fontWeight:'800', color:colors.carbonDark, fontSize: 15}}>{item.medName}</Text>
                      <Text style={{fontSize:13, color:colors.textLight, marginTop: 4}}>{item.dosageValue} {item.dosageUnit} | {item.usageMethod}</Text>
                      <Text style={{fontSize:12, color:'#10B981', fontWeight:'700', marginTop: 4}}>Giờ dùng: {item.times.join(', ')}</Text>
                    </View>
                    <TouchableOpacity onPress={()=>setTempPrescription(tempPrescription.filter(x=>x.tempId!==item.tempId))}><MaterialCommunityIcons name="close-circle" size={26} color="#EF4444" /></TouchableOpacity>
                  </View>
                )} ListEmptyComponent={<View style={{alignItems:'center', marginTop:150, opacity:0.3}}><MaterialCommunityIcons name="clipboard-text-outline" size={60} /><Text style={{fontWeight:'700', marginTop: 10}}>Toa thuốc đang trống</Text></View>} />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg }, 
  container: { flex: 1, width: '100%' }, 
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: colors.textLight, fontWeight: '600' },
  
  header: { backgroundColor: colors.headerBgPastel, paddingVertical: 18, paddingHorizontal: '2%', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: colors.headerBgPastel, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  brandBox: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', flexDirection: 'row', alignItems: 'center' },
  
  brandRow: { flexDirection: 'row', alignItems: 'center' }, logoCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  brandMedi: { fontSize: 30, fontWeight: '600', color: '#FFFFFF', marginLeft: 12, letterSpacing: 1, fontStyle: 'italic' },
  brandHub: { fontWeight: '900', color: '#FFFFFF' },
  
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 }, titleUnderline: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginTop: 4 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
  navText: { marginLeft: 6, fontWeight: '700', color: '#FFFFFF', fontSize: 14 }, 
  iconBtn: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  
  headerMobile: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 15 },
  headerTopRowMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBoxMobile: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  
  logoCircleMobile: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  brandMediMobile: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginLeft: 10, fontStyle: 'italic' }, brandHubMobile: { fontWeight: '900' },
  headerIconBtnMobile: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerBottomRowMobile: { marginTop: 15, alignItems: 'center' },
  pageTitleMobile: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },

  contentContainer: { flex: 1, paddingHorizontal: '2%', paddingBottom: 10, width: '100%' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, paddingLeft: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, marginLeft: 10 },
  scanBtn: { backgroundColor: colors.headerBgPastel, paddingHorizontal: 20, paddingVertical: 14, borderTopRightRadius: 15, borderBottomRightRadius: 15, justifyContent: 'center', alignItems: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark },
  zoomBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 1 },
  zoomBtnText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  refreshBtn: { marginLeft: 12, padding: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },

  tableWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.tableHeader, borderBottomWidth: 1, borderBottomColor: '#B0BEC5', zIndex: 10, elevation: 2 },
  headerCell: { color: colors.carbonDark, fontWeight: '900', borderRightWidth: 1, borderRightColor: '#B0BEC5' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', minHeight: 60 },
  rowEven: { backgroundColor: colors.white }, rowOdd: { backgroundColor: '#FFFDF9' }, 
  dataCell: { color: colors.carbonDark, borderRightWidth: 1, borderRightColor: '#F1F5F9', textAlignVertical: 'center' },
  boldText: { fontWeight: '800' }, 
  
  patientIdBadge: { backgroundColor: colors.infoBadgeBg, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', alignItems: 'center' },
  patientIdText: { fontWeight: '800', color: colors.infoBadgeText },
  actionButton: { borderRadius: 8 },
  
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: colors.headerBgPastel, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 6, borderWidth: 3, borderColor: colors.white },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 20 },
  modalHeaderAdd: { backgroundColor: '#FFE5C4', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitleAdd: { fontSize: 18, fontWeight: '800', color: colors.carbonDark }, modalBody: { padding: 20, maxHeight: 550 },
  noticeBox: { backgroundColor: '#FFD7D1', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#FFAB91', marginBottom: 20 }, noticeText: { fontSize: 13, color: '#D84315', fontStyle: 'italic', lineHeight: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#455A64', marginBottom: 8, marginTop: 15 },
  fieldInput: { borderWidth: 1, borderColor: '#CFD8DC', borderRadius: 10, padding: 12, fontSize: 16, color: colors.carbonDark, backgroundColor: '#fff' },
  genderRow: { flexDirection: 'row', gap: 8 }, genderBtnAdd: { flex: 1, padding: 10, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' }, genderBtnActive: { backgroundColor: '#FFB74D', borderColor: '#FFB74D' }, genderBtnText: { fontWeight: '700', color: '#757575' },
  dateOptionRow: { flexDirection: 'row', gap: 10 }, dateOptBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CFD8DC' }, dateOptActive: { backgroundColor: colors.carbonDark, borderColor: colors.carbonDark }, dateOptText: { fontSize: 12, fontWeight: '700', color: '#546E7A' },
  modalFooterAdd: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  createBtn: { backgroundColor: '#FFD1A4', padding: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }, createBtnText: { color: colors.carbonDark, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  emptyContainer: { padding: 40, alignItems: 'center' }, emptyText: { color: colors.textLight, fontSize: 16, fontStyle: 'italic' },

  dropdownBox: { position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#CFD8DC', elevation: 5, overflow: 'hidden', zIndex: 100 },
  dropdownSearch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC' }, dropdownInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, dropdownItemText: { fontSize: 15, color: colors.carbonDark, fontWeight: '600' },
  timeBadge: { backgroundColor:'#E8F5E9', paddingHorizontal:12, paddingVertical:6, borderRadius:20 }, quickTimeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E0F2FE', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD' }, quickTimeText: { fontSize: 13, fontWeight: '700', color: '#0284C7' },
  unitBtn: { paddingHorizontal:18, paddingVertical:10, borderRadius:20, backgroundColor:'#F1F5F9', marginRight:10, borderWidth:1, borderColor:'#E2E8F0' }, unitBtnActive: { backgroundColor:'#FB923C', borderColor:'#FB923C' }, unitBtnText: { fontSize:13, fontWeight:'700', color:'#64748B' },
  methodBtn: { paddingHorizontal:16, paddingVertical:10, borderRadius:20, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' }, methodBtnActive: { backgroundColor:'#10B981', borderColor:'#10B981' }, methodBtnText: { fontSize:13, fontWeight:'700', color:'#64748B' },
  toggleBtn: { paddingHorizontal:20, paddingVertical:12, borderRadius:20, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
  addTempBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, marginTop: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  tempItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 10 },
  countBadge: { backgroundColor:'#059669', paddingHorizontal:12, paddingVertical:4, borderRadius:12 },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, scannerBox: { width: 250, height: 250, borderWidth: 3, borderColor: '#10B981', backgroundColor: 'transparent', borderRadius: 20 }, scannerText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10 },
});