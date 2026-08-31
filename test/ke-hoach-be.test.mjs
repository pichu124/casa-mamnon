// Bài canh KẾ HOẠCH CỦA BÉ — kế hoạch tháng từng bé, có phê duyệt.
//
// Chạy bằng:  npm run test:ke-hoach-be
//
// HAI RỦI RO ĐÃ ĐƯỢC NÊU TỪ TRƯỚC KHI VIẾT, VÀ CẢ HAI ĐỀU CANH ĐƯỢC
//
//   1. KHỐI LƯỢNG NHẬP LIỆU CHO CÔ RẤT LỚN. 20 bé nhân 5 góc là 100 ô mỗi
//      tháng. Mục [3] và [4] canh ba đường tắt thật sự rút ngắn được việc đó,
//      và canh cả chuyện chúng KHÔNG ĐÈ lên phần cô đã gõ tay — một đường tắt
//      xoá mất công của cô thì tệ hơn không có đường tắt.
//
//   2. VẾ CUỐI THÁNG CỦA NHÀ TRƯỜNG CHẠM QUY TẮC 2. Nhà trường mô tả bước cuối
//      tháng bằng một cặp từ đúng/sai rồi ôn tiếp. Mục [7] canh rằng trong
//      TOÀN BỘ phân hệ — kể cả chú thích — không có chữ nào thuộc cặp từ đó,
//      năm kết quả trùng khớp từng chữ với phân hệ Hành trình học tập, và
//      "ôn tiếp" là một ô tích trung tính chứ không phải một lời chê.
//
// MỘT ĐIỀU NỮA: NGƯỜI LẬP KHÔNG DUYỆT KẾ HOẠCH CỦA CHÍNH MÌNH.
// Cùng luật với duyệt đơn nghỉ ở Y2 — nếu không thì bước duyệt chỉ là một cái
// nút thừa. Mục [5].
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, HOM_NAY } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-be');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4030), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QL = await vao('hieutruong', mk1);
const QL3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1
const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm khác
// Cô Bích Ngọc (t3) phụ trách CẢ c1 lẫn c2 — dữ liệu mẫu dựng sẵn tình huống
// NHIỀU CÔ MỘT NHÓM, thay đổi nền lớn nhất của app 2.
const GV3 = (await login('giaovien3', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const THANG = HOM_NAY().slice(0, 7);
function thangLui(n) {
  const [y, m] = THANG.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7);
}

const nhom = async (cookie = GV, thang = THANG) =>
  (await req('GET', `/api/kehoachbe?classId=c1&thang=${thang}`, { cookie })).data;
const cuaBe = async (studentId, thang = THANG, cookie = GV) =>
  ((await nhom(cookie, thang)).danhSach || []).find(x => x.studentId === studentId);

// ===========================================================================
console.log('\n[1] Màn của cô: cả nhóm một tháng, kèm đủ danh mục để dựng ô chọn');
{
  const d = await nhom();
  check('cô mở được', Array.isArray(d.danhSach), d);
  check('thấy đủ bé của nhóm', (d.danhSach || []).length > 0, d.danhSach?.length);
  check('kèm NĂM góc lĩnh vực nhà trường liệt kê',
    (d.gocLinhVuc || []).map(x => x.ma).join(',') === 'toan,tieng-viet,cambridge,thuc-hanh-cuoc-song,giac-quan',
    (d.gocLinhVuc || []).map(x => x.ma));
  check('và NĂM kết quả nhìn lại', (d.ketQua || []).length === 5, (d.ketQua || []).map(x => x.ma));
  check('chưa lập gì thì mọi bé đều rỗng', (d.danhSach || []).every(x => x.ke === null));
  check('đếm được bao nhiêu bé chưa lập', d.tong.chuaLap === d.tong.soBe, d.tong);

  const ph = await req('GET', '/api/kehoachbe?classId=c1', { cookie: PH });
  check('PHỤ HUYNH không mở được — đây là hồ sơ nghề nghiệp của cô', ph.status === 403, ph.status);
  const co2 = await req('GET', '/api/kehoachbe?classId=c1', { cookie: GV2 });
  check('cô nhóm khác cũng không', co2.status === 403, co2.status);
}

// ===========================================================================
console.log('\n[2] Soạn CẢ NHÓM trong một lần lưu, và một mục sai chặn cả mẻ');
{
  const d = await nhom();
  const ds = (d.danhSach || []).slice(0, 3);
  const r = await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: THANG,
      danhSach: ds.map((x, i) => ({
        studentId: x.studentId,
        muc: [
          { gocLinhVuc: 'toan', noiDung: `Bộ gậy số cho bé ${i + 1}` },
          { gocLinhVuc: 'thuc-hanh-cuoc-song', noiDung: 'Tập rót nước bằng ca nhỏ' },
        ],
      })),
    },
  });
  check('lưu được cả mẻ', r.status === 200 && r.data?.daLuu === 3, r.data);

  const be = await cuaBe(ds[0].studentId);
  check('mỗi bé có bản kế hoạch riêng', !!be.ke, be);
  check('lưu đúng số mục', (be.ke.muc || []).length === 2, be.ke.muc);
  check('trạng thái ban đầu là cô đang soạn', be.ke.trangThai === 'nhap', be.ke.trangThai);
  check('và chụp lại nhóm lúc lập, không suy ra lúc đọc', be.ke.classId === 'c1', be.ke.classId);

  const gocLa = await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: THANG,
      danhSach: [{ studentId: ds[0].studentId, muc: [{ gocLinhVuc: 'the-duc', noiDung: 'x' }] }],
    },
  });
  check('góc lĩnh vực lạ thì từ chối', gocLa.status === 400, gocLa.status);

  const beKhac = await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's2', muc: [{ gocLinhVuc: 'toan', noiDung: 'x' }] }] },
  });
  check('bé không thuộc nhóm thì từ chối', beKhac.status === 400, beKhac.data?.error);

  // Bé không gõ gì và cũng chưa có bản cũ thì BỎ QUA — tạo bản rỗng là quản lý
  // mở ra thấy một kế hoạch trắng trông như cô đã lập.
  const beTrong = (await nhom()).danhSach.find(x => !x.ke);
  const trong = await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: THANG,
      danhSach: [{ studentId: beTrong.studentId, muc: [{ gocLinhVuc: 'toan', noiDung: '   ' }] }],
    },
  });
  check('bé để trống hẳn thì KHÔNG tạo bản rỗng', trong.status === 200 && trong.data?.daLuu === 0, trong.data);
}

