// Bài canh BÁO ĂN & TIỀN ĂN.
//
// Chạy bằng:  npm run test:tien-an
//
// HAI CON SỐ, HAI KIỂU HỎNG KHÁC HẲN NHAU
//
//   1. SỐ SUẤT BÁO CHO BẾP. Sai thiếu là có bé đến lớp mà không có phần ăn —
//      hỏng theo kiểu đứa trẻ phải chịu. Nên bài này canh rất kỹ chuyện app
//      trừ suất của ai: chỉ trừ khi có ĐƠN ĐÃ DUYỆT hoặc ĐÃ ĐIỂM DANH VẮNG,
//      và bé có đơn mà sáng vẫn tới lớp thì VẪN được tính suất.
//
//   2. SỐ NGÀY HOÀN TIỀN ĂN. Sai là trường thu nhầm tiền của gia đình. Chỗ
//      app KHÔNG tính được là đơn nghỉ vắt qua hai tháng: văn phòng gõ tổng số
//      ngày cho cả đơn chứ không gõ từng ngày. Bài này canh để app ĐÁNH DẤU
//      chỗ đó thay vì đoán hộ — đoán hộ là bịa ra con số không ai gõ.
//
// QUY TẮC 4
//
// Bảng đối chiếu đặt các bé cạnh nhau kèm con số, nên mục [9] canh nó luôn xếp
// theo TÊN chứ không theo con số nào. Xếp theo số ngày vắng là biến sổ tiền
// thành một cách sắp các bé trên dưới nhau.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, MAU, HOM_NAY as homNayVN } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tien-an');
sinhDuLieu(DIR);
batPhanHe(DIR, ['tienan']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3990), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mk1);
const VP3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1 (Chồi 2)
const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm khác
// Cô Bích Ngọc (t3) phụ trách CẢ c1 lẫn c2 — dữ liệu mẫu dựng sẵn tình huống
// NHIỀU CÔ MỘT NHÓM, thay đổi nền lớn nhất của app 2.
const GV3 = (await login('giaovien3', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1

// Hỏi chung một chỗ với máy chủ (lib/ngay.js), không tự tính bằng giờ UTC —
// xem chú thích ở test/_chung.mjs. Tự tính là bài test đỏ vào buổi tối.
const HOM_NAY = homNayVN();
function ngayLui(n) {
  return new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
}
// NGÀY MAI — ngày chắc chắn CHƯA AI ĐIỂM DANH.
//
// Dữ liệu mẫu điểm danh 20 ngày học gần nhất, nên hôm nay có thể đã có sổ điểm
// danh (nếu hôm nay là ngày trong tuần) hoặc chưa (nếu là thứ Bảy, Chủ nhật).
// Muốn canh phần ĐƠN NGHỈ trừ suất thì phải đứng ở một ngày mà sổ điểm danh
// chắc chắn còn trống — nếu không thì bài test đúng hay sai tuỳ hôm chạy.
const MAI = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

// Tải tệp CSV về dưới dạng BYTE, không gọi res.text(): chuẩn giải mã UTF-8 bóc
// dấu BOM đi, mà BOM đúng là thứ phải canh (Excel trên Windows cần nó).
async function taiCsv(cookie, query = '') {
  const res = await fetch(`${sv.BASE}/api/tienan/thang.csv${query}`, { headers: { cookie } });
  const byte = new Uint8Array(await res.arrayBuffer());
  return {
    status: res.status,
    kieu: res.headers.get('content-type') || '',
    tenTep: res.headers.get('content-disposition') || '',
    byte,
    chu: new TextDecoder('utf-8').decode(byte),
  };
}

const nhomC1 = async (cookie = GV, ngay = HOM_NAY) => {
  const r = await req('GET', `/api/tienan/bao-an?ngay=${ngay}`, { cookie });
  return { r, n: (r.data?.nhom || []).find(x => x.classId === 'c1') };
};

// ===========================================================================
console.log('\n[1] Cô mở màn báo ăn là thấy ngay con số của nhóm mình');
{
  const { r, n } = await nhomC1();
  check('mở được', r.status === 200, r.status);
  check('thấy nhóm mình', !!n, (r.data?.nhom || []).map(x => x.classId));
  // NEO VÀO HÌNH DÁNG DỮ LIỆU MẪU, KHÔNG NEO VÀO CHÍNH CÂU TRẢ LỜI.
  //
  // Bản trước chỉ hỏi `siSo > 0` rồi so `suatDuKien === siSo` — tức là so hai
  // trường của CÙNG một câu trả lời. Máy chủ đếm sai sĩ số theo cùng một cách
  // cho cả hai trường (ví dụ đếm gộp bé của cả hai nhóm cô đang phụ trách) thì
  // bài này vẫn xanh.
  //
  // Đây là con số về sau dùng để tính tiền ăn của phụ huynh. Sai một suất là
  // sai tiền thật, mỗi ngày, cho tới khi có người đối chiếu bằng tay.
  check('SĨ SỐ ĐÚNG BẰNG SỐ BÉ CỦA NHÓM CHỒI 2 TRONG DỮ LIỆU MẪU',
    n?.siSo === MAU.soBeNhomChoi2, { thay: n?.siSo, phaiLa: MAU.soBeNhomChoi2 });
  check('và KHÔNG gộp nhầm bé của nhóm khác cô cũng phụ trách',
    n?.siSo !== MAU.soBeNhomChoi2 + MAU.soBeNhomLa1, n?.siSo);
  check('chưa ai nghỉ thì suất dự kiến bằng sĩ số', n?.suatDuKien === n?.siSo, n);
  check('chưa chốt thì nói rõ là chưa', n?.chot === null, n?.chot);

  check('cô KHÔNG thấy nhóm của cô khác', !(r.data?.nhom || []).some(x => x.classId === 'c2'),
    (r.data?.nhom || []).map(x => x.classId));

  const ph = await req('GET', '/api/tienan/bao-an', { cookie: PH });
  check('phụ huynh KHÔNG mở được màn báo ăn', ph.status === 403, ph.status);
}

// ===========================================================================
console.log('\n[2] Trừ suất của ai: chỉ đơn ĐÃ DUYỆT và điểm danh ĐÃ GHI');
{
  const truoc = (await nhomC1(GV, MAI)).n;

  // Dữ liệu mẫu đã có sẵn một đơn CHỜ DUYỆT cho ngày mai. Đơn chờ chưa được
  // trừ suất: trừ sớm là bếp nấu thiếu cho một bé vẫn đến lớp.
  const dsDon = (await req('GET', '/api/leave', { cookie: GV })).data || [];
  const don = dsDon.find(l => l.status === 'pending' && l.fromDate === MAI && l.studentId === 's1');
  check('có sẵn một đơn chờ duyệt cho ngày mai để thử', !!don, dsDon.map(l => [l.status, l.fromDate]));
  check('ĐƠN CHỜ DUYỆT KHÔNG trừ suất', truoc.suatDuKien === truoc.siSo, truoc);

  const duyet = await req('POST', `/api/leave/${don.id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'khong' },
  });
  check('văn phòng duyệt được đơn đó', duyet.status === 200, duyet.data?.error);
  const sau = (await nhomC1(GV, MAI)).n;
  check('duyệt rồi thì trừ đúng một suất', sau.suatDuKien === truoc.suatDuKien - 1, {
    truoc: truoc.suatDuKien, sau: sau.suatDuKien,
  });
  check('và nói rõ trừ của BÉ NÀO, vì sao',
    sau.khongAn.some(b => b.studentId === 's1' && /đơn nghỉ/.test(b.vi)), sau.khongAn);

  // BÉ CÓ ĐƠN MÀ SÁNG VẪN TỚI LỚP THÌ VẪN CÓ SUẤT.
  //
  // Chuyện này xảy ra thật: gia đình xin nghỉ hôm trước, sáng con khỏe lại nên
  // vẫn đưa tới. App tin SỔ ĐIỂM DANH chứ không tin cái đơn.
  await req('POST', '/api/attendance/mark', {
    cookie: GV, body: { studentId: 's1', date: MAI, status: 'present' },
  });
  const toiLop = (await nhomC1(GV, MAI)).n;
  check('BÉ CÓ ĐƠN MÀ VẪN TỚI LỚP THÌ VẪN ĐƯỢC TÍNH SUẤT',
    toiLop.suatDuKien === truoc.suatDuKien, { truoc: truoc.suatDuKien, nay: toiLop.suatDuKien });
  check('và không còn nằm trong danh sách không ăn',
    !toiLop.khongAn.some(b => b.studentId === 's1'), toiLop.khongAn);

  // Điểm danh vắng thì trừ, kể cả khi không có đơn nào.
  await req('POST', '/api/attendance/mark', {
    cookie: GV, body: { studentId: 's4', date: MAI, status: 'absent_unexcused' },
  });
  const vang = (await nhomC1(GV, MAI)).n;
  check('điểm danh vắng thì trừ suất, dù không có đơn',
    vang.suatDuKien === truoc.suatDuKien - 1, vang.suatDuKien);
  check('và ghi rõ là do điểm danh',
    vang.khongAn.some(b => b.studentId === 's4' && /điểm danh/.test(b.vi)), vang.khongAn);
}

// ===========================================================================
console.log('\n[2b] Một đơn nghỉ HÔM NAY, đã duyệt và có hoàn tiền — để tháng sau đối chiếu');
{
  const don = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: HOM_NAY, toDate: HOM_NAY, reason: 'Con bị sốt' },
  });
  const r = await req('POST', `/api/leave/${don.data.id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 1 },
  });
  check('duyệt kèm hoàn tiền ăn một ngày', r.status === 200 && r.data?.hoanTien?.soNgay === 1, r.data?.hoanTien);
}

// ===========================================================================
console.log('\n[3] Chốt số cho bếp — và giữ lại cả con số máy tính ra lúc đó');
{
  const truoc = (await nhomC1()).n;
  const r = await req('POST', '/api/tienan/bao-an', {
    cookie: GV, body: { ngay: HOM_NAY, classId: 'c1', soSuat: truoc.suatDuKien, ghiChu: 'Thêm 2 suất cho cô' },
  });
  check('cô chốt được nhóm mình', r.status === 200, r.data?.error);
  check('trả về luôn bản ghi đã chốt', r.data?.chot?.soSuat === truoc.suatDuKien, r.data?.chot);
  check('lưu cả con số MÁY tính ra lúc chốt, để cuối tháng còn đối chiếu',
    r.data?.chot?.soSuatMay === truoc.suatDuKien, r.data?.chot);
  check('ghi rõ ai chốt', !!r.data?.chot?.nguoiChotTen, r.data?.chot);
  check('và ghi chú gửi bếp được giữ', /cho cô/.test(r.data?.chot?.ghiChu || ''), r.data?.chot);

  // Chốt lại thì ĐÈ, không sinh dòng thứ hai để bếp phải đoán lấy dòng nào.
  await req('POST', '/api/tienan/bao-an', {
    cookie: GV, body: { ngay: HOM_NAY, classId: 'c1', soSuat: 1, ghiChu: 'Sửa lại' },
  });
  const lai = (await nhomC1()).n;
  check('CHỐT LẠI THÌ ĐÈ LÊN, không sinh bản ghi thứ hai', lai.chot?.soSuat === 1, lai.chot);
  check('ghi chú cũng đổi theo', /Sửa lại/.test(lai.chot?.ghiChu || ''), lai.chot);

  const tong = (await nhomC1()).r.data?.tong;
  check('tổng "đã chốt" chỉ cộng nhóm ĐÃ chốt, không cộng lẫn số dự kiến',
    tong.suatDaChot === 1 && tong.soNhomDaChot === 1, tong);
}

// ===========================================================================
console.log('\n[4] Chốt hụt: nhóm không phải của mình, số vô lý, ngày xa');
{
  const nhomKhac = await req('POST', '/api/tienan/bao-an', {
    cookie: GV2, body: { ngay: HOM_NAY, classId: 'c1', soSuat: 1 },
  });
  check('cô nhóm khác KHÔNG chốt được', nhomKhac.status === 403, nhomKhac.status);

  const phChot = await req('POST', '/api/tienan/bao-an', {
    cookie: PH, body: { ngay: HOM_NAY, classId: 'c1', soSuat: 1 },
  });
  check('phụ huynh KHÔNG chốt được', phChot.status === 403, phChot.status);

  const siSo = (await nhomC1()).n.siSo;
  const qua = await req('POST', '/api/tienan/bao-an', {
    cookie: GV, body: { ngay: HOM_NAY, classId: 'c1', soSuat: siSo + 1 },
  });
  check('nhiều hơn sĩ số thì bị từ chối', qua.status === 400, qua.status);
  check('báo lỗi nói rõ trần là bao nhiêu', new RegExp(String(siSo)).test(qua.data?.error || ''), qua.data?.error);

  const am = await req('POST', '/api/tienan/bao-an', {
    cookie: GV, body: { ngay: HOM_NAY, classId: 'c1', soSuat: -1 },
  });
  check('số âm bị từ chối', am.status === 400, am.status);

  const xa = await req('POST', '/api/tienan/bao-an', {
    cookie: GV, body: { ngay: '2019-01-01', classId: 'c1', soSuat: 1 },
  });
  check('ngày xa quá bị từ chối — thường là gõ nhầm năm', xa.status === 400, xa.status);

  const khongCo = await req('POST', '/api/tienan/bao-an', {
    cookie: GV, body: { ngay: HOM_NAY, classId: 'khong-co-nhom-nay', soSuat: 1 },
  });
  check('nhóm không tồn tại thì 404', khongCo.status === 404, khongCo.status);
}

// ===========================================================================
console.log('\n[5] Bảng đối chiếu tháng là SỔ CỦA VĂN PHÒNG');
{
  const co = await req('GET', '/api/tienan/thang', { cookie: GV });
  check('cô KHÔNG mở được bảng tiền', co.status === 403, co.status);
  check('và câu từ chối chỉ đường sang phần thuộc về cô',
    /báo ăn/i.test(co.data?.error || ''), co.data?.error);

  const vp = await req('GET', '/api/tienan/thang', { cookie: VP });
  check('văn phòng mở được', vp.status === 200, vp.status);
  check('mặc định là tháng này', vp.data?.thang === HOM_NAY.slice(0, 7), vp.data?.thang);

  const sai = await req('GET', '/api/tienan/thang?thang=2026-13', { cookie: VP });
  check('tháng vô nghĩa bị từ chối', sai.status === 400, sai.status);
}

// ===========================================================================
console.log('\n[6] Bảng tháng đếm đúng: ngày ăn, ngày vắng, ngày hoàn tiền');
{
  const THANG = HOM_NAY.slice(0, 7);
  const d = (await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: VP })).data;
  const be = (d.danhSach || []).find(x => x.studentId === 's1');
  check('có bé s1 trong bảng', !!be, (d.danhSach || []).length);
  check('bé đi học hôm nay được tính là một ngày ăn ở trường',
    be?.soNgayAnOTruong >= 1, be);

  const be4 = (d.danhSach || []).find(x => x.studentId === 's4');
  check('bé điểm danh vắng không phép được đếm riêng',
    be4?.soNgayVangKhongPhep >= 1, be4);

  // Số ngày hoàn tiền lấy từ đúng con số văn phòng chốt ở Y2.
  check('số ngày hoàn tiền ăn lấy từ đơn đã duyệt', be?.soNgayHoanTienAn === 1, be);
  check('và kèm luôn khoảng ngày của đơn để mở ra đối chiếu',
    (be?.donHoan || []).some(x => x.fromDate === HOM_NAY), be?.donHoan);

  check('tổng của cả tháng cộng đúng',
    d.tong.soNgayHoanTienAn === (d.danhSach || []).reduce((s, x) => s + x.soNgayHoanTienAn, 0),
    d.tong);
}

