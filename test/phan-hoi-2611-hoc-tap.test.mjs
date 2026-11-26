// Bài canh MÁY CHỦ cho đợt sửa lỗi kiểm thử thay trường 26/11 (Đ261e) — phần
// học tập và học phí.
//
// Chạy bằng:  node test/phan-hoi-2611-hoc-tap.test.mjs
//
//   1. R3-12 (QUY TẮC 5) — báo cáo THÁNG có nhận định ("Đã thấy con làm được",
//      chữ quy ước S/W/M cạnh bài) mà hai ô việc làm tiếp còn trống thì KHÔNG
//      gửi duyệt được, giống báo cáo 6 tháng. Dòng điền sẵn "Tiếp tục cùng
//      con: …" nằm trong ô lĩnh vực, KHÔNG được tính là gợi ý hành động: gợi ý
//      chỉ là hai ô "Ở lớp cô sẽ làm tiếp" / "Ở nhà gia đình chơi cùng con",
//      thứ máy không bao giờ điền sẵn.
//   2. R3-8 — tin báo quản lý "vừa gửi … kế hoạch tháng 11/2026", tin báo cô
//      "… (Montessori, tháng 11/2026)": không còn dạng máy "2026-11".
//   3. R3-10 — cô khác trong nhóm KHÔNG nhận quan sát chưa nhận định, chưa kể
//      của cô kia (trước đây nhận một thẻ chỉ có ngày), số của tab cũng không
//      đếm nó; nhận định xong thì thấy, kèm tên người ghi.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2611-hoc-tap');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'baocaohoctap', 'hanhtrinh', 'hocphi']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng Đ261e', 'ht2611_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7202), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);

