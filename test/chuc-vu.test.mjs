// Bài canh TẦNG CHỨC VỤ — Cấp 2, và hai vai của Cấp 3.
//
// Chạy bằng:  npm run test:chuc-vu
//
// ĐÂY LÀ MỘT BÀI TEST PHÂN QUYỀN, NÊN NÓ CANH HAI CHIỀU
//
// Một tầng siết quyền hỏng được theo hai hướng, và hướng thứ hai hay bị bỏ quên:
//
//   HỞ RA — Nhân sự mở được hồ sơ sức khoẻ của bé, Marketing tải được ảnh mà
//   gia đình chưa đồng ý cho ra ngoài, Văn phòng cơ sở tự tạo cho mình một tài
//   khoản cô. Đây là hướng ai cũng nghĩ tới.
//
//   SIẾT QUÁ — app trắng màn hình ngay sau khi đăng nhập vì `/api/modules` bị
//   chặn, hoặc ban giám hiệu bỗng dưng không làm được việc vẫn làm hằng ngày.
//   Đây là hướng vi phạm Nguyên tắc số 1, và nó nguy hiểm không kém: một tầng
//   bảo mật làm app ngừng dùng được thì nhà trường sẽ tắt nó đi.
//
// Nên mục [1] canh chiều siết quá TRƯỚC, rồi mới tới các mục canh chiều hở ra.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import {
  GOC,
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, datChucVu, dongNhom,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('chuc-vu');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi', 'tienan', 'cambridge', 'hanhtrinh',
  'thuchup', 'nhatky', 'dontra', 'kehoachbe']);

const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkNS = taoQuanTri(DIR, 'Chị Nhân Sự', 'nhansu');
const mkMK = taoQuanTri(DIR, 'Bạn Marketing', 'marketing');
const mkKT = taoQuanTri(DIR, 'Chị Kế Toán', 'ketoan');
const mkVP = taoQuanTri(DIR, 'Văn Phòng CS1', 'vanphongcs1');
const mkQL = taoQuanTri(DIR, 'Quản Lý CS1', 'quanlycs1');

