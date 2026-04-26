import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const colors = {
  white: '#FFFFFF', carbonDark: '#1E293B', tableHeader: '#E1BEE7', textLight: '#78909C', 
  statusDone: '#10B981', statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#0284C7',
  zoomBtnBg: '#7E22CE', headerBgPastel: '#A855F7'
};

export const LogTab = ({ logs, isMobile, isZoomed, setIsZoomed }: any) => {
  const fSize = isMobile && !isZoomed ? 9 : 13; 
  const padV = isMobile && !isZoomed ? 8 : 16;   
  const padH = isMobile && !isZoomed ? 4 : 12;

  const getLogColStyle = (colType: string) => {
    if (isMobile && isZoomed) {
      const pxWidths: any = { time: 160, id: 90, name: 220, hour: 100, action: 120, status: 120 };
      return { width: pxWidths[colType] };
    } else {
      const pctWidths: any = { time: '18%', id: '11%', name: '30%', hour: '11%', action: '15%', status: '15%' };
      return { width: pctWidths[colType] };
    }
  };

  const renderLogTable = () => (
    <FlatList 
      data={logs} showsVerticalScrollIndicator={true} style={{ flex: 1 }} keyExtractor={(item, index) => index.toString()} stickyHeaderIndices={[0]} 
      ListHeaderComponent={
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, getLogColStyle('time'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Thời gian ghi nhận</Text>
          <Text style={[styles.headerCell, getLogColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Mã BN</Text>
          <Text style={[styles.headerCell, getLogColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Tên sản phẩm</Text>
          <Text style={[styles.headerCell, getLogColStyle('hour'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Giờ dùng</Text>
          <Text style={[styles.headerCell, getLogColStyle('action'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Thao tác</Text>
          <Text style={[styles.headerCell, getLogColStyle('status'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', borderRightWidth: 0 }]}>Trạng Thái</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
          <Text style={[styles.dataCell, getLogColStyle('time'), { paddingVertical: padV, paddingHorizontal: padH, color: colors.textLight, fontSize: fSize - 1 }]} numberOfLines={2}>{item.Timestamp}</Text>
          <Text style={[styles.dataCell, getLogColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: colors.info, fontSize: fSize }]} numberOfLines={1}>{item.PatientsID}</Text>
          <Text style={[styles.dataCell, styles.boldText, getLogColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.headerBgPastel }]} numberOfLines={2}>{item.MedicineName}</Text>
          <Text style={[styles.dataCell, getLogColStyle('hour'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: colors.statusSnooze, fontSize: fSize }]}>{item.PlannedTime}</Text>
          <Text style={[styles.dataCell, getLogColStyle('action'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontStyle: 'italic', fontSize: fSize - 1 }]} numberOfLines={2}>{item.Action}</Text>
          <View style={[styles.dataCell, getLogColStyle('status'), { paddingVertical: padV, paddingHorizontal: padH, justifyContent: 'center', alignItems: 'center', borderRightWidth: 0 }]}>
            <View style={[styles.statusBadge, { paddingVertical: isMobile && !isZoomed ? 4 : 6, backgroundColor: item.Status === 'Đã sử dụng' ? colors.statusDone : (item.Status === 'Bỏ lỡ' ? colors.statusMissed : colors.statusSnooze) }]}>
              <Text style={[styles.statusText, {fontSize: fSize - 2}]}>{item.Status}</Text>
            </View>
          </View>
        </View>
      )} 
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có lịch sử sử dụng nào.</Text></View>} 
    />
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nhật Ký (Mới nhất)</Text>
        {isMobile && (
          <TouchableOpacity onPress={() => setIsZoomed(!isZoomed)} style={[styles.zoomBtn, {backgroundColor: isZoomed ? '#E2E8F0' : colors.zoomBtnBg}]}>
            <MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.carbonDark : colors.white} />
            <Text style={[styles.zoomBtnText, {color: isZoomed ? colors.carbonDark : colors.white}]}>{isZoomed ? "Thu nhỏ" : "Phóng to"}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.tableWrapper}>
        {isMobile && isZoomed ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={{ width: 850, flex: 1, backgroundColor: colors.white }}>{renderLogTable()}</View>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', flex: 1, backgroundColor: colors.white }}>{renderLogTable()}</View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 15, width: '100%' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark },
  zoomBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 1 },
  zoomBtnText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  tableWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.tableHeader, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10, elevation: 2 },
  headerCell: { color: '#4A148C', fontWeight: '900', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  rowEven: { backgroundColor: colors.white }, rowOdd: { backgroundColor: '#FDF7FD' },
  dataCell: { color: colors.carbonDark, borderRightWidth: 1, borderRightColor: '#F1F5F9', textAlignVertical: 'center' },
  boldText: { fontWeight: '800' },
  statusBadge: { borderRadius: 15, minWidth: 80, alignItems: 'center' },
  statusText: { color: colors.white, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textLight, fontSize: 16, fontStyle: 'italic' },
});