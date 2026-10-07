// Bài canh KẾ HOẠCH CỦA BÉ — đợt 2 theo phản hồi nhà trường 07/09.
//
// Chạy bằng:  npm run test:ke-hoach-bai-hoc
//
// BA ĐIỀU NHÀ TRƯỜNG NÓI, VÀ BA CHỖ ĐÁNG CANH
//
//   1. "Từ những tên bài học có sẵn, cô tích chọn bé sẽ học bài nào, cần ôn
//      tập thêm hay mở rộng thêm." → Danh mục nạp lười khi trống, văn phòng
//      soạn, cô chỉ tích. Mục [1] và [2]. Bản app cũ không gửi trường bài học
//      thì bài đã tích KHÔNG được bay — Nguyên tắc số 1.
//
//   2. "Khi có điều chỉnh khác lộ trình ban đầu thì có quyền đề xuất sửa, ghi
//      rõ lý do rồi quản lý mới phê duyệt." → Kế hoạch đã duyệt thì cô không
//      sửa thẳng; đề xuất PHẢI có lý do; quản lý duyệt thì mở lại. Mục [5].
//
//   3. Nhìn lại từng bài ở HAI mức — chữ trung tính, và bài "Tiếp tục cùng
//      con" tự lên sẵn tháng sau. Mục [3] và [4]. Bài này soi cả câu trả lời
//      của máy chủ lẫn mã nguồn: không chữ nào của cặp từ đúng/sai lọt vào.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, HOM_NAY, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ke-hoach-bai-hoc');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'kbh_ht');
const mk2 = taoQuanTri(DIR, 'Quản lý CS2', 'kbh_cs2');
khoaVaoCoSo(DIR, 'kbh_cs2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4633), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const THANG = HOM_NAY().slice(0, 7);
function thangLui(n) {
  const [y, m] = THANG.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7);
}
const THANG_SAU = thangLui(-1);

const nhom = async (cookie, thang = THANG) =>
  (await req('GET', `/api/kehoachbe?classId=c1&thang=${thang}`, { cookie })).data;
const cuaBe = async (cookie, studentId, thang = THANG) =>
  ((await nhom(cookie, thang)).danhSach || []).find(x => x.studentId === studentId);

