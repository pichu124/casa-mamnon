// Bài canh DỮ LIỆU MẪU CỦA TÁM PHÂN HỆ MẦM NON.
//
// Chạy bằng:  npm run test:du-lieu-mau-phan-he
//
// VÌ SAO CÓ BÀI NÀY
//
// `docs/KE-HOACH.md` mục G0 chốt: *"Seed kể một câu chuyện nhất quán — bé An,
// nhóm Chồi 2, cơ sở 1, chạy xuyên suốt mọi màn hình"*. Nhưng cho tới trước
// đợt Đ16, chạy `npm run seed` rồi bật tám phân hệ mầm non lên thì màn nào
// cũng trắng trơn. Người của trường mở app xem thử sẽ tưởng phân hệ hỏng, và
// nhà trường thì đang phải quyết định có dùng app hay không dựa trên đúng lần
// mở thử đó.
//
// VÌ SAO PHẢI CÓ BỘ CANH RIÊNG, KHÔNG DỰA VÀO CÁC BỘ TEST PHÂN HỆ
//
// Mọi bộ test phân hệ đều dựng trên nền "phân hệ này chưa có dòng nào": chúng
// tự ghi rồi tự đếm. Nên `sinhDuLieu` của bộ kiểm thử TẮT SẴN phần dữ liệu mẫu
// của phân hệ — nếu không thì hỏng hàng loạt phép kiểm về ranh giới nháp ↔ đã
// công bố và nhà mình ↔ nhà khác.
//
// Hệ quả: KHÔNG bộ test nào đang chạy nhìn tới đường sinh dữ liệu mẫu của phân
// hệ. Nó có thể hỏng hoàn toàn mà cả bộ kiểm thử vẫn xanh — đúng kiểu "bài canh
// luôn đúng" mà `docs/TIEN-DO.md` cảnh báo. Bài này là chỗ duy nhất bật nó lên.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, GOC } from './_chung.mjs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require(path.join(GOC, 'node_modules', 'better-sqlite3'));
const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('du-lieu-mau-phan-he');
sinhDuLieu(DIR, { phanHe: true });

const db = new Database(path.join(DIR, 'school.db'), { readonly: true });
const dem = (bang, dieuKien = '', tham = []) => {
  try {
    return db.prepare(`SELECT COUNT(*) n FROM ${bang}${dieuKien ? ` WHERE ${dieuKien}` : ''}`).get(...tham).n;
  } catch (_) { return -1; }
};
const lay = (sql, tham = []) => { try { return db.prepare(sql).all(...tham); } catch (_) { return []; } };

// ===========================================================================
console.log('\n[1] Bật phân hệ lên là có cái để xem — cả TÁM, không sót cái nào');
{
  const bang = [
    ['nhatky_ngay', 'Nhật ký ngày'],
    ['tienan_chot', 'Báo ăn & tiền ăn'],
    ['dontra_nguoi', 'Đón trả bé — người đón quen'],
    ['dontra_ghi', 'Đón trả bé — sổ đón trả'],
    ['hanhtrinh_quansat', 'Hành trình học tập — quan sát'],
    ['hanhtrinh_chude', 'Hành trình học tập — chủ đề tuần'],
    ['kehoachbe_ke', 'Kế hoạch của bé'],
    ['kehoachbe_muc', 'Kế hoạch của bé — từng góc lĩnh vực'],
    ['cambridge_bai', 'Cambridge & Kết nối ở nhà'],
    ['thuchup_ghinhanh', 'Ghi nhanh'],
    ['hocphi_khoan', 'Học phí'],
  ];
  for (const [t, ten] of bang) {
    check(`${ten}: có dữ liệu mẫu`, dem(t) > 0, dem(t));
  }
}

