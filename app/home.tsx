import React, { useState, useCallback } from 'react';
// 🔥 Bổ sung thêm thẻ Image vào đây 🔥
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Alert, useWindowDimensions, Platform, RefreshControl, Image } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router'; 

// === BẢNG MÀU DEEP TEAL - TRANG DANH MỤC D&C ===
const colors = {
  bg: '#F8FAFC',
  headerBgPastel: '#14B8A6', 
  white: '#FFFFFF',
  carbonDark: '#1E293B',     
  tableHeader: '#C5E1E5',  
  textLight: '#78909C',  
  dangerPastel: '#FFCDD2', 
  dangerText: '#D32F2F',
  warningPastel: '#FFF9C4',
  warningText: '#F57F17',
  zoomBtnBg: '#0F766E'
};

export default function HomeScreen() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 🔥 BIẾN QUẢN LÝ MÀN HÌNH VÀ THU PHÓNG 🔥
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900; 
  const isMobile = width < 768;
  const [isZoomed, setIsZoomed] = useState(false); 

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
        router.replace('/');
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => router.replace('/') } 
      ]);
    }
  };

  const fetchMedicines = (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true); 

    const sheetId = '1raKHK5ibDLtRDhZmkDJ3kEAs8fApJBesoQPpRyoBszU';
    const gid = '512830173'; 
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    fetch(csvUrl)
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            setMedicines(results.data);
            setLoading(false);
            setRefreshing(false); 
          }
        });
      })
      .catch(error => { 
        console.error(error); 
        setLoading(false); 
        setRefreshing(false); 
      });
  };

  useFocusEffect(useCallback(() => { fetchMedicines(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMedicines(true);
  }, []);

  const deleteMedicine = (id, name) => {
    if (!id) {
      Alert.alert('Lỗi', 'Sản phẩm này chưa có ID hệ thống, không thể xóa.');
      return;
    }

    const executeDelete = async () => {
      setLoading(true);
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbz5AnG5s_o2-nnXYYH0P0kb3-3N0QFgNOzg_Ix0KLDoG4SBvuqmouSLxfGPXRj068-O7A/exec';

      try {
        const response = await fetch(scriptUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'delete', id: id }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          Alert.alert('Đã xóa', 'Sản phẩm đã được loại bỏ khỏi danh mục D&C.');
          fetchMedicines();
        } else {
          Alert.alert('Lỗi', result.message || 'Không thể xóa.');
        }
      } catch (error) {
        Alert.alert('Lỗi mạng', 'Không thể kết nối với máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn "${name}" không?`);
      if (confirmed) executeDelete();
    } else {
      Alert.alert(
        "Xác nhận xóa",
        `Bạn có chắc chắn muốn xóa vĩnh viễn "${name}" không?`,
        [
          { text: "Hủy", style: "cancel" },
          { text: "Xóa", style: "destructive", onPress: executeDelete }
        ]
      );
    }
  };

  const filteredMedicines = medicines.filter(med => {
    const ten = med.MedicineName ? med.MedicineName.toLowerCase() : '';
    const hoatChat = med.ActiveIngredient ? med.ActiveIngredient.toLowerCase() : '';
    const idMed = med.ID ? med.ID.toString().toLowerCase() : ''; 
    const tuKhoa = searchQuery.toLowerCase();
    return ten.includes(tuKhoa) || hoatChat.includes(tuKhoa) || idMed.includes(tuKhoa);
  });

  // 🔥 LOGIC HIỂN THỊ CỘT THÔNG MINH 🔥
  const fSize = isMobile && !isZoomed ? 10 : 14; 
  const padV = isMobile && !isZoomed ? 8 : 16;   
  const padH = isMobile && !isZoomed ? 4 : 12;
  const iconSize = isMobile && !isZoomed ? 14 : 18;

  const renderTableData = () => (
    <FlatList
      data={filteredMedicines}
      keyExtractor={(item) => item.ID ? item.ID.toString() : Math.random().toString()}
      showsVerticalScrollIndicator={true} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.headerBgPastel]} />}
      
      stickyHeaderIndices={[0]} 

      ListHeaderComponent={
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 100 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Thao tác</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 80 } : { flex: 0.8 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Mã ID</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 250 } : { flex: 2.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Tên Sản phẩm D&C</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 200 } : { flex: 2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Hoạt Chất</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 120 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Quy Cách</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 150 } : { flex: 1.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Cách Dùng</Text>
          <Text style={[styles.headerCell, isMobile && isZoomed ? { width: 200 } : { flex: 2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, borderRightWidth: 0 }]}>Ghi Chú</Text>
        </View>
      }

      renderItem={({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
          <View style={[styles.dataCell, isMobile && isZoomed ? { width: 100 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: isMobile && !isZoomed ? 4 : 8 }]}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/edit', params: item })} style={[styles.actionButton, { backgroundColor: colors.warningPastel, padding: isMobile && !isZoomed ? 4 : 6 }]}><MaterialCommunityIcons name="pencil-outline" size={iconSize} color={colors.warningText} /></TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMedicine(item.ID, item.MedicineName)} style={[styles.actionButton, { backgroundColor: colors.dangerPastel, padding: isMobile && !isZoomed ? 4 : 6 }]}><MaterialCommunityIcons name="trash-can-outline" size={iconSize} color={colors.dangerText} /></TouchableOpacity>
          </View>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 80 } : { flex: 0.8 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', color: colors.textLight, fontWeight: '600' }]}>{item.ID}</Text>
          
          <Text style={[styles.dataCell, styles.boldText, isMobile && isZoomed ? { width: 250 } : { flex: 2.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.headerBgPastel }]}>{item.MedicineName}</Text>
          
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 200 } : { flex: 2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]} numberOfLines={3}>{item.ActiveIngredient}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 120 } : { flex: 1.2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>{item.PackingSpecifications}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 150 } : { flex: 1.5 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]} numberOfLines={3}>{item.Use}</Text>
          <Text style={[styles.dataCell, isMobile && isZoomed ? { width: 200 } : { flex: 2 }, { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, borderRightWidth: 0 }]} numberOfLines={3}>{item.Note}</Text>
        </View>
      )}
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Không tìm thấy sản phẩm D&C nào.</Text></View>}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* --- HEADER ĐÃ ĐƯỢC ĐỘ LOGO MỚI --- */}
        {isMobile ? (
          <View style={[styles.header, styles.headerMobile]}>
             <View style={styles.headerTopRowMobile}>
               <View style={styles.brandBox}>
                  <View style={styles.brandRow}>
                    {/* 🔥 BÊ ẢNH FAVICON VÀO ĐÂY (MOBILE) 🔥 */}
                    <View style={styles.logoCircleMobile}>
                        <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                  </View>
               </View>
               <View style={{flexDirection: 'row'}}>
                 <TouchableOpacity style={styles.headerIconBtnMobile} onPress={() => router.push('/admin')}>
                    <MaterialCommunityIcons name="home-outline" size={22} color={colors.white} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.headerIconBtnMobile, {marginLeft: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)'}]} onPress={handleLogout}>
                    <MaterialCommunityIcons name="power" size={22} color="#FECACA" />
                 </TouchableOpacity>
               </View>
             </View>
             <View style={styles.headerBottomRowMobile}>
                <Text style={styles.pageTitleMobile}>DANH MỤC D&C</Text>
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
                <Text style={styles.pageTitle}>DANH MỤC D&C</Text>
                <View style={styles.titleUnderline} />
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/admin')}>
                  <MaterialCommunityIcons name="home-outline" size={22} color={colors.white} />
                  <Text style={styles.navText}>Trang chủ</Text>
                </TouchableOpacity>
                <View style={styles.smallDivider} />
                <TouchableOpacity style={styles.navBtn} onPress={handleLogout}>
                  <MaterialCommunityIcons name="power" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.textLight} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Tìm tên sản phẩm D&C, hoạt chất hoặc mã ID..." 
              placeholderTextColor={colors.textLight} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.sectionTitle}>Danh Sách ({filteredMedicines.length})</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              {isMobile && (
                <TouchableOpacity 
                  onPress={() => setIsZoomed(!isZoomed)} 
                  style={[styles.zoomBtn, {backgroundColor: isZoomed ? '#E2E8F0' : colors.zoomBtnBg}]}
                >
                  <MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.carbonDark : colors.white} />
                  <Text style={[styles.zoomBtnText, {color: isZoomed ? colors.carbonDark : colors.white}]}>
                    {isZoomed ? "Thu nhỏ" : "Phóng to"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
                {refreshing ? <ActivityIndicator size="small" color={colors.headerBgPastel} /> : <MaterialCommunityIcons name="refresh" size={20} color={colors.carbonDark} />}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.tableWrapper}>
            {isMobile && isZoomed ? (
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
                <View style={{ width: 1100, flex: 1, backgroundColor: colors.white }}> 
                  {renderTableData()}
                </View>
              </ScrollView>
            ) : (
              <View style={{ width: '100%', flex: 1, backgroundColor: colors.white }}>
                {renderTableData()}
              </View>
            )}
          </View>

        </View>

        <TouchableOpacity style={styles.fab} onPress={() => router.push('/add')} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus" size={32} color={colors.white} />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: colors.textLight, fontWeight: '600' },
  
  header: { 
    backgroundColor: colors.headerBgPastel, paddingVertical: 18, paddingHorizontal: '2%', 
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: colors.headerBgPastel,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 10 
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  
  // 🔥 STYLE LOGO ĐÃ ĐƯỢC CHỈNH NỀN TRẮNG 🔥
  brandBox: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  brandMedi: { 
    fontSize: 30, 
    fontWeight: '600', 
    color: '#FFFFFF', 
    marginLeft: 12, 
    letterSpacing: 1, 
    fontStyle: 'italic', 
    textShadowColor: 'rgba(0, 0, 0, 0.2)', 
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4, 
  },
  brandHub: { fontWeight: '900', color: '#FFFFFF' },

  brandSlogan: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginLeft: 12, marginTop: 6 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowRadius: 2 },
  titleUnderline: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginTop: 4 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 12 },
  navText: { marginLeft: 6, fontWeight: '700', color: '#FFFFFF', fontSize: 14 },
  smallDivider: { width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.3)', marginHorizontal: 12 },

  headerMobile: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 15 },
  headerTopRowMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoCircleMobile: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerIconBtnMobile: { width: 42, height: 42, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerBottomRowMobile: { marginTop: 15, alignItems: 'center' },
  pageTitleMobile: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  
  contentContainer: { flex: 1, paddingHorizontal: '2%', paddingBottom: 10, width: '100%' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.carbonDark, fontWeight: '500' },
  clearIcon: { padding: 5 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark },
  
  zoomBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 1 },
  zoomBtnText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  refreshBtn: { marginLeft: 12, padding: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  
  tableWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.tableHeader, borderBottomWidth: 1, borderBottomColor: '#B0BEC5', zIndex: 10, elevation: 2 },
  headerCell: { color: colors.carbonDark, fontWeight: '900', borderRightWidth: 1, borderRightColor: '#B0BEC5' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowEven: { backgroundColor: colors.white }, rowOdd: { backgroundColor: '#F8FDFF' }, 
  dataCell: { color: colors.carbonDark, borderRightWidth: 1, borderRightColor: '#F1F5F9', textAlignVertical: 'center' },
  boldText: { fontWeight: '800' },
  
  actionButton: { borderRadius: 8 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textLight, fontSize: 16, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: colors.headerBgPastel, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 6, borderWidth: 3, borderColor: colors.white }
});