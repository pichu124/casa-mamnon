// Bài canh CHUYỂN NĂM HỌC × TẦNG CƠ SỞ.
//
// Chạy bằng:  npm run test:nam-hoc-co-so
//
// VÌ SAO TÁCH RA MỘT TỆP RIÊNG
//
// `test/nam-hoc.test.mjs` canh phần "bé lên nhóm nào, ai ra trường" và nó đã
// chuyển năm một lần ngay đầu tệp. Muốn canh chiều CƠ SỞ thì phải dựng bối cảnh
// khác hẳn: hai cơ sở, hai nhóm TRÙNG TÊN, rồi mới bấm chuyển năm.
//
// HAI LỖI Ở CÙNG MỘT KHỐI 15 DÒNG, VÀ CẢ HAI ĐỀU KHÔNG CÓ NÚT HOÀN TÁC
//
//   GỘP NHÓM — bản đầu gom nhóm của năm mới vào một Map khoá theo TÊN, và tra
//   nhóm đã có bằng `WHERE name = ? AND year = ?`, không một chữ nào về cơ sở.
//   Ba cơ sở đều có nhóm "Chồi 2", nên sau một lần bấm là ba nhóm nhập làm một:
//   trẻ ba cơ sở nằm chung, cô cơ sở này mở được hồ sơ bé cơ sở kia, toàn bộ
//   tầng cơ sở dựng ở N15 bay sạch trong đúng một giao dịch.
//
//   NHÓM MỒ CÔI — nhóm của năm mới không được gán cơ sở, mà quản lý cơ sở nhìn
//   thấy gì đều đi qua `classIdsOfCampus`. Sáng đầu năm học mới họ mở app ra
//   thấy trống trơn.
//
// Quy trình này chạy MỖI NĂM MỘT LẦN, nên không ai kịp nhận ra bằng cách dùng
// thử. Chỉ bài test bắt được.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nam-hoc-co-so');
sinhDuLieu(DIR);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS2', 'quanlycs2');
khoaVaoCoSo(DIR, 'quanlycs2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4070), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);    // Cấp 1 — cả trường
const C3 = await vao('quanlycs2', mk3);     // Cấp 3 — chỉ cơ sở 2

const nhomCua = async (cookie) => ((await req('GET', '/api/admin/overview', { cookie })).data?.classes || []);
const coSoCua = async (id) => {
  const ds = (await req('GET', '/api/admin/overview', { cookie: C1 })).data?.classes || [];
  return (ds.find(c => c.id === id) || {}).campusId || '';
};

// ===========================================================================
console.log('\n[1] Dựng bối cảnh: hai cơ sở, hai nhóm TRÙNG TÊN');
{
  // Dữ liệu mẫu: c1 "Chồi 2" ở cơ sở 1. Tạo thêm một nhóm cũng tên "Chồi 2"
  // nhưng ở cơ sở 2 — chuyện rất thường ở trường nhiều cơ sở.
  const r = await req('POST', '/api/admin/classes', {
    cookie: C1, body: { name: 'Chồi 2', room: 'Cơ sở 2 — Phòng Hoa Cúc', campusId: 'cs2' },
  });
  check('tạo được nhóm trùng tên ở cơ sở 2', r.status === 201, r.data);
  const c2moi = r.data.id;
  // Gắn lại bằng đường riêng: bối cảnh của bài canh không nên dựa vào chính
  // đường đang được canh. Nếu POST đã gắn đúng thì lệnh này là vô hại.
  await req('PUT', `/api/admin/classes/${c2moi}/campus`, { cookie: C1, body: { campusId: 'cs2' } });

  // Chuyển một bé sang nhóm mới đó, để có bằng chứng đi theo một đứa trẻ cụ
  // thể chứ không chỉ theo tên nhóm. Nhóm Mầm 1 của cơ sở 2 trong dữ liệu mẫu
  // chưa có bé nào, nên lấy một bé của nhóm Chồi 2 cơ sở 1 chuyển sang.
  const beCS2 = ((await req('GET', '/api/admin/students?classId=c1', { cookie: C1 })).data || [])[0];
  check('có bé để chuyển sang cơ sở 2', !!beCS2, beCS2);
  const chuyen = await req('PUT', `/api/admin/students/${beCS2.id}`, { cookie: C1, body: { classId: c2moi } });
  check('chuyển được bé sang nhóm của cơ sở 2', chuyen.status === 200, chuyen.data);

  const truoc = await nhomCua(C1);
  const choiHai = truoc.filter(c => c.name === 'Chồi 2');
  check('trước khi chuyển năm có ĐÚNG HAI nhóm Chồi 2', choiHai.length === 2, choiHai.map(c => c.campusId));
  // So THẲNG danh sách mã cơ sở, không đếm số phần tử khác nhau: chuỗi rỗng
  // (chưa gắn cơ sở) cũng khác 'cs1', nên phép đếm sẽ xanh cả khi bối cảnh
  // dựng hỏng — đúng loại bài canh luôn đúng mà CLAUDE.md cấm.
  check('một nhóm ở cơ sở 1, một nhóm ở cơ sở 2',
    choiHai.map(c => c.campusId).sort().join(',') === 'cs1,cs2', choiHai.map(c => c.campusId));

  globalThis.__c2moi = c2moi;
  globalThis.__beCS2 = beCS2.id;
}

// ===========================================================================
console.log('\n[2] Màn XEM TRƯỚC nói đúng nhóm đích của từng cơ sở');
{
  const xt = await req('GET', '/api/schoolyear/preview', { cookie: C1 });
  check('mở được màn xem trước', xt.status === 200, xt.status);
  const buoc = (xt.data?.buoc || []).filter(b => b.tenHienTai === 'Chồi 2');
  check('xem trước liệt kê cả hai nhóm Chồi 2', buoc.length === 2, buoc.length);
  // Chưa có nhóm "Lá 2" nào của năm mới, nên cả hai đều phải nói "sẽ tạo mới".
  // Nếu đường tra nhóm đích không lọc cơ sở thì nó sẽ trỏ cả hai vào một nhóm.
  check('không nhóm nào bị trỏ sang nhóm của cơ sở khác',
    buoc.every(b => !b.lopDichId) || new Set(buoc.map(b => b.lopDichId)).size === 2,
    buoc.map(b => b.lopDichId));
}

// ===========================================================================
console.log('\n[3] CHUYỂN NĂM: hai nhóm trùng tên KHÔNG được nhập làm một');
{
  const r = await req('POST', '/api/schoolyear/promote', {
    cookie: C1, body: { namMoi: '2027-2028' },
  });
  check('chuyển được năm học', r.status === 200, r.data);

  const sau = await nhomCua(C1);
  const laHai = sau.filter(c => c.name === 'Lá 2');
  check('CHỒI 2 CỦA HAI CƠ SỞ RA HAI NHÓM LÁ 2 RIÊNG, KHÔNG PHẢI MỘT',
    laHai.length === 2, laHai.map(c => `${c.name}@${c.campusId}`));
  check('và hai nhóm đó nằm đúng ở cơ sở 1 và cơ sở 2',
    laHai.map(c => c.campusId).sort().join(',') === 'cs1,cs2', laHai.map(c => c.campusId));
}

// ===========================================================================
console.log('\n[4] NHÓM CỦA NĂM MỚI PHẢI CÓ CƠ SỞ — không được mồ côi');
{
  const sau = await nhomCua(C1);
  const moi = sau.filter(c => c.year === '2027-2028');
  check('có nhóm của năm mới', moi.length >= 2, moi.length);
  const moCoi = moi.filter(c => !c.campusId);
  check('KHÔNG NHÓM MỚI NÀO THIẾU CƠ SỞ', moCoi.length === 0, moCoi.map(c => c.name));

  // Đây mới là hậu quả người dùng cảm nhận được: quản lý cơ sở 2 sáng đầu năm
  // học mở app ra phải thấy nhóm của mình, không phải một danh sách trống.
  const cua3 = await nhomCua(C3);
  check('QUẢN LÝ CƠ SỞ 2 VẪN THẤY NHÓM CỦA MÌNH SAU KHI CHUYỂN NĂM',
    cua3.length > 0, cua3.map(c => c.name));
  check('và chỉ thấy nhóm của cơ sở mình',
    cua3.every(c => c.campusId === 'cs2'), cua3.map(c => `${c.name}@${c.campusId}`));
}

// ===========================================================================
console.log('\n[5] Bé đi theo ĐÚNG cơ sở của mình');
{
  const be = (await req('GET', `/api/students/${globalThis.__beCS2}`, { cookie: C1 })).data;
  check('đọc được hồ sơ bé sau khi chuyển năm', !!be, be);
  const coSoBe = await coSoCua(be.classId);
  check('BÉ CỦA CƠ SỞ 2 VẪN Ở CƠ SỞ 2, không trôi sang cơ sở 1',
    coSoBe === 'cs2', { classId: be.classId, coSo: coSoBe });

  // Và quản lý cơ sở 2 mở được hồ sơ bé đó — vế còn lại của cùng một chuyện.
  const doc3 = await req('GET', `/api/students/${globalThis.__beCS2}`, { cookie: C3 });
  check('quản lý cơ sở 2 vẫn mở được hồ sơ bé của mình', doc3.status === 200, doc3.status);
}

// ===========================================================================
console.log('\n[6] Chuyển năm LẦN HAI cũng không nối nhầm hai cơ sở');
{
  // Lần thứ hai đi qua nhánh "nhóm của năm mới ĐÃ CÓ" — nhánh khác hẳn nhánh
  // tạo mới, và cũng từng tra theo tên không lọc cơ sở.
  const r = await req('POST', '/api/schoolyear/promote', {
    cookie: C1, body: { namMoi: '2028-2029' },
  });
  check('chuyển được năm học lần hai', r.status === 200, r.data);

  const sau = await nhomCua(C1);
  const theoTen = new Map();
  for (const c of sau.filter(x => x.year === '2028-2029')) {
    const k = `${c.name}@${c.campusId}`;
    theoTen.set(k, (theoTen.get(k) || 0) + 1);
  }
  check('không nhóm nào của năm mới bị trùng cơ sở + tên',
    [...theoTen.values()].every(n => n === 1), [...theoTen.entries()]);
  const moCoi = sau.filter(c => c.year === '2028-2029' && !c.campusId);
  check('lần hai cũng không đẻ ra nhóm mồ côi', moCoi.length === 0, moCoi.map(c => c.name));
}

// ===========================================================================
console.log('\n[7] Nhập danh sách: nhóm trùng tên thì HỎI, không đoán');
{
  // Dựng bối cảnh riêng thay vì ăn theo phần sót lại của hai lần chuyển năm —
  // bài canh phụ thuộc trạng thái của mục trước là bài canh hay vỡ vì lý do
  // chẳng liên quan gì tới thứ nó định canh.
  const tao = async (campusId) => {
    const r = await req('POST', '/api/admin/classes', { cookie: C1, body: { name: 'Mầm 3' } });
    await req('PUT', `/api/admin/classes/${r.data.id}/campus`, { cookie: C1, body: { campusId } });
    return r.data.id;
  };
  await tao('cs1');
  await tao('cs2');
  const cungTen = (await nhomCua(C1)).filter(c => c.name === 'Mầm 3');
  check('dựng được hai nhóm cùng tên ở hai cơ sở',
    cungTen.map(c => c.campusId).sort().join(',') === 'cs1,cs2', cungTen.map(c => c.campusId));

  const tep = 'Họ tên,Ngày sinh,Nhóm,Họ tên phụ huynh,Điện thoại\n'
    + 'Trần Bảo Ngọc,2022-03-04,Mầm 3,Trần Văn Nam,0988000111\n';
  const xem = await req('POST', '/api/admin/import/preview', { cookie: C1, body: { csv: tep } });
  const dong = (xem.data?.rows || [])[0] || {};
  check('KHÔNG ĐOÁN khi tên nhóm có ở nhiều cơ sở',
    (dong.loi || []).some(l => /nhiều cơ sở/i.test(l)), dong.loi);
  check('và câu báo lỗi chỉ đúng cách sửa',
    (dong.loi || []).some(l => /Cơ sở/i.test(l)), dong.loi);
  check('cả tệp bị đánh dấu có lỗi', (xem.data || {}).loi === 1, xem.data?.loi);

  // Ghi rõ cơ sở thì nhận được, và nhận đúng nhóm của cơ sở ấy.
  const tepDu = 'Họ tên,Ngày sinh,Nhóm,Cơ sở,Họ tên phụ huynh,Điện thoại\n'
    + 'Trần Bảo Ngọc,2022-03-04,Mầm 3,Cơ sở 2,Trần Văn Nam,0988000111\n';
  const xem2 = await req('POST', '/api/admin/import/preview', { cookie: C1, body: { csv: tepDu } });
  const dong2 = (xem2.data?.rows || [])[0] || {};
  check('ghi rõ cơ sở thì hết lỗi', !(dong2.loi || []).length, dong2.loi);
  const nhomCS2 = cungTen.find(c => c.campusId === 'cs2');
  check('và trỏ đúng nhóm của cơ sở đó, không phải nhóm trùng tên bên kia',
    dong2.classId === nhomCS2.id, { nhan: dong2.classId, dung: nhomCS2.id });

  // Ghi tên cơ sở không có thật thì báo rõ, không im lặng bỏ qua.
  const tepSai = 'Họ tên,Ngày sinh,Nhóm,Cơ sở,Họ tên phụ huynh,Điện thoại\n'
    + 'Trần Bảo Ngọc,2022-03-04,Mầm 3,Cơ sở 9,Trần Văn Nam,0988000111\n';
  const xem3 = await req('POST', '/api/admin/import/preview', { cookie: C1, body: { csv: tepSai } });
  const dong3 = (xem3.data?.rows || [])[0] || {};
  check('cơ sở không có thật thì báo lỗi',
    (dong3.loi || []).some(l => /không có cơ sở/i.test(l)), dong3.loi);

  // Tệp mẫu là CSV chứ không phải JSON, nên phải đọc thô.
  const mau = await fetch(`${sv.BASE}/api/admin/import/template`, { headers: { cookie: C1 } });
  const chu = await mau.text();
  check('tệp mẫu có cột Cơ sở', /Cơ sở/.test(chu), chu.slice(0, 140));
}

await sv.dung();
donThuMucTam(DIR);
tongKet();
