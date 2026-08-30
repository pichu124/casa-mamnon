// Bài canh MỘT NGÀY CỦA CÔ, đi liền một mạch từ 7h tới 17h30.
//
// Chạy bằng:  npm run test:mot-ngay
//
// VÌ SAO CÓ BÀI NÀY, KHI ĐÃ CÓ BỘ CANH CHO TỪNG PHÂN HỆ
//
// Mọi bộ canh khác soát theo CHỦ ĐỀ: bài của Nhật ký ngày soát nhật ký, bài của
// Báo ăn soát báo ăn. Không bài nào đi theo THỜI GIAN, và chỗ hỏng của một ngày
// làm việc thật nằm đúng ở CHỖ BÀN GIAO giữa hai việc, không nằm trong việc nào.
//
// Đợt soát thứ ba tìm ra đúng một chỗ như vậy, và nó lộ ra trong ba phút đi
// theo trình tự — trong khi hai vòng soát trước, mỗi vòng hàng chục tác nhân
// soát theo chủ đề, đều không thấy:
//
//   07:00  gia đình báo con sốt, xin nghỉ
//   07:30  văn phòng duyệt đơn
//   08:00  BẾP trừ đúng một suất — Báo ăn hỏi bảng đơn nghỉ. ĐÚNG.
//   10:30  cô mở Nhật ký ngày. Bé nghỉ vẫn nằm giữa bốn bạn còn lại, KHÔNG một
//          dấu hiệu nào. Cô bấm "áp cả nhóm" — đúng thao tác mà cả phân hệ được
//          thiết kế quanh nó — và bé nằm nhà được ghi "ăn hết bát cơm,
//          ngủ 11h30–14h".
//   17:00  mẹ mở app, đọc đúng dòng đó về ngày con nằm nhà sốt.
//
// Không mất dữ liệu, không rò dữ liệu. Nhưng đây là MỤC TIÊU SỐ MỘT của cả app
// — thay quyển sổ liên lạc giấy — đang nói một điều mà gia đình BIẾT CHẮC là
// sai. Quyển sổ giấy không bao giờ tự ghi thay cô; app thì có.
//
// Bài này giữ cho chuỗi đó không đứt lại. Nó KHÔNG thay các bài theo chủ đề —
// nó canh đúng thứ các bài đó không nhìn tới: chỗ nối.
import path from 'path';
import Database from 'better-sqlite3';
import { createRequire } from 'module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const require2 = createRequire(import.meta.url);
const mods = require2(path.join(GOC, 'lib', 'modules.js'));
mods.napMoRong();

const DIR = thuMucTam('mot-ngay-cua-co');
sinhDuLieu(DIR);
// ĐÚNG CẤU HÌNH TRƯỜNG SẼ DÙNG: đủ tám phân hệ mầm non. Bài này vô nghĩa ở cấu
// hình mặc định — cả tám đều TẮT SẴN, nên không có ngày làm việc nào để đi.
batPhanHe(DIR, mods.moRong().map(m => m.key));
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3934), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();

