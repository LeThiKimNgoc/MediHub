import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, FlatList, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface HistoryModalProps {
  visible: boolean;
  historyLogs: any[];
  loadingHistory: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, historyLogs, loadingHistory, onClose }) => {
  
  // 🔥 ĐẢO NGƯỢC DANH SÁCH: Cái gì mới nhất hiện lên đầu
  const sortedLogs = [...historyLogs].reverse();

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.historyModalOverlay}>
        <View style={styles.historyModalContent}>
          <View style={styles.indicator} />
          
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.historyTitle}>Lịch Sử Sử Dụng</Text>
              <Text style={styles.historySubTitle}>Ghi nhận quá trình dùng thuốc</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>
          
          {loadingHistory ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <FlatList
              data={sortedLogs}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                let statusColor = item.Status === 'Đã sử dụng' ? '#15803D' : (item.Status === 'Bỏ lỡ' ? '#B91C1C' : '#C2410C');
                let bgColor = item.Status === 'Đã sử dụng' ? '#DCFCE7' : (item.Status === 'Bỏ lỡ' ? '#FEE2E2' : '#FFEDD5');
                let iconName: any = item.Status === 'Đã sử dụng' ? 'check-decagram' : (item.Status === 'Bỏ lỡ' ? 'close-octagon' : 'clock-alert');

                return (
                  <View style={styles.historyCard}>
                    {/* 🔥 HIỂN THỊ ẢNH THUỐC TRONG LỊCH SỬ NẾU CÓ */}
                    <View style={styles.medIconBox}>
                      {item.ImageUrl ? (
                        <Image source={{ uri: item.ImageUrl }} style={styles.medImage} resizeMode="cover" />
                      ) : (
                        <MaterialCommunityIcons name="pill" size={24} color={colors.primary} />
                      )}
                    </View>

                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={styles.historyMedName} numberOfLines={1}>{item.MedicineName}</Text>
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="calendar-clock" size={14} color={colors.textLight} />
                        <Text style={styles.historyTime}>Cữ: {item.PlannedTime}</Text>
                      </View>
                      <Text style={styles.historyTimestamp}>Lúc: {item.Timestamp || 'Vừa xong'}</Text>
                    </View>

                    <View style={[styles.historyStatusBadge, {backgroundColor: bgColor}]}>
                      <MaterialCommunityIcons name={iconName} size={16} color={statusColor} />
                      <Text style={[styles.historyStatusText, {color: statusColor}]}>{item.Status}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="text-box-search-outline" size={80} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Chưa có dữ liệu sử dụng.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  historyModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  historyModalContent: { backgroundColor: 'white', width: '100%', height: '85%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
  indicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  historyTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  historySubTitle: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  medIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  medImage: { width: '100%', height: '100%' },
  historyMedName: { fontSize: 17, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  historyTime: { fontSize: 14, color: colors.textLight, fontWeight: '500' },
  historyTimestamp: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
  historyStatusBadge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', gap: 4 },
  historyStatusText: { fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94A3B8', textAlign: 'center', fontSize: 16, marginTop: 15 }
});