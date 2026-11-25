// Bài canh MÁY CHỦ cho góp ý "đồng ý chia sẻ ảnh theo giấy nhập học" (Đ260i).
//
// Chạy bằng:  node test/phan-hoi-1811-dong-y-anh.test.mjs
//
// Trường (18/11): "Trong giấy nhập học ký với phụ huynh những đoạn này auto đã
// đồng ý." Chủ dự án quyết 25/11: mặc định mọi gia đình đồng ý; văn phòng vẫn
// tắt được cho một gia đình xin rút; câu "Trong ảnh có bé khác không?" chỉ hỏi
// ở nhóm có bé đã rút đồng ý chia sẻ ảnh. Luật ảnh nhóm ở tầng dữ liệu GIỮ
// NGUYÊN — chỉ dữ liệu đổi từ "chưa trả lời" sang "đồng ý".
//
//   1. Kho đã có từ trước: lúc khởi động điền "đồng ý" cho mục CHƯA TRẢ LỜI,
//      đúng MỘT LẦN. Không đè 0 (đã rút), không đè 1, không xoá ghi chú cũ.
//      Bước này hỏng thì máy chủ vẫn lên và vẫn đăng nhập được; lần sau chạy lại.
//   2. Chạy lần hai không đổi gì — kể cả mục văn phòng cố ý đưa về "chưa trả lời".
//   3. Bé mới (nhận một bé, nhập tệp): đồng ý cả ba mục "Theo giấy nhập học".
//   4. Hành trình: máy chủ khai `canHoiBeTrongAnh` theo nhóm của bé; nhóm không
//      ai rút thì kể kèm ảnh không cần trả lời — coi như chỉ có bé chính. Nhóm có
//      bé rút thì y như cũ: không trả lời → ảnh tạm ẩn với gia đình. Máy chủ tự
//      xét lại nhóm, không tin trình duyệt.
//   5. Đường của gia đình (/api/dong-y) vẫn còn nguyên.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 5350);
const DIR = thuMucTam('phan-hoi-1811-dong-y-anh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh']);
const mkVP = taoQuanTri(DIR, 'Văn phòng', 'dy_vp');
const CSDL = path.join(DIR, 'school.db');

