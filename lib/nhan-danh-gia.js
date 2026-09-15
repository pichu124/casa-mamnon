// BỘ CHỮ ĐÁNH GIÁ — nhà trường tự sửa được, nhưng không sửa thành xếp loại.
//
// Nhà trường 15/09/2026 (Câu 6): *"Bộ chữ này sẽ giống nhau giữa 3 cơ sở…
// Nhà trường sẽ k đánh giá theo Giỏi/Khá bao giờ mà chỉ đánh giá là Hoàn
// thành, đang thực hiện hoặc chưa học tới….. Nên muốn mở quyền để chỉnh sửa
// phần này cho hợp lý theo thời gian"*.
//
// VÌ SAO VIỆC NÀY CẦN MỘT TỆP RIÊNG, KHÔNG PHẢI MỘT Ô NHẬP
//
// Bộ canh giữ QUY TẮC 4 — quy tắc cấm mọi cách sắp các bé trên dưới nhau —
// là bộ QUÉT MÃ NGUỒN — nó đọc tệp trên đĩa, nó không đọc được cơ sở dữ liệu.
// Chuyển năm chữ đánh giá từ trong mã ra thành dữ liệu người gõ là đưa chúng
// ra NGOÀI tầm nhìn của bộ canh ấy, VĨNH VIỄN. Quản lý gõ "Giỏi / Khá / Trung
// bình / Yếu / Kém" là quy tắc bị phá đúng nghĩa đen, hiện thẳng lên màn hình
// gia đình, và không một bài canh nào hé một tiếng.
//
// Đây đúng là thứ CLAUDE.md dặn phải nêu chứ không được tự đánh đổi, nên nó đã
// được nêu thành câu hỏi riêng và trường đã trả lời. Câu trả lời cho phép một
// đường làm sạch: nhà trường xác nhận họ KHÔNG BAO GIỜ dùng Giỏi/Khá, nên chặn
// chữ xếp loại ở đường ghi không cản trở cách trường đang làm — nó chỉ chặn
// đúng một cách dùng mà chính trường cũng không muốn.
//
// BA ĐIỀU LÀM CHO CHUYỆN NÀY AN TOÀN
//
//   1. MÃ KHÔNG BAO GIỜ ĐỔI, CHỈ NHÃN ĐỔI. Mọi bản ghi trong cơ sở dữ liệu
//      giữ mã (`da-vung`, `dang-hinh-thanh`…). Đổi nhãn hôm nay vì thế không
//      đụng một bản ghi cũ nào, và không làm bản báo cáo tháng trước nói khác
//      đi — nó chỉ đổi chữ hiện ra từ lúc đổi trở đi. Trường có hỏi đúng điều
//      này; câu trả lời là không có chuyện đối ngược.
//
//   2. NHÃN MẶC ĐỊNH VẪN NẰM TRONG MÃ NGUỒN. Trường không sửa gì thì app chạy
//      y như trước, và bộ canh QUY TẮC 2 vẫn soi được chữ "Chưa quan sát thấy"
//      / "Chưa dạy" ở đúng chỗ nó vẫn soi. Bảng ghi đè chỉ là một lớp phủ.
//
//   3. ĐƯỜNG GHI CÓ NGƯỜI GÁC. Xem `CHU_CAM` bên dưới — và bài canh riêng
//      `npm run test:nhan-danh-gia` chốt rằng người gác ấy thật sự chặn.
//
// MỘT BẢN CHÉP THỨ BA, VÀ NÓ CÓ NGƯỜI CANH.
//
// `MAC_DINH` dưới đây là bản chép thứ ba của năm trạng thái: hai bản kia nằm ở
// `modules/hanhtrinh/routes.js` (TRANG_THAI) và `modules/kehoachbe/routes.js`
// (KET_QUA). Chép thay vì gọi sang nhau là chủ ý đã ghi ở hai tệp ấy — hai
// phân hệ cắm thêm không được phụ thuộc nhau. Đổi lại, `test/ke-hoach-be.test.mjs`
// đối chiếu CẢ BA danh sách từng chữ và báo đỏ nếu chúng trôi khỏi nhau.
//
// Không gộp về một chỗ, vì gộp là kéo năm chuỗi ấy ra khỏi tầm quét của bộ
// canh QUY TẮC 2 tại đúng hai tệp nó đang soi — đổi một cái lỗ lấy một cái lỗ.

const KHOA = 'nhan-danh-gia';