datChucVu(DIR, 'nhansu', 'nhansu');
datChucVu(DIR, 'marketing', 'marketing');
datChucVu(DIR, 'ketoan', 'ketoan');
datChucVu(DIR, 'vanphongcs1', 'vanphong-coso');
datChucVu(DIR, 'quanlycs1', 'quanly-coso');
khoaVaoCoSo(DIR, 'vanphongcs1', 'cs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4060), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const BGH = await vao('hieutruong', mkBGH);   // chưa khai chức vụ = ban giám hiệu
const NS = await vao('nhansu', mkNS);
const MK = await vao('marketing', mkMK);
const KT = await vao('ketoan', mkKT);
const VP = await vao('vanphongcs1', mkVP);
const QL = await vao('quanlycs1', mkQL);
const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm c1

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Nhóm c1 thuộc cơ sở 1, để văn phòng và quản lý CS1 có thứ để làm việc.
await req('PUT', '/api/admin/classes/c1/campus', { cookie: BGH, body: { campusId: 'cs1' } });

const ma = async (cookie, duong) => (await req('GET', duong, { cookie })).status;

// ===========================================================================
console.log('\n[1] KHÔNG KHAI CHỨC VỤ = Y NHƯ HÔM NAY (chiều siết quá)');
{
  for (const [ten, duong] of [
    ['hồ sơ bé', '/api/students'],
    ['sổ điểm danh của nhóm', '/api/attendance/class'],
    ['album', '/api/albums'],
    ['danh sách cô', '/api/admin/teachers'],
    ['tài khoản quản trị', '/api/admin/managers'],
    ['lưới ô vuông', '/api/modules'],
  ]) {
    check(`ban giám hiệu vẫn mở được ${ten}`, (await ma(BGH, duong)) === 200, duong);
  }

  const co = await ma(GV, '/api/students');
  check('cô không mang chức vụ nên không bị tầng này chạm tới', co === 200, co);
}

// ===========================================================================
console.log('\n[2] KHUNG XƯƠNG CỦA APP LUÔN MỞ — không ai bị trắng màn hình');
{
  // Nếu ba đường này bị chặn thì app không vẽ nổi trang chủ. Canh cho CẢ BỐN
  // chức vụ hạn chế, vì mỗi chức vụ có một danh sách cho phép khác nhau.
  for (const [ten, cookie] of [['Nhân sự', NS], ['Marketing', MK], ['Kế toán', KT], ['Văn phòng', VP]]) {
    check(`${ten}: /api/auth/me mở`, (await ma(cookie, '/api/auth/me')) === 200);
    check(`${ten}: /api/modules mở`, (await ma(cookie, '/api/modules')) === 200);
    check(`${ten}: /api/dashboard/badges mở`, (await ma(cookie, '/api/dashboard/badges')) === 200);
  }

  // Và lưới ô vuông đã lọc theo phần việc: Kế toán không thấy ô Album.
  const o = async (cookie) => {
    const d = (await req('GET', '/api/modules', { cookie })).data;
    return Array.isArray(d) ? d.map(m => m.key) : [];
  };
  const oKT = await o(KT);
  check('Kế toán không thấy ô Album trên trang chủ', !oKT.includes('album'), oKT);
  const oMK = await o(MK);
  check('Marketing thì thấy ô Album', oMK.includes('album'), oMK);
}

// ===========================================================================
console.log('\n[3] DANH SÁCH CHO PHÉP — mỗi chức vụ chỉ mở phần việc của mình');
{
  // Nhân sự: tài khoản và danh sách cô — KHÔNG hồ sơ bé, KHÔNG sức khoẻ, KHÔNG ảnh.
  check('Nhân sự mở được danh sách cô', (await ma(NS, '/api/admin/teachers')) === 200);
  check('Nhân sự KHÔNG mở được hồ sơ bé', (await ma(NS, '/api/students')) === 403);
  check('Nhân sự KHÔNG mở được sức khoẻ', (await ma(NS, '/api/health/s1')) === 403);
  check('Nhân sự KHÔNG mở được ảnh', (await ma(NS, '/api/albums')) === 403);
  check('Nhân sự KHÔNG mở được học phí', (await ma(NS, '/api/hocphi?studentId=s1')) === 403);

  // Kế toán: học phí và tiền ăn — KHÔNG hồ sơ bé, KHÔNG ảnh.
  check('Kế toán mở được học phí', (await ma(KT, '/api/hocphi?studentId=s1')) === 200);
  check('Kế toán KHÔNG mở được hồ sơ bé', (await ma(KT, '/api/students')) === 403);
  check('Kế toán KHÔNG mở được ảnh', (await ma(KT, '/api/albums')) === 403);
  check('Kế toán KHÔNG mở được danh sách cô', (await ma(KT, '/api/admin/teachers')) === 403);

  // Marketing: ảnh và Cambridge — KHÔNG hồ sơ bé, KHÔNG học phí.
  check('Marketing mở được album', (await ma(MK, '/api/albums')) === 200);
  check('Marketing KHÔNG mở được hồ sơ bé', (await ma(MK, '/api/students')) === 403);
  check('Marketing KHÔNG mở được học phí', (await ma(MK, '/api/hocphi?studentId=s1')) === 403);

  // Câu từ chối phải nói tiếng của trường, và nói ai gỡ được cho họ.
  const r = await req('GET', '/api/students', { cookie: NS });
  const loi = String(r.data?.error || '');
  check('câu từ chối gọi đúng tên chức vụ', loi.includes('Nhân sự'), loi);
  check('câu từ chối chỉ ra cách gỡ', loi.includes('ban giám hiệu'), loi);
  check('câu từ chối không lộ thuật ngữ kỹ thuật', !/403|api|middleware/i.test(loi), loi);
}

// ===========================================================================
console.log('\n[4] ĐƯỜNG THÊM SAU NÀY MẶC ĐỊNH BỊ TỪ CHỐI');
{
  // `hanhtrinh` là phân hệ viết sau tầng chức vụ và không nằm trong danh sách
  // cho phép của ai. Nếu tầng này là danh sách CẤM thì cả bốn chức vụ đã mở
  // được nó mà không ai nhận ra.
  // VĂN PHÒNG CƠ SỞ CŨNG PHẢI CÓ TRONG DANH SÁCH NÀY.
  //
  // Bản trước chỉ thử ba vai Cấp 2. Nhưng Văn phòng cơ sở cũng có danh sách cho
  // phép cứng trong `lib/db.js`, và `/api/hanhtrinh` cũng không nằm trong đó —
  // nên đây là một vai BỊ BỎ SÓT, không phải một vai không cần canh.
  for (const [ten, cookie] of [['Nhân sự', NS], ['Marketing', MK], ['Kế toán', KT],
    ['Văn phòng cơ sở', VP]]) {
    const s = await ma(cookie, '/api/hanhtrinh?studentId=s1');
    check(`${ten} không tự mở được phân hệ mới`, s === 403, s);
  }

  // VÀ MỘT CHỖ RỘNG HƠN MỌI NGƯỜI TƯỞNG: TIỀN TỐ `/api/admin`.
  //
  // Danh sách của Văn phòng cơ sở có `/api/admin`, mà hàm so khớp của tầng chức
  // vụ khớp theo TIỀN TỐ. Nghĩa là mọi đường `/api/admin/...` thêm sau này tự
  // động mở cho vai đó, không ai phải quyết định gì.
  //
  // Điều đó KHÔNG sai — việc hằng ngày của văn phòng nằm phần lớn ở `/api/admin`
  // — nhưng nó là thứ phải biết. Hai phép kiểm dưới đây ghim lại đúng hai chốt
  // mà tầng CƠ SỞ và tầng VAI (chứ không phải tầng chức vụ) đang giữ, để nếu
  // mai này ai đó gỡ hai chốt kia thì có bài đỏ ngay.
  check('tiền tố /api/admin có mở đường quản trị cho Văn phòng — đó là chủ ý',
    (await ma(VP, '/api/admin/teachers')) === 200);
  check('NHƯNG tầng khác vẫn chặn việc tạo tài khoản cô',
    (await req('POST', '/api/admin/teachers', { cookie: VP, body: { name: 'Cô Thử' } })).status === 403);
  check('và vẫn chặn việc phân công cô vào nhóm',
    (await req('PUT', '/api/admin/classes/c1/teachers', { cookie: VP, body: { teacherIds: [] } })).status === 403);
}

// ===========================================================================
console.log('\n[5] CHỐT LEO THANG — Cấp 2 không đụng tài khoản quản trị');
{
  const qt = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
  const idBGH = (qt.find(u => u.username === 'hieutruong') || {}).id;
  const idKT = (qt.find(u => u.username === 'ketoan') || {}).id;
  check('đọc được mã tài khoản ban giám hiệu để thử', !!idBGH && !!idKT, qt.map(u => u.username));

  // Đây là chính lối leo thang của N15, chỉ đổi người đi: đường cấp lại mật
  // khẩu TRẢ THẲNG mật khẩu tạm về màn hình người bấm.
  const r1 = await req('POST', `/api/accounts/${idBGH}/reset-password`, { cookie: NS, body: {} });
  check('Nhân sự KHÔNG cấp lại được mật khẩu cho ban giám hiệu', r1.status === 403, r1.status);
  check('và không có mật khẩu tạm nào lọt ra', !r1.data?.temporaryPassword, Object.keys(r1.data || {}));

  const r2 = await req('POST', `/api/accounts/${idKT}/reset-password`, { cookie: NS, body: {} });
  check('kể cả cho một tài khoản Cấp 2 khác', r2.status === 403, r2.status);

  // Nhưng phần việc thật của nhân sự thì vẫn chạy: cấp lại cho phụ huynh.
  const ph = (await req('GET', '/api/accounts/parents', { cookie: BGH })).data || [];
  const r3 = await req('POST', `/api/accounts/${ph[0].userId}/reset-password`, { cookie: NS, body: {} });
  check('Nhân sự vẫn cấp lại được mật khẩu cho gia đình', r3.status === 200, r3.data);

  // Và không tự đổi được chức vụ của chính mình.
  const r4 = await req('PUT', `/api/admin/managers/${idKT}/chuc-vu`, { cookie: NS, body: { chucVu: '' } });
  check('Nhân sự không đổi được chức vụ của ai', r4.status === 403, r4.status);
}

// ===========================================================================
console.log('\n[6] CẤP 3 TÁCH ĐÔI — văn phòng khác quản lý cơ sở');
{
  // Việc hằng ngày thì văn phòng làm được, y như quản lý cơ sở.
  check('Văn phòng mở được hồ sơ bé', (await ma(VP, '/api/students')) === 200);
  check('Văn phòng mở được sổ điểm danh', (await ma(VP, '/api/attendance/class')) === 200);

  // Hai việc về CON NGƯỜI thì không.
  const r1 = await req('PUT', '/api/admin/classes/c1/teachers', { cookie: VP, body: { teacherIds: [] } });
  check('Văn phòng KHÔNG phân công cô vào nhóm', r1.status === 403, r1.status);
  check('và câu từ chối chỉ đúng người làm được', String(r1.data?.error || '').includes('quản lý cơ sở'), r1.data);

  const r2 = await req('POST', '/api/admin/teachers', { cookie: VP, body: { name: 'Cô Mới' } });
  check('Văn phòng KHÔNG tạo được tài khoản cô', r2.status === 403, r2.status);
  check('và không có mật khẩu tạm nào lọt ra', !r2.data?.temporaryPassword, Object.keys(r2.data || {}));

  // Đường cấp lại mật khẩu không nằm trong phần việc của văn phòng.
  const qt = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
  const idQL = (qt.find(u => u.username === 'quanlycs1') || {}).id;
  const r3 = await req('POST', `/api/accounts/${idQL}/reset-password`, { cookie: VP, body: {} });
  check('Văn phòng KHÔNG đụng tới tài khoản', r3.status === 403, r3.status);

  // Quản lý cơ sở thì làm được đúng hai việc kia — nếu không thì tầng này đã
  // chặn nhầm cả vai đáng lẽ được phép, tức là siết quá.
  const r4 = await req('POST', '/api/admin/teachers', { cookie: QL, body: { name: 'Cô Thảo', classId: 'c1' } });
  check('Quản lý cơ sở tạo được tài khoản cô', r4.status === 201, r4.data);
  // GIỮ NGUYÊN CÔ ĐANG DẠY c1 trong danh sách. Đường này đặt TOÀN BỘ danh sách
  // cô của nhóm, nên gửi mỗi cô mới là gỡ cô cũ ra khỏi nhóm — và mục [7] bên
  // dưới cần đúng cô đó để tạo album. Đây là bẫy thật của đường "đặt cả danh
  // sách", không phải chi tiết riêng của bài kiểm thử.
  const dsCo = (await req('GET', '/api/admin/teachers', { cookie: BGH })).data || [];
  const idGV = (dsCo.find(u => u.username === 'giaovien') || {}).id;
  const r5 = await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: QL, body: { teacherIds: [idGV, r4.data.id], chinhId: idGV },
  });
  check('Quản lý cơ sở phân công được cô', r5.status === 200, r5.data);
}

