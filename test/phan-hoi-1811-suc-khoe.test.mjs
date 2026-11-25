// Bài canh MÁY CHỦ cho góp ý Sức khỏe của trường ngày 18/11 (Đ260e).
//
// Chạy bằng:  node test/phan-hoi-1811-suc-khoe.test.mjs
//
//   1. Bảng BMI theo tuổi của WHO (public/js/bmi-who.js): đúng số L, M, S thật,
//      phân loại đúng ở các mốc biên −2 / +2 (tới 60 tháng) và +1 (61–72
//      tháng), thiếu dữ liệu thì không tô màu. Chủ dự án duyệt 25/11: tô màu
//      BMI theo WHO, gia đình cũng thấy — ngoại lệ có duyệt của QUY TẮC 4, chỉ
//      cho chỉ số BMI ở phân hệ Sức khỏe.
//   2. Máy chủ gửi ngày sinh + giới tính cho màn hình tự tô màu; máy chủ
//      không tính, không gửi một ô BMI nào.
//   3. Bảng nhóm có `doTruocThang` — lần đo gần nhất TRƯỚC tháng đang xem.
//   4–6. Một tháng một lần cân đo gửi gia đình: lần hai → 409 kèm danh sách bé;
//      `suaLai: true` → sửa dòng đã có, không thêm dòng, không gửi tin mới. Cả
//      ba đường ghi: bảng cả nhóm, hộp nhập lẻ, nạp tệp.
//   7. Dữ liệu cũ đã lỡ có hai lần trong tháng: để nguyên, không xoá.
//   8. Bé nhóm khác: 403.
import path from 'node:path';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, GOC, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const B = createRequire(import.meta.url)(path.join(GOC, 'public', 'js', 'bmi-who.js'));

