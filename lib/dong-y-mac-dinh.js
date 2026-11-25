// ĐỒNG Ý MẶC ĐỊNH THEO GIẤY NHẬP HỌC (Đ260i).
//
// Trường (18/11): "Trong giấy nhập học ký với phụ huynh những đoạn này auto đã
// đồng ý." Chủ dự án quyết 25/11: mọi gia đình mặc định ĐỒNG Ý cả ba mục;
// văn phòng vẫn ghi "gia đình xin rút" cho từng nhà ở Quản trị → Hồ sơ bé.
//
// Luật ảnh nhóm ở `lib/db.js` KHÔNG đổi một dòng ("chưa trả lời ≠ đồng ý" vẫn
// là luật). Đổi là DỮ LIỆU: bé mới được ghi "đồng ý" ngay lúc nhận vào, và bé đã
// có thì được điền một lần ở đây.
const db = require('./db');

const KHOA_DA_CHAY = 'dong-y-mac-dinh';
const MUC = ['hoSoHocTap', 'chiaSeGiaDinh', 'truyenThong'];
const THEO_GIAY = 'Theo giấy nhập học';
const GHI_CHU_DIEN_BU = 'Theo giấy nhập học (mặc định 25/11)';

// Bé vừa nhận vào trường — gọi ở mọi đường tạo bé, cùng giao dịch với việc tạo.
function ghiChoBeMoi(studentId) {
  return db.datDongY(studentId, {
    hoSoHocTap: true, chiaSeGiaDinh: true, truyenThong: true,
    nguoiKy: THEO_GIAY, ghiChu: THEO_GIAY,
  });
}

function daChay() {
  return !!db.first('settings', 'SELECT key FROM settings WHERE key = ?', [KHOA_DA_CHAY]);
}

// Dữ liệu mẫu cố ý giữ đủ ba trạng thái (đồng ý / đã rút / chưa trả lời) để
// các bài canh luật ảnh nhóm còn dữ liệu mà chạy — nên nó tự đánh dấu là đã
// qua bước điền dưới đây.
function danhDauDaChay(chiTiet = {}) {
  db.upsert('settings', { key: KHOA_DA_CHAY, value: { luc: new Date().toISOString(), ...chiTiet } }, ['key']);
}

// BÉ ĐÃ CÓ: CHỈ ĐIỀN MỤC CHƯA TRẢ LỜI, VÀ CHỈ MỘT LẦN.
//
// - Không bao giờ đè 0: đó là gia đình đã rút, và rút là quyền của họ
//   (Nghị định 13/2023).
// - Dấu "đã chạy" nằm trong `settings`. Thiếu nó thì mỗi lần khởi động lại sẽ
//   lặng lẽ biến mục văn phòng cố ý để "chưa trả lời" thành "đồng ý".
// - Cả lượt trong MỘT giao dịch, dấu ghi cùng giao dịch: hỏng giữa chừng thì
//   không có gì đổi, và lần khởi động sau làm lại từ đầu.
// - Kho chưa có bé nào (cài mới) thì chưa đánh dấu: bé vào sau đều đi qua
//   `ghiChoBeMoi`, nhưng bản sao lưu nạp lại thì không — lần sau xét lại.
// - Hỏng thì ghi log rồi thôi, KHÔNG ném: không được làm app ngừng khởi động.
function dienMacDinhMotLan() {
  try {
    if (daChay()) return null;
    const dsBe = db.all('students', 'SELECT id FROM students').map(r => r.id);
    if (!dsBe.length) return null;
    const cu = new Map(db.all('student_consent', 'SELECT * FROM student_consent').map(r => [r.studentId, r]));
    let soBe = 0;
    let soMuc = 0;
    db.tx(() => {
      for (const id of dsBe) {
        const r = cu.get(id) || {};
        const moi = {};
        for (const k of MUC) if (r[k] == null) moi[k] = true;
        const n = Object.keys(moi).length;
        if (!n) continue;
        moi.ghiChu = r.ghiChu ? `${r.ghiChu} · ${GHI_CHU_DIEN_BU}` : GHI_CHU_DIEN_BU;
        db.datDongY(id, moi);
        soBe++;
        soMuc += n;
      }
      danhDauDaChay({ soBe, soMuc });
    });
    db.audit(null, 'consent-mac-dinh-giay-nhap-hoc', null, { soBe, soMuc });
    if (soBe) console.log(`[đồng ý] Đã điền "đồng ý theo giấy nhập học" cho ${soBe} bé (${soMuc} mục chưa trả lời).`);
    return { soBe, soMuc };
  } catch (err) {
    console.error('[đồng ý] Chưa điền được đồng ý mặc định theo giấy nhập học, lần khởi động sau sẽ thử lại:', err.message);
    return null;
  }
}

module.exports = { KHOA_DA_CHAY, THEO_GIAY, ghiChoBeMoi, danhDauDaChay, dienMacDinhMotLan };
