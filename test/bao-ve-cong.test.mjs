// Bài canh CHỨC VỤ BẢO VỆ CỔNG (Đ156 — DD-12).
//
// Chạy bằng:  npm run test:bao-ve
//
// VÌ SAO CÓ CHỨC VỤ NÀY
//
// Nhà trường: điểm danh buổi sáng do bảo vệ chụp ảnh ở cổng. Trước Đ156 không
// có chức vụ nào cho việc ấy, nên chiếc máy dùng chung đặt ở cổng phải MƯỢN
// TÀI KHOẢN VĂN PHÒNG — mà văn phòng mở được hồ sơ bé, sổ sức khoẻ, đơn thuốc,
// album ảnh và tin nhắn của mọi gia đình trong cơ sở. Một chiếc máy để ngoài
// cổng, không ai trông, đăng nhập sẵn cả ngày.
//
// Bài này canh HAI chiều, và chiều thứ hai mới là chiều dễ làm sai:
//
//   • ĐÓNG ĐỦ — mục [2] gõ thẳng vào từng cửa mà tài khoản văn phòng vẫn mở
//     được, và đòi bảo vệ bị từ chối ở tất cả.
//   • MỞ ĐỦ — mục [3] chứng minh họ LÀM ĐƯỢC việc của mình: chấm sổ, chụp ảnh
//     con tới lớp, xem lại ảnh. Một chức vụ đóng chặt tới mức không làm được
//     việc thì trường sẽ quay lại mượn tài khoản văn phòng, và cả đợt này vô
//     nghĩa.
//
// Mục [4] canh hai việc CỐ Ý không phải của họ tuy vẫn nằm trong vùng
// `/api/attendance`: chốt sổ vắng, và đặt mốc giờ rà soát.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('bao-ve-cong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['diemdanh', 'nhatky', 'tienan', 'hocphi']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng BV', 'bv_qt');
const mkVP = taoQuanTri(DIR, 'Văn Phòng CS1', 'bv_vp');
const mkBV = taoQuanTri(DIR, 'Bảo Vệ Cổng CS1', 'bv_bv');
khoaVaoCoSo(DIR, 'bv_vp', 'cs1');
datChucVu(DIR, 'bv_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 'bv_bv', 'cs1');
datChucVu(DIR, 'bv_bv', 'baove');

const HOM = HOM_NAY();
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4738), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const ma = async (cookie, duong) => (await req('GET', duong, { cookie })).status;