// ===========================================================================
console.log('\n[7] Đơn nghỉ KHÔNG hoàn tiền thì không được cộng vào');
{
  const THANG = HOM_NAY.slice(0, 7);
  const truoc = (await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: VP })).data.tong.soNgayHoanTienAn;
  const don = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: ngayLui(3), toDate: ngayLui(3), reason: 'Xin nghỉ đi chơi' },
  });
  await req('POST', `/api/leave/${don.data.id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'khong' },
  });
  const sau = (await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: VP })).data.tong.soNgayHoanTienAn;
  check('đơn đã duyệt nhưng KHÔNG hoàn tiền thì bảng không cộng thêm ngày nào',
    sau === truoc, { truoc, sau });
}

// ===========================================================================
console.log('\n[8] Đơn vắt qua hai tháng: ĐÁNH DẤU, không đoán hộ');
{
  // Văn phòng gõ TỔNG số ngày hoàn cho cả đơn chứ không gõ từng ngày, nên một
  // đơn từ 30 tháng này sang 2 tháng sau thì app không biết chia thế nào. Chia
  // bừa là bịa ra con số không ai gõ.
  const nay = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`));
  const cuoiThang = new Date(Date.UTC(nay.getUTCFullYear(), nay.getUTCMonth() + 1, 0))
    .toISOString().slice(0, 10);
  const dauThangSau = new Date(Date.UTC(nay.getUTCFullYear(), nay.getUTCMonth() + 1, 2))
    .toISOString().slice(0, 10);

  const don = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: cuoiThang, toDate: dauThangSau, reason: 'Gia đình về quê' },
  });
  check('gửi được đơn vắt tháng', !!don.data?.id, don.data);
  await req('POST', `/api/leave/${don.data.id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 2 },
  });

  const thangNay = HOM_NAY.slice(0, 7);
  const a = (await req('GET', `/api/tienan/thang?thang=${thangNay}`, { cookie: VP })).data;
  const beA = (a.danhSach || []).find(x => x.studentId === 's1');
  check('tính TRỌN vào tháng có ngày bắt đầu',
    (beA?.donHoan || []).some(x => x.fromDate === cuoiThang && x.soNgay === 2), beA?.donHoan);
  check('VÀ ĐÁNH DẤU đơn đó là vắt tháng',
    (beA?.donHoan || []).some(x => x.fromDate === cuoiThang && x.vatThang === true), beA?.donHoan);
  check('tổng của tháng đếm được có bao nhiêu đơn cần kiểm tra tay',
    a.tong.soDonVatThang >= 1, a.tong);

  const thangSau = dauThangSau.slice(0, 7);
  const b = (await req('GET', `/api/tienan/thang?thang=${thangSau}`, { cookie: VP })).data;
  const beB = (b.danhSach || []).find(x => x.studentId === 's1');
  check('THÁNG SAU KHÔNG CỘNG LẠI ngày nào của đơn đó',
    beB?.soNgayHoanTienAn === 0, beB?.soNgayHoanTienAn);
  check('nhưng vẫn nêu đơn đó ra để văn phòng biết mà tự chia',
    (beB?.donVatSangThangNay || []).some(x => x.fromDate === cuoiThang), beB?.donVatSangThangNay);
}

// ===========================================================================
console.log('\n[9] QUY TẮC 4 — sổ tiền không được thành một cách xếp các bé');
{
  const d = (await req('GET', `/api/tienan/thang?thang=${HOM_NAY.slice(0, 7)}`, { cookie: VP })).data;
  const ten = (d.danhSach || []).map(x => x.hoTen);
  const daSap = [...ten].sort((a, b) => String(a).localeCompare(String(b), 'vi'));
  check('BẢNG XẾP THEO TÊN, không theo con số nào', ten.join('|') === daSap.join('|'), ten);

  const tep = ['routes.js', 'view.js', 'schema.sql', 'module.json']
    .map(t => fs.readFileSync(path.join(GOC, 'modules/tienan', t), 'utf8')).join('\n');
  check('không in phần trăm ra màn hình', !/\}%/.test(tep));
  check('không có chỗ nào sắp các bé theo số ngày vắng',
    !/sort\([^)]*(soNgayVang|soNgayAn|soNgayHoan)/i.test(tep));
  // Soi TÊN BIẾN và phép tính, không soi lời văn: chú thích trong chính phân
  // hệ này có nhắc "tỉ lệ chuyên cần" để nói rằng đang cố ý KHÔNG tính nó.
  check('không có biến nào tính tỉ lệ hay điểm chuyên cần của bé',
    !/(tiLe|tyLe|phanTram|chuyenCan)\s*[=:(]/.test(tep), (tep.match(/(tiLe|tyLe|phanTram|chuyenCan)\s*[=:(]/) || [])[0]);
}

// ===========================================================================
console.log('\n[10] Tệp Excel: mở được bằng Excel, và không chạy công thức lạ');
{
  const r = await taiCsv(VP, `?thang=${HOM_NAY.slice(0, 7)}`);
  check('văn phòng tải được', r.status === 200, r.status);
  check('trình duyệt nhận ra đây là tệp để tải về, không phải trang web',
    /text\/csv/.test(r.kieu) && /attachment/.test(r.tenTep), { kieu: r.kieu, ten: r.tenTep });
  check('tên tệp kèm tháng, để tải nhiều tháng không đè lên nhau',
    /doi-chieu-tien-an-\d{4}-\d{2}\.csv/.test(r.tenTep), r.tenTep);
  check('có dấu BOM ở đầu — không có thì Excel trên Windows hiện tiếng Việt thành ký tự lạ',
    r.byte[0] === 0xEF && r.byte[1] === 0xBB && r.byte[2] === 0xBF, [...r.byte.slice(0, 3)]);
  check('có cột nói thẳng dòng nào máy không chia được',
    /Đơn cần kiểm tra tay/.test(r.chu), r.chu.split('\r\n')[0]);
  check('có cột số ngày hoàn tiền ăn', /Số ngày trường hoàn tiền ăn/.test(r.chu));
  check('mỗi bé một dòng, không sót ai',
    r.chu.trim().split('\r\n').length
      === (await req('GET', `/api/tienan/thang?thang=${HOM_NAY.slice(0, 7)}`, { cookie: VP })).data.danhSach.length + 1,
    r.chu.trim().split('\r\n').length);

  const co = await taiCsv(GV);
  check('cô KHÔNG tải được tệp tiền', co.status === 403, co.status);
  const ph = await taiCsv(PH);
  check('phụ huynh cũng không', ph.status === 403, ph.status);

  // Excel coi ô bắt đầu bằng = + - @ là công thức và CHẠY nó. Họ tên do người
  // nhập gõ, nên tệp đi ra khỏi app phải vô hiệu hoá chúng.
  const ma = fs.readFileSync(path.join(GOC, 'modules/tienan/routes.js'), 'utf8');
  check('có khoá công thức trước khi ghi ra tệp',
    /khoaCongThuc/.test(ma) && /\^\[=\+\\?-@/.test(ma), ma.match(/DAU_CONG_THUC = .*/)?.[0]);
}

// ===========================================================================
console.log('\n[11] Tầng cơ sở vẫn canh ở phân hệ mới');
{
  await req('PUT', '/api/admin/classes/c2/campus', { cookie: VP, body: { campusId: 'cs2' } });

  const ds = (await req('GET', '/api/tienan/bao-an', { cookie: VP3 })).data;
  check('quản lý cơ sở 1 KHÔNG thấy nhóm của cơ sở 2',
    !(ds.nhom || []).some(x => x.classId === 'c2'), (ds.nhom || []).map(x => x.classId));

  const chot = await req('POST', '/api/tienan/bao-an', {
    cookie: VP3, body: { ngay: HOM_NAY, classId: 'c2', soSuat: 1 },
  });
  check('và KHÔNG chốt được báo ăn cho nhóm đó', chot.status === 403, chot.status);

  const bang = (await req('GET', `/api/tienan/thang?thang=${HOM_NAY.slice(0, 7)}`, { cookie: VP3 })).data;
  const beC2 = (bang.danhSach || []).some(x => x.tenNhom === 'Lá 1');
  check('bảng tiền của quản lý cơ sở 1 KHÔNG có bé của cơ sở 2', !beC2,
    (bang.danhSach || []).map(x => x.tenNhom));

  await req('PUT', '/api/admin/classes/c2/campus', { cookie: VP, body: { campusId: 'cs1' } });
}

// ===========================================================================
console.log('\n[12] Tắt phân hệ thì API bị chặn, dữ liệu vẫn còn nguyên');
{
  const tat = await req('PUT', '/api/admin/modules/tienan', { cookie: VP, body: { enabled: false } });
  check('quản trị tắt được phân hệ', tat.status === 200, tat.status);

  const goi = await req('GET', '/api/tienan/bao-an', { cookie: GV });
  check('TẮT RỒI THÌ API BỊ CHẶN, không chỉ ẩn cái ô vuông trên màn hình',
    goi.status === 404 || goi.status === 403, goi.status);

  await req('PUT', '/api/admin/modules/tienan', { cookie: VP, body: { enabled: true } });
  const { n } = await nhomC1();
  check('bật lại là chạy tiếp', !!n, n);
  check('VÀ SỐ ĐÃ CHỐT CÒN NGUYÊN — tắt là ngưng dùng, không phải xoá',
    n?.chot?.soSuat === 1, n?.chot);
}

// ===========================================================================
console.log('\n[+] NHIỀU CÔ MỘT NHÓM — canh chiều CHO PHÉP, không chỉ chiều CẤM');
{
  // Bộ canh của Báo ăn & tiền ăn đi đủ chiều CẤM: cô nhóm khác bị từ chối. Nhưng chiều
  // còn lại thì bỏ trống — CÔ THỨ HAI CỦA CÙNG MỘT NHÓM có làm được không.
  //
  // Đó mới là thay đổi nền lớn nhất của app 2 (app 1 gắn cứng một cô một lớp),
  // và một bộ canh chỉ đo chiều cấm thì vẫn xanh nguyên nếu ngày mai ai đó siết
  // nhầm thành "chỉ cô phụ trách CHÍNH mới làm được" — tức là làm hỏng đúng thứ
  // GĐ 0 đã bỏ ba commit ra để dựng.
  const doc = await req('GET', `/api/tienan/bao-an?ngay=${HOM_NAY}`, { cookie: GV3 });
  check('CÔ THỨ HAI MỞ ĐƯỢC BÁO ĂN', doc.status === 200, doc.data);
  const dsId = (doc.data?.nhom || []).map(n => n.classId).sort();
  check('và thấy ĐỦ CẢ HAI NHÓM mình đang dạy, không chỉ một',
    dsId.join(',') === 'c1,c2', dsId);

  const chot = await req('POST', '/api/tienan/bao-an', {
    cookie: GV3, body: { ngay: HOM_NAY, classId: 'c1', soSuat: 1, ghiChu: 'cô thứ hai chốt' },
  });
  check('CÔ THỨ HAI CHỐT ĐƯỢC SỐ SUẤT CHO NHÓM CHUNG', chot.status === 200, chot.data);

  // Và cô thứ hai vẫn KHÔNG chốt hộ được nhóm mình không dạy.
  const ngoai = await req('POST', '/api/tienan/bao-an', {
    cookie: GV3, body: { ngay: HOM_NAY, classId: 'c3', soSuat: 0 },
  });
  check('nhưng vẫn không chốt hộ nhóm mình không dạy', ngoai.status === 403, ngoai.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
