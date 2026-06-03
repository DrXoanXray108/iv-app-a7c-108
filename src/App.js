import { useState, useCallback, useEffect, useRef } from "react";

// ---- DATA DEFINITIONS ----
const COMPLICATIONS = [
  "Đau tại vị trí truyền",
  "Sưng nề quanh vị trí truyền",
  "Đỏ da, nóng tại vị trí truyền",
  "Viêm tĩnh mạch",
  "Thoát mạch/dịch truyền ra ngoài lòng mạch",
  "Tắc kim, chảy chậm hoặc không chảy",
  "Rỉ dịch hoặc chảy máu tại chân kim",
  "Bầm tím sau rút kim",
  "Nhiễm khuẩn tại vị trí truyền",
  "Biến chứng khác",
];

const RELATED_FACTORS = [
  "Tuổi cao",
  "Người bệnh hạn chế vận động",
  "Thời gian lưu kim trên 72 giờ",
  "Truyền thuốc nhiều lần trong ngày",
  "Thuốc/dịch truyền có nguy cơ kích ứng tĩnh mạch",
  "Vị trí đặt kim gần khớp, dễ gập",
  "Kim cố định chưa chắc chắn",
  "Người bệnh chưa được hướng dẫn báo dấu hiệu bất thường",
];

const STORAGE_KEY = "iv_app_data_v2";
const SETTINGS_KEY = "iv_app_settings_v1";

const createEmptyPatient = (id) => ({
  id,
  maSo: "", tuoi: "", gioi: "", chanDoan: "",
  benhKemTheo: [], benhKemKhac: "", vanDong: "", thoiGianNamVien: "",
  viTriKim: "", viTriKimKhac: "", benDat: "", coKim: "",
  thoiGianDatKim: "", thoiGianLuuKim: "", soLanDat: "", coDinh: "", ghiNgayGio: "",
  loaiDich: "", loaiDichKhac: "", coTruyenThuoc: "",
  nhomThuoc: [], nhomThuocKhac: "", tocDo: "", soLanTruyen: "",
  phaThuocDung: "", kiemTraViTri: "",
  dieuDuongKiemTra: "", tanSuatKiemTra: "", huongDanBaoBenhNhan: "",
  giaKho: "", thayBang: "", ruaTay: "", satKhuan: "",
  coBienChung: "",
  complications: Object.fromEntries(COMPLICATIONS.map((k) => [k, { co: false, khong: false, ghiChu: "" }])),
  mucDo: "", thoiDiemPhatHien: "", thoiDiemKhac: "",
  ngungTruyen: "", doiViTri: "", chuom: "", baoBacSi: "", ghiHoSo: "", tinhTrangSauXuTri: "",
  relatedFactors: Object.fromEntries(RELATED_FACTORS.map((k) => [k, { co: false, khong: false }])),
  bienChungChinh: "", yeuToNoiBat: "", deXuat: [], deXuatKhac: "",
  nguoiThuThap: "", ngayThuThap: "",
});

const defaultSettings = { scriptUrl: "", totalPatients: 70 };

// ---- CSV HELPERS ----
const buildHeaders = () => [
  "STT", "Mã số BN", "Tuổi", "Giới", "Chẩn đoán", "Bệnh kèm", "Vận động", "Ngày nằm viện",
  "Vị trí kim", "Bên đặt", "Cỡ kim", "T/gian đặt kim", "T/gian lưu kim", "Số lần đặt", "Cố định", "Ghi ngày giờ",
  "Loại dịch", "Có truyền thuốc", "Nhóm thuốc", "Tốc độ", "Số lần/ngày", "Pha thuốc đúng", "Kiểm tra vị trí",
  "ĐD kiểm tra", "Tần suất KT", "Hướng dẫn BN", "Giữ khô sạch", "Thay băng", "Rửa tay", "Sát khuẩn đầu nối",
  "Có biến chứng",
  ...COMPLICATIONS.flatMap((k) => [`${k} (Có)`, `${k} (Không)`, `${k} (Ghi chú)`]),
  "Mức độ BC", "Thời điểm phát hiện",
  "Ngừng truyền", "Đổi vị trí", "Chườm/xử trí", "Báo bác sĩ", "Ghi hồ sơ", "Tình trạng sau XTri",
  ...RELATED_FACTORS.flatMap((k) => [`${k} (Có)`, `${k} (Không)`]),
  "Biến chứng chính", "Yếu tố nổi bật", "Đề xuất CS", "Người thu thập", "Ngày thu thập",
];

const patientToRow = (p) => [
  p.id, p.maSo, p.tuoi, p.gioi, p.chanDoan,
  [...p.benhKemTheo, p.benhKemKhac].filter(Boolean).join("; "),
  p.vanDong, p.thoiGianNamVien,
  [p.viTriKim, p.viTriKimKhac].filter(Boolean).join("+"), p.benDat, p.coKim,
  p.thoiGianDatKim, p.thoiGianLuuKim, p.soLanDat, p.coDinh, p.ghiNgayGio,
  [p.loaiDich, p.loaiDichKhac].filter(Boolean).join("+"), p.coTruyenThuoc,
  [...p.nhomThuoc, p.nhomThuocKhac].filter(Boolean).join("; "),
  p.tocDo, p.soLanTruyen, p.phaThuocDung, p.kiemTraViTri,
  p.dieuDuongKiemTra, p.tanSuatKiemTra, p.huongDanBaoBenhNhan,
  p.giaKho, p.thayBang, p.ruaTay, p.satKhuan,
  p.coBienChung,
  ...COMPLICATIONS.flatMap((k) => [p.complications[k].co ? "X" : "", p.complications[k].khong ? "X" : "", p.complications[k].ghiChu]),
  p.mucDo, [p.thoiDiemPhatHien, p.thoiDiemKhac].filter(Boolean).join(" - "),
  p.ngungTruyen, p.doiViTri, p.chuom, p.baoBacSi, p.ghiHoSo, p.tinhTrangSauXuTri,
  ...RELATED_FACTORS.flatMap((k) => [p.relatedFactors[k].co ? "X" : "", p.relatedFactors[k].khong ? "X" : ""]),
  p.bienChungChinh, p.yeuToNoiBat,
  [...p.deXuat, p.deXuatKhac].filter(Boolean).join("; "),
  p.nguoiThuThap, p.ngayThuThap,
];

