// Bài canh NHẬN MỘT BÉ NHẬP HỌC GIỮA NĂM (Đ170).
//
// Chạy bằng:  npm run test:nhan-mot-be
//
// NHÀ TRƯỜNG XIN GÌ
//
// Bảng phân quyền 07/09 cho *"Admin cơ sở NHẬP hồ sơ bé"*. Nhưng cả kho mã chỉ
// có MỘT đường tạo bé: nhập hàng loạt từ tệp CSV. Một bé nhập học giữa tháng 10
// thì văn phòng phải mở Excel, gõ đúng tên cột, lưu đúng bảng mã UTF-8, rồi tải
// lên — để tạo đúng một hồ sơ. Thực tế là họ sẽ nhờ người khác hoặc để đó, và
// bé đi học mấy hôm rồi mới có trong app.
//
// BỐN ĐIỀU CỐ Ý, CẢ BỐN CANH Ở ĐÂY
//
// [2] DÙNG LẠI ĐÚNG ĐƯỜNG CỦA TỆP CSV, KHÔNG VIẾT ĐƯỜNG THỨ HAI. Nhận một đứa
//     trẻ vào trường là bốn việc phải làm đúng thứ tự: gộp phụ huynh trùng số
//     điện thoại, tạo hồ sơ, MỞ KHOẢNG LỊCH SỬ NHÓM, nối bé với phụ huynh.
//     Việc thứ ba hỏng lặng lẽ nhất — thiếu nó thì bé không có đoạn đầu trong
//     lịch sử nhóm, và mọi thứ đọc theo "bé học nhóm nào hồi tháng ấy" đều hụt
//     đúng một bé mà không ai báo. Mục này đo bằng cách NHẬN CÙNG MỘT BÉ qua
//     hai đường rồi so kết quả.
//
// [3] TRÙNG LÀ CẢNH BÁO, KHÔNG PHẢI LỖI — y như đường nhập tệp. Có thật chuyện
//     hai bé trùng cả họ tên, ngày sinh lẫn nhóm; văn phòng phải nói được
//     "đúng, cứ nhận" thay vì bị chặn cứng rồi đi nhờ người khác.
//
// [4] VĂN PHÒNG CƠ SỞ VẪN NHẬP ĐƯỢC dù Đ168 vừa chặn họ SỬA phần nhân thân.
//     Không mâu thuẫn: bảng của trường tách đúng hai chữ ấy.
//
// [5] TẦNG CƠ SỞ — không nhận bé vào nhóm của cơ sở khác.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhan-mot-be');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Quản trị', 'nb_qt');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'nb_vp');
const mkQL = taoQuanTri(DIR, 'Quản lý CS1', 'nb_ql');
datChucVu(DIR, 'nb_vp', 'vanphong-coso');
datChucVu(DIR, 'nb_ql', 'quanly-coso');
khoaVaoCoSo(DIR, 'nb_vp', 'cs1');
khoaVaoCoSo(DIR, 'nb_ql', 'cs1');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4863), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

function doc(sql, args = []) {
  const c = new Database(CSDL);
  try { return c.prepare(sql).all(args); } finally { c.close(); }
}

