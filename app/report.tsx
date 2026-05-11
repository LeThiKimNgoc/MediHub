import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert, Platform, Image } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router'; 

// GỌI 3 COMPONENT CON VÀO
import { SyntheticTab } from '../components/Reports/SyntheticTab';
import { LogTab } from '../components/Reports/LogTab';
import { IndividualTab } from '../components/Reports/IndividualTab';

// 🔥 BẢNG MÀU CHUẨN QUỐC TẾ (SAAS DASHBOARD)
const colors = {
  bg: '#F8FAFC',          // Nền tổng thể xám cực nhạt
  surface: '#FFFFFF',     // Nền khối trắng tinh
  primary: '#7C3AED',     // Tím Violet hiện đại (Chuyên nghiệp hơn màu tím cũ)
  primaryLight: '#F5F3FF',// Tím nhạt cho nền active
  textDark: '#0F172A',    // Đen than cho Text chính
  textMuted: '#64748B',   // Xám nhạt cho text phụ
  border: '#E2E8F0',      // Màu viền mỏng, thanh lịch
  statusDone: '#10B981', 
  statusSnooze: '#F59E0B', 
  statusMissed: '#EF4444'
};

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState('Synthetic'); 
  const [logs, setLogs] = useState<any[]>([]);
  const [syntheticData, setSyntheticData] = useState<any>(null);
  const [individualData, setIndividualData] = useState<any[]>([]);
  const [remindData, setRemindData] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024; 
  const isMobile = width < 768;
  const [isZoomed, setIsZoomed] = useState(false); 
  const chartWidth = isDesktop ? (width - 320) / 2 : width - 80; // Trừ hao khoảng cách Sidebar

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => router.replace('/') } 
      ]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    const gidLog = '1373475002'; 
    const gidSynthetic = '297712298'; 
    const gidIndividual = '1749901529'; 
    const gidRemind = '2073748495'; 
    
    const t = new Date().getTime();
    try {
      const [resLog, resSynthetic, resIndividual, resRemind] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}&t=${t}`, { cache: 'no-store' }),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidSynthetic}&t=${t}`, { cache: 'no-store' }),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidIndividual}&t=${t}`, { cache: 'no-store' }),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}&t=${t}`, { cache: 'no-store' }) 
      ]);

      const [csvLog, csvSynthetic, csvIndividual, csvRemind] = await Promise.all([
        resLog.ok ? resLog.text() : Promise.resolve(""),
        resSynthetic.ok ? resSynthetic.text() : Promise.resolve(""),
        resIndividual.ok ? resIndividual.text() : Promise.resolve(""),
        resRemind.ok ? resRemind.text() : Promise.resolve("")
      ]);

      if (csvLog) Papa.parse(csvLog, { header: true, skipEmptyLines: true, complete: (res) => setLogs(res.data.filter((item: any) => Object.values(item).some(v => v !== "")).reverse()) });
      if (csvSynthetic) Papa.parse(csvSynthetic, { header: true, skipEmptyLines: true, complete: (res) => setSyntheticData(res.data.filter((row: any) => Object.values(row).some(v => v !== ""))[0] || null) });
      if (csvIndividual) Papa.parse(csvIndividual, { header: true, skipEmptyLines: true, complete: (res) => setIndividualData(res.data.filter((row: any) => Object.values(row).some(v => v !== ""))) });
      if (csvRemind) Papa.parse(csvRemind, { header: true, skipEmptyLines: true, complete: (res) => setRemindData(res.data.filter((row: any) => Object.values(row).some(v => v !== ""))) });

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", error);
      setFetchError(true);
    } finally {
      setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  if (loading) return (
    <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Hệ thống đang tổng hợp dữ liệu...</Text>
    </View>
  );

  if (fetchError) return (
    <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.bg }]}>
      <MaterialCommunityIcons name="wifi-off" size={60} color={colors.statusMissed} />
      <Text style={[styles.loadingText, { color: colors.statusMissed, textAlign: 'center' }]}>Mất kết nối máy chủ dữ liệu.</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
        <Text style={styles.retryBtnText}>Tải lại trang</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 🔥 HEADER CHUẨN SAAS (FLAT DESIGN) */}
        <View style={styles.saasHeader}>
          <View style={styles.headerLeft}>
            {isMobile && (
              <View style={styles.logoCircleMobile}>
                <Image source={require('../assets/images/favicon.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
              </View>
            )}
            <View>
              <Text style={styles.pageTitle}>Báo Cáo Thống Kê</Text>
              <Text style={styles.pageSubtitle}>Phân tích dữ liệu tuân thủ điều trị</Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); fetchData(); }}>
              <MaterialCommunityIcons name="refresh" size={20} color={colors.textDark} />
              {!isMobile && <Text style={styles.refreshBtnText}>Đồng bộ</Text>}
            </TouchableOpacity>
            {!isDesktop && (
              <TouchableOpacity style={[styles.refreshBtn, {backgroundColor: colors.dangerLight, borderColor: '#FECACA'}]} onPress={handleLogout}>
                <MaterialCommunityIcons name="power" size={20} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.contentContainer}>
          
          {/* 🔥 TABS ĐIỀU HƯỚNG DẠNG SEGMENTED CONTROL (APPLE STYLE) */}
          <View style={styles.toolbarContainer}>
            <View style={styles.segmentedControl}>
              {['Synthetic', 'Log', 'Individual'].map((tab) => {
                const isActive = activeTab === tab;
                const tabNames: any = { Synthetic: 'Tổng quan', Log: 'Nhật ký hệ thống', Individual: 'Phân tích cá nhân' };
                const tabIcons: any = { Synthetic: 'chart-pie', Log: 'format-list-bulleted-type', Individual: 'account-details' };
                
                return (
                  <TouchableOpacity 
                    key={tab} 
                    style={[styles.segmentBtn, isActive && styles.segmentBtnActive]} 
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons 
                      name={tabIcons[tab]} 
                      size={18} 
                      color={isActive ? colors.primary : colors.textMuted} 
                      style={{marginRight: 6}}
                    />
                    <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                      {tabNames[tab]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 🔥 KHU VỰC NỘI DUNG ÉP FULL MÀN HÌNH */}
          <View style={styles.mainArea}>
            {activeTab === 'Synthetic' && <SyntheticTab syntheticData={syntheticData} individualData={individualData} isDesktop={isDesktop} chartWidth={chartWidth} />}
            {activeTab === 'Log' && <LogTab logs={logs} isMobile={isMobile} isZoomed={isZoomed} setIsZoomed={setIsZoomed} />}
            {activeTab === 'Individual' && <IndividualTab logsData={logs} remindData={remindData} isMobile={isMobile} isZoomed={isZoomed} setIsZoomed={setIsZoomed} />}
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, width: '100%', flexDirection: 'column' },
  
  loadingText: { marginTop: 15, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  retryBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 8, elevation: 2 },
  retryBtnText: { color: colors.surface, fontWeight: '700', fontSize: 15 },

  // 🔥 SAAS HEADER
  saasHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: colors.surface, paddingVertical: 20, paddingHorizontal: 24, 
    borderBottomWidth: 1, borderBottomColor: colors.border 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircleMobile: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.textDark, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  refreshBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  refreshBtnText: { color: colors.textDark, fontWeight: '600', fontSize: 14, marginLeft: 6 },

  // Lõi nội dung
  contentContainer: { flex: 1, padding: 24, width: '100%', maxWidth: 1600, alignSelf: 'center', flexDirection: 'column' },

  // 🔥 SEGMENTED CONTROL TABS
  toolbarContainer: { marginBottom: 20, alignItems: 'flex-start' },
  segmentedControl: { 
    flexDirection: 'row', 
    backgroundColor: '#F1F5F9', // Nền xám bao quanh
    borderRadius: 12, 
    padding: 4, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  segmentBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 8 
  },
  segmentBtnActive: { 
    backgroundColor: colors.surface, // Pill màu trắng nổi lên
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
    elevation: 2 
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.primary, fontWeight: '800' },

  // Khu vực Render Component con
  mainArea: { flex: 1, width: '100%', overflow: 'hidden' }, 
});