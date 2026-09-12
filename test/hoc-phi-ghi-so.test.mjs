// Bài canh AI ĐẶT RA KHOẢN THU, VÀ GHI SỔ CHO CẢ NHÓM MỘT LƯỢT (Đ163).
//
// Chạy bằng:  npm run test:hoc-phi-ghi-so
//
// NHÀ TRƯỜNG XIN GÌ
//
// 07/09, mảng Học phí và Kế toán, hai trong bốn ý:
//   (1) *"chỉ kế toán hoặc Cấp 1 được tạo khoản thu"*
//   (2) *"tạo phí tách theo cơ sở / lớp / trẻ cho dễ nhìn"*
//
// Bài `test/hoc-phi.test.mjs` đã canh phần cũ và KHÔNG được nới một dòng nào ở
// đó — nó đang giữ những thứ Đ42 chốt (cô không ghi sổ tiền, gia đình không
// ghi, tầng cơ sở không lấn). Bài này canh phần MỚI, và canh luôn rằng phần
// mới không phá phần cũ.
//
// BỐN ĐIỀU CỐ Ý, CẢ BỐN ĐỀU CANH Ở ĐÂY
//
// [1] SIẾT GHI, KHÔNG SIẾT ĐỌC, và cũng không siết đường xác nhận đã nhận
//     tiền. Cắt dòng `/api/hocphi` khỏi danh sách chức vụ của Văn phòng cơ sở
//     là cắt cùng lúc cả bốn đường — họ thôi xem được sổ tiền và thôi ghi
//     được "đã nhận tiền" ở bàn tiếp đón, tức hỏng đúng việc làm hằng ngày.
//
// [2] NGƯỜI CHƯA KHAI CHỨC VỤ VẪN GHI ĐƯỢC. Một trường vừa cài xong chỉ có
//     một tài khoản quản trị; siết ngay lúc đó là không ai ghi nổi khoản thu
//     đầu tiên (Nguyên tắc số 1).
//
// [3] GHI SỔ HÀNG LOẠT KHÔNG ĐƯỢC ĐÒI TIỀN HAI LẦN. Bấm hai lần, mạng chập
//     chờn, hay chạy lại đợt vì nhớ nhầm — cả ba đều có thật. Máy bỏ qua bé
//     đã có đúng khoản ấy và NÓI RA đã bỏ qua mấy bé.
//
// [4] BẢNG SỔ TIỀN XẾP THEO TÊN, KHÔNG THEO TIỀN. Xếp các bé theo số còn nợ
//     là dựng thứ tự trên dưới giữa những đứa trẻ bằng hoàn cảnh của cha mẹ
//     chúng (QUY TẮC 4).
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hoc-phi-ghi-so');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi']);

// SÁU TÀI KHOẢN, mỗi tài khoản trả lời một câu khác nhau.
const mkQT = taoQuanTri(DIR, 'Quản trị chưa khai chức vụ', 'hp_qt');
const mkKT = taoQuanTri(DIR, 'Kế Toán', 'hp_kt');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'hp_vp');
const mkQL = taoQuanTri(DIR, 'Quản lý CS1', 'hp_ql');
const mkKT2 = taoQuanTri(DIR, 'Kế toán khoá CS1', 'hp_kt2');
datChucVu(DIR, 'hp_kt', 'ketoan');
datChucVu(DIR, 'hp_vp', 'vanphong-coso');
datChucVu(DIR, 'hp_ql', 'quanly-coso');
datChucVu(DIR, 'hp_kt2', 'ketoan');
khoaVaoCoSo(DIR, 'hp_vp', 'cs1');
khoaVaoCoSo(DIR, 'hp_ql', 'cs1');
khoaVaoCoSo(DIR, 'hp_kt2', 'cs1');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4803), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const khoan = (studentId, noiDung, soTien = 500000) => ({
  studentId, kyThu: 'Tháng 9/2026', noiDung, soTien, hanNop: '2026-09-10',
});
const dot = (pham, id, noiDung, soTien = 400000) => ({
  pham, id, kyThu: 'Tháng 9/2026', noiDung, soTien, hanNop: '2026-09-10',
});

