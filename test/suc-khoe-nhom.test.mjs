// Bài canh SỨC KHOẺ THEO NHÓM (Đ138): bảng cân đo cả nhóm theo tháng, nhập
// cân đo cả nhóm một lượt, gia đình xem lại các lần cân đo, và tin báo.
//
// Chạy bằng:  npm run test:suc-khoe-nhom
//
// Nhà trường 07/09: "Sức khoẻ: nên để theo cấu trúc cơ sở → lớp, hiện danh
// sách bé thể hiện cân nặng, chiều cao cả lớp, có ô tháng để xem lại, bấm vào
// từng bạn xem chi tiết. Cân đo hàng tháng: sổ hết danh sách bé, GV điền
// chiều cao, cân nặng là xong. PH xem lại được các thời gian cân đo khác."
//
// CHỖ ĐÁNG CANH: (1) một bé gõ nhầm thì CẢ LƯỢT dừng, không ghi nửa chừng;
// (2) cùng ngày ghi lại thì SỬA, không nhân đôi; (3) cô nhóm khác / văn phòng
// cơ sở khác / gia đình không mở được bảng nhóm; (4) QUY TẮC 4: không trung
// bình, không xếp theo số đo, không "so với chuẩn" trên màn hình.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, GOC, HOM_NAY } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('suc-khoe-nhom');
sinhDuLieu(DIR);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'skn_qt');
const mkVp2 = taoQuanTri(DIR, 'Văn phòng cơ sở 2', 'skn_vp2');
khoaVaoCoSo(DIR, 'skn_vp2', 'cs2');
datChucVu(DIR, 'skn_vp2', 'vanphong-coso');