const doc = (sql, ...thamSo) => {
  const c = new Database(CSDL, { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const ghi = (sql) => {
  const c = new Database(CSDL, { fileMustExist: true });
  try { c.exec(sql); } finally { c.close(); }
};
const dongCua = (id) => doc('SELECT * FROM student_consent WHERE studentId = ?', id)[0] || null;
const anhChup = () => JSON.stringify(doc('SELECT * FROM student_consent ORDER BY studentId'));
const soAudit = () => doc("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'consent-mac-dinh-giay-nhap-hoc'")[0].n;
const daDanhDau = () => doc("SELECT key FROM settings WHERE key = 'dong-y-mac-dinh'").length === 1;
const cho = (ms) => new Promise(r => setTimeout(r, ms));

// DỰNG MỘT KHO "ĐÃ CÓ TỪ TRƯỚC QUYẾT ĐỊNH 25/11".
//
// Dữ liệu mẫu tự đánh dấu là đã qua bước điền mặc định (nó cố ý giữ đủ ba trạng
// thái cho các bài canh luật ảnh nhóm). Bỏ dấu đó đi là có đúng một trường đang
// chạy trước ngày đổi luật: s2, s6, s7, s8 chưa có dòng nào; s3 đã rút ②.
// Thêm: s4 có MỘT mục chưa trả lời và một ghi chú của văn phòng phải giữ lại.
// Và một bẫy làm bước điền HỎNG ở lần khởi động đầu.
ghi(`
  DELETE FROM settings WHERE key = 'dong-y-mac-dinh';
  UPDATE student_consent SET hoSoHocTap = NULL, ghiChu = 'Mẹ hẹn nộp bản ký sau' WHERE studentId = 's4';
  CREATE TRIGGER bay_dong_y BEFORE INSERT ON student_consent BEGIN SELECT RAISE(ABORT, 'bẫy của bài test'); END;
`);
const s3Truoc = dongCua('s3');
const s9Truoc = dongCua('s9');

let sv = null;
try {
  // =========================================================================
  console.log('\n[1a] Bước điền mặc định HỎNG — máy chủ vẫn lên, vẫn đăng nhập được, chưa đánh dấu');
  {
    sv = await dungMayChu({ port: PORT, dir: DIR });
    const req = taoReq(sv.BASE);
    const login = taoLogin(req);
    check('đăng nhập được dù bước điền hỏng', !!(await login('giaovien', '123456')).cookie);
    check('chưa đánh dấu đã chạy — lần khởi động sau còn chạy lại', !daDanhDau());
    check('không ghi dở dang: s2 vẫn chưa có dòng', dongCua('s2') === null, dongCua('s2'));
    check('s4 vẫn chưa trả lời mục ①', dongCua('s4')?.hoSoHocTap === null, dongCua('s4'));
    sv.dung();
    await cho(800);
  }

  // =========================================================================
  console.log('\n[1b] Gỡ bẫy, khởi động lại — điền "đồng ý" cho mục chưa trả lời, đúng một lần');
  ghi('DROP TRIGGER bay_dong_y;');
  sv = await dungMayChu({ port: PORT, dir: DIR });
  {
    for (const id of ['s2', 's6', 's7', 's8']) {
      const r = dongCua(id);
      check(`${id} (chưa có giấy) → đồng ý cả ba mục, ghi chú nói rõ nguồn`,
        r && r.hoSoHocTap === 1 && r.chiaSeGiaDinh === 1 && r.truyenThong === 1
        && r.ghiChu === 'Theo giấy nhập học (mặc định 25/11)', r);
    }
    const s3 = dongCua('s3');
    check('s3 đã rút ② (0) → GIỮ 0, cả dòng không đổi một chữ', JSON.stringify(s3) === JSON.stringify(s3Truoc), [s3Truoc, s3]);
    check('s9 đã dừng hồ sơ học tập (0) → GIỮ NGUYÊN', JSON.stringify(dongCua('s9')) === JSON.stringify(s9Truoc), dongCua('s9'));
    const s4 = dongCua('s4');
    check('s4: chỉ mục chưa trả lời được điền, các mục khác giữ',
      s4?.hoSoHocTap === 1 && s4.chiaSeGiaDinh === 1 && s4.truyenThong === 1 && s4.nguoiKy === 'Vũ Đình Khoa', s4);
    check('s4: ghi chú cũ của văn phòng còn nguyên, thêm nguồn phía sau',
      s4?.ghiChu === 'Mẹ hẹn nộp bản ký sau · Theo giấy nhập học (mặc định 25/11)', s4?.ghiChu);
    check('s1 đã đồng ý đủ → không đụng tới (truyenThong 0 vẫn là 0)', dongCua('s1')?.truyenThong === 0 && dongCua('s1')?.ghiChu === '', dongCua('s1'));
    check('đã đánh dấu đã chạy', daDanhDau());
    const au = doc("SELECT detail FROM audit_log WHERE action = 'consent-mac-dinh-giay-nhap-hoc'");
    const chiTiet = JSON.parse(au[0]?.detail || '{}');
    check('nhật ký thao tác ghi MỘT dòng kèm tổng số bé đã điền', au.length === 1 && chiTiet.soBe >= 5, au);
  }

  // =========================================================================
  console.log('\n[2] Khởi động lại lần nữa — không đổi gì, kể cả mục văn phòng đưa về "chưa trả lời"');
  {
    let req = taoReq(sv.BASE);
    let login = taoLogin(req);
    const d = await login('dy_vp', mkVP);
    await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
    const VP = (await login('dy_vp', 'quantri2026')).cookie;
    const dua = await req('PUT', '/api/admin/students/s6/dong-y', { cookie: VP, body: { truyenThong: null } });
    check('văn phòng đưa ③ của s6 về "chưa trả lời"', dua.status === 200 && dua.data?.dongY?.truyenThong === null, dua.data);
    const truoc = anhChup();
    await sv.khoiDongLai();
    req = taoReq(sv.BASE);
    login = taoLogin(req);
    check('máy chủ lên lại, đăng nhập được', !!(await login('giaovien', '123456')).cookie);
    check('bảng đồng ý y hệt trước lần khởi động (kể cả giờ cập nhật)', anhChup() === truoc);
    check('s6 vẫn "chưa trả lời" ③ — bước điền không chạy lần hai', dongCua('s6')?.truyenThong === null, dongCua('s6'));
    check('nhật ký vẫn đúng một dòng', soAudit() === 1, soAudit());
  }

  const req = taoReq(sv.BASE);
  const login = taoLogin(req);
  const VP = (await login('dy_vp', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô nhóm c1 (có s3 đã rút)
  const GV2 = (await login('giaovien2', '123456')).cookie;  // t2 — cô nhóm c2 (s2, s7, s8)
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — mẹ bé s1 (c1) và s2 (c2)

  // =========================================================================
  console.log('\n[3] Bé mới — đồng ý cả ba mục theo giấy nhập học, cả hai đường nhận bé');
  {
    const le = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: { hoTen: 'Trần Bảo Ngọc', tenLop: 'Lá 1', phHoTen: 'Trần Văn Hùng', phSdt: '0911222333', ngaySinh: '2021-04-15', gioiTinh: 'Nữ' },
    });
    check('nhận một bé → 201', le.status === 201, le.data);
    const r = dongCua(le.data?.id);
    check('bé nhận lẻ: ①②③ = đồng ý, người ký và ghi chú "Theo giấy nhập học"',
      r && r.hoSoHocTap === 1 && r.chiaSeGiaDinh === 1 && r.truyenThong === 1
      && r.nguoiKy === 'Theo giấy nhập học' && r.ghiChu === 'Theo giấy nhập học', r);

    const csv = 'Họ tên,Nhóm,Họ tên phụ huynh,Điện thoại,Ngày sinh,Giới tính\n'
      + 'Lê Minh Tệp,Lá 1,Lê Văn Tệp,0977000111,2021-06-01,Nam\n';
    const tep = await req('POST', '/api/admin/import/commit', { cookie: VP, body: { csv } });
    check('nhập tệp một bé → 200', tep.status === 200 && tep.data?.imported === 1, tep.data);
    const beTep = doc("SELECT id FROM students WHERE name = 'Lê Minh Tệp'")[0];
    const t = beTep && dongCua(beTep.id);
    check('bé nhập tệp: ①②③ = đồng ý, "Theo giấy nhập học"',
      t && t.hoSoHocTap === 1 && t.chiaSeGiaDinh === 1 && t.truyenThong === 1 && t.nguoiKy === 'Theo giấy nhập học', t);

    const ds = (await req('GET', '/api/admin/students', { cookie: VP })).data || [];
    const moi = ds.find(b => b.id === le.data?.id);
    check('màn quản trị đọc ra "Đồng ý" cho bé mới', moi?.dongY?.chiaSeGiaDinh === true, moi?.dongY);
  }

  // =========================================================================
  const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const KE = { cauChuyen: 'Hôm nay con tự rót nước vào ly.', kemTep: true };
  const ghiVaKe = async (cookie, studentId, ke = {}) => {
    const q = (await req('POST', '/api/hanhtrinh', { cookie, body: { studentId, moTa: 'Con rót nước', anh: ANH } })).data;
    const cb = await req('POST', `/api/hanhtrinh/${q?.id}/cong-bo`, { cookie, body: { ...KE, ...ke } });
    return { q, cb };
  };
  const tepCua = (qsId) => doc('SELECT * FROM hanhtrinh_ke_tep WHERE quanSatId = ?', qsId)[0] || null;
  const beCuaTep = (tepId) => doc('SELECT studentId FROM hanhtrinh_ke_tep_be WHERE tepId = ? ORDER BY studentId', tepId).map(r => r.studentId);
  const muc = async (cookie, id, studentId) =>
    ((await req('GET', `/api/hanhtrinh?studentId=${studentId}`, { cookie })).data?.quanSat || []).find(x => x.id === id);
  const canHoi = async (cookie, studentId) => (await req('GET', `/api/hanhtrinh?studentId=${studentId}`, { cookie })).data?.canHoiBeTrongAnh;

  console.log('\n[4a] Máy chủ khai `canHoiBeTrongAnh` theo nhóm của bé');
  {
    check('nhóm c2 không ai rút → cô KHÔNG cần hỏi', (await canHoi(GV2, 's2')) === false, await canHoi(GV2, 's2'));
    check('nhóm c1 có bé s3 đã rút → cô phải hỏi', (await canHoi(GV, 's1')) === true, await canHoi(GV, 's1'));
    check('văn phòng cũng nhận cờ', (await canHoi(VP, 's1')) === true);
    check('gia đình KHÔNG nhận cờ (không lộ nhóm có nhà đã rút)', (await canHoi(PH, 's1')) === undefined);
  }

  console.log('\n[4b] Nhóm không ai rút: kể kèm ảnh không cần trả lời — bản chép CHƯA xác nhận, ảnh vẫn hiện');
  let qC2 = null;
  {
    const { q, cb } = await ghiVaKe(GV2, 's2');
    qC2 = q;
    check('kể được → 200', cb.status === 200, cb.data);
    const t = tepCua(q?.id);
    check('máy chủ KHÔNG tự ghi "đã xác nhận chỉ có bé s2" (không ai trả lời câu đó)', t?.daXacNhanBe === 0 && beCuaTep(t.id).length === 0, [t, t && beCuaTep(t.id)]);
    check('gia đình bé s2 thấy ảnh', (await muc(PH, q?.id, 's2'))?.tepKe?.length === 1);
    const co = (await muc(GV2, q?.id, 's2'))?.tepKe?.[0];
    check('cô thấy ảnh đang hiện với gia đình, không có lời nhắc ẩn', co?.hienVoiGiaDinh === true && !co.lyDo, co);
  }

  console.log('\n[4c] Kể lại bản đã xác nhận có bé khác — không trả lời thì KHÔNG đè danh sách cũ');
  {
    const { q } = await ghiVaKe(GV2, 's2', { beTrongAnh: ['s8'] });
    const t = tepCua(q?.id);
    check('lần đầu cô chọn s8 → trong ảnh có s2, s8', beCuaTep(t?.id).join() === 's2,s8', beCuaTep(t?.id));
    const lai = await req('POST', `/api/hanhtrinh/${q?.id}/cong-bo`, { cookie: GV2, body: { ...KE, cauChuyen: 'Sửa lời kể.' } });
    check('kể lại (không gửi beTrongAnh) → 200', lai.status === 200, lai.data);
    check('danh sách bé trong ảnh giữ nguyên s2, s8', beCuaTep(t?.id).join() === 's2,s8', beCuaTep(t?.id));
  }

  console.log('\n[4d] Nhóm có bé rút: y như cũ — không trả lời thì ảnh tạm ẩn với gia đình');
  {
    const { q, cb } = await ghiVaKe(GV, 's1');
    const t = tepCua(q?.id);
    check('kể được → 200, bản chép CHƯA xác nhận bé', cb.status === 200 && t?.daXacNhanBe === 0 && beCuaTep(t.id).length === 0, t);
    check('gia đình bé s1 KHÔNG thấy ảnh', (await muc(PH, q?.id, 's1'))?.tepKe?.length === 0);
    const chi = await ghiVaKe(GV, 's1', { beTrongAnh: [] });
    check('trả lời "chỉ có bé An" → gia đình thấy như cũ', (await muc(PH, chi.q?.id, 's1'))?.tepKe?.length === 1);
  }

  console.log('\n[4e] Văn phòng tắt chia sẻ cho một bé nhóm c2 — câu hỏi quay lại, máy chủ tự xét');
  {
    const tat = await req('PUT', '/api/admin/students/s7/dong-y', { cookie: VP, body: { chiaSeGiaDinh: false } });
    check('văn phòng ghi "gia đình xin rút" cho s7', tat.status === 200 && tat.data?.dongY?.chiaSeGiaDinh === false, tat.data);
    check('nhóm c2 nay phải hỏi', (await canHoi(GV2, 's2')) === true);
    const { q } = await ghiVaKe(GV2, 's2');
    const t = tepCua(q?.id);
    check('trình duyệt cũ không trả lời → máy chủ KHÔNG coi là "chỉ có bé chính"', t?.daXacNhanBe === 0 && beCuaTep(t.id).length === 0, t);
    check('→ ảnh tạm ẩn với gia đình', (await muc(PH, q?.id, 's2'))?.tepKe?.length === 0);
    check('ảnh kể lúc nhóm chưa ai rút (không ai xác nhận người trong ảnh) nay TẠM ẨN — có thể có mặt bé vừa rút',
      (await muc(PH, qC2?.id, 's2'))?.tepKe?.length === 0);
    await req('PUT', '/api/admin/students/s7/dong-y', { cookie: VP, body: { chiaSeGiaDinh: true } });
    check('văn phòng bật lại → nhóm c2 thôi hỏi', (await canHoi(GV2, 's2')) === false);
  }

  // =========================================================================
  console.log('\n[5] Đường của gia đình vẫn còn nguyên');
  {
    const g = await req('GET', '/api/dong-y?studentId=s1', { cookie: PH });
    check('GET /api/dong-y → 200', g.status === 200 && g.data?.dongY?.chiaSeGiaDinh === true, g.data);
    const rut = await req('PUT', '/api/dong-y', { cookie: PH, body: { studentId: 's1', truyenThong: false } });
    check('PUT /api/dong-y (rút) vẫn chạy', rut.status === 200 && rut.data?.dongY?.truyenThong === false, rut.data);
  }

  console.log('\n[9] Trường cài mới (kho chưa có bé) — đánh dấu ngay, về sau không đè "Chưa trả lời"');
  {
    const { execFileSync } = await import('node:child_process');
    const fs = await import('node:fs');
    const os = await import('node:os');
    const moi = fs.mkdtempSync(path.join(os.tmpdir(), 'dong-y-moi-'));
    try {
      const kq = execFileSync(process.execPath, ['-e', `
        const db = require('./lib/db');
        const dy = require('./lib/dong-y-mac-dinh');
        dy.dienMacDinhMotLan();
        const dau = db.first('settings', "SELECT value FROM settings WHERE key = 'dong-y-mac-dinh'", []);
        process.stdout.write(JSON.stringify({ daDanhDau: !!dau }));
      `], { cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), env: { ...process.env, DATA_DIR: moi } }).toString();
      check('kho trống: bước điền mặc định đánh dấu đã chạy ngay', JSON.parse(kq).daDanhDau === true, kq);
    } finally { fs.rmSync(moi, { recursive: true, force: true }); }
  }
} finally {
  sv?.dung();
  donThuMucTam(DIR);
}
tongKet();
