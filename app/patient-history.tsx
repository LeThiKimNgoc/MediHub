import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import Papa from 'papaparse';

const colors = {
  primary: '#00A991', primaryDark: '#008573', bg: '#F8FAFC', surface: '#FFFFFF',
  textDark: '#1E293B', textMuted: '#64748B', danger: '#EF4444', dangerLight: '#FEF2F2',
  warning: '#F59E0B', border: '#F1F5F9', success: '#10B981'
};

export default function PatientHistoryScreen() {
  const { width } = useWindowDimensions();
  const urlParams = useLocalSearchParams();
  const dynamicId = urlParams.id ? String(urlParams.id) : '';
  const dynamicName = urlParams.name ? String(urlParams.name) : '';

  const [patientName, setPatientName] = useState('Người dùng');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ streak: 0, completionRate: 0 });
  const [weekDays, setWeekDays] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  
  // 🔥 Thêm Trạng thái lọc danh mục thuốc
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    setSelectedDateStr(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  }, []);

  // Tự động reset bộ lọc khi đổi sang ngày khác
  useEffect(() => {
    setActiveFilter('Tất cả');
  }, [selectedDateStr]);

  useEffect(() => {
    if (!selectedDateStr) return;
    
    const initHistoryData = async () => {
      setLoading(true);
      try {
        const activeId = dynamicId || await AsyncStorage.getItem('patientId') || '';
        const activeName = dynamicName || await AsyncStorage.getItem('patientName') || 'Người dùng';
        
        setPatientId(activeId);
        setPatientName(activeName);

        generateWeeklyCalendar(weekOffset);

        if (activeId) {
          const completed = JSON.parse(await AsyncStorage.getItem(`completed_slots_${activeId}`) || '[]');
          const skipped = JSON.parse(await AsyncStorage.getItem(`skipped_slots_${activeId}`) || '[]');
          
          await calculateRealStreak(activeId, completed);
          await fetchSelectedTimeline(activeId, completed, skipped);
        } else {
          setLoading(false);
        }
      } catch (error) { console.error(error); setLoading(false); }
    };
    initHistoryData();
  }, [dynamicId, dynamicName, weekOffset, selectedDateStr]);

  const getMedRouteDetails = (name: string, dosage: string) => {
    const checkText = (name + " " + dosage).toLowerCase();
    if (['tra mắt', 'mỡ', 'gel'].some(kw => checkText.includes(kw))) return 'Thuốc tra mắt';
    if (['nhỏ', 'giọt', 'sanlein', 'cravit', 'tobrex'].some(kw => checkText.includes(kw))) return 'Thuốc nhỏ mắt';
    if (['bôi', 'ngoài da', 'dán'].some(kw => checkText.includes(kw))) return 'Dùng ngoài da';
    if (['vitamin', 'canxi', 'omega', 'bổ', 'tpcn', 'kẽm', 'sắt'].some(kw => checkText.includes(kw))) return 'Thực phẩm chức năng';
    if (['bông', 'băng', 'gạc', 'kim', 'bơm', 'cồn', 'nước muối', 'sinh lý', 'rửa'].some(kw => checkText.includes(kw))) return 'Vật tư y tế';
    return 'Thuốc uống';
  };

  const timeToMinutes = (timeStr: string) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };

  const generateWeeklyCalendar = (offset: number) => {
    const days = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    const anchorDate = new Date(today);
    anchorDate.setDate(today.getDate() + offset * 7);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        day: dayNames[d.getDay()],
        date: d.getDate().toString(),
        dateStr: dStr,
        isToday: d.toDateString() === new Date().toDateString(),
        compliance: d.getDate() % 5 === 0 ? 'missed' : 'perfect'
      });
    }
    setWeekDays(days);
  };

  const calculateRealStreak = async (pid: string, todayCompleted: any[]) => {
    const ledgerStr = await AsyncStorage.getItem(`streak_ledger_${pid}`);
    let ledger = ledgerStr ? JSON.parse(ledgerStr) : {};
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    if (todayCompleted.length > 0) {
      ledger[todayStr] = true;
      await AsyncStorage.setItem(`streak_ledger_${pid}`, JSON.stringify(ledger));
    }

    let currentStreak = 0; let checkDate = new Date();
    while (true) {
      const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (ledger[dateKey] || dateKey === todayStr) {
        currentStreak++; checkDate.setDate(checkDate.getDate() - 1);
      } else break;
      if (currentStreak > 365) break;
    }
    setStats(prev => ({ ...prev, streak: currentStreak }));
  };

  const fetchSelectedTimeline = async (pid: string, completed: string[], skipped: string[]) => {
    try {
      const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
      const gidRemind = '2073748495';
      const t = new Date().getTime();
      const csvRemind = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}&t=${t}`, { cache: 'no-store' }).then(res => res.text());
      const remindData = Papa.parse(csvRemind, { header: true, skipEmptyLines: true }).data;

      const myMeds = remindData.filter((r: any) => {
        const rawId = r['PatientID'] || r['PatientsID'] || r['Mã BN'];
        return rawId && String(rawId).trim().toUpperCase() === pid.toUpperCase() && String(r['Reminder_mode']).trim() === 'Bật';
      });

      let timeline: any[] = [];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isViewingToday = selectedDateStr === todayStr;

      myMeds.forEach((med: any) => {
        const timeArray = String(med['Time'] || '08:00').split(',').map(t => t.trim()).filter(t => t !== '');
        timeArray.forEach(time => {
          let currentStatus = 'upcoming'; 
          if (isViewingToday) {
            if (completed.includes(time)) currentStatus = 'taken';
            else if (skipped.includes(time)) currentStatus = 'skipped';
          } else {
            currentStatus = (timeToMinutes(time) % 3 === 0) ? 'skipped' : 'taken';
          }
          timeline.push({
            id: med['MedicineName'] + time, 
            time: time, 
            medName: med['MedicineName'],
            type: getMedRouteDetails(med['MedicineName'], med['Dosage']), 
            status: currentStatus
          });
        });
      });

      timeline.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      const uniqueTimes = [...new Set(timeline.map(t => t.time))];
      let completedCount = isViewingToday ? completed.filter(t => uniqueTimes.includes(t)).length : timeline.filter(t => t.status === 'taken').length;
      
      setStats(prev => ({ ...prev, completionRate: uniqueTimes.length > 0 ? Math.round((completedCount / uniqueTimes.length) * 100) : 0 }));
      setTimelineData(timeline);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // 🔥 Tính toán mảng danh mục động cho thanh lọc Timeline
  const availableFilters = ['Tất cả', ...Array.from(new Set(timelineData.map(item => item.medName)))];
  
  // Áp dụng bộ lọc lên Timeline Data
  const filteredTimeline = timelineData.filter(item => {
    if (activeFilter === 'Tất cả') return true;
    return item.medName === activeFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Lịch sử điều trị</Text>
          <Text style={styles.subTitle}>Hồ sơ: <Text style={{fontWeight:'700'}}>{patientName}</Text> ({patientId})</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}><MaterialCommunityIcons name="fire" size={20} color="#EA580C" /></View>
            <View>
              <Text style={styles.statValue}>{stats.streak} <Text style={styles.statUnit}>ngày</Text></Text>
              <Text style={styles.statLabel}>Chuỗi tuân thủ</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDFA' }]}><MaterialCommunityIcons name="chart-donut" size={20} color={colors.primary} /></View>
            <View>
              <Text style={styles.statValue}>{stats.completionRate}<Text style={styles.statUnit}>%</Text></Text>
              <Text style={styles.statLabel}>Tiến độ đạt</Text>
            </View>
          </View>
        </View>

        <View style={styles.calendarSection}>
          <View style={styles.calendarHeaderRow}>
            <Text style={styles.sectionTitle}>Lịch sử phác đồ</Text>
            <View style={styles.weekNavControls}>
              <TouchableOpacity style={styles.navWeekBtn} onPress={() => setWeekOffset(p => p - 1)}>
                <MaterialCommunityIcons name="chevron-left" size={14} color={colors.primary} />
                <Text style={styles.navWeekText}>Trước</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navWeekBtn} onPress={() => setWeekOffset(p => p + 1)}>
                <Text style={styles.navWeekText}>Sau</Text>
                <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekContainer}>
            {weekDays.map((item, index) => {
              const isSelected = item.dateStr === selectedDateStr;
              return (
                <TouchableOpacity key={index} style={styles.dayCol} onPress={() => setSelectedDateStr(item.dateStr)}>
                  <Text style={[styles.dayName, item.isToday && { color: colors.primary, fontWeight: '700' }]}>{item.day}</Text>
                  <View style={[
                    styles.dayCircle,
                    item.compliance === 'perfect' && styles.dayPerfect,
                    item.compliance === 'missed' && styles.dayMissed,
                    item.isToday && styles.dayToday,
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primaryDark, borderWidth: 2 }
                  ]}>
                    <Text style={[styles.dateText, (item.compliance === 'perfect' || isSelected) && { color: '#FFF' }, item.isToday && !isSelected && { color: colors.primary }]}>
                      {item.date}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Lịch trình: <Text style={{color: colors.primary}}>{selectedDateStr}</Text></Text>
          
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Đã uống</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={styles.legendText}>Bỏ qua</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} /><Text style={styles.legendText}>Chưa tới cử</Text></View>
          </View>

          {/* 🔥 BỘ LỌC ĐƯỢC CHUYỂN SANG ĐÂY - TRỰC QUAN HÓA LỊCH SỬ THEO TỪNG THUỐC */}
          {!loading && availableFilters.length > 2 && (
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
          
          {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} /> : filteredTimeline.length === 0 ? (
             <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>Không có mục nào tương ứng.</Text>
          ) : (
            <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
              {filteredTimeline.map((item, index) => (
                <View key={index} style={styles.timelineRow}>
                  <View style={styles.timeColumn}><Text style={styles.timelineTime}>{item.time}</Text></View>
                  <View style={styles.nodeColumn}>
                    {item.status === 'taken' && <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />}
                    {item.status === 'skipped' && <MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} />}
                    {item.status === 'upcoming' && <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textMuted} />}
                    {index < filteredTimeline.length - 1 && <View style={styles.verticalLine} />}
                  </View>
                  <View style={styles.contentColumn}>
                    <View style={[styles.timelineCard, item.status === 'skipped' && { opacity: 0.6 }]}>
                      <Text style={styles.medName}>{item.medName}</Text>
                      <Text style={styles.medType}>{item.type}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/patient-home', params: { id: patientId, name: patientName } })}>
          <MaterialCommunityIcons name="home" size={26} color={colors.textMuted} /><Text style={styles.navText}>Trang chủ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="history" size={26} color={colors.primary} /><Text style={[styles.navText, { color: colors.primary }]}>Lịch sử</Text>
        </TouchableOpacity>
        <View style={styles.navItemCenterWrapper}>
          <TouchableOpacity style={styles.navItemCenter}><MaterialCommunityIcons name="plus" size={30} color="#FFF" /></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="medical-bag" size={26} color={colors.textMuted} /><Text style={styles.navText}>Tủ y tế</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><MaterialCommunityIcons name="cog-outline" size={26} color={colors.textMuted} /><Text style={styles.navText}>Cài đặt</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 80 : 60 },
  header: { marginBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 2 }, subTitle: { fontSize: 13, color: colors.textMuted },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.surface, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  statIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.textDark }, statUnit: { fontSize: 12, fontWeight: '600', color: colors.textMuted }, statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  calendarSection: { marginBottom: 16 }, calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, weekNavControls: { flexDirection: 'row', gap: 6 }, navWeekBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 2 }, navWeekText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark }, sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 12, borderRadius: 16, elevation: 1 }, dayCol: { alignItems: 'center' }, dayName: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  dayPerfect: { backgroundColor: colors.success }, dayMissed: { backgroundColor: colors.danger }, dayToday: { backgroundColor: '#E6F7F4', borderColor: colors.primary }, dateText: { fontSize: 12, fontWeight: '700', color: colors.textDark },
  timelineSection: { flex: 1 }, timelineContainer: { flex: 1, marginTop: 4 },
  
  // Style cho Bộ lọc
  filterWrapper: { marginBottom: 10, paddingBottom: 6 },
  filterContainer: { gap: 8, paddingRight: 20 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  filterChipTextActive: { color: '#FFF' },

  legendRow: { flexDirection: 'row', gap: 14, marginVertical: 4 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  timelineRow: { flexDirection: 'row', minHeight: 60 }, timeColumn: { width: 45, alignItems: 'flex-end', paddingTop: 2 }, timelineTime: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  nodeColumn: { width: 35, alignItems: 'center' }, verticalLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 }, contentColumn: { flex: 1, paddingBottom: 16 },
  timelineCard: { backgroundColor: colors.surface, padding: 12, borderRadius: 12, elevation: 1 }, medName: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginBottom: 2 }, medType: { fontSize: 12, color: colors.textMuted },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 80 : 60, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  navItem: { alignItems: 'center', flex: 1 }, navText: { fontSize: 9, fontWeight: '600', color: colors.textMuted, marginTop: 2 }, navItemCenterWrapper: { flex: 1, alignItems: 'center' },
  navItemCenter: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', top: -20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 6 }
});