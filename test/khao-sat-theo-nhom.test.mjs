// KHẢO SÁT THEO NHÓM (Đ119) — gửi riêng một nhóm thì CHỈ nhóm đó nhận.
//
// Chạy bằng:  npm run test:khao-sat-theo-nhom
//
// VÌ SAO CÓ BÀI NÀY
//
// Trước Đ119, POST /api/surveys ghi cứng `audience: 'all'`: cô tạo khảo sát
// cho nhóm mình mà cả ba cơ sở nhận được. Tầng ĐỌC (visibleTo, huy hiệu) thì
// đã biết lọc theo cột `audience` từ lâu — nghĩa là chỉ cần đường TẠO ghi
// nhầm một lần nữa là mọi phép lọc phía dưới thành trang trí. Bài này canh
// trọn đường đi: tạo đúng phạm vi → nhà ngoài phạm vi không thấy, không mở
// được, không trả lời được, và huy hiệu không đếm.
//
// Luật ai-tạo-được-cho-nhóm-nào mượn nguyên của Thông báo (test/thong-bao-
// pham-vi.test.mjs canh phía đó): cô → nhóm mình; văn phòng → nhóm trong cơ
// sở mình.
import fs from 'fs';
import path from 'path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, GOC,
} from './_chung.mjs';

const DIR = thuMucTam('khao-sat-theo-nhom');
sinhDuLieu(DIR);