const SECTIONS = ["1. Thông tin chung", "2. Đường truyền TM", "3. Dịch & thuốc", "4. Chăm sóc", "5. Biến chứng", "6. Xử trí", "7. Yếu tố LQ", "8. Kết luận"];

// ---- UI COMPONENTS ----
const RadioGroup = ({ options, value, onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
    {options.map((opt) => (
      <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${value === opt ? "#3b82f6" : "#e2e8f0"}`, background: value === opt ? "#eff6ff" : "white", cursor: "pointer", fontSize: 13, fontWeight: value === opt ? 600 : 400, color: value === opt ? "#1d4ed8" : "#374151", transition: "all 0.15s" }}>
        <input type="radio" style={{ display: "none" }} checked={value === opt} onChange={() => onChange(opt)} />
        {value === opt ? "●" : "○"} {opt}
      </label>
    ))}
  </div>
);

const CheckGroup = ({ options, values, onChange, otherKey, otherValue, onOtherChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {options.map((opt) => (
      <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${values.includes(opt) ? "#3b82f6" : "#e2e8f0"}`, background: values.includes(opt) ? "#eff6ff" : "white", cursor: "pointer", fontSize: 13, fontWeight: values.includes(opt) ? 600 : 400, color: values.includes(opt) ? "#1d4ed8" : "#374151" }}>
        <input type="checkbox" style={{ display: "none" }} checked={values.includes(opt)} onChange={(e) => { const next = e.target.checked ? [...values, opt] : values.filter((v) => v !== opt); onChange(next); }} />
        {values.includes(opt) ? "☑" : "☐"} {opt}
      </label>
    ))}
    {otherKey && <input style={{ padding: "5px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13, minWidth: 140 }} placeholder="Khác: ..." value={otherValue} onChange={(e) => onOtherChange(e.target.value)} />}
  </div>
);

const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type }) => (
  <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", transition: "border 0.15s" }} onFocus={(e) => (e.target.style.borderColor = "#3b82f6")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
);

