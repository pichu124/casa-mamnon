// Bài canh HỒ SƠ BÉ — bốn ý của nhà trường (Đ161).
//
// Chạy bằng:  npm run test:ho-so-lien-he
//
// BỐN Ý, VÀ HAI Ý ĐẦU HOÁ RA ĐÃ LÀM TỪ TRƯỚC
//
// Sổ `docs/VIEC-CON-LAI.md` ghi bốn ý chưa có mã cho mảng Hồ sơ bé. Đo lại
// từng ý thì (1) nhãn "Dị ứng" → "Tiền sử bệnh / lưu ý đặc biệt" đã đổi từ
// Đ139, và phần lớn khối "Thông tin trường lớp" cũng đã có. Còn lại ba chỗ
// thật, và một chỗ trong đó là một LỖ RÒ chứ không phải một tính năng thiếu.
//
// [1] SỐ ĐIỆN THOẠI RIÊNG CỦA CÔ ĐANG ĐI TỚI GIA ĐÌNH.
//
//     Trường nói thẳng: hồ sơ bé phía phụ huynh **bỏ số điện thoại giáo
//     viên**, gia đình gọi hotline văn phòng. Màn hình vốn đã không VẼ số ấy
//     ra — nhưng gói dữ liệu thì có mang, ở cả ba đường `/api/students`,
//     `/api/students/:id` và `/api/auth/me`. Ai mở công cụ lập trình của trình
//     duyệt là đọc được, và một bản giao diện sau này chỉ cần vẽ thêm một dòng
//     là lộ hết. Đúng câu CLAUDE.md dặn cho ảnh nhóm: **lọc ở tầng dữ liệu,
//     không che ở giao diện**.
//
// [2] Email kế toán — chỗ duy nhất của khối liên hệ còn thiếu.
//
// [3] "Bắt buộc đủ bố + mẹ + một người liên hệ khẩn cấp" — LÀM KHÁC CHỮ
//     "bắt buộc", và mục [3] canh đúng chỗ làm khác: máy đếm và liệt kê,
//     KHÔNG chặn một đường ghi nào. Chặn ở đường nhập danh sách đầu năm là cả
//     lượt nhập trượt; chặn ở đường sửa là văn phòng thôi sửa hồ sơ.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ho-so-lien-he');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng HS', 'hs_qt');
const mkVP = taoQuanTri(DIR, 'Văn Phòng HS', 'hs_vp');
khoaVaoCoSo(DIR, 'hs_vp', 'cs1');
datChucVu(DIR, 'hs_vp', 'vanphong-coso');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4779), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
// Số điện thoại của cô, lấy từ đường CỦA QUẢN TRỊ — để mục [1] so được chuỗi
// thật chứ không chỉ so tên trường.
const timSoCuaCo = (ds) => {
  for (const s of ds || []) {
    for (const t of s.teachers || []) if (t.phone) return t.phone;
    if (s.teacherPhone) return s.teacherPhone;
  }
  return '';
};

