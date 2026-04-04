import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Modal, Alert, Platform, RefreshControl, Linking, Image, TextInput } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router'; 
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const colors = {
  bg: '#F4F7F6', primary: '#0F766E', cardBg: '#FFFFFF', textDark: '#1E293B', textLight: '#475569',
  timeColor: '#D97706', statusDone: '#16A34A', statusSnooze: '#F59E0B', statusMissed: '#DC2626',
  danger: '#DC2626', warningBg: '#FEF2F2', warningBorder: '#F87171'
};

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5AnG5s_o2-nnXYYH0P0kb3-3N0QFgNOzg_Ix0KLDoG4SBvuqmouSLxfGPXRj068-O7A/exec';

export default function PatientHomeScreen() {
  const params = useLocalSearchParams();
  const patientId = params.id as string;
  const patientName = params.name as string;

  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isLogModalVisible, setLogModalVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const [isHistoryModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [streak, setStreak] = useState(0);

  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [isSosModalVisible, setSosModalVisible] = useState(false);
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('med-reminders', {
          name: 'Nhắc nhở y tế', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C',
        });
      }
    })();
  }, []);

  const checkStreak = async () => {
    try {
      const storedDate = await AsyncStorage.getItem(`@lastLogDate_${patientId}`);
      const storedStreak = await AsyncStorage.getItem(`@streak_${patientId}`);
      let currentStreak = storedStreak ? parseInt(storedStreak) : 0;

      if (storedDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parts = storedDate.split('/'); 
        const lastDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        lastDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          currentStreak = 0;
          await AsyncStorage.setItem(`@streak_${patientId}`, '0');
        }
      }
      setStreak(currentStreak);
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    if (patientId) checkStreak();
  }, [patientId]);

  const updateStreak = async () => {
    try {
      const todayObj = new Date();
      const todayStr = `${todayObj.getFullYear()}/${todayObj.getMonth() + 1}/${todayObj.getDate()}`;
      
      const storedDate = await AsyncStorage.getItem(`@lastLogDate_${patientId}`);
      const storedStreak = await AsyncStorage.getItem(`@streak_${patientId}`);
      let currentStreak = storedStreak ? parseInt(storedStreak) : 0;
      let increased = false;

      if (storedDate !== todayStr) {
        if (storedDate) {
          todayObj.setHours(0, 0, 0, 0);
          const parts = storedDate.split('/');
          const lastDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          lastDate.setHours(0, 0, 0, 0);
          
          const diffTime = todayObj.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) { currentStreak += 1; increased = true; } 
          else if (diffDays > 1) { currentStreak = 1; increased = true; }
        } else {
          currentStreak = 1; increased = true;
        }
        setStreak(currentStreak);
        await AsyncStorage.setItem(`@streak_${patientId}`, currentStreak.toString());
        await AsyncStorage.setItem(`@lastLogDate_${patientId}`, todayStr);
      }
      return { increased, currentStreak };
    } catch (e) { return { increased: false, currentStreak: streak }; }
  };

  const openLogModal = (med: any) => { setSelectedMed(med); setLogModalVisible(true); };

  const scheduleMedicationReminders = async (meds: any[]) => {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const med of meds) {
      if (med.Time && typeof med.Time === 'string' && med.Time.includes(':')) {
        const parts = med.Time.trim().split(':');
        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        if (!isNaN(hour) && !isNaN(minute)) {
          const trigger: any = Platform.OS === 'android' ? { channelId: 'med-reminders', hour, minute, repeats: true } : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, repeats: true };
          await Notifications.scheduleNotificationAsync({ content: { title: 'Đến giờ dùng thuốc rồi! 💊', body: `Đến giờ dùng ${med.MedicineName} (${med.Dose}). Hãy bấm xác nhận nhé!`, sound: true, priority: Notifications.AndroidNotificationPriority.MAX }, trigger: trigger });
        }
      }
    }
  };

  const fetchProfileData = async () => {
    const cachedProfile = await AsyncStorage.getItem(`@cached_profile_${patientId}`);
    if (cachedProfile) {
      setProfileData(JSON.parse(cachedProfile)); 
    } else {
      setLoadingProfile(true);
    }

    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0&t=${new Date().getTime()}`;
    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(async csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            const patient = results.data.find((p: any) => p.PatientID === patientId);
            if (patient) {
              setProfileData(patient);
              await AsyncStorage.setItem(`@cached_profile_${patientId}`, JSON.stringify(patient));
            }
            setLoadingProfile(false);
          }
        });
      })
      .catch(() => setLoadingProfile(false));
  };

  const fetchMedications = async (isRefreshing = false) => {
    if (!isRefreshing) {
      const cachedMeds = await AsyncStorage.getItem(`@cached_meds_${patientId}`);
      if (cachedMeds) {
        setMedications(JSON.parse(cachedMeds));
        setLoading(false); 
      } else {
        setLoading(true);
      }
    }

    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1875494973&t=${new Date().getTime()}`;

    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(async csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            let myMeds = results.data.filter((item: any) => item.PatientsID === patientId);
            myMeds.sort((a, b) => (a.Time || "").localeCompare(b.Time || ""));
            
            setMedications(myMeds);
            await AsyncStorage.setItem(`@cached_meds_${patientId}`, JSON.stringify(myMeds)); 
            
            setLoading(false); setRefreshing(false); 
            scheduleMedicationReminders(myMeds);
          }
        });
      }).catch(() => { 
        setLoading(false); setRefreshing(false); 
      });
  };

  const fetchHistoryLogs = async (background = false) => {
    if (!background) {
      const cachedHistory = await AsyncStorage.getItem(`@cached_history_${patientId}`);
      if (cachedHistory) {
        setHistoryLogs(JSON.parse(cachedHistory));
      } else {
        setLoadingHistory(true);
      }
    }

    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1617086808&t=${new Date().getTime()}`;

    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: async (results) => {
            let myLogs = results.data.filter((item: any) => item.PatientsID === patientId);
            setHistoryLogs(myLogs);
            await AsyncStorage.setItem(`@cached_history_${patientId}`, JSON.stringify(myLogs)); 
            if (!background) setLoadingHistory(false);
          }
        });
      }).catch(() => { if(!background) setLoadingHistory(false); });
  };

  useFocusEffect(useCallback(() => { 
    fetchMedications(); 
    fetchHistoryLogs(true); 
  }, [patientId]));

  const onRefresh = useCallback(() => {
    setRefreshing(true); 
    fetchMedications(true); 
    fetchHistoryLogs(true);
  }, [patientId]);

  const calculateRemaining = (med) => {
    if (!med.Quantity || historyLogs.length === 0) return med.Quantity;
    
    const qtyStr = med.Quantity.toString().toLowerCase();
    if (qtyStr.includes('lọ') || qtyStr.includes('tuýp') || qtyStr.includes('chai') || qtyStr.includes('ống')) {
       return med.Quantity; 
    }

    const totalMatch = med.Quantity.toString().match(/\d+(\.\d+)?/); 
    if (!totalMatch) return med.Quantity;
    const totalQty = parseFloat(totalMatch[0]);

    const doseStr = med.Dose ? med.Dose.toString().replace(/,/g, '.') : '1';
    const doseMatch = doseStr.match(/\d+(\.\d+)?/);
    const dosePerTime = doseMatch ? parseFloat(doseMatch[0]) : 1;

    const takenLogs = historyLogs.filter(log => log.MedicineName === med.MedicineName && log.Status === 'Đã sử dụng');
    const totalConsumed = takenLogs.length * dosePerTime;

    let remaining = totalQty - totalConsumed;
    if (remaining < 0) remaining = 0;
    
    const unitMatch = med.Quantity.toString().replace(/[\d.,]/g, '').trim();
    return `${remaining} ${unitMatch}`.trim();
  };

  const lowMeds = medications.filter(med => {
    if (!med.Quantity) return false;
    const qtyStr = med.Quantity.toString().toLowerCase();
    if (qtyStr.includes('lọ') || qtyStr.includes('tuýp')) return false; 

    const remainingText = calculateRemaining(med);
    const qtyMatch = remainingText.toString().match(/\d+(\.\d+)?/);
    const currentQty = qtyMatch ? parseFloat(qtyMatch[0]) : 99;
    return currentQty > 0 && currentQty <= 5;
  });

  const submitLog = async (newStatus: string) => {
    setIsLogging(true);
    const logPayload = { action: 'add', sheetName: 'Log', data: { PatientsID: patientId, MedicineName: selectedMed.MedicineName, PlannedTime: selectedMed.Time, Action: 'Bệnh nhân tự xác nhận', Status: newStatus } };

    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(logPayload) });
      const textResult = await response.text();
      let result = JSON.parse(textResult);

      if (result.status === 'success') {
          if (newStatus === 'Đã sử dụng') {
            const streakData = await updateStreak();
            if (streakData.increased && [3, 7, 14, 21, 30].includes(streakData.currentStreak)) {
               setTimeout(() => { Alert.alert('🔥 Thành Tích Tuyệt Vời!', `Chúc mừng bạn đã tuân thủ điều trị liên tục ${streakData.currentStreak} ngày! Hãy tiếp tục phát huy nhé!`); }, 1000);
            }
          }
          setLogModalVisible(false);
          setToastVisible(true);
          fetchHistoryLogs(true); 
          setTimeout(() => setToastVisible(false), 2500);
      } else { Alert.alert('Lỗi Server', result.message); }
    } catch (error) { Alert.alert('Lỗi mạng', 'Kết nối yếu. Hãy kiểm tra lại Wifi/4G để báo cáo.'); } finally { setIsLogging(false); }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung góp ý.');
      return;
    }
    setIsSubmittingFeedback(true);
    
    const feedbackPayload = { 
      action: 'add', 
      sheetName: 'Log', 
      data: { 
        PatientsID: patientId, 
        MedicineName: '---', 
        PlannedTime: '---', 
        Action: 'Góp ý', 
        Status: feedbackText 
      } 
    };

    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(feedbackPayload) });
      const textResult = await response.text();
      let result = JSON.parse(textResult);

      if (result.status === 'success') {
        Alert.alert('Gửi thành công', 'Cảm ơn bạn đã gửi ý kiến đóng góp! Chúng tôi sẽ phản hồi sớm nhất.');
        setFeedbackModalVisible(false);
        setFeedbackText('');
      } else {
        Alert.alert('Lỗi Server', result.message);
      }
    } catch (error) {
      Alert.alert('Lỗi mạng', 'Kết nối yếu. Vui lòng kiểm tra Wifi/4G để gửi góp ý.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có muốn thoát tài khoản?')) {
        AsyncStorage.removeItem('patientId');
        AsyncStorage.removeItem('patientName');
        router.replace('/');
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn thoát?', [
        { text: 'Hủy', style: 'cancel' }, 
        { text: 'Thoát', onPress: () => {
          AsyncStorage.removeItem('patientId');
          AsyncStorage.removeItem('patientName');
          router.replace('/');
        }}
      ]);
    }
  };

  const handleSOS = () => {
    setSosModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* MODAL HOTLINE */}
      <Modal visible={isSosModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="headset" size={36} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.modalTitle}>Liên Hệ & Góp Ý</Text>
            </View>
            <Text style={{ fontSize: 18, color: colors.textLight, marginBottom: 25 }}>Bạn cần hỗ trợ từ Phòng khám hoặc muốn gửi phản hồi?</Text>

            <View style={{ gap: 16 }}>
              <TouchableOpacity style={[styles.sosMenuBtn, { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]} onPress={() => { setSosModalVisible(false); Linking.openURL('https://zalo.me/0901234567'); }}>
                <MaterialCommunityIcons name="chat-processing" size={32} color="#0284C7" />
                <Text style={[styles.sosMenuText, { color: '#0284C7' }]}>Nhắn tin Zalo ngay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sosMenuBtn, { backgroundColor: '#FAE8FF', borderColor: '#9333EA' }]} onPress={() => { setSosModalVisible(false); setFeedbackModalVisible(true); }}>
                <MaterialCommunityIcons name="email-edit" size={32} color="#9333EA" />
                <Text style={[styles.sosMenuText, { color: '#9333EA' }]}>Góp ý bằng văn bản</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sosMenuBtn, { backgroundColor: '#FEE2E2', borderColor: colors.danger }]} onPress={() => setSosModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={32} color={colors.danger} />
                <Text style={[styles.sosMenuText, { color: colors.danger }]}>Hủy bỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL NHẬP VĂN BẢN GÓP Ý */}
      <Modal visible={isFeedbackModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="email-edit" size={36} color="#9333EA" style={{ marginRight: 10 }} />
              <Text style={styles.modalTitle}>Gửi Phản Hồi</Text>
            </View>
            
            <Text style={{ fontSize: 18, color: colors.textDark, marginBottom: 15, fontWeight: '500' }}>Xin vui lòng nhập ý kiến hoặc triệu chứng của bạn:</Text>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Chạm vào đây để viết..."
              placeholderTextColor="#94A3B8"
              multiline={true}
              numberOfLines={6}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />

            {isSubmittingFeedback ? (
              <ActivityIndicator size="large" color="#9333EA" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 25 }}>
                <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#9333EA' }]} onPress={submitFeedback}>
                  <MaterialCommunityIcons name="send" size={28} color="white" />
                  <Text style={styles.logBtnText}>Gửi Ngay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#E2E8F0' }]} onPress={() => { setFeedbackModalVisible(false); setFeedbackText(''); }}>
                  <MaterialCommunityIcons name="close" size={28} color={colors.textDark} />
                  <Text style={[styles.logBtnText, { color: colors.textDark }]}>Trở Về</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL HỒ SƠ */}
      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade">
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.profileHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="clipboard-account" size={32} color={colors.primary} />
                <Text style={styles.profileTitle}>Hồ Sơ Y Tế</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={28} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            {loadingProfile ? (
              <View style={{paddingVertical: 50, alignItems: 'center'}}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{color: colors.textLight, marginTop: 15, fontSize: 16}}>Đang tải hồ sơ...</Text>
              </View>
            ) : (
              <View style={styles.profileDetails}>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Mã Bệnh Nhân:</Text><Text style={styles.profileValue}>{profileData?.PatientID || patientId}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Họ và Tên:</Text><Text style={styles.profileValue}>{profileData?.Name || patientName}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Tuổi:</Text><Text style={styles.profileValue}>{profileData?.Age ? `${profileData.Age} tuổi` : '---'}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Giới tính:</Text><Text style={styles.profileValue}>{profileData?.Gender || '---'}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Mã ICD / Bệnh:</Text><Text style={[styles.profileValue, {color: colors.timeColor, fontWeight: 'bold'}]}>{profileData?.ICD || 'Chưa cập nhật'}</Text></View>
                <View style={[styles.profileRow, {borderBottomWidth: 0}]}><Text style={styles.profileLabel}>Ngày bắt đầu:</Text><Text style={styles.profileValue}>{profileData?.DayStart || '---'}</Text></View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL ĐIỂM DANH */}
      <Modal visible={isLogModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác Nhận Thuốc</Text> 
            </View>
            {selectedMed && (
              <View style={styles.medInfoBox}>
                <Text style={styles.medNameModal}>{selectedMed.MedicineName}</Text>
                <Text style={styles.medTimeModal}>Giờ uống: {selectedMed.Time}</Text> 
                <Text style={styles.medDoseModal}>Liều lượng: {selectedMed.Dose} ({selectedMed.Usage})</Text>
              </View>
            )}
            {isLogging ? (
              <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 40}} />
            ) : (
              <View style={styles.logActions}>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusDone}]} onPress={() => submitLog('Đã sử dụng')}>
                  <MaterialCommunityIcons name="check-circle" size={36} color="white" />
                  <Text style={styles.logBtnText}>Đã Uống</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusSnooze}]} onPress={() => submitLog('Nhắc lại')}>
                  <MaterialCommunityIcons name="alarm-snooze" size={36} color="white" />
                  <Text style={styles.logBtnText}>Chưa Uống</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isLogging && (
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setLogModalVisible(false)}>
                <Text style={{color: colors.textLight, fontWeight: 'bold', fontSize: 18}}>BỎ QUA LẦN NÀY</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL LỊCH SỬ */}
      <Modal visible={isHistoryModalVisible} transparent={true} animationType="slide">
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Lịch Sử Ghi Nhận</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={28} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            {loadingHistory ? (
              <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              <FlatList
                data={historyLogs}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 25 }}
                renderItem={({ item }) => {
                  let statusColor = item.Status === 'Đã sử dụng' ? '#15803D' : (item.Status === 'Bỏ lỡ' ? '#B91C1C' : '#C2410C');
                  let bgColor = item.Status === 'Đã sử dụng' ? '#DCFCE7' : (item.Status === 'Bỏ lỡ' ? '#FEE2E2' : '#FFEDD5');
                  let iconName: any = item.Status === 'Đã sử dụng' ? 'check-circle' : (item.Status === 'Bỏ lỡ' ? 'close-circle' : 'alarm-snooze');

                  if (item.Action === 'Góp ý') {
                    statusColor = '#7E22CE'; bgColor = '#F3E8FF'; iconName = 'email-fast';
                  }

                  return (
                    <View style={styles.historyCard}>
                      <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={styles.historyMedName}>{item.Action === 'Góp ý' ? '💌 Phản hồi đã gửi' : item.MedicineName}</Text>
                        <Text style={styles.historyTime}>{item.Action === 'Góp ý' ? 'Đã gửi tới phòng khám' : `Cữ thuốc lúc: ${item.PlannedTime}`}</Text>
                        <Text style={styles.historyTimestamp}>Ghi nhận: {item.Timestamp || 'Hôm nay'}</Text>
                      </View>
                      <View style={[styles.historyStatusBadge, {backgroundColor: bgColor}]}>
                        <MaterialCommunityIcons name={iconName} size={18} color={statusColor} style={{marginRight: 4}} />
                        <Text style={[styles.historyStatusText, {color: statusColor}]} numberOfLines={1}>{item.Status}</Text>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="text-box-search-outline" size={80} color="#CBD5E1" /><Text style={styles.emptyText}>Chưa có lịch sử dùng thuốc.</Text></View>}
              />
            )}
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <View style={styles.toastContainer}><MaterialCommunityIcons name="check-decagram" size={28} color="white" /><Text style={styles.toastText}>Đã lưu thành công!</Text></View>
      )}

      {/* HEADER CHÍNH */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.headerProfile} activeOpacity={0.7} onPress={() => { setProfileModalVisible(true); fetchProfileData(); }}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={36} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
            <Text style={styles.patientId}>Chạm để xem hồ sơ</Text>
          </View>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={24} color={streak > 0 ? "#FCD34D" : "#94A3B8"} />
            <Text style={[styles.streakText, streak === 0 && {color: '#94A3B8'}]}>{streak}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {lowMeds.length > 0 && !loading && (
          <View style={styles.warningBanner}>
            <MaterialCommunityIcons name="alert-circle" size={32} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.warningTitle}>Sắp hết thuốc!</Text>
              <Text style={styles.warningText}>Các thuốc sắp hết: <Text style={{fontWeight: 'bold'}}>{lowMeds.map(m => m.MedicineName).join(', ')}</Text>. Hãy liên hệ Bác sĩ.</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.dateHeader}>
            <MaterialCommunityIcons name="calendar-month" size={26} color={colors.textDark} />
            <Text style={styles.dateText}>Lịch Uống Thuốc</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity onPress={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }} style={[styles.actionIconButton, {backgroundColor: '#E0F2FE'}]}><MaterialCommunityIcons name="history" size={28} color="#0284C7" /></TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={[styles.actionIconButton, {backgroundColor: '#F1F5F9'}]} disabled={refreshing}><MaterialCommunityIcons name="refresh" size={28} color={refreshing ? colors.textLight : colors.textDark} /></TouchableOpacity>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={medications}
            keyExtractor={(item, index) => item.ID ? item.ID.toString() : index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <View style={styles.medCard}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeText}>{item.Time}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.medName} numberOfLines={2}>{item.MedicineName}</Text>
                  <Text style={styles.medDetail}>Liều: {item.Dose}</Text>
                  
                  {item.Quantity && (
                    <Text style={styles.medRemaining}>
                      Còn lại: {calculateRemaining(item)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openLogModal(item)}>
                  <MaterialCommunityIcons name="check-bold" size={28} color="white" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="pill" size={80} color="#CBD5E1" /><Text style={styles.emptyText}>Hôm nay bạn không có lịch uống thuốc.</Text></View>}
          />
        )}
      </View>

      <TouchableOpacity style={styles.sosFab} onPress={handleSOS} activeOpacity={0.8}>
        <MaterialCommunityIcons name="phone-plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, padding: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 6 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 56, height: 56, backgroundColor: 'white', borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  patientName: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  patientId: { fontSize: 16, color: '#E0F2FE', fontWeight: '500' },
  
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  streakText: { color: '#FFF', fontWeight: 'bold', fontSize: 18, marginLeft: 6 },
  
  contentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  warningBanner: { flexDirection: 'row', backgroundColor: colors.warningBg, padding: 18, borderRadius: 20, borderWidth: 1.5, borderColor: colors.warningBorder, marginBottom: 20, alignItems: 'center', elevation: 2 },
  warningTitle: { fontSize: 18, fontWeight: 'bold', color: colors.danger, marginBottom: 4 },
  warningText: { fontSize: 16, color: colors.textDark, lineHeight: 24 },

  sosFab: { position: 'absolute', bottom: 30, right: 20, zIndex: 9999, elevation: 8, backgroundColor: '#EA580C', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5, borderWidth: 3, borderColor: '#FFEDD5' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateHeader: { flexDirection: 'row', alignItems: 'center' },
  actionIconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  
  dateText: { fontSize: 22, fontWeight: 'bold', color: colors.textDark, marginLeft: 10 },
  
  medCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 16, elevation: 4, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  timeBlock: { alignItems: 'center', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1.5, borderRightColor: '#E2E8F0', minWidth: 80 },
  timeText: { fontSize: 24, fontWeight: 'bold', color: colors.timeColor },
  infoBlock: { flex: 1, paddingLeft: 16 },
  medName: { fontSize: 20, fontWeight: 'bold', color: colors.textDark, marginBottom: 6 },
  medDetail: { fontSize: 16, color: colors.textLight, marginBottom: 4 },
  medRemaining: { fontSize: 15, color: '#047857', fontWeight: 'bold' },
  
  actionBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, marginLeft: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: colors.textDark },
  medInfoBox: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#E2E8F0' },
  medNameModal: { fontSize: 26, fontWeight: 'bold', color: colors.primary, marginBottom: 10, textAlign: 'center' },
  medTimeModal: { fontSize: 20, color: colors.timeColor, fontWeight: 'bold', marginBottom: 5 },
  medDoseModal: { fontSize: 18, color: colors.textLight },
  
  logActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  logBtn: { flex: 1, paddingVertical: 18, borderRadius: 20, alignItems: 'center', elevation: 3 },
  logBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginTop: 10 },
  modalBtnCancel: { marginTop: 30, padding: 20, alignItems: 'center' },
  
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  profileModalContent: { backgroundColor: 'white', width: '90%', borderRadius: 30, padding: 25, elevation: 10 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 20 },
  profileTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark, marginLeft: 12 },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  profileDetails: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  profileLabel: { fontSize: 17, color: colors.textLight, fontWeight: '500' },
  profileValue: { fontSize: 17, color: colors.textDark, fontWeight: 'bold', textAlign: 'right', flex: 1, marginLeft: 15 },

  historyModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  historyModalContent: { backgroundColor: 'white', width: '95%', height: '85%', borderRadius: 30, padding: 25, elevation: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 20 },
  historyTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  historyMedName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 6 },
  historyTime: { fontSize: 15, color: colors.textLight },
  historyTimestamp: { fontSize: 14, color: '#64748B', marginTop: 6, fontStyle: 'italic' },
  historyStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  historyStatusText: { fontSize: 14, fontWeight: 'bold' },

  toastContainer: { position: 'absolute', top: '15%', alignSelf: 'center', backgroundColor: '#15803D', paddingVertical: 16, paddingHorizontal: 25, borderRadius: 30, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 10 },
  toastText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 12 },
  
  emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94A3B8', textAlign: 'center', fontSize: 18, marginTop: 15 },

  sosMenuBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, elevation: 1 },
  sosMenuText: { fontSize: 18, fontWeight: 'bold', marginLeft: 16 },
  feedbackInput: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, fontSize: 18, color: colors.textDark, minHeight: 150, borderWidth: 1, borderColor: '#CBD5E1', elevation: 1 }
});