import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 🔥 BẢNG MÀU CHUẨN SAAS TÍM/TEAL
const colors = {
  bg: '#F8FAFC', surface: '#FFFFFF', primary: '#7C3AED', primaryLight: '#F5F3FF',
  textDark: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  statusDone: '#10B981', statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#3B82F6'
};

export const LogTab = ({ logs, isMobile, isZoomed, setIsZoomed }: any) => {
  // 🔥 QUẢN LÝ PHÂN TRANG (PAGINATION)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Vừa khít 1 màn hình, không cần cuộn dọc
  const totalPages = Math.ceil((logs?.length || 0) / itemsPerPage);
  const paginatedLogs = logs?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) || [];

  // Khi có logs mới, reset về trang 1
  useEffect(() => { setCurrentPage(1); }, [logs]);

  const fSize = isMobile && !isZoomed ? 11 : 13; 

  const getLogColStyle = (colType: string) => {
    if (isMobile && isZoomed) {
      const pxWidths: any = { time: 140, id: 90, name: 220, hour: 90, action: 140, status: 120 };
      return { width: pxWidths[colType] };
    } else {
      // Trói chặt bằng phần trăm trên Desktop
      const pctWidths: any = { time: '16%', id: '10%', name: '28%', hour: '12%', action: '18%', status: '16%' };
      return { width: pctWidths[colType] };
    }
  };

  const renderLogTable = () => (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <FlatList 
        data={paginatedLogs} 
        showsVerticalScrollIndicator={false} 
        style={{ flex: 1 }} 
        keyExtractor={(item, index) => index.toString()} 
        stickyHeaderIndices={[0]} 
        ListHeaderComponent={
          <View style={styles.tableHeaderRow}>
            <View style={[styles.headerCell, getLogColStyle('time'), { alignItems: 'flex-start' }]}><Text style={styles.headerText}>THỜI GIAN</Text></View>
            <View style={[styles.headerCell, getLogColStyle('id'), { alignItems: 'center' }]}><Text style={styles.headerText}>MÃ BN</Text></View>
            <View style={[styles.headerCell, getLogColStyle('name'), { alignItems: 'flex-start' }]}><Text style={styles.headerText}>TÊN SẢN PHẨM</Text></View>
            <View style={[styles.headerCell, getLogColStyle('hour'), { alignItems: 'center' }]}><Text style={styles.headerText}>GIỜ DÙNG</Text></View>
            <View style={[styles.headerCell, getLogColStyle('action'), { alignItems: 'center' }]}><Text style={styles.headerText}>THAO TÁC</Text></View>
            <View style={[styles.headerCell, getLogColStyle('status'), { alignItems: 'center', borderRightWidth: 0 }]}><Text style={styles.headerText}>TRẠNG THÁI</Text></View>
          </View>
        }
        renderItem={({ item, index }) => {
          let statusColor = colors.statusSnooze;
          let statusBg = '#FEF3C7';
          if (item.Status === 'Đã sử dụng') { statusColor = colors.statusDone; statusBg = '#D1FAE5'; }
          else if (item.Status === 'Bỏ lỡ') { statusColor = colors.statusMissed; statusBg = '#FEE2E2'; }

          return (
            <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
              <View style={[styles.dataCell, getLogColStyle('time'), { alignItems: 'flex-start' }]}>
                <Text style={[styles.dataText, { color: colors.textMuted, fontSize: fSize - 1 }]} numberOfLines={2}>{item.Timestamp}</Text>
              </View>
              <View style={[styles.dataCell, getLogColStyle('id'), { alignItems: 'center' }]}>
                <Text style={[styles.dataText, { fontWeight: '700', color: colors.info, fontSize: fSize }]} numberOfLines={1}>{item.PatientsID}</Text>
              </View>
              <View style={[styles.dataCell, getLogColStyle('name'), { alignItems: 'flex-start' }]}>
                <Text style={[styles.dataText, { fontWeight: '800', color: colors.primary, fontSize: fSize }]} numberOfLines={2}>{item.MedicineName}</Text>
              </View>
              <View style={[styles.dataCell, getLogColStyle('hour'), { alignItems: 'center' }]}>
                <Text style={[styles.dataText, { fontWeight: '700', color: colors.textDark, fontSize: fSize }]}>{item.PlannedTime}</Text>
              </View>
              <View style={[styles.dataCell, getLogColStyle('action'), { alignItems: 'center' }]}>
                <Text style={[styles.dataText, { fontStyle: 'italic', color: colors.textMuted, fontSize: fSize - 1 }]} numberOfLines={2}>{item.Action}</Text>
              </View>
              <View style={[styles.dataCell, getLogColStyle('status'), { alignItems: 'center', borderRightWidth: 0 }]}>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusText, { color: statusColor, fontSize: fSize - 2 }]}>{item.Status}</Text>
                </View>
              </View>
            </View>
          );
        }} 
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>Hệ thống chưa ghi nhận lịch sử nào.</Text>
          </View>
        } 
      />

      {/* 🔥 THANH ĐIỀU HƯỚNG PHÂN TRANG (DÍNH Ở ĐÁY BẢNG) */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.pageInfoText}>Hiển thị {paginatedLogs.length} / {logs?.length || 0} bản ghi</Text>
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
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nhật Ký Tương Tác</Text>
        {isMobile && (
          <TouchableOpacity onPress={() => setIsZoomed(!isZoomed)} style={[styles.zoomBtn, {backgroundColor: isZoomed ? '#E2E8F0' : colors.primaryLight}]}>
            <MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.textDark : colors.primary} />
            <Text style={[styles.zoomBtnText, {color: isZoomed ? colors.textDark : colors.primary}]}>{isZoomed ? "Thu nhỏ" : "Phóng to"}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.tableWrapper}>
        {isMobile && isZoomed ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={{ width: 850, flex: 1, backgroundColor: colors.surface }}>{renderLogTable()}</View>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', flex: 1, backgroundColor: colors.surface }}>{renderLogTable()}</View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1, paddingVertical: 15, width: '100%', flexDirection: 'column' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  
  zoomBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  zoomBtnText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  tableWrapper: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCell: { paddingVertical: 14, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' },
  headerText: { fontSize: 12, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  rowEven: { backgroundColor: colors.surface }, 
  rowOdd: { backgroundColor: '#FAFAFA' },
  
  dataCell: { paddingVertical: 12, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' },
  dataText: { color: colors.textDark, fontSize: 13 },
  
  statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  statusText: { fontWeight: '800' },
  
  emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: '500', marginTop: 16 },

  // PHÂN TRANG
  paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  pageInfoText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  pageControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pageBtnDisabled: { backgroundColor: '#F1F5F9', opacity: 0.5 },
  pageBtnText: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  pageIndicator: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.primaryLight, borderRadius: 8 },
  pageIndicatorText: { fontSize: 13, fontWeight: '800', color: colors.primary }
});