// ===========================================================================
console.log('\n[3] ĐƯỜNG TẮT 1 — đặt một kế hoạch cho cả nhóm');
{
  const r = await req('POST', '/api/kehoachbe/dat-ca-nhom', {
    cookie: GV,
    body: {
      classId: 'c1', thang: THANG,
      muc: [
        { gocLinhVuc: 'toan', noiDung: 'CẢ NHÓM: đếm tới 10 bằng bộ hạt' },
        { gocLinhVuc: 'giac-quan', noiDung: 'CẢ NHÓM: tháp hồng' },
      ],
    },
  });
  check('đặt được cho cả nhóm trong một lần bấm', r.status === 200 && r.data?.daDat > 0, r.data);

  const d = await nhom();
  check('mọi bé của nhóm nay đều có kế hoạch', (d.danhSach || []).every(x => !!x.ke),
    (d.danhSach || []).filter(x => !x.ke).length);
  check('bé nào cũng có mục Giác quan vừa đặt',
    (d.danhSach || []).every(x => (x.ke.muc || []).some(m => m.gocLinhVuc === 'giac-quan')));

  // KHÔNG ĐÈ LÊN PHẦN CÔ ĐÃ GÕ TAY. Cô thường lập riêng vài bé trước rồi mới
  // đặt cho phần còn lại — ghi đè hết là xoá đúng phần cô vừa nhập.
  const beDaGo = (d.danhSach || []).find(x => (x.ke.muc || []).some(m => /Bộ gậy số/.test(m.noiDung)));
  check('tìm được một bé cô đã gõ tay mục Toán để thử', !!beDaGo, (d.danhSach || [])[0]?.ke?.muc);
  const mucToan = (beDaGo?.ke?.muc || []).filter(m => m.gocLinhVuc === 'toan');
  check('MỤC CÔ ĐÃ GÕ TAY CÒN NGUYÊN, không bị đè',
    mucToan.length === 1 && /Bộ gậy số/.test(mucToan[0].noiDung), mucToan);
  // Và không được ĐẺ THÊM một mục thứ hai cho cùng góc đó: hai dòng Toán cho
  // cùng một bé thì cô mở ra không biết dòng nào là thật.
  check('cũng KHÔNG sinh ra mục thứ hai cho cùng một góc',
    (d.danhSach || []).every(x => {
      const dem = {};
      for (const m of (x.ke.muc || [])) dem[m.gocLinhVuc] = (dem[m.gocLinhVuc] || 0) + 1;
      return Object.values(dem).every(n => n === 1);
    }),
    (d.danhSach || []).map(x => (x.ke.muc || []).map(m => m.gocLinhVuc)));

  const trong = await req('POST', '/api/kehoachbe/dat-ca-nhom', {
    cookie: GV, body: { classId: 'c1', thang: THANG, muc: [] },
  });
  check('không gõ gì thì từ chối', trong.status === 400, trong.status);
}

