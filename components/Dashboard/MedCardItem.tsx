import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getEyeIndicator, getMedIcon } from '../../utils/helpers';

interface MedCardItemProps {
  item: any;
  historyLogs: any[]; // Nhận lịch sử để kiểm tra từng giờ
  onPressTime: (med: any, time: string) => void; // Hàm khi bấm vào 1 giờ cụ thể
}

export const MedCardItem: React.FC<MedCardItemProps> = ({ item, historyLogs, onPressTime }) => {
  const eyeInfo = getEyeIndicator(item.Usage || item.Dose);
  
  // Lấy ngày hôm nay để check log
  const todayStr = new Date().getDate().toString().padStart(2, '0');

  return (
    <View style={styles.medCard}>
      {/* PHẦN ĐẦU: THÔNG TIN THUỐC */}
      <View style={styles.headerBlock}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={getMedIcon(item) as any} size={28} color={colors.primary} />
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
        </View>
      </View>

      {/* PHẦN DƯỚI: BONG BÓNG THỜI GIAN (TIME BUBBLES) */}
      <View style={styles.timeBubblesContainer}>
        {item.timeArray && item.timeArray.map((time: string, index: number) => {
          
          // Kiểm tra xem giờ này đã uống chưa
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
              onPress={() => !isDone && onPressTime(item, time)} // Đã uống rồi thì không cho bấm lại
              activeOpacity={0.7}
            >
              {isDone ? (
                <MaterialCommunityIcons name="check" size={16} color="white" />
              ) : (
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
              )}
              <Text style={[styles.timeText, isDone ? styles.textDone : styles.textPending]}>
                {time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  medCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 15, marginHorizontal: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  headerBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoBlock: { flex: 1 },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  doseText: { fontSize: 14, color: colors.textLight, fontWeight: '500' },
  
  timeBubblesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5 },
  bubblePending: { backgroundColor: 'white', borderColor: colors.primary },
  bubbleDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  timeText: { fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  textPending: { color: colors.primary },
  textDone: { color: 'white' }
});