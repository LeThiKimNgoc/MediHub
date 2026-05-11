import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Alert, useWindowDimensions, Platform, RefreshControl, Image } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router'; 

// 🔥 BẢNG MÀU CHUẨN HIS / SAAS 
const colors = {
  bg: '#F8FAFC', surface: '#FFFFFF', primary: '#0F766E', primaryLight: '#F0FDFA', 
  textDark: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', 
  danger: '#EF4444', dangerLight: '#FEF2F2', success: '#10B981', successLight: '#ECFDF5',
  warning: '#F59E0B', warningLight: '#FFFBEB'
};

export default function HomeScreen() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // 🔥 STATE PHÂN TRANG (PAGINATION)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // Rút xuống 7 để bảng không bị tràn khung dọc của sếp

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024; 
  const isMobile = width < 768;

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
        { text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => router.replace('/') } 
      ]);
    }
  };

  const fetchMedicines = (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true); 
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    const gid = '1532424446'; 
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&t=${new Date().getTime()}`;

    fetch(csvUrl, { cache: 'no-store' })
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            setMedicines(results.data);
            setLoading(false); setRefreshing(false); 
          }
        });
      }).catch(error => { console.error(error); setLoading(false); setRefreshing(false); });
  };

  useFocusEffect(useCallback(() => { fetchMedicines(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchMedicines(true); }, []);

  const deleteMedicine = (id: string, name: string) => {
    if (!id) return Alert.alert('Lỗi', 'Sản phẩm này chưa có ID hệ thống.');
    const executeDelete = async () => {
      setLoading(true);
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';
      try {
        const response = await fetch(scriptUrl, { method: 'POST', body: JSON.stringify({ action: 'deleteMedicine', id: id }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = JSON.parse(await response.text());
        if (result.status === 'success') { showToast('Đã xóa sản phẩm khỏi kho.'); fetchMedicines(); } 
        else Alert.alert('Lỗi', result.message || 'Không thể xóa.');
      } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối với máy chủ.'); } finally { setLoading(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn "${name}"?`)) executeDelete(); } 
    else { Alert.alert("Xác nhận xóa", `Bạn chắc chắn muốn xóa "${name}"?`, [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: executeDelete }]); }
  };

  const showToast = (msg: string) => { Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Thông báo", msg); };

  const filteredMedicines = useMemo(() => {
    let result = medicines.filter(med => {
      const ten = med.MedicineName ? med.MedicineName.toLowerCase() : '';
      const hoatChat = med.ActiveIngredient ? med.ActiveIngredient.toLowerCase() : '';
      const idMed = med.ID ? med.ID.toString().toLowerCase() : ''; 
      const tuKhoa = searchQuery.toLowerCase();
      return ten.includes(tuKhoa) || hoatChat.includes(tuKhoa) || idMed.includes(tuKhoa);
    });

    if (activeFilter === 'RX') result = result.filter(m => m.Note?.toLowerCase().includes('kê đơn') && !m.Note?.toLowerCase().includes('không kê đơn'));
    else if (activeFilter === 'NON-RX') result = result.filter(m => m.Note?.toLowerCase().includes('không kê đơn'));
    return result;
  }, [medicines, searchQuery, activeFilter]);

  // Reset về trang 1 mỗi khi đổi từ khóa tìm kiếm hoặc đổi Filter
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeFilter]);

  // 🔥 TÍNH TOÁN PHÂN TRANG (PAGINATION)
  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  const paginatedData = filteredMedicines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderBadge = (note: string) => {
    if (!note) return <Text style={styles.dataText}>-</Text>;
    const lowerNote = note.toLowerCase();
    if (lowerNote.includes('không kê đơn')) return (<View style={[styles.badge, { backgroundColor: colors.successLight, borderColor: '#A7F3D0' }]}><Text style={[styles.badgeText, { color: colors.success }]}>Thường (Non-Rx)</Text></View>);
    if (lowerNote.includes('kê đơn')) return (<View style={[styles.badge, { backgroundColor: colors.dangerLight, borderColor: '#FECACA' }]}><Text style={[styles.badgeText, { color: colors.danger }]}>Kê đơn (Rx)</Text></View>);
    return <Text style={styles.dataText} numberOfLines={1}>{note}</Text>;
  };

  const renderTableData = () => (
    <FlatList
      data={paginatedData} // Hiển thị theo trang
      style={{ flex: 1 }}
      keyExtractor={(item) => item.ID ? item.ID.toString() : Math.random().toString()}
      showsVerticalScrollIndicator={false} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      stickyHeaderIndices={[0]} 
      ListHeaderComponent={
        // 🔥 KHÓA CHẶT BẰNG % WIDTH - TUYỆT ĐỐI KHÔNG TRÀN CỘT
        <View style={styles.tableHeaderRow}>
          <View style={[styles.headerCell, { width: '8%', alignItems: 'center' }]}><Text style={styles.headerText}>MÃ ID</Text></View>
          <View style={[styles.headerCell, { width: '28%' }]}><Text style={styles.headerText}>SẢN PHẨM & HOẠT CHẤT</Text></View>
          <View style={[styles.headerCell, { width: '14%' }]}><Text style={styles.headerText}>QUY CÁCH</Text></View>
          <View style={[styles.headerCell, { width: '22%' }]}><Text style={styles.headerText}>CÁCH DÙNG</Text></View>
          <View style={[styles.headerCell, { width: '16%', alignItems: 'center' }]}><Text style={styles.headerText}>PHÂN LOẠI</Text></View>
          <View style={[styles.headerCell, { width: '12%', alignItems: 'center', borderRightWidth: 0 }]}><Text style={styles.headerText}>THAO TÁC</Text></View>
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
          <View style={[styles.dataCell, { width: '8%', alignItems: 'center' }]}>
            <Text style={styles.idText} numberOfLines={1}>{item.ID}</Text>
          </View>
          <View style={[styles.dataCell, { width: '28%', justifyContent: 'center' }]}>
             <Text style={styles.medicineNameText} numberOfLines={2}>{item.MedicineName}</Text>
             <Text style={styles.ingredientText} numberOfLines={1}>{item.ActiveIngredient || 'Đang cập nhật...'}</Text>
          </View>
          <View style={[styles.dataCell, { width: '14%' }]}>
            <Text style={styles.dataText} numberOfLines={2}>{item.PackingSpecifications}</Text>
          </View>
          <View style={[styles.dataCell, { width: '22%' }]}>
            <Text style={styles.dataText} numberOfLines={3}>{item.Use}</Text>
          </View>
          <View style={[styles.dataCell, { width: '16%', alignItems: 'center' }]}>
            {renderBadge(item.Note)}
          </View>
          <View style={[styles.dataCell, { width: '12%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRightWidth: 0 }]}>
            <TouchableOpacity onPress={() => router.push({ pathname: '/edit', params: item } as any)} style={[styles.actionBtn, { backgroundColor: colors.warningLight, borderColor: '#FDE68A' }]}><MaterialCommunityIcons name="pencil" size={16} color={colors.warning} /></TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMedicine(item.ID, item.MedicineName)} style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: '#FECACA' }]}><MaterialCommunityIcons name="trash-can" size={16} color={colors.danger} /></TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="database-remove-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào.</Text>
        </View>
      }
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.saasHeader}>
          <View>
            <Text style={styles.pageTitle}>Danh mục D&C</Text>
            <Text style={styles.pageSubtitle}>Quản lý thông tin {medicines.length} loại thuốc & vật tư</Text>
          </View>
          <View style={styles.headerActions}>
            {!isMobile && (
              <TouchableOpacity style={styles.outlineBtn}>
                <MaterialCommunityIcons name="file-excel-outline" size={18} color={colors.textDark} style={{marginRight: 6}} />
                <Text style={styles.outlineBtnText}>Xuất Excel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/add')}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.surface} style={{marginRight: 4}} />
              <Text style={styles.primaryBtnText}>Thêm Sản Phẩm</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.toolbarContainer}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} style={{ marginLeft: 15 }} />
              <TextInput style={styles.searchInput} placeholder="Tra cứu tên thuốc, hoạt chất, mã ID..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 10 }}><MaterialCommunityIcons name="close-circle" size={18} color={colors.border} /></TouchableOpacity>)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <View style={styles.filterChipsRow}>
                <TouchableOpacity style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]} onPress={() => setActiveFilter('ALL')}><Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>Tất cả</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.filterChip, activeFilter === 'RX' && styles.filterChipActive]} onPress={() => setActiveFilter('RX')}><Text style={[styles.filterChipText, activeFilter === 'RX' && styles.filterChipTextActive]}>Kê đơn (Rx)</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.filterChip, activeFilter === 'NON-RX' && styles.filterChipActive]} onPress={() => setActiveFilter('NON-RX')}><Text style={[styles.filterChipText, activeFilter === 'NON-RX' && styles.filterChipTextActive]}>Không kê đơn</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
          
          <View style={styles.tableWrapper}>
            {loading && !refreshing ? (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color={colors.primary} /><Text style={{marginTop: 10, color: colors.textMuted}}>Đang tải dữ liệu kho...</Text></View>
            ) : (
              <View style={{flex: 1, width: '100%', flexDirection: 'column'}}>
                
                {/* KHU VỰC BẢNG (ÉP KHÔNG CHO SCROLL NGANG TRÊN DESKTOP) */}
                <View style={{flex: 1, overflow: 'hidden'}}> 
                  {isMobile ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: 800, flex: 1 }}>{renderTableData()}</View>
                    </ScrollView>
                  ) : (
                    renderTableData()
                  )}
                </View>

                {/* 🔥 THANH ĐIỀU HƯỚNG PHÂN TRANG (CỐ ĐỊNH Ở ĐÁY BẢNG) 🔥 */}
                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <Text style={styles.pageInfoText}>Đang xem {paginatedData.length} / {filteredMedicines.length} sản phẩm</Text>
                    
                    <View style={styles.pageControls}>
                      <TouchableOpacity 
                        style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} 
                        onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <MaterialCommunityIcons name="chevron-left" size={20} color={currentPage === 1 ? colors.textMuted : colors.textDark} />
                        <Text style={[styles.pageBtnText, currentPage === 1 && {color: colors.textMuted}]}>Trước</Text>
                      </TouchableOpacity>

                      <View style={styles.pageIndicator}>
                        <Text style={styles.pageIndicatorText}>Trang {currentPage} / {totalPages}</Text>
                      </View>

                      <TouchableOpacity 
                        style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} 
                        onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <Text style={[styles.pageBtnText, currentPage === totalPages && {color: colors.textMuted}]}>Sau</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={currentPage === totalPages ? colors.textMuted : colors.textDark} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, width: '100%' },
  
  saasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, paddingVertical: 20, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  outlineBtnText: { color: colors.textDark, fontWeight: '600', fontSize: 14 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: colors.surface, fontWeight: '700', fontSize: 14 },

  contentContainer: { flex: 1, padding: 24, width: '100%' },
  
  toolbarContainer: { marginBottom: 15, flexDirection: 'column', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, fontSize: 15, color: colors.textDark, fontWeight: '500', outlineStyle: 'none' as any },
  
  filterScroll: { flexGrow: 0 },
  filterChipsRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.primary, fontWeight: '800' },

  tableWrapper: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: colors.border, width: '100%' },
  
  // Style mới ép cột chặt chẽ
  headerCell: { paddingVertical: 14, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center', overflow: 'hidden' },
  headerText: { fontSize: 12, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, width: '100%' },
  rowEven: { backgroundColor: colors.surface }, 
  rowOdd: { backgroundColor: '#FAFAFA' }, 
  dataCell: { paddingVertical: 12, paddingHorizontal: 8, justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border, overflow: 'hidden' },
  
  idText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  medicineNameText: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  ingredientText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  dataText: { fontSize: 13, color: colors.textDark },

  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, alignSelf: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  actionBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '500', marginTop: 16 },

  // 🔥 CSS CHO PHÂN TRANG (PAGINATION) NẰM GỌN GÀNG ĐÁY BẢNG 🔥
  paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  pageInfoText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  pageControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pageBtnDisabled: { backgroundColor: '#F1F5F9', opacity: 0.5 },
  pageBtnText: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  pageIndicator: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.primaryLight, borderRadius: 8 },
  pageIndicatorText: { fontSize: 13, fontWeight: '800', color: colors.primary }
});