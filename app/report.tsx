import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert, Platform, Image } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router'; 

// GỌI 3 COMPONENT VỪA TÁCH VÀO ĐÂY
import { SyntheticTab } from '../components/Reports/SyntheticTab';
import { LogTab } from '../components/Reports/LogTab';
import { IndividualTab } from '../components/Reports/IndividualTab';

const colors = {
  bg: '#F8FAFC', headerBgPastel: '#A855F7', white: '#FFFFFF', carbonDark: '#1E293B',     
  textLight: '#78909C', statusDone: '#10B981', statusSnooze: '#F59E0B', statusMissed: '#EF4444'
};

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState('Synthetic'); 
  const [logs, setLogs] = useState<any[]>([]);
  const [syntheticData, setSyntheticData] = useState<any>(null);
  const [individualData, setIndividualData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 900; 
  const isMobile = width < 768;
  const [isZoomed, setIsZoomed] = useState(false); 
  const chartWidth = isDesktop ? (width - 120) / 2 : width - 80;

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?', [
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
    
    const t = new Date().getTime();
    try {
      // Ép hệ thống tải dữ liệu mới nhất, bỏ qua bộ nhớ đệm
      const [resLog, resSynthetic, resIndividual] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}&t=${t}`, { cache: 'no-store' }),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidSynthetic}&t=${t}`, { cache: 'no-store' }),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidIndividual}&t=${t}`, { cache: 'no-store' })
      ]);

      const [csvLog, csvSynthetic, csvIndividual] = await Promise.all([
        resLog.ok ? resLog.text() : Promise.resolve(""),
        resSynthetic.ok ? resSynthetic.text() : Promise.resolve(""),
        resIndividual.ok ? resIndividual.text() : Promise.resolve("")
      ]);

      if (csvLog) {
          Papa.parse(csvLog, { 
              header: true, skipEmptyLines: true, 
              complete: (res) => {
                  // Lọc mềm mỏng: Miễn dòng có dữ liệu là lấy
                  const validLogs = res.data.filter((item: any) => Object.values(item).some(v => v !== ""));
                  setLogs(validLogs.reverse());
              }
          });
      }
      
      if (csvSynthetic) {
          Papa.parse(csvSynthetic, { 
              header: true, skipEmptyLines: true, 
              complete: (res) => {
                  // 🔥 ĐÃ SỬA: Bỏ điều kiện tên cột khắt khe, chỉ cần dòng đó không rỗng hoàn toàn 🔥
                  const validRows = res.data.filter((row: any) => Object.values(row).some(v => v !== ""));
                  if (validRows.length > 0) {
                      setSyntheticData(validRows[0]);
                  } else {
                      setSyntheticData(null);
                  }
              } 
          });
      }
      
      if (csvIndividual) {
        Papa.parse(csvIndividual, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
            // 🔥 ĐÃ SỬA: Chỉ loại bỏ các dòng rỗng hoàn toàn 🔥
            const validIndData = res.data.filter((row: any) => Object.values(row).some(v => v !== ""));
            const sortedData = validIndData.sort((a: any, b: any) => {
              const rateA = parseFloat((a.Average_Adherence || '0').toString().replace('%', ''));
              const rateB = parseFloat((b.Average_Adherence || '0').toString().replace('%', ''));
              return rateA - rateB;
            });
            setIndividualData(sortedData);
          }
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", error);
      setFetchError(true);
    } finally {
      setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  if (loading) return (
    <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.headerBgPastel} />
      <Text style={styles.loadingText}>Đang tải dữ liệu báo cáo...</Text>
    </View>
  );

  if (fetchError) return (
    <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
      <MaterialCommunityIcons name="wifi-off" size={60} color={colors.statusMissed} />
      <Text style={[styles.loadingText, { color: colors.statusMissed, textAlign: 'center' }]}>Không thể tải dữ liệu. Vui lòng kiểm tra lại kết nối mạng.</Text>
      <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: colors.headerBgPastel, borderRadius: 8 }} onPress={fetchData}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {isMobile ? (
          <View style={[styles.header, styles.headerMobile]}>
             <View style={styles.headerTopRowMobile}>
               <View style={styles.brandBoxMobile}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircleMobile}><Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" /></View>
                    <Text style={styles.brandMediMobile}>Medi<Text style={styles.brandHubMobile}>Hub</Text></Text>
                  </View>
               </View>
               <View style={{flexDirection: 'row'}}>
                 <TouchableOpacity style={styles.headerIconBtnMobile} onPress={() => router.push('/admin')}><MaterialCommunityIcons name="home-outline" size={22} color={colors.white} /></TouchableOpacity>
                 <TouchableOpacity style={[styles.headerIconBtnMobile, {marginLeft: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)'}]} onPress={handleLogout}><MaterialCommunityIcons name="power" size={22} color="#FECACA" /></TouchableOpacity>
               </View>
             </View>
             <View style={styles.headerBottomRowMobile}><Text style={styles.pageTitleMobile}>BÁO CÁO THỐNG KÊ</Text></View>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.brandBox}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircle}><Image source={require('../assets/images/favicon.png')} style={{ width: 26, height: 26 }} resizeMode="contain" /></View>
                    <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                  </View>
                </View>
                <Text style={styles.brandSlogan}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
              </View>

              <View style={styles.headerCenter}>
                <Text style={styles.pageTitle}>BÁO CÁO THỐNG KÊ</Text>
                <View style={styles.titleUnderline} />
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/admin')}>
                  <MaterialCommunityIcons name="home-outline" size={20} color={colors.white} />
                  <Text style={styles.navText}>Trang chủ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                  <MaterialCommunityIcons name="power" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.tabContainer}>
          {['Synthetic', 'Log', 'Individual'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'Log' ? 'Nhật ký' : (tab === 'Synthetic' ? 'Tổng quan' : 'Cá nhân')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mainArea}>
          {activeTab === 'Synthetic' && <SyntheticTab syntheticData={syntheticData} individualData={individualData} isDesktop={isDesktop} chartWidth={chartWidth} />}
          {activeTab === 'Log' && <LogTab logs={logs} isMobile={isMobile} isZoomed={isZoomed} setIsZoomed={setIsZoomed} />}
          {activeTab === 'Individual' && <IndividualTab individualData={individualData} isMobile={isMobile} isZoomed={isZoomed} setIsZoomed={setIsZoomed} />}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, width: '100%' },
  loadingText: { marginTop: 15, fontSize: 16, color: colors.textLight, fontWeight: '600' },
  
  header: { backgroundColor: colors.headerBgPastel, paddingVertical: 18, paddingHorizontal: '2%', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: colors.headerBgPastel, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  brandBox: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', flexDirection: 'row', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  brandMedi: { fontSize: 30, fontWeight: '600', color: '#FFFFFF', marginLeft: 12, letterSpacing: 1, fontStyle: 'italic', textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
  brandHub: { fontWeight: '900', color: '#FFFFFF' },
  brandSlogan: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginLeft: 12, marginTop: 6, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowRadius: 2 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  titleUnderline: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginTop: 4 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
  navText: { marginLeft: 6, fontWeight: '700', color: '#FFFFFF', fontSize: 14 }, 
  iconBtn: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  
  headerMobile: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 5 },
  headerTopRowMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBoxMobile: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  logoCircleMobile: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  brandMediMobile: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginLeft: 10, fontStyle: 'italic' },
  brandHubMobile: { fontWeight: '900' },
  headerIconBtnMobile: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerBottomRowMobile: { marginTop: 15, alignItems: 'center' },
  pageTitleMobile: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },

  tabContainer: { width: '100%', flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: 10, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 1 },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#A855F7' },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  tabTextActive: { color: '#A855F7', fontWeight: '900' },
  
  mainArea: { flex: 1, paddingTop: 5, width: '100%' }, 
});