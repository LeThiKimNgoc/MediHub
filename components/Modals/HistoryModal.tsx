import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getMedIcon } from '../../utils/helpers';

interface HistoryModalProps {
  visible: boolean;
  historyLogs: any[];
  medications?: any[]; 
  loadingHistory: boolean;
  onClose: () => void;
}

// --- HÀM HỖ TRỢ XỬ LÝ NGÀY THÁNG ---
const getTodayStr = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const normalizeDateStr = (dateStr: string) => {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
  return dateStr.split(' ')[0]; 
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, historyLogs, medications = [], loadingHistory, onClose }) => {
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [customDateInput, setCustomDateInput] = useState('');

  // 🔥 LỌC DANH SÁCH CHI TIẾT
  const filteredLogs = useMemo(() => {
    let result = [...historyLogs];
    result.reverse();

    if (filterDate !== 'Tất cả') {
      result = result.filter((log: any) => {
        const rawDate = String(log.Timestamp || log.Date || log.Time || log.Ngay || '').trim();
        const normDate = normalizeDateStr(rawDate);
        return normDate.includes(filterDate) || rawDate.includes(filterDate);
      });
    }
    return result;
  }, [historyLogs, filterDate]);

  // 🔥 THUẬT TOÁN TÍNH "BỎ LỠ" CHO NGÀY TÙY CHỌN
  const summaryData = useMemo(() => {
    const summary: any[] = [];
    const today = new Date();
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    
    // Kiểm tra xem ngày đang lọc có phải là ngày hôm nay không
    const isToday = filterDate === getTodayStr();

    medications.forEach(med => {
      const medName = med.MedicineName;
      const total = med.timeArray ? med.timeArray.length : 0;
      let used = 0;
      let missed = 0;

      const medLogs = filteredLogs.filter(log => log.MedicineName === medName);
      const latestStatusMap: Record<string, string> = {};
      
      medLogs.forEach(log => {
        latestStatusMap[log.PlannedTime] = log.Status;
      });

      if (med.timeArray) {
        const sortedTimes = [...med.timeArray].sort();
        sortedTimes.forEach((time: string, index: number) => {
           const status = (latestStatusMap[time] || '').toLowerCase();
           
           if (status.includes('đã dùng') || status.includes('hoàn thành') || status.includes('xác nhận')) {
               used++;
           } else if (status.includes('bỏ qua') || status.includes('missed') || status.includes('không')) {
               missed++;
           } else {
               // LUẬT THÔNG MINH:
               if (!isToday) {
                   // Nếu là ngày quá khứ, chưa dùng mặc định là Bỏ lỡ
                   missed++;
               } else {
                   // Nếu là ngày hôm nay, phải kiểm tra xem đã trễ quá 60p chưa
                   const [h, m] = time.split(':').map(Number);
                   const doseMinutes = h * 60 + (m || 0);
                   let expWindow = 60; 
                   if (index < sortedTimes.length - 1) {
                       const [nh, nm] = sortedTimes[index + 1].split(':').map(Number);
                       expWindow = Math.min(60, Math.floor((nh * 60 + nm - doseMinutes) / 2));
                   }
                   if (currentMinutes > (doseMinutes + expWindow)) missed++;
               }
           }
        });
      }
      summary.push({ medName, total, used, missed });
    });

    return summary;
  }, [filteredLogs, medications, filterDate]);

  const renderSummaryBoard = () => {
    if (!summaryData || summaryData.length === 0) return null;
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeaderRow}>
           <Text style={[styles.colHeader, {flex: 2, textAlign: 'left'}]}>Sản phẩm</Text>
           <Text style={styles.colHeader}>Tổng</Text>
           <Text style={styles.colHeader}>Đã dùng</Text>
           <Text style={styles.colHeader}>Bỏ lỡ</Text>
        </View>
        {summaryData.map((item, index) => (
          <View key={item.medName} style={[styles.summaryDataRow, index % 2 === 1 && {backgroundColor: '#F8FAFC'}]}>
             <Text style={styles.colMedName} numberOfLines={1}>{item.medName}</Text>
             <View style={styles.colStatBox}><Text style={styles.colStatText}>{item.total}</Text></View>
             <View style={styles.colStatBox}><View style={[styles.miniBadge, {backgroundColor: item.used > 0 ? '#D1FAE5' : '#F1F5F9'}]}><Text style={[styles.miniBadgeText, {color: item.used > 0 ? '#10B981' : '#94A3B8'}]}>{item.used}</Text></View></View>
             <View style={styles.colStatBox}><View style={[styles.miniBadge, {backgroundColor: item.missed > 0 ? '#FEE2E2' : '#F1F5F9'}]}><Text style={[styles.miniBadgeText, {color: item.missed > 0 ? '#EF4444' : '#94A3B8'}]}>{item.missed}</Text></View></View>
          </View>
        ))}
        <View style={styles.divider}><Text style={styles.dividerText}>Nhật ký chi tiết</Text><View style={styles.dividerLine} /></View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const medOrigin = medications.find(m => m.MedicineName === item.MedicineName);
    const iconName = medOrigin ? getMedIcon(medOrigin) : "pill"; 
    const isEyeDrop = iconName === 'water' || iconName === 'eye-drop';
    let statusColor = '#10B981', statusBg = '#D1FAE5', statusIcon = 'check-decagram';
    if (item.Status === 'Bỏ lỡ' || item.Status === 'Bỏ qua') { statusColor = '#EF4444'; statusBg = '#FEE2E2'; statusIcon = 'close-circle'; }
    else if (item.Status === 'Nhắc lại' || item.Status === 'Chưa sử dụng') { statusColor = '#F59E0B'; statusBg = '#FEF3C7'; statusIcon = 'alarm-snooze'; }

    return (
      <View style={styles.logCard}>
        <View style={[styles.iconBox, isEyeDrop ? {backgroundColor: '#E0F2FE'} : {backgroundColor: '#F0F9FF'}]}>
           <MaterialCommunityIcons name={iconName as any} size={28} color={isEyeDrop ? '#0284C7' : '#0ea5e9'} />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.medName}>{item.MedicineName}</Text>
          <View style={styles.timeRow}><MaterialCommunityIcons name="calendar-clock" size={14} color={colors.textLight} /><Text style={styles.plannedTime}>Cữ: {item.PlannedTime}</Text></View>
          <Text style={styles.timestamp}>Lúc: {item.Timestamp}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}><MaterialCommunityIcons name={statusIcon as any} size={20} color={statusColor} /><Text style={[styles.statusText, { color: statusColor }]}>{item.Status}</Text></View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
             <View><Text style={styles.title}>Lịch Sử Sử Dụng</Text><Text style={styles.subtitle}>Ghi nhận quá trình uống thuốc</Text></View>
             <TouchableOpacity style={styles.closeBtn} onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={colors.textDark} /></TouchableOpacity>
          </View>

          {/* 🔥 BỘ LỌC NGÀY NÂNG CẤP 🔥 */}
          <View style={styles.filterContainer}>
            <View style={styles.fastFilterRow}>
                {['Hôm nay', 'Hôm qua'].map((label) => {
                   const dateVal = label === 'Hôm nay' ? getTodayStr() : getYesterdayStr();
                   return (
                    <TouchableOpacity key={label} style={[styles.chip, filterDate === dateVal && styles.chipActive]} onPress={() => { setFilterDate(dateVal); setCustomDateInput(''); }}>
                        <Text style={[styles.chipText, filterDate === dateVal && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                   )
                })}
            </View>
            <View style={styles.customDateBox}>
                <MaterialCommunityIcons name="calendar-search" size={20} color={colors.primary} />
                <TextInput 
                    style={styles.dateInput} 
                    placeholder="DD/MM/YYYY" 
                    value={customDateInput}
                    onChangeText={(val) => {
                        setCustomDateInput(val);
                        if (val.length === 10) setFilterDate(val);
                    }}
                    placeholderTextColor="#94A3B8"
                />
            </View>
          </View>

          {loadingHistory ? (
             <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
          ) : (
             <FlatList
               data={filteredLogs}
               keyExtractor={(item, index) => index.toString()}
               ListHeaderComponent={renderSummaryBoard} 
               renderItem={renderItem}
               contentContainerStyle={{ paddingBottom: 20 }}
               showsVerticalScrollIndicator={false}
               ListEmptyComponent={
                 <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="clipboard-text-off-outline" size={50} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Không tìm thấy dữ liệu.</Text>
                 </View>
               }
             />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%', minHeight: '60%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 20 },
  
  // STYLE BỘ LỌC MỚI
  filterContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  fastFilterRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 15, backgroundColor: '#F1F5F9' },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: 'white' },
  customDateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, paddingHorizontal: 12, height: 40 },
  dateInput: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: 'bold', color: colors.textDark, outlineStyle: 'none' },

  summaryContainer: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  summaryHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 5 },
  colHeader: { flex: 1, fontSize: 12, fontWeight: '800', color: '#64748B', textAlign: 'center' },
  summaryDataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  colMedName: { flex: 2, fontSize: 14, fontWeight: '700', color: colors.textDark, paddingLeft: 5 },
  colStatBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  colStatText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  miniBadge: { width: 34, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  miniBadgeText: { fontSize: 13, fontWeight: '900' },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 25, marginBottom: 15 },
  dividerText: { fontSize: 14, fontWeight: '800', color: '#94A3B8', marginRight: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },

  logCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 15 },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  logInfo: { flex: 1 },
  medName: { fontSize: 17, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  plannedTime: { fontSize: 14, color: colors.textLight, marginLeft: 6, fontWeight: '600' },
  timestamp: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  statusBadge: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minWidth: 85 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#94A3B8', fontWeight: '500' }
});