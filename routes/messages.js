// Phân hệ Nhắn tin: kênh trao đổi trực tiếp giáo viên ↔ phụ huynh và nhóm lớp.
const db = require('../lib/db');
const tb = require('../lib/thong-bao');
const tbb = require('../lib/thong-bao-be');
const nl = require('../lib/nhom-lop');
// Ba nhóm cô: chủ nhiệm / nước ngoài / thể chất (Đ188, Câu 11).
const nhomCo = require('../lib/nhom-co');
const { requireRole } = require('../lib/auth');
// Thu hồi một lời nhắn (Đ196, việc 25) — dùng ĐÚNG cơ chế đã canh ở bốn chỗ
// khác: đánh dấu ẩn, không xoá, và còn vết để tra khi có khiếu nại.
const st = require('../lib/sua-thu-hoi');

const GROUP_AVATAR = { emoji: '👥', bg: '#5b6ceb' };

// MỞ MỘT PHÒNG CHAT KHÔNG ĐƯỢC KÉO VỀ CẢ NĂM HỌC.
//
// `GET /api/messages/:id` trước đây trả về MỌI tin nhắn của hội thoại, không
// giới hạn. Nhóm lớp mầm non là một hội thoại chung của cô và 20 gia đình, và
// đây là phân hệ nhắn tin hằng ngày — vài chục tin một ngày là bình thường,
// nên sau một năm học hội thoại đó có hàng nghìn tin.
//
// Ba chỗ cùng gánh: máy chủ dựng chừng ấy đối tượng trong bộ nhớ, đường truyền
// chở chừng ấy chữ, và điện thoại của cô dựng chừng ấy bong bóng chat trước khi
// vẽ được khung hình đầu tiên. Máy trường đang dùng là máy Android rẻ tiền; đây
// đúng là kiểu chậm mà người dùng đọc ra là "app hỏng".
//
// Nên mở phòng thì lấy CỬA SỔ TIN MỚI NHẤT, và mở thêm một đường lấy tin cũ
// hơn để không ai mất lịch sử. Con số đủ rộng để phần lớn hội thoại vẫn về đủ
// trong một lần.
const CUA_SO_TIN = 200;

// DANH SÁCH HỘI THOẠI CŨNG PHẢI CÓ TRẦN.
//
// Hội thoại riêng cô ↔ gia đình chỉ SINH RA chứ không bao giờ đóng: mỗi năm
// học trường nhận một lứa mới là thêm 20–25 hội thoại nằm lại vĩnh viễn, và
// app không có đường nào xoá chúng. Sau vài năm, mở màn Nhắn tin là kéo cả sổ
// liên lạc của mọi lứa cũ về điện thoại chỉ để nhắn cho nhóm năm nay.
//
// 40 đủ rộng để KHÔNG ai ở trường hôm nay nhìn thấy nút "xem cũ hơn": cô đông
// việc nhất cũng chỉ chừng 25 hội thoại. Nút chỉ hiện khi trường thật sự vượt
// qua con số đó — tức đúng lúc cần.
const MOI_TRANG = 40;
const TRANG_TOI_DA = 200;

// Tên hiển thị kèm danh xưng, ví dụ "Cô Nguyễn Thị Mai Anh".
function displayName(u) {
  return u ? `${u.title} ${u.name}` : '';
}

function memberIds(conversationId) {
  return db.all('conversation_members',
    'SELECT userId FROM conversation_members WHERE conversationId = ?', [conversationId])
    .map(r => r.userId);
}

// ---------------------------------------------------------------------------
// KÊNH NHẮN TIN (Đ151) — gia đình ↔ NHÓM LỚP, gia đình ↔ VĂN PHÒNG
//
// Nhà trường 10/09: *"giao diện phụ huynh phải nhắn tin với LỚP và nhắn tin với
// VĂN PHÒNG, chứ mình cũng k muốn là nhắn tin với từng cô riêng lẻ"*.
//
// MỘT KÊNH LÀ MỘT GIA ĐÌNH NÓI VỚI MỘT BÊN CỦA TRƯỜNG — không phải một phòng
// chung cả lớp. Xem chú thích bảng `kenh_hoi_thoai` ở lib/schema.sql: chuyện
// nhà một bé mà hiện trước mặt mười chín nhà khác là hỏng lòng tin không lấy
// lại được.
//
// AI ĐỌC ĐƯỢC MỘT KÊNH LÀ CÂU HỎI TÍNH LẠI MỖI LẦN HỎI, không phải một danh
// sách chép ra lúc lập phòng:
//
//   gia đình  → `canAccessStudent` (bé của mình)
//   cô        → `canAccessClass` với kênh 'nhom' (nhóm mình ĐANG phụ trách)
//   văn phòng → `canAccessStudent` với kênh 'vanphong' (đã lo tầng cơ sở)
//
// Nhờ vậy cô mới về nhóm ĐỌC ĐƯỢC NGAY, và cô đã chuyển đi thì thôi — hai mặt
// của đúng chỗ hở mà chú thích `findConv` bên dưới đã ghi lại cho phòng chung.
//
// HÀNG THÀNH VIÊN VẪN GHI, nhưng chỉ để đếm tin chưa đọc và để hội thoại hiện
// trong danh sách (hai thứ đó đi theo `conversation_members`). Hàng ấy được
// THÊM VÀO khi người có quyền mở màn, và nó KHÔNG cấp quyền — quyền vẫn tính
// lại ở `findConv`.
// BA ĐẦU MỐI CHO GIA ĐÌNH (Đ188, Câu 11).
//
// Nhà trường: *"Khi ở giao diện của Phụ huynh tôi chỉ muốn hiện lên 3 ng để PH
// có thể nhắn tin tới: Giáo viên chủ nhiệm, GV nước ngoài, văn phòng Nhà
// trường"*.
//
// `'nhom'` GIỮ NGUYÊN MÃ, chỉ đổi cách gọi trên màn hình. Mọi hội thoại đã có
// đều mang mã ấy; đổi mã là làm cả kho tin nhắn cũ rơi ra ngoài mọi bộ lọc,
// tức gia đình mở app lên thấy mất sạch những gì đã nhắn với cô. Thêm ĐÚNG MỘT
// mã mới, `'nuoc-ngoai'`.
//
// KHÔNG có kênh cho cô thể chất: trường liệt kê ba đầu mối và cô P.E không nằm
// trong đó. Cô P.E vẫn lên kế hoạch và đánh giá như hai nhóm kia — đó là việc
// khác, không phải nhắn tin.
const KENH = ['nhom', 'vanphong', 'nuoc-ngoai'];

// Kênh thuộc về một NHÓM LỚP (cô đọc theo nhóm), khác kênh văn phòng (văn
// phòng đọc theo cơ sở của bé). Gom thành một câu hỏi vì có bốn chỗ hỏi nó,
// và bốn chỗ viết `=== 'nhom'` thì thêm kênh thứ ba là sót một chỗ.
function laKenhCuaNhom(loai) {
  return loai === 'nhom' || loai === 'nuoc-ngoai';
}

// Nhóm cô ứng với một kênh. Cô vào được kênh nào là theo vai cô giữ Ở CHÍNH
// nhóm lớp đó — không phải theo một cái nhãn dán lên con người.
const NHOM_CUA_KENH = { nhom: 'chu-nhiem', 'nuoc-ngoai': 'nuoc-ngoai' };

// ---- HỘI THOẠI ĐÃ ĐÓNG (Đ192, Câu 5) ----
//
// Nhà trường: *"Quản lý cơ sở và cấp 1 có thể xem lại được -> chỉ xem lại được
// k thể nhắn vào thêm được nữa"*.
//
// BA ĐIỀU LÀM CHO CHUYỆN NÀY KHÔNG PHÁ CHỐT PHÂN QUYỀN ĐANG CÓ:
//
//   1. CHỈ MỞ VỚI HỘI THOẠI ĐÃ ĐÓNG. Cuộc đang sống thì quản lý vẫn KHÔNG đọc
//      được, y như trước — đó là chủ ý đã có bài canh riêng, và nó không được
//      nới ra một ly. Đóng là một hành động có chủ ý của trường, ghi ngày giờ
//      và ghi tên người đóng.
//   2. CHỈ ĐỌC, VỚI MỌI NGƯỜI. Cuộc đã đóng thì KHÔNG AI nhắn thêm được —
//      không cô, không gia đình, không cả người vừa mở ra xem. Một kho lưu mà
//      viết thêm được thì nó không còn là kho lưu.
//   3. CHỈ BAN GIÁM HIỆU VÀ QUẢN LÝ CƠ SỞ. Văn phòng cơ sở KHÔNG có đường này:
//      trường nói rõ "quản lý cơ sở và cấp 1", và văn phòng tuy cùng Cấp 3
//      nhưng khác quyền — đúng điều trường xác nhận ở Câu 3.
//
// VÀ MỖI LƯỢT MỞ ĐỀU GHI NHẬT KÝ. Đây là nội dung riêng tư giữa một gia đình
// và cô của con họ; một đường đọc không để lại vết là một đường không ai kiểm
// được về sau.
const CHUC_VU_XEM_DA_DONG = ['hieu-truong', 'quanly-coso'];

function xemDuocDaDong(user) {
  if (!user || user.role !== 'admin') return false;
  const cv = db.chucVu(user);
  // `null` là ban giám hiệu không khai chức vụ — cùng cách hiểu với mọi chốt
  // chức vụ khác trong kho này.
  return cv === null || CHUC_VU_XEM_DA_DONG.includes(cv);
}

function dongCua(conversationId) {
  try {
    return db.first('hoi_thoai_dong',
      'SELECT * FROM hoi_thoai_dong WHERE conversationId = ?', [conversationId]) || null;
  } catch (_) {
    return null;
  }
}

function daDong(conversationId) {
  return !!dongCua(conversationId);
}

