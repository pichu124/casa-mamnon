// ẢNH CỦA CHÍNH CON MÌNH KHÔNG ĐƯỢC ẨN VỚI CHÍNH GIA ĐÌNH ĐÓ — KỂ CẢ KHI BÉ
// ĐÃ RỜI TRƯỜNG. VÀ BẢN LÔ CỦA LUẬT TRUYỀN THÔNG PHẢI GIỐNG HỆT BẢN TỪNG DÒNG.
//
// Vế 1 (diện miễn trừ "con mình" đi theo QUAN HỆ):
//
// Nhà trường chốt: bé rời trường thì gia đình còn 12 tháng để xem lại và tải
// hồ sơ về (SO_THANG_GIU_HO_SO). Đường album năm cũ đã mở đúng hạn đó. Nhưng
// trước bản vá, bộ lọc ảnh nhóm dựng tập "con mình" bằng `studentIdsOf` — hàm
// lọc `active = 1` — nên bé đã rời trường KHÔNG nằm trong tập ấy. Gia đình đã
// từ chối chia sẻ ảnh cho nhà khác (chiaSeGiaDinh = 0) thì chính lời từ chối
// đó quay lại ẩn ảnh của con họ VỚI CHÍNH HỌ — trong đúng 12 tháng sinh ra để
// họ tải kỷ niệm về. Lỗi nghiêng về phía đóng nhầm (không rò rỉ), nhưng trái
// thẳng thiết kế: "con mình chỉ miễn phép kiểm cho chính con mình".
//
// Vế 2 (bản lô truyền thông): đường liệt kê album của tài khoản Marketing
// dùng bản lô mới `locAnhChoTruyenThongNhieuAnh`, đường xem một album vẫn dùng
// bản từng dòng. Hai đường phải cho CÙNG một danh sách ảnh — lệch nhau là một
// trong hai bản đang nói dối.
import path from 'path';
import { createRequire } from 'module';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu,
} from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const Database = require_('better-sqlite3');

const DIR = thuMucTam('anh-be-ra-truong');
sinhDuLieu(DIR);

// Bối cảnh, dựng TRƯỚC khi máy chủ chạy:
//   • s1 (con chị p1, nhóm c1) đã rời trường 2 tháng trước — còn trong hạn 12
//     tháng. Giấy đồng ý của s1: KHÔNG chia sẻ cho nhà khác (chiaSeGiaDinh=0),
//     truyền thông chưa trả lời.
//   • s3, s4 (đang học c1): đồng ý chia sẻ + đồng ý truyền thông.
//   • s5 (đang học c1): chưa trả lời gì.
//   • Album 'al-cu' của c1, ngày nằm trong khoảng s1 còn học:
//       f1 gắn [s1]        — chỉ có con chị p1
//       f2 gắn [s1, s3]    — con chị p1 + một bé đã đồng ý chia sẻ
//       f3 gắn [s5]        — bé nhà khác, chưa trả lời
//       f4 không gắn ai
//       f5 gắn [s3, s4]    — cả hai bé đều đồng ý TRUYỀN THÔNG
{
  const d = new Database(path.join(DIR, 'school.db'));
  d.prepare("UPDATE students SET active = 0, leftAt = '2026-07-15' WHERE id = 's1'").run();
  d.prepare(`INSERT INTO student_class_periods (id, studentId, classId, className, year, tu, den)
             VALUES ('kcu1', 's1', 'c1', 'Chồi 2', '2025-2026', '2026-01-05', '2026-07-15')`).run();
  const dy = d.prepare(`INSERT OR REPLACE INTO student_consent
    (studentId, hoSoHocTap, chiaSeGiaDinh, truyenThong, nguoiKy, ngayKy, ghiChu, capNhatLuc)
    VALUES (?, ?, ?, ?, '', '', '', '')`);
  dy.run('s1', 1, 0, null);
  dy.run('s3', 1, 1, 1);
  dy.run('s4', 1, 1, 1);
  // Dữ liệu mẫu cho s5 ĐÃ đồng ý chia sẻ — đưa về "chưa trả lời" để dựng đúng
  // tình huống cần canh: chưa trả lời KHÔNG phải là đồng ý.
  dy.run('s5', 1, null, null);
  d.prepare(`INSERT INTO albums (id, classId, title, date, description)
             VALUES ('al-cu', 'c1', 'Dã ngoại tháng Năm', '2026-05-20', '')`).run();
  const anh = d.prepare(`INSERT INTO album_photos (id, albumId, emoji, caption, position)
                         VALUES (?, 'al-cu', '📷', '', ?)`);
  ['f1', 'f2', 'f3', 'f4', 'f5'].forEach((id, i) => anh.run(id, i));
  const the = d.prepare('INSERT INTO photo_students (photoId, studentId) VALUES (?, ?)');
  the.run('f1', 's1');
  the.run('f2', 's1'); the.run('f2', 's3');
  the.run('f3', 's5');
  the.run('f5', 's3'); the.run('f5', 's4');
  d.close();
}

