// Bài canh góp ý 20/10 — O2: bố cục phần bài học trong báo cáo tháng gia đình
// đọc.
//
// Chạy bằng:  node test/phan-hoi-2010-bao-cao-thang-bo-cuc.test.mjs
//
// Trường muốn: "Bài học trong tháng của con:" rồi mỗi bài một dòng "• Xúc hạt
// (học mới)", rồi xuống dòng "Nhận xét của cô: …" — thay cho một dòng nối dài.
// Chỉ đổi bản ĐIỀN SẴN MỚI: ô đã có chữ (bản đã lưu, đã gửi) không bị viết lại.
//
// Chữ quy ước M/S/W/N/NA vẫn kèm từng bài: chủ dự án chốt 07/10 dùng cả trong
// báo cáo tháng (test/quyet-dinh-0710.test.mjs canh vế đó).
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-bao-cao-thang-bo-cuc');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'baocaohoctap']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng O2', 'o2_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7163), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const THANG = HOM_NAY().slice(0, 7);

try {
  const QT = await vao('o2_qt', mkQt);
  const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm c1
  const PH = (await login('phuhuynh', '123456')).cookie;   // mẹ bé s1

  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc;
  const bai = (ten) => dm.find(b => b.ten === ten);
  const [thapHong, cauThang, rotNuoc] = [bai('Tháp hồng'), bai('Cầu thang nâu'), bai('Rót nước')];
  check('đối chứng — danh mục có đủ ba bài mẫu', thapHong && cauThang && rotNuoc);

  async function lapKeHoach(studentId, nhinLai) {
    await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{
      studentId,
      baiHoc: [
        { baiHocId: thapHong.id, nhan: 'hoc-moi' },
        { baiHocId: cauThang.id, nhan: 'on-tap' },
        { baiHocId: rotNuoc.id, nhan: 'on-tap' },
      ] }] } });
    const ke = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
      .find(x => x.studentId === studentId).ke;
    const dong = (id) => ke.baiHoc.find(b => b.baiHocId === id).id;
    const r = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: nhinLai(dong) } });
    check(`đối chứng — cô nhìn lại kế hoạch của bé ${studentId}`, r.status === 200, r.data);
  }

  const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
    loai: 'thang', ten: 'Báo cáo tháng (O2)', tuThang: 0, denThang: 72,
    dong: [
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Thực hành cuộc sống', kieu: 'chu', gocLinhVuc: 'thuc-hanh-cuoc-song' },
    ] } });
  const MAU = mau.data.mau.id;

  // =========================================================================
  console.log('\n[O2] Bản điền sẵn mới: tiêu đề, mỗi bài một dòng, rồi "Nhận xét của cô"');
  await lapKeHoach('s1', (dong) => [
    { id: dong(thapHong.id), mucDo: 'da-vung', tiepTuc: '', nhanXet: 'Con xếp đủ mười khối, tự sửa khi lệch' },
    { id: dong(cauThang.id), mucDo: 'chua-quan-sat-thay', tiepTuc: '', nhanXet: 'Con thích đếm bậc' },
    { id: dong(rotNuoc.id), mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' },
  ]);
  const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
    studentId: 's1', mauId: MAU, tuNgay: `${THANG}-01`, denNgay: HOM_NAY() } });
  check('cô mở được bản báo cáo tháng', tao.status === 201 && tao.data.ban, tao.data);
  const o = (goc) => ((tao.data.ban || {}).dong || []).find(d => d.gocLinhVuc === goc)?.chu || '';
  const gq = o('giac-quan');
  const th = o('thuc-hanh-cuoc-song');
  const dongGq = gq.split('\n');

  check('dòng đầu là "Bài học trong tháng của con:"', dongGq[0] === 'Bài học trong tháng của con:', gq);
  check('mỗi bài một dòng có dấu chấm đầu dòng, đúng thứ tự kế hoạch',
    dongGq[1] === '• Tháp hồng (học mới · S)' && dongGq[2] === '• Cầu thang nâu (ôn tập · N)', gq);
  check('không còn dòng nối dài "Bài học tháng này: …, …"', !/Bài học tháng này/.test(gq + th), gq);
  const iNx = dongGq.indexOf('Nhận xét của cô:');
  check('có dòng riêng "Nhận xét của cô:" đứng sau danh sách bài', iNx > 2, gq);
  check('nhận xét của từng bài là một dòng dưới "Nhận xét của cô:"',
    dongGq[iNx + 1] === '• Tháp hồng: Con xếp đủ mười khối, tự sửa khi lệch'
      && dongGq[iNx + 2] === '• Cầu thang nâu: Con thích đếm bậc', gq);
  check('kết luận "Đã thấy con làm được" vẫn còn', /^Đã thấy con làm được: Tháp hồng$/m.test(gq), gq);
  check('chú giải chữ quy ước vẫn một dòng (quyết định 07/10)',
    (gq.match(/Chữ quy ước:/g) || []).length === 1, gq);
  check('ô không có nhận xét thì không có dòng "Nhận xét của cô:" trống', !/Nhận xét của cô/.test(th), th);
  check('ô Thực hành: một bài, vẫn đúng bố cục và việc tháng sau',
    th.startsWith('Bài học trong tháng của con:\n• Rót nước (ôn tập · W)\n')
      && /^Tiếp tục cùng con: Rót nước \(tháng sau ôn tập\)$/m.test(th), th);
  check('không phần trăm, không điểm số (QUY TẮC 4)', !/%|điểm/i.test(gq + th));

  // =========================================================================
  console.log('\n[O2] Bản đã lưu không bị viết lại theo bố cục mới');
  const BAN = tao.data.ban.id;
  const oGq = tao.data.ban.dong.find(d => d.gocLinhVuc === 'giac-quan');
  const CU = 'Bài học tháng này: Tháp hồng (học mới · S), Cầu thang nâu (ôn tập · N)';
  const luu = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { o: [{ dongId: oGq.id, chu: CU }] } });
  check('đối chứng — cô lưu được ô theo bố cục cũ', luu.status === 200, luu.status);
  const moLai = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
    studentId: 's1', mauId: MAU, tuNgay: `${THANG}-01`, denNgay: HOM_NAY() } });
  check('mở lại bản: ô đã lưu giữ nguyên từng chữ',
    moLai.data.ban.dong.find(d => d.id === oGq.id).chu === CU, moLai.data.ban.dong.find(d => d.id === oGq.id).chu);
  check('mở lại không điền thêm ô nào', (moLai.data.daDienSan || []).length === 0, moLai.data.daDienSan);

  const gui = await req('POST', `/api/baocaohoctap/ban/${BAN}/gui`, { cookie: GV, body: {} });
  check('đối chứng — cô gửi được bản', gui.status === 200, gui.data);
  const duyet = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { quyetDinh: 'da-duyet' } });
  check('đối chứng — ban giám hiệu duyệt, công bố hôm nay', duyet.status === 200, duyet.data);
  const giaDinh = await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH });
  check('gia đình đọc được bản', giaDinh.status === 200, giaDinh.status);
  const dongGiaDinh = (giaDinh.data?.ban?.dong || []);
  check('bản gia đình đọc: ô đã gửi đúng chữ cô đã lưu, không bị đổi bố cục',
    dongGiaDinh.find(d => d.gocLinhVuc === 'giac-quan')?.chu === CU, dongGiaDinh.map(d => d.chu));
  check('bản gia đình đọc: ô điền sẵn theo bố cục mới đi nguyên tới nhà',
    dongGiaDinh.find(d => d.gocLinhVuc === 'thuc-hanh-cuoc-song')?.chu === th);
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
