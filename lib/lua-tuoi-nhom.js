// LỨA TUỔI CỦA MỘT NHÓM LỚP — nhà trẻ hay mẫu giáo.
//
// Nhà trường chốt (A4, 14/09/2026): nhật ký ngày cắt theo NHÓM LỚP thay vì
// theo ngày sinh của từng bé, và nhóm không phải nhà trẻ thì bỏ hẳn mục Nhật
// ký của bé ở màn gia đình.
//
// HAI CÂU HỎI KHÁC NHAU, VÀ ĐÓ LÀ TOÀN BỘ LÝ DO TỆP NÀY TỒN TẠI
//
// Luật cũ hỏi: "bé này đã 36 tháng chưa". Câu ấy đúng — và `laNhaTre` trong
// phân hệ Nhật ký trả lời nó rất cẩn thận, tính theo đúng NGÀY ĐANG XEM chứ
// không theo hôm nay, để bé vừa qua mốc không bị mất số thay bỉm của tháng
// trước.
//
// Nhưng câu trường thật sự hỏi là: "NHÓM này có phải nhóm nhà trẻ không". Một
// nhóm nhà trẻ vẫn có bé vừa qua 36 tháng, và cô vẫn cần ghi thay bỉm cho bé
// ấy — hỏi theo ngày sinh là ô biến mất giữa năm học, ngay giữa lúc cô đang
// dùng. Ngược lại, một bé 30 tháng học nhóm mẫu giáo (trường nhận sớm theo
// thoả thuận) thì không cần sổ bỉm.
//
// CHƯA KHAI THÌ QUAY VỀ ĐÚNG LUẬT CŨ
//
// Đây là điều giữ cho Nguyên tắc số 1 không bị vi phạm. Ngày bảng này ra đời,
// chưa nhóm nào được khai, nên mọi nhóm vẫn chạy theo ngày sinh — không một
// bé nào đổi hành vi, không một ô nào biến mất. Trường khai tới đâu thì đổi
// tới đó, và mỗi lần khai là một hành động có chủ ý, có ghi tên người khai.
//
// KHAI RỒI THÌ LỜI KHAI THẮNG NGÀY SINH. Đó chính là điều trường xin: cô của
// nhóm nhà trẻ thấy ô thay bỉm cho MỌI bé trong nhóm, kể cả bé đã 37 tháng.

const LUA = [
  ['nha-tre', 'Nhà trẻ (12–36 tháng)'],
  ['mau-giao', 'Mẫu giáo (3–6 tuổi)'],
];
const MA_LUA = LUA.map(x => x[0]);
const TEN_LUA = Object.fromEntries(LUA);

function hopLe(ma) {
  return MA_LUA.includes(String(ma || ''));
}

// Lời khai của một nhóm, hoặc null nếu trường chưa khai.
//
// Bọc bắt lỗi vì cùng lý do với sổ ảnh đã vắng của backup.js: bảng phụ hỏng
// hay chưa kịp tạo thì phải về đúng hành vi cũ, chứ không làm sập màn nhật ký
// của cả trường.
function khaiCua(db, classId) {
  if (!classId) return null;
  try {
    const r = db.first('class_lua_tuoi',
      'SELECT lua FROM class_lua_tuoi WHERE classId = ?', [classId]);
    return r && hopLe(r.lua) ? r.lua : null;
  } catch (_) {
    return null;
  }
}

// Bản đồ classId -> lứa cho nhiều nhóm, đọc MỘT lượt.
function khaiTheoNhom(db, classIds) {
  const ra = {};
  const ds = (classIds || []).filter(Boolean);
  if (!ds.length) return ra;
  try {
    const m = ds.map(() => '?').join(',');
    for (const r of db.all('class_lua_tuoi',
      `SELECT classId, lua FROM class_lua_tuoi WHERE classId IN (${m})`, ds)) {
      if (hopLe(r.lua)) ra[r.classId] = r.lua;
    }
  } catch (_) { /* chưa có bảng thì coi như chưa khai nhóm nào */ }
  return ra;
}

// CÂU TRẢ LỜI DUY NHẤT CHO "CÓ GHI SỔ NHÀ TRẺ KHÔNG".
//
// `theoNgaySinh` là kết quả của luật cũ, do bên gọi tính và truyền vào — tệp
// này CỐ Ý không tự tính tuổi. Phép tính ấy đã có một bản cẩn thận trong phân
// hệ Nhật ký (tính theo ngày đang xem, không theo hôm nay), và viết bản thứ
// hai ở đây là hai bản sẽ trôi khỏi nhau đúng vào chỗ khó nhận ra nhất.
function coSoNhaTre(db, classId, theoNgaySinh) {
  const khai = khaiCua(db, classId);
  if (khai === null) return !!theoNgaySinh;   // chưa khai → luật cũ
  return khai === 'nha-tre';
}

function dat(db, classId, lua, userId) {
  if (!classId) return null;
  if (!hopLe(lua)) return null;
  db.upsert('class_lua_tuoi', {
    classId, lua: String(lua), khaiLuc: new Date().toISOString(), khaiBoi: userId || null,
  }, ['classId']);
  return String(lua);
}

// Gỡ lời khai — nhóm quay về luật cũ (tính theo ngày sinh).
function go(db, classId) {
  if (!classId) return;
  try { db.run('DELETE FROM class_lua_tuoi WHERE classId = ?', [classId]); } catch (_) {}
}

module.exports = { LUA, MA_LUA, TEN_LUA, hopLe, khaiCua, khaiTheoNhom, coSoNhaTre, dat, go };