function kenhCua(conversationId) {
  return db.first('kenh_hoi_thoai',
    'SELECT * FROM kenh_hoi_thoai WHERE conversationId = ?', [conversationId]);
}

// Người này có được vào kênh đó không. Tính lại từ quyền thật, mỗi lần hỏi.
function vaoDuocKenh(user, k) {
  if (!k) return false;
  if (user.role === 'parent') return db.canAccessStudent(user, k.studentId);
  if (user.role === 'teacher') {
    if (!laKenhCuaNhom(k.loai)) return false;
    if (!db.canAccessClass(user, k.classId)) return false;
    // VAI TÍNH LẠI MỖI LẦN HỎI, như mọi chốt khác ở tệp này. Trường đổi vai của
    // cô là quyền đọc đổi theo ngay, không chờ ai bấm gì.
    return nhomCo.nhomCua(db, k.classId, user.id) === NHOM_CUA_KENH[k.loai];
  }
  if (user.role === 'admin') return k.loai === 'vanphong' && db.canAccessStudent(user, k.studentId);
  return false;
}

// Kênh đã có của một bé, theo loại.
function kenhCuaBe(studentId, loai) {
  return db.first('kenh_hoi_thoai',
    'SELECT * FROM kenh_hoi_thoai WHERE studentId = ? AND loai = ?', [studentId, loai]);
}

// ---- VĂN PHÒNG LÀ MỘT ĐẦU MỐI CHO CẢ NHÀ (góp ý 16/10, mục phụ huynh 1) ----
//
// Nhà trường: *"Nhắn tin với cô, văn phòng nhà trường là 1. nên không cần tách
// ra Văn phòng nhà trường về bé này bé kia"*. Gia đình thấy MỘT mục văn phòng
// cho mỗi cơ sở có con học — gần như luôn là một.
//
// TẦNG DỮ LIỆU KHÔNG ĐỔI: kênh vẫn lưu theo (bé, loại), và quyền vẫn tính theo
// bé đó (`vaoDuocKenh`), nên mục gộp chỉ là chọn MỘT bé để gắn. Cuộc văn phòng
// cũ theo từng bé không bị gộp hay xoá; chúng vẫn nằm trong danh sách và vẫn mở
// được. Gộp theo cơ sở, không gộp cả nhà: văn phòng đọc theo cơ sở của bé, nên
// gắn chung một bé là cuộc nhắn về con ở cơ sở 2 rơi vào hộp thư cơ sở 1.
//
// VÀ CHỈ GỘP CÁC BÉ CÓ CÙNG BỘ PHỤ HUYNH. Kênh của một bé mở cho MỌI phụ huynh
// của bé ấy. Bố mẹ riêng có một con chung: gộp con chung với con riêng của mẹ
// là chuyện con riêng của mẹ hiện trước mặt bố của con chung. Nhà như vậy thấy
// một mục cho mỗi bộ phụ huynh, kèm tên các bé của mục đó.
function coSoCuaBe(s) {
  return (s && s.classId && db.campusOfClass(s.classId)) || '';
}

function boPhuHuynh(s) {
  return [...new Set(s.parentIds || [])].sort().join(',');
}

// Các bé đã xếp nhóm, chia theo cơ sở rồi theo bộ phụ huynh:
// Map(cơ sở → Map(bộ phụ huynh → [bé])). Giữ thứ tự của danh sách đưa vào.
function nhomVanPhong(cacBe) {
  const theoCoSo = new Map();
  for (const s of cacBe) {
    if (!s.classId) continue;
    const cs = coSoCuaBe(s);
    if (!theoCoSo.has(cs)) theoCoSo.set(cs, new Map());
    const theoNha = theoCoSo.get(cs);
    const nha = boPhuHuynh(s);
    if (!theoNha.has(nha)) theoNha.set(nha, []);
    theoNha.get(nha).push(s);
  }
  return theoCoSo;
}

// Dòng phụ của một mục văn phòng PHÍA GIA ĐÌNH. Nhà thường (một cơ sở, bố mẹ
// cùng gắn mọi con) để trống. Con học hai cơ sở thì nêu tên cơ sở; trong một cơ
// sở có từ hai bộ phụ huynh thì nêu tên các bé của mục, để biết mục nào người
// kia cũng đọc.
function dongPhuVanPhong(theoCoSo, cs, cacBe) {
  const coSo = theoCoSo.size > 1 ? db.findCampus(cs) : null;
  return [
    coSo ? coSo.name : '',
    theoCoSo.get(cs).size > 1 ? `Về ${cacBe.map(s => `bé ${s.name}`).join(', ')}` : '',
  ].filter(Boolean).join(' · ');
}

// Cuộc văn phòng có tin GẦN NHẤT trong số các bé này, để mục gộp mở lại đúng
// mạch đang dở. Cuộc nhà trường đã đóng xếp sau cuộc đang sống: gia đình không
// mở được cuộc đã đóng, và cuộc đã đóng của bé này không được che mất cuộc đang
// sống của bé kia.
function kenhVanPhongGanNhat(studentIds) {
  if (!studentIds.length) return null;
  const m = studentIds.map(() => '?').join(',');
  return db.first('kenh_hoi_thoai',
    `SELECT k.* FROM kenh_hoi_thoai k
      WHERE k.loai = 'vanphong' AND k.studentId IN (${m})
      ORDER BY k.conversationId IN (SELECT conversationId FROM hoi_thoai_dong),
               COALESCE((SELECT MAX(ms.createdAt) FROM messages ms
                          WHERE ms.conversationId = k.conversationId), k.taoLuc, '') DESC,
               k.conversationId DESC
      LIMIT 1`, studentIds) || null;
}

// Dòng phụ của một cuộc văn phòng đã có, PHÍA GIA ĐÌNH — cùng cách tính với
// mục trong "Trò chuyện mới", theo nhóm chứa bé gắn kênh.
function dongPhuVanPhongCuaBe(user, be) {
  if (!be || !be.classId || !db.canAccessStudent(user, be.id)) return '';
  const cacBe = db.studentsOf(user);
  if (!cacBe.some(s => s.id === be.id)) cacBe.push(be);
  const theoCoSo = nhomVanPhong(cacBe);
  const cs = coSoCuaBe(be);
  const cacBeCuaMuc = [...theoCoSo.get(cs).values()].find(n => n.some(s => s.id === be.id));
  return dongPhuVanPhong(theoCoSo, cs, cacBeCuaMuc);
}

// Dòng phụ của kênh văn phòng PHÍA NHÀ TRƯỜNG: văn phòng trả lời một NHÀ, nên
// nêu tên phụ huynh và các con có CÙNG bộ phụ huynh với bé gắn kênh, ở cùng cơ
// sở — đúng những bé mục ấy nói tới, không nêu con riêng của một người trong
// nhà. Chỉ bé người đọc được: văn phòng cơ sở 1 không được biết tên bé học cơ
// sở 2.
function nhaCuaKenhVanPhong(user, be) {
  if (!be) return '';
  const cs = coSoCuaBe(be);
  const nha = boPhuHuynh(be);
  const con = [be];
  for (const s of db.withParents(db.all('students',
    `SELECT DISTINCT s.* FROM students s
       JOIN student_parents sp ON sp.studentId = s.id
      WHERE sp.parentId IN (SELECT parentId FROM student_parents WHERE studentId = ?)
        AND s.id != ? AND s.active = 1
      ORDER BY s.name`, [be.id, be.id]))) {
    if (boPhuHuynh(s) === nha && coSoCuaBe(s) === cs && db.canAccessStudent(user, s.id)) con.push(s);
  }
  const phuHuynh = (be.parentIds || []).map(id => db.findUser(id)).filter(Boolean).map(displayName);
  const tenCon = con.map(s => {
    const lop = s.classId ? db.findClass(s.classId) : null;
    return `bé ${s.name}${lop ? ` (${lop.name})` : ''}`;
  });
  return [phuHuynh.join(', '), tenCon.join(', ')].filter(Boolean).join(' · ');
}

// ĐỒNG BỘ HÀNG THÀNH VIÊN CHO NHỮNG KÊNH NGƯỜI NÀY ĐƯỢC VÀO.
//
// Chạy ở đầu đường lấy danh sách hội thoại. Thường không ghi gì cả — chỉ ghi
// đúng lúc có kênh mới, hoặc lúc một cô vừa được phân về nhóm.
//
// VÌ SAO KHÔNG ĐỂ DANH SÁCH TỰ ĐỌC THẲNG BẢNG KÊNH: câu truy vấn danh sách cắt
// trang NGAY TRONG SQL và cố ý như vậy (xem chú thích của nó). Nối thêm một
// nguồn hội thoại thứ hai vào đó là phải gộp và cắt trang trong JavaScript —
// đúng thứ chú thích ấy nói là đã sửa đi vì đếm sai số trang. Thêm hàng thành
// viên thì câu truy vấn không phải đổi một chữ nào.
function dongBoKenh(user) {
  let dsKenh = [];
  if (user.role === 'parent') {
    const ids = db.studentIdsOf(user);
    if (!ids.length) return;
    const m = ids.map(() => '?').join(',');
    dsKenh = db.all('kenh_hoi_thoai',
      `SELECT * FROM kenh_hoi_thoai WHERE studentId IN (${m})`, ids);
  } else if (user.role === 'teacher') {
    // CÔ CHỈ ĐỒNG BỘ KÊNH ỨNG VỚI VAI CÔ GIỮ Ở TỪNG NHÓM (Đ188).
    //
    // Một cô có thể là chủ nhiệm nhóm Chồi 2 và cô nước ngoài ở nhóm Lá 1 —
    // chuyện bình thường ở mầm non. Nên không hỏi "cô này là loại gì" một lần
    // rồi áp cho mọi nhóm; hỏi theo từng cặp (nhóm, cô), đúng chỗ vai được ghi.
    const lop = db.classIdsOf(user);
    if (!lop.length) return;
    for (const [loai, vai] of Object.entries(NHOM_CUA_KENH)) {
      const cua = lop.filter(cid => nhomCo.nhomCua(db, cid, user.id) === vai);
      if (!cua.length) continue;
      const m = cua.map(() => '?').join(',');
      dsKenh = dsKenh.concat(db.all('kenh_hoi_thoai',
        `SELECT * FROM kenh_hoi_thoai WHERE loai = ? AND classId IN (${m})`, [loai, ...cua]));
    }
  } else if (user.role === 'admin') {
    const pham = db.phamViCoSo(user);
    dsKenh = pham
      ? db.all('kenh_hoi_thoai',
        `SELECT k.* FROM kenh_hoi_thoai k
           JOIN students s ON s.id = k.studentId
           JOIN class_campus cc ON cc.classId = s.classId
          WHERE k.loai = 'vanphong' AND cc.campusId = ?`, [pham])
      : db.all('kenh_hoi_thoai', "SELECT * FROM kenh_hoi_thoai WHERE loai = 'vanphong'");
  }
  if (!dsKenh.length) return;

  const ma = dsKenh.map(k => k.conversationId);
  const m2 = ma.map(() => '?').join(',');
  const daCo = new Set(db.all('conversation_members',
    `SELECT conversationId FROM conversation_members
      WHERE userId = ? AND conversationId IN (${m2})`, [user.id, ...ma])
    .map(r => r.conversationId));

  const thieu = dsKenh.filter(k => !daCo.has(k.conversationId) && vaoDuocKenh(user, k));
  if (!thieu.length) return;
  db.tx(() => {
    for (const k of thieu) {
      db.insert('conversation_members',
        { conversationId: k.conversationId, userId: user.id, lastRead: null });
    }
  });
}

