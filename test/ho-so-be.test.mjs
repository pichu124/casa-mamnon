// Bài canh HỒ SƠ BÉ — ba trường nhà trường yêu cầu thêm, và ranh giới của chúng.
//
// Chạy bằng:  npm run test:ho-so-be
//
// VÌ SAO CÓ BÀI NÀY
//
// Ba thứ mới đụng vào ba chỗ nhạy cảm khác nhau, mỗi chỗ hỏng một kiểu:
//
//   • SỐ ĐỊNH DANH CÁ NHÂN là dữ liệu cá nhân theo Nghị định 13/2023. Cô cần
//     biết tiền sử bệnh và số gọi khẩn cấp để làm việc — cô KHÔNG cần số định
//     danh. Nó chỉ được về tay quản trị, và phải cắt ở MÁY CHỦ: cắt ở giao diện
//     thì người biết đường dẫn vẫn lấy được.
//   • TIỀN SỬ BỆNH thay chỗ ô "Dị ứng" đời cũ. Trường nào đã nhập dị ứng cho
//     300 bé không được phải nhập lại, và không màn hình nào được mất chữ
//     trong lúc chuyển.
//   • LIÊN HỆ KHẨN CẤP không phải tài khoản đăng nhập. Người này không được xem
//     bất cứ thứ gì trong app.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ho-so-be');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3945), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const dau = await login('hieutruong', mkTam);
await req('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: 'quantri2026' } });
const A = (await login('hieutruong', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

// ===========================================================================
console.log('\n[1] Số định danh cá nhân — CHỈ quản trị, cắt ở máy chủ');
{
  const cuaQT = await req('GET', '/api/students/s1', { cookie: A });
  check('quản trị nhận được số định danh', !!cuaQT.data?.soDinhDanh, cuaQT.data?.soDinhDanh);

  const cuaCo = await req('GET', '/api/students/s1', { cookie: GV });
  check('cô mở được hồ sơ bé nhóm mình', cuaCo.status === 200, cuaCo.status);
  check('NHƯNG MÁY CHỦ KHÔNG GỬI số định danh cho cô',
    cuaCo.data?.soDinhDanh === undefined, cuaCo.data?.soDinhDanh);

  const cuaPH = await req('GET', '/api/students/s1', { cookie: PH });
  check('phụ huynh cũng không nhận số định danh qua đường này',
    cuaPH.data?.soDinhDanh === undefined, cuaPH.data?.soDinhDanh);

  // Danh sách bé của cô cũng không được lọt.
  const ds = await req('GET', '/api/students', { cookie: GV });
  check('danh sách bé của cô KHÔNG chứa số định danh của bé nào',
    ds.data.every(b => b.soDinhDanh === undefined), ds.data[0]);
}

// ===========================================================================
console.log('\n[2] Tiền sử bệnh — dữ liệu cũ được tôn trọng, không phải nhập lại');
{
  // s4 (Vũ Đức Anh) ở nhóm c1 — đúng nhóm cô đang dạy.
  const co = await req('GET', '/api/students/s4', { cookie: GV });
  check('cô ĐỌC ĐƯỢC tiền sử bệnh — thứ cô cần trước khi nhận bé mỗi sáng',
    /đậu phộng/i.test(co.data?.tienSuBenh || ''), co.data?.tienSuBenh);

  // Bé chưa ai nhập tiền sử bệnh: phải lùi về ô "Dị ứng" đời cũ, không để trống.
  const cu = await req('GET', '/api/students/s3', { cookie: GV });
  check('BÉ CHƯA NHẬP GÌ THÌ LÙI VỀ Ô "DỊ ỨNG" ĐỜI CŨ, không hiện trống',
    (cu.data?.tienSuBenh || '') !== '', cu.data?.tienSuBenh);
  check('và ô "Dị ứng" cũ vẫn còn nguyên trong dữ liệu, không bị xóa',
    (cu.data?.allergies || '') !== '', cu.data?.allergies);
}

// ===========================================================================
console.log('\n[3] Liên hệ khẩn cấp — cô gọi được, nhưng không phải một tài khoản');
{
  const co = await req('GET', '/api/students/s1', { cookie: GV });
  const ds = co.data?.lienHeKhanCap || [];
  check('cô thấy người liên hệ khẩn cấp của bé', ds.length > 0, ds);
  check('kèm quan hệ và số điện thoại — thiếu một trong hai thì gọi cũng vô ích',
    ds[0] && ds[0].quanHe && ds[0].dienThoai, ds[0]);

  const ph = await req('GET', '/api/students/s1', { cookie: PH });
  check('phụ huynh cũng thấy, để biết trường đang giữ số của ai',
    (ph.data?.lienHeKhanCap || []).length > 0);

  // Không phải tài khoản: không có ai đăng nhập được bằng tên người này.
  const thu = await req('POST', '/api/auth/login',
    { body: { username: 'Bà Trần Thị Lan', password: '123456' } });
  check('người liên hệ khẩn cấp KHÔNG phải tài khoản đăng nhập', thu.status !== 200, thu.status);
}

// ===========================================================================
console.log('\n[4] Quản trị sửa được, và sửa một thứ không làm mất thứ kia');
{
  const luu = await req('PUT', '/api/admin/students/s3', {
    cookie: A,
    body: {
      soDinhDanh: '079322007777',
      tienSuBenh: 'Hay sốt mọc răng, mẹ dặn theo dõi buổi trưa',
      lienHeKhanCap: [
        { hoTen: 'Ông Phạm Văn Ba', quanHe: 'Ông nội', dienThoai: '0988 777 666' },
        { hoTen: '', quanHe: 'x', dienThoai: 'y' },
      ],
    },
  });
  check('lưu được', luu.status === 200, luu.data);
  check('dòng liên hệ BỎ TRỐNG HỌ TÊN thì không được lưu',
    (luu.data?.lienHeKhanCap || []).length === 1, luu.data?.lienHeKhanCap);

  // ĐÂY LÀ CHECK QUAN TRỌNG NHẤT CỦA MỤC NÀY.
  //
  // Một màn hình cũ chưa biết ba trường mới mà lưu hồ sơ bé thì KHÔNG được làm
  // mất số định danh và số gọi khẩn cấp. Không gửi lên nghĩa là "không đụng
  // tới", chứ không phải "xóa trắng" — nhầm chỗ này là mất dữ liệu lặng lẽ.
  const chiSuaTen = await req('PUT', '/api/admin/students/s3', { cookie: A, body: { name: 'Phạm Gia Hân' } });
  check('SỬA MỖI TÊN THÌ SỐ ĐỊNH DANH CÒN NGUYÊN',
    chiSuaTen.data?.soDinhDanh === '079322007777', chiSuaTen.data?.soDinhDanh);
  check('SỬA MỖI TÊN THÌ LIÊN HỆ KHẨN CẤP CÒN NGUYÊN',
    (chiSuaTen.data?.lienHeKhanCap || []).length === 1, chiSuaTen.data?.lienHeKhanCap);

  // Gửi mảng rỗng thì mới là xóa — đó là chủ ý, khác hẳn với không gửi.
  const xoa = await req('PUT', '/api/admin/students/s3', { cookie: A, body: { lienHeKhanCap: [] } });
  check('gửi mảng rỗng MỚI là xóa — chủ ý thì làm được',
    (xoa.data?.lienHeKhanCap || []).length === 0, xoa.data?.lienHeKhanCap);

  check('cô KHÔNG sửa được hồ sơ bé qua đường quản trị',
    (await req('PUT', '/api/admin/students/s3', { cookie: GV, body: { soDinhDanh: 'x' } })).status === 403);
}

// ===========================================================================
console.log('\n[5] Liên hệ của TRƯỜNG thay cho số riêng của cô');
{
  // Nhà trường yêu cầu bỏ số điện thoại riêng của cô khỏi màn hồ sơ bé, thay
  // bằng hotline văn phòng. Lý do rất thực tế: cô đang đứng nhóm với 20 bé thì
  // không cầm điện thoại, còn văn phòng thì luôn có người nghe.
  const r = await req('GET', '/api/students/s1', { cookie: PH });
  const t = r.data?.lienHeTruong || {};
  check('máy chủ trả về thông tin liên hệ của trường', !!t.hotline, t);
  check('lấy đúng hotline của CƠ SỞ mà nhóm bé đang học',
    t.tenCoSo === 'Cơ sở 1' && t.hotline === '028 3844 5566', t);

  const chu = await (await fetch(`${sv.BASE}/js/views/student.js`)).text();
  check('màn hồ sơ bé KHÔNG còn dòng "Điện thoại của cô"',
    !/Điện thoại của cô/.test(chu));
  check('và đã có dòng hotline văn phòng', /Hotline văn phòng/.test(chu));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