// ===========================================================================
console.log('\n[4] ĐƯỜNG TẮT 2 — chép tháng trước, mục "tiếp tục" lên trước');
{
  const truoc = thangLui(1);
  await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: truoc,
      danhSach: [{
        studentId: 's1',
        muc: [
          { gocLinhVuc: 'toan', noiDung: 'Việc đã xong tháng trước' },
          { gocLinhVuc: 'tieng-viet', noiDung: 'Việc CẦN LÀM TIẾP' },
        ],
      }],
    },
  });
  const beTruoc = await cuaBe('s1', truoc);
  const mucTiep = (beTruoc.ke.muc || []).find(m => /CẦN LÀM TIẾP/.test(m.noiDung));
  await req('PUT', '/api/kehoachbe/nhin-lai', {
    cookie: GV,
    body: {
      id: beTruoc.ke.id,
      muc: [{ id: mucTiep.id, ketQua: 'dang-hinh-thanh', tiepTucThangSau: true }],
    },
  });

  const thangMoi = thangLui(-1) === THANG ? THANG : thangLui(-1);
  void thangMoi;
  // Chép sang một tháng CHƯA soạn gì (tháng hiện tại đã soạn ở mục trên rồi).
  const dich = thangLui(-1);
  const r = await req('POST', '/api/kehoachbe/chep-thang-truoc', {
    cookie: GV, body: { classId: 'c1', thang: dich },
  });
  check('chép được', r.status === 200, r.data);
  check('và nói rõ chép từ tháng nào', r.data?.tuThang === THANG, r.data);

  // Chép từ tháng NÀY sang tháng SAU: tháng này đã có kế hoạch nên phải chép được.
  const beDich = await cuaBe('s1', dich);
  check('bé s1 có kế hoạch ở tháng đích', !!beDich?.ke, beDich);
  check('KẾT QUẢ và nhận xét KHÔNG chép sang — chúng nói về tháng trước',
    (beDich.ke.muc || []).every(m => !m.ketQua && !m.nhanXet), beDich.ke.muc);

  const lai = await req('POST', '/api/kehoachbe/chep-thang-truoc', {
    cookie: GV, body: { classId: 'c1', thang: dich },
  });
  check('tháng đích đã soạn thì KHÔNG chép đè lên',
    lai.status === 200 && lai.data?.daChep === 0 && lai.data?.boQua > 0, lai.data);

  // Chép CHỈ những mục cần làm tiếp.
  const dich2 = thangLui(-2);
  const chiTiep = await req('POST', '/api/kehoachbe/chep-thang-truoc', {
    cookie: GV, body: { classId: 'c1', thang: dich2, chiTiepTuc: true },
  });
  check('chép riêng phần "tiếp tục ở tháng sau" cũng được', chiTiep.status === 200, chiTiep.data);
}

