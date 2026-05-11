import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native'; // 🔥 Đã thêm Platform ở đây
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';

// BẢNG MÀU CHUẨN SAAS 
const colors = {
  bg: '#F8FAFC', surface: '#FFFFFF', primary: '#7C3AED', primaryLight: '#F5F3FF',
  textDark: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  statusDone: '#10B981', statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#3B82F6'
};

export const SyntheticTab = ({ syntheticData, individualData, isDesktop, chartWidth }: any) => {
  if (!syntheticData || !syntheticData.Total_Patients) return (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="chart-box-outline" size={80} color={colors.border} />
      <Text style={styles.loadingText}>Chưa có đủ dữ liệu để vẽ biểu đồ thống kê.</Text>
      <Text style={styles.hintText}>Hãy gán thuốc và ghi nhận lịch sử trước nhé.</Text>
    </View>
  );
  
  let avgAdherence = parseFloat(syntheticData.Average_Adherence?.toString().replace('%', '') || '0');
  const totalReminders = parseInt(syntheticData.Total_Reminders) || 0;
  const totalUsed = parseInt(syntheticData.Total_Used_Clicks) || 0;
  const totalMissed = totalReminders - totalUsed > 0 ? totalReminders - totalUsed : 0;
  
  const pieData = [
    { name: 'Hoàn thành', population: totalUsed, color: colors.statusDone, legendFontColor: colors.textDark, legendFontSize: 12 },
    { name: 'Bỏ lỡ', population: totalMissed, color: colors.statusMissed, legendFontColor: colors.textDark, legendFontSize: 12 }
  ];

  const bottom5Patients = individualData.slice(0, 5); 
  const barData = {
    labels: bottom5Patients.map((pt: any) => pt.PatientsID || 'N/A'),
    datasets: [{ data: bottom5Patients.map((pt: any) => parseFloat(pt.Average_Adherence?.replace('%', '') || '0')) }]
  };

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return colors.statusDone;
    if (rate >= 50) return colors.statusSnooze;
    return colors.statusMissed;
  };

  const adherenceColor = getAdherenceColor(avgAdherence);

  // ÉP CHIỀU CAO BIỂU ĐỒ (Phụ thuộc vào màn hình để không tràn lề)
  const windowHeight = Dimensions.get('window').height;
  const chartHeight = windowHeight > 800 ? 200 : 160; 

  return (
    // 🔥 THAY SCROLLVIEW BẰNG VIEW VÀ DÙNG FLEX ĐỂ KHÓA SCROLL
    <View style={styles.tabContent}>
      
      {/* 🚀 HÀNG 1: TỶ LỆ TUÂN THỦ (TRÁI) & CẢNH BÁO (PHẢI) */}
      <View style={[styles.topRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        <View style={[styles.mainCard, isDesktop && { flex: 2, marginRight: 15 }]}>
          <View style={styles.mainCardHeader}>
            <View>
              <Text style={styles.mainCardTitle}>Tỷ Lệ Tuân Thủ Trung Bình</Text>
              <Text style={styles.mainCardSub}>Average Adherence Rate</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.mainCardPercent, { color: adherenceColor, marginRight: 15 }]}>{avgAdherence}%</Text>
              <View style={[styles.iconBox, { backgroundColor: `${adherenceColor}15` }]}>
                <MaterialCommunityIcons name="heart-pulse" size={36} color={adherenceColor} />
              </View>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${avgAdherence}%`, backgroundColor: adherenceColor }]} />
          </View>
          <Text style={styles.progressText}>Dựa trên tổng {totalReminders} lượt nhắc nhở</Text>
        </View>

        <View style={[styles.warningCard, isDesktop && { flex: 1 }]}>
          <View style={styles.warningIconBox}><MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.statusMissed} /></View>
          <View style={{marginLeft: 16, flex: 1}}>
            <Text style={styles.infoCardLabel}>Sản phẩm bị lỡ nhiều nhất</Text>
            <Text style={styles.infoCardData} numberOfLines={2}>{syntheticData.Lowest_Adherence_Medication || 'Chưa có dữ liệu'}</Text>
          </View>
        </View>
      </View>

      {/* 🚀 HÀNG 2: 4 THẺ THỐNG KÊ NHỎ */}
      <View style={[styles.gridStats, { flexDirection: isDesktop ? 'row' : 'row' }]}>
        <View style={styles.gridBox}><MaterialCommunityIcons name="account-group" size={24} color={colors.info} /><Text style={styles.gridBoxNumber}>{syntheticData.Total_Patients}</Text><Text style={styles.gridBoxLabel}>Bệnh Nhân</Text></View>
        <View style={styles.gridBox}><MaterialCommunityIcons name="pill" size={24} color={colors.primary} /><Text style={styles.gridBoxNumber}>{syntheticData.Total_Medications_Monitored}</Text><Text style={styles.gridBoxLabel}>SP Đang theo dõi</Text></View>
        <View style={styles.gridBox}><MaterialCommunityIcons name="bell-ring-outline" size={24} color={colors.statusSnooze} /><Text style={styles.gridBoxNumber}>{totalReminders}</Text><Text style={styles.gridBoxLabel}>Tổng Lượt Nhắc</Text></View>
        <View style={styles.gridBox}><MaterialCommunityIcons name="check-all" size={24} color={colors.statusDone} /><Text style={styles.gridBoxNumber}>{totalUsed}</Text><Text style={styles.gridBoxLabel}>Hoàn thành</Text></View>
      </View>

      {/* 🚀 HÀNG 3: BIỂU ĐỒ (Tự động lấp đầy phần không gian còn lại) */}
      <View style={[styles.chartsContainer, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        <View style={[styles.chartBox, isDesktop && { flex: 1, marginRight: 15 }]}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Phân bổ Trạng thái</Text>
          </View>
          {totalReminders > 0 ? (
            <View style={styles.chartWrapper}>
              <PieChart data={pieData} width={chartWidth} height={chartHeight} chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"0"} center={[10, 0]} absolute />
            </View>
          ) : <Text style={styles.emptyChartText}>Chưa có dữ liệu thống kê</Text>}
        </View>

        {bottom5Patients.length > 0 && (
          <View style={[styles.chartBox, isDesktop && { flex: 1 }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Cảnh Báo Tuân Thủ (Top 5 BN Thấp)</Text>
            </View>
            <View style={styles.chartWrapper}>
              <BarChart data={barData} width={chartWidth} height={chartHeight} yAxisLabel="" yAxisSuffix="%" chartConfig={{ backgroundColor: colors.surface, backgroundGradientFrom: colors.surface, backgroundGradientTo: colors.surface, decimalPlaces: 0, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, labelColor: (opacity = 1) => colors.textMuted, barPercentage: 0.5 }} style={{ borderRadius: 8 }} showValuesOnTopOfBars={true} />
            </View>
          </View>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 15, color: colors.textDark, fontWeight: '600' },
  hintText: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  
  // KHÓA CUỘN BẰNG FLEX: 1
  tabContent: { flex: 1, width: '100%', flexDirection: 'column', overflow: 'hidden', paddingVertical: 5 },
  
  // HÀNG 1
  topRow: { width: '100%', marginBottom: 15 },
  mainCard: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mainCardTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  mainCardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  iconBox: { padding: 10, borderRadius: 12 },
  mainCardPercent: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: colors.textMuted, textAlign: 'right', fontWeight: '500' },
  
  warningCard: { flexDirection: 'row', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', marginTop: Platform.OS === 'web' ? 0 : 15 }, 
  warningIconBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12 },
  infoCardLabel: { fontSize: 13, color: colors.textDark, fontWeight: '600' }, 
  infoCardData: { fontSize: 18, fontWeight: '800', color: colors.statusMissed, marginTop: 4 },

  // HÀNG 2
  gridStats: { flexWrap: 'nowrap', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  gridBox: { flex: 1, backgroundColor: colors.surface, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginHorizontal: 4 },
  gridBoxNumber: { fontSize: 20, fontWeight: '800', color: colors.textDark, marginTop: 8 },
  gridBoxLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  
  // HÀNG 3
  chartsContainer: { flex: 1, width: '100%' }, 
  chartBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: Platform.OS === 'web' ? 0 : 15 },
  chartHeader: { alignSelf: 'flex-start', marginBottom: 10, width: '100%' },
  chartTitle: { fontSize: 14, fontWeight: '800', color: colors.textDark },
  chartWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, 
  emptyChartText: { color: colors.textMuted, marginTop: 30, fontStyle: 'italic', textAlign: 'center' },
});