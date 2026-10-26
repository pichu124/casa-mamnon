// Bài canh góp ý 20/10 — O4: chỉ quản lý cơ sở (đúng cơ sở của bé) và ban
// giám hiệu duyệt / trả lại báo cáo học tập.
//
// Chạy bằng:  node test/phan-hoi-2010-duyet-bao-cao.test.mjs
//
// Đi qua TỪNG chức vụ quản trị, bằng hành vi (gọi đúng đường duyệt và đường
// trả lại), không đọc mã. Chiều cho phép đo cùng lúc với chiều cấm: người
// đáng được duyệt mà không duyệt nổi thì trường quay lại dùng chung tài khoản.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, datChucVu, khoaVaoCoSo,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-duyet-bao-cao');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap']);

// Tên đăng nhập → [chức vụ, cơ sở]. null = quản trị chưa khai chức vụ.
const TAI_KHOAN = {
  o4_qt: [null, null],                       // quản trị không gắn chức vụ
  o4_ht: ['hieu-truong', null],
  o4_ql1: ['quanly-coso', 'cs1'],
  o4_ql2: ['quanly-coso', 'cs2'],
  o4_vp1: ['vanphong-coso', 'cs1'],
  o4_kt: ['ketoan', null],
  o4_ns: ['nhansu', null],
  o4_mk: ['marketing', null],
  o4_bv: ['baove', 'cs1'],
};
const MK = {};
for (const [u, [cv, cs]] of Object.entries(TAI_KHOAN)) {
  MK[u] = taoQuanTri(DIR, `Quản trị ${u}`, u);
  if (cv) datChucVu(DIR, u, cv);
  if (cs) khoaVaoCoSo(DIR, u, cs);
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7164), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const coChuViet = (s) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(String(s || ''));