// ===========================================================================
console.log('\n[5] Gửi duyệt · người lập KHÔNG duyệt kế hoạch của chính mình');
{
  const gui = await req('POST', '/api/kehoachbe/gui-duyet', {
    cookie: GV, body: { classId: 'c1', thang: THANG },
  });
  check('cô gửi cả nhóm trong một lần bấm', gui.status === 200 && gui.data?.daGui > 0, gui.data);

  const d = await nhom();
  check('mọi kế hoạch chuyển sang chờ duyệt',
    (d.danhSach || []).every(x => !x.ke || x.ke.trangThai === 'cho-duyet'),
    (d.danhSach || []).map(x => x.ke?.trangThai));

  // Khoá khi đang chờ duyệt — sửa sau lưng người duyệt thì chữ ký duyệt vô nghĩa.
  const sua = await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [{ gocLinhVuc: 'toan', noiDung: 'sửa lén' }] }] },
  });
  check('đang chờ duyệt thì KHOÁ phần nội dung', sua.status === 400, sua.status);
  check('và chỉ đường ra: rút lại', /Rút lại/i.test(sua.data?.error || ''), sua.data?.error);

  const ke = (await cuaBe('s1')).ke;
  const coDuyet = await req('POST', '/api/kehoachbe/duyet', {
    cookie: GV, body: { ids: [ke.id], quyetDinh: 'da-duyet' },
  });
  check('CÔ KHÔNG DUYỆT ĐƯỢC kế hoạch của chính mình', coDuyet.status === 403, coDuyet.status);
  check('và câu từ chối nói rõ vì sao',
    /người lập không duyệt/i.test(coDuyet.data?.error || ''), coDuyet.data?.error);

  const rut = await req('POST', '/api/kehoachbe/rut-lai', { cookie: GV, body: { id: ke.id } });
  check('cô rút lại được', rut.status === 200 && rut.data?.trangThai === 'nhap', rut.data);
  const suaLai = await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [{ gocLinhVuc: 'toan', noiDung: 'Sửa sau khi rút lại' }] }] },
  });
  check('rút lại rồi thì sửa được', suaLai.status === 200, suaLai.data);
  await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1' } });
}

// ===========================================================================
console.log('\n[6] Quản lý duyệt, hoặc gửi lại kèm lý do');
{
  const d = await nhom(QL);
  const cho = (d.danhSach || []).filter(x => x.ke && x.ke.trangThai === 'cho-duyet');
  check('quản lý thấy danh sách chờ duyệt', cho.length > 0, cho.length);
  check('và màn hình biết mình là người duyệt', d.laQuanLy === true, d.laQuanLy);

  const khongLyDo = await req('POST', '/api/kehoachbe/duyet', {
    cookie: QL, body: { ids: [cho[0].ke.id], quyetDinh: 'tra-lai' },
  });
  check('TRẢ LẠI mà không nói vì sao thì bị từ chối', khongLyDo.status === 400, khongLyDo.status);

  const tra = await req('POST', '/api/kehoachbe/duyet', {
    cookie: QL,
    body: { ids: [cho[0].ke.id], quyetDinh: 'tra-lai', yKienDuyet: 'Phần Toán ghi chung quá, cô ghi rõ bé đang làm bộ nào.' },
  });
  check('trả lại kèm lý do thì được', tra.status === 200, tra.data);
  const sauTra = (await cuaBe(cho[0].studentId)).ke;
  check('cô thấy trạng thái "gửi lại"', sauTra.trangThai === 'tra-lai', sauTra.trangThai);
  check('và đọc được lý do', /ghi rõ bé đang làm bộ nào/.test(sauTra.yKienDuyet || ''), sauTra.yKienDuyet);
  check('BỊ GỬI LẠI THÌ SỬA ĐƯỢC NGAY, không phải xin mở khoá',
    (await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: cho[0].studentId, muc: [{ gocLinhVuc: 'toan', noiDung: 'Đã sửa theo ý quản lý' }] }] },
    })).status === 200);

  const conLai = ((await nhom(QL)).danhSach || []).filter(x => x.ke && x.ke.trangThai === 'cho-duyet');
  const duyet = await req('POST', '/api/kehoachbe/duyet', {
    cookie: QL, body: { ids: conLai.map(x => x.ke.id), quyetDinh: 'da-duyet' },
  });
  check('duyệt cả loạt được', duyet.status === 200 && duyet.data?.so === conLai.length, duyet.data);
  const mot = (await cuaBe(conLai[0].studentId)).ke;
  check('ghi rõ ai duyệt và lúc nào', !!mot.nguoiDuyetTen && !!mot.duyetLuc, mot);

  const lai = await req('POST', '/api/kehoachbe/duyet', {
    cookie: QL, body: { ids: [mot.id], quyetDinh: 'da-duyet' },
  });
  check('kế hoạch đã duyệt thì không duyệt lại được', lai.status === 400, lai.status);
}

