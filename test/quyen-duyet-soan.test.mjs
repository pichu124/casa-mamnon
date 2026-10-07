// Bài canh TÁCH QUYỀN DUYỆT BÁO CÁO và QUYỀN SOẠN KẾ HOẠCH CHUNG
// (Đ198 — việc 40, 42).
//
// Chạy bằng:  npm run test:quyen-duyet-soan
//
// HAI VIỆC NÀY ĐỀU LÀ LẤY ĐI MỘT THỨ ĐANG CHẠY, nên bài canh phải đo cả hai
// chiều: chiều CẤM (người vừa mất quyền thì thôi làm được) và chiều CHO PHÉP
// (người đáng ra phải làm được thì VẪN làm được, và phần việc còn lại của
// người vừa mất quyền KHÔNG hề sứt mẻ).
//
// Chiều thứ hai quan trọng hơn. Một chức vụ bị siết tới mức không làm nổi việc
// của mình thì trường quay lại dùng chung tài khoản, và cả đợt siết thành vô
// nghĩa — bài học đã ghi ở Đ168.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, khoaVaoCoSo, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('quyen-duyet-soan');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng M', 'm_qt');
const mkQL = taoQuanTri(DIR, 'Quản Lý Cơ Sở M', 'm_ql');
const mkVP = taoQuanTri(DIR, 'Văn Phòng M', 'm_vp');
datChucVu(DIR, 'm_ql', 'quanly-coso');
khoaVaoCoSo(DIR, 'm_ql', 'cs1');
datChucVu(DIR, 'm_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 'm_vp', 'cs1');
batPhanHe(DIR, ['baocaohoctap']);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4821), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const QT = await vao('m_qt', mkQT);
  const QL = await vao('m_ql', mkQL);
  const VP = await vao('m_vp', mkVP);
  const GV = (await login('giaovien', '123456')).cookie;

  const namNay = new Date().getUTCFullYear();
  const thangNay = new Date().getUTCMonth() + 1;
  const keHopLe = {
    theme: 'Chủ đề của tháng', goals: ['Mục tiêu 1'],
    weeks: [{ week: 1, focus: 'Trọng tâm', activities: 'Hoạt động' }],
  };

  // =========================================================================
  console.log('\n[1] VIỆC 42 — kế hoạch CẢ NHÓM nay do văn phòng soạn');
  {
    const co = await req('PUT', `/api/plans/c1/${namNay}/${thangNay}`, { cookie: GV, body: keHopLe });
    check('CÔ THÔI SOẠN ĐƯỢC KẾ HOẠCH CẢ NHÓM — kể cả nhóm của chính cô',
      co.status === 403, co.status);
    check('và câu từ chối NÓI RA chỗ cô vẫn làm được, không cụt lủn',
      /từng bé/.test(co.data?.error || ''), co.data?.error);

    const vp = await req('PUT', `/api/plans/c1/${namNay}/${thangNay}`, { cookie: VP, body: keHopLe });
    check('VĂN PHÒNG SOẠN ĐƯỢC — đúng người trường giao việc', vp.status === 200, vp.status);

    // CHIỀU CHO PHÉP, VẾ QUAN TRỌNG NHẤT: cô KHÔNG mất chỗ nào để soạn cho bé.
    const doc = await req('GET', '/api/plans?classId=c1', { cookie: GV });
    check('CÔ VẪN ĐỌC ĐƯỢC kế hoạch của nhóm mình — chỉ thôi SOẠN, không thôi XEM',
      doc.status === 200, doc.status);

    // Và phân hệ Kế hoạch của BÉ vẫn là của cô — trường chỉ chuyển phần cả nhóm.
    const ma = fs.readFileSync(path.join(GOC, 'modules/kehoachbe/routes.js'), 'utf8');
    check('KẾ HOẠCH CỦA TỪNG BÉ VẪN MỞ CHO VAI CÔ — không siết lây sang đó',
      /requireRole\('teacher', 'admin'\)/.test(ma));
  }

  // =========================================================================
  console.log('\n[2] VIỆC 40 — duyệt báo cáo là việc của quản lý cơ sở, không phải văn phòng');
  {
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'thang', ten: 'Báo cáo tháng thử', tuThang: 0, denThang: 72,
      dong: [{ nhom: 'I', tieuDe: 'Lưu ý', kieu: 'chu' }] } });
    check('nhà trường dựng được mẫu', mau.status === 200, mau.status);

    const ban = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId: 's1', mauId: mau.data.mau.id, tuNgay: '2026-09-01', denNgay: '2026-09-30' } });
    check('cô mở được bản báo cáo', ban.status === 201 || ban.status === 200, ban.status);
    const id = ban.data?.ban?.id || ban.data?.id;
    // Bản rỗng thì máy chủ không cho gửi ("Báo cáo chưa có nội dung nào") — nên
    // điền một ô trước. Không điền thì mọi phép kiểm dưới dừng ở câu ấy và
    // không câu nào còn đo được điều nó định đo.
    const chiTiet = await req('GET', `/api/baocaohoctap/ban/${id}`, { cookie: GV });
    const dongDau = (chiTiet.data?.ban?.dong || [])[0];
    check('đối chứng — bản mở ra có dòng để điền', !!dongDau, (chiTiet.data?.ban?.dong || []).length);
    await req('PUT', `/api/baocaohoctap/ban/${id}`, {
      cookie: GV, body: { o: [{ dongId: dongDau.id, chu: 'Con chào cô mỗi sáng, tự cất giày lên kệ.' }] },
    });
    const gui = await req('POST', `/api/baocaohoctap/ban/${id}/gui`, { cookie: GV, body: {} });
    check('cô gửi được bản chờ duyệt', gui.status === 200, `${gui.status} ${JSON.stringify(gui.data).slice(0, 120)}`);

    // VĂN PHÒNG BỊ CHẶN Ở HAI LỚP, VÀ PHẢI NÓI ĐÚNG LỚP NÀO ĐANG CHẶN.
    //
    // Bản đầu của mục này chỉ đo mã 403 rồi kết luận "chốt mới chạy" — SAI, và
    // chính bài canh này bắt được: `/api/baocaohoctap` KHÔNG nằm trong danh
    // sách trắng API của chức vụ văn phòng cơ sở (`lib/db.js`), nên họ đã bị
    // chặn từ lớp ĐÓ, trước khi chạm tới chốt mới. Phép kiểm ấy xanh cả khi
    // chốt mới không tồn tại — tức nó không đo gì cả.
    //
    // Nên ở đây tách bạch: đo lớp thứ nhất bằng hành vi (văn phòng không vào
    // nổi phân hệ), và đo lớp thứ hai — chốt chức vụ — bằng chính `lib/db.js`
    // ở mục [3]. Hai lớp đều thật, và chốt thứ hai là lớp phòng thủ cho ngày
    // ai đó mở danh sách trắng ra.
    const vpXem = await req('GET', `/api/baocaohoctap/ban/${id}`, { cookie: VP });
    check('VĂN PHÒNG KHÔNG VÀO NỔI PHÂN HỆ BÁO CÁO — chặn ngay ở danh sách trắng API',
      vpXem.status === 403 || vpXem.status === 404, vpXem.status);
    const vpDuyet = await req('POST', `/api/baocaohoctap/ban/${id}/duyet`, {
      cookie: VP, body: { quyetDinh: 'da-duyet' },
    });
    check('nên đường duyệt của họ cũng không tới được', vpDuyet.status === 403 || vpDuyet.status === 404,
      vpDuyet.status);

    const qlDuyet = await req('POST', `/api/baocaohoctap/ban/${id}/duyet`, {
      cookie: QL, body: { quyetDinh: 'da-duyet', ngayCongBo: '2026-10-01' },
    });
    check('QUẢN LÝ CƠ SỞ DUYỆT ĐƯỢC — đúng người trường giao',
      qlDuyet.status === 200, `${qlDuyet.status} ${JSON.stringify(qlDuyet.data).slice(0, 120)}`);
  }

  // =========================================================================
  console.log('\n[3] LUẬT NẰM Ở MỘT CHỖ, cạnh ba luật cùng khuôn');
  {
    // Ba chốt chức vụ trước (Đ156, Đ163a, Đ168) đều là một hằng số + một hàm
    // trong lib/db.js. Chốt thứ tư phải nằm cùng chỗ, không rải ra một nơi
    // khác — ba luật "ai được làm việc gì" nằm ba nơi là ba nơi sẽ trôi.
    const ma = fs.readFileSync(path.join(GOC, 'lib/db.js'), 'utf8');
    for (const ten of ['datNepDuoc', 'taoKhoanThuDuoc', 'suaHoSoBeDuoc', 'duyetBaoCaoDuoc']) {
      check(`${ten} nằm trong lib/db.js`, new RegExp(`function ${ten}\\(`).test(ma));
    }
    const khoi = (ma.match(/const CHUC_VU_DUYET_BAO_CAO = \[([^\]]*)\]/) || [])[1] || '';
    check('duyệt báo cáo mở cho quản lý cơ sở và ban giám hiệu',
      /quanly-coso/.test(khoi) && /hieu-truong/.test(khoi), khoi.trim());
    check('và KHÔNG mở cho văn phòng cơ sở', !/vanphong/.test(khoi), khoi.trim());

    // GIỮ NGUYÊN CHO NGƯỜI CHƯA KHAI CHỨC VỤ — y nếp ba hàm kia. Trường vừa
    // cài xong chỉ có một tài khoản quản trị và chưa phân vai ai cả; siết ngay
    // lúc đó là không ai duyệt được bản báo cáo đầu tiên.
    const than = (ma.match(/function duyetBaoCaoDuoc\(user\) \{([\s\S]*?)\n\}/) || [])[1] || '';
    check('CHƯA KHAI CHỨC VỤ THÌ VẪN DUYỆT ĐƯỢC — trường mới cài không bị kẹt',
      /cv === null/.test(than), than.trim().slice(0, 120));

    // VÀ ĐƯỜNG DUYỆT PHẢI THẬT SỰ GỌI CHỐT ẤY. Một hằng số đúng mà không đường
    // nào hỏi tới nó thì vẫn là một chốt giả — cùng bài học với trần số tin
    // gửi đồng thời ở Đ194.
    const bc = fs.readFileSync(path.join(GOC, 'modules/baocaohoctap/routes.js'), 'utf8');
    const batDau = bc.indexOf("app.post('/api/baocaohoctap/ban/:id/duyet'");
    const ketThuc = bc.indexOf('app.post(', batDau + 10);
    const duong = batDau >= 0 ? bc.slice(batDau, ketThuc > batDau ? ketThuc : batDau + 1500) : '';
    check('đối chứng — đọc được thân đường duyệt', duong.length > 0, duong.length);
    check('ĐƯỜNG DUYỆT GỌI ĐÚNG CHỐT `db.duyetBaoCaoDuoc`',
      /db\.duyetBaoCaoDuoc\(req\.user\)/.test(duong), duong.slice(0, 200));
    check('và chốt ấy hỏi TRƯỚC khi đụng tới bản báo cáo',
      duong.indexOf('duyetBaoCaoDuoc') < duong.indexOf('canAccessStudent'),
      `${duong.indexOf('duyetBaoCaoDuoc')} / ${duong.indexOf('canAccessStudent')}`);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
