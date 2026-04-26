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

  const [activeTab, setActiveTab] = useState<'home' | 'meds'>('home');

  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
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

  // 🔥 THUẬT TOÁN ĐẶT BÁO THỨC CHẠY NGẦM (GOM NHÓM & CÂU TỪ CHUNG) 🔥
  const scheduleNotifications = async (medsList: any[]) => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // 🚨 QUAN TRỌNG: Hủy toàn bộ thông báo cũ (để xóa cái lịch 3 thông báo đang kẹt trong máy bạn)
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('med-reminders', {
        name: 'Nhắc nhở uống thuốc',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    const now = new Date();
    
    // 1. Lọc ra các mốc giờ KHÔNG TRÙNG NHAU
    let allTimes: string[] = [];
    medsList.forEach(med => {
      if (med.timeArray) {
        allTimes = [...allTimes, ...med.timeArray];
      }
    });
    const uniqueTimes = Array.from(new Set(allTimes));

    // 2. Chỉ lên lịch 1 thông báo duy nhất cho mỗi mốc giờ
    uniqueTimes.forEach(async (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);

      if (scheduleDate.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏰ Tới giờ chăm sóc sức khỏe rồi!",
            body: "Đã đến giờ sử dụng thuốc. Bạn hãy bấm vào đây để xem chi tiết các thuốc cần dùng nhé. Chúc bạn luôn khỏe mạnh! 🌿",
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { time: timeStr }, 
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: scheduleDate,
            channelId: 'med-reminders',
          },
        });
      }
    });
  };

  const fetchProfile = () => {
    setLoadingProfile(true);
    const gidPatient = '0'; 
    const csvUrl = `https://docs.google.com/spreadsheets/d/1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q/export?format=csv&gid=${gidPatient}&t=${new Date().getTime()}`;

    fetch(csvUrl, { cache: 'no-store' }).then(res => res.text()).then(csvText => {
      Papa.parse(csvText, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const myProfile = results.data.find((p: any) => p.PatientID === patientId || p.ID === patientId);
          setProfileData(myProfile || null);
          setLoadingProfile(false);
        }
      });
    }).catch(() => setLoadingProfile(false));
  };

  const fetchMedications = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    const csvUrl = `https://docs.google.com/spreadsheets/d/1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q/export?format=csv&gid=2073748495&t=${new Date().getTime()}`;
    fetch(csvUrl, { cache: 'no-store' }).then(res => res.text()).then(async csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            let rawMeds = results.data.filter((item: any) => item.PatientsID === patientId);
            let groupedMeds = rawMeds.map(med => {
              const times = med.Time ? med.Time.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
              return { ...med, timeArray: times }; 
            });
            
            setMedications(groupedMeds); 
            scheduleNotifications(groupedMeds); // Kích hoạt lịch mới
            setLoading(false); setRefreshing(false);
          }
        });
      }).catch(() => { setLoading(false); setRefreshing(false); });
  };

  const fetchHistoryLogs = async (background = false) => {
    if (!background) setLoadingHistory(true);
    const csvUrl = `https://docs.google.com/spreadsheets/d/1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q/export?format=csv&gid=1373475002&t=${new Date().getTime()}`;
    fetch(csvUrl, { cache: 'no-store' }).then(res => res.text()).then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            let myLogs = results.data.filter((item: any) => item.PatientsID === patientId);
            setHistoryLogs(myLogs); 
            if (!background) setLoadingHistory(false);
          }
        });
      }).catch(() => { if(!background) setLoadingHistory(false); });
  };

  useFocusEffect(useCallback(() => { 
    fetchMedications(); 
    fetchHistoryLogs(true); 
    fetchProfile(); 
  }, [patientId]));
  
  const onRefresh = useCallback(() => { 
    setRefreshing(true); 
    fetchMedications(true); 
    fetchHistoryLogs(true); 
    fetchProfile(); 
  }, [patientId]);

  const dashboardStats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const todayTakenLogs = historyLogs.filter(log => log.Status === 'Đã sử dụng' && (log.Timestamp && log.Timestamp.includes(todayStr)));
    const takenKeys = todayTakenLogs.map(log => `${log.MedicineName}-${log.PlannedTime}`);
    
    let totalDoses = 0; let completedDoses = 0; let allPendingDoses: any[] = [];

    medications.forEach(med => {
      if (med.timeArray) {
        med.timeArray.forEach((time: string) => {
          totalDoses++; const key = `${med.MedicineName}-${time}`;
          if (takenKeys.includes(key)) completedDoses++; else allPendingDoses.push({ ...med, Time: time }); 
        });
      }
    });

    allPendingDoses.sort((a, b) => a.Time.localeCompare(b.Time));
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    let nextDoses: any[] = [];

    if (allPendingDoses.length > 0) {
      const upcomingDoses = allPendingDoses.filter(med => {
        const [h, m] = med.Time.split(':').map(Number);
        return (h * 60 + m) >= currentMinutes - 60; 
      });

      const targetList = upcomingDoses.length > 0 ? upcomingDoses : allPendingDoses;
      if (targetList.length > 0) nextDoses = targetList.filter(med => med.Time === targetList[0].Time);
    }

    return { total: totalDoses, completed: completedDoses, progressPercent: totalDoses > 0 ? (completedDoses / totalDoses) * 100 : 0, nextDoses, allPending: allPendingDoses };
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
                 const otherPendingEyeDrops = dashboardStats.allPending.filter(
                     (med: any) => med.Time === selectedMed.Time && med.MedicineName !== selectedMed.MedicineName &&
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
    } catch (error) { Alert.alert('Lỗi', 'Không thể gửi báo cáo.'); } finally { setIsLogging(false); }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn thoát?', [
      { text: 'Hủy', style: 'cancel' }, 
      { text: 'Thoát', style: 'destructive', onPress: () => {
        setProfileModalVisible(false); 
        AsyncStorage.removeItem('patientId'); AsyncStorage.removeItem('patientName'); router.replace('/'); 
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1 }}>
        {loading ? (
           <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            {activeTab === 'home' && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <DashboardHeader 
                  patientName={patientName} dashboardStats={dashboardStats} cooldown={cooldown} loading={loading}
                  onOpenProfile={() => setProfileModalVisible(true)}
                  onOpenLogModal={(med) => { setSelectedMed(med); setLogModalVisible(true); }}
                  onOpenHistory={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }}
                  onRefresh={onRefresh} onSOS={() => setSosModalVisible(true)} onLogout={handleLogout} onOpenSymptoms={() => setSymptomModalVisible(true)} 
                />
                <View style={styles.quickActionsRow}>
                   <TouchableOpacity style={[styles.qBtn, {backgroundColor: '#FEE2E2'}]} onPress={() => setSymptomModalVisible(true)}>
                      <MaterialCommunityIcons name="heart-pulse" size={32} color="#EF4444" />
                      <Text style={styles.qText}>Báo Triệu Chứng</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={[styles.qBtn, {backgroundColor: '#E0E7FF'}]} onPress={() => setSosModalVisible(true)}>
                      <MaterialCommunityIcons name="doctor" size={32} color="#4F46E5" />
                      <Text style={styles.qText}>Gọi Bác Sĩ</Text>
                   </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {activeTab === 'meds' && (
              <View style={{ flex: 1 }}>
                <View style={styles.tabHeader}><Text style={styles.tabHeaderTitle}>Tủ Thuốc Của Tôi</Text></View>
                <FlatList
                  data={medications} keyExtractor={(item, index) => index.toString()} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 15, paddingBottom: 50 }}
                  renderItem={({ item }) => <MedCardItem item={item} historyLogs={historyLogs} onPressTime={(med, time) => { setSelectedMed({...med, Time: time}); setLogModalVisible(true); }} />}
                />
              </View>
            )}
          </>
        )}
      </View>

      {!loading && (
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
            <MaterialCommunityIcons name={activeTab === 'home' ? "home-variant" : "home-variant-outline"} size={28} color={activeTab === 'home' ? colors.primary : '#94A3B8'} />
            <Text style={[styles.navLabel, activeTab === 'home' && {color: colors.primary}]}>Trang chủ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }}>
            <MaterialCommunityIcons name="chart-arc" size={28} color="#94A3B8" />
            <Text style={styles.navLabel}>Lịch sử</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('meds')}>
            <MaterialCommunityIcons name={activeTab === 'meds' ? "medical-bag" : "bag-personal-outline"} size={28} color={activeTab === 'meds' ? colors.primary : '#94A3B8'} />
            <Text style={[styles.navLabel, activeTab === 'meds' && {color: colors.primary}]}>Tủ thuốc</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}>
            <MaterialCommunityIcons name="account-cog-outline" size={28} color="#94A3B8" />
            <Text style={styles.navLabel}>Cài đặt</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDoseModal visible={isLogModalVisible} med={selectedMed} isLogging={isLogging} onSubmit={submitLog} onClose={() => setLogModalVisible(false)} />
      <ContactClinicModal visible={isSosModalVisible} onClose={() => setSosModalVisible(false)} />
      
      <ProfileModal 
        visible={isProfileModalVisible} 
        profileData={profileData} 
        loadingProfile={loadingProfile} 
        patientId={patientId} 
        patientName={patientName} 
        onClose={() => setProfileModalVisible(false)} 
        onLogout={handleLogout} 
      />
      
      {/* 🔥 TRUYỀN medications VÀO ĐÂY ĐỂ HIỆN ICON GIỌT NƯỚC 🔥 */}
      <HistoryModal 
        visible={isHistoryModalVisible} 
        historyLogs={historyLogs} 
        medications={medications}
        loadingHistory={loadingHistory} 
        onClose={() => setHistoryModalVisible(false)} 
      />
      
      <SymptomModal visible={isSymptomModalVisible} isLogging={isLogging} onSubmit={submitSymptoms} onClose={() => setSymptomModalVisible(false)} />

      {toastVisible && <View style={styles.toastContainer}><MaterialCommunityIcons name="check-decagram" size={28} color="white" /><Text style={styles.toastText}>Ghi nhận thành công!</Text></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toastContainer: { position: 'absolute', top: '10%', alignSelf: 'center', backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 10 },
  toastText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  quickActionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginTop: 10 },
  qBtn: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center', elevation: 2 },
  qText: { fontSize: 14, fontWeight: 'bold', color: colors.textDark, marginTop: 8 },
  tabHeader: { paddingVertical: 20, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark },
  bottomNav: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', justifyContent: 'space-around', paddingBottom: Platform.OS === 'ios' ? 30 : 12, elevation: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -3}, shadowOpacity: 0.1, shadowRadius: 5 },
  navItem: { alignItems: 'center', flex: 1 },
  navLabel: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', marginTop: 4 }
});