try {
  const C = {};
  for (const u of Object.keys(TAI_KHOAN)) C[u] = await vao(u, MK[u]);
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1 (cơ sở 1)

  const mau = await req('POST', '/api/baocaohoctap/mau', { cookie: C.o4_qt, body: {
    loai: 'thang', ten: 'Báo cáo tháng (O4)', tuThang: 0, denThang: 72,
    dong: [{ nhom: 'I', tieuDe: 'Lưu ý', kieu: 'chu' }] } });
  check('đối chứng — nhà trường dựng được mẫu', mau.status === 200, mau.status);
  const MAU = mau.data.mau.id;

  // Cô soạn và gửi một bản của bé `studentId`, trả về mã bản đang chờ duyệt.
  let thang = 1;
  async function banChoDuyet(studentId) {
    const ky = `2026-${String(thang).padStart(2, '0')}`;
    thang += 1;
    const tao = await req('POST', '/api/baocaohoctap/ban', { cookie: GV, body: {
      studentId, mauId: MAU, tuNgay: `${ky}-01`, denNgay: `${ky}-28` } });
    const id = tao.data?.ban?.id;
    const dong = tao.data?.ban?.dong?.[0];
    await req('PUT', `/api/baocaohoctap/ban/${id}`, { cookie: GV, body: { o: [{ dongId: dong.id, chu: 'Con tự cất giày lên kệ.' }] } });
    const gui = await req('POST', `/api/baocaohoctap/ban/${id}/gui`, { cookie: GV, body: {} });
    check(`đối chứng — cô gửi bản ${ky} của bé ${studentId} chờ duyệt`, gui.status === 200 && gui.data.choDuyet === true, gui.data);
    return id;
  }
  const duyet = (cookie, id) => req('POST', `/api/baocaohoctap/ban/${id}/duyet`, { cookie, body: { quyetDinh: 'da-duyet' } });
  const traLai = (cookie, id) => req('POST', `/api/baocaohoctap/ban/${id}/duyet`, { cookie, body: { quyetDinh: 'tu-choi', yKien: 'Cô ghi rõ hơn giúp nhé' } });
  const buocCua = async (id) => (await req('GET', `/api/baocaohoctap/ban/${id}`, { cookie: C.o4_qt })).data?.ban;

  // =========================================================================
  console.log('\n[O4] Chức vụ không phải người duyệt: không duyệt, không trả lại được');
  const BAN = await banChoDuyet('s1');
  for (const u of ['o4_vp1', 'o4_kt', 'o4_ns', 'o4_mk', 'o4_bv']) {
    const d = await duyet(C[u], BAN);
    check(`${TAI_KHOAN[u][0]}: duyệt bị chặn 403, câu báo tiếng Việt`,
      d.status === 403 && coChuViet(d.data?.error), `${d.status} ${d.data?.error}`);
    const t = await traLai(C[u], BAN);
    check(`${TAI_KHOAN[u][0]}: trả lại bị chặn 403`, t.status === 403, t.status);
  }
  const co = await duyet(GV, BAN);
  check('cô nhóm: duyệt bị chặn 403', co.status === 403, co.status);
  const ql2 = await duyet(C.o4_ql2, BAN);
  check('quản lý cơ sở KHÁC: duyệt bé cơ sở 1 bị chặn 403', ql2.status === 403, ql2.status);
  const ql2t = await traLai(C.o4_ql2, BAN);
  check('quản lý cơ sở KHÁC: trả lại cũng bị chặn 403', ql2t.status === 403, ql2t.status);
  const sau = await buocCua(BAN);
  check('sau mọi lượt bị chặn, bản vẫn đang chờ duyệt', sau?.trangThai === 'da-gui' && sau?.buoc === 'cho-duyet', sau && [sau.trangThai, sau.buoc]);

  const vpXem = await req('GET', '/api/baocaohoctap/cho-duyet', { cookie: C.o4_vp1 });
  console.log(`    (ghi nhận) văn phòng cơ sở mở danh sách chờ duyệt: ${vpXem.status}`);
  const qlXem = await req('GET', '/api/baocaohoctap/cho-duyet', { cookie: C.o4_ql1 });
  check('quản lý cơ sở 1 thấy bản trong danh sách chờ duyệt',
    qlXem.status === 200 && (qlXem.data.danhSach || []).some(x => x.banId === BAN), qlXem.status);
  const ql2Xem = await req('GET', '/api/baocaohoctap/cho-duyet', { cookie: C.o4_ql2 });
  check('quản lý cơ sở 2 KHÔNG thấy bản của bé cơ sở 1',
    ql2Xem.status === 200 && !(ql2Xem.data.danhSach || []).some(x => x.banId === BAN), ql2Xem.status);

  // =========================================================================
  console.log('\n[O4] Người duyệt: quản lý đúng cơ sở, ban giám hiệu, quản trị không gắn chức vụ');
  const tl = await traLai(C.o4_ql1, BAN);
  check('quản lý cơ sở 1 trả lại được bản của bé cơ sở mình', tl.status === 200 && tl.data.quyetDinh === 'tu-choi', tl.data);
  const d1 = await duyet(C.o4_ql1, await banChoDuyet('s3'));
  check('quản lý cơ sở 1 duyệt được bản của bé cơ sở mình', d1.status === 200, d1.data);
  const d2 = await duyet(C.o4_ht, await banChoDuyet('s4'));
  check('ban giám hiệu (chức vụ hiệu trưởng) duyệt được', d2.status === 200, d2.data);
  const d3 = await duyet(C.o4_qt, await banChoDuyet('s5'));
  check('quản trị không gắn chức vụ duyệt được', d3.status === 200, d3.data);

  // Người duyệt tự soạn rồi bấm gửi thì coi như duyệt luôn — luật cũ, giữ nguyên.
  const tuSoan = await req('POST', '/api/baocaohoctap/ban', { cookie: C.o4_ql1, body: {
    studentId: 's6', mauId: MAU, tuNgay: '2026-09-01', denNgay: '2026-09-28' } });
  const dongQl = tuSoan.data?.ban?.dong?.[0];
  await req('PUT', `/api/baocaohoctap/ban/${tuSoan.data?.ban?.id}`, { cookie: C.o4_ql1, body: { o: [{ dongId: dongQl.id, chu: 'Con chào cô mỗi sáng.' }] } });
  const guiQl = await req('POST', `/api/baocaohoctap/ban/${tuSoan.data?.ban?.id}/gui`, { cookie: C.o4_ql1, body: {} });
  check('quản lý cơ sở tự soạn, bấm gửi là duyệt luôn (không qua chờ duyệt)',
    guiQl.status === 200 && guiQl.data.choDuyet === false, guiQl.data);
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
