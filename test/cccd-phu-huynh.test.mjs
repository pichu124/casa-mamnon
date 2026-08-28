// Bài canh SỐ CCCD CỦA PHỤ HUYNH.
//
// Chạy bằng:  npm run test:cccd-phu-huynh
//
// VÌ SAO CÓ BÀI NÀY
//
// Số CCCD của phụ huynh trông giống số định danh của bé, nhưng RANH GIỚI CỦA NÓ
// KHÁC HẲN, và chính chỗ khác đó là chỗ dễ làm sai:
//
//   • Số định danh của BÉ: quản trị đọc được, cô và phụ huynh thì không.
//   • Số CCCD của PHỤ HUYNH: quản trị đọc được, CHÍNH NGƯỜI ĐÓ đọc được, còn
//     cô và NGƯỜI PHỐI NGẪU thì không.
//
// Vế cuối là vế quan trọng nhất và cũng là vế không ai nghĩ tới lúc viết mã. Bố
// mẹ ly hôn là chuyện có thật ở trường mầm non. Hai người vẫn là phụ huynh của
// cùng một bé, vẫn mở được cùng một hồ sơ, và nếu app trả số CCCD kèm theo hồ sơ
// đó thì một bên lấy được số giấy tờ của bên kia mà không ai biết.
//
// Đường trượt có sẵn ngay trong mã: routes/auth.js có publicUser(u) gạt đúng
// MỘT trường ra — passwordHash. Mọi cột khác của `users` đi thẳng ra ngoài. Chỉ
// cần ai đó thấy bảng phụ `user_profile` phiền phức rồi thêm `soCccd` thành một
// cột của `users` là rò ngay, không cần viết sai thêm dòng nào.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, ganPhuHuynh } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cccd-phu-huynh');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
// Bé s1 có CẢ BỐ LẪN MẸ — đúng điều nhà trường yêu cầu, và là tình huống mà
// mục [4] cần: hai người cùng mở được một hồ sơ.
ganPhuHuynh(DIR, 's1', 'p2');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3954), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const dau = await login('hieutruong', mkTam);
await req('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: 'quantri2026' } });
const A = (await login('hieutruong', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;      // p1 — mẹ của bé s1 và s2

// ===========================================================================
console.log('\n[1] Quản trị đọc và ghi được — đây là việc của văn phòng');
{
  const truoc = await req('GET', '/api/students/s1', { cookie: A });
  const p1 = (truoc.data?.parents || []).find(p => p.username === 'phuhuynh');
  check('quản trị nhận được số CCCD của phụ huynh', !!p1?.soCccd, p1?.soCccd);

  const ghi = await req('PUT', '/api/admin/parents/p1/cccd', { cookie: A, body: { soCccd: '079182009999' } });
  check('quản trị ghi được số mới', ghi.status === 200 && ghi.data?.soCccd === '079182009999', ghi.data);

  const sau = await req('GET', '/api/students/s1', { cookie: A });
  check('số mới về tới hồ sơ bé ngay',
    (sau.data?.parents || []).some(p => p.soCccd === '079182009999'), sau.data?.parents);

  const khongPhaiPH = await req('PUT', '/api/admin/parents/t1/cccd', { cookie: A, body: { soCccd: 'x' } });
  check('đường này CHỈ nhận phụ huynh, không nhận tài khoản cô', khongPhaiPH.status === 404, khongPhaiPH.status);

  const thieu = await req('PUT', '/api/admin/parents/p1/cccd', { cookie: A, body: {} });
  check('không gửi soCccd thì bị từ chối, KHÔNG âm thầm xóa trắng', thieu.status === 400, thieu.status);
  const conNguyen = await req('GET', '/api/students/s1', { cookie: A });
  check('và số cũ vẫn còn nguyên sau lần gửi thiếu đó',
    (conNguyen.data?.parents || []).some(p => p.soCccd === '079182009999'));
}

// ===========================================================================
console.log('\n[2] Cô KHÔNG đọc được — cô không cần số giấy tờ của bố mẹ để dạy bé');
{
  const co = await req('GET', '/api/students/s1', { cookie: GV });
  check('cô vẫn mở được hồ sơ bé nhóm mình', co.status === 200, co.status);
  check('nhưng KHÔNG có số CCCD của phụ huynh nào',
    (co.data?.parents || []).every(p => p.soCccd === undefined), co.data?.parents);

  const suaTrom = await req('PUT', '/api/admin/parents/p1/cccd', { cookie: GV, body: { soCccd: '1' } });
  check('cô cũng KHÔNG ghi được', suaTrom.status === 403, suaTrom.status);

  // Danh sách phụ huynh của cô cũng không được lọt.
  const ds = await req('GET', '/api/accounts/parents', { cookie: GV });
  check('danh sách phụ huynh của cô KHÔNG chứa số CCCD',
    (ds.data || []).every(p => p.soCccd === undefined), ds.data?.[0]);
}

// ===========================================================================
console.log('\n[3] CHÍNH NGƯỜI ĐÓ đọc được số của mình — dữ liệu của họ');
{
  const minh = await req('GET', '/api/students/s1', { cookie: PH });
  const toi = (minh.data?.parents || []).find(p => p.username === 'phuhuynh');
  check('phụ huynh thấy số CCCD của CHÍNH MÌNH — biết trường đang giữ gì',
    toi?.soCccd === '079182009999', toi?.soCccd);
}

// ===========================================================================
console.log('\n[4] NGƯỜI PHỐI NGẪU KHÔNG đọc được — vế dễ làm sai nhất');
{
  // p2 (Anh Phạm Quốc Bảo) đã được gắn làm phụ huynh thứ hai của bé s1 ở đầu
  // bài. Cho anh ấy một số CCCD riêng, rồi xem mẹ của cùng bé đó có thấy không.
  await req('PUT', '/api/admin/parents/p2/cccd', { cookie: A, body: { soCccd: '079183001111' } });

  const cuaQT = await req('GET', '/api/students/s1', { cookie: A });
  check('dựng đúng tình huống: bé s1 có HAI phụ huynh',
    (cuaQT.data?.parents || []).length === 2, (cuaQT.data?.parents || []).map(p => p.username));
  check('và quản trị thấy số của cả hai người',
    (cuaQT.data?.parents || []).filter(p => p.soCccd).length === 2, cuaQT.data?.parents);

  const cuaP1 = await req('GET', '/api/students/s1', { cookie: PH });
  const minh = (cuaP1.data?.parents || []).find(p => p.username === 'phuhuynh');
  const nguoiKia = (cuaP1.data?.parents || []).filter(p => p.username !== 'phuhuynh');
  check('mẹ vẫn thấy số của chính mình', !!minh?.soCccd, minh?.soCccd);
  check('MỘT PHỤ HUYNH KHÔNG THẤY SỐ CCCD CỦA PHỤ HUYNH CÒN LẠI',
    nguoiKia.length === 1 && nguoiKia[0].soCccd === undefined, nguoiKia);
  check('và số đó KHÔNG lọt ra ở bất cứ chỗ nào khác trong gói trả về',
    !JSON.stringify(cuaP1.data || {}).includes('079183001111'));

  // Chiều ngược lại phải đúng y hệt — không phải chỉ đúng một chiều.
  const p2 = await login('phuhuynh2', '123456');
  const cuaP2 = await req('GET', '/api/students/s1', { cookie: p2.cookie });
  const minhP2 = (cuaP2.data?.parents || []).find(p => p.username === 'phuhuynh2');
  check('bố thấy số của chính mình', minhP2?.soCccd === '079183001111', minhP2?.soCccd);
  check('VÀ BỐ CŨNG KHÔNG THẤY SỐ CỦA MẸ',
    !JSON.stringify(cuaP2.data || {}).includes('079182009999'),
    (cuaP2.data?.parents || []).map(p => `${p.username}:${p.soCccd}`));
}

// ===========================================================================
console.log('\n[5] Không được lẻn vào bằng đường cột thêm trong bảng users');
{
  // publicUser() chỉ gạt passwordHash. Nếu soCccd thành một cột của `users` thì
  // nó tự động đi ra theo mọi đường trả về người dùng, không ai phải viết gì.
  // Bài này canh chính điều đó: soi thẳng lược đồ.
  const cot = await req('GET', '/api/admin/audit', { cookie: A });
  check('đường nhật ký vẫn chạy (bảo đảm máy chủ còn khoẻ)', cot.status === 200, cot.status);

  const me = await req('GET', '/api/auth/me', { cookie: GV });
  check('gói đăng nhập của cô KHÔNG mang theo số CCCD của ai',
    !JSON.stringify(me.data || {}).includes('soCccd'), Object.keys(me.data?.user || {}));

  const dsBe = await req('GET', '/api/students', { cookie: GV });
  check('danh sách bé của cô cũng không', !JSON.stringify(dsBe.data || []).includes('soCccd'));
}

// ===========================================================================
console.log('\n[6] Một người, một số — nhà hai con thì sửa ở đâu cũng ra một chỗ');
{
  // p1 là mẹ của CẢ s1 lẫn s2. Sửa số từ hồ sơ bé nào cũng phải ra cùng bản ghi.
  await req('PUT', '/api/admin/parents/p1/cccd', { cookie: A, body: { soCccd: '079182007777' } });
  const beA = await req('GET', '/api/students/s1', { cookie: A });
  const beB = await req('GET', '/api/students/s2', { cookie: A });
  const soA = (beA.data?.parents || []).find(p => p.username === 'phuhuynh')?.soCccd;
  const soB = (beB.data?.parents || []).find(p => p.username === 'phuhuynh')?.soCccd;
  check('số CCCD của mẹ giống nhau ở hồ sơ cả hai con', soA === soB && soA === '079182007777', [soA, soB]);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