// ===========================================================================
console.log('\n[2] Câu chuyện của bé An chạy xuyên suốt, không đứt đoạn');
{
  // Đây là điều bản kế hoạch đòi, và cũng là thứ dễ trôi nhất: mỗi lần thêm
  // một phân hệ, người viết chọn đại một mã bé, và câu chuyện gãy dần.
  check('bé An (s1) có nhật ký ngày', dem('nhatky_ngay', 'studentId = ?', ['s1']) > 0);
  check('bé An có người đón quen đã khai', dem('dontra_nguoi', 'studentId = ?', ['s1']) > 0);
  check('bé An có kế hoạch tháng', dem('kehoachbe_ke', 'studentId = ?', ['s1']) > 0);
  check('bé An có một câu chuyện học tập ĐÃ CÔNG BỐ cho gia đình',
    dem('hanhtrinh_quansat', "studentId = ? AND congBoLuc IS NOT NULL AND congBoLuc <> ''", ['s1']) > 0);

  check('nhóm Chồi 2 có báo ăn đã chốt', dem('tienan_chot', 'classId = ?', ['c1']) > 0);
  check('nhóm Chồi 2 có chủ đề tuần', dem('hanhtrinh_chude', 'classId = ?', ['c1']) > 0);
}

// ===========================================================================
console.log('\n[3] Dữ liệu mẫu dựng đủ BA LỚP của một quan sát');
{
  // Bảng ba lớp trong CLAUDE.md là phần hồn của phân hệ Hành trình. Dữ liệu mẫu
  // chỉ có một lớp thì màn hình chỉ chứng minh được một lớp, và người xem thử
  // sẽ không hiểu vì sao phải có ba bước.
  const q = lay('SELECT * FROM hanhtrinh_quansat');
  const lop1 = q.filter(x => !x.linhVuc && !x.congBoLuc);
  const lop2 = q.filter(x => x.linhVuc && !x.congBoLuc);
  const lop3 = q.filter(x => x.congBoLuc);
  check('LỚP 1 — ghi chú thô, cô chưa gắn lĩnh vực', lop1.length > 0, q.length);
  check('LỚP 2 — đã suy ngẫm nhưng CHƯA công bố', lop2.length > 0, q.length);
  check('LỚP 3 — đã công bố cho gia đình', lop3.length > 0, q.length);

  // QUY TẮC 5 — mỗi nhận định phải kèm một việc làm được.
  check('quan sát đã suy ngẫm đều có dòng "ở lớp cô làm gì tiếp"',
    [...lop2, ...lop3].every(x => (x.oLopLamGi || '').trim()), [...lop2, ...lop3].map(x => x.oLopLamGi));
  check('câu chuyện đã công bố đều có dòng "cùng con ở nhà"',
    lop3.every(x => (x.cungConONha || '').trim()), lop3.map(x => x.cungConONha));
}

// ===========================================================================
console.log('\n[4] Có cả trạng thái CHƯA LÀM — không phải màn nào cũng đầy');
{
  // Dữ liệu mẫu điền kín mọi ô là dữ liệu mẫu nói dối: trường thật không bao
  // giờ đủ, và màn hình phải chịu được ô trống. Đây cũng là chỗ cô nhìn vào để
  // biết còn việc gì phải làm sáng nay.
  const beC1 = lay("SELECT id FROM students WHERE classId = 'c1' AND active = 1").map(x => x.id);
  const ngayMoiNhat = (lay('SELECT MAX(ngay) m FROM nhatky_ngay')[0] || {}).m;
  const daGhi = lay('SELECT studentId FROM nhatky_ngay WHERE ngay = ?', [ngayMoiNhat]).map(x => x.studentId);
  check('ngày gần nhất vẫn còn bé CHƯA được ghi nhật ký',
    beC1.some(id => !daGhi.includes(id)), { beC1, daGhi });

  check('kế hoạch của bé có đủ ba trạng thái duyệt',
    new Set(lay('SELECT trangThai FROM kehoachbe_ke').map(x => x.trangThai)).size >= 3,
    lay('SELECT trangThai FROM kehoachbe_ke').map(x => x.trangThai));

  check('Cambridge có bài CÒN LÀ NHÁP, chưa công bố',
    dem('cambridge_bai', "congBoLuc IS NULL OR congBoLuc = ''") > 0);

  check('Ghi nhanh có bản ghi lúc MẤT MẠNG, gửi lên sau',
    dem('thuchup_ghinhanh', 'ngoaiTuyen = 1') > 0);
}

