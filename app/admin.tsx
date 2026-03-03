import React, { useState, useCallback, useEffect } from 'react';
// 🔥 Bác sĩ đã gọi thêm cỗ máy in ảnh 'Image' vào đây 🔥
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, useWindowDimensions, Platform, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Papa from 'papaparse';

const colors = {
  bg: '#F8FAFC',
  brandPrimary: '#0F766E', 
  brandSecondary: '#14B8A6',
  headerText: '#0F172A',
  cardBg: '#FFFFFF',
  textDark: '#1E293B', 
  textLight: '#64748B',
  
  statPurple: '#7E22CE',
  statOrange: '#EA580C',
  statGreen: '#16A34A',
  bgPurple: '#F3E8FF',
  bgOrange: '#FFEDD5',
  bgGreen: '#DCFCE7',
  
  actionBlack: '#1E293B', 
  actionTeal: '#0D9488',
  white: '#FFFFFF'
};

export default function AdminScreen() {
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({ totalPatients: 0, adherenceRate: '0%', totalReminders: 0 });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');

  const { width } = useWindowDimensions();
  const isMobile = width < 1100; 

  useEffect(() => {
    setIsMounted(true); 
    const date = new Date();
    const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(date.toLocaleDateString('vi-VN', options));
  }, []);

  const fetchStats = () => {
    setLoading(true);
    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const gidSynthetic = '141017476'; 
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidSynthetic}`;

    fetch(csvUrl)
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) {
              const data = results.data[0]; 
              setStats({ 
                totalPatients: data.Total_Patients || 0, 
                adherenceRate: data.Average_Adherence || '0%', 
                totalReminders: data.Total_Reminders || 0 
              });
            }
            setLoading(false);
          }
        });
      }).catch(() => setLoading(false));
  };

  useFocusEffect(useCallback(() => { if (isMounted) fetchStats(); }, [isMounted]));

  const handleLogout = () => {
    if (Platform.OS === 'web') {
        if (window.confirm('Xác nhận kết thúc phiên làm việc?')) router.replace('/');
    } else {
        Alert.alert('Đăng xuất', 'Xác nhận thoát hệ thống?', [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Thoát', style: 'destructive', onPress: () => router.replace('/') } 
        ]);
    }
  };

  if (!isMounted) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainWrapper}>
        
        {/* ================= HEADER ================= */}
        {isMobile ? (
          <View style={styles.headerMobile}>
            <View style={styles.headerTopRowMobile}>
              <View style={styles.brandBoxMobile}>
                <View style={styles.brandRow}>
                  {/* 🔥 BÊ ẢNH FAVICON VÀO ĐÂY (MOBILE) 🔥 */}
                  <View style={styles.logoCircleMobile}>
                    <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                  </View>
                  <Text style={styles.brandMediMobile}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtnMobile} onPress={handleLogout}><MaterialCommunityIcons name="power" size={22} color="#FECACA" /></TouchableOpacity>
            </View>
            <View style={styles.headerBottomRowMobile}>
              <Text style={styles.brandSloganMobile}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
              <Text style={styles.currentDateMobile}>{currentDate}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.brandBox}>
                  <View style={styles.brandRow}>
                    {/* 🔥 BÊ ẢNH FAVICON VÀO ĐÂY (PC) 🔥 */}
                    <View style={styles.logoCircle}>
                      <Image source={require('../assets/images/favicon.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                  </View>
                </View>
                <Text style={styles.brandSlogan}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
              </View>
              <View style={styles.headerCenter}>
                <Text style={styles.pageTitle}>TRANG CHỦ</Text>
                <View style={styles.titleUnderline} />
              </View>
              <View style={styles.headerRight}>
                <View style={styles.headerInfoGroup}>
                  <Text style={styles.currentDate}>{currentDate}</Text>
                  <Text style={styles.wishText}>Chúc bạn một ngày tốt lành! ✨</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><MaterialCommunityIcons name="power" size={26} color="#FECACA" /></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================= PHẦN THÂN ================= */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyContent}>
          
          <View style={[styles.dashboardLayout, isMobile && styles.dashboardLayoutMobile]}>
            
            {/* CỘT TRÁI: PHÂN HỆ QUẢN LÝ */}
            <View style={styles.leftColumn}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Phân hệ quản lý</Text>
                
                <View style={styles.topRightActions}>
                  <TouchableOpacity style={[styles.iconActionBtn, {backgroundColor: colors.actionBlack}]} onPress={() => router.push('/add-patient')}>
                    <MaterialCommunityIcons name="account-plus" size={22} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconActionBtn, {backgroundColor: '#2563EB'}]} onPress={() => router.push('/scan')}>
                    <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconActionBtn, {backgroundColor: colors.actionTeal}]} onPress={() => router.push('/add')}>
                    <MaterialCommunityIcons name="pill" size={22} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modulesContainer}>
                
                <TouchableOpacity style={[styles.moduleCard, styles.cardPatient]} onPress={() => router.push('/patient')} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="card-account-details" size={140} color="#EA580C" style={styles.watermarkIcon} />
                  <View style={[styles.moduleIconCircle, {backgroundColor: '#FFEDD5', shadowColor: '#EA580C', elevation: 5}]}>
                    <MaterialCommunityIcons name="folder-account" size={34} color="#EA580C" />
                  </View>
                  <View style={styles.moduleTextContainer}>
                    <Text style={[styles.moduleTitle, {color: '#9A3412'}]}>Hồ sơ Bệnh Nhân</Text>
                    <Text style={styles.moduleDesc}>Quản lý chi tiết bệnh án, đơn thuốc và lộ trình điều trị.</Text>
                    <View style={[styles.exploreBtn, {backgroundColor: '#FFEDD5'}]}>
                      <Text style={[styles.exploreText, {color: '#EA580C'}]}>Truy cập ngay</Text>
                      <MaterialCommunityIcons name="arrow-right" size={16} color="#EA580C" />
                    </View>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.moduleCard, styles.cardMedicine]} onPress={() => router.push('/home')} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="medical-bag" size={130} color="#0D9488" style={styles.watermarkIcon} />
                  <View style={[styles.moduleIconCircle, {backgroundColor: '#CCFBF1', shadowColor: '#0D9488', elevation: 5}]}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={34} color="#0D9488" />
                  </View>
                  <View style={styles.moduleTextContainer}>
                    <Text style={[styles.moduleTitle, {color: '#115E59'}]}>Danh Mục D&C</Text>
                    <Text style={styles.moduleDesc}>Hệ thống dược phẩm, quy cách đóng gói và hướng dẫn sử dụng.</Text>
                    <View style={[styles.exploreBtn, {backgroundColor: '#CCFBF1'}]}>
                      <Text style={[styles.exploreText, {color: '#0D9488'}]}>Truy cập ngay</Text>
                      <MaterialCommunityIcons name="arrow-right" size={16} color="#0D9488" />
                    </View>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.moduleCard, styles.cardReport]} onPress={() => router.push('/report')} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="finance" size={150} color="#7E22CE" style={styles.watermarkIcon} />
                  <View style={[styles.moduleIconCircle, {backgroundColor: '#F3E8FF', shadowColor: '#7E22CE', elevation: 5}]}>
                    <MaterialCommunityIcons name="chart-box" size={34} color="#7E22CE" />
                  </View>
                  <View style={styles.moduleTextContainer}>
                    <Text style={[styles.moduleTitle, {color: '#581C87'}]}>Báo Cáo Thống Kê</Text>
                    <Text style={styles.moduleDesc}>Phân tích dữ liệu tuân thủ và đánh giá hiệu quả vận hành.</Text>
                    <View style={[styles.exploreBtn, {backgroundColor: '#F3E8FF'}]}>
                      <Text style={[styles.exploreText, {color: '#7E22CE'}]}>Truy cập ngay</Text>
                      <MaterialCommunityIcons name="arrow-right" size={16} color="#7E22CE" />
                    </View>
                  </View>
                </TouchableOpacity>

              </View>
            </View>

            {/* CỘT PHẢI: CHỈ SỐ VẬN HÀNH */}
            <View style={styles.rightColumn}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Chỉ số vận hành</Text>
                <TouchableOpacity onPress={fetchStats} style={styles.refreshBtn}>
                  <MaterialCommunityIcons name="sync" size={20} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
              ) : (
                <View style={styles.statsContainer}>
                  <View style={[styles.statCardCompact, { backgroundColor: colors.bgPurple, borderColor: '#E9D5FF' }]}>
                    <View style={styles.statInfo}>
                      <Text style={styles.statLabelCompact}>Tuân thủ chung</Text>
                      <Text style={[styles.statNumberCompact, {color: colors.statPurple}]}>{stats.adherenceRate}</Text>
                    </View>
                    <View style={[styles.statIconBoxCompact, {backgroundColor: '#E9D5FF'}]}>
                      <MaterialCommunityIcons name="heart-pulse" size={28} color={colors.statPurple} />
                    </View>
                  </View>

                  <View style={[styles.statCardCompact, { backgroundColor: colors.bgOrange, borderColor: '#FED7AA' }]}>
                    <View style={styles.statInfo}>
                      <Text style={styles.statLabelCompact}>Tổng Bệnh nhân</Text>
                      <Text style={[styles.statNumberCompact, {color: colors.statOrange}]}>{stats.totalPatients}</Text>
                    </View>
                    <View style={[styles.statIconBoxCompact, {backgroundColor: '#FED7AA'}]}>
                      <MaterialCommunityIcons name="account-group" size={28} color={colors.statOrange} />
                    </View>
                  </View>

                  <View style={[styles.statCardCompact, { backgroundColor: colors.bgGreen, borderColor: '#BBF7D0' }]}>
                    <View style={styles.statInfo}>
                      <Text style={styles.statLabelCompact}>Lượt nhắc đã phát</Text>
                      <Text style={[styles.statNumberCompact, {color: colors.statGreen}]}>{stats.totalReminders}</Text>
                    </View>
                    <View style={[styles.statIconBoxCompact, {backgroundColor: '#BBF7D0'}]}>
                      <MaterialCommunityIcons name="bell-ring" size={28} color={colors.statGreen} />
                    </View>
                  </View>
                </View>
              )}
            </View>

          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg }, mainWrapper: { flex: 1 },
  header: { backgroundColor: '#0F766E', paddingVertical: 18, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, marginBottom: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLeft: { flex: 1, alignItems: 'flex-start' }, brandBox: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', flexDirection: 'row', alignItems: 'center' }, brandRow: { flexDirection: 'row', alignItems: 'center' }, 
  
  // 🔥 Đã đổi hình nền logo thành TẮNG (#FFFFFF) để tôn lên logo Xanh lá 🔥
  logoCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }, 
  logoCircleMobile: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }, 
  
  brandMedi: { fontSize: 30, fontWeight: '600', color: '#FFFFFF', marginLeft: 12, letterSpacing: 1, fontStyle: 'italic' }, brandHub: { fontWeight: '900', color: '#FFFFFF' }, brandSlogan: { fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginLeft: 14, marginTop: 6 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 }, pageTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 }, titleUnderline: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginTop: 4 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }, headerInfoGroup: { alignItems: 'flex-end', marginRight: 20 }, currentDate: { fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '700', textTransform: 'uppercase' }, wishText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 1 }, logoutBtn: { width: 46, height: 46, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerMobile: { backgroundColor: '#0F766E', paddingVertical: 20, paddingHorizontal: 15, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, marginBottom: 15 }, headerTopRowMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brandBoxMobile: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' }, brandMediMobile: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginLeft: 10, letterSpacing: 1, fontStyle: 'italic' }, logoutBtnMobile: { width: 40, height: 40, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, headerBottomRowMobile: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brandSloganMobile: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', fontStyle: 'italic' }, currentDateMobile: { fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '700', textTransform: 'uppercase' },
  body: { flex: 1, backgroundColor: colors.bg },
  bodyContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 15, paddingBottom: 20 },
  dashboardLayout: { flexDirection: 'row', gap: 30, flex: 1 },
  dashboardLayoutMobile: { flexDirection: 'column', gap: 30, flex: 1 },
  leftColumn: { flex: 2, display: 'flex', flexDirection: 'column' },
  rightColumn: { flex: 1, display: 'flex', flexDirection: 'column' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.headerText, letterSpacing: 0.5 },
  topRightActions: { flexDirection: 'row', gap: 10 },
  iconActionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  refreshBtn: { padding: 8, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  modulesContainer: { flexDirection: 'column', gap: 15, flex: 1 },
  moduleCard: { flex: 1, minHeight: 120, flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, overflow: 'hidden' },
  cardPatient: { backgroundColor: '#FFFDF9', borderLeftWidth: 8, borderLeftColor: '#EA580C', borderColor: '#FFEDD5', borderWidth: 1 },
  cardMedicine: { backgroundColor: '#F9FFFD', borderLeftWidth: 8, borderLeftColor: '#0D9488', borderColor: '#CCFBF1', borderWidth: 1 },
  cardReport: { backgroundColor: '#FDFBFF', borderLeftWidth: 8, borderLeftColor: '#7E22CE', borderColor: '#F3E8FF', borderWidth: 1 },
  watermarkIcon: { position: 'absolute', right: -25, bottom: -20, opacity: 0.05, transform: [{rotate: '-15deg'}] },
  moduleIconCircle: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  moduleTextContainer: { flex: 1 },
  moduleTitle: { fontSize: 19, fontWeight: '900', marginBottom: 4 },
  moduleDesc: { fontSize: 13, color: colors.textLight, lineHeight: 20, paddingRight: 10, marginBottom: 8 },
  exploreBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  exploreText: { fontSize: 12, fontWeight: '800', marginRight: 4 },
  statsContainer: { flexDirection: 'column', gap: 15, flex: 1 },
  statCardCompact: { flex: 1, minHeight: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 20, borderWidth: 1, elevation: 1 },
  statInfo: { flex: 1 },
  statLabelCompact: { fontSize: 14, fontWeight: '700', opacity: 0.8, marginBottom: 6 },
  statNumberCompact: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  statIconBoxCompact: { padding: 14, borderRadius: 18 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});