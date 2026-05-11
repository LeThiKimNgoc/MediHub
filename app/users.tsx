import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, useWindowDimensions, Modal, Alert, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router'; 

const colors = {
  bg: '#F8FAFC', surface: '#FFFFFF', primary: '#7C3AED', primaryLight: '#F5F3FF',
  textDark: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  statusActive: '#10B981', statusInactive: '#94A3B8', 
  roleAdmin: '#7C3AED', roleDoctor: '#3B82F6', roleNurse: '#10B981', 
  rolePatient: '#F59E0B', danger: '#EF4444'
};

// 🚨 DÁN LINK API MỚI VÀO ĐÂY NHA SẾP
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

export default function UserManagementScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('ALL');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({ id: '', password: '', name: '', email: '', role: 'Bệnh nhân', status: 'Đang hoạt động' });

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getUserList`, { cache: 'no-store' });
      const result = await response.json();
      if (result.status === 'success') {
        const formatted = result.data.map((item: any) => ({
          id: item['Mã NV'] || item['Mã BN'] || item.ID || '',
          password: item['Mật khẩu'] || '',
          name: item['Họ tên'] || '',
          email: item['Email'] || '',
          role: item['Vai trò'] || 'Bệnh nhân',
          status: item['Trạng thái'] || 'Đang hoạt động',
          lastLogin: item['Truy cập cuối'] || '-'
        }));
        setUsers(formatted);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));

  const handleSaveUser = async () => {
    if (!formData.id || !formData.name || !formData.password) return Alert.alert("Lỗi", "Vui lòng nhập Mã ID, Họ tên và Mật khẩu.");
    setLoading(true);
    
    const payload = {
      action: isEditing ? 'editUser' : 'addUser',
      data: {
        'Mã NV': formData.id,
        'Mật khẩu': formData.password,
        'Họ tên': formData.name,
        'Email': formData.email,
        'Vai trò': formData.role,
        'Trạng thái': formData.status,
        'Truy cập cuối': isEditing ? undefined : '-' 
      }
    };

    try {
      const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.status === 'success') {
        setModalVisible(false);
        fetchUsers();
        Alert.alert("Thành công", isEditing ? "Đã cập nhật." : "Đã thêm tài khoản.");
      } else { Alert.alert("Lỗi", "Không thể lưu."); }
    } catch (error) { Alert.alert("Lỗi", "Lỗi kết nối."); } finally { setLoading(false); }
  };

  const handleDeleteUser = (id: string, name: string) => {
    const execute = async () => {
      setLoading(true);
      try {
        await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteUser', id: id }) });
        fetchUsers();
      } catch (error) {} finally { setLoading(false); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Xóa tài khoản "${name}"?`)) execute();
    } else {
      Alert.alert("Xác nhận", `Xóa tài khoản ${name}?`, [{ text: "Hủy" }, { text: "Xóa", onPress: execute, style: 'destructive' }]);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.id.toLowerCase().includes(searchQuery.toLowerCase())) && (activeRole === 'ALL' || u.role === activeRole));
  }, [searchQuery, activeRole, users]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedData = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'KH';
  
  const renderRoleBadge = (role: string) => {
    let color = colors.roleDoctor;
    if (role.toLowerCase().includes('admin')) color = colors.roleAdmin;
    else if (role.toLowerCase().includes('điều dưỡng')) color = colors.roleNurse;
    else if (role.toLowerCase().includes('bệnh nhân')) color = colors.rolePatient; 
    return <View style={[styles.roleBadge, { backgroundColor: color + '15' }]}><Text style={[styles.roleBadgeText, { color: color }]}>{role}</Text></View>;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.saasHeader}>
          <View>
            <Text style={styles.pageTitle}>Quản lý tài khoản</Text>
            <Text style={styles.pageSubtitle}>Phân quyền {users.length} nhân viên và bệnh nhân</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity style={styles.outlineBtn} onPress={fetchUsers}><MaterialCommunityIcons name="refresh" size={20} color={colors.textDark} /></TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setIsEditing(false); setFormData({ id: '', password: '', name: '', email: '', role: 'Bệnh nhân', status: 'Đang hoạt động' }); setModalVisible(true); setShowPassword(false); }}>
              <MaterialCommunityIcons name="account-plus" size={20} color={colors.surface} />
              {!isMobile && <Text style={styles.primaryBtnText}>Tạo tài khoản</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.toolbarContainer}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
              <TextInput style={styles.searchInput} placeholder="Tìm tên hoặc ID..." placeholderTextColor={colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} outlineStyle="none" as any />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={styles.filterGroup}>
                {['ALL', 'Admin', 'Bác sĩ', 'Điều dưỡng', 'Bệnh nhân'].map((role) => (
                  <TouchableOpacity key={role} style={[styles.filterChip, activeRole === role && styles.filterChipActive]} onPress={() => {setActiveRole(role); setCurrentPage(1);}}>
                    <Text style={[styles.filterChipText, activeRole === role && styles.filterChipTextActive]}>{role === 'ALL' ? 'Tất cả' : role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.tableWrapper}>
            {loading && users.length === 0 ? (
               <ActivityIndicator size="large" color={colors.primary} style={{padding: 50}} />
            ) : (
              <FlatList
                data={paginatedData}
                keyExtractor={(item, index) => item.id + index.toString()}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View style={styles.tableHeaderRow}>
                    <View style={[styles.headerCell, { flex: 2.5 }]}><Text style={styles.headerText}>TÀI KHOẢN</Text></View>
                    <View style={[styles.headerCell, { flex: 1.5 }]}><Text style={styles.headerText}>VAI TRÒ</Text></View>
                    <View style={[styles.headerCell, { flex: 1.5 }]}><Text style={styles.headerText}>TRẠNG THÁI</Text></View>
                    <View style={[styles.headerCell, { width: 100, borderRightWidth: 0 }]}><Text style={styles.headerText}>THAO TÁC</Text></View>
                  </View>
                }
                renderItem={({ item, index }) => (
                  <View style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                    <View style={[styles.dataCell, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={styles.avatarCircle}><Text style={styles.avatarText}>{getInitials(item.name)}</Text></View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.userNameText} numberOfLines={1}>{item.name}</Text>
                        
                        {/* 🔥 ĐÃ FIX: Xóa Mật khẩu, chỉ hiển thị Email (nếu có) và ID */}
                        <Text style={styles.userEmailText}>
                          {item.email ? `${item.email} • ` : ''}ID: {item.id}
                        </Text>
                        
                      </View>
                    </View>
                    <View style={[styles.dataCell, { flex: 1.5 }]}>{renderRoleBadge(item.role)}</View>
                    <View style={[styles.dataCell, { flex: 1.5 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.statusDot, { backgroundColor: item.status.includes('Đang') ? colors.statusActive : colors.statusInactive }]} />
                        <Text style={styles.statusLabel}>{item.status}</Text>
                      </View>
                    </View>
                    <View style={[styles.dataCell, { width: 100, flexDirection: 'row', gap: 10, borderRightWidth: 0, justifyContent: 'center' }]}>
                      <TouchableOpacity onPress={() => { setIsEditing(true); setFormData(item); setModalVisible(true); setShowPassword(false); }} style={styles.actionBtn}><MaterialCommunityIcons name="pencil" size={16} color={colors.primary} /></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteUser(item.id, item.name)} style={styles.actionBtn}><MaterialCommunityIcons name="trash-can" size={16} color={colors.danger} /></TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<View style={{ padding: 50, alignItems: 'center' }}><Text style={{ color: colors.textMuted }}>Chưa có tài khoản nào.</Text></View>}
              />
            )}
            {totalPages > 0 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.pageInfo}>Hiển thị {paginatedData.length} / {filteredUsers.length} tài khoản</Text>
                <View style={styles.pageControls}>
                  <TouchableOpacity style={[styles.pageBtn, currentPage === 1 && { opacity: 0.5 }]} disabled={currentPage === 1} onPress={() => setCurrentPage(p => p - 1)}><MaterialCommunityIcons name="chevron-left" size={20} color={colors.textDark} /></TouchableOpacity>
                  <View style={styles.pageIndicator}><Text style={styles.pageIndicatorText}>{currentPage} / {totalPages}</Text></View>
                  <TouchableOpacity style={[styles.pageBtn, currentPage === totalPages && { opacity: 0.5 }]} disabled={currentPage === totalPages} onPress={() => setCurrentPage(p => p + 1)}><MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDark} /></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* MODAL FORM THÊM/SỬA NHÂN SỰ */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: isDesktop ? 500 : '90%', maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Mã định danh (ID)*</Text>
                <TextInput style={[styles.input, isEditing && { backgroundColor: '#F1F5F9' }]} value={formData.id} editable={!isEditing} onChangeText={(t) => setFormData({...formData, id: t})} placeholder="VD: BN001 hoặc NV001" as any/>
                
                <Text style={styles.label}>Mật khẩu / Mã PIN*</Text>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', padding: 0 }]}>
                  <TextInput 
                    style={{ flex: 1, padding: 12, outlineStyle: 'none' }} 
                    value={formData.password} 
                    onChangeText={(t) => setFormData({...formData, password: t})} 
                    placeholder="Nhập PIN 6 số hoặc mật khẩu" 
                    secureTextEntry={!showPassword} 
                    as any
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 12 }}>
                    <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Họ và tên*</Text>
                <TextInput style={styles.input} value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} placeholder="Nhập tên đầy đủ" as any/>
                
                <Text style={styles.label}>Email liên hệ (Tùy chọn)</Text>
                <TextInput style={styles.input} value={formData.email} onChangeText={(t) => setFormData({...formData, email: t})} placeholder="example@medihub.vn" as any/>
                
                <Text style={styles.label}>Vai trò hệ thống</Text>
                <View style={styles.rolePickerRow}>
                  {['Bệnh nhân', 'Bác sĩ', 'Điều dưỡng', 'Admin'].map(r => (
                    <TouchableOpacity key={r} onPress={() => setFormData({...formData, role: r})} style={[styles.roleChip, formData.role === r && styles.roleChipActive]}>
                      <Text style={[styles.roleChipText, formData.role === r && {color: '#fff'}]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, {marginTop: 20}]}>Trạng thái</Text>
                <View style={styles.rolePickerRow}>
                  {['Đang hoạt động', 'Ngừng kích hoạt'].map(s => (
                    <TouchableOpacity key={s} onPress={() => setFormData({...formData, status: s})} style={[styles.roleChip, formData.status === s && {backgroundColor: s==='Đang hoạt động'?colors.statusActive:colors.textMuted, borderColor: s==='Đang hoạt động'?colors.statusActive:colors.textMuted}]}>
                      <Text style={[styles.roleChipText, formData.status === s && {color: '#fff'}]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{height: 20}} />
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={{fontWeight: '700'}}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUser}><Text style={{color: '#fff', fontWeight: '800'}}>Lưu thông tin</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  saasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, paddingVertical: 20, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  primaryBtnText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
  outlineBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },

  contentContainer: { flex: 1, padding: 24, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  toolbarContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 15, flexWrap: 'wrap' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 15, height: 45, minWidth: 300 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: colors.textDark },
  filterGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.primary, fontWeight: '800' },

  tableWrapper: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCell: { padding: 14, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' },
  headerText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  rowEven: { backgroundColor: colors.surface }, rowOdd: { backgroundColor: '#FAFAFA' },
  dataCell: { padding: 12, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary + '30' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  userNameText: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginBottom: 2 },
  userEmailText: { fontSize: 12, color: colors.textMuted },
  roleBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusLabel: { fontSize: 13, color: colors.textDark, fontWeight: '600' },
  actionBtn: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  pageInfo: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  pageControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  pageIndicator: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryLight, borderRadius: 8 },
  pageIndicatorText: { fontSize: 13, fontWeight: '800', color: colors.primary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  label: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, fontSize: 14, outlineStyle: 'none' } as any,
  rolePickerRow: { flexDirection: 'row', gap: 10, marginTop: 5, flexWrap: 'wrap' },
  roleChip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 5 },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#F8FAFC' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#E2E8F0' },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }
});