// ===========================================================================
console.log('\n[6b] BỐN PHÂN HỆ NHẠY CẢM NHẤT — thử THẬT, không chỉ tin danh sách');
{
  // VÌ SAO MỤC NÀY PHẢI CÓ
  //
  // Mục [+] ở cuối tệp đọc `lib/db.js` và đòi mỗi phân hệ phải được quyết định
  // tường minh. Nhưng nó chỉ đọc DANH SÁCH. Nếu chốt chặn thật sự — hàm
  // `chanApiNgoaiChucVu` trong `lib/modules.js` — không được gắn vào, hoặc so
  // sai tiền tố, thì danh sách vẫn đẹp mà cửa vẫn mở. Mục này gọi thật vào bốn
  // đường và đọc mã trả về.
  //
  // Bốn phân hệ này được chọn không phải ngẫu nhiên:
  //
  //   /api/thuchup   Ghi nhanh — GHI CHÉP THÔ CỦA CÔ, đúng lớp 1 của bảng ba
  //                  lớp trong CLAUDE.md: "chỉ cô đã ghi (+ quản trị khi cần)",
  //                  "nháp dở dang được phép tồn tại". Đây là chỗ dễ mất lòng
  //                  tin của cô giáo nhanh nhất.
  //   /api/hanhtrinh Hành trình học tập — nhận định chuyên môn về từng bé.
  //   /api/kehoachbe Kế hoạch của bé — việc chuyên môn giữa cô và quản lý nhóm.
  //   /api/nhatky    Nhật ký ngày — ăn, ngủ, đi vệ sinh, thay bỉm của TỪNG bé.
  //
  // Ba cái đầu CỐ Ý không có trong danh sách của Văn phòng cơ sở. Cái thứ tư
  // thì CÓ, vì văn phòng phải trả lời gia đình gọi điện hỏi hôm nay con ăn thế
  // nào. Bài này canh cả hai chiều, và chiều CHO PHÉP đứng trước — siết nhầm
  // vào việc hằng ngày của văn phòng là app ngừng dùng được.

  // --- Chiều CHO PHÉP: việc hằng ngày của văn phòng cơ sở phải chạy ---------
  check('Văn phòng MỞ ĐƯỢC nhật ký ngày của nhóm mình',
    (await ma(VP, '/api/nhatky?classId=c1')) === 200);
  check('Văn phòng MỞ ĐƯỢC sổ đón trả của một bé',
    (await ma(VP, '/api/dontra?studentId=s1')) === 200);
  check('Văn phòng MỞ ĐƯỢC báo ăn', (await ma(VP, '/api/tienan/bao-an')) === 200);

  // --- Chiều CẤM: ba phân hệ chuyên môn thì không -------------------------
  for (const [ten, duong] of [
    ['Ghi nhanh (ghi chép thô của cô)', '/api/thuchup'],
    ['Hành trình học tập', '/api/hanhtrinh?studentId=s1'],
    ['Kế hoạch của bé', '/api/kehoachbe?classId=c1'],
  ]) {
    const st = await ma(VP, duong);
    check(`Văn phòng KHÔNG mở được ${ten}`, st === 403, st);
  }

  // Chốt quan trọng nhất của cả mục: câu từ chối phải đến từ TẦNG CHỨC VỤ,
  // không phải tình cờ 403 vì một lý do khác (ví dụ requireRole). Nếu tầng chức
  // vụ bị gỡ mà requireRole vẫn chặn thì bài trên vẫn xanh — nên đọc câu chữ.
  {
    const r = await req('GET', '/api/thuchup', { cookie: VP });
    const loi = String(r.data?.error || '');
    check('và từ chối ĐÚNG VÌ CHỨC VỤ, không phải tình cờ trùng mã 403',
      loi.includes('Văn phòng cơ sở'), loi);
    check('câu từ chối chỉ ra ai gỡ được', loi.includes('ban giám hiệu'), loi);
  }

  // --- Ba chức vụ Cấp 2 thì không đường nào trong bốn đường ----------------
  for (const [ten, cookie] of [['Nhân sự', NS], ['Kế toán', KT], ['Marketing', MK]]) {
    for (const duong of ['/api/thuchup', '/api/nhatky?classId=c1',
      '/api/dontra?studentId=s1', '/api/kehoachbe?classId=c1']) {
      const st = await ma(cookie, duong);
      check(`${ten} KHÔNG mở được ${duong.split('?')[0]}`, st === 403, st);
    }
  }

  // --- Quản lý cơ sở (api: null) thì mở được, vì giới hạn của vai này đến từ
  // TẦNG CƠ SỞ chứ không từ chức vụ. Không có phép kiểm này thì không phân biệt
  // được "tầng chức vụ đang chặn đúng" với "tầng chức vụ chặn tất".
  check('Quản lý cơ sở VẪN mở được Ghi nhanh — giới hạn của vai này ở tầng cơ sở',
    (await ma(QL, '/api/thuchup')) === 200);
  check('và mở được Kế hoạch của bé', (await ma(QL, '/api/kehoachbe?classId=c1')) === 200);

  // --- Và ban giám hiệu (chưa khai chức vụ) không bị đụng tới --------------
  check('Ban giám hiệu vẫn mở được cả bốn', (await Promise.all([
    ma(BGH, '/api/thuchup'), ma(BGH, '/api/nhatky?classId=c1'),
    ma(BGH, '/api/dontra?studentId=s1'), ma(BGH, '/api/kehoachbe?classId=c1'),
  ])).every(s => s === 200));
}

