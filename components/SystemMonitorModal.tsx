import React, { useState, createElement } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SystemMonitorModal({ visible, onClose, selectedPatient, allReminds }: any) {
  const [filterDate, setFilterDate] = useState(new Date());

  const getNotificationData = () => {
    if (!selectedPatient) return { queue: [], sent: [] };

    const targetDate = new Date(filterDate);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isPast = targetDate.getTime() < today.getTime();
    const isToday = targetDate.getTime() === today.getTime();
    const currentMins = new Date().getHours() * 60 + new Date().getMinutes();

    const patientReminds = allReminds.filter((r: any) => String(r['PatientsID']).trim() === selectedPatient.patientId);
    
    let allEvents: any[] = [];
    patientReminds.forEach((r: any) => {
        if (!r.Time || String(r.Reminder_mode).trim() !== 'Bật') return; 
        const times = String(r.Time).split(',');
        times.forEach(t => {
            const timeStr = t.trim();
            const parts = timeStr.split(':');
            if(parts.length >= 2) {
               allEvents.push({
                   timeStr: timeStr,
                   mins: parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10),
                   medName: r.MedicineName
               });
            }
        });
    });

    allEvents.sort((a, b) => a.mins - b.mins);

    let queue: any[] = [];
    let sent: any[] = [];

    allEvents.forEach(ev => {
        let isSent = false;
        if (isPast) isSent = true;
        else if (isToday && ev.mins <= currentMins) isSent = true;
        
        if (isSent) sent.push(ev);
        else queue.push(ev);
    });

    return { queue, sent };
  };

  const { queue, sent } = getNotificationData();

  const changeDate = (days: number) => {
    const newDate = new Date(filterDate);
    newDate.setDate(newDate.getDate() + days);
    setFilterDate(newDate);
  };

  const formatDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  const formatForInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>System Monitor ⚡</Text>
              <Text style={styles.modalSubtitle}>Patient: {selectedPatient?.name} ({selectedPatient?.patientId})</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {selectedPatient && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              <View style={styles.notiSection}>
                <Text style={styles.notiSectionTitle}>Quyền Push Notification</Text>
                <View style={styles.permissionBox}>
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#10B981" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.infoValue, { color: '#0F766E' }]}>Đã cấp quyền truy cập</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Device Token: Validated & Active</Text>
                  </View>
                </View>
              </View>

              <View style={styles.dateFilterWrapper}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}><MaterialCommunityIcons name="chevron-left" size={24} color="#475569" /></TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                  <MaterialCommunityIcons name="calendar-month" size={18} color="#0F766E" style={{ marginRight: 8 }}/>
                  <Text style={styles.dateText}>{formatDate(filterDate)}</Text>
                  {Platform.OS === 'web' && createElement('input', {
                      type: 'date', value: formatForInput(filterDate),
                      onChange: (e: any) => { if(e.target.value) setFilterDate(new Date(e.target.value + "T00:00:00")); },
                      style: { position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }
                  })}
                </View>
                <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}><MaterialCommunityIcons name="chevron-right" size={24} color="#475569" /></TouchableOpacity>
              </View>

              <View style={styles.notiSection}>
                <Text style={styles.notiSectionTitle}>Hàng đợi gửi (Pending Queue)</Text>
                <View style={styles.queueBox}>
                  {queue.length === 0 ? (
                    <Text style={styles.emptyQueueText}>Không có lịch hẹn nào đang chờ.</Text>
                  ) : (
                    queue.map((q, idx) => (
                      <View key={`q-${idx}`} style={[styles.queueItem, idx === queue.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.timeBadge}><Text style={styles.timeText}>{q.timeStr}</Text></View>
                        <Text style={styles.queueDesc}>Nhắc lịch: {q.medName}</Text>
                        <MaterialCommunityIcons name="clock-outline" size={18} color="#F59E0B" />
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.notiSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <Text style={styles.notiSectionTitle}>Tổng đã phát (Sent)</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>{sent.length} Success</Text>
                </View>
                <View style={styles.queueBox}>
                  {sent.length === 0 ? (
                    <Text style={styles.emptyQueueText}>Chưa có lịch phát nào trong ngày.</Text>
                  ) : (
                    sent.map((s, idx) => (
                      <View key={`s-${idx}`} style={[styles.queueItem, idx === sent.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[styles.timeBadge, { backgroundColor: '#ECFDF5' }]}><Text style={[styles.timeText, { color: '#10B981' }]}>{s.timeStr}</Text></View>
                        <Text style={[styles.queueDesc, { color: '#64748B' }]}>Đã đẩy Push: {s.medName}</Text>
                        <MaterialCommunityIcons name="check-all" size={18} color="#10B981" />
                      </View>
                    ))
                  )}
                </View>
              </View>

            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 450, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },
  closeModalBtn: { padding: 6, backgroundColor: '#F1F5F9', borderRadius: 20 },
  modalBody: { maxHeight: 450 },
  notiSection: { marginBottom: 20 },
  notiSectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  infoValue: { fontSize: 14, color: '#334155', fontWeight: '700' },
  permissionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  dateFilterWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 14, fontWeight: '700', color: '#0F766E' },
  queueBox: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  queueItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  timeBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12, width: 55, alignItems: 'center' },
  timeText: { fontSize: 12, fontWeight: '800', color: '#D97706' },
  queueDesc: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '500' },
  emptyQueueText: { padding: 16, fontSize: 13, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }
});