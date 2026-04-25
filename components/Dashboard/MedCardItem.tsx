import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'; // Thêm Image
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

  return (
    <View style={styles.medCard}>
      <View style={styles.headerBlock}>
        <View style={styles.iconBox}>
          {/* 🔥 LOGIC HIỂN THỊ ẢNH THÔNG MINH 🔥 */}
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
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' }, // Thêm overflow hidden
  medImage: { width: '100%', height: '100%' }, // Style cho ảnh thuốc
  infoBlock: { flex: 1 },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  doseText: { fontSize: 14, color: colors.textLight, fontWeight: '500' },
  timeBubblesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5 },
  bubblePending: { backgroundColor: '#F8FAFC', borderColor: colors.primary },
  bubbleDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  timeText: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  textPending: { color: colors.primary },
  textDone: { color: 'white' }
});