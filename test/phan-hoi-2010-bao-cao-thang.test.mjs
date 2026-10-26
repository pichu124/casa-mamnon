// Bài canh góp ý của trường ngày 20/10 cho BÁO CÁO THÁNG (Đ241b).
//
// Chạy bằng:  node test/phan-hoi-2010-bao-cao-thang.test.mjs
//
//   [1] O3 — "Mời chữ từ Kế hoạch của bé" báo "chưa có nhận xét nào" dù cô đã
//       lập kế hoạch tháng đó. Cô lập kế hoạch bằng cách TÍCH BÀI
//       (kehoachbe_muc_bai), còn đường mời chữ chỉ đọc ô gõ tay
//       (kehoachbe_muc). Bài đã tích — tên bài, nhãn học mới/ôn tập/mở rộng,
//       nhận xét của cô — phải chảy sang được, đúng bé, đúng tháng, và vẫn chỉ
//       là chữ MỜI: bản báo cáo không đổi một chữ nào cho tới khi cô tự chép.
//   [2] O5 — bỏ "Cô ký tên" khỏi màn soạn và khỏi khối "Cô kể thêm" gia đình
//       đọc. Cột dữ liệu và API giữ nguyên: máy cũ còn gửi `coKy` vẫn lưu được,
//       và lưu từ màn mới (không gửi `coKy`) không xoá chữ đã có.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('phan-hoi-2010-bao-cao-thang');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ph2010bc_qt');

const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 4957), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
const THANG_TRUOC = (() => {
  const [y, m] = THANG.split('-').map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
})();

