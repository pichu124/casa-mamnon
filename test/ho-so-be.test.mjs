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
import { GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

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

// ===========================================================================
console.log('\n[6] Cân đo: chặn số GÕ NHẦM, và chỉ chặn số gõ nhầm');
{
  // Bản cũ chỉ kiểm `> 0`, không có trần trên. Gõ nhầm 170 cm cho một bé 3 tuổi
  // — thừa một số 0, hoặc gõ nhầm chiều cao của mẹ — được nhận và lưu im lặng,
  // rồi nằm trong hồ sơ sức khoẻ của bé đó mãi.
  //
  // NHƯNG CHẶN CHẶT LÀ VI PHẠM QUY TẮC 4. Một trần hẹp theo tuổi chính là app
  // đang so bé với "chuẩn của độ tuổi" — thứ CLAUDE.md cấm. Nên khoảng nhận vào
  // cố ý RỘNG HẾT MỨC: nó chỉ bắt thứ chắc chắn là gõ nhầm, và câu từ chối nói
  // về CHỮ SỐ chứ không nói gì về đứa trẻ.
  const them = (body) => req('POST', '/api/health', {
    cookie: GV, body: { studentId: 's1', type: 'checkup', title: 'Cân đo định kỳ', ...body },
  });

  const caoQua = await them({ height: 170 });
  check('CHIỀU CAO 170 cm CHO MỘT BÉ MẦM NON BỊ TỪ CHỐI', caoQua.status === 400, caoQua.data);
  check('và câu từ chối nói về GÕ NHẦM, không phán gì về bé',
    /gõ nhầm/i.test(caoQua.data?.error || '')
    && !/thấp|còi|béo|suy dinh dưỡng|chuẩn/i.test(caoQua.data?.error || ''), caoQua.data);

  const nangQua = await them({ weight: 170 });
  check('CÂN NẶNG 170 kg cũng bị từ chối', nangQua.status === 400, nangQua.data);

  const caoIt = await them({ height: 12 });
  check('chiều cao 12 cm bị từ chối (thiếu một chữ số)', caoIt.status === 400, caoIt.data);

  // Và chiều còn lại, quan trọng hơn: bé thật thì phải nhập được.
  const beNhaTre = await them({ height: 76, weight: 10 });
  check('BÉ NHÀ TRẺ 76 cm / 10 kg NHẬP ĐƯỢC BÌNH THƯỜNG',
    beNhaTre.status === 200 || beNhaTre.status === 201, beNhaTre.data);

  const beLa = await them({ height: 118, weight: 22 });
  check('bé nhóm Lá 118 cm / 22 kg cũng vậy',
    beLa.status === 200 || beLa.status === 201, beLa.data);

  // Bé nhẹ cân hay cao lớn khác thường vẫn phải ghi được — app không có quyền
  // nói bé nào là "bất thường".
  const beNheCan = await them({ height: 82, weight: 8 });
  check('BÉ NHẸ CÂN KHÁC THƯỜNG VẪN GHI ĐƯỢC — app không phán xét bé nào cả',
    beNheCan.status === 200 || beNheCan.status === 201, beNheCan.data);

  // Không gửi cân đo thì vẫn ghi được như cũ (Nguyên tắc số 1).
  const khongCanDo = await them({});
  check('không nhập cân đo thì vẫn ghi nhận được như trước',
    khongCanDo.status === 200 || khongCanDo.status === 201, khongCanDo.data);
}

// ===========================================================================
console.log('\n[7] Sửa lại ghi nhận cũng đi qua đúng chốt chặn đó');
{
  const tao = await req('POST', '/api/health', {
    cookie: GV,
    body: { studentId: 's1', type: 'checkup', title: 'Cân đo tháng 9', height: 100, weight: 16 },
  });
  const id = tao.data?.id;
  check('tạo được ghi nhận để sửa', !!id, tao.data);

  const sai = await req('PUT', `/api/health/${id}`, { cookie: GV, body: { height: 300 } });
  check('SỬA THÀNH 300 cm CŨNG BỊ TỪ CHỐI — không thể lách qua đường sửa',
    sai.status === 400, sai.data);

  const dung = await req('PUT', `/api/health/${id}`, { cookie: GV, body: { height: 103 } });
  check('sửa sang một con số hợp lệ thì được', dung.status === 200, dung.data);
}

// ===========================================================================
console.log('\n[8] Thị lực và Đánh giá thể trạng — hai ô ĐÃ HẾT CHẾT');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `lib/schema.sql` có sẵn hai cột `vision` và `bmiNote`, và màn hồ sơ sức
  // khoẻ in chúng ra từ lâu — nhưng KHÔNG đường nào ghi được. Nghĩa là chúng
  // chỉ có giá trị nếu nhập từ kho dữ liệu cũ, còn y tế trường khám xong thì
  // không nhập được đúng thứ mình vừa đo. Không hại ai (ô trống thì không
  // hiện), nhưng là thứ y tế sẽ hỏi ngay buổi đầu.
  const tao = await req('POST', '/api/health', {
    cookie: GV,
    body: {
      studentId: 's1', type: 'checkup', title: 'Khám sức khoẻ đầu năm',
      height: 96, weight: 14.5, vision: '10/10', bmiNote: 'Phát triển bình thường',
    },
  });
  check('ghi được ghi nhận có thị lực và đánh giá thể trạng', tao.status === 201, tao.data);
  check('máy chủ giữ lại ô thị lực', tao.data?.vision === '10/10', tao.data);
  check('máy chủ giữ lại ô đánh giá thể trạng',
    tao.data?.bmiNote === 'Phát triển bình thường', tao.data);

  // Và chữ phải ĐỌC LẠI ĐƯỢC, không chỉ vọng lại trong câu trả lời của lệnh ghi.
  const doc = await req('GET', '/api/health?studentId=s1', { cookie: GV });
  const ban = (doc.data?.records || doc.data || []).find?.(x => x.id === tao.data?.id)
    || (doc.data?.records || []).find(x => x.id === tao.data?.id);
  check('đọc lại thấy đúng hai ô đó trong hồ sơ của bé',
    ban && ban.vision === '10/10' && ban.bmiNote === 'Phát triển bình thường', ban);

  // Sửa được, và sửa về rỗng cũng được — y tế gõ nhầm phải xoá đi được.
  const sua = await req('PUT', `/api/health/${tao.data?.id}`, {
    cookie: GV, body: { vision: '9/10', bmiNote: '' },
  });
  check('sửa lại hai ô đó thì được', sua.status === 200 && sua.data?.vision === '9/10', sua.data);
  check('và xoá trắng một ô cũng được — gõ nhầm phải sửa lại được',
    sua.data?.bmiNote === '', sua.data);

  // ===== QUY TẮC 4 · QUY TẮC 3 =====
  //
  // "Đánh giá thể trạng" là NHẬN ĐỊNH CỦA NGƯỜI KHÁM. App tuyệt đối không được
  // tự suy nó ra từ chiều cao và cân nặng: làm thế là app tự xếp một đứa trẻ so
  // với "chuẩn của độ tuổi" (QUY TẮC 4), và là máy đánh giá trẻ thay người
  // (QUY TẮC 3) ở dạng thô sơ nhất.
  //
  // Đây là phép kiểm sẽ báo đỏ đúng lúc ai đó thêm một dòng "tính BMI hộ cô".
  const khongGoi = await req('POST', '/api/health', {
    cookie: GV,
    body: { studentId: 's1', type: 'checkup', title: 'Cân đo tháng 10', height: 97, weight: 14.8 },
  });
  check('gửi chiều cao + cân nặng mà không gửi ô đánh giá thì ô đó Ở NGUYÊN TRỐNG',
    khongGoi.status === 201 && !khongGoi.data?.bmiNote, khongGoi.data);
  check('và app cũng không tự điền hộ ô thị lực',
    !khongGoi.data?.vision, khongGoi.data);

  // Hai ô này chỉ thuộc về buổi KHÁM. Ghi nhận loại khác thì không.
  //
  // Loại dùng ở đây đổi từ 'vaccination' sang 'incident' vì nhà trường chốt bỏ
  // tiêm chủng (A6, 10/09/2026) và máy chủ không nhận ghi MỚI loại đó nữa.
  // Điều bài này canh KHÔNG đổi: một loại KHÔNG PHẢI buổi khám thì không được
  // mang theo ô đánh giá thể trạng.
  const tiem = await req('POST', '/api/health', {
    cookie: GV,
    body: { studentId: 's1', type: 'incident', title: 'Ngã ở sân chơi', bmiNote: 'lạc chỗ' },
  });
  check('ghi nhận KHÔNG PHẢI buổi khám thì không mang theo ô của buổi khám',
    tiem.status === 201 && !tiem.data?.bmiNote, tiem.data);

  // Chữ dài bị cắt chứ không làm hỏng bản ghi.
  const dai = await req('POST', '/api/health', {
    cookie: GV,
    body: { studentId: 's1', type: 'checkup', title: 'Khám dài', vision: 'x'.repeat(500) },
  });
  check('chữ quá dài thì bị cắt, không làm hỏng ghi nhận',
    dai.status === 201 && (dai.data?.vision || '').length <= 200, (dai.data?.vision || '').length);

  // Ranh giới quyền vẫn nguyên: phụ huynh không ghi được vào hồ sơ y tế.
  const ph = await req('POST', '/api/health', {
    cookie: PH,
    body: { studentId: 's1', type: 'checkup', title: 'Nhà tự khai', bmiNote: 'con tôi rất tốt' },
  });
  check('gia đình vẫn KHÔNG ghi được vào hồ sơ y tế của con', ph.status === 403, ph.status);
}

