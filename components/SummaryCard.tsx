import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

export default function SummaryCard({ title, value, icon, color, bgColor, trendText, isTrendUp, actionText, hasSparkline, sparklineColor, isLoading }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: bgColor }]}><MaterialCommunityIcons name={icon} size={20} color={color} /></View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="small" color={color} style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
      ) : (
        <Text style={styles.cardValue}>{value}</Text>
      )}

      <View style={{ flex: 1 }} />
      
      {trendText && (
        <View style={[styles.trendBadge, isTrendUp ? styles.trendUpBg : styles.trendNeutralBg]}>
          {isTrendUp !== undefined && <MaterialCommunityIcons name={isTrendUp ? "arrow-up" : "arrow-down"} size={12} color={isTrendUp ? "#10B981" : "#64748B"} />}
          <Text style={[styles.trendText, { color: isTrendUp ? "#10B981" : "#64748B" }]}>{trendText}</Text>
        </View>
      )}
      {actionText && (
        <TouchableOpacity style={styles.actionLink}>
          <Text style={[styles.actionLinkText, { color: color }]}>{actionText}</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={color} />
        </TouchableOpacity>
      )}
      {hasSparkline && (
        <View style={styles.sparklineContainer}>
           <Svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
             <Path d="M0 25 Q 10 20, 20 25 T 40 15 T 60 20 T 80 5 T 100 10" fill="none" stroke={sparklineColor} strokeWidth="2" />
           </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, minHeight: 120, position: 'relative', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }, cardTitle: { fontSize: 13, fontWeight: '600', color: '#475569' }, cardValue: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginBottom: 4, letterSpacing: -1 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }, trendUpBg: { backgroundColor: '#ECFDF5' }, trendNeutralBg: { backgroundColor: 'transparent', paddingHorizontal: 0 }, trendText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  actionLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }, actionLinkText: { fontSize: 12, fontWeight: '700', marginRight: 4 },
  sparklineContainer: { position: 'absolute', bottom: 12, right: 16, width: 80, height: 30 },
});