try {
  const QT = await vao('nb_qt', mkQT);
  const VP = await vao('nb_vp', mkVP);
  const QL = await vao('nb_ql', mkQL);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Nhận được một bé bằng một lần điền, không cần tệp nào');
  {
    const r = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: {
        hoTen: 'Trần Bảo Ngọc', tenLop: 'Chồi 2', ngaySinh: '2022-04-15',
        gioiTinh: 'Nữ', phHoTen: 'Trần Văn Hùng', phSdt: '0911222333',
        diaChi: '12 Lê Lợi',
      },
    });
    check('nhận được bé', r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);
    check('bé vào đúng nhóm vừa chọn', !!r.data?.classId, r.data?.classId);
    check('và hồ sơ mang đủ những gì vừa điền',
      r.data?.name === 'Trần Bảo Ngọc' && r.data?.dob === '2022-04-15'
      && r.data?.address === '12 Lê Lợi', r.data);

    // PHIẾU TÀI KHOẢN — tạo hồ sơ bé mà gia đình không vào được app thì mới
    // xong một nửa việc.
    check('trả về phiếu tài khoản cho gia đình',
      !!r.data?.taiKhoan?.username && !!r.data?.taiKhoan?.matKhau, r.data?.taiKhoan);
    check('và mật khẩu ấy đăng nhập được thật',
      (await login(r.data.taiKhoan.username, r.data.taiKhoan.matKhau)).cookie !== undefined,
      r.data.taiKhoan.username);

    // Bốn việc của một lần nhận bé, đo TỪNG VIỆC ở tầng dữ liệu.
    const sid = r.data.id;
    check('① hồ sơ bé có trong bảng students',
      doc('SELECT id FROM students WHERE id = ?', [sid]).length === 1, sid);
    check('② bé được nối với phụ huynh',
      doc('SELECT parentId FROM student_parents WHERE studentId = ?', [sid]).length === 1, sid);
    const khoang = doc('SELECT * FROM student_class_periods WHERE studentId = ?', [sid]);
    check('③ MỞ KHOẢNG LỊCH SỬ NHÓM ngay từ hôm nay — việc dễ quên nhất',
      khoang.length === 1 && !!khoang[0].tu && !khoang[0].den, khoang);
    check('④ tài khoản phụ huynh bị bắt đổi mật khẩu ở lần đăng nhập đầu',
      doc("SELECT mustChangePassword FROM users WHERE username = ?",
        [r.data.taiKhoan.username])[0]?.mustChangePassword === 1,
      r.data.taiKhoan.username);
  }

  // =========================================================================
  console.log('\n[2] Nhà đã có con học ở trường thì DÙNG LẠI tài khoản cũ');
  {
    const r = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: { hoTen: 'Trần Bảo Long', tenLop: 'Chồi 2', phHoTen: 'Trần Văn Hùng', phSdt: '0911222333' },
    });
    check('nhận được bé thứ hai của cùng một nhà', r.status === 201, r.status);
    check('KHÔNG sinh mật khẩu mới — gia đình không phải nhớ hai mật khẩu',
      /đã có tài khoản/.test(r.data?.taiKhoan?.matKhau || ''), r.data?.taiKhoan);

    const cha = doc("SELECT id FROM users WHERE phone = '0911222333' AND role = 'parent'");
    check('và vẫn chỉ có ĐÚNG MỘT tài khoản cho số điện thoại ấy', cha.length === 1, cha.length);
    check('tài khoản ấy nay nối với hai bé',
      doc('SELECT studentId FROM student_parents WHERE parentId = ?', [cha[0].id]).length === 2,
      doc('SELECT studentId FROM student_parents WHERE parentId = ?', [cha[0].id]));
  }

  // =========================================================================
  console.log('\n[3] Hai đường nhận bé phải RA CÙNG MỘT KẾT QUẢ');
  {
    // Đây là mục quan trọng nhất của bài. Đường một bé dùng lại đúng bộ soát và
    // đúng thân nhận bé của đường nhập tệp; mục này chứng minh điều đó bằng
    // cách nhận hai bé giống hệt nhau qua hai đường rồi so từng mảnh.
    const csv = 'Họ tên,Nhóm,Họ tên phụ huynh,Điện thoại,Ngày sinh,Giới tính,Địa chỉ\n'
      + 'Lê Minh Tệp,Chồi 2,Lê Văn Tệp,0977000111,2022-06-01,Nam,5 Trần Phú\n';
    const tep = await req('POST', '/api/admin/import/commit', { cookie: VP, body: { csv } });
    check('nhập được một bé bằng tệp để so', tep.status === 200 && tep.data?.imported === 1, tep.data);

    const le = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: {
        hoTen: 'Lê Minh Lẻ', tenLop: 'Chồi 2', phHoTen: 'Lê Văn Lẻ', phSdt: '0977000222',
        ngaySinh: '2022-06-01', gioiTinh: 'Nam', diaChi: '5 Trần Phú',
      },
    });
    check('và nhận được một bé bằng đường lẻ', le.status === 201, le.status);

    const a = doc("SELECT * FROM students WHERE name = 'Lê Minh Tệp'")[0];
    const b = doc("SELECT * FROM students WHERE name = 'Lê Minh Lẻ'")[0];
    check('đối chứng — dựng được cả hai bé để so', !!a && !!b, { a: !!a, b: !!b });
    for (const cot of ['classId', 'dob', 'gender', 'address', 'active', 'ethnicity', 'bloodType']) {
      check(`hai đường ghi CÙNG MỘT giá trị cho cột "${cot}"`, a[cot] === b[cot],
        { tep: a[cot], le: b[cot] });
    }
    check('cả hai đều có ảnh đại diện sinh theo giới tính',
      JSON.stringify(a.avatar) === JSON.stringify(b.avatar), { tep: a.avatar, le: b.avatar });

    const ka = doc('SELECT * FROM student_class_periods WHERE studentId = ?', [a.id]);
    const kb = doc('SELECT * FROM student_class_periods WHERE studentId = ?', [b.id]);
    check('CẢ HAI đều được mở khoảng lịch sử nhóm, cùng một ngày',
      ka.length === 1 && kb.length === 1 && ka[0].tu === kb[0].tu,
      { tep: ka, le: kb });
    check('và cả hai đều được nối với phụ huynh',
      doc('SELECT 1 FROM student_parents WHERE studentId = ?', [a.id]).length === 1
      && doc('SELECT 1 FROM student_parents WHERE studentId = ?', [b.id]).length === 1, 'student_parents');
  }

  // =========================================================================
  console.log('\n[4] Soát đầu vào — cùng câu chữ với đường nhập tệp');
  {
    const thieuTen = await req('POST', '/api/admin/students', {
      cookie: VP, body: { tenLop: 'Chồi 2', phHoTen: 'A', phSdt: '0900000001' },
    });
    check('thiếu họ tên của bé thì từ chối',
      thieuTen.status === 400 && /họ tên của bé/i.test(thieuTen.data?.error || ''), thieuTen.data?.error);

    const thieuPh = await req('POST', '/api/admin/students', {
      cookie: VP, body: { hoTen: 'Bé A', tenLop: 'Chồi 2' },
    });
    check('thiếu họ tên phụ huynh thì từ chối',
      thieuPh.status === 400 && /phụ huynh/i.test(thieuPh.data?.error || ''), thieuPh.data?.error);

    const lopLa = await req('POST', '/api/admin/students', {
      cookie: VP, body: { hoTen: 'Bé B', tenLop: 'Nhóm Không Có Thật', phHoTen: 'B', phSdt: '0900000002' },
    });
    check('nhóm chưa có thì KHÔNG tự tạo nhóm — chỉ sang đường tạo nhóm',
      lopLa.status === 400 && /tạo nhóm/i.test(lopLa.data?.error || ''), lopLa.data?.error);

    // Mã trùng: đường nhập tệp coi là LỖI, đường này phải y hệt.
    const coMa = await req('POST', '/api/admin/students', {
      cookie: VP, body: { hoTen: 'Bé C', tenLop: 'Chồi 2', ma: 'MA-DUY-NHAT-1', phHoTen: 'C', phSdt: '0900000003' },
    });
    check('nhận được một bé có mã', coMa.status === 201, coMa.status);
    const maTrung = await req('POST', '/api/admin/students', {
      cookie: VP, body: { hoTen: 'Bé D', tenLop: 'Chồi 2', ma: 'MA-DUY-NHAT-1', phHoTen: 'D', phSdt: '0900000004' },
    });
    check('mã của bé bị trùng thì từ chối — hai bé khác nhau trông như một',
      maTrung.status === 400 && /mã/i.test(maTrung.data?.error || ''), maTrung.data?.error);
  }

  // =========================================================================
  console.log('\n[5] Bé trùng tên là CẢNH BÁO, không phải lỗi');
  {
    const than = {
      hoTen: 'Phạm Trùng Tên', tenLop: 'Chồi 2', ngaySinh: '2022-01-01',
      phHoTen: 'Phạm Văn X', phSdt: '0933000111',
    };
    const lan1 = await req('POST', '/api/admin/students', { cookie: VP, body: than });
    check('nhận được bé lần đầu', lan1.status === 201, lan1.status);

    const lan2 = await req('POST', '/api/admin/students', { cookie: VP, body: than });
    check('lần hai máy HỎI LẠI chứ không nhận ngay', lan2.status === 409, lan2.status);
    check('và nói rõ vì sao nghi trùng', /đã có trong hệ thống/i.test(lan2.data?.error || ''), lan2.data?.error);
    check('chưa xác nhận thì KHÔNG tạo thêm hồ sơ nào',
      doc("SELECT id FROM students WHERE name = 'Phạm Trùng Tên'").length === 1,
      doc("SELECT id FROM students WHERE name = 'Phạm Trùng Tên'").length);

    const lan3 = await req('POST', '/api/admin/students', {
      cookie: VP, body: { ...than, xacNhanTrung: true },
    });
    check('xác nhận rồi thì nhận được — có thật chuyện hai bé trùng cả tên lẫn ngày sinh',
      lan3.status === 201, lan3.status);
    check('và bây giờ mới có hai hồ sơ',
      doc("SELECT id FROM students WHERE name = 'Phạm Trùng Tên'").length === 2,
      doc("SELECT id FROM students WHERE name = 'Phạm Trùng Tên'").length);
  }

  // =========================================================================
  console.log('\n[6] Ai nhận được bé, và tầng cơ sở');
  {
    const ql = await req('POST', '/api/admin/students', {
      cookie: QL, body: { hoTen: 'Bé QL', tenLop: 'Chồi 2', phHoTen: 'QL', phSdt: '0944000111' },
    });
    check('quản lý cơ sở nhận được bé', ql.status === 201, ql.status);
    const qt = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé QT', tenLop: 'Chồi 2', phHoTen: 'QT', phSdt: '0944000222' },
    });
    check('ban giám hiệu nhận được bé', qt.status === 201, qt.status);

    const co = await req('POST', '/api/admin/students', {
      cookie: GV, body: { hoTen: 'Bé cô', tenLop: 'Chồi 2', phHoTen: 'Cô', phSdt: '0944000333' },
    });
    check('CÔ không nhận được bé vào trường', co.status === 403, co.status);
    const ph = await req('POST', '/api/admin/students', {
      cookie: PH, body: { hoTen: 'Bé nhà', tenLop: 'Chồi 2', phHoTen: 'Nhà', phSdt: '0944000444' },
    });
    check('gia đình càng không', ph.status === 403, ph.status);

    // TẦNG CƠ SỞ: "Mầm 1" là nhóm duy nhất của cơ sở 2 trong dữ liệu mẫu.
    const lan = await req('POST', '/api/admin/students', {
      cookie: VP, body: { hoTen: 'Bé lấn', tenLop: 'Mầm 1', phHoTen: 'X', phSdt: '0944000555' },
    });
    check('văn phòng cơ sở 1 KHÔNG nhận được bé vào nhóm của cơ sở 2',
      lan.status === 400 || lan.status === 403, `${lan.status} ${JSON.stringify(lan.data)}`);
    check('và câu từ chối nói đúng chuyện cơ sở',
      /cơ sở/i.test(lan.data?.error || ''), lan.data?.error);
    check('không hồ sơ nào bị tạo ra từ lượt bị chặn',
      doc("SELECT id FROM students WHERE name = 'Bé lấn'").length === 0, 'Bé lấn');

    // Đối chứng: ban giám hiệu thì nhận được vào chính nhóm ấy — nếu không thì
    // phép kiểm trên xanh cả khi máy chặn nhầm tất cả mọi người.
    const cap1 = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé cơ sở 2', tenLop: 'Mầm 1', phHoTen: 'Y', phSdt: '0944000666' },
    });
    check('đối chứng — ban giám hiệu VẪN nhận được bé vào nhóm cơ sở 2',
      cap1.status === 201, `${cap1.status} ${JSON.stringify(cap1.data)}`);
  }
  // =========================================================================
  console.log('\n[7] Ba lỗi rà soát đối kháng bắt được, và bản vá của chúng');
  {
    // (a) MÀN HÌNH GỬI MÃ NHÓM, KHÔNG BẮT MÁY CHỦ ĐOÁN LẠI THEO TÊN.
    //
    // Ba cơ sở đặt trùng tên nhóm là chuyện thường. Khi ấy bộ soát tra theo TÊN
    // từ chối ("nhóm có ở nhiều cơ sở") — đúng cho tệp CSV, sai cho đường này,
    // nơi người dùng đang đứng TRONG nhóm và đã chọn xong rồi.
    const trungTen = await req('POST', '/api/admin/classes', {
      cookie: QT, body: { name: 'Chồi 2', campusId: 'cs2' },
    });
    check('dựng được một nhóm TRÙNG TÊN ở cơ sở khác', trungTen.status === 200 || trungTen.status === 201,
      `${trungTen.status} ${JSON.stringify(trungTen.data)}`);

    const theoTen = await req('POST', '/api/admin/students', {
      cookie: QT, body: { hoTen: 'Bé theo tên', tenLop: 'Chồi 2', phHoTen: 'A', phSdt: '0955000111' },
    });
    check('đối chứng — chỉ gửi TÊN thì máy chủ từ chối vì tên có ở hai cơ sở',
      theoTen.status === 400 && /nhiều cơ sở/i.test(theoTen.data?.error || ''), theoTen.data?.error);

    const theoMa = await req('POST', '/api/admin/students', {
      cookie: QT,
      body: { hoTen: 'Bé theo mã', classId: 'c1', tenLop: 'Chồi 2', phHoTen: 'B', phSdt: '0955000222' },
    });
    check('GỬI MÃ NHÓM thì nhận được ngay, không phải đoán',
      theoMa.status === 201, `${theoMa.status} ${JSON.stringify(theoMa.data)}`);
    check('và bé vào ĐÚNG nhóm đã chọn, không phải nhóm trùng tên ở cơ sở kia',
      theoMa.data?.classId === 'c1', theoMa.data?.classId);

    // Mã nhóm vẫn phải qua tầng cơ sở.
    const maNgoai = await req('POST', '/api/admin/students', {
      cookie: VP, body: { hoTen: 'Bé lấn mã', classId: trungTen.data?.id || 'c3', phHoTen: 'C', phSdt: '0955000333' },
    });
    check('nhưng mã nhóm của cơ sở khác thì vẫn bị chặn — mã không phải đường vòng',
      maNgoai.status === 403 || maNgoai.status === 404, maNgoai.status);

    // (b) MÀN HÌNH KHÔNG ĐƯỢC ĐÓNG PHIẾU MẬT KHẨU NGAY SAU KHI HIỆN.
    //
    // `UI.modal()` gọi `closeModal()` ở dòng đầu, nên vẽ lại danh sách nhóm khi
    // phiếu đang mở là ĐÓNG MẤT phiếu — và mật khẩu ấy không xem lại được, tức
    // gia đình không đăng nhập được nữa.
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
    const dau = v.indexOf('const gui = async (xacNhanTrung)');
    const than = v.slice(dau, v.indexOf('\n    };', dau));
    check('màn hình KHÔNG làm mới danh sách khi phiếu mật khẩu đang mở',
      !/await this\.lamMoiLop\(\);\s*$/m.test(than), than.slice(-200));
    check('mà chờ bấm Xong rồi mới làm mới', /nb-xong/.test(than) && /lamMoiLop/.test(than), 'admin.js');

    // (c) MÀN HÌNH CÓ GỬI classId THẬT.
    check('màn hình gửi mã nhóm kèm theo, không chỉ gửi tên', /^\s+classId,$/m.test(v), 'admin.js');
  }

  // =========================================================================
  console.log('\n[8] Vòng rà đối kháng thứ hai — nối bé vào ĐÚNG nhà');
  {
    // (1) SỐ ĐIỆN THOẠI GÕ CÓ DẤU CÁCH LÀ NHÀ CÓ HAI TÀI KHOẢN.
    //
    // Ô nhập hứa thẳng: *"Nhà đã có con học ở trường thì dùng lại đúng số này —
    // máy nối bé mới vào đúng tài khoản cũ, gia đình không phải nhớ hai mật
    // khẩu."* Bản đầu so khớp chuỗi NGUYÊN VĂN, nên `0911 222 333` và
    // `0911222333` là hai nhà khác nhau: hai con nằm ở hai tài khoản, và lời
    // hứa in ngay trên ô nhập thành sai. Dán số từ Excel hay từ danh bạ là ra
    // đúng các dạng có dấu cách ấy.
    const cachDau = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: { hoTen: 'Trần Bảo Ngọc', tenLop: 'Chồi 2', phHoTen: 'Trần Văn Hùng', phSdt: '0911 222 333' },
    });
    check('nhận được bé khi số điện thoại gõ có dấu cách', cachDau.status === 201, cachDau.status);
    check('VÀ VẪN NỐI VÀO TÀI KHOẢN CŨ, không sinh mật khẩu mới',
      cachDau.data?.taiKhoan?.daCoTaiKhoan === true, cachDau.data?.taiKhoan);

    const nha = doc(`SELECT id FROM users WHERE role = 'parent'
        AND REPLACE(REPLACE(phone, ' ', ''), '-', '') = '0911222333'`);
    check('nhà ấy VẪN CHỈ CÓ MỘT tài khoản', nha.length === 1, nha.length);

    const chamGach = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: { hoTen: 'Trần Bảo Minh', tenLop: 'Chồi 2', phHoTen: 'Trần Văn Hùng', phSdt: '0911.222-333' },
    });
    check('dấu chấm và dấu gạch cũng vậy', chamGach.data?.taiKhoan?.daCoTaiKhoan === true,
      chamGach.data?.taiKhoan);
    check('sau cả ba lượt vẫn đúng MỘT tài khoản cho nhà ấy',
      doc(`SELECT id FROM users WHERE role = 'parent'
             AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '.', ''), '-', '') = '0911222333'`).length === 1);

    // ĐỐI CHỨNG — chỉ bỏ CÁCH TRÌNH BÀY, không gộp bừa hai số khác nhau.
    const khac = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: { hoTen: 'Lê Khác Nhà', tenLop: 'Chồi 2', phHoTen: 'Lê Thị Y', phSdt: '0911222334' },
    });
    check('số LỆCH MỘT CHỮ SỐ vẫn là một nhà khác, có mật khẩu riêng',
      khac.data?.taiKhoan?.daCoTaiKhoan === false && !!khac.data?.taiKhoan?.matKhau,
      khac.data?.taiKhoan);

    // (2) PHIẾU PHẢI IN RA THỨ DUY NHẤT LỘ RA VIỆC GÕ NHẦM SỐ.
    //
    // Máy gộp phụ huynh theo số điện thoại, nên gõ nhầm một chữ số là nối bé
    // vào tài khoản của nhà NGƯỜI KHÁC — nhà ấy mở app lên là thấy ảnh, nhật ký
    // và hồ sơ sức khoẻ của một đứa trẻ không phải con mình. Dữ liệu trẻ dưới 6
    // tuổi, thuộc nhóm nhạy cảm theo Nghị định 13/2023.
    check('máy chủ trả về TÊN phụ huynh được nối vào',
      cachDau.data?.taiKhoan?.phuHuynh === 'Trần Văn Hùng', cachDau.data?.taiKhoan?.phuHuynh);
    check('và cả SỐ ĐIỆN THOẠI đang lưu của tài khoản ấy',
      !!cachDau.data?.taiKhoan?.phuHuynhSdt, cachDau.data?.taiKhoan);

    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8')
      .split('\n').filter(d => !/^\s*(\/\/|<!--)/.test(d)).join('\n');
    check('phiếu IN RA tên phụ huynh', /dongSoNgay\('Phụ huynh'/.test(v), 'admin.js');
    check('và in cả số điện thoại của tài khoản được nối vào',
      /tk\.phuHuynhSdt/.test(v), 'admin.js');
    check('nhà đã có tài khoản thì phiếu nói thẳng, KHÔNG nhét câu ấy vào ô Mật khẩu',
      /tk\.daCoTaiKhoan/.test(v), 'admin.js');

    // (3) HỎI LẠI THEO MÃ LỖI, KHÔNG THEO CÂU CHỮ.
    //
    // Bản đầu dò chuỗi "đã có" để nhận ra cảnh báo 409, mà câu 400 của mã bé
    // trùng — *mã của bé "A1" đã có trong hệ thống* — cũng mang đúng chữ ấy.
    // Người dùng bấm Đồng ý, máy gửi lại y nguyên, máy chủ từ chối y nguyên:
    // một cái vòng không có lối ra, và câu hỏi thì gợi ý rằng bấm Đồng ý sẽ
    // xong việc.
    // Lấy một mã CÓ THẬT trong sổ chứ không gõ bừa một chuỗi: mã bịa ra thì
    // máy chủ nhận luôn, và phép kiểm bên dưới sẽ đo một tình huống không tồn tại.
    const maCoThat = doc("SELECT code FROM students WHERE code IS NOT NULL AND code <> '' LIMIT 1")[0]?.code;
    check('dựng được tình huống: lấy được một mã của bé đang có trong sổ', !!maCoThat, maCoThat);
    const maTrung = await req('POST', '/api/admin/students', {
      cookie: VP,
      body: { hoTen: 'Nguyễn Mã Trùng', tenLop: 'Chồi 2', ma: maCoThat, phHoTen: 'Nguyễn Z', phSdt: '0955000111' },
    });
    check('mã của bé đã có thì máy trả 400 — sai thật, không phải cảnh báo',
      maTrung.status === 400, `${maTrung.status} ${JSON.stringify(maTrung.data)}`);
    check('đối chứng — câu 400 ấy CŨNG mang chữ "đã có", đúng chỗ cách dò cũ bắt nhầm',
      /đã có/.test(maTrung.data?.error || ''), maTrung.data?.error);
    check('màn hình nay hỏi lại theo MÃ LỖI 409, không dò chữ "đã có"',
      /err\.status === 409/.test(v) && !/\/trùng tên\|đã có\//.test(v), 'admin.js');
    check('và giữ một lưới đỡ theo câu chữ cho máy còn bản api.js đời cũ',
      /\^Có vẻ bé này/.test(v), 'admin.js');
    check('API gắn mã lỗi vào chính đối tượng lỗi',
      /err\.status = res\.status/.test(fs.readFileSync(path.join(GOC, 'public/js/api.js'), 'utf8')),
      'api.js');
  }

  // =========================================================================
  console.log('\n[9] Vòng rà đối kháng thứ ba — phiếu của ĐƯỜNG NHẬP TỆP, và nút bấm hai lần');
  {
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8')
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');

    // (1) Ô MẬT KHẨU CHỈ ĐƯỢC CHỨA MẬT KHẨU — Ở CẢ HAI PHIẾU.
    //
    // Đ173 vá điều này ở phiếu MỘT bé. Phiếu của đường NHẬP TỆP — đường dùng
    // nhiều hơn hẳn, mấy trăm nhà mỗi đầu năm — vẫn in chuỗi "(đã có tài khoản
    // từ trước)" vào đúng cột Mật khẩu, ngay dưới dòng bảo chép ra giấy phát
    // cho phụ huynh, và chép nguyên chuỗi ấy vào tệp CSV đem đi in. Mọi nhà có
    // con lớn đang học đều rơi vào nhánh gộp, nên đây là trường hợp THƯỜNG.
    const iPhieu = v.indexOf('hienPhieu(r) {');
    const thanPhieu = iPhieu < 0 ? '' : v.slice(iPhieu, v.indexOf('\n  },', iPhieu));
    check('dựng được thân hàm phiếu của đường nhập tệp để soi', iPhieu > 0, iPhieu);
    check('PHIẾU HÀNG LOẠT không còn in thẳng t.matKhau vào ô Mật khẩu',
      /t\.daCoTaiKhoan/.test(thanPhieu), thanPhieu.slice(0, 300));
    check('nhà đã có tài khoản thì ô Mật khẩu nói thẳng, không giả vờ là một mật khẩu',
      /Nhà đã có tài khoản/.test(thanPhieu), thanPhieu.slice(0, 300));
    check('tệp CSV đem đi in cũng để TRỐNG ô mật khẩu ở những dòng ấy',
      /t\.daCoTaiKhoan \? '' : t\.matKhau/.test(thanPhieu), thanPhieu.slice(0, 400));
    check('và phiếu có cột Điện thoại để đối chiếu đúng nhà',
      /<th>Điện thoại<\/th>/.test(thanPhieu) && /t\.phuHuynhSdt/.test(thanPhieu),
      thanPhieu.slice(0, 300));
    check('phiếu nói ra có bao nhiêu nhà rơi vào nhánh gộp',
      /daCo\.length/.test(thanPhieu), thanPhieu.slice(0, 300));

    // Và máy chủ phải thật sự gửi hai trường ấy trong ĐƯỜNG NHẬP TỆP, không chỉ
    // trong đường một bé — hai đường dùng chung `nhanMotBe` nên đây là đối chứng.
    const tep = await req('POST', '/api/admin/import/commit', {
      cookie: VP,
      body: {
        csv: 'Họ tên,Nhóm,Họ tên phụ huynh,Điện thoại\n'
          + 'Vũ Nhập Tệp,Chồi 2,Trần Văn Hùng,0911222333\n',
      },
    });
    check('nhập được một dòng qua đường tệp', tep.status === 200 || tep.status === 201,
      `${tep.status} ${JSON.stringify(tep.data).slice(0, 200)}`);
    const dong = (tep.data?.taiKhoan || [])[0];
    check('ĐƯỜNG TỆP cũng trả về cờ "nhà đã có tài khoản"', dong?.daCoTaiKhoan === true, dong);
    check('và cũng trả về số điện thoại của tài khoản được nối vào',
      !!dong?.phuHuynhSdt, dong);

    // (2) NÚT NHẬN BÉ KHOÁ NGAY, VÀ BIỂU MẪU ĐƯỢC CHỤP MỘT LẦN.
    //
    // Mạng chậm → bấm hai lần → lượt một mở phiếu (UI.modal gọi closeModal nên
    // các ô nb-* rời khỏi trang) → lượt hai nhận 409 → hỏi lại → `gui(true)`
    // đọc một ô không còn nữa → màn hình của văn phòng hiện nguyên một câu
    // tiếng Anh của máy.
    check('biểu mẫu được CHỤP MỘT LẦN lúc bấm, không đọc lại ô nhập ở lượt gửi sau',
      /const chupBieuMau = \(\) => \(\{/.test(v) && /\{ \.\.\.banChup, xacNhanTrung \}/.test(v),
      'admin.js');
    check('và bản chụp vẫn mang MÃ NHÓM, không chỉ mang tên',
      /^\s+classId,$/m.test(v), 'admin.js');
    check('nút Nhận bé KHOÁ LẠI ngay từ cú bấm đầu', /nutNhan\.disabled = true/.test(v), 'admin.js');
    check('nhưng MỞ LẠI khi không nhận được — gõ thiếu một ô rồi điền nốt thì bấm lại được',
      (v.match(/moLaiNut\(\)/g) || []).length >= 2, 'admin.js');
  }

} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Nhận một bé nhập học giữa năm (Đ170)');
