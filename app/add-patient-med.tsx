import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Platform, Image, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; 

import { styles, colors } from './medStyles';
import { fetchInventoryData, analyzePrescriptionAI, pushPrescriptionToSheet, autoDistributeTimes, parseTimeInput } from './medApi';

export default function AddPatientMedScreen() {
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024; 

  const [loading, setLoading] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [autoStartTime, setAutoStartTime] = useState('0800');
  const [manualTime, setManualTime] = useState('');
  const [autoFreq, setAutoFreq] = useState('');

  const [usageOptions, setUsageOptions] = useState<string[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<any[]>([]); 
  const [loadingData, setLoadingData] = useState(true); 
  const [aiSuggestedMeds, setAiSuggestedMeds] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tempPrescription, setTempPrescription] = useState<any[]>([]);

  const defaultForm = { sheetName: 'Log', PatientsID: params.id || '', MedicineName: '', ImageUrl: '', Time: [] as string[], Reminder_mode: 'Bật', Status: 'Chưa sử dụng', Quantity: '', DoseAmount: '', DoseUnit: 'giọt', Usage: '', Duration: '' };
  const [formData, setFormData] = useState(defaultForm);
  const unitOptions = ['giọt', 'viên', 'lọ', 'ống', 'nhát xịt', 'ml', 'cm', 'miếng', 'cái'];
  const reminderOptions = ['Bật', 'Tắt'];

  const isEyeDrops = ['giọt', 'cm'].includes(formData.DoseUnit);

  useEffect(() => {
    fetchInventoryData().then(data => { 
      const fetchedUsages = [...data.usages];
      if (!fetchedUsages.includes('Uống cách ngày')) fetchedUsages.unshift('Uống cách ngày');
      setUsageOptions(fetchedUsages); 
      setMedicineOptions(data.medicines); 
      setLoadingData(false); 
    }).catch(() => setLoadingData(false));
  }, []);

  const filteredMeds = medicineOptions.filter(m => formData.MedicineName && m.name.toLowerCase().includes(formData.MedicineName.toLowerCase()));
  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };

  const filteredUsages = useMemo(() => {
    if (!usageOptions.length) return [];
    const unit = formData.DoseUnit.toLowerCase();
    
    if (unit === 'viên' || unit === 'ml') return usageOptions.filter(u => u.toLowerCase().includes('uống'));
    if (unit === 'giọt') return usageOptions.filter(u => u.toLowerCase().includes('nhỏ'));
    if (unit === 'cm') return usageOptions.filter(u => u.toLowerCase().includes('tra'));
    if (unit === 'miếng') return usageOptions.filter(u => u.toLowerCase().includes('ngoài') || u.toLowerCase().includes('miếng'));
    
    return usageOptions.filter(u => !u.toLowerCase().includes('uống') && !u.toLowerCase().includes('nhỏ') && !u.toLowerCase().includes('tra'));
  }, [formData.DoseUnit, usageOptions]);

  const handleAIScan = async () => {
    try {
      if (Platform.OS !== 'web' && !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted) return Alert.alert("Lỗi", "Cần quyền truy cập ảnh!");
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.8, base64: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsAIScanning(true); setAiSuggestedMeds([]); 
        const extractedMeds = await analyzePrescriptionAI(result.assets[0].base64 || '', result.assets[0].mimeType || 'image/jpeg', medicineOptions);
        setAiSuggestedMeds(extractedMeds);
        showToast('Đã phân tích xong dữ liệu!'); setIsAIScanning(false);
      }
    } catch (error: any) { setIsAIScanning(false); showToast(error.message); }
  };

  useEffect(() => {
    if (formData.DoseUnit === 'viên') {
      const qty = parseFloat(formData.Quantity); 
      const dose = parseFloat(formData.DoseAmount.replace(',', '.')); 
      const freq = formData.Time.length; 
      
      if (qty && dose && freq) {
        let days = Math.floor(qty / (dose * freq));
        if (formData.Usage && formData.Usage.toLowerCase().includes('cách ngày')) days = days * 2;
        setFormData(prev => ({ ...prev, Duration: days.toString() }));
      } else {
        setFormData(prev => ({ ...prev, Duration: '' }));
      }
    }
  }, [formData.Quantity, formData.DoseAmount, formData.Time.length, formData.DoseUnit, formData.Usage]);

  useEffect(() => {
    if (isEyeDrops) {
      const freq = parseInt(autoFreq);
      if (freq > 0 && autoStartTime.length === 4) setFormData(prev => ({ ...prev, Time: autoDistributeTimes(autoStartTime, freq) }));
      else if (!autoFreq) setFormData(prev => ({ ...prev, Time: [] }));
    }
  }, [autoStartTime, autoFreq, formData.DoseUnit]);

  const handleSelectMedicine = (med: any) => {
    let autoUnit = formData.DoseUnit; 
    let autoAmount = formData.DoseAmount; 
    const useText = med.use ? med.use.toLowerCase() : '';
    
    if (useText.includes('nhỏ')) autoUnit = 'giọt'; 
    else if (useText.includes('uống')) autoUnit = 'viên'; 
    else if (useText.includes('tra')) { autoUnit = 'cm'; autoAmount = '0,5-1'; } 
    else if (useText.includes('ngoài')) autoUnit = 'miếng';
    
    setFormData({ ...formData, MedicineName: med.name, ImageUrl: med.imageUrl || '', DoseUnit: autoUnit, DoseAmount: autoAmount, Usage: '', Duration: autoUnit === 'viên' ? formData.Duration : '' });
    setShowDropdown(false);
  };

  const handleAddManualTime = () => {
    const formatted = parseTimeInput(manualTime);
    if (formatted) {
      if (!formData.Time.includes(formatted)) setFormData({ ...formData, Time: [...formData.Time, formatted].sort() });
      setManualTime('');
    } else showToast('Vui lòng nhập đúng 4 số (Vd: 0800)');
  };

  const addToTempPrescription = () => {
    if (!formData.MedicineName || formData.Time.length === 0 || !formData.DoseAmount || !formData.Duration) return Alert.alert('Lỗi', 'Vui lòng điền đủ Tên thuốc, Giờ, Liều lượng và Số ngày dùng!');
    setTempPrescription([...tempPrescription, { ...formData }]);
    setFormData(defaultForm); setAutoFreq(''); setShowDropdown(false); setManualTime('');
    showToast('Đã thêm vào chỉ định!');
  };

  const submitFinalPrescription = async () => {
    if (tempPrescription.length === 0) return showToast('Đơn thuốc trống!');
    setLoading(true);
    try {
      await pushPrescriptionToSheet(tempPrescription);
      showToast('🎉 Đã ban hành đơn thuốc thành công!');
      setTempPrescription([]); 
      setTimeout(() => router.push({ pathname: '/patient' } as any), 1000);
    } catch (error: any) { showToast(error.message); } finally { setLoading(false); }
  };

  // 🔥 HÀM XỬ LÝ QUAY VỀ THÔNG MINH 🔥
  const handleGoBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/patient'); // Trả về trang bệnh nhân nếu bị mất lịch sử
      }
    } catch (error) {
      router.replace('/patient');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {toastMessage !== '' && <View style={styles.toastContainer}><MaterialCommunityIcons name="check-circle" size={20} color={colors.white} /><Text style={styles.toastText}>{toastMessage}</Text></View>}

      <View style={styles.appHeader}>
        {/* 🔥 GÁN HÀM QUAY VỀ THÔNG MINH VÀO NÚT NÀY 🔥 */}
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.headerText} />
        </TouchableOpacity>
        
        <View style={styles.logoCircleHeader}><Image source={require('../assets/images/favicon.png')} style={{ width: 22, height: 22 }} resizeMode="contain" /></View>
        <View><Text style={styles.headerTitle}>Chỉ Định Điều Trị</Text><Text style={styles.subTitle}>Mã BN: {params.name} ({params.id})</Text></View>
      </View>

      <View style={[styles.mainWrapper, { height: isDesktop ? height - 80 : 'auto' }]}>
        <View style={[styles.splitContainer, !isDesktop && { flexDirection: 'column' }]}>
          
          <View style={[styles.formContainer, isDesktop && { flex: 5.5, marginRight: 15 }]}>
            <ScrollView style={{ flex: 1, paddingRight: 5 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <TouchableOpacity style={[styles.scanButton, isAIScanning && { opacity: 0.8 }]} onPress={handleAIScan}><Text style={styles.scanButtonText}>{isAIScanning ? "Đang trích xuất..." : "Phân tích Đơn thuốc (AI OCR)"}</Text></TouchableOpacity>

              {aiSuggestedMeds.length > 0 && (
                <View style={styles.aiSuggestBox}>
                  <Text style={styles.aiSuggestTitle}>Kết quả phân tích:</Text>
                  <View style={styles.chipsContainer}>
                    {aiSuggestedMeds.map((med, i) => (
                      <TouchableOpacity key={i} style={styles.aiChip} onPress={() => { 
                        const foundMed = medicineOptions.find(m => m.name === med);
                        if (foundMed) handleSelectMedicine(foundMed);
                        else setFormData({...formData, MedicineName: med}); 
                        setAiSuggestedMeds(aiSuggestedMeds.filter(m => m !== med)); 
                      }}>
                        <Text style={styles.aiChipText}>{med}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.inputGroup, { zIndex: 100 }]}><Text style={styles.label}>Tên Thuốc *</Text>
                <TextInput style={styles.input} placeholder="Tìm thuốc..." value={formData.MedicineName} onChangeText={(t) => { setFormData({...formData, MedicineName: t}); setShowDropdown(t.length >= 2); }} onFocus={() => setShowDropdown(formData.MedicineName.length >= 2)} />
                {showDropdown && filteredMeds.length > 0 && (<View style={styles.autocompleteDropdown}><ScrollView style={{ maxHeight: 200 }}>{filteredMeds.map((m, idx) => (<TouchableOpacity key={idx} style={styles.autoCompleteItem} onPress={() => handleSelectMedicine(m)}><Text style={{fontSize: 14}}>{m.name}</Text></TouchableOpacity>))}</ScrollView></View>)}
              </View>

              {isEyeDrops && (
                <View style={styles.autoScheduleBox}>
                  <Text style={styles.autoTitle}>⏰ Tự động chia (Khung 10h)</Text>
                  <View style={{flexDirection: 'row', gap: 10}}>
                    <View style={{flex: 1}}><Text style={styles.subLabel}>Bắt đầu (4 số)</Text><TextInput style={styles.miniInput} placeholder="0800" keyboardType="numeric" maxLength={4} value={autoStartTime} onChangeText={setAutoStartTime} /></View>
                    <View style={{flex: 1}}><Text style={styles.subLabel}>Số lần/ngày</Text><TextInput style={styles.miniInput} placeholder="6" keyboardType="numeric" value={autoFreq} onChangeText={setAutoFreq} /></View>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Khung Giờ Sử Dụng (24h) *</Text>
                <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                  <TextInput style={[styles.input, {flex: 1}]} placeholder="Gõ 4 số (Vd: 0800) rồi Enter..." keyboardType="numeric" maxLength={4} value={manualTime} onChangeText={setManualTime} onSubmitEditing={handleAddManualTime} />
                  <TouchableOpacity style={[styles.timeChipAdd, {borderRadius: 8}]} onPress={handleAddManualTime}><Text style={{color: colors.primary, fontWeight: '800'}}>THÊM</Text></TouchableOpacity>
                </View>
                <View style={styles.chipsContainer}>
                  {formData.Time.map((t, i) => (<TouchableOpacity key={i} style={styles.timeChipSelected} onPress={() => setFormData({...formData, Time: formData.Time.filter(x => x !== t)}) }><Text style={styles.chipTextSelected}>{t}</Text><MaterialCommunityIcons name="close" size={14} color="white" style={{marginLeft: 5}} /></TouchableOpacity>))}
                </View>
              </View>
              
              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={[styles.inputGroup, {flex: 1}]}><Text style={styles.label}>Liều Lượng *</Text><View style={{flexDirection: 'row', gap: 5}}><TextInput style={[styles.input, {flex: 0.4, textAlign: 'center'}]} value={formData.DoseAmount} onChangeText={(t) => setFormData({...formData, DoseAmount: t})} /><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.chipsContainer}>{unitOptions.map((u, i) => (<TouchableOpacity key={i} style={[styles.chip, formData.DoseUnit === u && styles.chipSelected]} onPress={() => setFormData({...formData, DoseUnit: u})}><Text style={[styles.chipText, formData.DoseUnit === u && styles.chipTextSelected]}>{u}</Text></TouchableOpacity>))}</View></ScrollView></View></View>
                
                <View style={{flex: 1}}><Text style={styles.label}>Cách Dùng</Text>
                  {loadingData ? <ActivityIndicator size="small" color={colors.primary} /> : (
                    <ScrollView style={{maxHeight: 120}} showsVerticalScrollIndicator={false}>
                      <View style={styles.chipsContainer}>
                        {filteredUsages.map((o, i) => (
                          <TouchableOpacity key={i} style={[styles.chip, formData.Usage === o && styles.chipSelected]} onPress={() => setFormData({...formData, Usage: o})}>
                            <Text style={[styles.chipText, formData.Usage === o && styles.chipTextSelected]}>{o}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </View>
              </View>

              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}><Text style={styles.label}>Số Lượng Cấp</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.Quantity} onChangeText={(t) => setFormData({...formData, Quantity: t})} /></View>
                <View style={{flex: 1}}><Text style={styles.label}>Số Ngày Dùng *</Text><TextInput style={[styles.input, formData.DoseUnit === 'viên' && {backgroundColor: '#F0FDFA'}]} keyboardType="numeric" value={formData.Duration} onChangeText={(t) => setFormData({...formData, Duration: t})} editable={formData.DoseUnit !== 'viên'} /></View>
                <View style={{flex: 1}}><Text style={styles.label}>Nhắc Nhở</Text><View style={styles.chipsContainer}>{reminderOptions.map((o, i) => (<TouchableOpacity key={i} style={[styles.chip, formData.Reminder_mode === o && styles.chipSelected]} onPress={() => setFormData({...formData, Reminder_mode: o})}><Text style={[styles.chipText, formData.Reminder_mode === o && styles.chipTextSelected]}>{o}</Text></TouchableOpacity>))}</View></View>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.addToTempBtn} onPress={addToTempPrescription}><Text style={styles.addToTempText}>THÊM VÀO DANH SÁCH CHỈ ĐỊNH</Text></TouchableOpacity>
          </View>

          <View style={[styles.cartContainer, isDesktop && { flex: 4.5 }]}>
            <View style={styles.cartHeader}><Text style={styles.cartTitle}>Phác Đồ Hiện Tại ({tempPrescription.length})</Text></View>
            <ScrollView style={{ flex: 1, padding: 12 }}>
              {tempPrescription.map((item, index) => (
                <View key={index} style={styles.cartItem}>
                  <View style={{flex: 1}}>
                    <Text style={{fontWeight: '800', fontSize: 14}}>{item.MedicineName}</Text>
                    <Text style={{fontSize: 12, color: colors.textLight}}>{item.DoseAmount} {item.DoseUnit} - {item.Usage} | {item.Duration} ngày</Text>
                    <Text style={{fontSize: 12, color: colors.primary, fontWeight: '700'}}>⏰ {item.Time.join(', ')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setTempPrescription(tempPrescription.filter((_, i) => i !== index))}><MaterialCommunityIcons name="delete-outline" size={22} color={colors.dangerText} /></TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.submitButton, tempPrescription.length === 0 && { opacity: 0.5 }]} onPress={submitFinalPrescription} disabled={tempPrescription.length === 0 || loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>XÁC NHẬN BAN HÀNH ĐƠN THUỐC</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}