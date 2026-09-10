// Bài canh ĐỒNG HỒ ĐỊNH GIỜ và HUY HIỆU CỦA PHÂN HỆ (Đ154).
//
// Chạy bằng:  npm run test:hen-gio
//
// HAI LỖ HỔNG CỦA CÙNG MỘT THỨ: KHÔNG AI BÁO CHO NGƯỜI CẦN BIẾT
//
// (1) "Hẹn ngày công bố" báo theo kiểu LƯỜI. Quản lý duyệt bản báo cáo hôm nay
//     và hẹn công bố ngày 20; tới ngày 20 tin chỉ được gửi NẾU có người tình
//     cờ mở một trong bốn màn có gọi `baoNeuToiNgay`. Không ai mở thì gia đình
//     không bao giờ được báo — bản báo cáo "đã công bố" theo máy mà nhà không
//     biết. Còn khi chính gia đình mở màn thì chuông kêu đúng lúc họ đang nhìn
//     vào bản báo cáo.
//
// (2) Cô gửi bản chờ duyệt thì quản lý cơ sở KHÔNG nhận gì cả. Con số "chờ
//     duyệt" chỉ nằm bên trong màn của phân hệ, phải mở đúng màn ấy mới thấy.
//
// Mục [2] và [3] là chỗ khó làm giả nhất của bài này: nó ghi thẳng vào tệp
// SQLite rồi KHỞI ĐỘNG LẠI máy chủ, và không gọi một đường HTTP nào của phân
// hệ báo cáo ở giữa. Tin có tới tay gia đình hay không, do đó, chỉ có thể là
// nhờ đồng hồ — không còn lối lười nào giải thích thay được.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, tatPhanHe, khoaVaoCoSo, datChucVu,
  HOM_NAY, GOC,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hen-gio');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng HG', 'hg_qt');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2 HG', 'hg_cs2');
const mkKT = taoQuanTri(DIR, 'Kế toán HG', 'hg_kt');
khoaVaoCoSo(DIR, 'hg_cs2', 'cs2');
datChucVu(DIR, 'hg_cs2', 'quanly-coso');
datChucVu(DIR, 'hg_kt', 'ketoan');

const CSDL = path.join(DIR, 'school.db');
const moCsdl = () => new Database(CSDL);
const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
const KY = { tu: `${THANG}-01`, den: HOM };
const dichNgay = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const HOM_QUA = dichNgay(HOM, -1);
const NGAY_MAI = dichNgay(HOM, 1);

