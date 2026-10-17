// Bài canh NHẬT KÝ NGÀY — "LƯU LÀ NHÁP, GỬI MỚI THẤY" và GIỜ THAY BỈM / ĐI VỆ SINH.
//
// Chạy bằng:  npm run test:nhat-ky-gui
//
// Góp ý của nhà trường 06/10, mục 9:
//   *"sau mỗi hành động cập nhật thông tin về ăn, ngủ, vệ sinh, thay bỉm…,
//   giáo viên đều bấm nút gửi tới phụ huynh"*, *"yêu cầu phải check kỹ làm
//   theo nhóm trước khi gửi cho PH"*, và *"ghi lại nhật ký cụ thể THỜI GIAN các
//   con thay bỉm hoặc đi vệ sinh (Poo)"*.
//
// Chủ dự án chốt 06/10: LƯU LÀ NHÁP, GỬI MỚI THẤY. Bài này canh đúng các vế:
//
//   1. Lưu (bữa, ngủ, vệ sinh) KHÔNG báo ai và gia đình KHÔNG đọc được bản nháp.
//   2. Gửi = chụp đúng PHẦN đó của từng bé đã chọn; gia đình đọc ẢNH CHỤP — cô
//      sửa sau khi gửi thì gia đình vẫn thấy bản đã gửi cho tới lần gửi sau.
//   3. Gửi lại khi không đổi gì thì không báo lại; đổi rồi gửi thì báo "cô vừa
//      cập nhật".
//   4. Ngày ghi TRƯỚC mốc đổi luật vẫn hiện y như cũ (Nguyên tắc số 1, vế 3),
//      và khởi động lại máy chủ không biến bản nháp mới thành "ngày cũ".
//   5. Giờ thay bỉm / đi vệ sinh: ghi cho nhiều bé một lần; số lần ở
//      `nhatky_ngay` CỘNG / TRỪ theo từng mốc, không xoá số cô đã gõ tay.
//   6. Quyền: gia đình không gửi, không ghi; cô nhóm khác không gửi được bé
//      nhóm này; nhà khác không đọc được bé nhà mình.
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, GOC, HOM_NAY as homNayVN } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhat-ky-gui');
sinhDuLieu(DIR, { phanHe: true });   // cần các ngày nhật ký mẫu để canh "ngày cũ vẫn hiện như cũ"
batPhanHe(DIR, ['nhatky']);

const CONG = Number(process.env.TEST_PORT || 4683);
let sv = await dungMayChu({ port: CONG, dir: DIR });
let req = taoReq(sv.BASE);
let login = taoLogin(req);

const HOM_NAY = homNayVN();
// Một ngày KHÔNG có dòng mẫu nào: mọi thứ ở ngày này ghi SAU mốc đổi luật.
const NGAY = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) - 20 * 86400000).toISOString().slice(0, 10);
const NGAY_MAI = new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

let GV, GV_NT, PH, PH_NT;
async function dangNhapHet() {
  GV = (await login('giaovien', '123456')).cookie;       // cô nhóm c1 Chồi 2
  GV_NT = (await login('giaovien4', '123456')).cookie;   // cô nhóm c4 Nhà trẻ 1 (s9, s10, s11)
  PH = (await login('phuhuynh', '123456')).cookie;       // mẹ s1 + s2
  PH_NT = (await login('ph.trang', '123456')).cookie;    // mẹ s9
}
await dangNhapHet();

const nhom = async (ngay = NGAY) => (await req('GET', `/api/nhatky?classId=c4&ngay=${ngay}`, { cookie: GV_NT })).data || {};
const beCua = (d, id) => (d.danhSach || []).find(b => b.studentId === id) || {};
const buaCua = (b, kieu) => ((b && b.buaAn) || []).find(x => x.bua === kieu) || {};
const giaDinhDoc = async (ngay = NGAY, cookie = PH_NT) =>
  (await req('GET', `/api/nhatky?studentId=s9&tu=${ngay}&den=${ngay}`, { cookie })).data || {};
const tinNhatKy = async () => ((await req('GET', '/api/notifications/rieng-be', { cookie: PH_NT })).data || [])
  .filter(n => n.laRiengBe && n.loai === 'nhatky');
const goc = (d, id, kieu) => buaCua(beCua(d, id), kieu).capNhatLuc || '';