const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS2 = taoQuanTri(DIR, 'Quản Lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4150), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

const bgh = await login('hieutruong', mkBGH);
const qlCS2 = await login('quanly2', mkCS2);
const gv = await login('giaovien', '123456');    // cô t1 — MỘT nhóm (c1)
const gv2 = await login('giaovien2', '123456');  // cô t2 — nhóm c2
const gv3 = await login('giaovien3', '123456');  // cô t3 — HAI nhóm (c1 + c2)
const phC1 = await login('phuhuynh', '123456');  // p1 — có con ở c1 (bé s1)
const phC4 = await login('ph.trang', '123456');  // p7 — chỉ có con ở c4 (bé s9)

const CAU_HOI = [{ text: 'Nhà mình tham gia được không ạ?', type: 'choice', options: ['Có', 'Không'] }];
const tao = (cookie, them = {}) => req('POST', '/api/surveys', {
  cookie,
  body: { title: 'Dã ngoại nhóm mình', description: '', deadline: '2030-01-01', questions: CAU_HOI, ...them },
});
const huyHieu = async (cookie) =>
  (await req('GET', '/api/dashboard/badges', { cookie })).data?.khaosat || 0;

// ===========================================================================
console.log('\n[1] Cô tạo khảo sát cho NHÓM MÌNH');
{
  // Đo huy hiệu TRƯỚC khi tạo, để mục [3] so bằng hiệu số — không phụ thuộc
  // dữ liệu mẫu đang có sẵn bao nhiêu khảo sát.
  const truocC1 = await huyHieu(phC1.cookie);
  const truocC4 = await huyHieu(phC4.cookie);

  const r = await tao(gv.cookie, { audience: 'class' });
  check('CÔ MỘT NHÓM tạo cho "Nhóm mình" không cần chọn gì → 201', r.status === 201, r.data);
  check('phạm vi ghi ĐÚNG MÃ NHÓM của cô, không phải toàn trường',
    r.data?.audience === 'c1', r.data?.audience);
  check('kèm tên nhóm cho màn hình ghi rõ', r.data?.tenNhom === 'Chồi 2', r.data?.tenNhom);

  // Giữ lại cho các mục sau.
  globalThis.KS_C1 = r.data?.id;
  globalThis.HH_TRUOC_C1 = truocC1;
  globalThis.HH_TRUOC_C4 = truocC4;

  const thieu = await tao(gv3.cookie, { audience: 'class' });
  check('cô HAI NHÓM không nói rõ nhóm nào thì được NHẮC CHỌN, không đoán hộ',
    thieu.status === 400 && /chọn nhóm/i.test(thieu.data?.error || ''), thieu.data);

  const chon = await tao(gv3.cookie, { audience: 'class', classId: 'c2' });
  check('cô hai nhóm chọn rõ nhóm thì tạo được', chon.status === 201 && chon.data?.audience === 'c2', chon.data);
  globalThis.KS_C2 = chon.data?.id;

  const ngoai = await tao(gv.cookie, { audience: 'class', classId: 'c2' });
  check('CÔ KHÔNG GỬI ĐƯỢC CHO NHÓM MÌNH KHÔNG PHỤ TRÁCH', ngoai.status === 400 || ngoai.status === 403, ngoai.status);
}

// ===========================================================================
console.log('\n[2] Nhà NGOÀI phạm vi: không thấy, không mở được, không trả lời được');
{
  const ks = globalThis.KS_C1;

  const dsC1 = await req('GET', '/api/surveys', { cookie: phC1.cookie });
  check('nhà có con ở c1 THẤY khảo sát của nhóm c1',
    (dsC1.data || []).some(x => x.id === ks), (dsC1.data || []).map(x => x.id));
  check('và thẻ khảo sát mang tên nhóm để nhà hai con biết phiếu hỏi về bé nào',
    (dsC1.data || []).find(x => x.id === ks)?.tenNhom === 'Chồi 2');

  const dsC4 = await req('GET', '/api/surveys', { cookie: phC4.cookie });
  check('PHÉP KIỂM QUAN TRỌNG NHẤT: nhà KHÔNG có con ở c1 không thấy nó trong danh sách',
    !(dsC4.data || []).some(x => x.id === ks), (dsC4.data || []).map(x => x.id));

  const mo = await req('GET', `/api/surveys/${ks}`, { cookie: phC4.cookie });
  check('gõ thẳng địa chỉ cũng không mở được — lọc ở máy chủ, không phải giấu nút',
    mo.status === 404, mo.status);

  const trảLời = await req('POST', `/api/surveys/${ks}/respond`, {
    cookie: phC4.cookie, body: { answers: { q1: 'Có' } },
  });
  check('và không nhét được câu trả lời vào', trảLời.status === 404, trảLời.status);

  const cuaC1 = await req('POST', `/api/surveys/${ks}/respond`, {
    cookie: phC1.cookie, body: { answers: { q1: 'Có' } },
  });
  check('còn nhà trong nhóm thì trả lời bình thường', cuaC1.status === 201, cuaC1.data);
}

// ===========================================================================
console.log('\n[3] Huy hiệu đếm ĐÚNG PHẠM VI — con số về 0 được');
{
  // Sau mục [1]-[2]: nhà c1 đã TRẢ LỜI khảo sát c1 (nên nó không còn tính),
  // nhưng khảo sát c2 thì nhà này cũng có con ở c2 (bé s2) → +1.
  const sauC1 = await huyHieu(phC1.cookie);
  check('huy hiệu của nhà c1+c2: thêm đúng 1 (khảo sát c2 chưa trả lời; bản c1 đã trả lời rồi)',
    sauC1 === globalThis.HH_TRUOC_C1 + 1, { truoc: globalThis.HH_TRUOC_C1, sau: sauC1 });

  const sauC4 = await huyHieu(phC4.cookie);
  check('HUY HIỆU CỦA NHÀ NGOÀI PHẠM VI KHÔNG NHÍCH — không có con số không bao giờ về 0',
    sauC4 === globalThis.HH_TRUOC_C4, { truoc: globalThis.HH_TRUOC_C4, sau: sauC4 });
}

// ===========================================================================
console.log('\n[4] Cô nhóm khác và các vai quản trị');
{
  const ks = globalThis.KS_C1;

  const cuaGv2 = await req('GET', '/api/surveys', { cookie: gv2.cookie });
  check('cô nhóm c2 không thấy khảo sát riêng của nhóm c1',
    !(cuaGv2.data || []).some(x => x.id === ks));

  const cuaGv3 = await req('GET', '/api/surveys', { cookie: gv3.cookie });
  check('cô phụ CẢ HAI nhóm thì thấy', (cuaGv3.data || []).some(x => x.id === ks));

  const cuaBgh = await req('GET', '/api/surveys', { cookie: bgh.cookie });
  check('ban giám hiệu thấy — phạm vi của Cấp 1 là cả trường',
    (cuaBgh.data || []).some(x => x.id === ks));

  const cuaCS2 = await req('GET', '/api/surveys', { cookie: qlCS2.cookie });
  check('quản lý CƠ SỞ 2 không thấy khảo sát của nhóm cơ sở 1',
    !(cuaCS2.data || []).some(x => x.id === ks));

  const bghTao = await tao(bgh.cookie, { audience: 'class', classId: 'c1' });
  check('ban giám hiệu tạo được khảo sát cho một nhóm', bghTao.status === 201 && bghTao.data?.audience === 'c1', bghTao.data);

  const bghThieu = await tao(bgh.cookie, { audience: 'class' });
  check('quản trị không chọn nhóm thì được nhắc chọn',
    bghThieu.status === 400 && /chọn nhóm/i.test(bghThieu.data?.error || ''), bghThieu.data);

  const cs2Tao = await tao(qlCS2.cookie, { audience: 'class', classId: 'c1' });
  check('QUẢN LÝ CƠ SỞ 2 KHÔNG TẠO ĐƯỢC CHO NHÓM CƠ SỞ 1', cs2Tao.status === 403, cs2Tao.status);
}

// ===========================================================================
console.log('\n[5] App đời cũ và đầu vào lạ');
{
  const cu = await tao(gv.cookie);   // không gửi audience — như app trước Đ119
  check('app cũ không gửi phạm vi thì giữ nghĩa cũ: toàn trường',
    cu.status === 201 && cu.data?.audience === 'all', cu.data);
  check('khảo sát toàn trường không mang tên nhóm', !cu.data?.tenNhom, cu.data?.tenNhom);

  const la = await tao(gv.cookie, { audience: 'c1' });
  check('nhét thẳng mã nhóm vào ô phạm vi thì bị từ chối — chỉ nhận all/class',
    la.status === 400, la.status);

  const dsC4 = await req('GET', '/api/surveys', { cookie: phC4.cookie });
  check('khảo sát toàn trường thì nhà nào cũng thấy — kể cả nhà chỉ có con nhà trẻ',
    (dsC4.data || []).some(x => x.id === cu.data?.id));
}

// ===========================================================================
console.log('\n[6] Đóng khảo sát: người tạo, quản trị trong phạm vi — Cấp 3 không với sang cơ sở khác');
{
  const ks = globalThis.KS_C1;   // khảo sát của nhóm c1 (cơ sở 1), cô Mai Anh tạo
  const cs2 = await req('POST', `/api/surveys/${ks}/close`, { cookie: qlCS2.cookie });
  check('QUẢN LÝ CƠ SỞ 2 KHÔNG ĐÓNG ĐƯỢC khảo sát nhóm của cơ sở 1', cs2.status === 403, cs2.status);
  const conMo = await req('GET', `/api/surveys/${ks}`, { cookie: gv.cookie });
  check('và khảo sát vẫn đang mở', conMo.data?.status === 'open', conMo.data?.status);

  const gv2Dong = await req('POST', `/api/surveys/${ks}/close`, { cookie: gv2.cookie });
  check('cô nhóm khác cũng không đóng được', gv2Dong.status === 403 || gv2Dong.status === 404, gv2Dong.status);

  const bghDong = await req('POST', `/api/surveys/${ks}/close`, { cookie: bgh.cookie });
  check('ban giám hiệu (Cấp 1) đóng được', bghDong.status === 200, bghDong.data);

  // Người tạo vẫn mở lại được kết quả của mình dù khảo sát đã đóng.
  const cuaCo = await req('GET', `/api/surveys/${ks}`, { cookie: gv.cookie });
  check('cô tạo vẫn đọc được kết quả sau khi đóng', cuaCo.status === 200 && cuaCo.data?.status === 'closed', cuaCo.status);
}

// ===========================================================================
console.log('\n[7] TẠO KHẢO SÁT THÌ GIA ĐÌNH ĐƯỢC BÁO — và báo đúng phạm vi (Đ145)');
{
  // Nhà trường 07/09 xếp khảo sát ĐỨNG ĐẦU danh sách "cần phải có thông báo
  // tới phụ huynh". Đợt Đ137 nối chín loại nội dung mà bỏ sót đúng loại này:
  // khảo sát tạo xong nằm im trong tab Khảo sát, gia đình không mở tab đó thì
  // hết hạn mà không hề biết có ai hỏi mình.
  const tinNhaTruong = async (cookie) =>
    ((await req('GET', '/api/notifications', { cookie })).data || []);
  const tinRieng = async (cookie) =>
    ((await req('GET', '/api/notifications/rieng-be', { cookie })).data || []);

  const riengTruoc = (await tinRieng(phC1.cookie)).length;

  // --- khảo sát của MỘT NHÓM ---
  const rNhom = await tao(gv.cookie, { audience: 'class', title: 'Ý kiến về buổi dã ngoại c1' });
  check('đối chứng — cô tạo được khảo sát cho nhóm mình', rNhom.status === 201, rNhom.data);

  const cuaC1 = (await tinNhaTruong(phC1.cookie)).filter(n => /Ý kiến về buổi dã ngoại c1/.test(n.title || ''));
  check('NHÀ CÓ CON TRONG NHÓM ĐÓ nhận được một thông báo', cuaC1.length === 1, cuaC1.map(n => n.title));
  check('thông báo gọi đúng tên khảo sát và nhắc hạn trả lời',
    /^Khảo sát mới: Ý kiến về buổi dã ngoại c1$/.test(cuaC1[0]?.title || '')
    && /01\/01\/2030/.test(cuaC1[0]?.body || ''), cuaC1[0]);
  check('xếp vào mục "Nhóm lớp" vì đây là khảo sát của một nhóm',
    cuaC1[0]?.category === 'Nhóm lớp', cuaC1[0]?.category);

  const cuaC4 = (await tinNhaTruong(phC4.cookie)).filter(n => /dã ngoại c1/.test(n.title || ''));
  check('NHÀ NGOÀI PHẠM VI KHÔNG nhận được gì — đúng luật của chính khảo sát đó',
    cuaC4.length === 0, cuaC4.map(n => n.title));

  check('KHÔNG đi đường tin riêng từng bé: khảo sát hỏi cả nhóm, không hỏi về một đứa trẻ',
    (await tinRieng(phC1.cookie)).length === riengTruoc, { truoc: riengTruoc, sau: (await tinRieng(phC1.cookie)).length });

  // --- khảo sát TOÀN TRƯỜNG ---
  const rTruong = await tao(bgh.cookie, { title: 'Khảo sát chất lượng bữa ăn toàn trường' });
  check('đối chứng — hiệu trưởng tạo được khảo sát toàn trường', rTruong.status === 201, rTruong.data);
  const truongC1 = (await tinNhaTruong(phC1.cookie)).filter(n => /chất lượng bữa ăn toàn trường/.test(n.title || ''));
  const truongC4 = (await tinNhaTruong(phC4.cookie)).filter(n => /chất lượng bữa ăn toàn trường/.test(n.title || ''));
  check('khảo sát toàn trường thì MỌI nhà đều nhận', truongC1.length === 1 && truongC4.length === 1,
    { c1: truongC1.length, c4: truongC4.length });
  check('và xếp vào mục "Nhà trường"', truongC1[0]?.category === 'Nhà trường', truongC1[0]?.category);

  // --- không nhân đôi ---
  const lai = await tao(gv.cookie, { audience: 'class', title: 'Ý kiến về buổi dã ngoại c1' });
  check('đối chứng — tạo lại khảo sát trùng tên vẫn được', lai.status === 201, lai.status);
  const sauLai = (await tinNhaTruong(phC1.cookie)).filter(n => /Ý kiến về buổi dã ngoại c1/.test(n.title || ''));
  check('CÙNG TÊN CÙNG NGÀY CÙNG NHÓM thì KHÔNG rung máy lần thứ hai',
    sauLai.length === 1, sauLai.length);

  // --- thông báo hỏng không được làm hỏng việc chính ---
  const ma = fs.readFileSync(path.join(GOC, 'routes/surveys.js'), 'utf8');
  check('gửi qua lib/thong-bao, KHÔNG tự ghi thẳng bảng notifications',
    /tb\.guiChoNhom\(/.test(ma) && !/insert\('notifications'/.test(ma));
  check('câu lệnh báo đứng SAU khi khảo sát đã lưu — báo hỏng thì khảo sát vẫn còn',
    ma.indexOf("db.insert('surveys', rec)") < ma.indexOf('tb.guiChoNhom('));
  check('truyền thẳng rec.audience, không rẽ nhánh riêng cho toàn trường',
    /guiChoNhom\(\[rec\.audience\]/.test(ma));
}

sv.dung();
donThuMucTam(DIR);
tongKet('Khảo sát gửi riêng một nhóm thì chỉ nhóm đó nhận');