const mkMK = taoQuanTri(DIR, 'Bạn Truyền Thông', 'truyenthong');
datChucVu(DIR, 'truyenthong', 'marketing');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4120), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

console.log('\n[1] Gia đình bé đã rời trường (còn hạn) vẫn thấy ảnh của CHÍNH con mình');
{
  const ph = await login('phuhuynh', '123456');   // p1 — mẹ của s1 (đã nghỉ) và s2
  check('phụ huynh đăng nhập được', ph.status === 200, ph.status);

  const chiTiet = await req('GET', '/api/albums/al-cu', { cookie: ph.cookie });
  check('mở được album năm cũ trong hạn 12 tháng', chiTiet.status === 200, chiTiet.status);

  const ids = new Set((chiTiet.data?.photos || []).map(a => a.id));
  check('ảnh chỉ có con mình (f1) HIỆN — dù giấy ghi "không chia sẻ cho nhà khác"',
    ids.has('f1'), [...ids]);
  check('ảnh con mình + bé đã đồng ý chia sẻ (f2) hiện', ids.has('f2'), [...ids]);
  check('ảnh bé nhà khác chưa trả lời (f3) vẫn ẨN', !ids.has('f3'), [...ids]);
  check('ảnh chưa gắn thẻ (f4) vẫn ẨN vì nhóm có người từ chối', !ids.has('f4'), [...ids]);
  check('ảnh hai bé nhà khác đã đồng ý chia sẻ (f5) hiện', ids.has('f5'), [...ids]);
}

console.log('\n[2] Lời từ chối của s1 vẫn nguyên hiệu lực với NHÀ KHÁC');
{
  const ph2 = await login('phuhuynh2', '123456'); // p2 — nhà bé s3, cùng nhóm c1
  const chiTiet = await req('GET', '/api/albums/al-cu', { cookie: ph2.cookie });
  check('nhà khác mở album của nhóm con mình được', chiTiet.status === 200, chiTiet.status);
  const ids = new Set((chiTiet.data?.photos || []).map(a => a.id));
  check('ảnh có s1 (f1) ẨN với nhà khác', !ids.has('f1'), [...ids]);
  check('ảnh có s1 (f2) ẨN với nhà khác — dù có cả con nhà họ trong đó', !ids.has('f2'), [...ids]);
  check('ảnh hai bé đã đồng ý (f5) hiện với nhà khác', ids.has('f5'), [...ids]);
}

console.log('\n[3] Marketing: bản lô (danh sách) và bản từng dòng (chi tiết) cho cùng kết quả');
{
  const mk = await login('truyenthong', mkMK);
  check('tài khoản marketing đăng nhập được', mk.status === 200, mk.status);

  const chiTiet = await req('GET', '/api/albums/al-cu', { cookie: mk.cookie });
  const idsChiTiet = (chiTiet.data?.photos || []).map(a => a.id).sort();
  check('chi tiết: chỉ ảnh mà MỌI bé trong ảnh đồng ý truyền thông (f5)',
    JSON.stringify(idsChiTiet) === JSON.stringify(['f5']), idsChiTiet);

  const danhSach = await req('GET', '/api/albums?keCaLopCu=1', { cookie: mk.cookie });
  const alCu = (danhSach.data || []).find(a => a.id === 'al-cu');
  check('danh sách có album al-cu', !!alCu, (danhSach.data || []).map(a => a.id));
  check('bản lô đếm đúng như bản từng dòng: photoCount = 1',
    alCu && alCu.photoCount === 1, alCu && alCu.photoCount);
  check('ảnh bìa của bản lô cũng là f5 — không lộ ảnh chưa đủ đồng ý ra bìa',
    alCu && alCu.cover && alCu.cover.id === 'f5', alCu && alCu.cover && alCu.cover.id);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