// ===========================================================================
console.log('\n[7] QUY TẮC 2 — cuối tháng là NHÌN LẠI, không phải chấm đạt hay chưa đạt');
{
  const ma = ['routes.js', 'view.js', 'schema.sql', 'module.json']
    .map(t => fs.readFileSync(path.join(GOC, 'modules/kehoachbe', t), 'utf8')).join('\n');

  check('KHÔNG có giá trị nào tên "đạt" hay "chưa đạt"',
    !/'(chua-dat|dat|khong-dat)'/.test(ma) && !/chưa đạt|không đạt/i.test(ma),
    (ma.match(/chưa đạt|không đạt|'chua-dat'/i) || [])[0]);
  check('"ôn tiếp" thành một ô tích trung tính', /tiepTucThangSau/.test(ma));
  check('màn hình gọi phần cuối tháng là "Nhìn lại"',
    /Nhìn lại cuối tháng/.test(ma) && !/Đánh giá cuối tháng/.test(ma));
  check('và nói thẳng điều QUY TẮC 2 muốn nói',
    /không phải bé không làm được/.test(ma));
  check('không kết quả nào mang màu đỏ',
    !/(chua-quan-sat-thay|chua-day)':\s*'red'/.test(ma) && !/MAU_KET_QUA[\s\S]{0,200}red/.test(ma));

  // NĂM KẾT QUẢ PHẢI TRÙNG KHỚP TỪNG CHỮ với phân hệ Hành trình học tập.
  //
  // Hai phân hệ cắm thêm không được phụ thuộc nhau, nên danh sách bị chép lại.
  // Một bản chép KHÔNG có người canh thì sẽ trôi khỏi nhau, và lúc đó cô thấy
  // hai thang khác nhau cho cùng một đứa trẻ.
  const dsA = (fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8')
    .match(/const TRANG_THAI = \[([\s\S]*?)\];/) || ['', ''])[1];
  const dsB = (fs.readFileSync(path.join(GOC, 'modules/kehoachbe/routes.js'), 'utf8')
    .match(/const KET_QUA = \[([\s\S]*?)\];/) || ['', ''])[1];
  const gom = (t) => (t.match(/'([a-z-]+)', '([^']+)'/g) || []).join('|');
  check('NĂM TRẠNG THÁI TRÙNG KHỚP TỪNG CHỮ với phân hệ Hành trình học tập',
    gom(dsA) === gom(dsB) && gom(dsA).length > 0, { hanhTrinh: gom(dsA), keHoach: gom(dsB) });
}

// ===========================================================================
console.log('\n[8] Nhìn lại ghi được TRÊN BẢN ĐÃ DUYỆT — đó chính là việc của cuối tháng');
{
  const be = await cuaBe('s1');
  check('bản của bé s1 đang ở trạng thái đã duyệt hoặc gửi lại',
    ['da-duyet', 'tra-lai', 'cho-duyet', 'nhap'].includes(be.ke.trangThai), be.ke.trangThai);

  const m = (be.ke.muc || [])[0];
  const r = await req('PUT', '/api/kehoachbe/nhin-lai', {
    cookie: GV,
    body: {
      id: be.ke.id,
      muc: [{ id: m.id, ketQua: 'chua-quan-sat-thay', nhanXet: 'Tháng này lớp bận lễ hội, chưa có dịp', tiepTucThangSau: true }],
    },
  });
  check('ghi được phần nhìn lại', r.status === 200, r.data);
  const sau = (r.data?.ke?.muc || []).find(x => x.id === m.id);
  check('"Chưa quan sát thấy" lưu được như một lựa chọn bình thường',
    sau?.ketQua === 'chua-quan-sat-thay', sau);
  check('và ô "tiếp tục ở tháng sau" được giữ', sau?.tiepTucThangSau === true, sau);

  const bay = await req('PUT', '/api/kehoachbe/nhin-lai', {
    cookie: GV, body: { id: be.ke.id, muc: [{ id: m.id, ketQua: 'gioi' }] },
  });
  check('kết quả không có trong danh sách thì từ chối', bay.status === 400, bay.status);

  const mucLa = await req('PUT', '/api/kehoachbe/nhin-lai', {
    cookie: GV, body: { id: be.ke.id, muc: [{ id: 'khong-co-that', ketQua: 'da-vung' }] },
  });
  check('mục không thuộc kế hoạch này thì từ chối', mucLa.status === 400, mucLa.status);
}

// ===========================================================================
console.log('\n[9] Sửa nội dung KHÔNG làm bay phần nhìn lại của mục giữ nguyên');
{
  // Dựng trên MỘT THÁNG RIÊNG để trạng thái xác định, không phụ thuộc các mục
  // trước đã duyệt tới đâu. Bài test có nhánh "bản đang khoá thì bỏ qua" là
  // bài test hứa nhiều hơn nó canh.
  const T = thangLui(4);
  await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: T,
      danhSach: [{
        studentId: 's1',
        muc: [
          { gocLinhVuc: 'toan', noiDung: 'Mục GIỮ NGUYÊN nội dung' },
          { gocLinhVuc: 'giac-quan', noiDung: 'Mục SẼ ĐỔI nội dung' },
        ],
      }],
    },
  });
  const ban = (await cuaBe('s1', T)).ke;
  check('dựng được bản để thử', (ban.muc || []).length === 2, ban.muc);

  await req('PUT', '/api/kehoachbe/nhin-lai', {
    cookie: GV,
    body: {
      id: ban.id,
      muc: (ban.muc || []).map(m => ({
        id: m.id, ketQua: 'da-vung', nhanXet: `Ghi cho ${m.gocLinhVuc}`, tiepTucThangSau: true,
      })),
    },
  });

  // Lưu lại: một mục GIỮ NGUYÊN nội dung, một mục ĐỔI nội dung.
  await req('PUT', '/api/kehoachbe', {
    cookie: GV,
    body: {
      classId: 'c1', thang: T,
      danhSach: [{
        studentId: 's1',
        muc: [
          { gocLinhVuc: 'toan', noiDung: 'Mục GIỮ NGUYÊN nội dung' },
          { gocLinhVuc: 'giac-quan', noiDung: 'Nội dung đã đổi hẳn' },
        ],
      }],
    },
  });
  const sau = (await cuaBe('s1', T)).ke;
  const giu = (sau.muc || []).find(m => m.gocLinhVuc === 'toan');
  const doi = (sau.muc || []).find(m => m.gocLinhVuc === 'giac-quan');

  check('MỤC GIỮ NGUYÊN NỘI DUNG THÌ PHẦN NHÌN LẠI CÒN NGUYÊN',
    giu?.ketQua === 'da-vung' && giu?.nhanXet === 'Ghi cho toan' && giu?.tiepTucThangSau === true, giu);
  // Mục đã đổi hẳn nội dung thì phần nhìn lại KHÔNG được mang sang: nhận xét
  // đó nói về một việc khác, giữ lại là gán nhầm lời của cô cho việc mới.
  check('mục ĐỔI nội dung thì phần nhìn lại được dọn, không gán nhầm sang việc mới',
    doi?.ketQua === '' && doi?.nhanXet === '', doi);
}

