import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getEyeIndicator, getMedIcon, getMedTerminology } from '../../utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface DashboardHeaderProps {
  patientName: string;
  dashboardStats: any;
  loading: boolean;
  onOpenProfile: () => void;
  onOpenLogModal: (med: any) => void;
  onOpenHistory: () => void;
  onRefresh: () => void;
  onSOS: () => void;
  onLogout: () => void; 
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  patientName, dashboardStats, loading, onOpenProfile, onOpenLogModal, onOpenHistory, onRefresh, onSOS, onLogout
}) => {
  const terms = getMedTerminology(dashboardStats.nextDose);

  return (
    <View style={styles.dashboardContainer}>
      {/* HEADER BÊN TRÊN CÙNG */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greetingText}>Xin chào,</Text>
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.avatarBtn} onPress={onOpenProfile}>
            <MaterialCommunityIcons name="face-man-profile" size={32} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtnTop} onPress={onLogout}>
            <MaterialCommunityIcons name="logout" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressTitle}>Tiến độ dùng thuốc hôm nay</Text>
          <Text style={styles.progressRatio}>{dashboardStats.completed}/{dashboardStats.total}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${dashboardStats.progressPercent}%` }]} />
        </View>
      </View>

      {dashboardStats.nextDose && !loading && (
        {/* ĐÃ THAY THẾ THẺ VIEW BẰNG LINEAR GRADIENT Ở ĐÂY */}
        <LinearGradient 
          colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']} // Dải màu từ Xanh dương nhạt sang Trắng
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <MaterialCommunityIcons name="alarm" size={24} color={colors.timeColor} />
            <Text style={styles.heroTitle}>Cần {terms.action} tiếp theo lúc: {dashboardStats.nextDose.Time}</Text>
          </View>
          
          <View style={styles.heroContent}>
            <View style={styles.heroIconBox}>
              <MaterialCommunityIcons name={getMedIcon(dashboardStats.nextDose) as any} size={40} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroMedName}>{dashboardStats.nextDose.MedicineName}</Text>
              <Text style={styles.heroDose}>Liều lượng: {dashboardStats.nextDose.Dose}</Text>
              
              {getEyeIndicator(dashboardStats.nextDose.Usage || dashboardStats.nextDose.Dose) && (
                <View style={[styles.eyeBadge, { backgroundColor: getEyeIndicator(dashboardStats.nextDose.Usage || dashboardStats.nextDose.Dose)?.color }]}>
                  <MaterialCommunityIcons name={getEyeIndicator(dashboardStats.nextDose.Usage || dashboardStats.nextDose.Dose)?.icon as any} size={16} color="white" />
                  <Text style={styles.eyeBadgeText}>{getEyeIndicator(dashboardStats.nextDose.Usage || dashboardStats.nextDose.Dose)?.label}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.hygieneNote}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#059669" />
            <Text style={styles.hygieneText}>{terms.note}</Text>
          </View>

          <TouchableOpacity style={styles.heroBtn} onPress={() => onOpenLogModal(dashboardStats.nextDose)}>
            <MaterialCommunityIcons name="check-decagram" size={24} color="white" />
            <Text style={styles.heroBtnText}>XÁC NHẬN ĐÃ {terms.btn}</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      <Text style={styles.sectionTitle}>Công cụ hỗ trợ</Text>
      <View style={styles.gridContainer}>
        <TouchableOpacity style={styles.gridItem} onPress={onOpenHistory}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FEF08A' }]}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={32} color="#CA8A04" />
          </View>
          <Text style={styles.gridText}>Lịch sử</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.gridItem} onPress={onOpenProfile}>
          <View style={[styles.iconWrapper, { backgroundColor: '#BBF7D0' }]}>
            <MaterialCommunityIcons name="card-account-details-outline" size={32} color="#16A34A" />
          </View>
          <Text style={styles.gridText}>Hồ sơ bệnh</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={onSOS}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FECACA' }]}>
            <MaterialCommunityIcons name="doctor" size={32} color="#DC2626" />
          </View>
          <Text style={styles.gridText}>Gặp Bác sĩ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={onRefresh}>
           <View style={[styles.iconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <MaterialCommunityIcons name="sync" size={32} color="#4F46E5" />
          </View>
          <Text style={styles.gridText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Tủ thuốc / Tất cả các liều</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dashboardContainer: { padding: 20, paddingTop: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greetingText: { fontSize: 16, color: colors.textLight },
  patientName: { fontSize: 26, fontWeight: 'bold', color: colors.textDark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  logoutBtnTop: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  progressCard: { backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 25, elevation: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  progressRatio: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  progressBarBg: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 5 },
  heroCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 2, borderColor: colors.primaryLight, elevation: 5 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: colors.timeColor, marginLeft: 8 },
  heroContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  heroIconBox: { width: 70, height: 70, backgroundColor: '#F0F9FF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  heroMedName: { fontSize: 22, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  heroDose: { fontSize: 16, color: colors.textLight, marginBottom: 8 },
  eyeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  eyeBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  hygieneNote: { flexDirection: 'row', backgroundColor: '#D1FAE5', padding: 10, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  hygieneText: { color: '#065F46', fontSize: 14, marginLeft: 8, fontWeight: '500', flex: 1 },
  heroBtn: { backgroundColor: colors.primary, flexDirection: 'row', padding: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  heroBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textDark, marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: (width - 60) / 4, alignItems: 'center', marginBottom: 20 },
  iconWrapper: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridText: { fontSize: 13, color: colors.textDark, fontWeight: '600', textAlign: 'center' }
});