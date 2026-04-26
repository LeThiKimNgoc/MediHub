import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getEyeIndicator, getMedIcon, getMedTerminology } from '../../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';

interface DashboardHeaderProps {
  patientName: string;
  dashboardStats: any;
  cooldown: number; 
  loading: boolean;
  onOpenProfile: () => void;
  onOpenLogModal: (med: any) => void;
  onOpenHistory: () => void;
  onRefresh: () => void;
  onSOS: () => void;
  onLogout: () => void;
  onOpenSymptoms: () => void; 
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  patientName, dashboardStats, cooldown, loading, onOpenProfile, onOpenLogModal, onLogout
}) => {
  
  const nextDoses = dashboardStats.nextDoses || [];
  const targetTime = nextDoses.length > 0 ? nextDoses[0].Time : '';

  // PHÂN LOẠI THUỐC
  const eyeDrops = nextDoses.filter((med: any) => {
    const term = getMedTerminology(med).action;
    return term === 'nhỏ' || term === 'tra';
  });

  const oralMeds = nextDoses.filter((med: any) => {
    const term = getMedTerminology(med).action;
    return term !== 'nhỏ' && term !== 'tra';
  });

  // COMPONENT VẼ TỪNG THẺ THUỐC (KÍCH THƯỚC BẰNG NHAU)
  const renderDoseCard = (med: any, type: 'eye' | 'oral') => {
    const terms = getMedTerminology(med);
    const isEyeDrop = type === 'eye';
    const isLocked = isEyeDrop && cooldown > 0; // Cooldown chỉ khóa thuốc nhỏ mắt

    return (
      <View key={med.MedicineName} style={[styles.doseCard, isEyeDrop ? styles.eyeDropCard : styles.oralCard]}>
        <View style={styles.doseCardContent}>
          <View style={[styles.doseIconBox, isEyeDrop ? {backgroundColor: '#E0F2FE'} : {backgroundColor: '#D1FAE5'}]}>
            {med.ImageUrl ? (
               <Image source={{uri: med.ImageUrl}} style={styles.doseImage} resizeMode="cover"/>
            ) : (
               <MaterialCommunityIcons name={getMedIcon(med) as any} size={30} color={isEyeDrop ? '#0284C7' : '#059669'} />
            )}
          </View>
          <View style={styles.doseInfo}>
            <Text style={styles.doseName}>{med.MedicineName}</Text>
            <Text style={styles.doseAmount}>Liều lượng: {med.Dose}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.confirmBtn, isLocked ? styles.btnLocked : (isEyeDrop ? styles.btnEyeDrop : styles.btnOral)]} 
          onPress={() => onOpenLogModal(med)}
          disabled={isLocked}
        >
          <MaterialCommunityIcons name={isLocked ? "timer-sand" : "check-decagram"} size={20} color="white" />
          <Text style={styles.confirmBtnText}>
            {isLocked ? `Đang chờ ${Math.floor(cooldown / 60)} phút...` : `XÁC NHẬN ${terms.btn.toUpperCase()}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greetingText}>Xin chào,</Text>
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.avatarBtn} onPress={onOpenProfile}>
            <MaterialCommunityIcons name="face-man-profile" size={32} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressTitle}>Tiến độ hôm nay</Text>
          <Text style={styles.progressRatio}>{dashboardStats.completed}/{dashboardStats.total}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${dashboardStats.progressPercent}%` }]} />
        </View>
      </View>

      {/* KHỐI HIỂN THỊ CÁC THUỐC CÙNG GIỜ */}
      {nextDoses.length > 0 && !loading && (
        <View style={styles.heroContainer}>
          <View style={styles.heroTimeHeader}>
            <MaterialCommunityIcons name="alarm" size={26} color={colors.timeColor} />
            <Text style={styles.heroTimeText}>Cữ thuốc tiếp theo lúc: {targetTime}</Text>
          </View>

          {/* NHÓM 1: THUỐC NHỎ MẮT (Ưu tiên hiển thị trước) */}
          {eyeDrops.length > 0 && (
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <MaterialCommunityIcons name="eye-drop" size={22} color="#0284C7" />
                <Text style={[styles.categoryTitle, { color: '#0369A1' }]}>THUỐC NHỎ / TRA MẮT</Text>
              </View>
              {eyeDrops.map((med: any) => renderDoseCard(med, 'eye'))}
            </View>
          )}

          {/* NHÓM 2: THUỐC UỐNG */}
          {oralMeds.length > 0 && (
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <MaterialCommunityIcons name="pill" size={22} color="#059669" />
                <Text style={[styles.categoryTitle, { color: '#047857' }]}>THUỐC UỐNG</Text>
              </View>
              {oralMeds.map((med: any) => renderDoseCard(med, 'oral'))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dashboardContainer: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greetingText: { fontSize: 16, color: colors.textLight },
  patientName: { fontSize: 26, fontWeight: 'bold', color: colors.textDark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  progressCard: { backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 20, elevation: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  progressRatio: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  progressBarBg: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 5 },
  
  // Styles mới cho khu vực hiển thị danh sách thuốc
  heroContainer: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 2, borderColor: '#E2E8F0', elevation: 2 },
  heroTimeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  heroTimeText: { fontSize: 20, fontWeight: 'bold', color: colors.timeColor, marginLeft: 10 },
  
  categorySection: { marginBottom: 15 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#F8FAFC', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start' },
  categoryTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  
  doseCard: { borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1 },
  eyeDropCard: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  oralCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  
  doseCardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  doseIconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  doseImage: { width: '100%', height: '100%' },
  doseInfo: { flex: 1 },
  doseName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  doseAmount: { fontSize: 14, color: colors.textLight },
  
  confirmBtn: { flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnEyeDrop: { backgroundColor: '#0284C7' },
  btnOral: { backgroundColor: '#059669' },
  btnLocked: { backgroundColor: '#94A3B8' },
  confirmBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold', marginLeft: 8 }
});