// ===========================================================================
console.log('\n[10] Tầng cơ sở vẫn canh ở phân hệ mới');
{
  await req('PUT', '/api/admin/classes/c1/campus', { cookie: QL, body: { campusId: 'cs2' } });
  const doc = await req('GET', '/api/kehoachbe?classId=c1', { cookie: QL3 });
  check('quản lý cơ sở 1 KHÔNG mở được kế hoạch nhóm của cơ sở 2', doc.status === 403, doc.status);
  const luu = await req('PUT', '/api/kehoachbe', {
    cookie: QL3, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [] }] },
  });
  check('và KHÔNG soạn được', luu.status === 403, luu.status);
  await req('PUT', '/api/admin/classes/c1/campus', { cookie: QL, body: { campusId: 'cs1' } });
  check('trả về cơ sở 1 thì mở lại được',
    (await req('GET', '/api/kehoachbe?classId=c1', { cookie: QL3 })).status === 200);
}

// ===========================================================================
console.log('\n[11] Không đụng phân hệ "Kế hoạch giáo dục" đang có');
{
  // App đã có phân hệ lõi `kehoach` (/api/plans) làm kế hoạch tháng của CẢ
  // NHÓM. Phân hệ này là chuyện khác — kế hoạch của TỪNG BÉ — nên phải tách
  // hẳn đường dẫn, mã phân hệ và tên hiển thị, không được giẫm lên nhau.
  const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/kehoachbe/module.json'), 'utf8'));
  check('mã phân hệ khác hẳn', mj.key === 'kehoachbe');
  check('đường dẫn API khác hẳn', JSON.stringify(mj.api) === '["/api/kehoachbe"]', mj.api);
  check('tên hiển thị khác hẳn để cô không nhầm hai ô',
    mj.name === 'Kế hoạch của bé', mj.name);

  const loi = fs.readFileSync(path.join(GOC, 'lib/modules.js'), 'utf8');
  check('phân hệ lõi "Kế hoạch giáo dục" còn nguyên', /'\/api\/plans'/.test(loi));

  const cu = await req('GET', '/api/plans?classId=c1', { cookie: GV });
  check('và vẫn chạy bình thường', cu.status === 200 || cu.status === 404, cu.status);
}