// ===========================================================================
console.log('\n[7] MARKETING CHỈ THẤY ẢNH CÓ ĐỒNG Ý TRUYỀN THÔNG');
{
  const tao = await req('POST', '/api/albums', {
    cookie: GV,
    body: { title: 'Ngày hội mùa xuân', classId: 'c1', photos: [{ dataUrl: ANH, caption: 'Bé chơi' }] },
  });
  check('cô tạo được album', tao.status === 201, tao.data);
  const albumId = tao.data.id;
  const chiTiet = await req('GET', `/api/albums/${albumId}`, { cookie: GV });
  const anhId = chiTiet.data.photos[0].id;

  // Chưa gắn bé nào: ban giám hiệu vẫn thấy, Marketing thì KHÔNG.
  //
  // Đây là chỗ luật của Marketing khác hẳn luật ảnh nhóm. Ảnh chưa gắn bé thì
  // không thể biết trong đó có ai, nên cũng không thể biết cả ba ô đồng ý đã
  // tích hay chưa — mà ô truyền thông thì mặc định KHÔNG tích.
  const a1 = (await req('GET', `/api/albums/${albumId}`, { cookie: BGH })).data;
  check('ban giám hiệu thấy ảnh chưa gắn bé', (a1.photos || []).length === 1, a1.photos);
  const m1 = (await req('GET', `/api/albums/${albumId}`, { cookie: MK })).data;
  check('Marketing KHÔNG thấy ảnh chưa gắn bé', (m1.photos || []).length === 0, m1.photos);

  // Gắn bé s1 vào ảnh, nhưng gia đình chưa tích ô truyền thông.
  const gan = await req('PUT', `/api/albums/${albumId}/photos/${anhId}/be`, {
    cookie: GV, body: { studentIds: ['s1'] },
  });
  check('cô gắn được thẻ bé', gan.status === 200, gan.data);
  const m2 = (await req('GET', `/api/albums/${albumId}`, { cookie: MK })).data;
  check('gắn bé rồi mà chưa đồng ý truyền thông thì Marketing vẫn không thấy',
    (m2.photos || []).length === 0, m2.photos);

  // ĐÂY MỚI LÀ CHỐT CHẶN THẬT: đường trả về đúng các byte của tấm ảnh. Lọc
  // thiếu ở đây thì hai lần lọc trên chỉ là giấu biểu tượng đi.
  const byte1 = await req('GET', `/api/albums/${albumId}/photo/${anhId}`, { cookie: MK });
  check('Marketing KHÔNG tải được tệp ảnh chưa có đồng ý', byte1.status === 403, byte1.status);

  // Nhà trường ghi nhận gia đình đã đồng ý cho dùng ảnh ra ngoài.
  await req('PUT', '/api/admin/students/s1/dong-y', { cookie: BGH, body: { truyenThong: true } });
  const m3 = (await req('GET', `/api/albums/${albumId}`, { cookie: MK })).data;
  check('đồng ý rồi thì Marketing thấy ảnh', (m3.photos || []).length === 1, m3.photos);
  const byte2 = await req('GET', `/api/albums/${albumId}/photo/${anhId}`, { cookie: MK });
  check('và tải được tệp ảnh', byte2.status === 200, byte2.status);

  // Rút đồng ý là ảnh biến khỏi tầm với của Marketing ngay, không cần làm gì thêm.
  await req('PUT', '/api/admin/students/s1/dong-y', { cookie: BGH, body: { truyenThong: false } });
  const byte3 = await req('GET', `/api/albums/${albumId}/photo/${anhId}`, { cookie: MK });
  check('rút đồng ý thì Marketing mất quyền tải ngay', byte3.status === 403, byte3.status);
  await req('PUT', '/api/admin/students/s1/dong-y', { cookie: BGH, body: { truyenThong: true } });

  // ---- Marketing chỉ ĐỌC ảnh ----
  //
  // Tạo album: luật cũ trả 400 "Tài khoản chưa gắn với nhóm lớp nào" — đúng về
  // mặt máy móc, nhưng với Marketing thì đó là câu trả lời sai người sai việc.
  const tuTao = await req('POST', '/api/albums', {
    cookie: MK, body: { title: 'Ảnh tuyển sinh', classId: 'c1', photos: [{ dataUrl: ANH }] },
  });
  check('Marketing KHÔNG tạo album', tuTao.status === 403, `${tuTao.status} ${tuTao.data?.error || ''}`);

  // XOÁ CẢ ALBUM CỦA NHÓM ĐÃ ĐÓNG — chỗ quyền quản trị của Marketing thật sự
  // với tới được. Sau mỗi lần chuyển năm học thì MỌI nhóm của năm cũ đều đã
  // đóng, nên đây không phải trường hợp hiếm mà là trường hợp thường.
  dongNhom(DIR, 'c1');
  const xoa = await req('DELETE', `/api/albums/${albumId}`, { cookie: MK });
  check('Marketing KHÔNG xoá album của nhóm đã đóng', xoa.status === 403, xoa.status);
  const conDo = await req('GET', `/api/albums/${albumId}`, { cookie: BGH });
  check('album vẫn còn nguyên sau khi bị thử xoá',
    conDo.status === 200 && (conDo.data.photos || []).length === 1, conDo.status);

  // Còn ban giám hiệu thì vẫn xoá được y như trước — chốt mới không cắt quyền
  // của ai, nó chỉ khoanh lại đúng một chức vụ.
  const xoaBGH = await req('DELETE', `/api/albums/${albumId}`, { cookie: BGH });
  check('ban giám hiệu vẫn xoá được album đó', xoaBGH.status === 200, xoaBGH.data);
}

