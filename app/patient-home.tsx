import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Alert, Platform, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router'; 
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import { colors } from '../constants/theme';
import { DashboardHeader } from '../components/Dashboard/DashboardHeader';
import { MedCardItem } from '../components/Dashboard/MedCardItem';
import { getMedTerminology } from '../utils/helpers'; 

import { ConfirmDoseModal } from '../components/Modals/ConfirmDoseModal';
import { ContactClinicModal } from '../components/Modals/ContactClinicModal';
import { ProfileModal } from '../components/Modals/ProfileModal';
import { HistoryModal } from '../components/Modals/HistoryModal';
import { SymptomModal } from '../components/Modals/SymptomModal';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

export default function PatientHomeScreen() {
  const params = useLocalSearchParams();
  const patientId = params.id as string;
  const patientName = params.name as string;

  // State điều khiển màn hình Kép (Menu và Danh sách thuốc)
  const [activeView, setActiveView] = useState<'menu' | 'meds'>('menu');

  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [isSymptomModalVisible, setSymptomModalVisible] = useState(false);
  const [isLogModalVisible, setLogModalVisible] = useState(false);
  const [isSosModalVisible, setSosModalVisible] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const fetchMedications = async (isRefreshing = false) => {
    if (!isRefreshing) {
      const cachedMeds = await AsyncStorage.getItem(`@cached_meds_${patientId}`);
      if (cachedMeds) { setMedications(JSON.parse(cachedMeds)); setLoading(false); } else setLoading(true);
    }
    const csvUrl = `https://docs.google.com/spreadsheets/d/1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q/export?format=csv&gid=2073748495&t=${new Date().getTime()}`;
    fetch(csvUrl, { cache: 'no-store' }).then(res => res.text()).then(async csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            let rawMeds = results.data.filter((item: any) => item.PatientsID === patientId);
            
            // TẠO MẢNG BONG BÓNG
            let groupedMeds = rawMeds.map(med => {
              const times = med.Time ? med.Time.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
              return { ...med, timeArray: times }; 
            });

            setMedications(groupedMeds); 
            await AsyncStorage.setItem(`@cached_meds_${patientId}`, JSON.stringify(groupedMeds)); 
            setLoading(false); setRefreshing(false);
          }
        });
      }).catch(() => { setLoading(false); setRefreshing(false); });
  };

  const fetchHistoryLogs = async (background = false) => {
    if (!background) {
      const cachedHistory = await AsyncStorage.getItem(`@cached_history_${patientId}`);
      if (cachedHistory) setHistoryLogs(JSON.parse(cachedHistory)); else setLoadingHistory(true);
    }
    const csvUrl = `https://docs.google.com/spreadsheets/d/1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q/export?format=csv&gid=1373475002&t=${new Date().getTime()}`;
    fetch(csvUrl, { cache: 'no-store' }).then(res => res.text()).then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            let myLogs = results.data.filter((item: any) => item.PatientsID === patientId);
            setHistoryLogs(myLogs); await AsyncStorage.setItem(`@cached_history_${patientId}`, JSON.stringify(myLogs)); 
            if (!background) setLoadingHistory(false);
          }
        });
      }).catch(() => { if(!background) setLoadingHistory(false); });
  };

  useFocusEffect(useCallback(() => { fetchMedications(); fetchHistoryLogs(true); }, [patientId]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchMedications(true); fetchHistoryLogs(true); }, [patientId]);

  // THUẬT TOÁN ĐẾM TIẾN ĐỘ & TÌM LIỀU THEO GIỜ THỰC TẾ
  const dashboardStats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const todayTakenLogs = historyLogs.filter(log => log.Status === 'Đã sử dụng' && (log.Timestamp && log.Timestamp.includes(todayStr)));
    const takenKeys = todayTakenLogs.map(log => `${log.MedicineName}-${log.PlannedTime}`);
    
    let totalDoses = 0;
    let completedDoses = 0;
    let allPendingDoses: any[] = [];

    medications.forEach(med => {
      if (med.timeArray) {
        med.timeArray.forEach((time: string) => {
          totalDoses++; 
          const key = `${med.MedicineName}-${time}`;
          if (takenKeys.includes(key)) {
            completedDoses++; 
          } else {
            allPendingDoses.push({ ...med, Time: time }); 
          }
        });
      }
    });

    allPendingDoses.sort((a, b) => a.Time.localeCompare(b.Time));

    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    let nextDose = null;

    if (allPendingDoses.length > 0) {
      const upcomingDoses = allPendingDoses.filter(med => {
        const [h, m] = med.Time.split(':').map(Number);
        const doseMinutes = h * 60 + m;
        return doseMinutes >= currentMinutes - 60; // Lọc cữ thực tế
      });

      if (upcomingDoses.length > 0) {
        nextDose = upcomingDoses[0];
      } else {
        nextDose = allPendingDoses[allPendingDoses.length - 1];
      }
    }

    return {
      total: totalDoses, 
      completed: completedDoses, 
      progressPercent: totalDoses > 0 ? (completedDoses / totalDoses) * 100 : 0,
      nextDose,
      allPending: allPendingDoses
    };
  }, [medications, historyLogs]);


  const submitLog = async (newStatus: string) => {
    setIsLogging(true);
    const logPayload = { action: 'add', sheetName: 'Log', data: { PatientsID: patientId, MedicineName: selectedMed.MedicineName, PlannedTime: selectedMed.Time, Action: 'Bệnh nhân tự xác nhận', Status: newStatus } };
    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(logPayload) });
      const result = JSON.parse(await response.text());
      if (result.status === 'success') {
          if (newStatus === 'Đã sử dụng') {
             const terms = getMedTerminology(selectedMed);
             if (terms.action === 'nhỏ' || terms.action === 'tra') {
                 // KHOẢNG NGHỈ THÔNG MINH
                 const otherPendingEyeDrops = dashboardStats.allPending.filter(
                     (med: any) =>
                         med.Time === selectedMed.Time && 
                         med.MedicineName !== selectedMed.MedicineName &&
                         (getMedTerminology(med).action === 'nhỏ' || getMedTerminology(med).action === 'tra')
                 );
                 if (otherPendingEyeDrops.length > 0) setCooldown(600); 
             }
          }
          setLogModalVisible(false); setToastVisible(true); fetchHistoryLogs(true); 
          setTimeout(() => setToastVisible(false), 2500);
      } else Alert.alert('Lỗi', result.message);
    } catch (error) { Alert.alert('Lỗi mạng', 'Vui lòng kiểm tra kết nối.'); } finally { setIsLogging(false); }
  };

  const submitSymptoms = async (symptoms: string) => {
    setIsLogging(true);
    const logPayload = { 
      action: 'add', sheetName: 'TrieuChung', 
      data: { PatientsID: patientId, MedicineName: patientName, PlannedTime: `${new Date().getHours()}:${new Date().getMinutes() < 10 ? '0'+new Date().getMinutes() : new Date().getMinutes()} - ${new Date().getDate()}/${new Date().getMonth() + 1}`, Action: 'Báo cáo triệu chứng', Status: symptoms } 
    };
    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(logPayload) });
      const result = JSON.parse(await response.text());
      if (result.status === 'success') {
          setSymptomModalVisible(false); setToastVisible(true); setTimeout(() => setToastVisible(false), 2500);
      }
    } catch (error) { Alert.alert('Lỗi', 'Không thể gửi báo cáo.'); } 
    finally { setIsLogging(false); }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn thoát?', [
      { text: 'Hủy', style: 'cancel' }, 
      { text: 'Thoát', style: 'destructive', onPress: () => {
        AsyncStorage.removeItem('patientId'); AsyncStorage.removeItem('patientName'); router.replace('/'); 
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
         <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <>
          {/* ========================================== */}
          {/* MÀN HÌNH 1: MENU GỌN GÀNG TỐI ƯU UX */}
          {/* ========================================== */}
          {activeView === 'menu' && (
            <ScrollView contentContainerStyle={{ paddingBottom: 50 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
              <DashboardHeader 
                patientName={patientName} dashboardStats={dashboardStats} cooldown={cooldown} loading={loading}
                onOpenProfile={() => setProfileModalVisible(true)}
                onOpenLogModal={(med) => { setSelectedMed(med); setLogModalVisible(true); }}
                onOpenHistory={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }}
                onRefresh={onRefresh} onSOS={() => setSosModalVisible(true)} onLogout={handleLogout} onOpenSymptoms={() => setSymptomModalVisible(true)} 
              />
              
              <View style={styles.mainMenuContainer}>
                <Text style={styles.menuSectionTitle}>Lựa chọn của bạn</Text>
                
                {/* Nút vào Tủ Thuốc */}
                <TouchableOpacity style={styles.mainMenuBtnPrimary} onPress={() => setActiveView('meds')}>
                  <View style={styles.menuIconCirclePrimary}>
                    <MaterialCommunityIcons name="medical-bag" size={36} color="white" />
                  </View>
                  <View style={styles.menuTextGroup}>
                    <Text style={styles.mainMenuTitlePrimary}>Tủ Thuốc Hôm Nay</Text>
                    <Text style={styles.mainMenuSubPrimary}>Xem tất cả các cữ thuốc và xác nhận</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={30} color={colors.primary} />
                </TouchableOpacity>

                {/* Các nút công cụ */}
                <View style={styles.menuGrid}>
                  <TouchableOpacity style={styles.menuGridItem} onPress={() => setSymptomModalVisible(true)}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <MaterialCommunityIcons name="heart-pulse" size={28} color="#EF4444" />
                    </View>
                    <Text style={styles.menuGridText}>Báo cáo{'\n'}Triệu chứng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuGridItem} onPress={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#FEF08A' }]}>
                      <MaterialCommunityIcons name="history" size={28} color="#CA8A04" />
                    </View>
                    <Text style={styles.menuGridText}>Lịch sử{'\n'}Sử dụng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuGridItem} onPress={() => setSosModalVisible(true)}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#E0E7FF' }]}>
                      <MaterialCommunityIcons name="doctor" size={28} color="#4F46E5" />
                    </View>
                    <Text style={styles.menuGridText}>Liên hệ{'\n'}Bác sĩ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {/* ========================================== */}
          {/* MÀN HÌNH 2: TỦ THUỐC VỚI BONG BÓNG THỜI GIAN */}
          {/* ========================================== */}
          {activeView === 'meds' && (
            <View style={{ flex: 1 }}>
              <View style={styles.medsViewHeader}>
                <TouchableOpacity onPress={() => setActiveView('menu')} style={styles.backBtn}>
                  <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={styles.medsViewTitle}>Tủ Thuốc Hôm Nay</Text>
                <View style={{ width: 28 }} />
              </View>

              <FlatList
                data={medications}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
                renderItem={({ item }) => (
                  <MedCardItem 
                    item={item} 
                    historyLogs={historyLogs} 
                    // Gọi Modal Bong bóng
                    onPressTime={(med, time) => { 
                      setSelectedMed({...med, Time: time}); 
                      setLogModalVisible(true); 
                    }} 
                  />
                )}
              />
            </View>
          )}
        </>
      )}

      <ConfirmDoseModal visible={isLogModalVisible} med={selectedMed} isLogging={isLogging} onSubmit={submitLog} onClose={() => setLogModalVisible(false)} />
      <ContactClinicModal visible={isSosModalVisible} onClose={() => setSosModalVisible(false)} />
      <ProfileModal visible={isProfileModalVisible} patientId={patientId} patientName={patientName} onClose={() => setProfileModalVisible(false)} />
      <HistoryModal visible={isHistoryModalVisible} historyLogs={historyLogs} loadingHistory={loadingHistory} onClose={() => setHistoryModalVisible(false)} />
      <SymptomModal visible={isSymptomModalVisible} isLogging={isLogging} onSubmit={submitSymptoms} onClose={() => setSymptomModalVisible(false)} />

      {toastVisible && (
        <View style={styles.toastContainer}><MaterialCommunityIcons name="check-decagram" size={28} color="white" /><Text style={styles.toastText}>Ghi nhận thành công!</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toastContainer: { position: 'absolute', top: '10%', alignSelf: 'center', backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 10 },
  toastText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  
  // Styles mới cho Menu
  mainMenuContainer: { paddingHorizontal: 20, marginTop: 10 },
  menuSectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark, marginBottom: 15 },
  mainMenuBtnPrimary: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0', elevation: 2 },
  menuIconCirclePrimary: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextGroup: { flex: 1 },
  mainMenuTitlePrimary: { fontSize: 18, fontWeight: 'bold', color: '#065F46', marginBottom: 4 },
  mainMenuSubPrimary: { fontSize: 13, color: '#047857' },
  menuGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  menuGridItem: { backgroundColor: 'white', padding: 15, borderRadius: 20, alignItems: 'center', width: '31%', elevation: 2 },
  menuIconCircle: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  menuGridText: { fontSize: 13, fontWeight: '600', color: colors.textDark, textAlign: 'center', lineHeight: 18 },
  
  // Styles cho Header Tủ thuốc
  medsViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', elevation: 4 },
  backBtn: { padding: 5 },
  medsViewTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark },
});