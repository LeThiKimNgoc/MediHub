import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getMedIcon } from '../../utils/helpers';

interface HistoryModalProps {
  visible: boolean;
  historyLogs: any[];
  medications?: any[]; // 🔥 Mảng thuốc truyền vào để đối chiếu icon
  loadingHistory: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ visible, historyLogs, medications = [], loadingHistory, onClose }) => {
  // Đảo ngược mảng để lịch sử mới nhất hiện lên trên cùng
  const sortedLogs = [...historyLogs].reverse();

  const renderItem = ({ item }: { item: any }) => {
    // 🔥 THUẬT TOÁN ĐỐI CHIẾU: Tìm tên thuốc trong mảng gốc để lấy đúng Icon
    const medOrigin = medications.find(m => m.MedicineName === item.MedicineName);
    const iconName = medOrigin ? getMedIcon(medOrigin) : "pill"; 
    const isEyeDrop = iconName === 'water' || iconName === 'eye-drop';

    let statusColor = '#10B981';
    let statusBg = '#D1FAE5';
    let statusIcon = 'check-decagram';
    
    if (item.Status === 'Bỏ lỡ' || item.Status === 'Bỏ qua') {
        statusColor = '#EF4444';
        statusBg = '#FEE2E2';
        statusIcon = 'close-circle';
    } else if (item.Status === 'Nhắc lại' || item.Status === 'Chưa sử dụng') {
        statusColor = '#F59E0B';
        statusBg = '#FEF3C7';
        statusIcon = 'alarm-snooze';
    }

    return (
      <View style={styles.logCard}>
        <View style={[styles.iconBox, isEyeDrop ? {backgroundColor: '#E0F2FE'} : {backgroundColor: '#F0F9FF'}]}>
           {/* Nếu là thuốc uống thì hiện viên thuốc màu xanh ngọc, nhỏ mắt thì giọt nước màu xanh dương */}
           <MaterialCommunityIcons name={iconName as any} size={28} color={isEyeDrop ? '#0284C7' : '#0ea5e9'} />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.medName}>{item.MedicineName}</Text>
          <View style={styles.timeRow}>
             <MaterialCommunityIcons name="calendar-clock" size={14} color={colors.textLight} />
             <Text style={styles.plannedTime}>Cữ: {item.PlannedTime}</Text>
          </View>
          <Text style={styles.timestamp}>Lúc: {item.Timestamp}</Text>
        </View>
        
        {/* Nhãn trạng thái xếp dọc icon nằm trên, chữ nằm dưới */}
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
           <MaterialCommunityIcons name={statusIcon as any} size={20} color={statusColor} />
           <Text style={[styles.statusText, { color: statusColor }]}>{item.Status}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <View style={styles.header}>
             <View>
               <Text style={styles.title}>Lịch Sử Sử Dụng</Text>
               <Text style={styles.subtitle}>Ghi nhận quá trình dùng thuốc</Text>
             </View>
             <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
             </TouchableOpacity>
          </View>

          {loadingHistory ? (
             <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
          ) : (
             <FlatList
               data={sortedLogs}
               keyExtractor={(item, index) => index.toString()}
               renderItem={renderItem}
               contentContainerStyle={{ paddingBottom: 20 }}
               showsVerticalScrollIndicator={false}
               ListEmptyComponent={<Text style={styles.emptyText}>Chưa có lịch sử sử dụng.</Text>}
             />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  subtitle: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  closeBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 20 },
  
  logCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 15 },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  
  logInfo: { flex: 1 },
  medName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  plannedTime: { fontSize: 14, color: colors.textLight, marginLeft: 6, fontWeight: '600' },
  timestamp: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  
  statusBadge: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minWidth: 85 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginTop: 4 } 
});