try {
  const QL = await vao('kbh_ht', mk1);
  const QL2 = await vao('kbh_cs2', mk2);
  const GV = (await login('giaovien', '123456')).cookie;     // cô nhóm c1
  const GV2 = (await login('giaovien2', '123456')).cookie;   // cô nhóm khác
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Danh mục bài học — nạp lười khi trống, văn phòng soạn, cô chỉ đọc');
  let baiTheoGoc = {};
  {
    const d = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    check('cô đọc được danh mục', d.status === 200 && Array.isArray(d.data.baiHoc), d.status);
    const goc = (d.data.gocLinhVuc || []).map(x => x.ma);
    // Đ195 (việc 22) thêm góc thứ bảy "Thể chất" — tách rõ đâu là chữ của
    // nhà trường, đâu là góc kho mã tự thêm, xem chú thích ở test:ke-hoach-be.
    check('sáu góc của nhà trường vẫn đứng đầu, đúng thứ tự cũ',
      goc.slice(0, 6).join(',') === 'toan,tieng-viet,cambridge,thuc-hanh-cuoc-song,giac-quan,van-hoa', goc);
    check('và góc thứ bảy là góc cho cô thể chất',
      goc.length === 7 && goc[6] === 'the-chat', goc);
    // BA TAB THEO CHƯƠNG TRÌNH (việc 22): gộp góc lại, KHÔNG thay góc.
    const tab = (d.data.chuongTrinhTab || []);
    check('máy chủ khai đủ ba tab chương trình', tab.length === 3, tab.map(t => t.ma));
    check('MỌI góc đều có đúng MỘT tab để đứng — không góc nào rơi ra ngoài',
      goc.every(g => tab.filter(t => (t.goc || []).some(x => x.ma === g)).length === 1),
      tab.map(t => `${t.ma}:${(t.goc || []).map(x => x.ma).join('+')}`).join(' | '));
    check('tab Cô nước ngoài đúng là góc Cambridge',
      ((tab.find(t => t.ma === 'nuoc-ngoai') || {}).goc || []).map(x => x.ma).join(',') === 'cambridge');
    check('và tab Cô thể chất KHÔNG rỗng — nếu rỗng thì việc trường giao cho cô ấy không tồn tại trong app',
      ((tab.find(t => t.ma === 'the-chat') || {}).goc || []).length > 0);
    for (const g of goc) baiTheoGoc[g] = (d.data.baiHoc || []).filter(b => b.gocLinhVuc === g);
    check('MỖI góc có sẵn từ 6 tới 12 bài theo tinh thần Montessori',
      goc.every(g => baiTheoGoc[g].length >= 6 && baiTheoGoc[g].length <= 12),
      goc.map(g => `${g}:${baiTheoGoc[g].length}`));
    check('ví dụ Thực hành cuộc sống có Rót nước, Giác quan có Tháp hồng',
      baiTheoGoc['thuc-hanh-cuoc-song'].some(b => b.ten === 'Rót nước') && baiTheoGoc['giac-quan'].some(b => b.ten === 'Tháp hồng'));
    check('ba nhãn đúng chữ nhà trường: học mới · ôn tập · mở rộng',
      (d.data.nhanBai || []).map(x => x.ma).join(',') === 'hoc-moi,on-tap,mo-rong', d.data.nhanBai);

    const lai = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    check('gọi lần hai KHÔNG nạp thêm lần nữa — cùng số bài',
      lai.data.baiHoc.length === d.data.baiHoc.length, [lai.data.baiHoc.length, d.data.baiHoc.length]);

    const coThem = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: GV, body: { gocLinhVuc: 'toan', ten: 'Bài cô tự thêm' } });
    check('CÔ KHÔNG thêm được bài — danh mục là việc của văn phòng', coThem.status === 403, coThem.status);
    const ph = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: PH });
    check('gia đình không đọc danh mục', ph.status === 403, ph.status);

    const them = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: 'Bảng nhân', moTa: 'Bảng nhân hạt cườm' } });
    check('quản lý thêm được bài', them.status === 200 && them.data.baiHoc && them.data.baiHoc.ten === 'Bảng nhân', them.data);
    const gocLa = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'the-duc', ten: 'x' } });
    check('góc lạ thì từ chối', gocLa.status === 400, gocLa.status);
    const thieuTen = await req('POST', '/api/kehoachbe/bai-hoc', { cookie: QL, body: { gocLinhVuc: 'toan', ten: '  ' } });
    check('thiếu tên thì từ chối', thieuTen.status === 400, thieuTen.status);

    const an = await req('PUT', `/api/kehoachbe/bai-hoc/${them.data.baiHoc.id}`, { cookie: QL, body: { active: false } });
    check('quản lý ẨN được bài (không có đường xoá)', an.status === 200 && an.data.baiHoc.active === false, an.data);
    const coSau = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    check('bài đã ẩn KHÔNG còn trong danh mục cô thấy', !(coSau.data.baiHoc || []).some(b => b.id === them.data.baiHoc.id));
    const qlTatCa = await req('GET', '/api/kehoachbe/bai-hoc?tatCa=1', { cookie: QL });
    check('nhưng quản lý xin cả bài ẩn thì vẫn thấy để bật lại',
      (qlTatCa.data.baiHoc || []).some(b => b.id === them.data.baiHoc.id && b.active === false));
    await req('PUT', `/api/kehoachbe/bai-hoc/${them.data.baiHoc.id}`, { cookie: QL, body: { active: true } });

    const man = await nhom(GV);
    check('màn chính của cô cũng mang danh mục để dựng ô tích',
      Array.isArray(man.baiHoc) && man.baiHoc.length > 0 && Array.isArray(man.ketLuanBai) && man.ketLuanBai.length === 2,
      [man.baiHoc && man.baiHoc.length, man.ketLuanBai]);
  }

  // =========================================================================
  console.log('\n[2] Cô TÍCH bài cho từng bé — ô chữ tự do thành tuỳ chọn');
  const thapHong = baiTheoGoc['giac-quan'].find(b => b.ten === 'Tháp hồng');
  const rotNuoc = baiTheoGoc['thuc-hanh-cuoc-song'].find(b => b.ten === 'Rót nước');
  const gayS = baiTheoGoc['toan'][0];
  {
    const r = await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: {
        classId: 'c1', thang: THANG,
        danhSach: [{
          studentId: 's1',
          muc: [],
          baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: rotNuoc.id, nhan: 'on-tap' }],
        }],
      },
    });
    check('chỉ tích bài, không gõ ô chữ nào, vẫn lập được kế hoạch', r.status === 200 && r.data.daLuu === 1, r.data);
    const be = await cuaBe(GV, 's1');
    check('kế hoạch của bé mang danh sách bài đã tích kèm tên và góc',
      be.ke && (be.ke.baiHoc || []).length === 2
        && be.ke.baiHoc.some(b => b.ten === 'Tháp hồng' && b.gocLinhVuc === 'giac-quan' && b.nhan === 'hoc-moi')
        && be.ke.baiHoc.some(b => b.ten === 'Rót nước' && b.nhan === 'on-tap'),
      be.ke && be.ke.baiHoc);

    const nhanLa = await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', baiHoc: [{ baiHocId: thapHong.id, nhan: 'gioi' }] }] },
    });
    check('nhãn ngoài ba chữ thì từ chối', nhanLa.status === 400, nhanLa.status);
    const baiLa = await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', baiHoc: [{ baiHocId: 'khong-co-that', nhan: 'hoc-moi' }] }] },
    });
    check('bài không có trong danh mục thì từ chối', baiLa.status === 400, baiLa.status);

    // BẢN APP CŨ: gửi mỗi ô chữ, KHÔNG có trường baiHoc → bài đã tích phải còn.
    const cu = await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }] }] },
    });
    const sauCu = await cuaBe(GV, 's1');
    check('bản app cũ không gửi trường bài học thì bài đã tích CÒN NGUYÊN',
      cu.status === 200 && (sauCu.ke.baiHoc || []).length === 2 && (sauCu.ke.muc || []).length === 1,
      [sauCu.ke.baiHoc.length, sauCu.ke.muc.length]);

    // Gửi mảng rỗng mới là bỏ tích hết.
    await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }], baiHoc: [] }] },
    });
    check('gửi mảng rỗng thì bỏ tích hết — hai chuyện khác nhau',
      ((await cuaBe(GV, 's1')).ke.baiHoc || []).length === 0);
    // Tích lại để các mục sau dùng.
    await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: {
        classId: 'c1', thang: THANG,
        danhSach: [{ studentId: 's1', muc: [{ gocLinhVuc: 'toan', noiDung: 'Đếm hạt tới 10' }],
          baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: rotNuoc.id, nhan: 'on-tap' }] }],
      },
    });

    // Đặt cả nhóm bằng bài: bé đã tích riêng thì giữ nhãn cô chọn.
    const caNhom = await req('POST', '/api/kehoachbe/dat-ca-nhom', {
      cookie: GV, body: { classId: 'c1', thang: THANG, muc: [], baiHoc: [{ baiHocId: rotNuoc.id, nhan: 'hoc-moi' }, { baiHocId: gayS.id, nhan: 'hoc-moi' }] },
    });
    check('đặt cả nhóm bằng bài tích được', caNhom.status === 200 && caNhom.data.daDat > 0, caNhom.data);
    const d = await nhom(GV);
    check('bé nào cũng có bài vừa đặt',
      (d.danhSach || []).every(x => x.ke && (x.ke.baiHoc || []).some(b => b.baiHocId === gayS.id)));
    const s1 = (d.danhSach || []).find(x => x.studentId === 's1');
    check('bé s1 đã tích Rót nước là ÔN TẬP thì giữ nguyên, không bị đè thành học mới',
      (s1.ke.baiHoc || []).filter(b => b.baiHocId === rotNuoc.id).length === 1
        && s1.ke.baiHoc.find(b => b.baiHocId === rotNuoc.id).nhan === 'on-tap', s1.ke.baiHoc);

    const co2 = await req('PUT', '/api/kehoachbe', {
      cookie: GV2, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }] },
    });
    check('cô nhóm khác không tích được cho bé nhóm này', co2.status === 403, co2.status);
  }

  // =========================================================================
  console.log('\n[3] Nhìn lại từng bài — HAI mức, chữ trung tính');
  let keS1;
  {
    await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1' } });
    keS1 = (await cuaBe(GV, 's1')).ke;
    const duyet = await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { ids: [keS1.id], quyetDinh: 'da-duyet' } });
    check('đối chứng — quản lý duyệt được kế hoạch của s1', duyet.status === 200, duyet.data);
    keS1 = (await cuaBe(GV, 's1')).ke;

    const bTH = keS1.baiHoc.find(b => b.baiHocId === thapHong.id);
    const bRN = keS1.baiHoc.find(b => b.baiHocId === rotNuoc.id);
    const r = await req('PUT', '/api/kehoachbe/nhin-lai', {
      cookie: GV,
      body: {
        id: keS1.id,
        baiHoc: [
          { id: bTH.id, ketQua: 'da-thay', nhanXet: 'Con xếp được năm khối' },
          { id: bRN.id, ketQua: 'tiep-tuc' },
        ],
      },
    });
    check('ghi được kết luận cho từng bài trên bản ĐÃ DUYỆT', r.status === 200, r.data);
    const sau = r.data.ke.baiHoc;
    check('bài "đã thấy" lưu đúng kèm ghi chú',
      sau.find(b => b.id === bTH.id).ketQua === 'da-thay' && /năm khối/.test(sau.find(b => b.id === bTH.id).nhanXet));
    check('bài "tiếp tục cùng con" lưu đúng, và TỰ là việc của tháng sau',
      sau.find(b => b.id === bRN.id).ketQua === 'tiep-tuc' && sau.find(b => b.id === bRN.id).tiepTucThangSau === true,
      sau.find(b => b.id === bRN.id));

    for (const xau of ['dat', 'chua-dat', 'khong-dat', 'gioi']) {
      const bay = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: keS1.id, baiHoc: [{ id: bTH.id, ketQua: xau }] } });
      check(`giá trị "${xau}" bị từ chối — chỉ nhận đúng hai mức`, bay.status === 400, bay.status);
    }
    const laBai = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: keS1.id, baiHoc: [{ id: 'khong-co', ketQua: 'da-thay' }] } });
    check('bài không thuộc kế hoạch thì từ chối', laBai.status === 400, laBai.status);

    // QUY TẮC 2 — soi cả câu trả lời máy chủ lẫn mã nguồn.
    const man = await nhom(GV);
    const chuoi = JSON.stringify(man);
    check('hai mức đúng chữ: "Đã thấy con làm được" và "Tiếp tục cùng con"',
      (man.ketLuanBai || []).map(x => x.ten).join('|') === 'Đã thấy con làm được|Tiếp tục cùng con', man.ketLuanBai);
    check('câu trả lời máy chủ không mang chữ nào của cặp từ đúng/sai, không phần trăm',
      !/chưa đạt|không đạt|"dat"|"chua-dat"|%/i.test(chuoi));
    const ma = ['routes.js', 'view.js', 'schema.sql'].map(t => fs.readFileSync(path.join(GOC, 'modules/kehoachbe', t), 'utf8')).join('\n');
    check('mã nguồn phân hệ có đúng hai mã mức cho bài, và không có mã nào của cặp từ kia',
      /'da-thay'/.test(ma) && /'tiep-tuc'/.test(ma) && !/'(dat|chua-dat|khong-dat)'/.test(ma));
    check('màn hình không tô đỏ, không tô cam mức "tiếp tục"',
      !/MAU_KET_LUAN[^}]*(red|orange)/.test(ma));
  }

  // =========================================================================
  console.log('\n[4] Gợi ý tháng sau — bài "tiếp tục cùng con" tự lên sẵn');
  {
    const gy = await req('GET', `/api/kehoachbe/goi-y?studentId=s1&thang=${THANG_SAU}`, { cookie: GV });
    check('đường gợi ý trả lời', gy.status === 200 && gy.data.tuThang === THANG, gy.data);
    check('gợi ý có Rót nước (tiếp tục), KHÔNG có Tháp hồng (đã thấy)',
      (gy.data.baiHoc || []).some(b => b.baiHocId === rotNuoc.id) && !(gy.data.baiHoc || []).some(b => b.baiHocId === thapHong.id),
      gy.data.baiHoc);
    const phGy = await req('GET', `/api/kehoachbe/goi-y?studentId=s1&thang=${THANG_SAU}`, { cookie: PH });
    check('gia đình không gọi được gợi ý', phGy.status === 403, phGy.status);
    const co2Gy = await req('GET', `/api/kehoachbe/goi-y?studentId=s1&thang=${THANG_SAU}`, { cookie: GV2 });
    check('cô nhóm khác cũng không', co2Gy.status === 403, co2Gy.status);

    const manSau = await nhom(GV, THANG_SAU);
    const s1Sau = (manSau.danhSach || []).find(x => x.studentId === 's1');
    check('màn tháng sau mang sẵn gợi ý cho bé chưa lập',
      !s1Sau.ke && s1Sau.goiY && (s1Sau.goiY.baiHoc || []).some(b => b.baiHocId === rotNuoc.id), s1Sau.goiY);

    // Chép tháng trước: bài tiếp tục lên trước, mang nhãn ôn tập, kết luận không chép.
    const chep = await req('POST', '/api/kehoachbe/chep-thang-truoc', { cookie: GV, body: { classId: 'c1', thang: THANG_SAU } });
    check('chép được sang tháng sau', chep.status === 200 && chep.data.daChep > 0, chep.data);
    const s1Chep = (await cuaBe(GV, 's1', THANG_SAU)).ke;
    check('bài tiếp tục đứng ĐẦU và thành ÔN TẬP; kết luận tháng trước KHÔNG chép sang',
      s1Chep.baiHoc[0].baiHocId === rotNuoc.id && s1Chep.baiHoc[0].nhan === 'on-tap'
        && s1Chep.baiHoc.every(b => b.ketQua === '' && b.nhanXet === ''), s1Chep.baiHoc);
    const manSau2 = await nhom(GV, THANG_SAU);
    check('đã có bản rồi thì thôi gợi ý — không nói chen',
      (manSau2.danhSach || []).find(x => x.studentId === 's1').goiY === null);
  }

  // =========================================================================
  console.log('\n[5] Đề xuất sửa kế hoạch ĐÃ DUYỆT — phải có lý do, quản lý mới mở lại');
  {
    const suaThang = await req('PUT', '/api/kehoachbe', {
      cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', baiHoc: [{ baiHocId: gayS.id, nhan: 'mo-rong' }] }] },
    });
    check('đối chứng — kế hoạch đã duyệt thì cô KHÔNG sửa thẳng được', suaThang.status === 400, suaThang.status);

    const thieu = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV, body: { noiDung: 'Đổi Gậy số thành Số nhám' } });
    check('đề xuất KHÔNG có lý do thì bị từ chối', thieu.status === 400 && /lý do/i.test(thieu.data.error || ''), thieu.data);
    const ph = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: PH, body: { lyDo: 'x' } });
    check('gia đình không đề xuất được', ph.status === 403, ph.status);
    const co2 = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV2, body: { lyDo: 'x' } });
    check('cô nhóm khác không đề xuất được', co2.status === 403, co2.status);

    const dx = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, {
      cookie: GV, body: { lyDo: 'Bé nghỉ ốm hai tuần, Gậy số chưa kịp bắt đầu', noiDung: 'Toán: bỏ Gậy số, thêm Số nhám' },
    });
    check('có lý do thì gửi được', dx.status === 201 && dx.data.deXuat && dx.data.deXuat.trangThai === 'cho-duyet', dx.data);
    const lai = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV, body: { lyDo: 'gửi lần hai' } });
    check('đang có một đề xuất chờ thì không gửi thêm', lai.status === 400, lai.status);
    const coThay = await cuaBe(GV, 's1');
    check('màn của cô thấy đề xuất đang chờ', coThay.ke.deXuat && coThay.ke.deXuat.trangThai === 'cho-duyet');
    const manQL = await nhom(QL);
    check('màn quản lý đếm được đề xuất chờ', manQL.tong.deXuatCho === 1, manQL.tong);

    const coDuyet = await req('POST', `/api/kehoachbe/de-xuat/${dx.data.deXuat.id}/duyet`, { cookie: GV, body: { quyetDinh: 'da-duyet' } });
    check('CÔ KHÔNG tự duyệt đề xuất', coDuyet.status === 403, coDuyet.status);
    const cs2 = await req('POST', `/api/kehoachbe/de-xuat/${dx.data.deXuat.id}/duyet`, { cookie: QL2, body: { quyetDinh: 'da-duyet' } });
    check('quản lý cơ sở KHÁC không duyệt được đề xuất của bé cơ sở này', cs2.status === 403, cs2.status);
    const tcThieu = await req('POST', `/api/kehoachbe/de-xuat/${dx.data.deXuat.id}/duyet`, { cookie: QL, body: { quyetDinh: 'tu-choi' } });
    check('từ chối mà không nói vì sao thì bị từ chối', tcThieu.status === 400, tcThieu.status);

    const duyet = await req('POST', `/api/kehoachbe/de-xuat/${dx.data.deXuat.id}/duyet`, { cookie: QL, body: { quyetDinh: 'da-duyet' } });
    check('quản lý duyệt được', duyet.status === 200 && duyet.data.deXuat.trangThai === 'da-duyet', duyet.data);
    check('DUYỆT = KẾ HOẠCH MỞ LẠI cho cô sửa (về nháp)', duyet.data.ke.trangThai === 'nhap', duyet.data.ke.trangThai);
    const suaDuoc = await req('PUT', '/api/kehoachbe', {
      cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', baiHoc: [{ baiHocId: gayS.id, nhan: 'mo-rong' }, { baiHocId: thapHong.id, nhan: 'hoc-moi' }] }] },
    });
    check('mở lại rồi thì cô sửa được', suaDuoc.status === 200 && suaDuoc.data.daLuu === 1, suaDuoc.data);
    const vet = await req('GET', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV });
    check('vết đề xuất còn nguyên: ai đề xuất, lý do, ai duyệt',
      vet.status === 200 && vet.data.deXuat.length === 1 && vet.data.deXuat[0].nguoiDuyetTen && /nghỉ ốm/.test(vet.data.deXuat[0].lyDo), vet.data);
    const daXem = await req('POST', `/api/kehoachbe/de-xuat/${dx.data.deXuat.id}/duyet`, { cookie: QL, body: { quyetDinh: 'da-duyet' } });
    check('đề xuất đã xem thì không duyệt lại', daXem.status === 400, daXem.status);

    // Kế hoạch đang nháp thì không cần đề xuất.
    const khongCan = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV, body: { lyDo: 'x' } });
    check('kế hoạch đang nháp thì máy nói: sửa thẳng đi, không cần đề xuất', khongCan.status === 400 && /sửa thẳng/.test(khongCan.data.error || ''), khongCan.data);

    // Vòng thứ hai: gửi duyệt lại → duyệt → đề xuất → quản lý TỪ CHỐI kèm lý do.
    await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1' } });
    await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { ids: [keS1.id], quyetDinh: 'da-duyet' } });
    const dx2 = await req('POST', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV, body: { lyDo: 'Muốn thêm Hộp màu' } });
    const tc = await req('POST', `/api/kehoachbe/de-xuat/${dx2.data.deXuat.id}/duyet`, { cookie: QL, body: { quyetDinh: 'tu-choi', yKien: 'Giữ lộ trình tới hết tháng' } });
    check('quản lý từ chối kèm ý kiến thì được', tc.status === 200 && tc.data.deXuat.trangThai === 'tu-choi', tc.data);
    check('từ chối thì kế hoạch VẪN ĐÃ DUYỆT, cô vẫn không sửa thẳng',
      tc.data.ke.trangThai === 'da-duyet'
        && (await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId: 's1', baiHoc: [] }] } })).status === 400);
    const coDoc = await cuaBe(GV, 's1');
    check('cô đọc được ý kiến từ chối', coDoc.ke.deXuat.trangThai === 'tu-choi' && /hết tháng/.test(coDoc.ke.deXuat.yKien));
  }

  // =========================================================================
  console.log('\n[6] Gia đình và nhóm khác không với tới đâu cả');
  {
    const a = await req('GET', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: PH });
    check('gia đình không đọc đề xuất', a.status === 403, a.status);
    const b = await req('GET', `/api/kehoachbe/${keS1.id}/de-xuat`, { cookie: GV2 });
    check('cô nhóm khác không đọc đề xuất', b.status === 403, b.status);
    const c = await req('GET', '/api/kehoachbe/khong-co-that/de-xuat', { cookie: GV });
    check('mã lạ thì 404, không nổ', c.status === 404, c.status);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet('Kế hoạch của bé — bài học, đề xuất, nhìn lại hai mức');
