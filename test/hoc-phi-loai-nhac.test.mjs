// Bài canh LOẠI KHOẢN THU và NHẮC HẠN NỘP (Đ199 — việc 34, 37).
//
// Chạy bằng:  npm run test:hoc-phi-loai-nhac
//
// CẢ HAI VIỆC ĐỀU ĐỤNG TIỀN, NÊN CHỖ NGUY HIỂM KHÔNG PHẢI LÀ "THIẾU TÍNH NĂNG"
//
// Việc 34 tách loại khoản thu để ưu đãi chỉ áp trên học phí. Chỗ chết người
// nằm ở MẶC ĐỊNH của những khoản ĐÃ GHI: chúng không có loại. Cho chúng về
// "khoản khác" là ưu đãi thôi áp lên chúng, tức SỐ TIỀN MỘT NHÀ ĐANG NỢ TỰ
// NHIÊN TĂNG LÊN mà không ai bấm gì — trên tiền, và im lặng. Mục [1] đo đúng
// điều đó trước khi đo bất cứ thứ gì khác.
//
// Việc 37 nhắc hạn nộp cho người lo tiền. Chỗ chết người là NHẮC LẠI MỖI NGÀY:
// bộ quét chạy hằng ngày, và không có dấu "đã nhắc" thì kế toán nhận mười
// tiếng chuông cho một khoản, rồi tắt thông báo, rồi lỡ khoản thật.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hoc-phi-loai-nhac');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng K', 'k_qt');
const mkKT = taoQuanTri(DIR, 'Kế Toán K', 'k_kt');
datChucVu(DIR, 'k_kt', 'ketoan');
batPhanHe(DIR, ['hocphi']);

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4811), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
// Ngày cách hôm nay n ngày, dạng YYYY-MM-DD.
function ngayCach(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}
function demNhac() {
  const conn = new Database(CSDL);
  try { return conn.prepare('SELECT COUNT(*) AS n FROM hocphi_khoan_nhac').get().n; }
  finally { conn.close(); }
}
// DẤU THỜI GIAN của lượt nhắc — không phải SỐ DÒNG.
//
// Bản đầu của mục [3] đo bằng `demNhac()`, và thử ngược cho thấy nó KHÔNG BAO
// GIỜ đỏ: khoá chính của `hocphi_khoan_nhac` là `khoanId`, nên dù bộ quét bắn
// tin lại mười lần thì bảng vẫn đúng một dòng. Đếm dòng là đếm nhầm thứ.
//
// Thứ cần đo là "có bắn tin lại không", và dấu vết của nó là `luc` bị ghi đè.
function lucNhac(id) {
  const conn = new Database(CSDL);
  try {
    const r = conn.prepare('SELECT luc FROM hocphi_khoan_nhac WHERE khoanId = ?').get(id);
    return r ? r.luc : '';
  } finally { conn.close(); }
}
// Ghi thẳng một khoản KHÔNG có dòng loại — đúng hình dạng của mọi khoản thu
// đã ghi TRƯỚC đợt này. Đi qua API thì đường mới luôn ghi loại, nên không
// dựng lại được cảnh "dữ liệu cũ".
function khoanKieuCu(id, studentId, soTien, hanNop) {
  const conn = new Database(CSDL);
  try {
    conn.prepare(`INSERT INTO hocphi_khoan
      (id, studentId, kyThu, noiDung, soTien, hanNop, daNop, ghiChu, taoBoi, taoLuc)
      VALUES (?, ?, 'Tháng 9/2026', 'Khoản ghi từ trước', ?, ?, 0, '', 'k_kt', ?)`)
      .run(id, studentId, soTien, hanNop, new Date().toISOString());
  } finally { conn.close(); }
}