// ===========================================================================
console.log('\n[9] Dân tộc và Nhóm máu — hai ô ĐÃ HẾT CHẾT (mở đường ghi)');
{
  // TRƯỚC ĐỢT NÀY: hai cột này có trong bảng `students`, có trong tệp CSV xuất
  // ra cho Phòng, có trong dữ liệu mẫu — nhưng KHÔNG MÀN NÀO NHẬP ĐƯỢC. Danh
  // sách trường được vá của `PUT /api/admin/students/:id` không có chúng, và
  // đường nhập CSV ghi cứng chuỗi rỗng. Nên với một bé nhập vào sau ngày khai
  // giảng, hai cột ấy vĩnh viễn trống, và văn phòng in sổ ra là thiếu.
  //
  // Cách vá theo đúng CLAUDE.md là MỞ ĐƯỜNG GHI, không phải gỡ cột đi: gỡ là
  // bỏ dữ liệu đã có của những bé nhập từ dữ liệu mẫu, và là bỏ luôn cột trong
  // mẫu sổ của Phòng.
  const luu = await req('PUT', '/api/admin/students/s2', {
    cookie: A, body: { ethnicity: 'Tày', bloodType: 'O' },
  });
  check('quản trị GHI được dân tộc', luu.status === 200 && luu.data?.ethnicity === 'Tày', luu.data?.ethnicity);
  check('quản trị GHI được nhóm máu', luu.data?.bloodType === 'O', luu.data?.bloodType);

  // Cùng một luật "không gửi ≠ xoá" như mục [4]: màn hình cũ còn trong bộ nhớ
  // đệm của điện thoại chưa biết hai ô này, và nó lưu hồ sơ thì không được
  // quét sạch hai cột.
  const chiTen = await req('PUT', '/api/admin/students/s2', { cookie: A, body: { name: luu.data.name } });
  check('SỬA MỖI TÊN THÌ DÂN TỘC CÒN NGUYÊN', chiTen.data?.ethnicity === 'Tày', chiTen.data?.ethnicity);
  check('SỬA MỖI TÊN THÌ NHÓM MÁU CÒN NGUYÊN', chiTen.data?.bloodType === 'O', chiTen.data?.bloodType);

  // Gửi chuỗi rỗng MỚI là xoá — gia đình khai nhầm thì sửa lại được.
  const xoa = await req('PUT', '/api/admin/students/s2', { cookie: A, body: { bloodType: '' } });
  check('gửi chuỗi rỗng MỚI là xoá — chủ ý thì làm được', xoa.data?.bloodType === '', xoa.data?.bloodType);
  check('và xoá nhóm máu KHÔNG kéo theo dân tộc', xoa.data?.ethnicity === 'Tày', xoa.data?.ethnicity);
  await req('PUT', '/api/admin/students/s2', { cookie: A, body: { bloodType: 'O' } });

  check('cô KHÔNG ghi được hai ô này',
    (await req('PUT', '/api/admin/students/s2', { cookie: GV, body: { ethnicity: 'x' } })).status === 403);

  // Ghi xong phải ĐỌC LẠI được ở đúng chỗ màn Sửa hồ sơ lấy dữ liệu, nếu không
  // thì ô mở ra vẫn trắng và người nhập tưởng máy chủ nuốt mất.
  const ds = await req('GET', '/api/admin/students?keCaNghi=1', { cookie: A });
  const be = (ds.data || []).find(x => x.id === 's2');
  check('danh sách của màn Quản trị mang theo cả hai ô',
    be?.ethnicity === 'Tày' && be?.bloodType === 'O', { e: be?.ethnicity, b: be?.bloodType });

  // Và tệp xuất cho Phòng phải thấy đúng thứ vừa nhập — đây là lý do hai cột
  // này tồn tại ngay từ đầu.
  // Tệp CSV không phải JSON nên `req` trả data null — phải đọc thẳng chữ.
  const taiTep = async (d) => {
    const r = await fetch(sv.BASE + d, { headers: { cookie: A } });
    return { status: r.status, chu: await r.text() };
  };
  const csv = await taiTep('/api/admin/students/xuat.csv');
  const dong = csv.chu.split('\n').find(x => x.includes('Tày'));
  check('tệp xuất ra có dòng mang dân tộc vừa nhập', !!dong, csv.status);

  // ---- MÀN HÌNH: hai ô phải CÓ THẬT và phải ĐI THEO khi bấm Lưu ----
  const view = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
  check('màn Sửa hồ sơ có ô Dân tộc', /id="ad-hs-dt"/.test(view));
  check('màn Sửa hồ sơ có ô Nhóm máu', /id="ad-hs-nm"/.test(view));
  check('bấm Lưu là gửi dân tộc lên máy chủ', /ethnicity: document\.getElementById\('ad-hs-dt'\)/.test(view));
  check('bấm Lưu là gửi nhóm máu lên máy chủ', /bloodType: document\.getElementById\('ad-hs-nm'\)/.test(view));
  // Ô nhóm máu để TRỐNG ĐƯỢC, và màn hình phải nói ra điều đó: y tế trường
  // không truyền máu, ghi theo trí nhớ nguy hiểm hơn để trống.
  check('màn hình nói rõ để trống là được, không phải thiếu sót',
    /Bỏ trống an toàn hơn/.test(view) && /cứ để trống/.test(view));

  // ---- ĐƯỜNG NHẬP CSV ĐẦU NĂM ----
  const csvNhap = 'Họ tên,Nhóm,Họ tên phụ huynh,Điện thoại,Dân tộc,Nhóm máu\n'
    + 'Nông Thị Mai,Chồi 2,Nông Văn Sinh,0901222333,Nùng,AB\n';
  const xem = await req('POST', '/api/admin/import/preview', { cookie: A, body: { csv: csvNhap } });
  check('xem trước tệp CSV đọc được cột Dân tộc',
    xem.data?.rows?.[0]?.danToc === 'Nùng', xem.data?.rows?.[0]);
  const nhap = await req('POST', '/api/admin/import/commit', { cookie: A, body: { csv: csvNhap } });
  check('nhập được', nhap.status === 200 && nhap.data?.imported === 1, nhap.data);
  const ds2 = await req('GET', '/api/admin/students?classId=c1', { cookie: A });
  const moi = (ds2.data || []).find(x => x.name === 'Nông Thị Mai');
  check('BÉ NHẬP TỪ CSV CÓ DÂN TỘC — không còn ghi cứng chuỗi rỗng',
    moi?.ethnicity === 'Nùng', moi?.ethnicity);
  check('và có nhóm máu', moi?.bloodType === 'AB', moi?.bloodType);

  // Tệp KHÔNG có hai cột đó vẫn nhập bình thường — tệp đầu năm của trường
  // thường chưa có, và chặn ở đây là làm hỏng đường đang chạy.
  const cuGiuNguyen = await req('POST', '/api/admin/import/commit', {
    cookie: A,
    body: { csv: 'Họ tên,Nhóm,Họ tên phụ huynh,Điện thoại\nLý Gia Bảo,Chồi 2,Lý Văn Nam,0901444555\n' },
  });
  check('TỆP KHÔNG CÓ HAI CỘT ĐÓ VẪN NHẬP ĐƯỢC NHƯ CŨ',
    cuGiuNguyen.status === 200 && cuGiuNguyen.data?.imported === 1, cuGiuNguyen.data);

  // Mẫu tải về phải có sẵn hai cột, nếu không thì người điền không biết là
  // điền được.
  const mau = await taiTep('/api/admin/import/template');
  check('tệp mẫu tải về đã có hai cột đó',
    /Dân tộc/.test(mau.chu) && /Nhóm máu/.test(mau.chu), mau.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