const PORT = Number(process.env.TEST_PORT || 4712);
const sv = await dungMayChu({ port: PORT, dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Đếm bằng SQLite, KHÔNG bằng HTTP — mọi đường đọc của phân hệ báo cáo đều có
// lời gọi lười bên trong, nên hỏi qua HTTP là tự tay châm ngòi thứ đang đo.
function demTinBaoCao(studentId) {
  const conn = moCsdl();
  try {
    return conn.prepare("SELECT COUNT(*) AS n FROM thongbao_be WHERE studentId = ? AND loai = 'bao-cao'")
      .get(studentId).n;
  } finally { conn.close(); }
}
function dongDuyet(banId) {
  const conn = moCsdl();
  try { return conn.prepare('SELECT * FROM baocaohoctap_duyet WHERE banId = ?').get(banId); }
  finally { conn.close(); }
}
function doiNgayCongBo(banId, ngayMoi) {
  const conn = moCsdl();
  try { conn.prepare('UPDATE baocaohoctap_duyet SET ngayCongBo = ?, daBaoLuc = NULL WHERE banId = ?').run(ngayMoi, banId); }
  finally { conn.close(); }
}

try {
  const QT = await vao('hg_qt', mkQT);
  const CS2 = await vao('hg_cs2', mkCS2);
  const KT = await vao('hg_kt', mkKT);
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1 (cơ sở 1)
  const PH = (await login('phuhuynh', '123456')).cookie;    // gia đình s1

  // =========================================================================
  console.log('\n[1] lib/hen-gio.js — một việc hỏng KHÔNG kéo theo việc khác');
  {
    const hg = require(path.join(GOC, 'lib', 'hen-gio.js'));
    let a = 0, b = 0;
    hg.dangKy('thu-a', () => { a += 1; });
    hg.dangKy('thu-hong', () => { throw new Error('cố tình hỏng'); });
    hg.dangKy('thu-b', () => { b += 1; });
    let ketQua = null;
    let daNem = false;
    try { ketQua = hg.chay(); } catch (_) { daNem = true; }
    check('chay() KHÔNG ném lỗi ra ngoài', !daNem);
    check('việc trước và việc sau việc hỏng đều chạy', a === 1 && b === 1, { a, b });
    check('lượt chạy nói rõ việc nào hỏng',
      (ketQua || []).some(x => x.ten === 'thu-hong' && x.ok === false)
      && (ketQua || []).filter(x => x.ok).length === 2, ketQua);

    // Đăng ký trùng tên là GHI ĐÈ. `napApiMoRong` nạp lại được, và hai bản của
    // cùng một việc gửi tin là gửi hai lần.
    let c = 0;
    hg.dangKy('thu-c', () => { c += 1; });
    hg.dangKy('thu-c', () => { c += 1; });
    hg.chay();
    check('đăng ký trùng tên thì thay, không chạy hai lần', c === 1, c);

    const t = hg.batDau({ moiPhut: 60, chayNgay: false });
    check('đồng hồ KHÔNG giữ tiến trình sống (.unref đã gọi)',
      typeof t.hasRef !== 'function' || t.hasRef() === false, typeof t.hasRef === 'function' ? t.hasRef() : 'không có hasRef');
    check('dung() tắt hẳn đồng hồ', (hg.dung(), hg.dangBat() === false));
    check('danh sách việc đọc được để màn Quản trị soi', hg.danhSach().some(x => x.ten === 'thu-a'));
  }

  // Bối cảnh chung cho các mục sau: một mẫu báo cáo tháng và một bản của s1.
  const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
    loai: 'thang', ten: 'Báo cáo tháng (hẹn giờ)', tuThang: 0, denThang: 72,
    dong: [{ nhom: 'I', tieuDe: 'Lưu ý', kieu: 'chu' }] } });
  const MAU = mau.data.mau.id;

  async function banMoi(studentId, cookie = GV) {
    const t = await req('POST', '/api/baocaohoctap/ban', { cookie, body: {
      studentId, mauId: MAU, tuNgay: KY.tu, denNgay: KY.den } });
    await req('PUT', `/api/baocaohoctap/ban/${t.data.ban.id}`, { cookie, body: { tongHop: 'Ghi cho đủ.' } });
    return t.data.ban.id;
  }

  // =========================================================================
  console.log('\n[2] Tới ngày công bố thì gia đình ĐƯỢC BÁO, không ai mở màn nào');
  let BAN1;
  {
    BAN1 = await banMoi('s1');
    await req('POST', `/api/baocaohoctap/ban/${BAN1}/gui`, { cookie: GV });
    const duyet = await req('POST', `/api/baocaohoctap/ban/${BAN1}/duyet`, { cookie: QT, body: {
      quyetDinh: 'da-duyet', ngayCongBo: NGAY_MAI } });
    check('quản lý duyệt và hẹn NGÀY MAI thì chưa báo gia đình',
      duyet.status === 200 && duyet.data.daBao !== true, duyet.data);
    const truoc = demTinBaoCao('s1');
    check('chưa có tin nào về bản này', truoc === 0, truoc);

    // Kéo ngày công bố về HÔM QUA bằng cách ghi thẳng vào tệp dữ liệu — đúng
    // như thể hôm nay đã là ngày công bố. Từ đây tới hết mục này KHÔNG gọi
    // một đường HTTP nào của phân hệ báo cáo.
    doiNgayCongBo(BAN1, HOM_QUA);
    check('trước khi khởi động lại vẫn chưa ai báo gì', dongDuyet(BAN1).daBaoLuc == null);

    await sv.khoiDongLai();

    const d = dongDuyet(BAN1);
    check('máy chủ vừa lên là đồng hồ quét: dòng duyệt đã đánh dấu đã báo', !!d.daBaoLuc, d.daBaoLuc);
    check('và gia đình có ĐÚNG một tin', demTinBaoCao('s1') === 1, demTinBaoCao('s1'));
  }

  // =========================================================================
  console.log('\n[3] Quét lại bao nhiêu lần cũng chỉ MỘT tin');
  {
    await sv.khoiDongLai();
    await sv.khoiDongLai();
    check('khởi động lại hai lần nữa vẫn đúng một tin', demTinBaoCao('s1') === 1, demTinBaoCao('s1'));
    // Và lối lười cũ vẫn còn nguyên làm lưới hứng — gọi nó cũng không sinh tin thứ hai.
    await req('GET', `/api/baocaohoctap/ban/${BAN1}`, { cookie: PH });
    check('gia đình mở bản ra đọc cũng không sinh tin thứ hai', demTinBaoCao('s1') === 1, demTinBaoCao('s1'));
    check('và gia đình ĐỌC ĐƯỢC bản đã tới ngày',
      (await req('GET', `/api/baocaohoctap/ban/${BAN1}`, { cookie: PH })).status === 200);
  }

  // =========================================================================
  console.log('\n[4] Phân hệ đang TẮT thì đồng hồ im — không sinh dữ liệu sau lưng trường');
  let BAN2;
  {
    BAN2 = await banMoi('s4');
    await req('POST', `/api/baocaohoctap/ban/${BAN2}/gui`, { cookie: GV });
    await req('POST', `/api/baocaohoctap/ban/${BAN2}/duyet`, { cookie: QT, body: {
      quyetDinh: 'da-duyet', ngayCongBo: NGAY_MAI } });
    doiNgayCongBo(BAN2, HOM_QUA);

    tatPhanHe(DIR, ['baocaohoctap']);
    await sv.khoiDongLai();
    check('phân hệ tắt: đồng hồ chạy nhưng KHÔNG báo gì', dongDuyet(BAN2).daBaoLuc == null);
    check('và không có tin nào cho bé đó', demTinBaoCao('s4') === 0, demTinBaoCao('s4'));

    batPhanHe(DIR, ['baocaohoctap']);
    await sv.khoiDongLai();
    check('bật lại thì lượt quét kế tiếp báo ngay, không mất tin', !!dongDuyet(BAN2).daBaoLuc);
    check('bé đó có đúng một tin', demTinBaoCao('s4') === 1, demTinBaoCao('s4'));
  }

  // =========================================================================
  console.log('\n[5] Huy hiệu: cô gửi là quản lý thấy con số trên MÀN HÌNH CHÍNH');
  let BAN3;
  {
    const truoc = (await req('GET', '/api/dashboard/badges', { cookie: QT })).data;
    const truocSo = Number(truoc.baocaohoctap || 0);

    BAN3 = await banMoi('s5');
    const gui = await req('POST', `/api/baocaohoctap/ban/${BAN3}/gui`, { cookie: GV });
    check('cô gửi là bản sang CHỜ DUYỆT', gui.status === 200 && gui.data.choDuyet === true, gui.data);

    const sau = (await req('GET', '/api/dashboard/badges', { cookie: QT })).data;
    check('quản lý thấy con số chờ duyệt ngay trên lưới icon',
      Number(sau.baocaohoctap || 0) === truocSo + 1, { truocSo, sau: sau.baocaohoctap });
    check('con số trùng khớp với số dòng trong màn Chờ duyệt',
      Number(sau.baocaohoctap || 0)
        === ((await req('GET', '/api/baocaohoctap/cho-duyet', { cookie: QT })).data.danhSach || []).length,
      sau.baocaohoctap);

    const cua_co = (await req('GET', '/api/dashboard/badges', { cookie: GV })).data;
    check('CÔ không có huy hiệu này — cô không duyệt được thì đếm làm gì',
      cua_co.baocaohoctap === undefined, cua_co.baocaohoctap);
    const cua_nha = (await req('GET', '/api/dashboard/badges', { cookie: PH })).data;
    check('GIA ĐÌNH cũng không', cua_nha.baocaohoctap === undefined, cua_nha.baocaohoctap);

    await req('POST', `/api/baocaohoctap/ban/${BAN3}/duyet`, { cookie: QT, body: {
      quyetDinh: 'da-duyet', ngayCongBo: NGAY_MAI } });
    const xong = (await req('GET', '/api/dashboard/badges', { cookie: QT })).data;
    check('duyệt xong thì con số tự trừ đi', Number(xong.baocaohoctap || 0) === truocSo, xong.baocaohoctap);
  }

  // =========================================================================
  console.log('\n[6] Huy hiệu đi theo CƠ SỞ và theo CHỨC VỤ');
  {
    const BAN4 = await banMoi('s6');
    await req('POST', `/api/baocaohoctap/ban/${BAN4}/gui`, { cookie: GV });

    const cs1 = (await req('GET', '/api/dashboard/badges', { cookie: QT })).data;
    check('hiệu trưởng (không khoá cơ sở) đếm được bản của cơ sở 1', Number(cs1.baocaohoctap || 0) >= 1, cs1.baocaohoctap);
    const cs2 = (await req('GET', '/api/dashboard/badges', { cookie: CS2 })).data;
    check('quản lý CƠ SỞ 2 KHÔNG đếm bản của cơ sở 1', cs2.baocaohoctap === undefined, cs2.baocaohoctap);
    const kt = (await req('GET', '/api/dashboard/badges', { cookie: KT })).data;
    check('KẾ TOÁN không đếm — họ không mở được màn duyệt', kt.baocaohoctap === undefined, kt.baocaohoctap);

    tatPhanHe(DIR, ['baocaohoctap']);
    await sv.khoiDongLai();
    const tat = (await req('GET', '/api/dashboard/badges', { cookie: QT })).data;
    check('phân hệ TẮT thì không có huy hiệu của nó', tat.baocaohoctap === undefined, tat.baocaohoctap);
    check('nhưng các huy hiệu lõi vẫn còn nguyên', typeof tat.thongbao === 'number' && typeof tat.nhantin === 'number', tat);
    batPhanHe(DIR, ['baocaohoctap']);
    await sv.khoiDongLai();
  }

  // =========================================================================
  console.log('\n[7] Kế hoạch của bé — kế hoạch chờ duyệt và đề xuất sửa cùng một con số');
  {
    const truoc = Number((await req('GET', '/api/dashboard/badges', { cookie: QT })).data.kehoachbe || 0);
    const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc;
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: {
      classId: 'c1', thang: THANG,
      danhSach: [{ studentId: 's1', muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }],
        baiHoc: dm.length ? [{ baiHocId: dm[0].id, nhan: 'hoc-moi' }] : [] }] } });
    const gui = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1' } });
    check('cô gửi kế hoạch chờ duyệt', gui.status === 200 && gui.data.daGui === 1, gui.data);
    const sau = Number((await req('GET', '/api/dashboard/badges', { cookie: QT })).data.kehoachbe || 0);
    check('quản lý thấy con số kế hoạch chờ duyệt', sau === truoc + 1, { truoc, sau });
    check('quản lý CƠ SỞ 2 không thấy',
      (await req('GET', '/api/dashboard/badges', { cookie: CS2 })).data.kehoachbe === undefined);

    // Duyệt rồi cô xin sửa — đề xuất cũng phải vào cùng con số ấy.
    const ke = (await req('GET', `/api/kehoachbe/be?studentId=s1&thang=${THANG}`, { cookie: QT })).data.ke;
    const duyetKe = await req('POST', '/api/kehoachbe/duyet', { cookie: QT, body: { quyetDinh: 'da-duyet', ids: [ke.id] } });
    check('quản lý duyệt được kế hoạch', duyetKe.status === 200, duyetKe.data);
    const giua = Number((await req('GET', '/api/dashboard/badges', { cookie: QT })).data.kehoachbe || 0);
    check('duyệt xong thì con số trừ đi', giua === truoc, { truoc, giua });
    const dx = await req('POST', `/api/kehoachbe/${ke.id}/de-xuat`, { cookie: GV, body: {
      lyDo: 'Con đã làm xong bài này rồi', noiDung: 'Xin đổi sang bài khác' } });
    check('cô gửi đề xuất sửa', dx.status === 201, dx.data);
    const cuoi = Number((await req('GET', '/api/dashboard/badges', { cookie: QT })).data.kehoachbe || 0);
    check('đề xuất sửa cũng vào cùng con số ấy', cuoi === truoc + 1, { truoc, cuoi });
  }

  // =========================================================================
  console.log('\n[8] Đường báo cho NHÀ TRƯỜNG và màn Cài đặt phải nói cùng một chuyện');
  {
    const bnt = require(path.join(GOC, 'lib', 'bao-nha-truong.js'));
    check('chỉ hiệu trưởng và quản lý cơ sở nằm trong danh sách nhận',
      bnt.CHUC_VU_NHAN.length === 2 && bnt.CHUC_VU_NHAN.includes('hieu-truong') && bnt.CHUC_VU_NHAN.includes('quanly-coso'),
      bnt.CHUC_VU_NHAN);

    // MÀN CÀI ĐẶT VÀ ĐƯỜNG GỬI PHẢI TRÙNG DANH SÁCH.
    //
    // Nếu ai đó mở rộng danh sách nhận mà quên mở thẻ "Thông báo trên điện
    // thoại", người mới thêm sẽ không bao giờ bật được thông báo mà vẫn nằm
    // trong danh sách "đã báo" — hứa suông đúng kiểu bài học Đ14.
    //
    // TỪ Đ157 HAI CHỖ ẤY NỐI VỚI NHAU BẰNG MÁY CHỦ, KHÔNG BẰNG HAI DANH SÁCH.
    // Bản Đ154 canh bằng cách tìm tên chức vụ trong chính tệp settings.js —
    // đúng với lúc đó, vì màn hình tự kể tên chức vụ ra để quyết ẩn hay hiện.
    // Nay `/api/push/trang-thai` trả `batDuoc`, và màn hình chỉ nghe theo. Nên
    // canh đúng tính chất cũ qua cửa mới, và phép kiểm này CHẶT HƠN bản trước:
    // bản trước chỉ chứng minh tên chức vụ có XUẤT HIỆN trong tệp, bản này
    // chứng minh máy chủ THẬT SỰ hứa với họ một thứ có tên.
    const st = fs.readFileSync(path.join(GOC, 'public/js/views/settings.js'), 'utf8');
    check('màn Cài đặt không còn tự kể tên chức vụ — nó hỏi máy chủ',
      /tt\.batDuoc === false/.test(st), 'settings.js');
    const tt = (await req('GET', '/api/push/trang-thai', { cookie: QT })).data;
    check('và máy chủ hứa với ban giám hiệu đúng thứ Đ154 vừa dựng',
      tt.batDuoc === true && (tt.loaiTin || []).some(t => /chờ duyệt/.test(t)), tt);
    const ttCs2 = (await req('GET', '/api/push/trang-thai', { cookie: CS2 })).data;
    check('quản lý cơ sở cũng vậy', ttCs2.batDuoc === true, ttCs2);
    const ttKt = (await req('GET', '/api/push/trang-thai', { cookie: KT })).data;
    check('còn chức vụ không nhận tin nào thì máy chủ nói thẳng là không',
      ttKt.batDuoc === false && (ttKt.loaiTin || []).length === 0, ttKt);
    check('và thẻ KHÔNG còn nói "tài khoản nhà trường thì không" — câu đó nay đã sai',
      !/tài khoản nhà trường thì không/.test(st));

    // `guiChoQuanLyCuaBe` không bao giờ ném, kể cả khi gọi bằng thứ vô nghĩa.
    let nem = false;
    try {
      bnt.guiChoQuanLyCuaBe(null, {});
      bnt.guiChoQuanLyCuaNhom('', { tieuDe: 'x' });
    } catch (_) { nem = true; }
    check('gọi bằng dữ liệu rỗng cũng không ném lỗi', !nem);
  }

  // =========================================================================
  console.log('\n[9] HEN_GIO_PHUT=0 tắt hẳn đồng hồ — lời hứa trong server.js là thật');
  {
    const BAN5 = await banMoi('s3');
    await req('POST', `/api/baocaohoctap/ban/${BAN5}/gui`, { cookie: GV });
    await req('POST', `/api/baocaohoctap/ban/${BAN5}/duyet`, { cookie: QT, body: {
      quyetDinh: 'da-duyet', ngayCongBo: NGAY_MAI } });
    doiNgayCongBo(BAN5, HOM_QUA);

    sv.dung();
    await new Promise(r => setTimeout(r, 1500));
    const sv0 = await dungMayChu({ port: PORT + 1, dir: DIR, env: { HEN_GIO_PHUT: '0' } });
    const req0 = taoReq(sv0.BASE);
    check('máy chủ vẫn lên bình thường khi đồng hồ tắt',
      (await req0('GET', '/healthz')).status === 200);
    check('và KHÔNG quét: dòng duyệt vẫn chưa đánh dấu đã báo', dongDuyet(BAN5).daBaoLuc == null);
    check('gia đình bé đó chưa có tin nào', demTinBaoCao('s3') === 0, demTinBaoCao('s3'));
    sv0.dung();
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Đồng hồ định giờ và huy hiệu phân hệ (Đ154)');
