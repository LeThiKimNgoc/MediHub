import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getEyeIndicator, getMedIcon } from '../../utils/helpers';

interface MedCardItemProps {
  item: any;
  historyLogs: any[];
  onPressTime: (med: any, time: string) => void;
}

export const MedCardItem: React.FC<MedCardItemProps> = ({ item, historyLogs, onPressTime }) => {
  const eyeInfo = getEyeIndicator(item.Usage || item.Dose);
  const todayStr = new Date().getDate().toString().padStart(2, '0');

  // 🔥 THUẬT TOÁN KẾ TOÁN KHO & LIỆU TRÌNH TỰ ĐỘNG 🔥
  const inventoryData = useMemo(() => {
    // 1. Nhận diện loại thuốc dựa vào Liều hoặc Cách dùng
    const doseStr = (item.Dose || '').toLowerCase();
    const usageStr = (item.Usage || '').toLowerCase();
    const isEyeDrop = doseStr.includes('giọt') || doseStr.includes('cm') || doseStr.includes('ml') || usageStr.includes('mắt');
    
    if (isEyeDrop) {
      // 🟢 XỬ LÝ THEO SỐ NGÀY LIỆU TRÌNH (Thuốc nước/Mỡ)
      const totalDays = parseInt(item.Duration) || 0;
      let remainingDays = totalDays;

      if (item.StartDate && totalDays > 0) {
        const parts = item.StartDate.split('/');
        if (parts.length === 3) {
          // Parse ngày bắt đầu (StartDate) từ Google Sheet
          const startD = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          const today = new Date();
          
          // Đưa về cùng mốc 0h00 để trừ ngày cho chuẩn
          startD.setHours(0,0,0,0);
          today.setHours(0,0,0,0);
          
          const diffTime = today.getTime() - startD.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          remainingDays = Math.max(0, totalDays - diffDays);
        }
      }
      return { type: 'days', total: totalDays, remain: remainingDays };
    } 
    else {
      // 🟢 XỬ LÝ THEO SỐ LƯỢNG VIÊN/CÁI (Trừ lùi kho)
      const totalQty = parseFloat(item.Quantity) || 0;
      
      // Tách con số ra khỏi chữ (Ví dụ: "1,5 viên" -> 1.5)
      const doseMatch = item.Dose ? String(item.Dose).match(/[\d,.]+/) : null;
      const doseAmount = doseMatch ? parseFloat(doseMatch[0].replace(',', '.')) : 1;
      
      // Tách đơn vị tính (Ví dụ: "1,5 viên" -> "viên")
      let unitStr = item.Dose ? item.Dose.replace(/[\d,.\s-]/g, '').trim() : '';
      if (!unitStr) unitStr = 'viên';

      // Lọc lịch sử để tìm các lần ĐÃ UỐNG của thuốc này
      const medLogs = historyLogs.filter(log => log.MedicineName === item.MedicineName && log.Status === 'Đã sử dụng');
      
      // Tổng đã dùng = Số lần uống x Liều lượng 1 lần
      const usedQty = medLogs.length * doseAmount;
      const remainingQty = Math.max(0, totalQty - usedQty);

      // Sửa lỗi số lẻ nhiều số 0 (ví dụ 1.5000000)
      const formattedRemain = Number.isInteger(remainingQty) ? remainingQty : remainingQty.toFixed(1);

      return { type: 'qty', total: totalQty, remain: formattedRemain, unit: unitStr };
    }
  }, [item, historyLogs]);

  return (
    <View style={styles.medCard}>
      <View style={styles.headerBlock}>
        <View style={styles.iconBox}>
          {item.ImageUrl ? (
            <Image 
              source={{ uri: item.ImageUrl }} 
              style={styles.medImage} 
              resizeMode="cover" 
            />
          ) : (
            <MaterialCommunityIcons name={getMedIcon(item) as any} size={28} color={colors.primary} />
          )}
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.medName} numberOfLines={2}>{item.MedicineName}</Text>
          
          <View style={styles.metaRow}>
            {eyeInfo && (
              <View style={[styles.eyeBadge, { backgroundColor: eyeInfo.color }]}>
                <Text style={styles.eyeBadgeText}>{eyeInfo.label}</Text>
              </View>
            )}
            <Text style={styles.doseText}>Liều: {item.Dose}</Text>
          </View>

          {/* 🔥 GIAO DIỆN HIỂN THỊ KHO THUỐC / LIỆU TRÌNH 🔥 */}
          {inventoryData.total > 0 && (
            <View style={[styles.inventoryBadge, inventoryData.remain === 0 && styles.inventoryEmpty]}>
              <MaterialCommunityIcons 
                  name={inventoryData.type === 'days' ? "calendar-clock" : "package-variant-closed"} 
                  size={14} 
                  color={inventoryData.remain === 0 ? "#EF4444" : "#64748B"} 
              />
              <Text style={[styles.inventoryText, inventoryData.remain === 0 && {color: '#EF4444'}]}>
                {inventoryData.type === 'days' 
                  ? `Liệu trình: Còn ${inventoryData.remain}/${inventoryData.total} ngày`
                  : `Kho: Còn ${inventoryData.remain}/${inventoryData.total} ${inventoryData.unit}`
                }
              </Text>
            </View>
          )}

        </View>
      </View>

      <View style={styles.timeBubblesContainer}>
        {item.timeArray && item.timeArray.map((time: string, index: number) => {
          const isDone = historyLogs.some(log => 
            log.MedicineName === item.MedicineName && 
            log.PlannedTime === time && 
            log.Status === 'Đã sử dụng' && 
            log.Timestamp?.includes(todayStr)
          );

          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.timeBubble, isDone ? styles.bubbleDone : styles.bubblePending]}
              onPress={() => !isDone && onPressTime(item, time)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name={isDone ? "check-circle" : "clock-outline"} size={16} color={isDone ? "white" : colors.primary} />
              <Text style={[styles.timeText, isDone ? styles.textDone : styles.textPending]}>{time}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  medCard: { backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 15, marginHorizontal: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  headerBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' }, 
  medImage: { width: '100%', height: '100%' }, 
  infoBlock: { flex: 1 },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }, // Thêm marginBottom để cách Kho thuốc ra
  eyeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  doseText: { fontSize: 14, color: colors.textLight, fontWeight: '500' },
  
  // 🔥 CSS BẢNG KHO THUỐC 🔥
  inventoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' },
  inventoryEmpty: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }, // Đổi màu đỏ nếu thuốc hết
  inventoryText: { fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 4 },

  timeBubblesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5 },
  bubblePending: { backgroundColor: '#F8FAFC', borderColor: colors.primary },
  bubbleDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  timeText: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  textPending: { color: colors.primary },
  textDone: { color: 'white' }
});