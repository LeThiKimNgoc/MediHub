import React, { useState, useCallback, useEffect } from 'react';
// 🔥 Bổ sung thêm thẻ Image vào đây 🔥
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Modal, Alert, Platform, RefreshControl, Linking, Image } from 'react-native';
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
  bg: '#F0F8FF', primary: '#0F766E', cardBg: '#FFFFFF', textDark: '#263238', textLight: '#78909C',
  timeColor: '#E65100', statusDone: '#4CAF50', statusSnooze: '#FF9800', statusMissed: '#F44336',
  danger: '#F44336', warningBg: '#FFF3E0', warningBorder: '#FF9800'
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

  const fetchProfileData = () => {
    setLoadingProfile(true);
    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0&t=${new Date().getTime()}`;
    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const patient = results.data.find((p: any) => p.PatientID === patientId);
            if (patient) setProfileData(patient);
            setLoadingProfile(false);
          }
        });
      })
      .catch(() => setLoadingProfile(false));
  };

  const fetchMedications = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true); 
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
            setLoading(false); setRefreshing(false); 
            scheduleMedicationReminders(myMeds);
          }
        });
      }).catch(() => { setLoading(false); setRefreshing(false); });
  };

  const fetchHistoryLogs = async (background = false) => {
    if (!background) setLoadingHistory(true);
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

  // 🔥 THUẬT TOÁN TÍNH SỐ LƯỢNG THUỐC CÒN LẠI THÔNG MINH 🔥
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
    } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối máy chủ.'); } finally { setIsLogging(false); }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có muốn thoát tài khoản?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn thoát?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Thoát', onPress: () => router.replace('/') }]);
    }
  };

  const handleSOS = () => {
    if (Platform.OS === 'web') {
      const wantCall = window.confirm("Bạn cần sự trợ giúp y tế?\n- Bấm [OK] để Gọi điện.\n- Bấm [Cancel] để mở Chat Zalo.");
      if (wantCall) { Linking.openURL('tel:0901234567'); } else { Linking.openURL('https://zalo.me/0901234567'); }
      return;
    }
    Alert.alert("Liên hệ Bác sĩ", "Bạn cần sự trợ giúp y tế? Hãy chọn phương thức liên hệ bên dưới:", [{ text: "Hủy bỏ", style: "cancel" }, { text: "Gọi Hotline", onPress: () => Linking.openURL('tel:0901234567') }, { text: "Chat Zalo", onPress: () => Linking.openURL('https://zalo.me/0901234567') }]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* MODAL HỒ SƠ */}
      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade">
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.profileHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="clipboard-account" size={28} color={colors.primary} />
                <Text style={styles.profileTitle}>Hồ Sơ Y Tế</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            {loadingProfile ? (
              <View style={{paddingVertical: 40, alignItems: 'center'}}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{color: colors.textLight, marginTop: 10}}>Đang tải hồ sơ...</Text>
              </View>
            ) : (
              <View style={styles.profileDetails}>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Mã Bệnh Nhân:</Text><Text style={styles.profileValue}>{profileData?.PatientID || patientId}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Họ và Tên:</Text><Text style={styles.profileValue}>{profileData?.Name || patientName}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Tuổi:</Text><Text style={styles.profileValue}>{profileData?.Age ? `${profileData.Age} tuổi` : '---'}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Giới tính:</Text><Text style={styles.profileValue}>{profileData?.Gender || '---'}</Text></View>
                <View style={styles.profileRow}><Text style={styles.profileLabel}>Mã ICD / Bệnh lý:</Text><Text style={[styles.profileValue, {color: colors.timeColor, fontWeight: 'bold'}]}>{profileData?.ICD || 'Chưa cập nhật'}</Text></View>
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
              {/* 🔥 Đổi Icon Pill thành Logo Mắt cho ngầu 🔥 */}
              <Image source={require('../assets/images/favicon.png')} style={{ width: 30, height: 30, marginRight: 10 }} resizeMode="contain" />
              <Text style={styles.modalTitle}>Xác Nhận Sử Dụng Thuốc</Text> 
            </View>
            {selectedMed && (
              <View style={styles.medInfoBox}>
                <Text style={styles.medNameModal}>{selectedMed.MedicineName}</Text>
                <Text style={styles.medTimeModal}>Giờ dùng: {selectedMed.Time}</Text> 
                <Text style={styles.medDoseModal}>Liều lượng: {selectedMed.Dose} ({selectedMed.Usage})</Text>
              </View>
            )}
            {isLogging ? (
              <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 30}} />
            ) : (
              <View style={styles.logActions}>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusDone}]} onPress={() => submitLog('Đã sử dụng')}><MaterialCommunityIcons name="check-circle" size={32} color="white" /><Text style={styles.logBtnText}>Đã Sử Dụng</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusSnooze}]} onPress={() => submitLog('Nhắc lại')}><MaterialCommunityIcons name="alarm-snooze" size={32} color="white" /><Text style={styles.logBtnText}>Nhắc Lại</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.logBtn, {backgroundColor: colors.statusMissed}]} onPress={() => submitLog('Bỏ lỡ')}><MaterialCommunityIcons name="close-circle" size={32} color="white" /><Text style={styles.logBtnText}>Bỏ Lỡ</Text></TouchableOpacity>
              </View>
            )}
            {!isLogging && (<TouchableOpacity style={styles.modalBtnCancel} onPress={() => setLogModalVisible(false)}><Text style={{color: colors.textLight, fontWeight: 'bold', fontSize: 16}}>HỦY BỎ</Text></TouchableOpacity>)}
          </View>
        </View>
      </Modal>

      {/* MODAL LỊCH SỬ */}
      <Modal visible={isHistoryModalVisible} transparent={true} animationType="slide">
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Nhật Ký Đã Ghi Nhận</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.closeBtn}><MaterialCommunityIcons name="close" size={24} color={colors.textDark} /></TouchableOpacity>
            </View>
            {loadingHistory ? (
              <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              <FlatList
                data={historyLogs}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  let statusColor = item.Status === 'Đã sử dụng' ? '#2E7D32' : (item.Status === 'Bỏ lỡ' ? '#C62828' : '#EF6C00');
                  let bgColor = item.Status === 'Đã sử dụng' ? '#E8F5E9' : (item.Status === 'Bỏ lỡ' ? '#FFEBEE' : '#FFF3E0');
                  let iconName: any = item.Status === 'Đã sử dụng' ? 'check-circle' : (item.Status === 'Bỏ lỡ' ? 'close-circle' : 'alarm-snooze');

                  return (
                    <View style={styles.historyCard}>
                      <View style={{flex: 1}}>
                        <Text style={styles.historyMedName}>{item.MedicineName}</Text>
                        <Text style={styles.historyTime}>Cữ quy định: {item.PlannedTime}</Text>
                        <Text style={styles.historyTimestamp}>Ghi nhận lúc: {item.Timestamp || 'Hôm nay'}</Text>
                      </View>
                      <View style={[styles.historyStatusBadge, {backgroundColor: bgColor}]}><MaterialCommunityIcons name={iconName} size={16} color={statusColor} style={{marginRight: 4}} /><Text style={[styles.historyStatusText, {color: statusColor}]}>{item.Status}</Text></View>
                    </View>
                  );
                }}
                ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="text-box-search-outline" size={60} color="#B0BEC5" /><Text style={styles.emptyText}>Chưa có lịch sử.</Text></View>}
              />
            )}
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <View style={styles.toastContainer}><MaterialCommunityIcons name="check-decagram" size={24} color="white" /><Text style={styles.toastText}>Ghi nhận thành công!</Text></View>
      )}

      {/* HEADER CHÍNH */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.headerProfile} activeOpacity={0.7} onPress={() => { setProfileModalVisible(true); fetchProfileData(); }}>
          
          {/* 🔥 THAY AVATAR MẶC ĐỊNH BẰNG LOGO PHÒNG KHÁM 🔥 */}
          <View style={styles.avatar}>
            <Image source={require('../assets/images/favicon.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
          </View>

          <View>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.patientName}>{patientName}</Text>
              <MaterialCommunityIcons name="information" size={16} color="rgba(255,255,255,0.7)" style={{marginLeft: 6}} />
            </View>
            <Text style={styles.patientId}>ID: {patientId}</Text>
          </View>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={22} color={streak > 0 ? "#FFCA28" : "#90A4AE"} />
            <Text style={[styles.streakText, streak === 0 && {color: '#90A4AE'}]}>{streak}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><MaterialCommunityIcons name="logout" size={20} color="white" /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {lowMeds.length > 0 && !loading && (
          <View style={styles.warningBanner}>
            <MaterialCommunityIcons name="alert" size={28} color={colors.timeColor} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.warningTitle}>Chú ý: Gần hết thuốc!</Text>
              <Text style={styles.warningText}>Bạn sắp hết: <Text style={{fontWeight: 'bold'}}>{lowMeds.map(m => m.MedicineName).join(', ')}</Text>. Vui lòng liên hệ Bác sĩ.</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.dateHeader}><MaterialCommunityIcons name="calendar-today" size={22} color={colors.textDark} /><Text style={styles.dateText}>Lịch Dùng Thuốc</Text></View>
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity onPress={() => { setHistoryModalVisible(true); fetchHistoryLogs(); }} style={[styles.refreshBtn, {backgroundColor: '#E8F5E9'}]}><MaterialCommunityIcons name="history" size={24} color="#4CAF50" /></TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}><MaterialCommunityIcons name="refresh" size={24} color={refreshing ? colors.textLight : colors.primary} /></TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.pullToRefreshHint}><MaterialCommunityIcons name="gesture-swipe-down" size={14} color={colors.textLight} /> Vuốt xuống hoặc bấm nút ↻ để tải mới</Text>

        {loading ? (
          <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={medications}
            keyExtractor={(item, index) => item.ID ? item.ID.toString() : index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <View style={styles.medCard}>
                <View style={styles.timeBlock}><MaterialCommunityIcons name="clock-outline" size={24} color={colors.timeColor} /><Text style={styles.timeText}>{item.Time}</Text></View>
                <View style={styles.infoBlock}>
                  <Text style={styles.medName}>{item.MedicineName}</Text>
                  <Text style={styles.medDetail}>Liều dùng: {item.Dose}</Text>
                  
                  {item.Quantity && (
                    <Text style={[styles.medDetail, {fontSize: 13, color: '#0F766E', fontWeight: 'bold', marginTop: 4}]}>
                      Còn lại: {calculateRemaining(item)}
                    </Text>
                  )}

                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openLogModal(item)}><MaterialCommunityIcons name="gesture-tap" size={24} color={colors.primary} /><Text style={styles.actionBtnText}>Xác nhận</Text></TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="emoticon-happy-outline" size={80} color="#B0BEC5" /><Text style={styles.emptyText}>Bác sĩ chưa gán lịch thuốc cho bạn.</Text></View>}
          />
        )}
      </View>

      <TouchableOpacity style={styles.sosFab} onPress={handleSOS} activeOpacity={0.8}><MaterialCommunityIcons name="phone-in-talk" size={28} color="#FFFFFF" /></TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, padding: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5 },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  welcomeText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  patientName: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  patientId: { fontSize: 12, color: 'white', opacity: 0.9 },
  
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  streakText: { color: '#FFF', fontWeight: '900', fontSize: 16, marginLeft: 4 },
  
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 15 },
  contentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  
  warningBanner: { flexDirection: 'row', backgroundColor: colors.warningBg, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.warningBorder, marginBottom: 15, alignItems: 'center', elevation: 2 },
  warningTitle: { fontSize: 15, fontWeight: 'bold', color: colors.timeColor, marginBottom: 2 },
  warningText: { fontSize: 13, color: colors.textDark, lineHeight: 18 },

  sosFab: { position: 'absolute', bottom: 30, right: 20, zIndex: 9999, elevation: 99, backgroundColor: colors.danger, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 2, borderColor: '#FFCDD2' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  dateHeader: { flexDirection: 'row', alignItems: 'center' },
  refreshBtn: { padding: 5, backgroundColor: '#E3F2FD', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pullToRefreshHint: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', marginBottom: 15, marginLeft: 5 },

  dateText: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginLeft: 8 },
  medCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3, alignItems: 'center' },
  timeBlock: { alignItems: 'center', justifyContent: 'center', paddingRight: 15, borderRightWidth: 1, borderRightColor: '#E0E0E0', minWidth: 70 },
  timeText: { fontSize: 18, fontWeight: 'bold', color: colors.timeColor },
  infoBlock: { flex: 1, paddingLeft: 15 },
  medName: { fontSize: 17, fontWeight: 'bold', color: colors.textDark },
  medDetail: { fontSize: 14, color: colors.textLight },
  actionBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 15, minWidth: 75 },
  actionBtnText: { color: colors.primary, fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginLeft: 10 },
  medInfoBox: { backgroundColor: '#F5F5F5', borderRadius: 15, padding: 20, alignItems: 'center', marginBottom: 25 },
  medNameModal: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 5 },
  medTimeModal: { fontSize: 16, color: colors.timeColor, fontWeight: 'bold' },
  medDoseModal: { fontSize: 14, color: colors.textLight },
  logActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  logBtn: { flex: 1, paddingVertical: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
  logBtnText: { color: 'white', fontWeight: 'bold', marginTop: 8 },
  modalBtnCancel: { marginTop: 25, padding: 15, alignItems: 'center' },
  
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  profileModalContent: { backgroundColor: 'white', width: '85%', borderRadius: 24, padding: 20, elevation: 10 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 15 },
  profileTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark, marginLeft: 10 },
  closeBtn: { padding: 5, backgroundColor: '#F5F5F5', borderRadius: 15 },
  profileDetails: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  profileLabel: { fontSize: 15, color: colors.textLight, fontWeight: '600' },
  profileValue: { fontSize: 15, color: colors.textDark, fontWeight: '800', textAlign: 'right', flex: 1, marginLeft: 20 },

  historyModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  historyModalContent: { backgroundColor: 'white', width: '90%', height: '80%', borderRadius: 25, padding: 20, elevation: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 15 },
  historyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FAFAFA', borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  historyMedName: { fontSize: 16, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  historyTime: { fontSize: 13, color: colors.textLight },
  historyTimestamp: { fontSize: 12, color: colors.primary, marginTop: 4, fontStyle: 'italic' },
  historyStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  historyStatusText: { fontSize: 12, fontWeight: 'bold' },

  toastContainer: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: colors.statusDone, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center', zIndex: 1000 },
  toastText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
  emptyContainer: { padding: 50, alignItems: 'center' },
  emptyText: { color: colors.textLight, textAlign: 'center', fontSize: 16, marginTop: 10 }
});