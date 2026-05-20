import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function NotificationModal({ visible, onClose, notifications }: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thông báo của bạn</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="bell-sleep-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Bạn không có thông báo nào.</Text>
              </View>
            ) : (
              notifications.map((noti: any, index: number) => (
                <View key={index} style={[styles.notiCard, noti.isUnread && styles.notiCardUnread]}>
                  <View style={[styles.iconBox, { backgroundColor: noti.type === 'warning' ? '#FEF2F2' : '#F0FDF4' }]}>
                    <MaterialCommunityIcons 
                      name={noti.type === 'warning' ? 'alert-circle' : 'message-bulleted'} 
                      size={24} 
                      color={noti.type === 'warning' ? '#EF4444' : '#10B981'} 
                    />
                  </View>
                  <View style={styles.notiContent}>
                    <View style={styles.notiHeaderRow}>
                      <Text style={[styles.notiTitle, noti.isUnread && { fontWeight: '800', color: '#1E293B' }]}>{noti.title}</Text>
                      <Text style={styles.notiTime}>{noti.time}</Text>
                    </View>
                    <Text style={styles.notiMessage}>{noti.message}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, minHeight: '60%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  closeBtn: { padding: 4, backgroundColor: '#E2E8F0', borderRadius: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  notiCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  notiCardUnread: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notiContent: { flex: 1 },
  notiHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notiTitle: { fontSize: 15, fontWeight: '600', color: '#475569', flex: 1 },
  notiTime: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  notiMessage: { fontSize: 13, color: '#64748B', lineHeight: 18 }
});