const d0 = await login('hieutruong', mkQT);
await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
const QT = (await login('hieutruong', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1 (Chồi 2)
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1

const BE = 's1';

// ===========================================================================
console.log('\n[1] 07:00 — gia đình báo con sốt, xin nghỉ; 07:30 văn phòng duyệt');
let donNghi = null;
{
  const r = await req('POST', '/api/leave', { cookie: PH, body: {
    studentId: BE, fromDate: NGAY, toDate: NGAY, reason: 'Con bị sốt' } });
  check('gia đình gửi được đơn nghỉ', r.status === 200 || r.status === 201, r.data);
  donNghi = r.data?.id;

  const duyet = await req('POST', `/api/leave/${donNghi}/review`, { cookie: QT, body: {
    status: 'approved', hoanTienAn: 'co', soNgayHoan: 1 } });
  check('văn phòng duyệt được đơn', duyet.status === 200, duyet.data);
}

// ===========================================================================
console.log('\n[2] 08:00 — BẾP phải biết. Đây là vế đối chứng của cả bài');
{
  // Thiếu mục này thì mọi phép kiểm dưới xanh cả khi bảng đơn nghỉ rỗng, hoặc
  // khi phân hệ Xin phép không chạy — tức là xanh vì không có gì để tìm.
  const ba = await req('GET', `/api/tienan/bao-an?classId=c1&ngay=${NGAY}`, { cookie: GV });
  const nhom = (ba.data?.nhom || [])[0] || {};
  check('màn Báo ăn mở được', ba.status === 200, ba.status);
  check('BẾP BIẾT bé nghỉ — bé nằm trong danh sách không ăn',
    (nhom.khongAn || []).some(x => x.studentId === BE), nhom.khongAn);
  check('và suất dự kiến đã trừ đi bé đó',
    Number(nhom.suatDuKien) === Number(nhom.siSo) - 1, [nhom.siSo, nhom.suatDuKien]);
}

// ===========================================================================
console.log('\n[3] 10:30 — MÀN NHẬT KÝ NGÀY PHẢI BIẾT NỐT');
{
  const r = await req('GET', `/api/nhatky?classId=c1&ngay=${NGAY}`, { cookie: GV });
  const ds = r.data?.danhSach || [];
  const be = ds.find(x => x.studentId === BE);

  // Bé KHÔNG bị giấu đi: bé có thể vẫn tới lớp dù nhà đã xin nghỉ, và cô vẫn
  // phải ghi được. Giấu thẻ là đổi một cái sai lấy một cái sai khác.
  check('bé vẫn có mặt trong danh sách — không giấu thẻ đi', !!be, ds.map(x => x.studentId));
  check('NHƯNG MÁY CHỦ NÓI RA LÀ BÉ ĐANG NGHỈ', !!(be && be.nghiPhep), be && Object.keys(be));
  check('và nói kèm lý do gia đình ghi', be?.nghiPhep?.reason === 'Con bị sốt', be?.nghiPhep);

  const banKhac = ds.find(x => x.studentId !== BE);
  check('bé đi học bình thường thì KHÔNG có dấu đó — không đánh dấu bừa',
    banKhac && banKhac.nghiPhep === null, banKhac && banKhac.nghiPhep);
}

// ===========================================================================
console.log('\n[4] 10:31 — "ÁP CẢ NHÓM" PHẢI BỎ QUA BÉ ĐANG NGHỈ');
{
  // Đây là chỗ hỏng thật. `apCaNhom()` điền cho MỌI ô đang hiện, nên bé nghỉ ăn
  // trọn cú đó. Đo bằng mã màn hình vì đây là thao tác của trình duyệt — nhưng
  // đo bằng CẤU TRÚC (ô có dấu `data-nghi` bị lọc ra), không đo bằng chữ.
  const fs = await import('fs');
  const view = fs.readFileSync(path.join(GOC, 'modules/nhatky/view.js'), 'utf8');
  check('ô của bé đang nghỉ được đánh dấu riêng', /data-nghi=/.test(view));
  const than = view.slice(view.indexOf('apCaNhom()'));
  check('và apCaNhom() LỌC chúng ra', /\.filter\(x => !x\.dataset\.nghi\)/.test(than),
    than.slice(0, 500));
  check('màn hình nói cho cô biết đã bỏ qua mấy bé', /bé có đơn nghỉ hôm nay/.test(than));
}

// ===========================================================================
console.log('\n[5] 10:32 — cô vẫn GHI ĐƯỢC nếu bé có tới lớp, nhưng máy chủ NÓI RA');
{
  // Chặn là sai: bé có thể vẫn tới lớp, và cô có thể đang sửa một dòng ghi
  // nhầm. Im lặng cũng sai. Nên: cho ghi, và nói ra.
  const r = await req('PUT', '/api/nhatky', { cookie: GV, body: {
    ngay: NGAY,
    danhSach: [{ studentId: BE, anTrua: 'het', nguTuLuc: '11:30', nguDenLuc: '14:00' }] } });
  check('máy chủ KHÔNG chặn — vẫn ghi được', r.status === 200 && r.data?.daGhi === 1, r.data);
  check('NHƯNG NÓI RA là bé đó đang có đơn nghỉ',
    (r.data?.nhacNghi || []).some(x => x.studentId === BE), r.data?.nhacNghi);
  check('và nói bằng tiếng cô hiểu, có nhắc gia đình sẽ đọc dòng này',
    typeof r.data?.nhacNghiChu === 'string' && /gia đình sẽ đọc/.test(r.data.nhacNghiChu),
    r.data?.nhacNghiChu);

  const banKhac = 's3';
  const r2 = await req('PUT', '/api/nhatky', { cookie: GV, body: {
    ngay: NGAY, danhSach: [{ studentId: banKhac, anTrua: 'het' }] } });
  check('ghi cho bé ĐI HỌC thì KHÔNG có lời nhắc nào — không làm phiền',
    (r2.data?.nhacNghi || []).length === 0, r2.data?.nhacNghi);
}

// ===========================================================================
console.log('\n[6] 16:30 — SỔ ĐÓN TRẢ cũng phải biết');
{
  const r = await req('GET', `/api/dontra/nhom?classId=c1&ngay=${NGAY}`, { cookie: GV });
  const be = (r.data?.danhSach || []).find(x => x.studentId === BE);
  check('sổ đón trả mở được', r.status === 200, r.status);
  check('và NÓI RA là bé đang nghỉ', !!(be && be.nghiPhep), be && Object.keys(be));
  check('bảng đếm cuối buổi tách riêng số bé nghỉ — cô không đi tìm bé ở nhà',
    Number(r.data?.tong?.soNghi) === 1, r.data?.tong);
}

// ===========================================================================
console.log('\n[7] MỘT CÂU HỎI, MỘT CHỖ TRẢ LỜI');
{
  // Chỗ hỏng gốc không phải là một dòng mã sai — nó là việc CHỈ MỘT màn hỏi câu
  // "bé nào đang nghỉ", còn hai màn kia không hỏi. Nên bài canh phải canh cả
  // việc câu hỏi đó nằm ở một chỗ, không bị chép lại.
  const fs = await import('fs');
  const nghiHoc = require2(path.join(GOC, 'lib', 'nghi-hoc.js'));
  check('lib/nghi-hoc.js công bố hàm hỏi cả nhóm', typeof nghiHoc.nghiCoPhep === 'function');
  check('và hàm hỏi một bé', typeof nghiHoc.beDangNghi === 'function');
  check('mảng rỗng thì trả Map rỗng, không nổ', nghiHoc.nghiCoPhep([], NGAY).size === 0);
  check('thiếu ngày thì trả Map rỗng, không nổ', nghiHoc.nghiCoPhep([BE], '').size === 0);

  const goi = ['modules/nhatky/routes.js', 'modules/dontra/routes.js', 'modules/tienan/routes.js']
    .filter(f => /require\(['"]\.\.\/\.\.\/lib\/nghi-hoc['"]\)/.test(
      fs.readFileSync(path.join(GOC, f), 'utf8')));
  check('CẢ BA màn hằng ngày đều hỏi cùng một chỗ', goi.length === 3, goi);

  // Và không màn nào giữ bản sao riêng của câu truy vấn đó.
  //
  // ĐO ĐÚNG HÌNH DẠNG CỦA BẢN SAO, KHÔNG ĐO CHỮ "approved".
  //
  // Bản đầu của phép kiểm này bắt mọi câu có `status = 'approved'` và lập tức
  // báo đỏ `modules/tienan/routes.js` — nhưng câu ở đó là bảng HOÀN TIỀN ĂN
  // cuối tháng: nó join `leave_refund` và quét một KHOẢNG ngày
  // (`BETWEEN tu AND den`). Khác hẳn câu đang nói tới.
  //
  // Câu "bé nào đang nghỉ HÔM NAY" có một hình dạng riêng không lẫn được: một
  // ngày duy nhất nằm giữa hai đầu khoảng.
  const MAU_BAN_SAO = /fromDate\s*<=\s*\?\s*AND\s*toDate\s*>=\s*\?/;
  const chep = ['modules/nhatky/routes.js', 'modules/dontra/routes.js', 'modules/tienan/routes.js']
    .filter(f => MAU_BAN_SAO.test(fs.readFileSync(path.join(GOC, f), 'utf8')));
  check('và không màn nào giữ bản sao riêng của câu truy vấn đơn nghỉ',
    chep.length === 0, chep);
  // Vế đối chứng: mẫu trên phải khớp được với bản gốc, nếu không nó vô dụng.
  check('mẫu nhận diện đó có khớp với chính lib/nghi-hoc.js',
    MAU_BAN_SAO.test(fs.readFileSync(path.join(GOC, 'lib/nghi-hoc.js'), 'utf8')));
}

// ===========================================================================
console.log('\n[8] TẮT PHÂN HỆ XIN PHÉP thì thôi hỏi, không nổ');
{
  // Đọc một quyển sổ không còn ai cập nhật rồi hành động theo nó còn tệ hơn
  // không đọc. Đây là bước đã bị quên bốn lần trước đó (Y1, N24, Đ46, Đ65).
  const conn = new Database(path.join(DIR, 'school.db'));
  conn.prepare(`INSERT OR REPLACE INTO module_settings (moduleKey, enabled, updatedAt)
                VALUES ('xinphep', 0, ?)`).run(new Date().toISOString());
  conn.close();

  const r = await req('GET', `/api/nhatky?classId=c1&ngay=${NGAY}`, { cookie: GV });
  check('màn nhật ký vẫn mở được khi Xin phép đã tắt', r.status === 200, r.status);
  const be = (r.data?.danhSach || []).find(x => x.studentId === BE);
  check('và thôi nói bé nghỉ — vì quyển sổ đó không còn ai cập nhật',
    be && be.nghiPhep === null, be?.nghiPhep);

  const dt = await req('GET', `/api/dontra/nhom?classId=c1&ngay=${NGAY}`, { cookie: GV });
  check('sổ đón trả cũng vậy', dt.status === 200
    && (dt.data?.danhSach || []).find(x => x.studentId === BE)?.nghiPhep === null, dt.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
