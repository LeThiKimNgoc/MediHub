import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../app/_layout'; // 🔥 GỌI BỘ NÃO DARK MODE

export default function AdherenceCard({ value, trend, trendValue }: any) {
  const { theme, isDark } = useTheme(); // 🔥 LẤY MÀU TỪ THEME

  // Lấy con số thực tế từ chuỗi (vd: "3%" -> 3)
  const numericValue = parseInt(String(value).replace('%', ''), 10) || 0;
  
  // Tính góc quay (Tối đa 90 độ cho 1/4 vòng tròn hiện tại)
  const rotationDegree = Math.min((numericValue / 100) * 360, 90);

  // Tùy chỉnh màu cảnh báo: Đỏ tươi (Sáng) / Đỏ dịu (Tối)
  const dangerBg = isDark ? '#450a0a' : '#FEE2E2'; 
  const dangerText = isDark ? '#f87171' : '#DC2626';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Tuân thủ chung</Text>
        <MaterialCommunityIcons name="information-outline" size={14} color={theme.muted} style={{ marginLeft: 4 }} />
      </View>
      
      <View style={styles.contentRow}>
        <View style={styles.leftCol}>
          <Text style={[styles.percentageText, { color: dangerText }]}>{value}</Text>
          <View style={[styles.targetBadge, { backgroundColor: dangerBg }]}>
            <Text style={[styles.targetText, { color: dangerText }]}>Mục tiêu ≥ 90%</Text>
          </View>
        </View>
        
        <View style={styles.rightCol}>
          <View style={[styles.circleTrack, { backgroundColor: isDark ? '#334155' : '#FEF2F2' }]}>
            {/* Vệt đỏ quay theo % thật */}
            <View style={[styles.circleFill, { backgroundColor: dangerText, transform: [{ rotate: `${rotationDegree}deg` }] }]} />
            <View style={[styles.circleInner, { backgroundColor: theme.surface }]}>
              <Text style={[styles.circleValue, { color: theme.text }]}>{value}</Text>
              <Text style={[styles.circleLabel, { color: theme.muted }]}>Hiện tại</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <MaterialCommunityIcons name={trend === 'up' ? "arrow-up" : "arrow-down"} size={12} color={trend === 'up' ? "#10B981" : "#EF4444"} />
        <Text style={[styles.trendText, { color: theme.muted }]}>
          <Text style={{ color: trend === 'up' ? "#10B981" : "#EF4444", fontWeight: '700' }}>{trendValue}</Text> so với tuần trước
        </Text>
      </View>
    </View>
  );
}

// Bỏ các màu cứng (#FFF, #000...) để xài biến theme ở trên
const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, 
  title: { fontSize: 13, fontWeight: '700' },
  contentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, leftCol: { flex: 1 },
  percentageText: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  targetBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' }, 
  targetText: { fontSize: 9, fontWeight: '700' },
  rightCol: { alignItems: 'center', justifyContent: 'center', paddingRight: 4 },
  circleTrack: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  circleFill: { position: 'absolute', top: 0, right: 0, width: 35, height: 35, borderTopRightRadius: 35 },
  circleInner: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  circleValue: { fontSize: 16, fontWeight: '900', letterSpacing: -1 }, 
  circleLabel: { fontSize: 9, fontWeight: '500', marginTop: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopWidth: 1 }, 
  trendText: { fontSize: 10, marginLeft: 4 }
});