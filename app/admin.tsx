import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, useWindowDimensions, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Papa from 'papaparse';

import StatCard from '../components/Dashboard/StatCard';
import ModuleCard from '../components/Dashboard/ModuleCard';
import AdherenceCard from '../components/Dashboard/AdherenceCard';
import RightWidgets from '../components/Dashboard/RightWidgets';
import ChartSection from '../components/Dashboard/ChartSection';

export default function AdminScreen() {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({ totalPatients: 0, adherenceRate: '0%', totalReminders: 0 });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');
  
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    barData: [] as number[],
    lineData: [] as number[],
    patientsToday: 0
  });

  const [widgetData, setWidgetData] = useState({
    lastUpdate: '--:--',
    warningCount: 0,
    incidentsCount: 0,
    appointmentsCount: 0
  });

  const { width } = useWindowDimensions();
  const isMobile = width < 1200; 

  useEffect(() => {
    setIsMounted(true); 
    const date = new Date();
    const options: any = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
    setCurrentDate(date.toLocaleDateString('vi-VN', options));
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
      // GID CỦA CÁC BẢNG DỮ LIỆU
      const gidSynthetic = '297712298'; 
      const gidPatients = '0'; 
      const gidLog = '213693354'; 
      
      // 💥 3 MÃ GID MỚI BẠN VỪA CUNG CẤP
      const gidIndividual = '1749901529';
      const gidTrieuChung = '342522335';
      const gidRemind = '2073748495';

      const t = new Date().getTime();
      
      // Kéo TẤT CẢ 6 bảng dữ liệu cùng 1 lúc
      const [csvSynthetic, csvPatients, csvLog, csvIndividual, csvTrieuChung, csvRemind] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidSynthetic}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidPatients}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidIndividual}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidTrieuChung}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}&t=${t}`, { cache: 'no-store' }).then(res => res.text())
      ]);

      const patientsData = Papa.parse(csvPatients, { header: true, skipEmptyLines: true }).data;
      const synthDataArray = Papa.parse(csvSynthetic, { header: true, skipEmptyLines: true }).data;
      const logData = Papa.parse(csvLog, { header: true, skipEmptyLines: true }).data;
      
      // Data cho 3 cột bên phải
      const individualData = Papa.parse(csvIndividual, { header: true, skipEmptyLines: true }).data;
      const trieuChungData = Papa.parse(csvTrieuChung, { header: true, skipEmptyLines: true }).data;
      const remindData = Papa.parse(csvRemind, { header: true, skipEmptyLines: true }).data;

      // ==========================================
      // PHẦN 1: TÍNH TOÁN BIỂU ĐỒ (Giữ nguyên)
      // ==========================================
      const today = new Date();
      today.setHours(0,0,0,0);
      const last7DatesObjects: number[] = [];
      const labels: string[] = [];
      const dateStringsForLog: string[] = [];

      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          last7DatesObjects.push(d.getTime());
          labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
          dateStringsForLog.push(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`); 
      }

      const newPatientsByDay = [0, 0, 0, 0, 0, 0, 0];
      patientsData.forEach((p: any) => {
          if (p.DayStart) {
              const parts = p.DayStart.split('/');
              if (parts.length === 3) {
                  const pDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                  pDate.setHours(0,0,0,0);
                  const index = last7DatesObjects.indexOf(pDate.getTime());
                  if (index !== -1) newPatientsByDay[index]++; 
              }
          }
      });

      const realLineData = [0, 0, 0, 0, 0, 0, 0];
      logData.forEach((row: any) => {
          const rowDate = row['Date']; 
          const rowAdherence = row['Adherence']; 
          if(rowDate && rowAdherence) {
               const parts = rowDate.split('/');
               if(parts.length === 3) {
                   const cleanDate = `${parseInt(parts[0])}/${parseInt(parts[1])}/${parts[2]}`;
                   const index = dateStringsForLog.indexOf(cleanDate);
                   if (index !== -1) {
                       realLineData[index] = parseInt(String(rowAdherence).replace('%', ''), 10) || 0;
                   }
               }
          }
      });

      let synthData = synthDataArray.length > 0 ? synthDataArray[0] : {}; 
      const realAdherenceStr = synthData.Average_Adherence || '0%';
      const realReminders = parseInt(synthData.Total_Reminders, 10) || 0;

      if (realLineData[6] === 0) {
          realLineData[6] = parseInt(realAdherenceStr.replace('%', ''), 10) || 0;
      }

      setStats({ 
        totalPatients: patientsData.length, 
        adherenceRate: realAdherenceStr, 
        totalReminders: realReminders 
      });

      setChartData({
        labels: labels,
        barData: newPatientsByDay,
        lineData: realLineData, 
        patientsToday: newPatientsByDay[6] 
      });


      // ==========================================
      // PHẦN 2: TÍNH TOÁN CỘT PHẢI (DỮ LIỆU THẬT)
      // ==========================================
      
      // 1. Đếm BN Cần theo dõi (Tỷ lệ < 90%)
      let warnCount = 0;
      individualData.forEach((row: any) => {
          const adStr = row['Average_Adherence'] || '0%';
          const adNum = parseInt(adStr.replace('%', ''), 10) || 0;
          if (adNum < 90) warnCount++; 
      });

      // 2. Đếm Sự cố (Số dòng trong sheet TrieuChung)
      let incCount = trieuChungData.length;

      // 3. Đếm Lịch hẹn hôm nay (Số BN duy nhất có lịch trong Remind)
      const uniquePatients = new Set();
      remindData.forEach((r: any) => {
          if (r['PatientsID']) uniquePatients.add(r['PatientsID']);
      });
      let apptCount = uniquePatients.size;

      const now = new Date();
      const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      setWidgetData({
        lastUpdate: timeString,
        warningCount: warnCount, 
        incidentsCount: incCount, 
        appointmentsCount: apptCount 
      });

      setLoading(false);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu từ Google Sheets.");
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { if (isMounted) fetchStats(); }, [isMounted]));

  const handleLogout = () => {
    if (Platform.OS === 'web') {
        if (window.confirm('Xác nhận kết thúc phiên làm việc?')) router.replace('/');
    } else {
        Alert.alert('Đăng xuất', 'Xác nhận thoát hệ thống?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Thoát', style: 'destructive', onPress: () => router.replace('/') }]);
    }
  };

  if (!isMounted) return <View style={{ flex: 1, backgroundColor: '#F9FAFB' }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainWrapper}>
        
        {/* TOP BAR */}
        <View style={[styles.topBar, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
          <View style={styles.topBarLeft}>
            <Text style={styles.greetingTextLarge}>Xin chào, <Text style={{ color: '#0F172A' }}>Administrator</Text> 👋</Text>
            <Text style={styles.subGreetingText}>Chúc bạn một ngày làm việc hiệu quả!</Text>
          </View>
          <View style={styles.topBarRight}>
            {!isMobile && (
              <View style={styles.dateWidget}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={16} color="#0F766E" />
                <View style={{ marginLeft: 6 }}>
                  <Text style={styles.dateText}>{currentDate}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialCommunityIcons name="bell-outline" size={18} color="#64748B" />
              {/* Nút Chuông nay sẽ đếm thật số Cảnh báo + Số Sự cố */}
              {(widgetData.warningCount + widgetData.incidentsCount) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{widgetData.warningCount + widgetData.incidentsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
              <View style={styles.avatar}><Text style={styles.avatarText}>AD</Text></View>
              {!isMobile && <Text style={styles.profileName}>Administrator</Text>}
              <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PHẦN THÂN */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyContent}>
          <View style={styles.maxWidthContainer}>
            <View style={[styles.dashboardSplit, isMobile && { flexDirection: 'column' }]}>
              
              <View style={styles.leftContent}>
                
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tổng quan vận hành</Text>
                  <TouchableOpacity onPress={fetchStats} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="sync" size={14} color="#0F766E" style={{marginRight: 4}} />
                    <Text style={[styles.actionText, {color: '#0F766E'}]}>Cập nhật</Text>
                  </TouchableOpacity>
                </View>

                {loading ? <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0F766E" /></View> : (
                  <View style={[styles.gridRow, { flex: 1 }, isMobile && { flexDirection: 'column' }]}>
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : '38%' }}>
                      <AdherenceCard value={stats.adherenceRate} trend="down" trendValue="2%" />
                    </View>
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : '26%' }}>
                      <StatCard label="Tổng Bệnh nhân" value={stats.totalPatients} color="#2563EB" iconName="account-group" trendHighlight={`↑ ${chartData.patientsToday} bệnh nhân`} trendText="mới hôm nay" data={chartData.barData} chartColor="#3B82F6" />
                    </View>
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : '26%' }}>
                      <StatCard label="Lượt nhắc" value={stats.totalReminders} color="#059669" iconName="bell-ring" trendHighlight="↑ 8 lượt" trendText="so với hôm qua" data={[20, 28, 25, 32, 28, 38, 42]} chartColor="#10B981" />
                    </View>
                  </View>
                )}

                <View style={{ flex: 1.5, marginTop: 16 }}>
                  <ChartSection labels={chartData.labels} barData={chartData.barData} lineData={chartData.lineData} />
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Không gian làm việc</Text>
                </View>

                <View style={[styles.gridRow, { flex: 1 }, isMobile && { flexDirection: 'column' }]}>
                  <View style={{ flex: 1 }}><ModuleCard title="Hồ sơ Bệnh Nhân" description="Theo dõi bệnh án và điều trị." mainColor="#0F766E" iconMain="folder-account" route="/patient" /></View>
                  <View style={{ flex: 1 }}><ModuleCard title="Danh Mục D&C" description="Quản lý hệ thống dược phẩm." mainColor="#8B5CF6" iconMain="format-list-bulleted" route="/home" /></View>
                  <View style={{ flex: 1 }}><ModuleCard title="Báo Cáo Thống Kê" description="Phân tích hiệu quả hệ thống." mainColor="#F97316" iconMain="chart-box" route="/report" /></View>
                </View>

              </View>

              {/* CỘT PHẢI */}
              <View style={styles.rightContent}>
                <RightWidgets 
                  lastUpdate={widgetData.lastUpdate} 
                  warningCount={widgetData.warningCount} 
                  incidentsCount={widgetData.incidentsCount} 
                  appointmentsCount={widgetData.appointmentsCount} 
                />
              </View>

            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' }, mainWrapper: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  topBarLeft: { flex: 1 }, greetingTextLarge: { fontSize: 18, fontWeight: '700', color: '#64748B', letterSpacing: -0.5 }, subGreetingText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateWidget: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }, dateText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  iconBtn: { width: 34, height: 34, backgroundColor: '#FFFFFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' }, badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 4, paddingRight: 8, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' }, profileName: { fontSize: 12, fontWeight: '600', color: '#334155', marginLeft: 8, marginRight: 2 },
  
  body: { flex: 1 }, bodyContent: { paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1 }, maxWidthContainer: { maxWidth: 1600, width: '100%', alignSelf: 'center', flex: 1 },
  dashboardSplit: { flexDirection: 'row', gap: 20, flex: 1 }, 
  leftContent: { flex: 3, display: 'flex', flexDirection: 'column' }, rightContent: { flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }, actionText: { fontSize: 11, fontWeight: '700' },
  gridRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});