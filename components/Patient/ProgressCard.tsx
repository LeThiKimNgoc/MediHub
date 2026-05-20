import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const CircularProgress = ({ size, strokeWidth, percentage, color }: any) => {
  const radius = (size - strokeWidth) / 2; 
  const circum = radius * 2 * Math.PI; 
  const svgProgress = 100 - percentage;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle stroke="rgba(255,255,255,0.2)" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <Circle stroke={color} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeDasharray={`${circum} ${circum}`} strokeDashoffset={radius * Math.PI * 2 * (svgProgress / 100)} strokeLinecap="round" transform={`rotate(-90, ${size / 2}, ${size / 2})`} />
      </Svg>
      <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>{percentage}<Text style={{ fontSize: 10 }}>%</Text></Text>
      </View>
    </View>
  );
};

export default function ProgressCard({ progress }: { progress: { completed: number, total: number, percent: number } }) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressContent}>
        <View>
          <Text style={styles.progressTitle}>TIẾN ĐỘ HÔM NAY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
            <Text style={styles.progressBigNumber}>{progress.completed}</Text>
            <Text style={styles.progressSmallNumber}>/{progress.total}</Text>
          </View>
          <Text style={styles.progressSubtitle}>lịch trình hoàn thành</Text>
        </View>
        <CircularProgress size={60} strokeWidth={6} percentage={progress.percent} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: { backgroundColor: '#00A991', borderRadius: 20, padding: 16, elevation: 4, marginBottom: 16 },
  progressContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' },
  progressBigNumber: { color: '#FFF', fontSize: 32, fontWeight: '900' },
  progressSmallNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '700' },
  progressSubtitle: { color: '#FFF', fontSize: 12, fontWeight: '500' }
});