// =========================================================================
console.log('\n[1] Bảng WHO và phân loại ở đúng các mốc biên');
{
  // Số chép tay từ bảng WHO (không đọc lại từ tệp): đổi một số trong bảng là
  // đổi màu ô BMI của cả trường, nên phải có một chốt độc lập với tệp.
  const MAU = [
    ['nam', 0, [-0.3053, 13.4069, 0.0956]],
    ['nam', 24, [-0.6187, 16.0189, 0.07785]],
    ['nam', 60, [-0.6892, 15.1916, 0.087]],
    ['nam', 61, [-0.7387, 15.2641, 0.0839]],
    ['nu', 14, [-0.4177, 16.1128, 0.08741]],
    ['nu', 60, [-0.5684, 15.2747, 0.09789]],
    ['nu', 61, [-0.8886, 15.2441, 0.09692]],
    ['nu', 72, [-1.0794, 15.2697, 0.10195]],
  ];
  check('bảng có đủ 73 tháng (0..72) cho cả hai giới', B.BANG.nam.length === 73 && B.BANG.nu.length === 73);
  for (const [g, th, lms] of MAU) {
    check(`L, M, S của ${g} tháng ${th} đúng bảng WHO`, JSON.stringify(B.BANG[g][th]) === JSON.stringify(lms), B.BANG[g][th]);
  }

  // BMI đúng tại một độ lệch cho trước, tính NGƯỢC từ L, M, S thật.
  const bmiTai = (g, th, d) => { const [L, M, S] = B.BANG[g][th]; return M * Math.pow(1 + L * S * d, 1 / L); };
  // Ngày đo sao cho tuổi tròn đúng `th` tháng (số ngày / 30.4375, làm tròn xuống).
  const DOB = '2020-03-10';
  const ngayDo = (th) => new Date(Date.UTC(2020, 2, 10) + Math.ceil(th * 30.4375) * 86400000).toISOString().slice(0, 10);
  const muc = (g, th, d, gioi) => {
    const bmi = bmiTai(g, th, d);
    // Cao 100 cm thì cân nặng (kg) bằng đúng BMI.
    const r = B.phanLoai({ height: 100, weight: bmi, date: ngayDo(th) }, { dob: DOB, gender: gioi || (g === 'nam' ? 'Nam' : 'Nữ') });
    return r && r.muc;
  };
  check('tuổi tính theo số ngày / 30.4375, làm tròn xuống',
    B.thangTuoi(DOB, ngayDo(14)) === 14 && B.thangTuoi(DOB, ngayDo(61)) === 61
    && B.thangTuoi('2024-01-01', '2024-01-31') === 0 && B.thangTuoi('2024-01-01', '2024-02-01') === 1,
    [B.thangTuoi(DOB, ngayDo(14)), B.thangTuoi('2024-01-01', '2024-01-31'), B.thangTuoi('2024-01-01', '2024-02-01')]);

  for (const [g, th] of [['nam', 14], ['nu', 30], ['nam', 60], ['nu', 61], ['nam', 72]]) {
    check(`${g} ${th} tháng: ngay dưới −2 → dưới ngưỡng (cam)`, muc(g, th, -2.02) === 'duoi', muc(g, th, -2.02));
    check(`${g} ${th} tháng: ngay trên −2 → trong ngưỡng (xanh)`, muc(g, th, -1.98) === 'trong', muc(g, th, -1.98));
  }
  for (const [g, th] of [['nam', 14], ['nu', 30], ['nam', 60], ['nu', 60]]) {
    check(`${g} ${th} tháng: ngay trên +2 → trên ngưỡng (đỏ)`, muc(g, th, 2.02) === 'tren', muc(g, th, 2.02));
    check(`${g} ${th} tháng: ngay dưới +2 → trong ngưỡng`, muc(g, th, 1.98) === 'trong', muc(g, th, 1.98));
    check(`${g} ${th} tháng: +1,5 vẫn trong ngưỡng (bảng 2006 dùng mốc +2)`, muc(g, th, 1.5) === 'trong', muc(g, th, 1.5));
  }
  for (const [g, th] of [['nam', 61], ['nu', 61], ['nu', 72]]) {
    check(`${g} ${th} tháng: ngay trên +1 → trên ngưỡng (bảng 2007 dùng mốc +1)`, muc(g, th, 1.02) === 'tren', muc(g, th, 1.02));
    check(`${g} ${th} tháng: ngay dưới +1 → trong ngưỡng`, muc(g, th, 0.98) === 'trong', muc(g, th, 0.98));
  }
  check('giới tính viết không dấu / tiếng Anh vẫn nhận ra',
    muc('nu', 30, 0, 'nu') === 'trong' && muc('nam', 30, 0, 'male') === 'trong' && muc('nu', 30, 2.5, 'NỮ') === 'tren');

  const x = { height: 100, weight: 16, date: '2024-06-01' };
  check('thiếu giới tính → không tô màu', B.phanLoai(x, { dob: '2021-01-01', gender: '' }) === null);
  check('giới tính lạ → không tô màu', B.phanLoai(x, { dob: '2021-01-01', gender: 'khác' }) === null);
  check('thiếu ngày sinh → không tô màu', B.phanLoai(x, { dob: null, gender: 'Nam' }) === null);
  check('thiếu cân nặng → không tô màu', B.phanLoai({ height: 100, date: '2024-06-01' }, { dob: '2021-01-01', gender: 'Nam' }) === null);
  check('ngày đo trước ngày sinh → không tô màu', B.phanLoai(x, { dob: '2025-01-01', gender: 'Nam' }) === null);
  check('quá 72 tháng → không tô màu',
    B.phanLoai({ ...x, date: ngayDo(73) }, { dob: DOB, gender: 'Nam' }) === null, B.thangTuoi(DOB, ngayDo(73)));

  const ba = ['trong', 'duoi', 'tren'].map(k => B.MUC[k]);
  check('ba mức có chữ đi kèm màu: trong / dưới / trên ngưỡng',
    ba.map(m => m.nhan).join('|') === 'BMI trong ngưỡng|BMI dưới ngưỡng|BMI trên ngưỡng', ba.map(m => m.nhan));
  check('mỗi mức kèm MỘT câu gợi ý việc cô và gia đình làm được (QUY TẮC 5)',
    ba.every(m => /^Cô và gia đình .+\.$/.test(m.goiY)), ba.map(m => m.goiY));
  check('ghi rõ nguồn: bảng tăng trưởng WHO', /bảng tăng trưởng WHO/.test(B.NGUON));
  const chu = JSON.stringify(B.MUC) + B.NGUON;
  check('chữ trên màn không gán nhãn cơ thể, không phần trăm, không so với bé khác',
    !/thừa cân|béo phì|suy dinh dưỡng|nhẹ cân|chuẩn|percentile|bách phân vị|%|bạn khác|các bé khác/i.test(chu), chu);
}

// =========================================================================
const DIR = thuMucTam('phan-hoi-1811-suc-khoe');
sinhDuLieu(DIR);
const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5300), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);
const DAU_THANG = `${THANG}-01`;

function soDongCanDo(studentId, thang) {
  const c = new Database(CSDL, { readonly: true });
  try {
    return c.prepare(`SELECT COUNT(*) AS n FROM health WHERE studentId = ? AND type = 'checkup'
      AND date LIKE ? AND (height IS NOT NULL OR weight IS NOT NULL)`).get(studentId, `${thang}-%`).n;
  } finally { c.close(); }
}

