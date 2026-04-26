import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Modal, Platform, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Papa from 'papaparse';

const colors = {
  bg: '#F5F9FC', primary: '#FFB74D', headerText: '#E65100', textDark: '#455A64', textLight: '#78909C', white: '#FFFFFF',
  chipBg: '#FFF3E0', chipSelectedBg: '#FFA726', chipText: '#E65100', chipSelectedText: '#FFFFFF', success: '#43A047'
};

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

// 🔥 THUẬT TOÁN CHIA GIỜ TỰ ĐỘNG (12 TIẾNG) 🔥
const autoDistributeTimes = (startT: string, frequency: number) => {
  if (!startT || frequency <= 0) return [];
  if (frequency === 1) return [startT];

  const [startH, startM] = startT.split(':').map(Number);
  const startTotalMinutes = startH * 60 + startM;
  
  const totalWindowMinutes = 12 * 60; // Dàn đều trong 12 tiếng
  const interval = Math.floor(totalWindowMinutes / (frequency - 1));

  const newTimes = [];
  for (let i = 0; i < frequency; i++) {
    const totalMins = startTotalMinutes + (i * interval);
    const h = Math.floor((totalMins / 60) % 24); 
    const m = totalMins % 60;
    newTimes.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
  return newTimes;
};

export default function EditPatientMedScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isMedicinePickerVisible, setMedicinePickerVisible] = useState(false);
  
  // State phục vụ Chia giờ tự động
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [autoFreq, setAutoFreq] = useState('');

  const [usageOptions, setUsageOptions] = useState<string[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<any[]>([]); 
  const [loadingData, setLoadingData] = useState(true); 

  const [formData, setFormData] = useState({
    ID: params.ID || '',
    sheetName: 'Log', 
    PatientsID: params.PatientsID || '', 
    MedicineName: params.MedicineName || '', 
    ImageUrl: params.ImageUrl || '', 
    Time: params.Time ? (params.Time as string).split(',').map(t => t.trim()) : [] as string[], 
    Reminder_mode: params.Reminder_mode || 'Bật',
    Status: params.Status || 'Chưa sử dụng', 
    Quantity: params.Quantity || '',   
    DoseAmount: params.Dose ? (params.Dose as string).replace(/[^\d.,]/g, '') : '', 
    DoseUnit: params.Dose ? (params.Dose as string).replace(/[\d.,]/g, '').trim() : 'giọt', 
    Usage: params.Usage || '',
    Duration: params.Duration || '' 
  });

  const unitOptions = ['giọt', 'viên', 'lọ', 'ống', 'nhát xịt', 'ml', 'cm', 'cái'];
  const reminderOptions = ['Bật', 'Tắt'];

  useEffect(() => {
    const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
    const gidUsage = '1133416002'; 
    const gidMedicine = '1532424446'; 
    
    const t = new Date().getTime();
    Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidUsage}&t=${t}`).then(res => res.text()),
      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMedicine}&t=${t}`).then(res => res.text())
    ]).then(([csvUsage, csvMedicine]) => {
      Papa.parse(csvUsage, { header: true, skipEmptyLines: true, complete: (results) => setUsageOptions(results.data.map((i: any) => i.Usage).filter(Boolean)) });
      Papa.parse(csvMedicine, { 
        header: true, skipEmptyLines: true, 
        complete: (results) => setMedicineOptions(results.data.map((i: any) => ({ 
          name: i.MedicineName, 
          use: i.Use,
          imageUrl: i.ImageUrl
        })).filter(m => m.name)) 
      });
      setLoadingData(false);
    }).catch(e => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (formData.DoseUnit === 'viên') {
      const qty = parseFloat(formData.Quantity); 
      const dose = parseFloat(formData.DoseAmount.replace(',', '.')); 
      const freq = formData.Time.length; 

      if (qty && dose && freq) {
        const days = Math.floor(qty / (dose * freq)); 
        setFormData(prev => ({ ...prev, Duration: days.toString() }));
      } else {
        setFormData(prev => ({ ...prev, Duration: '' }));
      }
    }
  }, [formData.Quantity, formData.DoseAmount, formData.Time.length, formData.DoseUnit]);

  // Lắng nghe thay đổi để tự động chia giờ
  useEffect(() => {
    const freq = parseInt(autoFreq);
    if (freq > 0) {
      const times = autoDistributeTimes(`${selectedHour}:${selectedMinute}`, freq);
      setFormData(prev => ({ ...prev, Time: times }));
    }
  }, [selectedHour, selectedMinute, autoFreq]);


  const handleSelectMedicine = (med: any) => {
    let autoUnit = formData.DoseUnit;
    let autoAmount = formData.DoseAmount;
    const useText = med.use ? med.use.toLowerCase() : '';

    if (useText.includes('nhỏ mắt')) autoUnit = 'giọt';
    else if (useText.includes('uống')) autoUnit = 'viên';
    else if (useText.includes('tra mắt')) { autoUnit = 'cm'; autoAmount = '0,5-1'; }
    else if (useText.includes('ngoài')) autoUnit = 'cái';

    setFormData({ ...formData, MedicineName: med.name, ImageUrl: med.imageUrl || '', DoseUnit: autoUnit, DoseAmount: autoAmount });
    setMedicinePickerVisible(false);
  };

  const handleChange = (name: string, value: any) => setFormData({ ...formData, [name]: value });
  const removeTime = (t: string) => setFormData({ ...formData, Time: formData.Time.filter(x => x !== t) });
  
  const addCustomTime = () => {
    const newTime = `${selectedHour}:${selectedMinute}`;
    if (!formData.Time.includes(newTime)) setFormData({ ...formData, Time: [...formData.Time, newTime].sort() });
    setTimePickerVisible(false); 
  };

  const submitData = async () => {
    if (!formData.MedicineName || formData.Time.length === 0 || !formData.DoseAmount) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng Chọn Thuốc, Chọn ít nhất 1 khung giờ và nhập Liều lượng!');
      return;
    }

    setLoading(true);
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

    const payload = { 
      action: 'editRemind', 
      data: {
        ...formData, 
        Time: formData.Time.join(', '), 
        Dose: `${formData.DoseAmount} ${formData.DoseUnit}`
      }
    };

    try {
      const response = await fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const textResult = await response.text();
      try {
        const result = JSON.parse(textResult);
        if (result.status === 'success') {
          setToastVisible(true);
          setTimeout(() => {
            setToastVisible(false);
            router.back(); 
          }, 1500);
        } else Alert.alert('Lỗi hệ thống', result.message);
      } catch (e) { Alert.alert('Lỗi Máy Chủ', 'Apps Script đang bị lỗi.'); }
    } catch (error) { Alert.alert('Lỗi mạng', 'Trình duyệt từ chối kết nối.'); } 
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* MODAL CHỌN THUỐC TỪ KHO */}
      <Modal visible={isMedicinePickerVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', width: '90%' }]}>
            <Text style={styles.modalTitle}>Đổi Thuốc Khác Trong Kho</Text>
            {loadingData ? <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} /> : (
              <ScrollView style={{ width: '100%', marginBottom: 15 }}>
                {medicineOptions.map((med, idx) => (
                  <TouchableOpacity key={idx} style={styles.medicineListItem} onPress={() => handleSelectMedicine(med)}>
                    {med.imageUrl ? (
                        <Image source={{uri: med.imageUrl}} style={{width: 30, height: 30, borderRadius: 8, marginRight: 12}} />
                    ) : (
                        <MaterialCommunityIcons name="pill" size={24} color={colors.primary} style={{ marginRight: 15 }} />
                    )}
                    <View style={{flex: 1}}><Text style={styles.medicineListText}>{med.name}</Text><Text style={{fontSize: 12, color: colors.textLight}}>{med.use || 'Chưa phân loại'}</Text></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.modalBtnCancel, { width: '100%' }]} onPress={() => setMedicinePickerVisible(false)}><Text style={styles.modalBtnCancelText}>ĐÓNG</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CHỌN GIỜ THỦ CÔNG */}
      <Modal visible={isTimePickerVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn Giờ</Text>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerHeader}>Giờ</Text>
                <ScrollView showsVerticalScrollIndicator={Platform.OS === 'web'} style={[styles.scrollArea, Platform.OS === 'web' && { overflowY: 'auto', userSelect: 'none' } as any]} contentContainerStyle={styles.scrollContent}>
                  {HOURS.map(h => (
                    <TouchableOpacity key={h} onPress={() => setSelectedHour(h)} style={[styles.pickerItem, selectedHour === h && styles.pickerItemActive]}><Text style={[styles.pickerText, selectedHour === h && styles.pickerTextActive]}>{h}</Text></TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <Text style={styles.pickerSeparator}>:</Text>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerHeader}>Phút</Text>
                <ScrollView showsVerticalScrollIndicator={Platform.OS === 'web'} style={[styles.scrollArea, Platform.OS === 'web' && { overflowY: 'auto', userSelect: 'none' } as any]} contentContainerStyle={styles.scrollContent}>
                  {MINUTES.map(m => (
                    <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)} style={[styles.pickerItem, selectedMinute === m && styles.pickerItemActive]}><Text style={[styles.pickerText, selectedMinute === m && styles.pickerTextActive]}>{m}</Text></TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setTimePickerVisible(false)}><Text style={styles.modalBtnCancelText}>HỦY</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnAdd} onPress={addCustomTime}><Text style={styles.modalBtnAddText}>XÁC NHẬN</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {toastVisible && <View style={styles.toastContainer}><MaterialCommunityIcons name="check-circle" size={20} color={colors.white} /><Text style={styles.toastText}>Đã sửa cữ thuốc thành công!</Text></View>}

      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={28} color={colors.headerText} /></TouchableOpacity>
        <View style={styles.logoCircleHeader}>
          <Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
        </View>
        <View><Text style={styles.headerTitle}>Sửa Thông Tin Thuốc</Text><Text style={styles.subTitle}>Cho BN: {params.PatientsID}</Text></View>
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên Thuốc (*)</Text>
          <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setMedicinePickerVisible(true)} activeOpacity={0.7}>
            <Text style={{ color: formData.MedicineName ? colors.textDark : colors.textLight, fontSize: 16 }}>{formData.MedicineName || "Bấm để chọn thuốc từ Kho..."}</Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* 🔥 GIAO DIỆN CHIA GIỜ TỰ ĐỘNG 🔥 */}
        <View style={styles.autoScheduleBox}>
          <Text style={styles.autoTitle}><MaterialCommunityIcons name="robot-outline" size={16} /> Chia giờ tự động (Khung 12 tiếng)</Text>
          <View style={{flexDirection: 'row', gap: 10, alignItems: 'flex-end'}}>
            <View style={{flex: 1}}>
              <Text style={styles.subLabel}>Bắt đầu lúc</Text>
              <TouchableOpacity style={styles.miniInput} onPress={() => setTimePickerVisible(true)}>
                <Text style={{textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#1E40AF'}}>{selectedHour}:{selectedMinute}</Text>
              </TouchableOpacity>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.subLabel}>Số lần / ngày</Text>
              <TextInput 
                style={[styles.miniInput, {textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#1E40AF'}]}
                placeholder="Vd: 6"
                keyboardType="numeric"
                value={autoFreq}
                onChangeText={setAutoFreq}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Các Khung Giờ Đã Chọn (*)</Text>
          <View style={styles.chipsContainer}>
            {formData.Time.map((time, i) => (
              <TouchableOpacity key={i} style={styles.timeChipSelected} onPress={() => removeTime(time)} activeOpacity={0.6}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.white} style={{marginRight: 4}} /><Text style={styles.chipTextSelected}>{time}</Text><MaterialCommunityIcons name="close" size={16} color={colors.white} style={{marginLeft: 6}} />
              </TouchableOpacity>
            ))}
            {/* Nút Thêm Giờ thủ công nếu bác sĩ muốn chỉnh tay */}
            <TouchableOpacity style={styles.timeChipAdd} onPress={() => setTimePickerVisible(true)}>
                <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Liều Lượng 1 Lần (*)</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <TextInput style={[styles.input, {flex: 0.4, textAlign: 'center', outlineStyle: 'none' as any}]} placeholder="Vd: 1, 2" keyboardType="default" placeholderTextColor={colors.textLight} value={formData.DoseAmount} onChangeText={(text) => handleChange('DoseAmount', text)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex: 1}}>
              <View style={[styles.chipsContainer, {flexWrap: 'nowrap'}]}>
                {unitOptions.map((unit, i) => (
                  <TouchableOpacity key={i} style={[styles.chip, {paddingVertical: 8, paddingHorizontal: 15}, formData.DoseUnit === unit ? styles.chipSelected : null]} onPress={() => handleChange('DoseUnit', unit)}>
                    <Text style={[styles.chipText, {fontSize: 14}, formData.DoseUnit === unit ? styles.chipTextSelected : null]}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cách Dùng</Text>
          {loadingData ? <ActivityIndicator size="small" color={colors.primary} style={{alignItems: 'flex-start'}} /> : (
            <View style={styles.chipsContainer}>
              {usageOptions.map((opt, i) => <TouchableOpacity key={i} style={[styles.chip, formData.Usage === opt ? styles.chipSelected : null]} onPress={() => handleChange('Usage', opt)}><Text style={[styles.chipText, formData.Usage === opt ? styles.chipTextSelected : null]}>{opt}</Text></TouchableOpacity>)}
            </View>
          )}
        </View>

        <View style={{flexDirection: 'row', gap: 15}}>
          <View style={[styles.inputGroup, {flex: 1}]}><Text style={styles.label}>Cấp Số Lượng Tổng</Text><TextInput style={[styles.input, {outlineStyle: 'none' as any}]} placeholder="Vd: 30" placeholderTextColor={colors.textLight} value={formData.Quantity} onChangeText={(text) => handleChange('Quantity', text)} keyboardType="numeric" /></View>
          <View style={[styles.inputGroup, {flex: 1}]}><Text style={styles.label}>Nhắc nhở (App)</Text>
            <View style={styles.chipsContainer}>
              {reminderOptions.map((opt, i) => <TouchableOpacity key={i} style={[styles.chip, formData.Reminder_mode === opt ? styles.chipSelected : null]} onPress={() => handleChange('Reminder_mode', opt)}><Text style={[styles.chipText, formData.Reminder_mode === opt ? styles.chipTextSelected : null]}>{opt}</Text></TouchableOpacity>)}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Thời Gian Sử Dụng (Ngày)</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: formData.DoseUnit === 'viên' ? '#FFF8E1' : colors.white, borderColor: formData.DoseUnit === 'viên' ? '#FFE082' : '#E0E0E0', outlineStyle: 'none' as any }]} 
            placeholder="Nhập số ngày hoặc tự tính..." 
            placeholderTextColor={colors.textLight} 
            value={formData.Duration} 
            onChangeText={(text) => handleChange('Duration', text)} 
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={submitData} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.headerText} /> : <><MaterialCommunityIcons name="content-save-edit" size={24} color={colors.headerText} style={{marginRight: 8}} /><Text style={styles.submitText}>CẬP NHẬT CỮ THUỐC</Text></>}
        </TouchableOpacity>
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  
  // 🔥 STYLE HỘP CHIA GIỜ TỰ ĐỘNG (Xanh dương cho đỡ nhầm màu Xanh lá của Thêm)
  autoScheduleBox: { backgroundColor: '#EFF6FF', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE', elevation: 1 },
  autoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 10 },
  subLabel: { fontSize: 13, color: '#1E3A8A', marginBottom: 6, fontWeight: '600' },
  miniInput: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#93C5FD' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, width: '80%', maxWidth: 350, borderRadius: 20, padding: 20, elevation: 10, overflow: 'hidden' }, 
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.headerText, textAlign: 'center', marginBottom: 15 },
  medicineListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingHorizontal: 5 },
  medicineListText: { fontSize: 16, color: colors.textDark, fontWeight: 'bold' },
  pickerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 220, backgroundColor: '#FFF3E0', borderRadius: 12, paddingVertical: 10, overflow: 'hidden' },
  pickerColumn: { flex: 1, alignItems: 'center', height: '100%' }, 
  pickerHeader: { fontSize: 14, fontWeight: 'bold', color: colors.textLight, marginBottom: 5 },
  scrollArea: { width: '100%', height: '100%', ...Platform.select({ web: { scrollbarWidth: 'thin', scrollbarColor: `${colors.primary} transparent` } }) }, 
  scrollContent: { paddingVertical: 90 }, 
  pickerItem: { paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 10 }, 
  pickerItemActive: { backgroundColor: colors.primary },
  pickerText: { fontSize: 18, color: colors.textLight }, 
  pickerTextActive: { fontSize: 22, fontWeight: 'bold', color: colors.white },
  pickerSeparator: { fontSize: 30, fontWeight: 'bold', color: colors.primary, marginHorizontal: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalBtnCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#E0E0E0', borderRadius: 10, marginRight: 10 }, modalBtnCancelText: { color: colors.textDark, fontWeight: 'bold' },
  modalBtnAdd: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10 }, modalBtnAddText: { color: colors.headerText, fontWeight: 'bold' },
  toastContainer: { position: 'absolute', top: 30, right: 20, backgroundColor: colors.success, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', zIndex: 1000, elevation: 5 },
  toastText: { color: colors.white, fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  
  appHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 15, elevation: 4 },
  backButton: { marginRight: 15, padding: 5 }, 
  
  logoCircleHeader: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.headerText }, subTitle: { fontSize: 14, color: colors.headerText, opacity: 0.8 },
  formContainer: { flex: 1, padding: 20 }, inputGroup: { marginBottom: 18 }, label: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: colors.textDark },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 }, chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.chipBg, borderRadius: 25, borderWidth: 1, borderColor: colors.chipBg }, chipSelected: { backgroundColor: colors.chipSelectedBg, borderColor: colors.chipSelectedBg }, chipText: { fontSize: 15, color: colors.chipText, fontWeight: '500' }, chipTextSelected: { color: colors.chipSelectedText, fontWeight: '700' },
  timeChipSelected: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 25 }, timeChipAdd: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.white, borderRadius: 25, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' },
  submitButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 3, borderWidth: 2, borderColor: colors.white }, submitText: { color: colors.headerText, fontSize: 16, fontWeight: 'bold' }
});