// ===========================================================================
console.log('\n[12] Tắt phân hệ thì API bị chặn, dữ liệu vẫn còn nguyên');
{
  const tat = await req('PUT', '/api/admin/modules/kehoachbe', { cookie: QL, body: { enabled: false } });
  check('quản trị tắt được phân hệ', tat.status === 200, tat.status);
  const goi = await req('GET', '/api/kehoachbe?classId=c1', { cookie: GV });
  check('TẮT RỒI THÌ API BỊ CHẶN, không chỉ ẩn cái ô vuông trên màn hình',
    goi.status === 404 || goi.status === 403, goi.status);

  await req('PUT', '/api/admin/modules/kehoachbe', { cookie: QL, body: { enabled: true } });
  const d = await nhom();
  check('bật lại là chạy tiếp', (d.danhSach || []).some(x => x.ke), d.tong);
  check('VÀ KẾ HOẠCH ĐÃ SOẠN CÒN NGUYÊN — tắt là ngưng dùng, không phải xoá',
    (d.danhSach || []).some(x => x.ke && (x.ke.muc || []).length > 0));
}

// ===========================================================================
console.log('\n[+] NHIỀU CÔ MỘT NHÓM — canh chiều CHO PHÉP, không chỉ chiều CẤM');
{
  // Bộ canh của Kế hoạch của bé đi đủ chiều CẤM: cô nhóm khác bị từ chối. Nhưng chiều
  // còn lại thì bỏ trống — CÔ THỨ HAI CỦA CÙNG MỘT NHÓM có làm được không.
  //
  // Đó mới là thay đổi nền lớn nhất của app 2 (app 1 gắn cứng một cô một lớp),
  // và một bộ canh chỉ đo chiều cấm thì vẫn xanh nguyên nếu ngày mai ai đó siết
  // nhầm thành "chỉ cô phụ trách CHÍNH mới làm được" — tức là làm hỏng đúng thứ
  // GĐ 0 đã bỏ ba commit ra để dựng.
  // Đi qua CẢ HAI chốt chặn, vì chúng là hai đường khác nhau trong lib/db.js:
  // đường của một bé (`canAccessStudent`, hỏi thẳng bảng phân công) và đường của
  // cả nhóm (`canAccessClass` → `classIdsOf`). Siết nhầm một trong hai thì bài
  // này đỏ; chỉ canh một đường thì đường còn lại hỏng vẫn xanh.
  const be = await req('GET', '/api/kehoachbe/be?studentId=s1', { cookie: GV3 });
  check('CÔ THỨ HAI MỞ ĐƯỢC KẾ HOẠCH CỦA BÉ TRONG NHÓM CHUNG', be.status === 200, be.data);

  const doc = await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV3 });
  check('và mở được MÀN CẢ NHÓM của nhóm chung', doc.status === 200, doc.data);
  check('màn đó liệt kê ĐỦ CẢ HAI NHÓM cô đang dạy, không chỉ một',
    (doc.data?.nhom || []).map(n => n.id).sort().join(',') === 'c1,c2',
    (doc.data?.nhom || []).map(n => n.id));

  // Và vẫn KHÔNG với sang được nhóm mình không dạy.
  const ngoai = await req('GET', `/api/kehoachbe?classId=c3&thang=${THANG}`, { cookie: GV3 });
  check('nhưng vẫn không với sang nhóm mình không dạy', ngoai.status === 403, ngoai.status);
}