const { BASE, dung } = await dungMayChu({ port: 4641, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);

try {
  const qt = await login('skn_qt', mkQt);
  const vp2 = await login('skn_vp2', mkVp2);
  const co = await login('giaovien', '123456');
  const co4 = await login('giaovien4', '123456');
  const ph = await login('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Bảng cả nhóm theo tháng — ai mở được, ai không');
  {
    const r = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co.cookie });
    check('cô mở được bảng nhóm mình', r.status === 200 && r.data.className === 'Chồi 2', `${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
    check('đủ 5 bé của Chồi 2, xếp theo tên', (r.data.danhSach || []).length === 5, (r.data.danhSach || []).length);
    check('mỗi bé có hai ô: đo trong tháng và đo gần nhất (có thể trống)',
      (r.data.danhSach || []).every(b => 'doTrongThang' in b && 'doGanNhat' in b));
    const lac = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co4.cookie });
    check('cô nhóm khác KHÔNG mở được', lac.status === 403, `${lac.status}`);
    const phThu = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: ph.cookie });
    check('gia đình KHÔNG mở được bảng cả nhóm', phThu.status === 403, `${phThu.status}`);
    const vpKhac = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: vp2.cookie });
    check('văn phòng cơ sở 2 KHÔNG mở được nhóm cơ sở 1', vpKhac.status === 403, `${vpKhac.status}`);
    const qtMo = await req('GET', `/api/health/nhom?classId=c1`, { cookie: qt.cookie });
    check('Cấp 1 mở được, tháng mặc định là tháng này', qtMo.status === 200 && qtMo.data.thang === THANG, `${qtMo.status} ${qtMo.data && qtMo.data.thang}`);
    const bia = await req('GET', `/api/health/nhom?classId=c999`, { cookie: qt.cookie });
    check('nhóm bịa → 404', bia.status === 404, `${bia.status}`);
  }

  // =========================================================================
  console.log('\n[2] Nhập cân đo cả nhóm: một bé sai là cả lượt dừng; ghi lại là sửa');
  {
    const truoc = await req('GET', '/api/notifications/rieng-be', { cookie: ph.cookie });
    const soTinTruoc = (truoc.data || []).filter(n => n.laRiengBe && n.loai === 'suc-khoe').length;

    const sai = await req('POST', '/api/health/can-do-nhom', { cookie: co.cookie, body: { classId: 'c1', date: NGAY, danhSach: [
      { studentId: 's1', height: 98, weight: 15 },
      { studentId: 's3', height: 170, weight: 16 },   // gõ nhầm — chiều cao của người lớn
    ] } });
    check('một bé gõ nhầm → 400 và nói tên bé', sai.status === 400 && /Phạm Gia Hân/.test(sai.data.error || ''), `${sai.status} ${sai.data && sai.data.error}`);
    const chuaGhi = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co.cookie });
    check('và KHÔNG ghi bé nào — kể cả bé đúng', (chuaGhi.data.danhSach || []).every(b => !b.doTrongThang || b.doTrongThang.date !== NGAY), JSON.stringify((chuaGhi.data.danhSach || []).map(b => b.doTrongThang)));

    const dung1 = await req('POST', '/api/health/can-do-nhom', { cookie: co.cookie, body: { classId: 'c1', date: NGAY, danhSach: [
      { studentId: 's1', height: 98, weight: 15 },
      { studentId: 's3', height: 101.5, weight: '' },
      { studentId: 's4', height: '', weight: '' },     // để trống: bỏ qua
    ] } });
    check('lượt đúng → 200, thêm 2 bé, bỏ qua bé trống', dung1.status === 200 && dung1.data.daThem === 2 && dung1.data.soBe === 2, JSON.stringify(dung1.data));
    const bang = await req('GET', `/api/health/nhom?classId=c1&thang=${THANG}`, { cookie: co.cookie });
    const s1 = (bang.data.danhSach || []).find(b => b.studentId === 's1');
    const s3 = (bang.data.danhSach || []).find(b => b.studentId === 's3');
    const s4 = (bang.data.danhSach || []).find(b => b.studentId === 's4');
    check('bảng tháng này hiện số của s1', s1 && s1.doTrongThang && s1.doTrongThang.height === 98 && s1.doTrongThang.weight === 15, JSON.stringify(s1 && s1.doTrongThang));
    check('s3 chỉ có chiều cao, cân nặng trống (không bịa 0)', s3 && s3.doTrongThang && s3.doTrongThang.height === 101.5 && s3.doTrongThang.weight === null, JSON.stringify(s3 && s3.doTrongThang));
    check('s4 bỏ trống → không có dòng tháng này', s4 && s4.doTrongThang === null, JSON.stringify(s4 && s4.doTrongThang));

    const dung2 = await req('POST', '/api/health/can-do-nhom', { cookie: co.cookie, body: { classId: 'c1', date: NGAY, danhSach: [
      { studentId: 's1', height: 98.5, weight: 15.2 },
    ] } });
    check('ghi lại cùng ngày → SỬA, không nhân đôi', dung2.status === 200 && dung2.data.daSua === 1 && dung2.data.daThem === 0, JSON.stringify(dung2.data));
    const hoSo = await req('GET', '/api/health?studentId=s1', { cookie: co.cookie });
    const canDoHomNay = (hoSo.data.records || []).filter(r => r.type === 'checkup' && r.date === NGAY);
    check('hồ sơ s1 chỉ có MỘT dòng cân đo hôm nay, số đã sửa', canDoHomNay.length === 1 && canDoHomNay[0].height === 98.5, JSON.stringify(canDoHomNay));
    check('tiêu đề dòng nói rõ là cân đo tháng', /Cân đo tháng \d{2}\/\d{4}/.test(canDoHomNay[0] && canDoHomNay[0].title), canDoHomNay[0] && canDoHomNay[0].title);

    const thangKhac = await req('GET', `/api/health/nhom?classId=c1&thang=2020-01`, { cookie: co.cookie });
    check('xem tháng khác → cột "trong tháng" trống nhưng "gần nhất" vẫn có', (() => {
      const b = (thangKhac.data.danhSach || []).find(x => x.studentId === 's1');
      return b && b.doTrongThang === null && b.doGanNhat && b.doGanNhat.height === 98.5;
    })());

    const sau = await req('GET', '/api/notifications/rieng-be', { cookie: ph.cookie });
    const tin = (sau.data || []).filter(n => n.laRiengBe && n.loai === 'suc-khoe');
    check('mẹ s1 nhận tin "cô vừa ghi cân đo" — hai lượt lưu là hai tin', tin.length === soTinTruoc + 2, `${soTinTruoc} → ${tin.length}`);
    check('tin trỏ về màn Sức khoẻ', tin[0] && tin[0].hash === '#/health', tin[0] && tin[0].hash);

    const mai = new Date(Date.parse(`${NGAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const tuongLai = await req('POST', '/api/health/can-do-nhom', { cookie: co.cookie, body: { classId: 'c1', date: mai, danhSach: [{ studentId: 's1', height: 99 }] } });
    check('ngày chưa tới → 400', tuongLai.status === 400, `${tuongLai.status}`);
    const beLac = await req('POST', '/api/health/can-do-nhom', { cookie: co.cookie, body: { classId: 'c1', date: NGAY, danhSach: [{ studentId: 's9', height: 80 }] } });
    check('bé không thuộc nhóm → 400, không ghi', beLac.status === 400, `${beLac.status}`);
    const coKhac = await req('POST', '/api/health/can-do-nhom', { cookie: co4.cookie, body: { classId: 'c1', date: NGAY, danhSach: [{ studentId: 's1', height: 99 }] } });
    check('cô nhóm khác KHÔNG ghi được', coKhac.status === 403, `${coKhac.status}`);
    const phGhi = await req('POST', '/api/health/can-do-nhom', { cookie: ph.cookie, body: { classId: 'c1', date: NGAY, danhSach: [{ studentId: 's1', height: 99 }] } });
    check('gia đình KHÔNG ghi được', phGhi.status === 403, `${phGhi.status}`);
  }

  // =========================================================================
  console.log('\n[3] Gia đình xem lại các lần cân đo; nhà khác không thấy');
  {
    const r = await req('GET', '/api/health?studentId=s1', { cookie: ph.cookie });
    check('hồ sơ của con có danh sách các lần cân đo', r.status === 200 && Array.isArray(r.data.lichSuCanDo) && r.data.lichSuCanDo.length >= 1, `${r.status} ${JSON.stringify(r.data && r.data.lichSuCanDo).slice(0, 120)}`);
    check('mới nhất trước, mỗi dòng có ngày + cao/nặng', r.data.lichSuCanDo[0].date === NGAY && r.data.lichSuCanDo[0].height === 98.5);
    check('KHÔNG có ô chênh lệch / tăng giảm / so chuẩn trong dữ liệu trả về',
      r.data.lichSuCanDo.every(x => !('chenhLech' in x) && !('tangGiam' in x) && !('chuan' in x)));
    const khac = await req('GET', '/api/health?studentId=s3', { cookie: ph.cookie });
    check('nhà khác KHÔNG xem được hồ sơ s3', khac.status === 403, `${khac.status}`);
  }

  // =========================================================================
  console.log('\n[4] Màn hình: bảng nhóm, hộp nhập cả nhóm, không so bé với bé');
  {
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/health.js'), 'utf8');
    check('cô và văn phòng cùng vào bảng nhóm (văn phòng không rơi vào màn gia đình)', /u\.role === 'teacher' \|\| u\.role === 'admin'/.test(v) && /renderNhom/.test(v));
    check('có ô chọn tháng và ô chọn nhóm (lọc theo cơ sở)', /type="month" id="ht-thang"/.test(v) && /nhomCuaToi\(\)/.test(v) && /c\.campusId === coSo/.test(v));
    check('có hộp nhập cân đo cả nhóm với một nút Lưu', /ht-cd-luu/.test(v) && /can-do-nhom/.test(v));
    check('bé chưa đo nói bằng chữ xám về việc chưa làm, không đỏ', /Tháng này chưa đo/.test(v) && !/danger[^\n]*Tháng này chưa đo/.test(v));
    // Soi MÃ, không soi chú thích: chú thích được phép nhắc tới điều bị cấm.
    const ma = v.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('không dòng mã nào tính trung bình nhóm hay xếp theo số đo',
      !/trungBinh|trung bình|reduce\([^)]*(height|weight)/.test(ma) && !/sort\([^)]*(height|weight)/.test(ma));
    check('gia đình có thẻ "Các lần cân đo", chỉ con số từng lần', /Các lần cân đo/.test(v) && /không chênh lệch, không mũi tên/.test(v));
    check('không còn ô chọn "Tiêm chủng" khi ghi mới', !/pickType\('vaccination'\)/.test(v));
    // LỐI VÒNG QUA BIỂU MẪU SỬA — A6, nhà trường chốt 10/09/2026.
    //
    // Bài canh trên soi đúng chữ `pickType(`, nên biểu mẫu SỬA gọi
    // `pickTypeSua('vaccination')` đi qua sạch sẽ: cô ghi một bản "Khám", bấm
    // Sửa, đổi nó thành Tiêm chủng — và máy chủ nhận. Đúng kiểu "bài kiểm thử
    // bao phủ thiếu đúng chỗ nguy hiểm" mà CLAUDE.md dặn phải nêu.
    check('và cũng không còn ở biểu mẫu SỬA (lối vòng)', !/pickTypeSua\('vaccination'\)/.test(v));
    const rt = fs.readFileSync(path.join(GOC, 'routes/health.js'), 'utf8');
    check('máy chủ: xếp theo tên, không theo số đo', /ORDER BY name/.test(rt) && !/ORDER BY height|ORDER BY weight/.test(rt));
    check('máy chủ tách danh sách loại ĐỌC và loại GHI MỚI',
      /TYPES_GHI\s*=\s*\['checkup',\s*'incident'\]/.test(rt) && /TYPES_DOC/.test(rt));
    const lm = fs.readFileSync(path.join(GOC, 'lib/modules.js'), 'utf8');
    check('mô tả phân hệ trên màn Quản trị không còn nhắc tiêm chủng',
      !/cân đo định kỳ, tiêm chủng/.test(lm));
  }

  // =========================================================================
  console.log('\n[5] A6 — bỏ tiêm chủng là NGƯNG DÙNG, không phải xoá dữ liệu');
  {
    // Ghi MỚI loại tiêm chủng: máy chủ từ chối, và từ chối bằng tiếng của
    // trường chứ không phải "không hợp lệ" — điện thoại đã cài app còn giữ bản
    // giao diện cũ và vẫn gửi được loại này.
    const moi = await req('POST', '/api/health', {
      cookie: co.cookie,
      body: { studentId: 's1', type: 'vaccination', title: 'Mũi 5 trong 1' },
    });
    check('không ghi MỚI được ghi nhận tiêm chủng', moi.status === 400, `${moi.status}`);
    check('và câu từ chối nói rõ phải bấm gì thay thế',
      /không ghi tiêm chủng nữa/.test(moi.data?.error || ''), moi.data?.error);

    // Hai loại còn lại vẫn ghi được y như trước — Nguyên tắc số 1 vế 2.
    const kham = await req('POST', '/api/health', {
      cookie: co.cookie,
      body: { studentId: 's1', type: 'checkup', title: 'Khám định kỳ tháng 9', height: 99, weight: 15 },
    });
    check('loại Khám / cân đo vẫn ghi được y như trước', kham.status === 200 || kham.status === 201, `${kham.status}`);

    // BẢN GHI CŨ PHẢI CÒN NGUYÊN VÀ CÒN SỬA ĐƯỢC. Dữ liệu mẫu có sẵn một bản
    // ghi tiêm chủng (data/seed.js). Đây là vế "không xoá dữ liệu của nó".
    const hs = await req('GET', '/api/health?studentId=s1', { cookie: co.cookie });
    const cu = (hs.data?.records || []).find(x => x.type === 'vaccination');
    check('bản ghi tiêm chủng CŨ vẫn đọc được, vẫn mang đúng nhãn', !!cu, cu && cu.title);
    if (cu) {
      const sua = await req('PUT', `/api/health/${cu.id}`, {
        cookie: co.cookie, body: { title: 'Sửa tiêu đề bản ghi cũ' },
      });
      check('và vẫn sửa được tiêu đề', sua.status === 200, `${sua.status}`);
      const doiSang = await req('PUT', `/api/health/${cu.id}`, {
        cookie: co.cookie, body: { type: 'checkup' },
      });
      check('bản ghi cũ đổi SANG loại còn dùng thì được', doiSang.status === 200, `${doiSang.status}`);
    }

    // Và đây là chốt thật của lối vòng: KHÔNG được biến một bản ghi khác THÀNH
    // tiêm chủng. Giao diện đã bỏ nút, nhưng chốt phải nằm ở máy chủ.
    const hs2 = await req('GET', '/api/health?studentId=s1', { cookie: co.cookie });
    const bkham = (hs2.data?.records || []).find(x => x.type === 'checkup');
    if (bkham) {
      const vong = await req('PUT', `/api/health/${bkham.id}`, {
        cookie: co.cookie, body: { type: 'vaccination' },
      });
      check('KHÔNG biến được một ghi nhận khác THÀNH tiêm chủng qua đường sửa',
        vong.status === 400, `${vong.status}`);
    }
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Sức khoẻ theo nhóm: bảng tháng, nhập cả nhóm, lịch sử cân đo');