// ---- SETTINGS MODAL ----
const SettingsModal = ({ settings, onSave, onClose }) => {
  const [local, setLocal] = useState(settings);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: 14, padding: 28, width: 520, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 20 }}>⚙️ Cài đặt</h3>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>Số lượng bệnh nhân</label>
          <input type="number" min={1} max={500} value={local.totalPatients} onChange={(e) => setLocal({ ...local, totalPatients: Math.max(1, parseInt(e.target.value) || 70) })}
            style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", width: 120 }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>
            Google Sheets — Apps Script URL
          </label>
          <input value={local.scriptUrl} onChange={(e) => setLocal({ ...local, scriptUrl: e.target.value })}
            placeholder="https://script.google.com/macros/s/..."
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          <div style={{ marginTop: 8, padding: "10px 14px", background: "#f0f9ff", borderRadius: 8, fontSize: 12, color: "#0369a1", lineHeight: 1.6 }}>
            <strong>Cách tạo:</strong><br />
            1. Mở <strong>Google Sheets</strong> mới → <strong>Extensions → Apps Script</strong><br />
            2. Dán code từ nút "📋 Copy Apps Script" bên dưới<br />
            3. <strong>Deploy → New deployment → Web app</strong><br />
            4. Chọn "Anyone" → Deploy → Copy URL dán vào đây
          </div>
          <button onClick={() => {
            const code = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Write header if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(data.headers);
    }

    // Build map: maSo (lowercase) -> row number in sheet
    var lastRow = sheet.getLastRow();
    var maSoRowMap = {};
    if (lastRow > 1) {
      var col2 = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      col2.forEach(function(r, i) {
        var key = String(r[0]).trim().toLowerCase();
        if (key) maSoRowMap[key] = i + 2; // row index (1-based, +1 for header)
      });
    }

    var inserted = 0, updated = 0;
    data.rows.forEach(function(row) {
      var maSo = String(row[1] || "").trim().toLowerCase();
      if (!maSo) return; // skip rows without maSo
      if (maSoRowMap[maSo]) {
        // UPDATE existing row
        sheet.getRange(maSoRowMap[maSo], 1, 1, row.length).setValues([row]);
        updated++;
      } else {
        // INSERT new row
        sheet.appendRow(row);
        maSoRowMap[maSo] = sheet.getLastRow(); // track newly added
        inserted++;
      }
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      inserted: inserted,
      updated: updated
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    if (action === "getMaSoList") {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var lastRow = sheet.getLastRow();
      var maSoList = [];
      if (lastRow > 1) {
        var col2 = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        maSoList = col2.map(function(r) { return String(r[0]).trim(); }).filter(Boolean);
      }
      return ContentService.createTextOutput(JSON.stringify({ maSoList: maSoList }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput("IV App endpoint OK");
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
            navigator.clipboard.writeText(code);
            alert("✅ Đã copy Apps Script code! Mở Google Sheets → Extensions → Apps Script → Dán code → Deploy.");
          }} style={{ marginTop: 8, padding: "7px 14px", background: "#0ea5e9", color: "white", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            📋 Copy Apps Script Code
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#f1f5f9", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Hủy</button>
          <button onClick={() => onSave(local)} style={{ padding: "9px 18px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>💾 Lưu cài đặt</button>
        </div>
      </div>
    </div>
  );
};

// ---- MAIN APP ----
export default function App() {
  const [settings, setSettings] = useState(() => {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return defaultSettings; }
  });

  const [patients, setPatients] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved)) {
        // Merge saved data with default structure (handles new fields added later)
        return saved.map((p) => ({ ...createEmptyPatient(p.id), ...p }));
      }
    } catch {}
    return Array.from({ length: settings.totalPatients }, (_, i) => createEmptyPatient(i + 1));
  });

  const [selected, setSelected] = useState(1);
  const [section, setSection] = useState(0);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [sheetStatus, setSheetStatus] = useState(null); // null | 'sending' | 'ok' | 'error'
  const [sheetMaSoList, setSheetMaSoList] = useState([]); // maSo đã có trên Sheet (lowercase)
  const [sentMaSoSet, setSentMaSoSet] = useState(new Set()); // maSo máy NÀY đã gửi lên Sheet
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'ok' | 'error'
  const importRef = useRef();
  const toastTimerRef = useRef(null);

  // Tải danh sách maSo từ Sheet về để kiểm tra trùng real-time
  const syncFromSheet = async () => {
    if (!settings.scriptUrl) {
      showToast("⚠️ Chưa cài URL Apps Script.", "warn");
      return;
    }
    setSyncStatus("syncing");
    try {
      const res = await fetch(settings.scriptUrl + "?action=getMaSoList");
      const json = await res.json();
      if (json.maSoList) {
        const list = json.maSoList.map(s => String(s).trim().toLowerCase()).filter(Boolean);
        setSheetMaSoList(list);
        setSyncStatus("ok");
        showToast(`✅ Đã đồng bộ: ${list.length} mã BN từ Sheet.`);
      } else {
        throw new Error(json.error || "Không lấy được dữ liệu");
      }
    } catch (err) {
      setSyncStatus("error");
      showToast("❌ Đồng bộ thất bại: " + err.message, "error");
    }
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Auto-save to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(patients)); } catch {}
  }, [patients]);

  // Adjust patient list when totalPatients changes
  useEffect(() => {
    setPatients((prev) => {
      const n = settings.totalPatients;
      if (prev.length === n) return prev;
      if (prev.length < n) {
        return [...prev, ...Array.from({ length: n - prev.length }, (_, i) => createEmptyPatient(prev.length + i + 1))];
      }
      return prev.slice(0, n);
    });
    if (selected > settings.totalPatients) setSelected(settings.totalPatients);
  }, [settings.totalPatients]); // eslint-disable-line

  const showToast = (msg, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const patient = patients.find((p) => p.id === selected) || patients[0];

  // Duplicate maSo detection — local (same device) + Sheet (cross-device)
  const duplicateMap = patients.reduce((acc, p) => {
    if (!p.maSo.trim()) return acc;
    acc[p.maSo.trim().toLowerCase()] = (acc[p.maSo.trim().toLowerCase()] || []).concat(p.id);
    return acc;
  }, {});
  const isDuplicate = (p) => p.maSo.trim() && duplicateMap[p.maSo.trim().toLowerCase()]?.length > 1;
  const currentPatientDuplicate = patient && isDuplicate(patient);
  const duplicateIds = currentPatientDuplicate
    ? duplicateMap[patient.maSo.trim().toLowerCase()].filter(id => id !== patient.id)
    : [];
  // Check against Sheet's maSo list (cross-device)
  // Chỉ cảnh báo nếu maSo có trên Sheet mà KHÔNG phải do máy này gửi lên
  // (tránh false positive khi máy này sync lại sau khi đã gửi data của mình)
  const isOnSheet = patient && patient.maSo.trim() &&
    sheetMaSoList.includes(patient.maSo.trim().toLowerCase()) &&
    !sentMaSoSet.has(patient.maSo.trim().toLowerCase());

  const update = useCallback((field, value) => {
    setPatients((prev) => prev.map((p) => (p.id === selected ? { ...p, [field]: value } : p)));
  }, [selected]);

  const updateComp = useCallback((key, subKey, value) => {
    setPatients((prev) => prev.map((p) => p.id === selected ? { ...p, complications: { ...p.complications, [key]: { ...p.complications[key], [subKey]: value } } } : p));
  }, [selected]);

  const updateFactor = useCallback((key, subKey, value) => {
    setPatients((prev) => prev.map((p) => p.id === selected ? { ...p, relatedFactors: { ...p.relatedFactors, [key]: { ...p.relatedFactors[key], [subKey]: value } } } : p));
  }, [selected]);

  const resetPatient = () => {
    if (!window.confirm(`Xóa toàn bộ dữ liệu bệnh nhân #${selected}?`)) return;
    setPatients((prev) => prev.map((p) => p.id === selected ? createEmptyPatient(selected) : p));
    showToast(`Đã reset BN #${selected}`);
  };

  // CSV Export (local download)
  const exportCSV = () => {
    const headers = buildHeaders();
    const rows = patients.map(patientToRow);
    const csv = [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bien_chung_IV_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✅ Đã xuất CSV thành công!");
  };

  // Google Sheets Export via Apps Script (upsert: update nếu trùng maSo, insert nếu mới)
  const exportToSheets = async () => {
    if (!settings.scriptUrl) {
      showToast("⚠️ Chưa cài URL Apps Script. Vào ⚙️ Cài đặt để thêm.", "warn");
      return;
    }
    // Chỉ gửi BN có maSo
    const toSend = patients.filter(p => p.maSo.trim());
    if (toSend.length === 0) {
      showToast("⚠️ Chưa có bệnh nhân nào có Mã số. Nhập maSo trước khi gửi.", "warn");
      return;
    }
    setSheetStatus("sending");
    const headers = buildHeaders();
    const rows = toSend.map(patientToRow).map(r => r.map(v => String(v ?? "")));
    try {
      const res = await fetch(settings.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ headers, rows }),
      });
      const json = await res.json();
      if (json.success) {
        setSheetStatus("ok");
        const { inserted = 0, updated = 0 } = json;
        // Đánh dấu các maSo đã gửi từ máy này để không cảnh báo false positive
        setSentMaSoSet(prev => {
          const next = new Set(prev);
          toSend.forEach(p => next.add(p.maSo.trim().toLowerCase()));
          return next;
        });
        showToast(`✅ Gửi xong: ${inserted} thêm mới, ${updated} cập nhật.`);
      } else {
        throw new Error(json.error || "Unknown error");
      }
    } catch (err) {
      setSheetStatus("error");
      showToast("❌ Gửi thất bại: " + err.message, "error");
    }
    setTimeout(() => setSheetStatus(null), 4000);
  };

  // Import CSV — map đầy đủ tất cả cột về patient object
  const csvRowToPatient = (cols, base) => {
    const p = { ...base };
    p.maSo = cols[1] || "";
    p.tuoi = cols[2] || "";
    p.gioi = cols[3] || "";
    p.chanDoan = cols[4] || "";
    p.benhKemKhac = cols[5] || "";      // joined benhKem → lưu vào Khác
    p.vanDong = cols[6] || "";
    p.thoiGianNamVien = cols[7] || "";
    p.viTriKimKhac = cols[8] || "";     // joined viTri → lưu vào Khác
    p.benDat = cols[9] || "";
    p.coKim = cols[10] || "";
    p.thoiGianDatKim = cols[11] || "";
    p.thoiGianLuuKim = cols[12] || "";
    p.soLanDat = cols[13] || "";
    p.coDinh = cols[14] || "";
    p.ghiNgayGio = cols[15] || "";
    p.loaiDichKhac = cols[16] || "";    // joined loaiDich → lưu vào Khác
    p.coTruyenThuoc = cols[17] || "";
    p.nhomThuocKhac = cols[18] || "";   // joined nhomThuoc → lưu vào Khác
    p.tocDo = cols[19] || "";
    p.soLanTruyen = cols[20] || "";
    p.phaThuocDung = cols[21] || "";
    p.kiemTraViTri = cols[22] || "";
    p.dieuDuongKiemTra = cols[23] || "";
    p.tanSuatKiemTra = cols[24] || "";
    p.huongDanBaoBenhNhan = cols[25] || "";
    p.giaKho = cols[26] || "";
    p.thayBang = cols[27] || "";
    p.ruaTay = cols[28] || "";
    p.satKhuan = cols[29] || "";
    p.coBienChung = cols[30] || "";
    // Complications: cột 31 + i*3
    const comps = { ...p.complications };
    COMPLICATIONS.forEach((k, i) => {
      const b = 31 + i * 3;
      comps[k] = { co: cols[b] === "X", khong: cols[b + 1] === "X", ghiChu: cols[b + 2] || "" };
    });
    p.complications = comps;
    const compEnd = 31 + COMPLICATIONS.length * 3; // = 61
    p.mucDo = cols[compEnd] || "";
    p.thoiDiemKhac = cols[compEnd + 1] || "";  // joined thoiDiem
    p.ngungTruyen = cols[compEnd + 2] || "";
    p.doiViTri = cols[compEnd + 3] || "";
    p.chuom = cols[compEnd + 4] || "";
    p.baoBacSi = cols[compEnd + 5] || "";
    p.ghiHoSo = cols[compEnd + 6] || "";
    p.tinhTrangSauXuTri = cols[compEnd + 7] || "";
    // Related factors: cột (compEnd+8) + i*2
    const rfBase = compEnd + 8; // = 69
    const rfs = { ...p.relatedFactors };
    RELATED_FACTORS.forEach((k, i) => {
      const b = rfBase + i * 2;
      rfs[k] = { co: cols[b] === "X", khong: cols[b + 1] === "X" };
    });
    p.relatedFactors = rfs;
    const rfEnd = rfBase + RELATED_FACTORS.length * 2; // = 85
    p.bienChungChinh = cols[rfEnd] || "";
    p.yeuToNoiBat = cols[rfEnd + 1] || "";
    p.deXuatKhac = cols[rfEnd + 2] || "";  // joined deXuat
    p.nguoiThuThap = cols[rfEnd + 3] || "";
    p.ngayThuThap = cols[rfEnd + 4] || "";
    return p;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result.replace(/^﻿/, ""); // strip BOM
        const lines = text.split(/\r?\n/).filter(Boolean);
        const parseCSVRow = (line) => {
          const result = [];
          let inQ = false, cur = "";
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' && !inQ) { inQ = true; }
            else if (c === '"' && inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else if (c === '"' && inQ) { inQ = false; }
            else if (c === ',' && !inQ) { result.push(cur); cur = ""; }
            else cur += c;
          }
          result.push(cur);
          return result;
        };
        const dataRows = lines.slice(1); // bỏ header
        const updated = [...patients];
        let count = 0;
        dataRows.forEach((line) => {
          const cols = parseCSVRow(line);
          const id = parseInt(cols[0]);
          if (!id || id < 1) return;
          const idx = updated.findIndex(p => p.id === id);
          if (idx === -1) return; // ngoài range → bỏ qua
          updated[idx] = csvRowToPatient(cols, updated[idx]);
          count++;
        });
        setPatients(updated);
        showToast(`✅ Đã import ${count} bệnh nhân từ CSV!`);
      } catch (err) {
        showToast("❌ Lỗi import: " + err.message, "error");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings)); } catch {}
    setShowSettings(false);
    showToast("✅ Đã lưu cài đặt!");
  };

  const filled = patients.filter((p) => p.maSo.trim() || p.tuoi.trim()).length;
  const filtered = patients.filter((p) => String(p.id).includes(search) || p.maSo.toLowerCase().includes(search.toLowerCase()));

  const sectionCompletion = patient ? [
    patient.tuoi && patient.gioi && patient.chanDoan,
    patient.viTriKim && patient.benDat && patient.coKim,
    patient.loaiDich && patient.coTruyenThuoc,
    patient.dieuDuongKiemTra && patient.huongDanBaoBenhNhan,
    patient.coBienChung,
    !patient.coBienChung || patient.coBienChung === "Không" || patient.ngungTruyen,
    true,
    patient.nguoiThuThap && patient.ngayThuThap,
  ] : Array(8).fill(false);

  if (!patient) return null;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Be Vietnam Pro', sans-serif", background: "#f0f4f8", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .pat-item { cursor: pointer; padding: 8px 10px; border-radius: 8px; margin-bottom: 3px; display: flex; align-items: center; gap: 8px; transition: all 0.15s; }
        .pat-item:hover { background: #e2e8f0; }
        .pat-item.active { background: #1e40af; color: white; }
        .sec-btn { padding: 7px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; border: none; display: flex; align-items: center; gap: 5px; text-align: left; width: 100%; background: transparent; color: #475569; }
        .sec-btn:hover { background: #e2e8f0; }
        .sec-btn.active { background: #dbeafe; color: #1d4ed8; }
        .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; }
        .check-table-row { display: grid; grid-template-columns: 1fr 50px 60px 1fr; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 6px; }
        .check-table-row:hover { background: #f8fafc; }
        .col-h { font-size: 11px; font-weight: 700; color: #64748b; text-align: center; text-transform: uppercase; }
        .checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
        .btn { padding: 9px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all 0.15s; font-family: inherit; }
        .btn-nav { background: #f1f5f9; color: #374151; }
        .btn-nav:hover { background: #e2e8f0; }
        .btn-export { background: #16a34a; color: white; }
        .btn-export:hover { background: #15803d; }
        .btn-sheets { background: #0ea5e9; color: white; }
        .btn-sheets:hover { background: #0284c7; }
        .btn-reset { background: #fee2e2; color: #dc2626; }
        .btn-reset:hover { background: #fecaca; }
        input[type=text], input[type=number], input[type=date] { font-family: inherit; }
        .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; z-index: 200; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .autosave-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; display:inline-block; margin-right:4px; }
      `}</style>

      {/* Toast notification */}
      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#fee2e2" : toast.type === "warn" ? "#fef9c3" : "#f0fdf4", color: toast.type === "error" ? "#dc2626" : toast.type === "warn" ? "#92400e" : "#15803d", border: `1px solid ${toast.type === "error" ? "#fca5a5" : toast.type === "warn" ? "#fde68a" : "#86efac"}` }}>
          {toast.msg}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}

      {/* Hidden import input */}
      <input ref={importRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />

      {/* LEFT: Patient list */}
      <div style={{ width: 200, background: "white", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 10px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>🏥 Danh sách BN</div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, display: "flex", alignItems: "center" }}>
            <span className="autosave-dot" title="Tự động lưu"></span>
            Đã nhập: <strong style={{ color: "#16a34a", marginLeft: 3 }}>{filled}</strong>/{settings.totalPatients}
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm..." style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filtered.map((p) => {
            const dup = isDuplicate(p);
            return (
              <div key={p.id} className={`pat-item ${p.id === selected ? "active" : ""}`} onClick={() => { setSelected(p.id); setSection(0); }}
                style={{ borderLeft: dup ? "3px solid #ef4444" : (p.maSo || p.tuoi) ? "3px solid #22c55e" : "3px solid transparent" }}>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>#{p.id}</span>
                <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.maSo || <span style={{ opacity: 0.4 }}>Chưa nhập</span>}
                </span>
                {dup && <span title="Mã số trùng!" style={{ fontSize: 13 }}>⚠️</span>}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 10, borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn btn-export" onClick={exportCSV} style={{ width: "100%" }}>⬇ Xuất CSV</button>
          <button className="btn btn-sheets" onClick={exportToSheets} style={{ width: "100%", opacity: sheetStatus === "sending" ? 0.7 : 1 }} disabled={sheetStatus === "sending"}>
            {sheetStatus === "sending" ? "⏳ Đang gửi..." : sheetStatus === "ok" ? "✅ Sheets" : "📊 Gửi Sheets"}
          </button>
          <button className="btn" onClick={syncFromSheet} disabled={syncStatus === "syncing"}
            style={{ width: "100%", background: syncStatus === "ok" ? "#f0fdf4" : "#f8fafc", color: syncStatus === "ok" ? "#16a34a" : "#374151", fontSize: 12, border: `1px solid ${sheetMaSoList.length > 0 ? "#86efac" : "#e2e8f0"}` }}>
            {syncStatus === "syncing" ? "⏳ Đang đồng bộ..." : syncStatus === "ok" ? `✅ Đã đồng bộ (${sheetMaSoList.length})` : `🔄 Đồng bộ Sheet${sheetMaSoList.length > 0 ? ` (${sheetMaSoList.length})` : ""}`}
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" style={{ flex: 1, background: "#f8fafc", color: "#374151", fontSize: 12 }} onClick={() => importRef.current.click()}>📥 Import</button>
            <button className="btn" style={{ flex: 1, background: "#f8fafc", color: "#374151", fontSize: 12 }} onClick={() => setShowSettings(true)}>⚙️</button>
          </div>
        </div>
      </div>

      {/* MIDDLE: Section nav */}
      <div style={{ width: 170, background: "#f8fafc", borderRight: "1px solid #e2e8f0", padding: "12px 8px", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 10, paddingLeft: 4, textTransform: "uppercase" }}>Phần</div>
        {SECTIONS.map((s, i) => (
          <button key={i} className={`sec-btn ${section === i ? "active" : ""}`} onClick={() => setSection(i)}>
            <span style={{ fontSize: 15 }}>{sectionCompletion[i] ? "✅" : "○"}</span>
            <span>{s}</span>
          </button>
        ))}
      </div>

      {/* RIGHT: Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b" }}>Bệnh nhân #{patient.id}</h2>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Biến chứng tiêm truyền TM ngoại vi — Khoa Đột quỵ não</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-reset" onClick={resetPatient} title="Xóa dữ liệu BN này">🗑 Reset BN</button>
              <button className="btn btn-nav" onClick={() => setSection((s) => Math.max(0, s - 1))} disabled={section === 0}>◀ Trước</button>
              <button className="btn btn-nav" onClick={() => setSection((s) => Math.min(7, s + 1))} disabled={section === 7}>Sau ▶</button>
            </div>
          </div>

          {/* ---- SECTION 1 ---- */}
          {section === 0 && (
            <div className="card">
              <div className="section-title">1. Thông tin chung của người bệnh</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Mã số người bệnh" required>
                  <TextInput value={patient.maSo} onChange={(v) => update("maSo", v)} placeholder="VD: BN001" />
                  {currentPatientDuplicate && (
                    <div style={{ marginTop: 6, padding: "7px 12px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 7, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                      ⚠️ Trùng với BN #{duplicateIds.join(", #")} trên máy này!
                    </div>
                  )}
                  {isOnSheet && !currentPatientDuplicate && (
                    <div style={{ marginTop: 6, padding: "7px 12px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 12, color: "#c2410c", fontWeight: 600 }}>
                      ⚠️ Mã này đã tồn tại trên Google Sheet! (máy khác đã nhập)
                    </div>
                  )}
                  {isOnSheet && currentPatientDuplicate && (
                    <div style={{ marginTop: 6, padding: "7px 12px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 7, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                      ⚠️ Trùng cả trên máy này (#{duplicateIds.join(", #")}) lẫn trên Sheet!
                    </div>
                  )}
                </Field>
                <Field label="Tuổi" required><TextInput value={patient.tuoi} onChange={(v) => update("tuoi", v)} placeholder="VD: 65" /></Field>
                <Field label="Giới" required><RadioGroup options={["Nam", "Nữ"]} value={patient.gioi} onChange={(v) => update("gioi", v)} /></Field>
                <Field label="T/gian nằm viện đến KS (ngày)"><TextInput value={patient.thoiGianNamVien} onChange={(v) => update("thoiGianNamVien", v)} placeholder="VD: 5" /></Field>
                <Field label="Chẩn đoán vào viện" required><TextInput value={patient.chanDoan} onChange={(v) => update("chanDoan", v)} placeholder="Nhập chẩn đoán..." /></Field>
                <Field label="Tình trạng vận động"><RadioGroup options={["Tự đi lại", "Hạn chế vận động", "Nằm tại giường"]} value={patient.vanDong} onChange={(v) => update("vanDong", v)} /></Field>
                <Field label="Bệnh kèm theo" style={{ gridColumn: "span 2" }}>
                  <CheckGroup options={["Đái tháo đường", "Tăng huyết áp", "Suy thận", "Suy tim"]} values={patient.benhKemTheo} onChange={(v) => update("benhKemTheo", v)} otherKey="benhKemKhac" otherValue={patient.benhKemKhac} onOtherChange={(v) => update("benhKemKhac", v)} />
                </Field>
              </div>
            </div>
          )}

          {/* ---- SECTION 2 ---- */}
          {section === 1 && (
            <div className="card">
              <div className="section-title">2. Thông tin về đường truyền tĩnh mạch ngoại vi</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Vị trí đặt kim luồn">
                  <CheckGroup options={["Mu bàn tay", "Cẳng tay", "Cổ tay", "Khuỷu tay"]} values={patient.viTriKim ? [patient.viTriKim] : []} onChange={(v) => update("viTriKim", v[v.length - 1] || "")} otherKey="viTriKimKhac" otherValue={patient.viTriKimKhac} onOtherChange={(v) => update("viTriKimKhac", v)} />
                </Field>
                <Field label="Bên đặt kim"><RadioGroup options={["Phải", "Trái"]} value={patient.benDat} onChange={(v) => update("benDat", v)} /></Field>
                <Field label="Cỡ kim luồn"><RadioGroup options={["18G", "20G", "22G", "24G"]} value={patient.coKim} onChange={(v) => update("coKim", v)} /></Field>
                <Field label="Thời gian đặt kim (giờ/ngày)"><TextInput value={patient.thoiGianDatKim} onChange={(v) => update("thoiGianDatKim", v)} placeholder="VD: 8 giờ, 01/06/2026" /></Field>
                <Field label="Thời gian lưu kim đến khi KS"><RadioGroup options={["< 24 giờ", "24–48 giờ", "49–72 giờ", "> 72 giờ"]} value={patient.thoiGianLuuKim} onChange={(v) => update("thoiGianLuuKim", v)} /></Field>
                <Field label="Số lần đặt kim trong đợt"><RadioGroup options={["1 lần", "2 lần", "≥ 3 lần"]} value={patient.soLanDat} onChange={(v) => update("soLanDat", v)} /></Field>
                <Field label="Kim được cố định chắc chắn"><RadioGroup options={["Có", "Không"]} value={patient.coDinh} onChange={(v) => update("coDinh", v)} /></Field>
                <Field label="Ghi ngày giờ đặt kim tại vị trí"><RadioGroup options={["Có", "Không"]} value={patient.ghiNgayGio} onChange={(v) => update("ghiNgayGio", v)} /></Field>
              </div>
            </div>
          )}

          {/* ---- SECTION 3 ---- */}
          {section === 2 && (
            <div className="card">
              <div className="section-title">3. Đặc điểm dịch truyền, thuốc truyền</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Loại dịch truyền">
                  <CheckGroup options={["NaCl 0,9%", "Glucose", "Ringer lactate", "Dinh dưỡng"]} values={patient.loaiDich ? [patient.loaiDich] : []} onChange={(v) => update("loaiDich", v[v.length - 1] || "")} otherKey="loaiDichKhac" otherValue={patient.loaiDichKhac} onOtherChange={(v) => update("loaiDichKhac", v)} />
                </Field>
                <Field label="Có truyền thuốc qua TM ngoại vi"><RadioGroup options={["Có", "Không"]} value={patient.coTruyenThuoc} onChange={(v) => update("coTruyenThuoc", v)} /></Field>
                {patient.coTruyenThuoc === "Có" && (
                  <Field label="Nhóm thuốc truyền">
                    <CheckGroup options={["Kháng sinh", "Giảm đau", "Vận mạch", "Kali", "Hóa chất"]} values={patient.nhomThuoc} onChange={(v) => update("nhomThuoc", v)} otherKey="nhomThuocKhac" otherValue={patient.nhomThuocKhac} onOtherChange={(v) => update("nhomThuocKhac", v)} />
                  </Field>
                )}
                <Field label="Tốc độ truyền">
                  {(() => {
                    const isBom = patient.tocDo === "Bơm tiêm điện";
                    const numVal = isBom ? 20 : (parseInt(patient.tocDo) || 20);
                    const handleSlider = (v) => update("tocDo", v + " giọt/phút");
                    const handleInput = (v) => {
                      const n = Math.min(100, Math.max(20, parseInt(v) || 20));
                      update("tocDo", n + " giọt/phút");
                    };
                    return (
                      <div>
                        {!isBom && (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>20</span>
                            <input type="range" min={20} max={100} step={1}
                              value={numVal}
                              onChange={e => handleSlider(parseInt(e.target.value))}
                              style={{ flex: 1, accentColor: "#3b82f6", height: 6, cursor: "pointer" }} />
                            <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>100</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input type="number" min={20} max={100} value={numVal}
                                onChange={e => handleInput(e.target.value)}
                                style={{ width: 64, padding: "6px 8px", border: "1.5px solid #3b82f6", borderRadius: 7, fontSize: 14, fontWeight: 700, color: "#1d4ed8", textAlign: "center", fontFamily: "inherit", outline: "none" }} />
                              <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>giọt/phút</span>
                            </div>
                          </div>
                        )}
                        <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${isBom ? "#3b82f6" : "#e2e8f0"}`, background: isBom ? "#eff6ff" : "white", cursor: "pointer", fontSize: 13, fontWeight: isBom ? 600 : 400, color: isBom ? "#1d4ed8" : "#374151", width: "fit-content" }}>
                          <input type="checkbox" style={{ display: "none" }} checked={isBom}
                            onChange={e => update("tocDo", e.target.checked ? "Bơm tiêm điện" : "20 giọt/phút")} />
                          {isBom ? "☑" : "☐"} Bơm tiêm điện
                        </label>
                      </div>
                    );
                  })()}
                </Field>
                <Field label="Số lần truyền trong ngày"><RadioGroup options={["1 lần", "2 lần", "≥ 3 lần"]} value={patient.soLanTruyen} onChange={(v) => update("soLanTruyen", v)} /></Field>
                <Field label="Pha thuốc đúng quy định"><RadioGroup options={["Có", "Không", "Không đánh giá"]} value={patient.phaThuocDung} onChange={(v) => update("phaThuocDung", v)} /></Field>
                <Field label="Kiểm tra vị trí truyền trong quá trình"><RadioGroup options={["Có", "Không"]} value={patient.kiemTraViTri} onChange={(v) => update("kiemTraViTri", v)} /></Field>
              </div>
            </div>
          )}

          {/* ---- SECTION 4 ---- */}
          {section === 3 && (
            <div className="card">
              <div className="section-title">4. Theo dõi và chăm sóc đường truyền</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="ĐD kiểm tra vị trí truyền trong ca"><RadioGroup options={["Có", "Không"]} value={patient.dieuDuongKiemTra} onChange={(v) => update("dieuDuongKiemTra", v)} /></Field>
                <Field label="Tần suất kiểm tra"><RadioGroup options={["Mỗi giờ", "Mỗi 2 giờ", "Khi BN báo đau", "Không rõ"]} value={patient.tanSuatKiemTra} onChange={(v) => update("tanSuatKiemTra", v)} /></Field>
                <Field label="BN được hướng dẫn báo dấu hiệu bất thường"><RadioGroup options={["Có", "Không"]} value={patient.huongDanBaoBenhNhan} onChange={(v) => update("huongDanBaoBenhNhan", v)} /></Field>
                <Field label="Đường truyền được giữ khô, sạch"><RadioGroup options={["Có", "Không"]} value={patient.giaKho} onChange={(v) => update("giaKho", v)} /></Field>
                <Field label="Thay băng/cố định lại khi bẩn, bong, lỏng"><RadioGroup options={["Có", "Không"]} value={patient.thayBang} onChange={(v) => update("thayBang", v)} /></Field>
                <Field label="Rửa tay/sát khuẩn tay trước thao tác"><RadioGroup options={["Có", "Không", "Không quan sát"]} value={patient.ruaTay} onChange={(v) => update("ruaTay", v)} /></Field>
                <Field label="Sát khuẩn đầu nối trước tiêm/truyền"><RadioGroup options={["Có", "Không", "Không quan sát"]} value={patient.satKhuan} onChange={(v) => update("satKhuan", v)} /></Field>
              </div>
            </div>
          )}

          {/* ---- SECTION 5 ---- */}
          {section === 4 && (
            <div className="card">
              <div className="section-title">5. Biến chứng tại vị trí tiêm truyền</div>
              <Field label="Người bệnh có biến chứng tiêm truyền?">
                <RadioGroup options={["Có", "Không"]} value={patient.coBienChung} onChange={(v) => update("coBienChung", v)} />
              </Field>
              {patient.coBienChung === "Có" && (
                <>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px 1fr", gap: 8, marginBottom: 6 }}>
                      <div className="col-h">Loại biến chứng</div>
                      <div className="col-h">Có</div>
                      <div className="col-h">Không</div>
                      <div className="col-h">Ghi chú</div>
                    </div>
                    {COMPLICATIONS.map((c) => (
                      <div className="check-table-row" key={c}>
                        <span style={{ fontSize: 13, color: "#374151" }}>{c}</span>
                        <div style={{ textAlign: "center" }}><input type="checkbox" className="checkbox" checked={patient.complications[c].co} onChange={(e) => updateComp(c, "co", e.target.checked)} /></div>
                        <div style={{ textAlign: "center" }}><input type="checkbox" className="checkbox" checked={patient.complications[c].khong} onChange={(e) => updateComp(c, "khong", e.target.checked)} /></div>
                        <input value={patient.complications[c].ghiChu} onChange={(e) => updateComp(c, "ghiChu", e.target.value)} placeholder="Ghi chú..." style={{ padding: "5px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontFamily: "inherit", width: "100%", outline: "none" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                    <Field label="Mức độ biến chứng"><RadioGroup options={["Nhẹ", "Trung bình", "Nặng"]} value={patient.mucDo} onChange={(v) => update("mucDo", v)} /></Field>
                    <Field label="Thời điểm phát hiện">
                      <RadioGroup options={["Khi đang truyền", "Sau truyền", "Khi rút kim"]} value={patient.thoiDiemPhatHien} onChange={(v) => update("thoiDiemPhatHien", v)} />
                      <div style={{ marginTop: 6 }}><input value={patient.thoiDiemKhac} onChange={(e) => update("thoiDiemKhac", e.target.value)} placeholder="Khác: ..." style={{ padding: "6px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", width: "100%", outline: "none" }} /></div>
                    </Field>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- SECTION 6 ---- */}
          {section === 5 && (
            <div className="card">
              <div className="section-title">6. Xử trí khi có biến chứng</div>
              {patient.coBienChung !== "Có" && <p style={{ color: "#94a3b8", fontSize: 13 }}>ℹ Bệnh nhân không có biến chứng — mục này không cần điền.</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, opacity: patient.coBienChung !== "Có" ? 0.4 : 1 }}>
                <Field label="Đã ngừng truyền/rút kim"><RadioGroup options={["Có", "Không"]} value={patient.ngungTruyen} onChange={(v) => update("ngungTruyen", v)} /></Field>
                <Field label="Đã đổi vị trí truyền"><RadioGroup options={["Có", "Không"]} value={patient.doiViTri} onChange={(v) => update("doiViTri", v)} /></Field>
                <Field label="Chườm/xử trí tại chỗ theo quy định"><RadioGroup options={["Có", "Không"]} value={patient.chuom} onChange={(v) => update("chuom", v)} /></Field>
                <Field label="Đã báo bác sĩ khi cần"><RadioGroup options={["Có", "Không"]} value={patient.baoBacSi} onChange={(v) => update("baoBacSi", v)} /></Field>
                <Field label="Đã ghi nhận vào hồ sơ chăm sóc"><RadioGroup options={["Có", "Không"]} value={patient.ghiHoSo} onChange={(v) => update("ghiHoSo", v)} /></Field>
                <Field label="Tình trạng sau xử trí"><RadioGroup options={["Cải thiện", "Không cải thiện", "Cần theo dõi thêm"]} value={patient.tinhTrangSauXuTri} onChange={(v) => update("tinhTrangSauXuTri", v)} /></Field>
              </div>
            </div>
          )}

          {/* ---- SECTION 7 ---- */}
          {section === 6 && (
            <div className="card">
              <div className="section-title">7. Đánh giá yếu tố liên quan</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px", gap: 8, marginBottom: 6 }}>
                <div className="col-h" style={{ textAlign: "left" }}>Yếu tố</div>
                <div className="col-h">Có</div>
                <div className="col-h">Không</div>
              </div>
              {RELATED_FACTORS.map((f) => (
                <div key={f} style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 6 }} className="check-table-row">
                  <span style={{ fontSize: 13, color: "#374151" }}>{f}</span>
                  <div style={{ textAlign: "center" }}><input type="checkbox" className="checkbox" checked={patient.relatedFactors[f].co} onChange={(e) => updateFactor(f, "co", e.target.checked)} /></div>
                  <div style={{ textAlign: "center" }}><input type="checkbox" className="checkbox" checked={patient.relatedFactors[f].khong} onChange={(e) => updateFactor(f, "khong", e.target.checked)} /></div>
                </div>
              ))}
            </div>
          )}

          {/* ---- SECTION 8 ---- */}
          {section === 7 && (
            <div className="card">
              <div className="section-title">8. Kết luận sau khảo sát</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Biến chứng chính (nếu có)"><TextInput value={patient.bienChungChinh} onChange={(v) => update("bienChungChinh", v)} placeholder="Viêm tĩnh mạch, thoát mạch..." /></Field>
                <Field label="Yếu tố liên quan nổi bật"><TextInput value={patient.yeuToNoiBat} onChange={(v) => update("yeuToNoiBat", v)} placeholder="Tuổi cao, lưu kim > 72h..." /></Field>
                <Field label="Đề xuất chăm sóc tiếp theo">
                  <CheckGroup options={["Theo dõi tiếp", "Đổi vị trí truyền", "Rút kim", "Báo bác sĩ", "Giáo dục người bệnh"]} values={patient.deXuat} onChange={(v) => update("deXuat", v)} otherKey="deXuatKhac" otherValue={patient.deXuatKhac} onOtherChange={(v) => update("deXuatKhac", v)} />
                </Field>
                <Field label="Người thu thập số liệu" required><TextInput value={patient.nguoiThuThap} onChange={(v) => update("nguoiThuThap", v)} placeholder="Họ tên điều dưỡng" /></Field>
                <Field label="Ngày thu thập" required><TextInput value={patient.ngayThuThap} onChange={(v) => update("ngayThuThap", v)} placeholder="DD/MM/YYYY" /></Field>
              </div>

              {/* Summary */}
              <div style={{ marginTop: 16, padding: "14px 16px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>📋 Tóm tắt BN #{patient.id}</div>
                <div style={{ fontSize: 13, color: "#374151", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <span>Mã BN: <strong>{patient.maSo || "—"}</strong></span>
                  <span>Tuổi/Giới: <strong>{patient.tuoi || "—"}/{patient.gioi || "—"}</strong></span>
                  <span>Biến chứng: <strong style={{ color: patient.coBienChung === "Có" ? "#ef4444" : "#16a34a" }}>{patient.coBienChung || "—"}</strong></span>
                  <span>Mức độ: <strong>{patient.mucDo || "—"}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Nav bottom */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 24 }}>
            <button className="btn btn-nav" onClick={() => setSection((s) => Math.max(0, s - 1))} disabled={section === 0}>◀ Phần trước</button>
            {section < 7
              ? <button className="btn" style={{ background: "#3b82f6", color: "white" }} onClick={() => setSection((s) => s + 1)}>Phần tiếp ▶</button>
              : <button className="btn btn-export" onClick={exportCSV}>⬇ Xuất CSV</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
