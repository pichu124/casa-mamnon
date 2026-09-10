// Bài canh BÁO CÁO HỌC TẬP — ba loại báo cáo của trường CASA.
//
// Chạy bằng:  npm run test:bao-cao-hoc-tap
//
// BỐN CHỖ ĐÁNG CANH NHẤT, VÀ VÌ SAO
//
//   1. RANH GIỚI NHÁP ↔ ĐÃ GỬI. Đây là ranh giới lớp 1 → phụ huynh mà
//      CLAUDE.md gọi là chỗ dễ rò rỉ nhất và cũng là chỗ mất lòng tin của cô
//      giáo nhanh nhất. `canAccessStudent` cho phụ huynh đi qua được, nên
//      chốt chặn phải là một dòng riêng trong đường dẫn — mục [4].
//
//   2. SỔ CỦA MỘT NHÓM PHẢI ĐÚNG BẰNG NHÓM ẤY. Bản đầu của phân hệ này gọi
//      `db.studentsOf(classId)`, mà hàm đó nhận NGƯỜI DÙNG chứ không nhận mã
//      nhóm — nên nó rơi xuống nhánh quản trị và trả về TOÀN BỘ 11 bé của
//      trường vào sổ của một nhóm 5 bé. Mục [2] là bài canh sinh ra từ đúng
//      lỗi đó, và nó so với con số thật của nhóm chứ không so với "lớn hơn 0".
//
//   3. NĂM MỨC KHÔNG ĐƯỢC TRÔI KHỎI HAI PHÂN HỆ KIA. Ba phân hệ cùng chép một
//      danh sách năm trạng thái (Hành trình, Kế hoạch của bé, và đây). Chép
//      tay thì sẽ trôi. Mục [7] đối chiếu cả ba, và canh luôn rằng không chữ
//      xếp hạng nào của mẫu giấy lọt vào mã.
//
//   4. NỐI SANG KẾ HOẠCH CỦA BÉ PHẢI LÀ MỜI, KHÔNG PHẢI TỰ ĐIỀN. Nhà trường
//      yêu cầu nhận xét cuối tháng "tự link qua báo cáo tháng". Mục [8] canh
//      hai vế: có lấy được chữ sang thật, và lấy xong thì bản báo cáo VẪN
//      TRỐNG cho tới khi cô tự điền. Kèm chốt chặn: tắt Kế hoạch của bé thì
//      đường này không đọc được một dòng nào của bảng bên đó.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, tatPhanHe, MAU, GOC, HOM_NAY } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('bao-cao-hoc-tap');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['baocaohoctap', 'kehoachbe']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'bcht_qt');

// Máy chủ thứ hai: BẬT báo cáo, TẮT Kế hoạch của bé. Dùng cho mục [8b].
const DIR2 = thuMucTam('bao-cao-hoc-tap-2');
sinhDuLieu(DIR2, { phanHe: true });
batPhanHe(DIR2, ['baocaohoctap']);
// Máy chủ thứ hai tồn tại để thử ĐÚNG cảnh "Kế hoạch của bé đang tắt". Từ Đ146
// phân hệ đó bật sẵn, nên phải tắt tường minh — mượn mặc định là bài tự xanh.
tatPhanHe(DIR2, ['kehoachbe']);
const mkQt2 = taoQuanTri(DIR2, 'Hiệu Trưởng', 'bcht_qt2');

const { BASE, dung } = await dungMayChu({ port: 4593, dir: DIR });
const { BASE: BASE2, dung: dung2 } = await dungMayChu({ port: 4594, dir: DIR2 });
const req = taoReq(BASE);
const login = taoLogin(req);
const req2 = taoReq(BASE2);
const login2 = taoLogin(req2);

const KY = { tu: '2026-03-01', den: '2026-03-31' };