try {
  const QT = await vao('k_qt', mkQT);
  const KT = await vao('k_kt', mkKT);

  // =========================================================================
  console.log('\n[1] KHOẢN ĐÃ GHI TRƯỚC ĐỢT NÀY VẪN LÀ HỌC PHÍ — không ai bị tăng nợ');
  {
    khoanKieuCu('hp_cu_1', 's1', 2000000, null);
    const d = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('kế toán mở được sổ của bé', d.status === 200, d.status);
    const cu = (d.data.khoan || []).find(k => k.id === 'hp_cu_1');
    check('đối chứng — tìm được khoản ghi kiểu cũ', !!cu, (d.data.khoan || []).length);
    check('KHOẢN CŨ KHÔNG CÓ DÒNG LOẠI VẪN LÀ HỌC PHÍ — ưu đãi áp y như hôm qua',
      cu?.loai === 'hoc-phi', cu?.loai);
    check('và máy chủ gọi tên nó bằng tiếng của trường', cu?.tenLoai === 'Học phí', cu?.tenLoai);

    check('máy chủ khai đủ danh sách loại khoản thu',
      (d.data.loaiKhoan || []).length === 4, (d.data.loaiKhoan || []).map(x => x.ma));
    check('và nói rõ loại nào ĐƯỢC ưu đãi — màn hình không phải tự đoán',
      (d.data.loaiKhoan || []).filter(x => x.duocUuDai).map(x => x.ma).join(',') === 'hoc-phi',
      (d.data.loaiKhoan || []).map(x => `${x.ma}:${x.duocUuDai}`));
  }

  // =========================================================================
  console.log('\n[2] ƯU ĐÃI CHỈ ÁP TRÊN HỌC PHÍ (việc 34)');
  {
    const tao = async (noiDung, soTien, loai) => req('POST', '/api/hocphi', {
      cookie: KT,
      body: { studentId: 's1', kyThu: 'Tháng 10/2026', noiDung, soTien, loai, xacNhanTrung: true },
    });
    const hp = await tao('Học phí tháng 10', 3000000, 'hoc-phi');
    check('ghi được khoản học phí', hp.status === 201, `${hp.status} ${JSON.stringify(hp.data).slice(0, 120)}`);
    check('câu trả lời nói luôn loại của khoản vừa ghi', hp.data?.loai === 'hoc-phi', hp.data?.loai);
    const ta = await tao('Tiền ăn tháng 10', 900000, 'tien-an');
    check('ghi được khoản tiền ăn', ta.status === 201, ta.status);
    const xe = await tao('Xe đưa đón tháng 10', 600000, 'xe-dua-don');
    check('ghi được khoản xe đưa đón', xe.status === 201, xe.status);

    const d = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    const tong = d.data.tongChuaNop;
    const goc = d.data.tongChuaNopDuocUuDai;
    check('đối chứng — tổng chưa nộp cộng đủ cả ba khoản mới lẫn khoản cũ',
      tong === 2000000 + 3000000 + 900000 + 600000, tong);
    check('NHƯNG PHẦN ƯU ĐÃI ÁP ĐƯỢC CHỈ GỒM HỌC PHÍ — tiền ăn và tiền xe đứng ngoài',
      goc === 2000000 + 3000000, goc);
    check('và hai con số ấy KHÁC NHAU — nếu bằng nhau thì phép đo trên vô nghĩa',
      tong !== goc, `${tong} / ${goc}`);

    const la = await tao('Khoản lạ', 100000, 'khong-co-loai-nay');
    check('loại lạ thì từ chối, nói bằng tiếng của trường',
      la.status === 400 && /Học phí|Tiền ăn/.test(la.data?.error || ''), la.data);
  }

  // =========================================================================
  console.log('\n[3] NHẮC HẠN NỘP CHO NGƯỜI LO TIỀN (việc 37)');
  {
    check('đối chứng — chưa nhắc khoản nào', demNhac() === 0, demNhac());

    // Một khoản tới hạn trong tầm nhắc, một khoản còn xa, một khoản đã nộp.
    khoanKieuCu('hp_han_1', 's1', 1000000, ngayCach(3));
    khoanKieuCu('hp_han_xa', 's1', 1000000, ngayCach(90));
    const chay = await req('POST', '/api/hocphi/quet-han-nop', { cookie: KT });
    check('kế toán chạy được bộ quét', chay.status === 200, chay.status);
    check('ĐÚNG MỘT KHOẢN ĐƯỢC NHẮC — khoản còn xa hạn thì chưa đụng tới',
      demNhac() === 1, demNhac());

    // CHẠY LẠI KHÔNG ĐƯỢC NHẮC LẠI. Bộ quét chạy mỗi ngày; thiếu dấu "đã nhắc"
    // là kế toán nhận mười tiếng chuông cho một khoản rồi tắt thông báo.
    //
    // ĐO BẰNG DẤU THỜI GIAN, KHÔNG ĐO BẰNG SỐ DÒNG — xem chú thích ở `lucNhac`.
    const lucDau = lucNhac('hp_han_1');
    check('đối chứng — lượt nhắc đầu có ghi dấu thời gian', !!lucDau, lucDau);
    await req('POST', '/api/hocphi/quet-han-nop', { cookie: KT });
    await req('POST', '/api/hocphi/quet-han-nop', { cookie: KT });
    check('CHẠY LẠI BA LẦN VẪN CHỈ MỘT DẤU NHẮC — không nhắc loạn',
      demNhac() === 1, demNhac());
    check('VÀ DẤU THỜI GIAN KHÔNG ĐỔI — tức bộ quét KHÔNG bắn tin lại lần nào',
      lucNhac('hp_han_1') === lucDau, `${lucDau} → ${lucNhac('hp_han_1')}`);

    // Khoản đã THU HỒI thì không nhắc: nhắc một khoản đã huỷ là gọi điện cho
    // gia đình đòi một số tiền trường đã bỏ.
    khoanKieuCu('hp_han_2', 's1', 1000000, ngayCach(5));
    const th = await req('POST', '/api/hocphi/hp_han_2/thu-hoi', {
      cookie: KT, body: { lyDo: 'Ghi nhầm bé' },
    });
    check('thu hồi được khoản ghi nhầm', th.status === 200, th.status);
    await req('POST', '/api/hocphi/quet-han-nop', { cookie: KT });
    check('KHOẢN ĐÃ THU HỒI THÌ KHÔNG NHẮC — không đòi tiền trường đã bỏ',
      demNhac() === 1, demNhac());
  }

  // =========================================================================
  console.log('\n[4] AI NHẬN TIN NHẮC — và vì sao KHÔNG thêm kế toán vào danh sách cũ');
  {
    const ma = fs.readFileSync(path.join(GOC, 'lib/bao-nha-truong.js'), 'utf8');
    const cu = (ma.match(/const CHUC_VU_NHAN = \[([^\]]*)\]/) || [])[1] || '';
    check('DANH SÁCH CŨ GIỮ NGUYÊN HAI CHỨC VỤ — không chỗ nào đang gọi nó bị đổi',
      !/ketoan/.test(cu), cu.trim());
    const moi = (ma.match(/const CHUC_VU_LO_TIEN = \[([^\]]*)\]/) || [])[1] || '';
    check('và có một danh sách RIÊNG cho người lo tiền, trong đó có kế toán',
      /ketoan/.test(moi), moi.trim());
    check('bộ quét hạn nộp gọi đúng đường riêng ấy',
      /guiChoNguoiLoTienCuaBe/.test(fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8')));

    // KHÔNG NÊU SỐ TIỀN TRONG TIN ĐẨY — tin hiện trên màn hình khoá điện thoại.
    const hp = fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8');
    const goi = (hp.match(/tieuDe: 'Có khoản thu sắp tới hạn'[\s\S]{0,400}?hash: '#\/hocphi',/) || [''])[0];
    check('đối chứng — đọc được gói tin của bộ quét', goi.length > 0, goi.length);
    check('TIN ĐẨY KHÔNG NÊU SỐ TIỀN — màn hình khoá ai đi qua cũng đọc được',
      !/soTien/.test(goi), goi.slice(0, 200));

    // Gia đình KHÔNG chạy được bộ quét, và cô cũng không.
    const PH = (await login('phuhuynh', '123456')).cookie;
    const phChay = await req('POST', '/api/hocphi/quet-han-nop', { cookie: PH });
    check('gia đình không chạy được bộ quét', phChay.status === 403 || phChay.status === 404, phChay.status);
  }

  // =========================================================================
  console.log('\n[5] TẮT PHÂN HỆ THÌ SỐ TIỀN CÒN NGUYÊN — Nguyên tắc số 1');
  {
    await req('PUT', '/api/admin/modules/hocphi', { cookie: QT, body: { enabled: false } });
    const tat = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('tắt rồi thì API bị chặn', tat.status === 404 || tat.status === 403, tat.status);
    await req('PUT', '/api/admin/modules/hocphi', { cookie: QT, body: { enabled: true } });
    const lai = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('bật lại là chạy tiếp', lai.status === 200, lai.status);
    check('VÀ LOẠI CỦA TỪNG KHOẢN CÒN NGUYÊN — không mất một dòng nào',
      (lai.data.khoan || []).some(k => k.loai === 'tien-an')
      && (lai.data.khoan || []).some(k => k.loai === 'hoc-phi'),
      (lai.data.khoan || []).map(k => k.loai));
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
