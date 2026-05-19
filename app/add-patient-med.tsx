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
  
  // 🔥 Thêm State quản lý Khung giờ chia tự động (Mặc định gợi ý sẵn 10h)
  const [autoTimeFrame, setAutoTimeFrame] = useState('10');

  const [usageOptions, setUsageOptions] = useState<string[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<any[]>([]); 
  const [loadingData, setLoadingData] = useState(true); 
  const [aiSuggestedMeds, setAiSuggestedMeds] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tempPrescription, setTempPrescription] = useState<any[]>([]);

  // 🔥 MỞ RỘNG FORM: Thêm 3 trường cấu hình Cá thể hóa để đồng bộ trực tiếp lên Google Sheets
  const defaultForm = { 
    sheetName: 'Log', 
    PatientsID: params.id || '', 
    MedicineName: '', 
    ImageUrl: '', 
    Time: [] as string[], 
    Reminder_mode: 'Bật', 
    Status: 'Chưa sử dụng', 
    Quantity: '', 
    DoseAmount: '', 
    DoseUnit: 'giọt', 
    Usage: '', 
    Duration: '',
    SleepTime: '22:00', // Giờ ngủ mặc định chuẩn y khoa
    WakeTime: '06:00',  // Giờ dậy mặc định chuẩn y khoa
    Spacing: '2'        // Khoảng cách dãn liều bù mặc định (giờ)
  };
  
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

  // 🔥 THUẬT TOÁN TỰ ĐỘNG CHIA GIỜ DỰA TRÊN KHUNG GIỜ TÙY CHỈNH (DYNAMIC TIME-FRAME)
  useEffect(() => {
    if (isEyeDrops) {
      const freq = parseInt(autoFreq);
      if (freq > 0 && autoStartTime.length === 4) {
        const startH = parseInt(autoStartTime.substring(0, 2));
        const startM = parseInt(autoStartTime.substring(2, 4));
        
        if (!isNaN(startH) && !isNaN(startM) && startH <= 23 && startM <= 59) {
          const startTotalMins = startH * 60 + startM;
          const frameHours = parseFloat(autoTimeFrame || '10'); // Đọc số khung giờ gõ thủ công
          const frameMins = frameHours * 60;
          let generatedTimes = [];

          if (freq <= 1) {
            generatedTimes.push(`${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`);
          } else {
            const interval = frameMins / (freq - 1); // Công thức chia dãn cách khoảng thời gian
            for (let i = 0; i < freq; i++) {
              const currentMins = startTotalMins + Math.round(i * interval);
              const h = Math.floor(currentMins / 60) % 24;
              const m = currentMins % 60;
              generatedTimes.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
          }
          setFormData(prev => ({ ...prev, Time: generatedTimes }));
        }
      } else if (!autoFreq) {
        setFormData(prev => ({ ...prev, Time: [] }));
      }
    }
  }, [autoStartTime, autoFreq, autoTimeFrame, formData.DoseUnit]); // Lắng nghe thêm biến autoTimeFrame

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
    setFormData(defaultForm); setAutoFreq(''); setAutoTimeFrame('10'); setShowDropdown(false); setManualTime('');
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

  const handleGoBack = () => {
    try {
      if (router.canGoBack()) { router.back(); } 
      else { router.replace('/patient'); }
    } catch (error) { router.replace('/patient'); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {toastMessage !== '' && <View style={styles.toastContainer}><MaterialCommunityIcons name="check-circle" size={20} color={colors.white} /><Text style={styles.toastText}>{toastMessage}</Text></View>}

      <View style={styles.appHeader}>
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

              {/* 🔥 GIAO DIỆN KHỐI TỰ ĐỘNG CHIA GIỜ CÓ THÊM Ô NHẬP KHUNG THỦ CÔNG (3 CỘT) */}
              {isEyeDrops && (
                <View style={[styles.autoScheduleBox, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1', borderWidth: 1 }]}>
                  <Text style={[styles.autoTitle, { color: '#0F766E' }]}>⏰ Tự động chia giờ</Text>
                  <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
                    <View style={{flex: 1}}><Text style={styles.subLabel}>Bắt đầu (4 số)</Text><TextInput style={styles.miniInput} placeholder="0800" keyboardType="numeric" maxLength={4} value={autoStartTime} onChangeText={setAutoStartTime} /></View>
                    <View style={{flex: 1}}><Text style={styles.subLabel}>Số lần/ngày</Text><TextInput style={styles.miniInput} placeholder="6" keyboardType="numeric" value={autoFreq} onChangeText={setAutoFreq} /></View>
                    <View style={{flex: 1}}><Text style={[styles.subLabel, {color: '#0F766E', fontWeight: 'bold'}]}>Khung (Giờ)</Text><TextInput style={[styles.miniInput, {borderColor: '#00A991', borderWidth: 1.5}]} placeholder="10" keyboardType="numeric" value={autoTimeFrame} onChangeText={setAutoTimeFrame} /></View>
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

              {/* 🔥 TÍNH NĂNG MỚI: CARD CẤU HÌNH CÁ THỂ HÓA (BẢO VỆ GIẤC NGỦ & DÃN LIỀU BÙ KHẨN CẤP) */}
              <View style={{ backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, marginTop: 16, marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                  <MaterialCommunityIcons name="cog-outline" size={16} color="#475569" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569' }}>Cấu hình cá thể hóa (Dành cho liều bù)</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' }}>Giờ ngủ người bệnh</Text>
                    <TextInput style={[styles.input, { height: 38, padding: 8, fontSize: 13, backgroundColor: '#FFF' }]} placeholder="22:00" value={formData.SleepTime} onChangeText={(t) => setFormData({ ...formData, SleepTime: t })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' }}>Giờ dậy người bệnh</Text>
                    <TextInput style={[styles.input, { height: 38, padding: 8, fontSize: 13, backgroundColor: '#FFF' }]} placeholder="06:00" value={formData.WakeTime} onChangeText={(t) => setFormData({ ...formData, WakeTime: t })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' }}>Dãn cách bù (Giờ)</Text>
                    <TextInput style={[styles.input, { height: 38, padding: 8, fontSize: 13, backgroundColor: '#FFF' }]} placeholder="2" keyboardType="numeric" value={formData.Spacing} onChangeText={(t) => setFormData({ ...formData, Spacing: t })} />
                  </View>
                </View>
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
                    <Text style={{fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2}}>⏰ {item.Time.join(', ')}</Text>
                    {/* Hiển thị thông số cấu hình nhỏ bên dưới phác đồ tạm tính để bác sĩ rà soát */}
                    <Text style={{fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 2}}>Giờ ngủ: {item.SleepTime} - Giờ dậy: {item.WakeTime} | Dãn cách: {item.Spacing}h</Text>
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