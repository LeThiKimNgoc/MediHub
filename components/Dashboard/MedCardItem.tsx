import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getEyeIndicator, getMedIcon } from '../../utils/helpers';
interface MedCardItemProps {
  item: any;
  isDoneToday: boolean;
  onPress: () => void;
}

export const MedCardItem: React.FC<MedCardItemProps> = ({ item, isDoneToday, onPress }) => {
  const eyeInfo = getEyeIndicator(item.Usage || item.Dose);

  return (
    <View style={[styles.medCard, isDoneToday && { opacity: 0.6, backgroundColor: '#F8FAFC' }]}>
      <View style={styles.timeBlock}>
        <Text style={[styles.timeText, isDoneToday && { color: colors.textLight }]}>{item.Time}</Text>
      </View>
      <View style={styles.infoBlock}>
        <Text style={[styles.medName, isDoneToday && { textDecorationLine: 'line-through' }]} numberOfLines={2}>
          {item.MedicineName}
        </Text>
        {eyeInfo && (
          <View style={[styles.eyeBadge, { backgroundColor: eyeInfo.color }]}>
            <Text style={styles.eyeBadgeText}>{eyeInfo.label}</Text>
          </View>
        )}
      </View>
      {!isDoneToday ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
          <MaterialCommunityIcons name={getMedIcon(item) as any} size={24} color="white" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.actionBtn, { backgroundColor: '#10B981' }]}>
          <MaterialCommunityIcons name="check" size={24} color="white" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  medCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, marginHorizontal: 20, elevation: 2, alignItems: 'center' },
  timeBlock: { width: 70, borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingRight: 10, alignItems: 'center' },
  timeText: { fontSize: 20, fontWeight: 'bold', color: colors.timeColor },
  infoBlock: { flex: 1, paddingLeft: 15 },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark },
  eyeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }
});