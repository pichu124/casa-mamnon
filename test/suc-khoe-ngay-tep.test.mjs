// Bài canh SIẾT NGÀY SỬA và TỆP CÂN ĐO (Đ205 — việc 10, 11).
//
// Chạy bằng:  npm run test:suc-khoe-ngay-tep
//
// VIỆC 10 CÓ MỘT CÁI BẪY, VÀ NÓ NẰM Ở CHỮ "NGÀY".
//
// Nhà trường xin: cô chỉ sửa được ghi nhận sức khoẻ trong chính ngày ghi. Đọc
// nhanh thì khoá theo cột `date` của bảng là xong. Nhưng `date` là NGÀY KHÁM,
// không phải ngày cô gõ vào máy — và app CỐ Ý cho nhập bù kết quả khám của
// trạm y tế làm cách đó vài tuần. Khoá theo ngày khám là:
//
//   cô gõ kết quả khám ngày 01/09 vào hôm nay → bản ghi VỪA SINH RA ĐÃ KHOÁ,
//   gõ nhầm một chữ số cũng phải đi nhờ văn phòng.
//
// Mục [2] đo đúng cảnh đó, và nó là mục quan trọng nhất của cả bài.
//
// VÀ ĐƯỜNG THU HỒI KHÔNG ĐƯỢC KHOÁ THEO NGÀY VỚI NHÀ TRƯỜNG. Nó sinh ra để
// hiệu trưởng gỡ một ghi nhận kiểu "sốt, nghi tay chân miệng" bấm nhầm sang bé
// khác — thứ chỉ lộ ra sau vài ngày, khi gia đình bé kia đọc thấy. Khoá nó
// theo ngày là bịt đúng đường sửa sai duy nhất.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('suc-khoe-ngay-tep');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng S', 's_qt');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2 S', 's_cs2');
khoaVaoCoSo(DIR, 's_cs2', 'cs2');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4820), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const NGAY = HOM_NAY();

// `taoReq` chỉ đọc được thân JSON, mà mẫu cân đo là CSV — nên tải mẫu phải
// dùng fetch thẳng. Cùng cách `test:tien-an` đọc tệp đối chiếu tháng.
async function taiCsv(duong, cookie) {
  const r = await fetch(`${sv.BASE}${duong}`, { headers: { cookie } });
  return { status: r.status, kieu: r.headers.get('content-type') || '', chu: await r.text() };
}

// Lùi ngày GÕ của một bản ghi về quá khứ — dựng cảnh "cô ghi hôm kia".
// Đi qua cơ sở dữ liệu vì không đường API nào cho sửa dấu thời gian, và đó
// đúng là điều nên thế.
function luiNgayGhi(healthId, ngayStr) {
  const conn = new Database(CSDL);
  try {
    // Lùi CẢ HAI cột. `ngayGhi` là cột đem ra so; `luc` là dấu thời gian để
    // tra. Lùi mỗi `luc` thì bản ghi vẫn tính là ghi hôm nay — đúng như bản
    // đầu của bài này làm, và nó báo đỏ ngay.
    conn.prepare('UPDATE health_ghi_luc SET luc = ?, ngayGhi = ? WHERE healthId = ?')
      .run(`${ngayStr}T08:00:00.000Z`, ngayStr, healthId);
  } finally { conn.close(); }
}

// Dòng ghi KIỂU CŨ: có `luc` nhưng chưa có `ngayGhi` — đúng hình dạng của
// bản ghi tạo ra trước khi cột ấy có mặt. Dùng để đo đường lùi.
function xoaNgayGhi(healthId) {
  const conn = new Database(CSDL);
  try { conn.prepare("UPDATE health_ghi_luc SET ngayGhi = '' WHERE healthId = ?").run(healthId); }
  finally { conn.close(); }
}
function soDong(studentId, date) {
  const conn = new Database(CSDL);
  try {
    // ĐẾM ĐÚNG DÒNG "Cân đo tháng", không đếm mọi ghi nhận khám cùng ngày —
    // mục [1] và [2] đã ghi mấy bản ghi khác cùng ngày, và đếm gộp vào là phép
    // đo "không sinh dòng thứ hai" đo nhầm thứ.
    const tieuDe = `Cân đo tháng ${date.slice(5, 7)}/${date.slice(0, 4)}`;
    return conn.prepare("SELECT COUNT(*) AS n FROM health WHERE studentId = ? AND date = ? AND title = ?")
      .get(studentId, date, tieuDe).n;
  } finally { conn.close(); }
}
// Mã của bé do dữ liệu mẫu sinh theo NĂM, nên không gõ cứng được — hỏi thẳng
// cơ sở dữ liệu. Gõ cứng "MN001" là bài canh xanh hôm nay và đỏ sang năm.
function maCua(studentId) {
  const conn = new Database(CSDL);
  try { return (conn.prepare('SELECT code FROM students WHERE id = ?').get(studentId) || {}).code || ''; }
  finally { conn.close(); }
}
function canDo(studentId, date) {
  const conn = new Database(CSDL);
  try {
    const tieuDe = `Cân đo tháng ${date.slice(5, 7)}/${date.slice(0, 4)}`;
    return conn.prepare('SELECT height, weight FROM health WHERE studentId = ? AND date = ? AND title = ? ORDER BY rowid DESC')
      .get(studentId, date, tieuDe) || null;
  } finally { conn.close(); }
}

