import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getMedIcon, getMedTerminology } from '../../utils/helpers';

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
  patientName, dashboardStats, cooldown, loading, onOpenProfile, onOpenLogModal
}) => {
  
  const nextDoses = dashboardStats.nextDoses || [];
  const targetTime = nextDoses.length > 0 ? nextDoses[0].Time : '';

  const eyeDrops = nextDoses.filter((med: any) => {
    const term = getMedTerminology(med).action;
    return term === 'nhỏ' || term === 'tra';
  });

  const oralMeds = nextDoses.filter((med: any) => {
    const term = getMedTerminology(med).action;
    return term !== 'nhỏ' && term !== 'tra';
  });

  const renderCompactCard = (med: any, type: 'eye' | 'oral') => {
    const isEyeDrop = type === 'eye';
    const isLocked = isEyeDrop && cooldown > 0; 

    return (
      <View key={med.MedicineName} style={[styles.compactCard, isEyeDrop ? styles.eyeDropCard : styles.oralCard]}>
        <View style={[styles.compactIconBox, isEyeDrop ? {backgroundColor: '#E0F2FE'} : {backgroundColor: '#D1FAE5'}]}>
          {med.ImageUrl ? (
             <Image source={{uri: med.ImageUrl}} style={styles.doseImage} resizeMode="cover"/>
          ) : (
             <MaterialCommunityIcons name={getMedIcon(med) as any} size={28} color={isEyeDrop ? '#0284C7' : '#059669'} />
          )}
        </View>
        
        <View style={styles.compactInfo}>
          <Text style={styles.doseName} numberOfLines={1}>{med.MedicineName}</Text>
          <Text style={styles.doseAmount}>Liều: {med.Dose}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.compactBtn, isLocked ? styles.btnLocked : (isEyeDrop ? styles.btnEyeDrop : styles.btnOral)]} 
          onPress={() => onOpenLogModal(med)}
          disabled={isLocked}
        >
          <MaterialCommunityIcons name={isLocked ? "timer-sand" : "check-circle"} size={18} color="white" />
          <Text style={styles.compactBtnText}>
            {isLocked ? `Chờ ${Math.floor(cooldown / 60)}p` : 'Xác nhận'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* 🌟 MẢNG NỀN CONG TẠO CHIỀU SÂU VÀ ĐIỂM NHẤN 🌟 */}
      <View style={styles.curveBackground} />

      <View style={styles.dashboardContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>Xin chào,</Text>
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={onOpenProfile}>
            <MaterialCommunityIcons name="face-man-profile" size={32} color={colors.primary} />
          </TouchableOpacity>
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

        {nextDoses.length > 0 && !loading && (
          <View style={styles.heroContainer}>
            <View style={styles.heroTimeHeader}>
              <View style={styles.timeIconWrap}>
                 <MaterialCommunityIcons name="alarm" size={26} color="white" />
              </View>
              <Text style={styles.heroTimeText}>Cữ thuốc lúc: {targetTime}</Text>
            </View>

            {eyeDrops.length > 0 && (
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <MaterialCommunityIcons name="eye-drop" size={20} color="#0284C7" />
                  <Text style={[styles.categoryTitle, { color: '#0369A1' }]}>Thuốc nhỏ / tra mắt</Text>
                </View>
                {eyeDrops.map((med: any) => renderCompactCard(med, 'eye'))}
              </View>
            )}

            {oralMeds.length > 0 && (
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <MaterialCommunityIcons name="pill" size={20} color="#059669" />
                  <Text style={[styles.categoryTitle, { color: '#047857' }]}>Thuốc uống</Text>
                </View>
                {oralMeds.map((med: any) => renderCompactCard(med, 'oral'))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  
  // CHIẾC NỀN CONG "THẦN THÁNH" GIÚP APP TRÔNG CAO CẤP HẲN LÊN
  curveBackground: {
    position: 'absolute',
    top: -500, // Đẩy tít lên trên để che phần Safe Area
    left: -50,
    right: -50,
    height: 680,
    backgroundColor: '#D1FAE5', // Màu xanh mint pastel dịu nhẹ
    borderBottomLeftRadius: 120, // Bo tròn cực mạnh
    borderBottomRightRadius: 120,
    zIndex: 0,
  },

  dashboardContainer: { padding: 20, paddingBottom: 5, zIndex: 1 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  greetingText: { fontSize: 16, color: '#064E3B', opacity: 0.8 }, // Đổi màu chữ cho hợp với nền mới
  patientName: { fontSize: 28, fontWeight: 'bold', color: '#064E3B' },
  avatarBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8 },
  
  // CARD TIẾN ĐỘ NỔI LÊN MỀM MẠI
  progressCard: { 
    backgroundColor: 'white', padding: 20, borderRadius: 24, marginBottom: 20, 
    elevation: 6, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15 
  },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  progressRatio: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  progressBarBg: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 5 },
  
  // CARD THUỐC SIÊU TO KHỔNG LỒ
  heroContainer: { 
    backgroundColor: 'white', borderRadius: 30, padding: 20, 
    elevation: 8, shadowColor: '#64748B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20,
    borderWidth: 1, borderColor: '#F8FAFC'
  },
  heroTimeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  timeIconWrap: { backgroundColor: colors.timeColor, padding: 6, borderRadius: 12 },
  heroTimeText: { fontSize: 22, fontWeight: 'bold', color: colors.textDark, marginLeft: 12 },
  
  categorySection: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 4 },
  categoryTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  // BỎ VIỀN, THÊM NỀN NHẸ CHO THẺ THUỐC
  compactCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, marginBottom: 10 },
  eyeDropCard: { backgroundColor: '#F0F9FF' },
  oralCard: { backgroundColor: '#F0FDF4' },
  
  compactIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden', backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 3 },
  doseImage: { width: '100%', height: '100%' },
  
  compactInfo: { flex: 1 },
  doseName: { fontSize: 17, fontWeight: 'bold', color: colors.textDark, marginBottom: 4 },
  doseAmount: { fontSize: 14, color: '#64748B' },
  
  compactBtn: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnEyeDrop: { backgroundColor: '#0284C7' },
  btnOral: { backgroundColor: '#059669' },
  btnLocked: { backgroundColor: '#94A3B8' },
  compactBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold', marginLeft: 6 }
});