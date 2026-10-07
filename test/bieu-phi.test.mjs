// Bài canh TẦNG BIỂU PHÍ — kế toán soạn, cấp 1 duyệt rồi khoá (Đ200 — việc 33).
//
// Chạy bằng:  npm run test:bieu-phi
//
// NHÀ TRƯỜNG NÓI: *"kế toán soạn, cấp 1 duyệt rồi khoá, muốn sửa phải xin mở"*.
// Bốn vế, và mỗi vế hỏng một kiểu khác nhau:
//
//   • "kế toán soạn"  hỏng thành: ai cũng soạn được bảng giá.
//   • "cấp 1 duyệt"   hỏng thành: KẾ TOÁN TỰ DUYỆT BẢNG GIÁ CỦA CHÍNH MÌNH —
//     kiểu hỏng tệ nhất, vì màn hình vẫn hiện đủ hai bước, sổ vẫn ghi "đã
//     duyệt", chỉ là chữ ký duyệt và chữ ký soạn cùng một người. Nhìn từ
//     ngoài không phân biệt được với bản đúng.
//   • "rồi khoá"      hỏng thành: khoá chỉ có ở màn hình, đường API vẫn ghi.
//   • "xin mở mới sửa" hỏng thành: xin mở không cần lý do, nên người duyệt chỉ
//     bấm bừa và cái khoá thành thủ tục.
//
// VÀ MỘT VẾ THỨ NĂM KHÔNG AI NÓI RA, mục [7] canh: tầng biểu phí KHÔNG ĐƯỢC
// CHẶN đường ghi sổ tiền đang chạy. Bắt mọi khoản thu phải chép từ một biểu
// phí đã duyệt nghe rất chặt, nhưng ngày bật lên thì trường chưa có biểu phí
// nào — kế toán không ghi được một khoản nào nữa. Đó là Nguyên tắc số 1.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, khoaVaoCoSo, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('bieu-phi');
sinhDuLieu(DIR);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng B', 'bp_ht');
const mkKT = taoQuanTri(DIR, 'Kế Toán B', 'bp_kt');
const mkVP = taoQuanTri(DIR, 'Văn Phòng B', 'bp_vp');
const mkQL2 = taoQuanTri(DIR, 'Quản Lý CS2 B', 'bp_ql2');
datChucVu(DIR, 'bp_kt', 'ketoan');
datChucVu(DIR, 'bp_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 'bp_vp', 'cs1');
datChucVu(DIR, 'bp_ql2', 'quanly-coso');
khoaVaoCoSo(DIR, 'bp_ql2', 'cs2');
batPhanHe(DIR, ['hocphi']);

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4816), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
function dongCsdl(bieuPhiId) {
  const conn = new Database(CSDL);
  try {
    return conn.prepare('SELECT * FROM hocphi_bieuphi_dong WHERE bieuPhiId = ? ORDER BY thuTu').all(bieuPhiId);
  } finally { conn.close(); }
}
function banGhi(bieuPhiId) {
  const conn = new Database(CSDL);
  try { return conn.prepare('SELECT * FROM hocphi_bieuphi WHERE id = ?').get(bieuPhiId) || null; }
  finally { conn.close(); }
}
function luotXin(bieuPhiId) {
  const conn = new Database(CSDL);
  try {
    return conn.prepare('SELECT * FROM hocphi_bieuphi_moKhoa WHERE bieuPhiId = ? ORDER BY rowid').all(bieuPhiId);
  } finally { conn.close(); }
}
const BA_DONG = [
  { noiDung: 'Học phí tháng', loai: 'hoc-phi', soTien: 3500000 },
  { noiDung: 'Tiền ăn tháng', loai: 'tien-an', soTien: 900000 },
  { noiDung: 'Xe đưa đón', loai: 'xe-dua-don', soTien: 600000 },
];