try {
  const d0 = await login('s_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('s_qt', 'quantri2026')).cookie;
  const d2 = await login('s_cs2', mkCS2);
  await req('POST', '/api/auth/set-new-password', { cookie: d2.cookie, body: { newPassword: 'quantri2026' } });
  const CS2 = (await login('s_cs2', 'quantri2026')).cookie;
  const CO = (await login('giaovien', '123456')).cookie;     // cô của c1
  const CO4 = (await login('giaovien4', '123456')).cookie;   // cô của c4

  // =========================================================================
  console.log('\n[1] CÔ SỬA ĐƯỢC BẢN GHI CỦA CHÍNH NGÀY HÔM NAY');
  {
    const ghi = await req('POST', '/api/health', {
      cookie: CO,
      body: { studentId: 's1', type: 'checkup', title: 'Khám hôm nay', height: 100, weight: 16 },
    });
    check('cô ghi được một ghi nhận mới', ghi.status === 200 || ghi.status === 201,
      `${ghi.status} ${JSON.stringify(ghi.data).slice(0, 140)}`);
    const id = ghi.data.id;
    const sua = await req('PUT', `/api/health/${id}`, { cookie: CO, body: { title: 'Sửa lại tiêu đề' } });
    check('SỬA NGAY TRONG NGÀY thì được', sua.status === 200, `${sua.status} ${JSON.stringify(sua.data).slice(0, 140)}`);
    const thu = await req('DELETE', `/api/health/${id}`, { cookie: CO });
    check('thu hồi ngay trong ngày cũng được', thu.status === 200, thu.status);

    // Và máy chủ có GHI LẠI ngày gõ — không có dòng này thì khoá lùi về ngày
    // khám, tức là mục [2] bên dưới đo vào chỗ rỗng.
    const conn = new Database(CSDL);
    let co = null;
    try { co = conn.prepare('SELECT * FROM health_ghi_luc WHERE healthId = ?').get(id) || null; }
    finally { conn.close(); }
    check('máy chủ có ghi lại NGÀY GÕ của bản ghi', !!co && !!co.luc, JSON.stringify(co || {}));
    check('và ghi lại cả người gõ', !!(co && co.nguoiGhi), co && co.nguoiGhi);
  }

  // =========================================================================
  console.log('\n[1b] DÒNG GHI KIỂU CŨ — đổi dấu thời gian sang GIỜ VIỆT NAM, không cắt chuỗi');
  {
    // Bản ghi tạo trước khi cột `ngayGhi` có mặt chỉ có dấu thời gian ISO
    // (giờ UTC). Lấy ngày của nó bằng cách CẮT MƯỜI KÝ TỰ ĐẦU là sai bảy
    // tiếng mỗi ngày: từ 17h UTC trở đi, Việt Nam đã sang ngày mới mà chuỗi
    // ISO thì chưa — cô ghi lúc 9 giờ tối rồi sửa lại ngay sau đó sẽ nhận
    // câu "bản ghi này ghi hôm qua".
    //
    // Bộ kiểm thử bắt đúng lỗi này ở lượt chạy đầu tiên, khi giờ máy đang là
    // 17h UTC / 0h sáng hôm sau giờ Việt Nam.
    const ghi = await req('POST', '/api/health', {
      cookie: CO,
      body: { studentId: 's1', type: 'checkup', title: 'Ghi kiểu cũ', height: 104, weight: 17.5 },
    });
    check('đối chứng — ghi được một bản ghi mới', ghi.status === 200 || ghi.status === 201, ghi.status);
    xoaNgayGhi(ghi.data.id);
    const sua = await req('PUT', `/api/health/${ghi.data.id}`, { cookie: CO, body: { height: 104.5 } });
    check('DÒNG KIỂU CŨ GHI HÔM NAY VẪN SỬA ĐƯỢC HÔM NAY, kể cả sau 17h UTC',
      sua.status === 200, `${sua.status} ${JSON.stringify(sua.data).slice(0, 200)}`);
  }

  // =========================================================================
  console.log('\n[2] NHẬP BÙ VẪN LÀM ĐƯỢC — mục quan trọng nhất của cả bài');
  {
    // Trạm y tế khám ngày 01/09, giấy về trường hôm nay. Cô gõ vào máy hôm nay
    // với NGÀY KHÁM là 01/09. Bản ghi ấy phải sửa được TRONG HÔM NAY.
    //
    // Khoá theo `date` (ngày khám) thì nó sinh ra đã khoá. Thử ngược: đổi
    // `ngayGhiCua` về đọc `h.date` thì mục này đỏ ngay.
    const ngayKham = '2026-09-01';
    const ghi = await req('POST', '/api/health', {
      cookie: CO,
      body: { studentId: 's1', type: 'checkup', date: ngayKham,
        title: 'Khám trạm y tế đầu tháng', height: 101, weight: 16.5 },
    });
    check('đối chứng — cô gõ bù được bản ghi có ngày khám cũ',
      (ghi.status === 200 || ghi.status === 201) && ghi.data.date === ngayKham,
      `${ghi.status} ${ghi.data && ghi.data.date}`);
    check('đối chứng — ngày khám ấy KHÔNG phải hôm nay', ngayKham !== NGAY, `${ngayKham} / ${NGAY}`);

    const sua = await req('PUT', `/api/health/${ghi.data.id}`, {
      cookie: CO, body: { height: 102 },
    });
    check('GÕ BÙ XONG VẪN SỬA ĐƯỢC TRONG HÔM NAY — khoá theo ngày GÕ, không theo ngày KHÁM',
      sua.status === 200, `${sua.status} ${JSON.stringify(sua.data).slice(0, 160)}`);
  }

  // =========================================================================
  console.log('\n[3] SANG NGÀY KHÁC THÌ CÔ THÔI SỬA, NHÀ TRƯỜNG VẪN SỬA');
  {
    const ghi = await req('POST', '/api/health', {
      cookie: CO,
      body: { studentId: 's1', type: 'checkup', title: 'Ghi hôm kia', height: 103, weight: 17 },
    });
    const id = ghi.data.id;
    luiNgayGhi(id, '2026-09-13');           // dựng cảnh cô gõ hôm kia

    const coSua = await req('PUT', `/api/health/${id}`, { cookie: CO, body: { title: 'Cô sửa muộn' } });
    check('CÔ KHÔNG sửa được bản ghi của ngày khác', coSua.status === 403, coSua.status);
    check('câu từ chối nói RÕ NGÀY đã ghi, không nói chung chung',
      /2026-09-13/.test(coSua.data?.error || ''), coSua.data?.error);
    check('và chỉ ra đường đi tiếp là nhắn văn phòng',
      /văn phòng/i.test(coSua.data?.error || ''), coSua.data?.error);

    const coThu = await req('DELETE', `/api/health/${id}`, { cookie: CO });
    check('cô cũng không tự thu hồi được', coThu.status === 403, coThu.status);
    check('câu từ chối trấn an rằng phần đã ghi không mất',
      /không mất/i.test(coThu.data?.error || ''), coThu.data?.error);

    const qtSua = await req('PUT', `/api/health/${id}`, { cookie: QT, body: { title: 'Văn phòng sửa hộ' } });
    check('NHÀ TRƯỜNG SỬA ĐƯỢC — đúng đường thoát mà câu từ chối vừa chỉ tới',
      qtSua.status === 200, qtSua.status);

    // Và đường THU HỒI của nhà trường KHÔNG bị khoá theo ngày: nó sinh ra để
    // gỡ một ghi nhận bấm nhầm sang bé khác, thứ chỉ lộ ra sau vài ngày.
    const qtThu = await req('DELETE', `/api/health/${id}`, { cookie: QT });
    check('NHÀ TRƯỜNG THU HỒI ĐƯỢC bản ghi cũ — đường sửa sai duy nhất còn mở',
      qtThu.status === 200, qtThu.status);
  }

  // =========================================================================
  console.log('\n[4] TẢI MẪU CÂN ĐO — điền sẵn tên bé, để trống hai ô số');
  {
    const mau = await taiCsv('/api/health/mau-can-do.csv?classId=c1', CO);
    check('cô tải được mẫu của nhóm mình', mau.status === 200, mau.status);
    check('và máy chủ gửi đúng kiểu tệp CSV để Excel mở được',
      /text\/csv/.test(mau.kieu), mau.kieu);
    const t = mau.chu;
    check('mẫu có đủ năm cột', /Mã của bé/.test(t) && /Chiều cao \(cm\)/.test(t) && /Cân nặng \(kg\)/.test(t),
      t.split('\n')[0]);
    check('ĐIỀN SẴN TÊN BÉ — người gõ không phải chép tay tên trẻ',
      /Nguyễn Bảo An/.test(t), t.slice(0, 200));
    check('và hai ô số để TRỐNG', !/Nguyễn Bảo An[^\n]*\d+[^\n]*\d+/.test(t), t.split('\n')[1]);

    const cheo = await taiCsv('/api/health/mau-can-do.csv?classId=c4', CO);
    check('cô KHÔNG tải được mẫu của nhóm khác', cheo.status === 403, cheo.status);
    const cs = await taiCsv('/api/health/mau-can-do.csv?classId=c1', CS2);
    check('quản lý cơ sở khác cũng không tải được', cs.status === 403, cs.status);
  }

  // =========================================================================
  console.log('\n[5] NẠP TỆP — đi qua ĐÚNG đường ghi của màn hình');
  {
    const thang = NGAY.slice(0, 7);
    const truoc = soDong('s1', NGAY);
    // Cột "Mã của bé" để TRỐNG ở dòng đầu, có ở dòng hai — để đo cả hai lối
    // tra: theo mã và theo tên.
    const tep = 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n'
      + ',Nguyễn Bảo An,Chồi 2,105,18\n'
      + ',Vũ Đức Anh,Chồi 2,107,19\n'
      + ',Phạm Gia Hân,Chồi 2,,\n';
    const nap = await req('POST', '/api/health/nap-can-do', {
      cookie: CO, body: { classId: 'c1', text: tep },
    });
    check('nạp được tệp', nap.status === 200, `${nap.status} ${JSON.stringify(nap.data).slice(0, 180)}`);
    check('hai bé có số được ghi, bé để trống thì bỏ qua',
      nap.data.soBe === 2 && (nap.data.boQua || []).length === 1,
      JSON.stringify(nap.data).slice(0, 180));
    check('số vào đúng bản ghi của bé', (canDo('s1', NGAY) || {}).height === 105,
      JSON.stringify(canDo('s1', NGAY)));

    // ĐI QUA CÙNG LUẬT "ĐÃ CÓ THÌ SỬA": nạp lại tệp khác không được sinh ra
    // dòng cân đo thứ hai cùng tháng cho một bé.
    const demSau1 = soDong('s1', NGAY);
    const nap2 = await req('POST', '/api/health/nap-can-do', {
      cookie: CO,
      body: { classId: 'c1', text: 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n,Nguyễn Bảo An,Chồi 2,106,18.5\n' },
    });
    check('nạp lại lần hai vẫn được', nap2.status === 200, nap2.status);
    check('KHÔNG SINH RA DÒNG THỨ HAI cùng tháng — sửa chứ không thêm',
      soDong('s1', NGAY) === demSau1, `${demSau1} → ${soDong('s1', NGAY)}`);
    check('và số mới đã thay số cũ', (canDo('s1', NGAY) || {}).height === 106,
      JSON.stringify(canDo('s1', NGAY)));
    check('đối chứng — bảng có nhiều hơn lúc chưa nạp', soDong('s1', NGAY) > truoc,
      `${truoc} → ${soDong('s1', NGAY)}`);
    check('đối chứng — tháng đang đo đúng là tháng này', NGAY.startsWith(thang), `${NGAY} / ${thang}`);
  }

  // =========================================================================
  console.log('\n[6] TỆP SAI THÌ TỪ CHỐI CẢ MẺ, và nói rõ DÒNG NÀO');
  {
    const truoc = (canDo('s1', NGAY) || {}).height;
    const ngoai = await req('POST', '/api/health/nap-can-do', {
      cookie: CO,
      body: { classId: 'c1', text: 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n'
        + ',Nguyễn Bảo An,Chồi 2,108,18\n,Vũ Đức Anh,Chồi 2,1070,19\n' },
    });
    check('một số nằm ngoài khoảng thì TỪ CHỐI CẢ MẺ', ngoai.status === 400, ngoai.status);
    check('và nói rõ DÒNG nào, BÉ nào',
      /Dòng 3/.test(ngoai.data?.error || '') && /Vũ Đức Anh/.test(ngoai.data?.error || ''),
      ngoai.data?.error);
    check('bé ở dòng ĐÚNG cũng không bị ghi — cả mẻ dừng lại',
      (canDo('s1', NGAY) || {}).height === truoc, `${truoc} → ${(canDo('s1', NGAY) || {}).height}`);

    const laBe = await req('POST', '/api/health/nap-can-do', {
      cookie: CO,
      body: { classId: 'c1', text: 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n,Một Bé Không Có Thật,Chồi 2,100,16\n' },
    });
    check('bé không có trong nhóm thì từ chối', laBe.status === 400, laBe.status);
    check('và hỏi lại có phải tệp của đúng nhóm không',
      /đúng nhóm/i.test(laBe.data?.error || ''), laBe.data?.error);

    const rong = await req('POST', '/api/health/nap-can-do', { cookie: CO, body: { classId: 'c1', text: '' } });
    check('tệp rỗng thì từ chối, không nổ', rong.status === 400, rong.status);

    const cheo = await req('POST', '/api/health/nap-can-do', {
      cookie: CO4,
      body: { classId: 'c1', text: 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\nMN001,Nguyễn Bảo An,Chồi 2,100,16\n' },
    });
    check('cô nhóm khác KHÔNG nạp được vào nhóm này', cheo.status === 403, cheo.status);
  }

  // =========================================================================
  console.log('\n[7] TÊN TRÙNG THÌ DỪNG LẠI HỎI, KHÔNG ĐOÁN');
  {
    // Trùng họ tên trong tiếng Việt là chuyện thường, và ghi nhầm chiều cao
    // của bé này sang bé kia thì KHÔNG ai đọc ra được: hai con số đều hợp lệ,
    // hồ sơ đều có số. Nên chỗ nào máy không chắc là dừng lại hỏi.
    const them = await req('POST', '/api/admin/students', {
      cookie: QT,
      body: { hoTen: 'Nguyễn Bảo An', classId: 'c1', tenLop: 'Chồi 2',
        phHoTen: 'Một Phụ Huynh Khác', phSdt: '0900000111',
        ngaySinh: '2022-05-05', gioiTinh: 'Nữ', trungTen: true },
    });
    check('đối chứng — dựng được một bé TRÙNG TÊN trong cùng nhóm',
      them.status === 200 || them.status === 201, `${them.status} ${JSON.stringify(them.data).slice(0, 160)}`);

    const nap = await req('POST', '/api/health/nap-can-do', {
      cookie: CO,
      body: { classId: 'c1', text: 'Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n,Nguyễn Bảo An,Chồi 2,100,16\n' },
    });
    check('DÒNG CHỈ CÓ TÊN, MÀ TÊN TRÙNG → TỪ CHỐI', nap.status === 400, nap.status);
    check('và bảo người gõ điền thêm mã của bé',
      /Mã của bé/.test(nap.data?.error || ''), nap.data?.error);

    // Nhưng có MÃ thì vẫn nạp được — mã là thứ phân biệt được.
    const ma = maCua('s1');
    check('đối chứng — bé s1 có mã thật trong dữ liệu mẫu', !!ma, ma);
    const coMa = await req('POST', '/api/health/nap-can-do', {
      cookie: CO,
      body: { classId: 'c1',
        text: `Mã của bé,Họ và tên,Nhóm lớp,Chiều cao (cm),Cân nặng (kg)\n${ma},Nguyễn Bảo An,Chồi 2,109,18\n` },
    });
    check('cùng tên ấy nhưng CÓ MÃ thì nạp được bình thường', coMa.status === 200,
      `${coMa.status} ${JSON.stringify(coMa.data).slice(0, 160)}`);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