try {
  const QT = await vao('hs_qt', mkQT);
  const VP = await vao('hs_vp', mkVP);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Số điện thoại RIÊNG của cô KHÔNG đi tới gia đình');
  {
    const cuaCo = (await req('GET', '/api/students', { cookie: GV })).data;
    const soCuaCo = timSoCuaCo(cuaCo);
    check('đối chứng — CÔ vẫn nhận đủ số của đồng nghiệp cùng nhóm',
      !!soCuaCo, (cuaCo[0] || {}).teachers);

    const ds = (await req('GET', '/api/students', { cookie: PH })).data;
    check('gia đình vẫn nhận được danh sách con', Array.isArray(ds) && ds.length > 0, ds.length);
    check('và vẫn biết TÊN cô phụ trách — chỉ số điện thoại là không',
      ds.every(s => typeof s.teacherNames === 'string'), (ds[0] || {}).teacherNames);
    check('KHÔNG trường teacherPhone nào trong gói của gia đình',
      ds.every(s => s.teacherPhone === undefined), (ds[0] || {}).teacherPhone);
    check('KHÔNG cô nào trong mảng teachers mang số điện thoại',
      ds.every(s => (s.teachers || []).every(t => t.phone === undefined)), (ds[0] || {}).teachers);
    check('và số thật của cô KHÔNG nằm đâu trong cả gói',
      !!soCuaCo && !JSON.stringify(ds).includes(soCuaCo), soCuaCo);

    const mot = (await req('GET', `/api/students/${ds[0].id}`, { cookie: PH })).data;
    check('hồ sơ chi tiết một bé cũng vậy',
      mot.teacherPhone === undefined
        && (mot.teachers || []).every(t => t.phone === undefined)
        && !JSON.stringify(mot).includes(soCuaCo),
      { p: mot.teacherPhone, t: mot.teachers });

    const me = (await req('GET', '/api/auth/me', { cookie: PH })).data;
    check('và gói /api/auth/me — đường gia đình nhận NGAY khi mở app',
      !JSON.stringify(me.students || []).includes(soCuaCo),
      JSON.stringify((me.students || [])[0] || {}).slice(0, 160));

    // ĐỐI CHỨNG NGƯỢC: văn phòng vẫn cần số của cô để phân công.
    const cuaVp = (await req('GET', '/api/students', { cookie: VP })).data;
    check('VĂN PHÒNG vẫn nhận đủ số của cô — họ cần để phân công',
      JSON.stringify(cuaVp).includes(soCuaCo), soCuaCo);
  }

  // =========================================================================
  console.log('\n[2] Email kế toán trong khối liên hệ của trường');
  {
    const truoc = (await req('GET', '/api/admin/lien-he', { cookie: QT })).data;
    check('đọc được thông tin liên hệ của trường', truoc && truoc.emailKeToan === '', truoc);
    check('và biết mình sửa được hay không', truoc.suaDuoc === true, truoc.suaDuoc);

    const sai = await req('PUT', '/api/admin/lien-he', { cookie: QT, body: { emailKeToan: 'không-phải-email' } });
    check('email sai dạng thì từ chối và nói ví dụ đúng',
      sai.status === 400 && /ketoan@/.test(sai.data?.error || ''), sai.data);

    const ok = await req('PUT', '/api/admin/lien-he', { cookie: QT, body: { emailKeToan: 'ketoan@casamamnon.edu.vn' } });
    check('lưu được email kế toán', ok.status === 200, ok.data);

    const ds = (await req('GET', '/api/students', { cookie: PH })).data;
    const mot = (await req('GET', `/api/students/${ds[0].id}`, { cookie: PH })).data;
    check('gia đình thấy email kế toán trong khối liên hệ trường',
      (mot.lienHeTruong || {}).emailKeToan === 'ketoan@casamamnon.edu.vn', mot.lienHeTruong);
    check('và vẫn còn đủ hotline văn phòng + email trường như trước',
      !!(mot.lienHeTruong || {}).hotline && (mot.lienHeTruong || {}).email !== undefined, mot.lienHeTruong);

    const vpSua = await req('PUT', '/api/admin/lien-he', { cookie: VP, body: { emailKeToan: 'x@y.vn' } });
    check('quản trị Cấp 3 KHÔNG sửa được — đây là thứ của cả trường', vpSua.status === 403, vpSua.status);
    const vpDoc = (await req('GET', '/api/admin/lien-he', { cookie: VP })).data;
    check('nhưng ĐỌC được, và máy nói thẳng là không sửa được',
      vpDoc.emailKeToan === 'ketoan@casamamnon.edu.vn' && vpDoc.suaDuoc === false, vpDoc);

    const coDoc = await req('GET', '/api/admin/lien-he', { cookie: GV });
    check('CÔ không mở được mục quản trị này', coDoc.status === 403, coDoc.status);

    // Để trống là GỠ ĐI, và màn hình bỏ hẳn dòng.
    await req('PUT', '/api/admin/lien-he', { cookie: QT, body: { emailKeToan: '' } });
    const sau = (await req('GET', `/api/students/${ds[0].id}`, { cookie: PH })).data;
    check('gỡ đi thì trường đó về rỗng, không để lại địa chỉ cũ',
      (sau.lienHeTruong || {}).emailKeToan === '', sau.lienHeTruong);
    await req('PUT', '/api/admin/lien-he', { cookie: QT, body: { emailKeToan: 'ketoan@casamamnon.edu.vn' } });
  }

  // =========================================================================
  console.log('\n[3] "Bắt buộc đủ bố + mẹ + liên hệ khẩn cấp" — ĐẾM, KHÔNG CHẶN');
  {
    const d = (await req('GET', '/api/admin/ho-so-chua-du', { cookie: QT })).data;
    check('văn phòng mở được danh sách hồ sơ còn thiếu', !!d && Array.isArray(d.danhSach), d);
    check('dữ liệu mẫu mỗi bé một phụ huynh nên phải có bé thiếu', d.soChuaDu > 0, d.soChuaDu);
    check('và nói rõ thiếu MÓN NÀO bằng tiếng của trường',
      d.danhSach.every(x => x.thieuChu.length > 0
        && x.thieuChu.every(t => /bố và mẹ|liên hệ khẩn cấp/.test(t))),
      (d.danhSach[0] || {}).thieuChu);
    check('kèm tên nhóm để văn phòng biết đi đòi ở đâu',
      d.danhSach.every(x => typeof x.tenNhom === 'string'), (d.danhSach[0] || {}).tenNhom);

    // KHÔNG CHẶN ĐƯỜNG GHI NÀO — đây là chỗ cố ý làm khác chữ "bắt buộc".
    const be = d.danhSach[0];
    const sua = await req('PUT', `/api/admin/students/${encodeURIComponent(be.studentId)}`, {
      cookie: QT, body: { tienSuBenh: 'Hen nhẹ khi trở trời' } });
    check('SỬA hồ sơ vẫn lưu được tuy còn thiếu liên hệ — không chặn',
      sua.status === 200, `${sua.status} ${JSON.stringify(sua.data).slice(0, 140)}`);

    // Thêm người liên hệ khẩn cấp thì bé đó rời khỏi danh sách.
    const them = await req('PUT', `/api/admin/students/${encodeURIComponent(be.studentId)}`, {
      cookie: QT, body: { lienHeKhanCap: [{ hoTen: 'Bà ngoại', quanHe: 'Bà', dienThoai: '0901234567' }] } });
    check('thêm được người liên hệ khẩn cấp', them.status === 200, them.data);
    const sau = (await req('GET', '/api/admin/ho-so-chua-du', { cookie: QT })).data;
    const conThieu = (sau.danhSach.find(x => x.studentId === be.studentId) || {}).thieu || [];
    check('bé đó thôi bị đánh dấu thiếu liên hệ khẩn cấp',
      !conThieu.includes('khan-cap'), conThieu);
    check('nhưng vẫn còn được nhắc là chưa đủ hai phụ huynh',
      conThieu.includes('bo-me'), conThieu);

    // Danh sách bé cũng mang cờ, để màn không phải hỏi hai lần.
    const dsBe = (await req('GET', '/api/admin/students', { cookie: QT })).data;
    check('danh sách bé mang sẵn cờ thiếu hồ sơ',
      dsBe.every(s => Array.isArray(s.thieuHoSo)), (dsBe[0] || {}).thieuHoSo);

    // Phạm vi cơ sở: Cấp 3 chỉ đếm bé cơ sở mình.
    const cuaVp = (await req('GET', '/api/admin/ho-so-chua-du', { cookie: VP })).data;
    check('quản trị Cấp 3 chỉ đếm bé trong cơ sở mình',
      cuaVp.soBe <= d.soBe, { vp: cuaVp.soBe, qt: d.soBe });
    const coXem = await req('GET', '/api/admin/ho-so-chua-du', { cookie: GV });
    check('CÔ không mở được danh sách này', coXem.status === 403, coXem.status);
  }

  // =========================================================================
  console.log('\n[4] Chữ trên màn hình nói về GIẤY TỜ NGƯỜI LỚN, không nói về bé');
  {
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
    // Neo vào ĐỊNH NGHĨA hàm, không phải chỗ gọi: `this.veHoSoChuaDu();` đứng
    // trước trong tệp, và cắt từ đó thì cửa sổ trượt hết khỏi thân hàm.
    const dau = v.indexOf('async veHoSoChuaDu() {');
    const than = v.slice(dau, dau + 2600);
    check('thẻ nói "hồ sơ liên hệ còn thiếu", không nói bé thiếu gì',
      /Hồ sơ liên hệ còn thiếu/.test(than) && !/bé .{0,20}thiếu sót/.test(than), 'admin.js');
    check('và có nhánh "đã đủ cả trường" — đủ là tin tốt, không phải một ô trống',
      /đã đủ cả trường/.test(than), 'admin.js');
    check('nói rõ app KHÔNG chặn việc gì', /không chặn việc gì/.test(than), 'admin.js');

    // Hai ý còn lại của sổ đã có từ trước — canh để chúng không lặng lẽ mất.
    const st = fs.readFileSync(path.join(GOC, 'public/js/views/student.js'), 'utf8');
    check('nhãn "Tiền sử bệnh / lưu ý đặc biệt" vẫn còn (Đ139)',
      /Tiền sử bệnh \/ lưu ý đặc biệt/.test(st) && !/>Dị ứng</.test(st), 'student.js');
    check('khối liên hệ trường vẫn có hotline văn phòng và cô phụ trách',
      /Hotline văn phòng/.test(st) && /Cô phụ trách/.test(st), 'student.js');
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Hồ sơ bé — liên hệ và giấy tờ (Đ161)');
