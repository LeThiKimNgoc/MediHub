import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 🔥 BẢNG MÀU CHUẨN SAAS TÍM/TEAL
const colors = {
  bg: '#F8FAFC', surface: '#FFFFFF', primary: '#7C3AED', primaryLight: '#F5F3FF',
  textDark: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  statusDone: '#10B981', statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#3B82F6'
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};
const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const normalizeDateStr = (dateStr: string) => {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
  return dateStr.split(' ')[0]; 
};

export const IndividualTab = ({ logsData, remindData, isMobile, isZoomed, setIsZoomed }: any) => {
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [searchPatient, setSearchPatient] = useState('');

  // 🧠 LOGIC XỬ LÝ DỮ LIỆU CỦA SẾP (GIỮ NGUYÊN 100%)
  const processedData = useMemo(() => {
    const grouped: any = {};
    const activeRemind = remindData || [];

    if (filterDate !== 'Tất cả') {
        activeRemind.forEach((pref: any) => {
          const pId = String(pref.PatientsID || pref.PatientID || pref['Mã BN'] || '').trim();
          const mName = String(pref.MedicineName || pref.Medicine || pref['Sản phẩm'] || '').trim();
          if (!pId || !mName) return;

          let dailyTotal = 1;
          if (pref.Time && typeof pref.Time === 'string') {
             dailyTotal = pref.Time.split(',').filter((t:string) => t.trim() !== '').length || 1;
          }

          const key = `${filterDate}_${pId}_${mName}`;
          grouped[key] = {
            date: filterDate, patientId: pId, medicine: mName,
            total: dailyTotal, used: 0, snoozed: 0, missed: 0, remain: dailyTotal
          };
        });
    }

    let filteredLogs = logsData || []; 
    if (filterDate !== 'Tất cả') {
      filteredLogs = filteredLogs.filter((log: any) => {
        const rawDate = String(log.Date || log.Time || log.Ngay || log.Timestamp || '').trim();
        const normDate = normalizeDateStr(rawDate);
        return normDate.includes(filterDate) || rawDate.includes(filterDate);
      });
    }

    const uniqueDoseMap: Record<string, any> = {};
    filteredLogs.forEach((log: any) => {
      const pId = String(log.PatientsID || log.PatientID || log['Mã BN'] || '').trim();
      const mName = String(log.MedicineName || log.Medicine || log['Sản phẩm'] || log['Tên thuốc'] || '').trim();
      const rawDate = String(log.Date || log.Time || log.Ngay || log.Timestamp || '').trim();
      const normDate = normalizeDateStr(rawDate);
      const logDate = normDate || rawDate || 'N/A';
      const plannedTime = String(log.PlannedTime || log.Time || 'unknown').trim();

      const uniqueDoseKey = `${logDate}_${pId}_${mName}_${plannedTime}`;
      if (!uniqueDoseMap[uniqueDoseKey]) {
        uniqueDoseMap[uniqueDoseKey] = { ...log, logDate, pId, mName };
      }
    });

    Object.values(uniqueDoseMap).forEach((log: any) => {
      const currentKey = `${filterDate === 'Tất cả' ? log.logDate : filterDate}_${log.pId}_${log.mName}`;

      if (!grouped[currentKey]) {
        let dailyTotal = 1;
        const matchPref = activeRemind.find((i:any) => String(i.PatientsID).trim() === log.pId && String(i.MedicineName).trim() === log.mName);
        if (matchPref && matchPref.Time) {
            dailyTotal = matchPref.Time.split(',').filter((t:string) => t.trim() !== '').length || 1;
        }
        grouped[currentKey] = {
          date: log.logDate, patientId: log.pId, medicine: log.mName,
          total: filterDate === 'Tất cả' ? 0 : dailyTotal, 
          used: 0, snoozed: 0, missed: 0, 
          remain: filterDate === 'Tất cả' ? 0 : dailyTotal
        };
      }

      if (filterDate === 'Tất cả') grouped[currentKey].total += 1;

      const status = String(log.Status || log['Trạng thái'] || '').trim().toLowerCase();
      
      if (status.includes('đã dùng') || status.includes('hoàn thành') || status.includes('xác nhận') || status.includes('sử dụng') || status === 'done') {
        grouped[currentKey].used += 1;
      } else if (status.includes('nhắc lại') || status.includes('snooze') || status.includes('chờ')) {
        grouped[currentKey].snoozed += 1;
      } else if (status.includes('bỏ qua') || status.includes('missed') || status.includes('không')) {
        grouped[currentKey].missed += 1;
      }

      if (filterDate !== 'Tất cả') {
        grouped[currentKey].remain = Math.max(0, grouped[currentKey].total - (grouped[currentKey].used + grouped[currentKey].missed));
      }
    });

    const todayString = getTodayStr();
    let finalArr = Object.values(grouped).map((item: any) => {
      if (item.date !== todayString && filterDate !== 'Tất cả') {
        if (item.remain > 0) {
          item.missed += item.remain;
          item.remain = 0; 
        }
      }
      return item;
    });

    if (searchPatient) {
      finalArr = finalArr.filter((item: any) => item.patientId.toLowerCase().includes(searchPatient.toLowerCase()));
    }
    return finalArr.sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [logsData, remindData, filterDate, searchPatient]);

  // 🔥 QUẢN LÝ PHÂN TRANG (PAGINATION)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; 
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset về trang 1 khi đổi filter
  useEffect(() => { setCurrentPage(1); }, [filterDate, searchPatient, processedData]);

  const fSize = isMobile && !isZoomed ? 10 : 13; 

  const getIndColStyle = (colType: string) => {
    if (isMobile && isZoomed) {
      const pxWidths: any = { id: 80, name: 180, date: 90, total: 80, used: 80, snoozed: 80, missed: 80, remain: 90, rate: 100 };
      return { width: pxWidths[colType] };
    } else {
      const pctWidths: any = { id: '9%', name: '21%', date: '10%', total: '9%', used: '9%', snoozed: '9%', missed: '9%', remain: '11%', rate: '13%' };
      return { width: pctWidths[colType] };
    }
  };

  const renderIndividualTable = () => (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <FlatList 
        data={paginatedData} 
        showsVerticalScrollIndicator={false} 
        style={{ flex: 1 }} 
        keyExtractor={(item: any, index) => index.toString()} 
        stickyHeaderIndices={[0]} 
        ListHeaderComponent={
          <View style={styles.tableHeaderRow}>
            <View style={[styles.headerCell, getIndColStyle('id')]}><Text style={styles.headerText}>MÃ BN</Text></View>
            <View style={[styles.headerCell, getIndColStyle('name'), { alignItems: 'flex-start' }]}><Text style={styles.headerText}>SẢN PHẨM</Text></View>
            <View style={[styles.headerCell, getIndColStyle('date')]}><Text style={styles.headerText}>NGÀY</Text></View>
            <View style={[styles.headerCell, getIndColStyle('total')]}><Text style={styles.headerText}>TỔNG CỮ</Text></View>
            <View style={[styles.headerCell, getIndColStyle('used')]}><Text style={styles.headerText}>ĐÃ DÙNG</Text></View>
            <View style={[styles.headerCell, getIndColStyle('snoozed')]}><Text style={styles.headerText}>NHẮC LẠI</Text></View>
            <View style={[styles.headerCell, getIndColStyle('missed')]}><Text style={styles.headerText}>BỎ QUA</Text></View>
            <View style={[styles.headerCell, getIndColStyle('remain')]}><Text style={styles.headerText}>CÒN LẠI</Text></View>
            <View style={[styles.headerCell, getIndColStyle('rate'), { borderRightWidth: 0 }]}><Text style={styles.headerText}>TỶ LỆ</Text></View>
          </View>
        }
        renderItem={({ item, index }: any) => {
          const rate = item.total > 0 ? Math.round((item.used / item.total) * 100) : 0;
          const rateColor = rate >= 80 ? colors.statusDone : (rate >= 50 ? colors.statusSnooze : colors.statusMissed);
          
          return (
            <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
              <View style={[styles.dataCell, getIndColStyle('id')]}>
                <Text style={[styles.dataText, { fontWeight: '700', color: colors.info, fontSize: fSize }]} numberOfLines={1}>{item.patientId}</Text>
              </View>
              <View style={[styles.dataCell, getIndColStyle('name'), { alignItems: 'flex-start' }]}>
                <Text style={[styles.dataText, { fontWeight: '800', color: colors.primary, fontSize: fSize }]} numberOfLines={2}>{item.medicine}</Text>
              </View>
              <View style={[styles.dataCell, getIndColStyle('date')]}>
                <Text style={[styles.dataText, { color: colors.textMuted, fontSize: fSize - 1 }]}>{item.date}</Text>
              </View>
              
              <View style={[styles.dataCell, getIndColStyle('total')]}>
                <Text style={[styles.dataText, { fontWeight: '800', fontSize: fSize, color: colors.textDark }]}>{item.total}</Text>
              </View>
              
              <View style={[styles.dataCell, getIndColStyle('used')]}>
                {item.used > 0 ? <View style={styles.badgeUsed}><Text style={styles.badgeTextUsed}>{item.used}</Text></View> : <Text style={styles.zeroText}>0</Text>}
              </View>

              <View style={[styles.dataCell, getIndColStyle('snoozed')]}>
                {item.snoozed > 0 ? <View style={styles.badgeSnoozed}><Text style={styles.badgeTextSnoozed}>{item.snoozed}</Text></View> : <Text style={styles.zeroText}>0</Text>}
              </View>

              <View style={[styles.dataCell, getIndColStyle('missed')]}>
                {item.missed > 0 ? <View style={styles.badgeMissed}><Text style={styles.badgeTextMissed}>{item.missed}</Text></View> : <Text style={styles.zeroText}>0</Text>}
              </View>

              <View style={[styles.dataCell, getIndColStyle('remain')]}>
                {filterDate === 'Tất cả' ? <Text style={styles.zeroText}>-</Text> : (item.remain > 0 ? <View style={styles.badgeRemain}><Text style={styles.badgeTextRemain}>{item.remain}</Text></View> : <MaterialCommunityIcons name="check-all" size={20} color={colors.statusDone} />)}
              </View>

              <View style={[styles.dataCell, getIndColStyle('rate'), { borderRightWidth: 0 }]}>
                <View style={[styles.rateBadge, { backgroundColor: rateColor + '15' }]}>
                  <Text style={[styles.rateText, {color: rateColor, fontSize: fSize - 1}]}>{rate}%</Text>
                </View>
              </View>
            </View>
          );
        }} 
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="text-box-search-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>Không có dữ liệu cho bộ lọc này.</Text>
          </View>
        } 
      />

      {/* 🔥 THANH ĐIỀU HƯỚNG PHÂN TRANG */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.pageInfoText}>Hiển thị {paginatedData.length} / {processedData.length} bản ghi</Text>
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
      
      {/* THANH CÔNG CỤ FILTER */}
      <View style={styles.filterToolbar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          <TextInput style={styles.searchInput} placeholder="Tìm mã BN..." placeholderTextColor={colors.textMuted} value={searchPatient} onChangeText={setSearchPatient} outlineStyle="none" as any />
          {searchPatient !== '' && <TouchableOpacity onPress={() => setSearchPatient('')}><MaterialCommunityIcons name="close-circle" size={18} color={colors.border} /></TouchableOpacity>}
        </View>

        <View style={styles.dateFilterGroup}>
          <Text style={styles.filterLabel}>Lọc theo ngày:</Text>
          {['Hôm nay', 'Hôm qua', 'Tất cả'].map((label) => {
            const dateVal = label === 'Hôm nay' ? getTodayStr() : label === 'Hôm qua' ? getYesterdayStr() : 'Tất cả';
            return (
              <TouchableOpacity key={label} style={[styles.dateChip, filterDate === dateVal && styles.dateChipActive]} onPress={() => setFilterDate(dateVal)}>
                <Text style={[styles.dateChipText, filterDate === dateVal && styles.dateChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={[styles.searchBox, { width: 120, marginLeft: 4 }]}>
            <MaterialCommunityIcons name="calendar-month" size={18} color={colors.primary} />
            <TextInput style={[styles.searchInput, { color: colors.primary, fontWeight: '700' }]} placeholder="DD/MM/YYYY" placeholderTextColor={colors.textMuted} value={filterDate !== 'Tất cả' && filterDate !== getTodayStr() && filterDate !== getYesterdayStr() ? filterDate : ''} onChangeText={setFilterDate} outlineStyle="none" as any />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Theo Dõi Bệnh Nhân</Text>
        {isMobile && <TouchableOpacity onPress={() => setIsZoomed(!isZoomed)} style={[styles.zoomBtn, {backgroundColor: isZoomed ? colors.border : colors.primaryLight}]}><MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.textDark : colors.primary} /><Text style={[styles.zoomBtnText, {color: isZoomed ? colors.textDark : colors.primary}]}>{isZoomed ? "Thu nhỏ" : "Phóng to"}</Text></TouchableOpacity>}
      </View>

      <View style={styles.tableWrapper}>
        {isMobile && isZoomed ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ width: 850, flex: 1, backgroundColor: colors.surface }}>{renderIndividualTable()}</View>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', flex: 1, backgroundColor: colors.surface }}>{renderIndividualTable()}</View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1, paddingVertical: 15, width: '100%', flexDirection: 'column' },
  
  // Tối ưu Toolbar
  filterToolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'space-between' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, borderRadius: 8, width: 200, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.textDark },
  
  dateFilterGroup: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  filterLabel: { fontWeight: '600', color: colors.textMuted, marginRight: 4, fontSize: 13 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20 },
  dateChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  dateChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  dateChipTextActive: { color: colors.primary, fontWeight: '800' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  zoomBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  zoomBtnText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  
  tableWrapper: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCell: { paddingVertical: 14, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerText: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  rowEven: { backgroundColor: colors.surface }, 
  rowOdd: { backgroundColor: '#FAFAFA' },
  dataCell: { paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  dataText: { color: colors.textDark, fontSize: 13 },
  
  // Soft Badges
  badgeUsed: { backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  badgeTextUsed: { color: '#059669', fontWeight: '800', fontSize: 12 },
  badgeSnoozed: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  badgeTextSnoozed: { color: '#D97706', fontWeight: '800', fontSize: 12 },
  badgeMissed: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  badgeTextMissed: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
  badgeRemain: { backgroundColor: '#E0E7FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  badgeTextRemain: { color: '#4338CA', fontWeight: '800', fontSize: 12 },
  zeroText: { color: '#CBD5E1', fontWeight: '800' },
  
  rateBadge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', minWidth: 50 },
  rateText: { fontWeight: '800' },
  
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