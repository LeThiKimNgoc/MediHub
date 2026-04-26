import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';

const colors = {
  carbonDark: '#1E293B', textLight: '#78909C', statusDone: '#10B981',   
  statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#0284C7', white: '#FFFFFF'
};

export const SyntheticTab = ({ syntheticData, individualData, isDesktop, chartWidth }: any) => {
  if (!syntheticData || !syntheticData.Total_Patients) return (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="chart-box-outline" size={80} color="#E1BEE7" />
      <Text style={styles.loadingText}>Chưa có đủ dữ liệu để vẽ biểu đồ thống kê.</Text>
      <Text style={styles.hintText}>Hãy gán thuốc và ghi nhận lịch sử trước nhé.</Text>
    </View>
  );
  
  let avgAdherence = parseFloat(syntheticData.Average_Adherence?.toString().replace('%', '') || '0');
  const totalReminders = parseInt(syntheticData.Total_Reminders) || 0;
  const totalUsed = parseInt(syntheticData.Total_Used_Clicks) || 0;
  const totalMissed = totalReminders - totalUsed > 0 ? totalReminders - totalUsed : 0;
  
  const pieData = [
    { name: 'Thành công', population: totalUsed, color: colors.statusDone, legendFontColor: colors.carbonDark, legendFontSize: 13 },
    { name: 'Bỏ lỡ', population: totalMissed, color: colors.statusMissed, legendFontColor: colors.carbonDark, legendFontSize: 13 }
  ];

  const bottom5Patients = individualData.slice(0, 5); 
  const barData = {
    labels: bottom5Patients.map((pt: any) => pt.PatientsID || 'N/A'),
    datasets: [{ data: bottom5Patients.map((pt: any) => parseFloat(pt.Average_Adherence?.replace('%', '') || '0')) }]
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Chỉ Số Tuân Thủ Tổng</Text>
      
      <View style={styles.mainCard}>
        <View style={styles.mainCardHeader}>
          <View><Text style={styles.mainCardTitle}>Tỷ Lệ Tuân Thủ Trung Bình</Text><Text style={styles.mainCardSub}>Average Adherence Rate</Text></View>
          <MaterialCommunityIcons name="heart-pulse" size={40} color={avgAdherence >= 80 ? colors.statusDone : (avgAdherence >= 50 ? colors.statusSnooze : colors.statusMissed)} />
        </View>
        <Text style={[styles.mainCardPercent, { color: avgAdherence >= 80 ? colors.statusDone : (avgAdherence >= 50 ? colors.statusSnooze : colors.statusMissed) }]}>{avgAdherence}%</Text>
        <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${avgAdherence}%`, backgroundColor: avgAdherence >= 80 ? colors.statusDone : (avgAdherence >= 50 ? colors.statusSnooze : colors.statusMissed) }]} /></View>
        <Text style={styles.progressText}>Dựa trên tổng {syntheticData.Total_Reminders} lượt nhắc nhở</Text>
      </View>

      <View style={[styles.chartsContainer, { flexDirection: isDesktop ? 'row' : 'column', gap: 15 }]}>
        <View style={[styles.chartBox, { flex: isDesktop ? 1 : 0 }]}>
          <Text style={styles.chartTitle}>Phân bổ Trạng thái sử dụng</Text>
          {totalReminders > 0 ? (
            <PieChart data={pieData} width={chartWidth} height={180} chartConfig={{ backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"15"} center={[10, 0]} absolute />
          ) : <Text style={styles.emptyChartText}>Chưa có dữ liệu bánh</Text>}
        </View>

        {bottom5Patients.length > 0 && (
          <View style={[styles.chartBox, { flex: isDesktop ? 1 : 0 }]}>
            <Text style={styles.chartTitle}>Cảnh Báo: Top BN Tuân Thủ Thấp</Text>
            <Text style={styles.chartSubTitle}>Cần liên hệ hỗ trợ nhắc nhở khẩn cấp</Text>
            <BarChart data={barData} width={chartWidth} height={200} yAxisLabel="" yAxisSuffix="%" chartConfig={{ backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', decimalPlaces: 0, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`, barPercentage: 0.6 }} style={{ marginVertical: 8, borderRadius: 16 }} showValuesOnTopOfBars={true} />
          </View>
        )}
      </View>

      <View style={styles.gridStats}>
        <View style={styles.gridBox}><MaterialCommunityIcons name="account-group" size={28} color={colors.info} /><Text style={styles.gridBoxNumber}>{syntheticData.Total_Patients}</Text><Text style={styles.gridBoxLabel}>Bệnh Nhân</Text></View>
        <View style={styles.gridBox}><MaterialCommunityIcons name="package-variant-closed" size={28} color={colors.carbonDark} /><Text style={styles.gridBoxNumber}>{syntheticData.Total_Medications_Monitored}</Text><Text style={styles.gridBoxLabel}>Sản phẩm</Text></View>
        <View style={styles.gridBox}><MaterialCommunityIcons name="bell-ring" size={28} color={colors.statusSnooze} /><Text style={styles.gridBoxNumber}>{syntheticData.Total_Reminders}</Text><Text style={styles.gridBoxLabel}>Tổng Lượt Nhắc</Text></View>
        <View style={styles.gridBox}><MaterialCommunityIcons name="check-all" size={28} color={colors.statusDone} /><Text style={styles.gridBoxNumber}>{syntheticData.Total_Used_Clicks}</Text><Text style={styles.gridBoxLabel}>Đã sử dụng</Text></View>
      </View>
      
      <View style={styles.bottomStatsRow}>
        <View style={[styles.infoCard, { borderColor: colors.statusMissed, backgroundColor: '#FEF2F2' }]}>
          <MaterialCommunityIcons name="alert-circle" size={32} color={colors.statusMissed} />
          <View style={{marginLeft: 15, flex: 1}}><Text style={styles.infoCardLabel}>Sản phẩm bị lỡ nhiều nhất</Text><Text style={[styles.infoCardData, {color: colors.statusMissed}]}>{syntheticData.Lowest_Adherence_Medication || 'Không có'}</Text></View>
        </View>
      </View>
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: colors.textLight, fontWeight: '600' },
  hintText: { color: colors.textLight, fontStyle: 'italic', fontSize: 13, marginTop: 5 },
  tabContent: { flex: 1, padding: 15, width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark, marginBottom: 15 },
  mainCard: { backgroundColor: colors.white, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, marginBottom: 20, width: '100%' },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainCardTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark },
  mainCardSub: { fontSize: 14, color: colors.textLight, marginTop: 4, fontStyle: 'italic' },
  mainCardPercent: { fontSize: 56, fontWeight: '900', marginTop: 15, marginBottom: 15, letterSpacing: -1 },
  progressBarBg: { height: 14, backgroundColor: '#E2E8F0', borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 7 },
  progressText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', textAlign: 'right' },
  chartsContainer: { width: '100%', marginBottom: 10 },
  chartBox: { backgroundColor: colors.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, marginBottom: 15, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '800', color: colors.carbonDark, alignSelf: 'flex-start', marginBottom: 5 },
  chartSubTitle: { fontSize: 13, color: colors.statusMissed, fontStyle: 'italic', alignSelf: 'flex-start', marginBottom: 15 },
  emptyChartText: { color: colors.textLight, marginTop: 50, fontStyle: 'italic' },
  gridStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 20, width: '100%' },
  gridBox: { width: '48%', backgroundColor: colors.white, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, alignItems: 'center', marginBottom: 10 },
  gridBoxNumber: { fontSize: 26, fontWeight: '900', color: colors.carbonDark, marginTop: 10 },
  gridBoxLabel: { fontSize: 14, color: colors.textLight, marginTop: 4, fontWeight: '700', textAlign: 'center' },
  bottomStatsRow: { flexDirection: 'column', gap: 15 }, 
  infoCard: { flexDirection: 'row', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center', elevation: 1 }, 
  infoCardLabel: { fontSize: 15, color: colors.carbonDark, fontWeight: '700' }, 
  infoCardData: { fontSize: 20, fontWeight: '900', marginTop: 4 },
});