try {
  const qt = await login('bcht_qt', mkQt);
  const co = await login('giaovien', '123456');
  const co4 = await login('giaovien4', '123456');
  const ph = await login('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Mẫu báo cáo — nhà trường soạn, cô chỉ đọc');
  {
    const d = await req('GET', '/api/baocaohoctap/mau', { cookie: qt.cookie });
    check('ba loại báo cáo đúng như nhà trường liệt kê',
      d.status === 200 && (d.data.loai || []).map(x => x.ma).join(',') === 'thang,hocky,cambridge',
      JSON.stringify((d.data.loai || []).map(x => x.ma)));
    check('trả về đủ năm mức kèm chữ cái của tờ giấy trường đang dùng',
      (d.data.muc || []).length === 5 && (d.data.muc || []).every(m => m.ma && m.ten && m.chuCai),
      JSON.stringify(d.data.muc));

    const tao = await req('POST', '/api/baocaohoctap/mau', { cookie: qt.cookie, body: {
      loai: 'thang', ten: 'Báo cáo tháng 0–3', tuThang: 0, denThang: 36,
      dong: [
        { nhom: 'I. KỸ NĂNG TỰ PHỤC VỤ', nhomEn: 'INDEPENDENCE SKILLS', tieuDe: 'Lưu ý', tieuDeEn: 'Note', kieu: 'chu' },
        { nhom: 'II. PHÁT TRIỂN NHẬN THỨC', tieuDe: 'Thực hành cuộc sống', kieu: 'chu', gocLinhVuc: 'thuc-hanh-cuoc-song' },
        { nhom: 'II. PHÁT TRIỂN NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'muc' },
      ] } });
    check('quản trị tạo được mẫu kèm các dòng',
      tao.status === 200 && tao.data.mau && tao.data.dong.length === 3,
      `${tao.status} ${JSON.stringify(tao.data).slice(0, 160)}`);
    globalThis.MAU_THANG = tao.data.mau.id;

    const coTao = await req('POST', '/api/baocaohoctap/mau', { cookie: co.cookie, body: {
      loai: 'thang', ten: 'Cô tự đặt mẫu', tuThang: 0, denThang: 72 } });
    check('CÔ KHÔNG tạo được mẫu — mẫu là việc của nhà trường',
      coTao.status === 403, `${coTao.status}`);

    const coDoc = await req('GET', '/api/baocaohoctap/mau', { cookie: co.cookie });
    check('nhưng cô ĐỌC được danh sách mẫu để còn soạn',
      coDoc.status === 200 && (coDoc.data.mau || []).length >= 1, `${coDoc.status}`);

    const xau = await req('POST', '/api/baocaohoctap/mau', { cookie: qt.cookie, body: {
      loai: 'thang', ten: 'Lứa tuổi ngược', tuThang: 60, denThang: 12 } });
    check('lứa tuổi từ lớn xuống nhỏ bị từ chối', xau.status === 400, `${xau.status}`);

    // Sửa MỖI TÊN mà mất sạch dòng thì một lần bấm nhầm là mất cả mẫu.
    const suaTen = await req('PUT', `/api/baocaohoctap/mau/${globalThis.MAU_THANG}`,
      { cookie: qt.cookie, body: { ten: 'Báo cáo tháng 0–3 (nhà trẻ)' } });
    check('sửa mỗi tên mẫu thì các dòng CÒN NGUYÊN',
      suaTen.status === 200 && suaTen.data.dong.length === 3,
      `${suaTen.status} còn ${suaTen.data.dong && suaTen.data.dong.length} dòng`);
  }

  // =========================================================================
  console.log('\n[2] Sổ của một nhóm đúng bằng nhóm ấy, không phải cả trường');
  {
    const q = `?classId=c1&tuNgay=${KY.tu}&denNgay=${KY.den}&loai=thang`;
    const d = await req('GET', `/api/baocaohoctap/nhom${q}`, { cookie: co.cookie });
    check(`sổ nhóm c1 có đúng ${MAU.soBeNhomChoi2} bé, không phải ${MAU.soBe} bé cả trường`,
      d.status === 200 && (d.data.danhSach || []).length === MAU.soBeNhomChoi2,
      `${d.status} — ${(d.data.danhSach || []).length} bé`);

    // ĐỐI CHỨNG: con số trên chỉ có nghĩa khi cả trường THẬT SỰ đông hơn nhóm.
    // Không có dòng này thì bài trên vẫn xanh kể cả khi trường chỉ có 5 bé.
    check('đối chứng — cả trường đông hơn một nhóm, nên phép so trên có nghĩa',
      MAU.soBe > MAU.soBeNhomChoi2, `${MAU.soBe} vs ${MAU.soBeNhomChoi2}`);

    check('mỗi bé có tuổi tính bằng THÁNG, không phải tuổi tròn',
      (d.data.danhSach || []).every(x => Number.isInteger(x.thangTuoi) && x.thangTuoi > 0),
      JSON.stringify((d.data.danhSach || []).map(x => x.thangTuoi)));

    check('bé chưa có báo cáo thì banId là null, không phải một con số thiếu hụt',
      (d.data.danhSach || []).every(x => x.banId === null && x.trangThai === null),
      JSON.stringify((d.data.danhSach || [])[0]));

    const lac = await req('GET', `/api/baocaohoctap/nhom?classId=c4&tuNgay=${KY.tu}&denNgay=${KY.den}&loai=thang`,
      { cookie: co.cookie });
    check('cô nhóm Chồi 2 KHÔNG mở được sổ của nhóm Nhà trẻ', lac.status === 403, `${lac.status}`);
  }

  // =========================================================================
  console.log('\n[3] Cô soạn báo cáo: mở bản, điền, ô xoá trắng thì mất hẳn');
  {
    const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: co.cookie, body: {
      studentId: 's1', mauId: globalThis.MAU_THANG, tuNgay: KY.tu, denNgay: KY.den } });
    check('cô mở được bản báo cáo cho bé của nhóm mình',
      tao.status === 201 && tao.data.ban && tao.data.ban.dong.length === 3,
      `${tao.status} ${JSON.stringify(tao.data).slice(0, 140)}`);
    const banId = tao.data.ban.id;
    globalThis.BAN = banId;

    check('bản mới mở là NHÁP, chưa gửi',
      tao.data.ban.trangThai === 'nhap' && tao.data.ban.daGui === false,
      tao.data.ban.trangThai);

    check('mở lại đúng bé + đúng mẫu + đúng kỳ thì KHÔNG đẻ ra bản thứ hai',
      (await req('POST', '/api/baocaohoctap/ban', { cookie: co.cookie, body: {
        studentId: 's1', mauId: globalThis.MAU_THANG, tuNgay: KY.tu, denNgay: KY.den } })).data.daCoSan === true);

    const dong = tao.data.ban.dong;
    const luu = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie, body: {
      o: [
        { dongId: dong[0].id, chu: 'Con tự xúc cơm, gọi cô khi cần đi vệ sinh.' },
        { dongId: dong[2].id, muc: 'dang-hinh-thanh' },
      ],
      tongHop: 'Tháng này con vui vẻ và hợp tác.',
      oLopLamGi: 'Cô sẽ mời con làm việc với khay rót nước.',
      oNhaChoiGi: 'Ở nhà bố mẹ cho con tự xúc bữa tối.',
      coKy: 'Cô Lan' } });
    check('lưu nháp: ô chữ và ô mức đều vào đúng chỗ',
      luu.status === 200
      && luu.data.ban.dong[0].chu.startsWith('Con tự xúc cơm')
      && luu.data.ban.dong[2].muc === 'dang-hinh-thanh',
      JSON.stringify(luu.data.ban.dong.map(d => [d.chu, d.muc])));

    check('dòng cô chưa điền vẫn trống, không bị máy điền hộ',
      luu.data.ban.dong[1].chu === '' && luu.data.ban.dong[1].muc === '',
      JSON.stringify(luu.data.ban.dong[1]));

    check('QUY TẮC 5 — hai ô việc-làm-tiếp có thật và giữ được chữ',
      luu.data.ban.oLopLamGi.includes('khay rót nước') && luu.data.ban.oNhaChoiGi.includes('tự xúc'),
      JSON.stringify([luu.data.ban.oLopLamGi, luu.data.ban.oNhaChoiGi]));

    // PHÉP KIỂM TRÊN CHỈ ĐO MỘT CHIỀU — GIỮ ĐƯỢC CHỮ KHI CÔ ĐÃ TỰ GÕ.
    //
    // Nó xanh nguyên kể cả khi máy chủ chẳng đòi hai ô ấy bao giờ. Mà đây mới
    // là chỗ QUY TẮC 5 thật sự phải đứng: bản báo cáo là màn hình DUY NHẤT gia
    // đình đọc được nhãn năm mức (phân hệ Hành trình chỉ trả `trangThai` cho
    // cô và quản lý). Một bản mang nhãn "Đang hình thành" tới nhà mà không kèm
    // việc làm được thì gia đình đọc xong chỉ còn một chỗ xếp con mình vào,
    // không biết làm gì tiếp.
    const xoaHaiO = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie,
      body: { oLopLamGi: '   ', oNhaChoiGi: '' } });
    check('dựng được cảnh: bản có mức đã quan sát thấy nhưng trống cả hai ô việc',
      xoaHaiO.status === 200 && !xoaHaiO.data.ban.oLopLamGi && !xoaHaiO.data.ban.oNhaChoiGi,
      JSON.stringify([xoaHaiO.data?.ban?.oLopLamGi, xoaHaiO.data?.ban?.oNhaChoiGi]));

    const guiThieu = await req('POST', `/api/baocaohoctap/ban/${banId}/gui`, { cookie: co.cookie });
    check('QUY TẮC 5 — KHÔNG GỬI ĐƯỢC bản có nhận định mà không kèm việc làm được',
      guiThieu.status === 400, `${guiThieu.status} ${guiThieu.data?.error || ''}`);
    check('và câu từ chối chỉ đúng hai ô cần điền',
      /ở lớp cô làm gì tiếp|ở nhà gia đình chơi gì cùng con/i.test(guiThieu.data?.error || ''),
      guiThieu.data?.error);

    // Điền MỘT trong hai ô là đủ — không ép cô gõ cả hai.
    const motO = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie,
      body: { oNhaChoiGi: 'Ở nhà ba mẹ để con tự xúc bữa tối, đổ ra thì cùng lau.' } });
    check('điền lại một ô thì lưu được', motO.status === 200, motO.status);
    const guiDu = await req('POST', `/api/baocaohoctap/ban/${banId}/gui`, { cookie: co.cookie });
    check('ĐIỀN MỘT Ô LÀ GỬI ĐƯỢC — không ép cô gõ cả hai',
      guiDu.status === 200, `${guiDu.status} ${guiDu.data?.error || ''}`);

    // Thu về nháp để các mục sau còn dùng đúng bối cảnh cũ.
    await req('POST', `/api/baocaohoctap/ban/${banId}/thu-hoi`, { cookie: co.cookie });
    await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie, body: {
      oLopLamGi: 'Đặt thêm khay rót nước ở góc thực hành.',
      oNhaChoiGi: 'Ở nhà ba mẹ để con tự xúc bữa tối.' } });

    const xoa = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie, body: {
      o: [{ dongId: dong[0].id, chu: '   ' }] } });
    check('xoá trắng một ô thì ô đó mất hẳn, không để lại một dòng rỗng',
      xoa.status === 200 && xoa.data.ban.dong[0].chu === '', xoa.data.ban.dong[0].chu);

    const mucLa = await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie, body: {
      o: [{ dongId: dong[2].id, muc: 'xuat-sac' }] } });
    check('một mức lạ ngoài năm mức bị TỪ CHỐI cả lượt', mucLa.status === 400, `${mucLa.status}`);

    // Đặt lại nội dung để các mục sau còn dùng.
    await req('PUT', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie, body: {
      o: [{ dongId: dong[0].id, chu: 'Con tự xúc cơm, gọi cô khi cần đi vệ sinh.' }] } });
  }

  // =========================================================================
  console.log('\n[4] Nháp của cô KHÔNG bao giờ lộ sang gia đình');
  {
    const banId = globalThis.BAN;
    const doc = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: ph.cookie });
    check('phụ huynh mở bản NHÁP của chính con mình → không đọc được',
      doc.status === 404, `${doc.status} ${doc.data && doc.data.error}`);
    check('lời từ chối nói đúng lý do, không doạ người đọc',
      doc.data && /chưa gửi/i.test(doc.data.error || ''), doc.data && doc.data.error);

    const ds = await req('GET', '/api/baocaohoctap/cua-be?studentId=s1', { cookie: ph.cookie });
    check('danh sách của gia đình KHÔNG kể cả bản nháp',
      ds.status === 200 && (ds.data.ban || []).length === 0,
      `${ds.status} — ${(ds.data.ban || []).length} bản`);

    // ĐỐI CHỨNG: bản nháp đó CÓ TỒN TẠI và cô đọc được — nếu không thì hai
    // bài trên xanh vì chẳng có gì để rò rỉ.
    const coDoc = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie });
    check('đối chứng — bản nháp có thật và cô đọc được bình thường',
      coDoc.status === 200 && coDoc.data.ban.trangThai === 'nhap', `${coDoc.status}`);

    const laCo = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: co4.cookie });
    check('cô nhóm khác cũng không mở được bản của bé không thuộc nhóm mình',
      laCo.status === 403, `${laCo.status}`);
  }

  // =========================================================================
  console.log('\n[5] Cô chủ động gửi — không có đường nào tự gửi');
  {
    const banId = globalThis.BAN;

    // Bản trắng trơn: dựng riêng một bản khác, cho một bé KHÁC CÙNG NHÓM.
    // Lấy mã bé từ chính sổ của nhóm chứ không ghi cứng: ghi cứng 's2' là
    // ghi cứng một bé của nhóm KHÁC, và lượt gọi trả 403 chứ không phải 400 —
    // bài canh sẽ nói dối về chuyện nó đang canh.
    const soNhom = await req('GET', `/api/baocaohoctap/nhom?classId=c1&tuNgay=${KY.tu}&denNgay=${KY.den}&loai=thang`,
      { cookie: co.cookie });
    const beKhac = (soNhom.data.danhSach || []).find(x => x.studentId !== 's1');
    const trang = await req('POST', '/api/baocaohoctap/ban', { cookie: co.cookie, body: {
      studentId: beKhac.studentId, mauId: globalThis.MAU_THANG, tuNgay: KY.tu, denNgay: KY.den } });
    check('đối chứng — mở được bản cho một bé khác cùng nhóm',
      trang.status === 201, `${trang.status} ${JSON.stringify(trang.data).slice(0, 120)}`);
    const guiTrang = await req('POST', `/api/baocaohoctap/ban/${trang.data.ban.id}/gui`,
      { cookie: co.cookie, body: {} });
    check('bản chưa có nội dung nào thì KHÔNG gửi được',
      guiTrang.status === 400, `${guiTrang.status} ${guiTrang.data && guiTrang.data.error}`);
    check('lời nhắc nói cô cần làm gì, không phải một mã lỗi',
      /ghi thêm/i.test((guiTrang.data || {}).error || ''), (guiTrang.data || {}).error);

    const phGui = await req('POST', `/api/baocaohoctap/ban/${banId}/gui`, { cookie: ph.cookie, body: {} });
    check('phụ huynh KHÔNG tự gửi được báo cáo của con', phGui.status === 403, `${phGui.status}`);

    const gui = await req('POST', `/api/baocaohoctap/ban/${banId}/gui`, { cookie: co.cookie, body: {} });
    check('cô bấm gửi thì bản chuyển sang đã gửi',
      gui.status === 200 && gui.data.ban.daGui === true && !!gui.data.ban.guiLuc,
      `${gui.status} ${JSON.stringify(gui.data.ban && gui.data.ban.trangThai)}`);

    // ĐỢT 2 (phản hồi 07/09): "gửi" là gửi QUẢN LÝ DUYỆT. Gia đình chỉ thấy
    // khi quản lý duyệt và tới ngày công bố — bài canh riêng ở
    // test/bao-cao-duyet.test.mjs đi hết các nhánh; ở đây chỉ giữ mạch cũ.
    check('nhưng đó là gửi QUẢN LÝ DUYỆT, chưa phải gửi gia đình',
      gui.data.choDuyet === true && gui.data.ban.buoc === 'cho-duyet', JSON.stringify([gui.data.choDuyet, gui.data.ban.buoc]));
    const chuaDuyet = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: ph.cookie });
    check('quản lý chưa duyệt thì gia đình VẪN chưa đọc được', chuaDuyet.status === 404, `${chuaDuyet.status}`);

    const duyet = await req('POST', `/api/baocaohoctap/ban/${banId}/duyet`, { cookie: qt.cookie, body: { quyetDinh: 'da-duyet' } });
    check('quản lý duyệt được, ngày công bố mặc định là hôm nay',
      duyet.status === 200 && duyet.data.ngayCongBo === HOM_NAY(), `${duyet.status} ${JSON.stringify(duyet.data).slice(0, 120)}`);

    const doc = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: ph.cookie });
    check('giờ gia đình đọc được, và đọc đúng tên con mình',
      doc.status === 200 && doc.data.ban.hoTen && doc.data.ban.dong.length === 3,
      `${doc.status} ${doc.data.ban && doc.data.ban.hoTen}`);
    check('gia đình KHÔNG thấy bản này do tài khoản nào soạn',
      doc.data.ban.soanBoi === undefined, JSON.stringify(doc.data.ban.soanBoi));

    const thu = await req('POST', `/api/baocaohoctap/ban/${banId}/thu-hoi`, { cookie: co.cookie, body: {} });
    check('cô thu về được để sửa — gõ nhầm thì phải sửa được',
      thu.status === 200 && thu.data.ban.daGui === false, `${thu.status}`);
    const lai = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: ph.cookie });
    check('thu về rồi thì gia đình lại không đọc được nữa', lai.status === 404, `${lai.status}`);

    // Quản lý tự gửi = duyệt luôn (giữ tương thích với cách gửi cũ).
    const qtGui = await req('POST', `/api/baocaohoctap/ban/${banId}/gui`, { cookie: qt.cookie, body: {} });
    check('quản lý bấm gửi thì duyệt luôn, gia đình thấy ngay',
      qtGui.status === 200 && qtGui.data.ban.buoc === 'da-cong-bo'
        && (await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: ph.cookie })).status === 200,
      `${qtGui.status} ${qtGui.data.ban && qtGui.data.ban.buoc}`);
  }

  // =========================================================================
  // LỖI NÀY LỘ RA TỪ BÀN THỬ, KHÔNG PHẢI TỪ MỘT LƯỢT ĐỌC MÃ.
  //
  // Sổ của nhóm tra theo (bé, từ ngày, đến ngày) mà bỏ mất LOẠI, nên bé mới
  // chỉ có bản THÁNG vẫn bị đếm là đã có bản cho cả loại 6 THÁNG: màn hình
  // hiện nút *Mở báo cáo* và bấm vào thì mở đúng bản tháng ấy ra dưới tiêu đề
  // 6 tháng. Trên dữ liệu bàn thử, câu cũ trả về hai bé cho MỌI loại còn câu
  // mới trả đúng một bé cho mỗi loại.
  console.log('\n[5b] Sổ của nhóm tra theo ĐÚNG LOẠI đang xem');
  {
    const mauHK = await req('POST', '/api/baocaohoctap/mau', { cookie: qt.cookie, body: {
      loai: 'hocky', ten: 'Báo cáo 6 tháng (thử)', tuThang: 0, denThang: 72,
      dong: [{ nhom: 'I. THỂ CHẤT', tieuDe: 'Vận động thô', kieu: 'muc' }] } });
    check('đối chứng — dựng được một mẫu loại 6 THÁNG', mauHK.status === 200, `${mauHK.status}`);

    const q = `?classId=c1&tuNgay=${KY.tu}&denNgay=${KY.den}`;
    const thang = await req('GET', `/api/baocaohoctap/nhom${q}&loai=thang`, { cookie: co.cookie });
    const hocky = await req('GET', `/api/baocaohoctap/nhom${q}&loai=hocky`, { cookie: co.cookie });

    const s1Thang = (thang.data.danhSach || []).find(x => x.studentId === 's1');
    const s1HocKy = (hocky.data.danhSach || []).find(x => x.studentId === 's1');

    // ĐỐI CHỨNG TRƯỚC: bé s1 THẬT SỰ đã có một bản THÁNG trong kỳ này (mục [3]
    // và [5] vừa dựng). Không có dòng này thì dòng dưới vẫn xanh kể cả khi sổ
    // rỗng vì một lý do hoàn toàn khác.
    check('đối chứng — ở loại THÁNG, bé s1 đang có sẵn một bản',
      !!s1Thang && !!s1Thang.banId, JSON.stringify(s1Thang));

    check('sang loại 6 THÁNG thì bé s1 là CHƯA CÓ BẢN, không phải mở nhầm bản tháng',
      !!s1HocKy && s1HocKy.banId === null && s1HocKy.trangThai === null,
      JSON.stringify(s1HocKy));

    check('cả nhóm đều chưa có bản 6 tháng nào',
      (hocky.data.danhSach || []).length === MAU.soBeNhomChoi2
        && (hocky.data.danhSach || []).every(x => x.banId === null),
      JSON.stringify((hocky.data.danhSach || []).map(x => x.banId)));

    check('máy chủ nói lại nó vừa tra theo loại nào', hocky.data.loai === 'hocky', hocky.data.loai);

    // Bỏ trống loại thì TỪ CHỐI, không ngầm hiểu là "tháng" — ngầm hiểu chính
    // là cách lỗi này quay lại lần sau.
    const thieu = await req('GET', `/api/baocaohoctap/nhom${q}`, { cookie: co.cookie });
    check('gọi mà quên loại thì bị từ chối, không ngầm chọn giúp', thieu.status === 400, `${thieu.status}`);
    const bay = await req('GET', `/api/baocaohoctap/nhom${q}&loai=linh-tinh`, { cookie: co.cookie });
    check('loại lạ cũng bị từ chối', bay.status === 400, `${bay.status}`);
  }

  // =========================================================================
  console.log('\n[6] Bảng chiều cao cân nặng lấy từ sổ sức khoẻ, không chép lại');
  {
    const doc = await req('GET', `/api/baocaohoctap/ban/${globalThis.BAN}`, { cookie: co.cookie });
    check('bản báo cáo có mục số đo (mảng, kể cả khi rỗng)',
      Array.isArray(doc.data.ban.soDo), typeof doc.data.ban.soDo);

    const nguon = fs.readFileSync(path.join(GOC, 'modules/baocaohoctap/schema.sql'), 'utf8');
    check('KHÔNG có bảng nào của phân hệ này lưu lại chiều cao/cân nặng',
      !/height|weight|chieuCao|canNang/i.test(nguon),
      (nguon.match(/height|weight|chieuCao|canNang/gi) || []).join(', '));

    // SỐ ĐO ĐÃ THU HỒI KHÔNG ĐƯỢC IN VÀO BẢN GỬI GIA ĐÌNH.
    //
    // Hộp thoại thu hồi ở màn Sức khoẻ tự nêu tên đúng tình huống này: "Dùng
    // khi ghi nhầm sang bé khác". Y tế gõ nhầm số của bé khác, phát hiện, thu
    // hồi — hồ sơ sức khoẻ sạch, nhưng bản báo cáo gửi gia đình vẫn in con số
    // sai cạnh tên con họ, ở đúng thứ gia đình đọc kỹ nhất và giữ lại.
    //
    // Đọc bảng của phân hệ khác thì phải mang theo cả luật của phân hệ đó —
    // `dieuKienConHien` — chứ không chỉ mang theo câu SELECT.
    const CAO_LA = 137;
    const ghi = await req('POST', '/api/health', { cookie: qt.cookie, body: {
      studentId: 's1', type: 'checkup', title: 'Khám định kỳ (gõ nhầm bé)',
      height: CAO_LA, weight: 31, date: '2026-03-15' } });
    check('y tế ghi được một số đo để làm phép thử',
      ghi.status === 200 || ghi.status === 201,
      `${ghi.status} ${JSON.stringify(ghi.data).slice(0, 120)}`);

    // Đối chứng: chưa thu hồi thì số đo PHẢI có mặt. Không có vế này thì phép
    // kiểm dưới xanh cả khi mục số đo hỏng hẳn và luôn trả về mảng rỗng.
    const coSo = await req('GET', `/api/baocaohoctap/ban/${globalThis.BAN}`, { cookie: co.cookie });
    check('chưa thu hồi thì số đo CÓ trong bản báo cáo',
      (coSo.data?.ban?.soDo || []).some(x => Number(x.chieuCao) === CAO_LA),
      (coSo.data?.ban?.soDo || []).map(x => x.chieuCao));

    const thu = await req('DELETE', `/api/health/${ghi.data?.id}`, { cookie: qt.cookie });
    check('thu hồi được số đo vừa ghi', thu.status === 200,
      `${thu.status} ${JSON.stringify(thu.data)}`);

    const sauThu = await req('GET', `/api/baocaohoctap/ban/${globalThis.BAN}`, { cookie: co.cookie });
    check('SỐ ĐO ĐÃ THU HỒI KHÔNG CÒN TRONG BẢN GỬI GIA ĐÌNH',
      !(sauThu.data?.ban?.soDo || []).some(x => Number(x.chieuCao) === CAO_LA),
      (sauThu.data?.ban?.soDo || []).map(x => x.chieuCao));
    check('và mục số đo vẫn dựng bình thường, không vỡ',
      Array.isArray(sauThu.data?.ban?.soDo), typeof sauThu.data?.ban?.soDo);
  }

  // =========================================================================
  console.log('\n[7] QUY TẮC 4 — năm mức không trôi, không chữ xếp hạng nào');
  {
    const doc = (t) => fs.readFileSync(path.join(GOC, t), 'utf8');
    const day = (s) => {
      const m = s.match(/\[\s*'chua-day'[\s\S]*?\n\]/);
      return m ? (m[0].match(/'([a-z-]+)',\s*'/g) || []).join('|') : '';
    };
    const bc = day(doc('modules/baocaohoctap/routes.js'));
    const ht = day(doc('modules/hanhtrinh/routes.js'));
    const kb = day(doc('modules/kehoachbe/routes.js'));
    check('năm mã trạng thái trùng khớp với phân hệ Hành trình học tập',
      bc && bc === ht, `báo cáo: ${bc}\n     hành trình: ${ht}`);
    check('và trùng khớp với phân hệ Kế hoạch của bé',
      bc && bc === kb, `báo cáo: ${bc}\n     kế hoạch: ${kb}`);

    // Mấy từ xếp hạng trên tờ giấy nhà trường đang dùng. Chúng KHÔNG được có
    // mặt trong mã của phân hệ này, kể cả trong chú thích: một bộ canh có
    // ngoại lệ "trong ngoặc kép thì không tính" là một bộ canh có lỗ.
    const CAM = [/xuất sắc/i, /đạt yêu cầu/i, /thuần thục/i, /cần ôn lại/i];
    for (const t of ['routes.js', 'view.js', 'schema.sql', 'module.json']) {
      const s = doc(`modules/baocaohoctap/${t}`);
      const dinh = CAM.filter(re => re.test(s)).map(re => String(re));
      check(`${t} không mang chữ xếp hạng nào của mẫu giấy`, dinh.length === 0, dinh.join(', '));
    }

    // ĐỐI CHỨNG cho bộ canh ngay trên: mấy mẫu đó PHẢI bắt được thật.
    check('đối chứng — bộ canh chữ xếp hạng bắt được khi thử với chính chuỗi đó',
      CAM.some(re => re.test('mức Xuất Sắc')), 'mẫu không bắt được gì');

    const v = doc('modules/baocaohoctap/view.js');
    check('QUY TẮC 2 — không mức nào tô đỏ trên màn hình',
      /MAU_MUC[\s\S]*?\}/.test(v) && !/'red'|"red"/.test((v.match(/MAU_MUC[\s\S]*?\}/) || [''])[0]),
      (v.match(/MAU_MUC[\s\S]*?\}/) || [''])[0]);
  }

  // =========================================================================
  console.log('\n[8] Nối sang Kế hoạch của bé — MỜI chữ, không tự điền');
  {
    const banId = globalThis.BAN;
    const THANG = KY.den.slice(0, 7);

    // CHỤP TRẠNG THÁI BẢN BÁO CÁO TRƯỚC MỌI LƯỢT HỎI GỢI Ý.
    //
    // Bản đầu của bài này chụp SAU lượt gợi ý đầu tiên rồi so trước/sau. Phép
    // thử ngược cho thấy nó vô dụng: một đường gợi ý có tự ghi thật thì đã ghi
    // xong từ lượt trước khi chụp, và lượt sau ghi lại đúng chữ ấy nên hai bản
    // chụp giống hệt nhau — bài canh xanh trong khi chữ đã tự chảy vào hồ sơ.
    const truoc = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie });
    const TONG_HOP_CO_GO = truoc.data.ban.tongHop;
    check('đối chứng — trước khi hỏi gợi ý, phần tổng hợp đang là chữ CÔ TỰ GÕ',
      TONG_HOP_CO_GO.includes('vui vẻ và hợp tác'), JSON.stringify(TONG_HOP_CO_GO));

    // DỰNG TÌNH HUỐNG THẬT TRƯỚC KHI HỎI.
    //
    // Không có bước này thì `goiY` rỗng, và mọi bài dưới xanh vì KHÔNG CÓ GÌ
    // để mang sang — đúng kiểu xanh giả đã vấp nhiều lần: một phép kiểm phủ
    // định không có đối chứng dương thì không đo được gì cả.
    const lap = await req('PUT', '/api/kehoachbe', { cookie: co.cookie, body: {
      classId: 'c1', thang: THANG,
      danhSach: [{ studentId: 's1', muc: [
        { gocLinhVuc: 'giac-quan', noiDung: 'Mời con làm việc với tháp hồng.' },
      ] }] } });
    check('đối chứng — lập được kế hoạch tháng cho bé ở phân hệ Kế hoạch của bé',
      lap.status === 200, `${lap.status} ${JSON.stringify(lap.data).slice(0, 140)}`);

    const keBe = await req('GET', `/api/kehoachbe/be?studentId=s1&thang=${THANG}`, { cookie: co.cookie });
    const mucId = (((keBe.data || {}).ke || {}).muc || [])[0];
    check('đối chứng — kế hoạch vừa lập có mục đọc lại được',
      !!mucId && !!mucId.id, JSON.stringify(keBe.data).slice(0, 200));

    const nhin = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: co.cookie, body: {
      id: keBe.data.ke.id,
      muc: [{ id: mucId.id, ketQua: 'dang-hinh-thanh', nhanXet: 'Con xếp được tháp năm khối.' }] } });
    check('đối chứng — cô ghi được nhận xét cuối tháng ở Kế hoạch của bé',
      nhin.status === 200, `${nhin.status} ${JSON.stringify(nhin.data).slice(0, 140)}`);

    const gy = await req('GET', `/api/baocaohoctap/goi-y/${banId}`, { cookie: co.cookie });
    check('đường gợi ý trả lời được khi Kế hoạch của bé đang bật',
      gy.status === 200 && gy.data.bat === true, `${gy.status} ${JSON.stringify(gy.data).slice(0, 120)}`);
    check('gợi ý lấy đúng tháng cuối kỳ báo cáo',
      gy.data.thang === THANG, `${gy.data.thang} vs ${THANG}`);

    // ĐÂY MỚI LÀ VẾ "TỰ LINK QUA BÁO CÁO THÁNG" MÀ NHÀ TRƯỜNG YÊU CẦU.
    check('nhận xét cuối tháng cô vừa ghi CHẢY SANG được màn soạn báo cáo',
      (gy.data.goiY || []).some(g => (g.nhanXet || '').includes('tháp năm khối')),
      JSON.stringify(gy.data.goiY));
    check('gợi ý mang theo cả góc lĩnh vực để cô biết nó thuộc phần nào',
      (gy.data.goiY || []).some(g => g.gocLinhVuc === 'giac-quan'),
      JSON.stringify((gy.data.goiY || []).map(g => g.gocLinhVuc)));

    // VẾ QUAN TRỌNG NHẤT CỦA MỤC NÀY — "tự link" dừng ở chỗ MỜI.
    //
    // Khẳng định thẳng bản báo cáo vẫn đúng chữ cô tự gõ, chứ không so hai bản
    // chụp với nhau: một phép so trước/sau bị đánh bại bởi thứ tự gọi, còn
    // phép khẳng định này thì không.
    const sau = await req('GET', `/api/baocaohoctap/ban/${banId}`, { cookie: co.cookie });
    check('hỏi gợi ý xong, phần tổng hợp VẪN LÀ chữ cô tự gõ',
      sau.data.ban.tongHop === TONG_HOP_CO_GO,
      `trước: ${JSON.stringify(TONG_HOP_CO_GO)}\n     sau:   ${JSON.stringify(sau.data.ban.tongHop)}`);
    check('và không nhận xét nào của Kế hoạch tự chui vào bản báo cáo',
      !JSON.stringify(sau.data.ban).includes('tháp năm khối'),
      JSON.stringify(sau.data.ban).slice(0, 200));
    check('các ô trong bản cũng không đổi',
      JSON.stringify(truoc.data.ban.dong) === JSON.stringify(sau.data.ban.dong),
      'ô trong bản đổi sau khi hỏi gợi ý');

    const phGy = await req('GET', `/api/baocaohoctap/goi-y/${banId}`, { cookie: ph.cookie });
    check('gia đình KHÔNG gọi được đường gợi ý', phGy.status === 403, `${phGy.status}`);
  }

  // =========================================================================
  console.log('\n[8b] Tắt Kế hoạch của bé thì đường gợi ý KHÔNG đọc bảng bên đó');
  {
    const qt2 = await login2('bcht_qt2', mkQt2);
    const co2 = await login2('giaovien', '123456');
    const m = await req2('POST', '/api/baocaohoctap/mau', { cookie: qt2.cookie, body: {
      loai: 'thang', ten: 'Mẫu thử', tuThang: 0, denThang: 72,
      dong: [{ nhom: '', tieuDe: 'Lưu ý', kieu: 'chu' }] } });
    const b = await req2('POST', '/api/baocaohoctap/ban', { cookie: co2.cookie, body: {
      studentId: 's1', mauId: m.data.mau.id, tuNgay: KY.tu, denNgay: KY.den } });
    const gy = await req2('GET', `/api/baocaohoctap/goi-y/${b.data.ban.id}`, { cookie: co2.cookie });
    check('trả về bat=false và KHÔNG có gợi ý nào',
      gy.status === 200 && gy.data.bat === false && (gy.data.goiY || []).length === 0,
      `${gy.status} ${JSON.stringify(gy.data)}`);

    const ke = await req2('GET', '/api/kehoachbe?classId=c1&thang=2026-03', { cookie: co2.cookie });
    check('đối chứng — chính phân hệ Kế hoạch của bé đang TẮT thật (API 404)',
      ke.status === 404, `${ke.status}`);
  }

  // =========================================================================
  console.log('\n[9] Tắt phân hệ này thì API của nó bị chặn, dữ liệu còn nguyên');
  {
    const tat = await req('PUT', '/api/admin/modules/baocaohoctap', { cookie: qt.cookie, body: { enabled: false } });
    check('quản trị tắt được phân hệ', tat.status === 200, `${tat.status}`);

    const doc = await req('GET', `/api/baocaohoctap/ban/${globalThis.BAN}`, { cookie: co.cookie });
    check('đường dẫn của phân hệ trả 404 khi đã tắt', doc.status === 404, `${doc.status}`);

    const hs = await req('GET', '/api/students', { cookie: co.cookie });
    check('phần còn lại của app vẫn chạy y như cũ', hs.status === 200, `${hs.status}`);

    await req('PUT', '/api/admin/modules/baocaohoctap', { cookie: qt.cookie, body: { enabled: true } });
    const lai = await req('GET', `/api/baocaohoctap/ban/${globalThis.BAN}`, { cookie: co.cookie });
    check('bật lại thì báo cáo cũ CÒN NGUYÊN, không mất một ô nào',
      lai.status === 200 && lai.data.ban.dong.some(d => d.chu || d.muc),
      `${lai.status}`);
  }
} finally {
  await dung();
  await dung2();
  donThuMucTam(DIR);
  donThuMucTam(DIR2);
}

tongKet('Báo cáo học tập');