try {
  const QT = await vao('ht2611_qt', mkQt);
  const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm c1

  // =========================================================================
  console.log('\n[1] R3-12 — báo cáo tháng có nhận định thì phải kèm việc làm tiếp');
  {
    const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data.baiHoc;
    const bai = (ten) => dm.find(b => b.ten === ten);
    const [thapHong, rotNuoc] = [bai('Tháp hồng'), bai('Rót nước')];
    check('đối chứng — danh mục có bài mẫu', thapHong && rotNuoc);
    const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'thang', ten: 'Báo cáo tháng (Đ261e)', tuThang: 0, denThang: 72,
      dong: [
        { nhom: 'II. NHẬN THỨC', tieuDe: 'Giác quan', kieu: 'chu', gocLinhVuc: 'giac-quan' },
        { nhom: 'II. NHẬN THỨC', tieuDe: 'Thực hành cuộc sống', kieu: 'chu', gocLinhVuc: 'thuc-hanh-cuoc-song' },
      ] } });
    const MAU = mau.data.mau.id;

    async function lapVaMo(studentId, baiHoc, nhinLai) {
      await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, danhSach: [{ studentId, baiHoc }] } });
      const ke = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
        .find(x => x.studentId === studentId).ke;
      const dong = (id) => ke.baiHoc.find(b => b.baiHocId === id).id;
      const nl = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke.id, baiHoc: nhinLai(dong) } });
      check(`đối chứng — cô nhìn lại kế hoạch của bé ${studentId}`, nl.status === 200, nl.data);
      const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
        studentId, mauId: MAU, tuNgay: `${THANG}-01`, denNgay: HOM } });
      return tao.data.ban;
    }
    const chuCua = (ban) => (ban.dong || []).map(d => d.chu).join('\n');

    // Bé s1: Tháp hồng mức S → "Đã thấy con làm được: Tháp hồng".
    const b1 = await lapVaMo('s1', [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }],
      (dong) => [{ id: dong(thapHong.id), mucDo: 'da-vung', tiepTuc: '' }]);
    check('đối chứng — ô điền sẵn có "Đã thấy con làm được: Tháp hồng"',
      /^Đã thấy con làm được: Tháp hồng$/m.test(chuCua(b1)), chuCua(b1));
    const g1 = await req('POST', `/api/baocaohoctap/ban/${b1.id}/gui`, { cookie: GV, body: {} });
    check('có "Đã thấy con làm được" mà hai ô việc làm tiếp trống → KHÔNG gửi duyệt được',
      g1.status === 400 && /ở lớp cô làm gì tiếp/.test(g1.data.error || ''), g1);
    const banSau = (await req('GET', `/api/baocaohoctap/ban/${b1.id}`, { cookie: GV })).data.ban;
    check('bản vẫn là nháp của cô', banSau.trangThai === 'nhap' && banSau.buoc !== 'cho-duyet', banSau.buoc);
    const qtGui = await req('POST', `/api/baocaohoctap/ban/${b1.id}/gui`, { cookie: QT, body: {} });
    check('quản trị bấm "Duyệt và gửi gia đình" cũng bị chặn y như vậy', qtGui.status === 400, qtGui.status);

    // Bé s3: Rót nước mức W + "tiếp tục ôn tập" → có dòng "Tiếp tục cùng con: …".
    const b3 = await lapVaMo('s3', [{ baiHocId: rotNuoc.id, nhan: 'on-tap' }],
      (dong) => [{ id: dong(rotNuoc.id), mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' }]);
    check('đối chứng — ô điền sẵn có chữ W và dòng "Tiếp tục cùng con"',
      /• Rót nước \(ôn tập · W\)/.test(chuCua(b3)) && /^Tiếp tục cùng con: Rót nước/m.test(chuCua(b3)), chuCua(b3));
    const g3 = await req('POST', `/api/baocaohoctap/ban/${b3.id}/gui`, { cookie: GV, body: {} });
    check('dòng điền sẵn "Tiếp tục cùng con" KHÔNG được tính là gợi ý hành động', g3.status === 400, g3);
    // Cô sửa chữ trong ô nhưng vẫn để hai ô việc làm tiếp trống — vẫn chặn.
    const oTh = b3.dong.find(d => d.gocLinhVuc === 'thuc-hanh-cuoc-song');
    await req('PUT', `/api/baocaohoctap/ban/${b3.id}`, { cookie: GV, body: {
      o: [{ dongId: oTh.id, chu: `${oTh.chu}\nTiếp tục cùng con: cô và con rót nước mỗi sáng` }] } });
    const g3b = await req('POST', `/api/baocaohoctap/ban/${b3.id}/gui`, { cookie: GV, body: {} });
    check('cô sửa dòng "Tiếp tục cùng con" trong ô lĩnh vực: vẫn chưa phải gợi ý, vẫn chặn', g3b.status === 400, g3b.status);
    await req('PUT', `/api/baocaohoctap/ban/${b3.id}`, { cookie: GV, body: { oNhaChoiGi: 'Cho con tự rót nước uống ở bàn ăn.' } });
    const g3c = await req('POST', `/api/baocaohoctap/ban/${b3.id}/gui`, { cookie: GV, body: {} });
    check('ghi một dòng "Ở nhà gia đình chơi cùng con" → gửi duyệt được', g3c.status === 200 && g3c.data.choDuyet, g3c);

    // Bé s4: chỉ mức N — chưa có nhận định nào → không ép (QUY TẮC 2).
    const b4 = await lapVaMo('s4', [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }],
      (dong) => [{ id: dong(thapHong.id), mucDo: 'chua-quan-sat-thay', tiepTuc: '' }]);
    check('đối chứng — ô chỉ có chữ N, không có "Đã thấy"',
      /\(học mới · N\)/.test(chuCua(b4)) && !/Đã thấy/.test(chuCua(b4)), chuCua(b4));
    const g4 = await req('POST', `/api/baocaohoctap/ban/${b4.id}/gui`, { cookie: GV, body: {} });
    check('chỉ "Chưa quan sát thấy" thì KHÔNG ép ghi việc làm tiếp', g4.status === 200, g4);

    // Bé s1 sau khi cô ghi "Ở lớp cô sẽ làm tiếp" → gửi được.
    await req('PUT', `/api/baocaohoctap/ban/${b1.id}`, { cookie: GV, body: { oLopLamGi: 'Cô mời con xếp tháp hồng nhắm mắt.' } });
    const g1b = await req('POST', `/api/baocaohoctap/ban/${b1.id}/gui`, { cookie: GV, body: {} });
    check('s1 ghi "Ở lớp cô sẽ làm tiếp" → gửi duyệt được', g1b.status === 200, g1b);
  }

  // =========================================================================
  console.log('\n[2] R3-8 — tin báo kế hoạch ghi "tháng 11/2026", không ghi "2026-11"');
  {
    const CSDL = path.join(DIR, 'school.db');
    const doc = (sql, ...p) => { const c = new Database(CSDL, { readonly: true }); try { return c.prepare(sql).all(...p); } finally { c.close(); } };
    const chu = `tháng ${Number(THANG.slice(5, 7))}/${THANG.slice(0, 4)}`;
    const g = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: {
      classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
    check('đối chứng — cô gửi duyệt kế hoạch của s1', g.status === 200 && g.data.daGui >= 1, g.data);
    const tinQl = doc("SELECT noiDung FROM thongbao_nv WHERE loai = 'ke-hoach-gui' ORDER BY rowid DESC LIMIT 1")[0];
    check(`tin báo quản lý ghi "${chu}"`, tinQl && tinQl.noiDung.includes(`kế hoạch ${chu}`), tinQl);
    check('…và không còn dạng máy', tinQl && !tinQl.noiDung.includes(THANG), tinQl);
    const k = ((await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV })).data.danhSach || [])
      .find(x => x.studentId === 's1').ke;
    const dy = await req('POST', '/api/kehoachbe/duyet', { cookie: QT, body: { quyetDinh: 'da-duyet', phan: [{ keId: k.id, chuongTrinh: 'chu-nhiem' }] } });
    check('đối chứng — quản lý duyệt', dy.status === 200, dy.data);
    const tinCo = doc("SELECT noiDung FROM thongbao_nv WHERE loai = 'ke-hoach-duyet' ORDER BY rowid DESC LIMIT 1")[0];
    check(`tin báo cô "đã được duyệt" ghi "${chu}"`, tinCo && tinCo.noiDung.includes(chu) && !tinCo.noiDung.includes(THANG), tinCo);
  }

  // =========================================================================
  console.log('\n[3] R3-10 — quan sát chưa nhận định của cô khác không hiện thành thẻ trống');
  {
    const GV3 = (await login('giaovien3', '123456')).cookie;   // t3 — cũng dạy c1
    const hoSo = async (ck) => (await req('GET', '/api/hanhtrinh?studentId=s4', { cookie: ck })).data;
    const soTab = (d) => ((d.nhomCoTab || []).find(t => t.ma === 'chu-nhiem') || {}).soQuanSat;
    const truoc = await hoSo(GV3);
    const ghi = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's4', moTa: 'Ghi chú thô Đ261e, chưa nhận định' } });
    check('đối chứng — cô Mai Anh ghi một quan sát thô cho s4', ghi.status === 201, ghi.data);
    const id = ghi.data.id;
    check('cô đã ghi vẫn thấy quan sát của mình', (await hoSo(GV)).quanSat.some(q => q.id === id));
    const sau = await hoSo(GV3);
    check('cô khác KHÔNG nhận quan sát chưa nhận định, chưa kể', !sau.quanSat.some(q => q.id === id), sau.quanSat.map(q => q.id));
    check('…và số của tab không đếm nó', soTab(sau) === soTab(truoc), [soTab(truoc), soTab(sau)]);
    check('quản trị vẫn thấy (lớp 1 cho quản trị khi cần)', (await hoSo(QT)).quanSat.some(q => q.id === id));
    const sua = await req('PUT', `/api/hanhtrinh/${id}`, { cookie: GV, body: { linhVuc: 'the-chat', trangThai: 'dang-hinh-thanh', oLopLamGi: 'Cô bày thêm vòng ném ở sân.' } });
    check('đối chứng — cô nhận định quan sát', sua.status === 200, sua.data);
    const nd = (await hoSo(GV3)).quanSat.find(q => q.id === id);
    check('nhận định xong: cô khác thấy, đọc được nhận định và tên người ghi, KHÔNG đọc ghi chú thô',
      nd && nd.trangThai === 'dang-hinh-thanh' && /Mai Anh/.test(nd.coGhiTen || '') && nd.moTa === undefined, nd);
  }
} catch (err) {
  check(`bài chạy hết không lỗi: ${err.message}`, false, err.stack);
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}
tongKet();