// ===========================================================================
console.log('\n[8] ĐỔI CHỨC VỤ — chỉ ban giám hiệu, và không tự đổi cho mình');
{
  const qt = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
  const idBGH = (qt.find(u => u.username === 'hieutruong') || {}).id;
  const idKT = (qt.find(u => u.username === 'ketoan') || {}).id;

  check('danh sách quản trị nói rõ chức vụ của từng người',
    (qt.find(u => u.username === 'ketoan') || {}).chucVuTen === 'Kế toán',
    qt.map(u => `${u.username}:${u.chucVuTen}`));
  check('người chưa khai thì để trống, không bịa ra một chức vụ',
    (qt.find(u => u.username === 'hieutruong') || {}).chucVu === '',
    (qt.find(u => u.username === 'hieutruong') || {}).chucVu);

  const tuDoi = await req('PUT', `/api/admin/managers/${idBGH}/chuc-vu`, {
    cookie: BGH, body: { chucVu: 'ketoan' },
  });
  check('ban giám hiệu không tự đổi chức vụ của mình', tuDoi.status === 400, tuDoi.data);

  const bay = await req('PUT', `/api/admin/managers/${idKT}/chuc-vu`, {
    cookie: BGH, body: { chucVu: 'giam-doc-toan-quyen' },
  });
  check('không gán được một chức vụ không có thật', bay.status === 400, bay.data);

  // Văn phòng cơ sở là Cấp 3 nên bị chặn ngay ở chốt "chỉ Cấp 1".
  const vpDoi = await req('PUT', `/api/admin/managers/${idKT}/chuc-vu`, {
    cookie: VP, body: { chucVu: '' },
  });
  check('văn phòng cơ sở không đổi chức vụ của ai', vpDoi.status === 403, vpDoi.status);

  // Gỡ chức vụ là quay về đúng "như hôm nay", và có hiệu lực ngay lần gọi sau.
  const truoc = await ma(KT, '/api/students');
  await req('PUT', `/api/admin/managers/${idKT}/chuc-vu`, { cookie: BGH, body: { chucVu: '' } });
  const sau = await ma(KT, '/api/students');
  check('gỡ chức vụ thì mở lại được ngay, không cần đăng nhập lại',
    truoc === 403 && sau === 200, `${truoc} → ${sau}`);

  // Trả lại chức vụ để phần dọn dẹp không để lại trạng thái lạ.
  await req('PUT', `/api/admin/managers/${idKT}/chuc-vu`, { cookie: BGH, body: { chucVu: 'ketoan' } });
}