// ===========================================================================
console.log('\n[5] Nhóm nhà trẻ có ô thay bỉm và bú bình, nhóm Lá thì không');
{
  // Bé 14 tháng cần ghi thay bỉm và bú bình; bé nhóm Lá thì không. Dữ liệu mẫu
  // phải kể được đúng sự khác nhau đó, nếu không thì màn hình nhà trẻ trông y
  // hệt màn hình nhóm Lá và không ai thấy vấn đề.
  check('bé nhà trẻ (s9) có số lần thay bỉm', dem('nhatky_ngay', 'studentId = ? AND bimSoLan IS NOT NULL', ['s9']) > 0);
  check('và có lượng sữa bú bình', dem('nhatky_ngay', 'studentId = ? AND buBinhMl IS NOT NULL', ['s9']) > 0);
  check('bé 38 tháng (s11) KHÔNG có ô bỉm — đã qua mốc 36 tháng',
    dem('nhatky_ngay', 'studentId = ? AND bimSoLan IS NOT NULL', ['s11']) === 0);
  check('bé nhóm Chồi 2 cũng không', dem('nhatky_ngay', 'studentId = ? AND bimSoLan IS NOT NULL', ['s1']) === 0);
}

// ===========================================================================
console.log('\n[6] Chạy lại seed KHÔNG để lại dòng cũ trỏ vào bé đã bị xoá');
{
  // Danh sách xoá của `lib/importer.js` không nhắc tới bảng nào của phân hệ, nên
  // nếu đường sinh dữ liệu mẫu không tự dọn thì chạy lại seed sẽ nhân đôi mọi
  // thứ, và một nửa số dòng trỏ vào những bé vừa bị xoá.
  const truoc = dem('nhatky_ngay');
  db.close();
  sinhDuLieu(DIR, { phanHe: true });
  const db2 = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const sau = db2.prepare('SELECT COUNT(*) n FROM nhatky_ngay').get().n;
  check('CHẠY LẠI SEED KHÔNG NHÂN ĐÔI DỮ LIỆU', sau === truoc, { truoc, sau });

  const mocoi = db2.prepare(
    'SELECT COUNT(*) n FROM nhatky_ngay WHERE studentId NOT IN (SELECT id FROM students)').get().n;
  check('không dòng nhật ký nào trỏ vào một bé không tồn tại', mocoi === 0, mocoi);

  const mocoi2 = db2.prepare(
    'SELECT COUNT(*) n FROM tienan_chot WHERE classId NOT IN (SELECT id FROM classes)').get().n;
  check('không bản báo ăn nào trỏ vào một nhóm không tồn tại', mocoi2 === 0, mocoi2);
  db2.close();
}

// ===========================================================================
console.log('\n[7] Tắt được, và bộ kiểm thử đang tắt nó');
{
  const DIR2 = thuMucTam('du-lieu-mau-phan-he-tat');
  sinhDuLieu(DIR2);   // mặc định: KHÔNG sinh dữ liệu mẫu của phân hệ
  const db3 = new Database(path.join(DIR2, 'school.db'), { readonly: true });
  let n = -1;
  try { n = db3.prepare('SELECT COUNT(*) n FROM nhatky_ngay').get().n; } catch (_) { n = 0; }
  check('MẶC ĐỊNH TRONG KIỂM THỬ LÀ TẮT — các bộ test phân hệ giữ được nền trống',
    n === 0, n);
  db3.close();
  donThuMucTam(DIR2);
}

donThuMucTam(DIR);
tongKet();