try {
  const co = (await login('giaovien', '123456')).cookie;     // cô Chồi 2 (c1): s1, s3, s4, s5, s6
  const co4 = (await login('giaovien4', '123456')).cookie;   // cô nhóm c4
  const ph = (await login('phuhuynh', '123456')).cookie;     // mẹ bé s1 (và s2)
  const tinSucKhoe = async () => ((await req('GET', '/api/notifications/rieng-be', { cookie: ph })).data || [])
    .filter(n => n.laRiengBe && n.loai === 'suc-khoe').length;

  // =========================================================================
  console.log('\n[2] Máy chủ gửi ngày sinh + giới tính, KHÔNG gửi ô BMI nào');
  {
    const r = await req('GET', '/api/health?studentId=s1', { cookie: ph });
    check('gia đình nhận thongTinBe { dob, gender } của chính con',
      r.status === 200 && r.data.thongTinBe && /^\d{4}-\d{2}-\d{2}/.test(r.data.thongTinBe.dob) && r.data.thongTinBe.gender === 'Nữ',
      r.data && r.data.thongTinBe);
    const chuoi = JSON.stringify(r.data);
    check('không có khoá bmi / mức / màu trong gói trả về',
      !/"bmi"|"chiSoBmi"|"mucBmi"|"mau"|"doLech"/.test(chuoi) && !/ngưỡng/.test(chuoi));
    const n = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co });
    check('bảng nhóm có giới tính từng bé', (n.data.danhSach || []).every(b => 'gender' in b) && n.data.danhSach.find(b => b.studentId === 's4').gender === 'Nam');
  }

  // =========================================================================
  console.log('\n[3] doTruocThang: lần đo gần nhất TRƯỚC tháng đang xem');
  {
    const truoc = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co });
    const s1a = truoc.data.danhSach.find(b => b.studentId === 's1');
    check('đối chứng — tháng này s1 chưa đo, lần trước là số của dữ liệu mẫu',
      s1a.doTrongThang === null && s1a.doTruocThang && s1a.doTruocThang.date < DAU_THANG, s1a);
    const moc = s1a.doTruocThang;

    const ghi = await req('POST', '/api/health/can-do-nhom', { cookie: co, body: { classId: 'c1', date: NGAY, danhSach: [
      { studentId: 's1', height: 104, weight: 16.5 },
    ] } });
    check('ghi được lần cân đo tháng này cho s1', ghi.status === 200 && ghi.data.daThem === 1, ghi.data);
    const sau = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co });
    const s1b = sau.data.danhSach.find(b => b.studentId === 's1');
    check('doGanNhat là số vừa nhập (bất kể tháng) — như cũ', s1b.doGanNhat && s1b.doGanNhat.height === 104);
    check('doTruocThang vẫn là lần TRƯỚC tháng này, không phải số vừa nhập',
      s1b.doTruocThang && s1b.doTruocThang.id === moc.id && s1b.doTruocThang.height === moc.height, s1b.doTruocThang);
    const s5 = sau.data.danhSach.find(b => b.studentId === 's5');
    check('mỗi bé đều có khoá doTruocThang', sau.data.danhSach.every(b => 'doTruocThang' in b) && !!s5.doTruocThang);
  }

  // =========================================================================
  console.log('\n[4] Bảng cả nhóm: lần hai trong tháng → 409; suaLai → sửa, không thêm, không báo');
  {
    const tin0 = await tinSucKhoe();
    const lan2 = await req('POST', '/api/health/can-do-nhom', { cookie: co, body: { classId: 'c1', date: DAU_THANG, danhSach: [
      { studentId: 's1', height: 104.5, weight: 16.6 },
      { studentId: 's4', height: 103, weight: 17 },
    ] } });
    check('lần hai trong tháng (khác ngày) → 409', lan2.status === 409, `${lan2.status} ${JSON.stringify(lan2.data)}`);
    check('409 kèm danh sách bé đã có số tháng này — chỉ s1',
      Array.isArray(lan2.data.daCo) && lan2.data.daCo.length === 1 && lan2.data.daCo[0].studentId === 's1'
      && lan2.data.daCo[0].height === 104, lan2.data.daCo);
    check('câu hỏi lại nói bằng tiếng của trường',
      /Tháng này đã gửi số đo cho gia đình của 1 bé/.test(lan2.data.error) && /Cô muốn sửa lại số liệu\?/.test(lan2.data.error), lan2.data.error);
    check('và KHÔNG ghi gì — kể cả bé s4 chưa có số', soDongCanDo('s1', THANG) === 1 && soDongCanDo('s4', THANG) === 0,
      [soDongCanDo('s1', THANG), soDongCanDo('s4', THANG)]);
    check('gia đình KHÔNG nhận thêm tin nào', (await tinSucKhoe()) === tin0);

    const sua = await req('POST', '/api/health/can-do-nhom', { cookie: co, body: { classId: 'c1', date: DAU_THANG, suaLai: true, danhSach: [
      { studentId: 's1', height: 104.5, weight: '' },
      { studentId: 's4', height: 103, weight: 17 },
    ] } });
    check('suaLai → 200: sửa 1 (s1), thêm 1 (s4)', sua.status === 200 && sua.data.daSua === 1 && sua.data.daThem === 1, sua.data);
    check('s1 vẫn chỉ MỘT dòng cân đo tháng này', soDongCanDo('s1', THANG) === 1, soDongCanDo('s1', THANG));
    const hs = await req('GET', '/api/health?studentId=s1', { cookie: co });
    const dong = hs.data.records.filter(r => r.type === 'checkup' && r.date.startsWith(THANG));
    check('số được sửa; ô để trống không xoá cân nặng đã ghi; ngày giữ nguyên',
      dong.length === 1 && dong[0].height === 104.5 && dong[0].weight === 16.5 && dong[0].date === NGAY, dong);
    check('dòng mang dấu "đã chỉnh sửa"', dong[0] && dong[0].daSua === true);
    check('gia đình s1 KHÔNG nhận thêm tin (chỉ bé mới có số mới được báo)', (await tinSucKhoe()) === tin0, `${tin0} → ${await tinSucKhoe()}`);

    const thangCu = await req('POST', '/api/health/can-do-nhom', { cookie: co, body: { classId: 'c1', date: '2025-01-15', danhSach: [
      { studentId: 's1', height: 95, weight: 14 },
    ] } });
    check('tháng KHÁC thì vẫn ghi bình thường', thangCu.status === 200 && thangCu.data.daThem === 1, thangCu.data);
  }

  // =========================================================================
  console.log('\n[5] Hộp nhập lẻ (POST /api/health): cùng luật');
  {
    const tin0 = await tinSucKhoe();
    const lan2 = await req('POST', '/api/health', { cookie: co, body: {
      studentId: 's1', type: 'checkup', title: 'Khám định kỳ tháng', date: DAU_THANG, height: 105, weight: 16.8 } });
    check('khám có số đo, tháng đã có cân đo → 409', lan2.status === 409 && lan2.data.daCo && lan2.data.daCo[0].studentId === 's1', `${lan2.status} ${JSON.stringify(lan2.data)}`);
    check('không thêm dòng, không báo', soDongCanDo('s1', THANG) === 1 && (await tinSucKhoe()) === tin0);

    const sua = await req('POST', '/api/health', { cookie: co, body: {
      studentId: 's1', type: 'checkup', title: 'Khám định kỳ tháng', date: DAU_THANG, height: 105, weight: 16.8,
      bmiNote: 'Y tế trường ghi', suaLai: true } });
    check('suaLai → 200 và trả lại đúng dòng cũ đã sửa',
      sua.status === 200 && sua.data.daSua === true && sua.data.height === 105 && sua.data.weight === 16.8 && sua.data.date === NGAY, sua.data);
    check('vẫn MỘT dòng cân đo trong tháng, không báo thêm', soDongCanDo('s1', THANG) === 1 && (await tinSucKhoe()) === tin0);

    const khongSo = await req('POST', '/api/health', { cookie: co, body: {
      studentId: 's1', type: 'checkup', title: 'Khám răng', detail: 'Răng sạch', date: NGAY } });
    check('khám KHÔNG có số đo không phải lần cân đo → ghi bình thường (201)', khongSo.status === 201, khongSo.status);
    const suCo = await req('POST', '/api/health', { cookie: co, body: { studentId: 's1', type: 'incident', title: 'Va nhẹ', date: NGAY } });
    check('sự cố y tế không bị chặn', suCo.status === 201, suCo.status);
    check('hai ghi nhận ấy vẫn báo gia đình như cũ', (await tinSucKhoe()) === tin0 + 2, `${tin0} → ${await tinSucKhoe()}`);

    const moi = await req('POST', '/api/health', { cookie: co, body: {
      studentId: 's5', type: 'checkup', title: 'Cân đo tháng', date: NGAY, height: 99, weight: 15 } });
    check('bé CHƯA có số tháng này thì hộp nhập lẻ ghi như cũ (201)', moi.status === 201, moi.status);
  }

  // =========================================================================
  console.log('\n[6] Nạp tệp cân đo: cùng luật, có tuỳ chọn sửa lại');
  {
    const tin0 = await tinSucKhoe();
    const tep = 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n,Nguyễn Bảo An,Chồi 2,106,17\n';
    const nap = await req('POST', '/api/health/nap-can-do', { cookie: co, body: { classId: 'c1', date: NGAY, text: tep } });
    check('tệp có bé đã có số tháng này → 409 kèm danh sách', nap.status === 409 && nap.data.daCo && nap.data.daCo[0].hoTen === 'Nguyễn Bảo An', `${nap.status} ${JSON.stringify(nap.data)}`);
    const nap2 = await req('POST', '/api/health/nap-can-do', { cookie: co, body: { classId: 'c1', date: NGAY, text: tep, suaLai: true } });
    check('suaLai → sửa dòng đã có', nap2.status === 200 && nap2.data.daSua === 1 && nap2.data.daThem === 0, nap2.data);
    check('vẫn MỘT dòng, không báo thêm', soDongCanDo('s1', THANG) === 1 && (await tinSucKhoe()) === tin0);
  }

  // =========================================================================
  console.log('\n[7] Dữ liệu cũ đã có hai lần trong tháng: để nguyên, không xoá');
  {
    const c = new Database(CSDL);
    try {
      const them = c.prepare(`INSERT INTO health (id, studentId, date, type, title, detail, height, weight)
        VALUES (?, 's6', ?, 'checkup', ?, '', ?, ?)`);
      them.run('ht_cu_1', DAU_THANG, 'Cân đo tháng (cũ)', 100, 16);
      them.run('ht_cu_2', DAU_THANG, 'Khám định kỳ tháng (cũ)', 100.5, 16.1);
    } finally { c.close(); }
    const r = await req('POST', '/api/health/can-do-nhom', { cookie: co, body: { classId: 'c1', date: NGAY, suaLai: true, danhSach: [
      { studentId: 's6', height: 101, weight: 16.2 },
    ] } });
    check('sửa lại được', r.status === 200 && r.data.daSua === 1, r.data);
    check('vẫn đủ HAI dòng cũ — không dòng nào bị xoá, không thêm dòng thứ ba', soDongCanDo('s6', THANG) === 2, soDongCanDo('s6', THANG));
    const hs = await req('GET', '/api/health?studentId=s6', { cookie: co });
    const hai = Object.fromEntries(hs.data.records.filter(x => x.id.startsWith('ht_cu_')).map(x => [x.id, x.height]));
    check('chỉ dòng mới nhất được sửa, dòng kia giữ số cũ', hai.ht_cu_2 === 101 && hai.ht_cu_1 === 100, hai);
  }

  // =========================================================================
  console.log('\n[8] Bé nhóm khác: 403');
  {
    const a = await req('POST', '/api/health/can-do-nhom', { cookie: co4, body: { classId: 'c1', date: NGAY, suaLai: true, danhSach: [{ studentId: 's1', height: 100 }] } });
    check('cô nhóm khác không ghi / sửa được bảng nhóm c1, kể cả với suaLai', a.status === 403, a.status);
    const b = await req('POST', '/api/health', { cookie: co4, body: { studentId: 's1', type: 'checkup', title: 'x', height: 100, suaLai: true } });
    check('cô nhóm khác không sửa được qua hộp nhập lẻ', b.status === 403, b.status);
    const c = await req('POST', '/api/health/nap-can-do', { cookie: co4, body: { classId: 'c1', text: 'a', suaLai: true } });
    check('cô nhóm khác không nạp tệp cho nhóm c1', c.status === 403, c.status);
    const d = await req('GET', '/api/health?studentId=s1', { cookie: co4 });
    check('cô nhóm khác không đọc được ngày sinh / giới tính của bé', d.status === 403 && !d.data.thongTinBe, d.status);
    const e = await req('GET', '/api/health?studentId=s3', { cookie: ph });
    check('gia đình không đọc được hồ sơ bé nhà khác', e.status === 403, e.status);
    const f = await req('POST', '/api/health', { cookie: ph, body: { studentId: 's1', type: 'checkup', title: 'x', height: 100, suaLai: true } });
    check('gia đình không ghi được, kể cả với suaLai', f.status === 403, f.status);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Góp ý 18/11 — Sức khỏe: BMI theo WHO, lần đo trước, một tháng một lần cân đo');
