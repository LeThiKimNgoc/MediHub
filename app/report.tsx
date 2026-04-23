import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert, Platform, Image } from 'react-native';
import Papa from 'papaparse';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router'; 
import { PieChart, BarChart } from 'react-native-chart-kit'; 

const colors = {
  bg: '#F8FAFC', headerBgPastel: '#A855F7', white: '#FFFFFF', carbonDark: '#1E293B',     
  tableHeader: '#E1BEE7', textLight: '#78909C', statusDone: '#10B981',   
  statusSnooze: '#F59E0B', statusMissed: '#EF4444', info: '#0284C7',
  zoomBtnBg: '#7E22CE' 
};

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState('Synthetic'); 
  const [logs, setLogs] = useState<any[]>([]);
  const [syntheticData, setSyntheticData] = useState<any>(null);
  const [individualData, setIndividualData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 900; 
  const isMobile = width < 768;
  const [isZoomed, setIsZoomed] = useState(false); 
  
  const chartWidth = isDesktop ? (width - 120) / 2 : width - 80;

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) router.replace('/');
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => router.replace('/') } 
      ]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    const gidLog = '1373475002'; 
    const gidSynthetic = '297712298'; 
    const gidIndividual = '1749901529'; 
    
    // 🔥 ĐÃ SỬA: Gắn "thần chú" chống Cache vào cả 3 link 🔥
    const t = new Date().getTime();
    const urlLog = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidLog}&t=${t}`;
    const urlSynthetic = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidSynthetic}&t=${t}`;
    const urlIndividual = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidIndividual}&t=${t}`;

    try {
      // 🔥 ĐÃ SỬA: Yêu cầu tải dữ liệu mới (no-store) 🔥
      const [resLog, resSynthetic, resIndividual] = await Promise.all([
        fetch(urlLog, { cache: 'no-store' }),
        fetch(urlSynthetic, { cache: 'no-store' }),
        fetch(urlIndividual, { cache: 'no-store' })
      ]);

      const [csvLog, csvSynthetic, csvIndividual] = await Promise.all([
        resLog.ok ? resLog.text() : Promise.resolve(""),
        resSynthetic.ok ? resSynthetic.text() : Promise.resolve(""),
        resIndividual.ok ? resIndividual.text() : Promise.resolve("")
      ]);

      if (csvLog) Papa.parse(csvLog, { header: true, skipEmptyLines: true, complete: (res) => setLogs(res.data.reverse()) });
      if (csvSynthetic) Papa.parse(csvSynthetic, { header: true, skipEmptyLines: true, complete: (res) => { if(res.data.length > 0) setSyntheticData(res.data[0]); } });
      if (csvIndividual) {
        Papa.parse(csvIndividual, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
            const sortedData = res.data.sort((a: any, b: any) => {
              const rateA = parseFloat(a.Average_Adherence?.replace('%', '') || '0');
              const rateB = parseFloat(b.Average_Adherence?.replace('%', '') || '0');
              return rateA - rateB;
            });
            setIndividualData(sortedData);
          }
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", error);
      setFetchError(true);
    } finally {
      setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  if (loading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.headerBgPastel} />
        <Text style={styles.loadingText}>Đang tải dữ liệu báo cáo...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <MaterialCommunityIcons name="wifi-off" size={60} color={colors.statusMissed} />
        <Text style={[styles.loadingText, { color: colors.statusMissed, textAlign: 'center' }]}>Không thể tải dữ liệu. Vui lòng kiểm tra lại kết nối mạng hoặc link Google Sheets.</Text>
        <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: colors.headerBgPastel, borderRadius: 8 }} onPress={fetchData}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fSize = isMobile && !isZoomed ? 9 : 13; 
  const padV = isMobile && !isZoomed ? 8 : 16;   
  const padH = isMobile && !isZoomed ? 4 : 12;

  const getLogColStyle = (colType: string) => {
    if (isMobile && isZoomed) {
      const pxWidths: any = { time: 160, id: 90, name: 220, hour: 100, action: 120, status: 120 };
      return { width: pxWidths[colType] };
    } else {
      const pctWidths: any = { time: '18%', id: '11%', name: '30%', hour: '11%', action: '15%', status: '15%' };
      return { width: pctWidths[colType] };
    }
  };

  const getIndColStyle = (colType: string) => {
    if (isMobile && isZoomed) {
      const pxWidths: any = { id: 90, name: 220, total: 100, used: 100, rate: 140, last: 160 };
      return { width: pxWidths[colType] };
    } else {
      const pctWidths: any = { id: '11%', name: '33%', total: '12%', used: '12%', rate: '14%', last: '18%' };
      return { width: pctWidths[colType] };
    }
  };

  const renderLogTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nhật Ký (Mới nhất)</Text>
        {isMobile && (
          <TouchableOpacity 
            onPress={() => setIsZoomed(!isZoomed)} 
            style={[styles.zoomBtn, {backgroundColor: isZoomed ? '#E2E8F0' : colors.zoomBtnBg}]}
          >
            <MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.carbonDark : colors.white} />
            <Text style={[styles.zoomBtnText, {color: isZoomed ? colors.carbonDark : colors.white}]}>
              {isZoomed ? "Thu nhỏ" : "Phóng to"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.tableWrapper}>
        {isMobile && isZoomed ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={{ width: 850, flex: 1, backgroundColor: colors.white }}> 
              {renderLogTable()}
            </View>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', flex: 1, backgroundColor: colors.white }}>
            {renderLogTable()}
          </View>
        )}
      </View>
    </View>
  );

  const renderLogTable = () => (
    <FlatList 
      data={logs} 
      showsVerticalScrollIndicator={true} 
      style={{ flex: 1 }} 
      keyExtractor={(item, index) => index.toString()} 
      stickyHeaderIndices={[0]} 
      ListHeaderComponent={
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, getLogColStyle('time'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Thời gian ghi nhận</Text>
          <Text style={[styles.headerCell, getLogColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Mã BN</Text>
          <Text style={[styles.headerCell, getLogColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Tên sản phẩm</Text>
          <Text style={[styles.headerCell, getLogColStyle('hour'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Giờ dùng</Text>
          <Text style={[styles.headerCell, getLogColStyle('action'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Thao tác</Text>
          <Text style={[styles.headerCell, getLogColStyle('status'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', borderRightWidth: 0 }]}>Trạng Thái</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
          <Text style={[styles.dataCell, getLogColStyle('time'), { paddingVertical: padV, paddingHorizontal: padH, color: colors.textLight, fontSize: fSize - 1 }]} numberOfLines={2}>{item.Timestamp}</Text>
          <Text style={[styles.dataCell, getLogColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: colors.info, fontSize: fSize }]} numberOfLines={1}>{item.PatientsID}</Text>
          <Text style={[styles.dataCell, styles.boldText, getLogColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.headerBgPastel }]} numberOfLines={2}>{item.MedicineName}</Text>
          <Text style={[styles.dataCell, getLogColStyle('hour'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: colors.statusSnooze, fontSize: fSize }]}>{item.PlannedTime}</Text>
          <Text style={[styles.dataCell, getLogColStyle('action'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontStyle: 'italic', fontSize: fSize - 1 }]} numberOfLines={2}>{item.Action}</Text>
          <View style={[styles.dataCell, getLogColStyle('status'), { paddingVertical: padV, paddingHorizontal: padH, justifyContent: 'center', alignItems: 'center', borderRightWidth: 0 }]}>
            <View style={[styles.statusBadge, { paddingVertical: isMobile && !isZoomed ? 4 : 6, backgroundColor: item.Status === 'Đã sử dụng' ? colors.statusDone : (item.Status === 'Bỏ lỡ' ? colors.statusMissed : colors.statusSnooze) }]}>
              <Text style={[styles.statusText, {fontSize: fSize - 2}]}>{item.Status}</Text>
            </View>
          </View>
        </View>
      )} 
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có lịch sử sử dụng nào.</Text></View>} 
    />
  );

  const renderSyntheticTab = () => {
    if (!syntheticData || !syntheticData.Total_Patients) return (
        <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="chart-box-outline" size={80} color="#E1BEE7" />
            <Text style={[styles.loadingText, {marginTop: 10}]}>Chưa có đủ dữ liệu để vẽ biểu đồ thống kê.</Text>
            <Text style={{color: colors.textLight, fontStyle: 'italic', fontSize: 13, marginTop: 5}}>Hãy gán thuốc và ghi nhận lịch sử trước nhé.</Text>
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
      labels: bottom5Patients.map(pt => pt.PatientsID || 'N/A'),
      datasets: [{ data: bottom5Patients.map(pt => parseFloat(pt.Average_Adherence?.replace('%', '') || '0')) }]
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
                <PieChart
                data={pieData}
                width={chartWidth}
                height={180}
                chartConfig={{ backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
                />
            ) : (
                <Text style={{color: colors.textLight, marginTop: 50, fontStyle: 'italic'}}>Chưa có dữ liệu bánh</Text>
            )}
          </View>

          {bottom5Patients.length > 0 && (
            <View style={[styles.chartBox, { flex: isDesktop ? 1 : 0 }]}>
              <Text style={styles.chartTitle}>Cảnh Báo: Top BN Tuân Thủ Thấp</Text>
              <Text style={styles.chartSubTitle}>Cần liên hệ hỗ trợ nhắc nhở khẩn cấp</Text>
              <BarChart
                data={barData}
                width={chartWidth}
                height={200}
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, 
                  labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                  barPercentage: 0.6,
                  propsForBackgroundLines: { strokeDasharray: "" }
                }}
                style={{ marginVertical: 8, borderRadius: 16 }}
                showValuesOnTopOfBars={true}
              />
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

  const renderIndividualTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Báo Cáo Từng Cá Nhân</Text>
        {isMobile && (
          <TouchableOpacity 
            onPress={() => setIsZoomed(!isZoomed)} 
            style={[styles.zoomBtn, {backgroundColor: isZoomed ? '#E2E8F0' : colors.zoomBtnBg}]}
          >
            <MaterialCommunityIcons name={isZoomed ? "magnify-minus-outline" : "magnify-plus-outline"} size={18} color={isZoomed ? colors.carbonDark : colors.white} />
            <Text style={[styles.zoomBtnText, {color: isZoomed ? colors.carbonDark : colors.white}]}>
              {isZoomed ? "Thu nhỏ" : "Phóng to"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.tableWrapper}>
        {isMobile && isZoomed ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={{ width: 850, flex: 1, backgroundColor: colors.white }}> 
              {renderIndividualTable()}
            </View>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', flex: 1, backgroundColor: colors.white }}>
            {renderIndividualTable()}
          </View>
        )}
      </View>
    </View>
  );

  const renderIndividualTable = () => (
    <FlatList 
      data={individualData} 
      showsVerticalScrollIndicator={true} 
      style={{ flex: 1 }} 
      keyExtractor={(item, index) => index.toString()} 
      stickyHeaderIndices={[0]} 
      ListHeaderComponent={
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, getIndColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Mã BN</Text>
          <Text style={[styles.headerCell, getIndColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize }]}>Sản phẩm đang dùng</Text>
          <Text style={[styles.headerCell, getIndColStyle('total'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Lượt Báo</Text>
          <Text style={[styles.headerCell, getIndColStyle('used'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Đã dùng</Text>
          <Text style={[styles.headerCell, getIndColStyle('rate'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center' }]}>Tỷ Lệ</Text>
          <Text style={[styles.headerCell, getIndColStyle('last'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, textAlign: 'center', borderRightWidth: 0 }]}>Cập Nhật Cuối</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const rate = parseFloat(item.Average_Adherence?.replace('%', '') || '0');
        const rateColor = rate >= 80 ? colors.statusDone : (rate >= 50 ? colors.statusSnooze : colors.statusMissed);
        return (
          <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
            <Text style={[styles.dataCell, getIndColStyle('id'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: colors.info, fontSize: fSize }]} numberOfLines={1}>{item.PatientsID}</Text>
            <Text style={[styles.dataCell, styles.boldText, getIndColStyle('name'), { paddingVertical: padV, paddingHorizontal: padH, fontSize: fSize, color: colors.headerBgPastel }]} numberOfLines={2}>{item.MedicineName}</Text>
            <Text style={[styles.dataCell, getIndColStyle('total'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: '600', fontSize: fSize }]}>{item.Total_Reminders}</Text>
            <Text style={[styles.dataCell, getIndColStyle('used'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', fontWeight: 'bold', color: rateColor, fontSize: fSize }]}>{item.Total_Used_clicks}</Text>
            <View style={[styles.dataCell, getIndColStyle('rate'), { paddingVertical: padV, paddingHorizontal: padH, justifyContent: 'center', alignItems: 'center' }]}>
              <View style={[styles.rateBadge, { paddingVertical: isMobile && !isZoomed ? 4 : 6, backgroundColor: rateColor + '1A', borderColor: rateColor }]}>
                <Text style={[styles.rateText, {color: rateColor, fontSize: fSize - 1}]}>{item.Average_Adherence}</Text>
              </View>
            </View>
            <Text style={[styles.dataCell, getIndColStyle('last'), { paddingVertical: padV, paddingHorizontal: padH, textAlign: 'center', color: colors.textLight, fontSize: fSize - 1, borderRightWidth: 0 }]} numberOfLines={2}>{item.Last_app_usage}</Text>
          </View>
        );
      }} 
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có dữ liệu chi tiết.</Text></View>} 
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {isMobile ? (
          <View style={[styles.header, styles.headerMobile]}>
             <View style={styles.headerTopRowMobile}>
               <View style={styles.brandBoxMobile}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircleMobile}>
                        <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.brandMediMobile}>Medi<Text style={styles.brandHubMobile}>Hub</Text></Text>
                  </View>
               </View>
               <View style={{flexDirection: 'row'}}>
                 <TouchableOpacity style={styles.headerIconBtnMobile} onPress={() => router.push('/admin')}>
                    <MaterialCommunityIcons name="home-outline" size={22} color={colors.white} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.headerIconBtnMobile, {marginLeft: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)'}]} onPress={handleLogout}>
                    <MaterialCommunityIcons name="power" size={22} color="#FECACA" />
                 </TouchableOpacity>
               </View>
             </View>
             <View style={styles.headerBottomRowMobile}>
                <Text style={styles.pageTitleMobile}>BÁO CÁO THỐNG KÊ</Text>
             </View>
          </View>
        ) : (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.brandBox}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoCircle}>
                        <Image source={require('../assets/images/favicon.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.brandMedi}>Medi<Text style={styles.brandHub}>Hub</Text></Text>
                  </View>
                </View>
                <Text style={styles.brandSlogan}>Đồng Hành Sức Khỏe Mỗi Ngày</Text>
              </View>

              <View style={styles.headerCenter}>
                <Text style={styles.pageTitle}>BÁO CÁO THỐNG KÊ</Text>
                <View style={styles.titleUnderline} />
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/admin')}>
                  <MaterialCommunityIcons name="home-outline" size={20} color={colors.white} />
                  <Text style={styles.navText}>Trang chủ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                  <MaterialCommunityIcons name="power" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.tabContainer}>
          {['Synthetic', 'Log', 'Individual'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'Log' ? 'Nhật ký' : (tab === 'Synthetic' ? 'Tổng quan' : 'Cá nhân')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mainArea}>
          {activeTab === 'Log' && renderLogTab()}
          {activeTab === 'Synthetic' && renderSyntheticTab()}
          {activeTab === 'Individual' && renderIndividualTab()}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: colors.textLight, fontWeight: '600' },
  
  header: { 
    backgroundColor: colors.headerBgPastel, paddingVertical: 18, paddingHorizontal: '2%', 
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: colors.headerBgPastel,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 5 
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  brandBox: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', flexDirection: 'row', alignItems: 'center' },
  
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  
  brandMedi: { fontSize: 30, fontWeight: '600', color: '#FFFFFF', marginLeft: 12, letterSpacing: 1, fontStyle: 'italic', textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
  brandHub: { fontWeight: '900', color: '#FFFFFF' },
  brandSlogan: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginLeft: 12, marginTop: 6, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowRadius: 2 },
  headerCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  titleUnderline: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginTop: 4 },
  
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
  navText: { marginLeft: 6, fontWeight: '700', color: '#FFFFFF', fontSize: 14 }, 
  iconBtn: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  
  headerMobile: { paddingVertical: 20, paddingHorizontal: 15, marginBottom: 5 },
  headerTopRowMobile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBoxMobile: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)' },
  
  logoCircleMobile: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  
  brandMediMobile: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginLeft: 10, fontStyle: 'italic' },
  brandHubMobile: { fontWeight: '900' },
  headerIconBtnMobile: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerBottomRowMobile: { marginTop: 15, alignItems: 'center' },
  pageTitleMobile: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },

  tabContainer: { width: '100%', flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: 10, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 1 },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#A855F7' },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  tabTextActive: { color: '#A855F7', fontWeight: '900' },
  
  mainArea: { flex: 1, paddingTop: 5, width: '100%' }, 
  tabContent: { flex: 1, padding: 15, width: '100%' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark },
  zoomBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 1 },
  zoomBtnText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  chartsContainer: { width: '100%', marginBottom: 10 },
  chartBox: { backgroundColor: colors.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, marginBottom: 15, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '800', color: colors.carbonDark, alignSelf: 'flex-start', marginBottom: 5 },
  chartSubTitle: { fontSize: 13, color: colors.statusMissed, fontStyle: 'italic', alignSelf: 'flex-start', marginBottom: 15 },

  tableWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: colors.tableHeader, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10, elevation: 2 },
  headerCell: { color: '#4A148C', fontWeight: '900', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  rowEven: { backgroundColor: colors.white }, rowOdd: { backgroundColor: '#FDF7FD' },
  dataCell: { color: colors.carbonDark, borderRightWidth: 1, borderRightColor: '#F1F5F9', textAlignVertical: 'center' },
  boldText: { fontWeight: '800' },
  
  statusBadge: { borderRadius: 15, minWidth: 80, alignItems: 'center' },
  statusText: { color: colors.white, fontWeight: 'bold' },
  rateBadge: { borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', width: '90%' },
  rateText: { fontWeight: 'bold' },
  
  mainCard: { backgroundColor: colors.white, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, marginBottom: 20, width: '100%' },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainCardTitle: { fontSize: 18, fontWeight: '800', color: colors.carbonDark },
  mainCardSub: { fontSize: 14, color: colors.textLight, marginTop: 4, fontStyle: 'italic' },
  mainCardPercent: { fontSize: 56, fontWeight: '900', marginTop: 15, marginBottom: 15, letterSpacing: -1 },
  progressBarBg: { height: 14, backgroundColor: '#E2E8F0', borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 7 },
  progressText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', textAlign: 'right' },
  
  gridStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 20, width: '100%' },
  gridBox: { width: '48%', backgroundColor: colors.white, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, alignItems: 'center', marginBottom: 10 },
  gridBoxNumber: { fontSize: 26, fontWeight: '900', color: colors.carbonDark, marginTop: 10 },
  gridBoxLabel: { fontSize: 14, color: colors.textLight, marginTop: 4, fontWeight: '700', textAlign: 'center' },
  bottomStatsRow: { flexDirection: 'column', gap: 15 }, 
  infoCard: { flexDirection: 'row', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center', elevation: 1 }, 
  infoCardLabel: { fontSize: 15, color: colors.carbonDark, fontWeight: '700' }, 
  infoCardData: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  emptyContainer: { padding: 40, alignItems: 'center' }, emptyText: { color: colors.textLight, fontSize: 16, fontStyle: 'italic' },
});