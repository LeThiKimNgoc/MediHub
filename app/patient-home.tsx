import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Alert, Platform, RefreshControl } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router'; 
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import { colors } from '../constants/theme';
import { DashboardHeader } from '../components/Dashboard/DashboardHeader';
import { MedCardItem } from '../components/Dashboard/MedCardItem';

// Import hàm nhận diện loại thuốc
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

  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // State quản lý Modals
  const [isSymptomModalVisible, setSymptomModalVisible] = useState(false);
  const [isLogModalVisible, setLogModalVisible] = useState(false);
  const [isSosModalVisible, setSosModalVisible] = useState(false);
  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Đồng hồ chạy lùi
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // 🔥 1. THAY THẾ HÀM TẢI THUỐC (TÁCH CỮ GIỜ) 🔥
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
            
            // --- THUẬT TOÁN TÁCH CỮ THUỐC ---
            let splitMeds: any[] = [];
            rawMeds.forEach(med => {
              if (med.Time) {
                // Tách chuỗi giờ bằng dấu phẩy
                const timesArray = med.Time.split(',').map((t: string) => t.trim());
                timesArray.forEach((t: string) => {
                  if (t) splitMeds.push({ ...med, Time: t, originalTimes: med.Time });
                });
              } else {
                splitMeds.push(med); 
              }
            });

            // Sắp xếp lại theo giờ từ sáng đến tối
            splitMeds.sort((a, b) => (a.Time || "").localeCompare(b.Time || ""));
            
            setMedications(splitMeds); 
            await AsyncStorage.setItem(`@cached_meds_${patientId}`, JSON.stringify(splitMeds)); 
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

  // XỬ LÝ LOG DÙNG THUỐC
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
                 setCooldown(600); 
             }
          }
          setLogModalVisible(false); setToastVisible(true); fetchHistoryLogs(true); 
          setTimeout(() => setToastVisible(false), 2500);
      } else Alert.alert('Lỗi', result.message);
    } catch (error) { Alert.alert('Lỗi mạng', 'Vui lòng kiểm tra kết nối.'); } finally { setIsLogging(false); }
  };

  // XỬ LÝ GỬI TRIỆU CHỨNG 
  const submitSymptoms = async (symptoms: string) => {
    setIsLogging(true);
    const logPayload = { 
      action: 'add', 
      sheetName: 'TrieuChung', 
      data: { 
        PatientsID: patientId, 
        MedicineName: patientName, 
        PlannedTime: `${new Date().getHours()}:${new Date().getMinutes() < 10 ? '0'+new Date().getMinutes() : new Date().getMinutes()} - ${new Date().getDate()}/${new Date().getMonth() + 1}`, 
        Action: 'Báo cáo triệu chứng',
        Status: symptoms 
      } 
    };
    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(logPayload) });
      const result = JSON.parse(await response.text());
      if (result.status === 'success') {
          setSymptomModalVisible(false); setToastVisible(true); 
          setTimeout(() => setToastVisible(false), 2500);
      }
    } catch (error) { Alert.alert('Lỗi', 'Không thể gửi báo cáo.'); } 
    finally { setIsLogging(false); }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn thoát?', [
      { text: 'Hủy', style: 'cancel' }, 
      { text: 'Thoát', style: 'destructive', onPress: () => {
        AsyncStorage.removeItem('patientId');
        AsyncStorage.removeItem('patientName');
        router.replace('/'); 
      }}
    ]);
  };

  // 🔥 2. THAY THẾ LOGIC TÍNH THANH TIẾN ĐỘ 🔥
  const dashboardStats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    const todayTakenLogs = historyLogs.filter(log => log.Status === 'Đã sử dụng' && (log.Timestamp && log.Timestamp.includes(todayStr)));
    const takenKeys = todayTakenLogs.map(log => `${log.MedicineName}-${log.PlannedTime}`);
    
    let completedCount = 0;
    medications.forEach(med => {
      if (takenKeys.includes(`${med.MedicineName}-${med.Time}`)) {
        completedCount++;
      }
    });

    const remainingMeds = medications.filter(med => !takenKeys.includes(`${med.MedicineName}-${med.Time}`));
    const nextDose = remainingMeds.length > 0 ? remainingMeds[0] : null;

    return {
      total: medications.length, 
      completed: completedCount, 
      progressPercent: medications.length > 0 ? (completedCount / medications.length) * 100 : 0,
      nextDose
    };
  }, [medications, historyLogs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
         <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={medications}
          ListHeaderComponent={
            <DashboardHeader 
              patientName={patientName} 
              dashboardStats={dashboardStats} 
              cooldown={cooldown} 
              loading={loading}
              onOpenProfile={() => { setProfileModalVisible(true); }}
              onOpenLogModal={(med) => { setSelectedMed(med); setLogModalVisible(true); }}
              onOpenHistory={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }}
              onRefresh={onRefresh}
              onSOS={() => setSosModalVisible(true)}
              onLogout={handleLogout} 
              onOpenSymptoms={() => setSymptomModalVisible(true)} 
            />
          }
          keyExtractor={(item, index) => index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          
          // 🔥 3. THAY THẾ LOGIC TÔ MÀU 1 THẺ DUY NHẤT 🔥
          renderItem={({ item }) => {
            const isDoneToday = historyLogs.some(log => 
              log.MedicineName === item.MedicineName && 
              log.PlannedTime === item.Time && 
              log.Status === 'Đã sử dụng' && 
              log.Timestamp?.includes(new Date().getDate().toString().padStart(2, '0'))
            );
            return <MedCardItem item={item} isDoneToday={isDoneToday} onPress={() => { setSelectedMed(item); setLogModalVisible(true); }} />;
          }}
        />
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
});