try {
  const QT = await vao('hp_qt', mkQT);
  const KT = await vao('hp_kt', mkKT);
  const VP = await vao('hp_vp', mkVP);
  const QL = await vao('hp_ql', mkQL);
  const KT2 = await vao('hp_kt2', mkKT2);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Ai ĐẶT RA được một khoản tiền phải nộp');
  {
    const qt = await req('POST', '/api/hocphi', { cookie: QT, body: khoan('s1', 'QT ghi') });
    check('quản trị CHƯA KHAI CHỨC VỤ vẫn ghi được — trường vừa cài xong phải dùng được',
      qt.status === 201, `${qt.status} ${JSON.stringify(qt.data)}`);

    const kt = await req('POST', '/api/hocphi', { cookie: KT, body: khoan('s1', 'Kế toán ghi') });
    check('KẾ TOÁN ghi được — đúng phần việc', kt.status === 201, kt.status);

    const vp = await req('POST', '/api/hocphi', { cookie: VP, body: khoan('s1', 'Văn phòng ghi') });
    check('VĂN PHÒNG CƠ SỞ KHÔNG còn đặt được khoản thu', vp.status === 403, vp.status);
    check('và lời từ chối nói rõ việc đó của ai, không lộ thuật ngữ máy',
      /kế toán|ban giám hiệu/i.test(vp.data?.error || '')
      && !/role|admin|forbidden/i.test(vp.data?.error || ''), vp.data?.error);

    const ql = await req('POST', '/api/hocphi', { cookie: QL, body: khoan('s1', 'Quản lý cơ sở ghi') });
    check('QUẢN LÝ CƠ SỞ cũng không đặt được', ql.status === 403, ql.status);

    const co = await req('POST', '/api/hocphi', { cookie: GV, body: khoan('s1', 'Cô ghi') });
    check('CÔ vẫn không ghi được — y như Đ42', co.status === 403, co.status);
    const ph = await req('POST', '/api/hocphi', { cookie: PH, body: khoan('s1', 'Nhà ghi') });
    check('gia đình càng không', ph.status === 403, ph.status);
  }

  // =========================================================================
  console.log('\n[2] SIẾT GHI, KHÔNG SIẾT ĐỌC — việc hằng ngày của văn phòng còn nguyên');
  {
    const doc = await req('GET', '/api/hocphi?studentId=s1', { cookie: VP });
    check('văn phòng VẪN đọc được sổ tiền của bé cơ sở mình', doc.status === 200, doc.status);
    check('và thấy khoản kế toán vừa ghi',
      (doc.data?.khoan || []).some(k => k.noiDung === 'Kế toán ghi'),
      (doc.data?.khoan || []).map(k => k.noiDung));

    // Đường xác nhận đã nhận tiền là việc của bàn tiếp đón, không phải việc
    // của người đặt ra con số — tách hai người ra còn chặt hơn bản cũ.
    const chuaNop = (doc.data?.khoan || []).find(k => !k.daNop);
    const xn = await req('POST', `/api/hocphi/${chuaNop.id}/xac-nhan`, { cookie: VP, body: {} });
    check('văn phòng VẪN xác nhận được đã nhận tiền', xn.status === 200, `${xn.status} ${JSON.stringify(xn.data)}`);

    const doc2 = await req('GET', '/api/hocphi?studentId=s1', { cookie: QL });
    check('quản lý cơ sở cũng vẫn đọc được', doc2.status === 200, doc2.status);
    const docCo = await req('GET', '/api/hocphi?studentId=s1', { cookie: GV });
    check('cô vẫn đọc được sổ bé nhóm mình (Đ42 giữ nguyên)', docCo.status === 200, docCo.status);
  }

  // =========================================================================
  console.log('\n[3] Máy chủ NÓI RA quyền, màn hình không tự đoán theo vai');
  {
    const a = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('kế toán nhận taoDuoc = true', a.data?.quyen?.taoDuoc === true, a.data?.quyen);
    const b = await req('GET', '/api/hocphi?studentId=s1', { cookie: VP });
    check('văn phòng nhận taoDuoc = FALSE nhưng xacNhanDuoc = true',
      b.data?.quyen?.taoDuoc === false && b.data?.quyen?.xacNhanDuoc === true, b.data?.quyen);
    const c = await req('GET', '/api/hocphi?studentId=s1', { cookie: GV });
    check('cô nhận cả hai đều false', c.data?.quyen?.taoDuoc === false
      && c.data?.quyen?.xacNhanDuoc === false, c.data?.quyen);

    // Bỏ dòng chú thích trước khi soi: chú thích của chính bản vá có nhắc lại
    // câu cũ để kể vì sao nó sai, và soi cả chú thích thì bài canh bắt nhầm
    // đúng lời giải thích của bản vá.
    const v = fs.readFileSync(path.join(GOC, 'modules/hocphi/view.js'), 'utf8');
    const ma = v.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('màn hình KHÔNG còn tự kết luận quyền ghi từ vai đăng nhập',
      !/laVanPhong/.test(ma) && !/role === 'admin'/.test(ma), 'view.js');
    check('nút Tạo khoản nghe theo taoDuoc của máy chủ',
      /taoDuoc \? \{ action/.test(v), 'view.js');
    // Đối chứng: nếu bỏ phép kiểm trên thì phải còn một chỗ nào đó đọc quyen.
    check('đối chứng — view.js có đọc d.quyen thật', /d\.quyen/.test(v), 'view.js');
  }

  // =========================================================================
  console.log('\n[4] Ghi sổ CHO CẢ NHÓM một lượt, và không đòi tiền hai lần');
  {
    const cam = await req('POST', '/api/hocphi/hang-loat', { cookie: VP, body: dot('nhom', 'c1', 'VP ghi cả nhóm') });
    check('văn phòng không mở được đường ghi hàng loạt', cam.status === 403, cam.status);
    const camCo = await req('POST', '/api/hocphi/hang-loat', { cookie: GV, body: dot('nhom', 'c1', 'Cô ghi cả nhóm') });
    check('cô càng không', camCo.status === 403, camCo.status);

    const r = await req('POST', '/api/hocphi/hang-loat', { cookie: KT, body: dot('nhom', 'c1', 'Tiền ăn tháng 9') });
    check('kế toán ghi được cho cả nhóm', r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);
    check('và ghi cho NHIỀU HƠN MỘT bé — nếu chỉ một thì đường này vô nghĩa',
      r.data?.daTao > 1, r.data);
    check('không bỏ qua bé nào ở lượt đầu', r.data?.boQua === 0, r.data);

    // Bé của nhóm c1 phải có khoản ấy; bé nhóm khác thì không.
    const trong = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('bé trong nhóm nhận được khoản của đợt',
      (trong.data?.khoan || []).some(k => k.noiDung === 'Tiền ăn tháng 9'),
      (trong.data?.khoan || []).map(k => k.noiDung));
    const ngoai = await req('GET', '/api/hocphi?studentId=s2', { cookie: KT });
    check('bé NHÓM KHÁC không bị ghi lây',
      !(ngoai.data?.khoan || []).some(k => k.noiDung === 'Tiền ăn tháng 9'),
      (ngoai.data?.khoan || []).map(k => k.noiDung));

    // Chạy lại y hệt: không một dòng nào được tạo thêm.
    const lai = await req('POST', '/api/hocphi/hang-loat', { cookie: KT, body: dot('nhom', 'c1', 'Tiền ăn tháng 9') });
    check('CHẠY LẠI CÙNG MỘT ĐỢT KHÔNG TẠO THÊM DÒNG NÀO', lai.data?.daTao === 0, lai.data);
    check('và máy NÓI RA đã bỏ qua mấy bé, không im lặng',
      lai.data?.boQua === r.data?.daTao, { boQua: lai.data?.boQua, lanDau: r.data?.daTao });
    const sauLai = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('bé chỉ có ĐÚNG MỘT khoản mang tên ấy, không phải hai',
      (sauLai.data?.khoan || []).filter(k => k.noiDung === 'Tiền ăn tháng 9').length === 1,
      (sauLai.data?.khoan || []).filter(k => k.noiDung === 'Tiền ăn tháng 9').length);

    // Đối chứng: đổi nội dung thì vẫn ghi tiếp được — chứ không phải máy đã
    // khoá cứng nhóm này lại.
    const khac = await req('POST', '/api/hocphi/hang-loat', { cookie: KT, body: dot('nhom', 'c1', 'Tiền học tháng 9') });
    check('đối chứng — đổi nội dung thì ghi tiếp được bình thường', khac.data?.daTao > 0, khac.data);
  }

  // =========================================================================
  console.log('\n[4b] Chống ghi trùng phải chịu được hoa/thường và dấu cách thừa');
  {
    // LỖI RÀ SOÁT ĐỐI KHÁNG BẮT ĐƯỢC. Bản đầu so khớp chuỗi NGUYÊN VĂN, nên
    // "Tiền ăn tháng 9" và "Tiền ăn Tháng 9" là hai khoản khác nhau — cả trường
    // bị đòi tiền hai lần chỉ vì một chữ hoa, hay một dấu cách thừa lúc dán từ
    // Excel. Đó đúng là cảnh mà chú thích ở đầu đường ấy hứa sẽ chặn.
    const r1 = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT, body: { pham: 'nhom', id: 'c4', kyThu: 'Tháng 10/2026', noiDung: 'Tiền ăn tháng 10', soTien: 300000 },
    });
    check('ghi được đợt đầu', r1.data?.daTao > 0, r1.data);

    const hoa = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT, body: { pham: 'nhom', id: 'c4', kyThu: 'Tháng 10/2026', noiDung: 'Tiền ăn Tháng 10', soTien: 300000 },
    });
    check('ĐỔI MỘT CHỮ HOA vẫn bị coi là trùng — không đòi tiền hai lần',
      hoa.data?.daTao === 0 && hoa.data?.boQua === r1.data?.daTao, hoa.data);

    const cach = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT, body: { pham: 'nhom', id: 'c4', kyThu: ' Tháng  10/2026 ', noiDung: 'tiền ăn   tháng 10', soTien: 300000 },
    });
    check('dấu cách thừa và viết thường cũng vậy', cach.data?.daTao === 0, cach.data);

    // Nhưng chữ KHÁC THẬT thì vẫn ghi được — không siết tới mức nhầm hai khoản
    // khác nhau thành một.
    const khac = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT, body: { pham: 'nhom', id: 'c4', kyThu: 'Tháng 10/2026', noiDung: 'Tiền học tháng 10', soTien: 300000 },
    });
    check('đối chứng — nội dung KHÁC THẬT thì vẫn ghi được bình thường', khac.data?.daTao > 0, khac.data);

    // Và chữ GHI XUỐNG SỔ vẫn là chữ kế toán đã gõ, không bị chuẩn hoá theo.
    const be = await req('GET', '/api/hocphi?studentId=s9', { cookie: KT });
    check('chữ ghi xuống sổ giữ nguyên như kế toán gõ, không bị viết thường đi',
      (be.data?.khoan || []).some(k => k.noiDung === 'Tiền ăn tháng 10'),
      (be.data?.khoan || []).map(k => k.noiDung));
  }

  // =========================================================================
  console.log('\n[5] Tầng cơ sở — đợt ghi sổ không lấn sang cơ sở khác');
  {
    const ok = await req('POST', '/api/hocphi/hang-loat', { cookie: KT2, body: dot('coso', 'cs1', 'KT cơ sở mình') });
    check('kế toán khoá ở cơ sở 1 ghi được cho chính cơ sở 1',
      ok.status === 201 && ok.data?.daTao > 0, `${ok.status} ${JSON.stringify(ok.data)}`);

    const lan = await req('POST', '/api/hocphi/hang-loat', { cookie: KT2, body: dot('coso', 'cs2', 'KT ghi lấn') });
    check('nhưng KHÔNG ghi được cho cơ sở 2', lan.status === 403, `${lan.status} ${JSON.stringify(lan.data)}`);
    check('và máy nói thẳng là ngoài phạm vi, không lặng lẽ báo "xong" cho 0 bé',
      /ngoài phạm vi/i.test(lan.data?.error || ''), lan.data?.error);

    // c3 "Mầm 1" là nhóm DUY NHẤT của cơ sở 2 trong dữ liệu mẫu; c2 "Lá 1"
    // nằm ở cơ sở 1 nên dùng nó thì phép kiểm này đo nhầm (và xanh sai chiều).
    const lanNhom = await req('POST', '/api/hocphi/hang-loat', { cookie: KT2, body: dot('nhom', 'c3', 'KT ghi lấn nhóm') });
    check('nhóm của cơ sở khác cũng bị chặn',
      lanNhom.status === 403 || lanNhom.status === 404, lanNhom.status);

    const bay = await req('POST', '/api/hocphi/hang-loat', { cookie: KT, body: dot('nhom', 'khong-co-that', 'Nhóm ma') });
    check('mã nhóm bịa thì trả 404, không phải lỗi máy chủ', bay.status === 404, bay.status);

    const thieu = await req('POST', '/api/hocphi/hang-loat', { cookie: KT, body: { pham: 'nhom', id: 'c1' } });
    check('thiếu kỳ thu / nội dung / số tiền thì từ chối bằng tiếng Việt',
      thieu.status === 400 && /kỳ thu|nội dung|số tiền/i.test(thieu.data?.error || ''), thieu.data?.error);
    const phamSai = await req('POST', '/api/hocphi/hang-loat', { cookie: KT, body: dot('ca-nuoc', '', 'Sai phạm vi') });
    check('phạm vi lạ thì từ chối', phamSai.status === 400, phamSai.status);
  }

  // =========================================================================
  console.log('\n[6] Bảng sổ tiền gom theo cơ sở → nhóm → bé (QUY TẮC 4)');
  {
    const b = await req('GET', '/api/hocphi/bang', { cookie: KT });
    check('kế toán mở được bảng', b.status === 200 && Array.isArray(b.data?.bang), b.status);
    check('bảng có ít nhất một cơ sở và một nhóm có bé',
      (b.data.bang || []).some(cs => (cs.nhom || []).some(n => (n.be || []).length)), (b.data.bang || []).length);

    const tenCoSo = (b.data.bang || []).map(x => x.ten);
    const xepCoSo = [...tenCoSo].sort((x, y) => String(x).localeCompare(String(y), 'vi'));
    check('CƠ SỞ xếp theo TÊN', JSON.stringify(tenCoSo) === JSON.stringify(xepCoSo), tenCoSo);

    const beDau = (b.data.bang || []).flatMap(cs => cs.nhom).find(n => (n.be || []).length > 1);
    if (beDau) {
      const ten = beDau.be.map(x => x.ten);
      const xep = [...ten].sort((x, y) => String(x).localeCompare(String(y), 'vi'));
      check('BÉ trong nhóm xếp theo TÊN, không xếp theo số tiền còn nợ',
        JSON.stringify(ten) === JSON.stringify(xep), ten);
      // Đối chứng: phải có bé lệch số tiền, nếu không phép so trên vô nghĩa.
      check('đối chứng — các bé KHÔNG cùng số tiền còn nợ, nên phép so trên có nghĩa',
        new Set(beDau.be.map(x => x.tienChuaNop)).size > 1, beDau.be.map(x => x.tienChuaNop));
    } else {
      check('dựng được một nhóm có từ hai bé trở lên để so thứ tự', false, 'không có nhóm nào ≥ 2 bé');
    }

    const tho = JSON.stringify(b.data);
    check('bảng KHÔNG trả về phần trăm hay tỉ lệ nào (QUY TẮC 4)',
      !/phanTram|tiLe|percent|ratio/i.test(tho) && !/\d\s*%/.test(tho), tho.slice(0, 160));

    const cs1 = await req('GET', '/api/hocphi/bang', { cookie: QL });
    check('quản lý cơ sở 1 CHỈ thấy cơ sở mình',
      (cs1.data?.bang || []).length === 1, (cs1.data?.bang || []).map(x => x.ten));
    check('và ít hơn bảng của kế toán toàn trường',
      (cs1.data?.bang || []).length < (b.data.bang || []).length,
      { cs1: (cs1.data?.bang || []).length, kt: (b.data.bang || []).length });
    check('bảng nói cho màn hình biết tài khoản này có đặt được khoản thu không',
      cs1.data?.taoDuoc === false && b.data?.taoDuoc === true,
      { ql: cs1.data?.taoDuoc, kt: b.data?.taoDuoc });

    const co = await req('GET', '/api/hocphi/bang', { cookie: GV });
    check('CÔ không mở được bảng cả trường', co.status === 403, co.status);
    const ph = await req('GET', '/api/hocphi/bang', { cookie: PH });
    check('gia đình càng không', ph.status === 403, ph.status);

    const loc = await req('GET', '/api/hocphi/bang?kyThu=Th%C3%A1ng%209%2F2026', { cookie: KT });
    check('lọc theo kỳ thu chạy được', loc.status === 200, loc.status);
    check('và máy gợi ý sẵn danh sách kỳ thu có thật, khỏi gõ tay',
      (loc.data?.kyThuCo || []).includes('Tháng 9/2026'), loc.data?.kyThuCo);
  }

  // =========================================================================
  console.log('\n[6b] BÉ ĐANG HỌC MÀ CHƯA XẾP NHÓM KHÔNG ĐƯỢC BIẾN MẤT KHỎI SỔ TIỀN');
  {
    // LỖI RÀ SOÁT ĐỐI KHÁNG BẮT ĐƯỢC, ba người phản bác đều xác nhận.
    //
    // Cả đợt ghi sổ lẫn bảng sổ tiền đều đi vòng qua nhóm lớp
    // (`nhomCuaToi` → `beCuaNhom`), nên bé chưa xếp nhóm rơi ra khỏi CẢ HAI mà
    // không một dòng nào báo. Bé ấy không bao giờ được ghi một khoản nào, và
    // cũng không hiện ở bảng để ai đó nhận ra là thiếu — nhà đi học suốt một
    // tháng rồi mới có người hỏi ra.
    //
    // Trạng thái này có thật ở hai đường: bé vừa nhận vào trường mà chưa xếp
    // nhóm, và bé của một nhóm vừa đóng cuối năm học.
    const conn = new Database(CSDL);
    conn.prepare(`INSERT INTO students (id, code, name, dob, gender, classId, active, createdAt)
                  VALUES ('s_treo', 'TREO', 'Bé Chưa Xếp Nhóm', '2023-05-05', 'Nữ', NULL, 1, ?)`)
      .run(new Date().toISOString());
    conn.close();

    const b = await req('GET', '/api/hocphi/bang', { cookie: KT });
    const the = (b.data?.bang || []).find(x => x.ten === 'Chưa xếp nhóm');
    check('bảng sổ tiền có thẻ "Chưa xếp nhóm" khi trường thật sự có bé như vậy', !!the,
      (b.data?.bang || []).map(x => x.ten));
    check('và bé ấy nằm trong đó',
      !!the && the.nhom.some(n => (n.be || []).some(x => x.id === 's_treo')),
      the && the.nhom.map(n => n.be.map(x => x.id)));
    check('thẻ ấy LUÔN Ở CUỐI, không xếp lẫn giữa các cơ sở',
      (b.data?.bang || []).at(-1)?.ten === 'Chưa xếp nhóm',
      (b.data?.bang || []).map(x => x.ten));

    // Và ghi sổ "cả trường" phải chạm tới bé ấy.
    const dot = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT,
      body: { pham: 'truong', kyThu: 'Tháng 12/2026', noiDung: 'Tiền ăn tháng 12', soTien: 800000 },
    });
    check('ghi sổ cả trường chạy được', dot.status === 201, `${dot.status} ${JSON.stringify(dot.data)}`);
    const so = await req('GET', '/api/hocphi?studentId=s_treo', { cookie: KT });
    check('BÉ CHƯA XẾP NHÓM CŨNG ĐƯỢC GHI KHOẢN trong đợt "cả trường"',
      (so.data?.khoan || []).some(k => k.noiDung === 'Tiền ăn tháng 12'),
      (so.data?.khoan || []).map(k => k.noiDung));

    // Nhưng chọn MỘT NHÓM thì chỉ là nhóm ấy — không kèm bé không thuộc chỗ nào.
    const dotNhom = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT,
      body: { pham: 'nhom', id: 'c1', kyThu: 'Tháng 12/2026', noiDung: 'Phí riêng nhóm c1', soTien: 100000 },
    });
    check('ghi sổ cho MỘT nhóm chạy được', dotNhom.status === 201, dotNhom.status);
    const so2 = await req('GET', '/api/hocphi?studentId=s_treo', { cookie: KT });
    check('và bé chưa xếp nhóm KHÔNG bị kéo vào đợt của một nhóm cụ thể',
      !(so2.data?.khoan || []).some(k => k.noiDung === 'Phí riêng nhóm c1'),
      (so2.data?.khoan || []).map(k => k.noiDung));

    // TẦNG CƠ SỞ KHÔNG ĐỔI: bé chưa xếp nhóm không thuộc cơ sở nào, nên Cấp 3
    // vẫn không thấy — đúng như `db.canAccessStudent` vẫn trả lời từ trước.
    const cs1 = await req('GET', '/api/hocphi/bang', { cookie: QL });
    check('quản lý cơ sở KHÔNG thấy thẻ "Chưa xếp nhóm" — bé ấy không thuộc cơ sở nào',
      !(cs1.data?.bang || []).some(x => x.ten === 'Chưa xếp nhóm'),
      (cs1.data?.bang || []).map(x => x.ten));
    const xem = await req('GET', '/api/hocphi?studentId=s_treo', { cookie: QL });
    check('và cũng không đọc được sổ tiền của bé ấy', xem.status === 403, xem.status);
  }

  // =========================================================================
  console.log('\n[6c] Huy hiệu "Đủ" và danh sách kỳ thu — hai chỗ nói dối được');
  {
    // (1) "ĐỦ" LÀ MỘT LỜI KHẲNG ĐỊNH, KHÔNG PHẢI Ô TRỐNG TÔ XANH.
    //
    // Bé chưa hề có khoản nào rơi vào nhánh "không còn nợ" và nhận đúng cái
    // huy hiệu xanh như bé đã nộp đủ. Ở bảng tiền thì đó là chỗ nguy nhất: bé
    // bị sót khỏi đợt ghi sổ trông y hệt bé đã nộp xong.
    const v = fs.readFileSync(path.join(GOC, 'modules/hocphi/view.js'), 'utf8')
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('màn hình chỉ gắn huy hiệu "Đủ" khi bé THẬT SỰ có khoản đã nộp',
      /b\.daNop \? UI\.badge\('Đủ', 'green'\)/.test(v), 'view.js');
    check('và bé chưa có khoản nào thì nói thẳng là chưa ghi khoản nào',
      /Chưa ghi khoản nào/.test(v), 'view.js');

    // (2) DANH SÁCH KỲ THU CŨNG PHẢI NẰM TRONG PHẠM VI. Kỳ thu là CHỮ TỰ DO kế
    // toán gõ, nên nó mang thông tin của một cơ sở ra ngoài phạm vi cơ sở đó.
    const rieng = 'Tháng 12/2026 — chỉ cơ sở 2 nội bộ';
    const c3 = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT, body: { pham: 'nhom', id: 'c1', kyThu: rieng, noiDung: 'Phí nội bộ', soTien: 50000 },
    });
    check('dựng được một kỳ thu chỉ có ở cơ sở 1', c3.status === 201, c3.status);

    const bKT = await req('GET', '/api/hocphi/bang', { cookie: KT });
    check('đối chứng — kế toán toàn trường VẪN thấy kỳ thu ấy',
      (bKT.data?.kyThuCo || []).includes(rieng), bKT.data?.kyThuCo);

    // hp_kt2 là kế toán bị khoá vào cơ sở 1 — cùng cơ sở nên vẫn thấy.
    // Còn tài khoản của MỘT CƠ SỞ KHÁC thì không được thấy chữ ấy.
    const mkKT3 = taoQuanTri(DIR, 'Kế toán khoá CS2', 'hp_kt3');
    datChucVu(DIR, 'hp_kt3', 'ketoan');
    khoaVaoCoSo(DIR, 'hp_kt3', 'cs2');
    await sv.khoiDongLai();
    const KT3 = await vao('hp_kt3', mkKT3);
    const bKT3 = await req('GET', '/api/hocphi/bang', { cookie: KT3 });
    check('kế toán cơ sở 2 KHÔNG đọc được chữ kế toán cơ sở 1 gõ vào ô kỳ thu',
      !(bKT3.data?.kyThuCo || []).includes(rieng), bKT3.data?.kyThuCo);
  }

  // =========================================================================
  console.log('\n[6d] ĐƯỜNG MỘT BÉ CŨNG KHÔNG ĐƯỢC ĐÒI TIỀN HAI LẦN');
  {
    // Đường ghi sổ HÀNG LOẠT có bước chống ghi trùng từ đầu, và chú thích của
    // chính nó gọi đó là "phần quan trọng nhất của đường này": mạng chập chờn,
    // bấm hai lần, hay chạy lại vì nhớ nhầm — cả ba đều dẫn tới một nhà bị đòi
    // tiền hai lần. Lập luận ấy đúng y nguyên cho đường MỘT BÉ, mà đường một bé
    // thì trước đợt Đ175 ghi thẳng, không hỏi gì cả.
    const than = { studentId: 's3', kyThu: 'Tháng 10/2026', noiDung: 'Tiền ăn tháng 10', soTien: 600000 };

    const lan1 = await req('POST', '/api/hocphi', { cookie: KT, body: than });
    check('ghi được khoản lần đầu', lan1.status === 201, `${lan1.status} ${JSON.stringify(lan1.data)}`);

    const lan2 = await req('POST', '/api/hocphi', { cookie: KT, body: than });
    check('LẦN HAI MÁY HỎI LẠI chứ không ghi ngay', lan2.status === 409, lan2.status);
    check('và nói rõ khoản đã có là khoản nào, bao nhiêu tiền',
      /Tiền ăn tháng 10/.test(lan2.data?.error || '') && /600.000/.test(lan2.data?.error || ''),
      lan2.data?.error);
    check('kèm luôn dòng đã có để màn hình khỏi phải đi tra lại',
      lan2.data?.khoanDaCo?.id === lan1.data?.id, lan2.data?.khoanDaCo);

    const demSau2 = (await req('GET', '/api/hocphi?studentId=s3', { cookie: KT }))
      .data?.khoan?.filter(k => k.noiDung === 'Tiền ăn tháng 10').length;
    check('CHƯA XÁC NHẬN THÌ KHÔNG GHI THÊM DÒNG NÀO', demSau2 === 1, demSau2);

    // CHUẨN HOÁ KHI SO: một chữ hoa hay một dấu cách thừa lúc dán từ Excel
    // không được biến một khoản thành hai.
    const hoaThuong = await req('POST', '/api/hocphi', {
      cookie: KT,
      body: { ...than, kyThu: '  tháng 10/2026 ', noiDung: 'TIỀN  ĂN   Tháng 10' },
    });
    check('khác chữ hoa và dấu cách vẫn bị nhận ra là TRÙNG', hoaThuong.status === 409, hoaThuong.status);
    check('đúng cùng một luật so với đường ghi sổ hàng loạt',
      /const chuanHoa = /.test(fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8')
        .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n').split('app.post')[0]),
      'chuanHoa phải nằm ngoài thân hàm, dùng chung cho cả hai đường');

    // HỎI LẠI CHỨ KHÔNG CẤM — hai đợt dã ngoại cùng tên trong một kỳ là có thật.
    const xacNhan = await req('POST', '/api/hocphi', {
      cookie: KT, body: { ...than, xacNhanTrung: true },
    });
    check('xác nhận rồi thì ghi được — máy không quyết thay kế toán', xacNhan.status === 201, xacNhan.status);
    const demSau3 = (await req('GET', '/api/hocphi?studentId=s3', { cookie: KT }))
      .data?.khoan?.filter(k => k.noiDung === 'Tiền ăn tháng 10').length;
    check('và bây giờ mới có hai dòng', demSau3 === 2, demSau3);

    // ĐỐI CHỨNG — siết đúng chỗ, không siết lan.
    const khac = await req('POST', '/api/hocphi', {
      cookie: KT, body: { ...than, noiDung: 'Tiền dã ngoại tháng 10' },
    });
    check('đối chứng — nội dung KHÁC thì ghi thẳng, không hỏi han gì', khac.status === 201, khac.status);
    const beKhac = await req('POST', '/api/hocphi', { cookie: KT, body: { ...than, studentId: 's4' } });
    check('đối chứng — BÉ KHÁC cùng nội dung ấy cũng ghi thẳng', beKhac.status === 201, beKhac.status);

    // KHOẢN ĐÃ THU HỒI KHÔNG CHẶN LẦN GHI SAU — thu hồi là "ghi nhầm, bỏ đi",
    // nên ghi lại đúng khoản ấy phải trơn tru, không phải trèo qua một câu hỏi.
    const thu = await req('POST', `/api/hocphi/${khac.data.id}/thu-hoi`, {
      cookie: KT, body: { lyDo: 'ghi nhầm bé' },
    });
    check('thu hồi được một khoản', thu.status === 200, `${thu.status} ${JSON.stringify(thu.data)}`);
    const ghiLai = await req('POST', '/api/hocphi', {
      cookie: KT, body: { ...than, noiDung: 'Tiền dã ngoại tháng 10' },
    });
    check('KHOẢN ĐÃ THU HỒI KHÔNG chặn lần ghi sau — thu hồi là ngưng dùng, không phải cấm ghi lại',
      ghiLai.status === 201, ghiLai.status);
  }

  // =========================================================================
  console.log('\n[7] Nguyên tắc số 1 — thứ đang chạy vẫn chạy y như cũ');
  {
    const nha = await req('GET', '/api/hocphi?studentId=s1', { cookie: PH });
    check('gia đình vẫn mở được sổ của con mình', nha.status === 200, nha.status);
    check('và tổng còn phải nộp là một con số', typeof nha.data?.tongChuaNop === 'number', nha.data?.tongChuaNop);
    const nhaKhac = await req('GET', '/api/hocphi?studentId=s3', { cookie: PH });
    check('gia đình vẫn KHÔNG mở được sổ nhà khác', nhaKhac.status === 403, nhaKhac.status);

    // Thu hồi vẫn chạy, và khoản đã thu hồi vẫn biến khỏi mọi danh sách —
    // kể cả khỏi bảng mới.
    const ds = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    const chuaNop = (ds.data?.khoan || []).find(k => !k.daNop);
    const th = await req('POST', `/api/hocphi/${chuaNop.id}/thu-hoi`, { cookie: KT, body: { lyDo: 'ghi nhầm' } });
    check('thu hồi một khoản vẫn chạy', th.status === 200, `${th.status} ${JSON.stringify(th.data)}`);
    const sau = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('khoản đã thu hồi biến khỏi sổ của bé',
      !(sau.data?.khoan || []).some(k => k.id === chuaNop.id), chuaNop.id);

    // Và đợt ghi hàng loạt coi nó như KHÔNG CÓ: bé ấy được ghi lại.
    const lai = await req('POST', '/api/hocphi/hang-loat', {
      cookie: KT, body: dot('nhom', 'c1', chuaNop.noiDung, chuaNop.soTien),
    });
    check('bé có khoản ĐÃ THU HỒI thì đợt sau ghi lại được cho bé ấy — thu hồi là ngưng dùng, không phải cấm ghi lại',
      lai.data?.daTao >= 1, lai.data);
  }
  // =========================================================================
  console.log('\n[8] MỌI đường ghi của phân hệ đều có chốt chặn — đếm đúng chiều');
  {
    // VÌ SAO MỤC NÀY TỒN TẠI.
    //
    // `test/hoc-phi.test.mjs` có một bản kiểm kê đếm số lần `requireRole` xuất
    // hiện trong tệp và đòi đúng một con số. Phép đếm ấy chỉ đỏ khi ai đó thêm
    // một đường CÓ chốt chặn — trường hợp vô hại. Thêm một đường ghi mà QUÊN
    // chốt chặn thì con số không đổi và bài kia vẫn xanh, mà đó mới đúng là
    // trường hợp làm lộ sổ tiền. Mục này soi ngược lại: đi từ TỪNG ĐƯỜNG GHI
    // rồi đòi mỗi đường phải có chốt chặn.
    const src = fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8');
    const dong = src.split('\n');
    const duongGhi = [];
    dong.forEach((d, i) => {
      const m = d.match(/app\.(post|put|patch|delete)\(\s*'([^']+)'/);
      if (m) duongGhi.push({ ph: m[1], duong: m[2], dong: i + 1, noiDung: d });
    });
    check('tìm thấy đủ các đường GHI của phân hệ (≥ 5)', duongGhi.length >= 5,
      duongGhi.map(x => `${x.ph} ${x.duong}`));

    const hoDong = duongGhi.filter(x => !/requireRole\('admin'\)/.test(x.noiDung));
    check('MỌI đường ghi đều đòi vai ngay trên chính dòng khai báo',
      hoDong.length === 0, hoDong.map(x => `${x.duong} (dòng ${x.dong})`));

    // Và hai đường ĐẶT RA khoản thu còn phải qua chốt chặn thứ hai.
    const than = src;
    // Bốn đường: tạo một khoản, ghi sổ hàng loạt, đặt ưu đãi, gỡ ưu đãi (Đ169).
    // Cả bốn đều là quyết định về số tiền một nhà phải nộp, chỉ khác dấu.
    //
    // Đếm CHỖ GỌI, không đếm cả dòng khai báo hàm — nếu không thì con số luôn
    // dư đúng một và phép kiểm đo nhầm thứ mình không định đo.
    check('cả BỐN đường quyết định về tiền đều gọi chốt chặn chức vụ',
      (than.match(/if \(chiNguoiLoTien\(req, res\)\) return;/g) || []).length === 4,
      (than.match(/.*chiNguoiLoTien.*/g) || []));
    check('và chốt chặn ấy hỏi đúng db.taoKhoanThuDuoc, không tự dựng luật riêng',
      /db\.taoKhoanThuDuoc\(req\.user\)/.test(than), 'routes.js');

    // PHÉP THỬ NGƯỢC — dựng một tệp giả có một đường ghi quên chốt chặn, rồi
    // chạy đúng cách dò trên nó. Không có bước này thì mục trên có thể đang
    // xanh vì cách dò không bắt được gì cả.
    const gia = `app.post('/api/hocphi/quen', (req, res) => {});`;
    const dongGia = gia.split('\n');
    const timGia = [];
    dongGia.forEach((d, i) => {
      const m = d.match(/app\.(post|put|patch|delete)\(\s*'([^']+)'/);
      if (m) timGia.push({ duong: m[2], noiDung: d, dong: i + 1 });
    });
    check('phép thử ngược — cách dò này BẮT ĐƯỢC một đường ghi quên chốt chặn',
      timGia.length === 1 && !/requireRole\('admin'\)/.test(timGia[0].noiDung), timGia);
  }

} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Ai đặt ra khoản thu, và ghi sổ cả nhóm (Đ163)');