// ===========================================================================
console.log('\n[9] DANH MỤC CHỨC VỤ');
{
  const ds = (await req('GET', '/api/admin/chuc-vu', { cookie: BGH })).data || [];
  check('có đủ sáu chức vụ', ds.length === 6, ds.length);
  check('mỗi chức vụ đều nói rõ làm được gì', ds.every(c => c.moTa && c.moTa.length > 10), ds);
  check('mỗi chức vụ đều có cấp 1/2/3', ds.every(c => [1, 2, 3].includes(c.cap)), ds.map(c => c.cap));
  // Không được để lộ danh sách đường dẫn API ra màn hình — đó là thứ chỉ máy chủ
  // cần biết, và in ra là dạy người ta chỗ để dò.
  check('danh mục không kèm danh sách đường dẫn', ds.every(c => !('api' in c)), Object.keys(ds[0] || {}));

  // Gán chức vụ là việc của ban giám hiệu, nên bảng này cũng chỉ họ cần. Màn
  // Cơ sở của quản lý cơ sở tự ẩn thẻ chức vụ đi thay vì hiện một ô chọn bấm
  // vào là báo lỗi.
  const cs3 = await req('GET', '/api/admin/chuc-vu', { cookie: QL });
  check('quản lý cơ sở không đọc được danh mục chức vụ', cs3.status === 403, cs3.status);
}

