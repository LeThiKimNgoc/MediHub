import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface HistoryModalProps {
  visible: boolean;
  historyLogs: any[];
  loadingHistory: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, historyLogs, loadingHistory, onClose }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.historyModalOverlay}>
        <View style={styles.historyModalContent}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Lịch Sử Tra Thuốc</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={28} color={colors.textDark} />
            </TouchableOpacity>
          </View>
          
          {loadingHistory ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <FlatList
              data={historyLogs}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 25 }}
              renderItem={({ item }) => {
                let statusColor = item.Status === 'Đã sử dụng' ? '#15803D' : (item.Status === 'Bỏ lỡ' ? '#B91C1C' : '#C2410C');
                let bgColor = item.Status === 'Đã sử dụng' ? '#DCFCE7' : (item.Status === 'Bỏ lỡ' ? '#FEE2E2' : '#FFEDD5');
                let iconName: any = item.Status === 'Đã sử dụng' ? 'check-circle' : (item.Status === 'Bỏ lỡ' ? 'close-circle' : 'alarm-snooze');

                return (
                  <View style={styles.historyCard}>
                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={styles.historyMedName}>{item.MedicineName}</Text>
                      <Text style={styles.historyTime}>Cữ thuốc lúc: {item.PlannedTime}</Text>
                      <Text style={styles.historyTimestamp}>Ghi nhận: {item.Timestamp || 'Hôm nay'}</Text>
                    </View>
                    <View style={[styles.historyStatusBadge, {backgroundColor: bgColor}]}>
                      <MaterialCommunityIcons name={iconName} size={18} color={statusColor} style={{marginRight: 4}} />
                      <Text style={[styles.historyStatusText, {color: statusColor}]} numberOfLines={1}>{item.Status}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="text-box-search-outline" size={80} color="#CBD5E1" /><Text style={styles.emptyText}>Chưa có lịch sử dùng thuốc.</Text></View>}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  historyModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  historyModalContent: { backgroundColor: 'white', width: '95%', height: '85%', borderRadius: 30, padding: 25, elevation: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 20 },
  historyTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#F8FAFC', borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  historyMedName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 6 },
  historyTime: { fontSize: 15, color: colors.textLight },
  historyTimestamp: { fontSize: 14, color: '#64748B', marginTop: 6, fontStyle: 'italic' },
  historyStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  historyStatusText: { fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94A3B8', textAlign: 'center', fontSize: 18, marginTop: 15 }
});