// Bài canh BÁO CÁO HỌC TẬP — đợt 2 theo phản hồi nhà trường 07/09.
//
// Chạy bằng:  npm run test:bao-cao-duyet
//
// BA CHỖ ĐÁNG CANH, VÀ VÌ SAO
//
//   1. TỰ ĐIỀN TỪ KẾ HOẠCH — nhưng chỉ ô CÒN TRỐNG, chỉ bản NHÁP, chỉ báo cáo
//      THÁNG. Cái dễ hỏng nhất là điền đè lên chữ cô đã gõ: bài này gõ vào một
//      ô rồi mở lại bản, và đòi chữ ấy còn nguyên. Mục [1].
//
//   2. GIA ĐÌNH CHỈ THẤY KHI ĐÃ DUYỆT VÀ TỚI NGÀY. Đây là ranh giới lớp 1 →
//      phụ huynh, nay có thêm hai bước ở giữa (quản lý duyệt, ngày công bố).
//      Mỗi bước phải là một chốt thật: cô gửi xong gia đình vẫn 404, quản lý
//      duyệt với ngày mai gia đình vẫn 404, đúng ngày thì thấy và được báo
//      ĐÚNG MỘT LẦN. Mục [3].
//
//   3. KHOÁ Ô THEO CÔ. Nhiều cô một nhóm: ô cô A ghi thì cô B không sửa,
//      không xoá, và câu từ chối phải nói đúng tên cô A với đường ra (nhờ quản
//      lý mở). Ô máy điền sẵn thì KHÔNG khoá. Mục [2].
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, HOM_NAY } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('bao-cao-duyet');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'bcd_qt');
const mkCs2 = taoQuanTri(DIR, 'Quản lý CS2', 'bcd_cs2');
khoaVaoCoSo(DIR, 'bcd_cs2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4634), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
const KY = { tu: `${THANG}-01`, den: HOM };
const NGAY_MAI = new Date(Date.parse(`${HOM}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

const tinRiengBe = async (cookie) =>
  ((await req('GET', '/api/notifications/rieng-be', { cookie })).data || []).filter(n => n.laRiengBe && n.loai === 'bao-cao');

try {
  const QT = await vao('bcd_qt', mkQt);
  const CS2 = await vao('bcd_cs2', mkCs2);
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1
  const GV3 = (await login('giaovien3', '123456')).cookie;  // cô THỨ HAI của c1
  const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm khác
  const PH = (await login('phuhuynh', '123456')).cookie;    // gia đình s1

  // Danh mục bài + kế hoạch tháng này của s1, có nhìn lại.
  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc;
  const thapHong = dm.find(b => b.ten === 'Tháp hồng');
  const rotNuoc = dm.find(b => b.ten === 'Rót nước');
  await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: THANG,
      danhSach: [{
        studentId: 's1',
        muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }],
        baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: rotNuoc.id, nhan: 'on-tap' }],
      }],
    },
  });
  const keBe = (await req('GET', `/api/kehoachbe/be?studentId=s1&thang=${THANG}`, { cookie: GV })).data.ke;
  await req('PUT', '/api/kehoachbe/nhin-lai', {
    cookie: GV,
    body: {
      id: keBe.id,
      muc: [{ id: keBe.muc[0].id, ketQua: 'dang-hinh-thanh', nhanXet: 'Con đếm tới 7 rồi dừng' }],
      baiHoc: [
        { id: keBe.baiHoc.find(b => b.baiHocId === thapHong.id).id, ketQua: 'da-thay', nhanXet: 'Con xếp được năm khối' },
        { id: keBe.baiHoc.find(b => b.baiHocId === rotNuoc.id).id, ketQua: 'tiep-tuc' },
      ],
    },
  });

  // Mẫu tháng có dòng theo góc, một dòng chọn mức, một dòng không góc.
  const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
    loai: 'thang', ten: 'Báo cáo tháng (thử)', tuThang: 0, denThang: 72,
    dong: [
      { nhom: 'I. TỰ PHỤC VỤ', tieuDe: 'Lưu ý', kieu: 'chu' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Thực hành cuộc sống', kieu: 'chu', gocLinhVuc: 'thuc-hanh-cuoc-song' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Toán', kieu: 'chu', gocLinhVuc: 'toan' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Tiếng Việt', kieu: 'muc', gocLinhVuc: 'tieng-viet' },
      { nhom: 'II. NHẬN THỨC', tieuDe: 'Văn hoá', kieu: 'chu', gocLinhVuc: 'van-hoa' },
    ] } });
  const MAU = mau.data.mau.id;
  const mauHK = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
    loai: 'hocky', ten: 'Báo cáo 6 tháng (thử)', tuThang: 0, denThang: 72,
    dong: [{ nhom: 'II', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' }] } });

  // =========================================================================
  console.log('\n[1] Mở báo cáo THÁNG là điền sẵn từ Kế hoạch — chỉ ô trống, cô sửa được');
  let BAN;
  let dong;
  {
    const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: MAU, tuNgay: KY.tu, denNgay: KY.den } });
    check('cô mở được bản', tao.status === 201 && tao.data.ban, `${tao.status} ${JSON.stringify(tao.data).slice(0, 120)}`);
    BAN = tao.data.ban.id;
    dong = tao.data.ban.dong;
    check('máy chủ nói rõ đã điền sẵn ĐÚNG ba ô có kế hoạch (Thực hành, Giác quan, Toán)',
      (tao.data.daDienSan || []).length === 3, tao.data.daDienSan);
    const oGQ = dong.find(d => d.gocLinhVuc === 'giac-quan');
    const oTH = dong.find(d => d.gocLinhVuc === 'thuc-hanh-cuoc-song');
    const oToan = dong.find(d => d.gocLinhVuc === 'toan');
    check('ô Giác quan có tên bài, nhãn, kết luận và ghi chú nhìn lại',
      /Tháp hồng \(học mới\)/.test(oGQ.chu) && /Đã thấy con làm được: Tháp hồng/.test(oGQ.chu) && /năm khối/.test(oGQ.chu), oGQ.chu);
    check('ô Thực hành cuộc sống ghi "Tiếp tục cùng con: Rót nước"', /Tiếp tục cùng con: Rót nước/.test(oTH.chu), oTH.chu);
    check('ô Toán mang ô chữ tự do của kế hoạch kèm nhận xét', /Đếm hạt tới 10/.test(oToan.chu) && /đếm tới 7/.test(oToan.chu), oToan.chu);
    check('ô KHÔNG có góc (Lưu ý) và ô KHÔNG có kế hoạch (Văn hoá) để trống',
      dong.find(d => d.tieuDe === 'Lưu ý').chu === '' && dong.find(d => d.gocLinhVuc === 'van-hoa').chu === '');
    check('ô CHỌN MỨC không bị điền', dong.find(d => d.kieu === 'muc').muc === '' && dong.find(d => d.kieu === 'muc').chu === '');
    check('phần tổng hợp và hai ô việc-làm-tiếp KHÔNG bị điền — đó là chữ cô nói với gia đình',
      tao.data.ban.tongHop === '' && tao.data.ban.oLopLamGi === '' && tao.data.ban.oNhaChoiGi === '');
    check('ô máy điền KHÔNG có khoá — chưa cô nào ghi', dong.filter(d => d.chu).every(d => d.khoa === null));
    check('chữ điền sẵn không mang chữ nào của cặp từ đúng/sai, không phần trăm',
      !/chưa đạt|không đạt|đạt|%/i.test(dong.map(d => d.chu).join('\n')));

    // Cô sửa ô Giác quan, rồi mở lại: chữ cô còn nguyên, ô trống vẫn trống.
    const sua = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: {
      o: [{ dongId: oGQ.id, chu: 'Con xếp tháp hồng từ khối to tới khối nhỏ, tự sửa khi lệch.' }] } });
    check('cô sửa được ô máy điền', sua.status === 200, sua.status);
    const moLai = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: MAU, tuNgay: KY.tu, denNgay: KY.den } });
    check('mở lại thì KHÔNG đè chữ cô đã sửa',
      moLai.data.daCoSan === true && /tự sửa khi lệch/.test(moLai.data.ban.dong.find(d => d.gocLinhVuc === 'giac-quan').chu),
      moLai.data.ban.dong.find(d => d.gocLinhVuc === 'giac-quan').chu);
    check('và không điền thêm ô nào nữa (ba ô đã có chữ)', (moLai.data.daDienSan || []).length === 0, moLai.data.daDienSan);
    // Ô cô xoá trắng rồi mở lại: được điền lại — ô trống là ô trống.
    await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { o: [{ dongId: oToan.id, chu: '' }] } });
    const moLai2 = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: MAU, tuNgay: KY.tu, denNgay: KY.den } });
    check('ô cô xoá trắng thì mở lại được điền lại từ kế hoạch', (moLai2.data.daDienSan || []).length === 1);

    const hk = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: mauHK.data.mau.id, tuNgay: KY.tu, denNgay: KY.den } });
    check('báo cáo 6 THÁNG thì KHÔNG điền sẵn', hk.status === 201 && (hk.data.daDienSan || []).length === 0
      && hk.data.ban.dong.every(d => d.chu === ''), hk.data.daDienSan);
  }

  // =========================================================================
  console.log('\n[2] Khoá ô theo cô — ô cô A ghi thì cô B không sửa, quản lý mở');
  {
    const oLuuY = dong.find(d => d.tieuDe === 'Lưu ý');
    const oToan = dong.find(d => d.gocLinhVuc === 'toan');
    const a = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: {
      o: [{ dongId: oLuuY.id, chu: 'Con tự xúc cơm, gọi cô khi cần.' }] } });
    check('cô A ghi ô Lưu ý', a.status === 200, a.status);
    const khoaA = a.data.ban.dong.find(d => d.id === oLuuY.id).khoa;
    check('ô đó mang khoá của cô A', khoaA && khoaA.dangKhoa === true && /Lan|Cô/.test(khoaA.coGhiTen || ''), khoaA);

    const bSua = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV3, body: {
      o: [{ dongId: oLuuY.id, chu: 'Cô B viết đè' }] } });
    check('CÔ B KHÔNG SỬA ĐƯỢC ô cô A đã ghi', bSua.status === 403, bSua.status);
    check('câu từ chối nói tên cô A, nói đã khoá, và chỉ đường: nhờ quản lý cơ sở mở',
      /đã khoá/.test(bSua.data.error || '') && /nhờ quản lý cơ sở mở/.test(bSua.data.error || '')
        && (bSua.data.error || '').includes(khoaA.coGhiTen), bSua.data.error);
    const bXoa = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV3, body: { o: [{ dongId: oLuuY.id, chu: '' }] } });
    check('cô B cũng KHÔNG XOÁ được', bXoa.status === 403, bXoa.status);
    const bGiu = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV3, body: {
      o: [{ dongId: oLuuY.id, chu: 'Con tự xúc cơm, gọi cô khi cần.' }, { dongId: oToan.id, chu: 'Cô B ghi phần Toán.' }] } });
    check('gửi ô của cô A Y NGUYÊN (màn hình gửi mọi ô) thì đi qua; cô B ghi được ô khác',
      bGiu.status === 200 && bGiu.data.ban.dong.find(d => d.id === oToan.id).chu === 'Cô B ghi phần Toán.', bGiu.data.error);
    const khoaB = bGiu.data.ban.dong.find(d => d.id === oToan.id).khoa;
    check('ô máy điền sẵn, cô B sửa đầu tiên → khoá thuộc cô B', khoaB && khoaB.dangKhoa && khoaB.coGhi !== khoaA.coGhi, khoaB);
    const aSuaB = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { o: [{ dongId: oToan.id, chu: 'Cô A viết đè' }] } });
    check('giờ tới lượt cô A không sửa được ô của cô B — luật đối xứng', aSuaB.status === 403, aSuaB.status);
    const aSuaMinh = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { o: [{ dongId: oLuuY.id, chu: 'Con tự xúc cơm, gọi cô khi cần đi vệ sinh.' }] } });
    check('chính chủ sửa lại ô mình thì bình thường', aSuaMinh.status === 200, aSuaMinh.status);
    const qtSua = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: QT, body: { o: [{ dongId: oLuuY.id, chu: 'Quản lý viết đè' }] } });
    check('quản lý cũng không sửa đè thẳng — phải mở khoá (có vết) trước', qtSua.status === 403, qtSua.status);

    const oId = a.data.ban.dong.find(d => d.id === oLuuY.id).oId;
    const coMo = await req('POST', `/api/baocaohoctap/o/${oId}/mo-khoa`, { cookie: GV3 });
    check('cô không tự mở khoá', coMo.status === 403, coMo.status);
    const cs2Mo = await req('POST', `/api/baocaohoctap/o/${oId}/mo-khoa`, { cookie: CS2 });
    check('quản lý cơ sở KHÁC không mở khoá bé cơ sở này', cs2Mo.status === 403, cs2Mo.status);
    const mo = await req('POST', `/api/baocaohoctap/o/${oId}/mo-khoa`, { cookie: QT });
    check('quản lý cơ sở mở khoá được', mo.status === 200 && mo.data.ban.dong.find(d => d.id === oLuuY.id).khoa.dangKhoa === false, mo.data);
    const bSau = await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV3, body: { o: [{ dongId: oLuuY.id, chu: 'Cô B bổ sung: con tự cất ghế.' }] } });
    check('mở rồi thì cô B ghi được, và nhận khoá mới',
      bSau.status === 200 && bSau.data.ban.dong.find(d => d.id === oLuuY.id).khoa.coGhi === khoaB.coGhi
        && bSau.data.ban.dong.find(d => d.id === oLuuY.id).khoa.dangKhoa === true, bSau.data.error);
    const laLa = await req('POST', '/api/baocaohoctap/o/khong-co-that/mo-khoa', { cookie: QT });
    check('ô không có thật thì 404', laLa.status === 404, laLa.status);
  }

  // =========================================================================
  console.log('\n[3] Gửi → quản lý duyệt → ngày công bố → gia đình thấy, được báo MỘT lần');
  {
    const truoc = (await tinRiengBe(PH)).length;
    await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { tongHop: 'Tháng này con vui.', oNhaChoiGi: 'Cùng con rót nước ở nhà.' } });

    const gui = await req('POST', `/api/baocaohoctap/ban/${BAN}/gui`, { cookie: GV });
    check('cô gửi → CHỜ QUẢN LÝ DUYỆT, chưa tới gia đình',
      gui.status === 200 && gui.data.choDuyet === true && gui.data.ban.buoc === 'cho-duyet' && gui.data.ban.giaDinhThay === false, gui.data);
    check('gia đình mở bản → 404', (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH })).status === 404);
    check('danh sách của gia đình rỗng', ((await req('GET', '/api/baocaohoctap/cua-be?studentId=s1', { cookie: PH })).data.ban || []).length === 0);
    check('cô không sửa được bản đang chờ duyệt', (await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { tongHop: 'x' } })).status === 400);

    const coDuyet = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: GV, body: {} });
    check('CÔ KHÔNG DUYỆT ĐƯỢC', coDuyet.status === 403, coDuyet.status);
    const phDuyet = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: PH, body: {} });
    check('gia đình cũng không', phDuyet.status === 403, phDuyet.status);
    const cs2Cho = await req('GET', '/api/baocaohoctap/cho-duyet', { cookie: CS2 });
    check('quản lý cơ sở KHÁC không thấy bản này trong Chờ duyệt',
      cs2Cho.status === 200 && !(cs2Cho.data.danhSach || []).some(x => x.banId === BAN), cs2Cho.data);
    const cs2Duyet = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: CS2, body: {} });
    check('và không duyệt được', cs2Duyet.status === 403, cs2Duyet.status);
    const qtCho = await req('GET', '/api/baocaohoctap/cho-duyet', { cookie: QT });
    check('hiệu trưởng thấy bản trong Chờ duyệt kèm ai gửi',
      (qtCho.data.danhSach || []).some(x => x.banId === BAN && x.hoTen && x.nguoiGuiTen), qtCho.data);

    const traThieu = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { quyetDinh: 'tu-choi' } });
    check('trả lại mà không nói vì sao thì bị từ chối', traThieu.status === 400, traThieu.status);
    const tra = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { quyetDinh: 'tu-choi', yKien: 'Phần Toán còn chung, cô kể một việc cụ thể.' } });
    check('trả lại kèm ý kiến → bản về nháp, bước "trả lại"', tra.status === 200 && tra.data.ban.trangThai === 'nhap' && tra.data.ban.buoc === 'tra-lai', tra.data);
    const so = await req('GET', `/api/baocaohoctap/nhom?classId=c1&tuNgay=${KY.tu}&denNgay=${KY.den}&loai=thang`, { cookie: GV });
    const s1So = (so.data.danhSach || []).find(x => x.studentId === 's1');
    check('sổ của cô hiện bước và ý kiến trả lại', s1So.buoc === 'tra-lai' && /việc cụ thể/.test(s1So.yKien), s1So);
    check('bị trả lại thì cô sửa được ngay', (await req('PUT', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV, body: { tongHop: 'Tháng này con vui và hợp tác.' } })).status === 200);

    await req('POST', `/api/baocaohoctap/ban/${BAN}/gui`, { cookie: GV });
    const ngayXau = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { ngayCongBo: '15/09/2026' } });
    check('ngày công bố sai dạng thì từ chối, không lặng lẽ đổi thành hôm nay', ngayXau.status === 400, ngayXau.status);
    const duyetMai = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { ngayCongBo: NGAY_MAI } });
    check('duyệt với ngày công bố NGÀY MAI → bước "chờ ngày", chưa báo',
      duyetMai.status === 200 && duyetMai.data.ban.buoc === 'cho-ngay' && duyetMai.data.daBao === false, duyetMai.data);
    check('ĐÃ DUYỆT NHƯNG CHƯA TỚI NGÀY: gia đình VẪN không thấy',
      (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH })).status === 404
        && ((await req('GET', '/api/baocaohoctap/cua-be?studentId=s1', { cookie: PH })).data.ban || []).length === 0);
    check('và chưa có tin nào cho gia đình', (await tinRiengBe(PH)).length === truoc);

    const duyetNay = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { ngayCongBo: HOM } });
    check('quản lý đổi ngày công bố thành hôm nay → gia đình được báo ngay',
      duyetNay.status === 200 && duyetNay.data.daBao === true && duyetNay.data.ban.buoc === 'da-cong-bo', duyetNay.data);
    const doc = await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH });
    check('TỚI NGÀY: gia đình đọc được, đúng tên con', doc.status === 200 && doc.data.ban.hoTen, doc.status);
    check('gia đình không thấy ai ghi ô nào, ai gửi ai duyệt',
      doc.data.ban.dong.every(d => d.khoa === undefined && d.oId === undefined) && doc.data.ban.soanBoi === undefined
        && !doc.data.ban.duyet.nguoiDuyet, JSON.stringify(doc.data.ban.duyet));
    const ds = await req('GET', '/api/baocaohoctap/cua-be?studentId=s1', { cookie: PH });
    check('danh sách của gia đình có bản này kèm ngày công bố',
      (ds.data.ban || []).some(b => b.id === BAN && b.ngayCongBo === HOM), ds.data);
    const tin = await tinRiengBe(PH);
    check('gia đình nhận ĐÚNG MỘT tin, nêu tên con và trỏ vào màn báo cáo',
      tin.length === truoc + 1 && /Báo cáo học tập của .+ đã có/.test(tin[0].title) && tin[0].hash === '#/baocaohoctap', tin[0]);
    await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH });
    await req('GET', '/api/baocaohoctap/cua-be?studentId=s1', { cookie: PH });
    await req('GET', `/api/baocaohoctap/nhom?classId=c1&tuNgay=${KY.tu}&denNgay=${KY.den}&loai=thang`, { cookie: GV });
    check('đọc lại bao nhiêu lần cũng KHÔNG báo lặp', (await tinRiengBe(PH)).length === truoc + 1);
    const doiNua = await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: { ngayCongBo: NGAY_MAI } });
    check('gia đình đã nhận thì không đổi ngày được nữa', doiNua.status === 400, doiNua.status);

    // Thu về sửa, gửi lại, duyệt lại → gia đình lại không thấy trong lúc sửa, và được báo bản mới.
    const thu = await req('POST', `/api/baocaohoctap/ban/${BAN}/thu-hoi`, { cookie: GV });
    check('cô thu về được', thu.status === 200 && thu.data.ban.buoc === 'nhap', thu.data);
    check('thu về thì gia đình lại không thấy', (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH })).status === 404);
    await req('POST', `/api/baocaohoctap/ban/${BAN}/gui`, { cookie: GV });
    check('gửi lại → lại chờ duyệt, gia đình chưa thấy',
      (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH })).status === 404);
    await req('POST', `/api/baocaohoctap/ban/${BAN}/duyet`, { cookie: QT, body: {} });
    check('duyệt lại (ngày mặc định hôm nay) → gia đình thấy và được báo về BẢN MỚI — thêm đúng một tin',
      (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: PH })).status === 200 && (await tinRiengBe(PH)).length === truoc + 2);

    const nhaKhac = (await login('phuhuynh2', '123456')).cookie;
    check('nhà khác không đọc được', (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: nhaKhac })).status === 403);
    check('cô nhóm khác không đọc được', (await req('GET', `/api/baocaohoctap/ban/${BAN}`, { cookie: GV2 })).status === 403);
  }

  // =========================================================================
  console.log('\n[4] Quản lý tự gửi = duyệt luôn (giữ cách gửi cũ), có chọn được ngày');
  {
    const so = await req('GET', `/api/baocaohoctap/nhom?classId=c1&tuNgay=${KY.tu}&denNgay=${KY.den}&loai=thang`, { cookie: QT });
    const beKhac = (so.data.danhSach || []).find(x => x.studentId !== 's1');
    const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: QT, body: {
      studentId: beKhac.studentId, mauId: MAU, tuNgay: KY.tu, denNgay: KY.den } });
    await req('PUT', `/api/baocaohoctap/ban/${tao.data.ban.id}`, { cookie: QT, body: { tongHop: 'Quản lý soạn hộ.' } });
    const gui = await req('POST', `/api/baocaohoctap/ban/${tao.data.ban.id}/gui`, { cookie: QT, body: { ngayCongBo: NGAY_MAI } });
    check('quản lý gửi kèm ngày mai → đã duyệt, chờ ngày',
      gui.status === 200 && gui.data.choDuyet === false && gui.data.ban.buoc === 'cho-ngay' && gui.data.ban.duyet.ngayCongBo === NGAY_MAI, gui.data);
    const phKhac = (await login('phuhuynh2', '123456')).cookie;
    const sBe = beKhac.studentId === 's3' ? phKhac : null;
    if (sBe) {
      check('gia đình bé đó chưa thấy vì chưa tới ngày',
        (await req('GET', `/api/baocaohoctap/ban/${tao.data.ban.id}`, { cookie: sBe })).status === 404);
    }
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Báo cáo học tập — điền sẵn, duyệt, ngày công bố, khoá ô');
