import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, Modal, Alert, Platform, RefreshControl } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'; 

const colors = {
  bg: '#F5F9FC', primary: '#A5D6A7', headerText: '#1B5E20', tableHeader: '#C8E6C9', textDark: '#455A64', textLight: '#78909C', white: '#FFFFFF',
  statusActive: '#2196F3', statusDone: '#4CAF50', statusSnooze: '#FF9800', statusMissed: '#F44336', dangerPastel: '#FFCDD2'
};

export default function PatientMedsScreen() {
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [isLogModalVisible, setLogModalVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isLogging, setIsLogging] = useState(false);

  const params = useLocalSearchParams();
  const patientId = params.id as string;
  const patientName = params.name as string;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900; 

  // 🔥 XÓA LINK NÀY VÀ DÁN LINK "BẢN TRIỂN KHAI MỚI" CỦA BẠN VÀO ĐÂY 🔥
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5AnG5s_o2-nnXYYH0P0kb3-3N0QFgNOzg_Ix0KLDoG4SBvuqmouSLxfGPXRj068-O7A/exec';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => router.replace('/') }]);
    }
  };

  const fetchMedications = (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true); 

    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const gidRemind = '1875494973'; 
    const gidLog = '1617086808'; 

    Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}`).then(res => res.text()),
      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}`).then(res => res.text())
    ]).then(([csvRemind, csvLog]) => {
      
      let logsData: any[] = [];
      Papa.parse(csvLog, { header: true, skipEmptyLines: true, complete: (res) => { logsData = res.data; } });

      Papa.parse(csvRemind, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          let filteredData = results.data.filter((item: any) => item.PatientsID === patientId);
          filteredData.sort((a, b) => (a.Time || "").localeCompare(b.Time || ""));

          const enrichedData = filteredData.map((med: any) => {
            const usageStr = (med.Usage || '').toLowerCase();
            const doseStr = (med.Dose || '').toLowerCase();
            const isUncountable = usageStr.includes('nhỏ mắt') || usageStr.includes('tra mắt') || doseStr.includes('giọt') || doseStr.includes('cm') || doseStr.includes('ml') || doseStr.includes('lọ') || doseStr.includes('ống') || doseStr.includes('nhát xịt');

            let remaining: any = '-';
            if (!isUncountable) {
              const quantityMatch = (med.Quantity || '').match(/[\d.,]+/);
              const doseMatch = (med.Dose || '').match(/[\d.,]+/);
              const quantityNum = quantityMatch ? parseFloat(quantityMatch[0].replace(',', '.')) : 0;
              const doseNum = doseMatch ? parseFloat(doseMatch[0].replace(',', '.')) : 0;
              const usedCount = logsData.filter(log => log.PatientsID === patientId && log.MedicineName === med.MedicineName && log.Status === 'Đã sử dụng').length;

              if (quantityNum > 0) {
                remaining = parseFloat((quantityNum - (doseNum * usedCount)).toFixed(2));
                if (remaining < 0) remaining = 0; 
              }
            }
            return { ...med, calculatedRemaining: remaining };
          });

          setMedications(enrichedData);
          setLoading(false);
          setRefreshing(false); 
        }
      });
    }).catch(error => { console.error(error); setLoading(false); setRefreshing(false); });
  };

  useFocusEffect(useCallback(() => { fetchMedications(); }, [patientId]));

  const onRefresh = useCallback(() => { setRefreshing(true); fetchMedications(true); }, [patientId]);

  const deleteMedication = (medId, medName, time) => {
    const executeDelete = async () => {
      setLoading(true);
      try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'delete_med', id: medId, sheetName: 'Remind' }) });
        const result = await response.json();
        if (result.status === 'success') { Alert.alert('Đã xóa', `Đã xóa cữ ${time} của thuốc ${medName}.`); fetchMedications(); } 
        else { Alert.alert('Lỗi', result.message || 'Không thể xóa.'); }
      } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối.'); } finally { setLoading(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(`Xóa cữ lúc ${time} của thuốc "${medName}"?`)) executeDelete(); } 
    else { Alert.alert("Xác nhận xóa", `Xóa cữ lúc ${time} của thuốc "${medName}"?`, [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: executeDelete }]); }
  };

  const submitLog = async (newStatus) => {
    setIsLogging(true);

    const logPayload = {
      action: 'add',         
      sheetName: 'Log', 
      data: {                
        PatientsID: patientId,                      
        MedicineName: selectedMed.MedicineName,     
        PlannedTime: selectedMed.Time,              
        Action: 'Admin xác nhận thủ công', 
        Status: newStatus
      }
    };

    try {
      const response = await fetch(SCRIPT_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
          body: JSON.stringify(logPayload) 
      });
      
      const result = await response.json();

      if (result.status === 'success') {
          setLogModalVisible(false);
          setToastVisible(true);
          fetchMedications(true); 
          setTimeout(() => setToastVisible(false), 2000);
      } else {
          Alert.alert('Lỗi Server', result.message || 'Không thể lưu nhật ký.');
      }
    } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối máy chủ Google Sheets.'); } finally { setIsLogging(false); }
  };

  const openLogModal = (med) => { setSelectedMed(med); setLogModalVisible(true); };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <Modal visible={isLogModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác Nhận Sử Dụng (Log)</Text>
            {selectedMed && (
              <View style={{alignItems: 'center', marginBottom: 20}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: colors.textDark, textAlign: 'center'}}>{selectedMed.MedicineName}</Text>
                <Text style={{fontSize: 14, color: colors.textLight, marginTop: 5}}>Giờ quy định: <Text style={{fontWeight: 'bold', color: '#E65100'}}>{selectedMed.Time}</Text></Text>
              </View>
            )}

            {isLogging ? <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 20}} /> : (
              <View style={styles.logActions}>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusDone}]} onPress={() => submitLog('Đã sử dụng')}>
                  <MaterialCommunityIcons name="check-circle" size={26} color={colors.white} style={{marginBottom: 5}}/>
                  <Text style={styles.logBtnText}>Đã Dùng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusSnooze}]} onPress={() => submitLog('Nhắc lại')}>
                  <MaterialCommunityIcons name="alarm-snooze" size={26} color={colors.white} style={{marginBottom: 5}}/>
                  <Text style={styles.logBtnText}>+30 Phút</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusMissed}]} onPress={() => submitLog('Bỏ lỡ')}>
                  <MaterialCommunityIcons name="close-circle" size={26} color={colors.white} style={{marginBottom: 5}}/>
                  <Text style={styles.logBtnText}>Bỏ Lỡ</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setLogModalVisible(false)}><Text style={{color: colors.textDark, fontWeight: 'bold'}}>HỦY</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <View style={styles.toastContainer}><MaterialCommunityIcons name="check-circle" size={20} color={colors.white} /><Text style={styles.toastText}>Đã lưu vào Nhật ký (Log)!</Text></View>
      )}

      <View style={styles.appHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={28} color={colors.headerText} /></TouchableOpacity>
          <View><Text style={styles.appName}>Lịch Sử Dụng Thuốc</Text><Text style={styles.appTagline}>{patientName} (Mã: {patientId})</Text></View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.replace('/admin')} style={styles.headerActionBtn}><MaterialCommunityIcons name="home" size={26} color={colors.headerText} /></TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerActionBtn}><MaterialCommunityIcons name="logout" size={26} color="#D84315" /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.sectionHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.sectionTitle}>Thuốc đang sử dụng ({medications.length})</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
              {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name="refresh" size={22} color={colors.textDark} />}
            </TouchableOpacity>
          </View>
          {!isDesktop && <Text style={styles.pullToRefreshHint}><MaterialCommunityIcons name="gesture-swipe-down" size={13} color={colors.textLight} /> Vuốt xuống tải lại</Text>}
        </View>
        
        {loading ? (
          <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Đang tải danh sách thuốc...</Text></View>
        ) : (
          <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={true} style={styles.tableScrollView} contentContainerStyle={{ minWidth: '100%', flexGrow: 1 }} >
            <View style={{ flex: 1, minWidth: isDesktop ? '100%' : 950, backgroundColor: colors.white }}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerCell, { width: 90, textAlign: 'center' }]}>Thao tác</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Tên Thuốc</Text>
                <Text style={[styles.headerCell, { width: 80, textAlign: 'center' }]}>Giờ Uống</Text>
                <Text style={[styles.headerCell, { width: 80, textAlign: 'center' }]}>Liều</Text>
                <Text style={[styles.headerCell, { width: 80, textAlign: 'center' }]}>Tổng</Text>
                <Text style={[styles.headerCell, { width: 80, textAlign: 'center', color: '#E65100' }]}>Còn Lại</Text>
                <Text style={[styles.headerCell, { flex: 1 }]}>Cách Dùng</Text>
                <Text style={[styles.headerCell, { width: 70, textAlign: 'center' }]}>Nhắc</Text>
                <Text style={[styles.headerCell, { width: 110, textAlign: 'center', borderRightWidth: 0 }]}>Điểm Danh</Text>
              </View>

              <FlatList
                data={medications} showsVerticalScrollIndicator={true} style={{ flex: 1 }} keyExtractor={(item, index) => item.ID ? item.ID.toString() : index.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.headerText]} tintColor={colors.headerText} />}
                renderItem={({ item, index }) => {
                  let remaining = item.calculatedRemaining; let isLowStock = typeof remaining === 'number' && remaining <= 5; 
                  return (
                    <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                      <View style={[styles.dataCell, { width: 90, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }]}>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/edit-patient-med', params: item })} style={[styles.deleteButton, { backgroundColor: '#FFF9C4' }]}><MaterialCommunityIcons name="pencil-outline" size={18} color="#F57F17" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteMedication(item.ID, item.MedicineName, item.Time)} style={styles.deleteButton}><MaterialCommunityIcons name="trash-can-outline" size={18} color="#D32F2F" /></TouchableOpacity>
                      </View>
                      <Text style={[styles.dataCell, styles.boldText, { flex: 2 }]}>{item.MedicineName}</Text>
                      <Text style={[styles.dataCell, { width: 80, textAlign: 'center', fontWeight: 'bold', color: '#E65100' }]}>{item.Time}</Text>
                      <Text style={[styles.dataCell, { width: 80, textAlign: 'center' }]}>{item.Dose}</Text>
                      <Text style={[styles.dataCell, { width: 80, textAlign: 'center' }]}>{item.Quantity || '-'}</Text>
                      <Text style={[styles.dataCell, { width: 80, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: isLowStock ? colors.statusMissed : colors.textDark }]}>{remaining}</Text>
                      <Text style={[styles.dataCell, { flex: 1 }]}>{item.Usage}</Text>
                      <Text style={[styles.dataCell, { width: 70, textAlign: 'center', color: item.Reminder_mode === 'Bật' ? '#4CAF50' : '#F44336' }]}>{item.Reminder_mode === 'Bật' ? 'Bật' : 'Tắt'}</Text>
                      <View style={[styles.dataCell, { width: 110, justifyContent: 'center', alignItems: 'center', borderRightWidth: 0 }]}>
                        <TouchableOpacity onPress={() => openLogModal(item)} style={[styles.statusBadge, { backgroundColor: '#E3F2FD' }]}><MaterialCommunityIcons name="gesture-tap" size={16} color="#1976D2" style={{marginRight: 4}} /><Text style={[styles.statusText, {color: '#1976D2', fontSize: 12}]}>Nhật Ký</Text></TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Bệnh nhân này chưa được gán lịch thuốc nào.</Text></View>}
              />
            </View>
          </ScrollView>
        )}
      </View>
      <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/add-patient-med', params: { id: patientId, name: patientName } })} activeOpacity={0.8}><MaterialCommunityIcons name="pill" size={32} color={colors.headerText} /></TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg }, centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 15, fontSize: 16, color: colors.textLight, fontWeight: '500' }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, width: '90%', maxWidth: 420, borderRadius: 20, padding: 25, elevation: 10 }, modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark, textAlign: 'center', marginBottom: 20 },
  logActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 20 }, logBtn: { flex: 1, paddingVertical: 18, borderRadius: 12, alignItems: 'center', elevation: 2 },
  logBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 14 }, modalBtnCancel: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12 },
  toastContainer: { position: 'absolute', top: 30, right: 20, backgroundColor: colors.statusDone, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 5 },
  toastText: { color: colors.white, fontSize: 14, fontWeight: 'bold', marginLeft: 8 }, appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 20, elevation: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 }, headerActionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 10 },
  backButton: { marginRight: 15, padding: 5 }, appName: { fontSize: 22, fontWeight: '800', color: colors.headerText }, appTagline: { fontSize: 15, color: colors.headerText, opacity: 0.9, marginTop: 2, fontWeight: '600' },
  contentContainer: { flex: 1, padding: 15, width: '100%' }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15, marginLeft: 5 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark }, refreshBtn: { marginLeft: 10, padding: 5, backgroundColor: '#E8F5E9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pullToRefreshHint: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', marginBottom: 2 }, tableScrollView: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.tableHeader }, headerCell: { paddingVertical: 16, paddingHorizontal: 10, color: colors.textDark, fontWeight: '700', fontSize: 14, borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.05)', textAlign: 'left' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' }, rowEven: { backgroundColor: colors.white }, rowOdd: { backgroundColor: '#F1F8E9' }, 
  dataCell: { paddingVertical: 14, paddingHorizontal: 10, color: colors.textDark, fontSize: 14, borderRightWidth: 1, borderRightColor: '#F0F0F0' }, boldText: { fontWeight: '600', color: colors.textDark },
  statusBadge: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 20, elevation: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }, statusText: { color: colors.white, fontSize: 13, fontWeight: 'bold' },
  deleteButton: { padding: 6, backgroundColor: colors.dangerPastel, borderRadius: 8 }, emptyContainer: { padding: 50, alignItems: 'center' }, emptyText: { color: colors.textLight, fontSize: 15, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});