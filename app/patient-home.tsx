import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Papa from 'papaparse';
import * as Notifications from 'expo-notifications'; 
import * as Speech from 'expo-speech'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const colors = { 
  primary: '#00A991', 
  primaryDark: '#008573', 
  bg: '#F8FAFC', 
  surface: '#FFFFFF', 
  textDark: '#1E293B', 
  textMuted: '#64748B', 
  danger: '#EF4444', 
  warning: '#F59E0B', 
  border: '#F1F5F9', 
  success: '#10B981' 
};

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

const CircularProgress = ({ size, strokeWidth, percentage, color }: any) => {
  const radius = (size - strokeWidth) / 2; 
  const circum = radius * 2 * Math.PI; 
  const svgProgress = 100 - percentage;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle stroke="rgba(255,255,255,0.2)" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <Circle stroke={color} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeDasharray={`${circum} ${circum}`} strokeDashoffset={radius * Math.PI * 2 * (svgProgress / 100)} strokeLinecap="round" transform={`rotate(-90, ${size / 2}, ${size / 2})`} />
      </Svg>
      <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>{percentage}<Text style={{ fontSize: 10 }}>%</Text></Text></View>
    </View>
  );
};

export default function PatientHomeScreen() {
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

  useEffect(() => {
    const configureNotifications = async () => {
      if (Platform.OS === 'web') return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medihub-reminders', {
          name: 'Lịch nhắc MediHub',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00A991',
          sound: 'default'
        });
      }
    };
    configureNotifications();
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedName = await AsyncStorage.getItem('patientName') || 'Người dùng';
        const savedId = await AsyncStorage.getItem('patientId') || '';
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

  useEffect(() => {
    return () => { Speech.stop(); };
  }, [slotInfo.slot]);

  useEffect(() => {
    setActiveFilter('Tất cả');
  }, [slotInfo.slot]);

  const scheduleMedReminders = async (times: string[]) => {
    if (Platform.OS === 'web') return; 
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      times.forEach(async (time) => {
        const parts = time.split(':');
        if (parts.length !== 2) return; 
        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        if (isNaN(hour) || isNaN(minute)) return;

        await Notifications.scheduleNotificationAsync({
          content: { 
            title: "🔔 MediHub: Đến lịch trình của bạn!", 
            body: `Đã đến giờ thực hiện lịch trình lúc ${time}.`, 
            sound: true,
            badge: 1,
            android: { channelId: 'medihub-reminders' } 
          },
          trigger: { 
            type: 'daily',
            hour: hour, 
            minute: minute, 
            repeats: true 
          } as any,
        });
      });
    } catch (error) { console.log(error); }
  };

  const getMedRouteDetails = (name: string, dosage: string) => {
    const checkText = (name + " " + dosage).toLowerCase();
    if (['tra mắt', 'mỡ', 'gel'].some(kw => checkText.includes(kw))) return { icon: 'eye-outline', label: 'Thuốc tra mắt', color: '#8B5CF6', bg: '#EDE9FE', isEyeDrop: true };
    if (['nhỏ', 'giọt', 'sanlein', 'cravit', 'tobrex'].some(kw => checkText.includes(kw))) return { icon: 'eyedropper', label: 'Thuốc nhỏ mắt', color: '#0284C7', bg: '#E0F2FE', isEyeDrop: true };
    if (['bôi', 'ngoài da', 'dán'].some(kw => checkText.includes(kw))) return { icon: 'hand-water', label: 'Dùng ngoài da', color: '#F59E0B', bg: '#FFFBEB', isEyeDrop: false };
    if (['vitamin', 'canxi', 'omega', 'bổ', 'tpcn', 'kẽm', 'sắt'].some(kw => checkText.includes(kw))) return { icon: 'leaf', label: 'Thực phẩm chức năng', color: '#10B981', bg: '#ECFDF5', isEyeDrop: false };
    if (['bông', 'băng', 'gạc', 'kim', 'bơm', 'cồn', 'nước muối', 'sinh lý', 'rửa'].some(kw => checkText.includes(kw))) return { icon: 'bandage', label: 'Vật tư y tế', color: '#64748B', bg: '#F1F5F9', isEyeDrop: false };
    return { icon: 'pill', label: 'Thuốc uống', color: '#10B981', bg: '#ECFDF5', isEyeDrop: false };
  };

  const getSpecialTagDetails = (usageStr: string) => {
    const u = String(usageStr || '').toLowerCase();
    if (u.includes('phải')) return { text: 'MẮT PHẢI', bg: '#FFEDD5', color: '#EA580C', icon: 'arrow-right-bold' };
    if (u.includes('trái')) return { text: 'MẮT TRÁI', bg: '#F3E8FF', color: '#9333EA', icon: 'arrow-left-bold' };
    if (u.includes('2 mắt') || u.includes('hai mắt')) return { text: 'CẢ 2 MẮT', bg: '#E0F2FE', color: '#0369A1', icon: 'eye' };
    if (u.includes('sau ăn')) return { text: 'SAU ĂN', bg: '#FEF9C3', color: '#854D0E', icon: 'silverware-fork-knife' };
    if (u.includes('trước ăn')) return { text: 'TRƯỚC ĂN', bg: '#E0F2FE', color: '#0369A1', icon: 'clock-outline' };
    return null;
  };

  const handleSpeakInstruction = async (medName: string, label: string, dose: string, usage: string, index: number) => {
    try {
      if (speakingMedIndex === index) {
        await Speech.stop();
        setSpeakingMedIndex(null);
        return;
      }
      await Speech.stop();
      setSpeakingMedIndex(index);
      const textToSpeak = `Thuốc sử dụng: ${medName}. Loại thuốc: ${label}. Liều lượng sử dụng: ${dose}. Cách dùng: ${usage || 'Sử dụng theo chỉ định của bác sĩ'}.`;
      Speech.speak(textToSpeak, {
        language: 'vi-VN',
        pitch: 1.0,
        rate: 0.85,
        onComplete: () => setSpeakingMedIndex(null),
        onError: () => setSpeakingMedIndex(null)
      });
    } catch (e) {
      console.log("Lỗi:", e);
      setSpeakingMedIndex(null);
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

      if (nowMins >= slotMins - 15 && nowMins <= midPoint) {
        return { slot: times[i], type: 'standard', missedCount: missedSlots.length };
      }
    }

    const upcoming = times.find(t => !processed.includes(t) && timeToMinutes(t) > nowMins);
    if (upcoming) return { slot: upcoming, type: 'upcoming', missedCount: missedSlots.length };

    if (missedSlots.length > 0) {
      return { slot: missedSlots[0], type: 'catchup', missedCount: missedSlots.length };
    }

    return { slot: '--:--', type: 'done', missedCount: 0 };
  };

  const fetchAndProcessMeds = async (pid: string, currentCompleted: string[], currentSkipped: string[]) => {
    try {
      const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
      const gidRemind = '2073748495';
      const gidLog = '1373475002'; 
      const t = new Date().getTime();

      // 🔥 MÃ GID MEDICINE CỦA SẾP ĐÃ ĐƯỢC GẮN VÀO ĐÂY
      const gidMedicine = '1532424446'; 
      const csvMedicine = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMedicine}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const medicineData = Papa.parse(csvMedicine, { header: true, skipEmptyLines: true }).data;
      
      const imageDict: any = {};
      medicineData.forEach((item: any) => {
        const medName = item['MedicineName'] || item['Tên thuốc'] || item['Name'] || '';
        const imgUrl = item['ImageUrl'] || item['Image'] || item['Hình ảnh'] || '';
        if (medName && imgUrl) imageDict[String(medName).trim()] = String(imgUrl).trim();
      });
      setMedImages(imageDict); 

      const csvLog = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const logsData = Papa.parse(csvLog, { header: true, skipEmptyLines: true }).data;

      const today = new Date();
      const todayStr1 = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      const todayStr2 = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const todayStr3 = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const fetchedCompleted: string[] = [];
      const fetchedSkipped: string[] = [];

      logsData.forEach((log: any) => {
        const logPid = log['PatientsID'] || log['PatientID'] || '';
        if (String(logPid).trim().toUpperCase() !== pid.toUpperCase()) return;

        const timestamp = log['Timestamp'] || log['Date'] || log['Thời gian'] || '';
        const isToday = timestamp.includes(todayStr1) || timestamp.includes(todayStr2) || timestamp.includes(todayStr3) || timestamp === '';

        if (isToday) {
          const timeSlot = log['PlannedTime'] || log['Time'] || '';
          if (timeSlot) {
            if (log['Status'] === 'Đã sử dụng' && !fetchedCompleted.includes(timeSlot)) {
              fetchedCompleted.push(timeSlot);
            } else if (log['Status'] === 'Bỏ lỡ' && !fetchedSkipped.includes(timeSlot)) {
              fetchedSkipped.push(timeSlot);
            }
          }
        }
      });

      const finalCompleted = Array.from(new Set([...currentCompleted, ...fetchedCompleted]));
      const finalSkipped = Array.from(new Set([...currentSkipped, ...fetchedSkipped]));
      setCompletedSlots(finalCompleted);
      setSkippedSlots(finalSkipped);

      const csvRemind = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const remindData = Papa.parse(csvRemind, { header: true, skipEmptyLines: true }).data;

      const myMeds = remindData.filter((r: any) => {
        const rawId = r['PatientID'] || r['PatientsID'] || r['Mã BN'];
        return rawId && String(rawId).trim().toUpperCase() === pid.toUpperCase() && String(r['Reminder_mode']).trim() === 'Bật';
      });

      if (myMeds.length > 0) {
        setPatientConfig({
          sleep: myMeds[0]['SleepTime'] ? String(myMeds[0]['SleepTime']).trim() : '22:00',
          wake: myMeds[0]['WakeTime'] ? String(myMeds[0]['WakeTime']).trim() : '06:00'
        });
      }

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

  const isTooEarly = slotInfo.type === 'upcoming';
  const isCurrentSlotProcessed = completedSlots.includes(slotInfo.slot) || skippedSlots.includes(slotInfo.slot);
  const isActionDisabled = isCurrentSlotProcessed || isTooEarly;

  const handleConfirmDose = async () => {
    if (slotInfo.slot === '--:--' || isActionDisabled) return;
    setLoading(true);
    const newCompleted = [...completedSlots, slotInfo.slot];
    setCompletedSlots(newCompleted);
    await AsyncStorage.setItem(`completed_slots_${patientId}`, JSON.stringify(newCompleted));
    
    try {
      const promises = currentItems.map((med: any) => {
        const logPayload = {
          action: 'add',
          sheetName: 'Log',
          data: {
            PatientsID: patientId,
            MedicineName: med['MedicineName'],
            PlannedTime: slotInfo.slot,
            Action: 'Bệnh nhân xác nhận trên App',
            Status: 'Đã sử dụng'
          }
        };
        return fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(logPayload)
        });
      });
      await Promise.all(promises);
    } catch (e) { console.error(e); }
    
    await fetchAndProcessMeds(patientId, newCompleted, skippedSlots);
  };

  const handleSnoozeDose = () => {
    if (isActionDisabled) return;
    Platform.OS === 'web' ? window.alert(`Đã bật nhắc lại sau 10 phút.`) : Alert.alert('Nhắc nhở', 'Đã bật nhắc lại sau 10 phút.');
  };

  const handleSkipDose = async () => {
    if (slotInfo.slot === '--:--' || isActionDisabled) return;
    setLoading(true);
    const newSkipped = [...skippedSlots, slotInfo.slot];
    setSkippedSlots(newSkipped);
    await AsyncStorage.setItem(`skipped_slots_${patientId}`, JSON.stringify(newSkipped));
    
    try {
      const promises = currentItems.map((med: any) => {
        const logPayload = {
          action: 'add',
          sheetName: 'Log',
          data: {
            PatientsID: patientId,
            MedicineName: med['MedicineName'],
            PlannedTime: slotInfo.slot,
            Action: 'Bệnh nhân bỏ qua trên App',
            Status: 'Bỏ lỡ'
          }
        };
        return fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(logPayload)
        });
      });
      await Promise.all(promises);
    } catch (e) { console.error(e); }

    await fetchAndProcessMeds(patientId, completedSlots, newSkipped);
  };

  const currentItems = groupedMeds[slotInfo.slot] || [];
  const hasEyeDrops = currentItems.some((med: any) => getMedRouteDetails(med['MedicineName'], med['Dose'] || med['Dosage'] || '').isEyeDrop);
  const availableFilters = ['Tất cả', ...Array.from(new Set(currentItems.map((m: any) => m['MedicineName'])))];
  
  const filteredItems = currentItems.filter((med: any) => {
    if (activeFilter === 'Tất cả') return true;
    return med['MedicineName'] === activeFilter;
  });

  const getSafeNextTimeMsg = () => {
    let spacingHours = 2; 
    const eyeDropsInSlot = currentItems.filter((med: any) => getMedRouteDetails(med['MedicineName'], med['Dose'] || med['Dosage'] || '').isEyeDrop);
    if (eyeDropsInSlot.length > 0 && eyeDropsInSlot[0]['Spacing']) {
      const parsedSpacing = parseFloat(eyeDropsInSlot[0]['Spacing']);
      if (!isNaN(parsedSpacing)) spacingHours = parsedSpacing;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() + spacingHours * 60);
    const nextTotalMins = now.getHours() * 60 + now.getMinutes();

    const [sleepH, sleepM] = patientConfig.sleep.split(':').map(Number);
    const [wakeH, wakeM] = patientConfig.wake.split(':').map(Number);
    const sleepTotalMins = sleepH * 60 + sleepM;
    const wakeTotalMins = wakeH * 60 + wakeM;

    let isSleeping = false;
    if (sleepTotalMins > wakeTotalMins) {
      if (nextTotalMins >= sleepTotalMins || nextTotalMins < wakeTotalMins) isSleeping = true;
    } else {
      if (nextTotalMins >= sleepTotalMins && nextTotalMins < wakeTotalMins) isSleeping = true;
    }

    if (isSleeping) {
      return `Các cử lỡ còn lại vui lòng BỎ QUA để đảm bảo giấc ngủ an toàn (Từ ${patientConfig.sleep} đến ${patientConfig.wake}).`;
    }

    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return `Cử lỡ tiếp theo được dời sang ${timeStr} (Cách nhau ${spacingHours} giờ) để tránh ngộ độc nhãn áp.`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greetingText}>Chào buổi tối,</Text>
            <Text style={styles.nameText}>{patientName} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notiBtn}><MaterialCommunityIcons name="bell-outline" size={20} color={colors.textDark} /><View style={styles.notiBadge}><Text style={styles.notiBadgeText}>3</Text></View></TouchableOpacity>
            <View style={styles.avatar}><Text style={styles.avatarText}>{patientName.charAt(0).toUpperCase()}</Text></View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressContent}>
            <View>
              <Text style={styles.progressTitle}>TIẾN ĐỘ HÔM NAY</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                <Text style={styles.progressBigNumber}>{progress.completed}</Text>
                <Text style={styles.progressSmallNumber}>/{progress.total}</Text>
              </View>
              <Text style={styles.progressSubtitle}>lịch trình hoàn thành</Text>
            </View>
            <CircularProgress size={60} strokeWidth={6} percentage={progress.percent} color="#FFFFFF" />
          </View>
        </View>

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
              
              {slotInfo.type === 'catchup' && slotInfo.missedCount >= 2 && hasEyeDrops ? (
                <View style={styles.smartWarningBox}>
                  <MaterialCommunityIcons name="shield-alert" size={24} color="#C2410C" />
                  <View style={{flex: 1}}>
                    <Text style={styles.smartWarningTitle}>Cảnh báo dãn liều an toàn</Text>
                    <Text style={styles.smartWarningText}>
                      Phát hiện <Text style={{fontWeight: 'bold'}}>{slotInfo.missedCount} lần</Text> lỡ thuốc nhỏ mắt. Vui lòng thực hiện 1 lần ngay bây giờ. <Text style={{fontWeight: 'bold'}}>{getSafeNextTimeMsg()}</Text>
                    </Text>
                  </View>
                </View>
              ) : slotInfo.type === 'catchup' ? (
                <Text style={{fontSize: 12, color: colors.danger, marginBottom: 8, fontWeight: '600'}}>⚠️ Hãy thực hiện bổ sung nếu Bác sĩ cho phép.</Text>
              ) : slotInfo.type === 'upcoming' ? (
                <View>
                  <Text style={{fontSize: 12, color: colors.warning, marginBottom: 4, fontWeight: '600'}}>⏳ Chưa đến giờ. Các nút xác nhận đã được khóa.</Text>
                  {slotInfo.missedCount > 0 && (
                    <Text style={{fontSize: 11, color: colors.danger, marginBottom: 8, fontStyle: 'italic'}}>
                      * Bạn có {slotInfo.missedCount} lịch trình lỡ trước đó. Hệ thống đã dời xuống cuối ngày để tránh chồng chéo liều.
                    </Text>
                  )}
                </View>
              ) : null}

              <View style={styles.medCard}>
                
                {availableFilters.length > 2 && ( 
                  <View style={styles.filterWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                      {(availableFilters as string[]).map(itemName => (
                        <TouchableOpacity 
                          key={itemName} 
                          style={[styles.filterChip, activeFilter === itemName && styles.filterChipActive]}
                          onPress={() => setActiveFilter(itemName)}
                        >
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
                      const isThisMedSpeaking = speakingMedIndex === i;

                      return (
                        <View key={i} style={[styles.medItemRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
                          
                          <View style={styles.medImageBox}>
                            {imageUrl ? (
                              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="image-outline" size={24} color="#94A3B8" />
                                <Text style={styles.medImagePlaceholderText}>Chưa có ảnh</Text>
                              </>
                            )}
                          </View>

                          <View style={styles.medInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Text style={styles.medName} numberOfLines={1}>{med['MedicineName']}</Text>
                              <TouchableOpacity 
                                style={[styles.voiceBtn, isThisMedSpeaking && styles.voiceBtnActive]} 
                                onPress={() => handleSpeakInstruction(med['MedicineName'], route.label, currentDose, med['Usage'], i)}
                              >
                                <MaterialCommunityIcons 
                                  name={isThisMedSpeaking ? "volume-high" : "volume-variant-off"} 
                                  size={16} 
                                  color={isThisMedSpeaking ? "#FFF" : colors.primary} 
                                />
                              </TouchableOpacity>
                            </View>
                            
                            <View style={styles.singleUsageRow}>
                              <MaterialCommunityIcons name={route.icon as any} size={14} color={route.color} style={{ marginRight: 4 }} />
                              <Text style={styles.singleUsageText}>
                                {route.label} <Text style={{ color: '#94A3B8' }}>•</Text> Liều dùng: {currentDose} {med['Usage'] ? `(${med['Usage']})` : ''}
                              </Text>
                            </View>
                          </View>

                          {specialTag && (
                            <View style={[styles.specialIndicatorBadge, { backgroundColor: specialTag.bg }]}>
                              <MaterialCommunityIcons name={specialTag.icon as any} size={12} color={specialTag.color} />
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
        <View style={styles.navItemCenterWrapper}><TouchableOpacity style={styles.navItemCenter}><MaterialCommunityIcons name="plus" size={30} color="#FFF" /></TouchableOpacity></View>
        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="medical-bag" size={26} color={colors.textMuted} /><Text style={styles.navText}>Tủ y tế</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="cog-outline" size={26} color={colors.textMuted} /><Text style={styles.navText}>Cài đặt</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 80 : 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerText: { flex: 1 }, greetingText: { fontSize: 14, color: colors.textMuted, marginBottom: 2 }, nameText: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notiBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  notiBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.danger, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' }, notiBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  progressCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 16, elevation: 4, marginBottom: 16 },
  progressContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, progressTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' }, progressBigNumber: { color: '#FFF', fontSize: 32, fontWeight: '900' }, progressSmallNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '700' }, progressSubtitle: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  upcomingSection: { flex: 1, paddingBottom: 10 }, sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark, marginBottom: 8 },
  medCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, elevation: 2 },
  smartWarningBox: { flexDirection: 'row', backgroundColor: '#FFEDD5', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#FDBA74' },
  smartWarningTitle: { color: '#C2410C', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  smartWarningText: { color: '#9A3412', fontSize: 12, lineHeight: 18 },
  filterWrapper: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  filterContainer: { gap: 8, paddingRight: 20 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  filterChipTextActive: { color: '#FFF' },
  medListContainer: { flex: 1 }, 
  medItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  medImageBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  medImagePlaceholderText: { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  medInfo: { flex: 1, justifyContent: 'center' }, 
  medName: { fontSize: 16, fontWeight: '800', color: colors.textDark, flexShrink: 1 }, 
  voiceBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BAE6FD' },
  voiceBtnActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  singleUsageRow: { flexDirection: 'row', alignItems: 'center' },
  singleUsageText: { fontSize: 13, color: colors.textMuted, fontWeight: '600', lineHeight: 18 },
  specialIndicatorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'center', marginLeft: 8 },
  specialIndicatorText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  actionButtonGroup: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  btnItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderRadius: 10 }, btnText: { color: '#FFF', fontSize: 12, fontWeight: '700' }, 
  btnDisabled: { opacity: 0.3, backgroundColor: '#94A3B8' }, 
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 80 : 60, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  navItem: { alignItems: 'center', flex: 1 }, navText: { fontSize: 9, fontWeight: '600', color: colors.textMuted, marginTop: 2 }, navItemCenterWrapper: { flex: 1, alignItems: 'center' },
  navItemCenter: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', top: -20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 6 }
});