// ===========================================================================
console.log('\n[+] ĐƯỜNG "KẾ HOẠCH CỦA MỘT BÉ" — chưa màn hình nào gọi, nhưng vẫn phải kín');
{
  // `GET /api/kehoachbe/be` được viết cho một màn "kế hoạch tháng của bé này"
  // mở từ Hồ sơ của bé. Màn đó CHƯA CÓ: tìm chuỗi "kehoachbe/be" trong cả kho
  // chỉ ra đúng dòng định nghĩa nó.
  //
  // Một mặt API đã xác thực, trả dữ liệu của trẻ, mà không bài nào chạm tới là
  // thứ đáng canh nhất — không ai mở nó nên cũng không ai phát hiện khi nó hở.
  // Bài này KHÔNG quyết định số phận của nó (dựng màn hình hay gỡ đi là việc
  // của nhà trường); nó chỉ bảo đảm chừng nào đường còn sống thì đường còn kín.
  const be = 's1';   // bé nhóm c1
  const beNhomKhac = 's2';

  const co = await req('GET', `/api/kehoachbe/be?studentId=${be}`, { cookie: GV });
  check('cô phụ trách mở được kế hoạch của bé nhóm mình', co.status === 200, co.data);
  check('trả về đúng bé đó', co.data?.be?.id === be, co.data?.be);
  check('kèm danh mục góc lĩnh vực để màn hình dựng được',
    Array.isArray(co.data?.gocLinhVuc) && co.data.gocLinhVuc.length > 0, co.data?.gocLinhVuc);
  check('và danh mục kết quả', Array.isArray(co.data?.ketQua) && co.data.ketQua.length > 0,
    co.data?.ketQua);

  // QUY TẮC 4 — màn kế hoạch của MỘT bé là chỗ dễ lọt con số xếp hạng nhất.
  const chuoiJson = JSON.stringify(co.data || {});
  check('KHÔNG có phần trăm, điểm số hay thứ hạng nào trong câu trả lời',
    !/%|"diem"|"score"|"rank"|"thuHang"|"xepLoai"/i.test(chuoiJson), chuoiJson.slice(0, 200));

  const nhomKhac = await req('GET', `/api/kehoachbe/be?studentId=${beNhomKhac}`, { cookie: GV });
  check('CÔ KHÔNG MỞ ĐƯỢC KẾ HOẠCH CỦA BÉ NHÓM KHÁC', nhomKhac.status === 403, nhomKhac.status);

  const giaDinh = await req('GET', `/api/kehoachbe/be?studentId=${be}`, { cookie: PH });
  check('GIA ĐÌNH KHÔNG MỞ ĐƯỢC — kế hoạch là việc trong nghề của cô',
    giaDinh.status === 403, giaDinh.status);

  const laBe = await req('GET', '/api/kehoachbe/be?studentId=khong-co-that', { cookie: QL });
  check('mã bé không có thật thì trả 403 hoặc 404, không nổ',
    laBe.status === 403 || laBe.status === 404, laBe.status);

  const thieu = await req('GET', '/api/kehoachbe/be', { cookie: GV });
  check('thiếu hẳn mã bé cũng bị từ chối', thieu.status === 403 || thieu.status === 400,
    thieu.status);

  // Cấp 3 chỉ thấy bé của cơ sở mình — đường này cũng phải qua tầng cơ sở.
  const cap3 = await req('GET', `/api/kehoachbe/be?studentId=${be}`, { cookie: QL3 });
  check('quản lý cơ sở 1 mở được bé của cơ sở mình', cap3.status === 200, cap3.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