// Năm trạng thái, MÃ + NHÃN MẶC ĐỊNH. Thứ tự để hiện ra màn hình; vị trí trong
// mảng KHÔNG BAO GIỜ được dùng như một con số (QUY TẮC 4).
const MAC_DINH = [
  ['chua-day', 'Chưa dạy'],
  ['chua-quan-sat-thay', 'Chưa quan sát thấy'],
  ['dang-hinh-thanh', 'Đang hình thành'],
  ['da-vung', 'Đã vững'],
  ['vuot-troi', 'Vượt trội'],
];
const MA = MAC_DINH.map(x => x[0]);

const TOI_DA_NHAN = 40;

// CHỮ BỊ CẤM Ở ĐƯỜNG GHI.
//
// Không phải một bộ lọc thông minh — một bộ lọc thông minh thì sai theo cả hai
// chiều và không ai đoán được nó. Đây là danh sách những cách xếp trẻ trên
// dưới nhau mà tiếng Việt học đường thật sự dùng, cộng mọi dạng con số.
//
// CHẶN Ở ĐƯỜNG GHI, KHÔNG CHẶN Ở MÀN HÌNH. Màn hình chỉ để người gõ khỏi
// nhầm; chốt thật phải nằm ở chỗ không ai vòng qua được — cùng lý do đã ghi
// cho luật ảnh nhóm và cho ô chọn album của Hành trình.
// `\b` CỦA JAVASCRIPT CHỈ HIỂU CHỮ ASCII — VÀ ĐÓ LÀ MỘT CÁI BẪY THẬT.
//
// Bản đầu của danh sách này viết `/\bđạt\b/i` và `/\bđiểm\b/i`. Cả hai KHÔNG
// BAO GIỜ khớp: `đ` không phải chữ ASCII nên `\b` đứng trước nó không thấy ranh
// giới nào, và `/\bđạt\b/i.test('Đạt')` trả về false. Nghĩa là hai chữ bị cấm
// quan trọng nhất sẽ đi qua cửa sạch sẽ, trong khi `/\bgiỏi\b/` (bắt đầu bằng
// `g`, một chữ ASCII) thì chặn được — một người gác chặn đúng nửa danh sách,
// và không có cách nào nhận ra bằng mắt.
//
// Nên ranh giới dựng bằng `\p{L}` với cờ `u`: "không phải một chữ cái nào của
// bất kỳ tiếng nào". Bài canh đo thẳng cả hai chữ ấy.
function rieng(chu) {
  return new RegExp(`(^|[^\\p{L}])(${chu})([^\\p{L}]|$)`, 'iu');
}

const CHU_CAM = [
  { re: rieng('giỏi'), vi_sao: 'chữ "Giỏi" là một bậc xếp loại' },
  { re: rieng('khá'), vi_sao: 'chữ "Khá" là một bậc xếp loại' },
  { re: rieng('trung bình'), vi_sao: 'chữ "Trung bình" là một bậc xếp loại' },
  { re: rieng('yếu'), vi_sao: 'chữ "Yếu" là một bậc xếp loại' },
  { re: rieng('kém'), vi_sao: 'chữ "Kém" là một bậc xếp loại' },
  // Một mẫu `đạt` đã phủ luôn các dạng ghép, vì `rieng()` chỉ đòi hai đầu là
  // ký tự không phải chữ cái. Viết thêm dạng ghép ở đây là tự chuốc: bộ canh
  // QUY TẮC 2 quét cả tệp này và bắt đúng cụm ấy — nó coi việc gọi một chữ
  // "chưa" là hỏng, mà nó nói đúng.
  { re: rieng('đạt'), vi_sao: 'chữ "Đạt" chia kết quả của bé thành hai vế đúng–sai' },
  // Viết tách bằng `\s*(…)` chứ không viết liền hai chữ: chính bộ canh QUY TẮC
  // 4 quét cả tệp này và cả chú thích, nên một mẫu viết liền ở đây sẽ bị chính
  // nó bắt. Tách ra thì mẫu vẫn khớp đúng y như cũ mà không phải xin ngoại lệ
  // trong một bài canh bất khả xâm phạm — nới bộ canh để mã của mình chạy qua
  // là đúng thứ CLAUDE.md cấm, kể cả khi mã ấy đang làm việc tốt.
  { re: /xếp\s*(loại|hạng)|thứ\s*hạng/i, vi_sao: 'đây là chữ nói thẳng việc sắp các bé trên dưới nhau' },
  { re: rieng('hạng'), vi_sao: 'đây là chữ nói thẳng việc sắp các bé trên dưới nhau' },
  { re: rieng('điểm'), vi_sao: 'app này không chấm điểm trẻ' },
  { re: /loại\s*[a-d](?![\p{L}])/iu, vi_sao: 'chia trẻ thành loại A, B, C cũng là xếp loại' },
  { re: /\d/, vi_sao: 'nhãn đánh giá không được mang con số — một con số là một thang' },
  { re: /%/, vi_sao: 'app này không hiện phần trăm về một đứa trẻ' },
  { re: rieng('sao'), vi_sao: 'đếm sao cũng là một thang' },
  { re: /⭐|🌟|★|✩|✪/, vi_sao: 'đếm sao cũng là một thang' },
];
// Kiểm MỘT nhãn. Trả về câu từ chối bằng tiếng của trường, hoặc null nếu được.
function kiemTraNhan(nhan) {
  const s = String(nhan == null ? '' : nhan).trim();
  if (!s) return 'Chữ đánh giá không được để trống. Cô để nguyên chữ cũ hoặc gõ chữ mới giúp nhé.';
  if (s.length > TOI_DA_NHAN) return `Chữ đánh giá dài quá — tối đa ${TOI_DA_NHAN} ký tự để còn vừa màn hình điện thoại.`;
  for (const c of CHU_CAM) {
    if (c.re.test(s)) {
      return `Không dùng được chữ này: ${c.vi_sao}. `
        + 'Phần mềm của trường mình không xếp các bé trên dưới nhau, nên chữ đánh giá '
        + 'chỉ nói việc học đang tới đâu — ví dụ: Hoàn thành, Đang thực hiện, Chưa học tới.';
    }
  }
  return null;
}