try {
  const qtTam = await login('ph2010bc_qt', mkQt);
  await req('POST', '/api/auth/set-new-password', { cookie: qtTam.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('ph2010bc_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1
  const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm khác
  const PH = (await login('phuhuynh', '123456')).cookie;

  // Mẫu tháng có một ô chữ gắn góc — đúng hình dáng mẫu của trường.
  const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
    loai: 'thang', ten: 'Báo cáo tháng thử O3', tuThang: 0, denThang: 72,
    dong: [
      { nhom: 'I. LƯU Ý', tieuDe: 'Lưu ý', kieu: 'chu' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' },
    ] } });
  check('đối chứng — tạo được mẫu báo cáo tháng', mau.status === 200 || mau.status === 201, `${mau.status} ${JSON.stringify(mau.data).slice(0, 120)}`);

  // Mở bản báo cáo TRƯỚC khi có kế hoạch: máy không điền sẵn ô nào, nên mọi
  // chữ từ Kế hoạch chỉ còn một đường đi sang — nút mời chữ.
  const mo = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
    studentId: 's1', mauId: mau.data.mau.id, tuNgay: `${THANG}-01`, denNgay: HOM } });
  const banId = mo.data && mo.data.ban && mo.data.ban.id;
  check('đối chứng — cô mở được bản báo cáo tháng của s1', !!banId, `${mo.status} ${JSON.stringify(mo.data).slice(0, 160)}`);

  // =========================================================================
  console.log('\n[1] O3 — mời chữ đọc được các bài cô đã TÍCH ở Kế hoạch của bé');
  {
    const dm = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    const bai = dm.data.baiHoc || [];
    const thapHong = bai.find(b => b.ten === 'Tháp hồng');
    const rotNuoc = bai.find(b => b.ten === 'Rót nước');
    const baiKhac = bai.find(b => b.gocLinhVuc === 'toan');
    check('đối chứng — danh mục có Tháp hồng, Rót nước và một bài Toán', !!thapHong && !!rotNuoc && !!baiKhac);

    const ds = (await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [];
    const beKhac = (ds.find(x => x.studentId !== 's1') || {}).studentId;
    check('đối chứng — nhóm c1 có thêm một bé khác s1', !!beKhac, ds.map(x => x.studentId));

    // Chỉ tích bài, không gõ ô chữ nào — đúng cách cô ở trường đang lập.
    const lap = await req('PUT', '/api/kehoachbe', { cookie: GV, body: {
      classId: 'c1', thang: THANG,
      danhSach: [
        { studentId: 's1', muc: [], baiHoc: [
          { baiHocId: thapHong.id, nhan: 'hoc-moi' },
          { baiHocId: rotNuoc.id, nhan: 'on-tap' },
        ] },
        { studentId: beKhac, muc: [], baiHoc: [{ baiHocId: baiKhac.id, nhan: 'mo-rong' }] },
      ] } });
    check('đối chứng — cô lập được kế hoạch tháng chỉ bằng bài đã tích', lap.status === 200, `${lap.status} ${JSON.stringify(lap.data).slice(0, 160)}`);

    // Tháng trước của chính s1 cũng có một bài — không được lọt sang tháng này.
    const lapTruoc = await req('PUT', '/api/kehoachbe', { cookie: GV, body: {
      classId: 'c1', thang: THANG_TRUOC,
      danhSach: [{ studentId: 's1', muc: [], baiHoc: [{ baiHocId: baiKhac.id, nhan: 'hoc-moi' }] }] } });
    check('đối chứng — kế hoạch tháng trước của s1 có bài Toán', lapTruoc.status === 200, `${lapTruoc.status}`);

    const truoc = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;

    const gy = await req('GET', `/api/baocaohoctap/goi-y/${banId}`, { cookie: GV });
    const chu = JSON.stringify(gy.data.goiY || []);
    check('mời chữ trả lời được, đúng tháng', gy.status === 200 && gy.data.bat === true && gy.data.thang === THANG,
      `${gy.status} ${JSON.stringify(gy.data).slice(0, 160)}`);
    check('kế hoạch chỉ có bài đã tích thì VẪN có chữ mời (lỗi O3: trả về rỗng)',
      (gy.data.goiY || []).length > 0, gy.data);
    check('chữ mời có tên bài kèm nhãn của cô: Tháp hồng (học mới), Rót nước (ôn tập)',
      chu.includes('Tháp hồng (học mới)') && chu.includes('Rót nước (ôn tập)'), chu);
    check('chữ mời mang góc lĩnh vực của bài để cô biết thuộc phần nào',
      (gy.data.goiY || []).some(g => g.gocLinhVuc === 'giac-quan' && /Tháp hồng/.test(g.noiDung || ''))
        && (gy.data.goiY || []).some(g => g.gocLinhVuc === 'thuc-hanh-cuoc-song' && /Rót nước/.test(g.noiDung || '')), chu);
    check('mỗi gợi ý mang tên góc để hiện ("Giác quan"), không phải mã góc',
      (gy.data.goiY || []).some(g => g.gocLinhVuc === 'giac-quan' && g.tenGoc === 'Giác quan')
        && (gy.data.goiY || []).every(g => !/^[a-z]+(-[a-z]+)*$/.test(g.tenGoc || '')), chu);
    check('KHÔNG lẫn bài của bé khác cùng nhóm', !chu.includes(baiKhac.ten), chu);

    // Nhìn lại cuối tháng: nhận xét của cô cho từng bài cũng phải sang.
    const ke = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
      .find(x => x.studentId === 's1').ke;
    const bTH = ke.baiHoc.find(b => b.baiHocId === thapHong.id);
    await req('POST', '/api/kehoachbe/duyet', { cookie: QT, body: { ids: [ke.id], quyetDinh: 'da-duyet' } });
    const nhin = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: {
      id: ke.id, baiHoc: [{ id: bTH.id, ketQua: 'da-thay', nhanXet: 'Con xếp được năm khối liền.' }] } });
    check('đối chứng — cô ghi được nhận xét cuối tháng cho bài Tháp hồng', nhin.status === 200, `${nhin.status} ${JSON.stringify(nhin.data).slice(0, 160)}`);

    const gy2 = await req('GET', `/api/baocaohoctap/goi-y/${banId}`, { cookie: GV });
    const g2 = (gy2.data.goiY || []).find(g => g.gocLinhVuc === 'giac-quan') || {};
    check('nhận xét của cô cho từng bài cũng sang, kèm tên bài',
      /Tháp hồng: Con xếp được năm khối liền\./.test(g2.nhanXet || ''), g2);
    check('và KHÔNG lẫn bài tháng trước của chính bé', !JSON.stringify(gy2.data.goiY).includes(baiKhac.ten), gy2.data.goiY);

    // Mời là mời: bản báo cáo không tự đổi.
    const sau = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;
    check('hỏi mời chữ xong, bản báo cáo KHÔNG đổi một chữ nào (chữ mời là nháp để cô chép)',
      JSON.stringify(sau.dong) === JSON.stringify(truoc.dong) && sau.tongHop === truoc.tongHop
        && !JSON.stringify(sau).includes('năm khối liền'), { truoc: truoc.tongHop, sau: sau.tongHop });

    const gyPh = await req('GET', `/api/baocaohoctap/goi-y/${banId}`, { cookie: PH });
    check('gia đình KHÔNG gọi được đường mời chữ', gyPh.status === 403, `${gyPh.status}`);
    const gyCo2 = await req('GET', `/api/baocaohoctap/goi-y/${banId}`, { cookie: GV2 });
    check('cô nhóm khác KHÔNG đọc được kế hoạch của bé không thuộc nhóm mình', gyCo2.status === 403,
      `${gyCo2.status} ${JSON.stringify(gyCo2.data).slice(0, 120)}`);

    // Màn hình: chữ chép vào ô phải giữ cả tên bài lẫn nhận xét.
    const v = fs.readFileSync(path.join(GOC, 'modules/baocaohoctap/view.js'), 'utf8');
    check('màn mời chữ không còn nói "chưa có nhận xét nào" khi kế hoạch chỉ có bài đã tích',
      !/chưa có nhận xét nào/.test(v), (v.match(/.*chưa có nhận xét nào.*/) || [''])[0]);
  }

  // =========================================================================
  console.log('\n[2] O5 — bỏ "Cô ký tên" khỏi màn hình, dữ liệu và API giữ nguyên');
  {
    const cu = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: GV, body: {
      tongHop: 'Tháng này con vui vẻ.', coKy: 'Cô Lan' } });
    check('máy cũ còn gửi coKy vẫn lưu được (API không đổi)', cu.status === 200, `${cu.status} ${JSON.stringify(cu.data).slice(0, 120)}`);
    const moi = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: GV, body: {
      tongHop: 'Tháng này con vui vẻ và hợp tác.' } });
    const doc = (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: GV })).data.ban;
    check('lưu từ màn mới (không gửi coKy) KHÔNG xoá chữ ký đã có trong dữ liệu',
      moi.status === 200 && doc.coKy === 'Cô Lan' && doc.tongHop === 'Tháng này con vui vẻ và hợp tác.', doc);

    // Dựng khối "Cô kể thêm" đúng như màn gia đình đọc.
    const ctx = { App: { views: {} }, UI: { esc: (s) => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`) } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(GOC, 'modules/baocaohoctap/view.js'), 'utf8'), ctx);
    const the = ctx.App.views.baocaohoctap.theTongHop({ tongHop: 'Con vui vẻ.', oLopLamGi: 'Ôn tháp hồng', oNhaChoiGi: '', coKy: 'Cô Lan' });
    check('đối chứng — khối "Cô kể thêm" vẫn hiện chữ cô nhắn gia đình', /Cô kể thêm/.test(the) && /Con vui vẻ\./.test(the), the);
    check('khối "Cô kể thêm" gia đình đọc KHÔNG in tên cô ký', !the.includes('Cô Lan'), the);

    const v = fs.readFileSync(path.join(GOC, 'modules/baocaohoctap/view.js'), 'utf8');
    check('màn soạn không còn ô "Cô ký tên"', !/Cô ký tên/.test(v) && !/id="bc-ky"/.test(v));
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Phản hồi 20/10: báo cáo tháng — mời chữ từ bài đã tích, bỏ cô ký tên');
