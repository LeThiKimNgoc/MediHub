import Papa from 'papaparse';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnWcNa-ajJKXZ4T3QjlrnEU5drwTO2PfQ-oDkUFRhAMzpcydzmPHkPQG6cFOVv0LXS/exec';
const GEMINI_API_KEY = 'AIzaSyCmXOzR1tZkWMno_2q97oVZgN3OWPbktTw'; 

export const getTodayStr = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// 🔥 HÀM DỊCH MÃ 4 SỐ SANG 24H (Vd: 0800 -> 08:00, 1400 -> 14:00)
export const parseTimeInput = (input: string) => {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 4) return null;
  
  const h = parseInt(digits.substring(0, 2), 10);
  const m = parseInt(digits.substring(2, 4), 10);
  if (h > 23 || m > 59) return null;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// 🔥 CHIA GIỜ TỰ ĐỘNG 10 TIẾNG - HỆ 24H
export const autoDistributeTimes = (startInput: string, frequency: number) => {
  if (frequency <= 0) return [];
  
  // Xử lý cả đầu vào dạng 0800 hoặc 08:00
  const digits = startInput.replace(/\D/g, '');
  if (digits.length !== 4) return [];
  
  const startH = parseInt(digits.substring(0, 2), 10);
  const startM = parseInt(digits.substring(2, 4), 10);
  if (startH > 23 || startM > 59) return [];

  if (frequency === 1) return [`${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`];

  const startTotalMinutes = startH * 60 + startM;
  const totalWindowMinutes = 10 * 60; // Khung 10 tiếng
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

export const fetchInventoryData = async () => {
  const sheetId = '1dSpbzYvA6OT3pIgxx3znBE28pbaPri0l8Bnnj791g8Q';
  const gidUsage = '1133416002'; const gidMedicine = '1532424446'; 
  const t = new Date().getTime();
  
  const [resUsage, resMedicine] = await Promise.all([
    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidUsage}&t=${t}`).then(res => res.text()),
    fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMedicine}&t=${t}`).then(res => res.text())
  ]);

  return new Promise<{ usages: string[], medicines: any[] }>((resolve, reject) => {
    try {
        let usages: string[] = []; let medicines: any[] = [];
        Papa.parse(resUsage, { header: true, skipEmptyLines: true, complete: (res) => usages = res.data.map((i: any) => i.Usage).filter(Boolean) });
        Papa.parse(resMedicine, { 
          header: true, skipEmptyLines: true, 
          complete: (res) => {
            medicines = res.data.map((i: any) => ({ name: i.MedicineName, use: i.Use, imageUrl: i.ImageUrl })).filter(m => m.name);
            resolve({ usages, medicines });
          }
        });
    } catch (error) { reject(error); }
  });
};

export const analyzePrescriptionAI = async (imageBase64: string, mimeType: string, medicineOptions: any[]) => {
  const cleanBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
  const inventoryNames = medicineOptions.map(m => m.name).join(' | ');
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const promptText = `Bạn là trợ lý y khoa. Danh mục thuốc kho: [${inventoryNames}]. 1. Đọc tên thuốc trong ảnh. 2. Đối chiếu lấy chính xác tên trong danh mục. 3. Trả về mảng JSON thuần. Ví dụ: ["Paracetamol 500mg"]. Không ngoặc đơn nếu kho không có.`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType, data: cleanBase64 } }] }] })
  });

  const data = await response.json();
  if (response.ok && data.candidates && data.candidates.length > 0) {
     const textResponse = data.candidates[0].content.parts[0].text;
     const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
     if (jsonMatch) {
        const extractedArray = JSON.parse(jsonMatch[0]);
        if (Array.isArray(extractedArray) && extractedArray.length > 0) return extractedArray;
     }
  }
  throw new Error('Không tìm thấy thuốc khớp với kho.');
};

export const pushPrescriptionToSheet = async (tempPrescription: any[]) => {
  const today = getTodayStr();
  for (const item of tempPrescription) {
    const payload = { 
      action: 'addRemind', 
      data: { ...item, Time: item.Time.join(', '), Dose: `${item.DoseAmount} ${item.DoseUnit}`, StartDate: today }
    };
    await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  }
};