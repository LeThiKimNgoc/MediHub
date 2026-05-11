import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, useWindowDimensions, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Papa from 'papaparse';

import SummaryCard from '../components/SummaryCard';
import SystemMonitorModal from '../components/SystemMonitorModal';

export default function PatientScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPatients: 0, noReminders: 0, activeReminders: 0, urgentSupport: 0, activeMeds: 0 });
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [allReminds, setAllReminds] = useState<any[]>([]);

  const [isNotiModalVisible, setNotiModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // 🔥 STATE MỚI CHO PHÂN TRANG (PAGINATION)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Hiển thị 5 bệnh nhân trên 1 trang

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

  const fetchPatientStats = async () => {
    setLoading(true);
    try {
      const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
      const gidPatients = '0'; 
      const gidRemind = '2073748495';
      const gidIndividual = '1749901529';
      const t = new Date().getTime();

      const [csvPatients, csvRemind, csvIndividual] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidPatients}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidRemind}&t=${t}`, { cache: 'no-store' }).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidIndividual}&t=${t}`, { cache: 'no-store' }).then(res => res.text())
      ]);

      const patientsData = Papa.parse(csvPatients, { header: true, skipEmptyLines: true }).data;
      const remindData = Papa.parse(csvRemind, { header: true, skipEmptyLines: true }).data;
      const individualData = Papa.parse(csvIndividual, { header: true, skipEmptyLines: true }).data;

      setAllReminds(remindData);

      const total = patientsData.length;
      const activePatientsSet = new Set();
      let activeMedsCount = 0;

      remindData.forEach((r: any) => {
          const rawId = r['PatientID'] || r['PatientsID'] || r['Mã BN'];
          const pid = rawId ? String(rawId).trim().toUpperCase() : null;
          const mode = r['Reminder_mode'] ? String(r['Reminder_mode']).trim() : '';

          if (pid && pid !== "" && mode === 'Bật') {
              activePatientsSet.add(pid); 
              activeMedsCount++;         
          }
      });

      const activePeopleCount = activePatientsSet.size;
      const noRemindCount = Math.max(0, total - activePeopleCount);

      const adherenceMap: any = {};
      individualData.forEach((row: any) => {
          const rawId = row['PatientsID'] || row['PatientID'];
          const pid = rawId ? String(rawId).trim().toUpperCase() : null;
          if (!pid) return;

          const adStr = row['Average_Adherence'] || '0%';
          const adNum = parseInt(String(adStr).replace('%', ''), 10) || 0;

          if (!adherenceMap[pid]) adherenceMap[pid] = { total: 0, count: 0 };
          adherenceMap[pid].total += adNum;
          adherenceMap[pid].count += 1;
      });

      let urgent = 0;
      const formattedPatients = patientsData.map((p: any, index: number) => {
          const rawId = p['PatientID'] || p['Mã BN'] || p['PatientsID'];
          const pid = String(rawId).trim().toUpperCase();
          const name = p['Họ và tên'] || p['Họ tên'] || p['Tên Bệnh Nhân'] || p['Name'] || '--';
          
          let finalAd = 0;
          if (adherenceMap[pid]) {
              finalAd = Math.round(adherenceMap[pid].total / adherenceMap[pid].count);
          }

          let statusLabel = 'Chưa thiết lập';
          if (!adherenceMap[pid]) statusLabel = 'Chưa có data';
          else if (finalAd >= 90) statusLabel = 'Tuân thủ tốt';
          else if (finalAd < 50) statusLabel = 'Trễ liều';
          else statusLabel = 'Cần lưu ý';

          if (adherenceMap[pid] && finalAd < 90) urgent++;

          return {
              id: String(index),
              stt: String(index + 1),
              patientId: pid,
              name: name,
              age: p['Age'] || p['Tuổi'] || '--',
              gender: p['Gender'] || p['Giới tính'] || '--',
              date: p['DayStart'] || p['Ngày khám'] || '--/--/----',
              status: statusLabel,
              rawData: p 
          };
      });

      setStats({ totalPatients: total, noReminders: noRemindCount, activeReminders: activePeopleCount, urgentSupport: urgent, activeMeds: activeMedsCount });
      setPatientsList(formattedPatients);
      setCurrentPage(1); // Reset về trang 1 khi lấy dữ liệu mới

    } catch (error) { console.error("Lỗi lấy dữ liệu:", error); } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchPatientStats(); }, []));

  const handleOpenNotiModal = (patientData: any) => {
    setSelectedPatient(patientData);
    setNotiModalVisible(true);
  };

  const handleDeletePatient = (pid: string, pName: string) => {
    const executeDelete = async () => {
      setLoading(true);
      try {
        const payload = { action: 'deletePatient', PatientsID: pid };
        const response = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const result = JSON.parse(await response.text());
        if (result.status === 'success') {
            Alert.alert('Thành công', `Đã xóa hồ sơ bệnh nhân ${pName}`);
            fetchPatientStats(); 
        } else {
            Alert.alert('Lỗi', result.message || 'Không thể xóa.');
        }
      } catch (error) { Alert.alert('Lỗi', 'Không thể kết nối máy chủ.'); } finally { setLoading(false); }
    };
    
    if (Platform.OS === 'web') { 
      if (window.confirm(`⚠️ Bạn có chắc muốn xóa vĩnh viễn hồ sơ của ${pName} không?`)) executeDelete(); 
    } else { 
      Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa vĩnh viễn hồ sơ của ${pName} không?`, [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: executeDelete }]); 
    }
  };

  const renderStatusBadge = (status: string) => {
    let bgColor = '#F1F5F9'; let textColor = '#64748B';
    if (status === 'Tuân thủ tốt') { bgColor = '#ECFDF5'; textColor = '#10B981'; }
    else if (status === 'Cần lưu ý') { bgColor = '#FEF3C7'; textColor = '#D97706'; }
    else if (status === 'Trễ liều') { bgColor = '#FEE2E2'; textColor = '#EF4444'; }
    return <View style={[styles.statusBadge, { backgroundColor: bgColor }]}><Text style={[styles.statusBadgeText, { color: textColor }]}>{status}</Text></View>;
  };

  // 🔥 LOGIC TÍNH TOÁN PHÂN TRANG (PAGINATION)
  const totalPages = Math.ceil(patientsList.length / itemsPerPage);
  const currentData = patientsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <SystemMonitorModal 
        visible={isNotiModalVisible} 
        onClose={() => setNotiModalVisible(false)} 
        selectedPatient={selectedPatient} 
        allReminds={allReminds} 
      />

      <View style={styles.mainWrapper}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.pageTitle}>Hồ sơ bệnh nhân</Text>
            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbText}>Trang chủ</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color="#94A3B8" />
              <Text style={styles.breadcrumbTextActive}>Hồ sơ bệnh nhân</Text>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn}><MaterialCommunityIcons name="bell-outline" size={20} color="#64748B" /><View style={styles.badge}><Text style={styles.badgeText}>{stats.urgentSupport}</Text></View></TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn}>
              <View style={styles.avatar}><Text style={styles.avatarText}>AD</Text></View>
              {!isMobile && <Text style={styles.profileName}>Administrator</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bodyContent}>
          <View style={[styles.cardsGrid, isMobile && { flexDirection: 'column' }]}>
            <View style={{ flex: 1 }}><SummaryCard title="Tổng bệnh nhân" value={stats.totalPatients} isLoading={loading} icon="account-group-outline" color="#0F766E" bgColor="#ECFDF5" trendText="Dữ liệu thời gian thực" isTrendUp={true} hasSparkline={true} sparklineColor="#10B981" /></View>
            <View style={{ flex: 1 }}><SummaryCard title="Chưa có nhắc nhở" value={stats.noReminders} isLoading={loading} icon="account-clock-outline" color="#3B82F6" bgColor="#EFF6FF" trendText="Cần thiết lập phác đồ" isTrendUp={false} hasSparkline={true} sparklineColor="#3B82F6" /></View>
            <View style={{ flex: 1 }}>
              <SummaryCard title="Đang nhận nhắc nhở" value={stats.activeReminders} isLoading={loading} icon="calendar-check-outline" color="#F59E0B" bgColor="#FFFBEB" trendText={`Bao gồm ${stats.activeMeds} phác đồ`} actionText="Xem chi tiết" />
            </View>
            <View style={{ flex: 1 }}><SummaryCard title="Cần hỗ trợ gấp" value={stats.urgentSupport} isLoading={loading} icon="alert-outline" color="#EF4444" bgColor="#FEF2F2" trendText="Tuân thủ dưới 90%" actionText="Chi tiết" /></View>
          </View>

          <View style={styles.filterBar}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
              <TextInput style={styles.searchInput} placeholder="Tìm mã BN hoặc tên bệnh nhân..." placeholderTextColor="#94A3B8" />
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchPatientStats}>
              {loading ? <ActivityIndicator size="small" color="#475569" /> : <MaterialCommunityIcons name="refresh" size={18} color="#475569" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Danh sách bệnh nhân</Text>

          <View style={styles.tableCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
              <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: 50, textAlign: 'center' }]}>STT</Text>
                  <Text style={[styles.th, { width: 100 }]}>Mã BN</Text>
                  <Text style={[styles.th, { flex: 1, minWidth: 160 }]}>Họ và tên</Text>
                  <Text style={[styles.th, { width: 60 }]}>Tuổi</Text>
                  <Text style={[styles.th, { width: 80 }]}>Giới tính</Text>
                  <Text style={[styles.th, { width: 130 }]}>Ngày khám</Text>
                  <Text style={[styles.th, { width: 120, textAlign: 'center' }]}>Tuân thủ</Text>
                  <Text style={[styles.th, { width: 130, textAlign: 'center' }]}>Thao tác</Text> 
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                  {loading ? (
                    <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color="#0F766E" /></View>
                  ) : currentData.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}><Text style={{ color: '#64748B' }}>Trống.</Text></View>
                  ) : (
                    currentData.map((item, index) => (
                      <View key={item.id} style={[styles.tableRow, index === currentData.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={[styles.td, { width: 50, textAlign: 'center', color: '#64748B' }]}>{item.stt}</Text>
                        <TouchableOpacity style={{ width: 100 }} onPress={() => router.push(`/patient-meds?id=${item.patientId}&name=${item.name}`)}>
                          <Text style={[styles.td, { color: '#0284C7', fontWeight: '700', textDecorationLine: 'underline' }]}>{item.patientId}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.td, { flex: 1, minWidth: 160, color: '#B45309', fontWeight: '700' }]}>{item.name}</Text>
                        <Text style={[styles.td, { width: 60 }]}>{item.age}</Text>
                        <Text style={[styles.td, { width: 80 }]}>{item.gender}</Text>
                        <View style={[styles.tdIconBox, { width: 130 }]}><MaterialCommunityIcons name="calendar-blank-outline" size={14} color="#64748B" style={{marginRight: 4}} /><Text style={styles.td}>{item.date}</Text></View>
                        <View style={{ width: 120, alignItems: 'center', justifyContent: 'center' }}>{renderStatusBadge(item.status)}</View>
                        <View style={[styles.actionCell, { width: 130 }]}>
                          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]} onPress={() => handleOpenNotiModal(item)}>
                            <MaterialCommunityIcons name="eye-outline" size={16} color="#0284C7" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]} onPress={() => router.push({ pathname: '/edit-patient', params: { id: item.patientId } } as any)}>
                            <MaterialCommunityIcons name="pencil-outline" size={16} color="#D97706" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDeletePatient(item.patientId, item.name)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </ScrollView>

            {/* 🔥 PHẦN FOOTER PHÂN TRANG (PAGINATION) HOẠT ĐỘNG THỰC TẾ */}
            <View style={styles.tableFooter}>
              <Text style={styles.paginationText}>
                Đang hiển thị <Text style={{fontWeight: '700'}}>{currentData.length}</Text> trên tổng số <Text style={{fontWeight: '700'}}>{patientsList.length}</Text> bệnh nhân
              </Text>

              {totalPages > 1 && (
                <View style={styles.paginationControls}>
                  {/* Nút về trang đầu */}
                  <TouchableOpacity style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} onPress={() => setCurrentPage(1)} disabled={currentPage === 1}>
                    <MaterialCommunityIcons name="chevron-double-left" size={16} color={currentPage === 1 ? "#CBD5E1" : "#64748B"} />
                  </TouchableOpacity>
                  
                  {/* Nút lùi 1 trang */}
                  <TouchableOpacity style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} onPress={handlePrevPage} disabled={currentPage === 1}>
                    <MaterialCommunityIcons name="chevron-left" size={16} color={currentPage === 1 ? "#CBD5E1" : "#64748B"} />
                  </TouchableOpacity>

                  {/* Hiển thị số trang hiện tại */}
                  <View style={[styles.pageBtn, styles.pageBtnActive]}>
                    <Text style={styles.pageTextActive}>{currentPage}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#64748B', marginHorizontal: 4, fontWeight: '600' }}>/ {totalPages}</Text>

                  {/* Nút tiến 1 trang */}
                  <TouchableOpacity style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} onPress={handleNextPage} disabled={currentPage === totalPages}>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={currentPage === totalPages ? "#CBD5E1" : "#64748B"} />
                  </TouchableOpacity>
                  
                  {/* Nút tới trang cuối */}
                  <TouchableOpacity style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} onPress={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                    <MaterialCommunityIcons name="chevron-double-right" size={16} color={currentPage === totalPages ? "#CBD5E1" : "#64748B"} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        </View>
        <TouchableOpacity style={styles.fabBtn} onPress={() => router.push('/add-patient')}>
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' }, mainWrapper: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  topBarLeft: { flex: 1 }, pageTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center' }, breadcrumbText: { fontSize: 12, color: '#64748B' }, breadcrumbTextActive: { fontSize: 12, color: '#0F766E', fontWeight: '600' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 36, height: 36, backgroundColor: '#FFFFFF', borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }, badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 4, paddingRight: 10, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }, profileName: { fontSize: 13, fontWeight: '600', color: '#334155', marginLeft: 8, marginRight: 4 },
  bodyContent: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 }, 
  cardsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16, alignItems: 'stretch' },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, height: '100%', marginLeft: 8, outlineStyle: 'none', fontSize: 13, color: '#334155' },
  refreshBtn: { width: 40, height: 40, backgroundColor: '#FFFFFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  tableCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1, overflow: 'hidden' },
  tableWrapper: { width: '100%', minWidth: 800, flex: 1 }, 
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  td: { fontSize: 13, color: '#334155', fontWeight: '500' },
  tdIconBox: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, statusBadgeText: { fontSize: 11, fontWeight: '700' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, actionIcon: { padding: 6, borderRadius: 8 },
  
  // Styles mới cho Pagination
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  paginationText: { fontSize: 13, color: '#64748B' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  pageBtnActive: { backgroundColor: '#F0FDFA', borderColor: '#0F766E' },
  pageBtnDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  pageTextActive: { fontSize: 13, color: '#0F766E', fontWeight: '800' },

  fabBtn: { position: 'absolute', bottom: 32, right: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
});