try {
  const QT = await vao('bv_qt', mkQT);
  const VP = await vao('bv_vp', mkVP);
  const BV = await vao('bv_bv', mkBV);
  const GV = (await login('giaovien', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Chức vụ có thật, gán được, và ban giám hiệu thấy nó trong danh mục');
  {
    const ds = (await req('GET', '/api/admin/chuc-vu', { cookie: QT })).data || [];
    const bv = ds.find(c => c.ma === 'baove');
    check('danh mục có chức vụ Bảo vệ cổng', !!bv, ds.map(c => c.ma));
    check('và nói rõ nó KHÔNG mở được những gì',
      !!bv && /KHÔNG mở được/.test(bv.moTa), bv && bv.moTa);
    check('nhắc luôn phải khoá vào cơ sở — chức vụ mở vùng việc, cơ sở mới cắt phạm vi',
      !!bv && /cơ sở/i.test(bv.moTa), bv && bv.moTa);
    check('danh mục vẫn KHÔNG kèm danh sách đường dẫn API',
      ds.every(c => !('api' in c)), Object.keys(ds[0] || {}));

    const me = (await req('GET', '/api/auth/me', { cookie: BV })).data;
    check('tài khoản bảo vệ đăng nhập được và biết mình là bảo vệ',
      me && me.user && me.user.chucVu === 'baove', me && me.user && me.user.chucVu);
  }

  // =========================================================================
  console.log('\n[2] ĐÓNG ĐỦ — mọi cửa văn phòng mở được, bảo vệ đều bị chặn');
  {
    // Danh sách này cố ý gõ thẳng đường dẫn: mỗi dòng là một thứ mà chiếc máy
    // ở cổng, khi mượn tài khoản văn phòng, ĐANG mở ra được.
    const CUA = [
      ['hồ sơ bé', '/api/students'],
      ['sổ sức khoẻ', '/api/health?studentId=s1'],
      ['đơn thuốc', '/api/medicine'],
      ['album ảnh', '/api/albums'],
      ['tin nhắn', '/api/messages'],
      ['thông báo nhà trường', '/api/notifications'],
      ['khảo sát', '/api/surveys'],
      ['nhật ký ngày của bé', '/api/nhatky/be?studentId=s1'],
      ['tiền ăn', '/api/tienan/thang'],
      ['học phí', '/api/hocphi'],
      ['trang quản trị', '/api/admin/overview'],
      ['đơn xin nghỉ', '/api/leave'],
      ['thực đơn', '/api/menu'],
    ];
    // /api/accounts thì CẢ HAI đều đóng (văn phòng cố ý không có, xem lib/db.js),
    // nên nó không nằm trong danh sách so sánh ở trên — nhưng vẫn phải canh,
    // vì "mở được tài khoản từ chiếc máy ngoài cổng" là chỗ hỏng nặng nhất.
    check('cấp lại mật khẩu: bảo vệ đóng, và văn phòng cũng đóng',
      (await ma(BV, '/api/accounts')) === 403 && (await ma(VP, '/api/accounts')) === 403);

    for (const [ten, duong] of CUA) {
      const vp = await ma(VP, duong);
      const bv = await ma(BV, duong);
      // Đối chứng nằm ngay trong phép kiểm: nếu văn phòng cũng không mở được
      // thì dòng này chẳng chứng minh gì, và phải hiện ra chứ không im lặng.
      check(`${ten}: văn phòng mở được (${vp}) mà bảo vệ thì KHÔNG (${bv})`,
        vp !== 403 && bv === 403, { vp, bv });
    }
  }

  // =========================================================================
  console.log('\n[3] MỞ ĐỦ — bảo vệ LÀM ĐƯỢC đúng việc ở cổng');
  {
    const so = await req('GET', `/api/attendance/class?date=${HOM}`, { cookie: BV });
    check('mở được sổ điểm danh của cơ sở mình', so.status === 200, so.status);
    check('và có bé để chấm', (so.data.students || []).length > 0, (so.data.students || []).length);

    const cham = await req('POST', '/api/attendance/mark', { cookie: BV, body: {
      studentId: 's1', date: HOM, status: 'present' } });
    check('chấm được một bé', cham.status === 200, `${cham.status} ${JSON.stringify(cham.data).slice(0, 120)}`);

    const anh = await req('POST', '/api/attendance/anh', { cookie: BV, body: {
      studentId: 's1', date: HOM,
      anh: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } });
    check('chụp được ảnh con tới lớp', anh.status === 200 || anh.status === 201,
      `${anh.status} ${JSON.stringify(anh.data).slice(0, 140)}`);
    const xem = await req('GET', `/api/attendance/anh?studentId=s1&month=${HOM.slice(0, 7)}`, { cookie: BV });
    check('và xem lại được ảnh vừa chụp', xem.status === 200 && (xem.data.anh || []).length > 0,
      `${xem.status} ${JSON.stringify(xem.data).slice(0, 120)}`);

    const bang = await req('GET', '/api/dashboard/badges', { cookie: BV });
    check('khung của app vẫn chạy — huy hiệu đọc được', bang.status === 200, bang.status);
    const mods = (await req('GET', '/api/modules', { cookie: BV })).data;
    const ten = ((mods && mods.modules) || mods || []).map(m => m.view || m.key);
    check('màn hình chính CHỈ hiện ô Điểm danh, không mời bấm ô sẽ bị từ chối',
      ten.includes('attendance') && !ten.includes('albums') && !ten.includes('health')
        && !ten.includes('nhatky') && !ten.includes('messages'), ten);
  }

  // =========================================================================
  console.log('\n[4] Hai việc nằm trong vùng điểm danh nhưng KHÔNG phải của cổng');
  {
    const moc = await req('PUT', '/api/attendance/cai-dat', { cookie: BV, body: { gioRaSoat: '10:00' } });
    check('bảo vệ KHÔNG đặt được mốc giờ rà soát của cả trường', moc.status === 403, moc.status);
    check('và câu từ chối nói rõ ai mới đặt được',
      /văn phòng|ban giám hiệu/i.test(moc.data?.error || ''), moc.data?.error);
    const docMoc = await req('GET', '/api/attendance/cai-dat', { cookie: BV });
    check('nhưng ĐỌC được mốc — bảng rà soát của họ cũng theo mốc ấy',
      docMoc.status === 200 && docMoc.data.suaDuoc === false, docMoc.data);

    const chot = await req('POST', '/api/attendance/chot-vang', { cookie: BV, body: { date: HOM, classId: 'c1' } });
    check('bảo vệ KHÔNG chốt được sổ vắng', chot.status === 403, `${chot.status} ${JSON.stringify(chot.data).slice(0, 140)}`);
    check('và câu từ chối chỉ đúng việc họ làm được ở cổng',
      /chụp ảnh|chấm từng bé/i.test(chot.data?.error || ''), chot.data?.error);

    const raSoat = await req('GET', `/api/attendance/ra-soat?date=${HOM}`, { cookie: BV });
    check('máy chủ nói cho màn hình biết để giấu nút, không mời bấm rồi từ chối',
      raSoat.status === 200 && raSoat.data.datNepDuoc === false, raSoat.data && raSoat.data.datNepDuoc);
  }

  // =========================================================================
  console.log('\n[5] NGUYÊN TẮC SỐ 1 — thêm chức vụ không lấy mất việc của ai');
  {
    const vpMoc = await req('PUT', '/api/attendance/cai-dat', { cookie: VP, body: { gioRaSoat: '08:30' } });
    check('VĂN PHÒNG vẫn đặt được mốc giờ như trước', vpMoc.status === 200, vpMoc.data);
    await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '09:00' } });

    const coChot = await req('POST', '/api/attendance/chot-vang', { cookie: GV, body: { date: HOM, classId: 'c1' } });
    check('CÔ vẫn chốt được sổ nhóm mình — không bị vạ lây (Đ131)',
      coChot.status !== 403, `${coChot.status} ${JSON.stringify(coChot.data).slice(0, 140)}`);

    const vpRaSoat = await req('GET', `/api/attendance/ra-soat?date=${HOM}`, { cookie: VP });
    check('văn phòng vẫn được đánh dấu là người đặt nếp',
      vpRaSoat.data.datNepDuoc === true, vpRaSoat.data.datNepDuoc);
    const coRaSoat = await req('GET', `/api/attendance/ra-soat?date=${HOM}&classId=c1`, { cookie: GV });
    check('và CÔ cũng vậy — tầng chức vụ chỉ nói về tài khoản quản trị',
      coRaSoat.data.datNepDuoc === true, coRaSoat.data.datNepDuoc);
  }

  // =========================================================================
  console.log('\n[6] Phạm vi bé nào là do TẦNG CƠ SỞ, không phải do chức vụ');
  {
    const so = await req('GET', `/api/attendance/class?date=${HOM}`, { cookie: BV });
    const ids = (so.data.students || []).map(x => x.student.id);
    check('bảo vệ cơ sở 1 thấy bé cơ sở 1', ids.includes('s1'), ids.length);
    const c2 = await req('GET', `/api/attendance/class?date=${HOM}&classId=c3`, { cookie: BV });
    check('nhưng KHÔNG mở được nhóm của cơ sở khác', c2.status === 403, c2.status);

    // Màn Điểm danh của họ là màn của quản trị, và nó phải giấu hai nút kia.
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/attendance.js'), 'utf8');
    check('màn hình giấu nút Chốt sổ vắng khi máy chủ nói không được',
      /datNepDuoc === false\) return ''/.test(v), 'nutChotVang');
    check('và giấu cả ô đặt mốc giờ', /r\.datNepDuoc === false\)/.test(v), 'theMocRaSoat');
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Chức vụ Bảo vệ cổng (Đ156)');