// Tìm hội thoại riêng giữa đúng hai người (nếu đã có).
function directConvId(a, b) {
  const row = db.first('conversations',
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversationId = c.id AND m1.userId = ?
     JOIN conversation_members m2 ON m2.conversationId = c.id AND m2.userId = ?
     WHERE c.type = 'direct'
       AND (SELECT COUNT(*) FROM conversation_members m WHERE m.conversationId = c.id) = 2
     LIMIT 1`, [a, b]);
  return row ? row.id : null;
}

// Danh sách người có thể bắt đầu trò chuyện mới.
//
// Phụ huynh: TẤT CẢ các cô phụ trách nhóm của con mình — nhóm mầm non có 2–3 cô
// cùng phụ trách, chỉ hiện một cô thì gia đình không nhắn được cho cô đang trực
// hôm đó. Giáo viên: phụ huynh của trẻ trong nhóm mình.
// MỌI HỘI THOẠI RIÊNG CỦA TÔI TRONG MỘT CÂU, tra theo "người kia".
//
// `directConvId` ở trên đúng nhưng đắt: nó hỏi MỘT câu cho MỖI liên hệ, mà cô
// mầm non có 30–40 liên hệ (mỗi bé 1–2 gia đình) — chỉ để trả lời đúng một câu
// hỏi: "đã có phòng chat với người này chưa".
//
// Cùng đúng điều kiện với `directConvId`: hội thoại loại 'direct', có ĐÚNG hai
// thành viên, và tôi là một trong hai. `ORDER BY c.id` để nếu lỡ có hai phòng
// trùng nhau thì lần nào cũng chọn cùng một phòng — `LIMIT 1` của bản cũ không
// kèm thứ tự nên chọn phòng nào là tuỳ cơ sở dữ liệu.
function hoiThoaiRiengCua(userId) {
  const ra = new Map();
  for (const r of db.all('conversations',
    `SELECT m2.userId AS nguoiKia, c.id AS maHT
       FROM conversations c
       JOIN conversation_members m1 ON m1.conversationId = c.id AND m1.userId = ?
       JOIN conversation_members m2 ON m2.conversationId = c.id AND m2.userId <> ?
      WHERE c.type = 'direct'
        AND (SELECT COUNT(*) FROM conversation_members m WHERE m.conversationId = c.id) = 2
      ORDER BY c.id`, [userId, userId])) {
    if (!ra.has(r.nguoiKia)) ra.set(r.nguoiKia, r.maHT);
  }
  return ra;
}

// AI NHẮN ĐƯỢC VỚI AI — sau Đ151.
//
// Nhà trường 10/09: *"chứ mình cũng k muốn là nhắn tin với từng cô riêng lẻ"*,
// và *"GVCN là người nói chuyện chính, sau có thể thêm giáo viên nước ngoài"*.
//
//   Gia đình  → hai kênh cô cho MỖI bé, cộng MỘT mục "Văn phòng nhà trường"
//               cho mỗi cơ sở có con học (góp ý 16/10, PH1) — tách thêm khi
//               các con khác bộ phụ huynh. KHÔNG còn danh sách từng cô để bấm
//               vào.
//   Cô        → gia đình từng bé trong nhóm mình, mở đúng kênh "Nhóm lớp".
//   Văn phòng → KHÔNG mời mở cuộc mới. Văn phòng TRẢ LỜI gia đình; còn muốn nói
//               với cả trường thì đã có Thông báo. Danh sách liên hệ của văn
//               phòng là ba trăm gia đình, và một danh sách ba trăm dòng gửi
//               kèm mỗi lần mở màn Nhắn tin thì không ai bấm nổi mà máy vẫn
//               phải chở. Kênh nào gia đình đã mở thì hiện trong danh sách như
//               thường.
//
// HỘI THOẠI RIÊNG ĐÃ CÓ THÌ GIỮ NGUYÊN. Nguyên tắc số 1: bỏ một lối đi là thôi
// mời người ta đi lối đó, không phải xoá những gì đã nói. Mọi cuộc `direct` cũ
// vẫn nằm trong danh sách, vẫn mở và vẫn nhắn tiếp được; chỉ là không có đường
// nào tạo THÊM cuộc riêng mới nữa.
function contactsFor(user) {
  const out = [];
  if (user.role === 'parent') {
    const cacCon = db.studentsOf(user);
    for (const s of cacCon) {
      if (!s.classId) continue;
      const cls = db.findClass(s.classId);
      // BA ĐẦU MỐI, theo lời trường (Đ188, Câu 11): giáo viên chủ nhiệm, giáo
      // viên nước ngoài, văn phòng nhà trường. Hai đầu mối cô đi theo TỪNG bé;
      // văn phòng gom theo cơ sở và bộ phụ huynh ở vòng dưới.
      //
      // Hai kênh đầu vẫn mời dù nhóm CHƯA có cô nào giữ vai ấy. Ẩn đi thì gia
      // đình không hiểu vì sao nhà bên cạnh có ba ô còn mình có hai, và họ sẽ
      // gọi điện hỏi — trong khi chuyện thật chỉ là trường chưa khai xong phân
      // công. Tin nhắn nằm chờ trong kênh, cô nhận vai là thấy ngay.
      for (const vai of nhomCo.NHOM_NHAN_TIN) {
        const loai = vai === nhomCo.MAC_DINH ? 'nhom' : vai;
        const daCo = kenhCuaBe(s.id, loai);
        out.push({
          kenh: loai, studentId: s.id,
          name: nhomCo.TEN_NHOM[vai],
          subtitle: `${nhomCo.CHUONG_TRINH[vai]} · bé ${s.name}${cls ? ` · ${cls.name}` : ''}`,
          avatar: null,
          existingConversationId: daCo ? daCo.conversationId : null,
        });
      }
    }
    // MỘT mục văn phòng cho mỗi (cơ sở, bộ phụ huynh). Đã nhắn rồi thì dùng lại
    // cuộc gần nhất CỦA CÁC BÉ TRONG MỤC cho khỏi đứt mạch; chưa thì gắn với bé
    // đứng đầu theo mã, lần nào cũng cùng bé.
    const theoCoSo = nhomVanPhong(cacCon);
    for (const [cs, theoNha] of theoCoSo) {
      for (const cacBe of theoNha.values()) {
        const maBe = cacBe.map(s => s.id);
        const daCoVP = kenhVanPhongGanNhat(maBe);
        out.push({
          kenh: 'vanphong', studentId: daCoVP ? daCoVP.studentId : [...maBe].sort()[0],
          name: 'Văn phòng nhà trường',
          subtitle: dongPhuVanPhong(theoCoSo, cs, cacBe),
          avatar: null,
          existingConversationId: daCoVP ? daCoVP.conversationId : null,
        });
      }
    }
  } else if (user.role === 'teacher') {
    for (const s of db.studentsOf(user)) {
      if (!s.classId) continue;
      const cls = db.findClass(s.classId);
      // Cô mở được đúng kênh ứng với vai cô giữ Ở NHÓM CỦA BÉ ĐÓ. Cô thể chất
      // không có kênh nào, và đó là chủ ý của trường chứ không phải bỏ quên.
      const vai = nhomCo.nhomCua(db, s.classId, user.id);
      const loai = Object.keys(NHOM_CUA_KENH).find(k => NHOM_CUA_KENH[k] === vai);
      if (!loai) continue;
      const daCo = kenhCuaBe(s.id, loai);
      out.push({
        kenh: loai, studentId: s.id,
        name: `Gia đình bé ${s.name}`,
        subtitle: cls ? cls.name : '',
        avatar: s.avatar,
        existingConversationId: daCo ? daCo.conversationId : null,
      });
    }
  }
  return out;
}

// Tiêu đề / phụ đề / ảnh đại diện của hội thoại theo góc nhìn của user.
// Tham số `tra` là BẢNG TRA dựng sẵn cho một lượt hỏi danh sách:
// { thanhVien, nguoi, tenNhom, tenCon }. KHÔNG truyền thì hàm hỏi lẻ y hệt như
// cũ — đường mở MỘT phòng chat (`GET /api/messages/:id`) vẫn đi lối cũ, không
// phải sửa một chữ nào và không đổi hành vi.
function convMeta(cv, user, members, tra) {
  const ids = members || (tra && tra.thanhVien.get(cv.id)) || memberIds(cv.id);
  // KÊNH: hai bên nhìn thấy hai cái tên khác nhau, và cả hai đều đúng.
  //
  // Gia đình mở ra thấy "Nhóm lớp Chồi 2" — họ đang nói với NHÓM, không với một
  // cô nào. Cô mở ra thấy "Gia đình bé Bin" — cô đang nói với một NHÀ. Bắt cả
  // hai đọc cùng một dòng chữ thì một trong hai bên sẽ đọc ra điều sai.
  if (cv.type === 'kenh') {
    const k = kenhCua(cv.id);
    if (!k) return { title: 'Cuộc trò chuyện', subtitle: '', avatar: GROUP_AVATAR };
    const be = db.findStudent(k.studentId);
    const cls = be && be.classId ? db.findClass(be.classId) : null;
    if (user.role === 'parent') {
      // Văn phòng là MỘT đầu mối cho cả nhà (góp ý 16/10, PH1): chỉ "Về bé…"
      // khi nhà có bé khác bộ phụ huynh (xem `nhomVanPhong`).
      if (k.loai === 'vanphong') {
        return { title: 'Văn phòng nhà trường', subtitle: dongPhuVanPhongCuaBe(user, be), avatar: GROUP_AVATAR };
      }
      return {
        // Gia đình đọc TÊN ĐẦU MỐI, không đọc mã kênh (Đ188). Trước đây chỉ có
        // một kênh cô nên nó mang tên nhóm lớp; nay có hai, và "Nhóm lớp Chồi 2"
        // không phân biệt được cô chủ nhiệm với cô nước ngoài.
        title: nhomCo.TEN_NHOM[NHOM_CUA_KENH[k.loai]] || 'Cô của bé',
        subtitle: [
          nhomCo.CHUONG_TRINH[NHOM_CUA_KENH[k.loai]],
          be ? `Về bé ${be.name}` : '',
          cls ? cls.name : '',
        ].filter(Boolean).join(' · '),
        avatar: GROUP_AVATAR,
      };
    }
    return {
      title: be ? `Gia đình bé ${be.name}` : 'Gia đình',
      subtitle: k.loai === 'vanphong'
        ? nhaCuaKenhVanPhong(user, be)
        : [nhomCo.TEN_NHOM[NHOM_CUA_KENH[k.loai]], cls ? cls.name : ''].filter(Boolean).join(' · '),
      avatar: be ? be.avatar : null,
    };
  }
  if (cv.type === 'group') {
    return { title: cv.name, subtitle: `${ids.length} thành viên`, avatar: GROUP_AVATAR };
  }
  const maKia = ids.find(id => id !== user.id);
  const other = (tra && tra.nguoi.has(maKia)) ? tra.nguoi.get(maKia) : db.findUser(maKia);
  if (!other) return { title: 'Người dùng', subtitle: '', avatar: null };
  let subtitle = '';
  if (other.role === 'teacher') {
    const tenNhom = (tra && tra.tenNhom.has(other.id))
      ? tra.tenNhom.get(other.id) : nl.tenCacNhomCuaCo(other.id);
    subtitle = `Cô phụ trách ${tenNhom}`.trim();
  } else if (tra && other.role === 'parent' && tra.tenCon.has(other.id)) {
    // Đã tra sẵn cho cả danh sách. Chuỗi rỗng nghĩa là "không tìm thấy bé",
    // đúng nhánh `child ? ... : 'Phụ huynh'` của lối hỏi lẻ ngay bên dưới.
    const ten = tra.tenCon.get(other.id);
    subtitle = ten ? `Phụ huynh bé ${ten}` : 'Phụ huynh';
  } else if (other.role === 'parent') {
    // Với cô, chỉ nêu tên con đang học nhóm của cô — nhóm nào trong số các nhóm
    // cô phụ trách cũng được, nên lọc bằng IN chứ không bằng một mã nhóm.
    const nhom = user.role === 'teacher' ? db.classIdsOfTeacher(user.id) : [];
    const marks = nhom.map(() => '?').join(',');
    const child = (user.role === 'teacher' && !nhom.length) ? null : db.first('students',
      user.role === 'teacher'
        ? `SELECT s.name FROM students s JOIN student_parents sp ON sp.studentId = s.id
           WHERE sp.parentId = ? AND s.classId IN (${marks}) AND s.active = 1 LIMIT 1`
        : `SELECT s.name FROM students s JOIN student_parents sp ON sp.studentId = s.id
           WHERE sp.parentId = ? AND s.active = 1 LIMIT 1`,
      user.role === 'teacher' ? [other.id, ...nhom] : [other.id]);
    subtitle = child ? `Phụ huynh bé ${child.name}` : 'Phụ huynh';
  }
  return { title: displayName(other), subtitle, avatar: other.avatar };
}

// Tin nhắn trả về cho client (không kèm thông tin nhạy cảm của người gửi).
// TIN ĐÃ THU HỒI: GIỮ CHỖ, BỎ CHỮ (Đ196, việc 25).
//
// Bốn bảng kia dùng `sua-thu-hoi` theo nghĩa BIẾN MẤT. Ở đây thì không, và
// khác biệt ấy là có chủ ý.
//
// Lý do: NGƯỜI KIA ĐÃ ĐỌC RỒI. Cho tin biến mất là màn hình của họ tự nhiên
// thiếu một dòng giữa cuộc trò chuyện, và câu trả lời ngay dưới nó thành ra
// không hiểu nổi — "vâng chị" trả lời cho một khoảng trống. Tệ hơn, nó dạy
// người dùng rằng app có thể lặng lẽ nuốt tin nhắn, và niềm tin ấy mất là mất
// luôn.
//
// Nên chỗ của tin vẫn còn, thứ tự vẫn đúng, chỉ phần chữ là không đi ra khỏi
// máy chủ nữa. LỌC Ở TẦNG DỮ LIỆU, không che ở giao diện: `text` bị thay TRƯỚC
// khi rời máy chủ, nên không có cách nào mở công cụ trình duyệt ra mà đọc lại.
//
// Người tự thu hồi cũng KHÔNG đọc lại được chữ cũ. Cho họ đọc thì hai người
// trong cùng một phòng nhìn thấy hai nội dung khác nhau, và khi có khiếu nại
// thì không ai biết màn hình nào là thật. Muốn tra thì tra `audit_log`.
function messageDto(m, user) {
  const sender = db.findUser(m.senderId);
  const daThuHoi = st.daThuHoi('messages', m.id);
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: displayName(sender),
    senderAvatar: sender ? sender.avatar : null,
    text: daThuHoi ? '' : m.text,
    daThuHoi,
    createdAt: m.createdAt,
    mine: m.senderId === user.id,
  };
}

// Tìm hội thoại + kiểm tra quyền tham gia. Tự trả lỗi 404/403 nếu không hợp lệ.
function findConv(req, res) {
  const cv = db.first('conversations', 'SELECT * FROM conversations WHERE id = ?', [req.params.id]);
  if (!cv) { res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' }); return null; }
  // CUỘC ĐÃ ĐÓNG ĐI THEO MỘT LUẬT KHÁC HẲN (Đ192, Câu 5), và nó phải được hỏi
  // TRƯỚC mọi chốt bên dưới.
  //
  // Với gia đình và cô thì cuộc ấy coi như không còn: trường chốt "xoá là xoá
  // khỏi màn hình phụ huynh". Với ban giám hiệu và quản lý cơ sở thì mở được,
  // CHỈ ĐỌC, và mỗi lượt mở ghi một dòng nhật ký.
  const dong = dongCua(cv.id);
  if (dong) {
    if (!xemDuocDaDong(req.user)) {
      res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
      return null;
    }
    // Quản lý cơ sở vẫn phải đúng cơ sở của bé — đóng một cuộc không biến nó
    // thành tài liệu chung của cả trường.
    const k = cv.type === 'kenh' ? kenhCua(cv.id) : null;
    if (k && !db.canAccessStudent(req.user, k.studentId)) {
      res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
      return null;
    }
    db.audit(req.user.id, 'hoi-thoai-da-dong-mo', cv.id, { studentId: k ? k.studentId : null });
    return cv;
  }
  // KÊNH: quyền tính LẠI từ nhóm lớp và từ bé, không tra bảng thành viên.
  //
  // Cô mới về nhóm chưa có hàng thành viên nào — vẫn phải đọc được ngay, vì
  // gia đình đang nhắn cho NHÓM chứ không nhắn cho một cô. Ngược lại, cô đã
  // chuyển đi thì `canAccessClass` trả false và hàng thành viên cũ không cứu
  // được. Hàng thành viên chỉ để đếm tin chưa đọc, không cấp quyền.
  if (cv.type === 'kenh') {
    const k = kenhCua(cv.id);
    if (!vaoDuocKenh(req.user, k)) {
      res.status(403).json({ error: 'Bạn không tham gia cuộc trò chuyện này' });
      return null;
    }
    // Vào được mà chưa có hàng thành viên thì thêm ngay, để lần sau cuộc này
    // nằm trong danh sách và đếm được tin chưa đọc.
    const co = db.count(
      'SELECT COUNT(*) FROM conversation_members WHERE conversationId = ? AND userId = ?',
      [cv.id, req.user.id]);
    if (!co) {
      db.insert('conversation_members',
        { conversationId: cv.id, userId: req.user.id, lastRead: null });
    }
    return cv;
  }

  const isMember = db.count(
    'SELECT COUNT(*) FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [cv.id, req.user.id]);
  if (!isMember) {
    res.status(403).json({ error: 'Bạn không tham gia cuộc trò chuyện này' });
    return null;
  }

  // LỚP PHÒNG THỦ THỨ HAI CHO PHÒNG CHUNG CỦA NHÓM.
  //
  // `conversation_members` được ghi MỘT LẦN lúc lập phòng và KHÔNG BAO GIỜ
  // được đồng bộ lại. Gỡ một cô khỏi nhóm đóng được mọi đường khác — hồ sơ bé,
  // điểm danh, album, nhật ký — vì tất cả đều hỏi `classIdsOf`/`canAccessClass`.
  // Riêng phòng chung của nhóm thì vẫn mở, vì chỗ này chỉ hỏi bảng thành viên.
  // Cô đã chuyển cơ sở vẫn đọc được mọi trao đổi hằng ngày giữa cô mới và các
  // gia đình, kể cả tin gửi SAU khi cô đã rời nhóm, và vẫn nhắn vào đó được.
  //
  // Nên với phòng gắn nhóm lớp, hỏi thêm câu hỏi THẬT: người này CÒN thuộc
  // nhóm đó không. Phòng riêng (`type='direct'`, không có classId) không đổi gì
  // — trao đổi riêng giữa hai người vốn không đi theo phân công.
  //
  // Đây là LỚP PHÒNG THỦ, không phải bản vá gốc: gốc là bảng thành viên không
  // được đồng bộ theo `class_teachers`, và mặt còn lại của nó — cô MỚI không tự
  // vào được phòng chung — vẫn còn đó, cần một đợt riêng.
  if (cv.type === 'group' && cv.classId && !db.canAccessClass(req.user, cv.classId)) {
    // QUẢN TRỊ vẫn mở được phòng chung của nhóm ĐÃ ĐÓNG, trong phạm vi cơ sở
    // mình — cùng luật với album năm cũ (laNguoiGiuLopCu bên routes/albums.js).
    // `canAccessClass` chỉ nhìn nhóm ĐANG MỞ, nên sau mỗi lần chuyển năm, lịch
    // sử trao đổi của mọi nhóm năm cũ khoá với cả ban giám hiệu — đúng người
    // phải tra lại được khi có khiếu nại. Cô và gia đình giữ nguyên như cũ:
    // lớp chặn này sinh ra để cô đã rời nhóm không đọc tiếp phòng chung.
    const lop = db.findClass(cv.classId);
    const pham = req.user.role === 'admin' ? db.phamViCoSo(req.user) : undefined;
    const laQuanTriGiuLopCu = req.user.role === 'admin' && lop && !lop.active
      && (pham === null || db.campusOfClass(cv.classId) === pham);
    if (!laQuanTriGiuLopCu) {
      res.status(403).json({
        error: 'Bạn không còn trong nhóm này nên không mở được phòng chung của nhóm',
      });
      return null;
    }
  }
  return cv;
}

function markRead(conversationId, userId) {
  db.run('UPDATE conversation_members SET lastRead = ? WHERE conversationId = ? AND userId = ?',
    [new Date().toISOString(), conversationId, userId]);
}

module.exports = (app) => {
  const allow = requireRole('teacher', 'parent', 'admin');

  // Danh sách hội thoại của tôi + liên hệ có thể chat mới.
  app.get('/api/messages', allow, (req, res) => {
    const user = req.user;
    // Kênh nào người này được vào mà chưa có hàng thành viên thì thêm vào đây,
    // TRƯỚC câu truy vấn danh sách — nhờ vậy câu truy vấn ấy không phải đổi một
    // chữ nào và phần cắt trang trong SQL vẫn đúng như ngày nó được viết.
    dongBoKenh(user);

    // CẮT CỬA SỔ NGAY TRONG CÂU TRUY VẤN.
    //
    // Cắt được THẲNG bằng LIMIT vì quyền tham gia nằm ngay trong phép nối
    // `conversation_members` bên dưới: khác màn Album, ở đây KHÔNG có bộ lọc
    // JavaScript nào chạy sau câu truy vấn, nên số dòng trả về đúng bằng số
    // dòng người này xem được — và màn hình suy ra "còn nữa hay hết" chỉ bằng
    // cách ĐẾM. Cùng một nếp với /api/notifications và /api/albums (Đ98b).
    //
    // Hình dạng câu trả lời KHÔNG đổi, vẫn `{ conversations, contacts }`:
    // điện thoại đang giữ bản app cũ trong bộ nhớ đệm không gửi `bo`/`soLuong`
    // nên vẫn nhận trang đầu và chạy y như trước.
    //
    // HUY HIỆU TIN CHƯA ĐỌC KHÔNG BỊ ẢNH HƯỞNG: `/api/dashboard/badges` đếm
    // thẳng trên bảng `messages`, không đếm trên danh sách này; và hội thoại
    // vừa có tin mới luôn nổi lên đầu nhờ `ORDER BY`, nên không có chuyện tin
    // chưa đọc rơi khỏi trang một rồi mất dấu.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || MOI_TRANG)));

    // Lấy hội thoại kèm số tin chưa đọc trong một truy vấn, thay vì nạp toàn
    // bộ tin nhắn lên rồi đếm trong bộ nhớ.
    //
    // `c.id DESC` là TIÊU CHÍ PHỤ, thêm cùng lúc với LIMIT và bắt buộc phải
    // có: hai hội thoại cùng mốc tin cuối — hoặc cùng CHƯA có tin nào, lúc đó
    // mốc là NULL — thì thứ tự giữa chúng trước nay là tuỳ cơ sở dữ liệu.
    // Không sao khi trả về một mảng duy nhất; nhưng khi cắt thành trang, thứ
    // tự lung lay nghĩa là có hội thoại lặp lại ở trang sau và có hội thoại
    // không bao giờ hiện ra.
    // LUẬT PHÒNG CHUNG NẰM TRONG WHERE, TRƯỚC KHI CẮT TRANG.
    //
    // Luật "cô đã rời nhóm thì không thấy phòng chung của nhóm" (xem findConv)
    // từng đứng SAU câu truy vấn, dưới dạng một bộ lọc JavaScript — tức là
    // đứng SAU cả LIMIT. Trang bị cắt rồi mới lọc thì con số trả về không còn
    // bằng con số người này xem được: màn hình đếm thiếu, tưởng "hết rồi"
    // trong khi trang sau vẫn còn hội thoại. Đưa đúng điều kiện đó vào WHERE
    // thì lời cam kết ở chú thích trên ("không có bộ lọc nào chạy sau câu
    // truy vấn") lại đúng như ngày nó được viết.
    // Quản trị mở được phòng chung của nhóm ĐÃ ĐÓNG trong cơ sở mình (findConv,
    // Đ118d — tra lại lịch sử khi có khiếu nại) thì danh sách cũng phải liệt kê
    // phòng đó, không thì quyền mở có mà không có đường tới. `classIdsOf` chỉ
    // trả nhóm đang mở, nên với quản trị lấy thẳng từ bảng nhóm theo cơ sở.
    const nhomMoDuoc = tb.nhomPhongChat(user);
    const dauNhom = nhomMoDuoc.map(() => '?').join(',');
    const dieuKienPhongNhom = `(c.type != 'group' OR c.classId IS NULL OR c.classId = ''`
      + (nhomMoDuoc.length ? ` OR c.classId IN (${dauNhom})` : '') + ')';
    const rows = db.all('conversations',
      `SELECT c.*, cm.lastRead AS myLastRead,
              (SELECT COUNT(*) FROM messages m
                 WHERE m.conversationId = c.id AND m.senderId != ?
                   AND (cm.lastRead IS NULL OR m.createdAt > cm.lastRead)) AS unreadCount
       FROM conversations c
       JOIN conversation_members cm ON cm.conversationId = c.id AND cm.userId = ?
       WHERE ${dieuKienPhongNhom}
         AND c.id NOT IN (SELECT conversationId FROM hoi_thoai_dong)
       ORDER BY (SELECT MAX(createdAt) FROM messages m WHERE m.conversationId = c.id) DESC,
                c.id DESC
       LIMIT ? OFFSET ?`,
      [user.id, user.id, ...nhomMoDuoc, soLuong, bo]);

    // TIN CUỐI CỦA MỌI HỘI THOẠI TRONG MỘT TRUY VẤN.
    //
    // Bản trước hỏi riêng từng hội thoại. Cô mầm non nhắn với 20 gia đình cộng
    // các nhóm chung, nên chỉ riêng màn danh sách đã là hơn hai chục lượt hỏi
    // cơ sở dữ liệu — mỗi lần cô mở màn Nhắn tin, và cô mở nó nhiều lần một
    // ngày. Câu ngay bên trên đã cố ý gộp phần đếm tin chưa đọc vào một truy
    // vấn với đúng lý do đó; phần tin cuối thì bị bỏ sót.
    // Luật của `findConv` (cô đã rời nhóm thì không thấy phòng chung) đã nằm
    // ngay trong WHERE của câu truy vấn trên — trước LIMIT, nên trang không
    // bị đếm hụt. `nhinThay` giữ nguyên tên cho phần dưới đọc không đổi.
    const nhinThay = rows;

    const maHT = nhinThay.map(r => r.id);
    const dauHT = maHT.map(() => '?').join(',');
    const tinCuoi = new Map();
    if (maHT.length) {
      for (const m of db.all('messages',
        `SELECT * FROM (
           SELECT m.*, ROW_NUMBER() OVER (
                    PARTITION BY m.conversationId ORDER BY m.createdAt DESC, m.rowid DESC) AS hang
             FROM messages m WHERE m.conversationId IN (${dauHT})
         ) WHERE hang = 1`, maHT)) {
        tinCuoi.set(m.conversationId, m);
      }
    }

    // BẢNG TRA CHO CẢ MÀN HÌNH — thay cho 4–5 câu truy vấn MỖI hội thoại.
    //
    // `convMeta` phải trả lời bốn câu cho từng dòng: ai trong hội thoại này,
    // người kia là ai, cô ấy phụ trách nhóm nào, gia đình này là gia đình của
    // bé nào. Hỏi lẻ thì đúng nhưng đắt — với một cô có gần ba chục hội thoại
    // là hơn hai trăm câu cho MỘT lượt mở màn Nhắn tin. Cô mở màn này nhiều
    // lần mỗi ngày, và better-sqlite3 chạy ĐỒNG BỘ: từng câu chặn thẳng vòng
    // lặp sự kiện của máy chủ, nên đó không phải cái chậm của riêng cô ấy mà
    // là cái chậm của mọi người đang dùng app cùng lúc.
    const tra = { thanhVien: new Map(), nguoi: new Map(), tenNhom: new Map(), tenCon: new Map() };
    for (const id of maHT) tra.thanhVien.set(id, []);
    if (maHT.length) {
      for (const r of db.all('conversation_members',
        `SELECT conversationId, userId FROM conversation_members
          WHERE conversationId IN (${dauHT})
          ORDER BY conversationId, rowid`, maHT)) {
        tra.thanhVien.get(r.conversationId).push(r.userId);
      }
    }

    // Mọi người cần tên: người kia trong hội thoại riêng, và người gửi tin cuối.
    const maNguoi = new Set();
    for (const cv of nhinThay) {
      if (cv.type !== 'group') {
        for (const id of tra.thanhVien.get(cv.id)) if (id !== user.id) maNguoi.add(id);
      }
      const cuoi = tinCuoi.get(cv.id);
      if (cuoi && cuoi.senderId) maNguoi.add(cuoi.senderId);
    }
    if (maNguoi.size) {
      const dsNguoi = [...maNguoi];
      for (const u of db.all('users',
        `SELECT * FROM users WHERE id IN (${dsNguoi.map(() => '?').join(',')})`, dsNguoi)) {
        const { passwordHash: _bo, ...sach } = u;
        tra.nguoi.set(u.id, sach);
      }
    }

    // Với GIA ĐÌNH, người kia là cô → cần tên các nhóm cô phụ trách. Một nhà
    // chỉ nhắn với vài cô nên nhớ lại theo mã cô là đủ. CỐ Ý không viết lại câu
    // truy vấn đó ở đây: `lib/nhom-lop.js` phải còn là chỗ DUY NHẤT định nghĩa
    // "nhóm của cô", chép sang đây là đẻ ra bản thứ hai rồi hai bản trôi khỏi
    // nhau mà không ai báo.
    for (const u of tra.nguoi.values()) {
      if (u.role === 'teacher' && !tra.tenNhom.has(u.id)) {
        tra.tenNhom.set(u.id, nl.tenCacNhomCuaCo(u.id));
      }
    }

    // Với CÔ, người kia là gia đình → cần tên bé nhà đó đang học nhóm của cô.
    // Bản cũ hỏi `db.classIdsOfTeacher(user.id)` lại từ đầu cho TỪNG dòng dù
    // câu trả lời luôn giống hệt nhau, cộng một câu tra tên bé cho mỗi nhà.
    const maPhuHuynh = [...tra.nguoi.values()].filter(u => u.role === 'parent').map(u => u.id);
    if (maPhuHuynh.length) {
      for (const id of maPhuHuynh) tra.tenCon.set(id, '');
      const dauPh = maPhuHuynh.map(() => '?').join(',');
      const nhomCuaToi = user.role === 'teacher' ? db.classIdsOfTeacher(user.id) : [];
      const dong = (user.role === 'teacher' && !nhomCuaToi.length) ? [] : db.all('students',
        user.role === 'teacher'
          ? `SELECT sp.parentId AS maPh, s.name AS ten FROM students s
               JOIN student_parents sp ON sp.studentId = s.id
              WHERE sp.parentId IN (${dauPh})
                AND s.classId IN (${nhomCuaToi.map(() => '?').join(',')})
                AND s.active = 1
              ORDER BY sp.parentId, s.name`
          : `SELECT sp.parentId AS maPh, s.name AS ten FROM students s
               JOIN student_parents sp ON sp.studentId = s.id
              WHERE sp.parentId IN (${dauPh}) AND s.active = 1
              ORDER BY sp.parentId, s.name`,
        user.role === 'teacher' ? [...maPhuHuynh, ...nhomCuaToi] : maPhuHuynh);
      // Nhà có HAI bé cùng nhóm thì lấy bé đứng đầu theo tên. Câu cũ dùng
      // `LIMIT 1` mà KHÔNG kèm `ORDER BY`, tức bé nào hiện ra là tuỳ cơ sở dữ
      // liệu; nay cố định theo thứ tự chữ cái để hai lượt mở màn không nói hai
      // tên khác nhau. Đây là chỗ DUY NHẤT bản vá này đổi chữ trên màn hình.
      for (const r of dong) if (!tra.tenCon.get(r.maPh)) tra.tenCon.set(r.maPh, r.ten);
    }

    const conversations = nhinThay.map(cv => {
      const last = tinCuoi.get(cv.id) || null;
      return {
        id: cv.id,
        type: cv.type,
        ...convMeta(cv, user, tra.thanhVien.get(cv.id), tra),
        lastMessage: last
          ? { text: last.text, senderName: displayName(tra.nguoi.get(last.senderId)), createdAt: last.createdAt }
          : null,
        unreadCount: Number(cv.unreadCount) || 0,
      };
    });
    res.json({ conversations, contacts: contactsFor(user) });
  });

  // Bắt đầu trò chuyện riêng mới.
  // Đăng ký TRƯỚC /api/messages/:id để đường dẫn "start" không bị hiểu thành mã hội thoại.
  // MỞ MỘT KÊNH (Đ151).
  //
  // Không còn đường nào tạo cuộc RIÊNG với một người nữa — nhà trường chốt như
  // vậy. Cuộc riêng đã có vẫn mở và vẫn nhắn tiếp được (xem `contactsFor`).
  //
  // Kênh sinh RA MUỘN, đúng lúc có người mở lời. Dựng sẵn kênh cho ba trăm gia
  // đình là hộp thư của văn phòng có ba trăm cuộc trống ngay ngày đầu, và
  // không cách nào biết cuộc nào đang thật sự có chuyện.
  app.post('/api/messages/start', allow, (req, res) => {
    const { kenh, studentId } = req.body || {};
    if (!KENH.includes(String(kenh || ''))) {
      return res.status(400).json({
        error: 'Chưa rõ muốn nhắn với cô phụ trách nhóm, cô nước ngoài hay văn phòng nhà trường',
      });
    }
    const contact = contactsFor(req.user)
      .find(c => c.kenh === kenh && c.studentId === studentId);
    if (!contact) {
      return res.status(403).json({
        error: 'Không mở được cuộc trò chuyện này. Gia đình nhắn với cô phụ trách nhóm, '
          + 'cô nước ngoài của con, hoặc với văn phòng nhà trường nhé.',
      });
    }
    if (contact.existingConversationId) return res.json({ id: contact.existingConversationId });

    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé' });

    const id = db.nextId('cv');
    db.tx(() => {
      // `classId` của hội thoại để NULL với kênh văn phòng: cột đó có khoá
      // ngoại tới `classes` và xoá nhóm là xoá cả hội thoại — mà kênh văn phòng
      // không thuộc về nhóm nào.
      db.insert('conversations', {
        id, type: 'kenh', name: null,
        classId: laKenhCuaNhom(kenh) ? (be.classId || null) : null,
      });
      db.insert('kenh_hoi_thoai', {
        conversationId: id, loai: kenh, studentId,
        classId: laKenhCuaNhom(kenh) ? (be.classId || '') : '',
        taoLuc: new Date().toISOString(),
      });
      // GHI HÀNG THÀNH VIÊN CHO CẢ NHÀ, không chỉ người vừa bấm.
      //
      // Một bé thường có cả bố lẫn mẹ trong app (nhà trường yêu cầu như vậy).
      // Mẹ mở lời mà bố không thấy cuộc đó trong danh sách thì bố tưởng trường
      // chưa trả lời, rồi gọi điện hỏi lại đúng chuyện vừa nhắn.
      const nha = new Set([...(be.parentIds || [])]);
      nha.add(req.user.id);
      for (const uid of nha) {
        if (!db.findUser(uid)) continue;
        db.insert('conversation_members', { conversationId: id, userId: uid, lastRead: null });
      }
    });
    res.json({ id });
  });

  // ---- ĐÓNG MỘT HỘI THOẠI, VÀ KHO LƯU CỦA NHỮNG CUỘC ĐÃ ĐÓNG (Đ192, Câu 5) ----
  //
  // ĐẶT TRƯỚC `/api/messages/:id` là bắt buộc, không phải sở thích: Express
  // khớp đường dẫn theo thứ tự đăng ký, nên `/api/messages/da-dong` đăng ký sau
  // sẽ bị `:id` nuốt mất và "da-dong" thành một mã hội thoại không tồn tại.
  app.get('/api/messages/da-dong', allow, (req, res) => {
    if (!xemDuocDaDong(req.user)) {
      return res.status(403).json({
        error: 'Chỉ ban giám hiệu và quản lý cơ sở mới xem lại được cuộc trò chuyện đã đóng.',
      });
    }
    const ds = db.all('hoi_thoai_dong',
      `SELECT d.*, k.studentId AS studentId, k.loai AS loai
         FROM hoi_thoai_dong d
         LEFT JOIN kenh_hoi_thoai k ON k.conversationId = d.conversationId
        ORDER BY d.dongLuc DESC`)
      // Quản lý cơ sở chỉ thấy cuộc của bé thuộc cơ sở mình — đóng một cuộc
      // không biến nó thành tài liệu chung của cả trường.
      .filter(d => !d.studentId || db.canAccessStudent(req.user, d.studentId))
      .map(d => {
        const be = d.studentId ? db.findStudent(d.studentId) : null;
        const nguoi = d.dongBoi ? db.findUser(d.dongBoi) : null;
        return {
          conversationId: d.conversationId,
          hoTenBe: be ? be.name : '',
          studentId: d.studentId || null,
          dongLuc: d.dongLuc,
          dongBoiTen: nguoi ? `${nguoi.title || ''} ${nguoi.name || ''}`.trim() : '',
          lyDo: d.lyDo || '',
        };
      });
    res.json({ ds });
  });

  // ĐÓNG = ĐÁNH DẤU, KHÔNG XOÁ MỘT DÒNG TIN NÀO.
  //
  // Nguyên tắc số 1: bỏ một thứ là ngưng dùng nó, không phải xoá dữ liệu của
  // nó. Và ở đây còn một lý do nữa: đây có thể là chỗ duy nhất còn lưu lời qua
  // lại giữa trường và một gia đình khi có khiếu nại.
  app.post('/api/messages/:id/dong', allow, (req, res) => {
    if (!xemDuocDaDong(req.user)) {
      return res.status(403).json({
        error: 'Chỉ ban giám hiệu và quản lý cơ sở mới đóng được cuộc trò chuyện.',
      });
    }
    const cv = db.first('conversations', 'SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    if (!cv) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    const k = cv.type === 'kenh' ? kenhCua(cv.id) : null;
    if (k && !db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Cuộc trò chuyện này thuộc cơ sở khác' });
    }
    if (daDong(cv.id)) return res.json({ ok: true, daDong: true });
    db.upsert('hoi_thoai_dong', {
      conversationId: cv.id,
      dongLuc: new Date().toISOString(),
      dongBoi: req.user.id,
      lyDo: String((req.body || {}).lyDo || '').trim().slice(0, 300),
    }, ['conversationId']);
    db.audit(req.user.id, 'hoi-thoai-dong', cv.id, { studentId: k ? k.studentId : null });
    res.json({ ok: true, daDong: true });
  });

  // MỞ LẠI ĐƯỢC. Đóng nhầm một cuộc mà không mở lại được thì gia đình mất
  // đường nói chuyện với cô, và cách chữa duy nhất là sửa thẳng cơ sở dữ liệu.
  app.post('/api/messages/:id/mo-lai', allow, (req, res) => {
    if (!xemDuocDaDong(req.user)) {
      return res.status(403).json({
        error: 'Chỉ ban giám hiệu và quản lý cơ sở mới mở lại được cuộc trò chuyện.',
      });
    }
    const cv = db.first('conversations', 'SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    if (!cv) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện' });
    const k = cv.type === 'kenh' ? kenhCua(cv.id) : null;
    if (k && !db.canAccessStudent(req.user, k.studentId)) {
      return res.status(403).json({ error: 'Cuộc trò chuyện này thuộc cơ sở khác' });
    }
    db.remove('hoi_thoai_dong', cv.id, 'conversationId');
    db.audit(req.user.id, 'hoi-thoai-mo-lai', cv.id, { studentId: k ? k.studentId : null });
    res.json({ ok: true, daDong: false });
  });

  // Chi tiết hội thoại: cửa sổ tin mới nhất + đánh dấu đã đọc.
  //
  // `?truoc=<ISO>` lấy cửa sổ tin CŨ HƠN mốc đó — đường mà nút "Xem tin cũ hơn"
  // của màn hình gọi. Không có tham số thì lấy cửa sổ mới nhất, đúng hành vi cũ
  // với mọi hội thoại ngắn hơn CUA_SO_TIN (tức gần như toàn bộ hôm nay).
  // ---- THU HỒI MỘT LỜI NHẮN (Đ196, việc 25) ----
  //
  // Nhà trường xin thu hồi được một tin đã gửi. Cô gõ nhầm tên bé, gõ nhầm giờ
  // đón, hay gửi nhầm phòng — ba chuyện đều có thật, và trước đợt này nhắn rồi
  // là nằm đó.
  //
  // ĐÁNH DẤU ẨN, KHÔNG XOÁ. Đúng luật thu hồi đang chạy ở bốn chỗ khác
  // (`lib/sua-thu-hoi.js`): dòng gốc còn nguyên trong bảng, vết thu hồi ghi ai
  // gỡ lúc nào, và tra khiếu nại vẫn một đường. Đây cũng là chỗ khác biệt lớn
  // nhất so với "xoá tin" của các app nhắn tin thường: nội dung giữa một gia
  // đình và cô của con họ là thứ có thể thành bằng chứng, không được biến mất
  // thật khỏi cơ sở dữ liệu của trường.
  //
  // CHỈ NGƯỜI GỬI, và cố ý KHÔNG mở cho quản trị. `st.laChuBanGhi` trả lời
  // "người gửi HOẶC quản trị" — đúng cho một thông báo của nhà trường, nhưng
  // sai ở đây: để quản trị gỡ lời của một gia đình trong phòng riêng của họ là
  // đưa cho trường một cái nút xoá tiếng nói của phụ huynh. Muốn dọn cả cuộc
  // thì đã có đường ĐÓNG hội thoại, và đường đó ghi tên người đóng.
  app.post('/api/messages/:id/tin/:tinId/thu-hoi', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    if (daDong(cv.id)) {
      return res.status(403).json({
        error: 'Cuộc trò chuyện này nhà trường đã đóng nên không đổi gì được nữa.',
      });
    }
    const m = db.first('messages',
      'SELECT * FROM messages WHERE id = ? AND conversationId = ?',
      [req.params.tinId, cv.id]);
    if (!m) return res.status(404).json({ error: 'Không tìm thấy lời nhắn này' });
    if (m.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ người đã gửi mới thu hồi được lời nhắn của mình' });
    }
    if (st.daThuHoi('messages', m.id)) return res.json({ ok: true, id: m.id, daThuHoi: true });
    st.ghiThuHoi('messages', m.id, req.user.id);
    db.audit(req.user.id, 'tin-nhan-thu-hoi', m.id, { conversationId: cv.id });
    res.json({ ok: true, id: m.id, daThuHoi: true });
  });

  // ---- PHÒNG CHUNG DO CÔ TẠO (Đ196, việc 27 và 28) ----
  //
  // Nhà trường xin một phòng chung cô tự lập và tự chọn thành viên, cộng "nhóm
  // phụ huynh tuỳ chọn" (việc 28) — mà việc 28 hoá ra không phải một tính năng
  // thứ hai: một phòng chung chỉ có phụ huynh CHÍNH LÀ nhóm phụ huynh tuỳ
  // chọn. Nên một đường, hai việc.
  //
  // SỔ CŨ TỪNG GHI LÀ ĐÃ CÓ — ĐÓ LÀ CHỖ SỔ TRÔI KHỎI MÃ. Bảng `conversations`
  // có sẵn `type = 'group'` từ app 1, nên đọc lướt qua thì tưởng xong. Thật ra
  // KHÔNG một đường nào trong app tạo được một dòng như vậy: `/start` chỉ tạo
  // `type = 'kenh'`. Một cái bảng chờ sẵn không phải là một tính năng.
  //
  // CÔ VÀ QUẢN TRỊ LẬP ĐƯỢC, GIA ĐÌNH THÌ KHÔNG. Không phải vì phụ huynh kém
  // tin cậy, mà vì một phụ huynh lập được phòng và kéo phụ huynh khác vào là
  // trường mất chỗ đứng trong chính kênh liên lạc của mình — mà tên trường
  // vẫn ở trên app. Gia đình muốn có nhóm thì nhờ cô lập.
  //
  // CHỈ MỜI ĐƯỢC NGƯỜI TRONG TẦM VỚI CỦA MÌNH. Cô mời được cô khác và gia đình
  // của bé thuộc nhóm cô phụ trách; quản trị mời được người trong cơ sở mình.
  // Thiếu chốt này thì một cô mời được phụ huynh của nhóm khác vào phòng, và
  // gia đình ấy đọc được mọi thứ nói trong đó.
  function nguoiMoiDuoc(user) {
    const ra = new Map();
    const them = (u) => {
      if (!u || !u.active || u.id === user.id) return;
      ra.set(u.id, {
        id: u.id, hoTen: displayName(u), vai: u.role,
        avatar: u.avatar || null,
      });
    };
    // Cô và gia đình của CÁC NHÓM người này chạm tới được.
    for (const cid of (db.classIdsOf(user) || [])) {
      for (const t of db.all('class_teachers',
        'SELECT teacherId AS id FROM class_teachers WHERE classId = ?', [cid])) {
        them(db.findUser(t.id));
      }
      for (const r of db.all('student_parents',
        `SELECT DISTINCT sp.parentId AS id FROM student_parents sp
           JOIN students s ON s.id = sp.studentId
          WHERE s.classId = ? AND s.active = 1`, [cid])) {
        them(db.findUser(r.id));
      }
    }
    // Quản trị: thêm mọi tài khoản trường trong phạm vi cơ sở của mình.
    if (user.role === 'admin') {
      const pham = db.phamViCoSo(user);
      for (const u of db.all('users',
        "SELECT * FROM users WHERE active = 1 AND role IN ('teacher', 'admin')")) {
        if (pham === null || !u.campusId || u.campusId === pham) them(u);
      }
    }
    return [...ra.values()];
  }

  // Ai mời được ai — màn hình hỏi trước khi vẽ ô chọn, để cô không chọn xong
  // mới bị từ chối.
  app.get('/api/messages/phong-chung/moi-duoc', requireRole('teacher', 'admin'), (req, res) => {
    res.json({ nguoi: nguoiMoiDuoc(req.user) });
  });

  app.post('/api/messages/phong-chung', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const ten = String(b.ten || '').trim().slice(0, 80);
    if (!ten) return res.status(400).json({ error: 'Cô đặt giúp một cái tên cho phòng nhé' });

    const xin = [...new Set((Array.isArray(b.thanhVien) ? b.thanhVien : []).map(String))]
      .filter(x => x && x !== req.user.id);

    // HỎI QUYỀN CHO TỪNG NGƯỜI, NGAY TẠI ĐÂY — không tin vào danh sách gợi ý.
    //
    // `nguoiMoiDuoc` ở trên là để VẼ Ô CHỌN. Nó và đường này có thể trôi khỏi
    // nhau, và nếu chốt chặn chỉ nằm trong nó thì ngày chúng trôi khỏi nhau là
    // ngày một cô mời được gia đình nhóm khác vào phòng — rò rỉ, im lặng.
    //
    // Nên chốt thật nằm ở đây, và nó hỏi đúng hai câu của `CLAUDE.md`:
    //   • gia đình → `canAccessStudent` cho ít nhất một đứa con của họ;
    //   • cô / quản trị → `canAccessClass` cho ít nhất một nhóm của họ.
    // Người không thuộc cả hai nhóm ấy thì không mời được, kể cả khi họ có
    // trong danh sách gợi ý.
    function moiDuoc(id) {
      const u = db.findUser(id);
      if (!u || !u.active) return false;
      if (u.role === 'parent') {
        return db.all('student_parents',
          `SELECT sp.studentId AS id FROM student_parents sp
             JOIN students s ON s.id = sp.studentId
            WHERE sp.parentId = ? AND s.active = 1`, [u.id])
          .some(r => db.canAccessStudent(req.user, r.id));
      }
      if (u.role === 'teacher') {
        return (db.classIdsOfTeacher(u.id) || []).some(cid => db.canAccessClass(req.user, cid));
      }
      // Quản trị mời quản trị: cùng phạm vi cơ sở. `phamViCoSo` trả null với
      // ban giám hiệu (cả trường), nên vế đầu đúng cho cấp 1.
      if (u.role === 'admin' && req.user.role === 'admin') {
        const pham = db.phamViCoSo(req.user);
        return pham === null || !u.campusId || u.campusId === pham;
      }
      return false;
    }
    const ngoaiTam = xin.filter(id => !moiDuoc(id));
    if (ngoaiTam.length) {
      // NÓI RA AI BỊ TỪ CHỐI, không từ chối cụt lủn. Cô chọn mười người mà chỉ
      // nhận "không mời được" thì cô không biết bỏ ai ra.
      const ten2 = ngoaiTam.map(id => displayName(db.findUser(id)) || id).slice(0, 5).join(', ');
      return res.status(403).json({
        error: `Không mời được vào phòng: ${ten2}. `
          + 'Cô mời được cô khác và gia đình của bé trong nhóm cô phụ trách.',
      });
    }
    if (!xin.length) {
      return res.status(400).json({ error: 'Phòng chung cần ít nhất một người nữa ngoài cô' });
    }

    const id = db.nextId('cv');
    db.tx(() => {
      // `classId` để NULL: phòng chung có thể có người của nhiều nhóm, và cột
      // ấy có khoá ngoại tới `classes` — gắn bừa một nhóm là xoá nhóm đó thì
      // mất luôn cả phòng và mọi tin trong đó.
      db.insert('conversations', { id, type: 'group', name: ten, classId: null });
      for (const uid of [req.user.id, ...xin]) {
        db.insert('conversation_members', { conversationId: id, userId: uid, lastRead: null });
      }
    });
    db.audit(req.user.id, 'phong-chung-tao', id, { ten, soThanhVien: xin.length + 1 });
    res.status(201).json({ id, ten, soThanhVien: xin.length + 1 });
  });

  app.get('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const truoc = req.query.truoc ? String(req.query.truoc) : '';
    // Lấy NGƯỢC từ mới về cũ rồi lật lại: `LIMIT` phải cắt ở đầu MỚI, không
    // phải đầu cũ. Lấy xuôi rồi cắt là mở phòng ra thấy tin của tháng Chín.
    const nguoc = db.all('messages',
      `SELECT * FROM messages WHERE conversationId = ?${truoc ? ' AND createdAt < ?' : ''}
       ORDER BY createdAt DESC, rowid DESC LIMIT ?`,
      truoc ? [cv.id, truoc, CUA_SO_TIN + 1] : [cv.id, CUA_SO_TIN + 1]);
    // Lấy dư một tin để biết PHÍA TRƯỚC CÒN NỮA KHÔNG mà không phải đếm cả bảng.
    const conCu = nguoc.length > CUA_SO_TIN;
    const messages = nguoc.slice(0, CUA_SO_TIN).reverse();
    // Chỉ đánh dấu đã đọc khi người dùng đang ở cửa sổ MỚI NHẤT. Cuộn ngược lên
    // đọc tin tháng trước mà bị coi là đã đọc hết là mất dấu tin chưa xem.
    if (!truoc) markRead(cv.id, req.user.id);
    res.json({
      id: cv.id,
      type: cv.type,
      ...convMeta(cv, req.user),
      messages: messages.map(m => messageDto(m, req.user)),
      // Màn hình dùng hai trường này để hiện nút "Xem tin cũ hơn". Thiếu chúng
      // thì cắt bớt tin biến thành GIẤU tin — người dùng không có đường nào
      // biết là còn, và đó mới là mất dữ liệu theo cách nhìn của họ.
      conCu,
      tuLuc: messages.length ? messages[0].createdAt : '',
      // Màn hình phải biết cuộc này đã đóng chưa, nếu không nó vẫn vẽ ô nhập
      // tin và người mở ra gõ xong mới nhận câu từ chối — mất công gõ, và
      // trông như app hỏng chứ không như một quy định.
      daDong: daDong(cv.id),
      dongDuoc: xemDuocDaDong(req.user),
    });
  });

  // Lấy tin mới hơn mốc ?after=<ISO> (dùng cho việc tự cập nhật phòng chat).
  app.get('/api/messages/:id/poll', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    const after = req.query.after ? String(req.query.after) : '';
    // CÙNG MỘT TRẦN VỚI ĐƯỜNG MỞ PHÒNG.
    //
    // Đường này lấy tin mới hơn một mốc do MÀN HÌNH gửi lên, nên nó không có
    // trần tự nhiên nào: tab để mở qua đêm rồi máy thức dậy, hay một màn hình
    // gửi lại mốc cũ, là một lượt hỏi kéo về cả quãng ở giữa. Cùng đúng cái
    // hình dạng vừa vá ở đường mở phòng, chỉ khác là nó ít lộ hơn.
    //
    // Lấy `CUA_SO_TIN` tin cũ nhất SAU mốc đó — cắt ở đầu CŨ chứ không phải đầu
    // mới, vì đây là dòng chảy nối tiếp: bỏ khúc giữa là màn hình thủng một
    // khoảng và không bao giờ lấy lại được. Còn dư thì lượt hỏi sau lấy tiếp.
    const fresh = db.all('messages',
      `SELECT * FROM messages WHERE conversationId = ? AND createdAt > ?
       ORDER BY createdAt, rowid LIMIT ?`,
      [cv.id, after, CUA_SO_TIN]);
    if (fresh.length) markRead(cv.id, req.user.id);
    res.json({ messages: fresh.map(m => messageDto(m, req.user)) });
  });

  // Gửi tin nhắn vào hội thoại.
  app.post('/api/messages/:id', allow, (req, res) => {
    const cv = findConv(req, res);
    if (!cv) return;
    // CUỘC ĐÃ ĐÓNG THÌ KHÔNG AI NHẮN THÊM ĐƯỢC — kể cả người vừa mở ra xem.
    // Nhà trường nói thẳng: "chỉ xem lại được k thể nhắn vào thêm được nữa".
    // Một kho lưu mà viết thêm được thì nó không còn là kho lưu.
    if (daDong(cv.id)) {
      return res.status(403).json({
        error: 'Cuộc trò chuyện này nhà trường đã đóng nên không nhắn thêm được nữa. '
          + 'Nội dung cũ vẫn được giữ nguyên.',
      });
    }
    const text = String((req.body || {}).text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });

    const msg = {
      id: db.nextId('ms'),
      conversationId: cv.id,
      senderId: req.user.id,
      text,
      createdAt: new Date().toISOString(),
    };
    db.tx(() => {
      db.insert('messages', msg);
      markRead(cv.id, req.user.id);
    });

    // TRƯỜNG NHẮN THÌ GIA ĐÌNH ĐƯỢC BÁO NGAY (Đ151).
    //
    // Nhà trường 10/09 xin *"đẩy thông báo tới phụ huynh khi có bất kỳ gì từ
    // phía nhà trường"*. Một tin nhắn của cô hay của văn phòng đúng là "bất kỳ
    // gì" ấy, và nó còn cần được đọc nhanh hơn phần lớn những thứ khác: cô nhắn
    // "chiều nay đón con sớm giúp cô" lúc 14h mà gia đình mở app lúc 20h thì
    // tin đó không còn nghĩa gì.
    //
    // CHIỀU NGƯỢC LẠI THÌ KHÔNG. Gia đình nhắn cho trường thì cô và văn phòng
    // thấy trong huy hiệu tin chưa đọc như trước; `lib/day.js` chỉ đẩy tới
    // `student_parents`, tức chỉ tới gia đình, nên gọi ở đây cũng vô ích.
    //
    // Chỉ với KÊNH: cuộc riêng cũ (`direct`) không gắn với bé nào nên không có
    // chỗ để gửi tin riêng của một bé.
    if (req.user.role !== 'parent' && cv.type === 'kenh') {
      const k = kenhCua(cv.id);
      if (k) {
        tbb.gui({
          studentId: k.studentId,
          loai: 'tin-nhan',
          // Gia đình nhắn với hai cô khác nhau thì tin báo cũng phải nói rõ
          // cô nào — hai dòng "Cô phụ trách vừa nhắn tin" giống hệt nhau trên
          // màn khoá điện thoại là mở nhầm cuộc, rồi trả lời nhầm người.
          tieuDe: k.loai === 'vanphong'
            ? 'Văn phòng nhà trường vừa nhắn tin'
            : `${nhomCo.TEN_NHOM[NHOM_CUA_KENH[k.loai]] || 'Cô phụ trách'} vừa nhắn tin`,
          noiDung: text.slice(0, 140),
          hash: `#/messages/${cv.id}`,
          nguoiTao: req.user.id,
        });
      }
    }
    res.json(messageDto(msg, req.user));
  });
};