try {
  const HT = await vao('bp_ht', mkHT);
  const KT = await vao('bp_kt', mkKT);
  const VP = await vao('bp_vp', mkVP);
  const QL2 = await vao('bp_ql2', mkQL2);

  // =========================================================================
  console.log('\n[1] ĐƯỜNG "bieu-phi" KHÔNG ĐƯỢC RƠI VÀO ĐƯỜNG "/:id"');
  {
    // Express khớp theo THỨ TỰ ĐĂNG KÝ: đường có chỗ trống `:id` đứng trước
    // thì nuốt đường có tên thật đứng sau.
    //
    // PHÉP ĐO NÀY CANH MỘT LUẬT, KHÔNG VÁ MỘT LỖI ĐANG CÓ — ghi rõ ra để
    // người sau không tưởng nó đang chặn thứ gì. Kiểm lại lúc viết bài: mấy
    // đường `/:id` hiện có đều bốn đoạn và đoạn cuối là chữ thật, còn
    // `/api/hocphi/bieu-phi` ba đoạn, nên hôm nay KHÔNG đường nào nuốt được
    // nó. Thứ nó canh là ngày ai đó thêm `GET /api/hocphi/:id` — lúc ấy cả
    // khối này rơi vào đó và kế toán nhận câu "Không tìm thấy khoản thu",
    // một lỗi mà thông báo không chỉ ra nguyên nhân.
    const ma = fs.readFileSync(path.join(GOC, 'modules', 'hocphi', 'routes.js'), 'utf8');
    const viTriBieuPhi = ma.indexOf("app.get('/api/hocphi/bieu-phi'");
    const viTriCoId = ma.search(/app\.(get|post|put|delete)\('\/api\/hocphi\/:id/);
    check('đối chứng — tìm thấy cả hai khối trong tệp', viTriBieuPhi > 0 && viTriCoId > 0,
      `${viTriBieuPhi} / ${viTriCoId}`);
    check('KHỐI BIỂU PHÍ ĐĂNG KÝ TRƯỚC MỌI ĐƯỜNG CÓ /:id',
      viTriBieuPhi < viTriCoId, `bieu-phi ${viTriBieuPhi} < :id ${viTriCoId}`);

    // Và đo bằng hành vi, không chỉ bằng thứ tự chữ trong tệp.
    const r = await req('GET', '/api/hocphi/bieu-phi', { cookie: KT });
    check('gọi thật thì vào đúng đường biểu phí', r.status === 200 && Array.isArray(r.data.bieuPhi),
      `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  }

  // =========================================================================
  console.log('\n[2] KẾ TOÁN SOẠN — và chỉ người lo tiền mới soạn được');
  let bpId = '';
  {
    const tao = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT, body: { ten: 'Biểu phí năm học 2026–2027', namHoc: '2026-2027', dong: BA_DONG },
    });
    check('kế toán soạn được bản nháp', tao.status === 201, `${tao.status} ${JSON.stringify(tao.data).slice(0, 160)}`);
    bpId = tao.data && tao.data.id;
    check('bản mới ở trạng thái ĐANG SOẠN', tao.data && tao.data.trangThai === 'nhap', tao.data && tao.data.trangThai);
    check('ba dòng vào đủ và cộng ra đúng tổng',
      dongCsdl(bpId).length === 3 && tao.data.tongTien === 5000000,
      `${dongCsdl(bpId).length} dòng / ${tao.data && tao.data.tongTien}`);

    const vp = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: VP, body: { ten: 'Bảng giá của văn phòng', dong: BA_DONG },
    });
    check('VĂN PHÒNG CƠ SỞ KHÔNG SOẠN ĐƯỢC bảng giá', vp.status === 403, vp.status);
    check('và câu từ chối nói ra người vẫn làm được việc gì',
      /xem được sổ tiền/.test(String(vp.data && vp.data.error)), vp.data && vp.data.error);

    // Sửa khi còn nháp: ĐẶT LẠI TRỌN DANH SÁCH DÒNG, đúng hình dạng một bảng
    // giá người ta sửa trên màn rồi bấm Lưu.
    const sua = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT,
      body: { id: bpId, ten: 'Biểu phí năm học 2026–2027', namHoc: '2026-2027', dong: BA_DONG.slice(0, 2) },
    });
    check('còn nháp thì sửa được', sua.status === 200, sua.status);
    check('sửa xong còn đúng hai dòng, không cộng dồn thành năm',
      dongCsdl(bpId).length === 2, dongCsdl(bpId).length);

    // Số tiền sai thì TỪ CHỐI CẢ MẺ — một bảng giá ghi vào nửa chừng còn tệ
    // hơn không ghi được.
    const hong = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT,
      body: { id: bpId, ten: 'Biểu phí năm học 2026–2027',
        dong: [{ noiDung: 'Khoản tốt', loai: 'hoc-phi', soTien: 100000 },
          { noiDung: 'Khoản xấu', loai: 'hoc-phi', soTien: -5 }] },
    });
    check('một dòng số tiền âm thì TỪ CHỐI CẢ MẺ', hong.status === 400, hong.status);
    check('và bảng giá cũ CÒN NGUYÊN, không bị ghi vào nửa chừng',
      dongCsdl(bpId).length === 2, dongCsdl(bpId).map(d => d.noiDung).join(', '));
  }

  // =========================================================================
  console.log('\n[3] GỬI DUYỆT — gửi xong là THÔI SỬA ĐƯỢC');
  {
    const gui = await req('POST', `/api/hocphi/bieu-phi/${bpId}/gui`, { cookie: KT, body: {} });
    check('kế toán gửi lên chờ duyệt được', gui.status === 200, `${gui.status} ${JSON.stringify(gui.data).slice(0, 140)}`);
    check('trạng thái chuyển sang CHỜ DUYỆT', banGhi(bpId).trangThai === 'cho-duyet', banGhi(bpId).trangThai);
    check('còn vết ai gửi và gửi lúc nào', !!banGhi(bpId).guiBoi && !!banGhi(bpId).guiLuc,
      `${banGhi(bpId).guiBoi} / ${banGhi(bpId).guiLuc}`);

    const sua = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT, body: { id: bpId, ten: 'Sửa lén khi đang chờ', dong: BA_DONG },
    });
    check('ĐANG CHỜ DUYỆT THÌ KHÔNG SỬA ĐƯỢC NỮA', sua.status === 403, sua.status);
    check('tên bảng giá không bị đổi theo lượt sửa bị chặn',
      banGhi(bpId).ten !== 'Sửa lén khi đang chờ', banGhi(bpId).ten);

    const lai = await req('POST', `/api/hocphi/bieu-phi/${bpId}/gui`, { cookie: KT, body: {} });
    check('gửi lần hai thì báo đã gửi rồi, không tạo thêm lượt', lai.status === 400, lai.status);
  }

  // =========================================================================
  console.log('\n[4] NGƯỜI SOẠN KHÔNG TỰ DUYỆT ĐƯỢC BẢNG GIÁ CỦA CHÍNH MÌNH');
  {
    // ĐÂY LÀ MỤC QUAN TRỌNG NHẤT CỦA CẢ BÀI. Bỏ vế này thì mọi thứ còn lại
    // vẫn chạy y nguyên — hai bước vẫn hiện trên màn, sổ vẫn ghi "đã duyệt" —
    // chỉ là hai chữ ký cùng một người. Không nhìn ra được từ bên ngoài.
    const tuDuyet = await req('POST', `/api/hocphi/bieu-phi/${bpId}/duyet`, {
      cookie: KT, body: { quyetDinh: 'duyet' },
    });
    check('KẾ TOÁN KHÔNG DUYỆT ĐƯỢC biểu phí mình vừa gửi', tuDuyet.status === 403, tuDuyet.status);
    check('và câu từ chối nói ra vì sao, không chỉ nói "không có quyền"',
      /không tự duyệt/.test(String(tuDuyet.data && tuDuyet.data.error)), tuDuyet.data && tuDuyet.data.error);
    check('bảng giá vẫn đang CHỜ DUYỆT sau lượt tự duyệt bị chặn',
      banGhi(bpId).trangThai === 'cho-duyet', banGhi(bpId).trangThai);

    const vpDuyet = await req('POST', `/api/hocphi/bieu-phi/${bpId}/duyet`, {
      cookie: VP, body: { quyetDinh: 'duyet' },
    });
    check('văn phòng cơ sở cũng không duyệt được', vpDuyet.status === 403, vpDuyet.status);

    // Chốt chặn nằm ở `db.duyetBieuPhiDuoc`, không phải ở một danh sách chức
    // vụ chép lại lần thứ hai trong tệp phân hệ — hai bản là hai bản sẽ trôi
    // khỏi nhau.
    const ma = fs.readFileSync(path.join(GOC, 'modules', 'hocphi', 'routes.js'), 'utf8');
    // CẮT ĐÚNG KHỐI BIỂU PHÍ, không soi cả tệp.
    //
    // Bản đầu của phép đo này soi cả `modules/hocphi/routes.js` và nó đỏ —
    // đúng, nhưng đỏ vì một thứ khác: `CHUC_VU_DOC_UU_DAI` của Đ169, một danh
    // sách trả lời câu hỏi khác hẳn ("ai ĐỌC được bảng ưu đãi"). Gộp hai thứ
    // vào một phép đo thì lần sau ai đó sửa một trong hai đều phải đọc lại cả
    // hai, và phép đo mất nghĩa. Ở đây chỉ hỏi: TẦNG BIỂU PHÍ có tự chép lại
    // danh sách chức vụ cấp 1 không.
    const khoi = ma.slice(ma.indexOf('// TẦNG BIỂU PHÍ (Đ200'),
      ma.indexOf("app.post('/api/hocphi/:id/xac-nhan'"));
    const sach = khoi.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('đối chứng — cắt đúng khối biểu phí', khoi.length > 2000 && /bieu-phi\/:id\/duyet/.test(khoi),
      khoi.length);
    check('hai đường quyết định hỏi ĐÚNG `db.duyetBieuPhiDuoc`',
      (sach.match(/db\.duyetBieuPhiDuoc\(req\.user\)/g) || []).length >= 2,
      (sach.match(/db\.duyetBieuPhiDuoc/g) || []).length);
    check('và khối biểu phí KHÔNG chép lại danh sách chức vụ cấp 1',
      !/['"]hieu-truong['"]/.test(sach), (sach.match(/['"]hieu-truong['"]/g) || []));

    const duyet = await req('POST', `/api/hocphi/bieu-phi/${bpId}/duyet`, {
      cookie: HT, body: { quyetDinh: 'duyet' },
    });
    check('HIỆU TRƯỞNG duyệt được', duyet.status === 200, `${duyet.status} ${JSON.stringify(duyet.data).slice(0, 140)}`);
    check('duyệt xong là ĐÃ DUYỆT VÀ KHOÁ', banGhi(bpId).trangThai === 'da-duyet', banGhi(bpId).trangThai);
    check('còn vết AI duyệt và duyệt LÚC NÀO',
      !!banGhi(bpId).duyetBoi && !!banGhi(bpId).duyetLuc,
      `${banGhi(bpId).duyetBoi} / ${banGhi(bpId).duyetLuc}`);
  }

  // =========================================================================
  console.log('\n[5] DUYỆT XONG LÀ KHOÁ — khoá ở MÁY CHỦ, không phải ở màn hình');
  {
    const sua = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT, body: { id: bpId, ten: 'Sửa sau khi đã duyệt', dong: BA_DONG },
    });
    check('ĐÃ DUYỆT RỒI THÌ KẾ TOÁN KHÔNG SỬA ĐƯỢC', sua.status === 403, sua.status);
    // Một câu từ chối không chỉ ra đường đi tiếp thì người dùng chỉ còn cách
    // đi hỏi — và bước xin mở khoá vừa dựng xong thành ra không ai biết.
    check('câu từ chối CHỈ RA ĐƯỜNG ĐI TIẾP là xin mở khoá',
      /xin.*mở khoá/i.test(String(sua.data && sua.data.error)), sua.data && sua.data.error);
    check('bảng giá không bị đổi một chữ nào', banGhi(bpId).ten !== 'Sửa sau khi đã duyệt', banGhi(bpId).ten);
    check('và số dòng cũng không đổi', dongCsdl(bpId).length === 2, dongCsdl(bpId).length);

    // Ngay cả hiệu trưởng cũng đi qua cùng cái khoá — khoá theo TRẠNG THÁI,
    // không theo vai. Khoá mà cấp trên đi vòng được thì không phải khoá.
    const htSua = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: HT, body: { id: bpId, ten: 'Hiệu trưởng sửa thẳng', dong: BA_DONG },
    });
    check('CẢ HIỆU TRƯỞNG CŨNG KHÔNG SỬA THẲNG ĐƯỢC bản đã khoá', htSua.status === 403, htSua.status);
  }

  // =========================================================================
  console.log('\n[6] XIN MỞ KHOÁ — lý do là BẮT BUỘC, và mở không xoá dấu đã duyệt');
  {
    const khongLyDo = await req('POST', `/api/hocphi/bieu-phi/${bpId}/xin-mo`, { cookie: KT, body: {} });
    check('xin mở KHÔNG CÓ LÝ DO thì bị từ chối', khongLyDo.status === 400, khongLyDo.status);
    const quaNgan = await req('POST', `/api/hocphi/bieu-phi/${bpId}/xin-mo`, {
      cookie: KT, body: { lyDo: 'sửa tí' },
    });
    check('lý do vài chữ cho có cũng bị từ chối', quaNgan.status === 400, quaNgan.status);
    check('chưa có lượt xin nào được ghi', luotXin(bpId).length === 0, luotXin(bpId).length);

    const xin = await req('POST', `/api/hocphi/bieu-phi/${bpId}/xin-mo`, {
      cookie: KT, body: { lyDo: 'Ghi nhầm tiền ăn tháng 900k, đúng phải là 950k theo bảng mới' },
    });
    check('có lý do đủ rõ thì xin được', xin.status === 201, `${xin.status} ${JSON.stringify(xin.data).slice(0, 140)}`);
    check('lượt xin còn vết ai xin và vì sao',
      luotXin(bpId).length === 1 && /950k/.test(luotXin(bpId)[0].lyDo),
      JSON.stringify(luotXin(bpId)[0] || {}).slice(0, 160));

    const xinLai = await req('POST', `/api/hocphi/bieu-phi/${bpId}/xin-mo`, {
      cookie: KT, body: { lyDo: 'Xin thêm một lượt nữa cho chắc, không vì lý do gì mới' },
    });
    check('đang chờ trả lời thì KHÔNG xin chồng lượt thứ hai', xinLai.status === 409, xinLai.status);

    const tuMo = await req('POST', `/api/hocphi/bieu-phi/${bpId}/tra-loi-xin-mo`, {
      cookie: KT, body: { quyetDinh: 'mo' },
    });
    check('KẾ TOÁN KHÔNG TỰ TRẢ LỜI ĐƯỢC LƯỢT XIN CỦA CHÍNH MÌNH', tuMo.status === 403, tuMo.status);
    check('và bảng giá vẫn còn khoá sau lượt tự mở bị chặn',
      banGhi(bpId).trangThai === 'da-duyet', banGhi(bpId).trangThai);

    const duyetBoiTruoc = banGhi(bpId).duyetBoi;
    const duyetLucTruoc = banGhi(bpId).duyetLuc;
    const mo = await req('POST', `/api/hocphi/bieu-phi/${bpId}/tra-loi-xin-mo`, {
      cookie: HT, body: { quyetDinh: 'mo', yKien: 'Đồng ý, sửa xong gửi lại' },
    });
    check('hiệu trưởng mở khoá được', mo.status === 200, `${mo.status} ${JSON.stringify(mo.data).slice(0, 140)}`);
    check('mở xong thì về ĐANG SOẠN, sửa tiếp được', banGhi(bpId).trangThai === 'nhap', banGhi(bpId).trangThai);
    // MỞ KHOÁ KHÔNG PHẢI XOÁ DẤU ĐÃ DUYỆT. Đây là tiền của gia đình: câu hỏi
    // "ai đã duyệt bản trước" phải trả lời được bằng dữ liệu, kể cả sau khi
    // bảng giá được mở ra sửa.
    check('DẤU ĐÃ DUYỆT CỦA BẢN TRƯỚC CÒN NGUYÊN, không bị xoá khi mở khoá',
      banGhi(bpId).duyetBoi === duyetBoiTruoc && banGhi(bpId).duyetLuc === duyetLucTruoc,
      `${banGhi(bpId).duyetBoi} / ${banGhi(bpId).duyetLuc}`);
    check('lượt xin được đánh dấu đã mở, có người trả lời',
      luotXin(bpId)[0].trangThai === 'da-mo' && !!luotXin(bpId)[0].traLoiBoi,
      JSON.stringify(luotXin(bpId)[0]).slice(0, 160));

    const suaLai = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT, body: { id: bpId, ten: 'Biểu phí năm học 2026–2027', dong: BA_DONG },
    });
    check('mở khoá rồi thì kế toán sửa được thật, không chỉ đổi chữ trạng thái',
      suaLai.status === 200 && dongCsdl(bpId).length === 3,
      `${suaLai.status} / ${dongCsdl(bpId).length} dòng`);
  }

  // =========================================================================
  console.log('\n[7] TẦNG BIỂU PHÍ KHÔNG ĐƯỢC CHẶN ĐƯỜNG GHI SỔ TIỀN ĐANG CHẠY');
  {
    // Nguyên tắc số 1. Bắt mọi khoản thu phải chép từ một biểu phí ĐÃ DUYỆT
    // nghe rất chặt, nhưng ngày bật lên thì trường chưa có biểu phí nào —
    // kế toán không ghi nổi một khoản. Và ngay lúc này biểu phí duy nhất
    // trong cơ sở dữ liệu đang ở trạng thái `nhap`, tức đúng cảnh đó.
    check('đối chứng — lúc này KHÔNG có biểu phí nào đã duyệt',
      banGhi(bpId).trangThai !== 'da-duyet', banGhi(bpId).trangThai);

    const ghi = await req('POST', '/api/hocphi', {
      cookie: KT,
      body: { studentId: 's1', kyThu: 'Tháng 10/2026', noiDung: 'Học phí tháng 10', soTien: 3500000 },
    });
    check('CHƯA CÓ BIỂU PHÍ DUYỆT VẪN GHI ĐƯỢC KHOẢN THU như cũ', ghi.status === 201,
      `${ghi.status} ${JSON.stringify(ghi.data).slice(0, 160)}`);

    const so = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    check('và khoản vừa ghi nằm đúng trong sổ của bé',
      so.status === 200 && (so.data.khoan || []).some(k => k.noiDung === 'Học phí tháng 10'),
      so.status);

    // Cùng một ý, soi từ phía mã: đường ghi khoản thu KHÔNG được hỏi tới biểu
    // phí như một điều kiện. Biểu phí là BẢN ĐỂ CHÉP RA, không phải cái chốt.
    const ma = fs.readFileSync(path.join(GOC, 'modules', 'hocphi', 'routes.js'), 'utf8');
    const doanGhi = ma.slice(ma.indexOf("app.post('/api/hocphi', requireRole"),
      ma.indexOf("app.post('/api/hocphi/hang-loat'"));
    check('đường ghi một khoản KHÔNG hỏi tới biểu phí trước khi cho ghi',
      !/bieuPhi/i.test(doanGhi), (doanGhi.match(/.*bieuPhi.*/i) || [])[0]);
  }

  // =========================================================================
  console.log('\n[8] TẦNG CƠ SỞ — bảng giá riêng của cơ sở khác không phải việc của mình');
  {
    const riengCs1 = await req('POST', '/api/hocphi/bieu-phi', {
      cookie: KT, body: { ten: 'Biểu phí riêng cơ sở 1', campusId: 'cs1', dong: BA_DONG },
    });
    check('đối chứng — soạn được một bảng giá RIÊNG của cơ sở 1', riengCs1.status === 201,
      `${riengCs1.status} ${JSON.stringify(riengCs1.data).slice(0, 140)}`);
    const rId = riengCs1.data && riengCs1.data.id;

    const ds2 = await req('GET', '/api/hocphi/bieu-phi', { cookie: QL2 });
    check('quản lý cơ sở 2 KHÔNG thấy bảng giá riêng của cơ sở 1',
      ds2.status === 200 && !(ds2.data.bieuPhi || []).some(b => b.id === rId),
      (ds2.data.bieuPhi || []).map(b => b.ten).join(' | '));
    check('nhưng VẪN THẤY bảng giá của cả trường — đó là giá áp lên chính họ',
      (ds2.data.bieuPhi || []).some(b => b.id === bpId),
      (ds2.data.bieuPhi || []).map(b => `${b.ten}:${b.campusId || 'cả trường'}`).join(' | '));

    await req('POST', `/api/hocphi/bieu-phi/${rId}/gui`, { cookie: KT, body: {} });
    const duyetCheo = await req('POST', `/api/hocphi/bieu-phi/${rId}/duyet`, {
      cookie: QL2, body: { quyetDinh: 'duyet' },
    });
    check('và KHÔNG DUYỆT ĐƯỢC bảng giá riêng của cơ sở khác', duyetCheo.status === 403, duyetCheo.status);
    check('bảng giá ấy vẫn đang chờ đúng người duyệt', banGhi(rId).trangThai === 'cho-duyet',
      banGhi(rId).trangThai);
  }

  // =========================================================================
  console.log('\n[9] TRẢ LẠI THÌ PHẢI NÓI VÌ SAO');
  {
    const ds = await req('GET', '/api/hocphi/bieu-phi', { cookie: HT });
    const cho = (ds.data.bieuPhi || []).find(b => b.trangThai === 'cho-duyet');
    check('đối chứng — có một bảng giá đang chờ duyệt để thử', !!cho, (ds.data.bieuPhi || []).length);

    const cam = await req('POST', `/api/hocphi/bieu-phi/${cho.id}/duyet`, {
      cookie: HT, body: { quyetDinh: 'tra-lai' },
    });
    check('TRẢ LẠI MÀ KHÔNG GHI LÝ DO thì bị từ chối', cam.status === 400, cam.status);
    check('bảng giá vẫn đang chờ, không rơi về nháp vì một lượt bấm nhầm',
      banGhi(cho.id).trangThai === 'cho-duyet', banGhi(cho.id).trangThai);

    const tra = await req('POST', `/api/hocphi/bieu-phi/${cho.id}/duyet`, {
      cookie: HT, body: { quyetDinh: 'tra-lai', yKien: 'Tiền xe đưa đón chưa khớp hợp đồng nhà xe' },
    });
    check('có ý kiến thì trả lại được', tra.status === 200, tra.status);
    check('trả lại thì về ĐANG SOẠN để kế toán sửa tiếp', banGhi(cho.id).trangThai === 'nhap',
      banGhi(cho.id).trangThai);
    check('và Ý KIẾN ĐI THEO BẢN GHI, không chỉ nằm trong nhật ký hệ thống',
      /nhà xe/.test(String(banGhi(cho.id).ghiChu)), banGhi(cho.id).ghiChu);
  }

  // =========================================================================
  console.log('\n[10] TIN BÁO NGƯỜI DUYỆT — KHÔNG NÊU SỐ TIỀN');
  {
    // Tin đẩy hiện trên MÀN HÌNH KHOÁ của điện thoại. Bảng giá chưa duyệt
    // không phải thứ người ngồi cạnh đọc được — cùng lối đã ghi ở `quetHanNop`
    // (Đ199).
    //
    // GIỚI HẠN CỦA PHÉP ĐO NÀY, ghi rõ để người sau không tin quá: thân gói
    // đẩy được mã hoá theo đúng chuẩn Web Push, nên đứng ngoài KHÔNG đọc
    // được nội dung thật. Chỗ này soi CHỮ trong tệp. Vế "ai nhận" bên dưới
    // mới là phép đo hành vi.
    const ma = fs.readFileSync(path.join(GOC, 'modules', 'hocphi', 'routes.js'), 'utf8');
    const doan = ma.slice(ma.indexOf('function baoNguoiDuyetBieuPhi'),
      ma.indexOf("app.get('/api/hocphi/bieu-phi'"));
    check('đối chứng — cắt đúng thân hàm báo tin', /guiChoNhieuNguoi/.test(doan), doan.length);
    check('nội dung tin KHÔNG chèn số tiền vào',
      !/tongTien|soTien/.test(doan), (doan.match(/.*(tongTien|soTien).*/) || [])[0]);
    check('người nhận hỏi ĐÚNG `db.duyetBieuPhiDuoc`, không chép danh sách chức vụ',
      /db\.duyetBieuPhiDuoc\(u\)/.test(doan));
    check('NGƯỜI GỬI KHÔNG TỰ NHẬN TIN CỦA CHÍNH MÌNH',
      /u\.id !== \(nguoiGui && nguoiGui\.id\)/.test(doan));
    check('và lọc theo phạm vi cơ sở của bảng giá',
      /phamViCoSo\(u\)/.test(doan));
    check('báo tin là VIỆC PHỤ — hỏng thì lượt gửi duyệt vẫn xong',
      /try \{[\s\S]*catch \(_\)/.test(doan));
  }

  // =========================================================================
  console.log('\n[11] TẮT PHÂN HỆ THÌ BIỂU PHÍ KHÔNG MẤT');
  {
    const truoc = new Database(CSDL);
    let soTruoc = 0;
    try { soTruoc = truoc.prepare('SELECT COUNT(*) AS n FROM hocphi_bieuphi').get().n; }
    finally { truoc.close(); }
    check('đối chứng — đang có sẵn vài bảng giá để kiểm', soTruoc >= 2, soTruoc);

    const tat = await req('PUT', '/api/admin/modules/hocphi', { cookie: HT, body: { enabled: false } });
    check('tắt được phân hệ', tat.status === 200, tat.data);
    const khiTat = await req('GET', '/api/hocphi/bieu-phi', { cookie: KT });
    check('tắt rồi thì đường API đóng lại', khiTat.status === 404, khiTat.status);

    const bat = await req('PUT', '/api/admin/modules/hocphi', { cookie: HT, body: { enabled: true } });
    check('bật lại được', bat.status === 200, bat.data);
    const sau = await req('GET', '/api/hocphi/bieu-phi', { cookie: KT });
    check('BẬT LẠI THÌ BẢNG GIÁ CÒN NGUYÊN — không mất bản nào',
      sau.status === 200 && (sau.data.bieuPhi || []).length === soTruoc,
      `${soTruoc} → ${(sau.data.bieuPhi || []).length}`);
    check('và các dòng của bảng giá cũng còn nguyên', dongCsdl(bpId).length === 3, dongCsdl(bpId).length);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
