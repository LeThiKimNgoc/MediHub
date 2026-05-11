import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Alert, Platform, RefreshControl, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
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

const BRAND_TEAL = '#14B8A6'; 

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

// Biến toàn cục để đếm số lần gõ cho Developer Menu
let secretTapCount = 0;
let secretTapTimer: any = null;

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

  // STATE CHO MENU ẨN
  const [isSystemStatsVisible, setSystemStatsVisible] = useState(false);
  const [sysStats, setSysStats] = useState({ pending: 0, delivered: 0, permission: 'unknown' });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
       const currentStr = await AsyncStorage.getItem('delivered_notifs') || '0';
       await AsyncStorage.setItem('delivered_notifs', (parseInt(currentStr) + 1).toString());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const scheduleNotifications = async (medsList: any[]) => {
    if (Platform.OS === 'web') return; 
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = new Date();
    let allTimes: string[] = [];
    medsList.forEach(med => { if (med.timeArray) allTimes = [...allTimes, ...med.timeArray]; });
    const uniqueTimes = Array.from(new Set(allTimes));
    
    uniqueTimes.forEach(async (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);
      if (scheduleDate.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: "⏰ Tới giờ rồi!", body: "Đã đến giờ dùng thuốc theo lịch hẹn.", sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduleDate },
        });
      }
    });
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
            scheduleNotifications(groupedMeds); 
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

  const fetchProfile = () => {
    setLoadingProfile(true);
    const csvUrl = `https://docs.google.com/spreadsheets/d/1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q/export?format=csv&gid=0&t=${new Date().getTime()}`;
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

  useFocusEffect(useCallback(() => { fetchMedications(); fetchHistoryLogs(true); fetchProfile(); }, [patientId]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchMedications(true); fetchHistoryLogs(true); fetchProfile(); }, [patientId]);

  const dashboardStats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const todayLogs = historyLogs.filter(log => log.Timestamp && log.Timestamp.includes(todayStr));
    const latestStatusMap: Record<string, string> = {};
    todayLogs.forEach(log => { latestStatusMap[`${log.MedicineName}-${log.PlannedTime}`] = log.Status; });
    let totalDoses = 0, completedDoses = 0, allPendingDoses: any[] = [];
    medications.forEach(med => {
      if (med.timeArray) {
        med.timeArray.forEach((time: string) => {
          totalDoses++; 
          const key = `${med.MedicineName}-${time}`, currentStatus = latestStatusMap[key]; 
          if (currentStatus === 'Đã sử dụng' || currentStatus === 'Hoàn thành' || currentStatus === 'Bỏ qua') {
              if (currentStatus !== 'Bỏ qua') completedDoses++; 
          } else {
              const [h, m] = time.split(':').map(Number);
              const isExpired = currentMinutes > (h * 60 + m + 60);
              if (!isExpired) allPendingDoses.push({ ...med, Time: time, doseMinutes: h * 60 + m }); 
          }
        });
      }
    });
    allPendingDoses.sort((a, b) => a.doseMinutes - b.doseMinutes);
    return { total: totalDoses, completed: completedDoses, progressPercent: totalDoses > 0 ? (completedDoses / totalDoses) * 100 : 0, nextDoses: allPendingDoses.length > 0 ? allPendingDoses.filter(m => m.Time === allPendingDoses[0].Time) : [], allPending: allPendingDoses };
  }, [medications, historyLogs]);

  const submitLog = async (newStatus: string) => {
    setIsLogging(true);
    const logPayload = { action: 'add', sheetName: 'Log', data: { PatientsID: patientId, MedicineName: selectedMed.MedicineName, PlannedTime: selectedMed.Time, Action: 'Bệnh nhân tự xác nhận', Status: newStatus } };
    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(logPayload) });
      if ((JSON.parse(await response.text())).status === 'success') {
          if (newStatus === 'Đã sử dụng') {
             const terms = getMedTerminology(selectedMed);
             if ((terms.action === 'nhỏ' || terms.action === 'tra') && dashboardStats.allPending.length > 1) setCooldown(600); 
          }
          setLogModalVisible(false); setToastVisible(true); fetchHistoryLogs(true); setTimeout(() => setToastVisible(false), 2500);
      }
    } catch (error) { Alert.alert('Lỗi', 'Không thể kết nối.'); } finally { setIsLogging(false); }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn thoát?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Thoát', style: 'destructive', onPress: () => { AsyncStorage.removeItem('patientId'); router.replace('/'); }}]);
  };

  // 🔥 HÀM XỬ LÝ GÕ 5 LẦN ĐỂ MỞ MENU ẨN 🔥
  const loadSystemStats = async () => {
    try {
      const deliveredStr = await AsyncStorage.getItem('delivered_notifs') || '0';
      let pending = 0;
      let perm = 'web-simulated';

      if (Platform.OS !== 'web') {
        const { status } = await Notifications.getPermissionsAsync();
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        perm = status;
        pending = scheduled.length;
      }

      setSysStats({ pending, delivered: parseInt(deliveredStr), permission: perm });
      setSystemStatsVisible(true);
    } catch (e) {
      console.log('Error loading stats', e);
    }
  };

  const handleSecretTap = () => {
    secretTapCount += 1;
    if (secretTapTimer) clearTimeout(secretTapTimer);
    
    // Nếu gõ đủ 5 lần trong thời gian ngắn thì kích hoạt
    if (secretTapCount >= 5) {
      secretTapCount = 0;
      loadSystemStats();
    } else {
      // Nếu ngưng gõ quá 1 giây thì reset đếm lại từ đầu
      secretTapTimer = setTimeout(() => {
        secretTapCount = 0;
      }, 1000);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* 🔥 GLOBAL HEADER 🔥 */}
      <View style={styles.globalHeader}>
        {/* ĐỔI TỪ LONG PRESS SANG ON PRESS ĐỂ BẮT SỰ KIỆN GÕ NHANH 5 LẦN */}
        <TouchableOpacity activeOpacity={0.7} onPress={handleSecretTap} style={styles.brandRow}>
           <View style={styles.logoCircle}>
              <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
           </View>
           <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSosModalVisible(true)}>
           <MaterialCommunityIcons name="phone-plus" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? ( <View style={styles.centerContainer}><ActivityIndicator size="large" color={BRAND_TEAL} /></View> ) : (
          <>
            {activeTab === 'home' && (
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <DashboardHeader patientName={patientName} dashboardStats={dashboardStats} cooldown={cooldown} loading={loading} onOpenProfile={() => setProfileModalVisible(true)} onOpenLogModal={(med) => { setSelectedMed(med); setLogModalVisible(true); }} onOpenHistory={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }} onRefresh={onRefresh} onSOS={() => setSosModalVisible(true)} onLogout={handleLogout} onOpenSymptoms={() => setSymptomModalVisible(true)} />
                <View style={styles.quickActionsRow}>
                   <TouchableOpacity style={[styles.qBtn, {backgroundColor: '#FEE2E2'}]} onPress={() => setSymptomModalVisible(true)}><MaterialCommunityIcons name="heart-pulse" size={32} color="#EF4444" /><Text style={styles.qText}>Báo Triệu Chứng</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.qBtn, {backgroundColor: '#E0E7FF'}]} onPress={() => setSosModalVisible(true)}><MaterialCommunityIcons name="doctor" size={32} color="#4F46E5" /><Text style={styles.qText}>Gọi Bác Sĩ</Text></TouchableOpacity>
                </View>
              </ScrollView>
            )}
            {activeTab === 'meds' && (
              <View style={{ flex: 1 }}>
                <View style={styles.tabHeader}><Text style={styles.tabHeaderTitle}>Tủ Thuốc Của Tôi</Text></View>
                <FlatList data={medications} keyExtractor={(item, index) => index.toString()} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 15, paddingBottom: 50 }} renderItem={({ item }) => <MedCardItem item={item} historyLogs={historyLogs} onPressTime={(med, time) => { setSelectedMed({...med, Time: time}); setLogModalVisible(true); }} />} />
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}><MaterialCommunityIcons name={activeTab === 'home' ? "home-variant" : "home-variant-outline"} size={28} color={activeTab === 'home' ? BRAND_TEAL : '#94A3B8'} /><Text style={[styles.navLabel, activeTab === 'home' && {color: BRAND_TEAL}]}>Trang chủ</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }}><MaterialCommunityIcons name="chart-arc" size={28} color="#94A3B8" /><Text style={styles.navLabel}>Lịch sử</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('meds')}><MaterialCommunityIcons name={activeTab === 'meds' ? "medical-bag" : "bag-personal-outline"} size={28} color={activeTab === 'meds' ? BRAND_TEAL : '#94A3B8'} /><Text style={[styles.navLabel, activeTab === 'meds' && {color: BRAND_TEAL}]}>Tủ thuốc</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setProfileModalVisible(true)}><MaterialCommunityIcons name="account-cog-outline" size={28} color="#94A3B8" /><Text style={styles.navLabel}>Cài đặt</Text></TouchableOpacity>
      </View>

      {/* 🔥 MODAL ẨN DÀNH CHO HỘI ĐỒNG ĐÁNH GIÁ 🔥 */}
      <Modal visible={isSystemStatsVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.statsModalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <MaterialCommunityIcons name="console" size={24} color={BRAND_TEAL} />
                 <Text style={{fontSize: 18, fontWeight: 'bold', color: BRAND_TEAL, marginLeft: 8}}>System Diagnostics</Text>
              </View>
              <TouchableOpacity onPress={() => setSystemStatsVisible(false)} style={{padding: 5}}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Quyền Push Notification:</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <MaterialCommunityIcons name={sysStats.permission === 'granted' || sysStats.permission === 'web-simulated' ? "shield-check" : "shield-alert"} size={16} color={sysStats.permission === 'granted' || sysStats.permission === 'web-simulated' ? '#10B981' : '#EF4444'} />
                 <Text style={[styles.statValue, {color: sysStats.permission === 'granted' || sysStats.permission === 'web-simulated' ? '#10B981' : '#EF4444', marginLeft: 4}]}>
                   {sysStats.permission === 'web-simulated' ? 'Giả lập (Web)' : (sysStats.permission === 'granted' ? 'Đã cấp (Granted)' : 'Từ chối (Denied)')}
                 </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Hàng đợi gửi (Pending):</Text>
              <Text style={styles.statValue}>{sysStats.pending} <Text style={{fontSize: 12, fontWeight: 'normal'}}>tiến trình</Text></Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Tổng đã phát (Delivered):</Text>
              <Text style={styles.statValue}>{sysStats.delivered} <Text style={{fontSize: 12, fontWeight: 'normal'}}>thông báo</Text></Text>
            </View>

            <View style={{marginTop: 20, padding: 12, backgroundColor: '#F0FDFA', borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1'}}>
               <Text style={{fontSize: 12, color: '#0F766E', fontStyle: 'italic', textAlign: 'center', lineHeight: 18}}>
                 * Dữ liệu được truy xuất trực tiếp từ bộ nhớ RAM (Pending) và Local Storage (Delivered) của thiết bị. Phục vụ mục đích kiểm chứng hệ thống.
               </Text>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDoseModal visible={isLogModalVisible} med={selectedMed} isLogging={isLogging} onSubmit={submitLog} onClose={() => setLogModalVisible(false)} />
      <ContactClinicModal visible={isSosModalVisible} onClose={() => setSosModalVisible(false)} />
      <ProfileModal visible={isProfileModalVisible} profileData={profileData} loadingProfile={loadingProfile} patientId={patientId} patientName={patientName} onClose={() => setProfileModalVisible(false)} onLogout={handleLogout} />
      <HistoryModal visible={isHistoryModalVisible} historyLogs={historyLogs} medications={medications} loadingHistory={loadingHistory} onClose={() => setHistoryModalVisible(false)} />
      <SymptomModal visible={isSymptomModalVisible} isLogging={isLogging} onSubmit={(s) => setSymptomModalVisible(false)} onClose={() => setSymptomModalVisible(false)} />
      {toastVisible && <View style={styles.toastContainer}><MaterialCommunityIcons name="check-decagram" size={28} color="white" /><Text style={styles.toastText}>Ghi nhận thành công!</Text></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F9' },
  globalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: BRAND_TEAL, zIndex: 100 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  brandMedi: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginLeft: 10, fontStyle: 'italic', letterSpacing: 1, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
  brandHub: { fontWeight: '900', color: '#FFFFFF' },
  headerIconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toastContainer: { position: 'absolute', top: '10%', alignSelf: 'center', backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 10 },
  toastText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  quickActionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginTop: 10 },
  qBtn: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center', elevation: 2 },
  qText: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginTop: 8 },
  tabHeader: { paddingVertical: 20, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  bottomNav: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', justifyContent: 'space-around', paddingBottom: Platform.OS === 'ios' ? 30 : 12 },
  navItem: { alignItems: 'center', flex: 1 },
  navLabel: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', marginTop: 4 },

  // CSS BẢNG THỐNG KÊ ẨN
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  statsModalContent: { backgroundColor: 'white', width: '85%', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.2, shadowRadius: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statLabel: { fontSize: 14, color: '#475569', fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#1E293B' }
});