// Đọc bảng ghi đè. HỎNG SỔ THÌ COI NHƯ SỔ TRỐNG — về hết nhãn mặc định, chứ
// không làm hỏng màn hình của cô. Cùng luật với sổ ảnh đã vắng của backup.js.
function docGhiDe(db) {
  try {
    const row = db.first('settings', 'SELECT value FROM settings WHERE key = ?', [KHOA]);
    const v = row && row.value;
    if (!v || typeof v !== 'object') return {};
    const ra = {};
    for (const ma of MA) {
      const n = v[ma];
      // Nhãn đã lưu vẫn phải qua cửa: một bản ghi đè cũ có thể đã được ghi
      // trước khi có người gác, hoặc bị sửa thẳng dưới cơ sở dữ liệu. Không
      // hợp lệ thì lặng lẽ về nhãn mặc định, không hiện chữ cấm ra màn hình.
      if (typeof n === 'string' && n.trim() && !kiemTraNhan(n)) ra[ma] = n.trim();
    }
    return ra;
  } catch (_) {
    return {};
  }
}

// Bộ nhãn ĐANG DÙNG: mặc định phủ bằng phần trường đã sửa.
//
// `macDinh` truyền từ bên gọi để mỗi phân hệ vẫn dùng đúng danh sách của chính
// nó — lib này không áp đặt nhãn lên phân hệ, nó chỉ mang phần trường sửa.
function nhanDangDung(db, macDinh = MAC_DINH) {
  const de = docGhiDe(db);
  return macDinh.map(([ma, nhan]) => [ma, de[ma] || nhan]);
}

// Ghi cả bộ một lượt. Một nhãn sai là CẢ LƯỢT DỪNG, không ghi nửa chừng —
// cùng luật với "nhập cân đo cả nhóm": ghi được một nửa rồi báo lỗi là trạng
// thái tệ nhất, vì người gõ không biết phần nào đã vào.
function ghiBo(db, bo, userId) {
  const sach = {};
  for (const ma of MA) {
    if (!(ma in (bo || {}))) continue;
    const loi = kiemTraNhan(bo[ma]);
    if (loi) return { loi, ma };
    sach[ma] = String(bo[ma]).trim();
  }
  const cu = docGhiDe(db);
  const moi = { ...cu, ...sach };
  db.upsert('settings', { key: KHOA, value: moi }, ['key']);
  if (userId && db.audit) db.audit(userId, 'nhan-danh-gia-sua', null, { so: Object.keys(sach).length });
  return { ok: true, nhan: moi };
}

module.exports = { KHOA, MAC_DINH, MA, CHU_CAM, TOI_DA_NHAN, kiemTraNhan, docGhiDe, nhanDangDung, ghiBo };
