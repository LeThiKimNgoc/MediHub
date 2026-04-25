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
  const terms = getMedTerminology(dashboardStats.nextDose);

  return (
    <View style={styles.dashboardContainer}>
      {/* 1. HEADER CHỨA AVATAR & NÚT THOÁT */}
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

      {/* 2. TIẾN ĐỘ TRONG NGÀY */}
      <View style={styles.progressCard}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressTitle}>Tiến độ dùng thuốc hôm nay</Text>
          <Text style={styles.progressRatio}>{dashboardStats.completed}/{dashboardStats.total}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${dashboardStats.progressPercent}%` }]} />
        </View>
      </View>

      {/* 3. CẢNH BÁO KHOẢNG NGHỈ 10 PHÚT */}
      {cooldown > 0 && dashboardStats.nextDose && (
        <View style={styles.cooldownBanner}>
          <MaterialCommunityIcons name="timer-sand" size={28} color="#047857" />
          <Text style={styles.cooldownText}>
            Khoảng nghỉ: Đợi {Math.floor(cooldown / 60)} phút {cooldown % 60 < 10 ? '0' : ''}{cooldown % 60} giây nữa để dùng liều tiếp.
          </Text>
        </View>
      )}

      {/* 4. THẺ LIỀU THUỐC TIẾP THEO (KHẨN CẤP) */}
      {dashboardStats.nextDose && !loading && (
        <LinearGradient colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <MaterialCommunityIcons name="alarm" size={24} color={colors.timeColor} />
            <Text style={styles.heroTitle}>Cần {terms.action} tiếp theo lúc: {dashboardStats.nextDose.Time}</Text>
          </View>
          
          <View style={styles.heroContent}>
            <View style={styles.heroIconBox}>
              {/* CẬP NHẬT: HIỆN ẢNH THUỐC TRÊN THẺ TO NẾU CÓ */}
              {dashboardStats.nextDose.ImageUrl ? (
                 <Image source={{uri: dashboardStats.nextDose.ImageUrl}} style={{width: '100%', height: '100%', borderRadius: 16}} resizeMode="cover"/>
              ) : (
                 <MaterialCommunityIcons name={getMedIcon(dashboardStats.nextDose) as any} size={40} color={colors.primary} />
              )}
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

          <TouchableOpacity 
            style={[styles.heroBtn, { backgroundColor: cooldown > 0 ? '#94A3B8' : colors.primary }]} 
            onPress={() => onOpenLogModal(dashboardStats.nextDose)}
            disabled={cooldown > 0}
          >
            <MaterialCommunityIcons name={cooldown > 0 ? "timer-sand" : "check-decagram"} size={24} color="white" />
            <Text style={styles.heroBtnText}>{cooldown > 0 ? 'ĐANG TRONG KHOẢNG NGHỈ' : `XÁC NHẬN ĐÃ ${terms.btn}`}</Text>
          </TouchableOpacity>
        </LinearGradient>
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
  logoutBtnTop: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  progressCard: { backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 25, elevation: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  progressRatio: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  progressBarBg: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 5 },
  cooldownBanner: { flexDirection: 'row', backgroundColor: '#D1FAE5', padding: 16, borderRadius: 16, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#34D399', elevation: 2 },
  cooldownText: { color: '#065F46', fontSize: 16, fontWeight: 'bold', marginLeft: 12, flex: 1, lineHeight: 24 },
  heroCard: { borderRadius: 24, padding: 20, marginBottom: 10, borderWidth: 2, borderColor: colors.primaryLight, elevation: 5 },
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
  heroBtn: { flexDirection: 'row', padding: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  heroBtnText: { color: 'white', fontSize: 17, fontWeight: 'bold', marginLeft: 8 }
});