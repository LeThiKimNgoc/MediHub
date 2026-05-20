import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Alert, ScrollView, Image, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import Papa from 'papaparse';
import * as Notifications from 'expo-notifications'; 
import * as Speech from 'expo-speech'; 

import PatientHeader from '../components/Patient/PatientHeader';
import ProgressCard from '../components/Patient/ProgressCard';
import SymptomModal from '../components/Patient/SymptomModal';
import NotificationModal from '../components/Patient/NotificationModal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

const colors = { primary: '#00A991', primaryDark: '#008573', bg: '#F8FAFC', surface: '#FFFFFF', textDark: '#1E293B', textMuted: '#64748B', danger: '#EF4444', warning: '#F59E0B', border: '#F1F5F9', success: '#10B981' };

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

export default function PatientHomeScreen() {
  const { id, name } = useLocalSearchParams();
  const [patientName, setPatientName] = useState('Người dùng');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(true);

  const [groupedMeds, setGroupedMeds] = useState<any>({});
  const [orderedTimes, setOrderedTimes] = useState<string[]>([]);
  const [medImages, setMedImages] = useState<any>({}); 

  const [slotInfo, setSlotInfo] = useState({ slot: '--:--', type: 'none', missedCount: 0 }); 
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [patientConfig, setPatientConfig] = useState({ sleep: '22:00', wake: '06:00' });

  const [completedSlots, setCompletedSlots] = useState<string[]>([]);
  const [skippedSlots, setSkippedSlots] = useState<string[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [speakingMedIndex, setSpeakingMedIndex] = useState<number | null>(null);

  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState('');
  const [sendingSymptom, setSendingSymptom] = useState(false);
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [isNotiEnabled, setIsNotiEnabled] = useState(false);

  useEffect(() => {
    const configureNotifications = async () => {
      if (Platform.OS === 'web') return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') { 
        const { status } = await Notifications.requestPermissionsAsync(); 
        finalStatus = status; 
      }
      setIsNotiEnabled(finalStatus === 'granted');
      if (finalStatus !== 'granted') return;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medihub-reminders', { name: 'Lịch nhắc', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#00A991', sound: 'default' });
      }
    };
    configureNotifications();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedName = (name as string) || await AsyncStorage.getItem('patientName') || 'Người dùng';
        const savedId = (id as string) || await AsyncStorage.getItem('patientId') || '';
        setPatientName(savedName);
        if (savedId) {
          setPatientId(savedId);
          const savedCompleted = await AsyncStorage.getItem(`completed_slots_${savedId}`);
          const savedSkipped = await AsyncStorage.getItem(`skipped_slots_${savedId}`);
          const initialCompleted = savedCompleted ? JSON.parse(savedCompleted) : [];
          const initialSkipped = savedSkipped ? JSON.parse(savedSkipped) : [];
          setCompletedSlots(initialCompleted); setSkippedSlots(initialSkipped);
          await fetchAndProcessMeds(savedId, initialCompleted, initialSkipped);
        } else { setLoading(false); }
      } catch (error) { console.error(error); setLoading(false); }
    };
    initApp();
  }, []);

  useEffect(() => { return () => { Speech.stop(); }; }, [slotInfo.slot]);
  useEffect(() => { setActiveFilter('Tất cả'); }, [slotInfo.slot]);

  const handleToggleNotification = async () => {
    if (isNotiEnabled) {
      Alert.alert("Trạng thái", "Hệ thống thông báo đang hoạt động ổn định!");
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert("Thông báo", "Vui lòng bật quyền thông báo trong cài đặt trình duyệt web của bạn.");
      return;
    }
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (canAskAgain) {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus === 'granted') {
        setIsNotiEnabled(true);
        Alert.alert("Thành công", "Đã bật hệ thống nhắc nhở uống thuốc!");
      } else {
        Alert.alert("Lưu ý", "Bạn đã từ chối cấp quyền thông báo.");
      }
    } else {
      Alert.alert(
        "Cấp quyền thông báo",
        "App cần quyền thông báo để nhắc bạn uống thuốc đúng giờ. Vui lòng vào Cài đặt điện thoại để bật lại nhé.",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Mở Cài đặt", onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  const timeToMinutes = (timeStr: string) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };
  
  const calculateActiveSlot = (times: string[], completed: string[], skipped: string[]) => {
    if (times.length === 0) return { slot: '--:--', type: 'none', missedCount: 0 };
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const processed = [...completed, ...skipped];
    const missedSlots = times.filter(t => !processed.includes(t) && timeToMinutes(t) < nowMins - 15);
    for (let i = 0; i < times.length; i++) {
      if (processed.includes(times[i])) continue;
      const slotMins = timeToMinutes(times[i]);
      const nextSlotMins = i < times.length - 1 ? timeToMinutes(times[i + 1]) : slotMins + 4 * 60;
      const midPoint = slotMins + (nextSlotMins - slotMins) / 2;
      if (nowMins >= slotMins - 15 && nowMins <= midPoint) return { slot: times[i], type: 'standard', missedCount: missedSlots.length };
    }
    const upcoming = times.find(t => !processed.includes(t) && timeToMinutes(t) > nowMins);
    if (upcoming) return { slot: upcoming, type: 'upcoming', missedCount: missedSlots.length };
    if (missedSlots.length > 0) return { slot: missedSlots[0], type: 'catchup', missedCount: missedSlots.length };
    return { slot: '--:--', type: 'done', missedCount: 0 };
  };

  const scheduleMedReminders = async (times: string[]) => {
    if (Platform.OS === 'web') return; 
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      times.forEach(async (time) => {
        const parts = time.split(':'); if (parts.length !== 2) return; 
        const hour = parseInt(parts[0], 10); const minute = parseInt(parts[1], 10);
        if (isNaN(hour) || isNaN(minute)) return;
        await Notifications.scheduleNotificationAsync({ content: { title: "🔔 MediHub: Đến lịch trình!", body: `Đã đến giờ thực hiện lịch lúc ${time}.`, sound: true, badge: 1 }, trigger: { type: 'daily', hour: hour, minute: minute, repeats: true } as any });
      });
    } catch (error) { console.log(error); }
  };

  const getMedRouteDetails = (name: string, dosage: string) => {
    const checkText = (name + " " + dosage).toLowerCase();
    if (['tra mắt', 'mỡ', 'gel'].some(kw => checkText.includes(kw))) return { icon: 'eye-outline', label: 'Thuốc tra mắt', color: '#8B5CF6', bg: '#EDE9FE', isEyeDrop: true };
    if (['nhỏ', 'giọt', 'sanlein', 'cravit', 'tobrex'].some(kw => checkText.includes(kw))) return { icon: 'eyedropper', label: 'Thuốc nhỏ mắt', color: '#0284C7', bg: '#E0F2FE', isEyeDrop: true };
    if (['bôi', 'ngoài da', 'dán'].some(kw => checkText.includes(kw))) return { icon: 'hand-water', label: 'Dùng ngoài da', color: '#F59E0B', bg: '#FFFBEB', isEyeDrop: false };
    if (['vitamin', 'canxi', 'omega', 'bổ', 'tpcn'].some(kw => checkText.includes(kw))) return { icon: 'leaf', label: 'Thực phẩm chức năng', color: '#10B981', bg: '#ECFDF5', isEyeDrop: false };
    return { icon: 'pill', label: 'Thuốc uống', color: '#10B981', bg: '#ECFDF5', isEyeDrop: false };
  };

  const getSpecialTagDetails = (usageStr: string) => {
    const u = String(usageStr || '').toLowerCase();
    if (u.includes('phải')) return { text: 'MẮT PHẢI', bg: '#FFEDD5', color: '#EA580C', icon: 'arrow-right-bold' };
    if (u.includes('trái')) return { text: 'MẮT TRÁI', bg: '#F3E8FF', color: '#9333EA', icon: 'arrow-left-bold' };
    if (u.includes('2 mắt') || u.includes('hai mắt')) return { text: 'CẢ 2 MẮT', bg: '#E0F2FE', color: '#0369A1', icon: 'eye' };
    if (u.includes('sau ăn')) return { text: 'SAU ĂN', bg: '#FEF9C3', color: '#854D0E', icon: 'silverware-fork-knife' };
    return null;
  };

  const handleSpeakInstruction = async (medName: string, label: string, dose: string, usage: string, index: number) => {
    try {
      if (speakingMedIndex === index) { await Speech.stop(); setSpeakingMedIndex(null); return; }
      await Speech.stop(); setSpeakingMedIndex(index);
      Speech.speak(`Thuốc: ${medName}. Liều lượng: ${dose}. Cách dùng: ${usage}.`, { language: 'vi-VN', rate: 0.85, onComplete: () => setSpeakingMedIndex(null), onError: () => setSpeakingMedIndex(null) });
    } catch (e) { setSpeakingMedIndex(null); }
  };

  const fetchAndProcessMeds = async (pid: string, currentCompleted: string[], currentSkipped: string[]) => {
    try {
      const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
      const gidRemind = '2073748495', gidLog = '1373475002', gidMedicine = '1532424446'; 
      const t = new Date().getTime();

      const csvMedicine = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMedicine}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const medicineData = Papa.parse(csvMedicine, { header: true, skipEmptyLines: true }).data;
      const imageDict: any = {};
      medicineData.forEach((item: any) => {
        const medName = item['MedicineName'] || item['Tên thuốc'] || '';
        const imgUrl = item['ImageUrl'] || item['Image'] || '';
        if (medName && imgUrl) imageDict[String(medName).trim()] = String(imgUrl).trim();
      });
      setMedImages(imageDict); 

      const csvLog = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const logsData = Papa.parse(csvLog, { header: true, skipEmptyLines: true }).data;
      const today = new Date();
      const todayStr1 = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      
      const fetchedCompleted: string[] = []; const fetchedSkipped: string[] = [];
      logsData.forEach((log: any) => {
        if (String(log['PatientsID'] || log['PatientID']).trim().toUpperCase() !== pid.toUpperCase()) return;
        const timestamp = log['Timestamp'] || log['Date'] || '';
        if (timestamp.includes(todayStr1) || timestamp === '') {
          const timeSlot = log['PlannedTime'] || log['Time'] || '';
          if (timeSlot) {
            if (log['Status'] === 'Đã sử dụng' && !fetchedCompleted.includes(timeSlot)) fetchedCompleted.push(timeSlot);
            else if (log['Status'] === 'Bỏ lỡ' && !fetchedSkipped.includes(timeSlot)) fetchedSkipped.push(timeSlot);
          }
        }
      });

      const finalCompleted = Array.from(new Set([...currentCompleted, ...fetchedCompleted]));
      const finalSkipped = Array.from(new Set([...currentSkipped, ...fetchedSkipped]));
      setCompletedSlots(finalCompleted); setSkippedSlots(finalSkipped);

      const csvRemind = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const remindData = Papa.parse(csvRemind, { header: true, skipEmptyLines: true }).data;

      const myMeds = remindData.filter((r: any) => String(r['PatientID'] || r['PatientsID']).trim().toUpperCase() === pid.toUpperCase() && String(r['Reminder_mode']).trim() === 'Bật');

      if (myMeds.length > 0) setPatientConfig({ sleep: myMeds[0]['SleepTime'] || '22:00', wake: myMeds[0]['WakeTime'] || '06:00' });

      const groups: any = {};
      myMeds.forEach((med: any) => {
        const timeArray = String(med['Time'] || '08:00').split(',').map(t => t.trim()).filter(t => t !== '');
        timeArray.forEach(time => { if (!groups[time]) groups[time] = []; groups[time].push(med); });
      });

      const uniqueTimes = Object.keys(groups).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
      setGroupedMeds(groups); setOrderedTimes(uniqueTimes);
      scheduleMedReminders(uniqueTimes);

      const info = calculateActiveSlot(uniqueTimes, finalCompleted, finalSkipped);
      setSlotInfo(info);

      const tot = uniqueTimes.length;
      const comp = finalCompleted.filter(t => uniqueTimes.includes(t)).length;
      setProgress({ completed: comp, total: tot, percent: tot > 0 ? Math.round((comp / tot) * 100) : 0 });
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // 🔥 ĐÃ VÁ LẠI HÀM TOGGLE SYMPTOM Ở ĐÂY
  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  // 🔥 ĐÃ VÁ LẠI HÀM XỬ LÝ GỬI SOS Ở ĐÂY
  const handleReportSymptom = async () => {
    const finalSymptom = [...selectedSymptoms, otherSymptom].filter(s => s !== '').join(', ');
    if (!finalSymptom) { Alert.alert('Thông báo', 'Vui lòng chọn hoặc nhập triệu chứng.'); return; }
    setSendingSymptom(true);
    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addTrieuChung', data: { 'PatientsID': patientId, 'Họ tên': patientName, 'Triệu chứng': finalSymptom, 'Thời gian': new Date().toLocaleString('vi-VN'), 'Trạng thái': 'Chưa xử lý' } }) });
      const result = await response.json();
      if (result.status === 'success') { Alert.alert('Đã gửi khẩn cấp!', 'Cảnh báo của bạn đã được gửi tới y bác sĩ.'); setShowSymptomModal(false); setSelectedSymptoms([]); setOtherSymptom(''); }
    } catch (error) { Alert.alert('Lỗi', 'Không thể kết nối máy chủ.'); } finally { setSendingSymptom(false); }
  };

  const handleConfirmDose = async () => {
    if (slotInfo.slot === '--:--' || isActionDisabled) return;
    setLoading(true);
    const newCompleted = [...completedSlots, slotInfo.slot];
    setCompletedSlots(newCompleted);
    await AsyncStorage.setItem(`completed_slots_${patientId}`, JSON.stringify(newCompleted));
    try {
      const promises = currentItems.map((med: any) => fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'add', sheetName: 'Log', data: { PatientsID: patientId, MedicineName: med['MedicineName'], PlannedTime: slotInfo.slot, Action: 'Bệnh nhân xác nhận trên App', Status: 'Đã sử dụng' } }) }));
      await Promise.all(promises);
    } catch (e) { console.error(e); }
    await fetchAndProcessMeds(patientId, newCompleted, skippedSlots);
  };

  const handleSnoozeDose = () => { if (isActionDisabled) return; Platform.OS === 'web' ? window.alert(`Đã bật nhắc lại sau 10 phút.`) : Alert.alert('Nhắc nhở', 'Đã bật nhắc lại sau 10 phút.'); };

  const handleSkipDose = async () => {
    if (slotInfo.slot === '--:--' || isActionDisabled) return;
    setLoading(true);
    const newSkipped = [...skippedSlots, slotInfo.slot];
    setSkippedSlots(newSkipped);
    await AsyncStorage.setItem(`skipped_slots_${patientId}`, JSON.stringify(newSkipped));
    try {
      const promises = currentItems.map((med: any) => fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'add', sheetName: 'Log', data: { PatientsID: patientId, MedicineName: med['MedicineName'], PlannedTime: slotInfo.slot, Action: 'Bệnh nhân bỏ qua trên App', Status: 'Bỏ lỡ' } }) }));
      await Promise.all(promises);
    } catch (e) { console.error(e); }
    await fetchAndProcessMeds(patientId, completedSlots, newSkipped);
  };

  const isTooEarly = slotInfo.type === 'upcoming';
  const isActionDisabled = completedSlots.includes(slotInfo.slot) || skippedSlots.includes(slotInfo.slot) || isTooEarly;
  const currentItems = groupedMeds[slotInfo.slot] || [];
  const availableFilters = ['Tất cả', ...Array.from(new Set(currentItems.map((m: any) => m['MedicineName'])))];
  const filteredItems = currentItems.filter((med: any) => activeFilter === 'Tất cả' || med['MedicineName'] === activeFilter);

  const generateNotifications = () => {
    const notis = [];
    if (slotInfo.missedCount > 0) {
      notis.push({ type: 'warning', title: 'Chú ý cữ thuốc bị lỡ 💊', message: `Hệ thống ghi nhận bạn đang lỡ ${slotInfo.missedCount} cữ thuốc. Hãy uống bổ sung ngay nếu bác sĩ cho phép, hoặc bấm "Bỏ qua" để hệ thống dời lịch an toàn nhé!`, time: 'Vừa xong', isUnread: true });
    }
    notis.push({ type: 'info', title: 'Lời dặn từ Bác sĩ 👨‍⚕️', message: 'Chào bạn, nhớ uống thuốc đúng giờ và báo cáo ngay qua ứng dụng nếu thấy cơ thể có dấu hiệu bất thường nhé. Chúc bạn mau khỏe!', time: '08:00 sáng', isUnread: false });
    return notis;
  };
  const myNotifications = generateNotifications();
  const unreadCount = myNotifications.filter(n => n.isUnread).length;

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const passedNotiCount = orderedTimes.filter(t => timeToMinutes(t) <= nowMins).length;
  const remainingNotiCount = orderedTimes.length - passedNotiCount;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        
        <PatientHeader 
          patientName={patientName} 
          notiCount={unreadCount} 
          onPressNoti={() => setShowNotiModal(true)} 
        />

        <View style={styles.notiStatusBar}>
          <TouchableOpacity style={styles.notiStatusItem} onPress={handleToggleNotification}>
            <MaterialCommunityIcons name={isNotiEnabled ? "bell-ring" : "bell-off"} size={16} color={isNotiEnabled ? colors.primary : colors.danger} />
            <Text style={[styles.notiStatusText, !isNotiEnabled && { color: colors.danger, fontWeight: '700' }]}>
              {isNotiEnabled ? "Đang bật" : "Bật thông báo"}
            </Text>
          </TouchableOpacity>
          <View style={styles.notiStatusDivider} />
          <View style={styles.notiStatusItem}>
            <MaterialCommunityIcons name="email-receive-outline" size={16} color={colors.textMuted} />
            <Text style={styles.notiStatusText}>Đã nhận: <Text style={{fontWeight: '800', color: colors.textDark}}>{passedNotiCount}</Text></Text>
          </View>
          <View style={styles.notiStatusDivider} />
          <View style={styles.notiStatusItem}>
            <MaterialCommunityIcons name="timer-sand" size={16} color={colors.warning} />
            <Text style={styles.notiStatusText}>Còn lại: <Text style={{fontWeight: '800', color: colors.textDark}}>{remainingNotiCount}</Text></Text>
          </View>
        </View>

        <ProgressCard progress={progress} />

        <View style={styles.upcomingSection}>
          {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} /> : orderedTimes.length === 0 ? (
            <View style={[styles.medCard, { alignItems: 'center', paddingVertical: 20 }]}><Text style={{ color: colors.textMuted, fontWeight: '600' }}>Không có lịch trình nào.</Text></View>
          ) : slotInfo.type === 'done' ? (
            <View style={[styles.medCard, { alignItems: 'center', paddingVertical: 40, justifyContent: 'center' }]}>
              <MaterialCommunityIcons name="check-decagram" size={60} color={colors.success} />
              <Text style={{ color: colors.textDark, fontWeight: '800', fontSize: 18, marginTop: 16 }}>Tuyệt vời!</Text>
              <Text style={{ color: colors.textMuted, marginTop: 6 }}>Bạn đã hoàn thành phác đồ hôm nay.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {slotInfo.type === 'catchup' ? 'Lịch trình bị nhỡ lúc: ' : 'Lịch trình lúc: '}
                <Text style={{color: slotInfo.type === 'catchup' ? colors.danger : colors.primary}}>{slotInfo.slot}</Text>
              </Text>
              
              <View style={styles.medCard}>
                {availableFilters.length > 2 && ( 
                  <View style={styles.filterWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                      {(availableFilters as string[]).map(itemName => (
                        <TouchableOpacity key={itemName} style={[styles.filterChip, activeFilter === itemName && styles.filterChipActive]} onPress={() => setActiveFilter(itemName)}>
                          <Text style={[styles.filterChipText, activeFilter === itemName && styles.filterChipTextActive]}>{itemName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <ScrollView style={styles.medListContainer} showsVerticalScrollIndicator={false}>
                  {filteredItems.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 10, fontSize: 12 }}>Trống.</Text>
                  ) : (
                    filteredItems.map((med: any, i: number) => {
                      const currentDose = med['Dose'] || med['Dosage'] || '';
                      const route = getMedRouteDetails(med['MedicineName'], currentDose);
                      const imageUrl = medImages[String(med['MedicineName']).trim()];
                      const specialTag = getSpecialTagDetails(med['Usage']);

                      return (
                        <View key={i} style={[styles.medItemRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
                          <View style={styles.medImageBox}>
                            {imageUrl ? ( <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> ) : (
                              <><MaterialCommunityIcons name="image-outline" size={24} color="#94A3B8" /><Text style={styles.medImagePlaceholderText}>Chưa có ảnh</Text></>
                            )}
                          </View>
                          <View style={styles.medInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Text style={styles.medName} numberOfLines={1}>{med['MedicineName']}</Text>
                              <TouchableOpacity style={[styles.voiceBtn, speakingMedIndex === i && styles.voiceBtnActive]} onPress={() => handleSpeakInstruction(med['MedicineName'], route.label, currentDose, med['Usage'], i)}>
                                <MaterialCommunityIcons name={speakingMedIndex === i ? "volume-high" : "volume-variant-off"} size={16} color={speakingMedIndex === i ? "#FFF" : colors.primary} />
                              </TouchableOpacity>
                            </View>
                            <View style={styles.singleUsageRow}>
                              <MaterialCommunityIcons name={route.icon as any} size={14} color={route.color} style={{ marginRight: 4 }} />
                              <Text style={styles.singleUsageText}>{route.label} <Text style={{ color: '#94A3B8' }}>•</Text> Liều: {currentDose}</Text>
                            </View>
                          </View>
                          {specialTag && (
                            <View style={[styles.specialIndicatorBadge, { backgroundColor: specialTag.bg }]}>
                              <Text style={[styles.specialIndicatorText, { color: specialTag.color }]}>{specialTag.text}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                <View style={styles.actionButtonGroup}>
                  <TouchableOpacity style={[styles.btnItem, { backgroundColor: colors.success }, isActionDisabled && styles.btnDisabled]} disabled={isActionDisabled} onPress={handleConfirmDose}>
                    <MaterialCommunityIcons name="check-circle" size={14} color="#FFF" /><Text style={styles.btnText}>Hoàn thành</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnItem, { backgroundColor: colors.warning }, isActionDisabled && styles.btnDisabled]} disabled={isActionDisabled} onPress={handleSnoozeDose}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={14} color="#FFF" /><Text style={styles.btnText}>Nhắc sau 10 phút</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnItem, { backgroundColor: colors.danger }, isActionDisabled && styles.btnDisabled]} disabled={isActionDisabled} onPress={handleSkipDose}>
                    <MaterialCommunityIcons name="close-circle" size={14} color="#FFF" /><Text style={styles.btnText}>Bỏ qua</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="home" size={26} color={colors.primary} /><Text style={[styles.navText, { color: colors.primary }]}>Trang chủ</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/patient-history', params: { id: patientId, name: patientName } })}><MaterialCommunityIcons name="history" size={26} color={colors.textMuted} /><Text style={styles.navText}>Lịch sử</Text></TouchableOpacity>
        
        <View style={styles.navItemCenterWrapper}>
          <TouchableOpacity style={styles.navItemCenterSOS} onPress={() => setShowSymptomModal(true)}>
            <MaterialCommunityIcons name="alert-decagram" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="medical-bag" size={26} color={colors.textMuted} /><Text style={styles.navText}>Tủ y tế</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="cog-outline" size={26} color={colors.textMuted} /><Text style={styles.navText}>Cài đặt</Text></TouchableOpacity>
      </View>

      <SymptomModal visible={showSymptomModal} onClose={() => setShowSymptomModal(false)} selectedSymptoms={selectedSymptoms} onToggleSymptom={toggleSymptom} otherSymptom={otherSymptom} onChangeOtherSymptom={setOtherSymptom} onSubmit={handleReportSymptom} sending={sendingSymptom} />
      <NotificationModal visible={showNotiModal} onClose={() => setShowNotiModal(false)} notifications={myNotifications} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg }, mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 80 : 60 },
  notiStatusBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, marginBottom: 16, alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  notiStatusItem: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 }, notiStatusText: { fontSize: 12, color: colors.textMuted }, notiStatusDivider: { width: 1, height: 16, backgroundColor: colors.border },
  upcomingSection: { flex: 1, paddingBottom: 10 }, sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark, marginBottom: 8 },
  medCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, elevation: 2 },
  filterWrapper: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }, filterContainer: { gap: 8, paddingRight: 20 }, filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' }, filterChipActive: { backgroundColor: colors.primary }, filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted }, filterChipTextActive: { color: '#FFF' },
  medListContainer: { flex: 1 }, medItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }, medImageBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }, medImagePlaceholderText: { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  medInfo: { flex: 1, justifyContent: 'center' }, medName: { fontSize: 16, fontWeight: '800', color: colors.textDark, flexShrink: 1 }, voiceBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BAE6FD' }, voiceBtnActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark }, singleUsageRow: { flexDirection: 'row', alignItems: 'center' }, singleUsageText: { fontSize: 13, color: colors.textMuted, fontWeight: '600', lineHeight: 18 }, specialIndicatorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'center', marginLeft: 8 }, specialIndicatorText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  actionButtonGroup: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }, btnItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderRadius: 10 }, btnText: { color: '#FFF', fontSize: 12, fontWeight: '700' }, btnDisabled: { opacity: 0.3, backgroundColor: '#94A3B8' }, 
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 80 : 60, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }, navItem: { alignItems: 'center', flex: 1 }, navText: { fontSize: 9, fontWeight: '600', color: colors.textMuted, marginTop: 2 }, navItemCenterWrapper: { flex: 1, alignItems: 'center' }, navItemCenterSOS: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', top: -24, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, elevation: 8, borderWidth: 3, borderColor: '#FFF' }
});