try {
  const ten9 = beCua(await nhom(), 's9').hoTen;

  // =========================================================================
  console.log('\n[1] Mốc đổi luật được đặt một lần; ngày có từ trước vẫn hiện như cũ');
  {
    const db = new Database(path.join(DIR, 'school.db'), { readonly: true });
    const caiDat = db.prepare("SELECT value FROM settings WHERE key = 'nhatky'").get();
    const soCu = db.prepare("SELECT COUNT(*) AS n FROM nhatky_gui WHERE phan = 'cu'").get().n;
    const soDong = db.prepare('SELECT COUNT(*) AS n FROM nhatky_ngay').get().n;
    db.close();
    const moc = caiDat ? JSON.parse(caiDat.value).guiTuLuc : null;
    check('máy chủ ghi mốc đổi luật vào cài đặt', !!moc, caiDat && caiDat.value);
    check('MỌI ngày mẫu có từ trước đều được đánh dấu là ngày cũ', soDong > 0 && soCu === soDong, { soDong, soCu });

    const doc = await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY}&den=${HOM_NAY}`, { cookie: PH_NT });
    const ngayCo = (doc.data || {}).ngayCo || [];
    check('gia đình vẫn đọc được các ngày cũ của con', doc.status === 200 && ngayCo.length >= 1, ngayCo.length);
    check('ngày cũ đọc thẳng như trước — có số đã ghi, không có dấu "đã gửi"',
      ngayCo.every(n => !n.daGui) && ngayCo.some(n => n.nguTuLuc && (n.buaAn || []).some(b => b.muc)),
      JSON.stringify(ngayCo[0] || {}).slice(0, 200));
    const nay = await nhom(ngayCo[0] ? ngayCo[0].ngay : HOM_NAY);
    check('ngày cũ không có gì "chờ gửi" trên màn của cô',
      (nay.danhSach || []).every(b => !b.gui || !['an', 'ngu', 'vesinh'].some(p => b.gui[p].chuaGui)),
      JSON.stringify(beCua(nay, 's9').gui));
  }

  // =========================================================================
  console.log('\n[2] LƯU LÀ NHÁP: lưu bữa, lưu giấc ngủ — không ai được báo, gia đình chưa thấy gì');
  {
    const truocTin = (await tinNhatKy()).length;
    const d0 = await nhom();
    check('ngày mới chưa có gì: không bé nào có phần chờ gửi',
      (d0.danhSach || []).every(b => !b.gui.an.chuaGui && !b.gui.an.guiLuc), JSON.stringify(beCua(d0, 's9').gui));
    check('máy chủ đưa xuống ba phần gửi theo đúng ba tab của trường',
      (d0.phanGui || []).map(p => p.ten).join(' / ') === 'Ăn uống / Nghỉ trưa / Vệ sinh', d0.phanGui);

    const bua = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY, bua: 'lunch',
      danhSach: [{ studentId: 's9', muc: 'het', ghiChu: 'ăn ngon', capNhatLucGoc: '' }, { studentId: 's10', muc: 'it', capNhatLucGoc: '' }],
    } });
    check('lưu bữa trưa cho hai bé', bua.status === 200 && bua.data.daGhi === 2, bua.data);
    check('máy chủ nói KHÔNG báo ai (daBao = 0) nhưng vẫn đếm bé có thay đổi', bua.data.daBao === 0 && bua.data.daDoi === 2, bua.data);
    const ngu = await req('PUT', '/api/nhatky', { cookie: GV_NT, body: {
      ngay: NGAY, truong: ['nguTuLuc', 'nguDenLuc'],
      danhSach: [{ studentId: 's9', nguTuLuc: '11:30', nguDenLuc: '14:00' }],
    } });
    check('lưu giấc trưa cũng không báo ai', ngu.status === 200 && ngu.data.daBao === 0, ngu.data);

    check('gia đình KHÔNG nhận thêm tin nào', (await tinNhatKy()).length === truocTin, `${truocTin} → ${(await tinNhatKy()).length}`);
    const doc = await giaDinhDoc();
    check('và KHÔNG đọc được bản nháp của cô', (doc.ngayCo || []).length === 0, JSON.stringify(doc.ngayCo).slice(0, 200));

    const d1 = await nhom();
    const g = beCua(d1, 's9').gui;
    check('màn của cô: phần ăn uống của s9 "chưa gửi"', g.an.coNoiDung && g.an.chuaGui && !g.an.guiLuc, g.an);
    check('phần nghỉ trưa cũng "chưa gửi"', g.ngu.chuaGui, g.ngu);
    check('phần vệ sinh chưa ghi gì thì không "chờ gửi"', !g.vesinh.coNoiDung && !g.vesinh.chuaGui, g.vesinh);
    check('cô xem từng bé vẫn thấy bản đang ghi (không bị lọc như gia đình)',
      ((await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY}&den=${NGAY}`, { cookie: GV_NT })).data.ngayCo || []).length === 1);
  }

  // =========================================================================
  console.log('\n[3] GỬI phần ăn uống: chụp từng bé đã chọn, mỗi gia đình một tin');
  {
    const truocTin = (await tinNhatKy()).length;
    const r = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY, phan: 'an', studentIds: ['s9', 's10', 's11'],
    } });
    check('gửi được', r.status === 200 && r.data.ok, `${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    check('gửi cho đúng 2 bé có ghi; bé chưa ghi gì được nói ra, không gửi',
      r.data.daGui === 2 && (r.data.chuaGhi || []).map(x => x.studentId).join() === 's11' && /chưa gửi/.test(r.data.nhac || ''), r.data);

    const tin = await tinNhatKy();
    check('mẹ s9 nhận ĐÚNG MỘT tin', tin.length === truocTin + 1, `${truocTin} → ${tin.length}`);
    const moi = tin[0] || {};
    check('tin gọi đúng phần và tên bé', moi.title === `Ăn uống của ${ten9}`, moi.title);
    // Tin báo chỉ "<bữa> — con <mức>", không kèm món (Đ239j); s9 mới có bữa trưa.
    check('nội dung tóm tắt đúng bữa và mức ăn, viết thành câu', moi.body === 'Bữa trưa — con ăn hết', moi.body);
    check('bấm tin mở đúng màn Nhật ký', moi.hash === '#/nhatky', moi.hash);

    const doc = await giaDinhDoc();
    const n = (doc.ngayCo || [])[0] || {};
    check('gia đình nay đọc được ngày đó', (doc.ngayCo || []).length === 1 && n.ngay === NGAY, doc.ngayCo);
    check('đọc đúng bữa trưa "Ăn hết" và ghi chú cô viết', buaCua(n, 'lunch').muc === 'het' && buaCua(n, 'lunch').ghiChu === 'ăn ngon', n.buaAn);
    check('có dấu "đã gửi" cho phần ăn uống', !!(n.daGui && n.daGui.an), n.daGui);
    check('phần NGHỈ TRƯA cô chưa gửi thì gia đình CHƯA thấy', !n.nguTuLuc && !(n.daGui || {}).ngu, n);

    const nhaKhac = await req('GET', `/api/nhatky?studentId=s9&tu=${NGAY}&den=${NGAY}`, { cookie: PH });
    check('nhà khác vẫn không đọc được nhật ký của s9', nhaKhac.status === 403, nhaKhac.status);

    const g = beCua(await nhom(), 's9').gui.an;
    check('màn của cô: phần ăn uống nay "đã gửi" kèm giờ gửi', !g.chuaGui && !!g.guiLuc, g);
  }

  // =========================================================================
  console.log('\n[4] Sửa SAU khi gửi: gia đình vẫn thấy bản đã gửi cho tới lần gửi sau');
  {
    const d = await nhom();
    const sua = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: NGAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'it', capNhatLucGoc: goc(d, 's9', 'lunch') }],
    } });
    check('cô sửa bữa trưa của s9 thành "Ăn ít"', sua.status === 200 && sua.data.daGhi === 1, sua.data);
    check('gia đình VẪN đọc "Ăn hết" — bản đã gửi', buaCua((await giaDinhDoc()).ngayCo[0], 'lunch').muc === 'het');
    const g = beCua(await nhom(), 's9').gui.an;
    check('màn của cô báo "sửa, chưa gửi lại"', g.chuaGui && !!g.guiLuc, g);

    const truocTin = (await tinNhatKy()).length;
    const lai = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY, phan: 'an', studentIds: ['s9', 's10'] } });
    check('gửi lại: chỉ s9 đổi nên chỉ s9 được gửi; s10 không đổi thì không báo lại',
      lai.data.daGui === 1 && (lai.data.khongDoi || []).map(x => x.studentId).join() === 's10', lai.data);
    const tin = await tinNhatKy();
    check('mẹ s9 nhận một tin "cô vừa cập nhật"', tin.length === truocTin + 1 && /cô vừa cập nhật/.test(tin[0].title), tin[0] && tin[0].title);
    check('gia đình nay đọc "Ăn ít"', buaCua((await giaDinhDoc()).ngayCo[0], 'lunch').muc === 'it');

    const lan3 = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY, phan: 'an', studentIds: ['s9'] } });
    check('bấm Gửi lần nữa khi không đổi gì: không gửi, không báo', lan3.data.daGui === 0 && (await tinNhatKy()).length === truocTin + 1, lan3.data);
  }

  // =========================================================================
  console.log('\n[5] Mỗi phần gửi riêng: gửi nghỉ trưa không đụng phần ăn đã gửi');
  {
    const r = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY, phan: 'ngu', studentIds: ['s9'] } });
    check('gửi phần nghỉ trưa của s9', r.status === 200 && r.data.daGui === 1, r.data);
    const n = (await giaDinhDoc()).ngayCo[0] || {};
    check('gia đình đọc được giấc trưa 11:30 – 14:00', n.nguTuLuc === '11:30' && n.nguDenLuc === '14:00', n);
    check('và phần ăn vẫn là bản đã gửi', buaCua(n, 'lunch').muc === 'it' && !!n.daGui.an && !!n.daGui.ngu, n.daGui);
    check('tin báo tóm tắt giờ ngủ', /Ngủ 11:30 – 14:00/.test(((await tinNhatKy())[0] || {}).body || ''));
  }

  // =========================================================================
  console.log('\n[6] Giờ thay bỉm / đi vệ sinh: nhiều bé một lần bấm, số lần cộng trừ — không xoá số đã gõ tay');
  {
    // s10 đã có "thay bỉm 3 lần" gõ tay từ đường cũ.
    const tay = await req('PUT', '/api/nhatky', { cookie: GV_NT, body: { ngay: NGAY, truong: ['bimSoLan'], danhSach: [{ studentId: 's10', bimSoLan: 3 }] } });
    check('đối chứng — s10 có 3 lần thay bỉm ghi tay', tay.status === 200, tay.data);

    const r = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV_NT, body: {
      ngay: NGAY, studentIds: ['s9', 's10'], luc: '09:15', loai: 'thay-bim', coPoo: true, tinhChat: 'binh-thuong',
    } });
    check('ghi mốc 09:15 thay bỉm cho hai bé một lần', r.status === 200 && r.data.daGhi === 2, r.data);
    const r2 = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV_NT, body: {
      ngay: NGAY, studentIds: ['s9'], luc: '10:40', loai: 'di-ve-sinh',
    } });
    check('ghi mốc 10:40 đi vệ sinh cho s9', r2.status === 200 && r2.data.daGhi === 1, r2.data);

    let d = await nhom();
    const b9 = beCua(d, 's9');
    check('s9 có hai mốc giờ, đúng thứ tự', (b9.suKien || []).map(e => `${e.luc}|${e.loai}|${e.coPoo}`).join(',') === '09:15|thay-bim|true,10:40|di-ve-sinh|false', b9.suKien);
    check('số lần của s9 cộng theo mốc: bỉm 1, vệ sinh 1', b9.bimSoLan === 1 && b9.veSinhSoLan === 1, { bim: b9.bimSoLan, vs: b9.veSinhSoLan });
    check('s10: 3 lần gõ tay + 1 mốc = 4, KHÔNG bị đếm lại thành 1', beCua(d, 's10').bimSoLan === 4, beCua(d, 's10').bimSoLan);
    check('phần vệ sinh của s9 nay "chưa gửi"', b9.gui.vesinh.chuaGui, b9.gui.vesinh);
    check('gia đình chưa thấy mốc nào', !((await giaDinhDoc()).ngayCo[0].suKien || []).length);

    const gui = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: NGAY, phan: 'vesinh', studentIds: ['s9'] } });
    check('gửi phần vệ sinh', gui.status === 200 && gui.data.daGui === 1, gui.data);
    const tin = (await tinNhatKy())[0] || {};
    check('tin báo kể đúng giờ thay bỉm và đi vệ sinh', /Thay bỉm 1 lần \(09:15\)/.test(tin.body) && /Đi vệ sinh 1 lần \(10:40\)/.test(tin.body), tin.body);
    const n = (await giaDinhDoc()).ngayCo[0];
    check('gia đình đọc được hai mốc giờ', (n.suKien || []).map(e => e.luc).join() === '09:15,10:40', n.suKien);
    check('mốc gửi cho gia đình không mang mã nội bộ hay người ghi', (n.suKien || []).every(e => !('id' in e) && !('nguoiGhi' in e)), n.suKien);

    // Bỏ một mốc ghi nhầm.
    const id10 = ((beCua(d, 's10').suKien) || [])[0]?.id;
    const khac = await req('DELETE', `/api/nhatky/ve-sinh/${id10}`, { cookie: GV });
    check('cô nhóm khác KHÔNG bỏ được mốc của bé nhóm này', khac.status === 403, khac.status);
    const bo = await req('DELETE', `/api/nhatky/ve-sinh/${id10}`, { cookie: GV_NT });
    check('cô nhóm bỏ được mốc ghi nhầm', bo.status === 200, bo.data);
    d = await nhom();
    check('s10 về lại đúng 3 lần đã gõ tay', beCua(d, 's10').bimSoLan === 3 && !(beCua(d, 's10').suKien || []).length, beCua(d, 's10').bimSoLan);
    const lai = await req('DELETE', `/api/nhatky/ve-sinh/${id10}`, { cookie: GV_NT });
    check('bỏ lần nữa → 404, không trừ thêm', lai.status === 404 && beCua(await nhom(), 's10').bimSoLan === 3, lai.status);

    const sai = [
      ['giờ vô nghĩa', { ngay: NGAY, studentIds: ['s9'], luc: '25:00', loai: 'thay-bim' }],
      ['loại lạ', { ngay: NGAY, studentIds: ['s9'], luc: '09:00', loai: 'tam' }],
      ['tình trạng lạ', { ngay: NGAY, studentIds: ['s9'], luc: '09:00', loai: 'di-ve-sinh', coPoo: true, tinhChat: 'xanh' }],
      ['chưa chọn bé', { ngay: NGAY, studentIds: [], luc: '09:00', loai: 'thay-bim' }],
      ['ngày chưa tới', { ngay: NGAY_MAI, studentIds: ['s9'], luc: '09:00', loai: 'thay-bim' }],
    ];
    for (const [ten, body] of sai) {
      const x = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV_NT, body });
      check(`${ten} → 400`, x.status === 400, x.status);
    }
    const ph = await req('POST', '/api/nhatky/ve-sinh', { cookie: PH_NT, body: { ngay: NGAY, studentIds: ['s9'], luc: '09:00', loai: 'thay-bim' } });
    check('gia đình KHÔNG ghi được', ph.status === 403, ph.status);
    const ngoai = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV, body: { ngay: NGAY, studentIds: ['s9'], luc: '09:00', loai: 'thay-bim' } });
    check('cô nhóm khác KHÔNG ghi được cho bé nhóm này', ngoai.status === 403, ngoai.status);
    const beLon = await req('POST', '/api/nhatky/ve-sinh', { cookie: GV, body: { ngay: NGAY, studentIds: ['s1'], luc: '09:00', loai: 'thay-bim' } });
    check('bé lớn: thay bỉm bị bỏ qua và nói rõ lý do', beLon.status === 200 && beLon.data.daGhi === 0
      && /nhà trẻ/.test((beLon.data.boQua || [])[0]?.lyDo || ''), beLon.data);
  }

  // =========================================================================
  console.log('\n[7] Quyền và dữ liệu của đường Gửi');
  {
    const thu = async (cookie, body) => (await req('POST', '/api/nhatky/gui', { cookie, body })).status;
    check('gia đình KHÔNG gửi được', await thu(PH_NT, { classId: 'c4', ngay: NGAY, phan: 'an', studentIds: ['s9'] }) === 403);
    check('cô nhóm khác KHÔNG gửi được cho nhóm này', await thu(GV, { classId: 'c4', ngay: NGAY, phan: 'an', studentIds: ['s9'] }) === 403);
    check('bé không thuộc nhóm đã chọn → 403', await thu(GV_NT, { classId: 'c4', ngay: NGAY, phan: 'an', studentIds: ['s1'] }) === 403);
    check('phần lạ → 400', await thu(GV_NT, { classId: 'c4', ngay: NGAY, phan: 'cu', studentIds: ['s9'] }) === 400);
    check('chưa chọn bé → 400', await thu(GV_NT, { classId: 'c4', ngay: NGAY, phan: 'an', studentIds: [] }) === 400);
    check('ngày chưa tới → 400', await thu(GV_NT, { classId: 'c4', ngay: NGAY_MAI, phan: 'an', studentIds: ['s9'] }) === 400);
  }

  // =========================================================================
  console.log('\n[8] Khởi động lại máy chủ: mốc giữ nguyên, bản nháp mới KHÔNG thành "ngày cũ"');
  {
    // Một bản nháp mới, chưa gửi: s10 ngủ trưa.
    await req('PUT', '/api/nhatky', { cookie: GV_NT, body: { ngay: NGAY, truong: ['nguTuLuc', 'nguDenLuc'], danhSach: [{ studentId: 's10', nguTuLuc: '11:45', nguDenLuc: '13:50' }] } });
    const db0 = new Database(path.join(DIR, 'school.db'), { readonly: true });
    const moc0 = db0.prepare("SELECT value FROM settings WHERE key = 'nhatky'").get().value;
    db0.close();

    await sv.dung();
    sv = await dungMayChu({ port: CONG, dir: DIR });
    req = taoReq(sv.BASE);
    login = taoLogin(req);
    await dangNhapHet();

    const db1 = new Database(path.join(DIR, 'school.db'), { readonly: true });
    const moc1 = db1.prepare("SELECT value FROM settings WHERE key = 'nhatky'").get().value;
    const cuMoi = db1.prepare("SELECT COUNT(*) AS n FROM nhatky_gui WHERE phan = 'cu' AND ngay = ?").get(NGAY).n;
    db1.close();
    check('mốc đổi luật KHÔNG đổi sau khi khởi động lại', moc0 === moc1, { moc0, moc1 });
    check('ngày ghi sau mốc KHÔNG bị đánh dấu là ngày cũ', cuMoi === 0, cuMoi);
    check('s9: gia đình vẫn chỉ đọc bản đã gửi', buaCua((await giaDinhDoc()).ngayCo[0], 'lunch').muc === 'it');
    check('s10: bản nháp ngủ trưa vẫn "chưa gửi"', beCua(await nhom(), 's10').gui.ngu.chuaGui, beCua(await nhom(), 's10').gui.ngu);
  }

  // =========================================================================
  console.log('\n[9] Mã nguồn: lưu không báo; chỉ đường Gửi báo; màn có ba tab và hộp soát');
  {
    const rt = fs.readFileSync(path.join(GOC, 'modules/nhatky/routes.js'), 'utf8');
    check('routes.js gọi tbb.gui ĐÚNG MỘT chỗ', (rt.match(/tbb\.gui\(/g) || []).length === 1, (rt.match(/tbb\.gui\(/g) || []).length);
    const iGui = rt.indexOf("app.post('/api/nhatky/gui'");
    const iTbb = rt.indexOf('tbb.gui(');
    const iSau = rt.indexOf('app.', iGui + 10);
    check('và chỗ đó nằm trong đường Gửi', iGui > 0 && iTbb > iGui && iTbb < iSau, { iGui, iTbb, iSau });
    const view = fs.readFileSync(path.join(GOC, 'modules/nhatky/view.js'), 'utf8');
    check('màn của cô có ba tab Ăn uống / Nghỉ trưa / Vệ sinh',
      /PHAN:\s*\[\['an', 'Ăn uống'\], \['ngu', 'Nghỉ trưa'\], \['vesinh', 'Vệ sinh'\]\]/.test(view));
    check('có nút Gửi và hộp soát từng bé trước khi gửi', /id="nk-gui"/.test(view) && /nk-gui-be/.test(view) && /\/api\/nhatky\/gui/.test(view));
    check('có ô chọn từng bé để áp nhiều bé một lần', /class="nk-chon"/.test(view));
    check('ghi mốc giờ vệ sinh đi đường riêng', /\/api\/nhatky\/ve-sinh/.test(view));
    const sql = fs.readFileSync(path.join(GOC, 'modules/nhatky/schema.sql'), 'utf8');
    check('hai bảng mới chỉ CREATE IF NOT EXISTS', /CREATE TABLE IF NOT EXISTS nhatky_gui/.test(sql) && /CREATE TABLE IF NOT EXISTS nhatky_vesinh/.test(sql));
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