// ===========================================================================
console.log('\n[+] DANH SÁCH CHO PHÉP VIẾT TAY PHẢI THEO KỊP THƯ MỤC modules/');

// VÌ SAO MỤC NÀY ĐÁNG GIÁ HƠN VẺ NGOÀI CỦA NÓ
//
// Tầng chức vụ chặn theo DANH SÁCH CHO PHÉP, cố ý để "quên thì quên theo hướng
// đóng lại". Nhưng danh sách đó là mảng chuỗi VIẾT TAY trong hằng `CHUC_VU` của
// lib/db.js — một tệp dùng chung, tức mỗi lần thêm phân hệ lại phải sửa tệp
// dùng chung ở một commit riêng.
//
// Chuyện sẽ xảy ra: thêm phân hệ mới cho GĐ 3, quên cập nhật, rồi tài khoản Văn
// phòng cơ sở hay Kế toán bấm vào ô mới nhận 403 kèm câu "Cần thêm quyền thì
// nhờ ban giám hiệu đổi chức vụ giúp" — trong khi BAN GIÁM HIỆU KHÔNG CÓ CÁCH
// NÀO SỬA QUA GIAO DIỆN. Người của trường sẽ đi hỏi vòng vòng rồi kết luận là
// app hỏng.
//
// Bài này KHÔNG đòi mọi chức vụ phải mở mọi phân hệ — phần lớn phân hệ đúng là
// không thuộc việc của Kế toán. Nó chỉ đòi một điều: mỗi vùng `api` của một
// phân hệ phải được QUYẾT ĐỊNH tường minh, hoặc nằm trong danh sách cho phép
// của ít nhất một chức vụ, hoặc nằm trong sổ dưới đây kèm lý do.
{
  const require2 = createRequire(import.meta.url);
  const dbLib = require2(path.join(GOC, 'lib', 'db.js'));
  const chucVu = dbLib.CHUC_VU;
  check('đọc được danh mục chức vụ từ lib/db.js', Array.isArray(chucVu), typeof chucVu);

  // Vùng api của mọi phân hệ có trong thư mục — đọc thư mục, KHÔNG liệt kê tay.
  // Liệt kê tay ở đây thì bài canh này lại mắc đúng bệnh nó đang canh.
  const MODULES = path.join(GOC, 'modules');
  const vungPhanHe = [];
  for (const ten of fs.readdirSync(MODULES)) {
    const tep = path.join(MODULES, ten, 'module.json');
    if (!fs.existsSync(tep)) continue;
    let mj = null;
    try { mj = JSON.parse(fs.readFileSync(tep, 'utf8')); } catch (_) { mj = null; }
    for (const a of (mj && mj.api) || []) vungPhanHe.push({ key: mj.key || ten, api: a });
  }
  check('tìm được vùng api của các phân hệ', vungPhanHe.length >= 8, vungPhanHe.length);

  // SỔ GHI NHỮNG PHÂN HỆ CỐ Ý KHÔNG CẤP CHO CHỨC VỤ CẤP 2 / CẤP 3 NÀO.
  //
  // Mỗi dòng phải nêu LÝ DO. Thêm vào đây là một quyết định, không phải một
  // cách cho qua — y hệt danh sách ngoại lệ của test/goi-ten.test.mjs.
  const CO_Y_KHONG_CAP = {
    nhatky: 'Nhật ký ngày là chuyện đi vệ sinh, thay bỉm, ăn uống của TỪNG bé. '
      + 'Văn phòng cơ sở không cần đọc để làm việc của mình, và Kế toán thì '
      + 'càng không. Mở ra là mở nguyên trang sổ của 20 bé cho người không dạy các bé đó.',
    hanhtrinh: 'Ba lớp dữ liệu của một quan sát là ranh giới chặt nhất trong cả '
      + 'app — lớp 1 chỉ cô đã ghi đọc được. Không chức vụ hành chính nào có '
      + 'phần trong đó.',
    kehoachbe: 'Kế hoạch từng bé là việc chuyên môn giữa cô và quản lý nhóm. '
      + 'Quản lý cơ sở đã thấy qua tầng cơ sở (api: null), không cần cấp thêm.',
    thuchup: 'Ghi nhanh là ghi chép thô của cô, đúng lớp 1 của bảng ba lớp.',
  };

  const thieu = [];
  for (const v of vungPhanHe) {
    const duocCap = (chucVu || []).some(c => c.api === null
      || (Array.isArray(c.api) && c.api.some(x => v.api === x || v.api.startsWith(`${x}/`))));
    // `api: null` nghĩa là chức vụ đó không bị tầng này chặn gì cả (Cấp 1 và
    // Quản lý cơ sở). Nó không tính là "đã quyết định" cho Cấp 2, nên hỏi tiếp.
    const duocCapCoDanhSach = (chucVu || []).some(c => Array.isArray(c.api)
      && c.api.some(x => v.api === x || v.api.startsWith(`${x}/`)));
    if (!duocCap) { thieu.push(`${v.key} (${v.api}) — không chức vụ nào đọc tới`); continue; }
    if (!duocCapCoDanhSach && !CO_Y_KHONG_CAP[v.key]) {
      thieu.push(`${v.key} (${v.api}) — chưa có chức vụ Cấp 2/3 nào được cấp, và chưa ghi lý do`);
    }
  }
  check('MỌI PHÂN HỆ ĐỀU ĐÃ ĐƯỢC QUYẾT ĐỊNH TƯỜNG MINH — cấp cho ai, hoặc ghi rõ vì sao không cấp',
    thieu.length === 0, thieu);

  // Chiều ngược lại: sổ lý do không được phình ra vì những phân hệ đã bị gỡ.
  const cacKey = new Set(vungPhanHe.map(v => v.key));
  const thua = Object.keys(CO_Y_KHONG_CAP).filter(k => !cacKey.has(k));
  check('sổ lý do không còn nhắc tới phân hệ đã bị gỡ', thua.length === 0, thua);

  // Và bài này phải thật sự đọc được — không thì hai phép kiểm trên luôn xanh.
  check('bộ canh thật sự đọc tới module.json của từng phân hệ',
    vungPhanHe.some(v => v.key === 'nhatky') && vungPhanHe.some(v => v.key === 'tienan'),
    vungPhanHe.map(v => v.key));
}

await sv.dung();
donThuMucTam(DIR);
tongKet();
