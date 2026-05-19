import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, useWindowDimensions, TextInput, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Papa from 'papaparse';

import SummaryCard from '../components/SummaryCard';
import SystemMonitorModal from '../components/SystemMonitorModal';
import { useTheme } from './_layout'; 

export default function PatientScreen() {
  const { theme, isDark } = useTheme(); 
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPatients: 0, noReminders: 0, activeReminders: 0, urgentSupport: 0, activeMeds: 0 });
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [allReminds, setAllReminds] = useState<any[]>([]);

  // Bảng chi tiết Nhắc nhở (Thẻ vàng)
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [activeMedsList, setActiveMedsList] = useState<any[]>([]);

  // 🔥 THÊM: Bảng chi tiết Cần hỗ trợ gấp (Thẻ đỏ)
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [urgentPatientsList, setUrgentPatientsList] = useState<any[]>([]);

  const [isNotiModalVisible, setNotiModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

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

      const validPatientIds = new Set(patientsData.map((p: any) => String(p['PatientID'] || p['Mã BN'] || p['PatientsID']).trim().toUpperCase()));

      const activePatientsSet = new Set();
      let activeMedsCount = 0;
      const detailsList: any[] = []; 

      remindData.forEach((r: any) => {
          const rawId = r['PatientID'] || r['PatientsID'] || r['Mã BN'];
          const pid = rawId ? String(rawId).trim().toUpperCase() : null;
          const mode = r['Reminder_mode'] ? String(r['Reminder_mode']).trim() : '';
          
          if (pid && validPatientIds.has(pid) && mode === 'Bật') {
              activePatientsSet.add(pid); 
              activeMedsCount++;     

              const pInfo = patientsData.find((p: any) => String(p['PatientID'] || p['Mã BN'] || p['PatientsID']).trim().toUpperCase() === pid);
              const pName = pInfo ? (pInfo['Họ và tên'] || pInfo['Họ tên'] || pInfo['Tên Bệnh Nhân']) : 'Không rõ';
              
              detailsList.push({ pid: pid, name: pName, medName: r['MedicineName'] || r['Tên thuốc'] || '--', time: r['Time'] || r['Giờ uống'] || '--' });    
          }
      });

      const activePeopleCount = activePatientsSet.size;
      const noRemindCount = Math.max(0, patientsData.length - activePeopleCount);

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
      const urgentListTemp: any[] = []; // 🔥 Mảng tạm chứa các ca khẩn cấp

      const formattedPatients = patientsData.map((p: any, index: number) => {
          const rawId = p['PatientID'] || p['Mã BN'] || p['PatientsID'];
          const pid = String(rawId).trim().toUpperCase();
          const name = p['Họ và tên'] || p['Họ tên'] || p['Tên Bệnh Nhân'] || p['Name'] || '--';
          
          let finalAd = 0;
          if (adherenceMap[pid]) finalAd = Math.round(adherenceMap[pid].total / adherenceMap[pid].count);

          let statusLabel = 'Chưa thiết lập';
          if (!adherenceMap[pid]) statusLabel = 'Chưa có data';
          else if (finalAd >= 90) statusLabel = 'Tuân thủ tốt';
          else if (finalAd < 50) statusLabel = 'Trễ liều';
          else statusLabel = 'Cần lưu ý';

          // 🔥 Bắt các ca < 90% đẩy vào mảng Urgent
          if (adherenceMap[pid] && finalAd < 90) {
            urgent++;
            urgentListTemp.push({ pid: pid, name: name, adherence: finalAd });
          }

          return {
              id: String(index), stt: String(index + 1), patientId: pid, name: name,
              age: p['Age'] || p['Tuổi'] || '--', gender: p['Gender'] || p['Giới tính'] || '--',
              date: p['DayStart'] || p['Ngày khám'] || '--/--/----', status: statusLabel, rawData: p 
          };
      });

      setStats({ totalPatients: patientsData.length, noReminders: noRemindCount, activeReminders: activePeopleCount, urgentSupport: urgent, activeMeds: activeMedsCount });
      setPatientsList(formattedPatients);
      setActiveMedsList(detailsList); 
      setUrgentPatientsList(urgentListTemp); // 🔥 Cập nhật State danh sách khẩn cấp
      setCurrentPage(1); 

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
        } else Alert.alert('Lỗi', result.message || 'Không thể xóa.');
      } catch (error) { Alert.alert('Lỗi', 'Không thể kết nối máy chủ.'); } finally { setLoading(false); }
    };
    if (Platform.OS === 'web') { 
      if (window.confirm(`⚠️ Bạn có chắc muốn xóa vĩnh viễn hồ sơ của ${pName} không?`)) executeDelete(); 
    } else Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa vĩnh viễn hồ sơ của ${pName} không?`, [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: executeDelete }]); 
  };

  const renderStatusBadge = (status: string) => {
    let bgColor = isDark ? theme.border : '#F1F5F9'; 
    let textColor = theme.muted;
    if (status === 'Tuân thủ tốt') { bgColor = isDark ? '#022c22' : '#ECFDF5'; textColor = isDark ? '#34d399' : '#10B981'; }
    else if (status === 'Cần lưu ý') { bgColor = isDark ? '#422006' : '#FEF3C7'; textColor = isDark ? '#fbbf24' : '#D97706'; }
    else if (status === 'Trễ liều') { bgColor = isDark ? '#450a0a' : '#FEE2E2'; textColor = isDark ? '#f87171' : '#EF4444'; }
    return <View style={[styles.statusBadge, { backgroundColor: bgColor }]}><Text style={[styles.statusBadgeText, { color: textColor }]}>{status}</Text></View>;
  };

  const totalPages = Math.ceil(patientsList.length / itemsPerPage);
  const currentData = patientsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      
      <SystemMonitorModal visible={isNotiModalVisible} onClose={() => setNotiModalVisible(false)} selectedPatient={selectedPatient} allReminds={allReminds} />

      <View style={styles.mainWrapper}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>Hồ sơ bệnh nhân</Text>
            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbText}>Trang chủ</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color="#94A3B8" />
              <Text style={[styles.breadcrumbTextActive, { color: theme.primary }]}>Hồ sơ bệnh nhân</Text>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}><MaterialCommunityIcons name="bell-outline" size={20} color={theme.muted} /><View style={styles.badge}><Text style={styles.badgeText}>{stats.urgentSupport}</Text></View></TouchableOpacity>
            <TouchableOpacity style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[styles.avatar, { backgroundColor: theme.primary }]}><Text style={styles.avatarText}>AD</Text></View>{!isMobile && <Text style={[styles.profileName, { color: theme.text }]}>Administrator</Text>}</TouchableOpacity>
          </View>
        </View>

        <View style={styles.bodyContent}>
          <View style={[styles.cardsGrid, isMobile && { flexDirection: 'column' }]}>
            <View style={{ flex: 1 }}><SummaryCard title="Tổng bệnh nhân" value={stats.totalPatients} isLoading={loading} icon="account-group-outline" color={isDark ? '#34d399' : '#0F766E'} bgColor={isDark ? '#022c22' : '#ECFDF5'} trendText="Dữ liệu thời gian thực" isTrendUp={true} hasSparkline={true} sparklineColor={isDark ? '#34d399' : '#10B981'} /></View>
            <View style={{ flex: 1 }}><SummaryCard title="Chưa có nhắc nhở" value={stats.noReminders} isLoading={loading} icon="account-clock-outline" color={isDark ? '#60a5fa' : '#3B82F6'} bgColor={isDark ? '#172554' : '#EFF6FF'} trendText="Cần thiết lập phác đồ" isTrendUp={false} hasSparkline={true} sparklineColor={isDark ? '#60a5fa' : '#3B82F6'} /></View>
            
            <View style={{ flex: 1 }}>
              <SummaryCard title="Đang nhận nhắc nhở" value={stats.activeReminders} isLoading={loading} icon="calendar-check-outline" color={isDark ? '#fbbf24' : '#F59E0B'} bgColor={isDark ? '#422006' : '#FFFBEB'} trendText={`Bao gồm ${stats.activeMeds} phác đồ`} actionText="Xem chi tiết" onActionPress={() => setShowActiveModal(true)} />
            </View>

            {/* 🔥 GẮN SỰ KIỆN MỞ BẢNG KHẨN CẤP */}
            <View style={{ flex: 1 }}>
              <SummaryCard 
                title="Cần hỗ trợ gấp" 
                value={stats.urgentSupport} 
                isLoading={loading} 
                icon="alert-outline" 
                color={isDark ? '#f87171' : '#EF4444'} 
                bgColor={isDark ? '#450a0a' : '#FEF2F2'} 
                trendText="Tuân thủ dưới 90%" 
                actionText="Chi tiết" 
                onActionPress={() => setShowUrgentModal(true)} 
              />
            </View>
          </View>

          <View style={styles.filterBar}>
            <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.muted} />
              <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Tìm mã BN hoặc tên bệnh nhân..." placeholderTextColor={theme.muted} outlineStyle="none" as any />
            </View>
            <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={fetchPatientStats}>
              {loading ? <ActivityIndicator size="small" color={theme.text} /> : <MaterialCommunityIcons name="refresh" size={18} color={theme.text} />}
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Danh sách bệnh nhân</Text>

          <View style={[styles.tableCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
              <View style={styles.tableWrapper}>
                <View style={[styles.tableHeaderRow, { backgroundColor: isDark ? theme.bg : '#F8FAFC', borderBottomColor: theme.border }]}>
                  <Text style={[styles.th, { width: 50, textAlign: 'center', color: theme.muted }]}>STT</Text>
                  <Text style={[styles.th, { width: 100, color: theme.muted }]}>Mã BN</Text>
                  <Text style={[styles.th, { flex: 1, minWidth: 160, color: theme.muted }]}>Họ và tên</Text>
                  <Text style={[styles.th, { width: 60, color: theme.muted }]}>Tuổi</Text>
                  <Text style={[styles.th, { width: 80, color: theme.muted }]}>Giới tính</Text>
                  <Text style={[styles.th, { width: 130, color: theme.muted }]}>Ngày khám</Text>
                  <Text style={[styles.th, { width: 120, textAlign: 'center', color: theme.muted }]}>Tuân thủ</Text>
                  <Text style={[styles.th, { width: 130, textAlign: 'center', color: theme.muted }]}>Thao tác</Text> 
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                  {loading ? (
                    <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color={theme.primary} /></View>
                  ) : currentData.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}><Text style={{ color: theme.muted }}>Trống.</Text></View>
                  ) : (
                    currentData.map((item, index) => (
                      <View key={item.id} style={[styles.tableRow, { borderBottomColor: theme.border }, index === currentData.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={[styles.td, { width: 50, textAlign: 'center', color: theme.muted }]}>{item.stt}</Text>
                        <TouchableOpacity style={{ width: 100 }} onPress={() => router.push(`/patient-meds?id=${item.patientId}&name=${item.name}`)}>
                          <Text style={[styles.td, { color: isDark ? '#38bdf8' : '#0284C7', fontWeight: '700', textDecorationLine: 'underline' }]}>{item.patientId}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.td, { flex: 1, minWidth: 160, color: isDark ? '#fbbf24' : '#B45309', fontWeight: '700' }]}>{item.name}</Text>
                        <Text style={[styles.td, { width: 60, color: theme.text }]}>{item.age}</Text>
                        <Text style={[styles.td, { width: 80, color: theme.text }]}>{item.gender}</Text>
                        <View style={[styles.tdIconBox, { width: 130 }]}><MaterialCommunityIcons name="calendar-blank-outline" size={14} color={theme.muted} style={{marginRight: 4}} /><Text style={[styles.td, { color: theme.text }]}>{item.date}</Text></View>
                        <View style={{ width: 120, alignItems: 'center', justifyContent: 'center' }}>{renderStatusBadge(item.status)}</View>
                        <View style={[styles.actionCell, { width: 130 }]}>
                          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: isDark ? '#082f49' : '#E0F2FE' }]} onPress={() => handleOpenNotiModal(item)}><MaterialCommunityIcons name="eye-outline" size={16} color={isDark ? '#38bdf8' : '#0284C7'} /></TouchableOpacity>
                          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]} onPress={() => router.push({ pathname: '/edit-patient', params: { id: item.patientId } } as any)}><MaterialCommunityIcons name="pencil-outline" size={16} color={isDark ? '#fbbf24' : '#D97706'} /></TouchableOpacity>
                          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: isDark ? '#450a0a' : '#FEE2E2' }]} onPress={() => handleDeletePatient(item.patientId, item.name)}><MaterialCommunityIcons name="trash-can-outline" size={16} color={isDark ? '#f87171' : '#EF4444'} /></TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={[styles.tableFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <Text style={[styles.paginationText, { color: theme.muted }]}>
                Đang hiển thị <Text style={{fontWeight: '700', color: theme.text}}>{currentData.length}</Text> trên tổng số <Text style={{fontWeight: '700', color: theme.text}}>{patientsList.length}</Text> bệnh nhân
              </Text>

              {totalPages > 1 && (
                <View style={styles.paginationControls}>
                  <TouchableOpacity style={[styles.pageBtn, { backgroundColor: theme.surface, borderColor: theme.border }, currentPage === 1 && { backgroundColor: theme.bg }]} onPress={() => setCurrentPage(1)} disabled={currentPage === 1}><MaterialCommunityIcons name="chevron-double-left" size={16} color={currentPage === 1 ? theme.border : theme.text} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.pageBtn, { backgroundColor: theme.surface, borderColor: theme.border }, currentPage === 1 && { backgroundColor: theme.bg }]} onPress={handlePrevPage} disabled={currentPage === 1}><MaterialCommunityIcons name="chevron-left" size={16} color={currentPage === 1 ? theme.border : theme.text} /></TouchableOpacity>
                  <View style={[styles.pageBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}><Text style={[styles.pageTextActive, { color: theme.primary }]}>{currentPage}</Text></View>
                  <Text style={{ fontSize: 13, color: theme.muted, marginHorizontal: 4, fontWeight: '600' }}>/ {totalPages}</Text>
                  <TouchableOpacity style={[styles.pageBtn, { backgroundColor: theme.surface, borderColor: theme.border }, currentPage === totalPages && { backgroundColor: theme.bg }]} onPress={handleNextPage} disabled={currentPage === totalPages}><MaterialCommunityIcons name="chevron-right" size={16} color={currentPage === totalPages ? theme.border : theme.text} /></TouchableOpacity>
                  <TouchableOpacity style={[styles.pageBtn, { backgroundColor: theme.surface, borderColor: theme.border }, currentPage === totalPages && { backgroundColor: theme.bg }]} onPress={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><MaterialCommunityIcons name="chevron-double-right" size={16} color={currentPage === totalPages ? theme.border : theme.text} /></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.fabBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => router.push('/add-patient')}>
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* MODAL 1: BẢNG CHI TIẾT NHẮC NHỞ (THẺ VÀNG) */}
      <Modal visible={showActiveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Chi tiết phác đồ đang kích hoạt</Text>
              <TouchableOpacity onPress={() => setShowActiveModal(false)}><MaterialCommunityIcons name="close" size={24} color={theme.muted} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20, maxHeight: 400 }}>
              {activeMedsList.length === 0 ? (
                <Text style={{ color: theme.muted, textAlign: 'center', marginVertical: 20 }}>Không có phác đồ nào đang chạy.</Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {activeMedsList.map((item, i) => (
                    <View key={i} style={[styles.medsRow, { borderBottomColor: theme.border }]}>
                       <View style={styles.medsIcon}><MaterialCommunityIcons name="pill" size={20} color={theme.primary} /></View>
                       <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.name} <Text style={{ color: theme.muted, fontWeight: '500', fontSize: 12 }}>(ID: {item.pid})</Text></Text>
                          <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600', marginTop: 2 }}>{item.medName}</Text>
                       </View>
                       <View style={[styles.timeBadge, { backgroundColor: theme.primaryLight }]}>
                          <MaterialCommunityIcons name="clock-outline" size={14} color={theme.primary} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary, marginLeft: 4 }}>{item.time}</Text>
                       </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔥 MODAL 2: BẢNG BỆNH NHÂN CẦN HỖ TRỢ GẤP (THẺ ĐỎ) */}
      <Modal visible={showUrgentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>Bệnh nhân cần hỗ trợ khẩn cấp</Text>
              <TouchableOpacity onPress={() => setShowUrgentModal(false)}><MaterialCommunityIcons name="close" size={24} color={theme.muted} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20, maxHeight: 400 }}>
              {urgentPatientsList.length === 0 ? (
                <Text style={{ color: theme.muted, textAlign: 'center', marginVertical: 20 }}>Tuyệt vời! Tất cả bệnh nhân đều tuân thủ tốt.</Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {urgentPatientsList.map((item, i) => (
                    <View key={i} style={[styles.medsRow, { borderBottomColor: theme.border }]}>
                       <View style={[styles.medsIcon, { backgroundColor: isDark ? '#450a0a' : '#FEF2F2' }]}>
                          <MaterialCommunityIcons name="alert" size={20} color={isDark ? '#f87171' : '#EF4444'} />
                       </View>
                       <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{item.name} <Text style={{ color: theme.muted, fontWeight: '500', fontSize: 12 }}>(ID: {item.pid})</Text></Text>
                          <Text style={{ fontSize: 13, color: theme.muted, marginTop: 2 }}>Tỷ lệ tuân thủ hiện tại:</Text>
                       </View>
                       <View style={[styles.timeBadge, { backgroundColor: isDark ? '#450a0a' : '#FEF2F2' }]}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#f87171' : '#EF4444' }}>{item.adherence}%</Text>
                       </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, mainWrapper: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  topBarLeft: { flex: 1 }, pageTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center' }, breadcrumbText: { fontSize: 12, color: '#64748B' }, breadcrumbTextActive: { fontSize: 12, fontWeight: '600' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }, badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', padding: 4, paddingRight: 10, borderRadius: 20, borderWidth: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }, profileName: { fontSize: 13, fontWeight: '600', marginLeft: 8, marginRight: 4 },
  bodyContent: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 }, 
  cardsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16, alignItems: 'stretch' },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, height: 40, borderWidth: 1 },
  searchInput: { flex: 1, height: '100%', marginLeft: 8, fontSize: 13 },
  refreshBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  tableCard: { flex: 1, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1, overflow: 'hidden' },
  tableWrapper: { width: '100%', minWidth: 800, flex: 1 }, 
  tableHeaderRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  th: { fontSize: 12, fontWeight: '700' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  td: { fontSize: 13, fontWeight: '500' },
  tdIconBox: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, statusBadgeText: { fontSize: 11, fontWeight: '700' },
  actionCell: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, actionIcon: { padding: 6, borderRadius: 8 },
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  paginationText: { fontSize: 13 },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  pageTextActive: { fontSize: 13, fontWeight: '800' },
  fabBtn: { position: 'absolute', bottom: 32, right: 32, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 600, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  medsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  medsIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }
});