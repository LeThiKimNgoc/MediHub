import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const colors = {
  white: '#FFFFFF', carbonDark: '#1E293B', tableHeader: '#E1BEE7', textLight: '#78909C', 
  statusDone: '#10B981', statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#0284C7',
  zoomBtnBg: '#7E22CE', headerBgPastel: '#A855F7'
};

export const IndividualTab = ({ individualData, isMobile, isZoomed, setIsZoomed }: any) => {
  const fSize = isMobile && !isZoomed ? 9 : 13; 
  const padV = isMobile && !isZoomed ? 8 : 16;   
  const padH = isMobile && !isZoomed ? 4 : 12;

  const getIndColStyle = (colType: string) => {
    if (isMobile && isZoomed) {
      const pxWidths: any = { id: 90, name: 220, total: 100, used: 100, rate: 140, last: 160 };
      return { width: pxWidths[colType] };
    } else {
      const pctWidths: any = { id: '11%', name: '33%', total: '12%', used: '12%', rate: '14%', last: '18%' };
      return { width: pctWidths[colType] };
    }
  };

  const renderIndividualTable = () => (
    <FlatList 
      data={individualData} showsVerticalScrollIndicator={true} style={{ flex: 1 }} keyExtractor={(item, index) => index.toString()} stickyHeaderIndices={[0]} 
      ListHeaderComponent={
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, getIndColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Mã BN</Text>
          <Text style={[styles.headerCell, getIndColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Sản phẩm đang dùng</Text>
          <Text style={[styles.headerCell, getIndColStyle('total'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Lượt Báo</Text>
          <Text style={[styles.headerCell, getIndColStyle('used'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Đã dùng</Text>
          <Text style={[styles.headerCell, getIndColStyle('rate'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Tỷ Lệ</Text>
          <Text style={[styles.headerCell, getIndColStyle('last'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', borderRightWidth: 0 }]}>Cập Nhật Cuối</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const rate = parseFloat(item.Average_Adherence?.replace('%', '') || '0');
        const rateColor = rate >= 80 ? colors.statusDone : (rate >= 50 ? colors.statusSnooze : colors.statusMissed);
        return (
          <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
            <Text style={[styles.dataCell, getIndColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: colors.info, fontSize: fSize }]} numberOfLines={1}>{item.PatientsID}</Text>
            <Text style={[styles.dataCell, styles.boldText, getIndColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.headerBgPastel }]} numberOfLines={2}>{item.MedicineName}</Text>
            <Text style={[styles.dataCell, getIndColStyle('total'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: '600', fontSize: fSize }]}>{item.Total_Reminders}</Text>
            <Text style={[styles.dataCell, getIndColStyle('used'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: rateColor, fontSize: fSize }]}>{item.Total_Used_clicks}</Text>
            <View style={[styles.dataCell, getIndColStyle('rate'), { paddingVertical: padV, paddingHorizontal: padH, justifyContent: 'center', alignItems: 'center' }]}>
              <View style={[styles.rateBadge, { paddingVertical: isMobile && !isZoomed ? 4 : 6, backgroundColor: rateColor + '1A', borderColor: rateColor }]}>
                <Text style={[styles.rateText, {color: rateColor, fontSize: fSize - 1}]}>{item.Average_Adherence}</Text>
              </View>
            </View>
            <Text style={[styles.dataCell, getIndColStyle('last'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', color: colors.textLight, fontSize: fSize - 1, borderRightWidth: 0 }]} numberOfLines={2}>{item.Last_app_usage}</Text>
          </View>
        );
      }} 
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có dữ liệu chi tiết.</Text></View>} 
    />
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Báo Cáo Từng Cá Nhân</Text>
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
            <View style={{ width: 850, flex: 1, backgroundColor: colors.white }}>{renderIndividualTable()}</View>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', flex: 1, backgroundColor: colors.white }}>{renderIndividualTable()}</View>
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
  rateBadge: { borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', width: '90%' },
  rateText: { fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textLight, fontSize: 16, fontStyle: 'italic' },
});