import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../app/_layout'; // 🔥 NHÚNG BỘ NÃO DARK MODE

export default function ChartSection({ labels, lineData, barData }: any) {
  const { theme, isDark } = useTheme(); // Lấy màu từ Theme
  const { width } = useWindowDimensions();
  const isMobile = width < 1200;
  
  const chartLabels = labels && labels.length > 0 ? labels : ['24', '25', '26', '27', '28', '29', '30'];
  const bData = barData && barData.length > 0 ? barData : [0, 0, 0, 0, 0, 0, 0];
  const lData = lineData && lineData.length > 0 ? lineData : [92, 92, 91, 91, 92, 88, 90]; 

  const xPositions = [0, 16.66, 33.33, 50, 66.66, 83.33, 100];
  
  const pathD = lData.map((y: number, i: number) => `${i === 0 ? 'M' : 'L'} ${xPositions[i]} ${100 - y}`).join(' ');
  const maxBarValue = Math.max(...bData, 4); 

  // Tùy chỉnh màu sắc đường lưới dựa trên chế độ sáng/tối
  const gridLineColor = isDark ? '#334155' : '#F1F5F9';

  return (
    <View style={[styles.container, isMobile && { flexDirection: 'column' }]}>
      
      {/* --- BIỂU ĐỒ ĐƯỜNG --- */}
      <View style={[styles.card, { flex: 2, minWidth: isMobile ? '100%' : '60%', backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Xu hướng tuân thủ <Text style={styles.cardSubtitle}>(7 ngày)</Text></Text>
        <View style={styles.chartArea}>
          <View style={styles.yAxis}>{['100%', '50%', '0%'].map((lbl, i) => <Text key={i} style={styles.axisLabel}>{lbl}</Text>)}</View>
          <View style={styles.gridArea}>
            {[0, 50, 100].map((top, i) => <View key={i} style={[styles.gridLine, { top: `${top}%`, backgroundColor: gridLineColor }]} />)}
            
            <View style={[styles.targetLine, { top: '10%' }]} />
            <Text style={[styles.targetLabel, { backgroundColor: theme.surface }]}>Mục tiêu ≥ 90%</Text>
            
            <View style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <Path d={pathD} fill="none" stroke="#DC2626" strokeWidth="2" />
              </Svg>
              {lData.map((y: number, i: number) => (
                <View key={i} style={[styles.dot, { left: `${xPositions[i]}%`, top: `${100 - y}%`, transform: [{ translateX: -3 }, { translateY: -3 }], borderColor: theme.surface }]} />
              ))}
            </View>
            
            <View style={styles.xAxis}>{chartLabels.map((date: string, i: number) => <View key={i} style={{ width: 30, alignItems: 'center', position: 'absolute', left: `${xPositions[i]}%`, transform: [{ translateX: -15 }] }}><Text style={styles.axisLabel}>{date}</Text></View>)}</View>
          </View>
        </View>
      </View>

      {/* --- BIỂU ĐỒ CỘT --- */}
      <View style={[styles.card, { flex: 1, minWidth: isMobile ? '100%' : '35%', backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>BN mới <Text style={styles.cardSubtitle}>(7 ngày)</Text></Text>
        <View style={styles.chartArea}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{maxBarValue}</Text>
            <Text style={styles.axisLabel}>{Math.round(maxBarValue / 2)}</Text>
            <Text style={styles.axisLabel}>0</Text>
          </View>
          <View style={styles.gridArea}>
            {[0, 50, 100].map((top, i) => <View key={i} style={[styles.gridLine, { top: `${top}%`, backgroundColor: gridLineColor }]} />)}
            
            <View style={styles.barContainer}>
              {bData.map((val: number, i: number) => {
                const heightPercent = maxBarValue === 0 ? 0 : (val / maxBarValue) * 100;
                return (
                  <View key={i} style={styles.barWrapper}>
                    <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                  </View>
                );
              })}
            </View>

            <View style={styles.xAxis}>{chartLabels.map((date: string, i: number) => <View key={i} style={{ width: 30, alignItems: 'center', position: 'absolute', left: `${xPositions[i]}%`, transform: [{ translateX: -15 }] }}><Text style={styles.axisLabel}>{date}</Text></View>)}</View>
          </View>
        </View>
      </View>

    </View>
  );
}

// Bỏ màu viền, màu chữ fix cứng đi vì đã được set inline theo biến `theme` ở trên
const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 16, flex: 1 },  
  card: { borderRadius: 16, padding: 16, paddingBottom: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1, flex: 1, display: 'flex', flexDirection: 'column' },
  cardTitle: { fontSize: 13, fontWeight: '800', marginBottom: 12 }, cardSubtitle: { fontSize: 11, fontWeight: '500', color: '#64748B' },
  chartArea: { flexDirection: 'row', flex: 1, minHeight: 100 }, 
  yAxis: { justifyContent: 'space-between', paddingRight: 8, alignItems: 'flex-end', height: '100%' }, axisLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  gridArea: { flex: 1, position: 'relative' }, gridLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  targetLine: { position: 'absolute', left: 0, right: 0, height: 0, borderWidth: 1, borderColor: '#DC2626', borderStyle: 'dashed' }, targetLabel: { position: 'absolute', top: '1%', right: 0, fontSize: 8, fontWeight: '800', color: '#DC2626', paddingLeft: 2 },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', borderWidth: 1.5 },
  barContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4 }, barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }, barFill: { width: 5, backgroundColor: '#3B82F6', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  xAxis: { position: 'absolute', bottom: -16, left: 0, right: 0, height: 12, flexDirection: 'row' }
});