// NGÀY CÔNG TÍNH TỪ GIỜ VÀO / GIỜ RA (lib/ngay-cong.js).
//
// Hàm thuần, không cần máy chủ. Mỗi dòng trong bảng là một tình huống có thật
// ở cổng trường; sai một dòng là sai công của cô, và người phát hiện là kế
// toán lúc trả lương.
import path from 'path';
import { createRequire } from 'module';
import { taoBoDem, GOC } from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const { tinhTuGio, QUY_TAC_MAC_DINH } = require_(path.join(GOC, 'lib', 'ngay-cong.js'));
const { check, tongKet } = taoBoDem();

const khop = (r, mong) =>
  r.trangThai === mong.trangThai && r.cong === mong.cong && r.lyDo === mong.lyDo;

const DU = { trangThai: 'du-cong', cong: 1, lyDo: '' };
const NUA = { trangThai: 'nua-ngay', cong: 0.5, lyDo: '' };
const THIEU = { trangThai: 'can-giai-trinh', cong: 0, lyDo: 'chua-du-gio' };

console.log('\n[1] Quy tắc mặc định');
{
  check('mặc định đúng như trường đã chốt',
    QUY_TAC_MAC_DINH.phutDuCong === 480 && QUY_TAC_MAC_DINH.ca1Tu === '07:00'
      && QUY_TAC_MAC_DINH.ca1Den === '14:00' && QUY_TAC_MAC_DINH.ca2Tu === '12:00'
      && QUY_TAC_MAC_DINH.ca2Den === '18:00' && QUY_TAC_MAC_DINH.phutDuDi === 0,
    QUY_TAC_MAC_DINH);

  const bang = [
    ['07:00–15:00 đủ 8 tiếng → một công (xét giờ trước ca)', '07:00', '15:00', DU],
    ['07:00–18:00 cả ngày → một công', '07:00', '18:00', DU],
    ['07:00–14:00 trọn ca sáng → nửa ngày', '07:00', '14:00', NUA],
    ['12:00–18:00 trọn ca chiều → nửa ngày', '12:00', '18:00', NUA],
    ['06:55–14:10 vào sớm ra muộn, trọn ca sáng → nửa ngày', '06:55', '14:10', NUA],
    ['07:05–14:00 vào trễ 5 phút → cần giải trình', '07:05', '14:00', THIEU],
    ['08:00–15:30 không đủ giờ, không trọn ca → cần giải trình', '08:00', '15:30', THIEU],
    ['ra sớm hơn vào → cần giải trình, không ra công âm', '14:00', '07:00', THIEU],
    ['giờ có giây (HH:MM:SS) vẫn đọc được', '07:00:30', '15:00:00', DU],
  ];
  for (const [ten, vao, ra, mong] of bang) {
    const r = tinhTuGio(vao, ra);
    check(ten, khop(r, mong), r);
  }
}

console.log('\n[2] Thiếu giờ ra / không có dữ liệu');
{
  let r = tinhTuGio('07:00', '', { laHomNay: true });
  check('chỉ có giờ vào, hôm nay → đang làm, chưa tính công',
    khop(r, { trangThai: 'dang-lam', cong: 0, lyDo: '' }), r);

  r = tinhTuGio('07:00', '', { laHomNay: false });
  check('chỉ có giờ vào, ngày đã qua → cần giải trình vì thiếu giờ ra',
    khop(r, { trangThai: 'can-giai-trinh', cong: 0, lyDo: 'thieu-gio-ra' }), r);

  r = tinhTuGio('07:00');
  check('không truyền tuỳ chọn thì coi là ngày đã qua',
    khop(r, { trangThai: 'can-giai-trinh', cong: 0, lyDo: 'thieu-gio-ra' }), r);

  r = tinhTuGio('', '');
  check('không có gì → trạng thái rỗng, không phải "vắng"',
    khop(r, { trangThai: '', cong: 0, lyDo: '' }), r);

  r = tinhTuGio(null, undefined, { laHomNay: true });
  check('null/undefined (cột trống từ CSDL) → trạng thái rỗng',
    khop(r, { trangThai: '', cong: 0, lyDo: '' }), r);
}

console.log('\n[3] Ghi đè một phần quy tắc');
{
  let r = tinhTuGio('07:05', '14:00', { quyTac: { phutDuDi: 10 } });
  check('xê dịch 10 phút → 07:05–14:00 thành nửa ngày', khop(r, NUA), r);

  r = tinhTuGio('12:08', '17:52', { quyTac: { phutDuDi: 10 } });
  check('xê dịch 10 phút áp cho cả hai mép ca chiều', khop(r, NUA), r);

  r = tinhTuGio('07:11', '14:00', { quyTac: { phutDuDi: 10 } });
  check('quá mức xê dịch vẫn cần giải trình', khop(r, THIEU), r);

  r = tinhTuGio('08:00', '15:00', { quyTac: { phutDuCong: 420 } });
  check('đủ công 7 tiếng → 08:00–15:00 thành một công', khop(r, DU), r);

  r = tinhTuGio('08:00', '15:00');
  check('cùng giờ ấy với quy tắc mặc định thì chưa đủ', khop(r, THIEU), r);

  check('ghi đè không làm đổi bộ mặc định dùng chung',
    QUY_TAC_MAC_DINH.phutDuDi === 0 && QUY_TAC_MAC_DINH.phutDuCong === 480, QUY_TAC_MAC_DINH);
}

tongKet();
