import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, Modal, Platform, FlatList, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Papa from 'papaparse';
import * as ImagePicker from 'expo-image-picker'; 

const colors = {
  bg: '#F8FAFC', headerBgPastel: '#FB923C', white: '#FFFFFF', carbonDark: '#1E293B',     
  textLight: '#78909C', dangerPastel: '#FFCDD2', dangerText: '#D32F2F',
  successPastel: '#E8F5E9', successText: '#2E7D32', infoBadgeBg: '#E3F2FD', infoBadgeText: '#1565C0',
};

const autoDistributeTimes = (startT: string, frequency: number) => {
  if (!startT || frequency <= 0) return [];
  let timeStr = startT.trim();
  if (timeStr.length === 4 && !timeStr.includes(':')) {
    timeStr = `${timeStr.substring(0,2)}:${timeStr.substring(2,4)}`;
  }
  if (!timeStr.includes(':')) timeStr += ':00';
  const [startH, startM] = timeStr.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM)) return [];
  if (frequency === 1) return [`${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`];
  const startTotalMinutes = startH * 60 + startM;
  const totalWindowMinutes = 10 * 60; 
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

interface AssignMedModalProps {
  visible: boolean;
  patient: any;
  medicines: any[];
  onClose: () => void;
}

export const AssignMedModal: React.FC<AssignMedModalProps> = ({ visible, patient, medicines, onClose }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900; 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false); 
  
  const [tempPrescription, setTempPrescription] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ 
    medName: '', imageUrl: '', dosageValue: '', dosageUnit: 'viên', usageMethod: 'Uống sau ăn', times: [] as string[], totalQty: '', reminder: true 
  });
  
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [autoHour, setAutoHour] = useState('08:00');
  const [autoFreq, setAutoFreq] = useState('');

  const [usageOptions, setUsageOptions] = useState<string[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const [aiSuggestedMeds, setAiSuggestedMeds] = useState<string[]>([]);

  const timeRef = useRef<TextInput>(null); 
  const dosageRef = useRef<TextInput>(null); 
  const methodRef = useRef<TextInput>(null); 
  const qtyRef = useRef<TextInput>(null);    

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';

  const processImageWithAI = async (base64Image: string) => {
    setIsScanning(true);
    setAiSuggestedMeds([]); 
    try {
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

      // 🔥 DÁN API KEY CỦA BẠN VÀO ĐÂY 🔥
      const API_KEY = 'AIzaSyBWvuiX3wPb3Sg52O2ncB1vPOOrakEzq7g'; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Đọc ảnh toa thuốc này và trích xuất danh sách tên thuốc. LƯU Ý QUAN TRỌNG: Trên toa, tên thương mại (tên thuốc cần lấy) thường được viết TRONG DẤU NGOẶC ĐƠN '()', còn bên ngoài thường là tên hoạt chất. Hãy ưu tiên trích xuất tên thuốc nằm TRONG DẤU NGOẶC. Nếu dòng nào không có dấu ngoặc, hãy lấy tên chính. Chỉ trả về ĐÚNG 1 chuỗi JSON theo cấu trúc: { 'meds': ['Tên thuốc 1', 'Tên thuốc 2', ...] }. Tuyệt đối không kèm chữ nào khác ngoài JSON." },
              { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
            ]
          }],
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);
      if (!json.candidates || json.candidates.length === 0) throw new Error("Hệ thống bị chặn hoặc không phản hồi.");

      const aiText = json.candidates[0].content.parts[0].text;
      
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Dữ liệu trả về không hợp lệ.");

      const data = JSON.parse(jsonMatch[0]);

      if (data.meds && data.meds.length > 0) {
          setAiSuggestedMeds(data.meds); 
          if (Platform.OS === 'web') alert(`Đã nhận diện được ${data.meds.length} loại thuốc! Hãy nhấp vào danh sách để nhập nhanh.`);
          else Alert.alert("Hoàn tất!", `Đã nhận diện ${data.meds.length} loại thuốc. Hãy nhấp vào danh sách để nhập nhanh.`);
      } else {
          Alert.alert("Thông báo", "Hệ thống không nhận diện được tên thuốc nào rõ ràng.");
      }
    } catch (error: any) {
      console.error("Lỗi trích xuất:", error);
      Alert.alert("Thông báo", "Không thể trích xuất dữ liệu từ ảnh này. Vui lòng nhập thủ công.");
    } finally {
      setIsScanning(false);
    }
  };

  const handlePickFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      processImageWithAI(result.assets[0].base64);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) { alert("Cần quyền truy cập Camera!"); return; }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      processImageWithAI(result.assets[0].base64);
    }
  };

  useEffect(() => {
    if (visible) {
      setLoadingUsage(true);
      const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
      const gidUsage = '1133416002'; 
      const t = new Date().getTime();

      fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidUsage}&t=${t}`)
        .then(res => res.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true, skipEmptyLines: true,
            complete: (results) => {
              const options = results.data.map((i: any) => i.Usage).filter(Boolean);
              setUsageOptions(options);
              setLoadingUsage(false);
            }
          });
        })
        .catch(() => setLoadingUsage(false));

      setTempPrescription([]);
      setAssignForm({ medName: '', imageUrl: '', dosageValue: '', dosageUnit: 'viên', usageMethod: 'Uống sau ăn', times: [], totalQty: '', reminder: true });
      setAutoFreq('');
      setAiSuggestedMeds([]);
    }
  }, [visible]);

  const filteredMeds = medicines.filter(m => {
    const searchNoAccent = medSearchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const medNoAccent = (m.MedicineName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return medNoAccent.includes(searchNoAccent);
  });

  const handleAddToTemp = () => {
    if (!assignForm.medName || !assignForm.dosageValue || assignForm.times.length === 0) {
        if (Platform.OS === 'web') return window.alert('Vui lòng nhập đầy đủ Tên thuốc, Giờ dùng và Liều lượng.');
        return Alert.alert('Thiếu thông tin', 'Vui lòng kiểm tra lại Tên thuốc, Khung Giờ, Liều lượng.');
    }
    setTempPrescription([...tempPrescription, { ...assignForm, tempId: Date.now() }]);
    setAssignForm({ ...assignForm, medName: '', imageUrl: '', dosageValue: '', totalQty: '', times: [] });
    setAutoFreq(''); 
  };

  const handleSavePrescription = async () => {
    if (tempPrescription.length === 0) { if (Platform.OS === 'web') return window.alert('Danh sách thuốc đang trống!'); return Alert.alert('Cảnh báo', 'Danh sách thuốc đang trống!'); }
    setIsSubmitting(true); let successCount = 0;
    try {
      for (const med of tempPrescription) {
        const payload = { action: 'addRemind', data: { PatientsID: patient.PatientID, MedicineName: med.medName, ImageUrl: med.imageUrl, Time: med.times.join(', '), Reminder_mode: med.reminder ? 'Bật' : 'Tắt', Status: 'Chưa sử dụng', Usage: med.usageMethod, Quantity: med.totalQty, Dose: `${med.dosageValue} ${med.dosageUnit}` } };
        const res = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const textResult = await res.text(); let jsonResult;
        try { jsonResult = JSON.parse(textResult); } catch (err) { throw new Error('Lỗi máy chủ'); }
        if (jsonResult.status === 'success') successCount++; else throw new Error(jsonResult.message);
      }
      if (successCount === tempPrescription.length) {
        if (Platform.OS === 'web') window.alert(`Đã lưu thành công ${successCount} thuốc cho bệnh nhân ${patient.Name}.`); else Alert.alert('Hoàn tất!', `Đã lưu ${successCount} thuốc cho ${patient.Name}.`);
        onClose(); 
      }
    } catch (error: any) { if (Platform.OS === 'web') window.alert('Đã xảy ra lỗi: ' + error.message); else Alert.alert('Lỗi', error.message); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={{flex: 1, backgroundColor: '#F0FDF4'}}>
        <View style={[styles.header, {backgroundColor: '#10B981', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0}]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="arrow-left" size={28} color="#fff" /></TouchableOpacity>
            <View style={{flex: 1, marginLeft: 15}}><Text style={{color:'#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1}}>GÁN THUỐC / SẢN PHẨM MỚI</Text><Text style={{color:'#DCFCE7', fontSize:13}}>Cho BN: {patient?.Name} ({patient?.PatientID})</Text></View>
            <TouchableOpacity style={[styles.navBtn, {backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15}]} onPress={handleSavePrescription} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size="small" color="#10B981" /> : <Text style={{color: '#10B981', fontWeight: '900', fontSize: 14}}>LƯU VÀO LỊCH</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{flex: 1, flexDirection: isDesktop ? 'row' : 'column', padding: 15, gap: 15}}>
          
          <ScrollView style={{flex: 1.5, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            <Text style={[styles.fieldLabel, {marginTop: 0, marginBottom: 12}]}>Trích xuất tên thuốc tự động</Text>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 25}}>
                <TouchableOpacity style={[styles.scanActionBtn, { backgroundColor: '#818CF8' }]} onPress={handlePickFile} disabled={isScanning}>
                    <MaterialCommunityIcons name="file-image-outline" size={22} color="#fff" />
                    <Text style={styles.scanActionText}>TẢI ẢNH LÊN</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.scanActionBtn, { backgroundColor: '#6366F1' }]} onPress={handleTakePhoto} disabled={isScanning}>
                    <MaterialCommunityIcons name="camera-outline" size={22} color="#fff" />
                    <Text style={styles.scanActionText}>CHỤP ẢNH ĐƠN</Text>
                </TouchableOpacity>
            </View>

            {isScanning && (
                <View style={styles.aiLoadingBox}>
                    <ActivityIndicator color="#6366F1" size="small" />
                    <Text style={styles.aiLoadingText}>Hệ thống đang xử lý hình ảnh...</Text>
                </View>
            )}

            {aiSuggestedMeds.length > 0 && (
                <View style={styles.suggestedAiBox}>
                    <Text style={styles.suggestedAiTitle}>Danh sách thuốc nhận diện được (Nhấp để chọn)</Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
                        {aiSuggestedMeds.map((med, idx) => (
                            <TouchableOpacity key={idx} style={styles.aiTagBtn} onPress={() => setAssignForm(prev => ({ ...prev, medName: med }))}>
                                <Text style={styles.aiTagText}>{med}</Text>
                                <MaterialCommunityIcons name="plus-circle-outline" size={14} color="#fff" style={{marginLeft: 5}}/>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <View style={{zIndex: 50}}>
              <Text style={styles.fieldLabel}>Tên Thuốc / Sản phẩm (*)</Text>
              <TouchableOpacity style={[styles.fieldInput, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]} onPress={() => setShowMedDropdown(!showMedDropdown)}>
                <Text style={{color: assignForm.medName ? colors.carbonDark : '#9CA3AF', fontSize: 15}}>{assignForm.medName || 'Bấm để chọn hoặc dùng trích xuất tự động...'}</Text>
                <MaterialCommunityIcons name={showMedDropdown ? "chevron-up" : "chevron-down"} size={22} color="#9CA3AF" />
              </TouchableOpacity>

              {showMedDropdown && (
                <View style={styles.dropdownBox}>
                  <View style={styles.dropdownSearch}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                    <TextInput style={styles.dropdownInput} placeholder="Tìm nhanh tên thuốc..." value={medSearchQuery} onChangeText={setMedSearchQuery} outlineStyle="none" />
                  </View>
                  <ScrollView style={{maxHeight: 200}} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                    {filteredMeds.map((med, idx) => (
                      <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => { 
                        let newUnit = assignForm.dosageUnit; let newMethod = assignForm.usageMethod; let newDosage = assignForm.dosageValue;
                        const medFullInfo = Object.values(med).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        if (medFullInfo.includes('nho') || medFullInfo.includes('dung dich') || medFullInfo.includes('giot')) { newUnit = 'giọt'; if (!newDosage) newDosage = '1'; if (!newMethod.includes('Nhỏ')) newMethod = 'Nhỏ mắt TRÁI'; } 
                        else if (medFullInfo.includes('tra mat') || medFullInfo.includes('mo') || medFullInfo.includes('tuyp')) { newUnit = 'cm'; newDosage = '0,5-1'; if (!newMethod.includes('Tra')) newMethod = 'Tra mắt TRÁI'; } 
                        else if (medFullInfo.includes('vien') || medFullInfo.includes('nang') || medFullInfo.includes('uong')) { newUnit = 'viên'; if (!newDosage) newDosage = '1'; if (!newMethod.includes('Uống')) newMethod = 'Uống sau ăn'; } 
                        else if (medFullInfo.includes('ngoai') || medFullInfo.includes('lau') || medFullInfo.includes('chuom')) { newUnit = 'cái'; if (!newDosage) newDosage = '1'; if (medFullInfo.includes('lau')) newMethod = 'Lau bờ mi'; if (medFullInfo.includes('chuom')) newMethod = 'Chườm ấm mắt 30 phút'; } 
                        setAssignForm({...assignForm, medName: med.MedicineName, imageUrl: med.ImageUrl || '', dosageUnit: newUnit, usageMethod: newMethod, dosageValue: newDosage}); 
                        setShowMedDropdown(false); setMedSearchQuery(''); 
                      }}>
                        <Text style={styles.dropdownItemText}>{med.MedicineName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.autoScheduleBox}>
              <Text style={styles.autoTitle}><MaterialCommunityIcons name="robot-outline" size={18} /> Chia giờ tự động</Text>
              <View style={{marginBottom: 12}}>
                <Text style={styles.subLabel}>1. Nhập giờ bắt đầu:</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: '#fff', borderColor: '#93C5FD', fontWeight: 'bold', color: '#1E3A8A' }]} placeholder="Vd: 08:00" value={autoHour} onChangeText={(text) => { setAutoHour(text); if (autoFreq) { const freq = parseInt(autoFreq); if (freq > 0) setAssignForm(prev => ({ ...prev, times: autoDistributeTimes(text, freq) })); } }} outlineStyle="none" />
              </View>
              <View style={{marginBottom: 12}}>
                <Text style={styles.subLabel}>2. Chọn số lần dùng / 1 ngày:</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <TouchableOpacity key={num} style={[styles.freqBtn, autoFreq === num.toString() && styles.freqBtnActive]} onPress={() => { setAutoFreq(num.toString()); setAssignForm(prev => ({ ...prev, times: autoDistributeTimes(autoHour, num) })); }}>
                      <Text style={[styles.freqBtnText, autoFreq === num.toString() && styles.freqBtnTextActive]}>{num} lần</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Các Khung Giờ Đã Chọn (*)</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 5, alignItems: 'center'}}>
              {assignForm.times.map((time, idx) => (
                <TouchableOpacity key={idx} style={[styles.timeBadge, {flexDirection: 'row', alignItems: 'center'}]} onPress={() => { const newTimes = [...assignForm.times]; newTimes.splice(idx, 1); setAssignForm({...assignForm, times: newTimes}); }}>
                  <Text style={{fontWeight:'800', color: '#047857'}}>{time}</Text>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#047857" style={{marginLeft: 5}} />
                </TouchableOpacity>
              ))}
              <TextInput ref={timeRef} style={[styles.fieldInput, { width: 110, paddingVertical: 8, height: 40, marginTop: 0 }]} placeholder="+ Thêm giờ" value={timeValue} onChangeText={setTimeValue} outlineStyle="none"
                onSubmitEditing={() => {
                  if(timeValue.trim()) {
                    let formattedTime = timeValue.trim();
                    if (/^\d{1,2}$/.test(formattedTime)) formattedTime = formattedTime.padStart(2, '0') + ':00';
                    else if (/^\d{3,4}$/.test(formattedTime)) { let min = formattedTime.slice(-2); let hr = formattedTime.slice(0, -2).padStart(2, '0'); formattedTime = `${hr}:${min}`; }
                    if(!assignForm.times.includes(formattedTime)) setAssignForm({...assignForm, times: [...assignForm.times, formattedTime]});
                    setTimeValue(''); timeRef.current?.focus(); 
                  } else dosageRef.current?.focus();
                }} blurOnSubmit={false} returnKeyType="next"
              />
            </View>

            <Text style={styles.fieldLabel}>Liều Lượng 1 Lần (*)</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
              <TextInput ref={dosageRef} style={[styles.fieldInput, {width: 100}]} placeholder="Vd: 1, 2" value={assignForm.dosageValue} onChangeText={(t)=>setAssignForm({...assignForm, dosageValue:t})} onSubmitEditing={() => methodRef.current?.focus()} blurOnSubmit={false} returnKeyType="next" outlineStyle="none" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['giọt','viên','lọ','ống','nhát xịt','ml','cm','cái'].map(u => (
                  <TouchableOpacity key={u} style={[styles.unitBtn, assignForm.dosageUnit === u && styles.unitBtnActive]} onPress={()=>setAssignForm({...assignForm, dosageUnit:u})}><Text style={[styles.unitBtnText, assignForm.dosageUnit===u && {color:'#fff'}]}>{u}</Text></TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.fieldLabel}>Cách Dùng (*)</Text>
            <TextInput ref={methodRef} style={[styles.fieldInput, { marginBottom: 12 }]} placeholder="Gõ cách dùng riêng..." value={assignForm.usageMethod} onChangeText={(t)=>setAssignForm({...assignForm, usageMethod:t})} outlineStyle="none" />
            
            {loadingUsage ? <ActivityIndicator size="small" color="#10B981" /> : (
              <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
                {usageOptions.map(m => (
                  <TouchableOpacity key={m} style={[styles.methodBtn, assignForm.usageMethod === m && styles.methodBtnActive]} 
                    onPress={() => {
                      let newUnit = assignForm.dosageUnit; let newDosage = assignForm.dosageValue;
                      const noAccentM = m.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                      if (noAccentM.includes('nho')) { newUnit = 'giọt'; if(!newDosage) newDosage='1'; }
                      else if (noAccentM.includes('tra mat')) { newUnit = 'cm'; newDosage = '0,5-1'; }
                      else if (noAccentM.includes('uong')) { newUnit = 'viên'; if(!newDosage) newDosage='1'; }
                      else if (noAccentM.includes('ngoai') || noAccentM.includes('lau') || noAccentM.includes('chuom')) { newUnit = 'cái'; if(!newDosage) newDosage='1'; }
                      setAssignForm({...assignForm, usageMethod: m, dosageUnit: newUnit, dosageValue: newDosage});
                      qtyRef.current?.focus(); 
                    }}>
                    <Text style={[styles.methodBtnText, assignForm.usageMethod===m && {color:'#fff'}]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{flexDirection:'row', gap:20, marginTop:15}}>
              <View style={{flex:1}}>
                <Text style={styles.fieldLabel}>Cấp Số Lượng Tổng</Text>
                <TextInput ref={qtyRef} style={styles.fieldInput} placeholder="Vd: 30" value={assignForm.totalQty} onChangeText={(t)=>setAssignForm({...assignForm, totalQty:t})} onSubmitEditing={handleAddToTemp} returnKeyType="done" outlineStyle="none" />
              </View>
              <View style={{alignItems:'center'}}><Text style={styles.fieldLabel}>Nhắc App</Text>
                <View style={{flexDirection:'row', gap:5}}>
                  <TouchableOpacity style={[styles.toggleBtn, assignForm.reminder && {backgroundColor:'#10B981'}]} onPress={()=>setAssignForm({...assignForm, reminder:true})}><Text style={{color: assignForm.reminder ? '#fff' : '#64748B', fontWeight:'bold'}}>Bật</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, !assignForm.reminder && {backgroundColor:'#E2E8F0'}]} onPress={()=>setAssignForm({...assignForm, reminder:false})}><Text style={{color: !assignForm.reminder ? '#64748B' : '#fff', fontWeight:'bold'}}>Tắt</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.addTempBtn} onPress={handleAddToTemp}>
              <MaterialCommunityIcons name="sticker-plus-outline" size={24} color="#fff" />
              <Text style={{color:'#fff', fontWeight:'900', marginLeft:8, fontSize:16, letterSpacing: 1}}>LƯU VÀO TOA TẠM</Text>
            </TouchableOpacity>
            <View style={{height: 40}} />
          </ScrollView>

          <View style={{flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, borderWidth: 2, borderColor: '#D1FAE5'}}>
            <View style={{backgroundColor:'#A7F3D0', padding:15, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
              <Text style={{fontWeight:'900', color:'#065F46', fontSize: 15, letterSpacing: 1}}>TOA THUỐC ĐANG GÁN</Text>
              <View style={styles.countBadge}><Text style={{color:'#fff', fontWeight:'bold'}}>{tempPrescription.length}</Text></View>
            </View>
            <FlatList data={tempPrescription} keyExtractor={(item)=>item.tempId.toString()} style={{padding: 10}} renderItem={({item})=>(
              <View style={styles.tempItem}>
                <View style={{flex:1}}><Text style={{fontWeight:'800', color:colors.carbonDark, fontSize: 15}}>{item.medName}</Text><Text style={{fontSize:13, color:colors.textLight, marginTop: 4}}>{item.dosageValue} {item.dosageUnit} | {item.usageMethod}</Text><Text style={{fontSize:12, color:'#10B981', fontWeight:'700', marginTop: 4}}>Giờ dùng: {item.times.join(', ')}</Text></View>
                <TouchableOpacity onPress={()=>setTempPrescription(tempPrescription.filter(x=>x.tempId!==item.tempId))}><MaterialCommunityIcons name="close-circle" size={26} color="#EF4444" /></TouchableOpacity>
              </View>
            )} ListEmptyComponent={<View style={{alignItems:'center', marginTop:150, opacity:0.3}}><MaterialCommunityIcons name="clipboard-text-outline" size={60} color="#94A3B8" /><Text style={{fontWeight:'700', marginTop: 10, color: '#94A3B8'}}>Toa thuốc đang trống</Text></View>} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scanActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  scanActionText: { color: '#fff', fontWeight: '900', marginLeft: 8, fontSize: 14, letterSpacing: 0.5 },
  suggestedAiBox: { backgroundColor: '#F3E5F5', padding: 15, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: '#E1BEE7' },
  suggestedAiTitle: { fontSize: 14, fontWeight: '800', color: '#7B1FA2' },
  aiTagBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9C27B0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  aiTagText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  aiLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 10 },
  aiLoadingText: { color: '#6366F1', fontWeight: '700', fontSize: 14 },
  header: { backgroundColor: colors.headerBgPastel, paddingVertical: 18, paddingHorizontal: '2%', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 8, shadowColor: colors.headerBgPastel, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  navBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#455A64', marginBottom: 8, marginTop: 10 },
  fieldInput: { borderWidth: 1, borderColor: '#CFD8DC', borderRadius: 10, padding: 12, fontSize: 16, color: colors.carbonDark, backgroundColor: '#fff' },
  autoScheduleBox: { backgroundColor: '#EFF6FF', padding: 18, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE', elevation: 1 },
  autoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 15 },
  subLabel: { fontSize: 14, color: '#1E3A8A', marginBottom: 8, fontWeight: '700' },
  freqBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#93C5FD' },
  freqBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  freqBtnText: { color: '#1E3A8A', fontWeight: 'bold' }, freqBtnTextActive: { color: '#fff' },
  dropdownBox: { position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#CFD8DC', elevation: 5, overflow: 'hidden', zIndex: 100 },
  dropdownSearch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC' }, dropdownInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 14 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }, dropdownItemText: { fontSize: 15, color: colors.carbonDark, fontWeight: '600' },
  timeBadge: { backgroundColor:'#E8F5E9', paddingHorizontal:12, paddingVertical:6, borderRadius:20 }, 
  unitBtn: { paddingHorizontal:18, paddingVertical:10, borderRadius:20, backgroundColor:'#F1F5F9', marginRight:10, borderWidth:1, borderColor:'#E2E8F0' }, unitBtnActive: { backgroundColor:'#FB923C', borderColor:'#FB923C' }, unitBtnText: { fontSize:13, fontWeight:'700', color:'#64748B' },
  methodBtn: { paddingHorizontal:16, paddingVertical:10, borderRadius:20, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', marginBottom: 8 }, methodBtnActive: { backgroundColor:'#10B981', borderColor:'#10B981' }, methodBtnText: { fontSize:13, fontWeight:'700', color:'#64748B' },
  toggleBtn: { paddingHorizontal:20, paddingVertical:12, borderRadius:20, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
  addTempBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  tempItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 10 },
  countBadge: { backgroundColor:'#059669', paddingHorizontal:12, paddingVertical:4, borderRadius:12 },
});