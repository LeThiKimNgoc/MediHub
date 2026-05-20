import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../app/_layout'; 

export default function RightWidgets({ lastUpdate, warningCount, incidentsCount, appointmentsCount }: any) {
  const { theme, isDark } = useTheme(); 

  const colors = {
    dangerBg: isDark ? '#450a0a' : '#FEF2F2',
    dangerText: isDark ? '#f87171' : '#DC2626',
    successBg: isDark ? '#064e3b' : '#ECFDF5',
    successText: isDark ? '#34d399' : '#10B981',
    infoBg: isDark ? '#1e3a8a' : '#EFF6FF',
    infoText: isDark ? '#60a5fa' : '#3B82F6',
    warningIcon: isDark ? '#fbbf24' : '#F59E0B'
  };

  return (
    <View style={styles.container}>
      
      {/* 1. Trạng thái hệ thống */}
      <View style={[styles.widgetCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.widgetTitle, { color: theme.text }]}>Trạng thái hệ thống</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.successBg }]}>
          <MaterialCommunityIcons name="check-circle" size={16} color={colors.successText} />
          <Text style={[styles.statusText, { color: colors.successText }]}>Hệ thống ổn định</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Thời gian hoạt động</Text>
          <Text style={[styles.statValue, { color: colors.successText }]}>99.9%</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Sự cố hôm nay</Text>
          <Text style={[styles.statValue, { color: incidentsCount > 0 ? colors.dangerText : theme.text }]}>
            {incidentsCount || 0}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.muted }]}>Cập nhật cuối</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{lastUpdate || '--:--'}</Text>
        </View>
      </View>

      {/* 2. Cảnh báo cần lưu ý */}
      <View style={[styles.widgetCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.warningHeader}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warningIcon} />
          <Text style={[styles.widgetTitleWarning, { color: theme.text }]}>Cảnh báo cần lưu ý</Text>
        </View>
        <View style={[styles.warningBox, { backgroundColor: warningCount === 0 ? theme.bg : colors.dangerBg }]}>
          <Text style={[styles.warningNumber, { color: warningCount === 0 ? theme.muted : colors.dangerText }]}>
            {warningCount || 0} <Text style={[styles.warningText, { color: warningCount === 0 ? theme.muted : (isDark ? '#fca5a5' : '#475569') }]}>BN cần theo dõi</Text>
          </Text>
          {/* 🔥 Đã thêm sự kiện chuyển trang khi bấm Xem chi tiết */}
          <TouchableOpacity 
            style={styles.warningLink} 
            onPress={() => router.push('/patient')}
            disabled={warningCount === 0}
          >
            <Text style={[styles.warningLinkText, { color: warningCount === 0 ? theme.muted : colors.dangerText }]}>Xem chi tiết</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={warningCount === 0 ? theme.muted : colors.dangerText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Thao tác nhanh */}
      <View style={[styles.widgetCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.widgetTitle, { color: theme.text }]}>Thao tác nhanh</Text>
        <View style={styles.actionList}>
          
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/add-patient')}>
            <View style={styles.actionItemLeft}>
              <View style={[styles.actionIconBox, { backgroundColor: colors.infoBg }]}><MaterialCommunityIcons name="account-plus-outline" size={16} color={colors.infoText} /></View>
              <Text style={[styles.actionItemText, { color: theme.text }]}>Thêm bệnh nhân mới</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/scan')}>
            <View style={styles.actionItemLeft}>
              <View style={[styles.actionIconBox, { backgroundColor: colors.successBg }]}><MaterialCommunityIcons name="bell-plus-outline" size={16} color={colors.successText} /></View>
              <Text style={[styles.actionItemText, { color: theme.text }]}>Tạo nhắc nhở</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionItemLeft}>
              <View style={[styles.actionIconBox, { backgroundColor: colors.dangerBg }]}><MaterialCommunityIcons name="calendar-month-outline" size={16} color={colors.dangerText} /></View>
              <Text style={[styles.actionItemText, { color: theme.text }]}>Lịch hẹn hôm nay</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.badgeSmall, { backgroundColor: colors.successBg }]}>
                <Text style={[styles.badgeSmallText, { color: colors.successText }]}>{appointmentsCount || 0}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.muted} />
            </View>
          </TouchableOpacity>

        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16, display: 'flex', flexDirection: 'column', marginTop: 12 }, 
  widgetCard: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1, flex: 1, justifyContent: 'center' }, 
  widgetTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 12 },
  statusText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  statLabel: { fontSize: 12, fontWeight: '500' }, 
  statValue: { fontSize: 12, fontWeight: '800' },
  divider: { height: 1, marginVertical: 8 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  widgetTitleWarning: { fontSize: 14, fontWeight: '800', marginLeft: 6 },
  warningBox: { padding: 12, borderRadius: 10 },
  warningNumber: { fontSize: 14, fontWeight: '800', marginBottom: 8 }, 
  warningText: { fontSize: 12, fontWeight: '600' },
  warningLink: { flexDirection: 'row', alignItems: 'center' }, 
  warningLinkText: { fontSize: 12, fontWeight: '700', marginRight: 2 },
  actionList: { gap: 12 }, 
  actionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, 
  actionItemLeft: { flexDirection: 'row', alignItems: 'center' },
  actionIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 }, 
  actionItemText: { fontSize: 13, fontWeight: '600' },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 }, 
  badgeSmallText: { fontSize: 10, fontWeight: '700' }
});