import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../app/_layout'; // 🔥 NHẬN THEME TOÀN CỤC

export default function StatCard({ label, value, color, iconName, trendHighlight, trendText }: any) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={iconName} size={20} color={color} />
        </View>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <Text style={styles.trendText}>
        <Text style={{ color: theme.primary, fontWeight: '700' }}>{trendHighlight}</Text> {trendText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderWidth: 1, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginLeft: 10 },
  value: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  trendText: { fontSize: 11, color: '#94A3B8' }
});