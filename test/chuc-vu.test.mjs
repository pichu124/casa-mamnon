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

  // TỪ Đ57: TÀI KHOẢN GIA ĐÌNH KHÔNG CÒN LÀ PHẦN VIỆC CỦA NHÂN SỰ.
  //
  // Phép kiểm này trước đây đòi điều NGƯỢC LẠI — "Nhân sự vẫn cấp lại được mật
  // khẩu cho gia đình" — vì đó là hành vi lúc bấy giờ. Đ57 siết lại: mô tả chức
  // vụ Nhân sự hứa họ "KHÔNG mở được hồ sơ bé, sức khoẻ, hay ảnh của trẻ", mà
  // cấp lại mật khẩu cho một tài khoản phụ huynh là trao đúng ba thứ ấy.
  //
  // Đây là SIẾT CHẶT, không phải nới: mục [10] cuối tệp canh đầy đủ cả hai
  // chiều, kể cả việc gia đình vẫn còn người lo giúp.
  const ph = (await req('GET', '/api/accounts/parents', { cookie: BGH })).data || [];
  const r3 = await req('POST', `/api/accounts/${ph[0].userId}/reset-password`, { cookie: NS, body: {} });
  check('Nhân sự KHÔNG cấp lại được mật khẩu cho gia đình (Đ57)', r3.status === 403, r3.data);
  check('và không có mật khẩu tạm nào của gia đình lọt ra',
    !r3.data?.temporaryPassword, Object.keys(r3.data || {}));

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
  // DANH SÁCH NÀY LÀ DỮ LIỆU, KHÔNG PHẢI MỘT QUY TẮC.
  //
  // Thêm một chức vụ thì sửa dòng này — việc bình thường, khác hẳn nới một bộ
  // canh. Nhưng liệt kê đủ MÃ chứ không đếm suông: đếm thì thay một chức vụ
  // bằng một chức vụ khác vẫn xanh, mà đó đúng là thứ phải có người nhìn.
  const MA_MONG_DOI = ['hieu-truong', 'quanly-coso', 'vanphong-coso',
    'nhansu', 'marketing', 'ketoan', 'baove'];
  check('danh mục đúng bằng bảy chức vụ đang khai, không thiếu không thừa',
    ds.length === MA_MONG_DOI.length && MA_MONG_DOI.every(m => ds.some(c => c.ma === m)),
    ds.map(c => c.ma));
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
    baocaohoctap: 'Báo cáo học tập là chữ cô viết về từng bé rồi gửi thẳng cho '
      + 'gia đình bé đó — cùng họ với Kế hoạch của bé, và cấp cho một tài khoản '
      + 'hành chính là mở nguyên hồ sơ học tập của mọi bé trong cơ sở cho người '
      + 'không dạy bé nào. Quản lý cơ sở đã thấy qua tầng cơ sở (api: null); '
      + 'Văn phòng cơ sở không cần đọc để làm việc của mình.',
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

// ===========================================================================
console.log('\n[9b] MỌI ĐƯỜNG /api/ ĐÃ ĐĂNG KÝ PHẢI CÓ CHỦ');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Các mục trên canh chiều "phân hệ nào cũng phải được chức vụ quyết định".
  // Mục này canh chiều còn lại, và là chiều đã hỏng thật: một đường `/api/...`
  // được đăng ký mà KHÔNG nằm trong vùng api của phân hệ nào cả.
  //
  // `/api/dong-y` là đúng ca đó, và hậu quả không nhìn thấy từ giao diện:
  //   • `chanApiDaTat` duyệt vùng api của từng phân hệ rồi mới `next()` —
  //     đường vô chủ rơi thẳng qua, nên tắt phân hệ Hồ sơ bé cũng không tắt
  //     được nó;
  //   • `kiemTraDuongDan` chỉ từ chối phân hệ cắm thêm khi đường của nó ĐỤNG
  //     một vùng đã khai — đường không ai khai thì một phân hệ mới chiếm được,
  //     và giấy đồng ý của gia đình đổi chủ mà không ai báo;
  //   • ở tầng chức vụ nó rơi theo chiều ĐÓNG, nên Văn phòng cơ sở GHI được
  //     giấy đồng ý mà ĐỌC lại thì 403.
  //
  // Bài này đọc mã nguồn chứ không thử tình huống. Thêm một đường mới mà quên
  // khai chủ là đỏ ngay, kể cả khi chưa ai kịp nghĩ ra tình huống để thử.
  const require4 = createRequire(import.meta.url);
  const mod = require4(path.join(GOC, 'lib', 'modules.js'));

  const vung = [];
  for (const m of mod.CORE || []) for (const a of (m.api || [])) vung.push(a);
  const MODULES3 = path.join(GOC, 'modules');
  for (const ten of fs.readdirSync(MODULES3)) {
    const tep = path.join(MODULES3, ten, 'module.json');
    if (!fs.existsSync(tep)) continue;
    for (const a of (JSON.parse(fs.readFileSync(tep, 'utf8')).api || [])) vung.push(a);
  }
  check('đọc được vùng api của phân hệ lõi và phân hệ cắm thêm', vung.length >= 20, vung.length);

  // Đọc HE_THONG từ chính lib/modules.js, không chép tay — chép tay thì hai bên
  // trôi khỏi nhau và bài canh nói về một danh sách không còn tồn tại.
  const nguon = fs.readFileSync(path.join(GOC, 'lib', 'modules.js'), 'utf8');
  const heThong = (((nguon.match(/const HE_THONG = \[([^\]]*)\]/) || [, ''])[1])
    .match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));
  check('đọc được danh sách đường hệ thống từ lib/modules.js', heThong.length >= 5, heThong);

  const coChu = (p) => vung.some(v => p === v || p.startsWith(`${v}/`))
    || heThong.some(v => p === v || p.startsWith(v) || `${p}/` === v);

  const re = /app\.(?:get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/g;
  const duong = [];
  const quet = (thuMuc) => {
    for (const m of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      const p = path.join(thuMuc, m.name);
      if (m.isDirectory()) { quet(p); continue; }
      if (!m.name.endsWith('.js')) continue;
      for (const x of fs.readFileSync(p, 'utf8').matchAll(re)) {
        if (x[1].startsWith('/api/')) duong.push({ tep: path.relative(GOC, p), duong: x[1] });
      }
    }
  };
  quet(path.join(GOC, 'routes'));
  quet(path.join(GOC, 'modules'));
  check('quét được đủ đường /api/ để soi — không quét vào chỗ rỗng',
    duong.length >= 80, duong.length);

  const voChu = duong.filter(d => !coChu(d.duong));
  check('KHÔNG ĐƯỜNG /api/ NÀO VÔ CHỦ', voChu.length === 0,
    voChu.map(d => `${d.tep} → ${d.duong}`).slice(0, 8));

  // PHÉP THỬ NGƯỢC: phép dò này có bắt được thật không.
  check('BẮT ĐƯỢC một đường không ai khai', !coChu('/api/mot-duong-chua-ai-khai'));
  check('nhận đúng đường đã có chủ', coChu('/api/students') && coChu('/api/dong-y'));
  check('và nhận đúng đường của hệ thống', coChu('/api/auth/login'));
}

// ===========================================================================
console.log('\n[9d] KHẢO SÁT: Ý KIẾN GIA ĐÌNH KHÔNG ĐI RA NGOÀI PHẠM VI NGƯỜI ĐỌC');
{
  // `POST /api/surveys` ghi cứng `audience: 'all'`, nên MỌI khảo sát đi tới cả
  // ba cơ sở. Điều đó tự nó chưa phải lỗ hổng — chỗ đọc kết quả mới là: nó trả
  // `respondents` (TÊN từng phụ huynh đã trả lời) và, với câu hỏi mở, cả CÂU
  // CHỮ họ viết kèm tên.
  //
  // Ý kiến phụ huynh gửi nhà trường thường là chuyện riêng: hoàn cảnh gia
  // đình, lý do xin nghỉ, phàn nàn về một cô cụ thể. Gửi cho trường không có
  // nghĩa là gửi cho ba mươi người.
  const ks = await req('POST', '/api/surveys', {
    cookie: BGH,
    body: {
      title: 'Khảo sát bữa ăn — thử phạm vi',
      description: 'Bài canh',
      deadline: '2030-12-31',
      questions: [{ id: 'q1', text: 'Ý kiến của gia đình', type: 'text' }],
    },
  });
  check('ban giám hiệu tạo được khảo sát', ks.status === 201, { status: ks.status, data: ks.data });
  const maKS = ks.data?.id;

  // Hai nhà ở hai nhóm khác nhau cùng trả lời.
  const nhaC1 = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1, nhóm c1
  const nhaC2 = (await login('ph.huong', '123456')).cookie;    // mẹ bé s7, nhóm c2
  const nhaC4 = (await login('ph.trang', '123456')).cookie;    // mẹ bé s9, nhóm c4
  for (const [ck, chu] of [[nhaC1, 'Nhà nhóm Chồi 2 nói'], [nhaC2, 'Nhà nhóm Lá 1 nói'],
    [nhaC4, 'Nhà nhóm Nhà trẻ nói']]) {
    const g = await req('POST', `/api/surveys/${maKS}/respond`, {
      cookie: ck, body: { answers: { q1: chu } },
    });
    check(`dựng được phiếu: ${chu}`, g.status === 200 || g.status === 201,
      { status: g.status, data: g.data });
  }

  // Dùng cô giaovien4 (nhóm Nhà trẻ, c4). Hai cô kia không dùng được ở đây:
  // mục [8] bên trên đã ĐÓNG nhóm c1, và các mục phân công đã cho cô c2 dạy
  // thêm nhóm khác. Cô nhà trẻ thì không mục nào đụng tới, nên bối cảnh sạch —
  // và có dòng đối chứng ngay dưới để nếu ngày mai có mục nào đụng vào thì bài
  // này báo đỏ thay vì lặng lẽ ngừng canh.
  const CO4 = (await login('giaovien4', '123456')).cookie;
  const nhomCuaCo4 = ((await req('GET', '/api/auth/me', { cookie: CO4 })).data?.user?.classIds) || [];
  check('đối chứng — cô này phụ trách ĐÚNG nhóm nhà trẻ, không hơn',
    nhomCuaCo4.join(',') === 'c4', nhomCuaCo4);

  const cuaCoC1 = await req('GET', `/api/surveys/${maKS}`, { cookie: CO4 });
  check('cô mở được kết quả khảo sát', cuaCoC1.status === 200, cuaCoC1.status);
  const chu1 = JSON.stringify(cuaCoC1.data || {});
  check('cô THẤY ý kiến của nhà trong nhóm mình', /Nhà nhóm Nhà trẻ nói/.test(chu1), chu1.slice(0, 300));
  check('nhưng KHÔNG thấy ý kiến của hai nhà nhóm khác',
    !/Nhà nhóm Chồi 2 nói/.test(chu1) && !/Nhà nhóm Lá 1 nói/.test(chu1), chu1.slice(0, 500));
  check('và KHÔNG thấy TÊN phụ huynh nhóm khác trong danh sách đã trả lời',
    !(cuaCoC1.data?.respondents || []).some(n => /Thu Hà|Bùi Thu Hương/.test(n)),
    cuaCoC1.data?.respondents);
  check('màn hình vẫn biết cả trường có bao nhiêu phiếu, để cô không tưởng app mất phiếu',
    cuaCoC1.data?.responseCount >= 3, cuaCoC1.data?.responseCount);
  check('và biết bao nhiêu phiếu thuộc phạm vi mình',
    cuaCoC1.data?.soPhieuTrongPhamVi === 1, cuaCoC1.data?.soPhieuTrongPhamVi);

  // BAN GIÁM HIỆU thì đọc được cả trường — không siết quá tay.
  const cuaBGH = await req('GET', `/api/surveys/${maKS}`, { cookie: BGH });
  const chuBGH = JSON.stringify(cuaBGH.data || {});
  check('BAN GIÁM HIỆU vẫn đọc được cả BA ý kiến — khảo sát là việc của họ',
    /Nhà nhóm Chồi 2 nói/.test(chuBGH) && /Nhà nhóm Lá 1 nói/.test(chuBGH)
    && /Nhà nhóm Nhà trẻ nói/.test(chuBGH),
    chuBGH.slice(0, 400));
  check('và đếm đủ số phiếu trong phạm vi', cuaBGH.data?.soPhieuTrongPhamVi >= 3,
    cuaBGH.data?.soPhieuTrongPhamVi);

  // Gia đình vẫn chỉ thấy phiếu của chính mình — vế này vốn đã đúng, canh để
  // bản vá không lỡ tay mở nó ra.
  const cuaNha = await req('GET', `/api/surveys/${maKS}`, { cookie: nhaC1 });
  const chuNha = JSON.stringify(cuaNha.data || {});
  check('gia đình KHÔNG nhận được danh sách người trả lời',
    cuaNha.data?.respondents === undefined, Object.keys(cuaNha.data || {}));
  check('và KHÔNG đọc được ý kiến của nhà khác',
    !/Nhà nhóm Lá 1 nói/.test(chuNha), chuNha.slice(0, 300));
}

// ===========================================================================
console.log('\n[9c] VĂN PHÒNG CƠ SỞ: GHI ĐƯỢC GIẤY ĐỒNG Ý THÌ PHẢI ĐỌC LẠI ĐƯỢC');
{
  // Chốt quá tay cũng là một lỗi, không chỉ chốt hụt. Văn phòng nhập giấy đồng
  // ý gia đình mang tới, rồi mở lại xem mình nhập đúng chưa — mà đường ĐỌC lại
  // nằm ngoài mọi danh sách chức vụ nên trả 403.
  const ghi = await req('PUT', '/api/admin/students/s1/dong-y', {
    cookie: VP, body: { chiaSeGiaDinh: true },
  });
  check('văn phòng cơ sở GHI được giấy đồng ý', ghi.status === 200, { status: ghi.status, data: ghi.data });

  const doc2 = await req('GET', '/api/dong-y?studentId=s1', { cookie: VP });
  check('VÀ ĐỌC LẠI ĐƯỢC — không còn 403', doc2.status === 200,
    { status: doc2.status, data: doc2.data });

  // Không nới quá tay: đọc được giấy đồng ý KHÔNG có nghĩa là chuyển được năm
  // học cho cả trường. '/api/schoolyear/lich-su-lop' là đường đầy đủ, không
  // phải tiền tố '/api/schoolyear'.
  const lichSu = await req('GET', '/api/schoolyear/lich-su-lop?studentId=s1', { cookie: VP });
  check('tra được lịch sử nhóm của bé', lichSu.status === 200, lichSu.status);
  const chuyenNam = await req('GET', '/api/schoolyear/preview', { cookie: VP });
  check('NHƯNG KHÔNG chạm được phần chuyển năm học của cả trường',
    chuyenNam.status === 403, { status: chuyenNam.status, data: chuyenNam.data });
}

// ===========================================================================
console.log('\n[10] NHÂN SỰ LO TÀI KHOẢN CỦA TRƯỜNG, KHÔNG CHẠM TÀI KHOẢN GIA ĐÌNH');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Mô tả chức vụ Nhân sự hứa với nhà trường: "KHÔNG mở được hồ sơ bé, sức
  // khoẻ, hay ảnh của trẻ". Nhưng họ có `/api/accounts`, và hai đường trong đó
  // đi vòng qua đúng lời hứa ấy: cấp lại mật khẩu cho một tài khoản PHỤ HUYNH
  // (người cấp cầm luôn mật khẩu tạm, đăng nhập vào là thấy cả ba thứ), và
  // danh sách phụ huynh trả kèm TÊN CÁC CON của từng nhà.

  // TRƯỚC HẾT: phần việc THẬT của Nhân sự phải còn nguyên. Không có phép kiểm
  // này thì siết tay quá cũng xanh, và người thiệt là chị nhân sự.
  const dsCo = await req('GET', '/api/admin/teachers', { cookie: NS });
  check('Nhân sự VẪN mở được danh sách cô — phần việc của họ không bị động tới',
    dsCo.status === 200, dsCo.status);

  const capCho = async (cookie, id) =>
    req('POST', `/api/accounts/${id}/reset-password`, { cookie, body: {} });

  // Cấp lại cho một tài khoản CỦA TRƯỜNG thì vẫn được — đó là việc của họ.
  const choCo = await capCho(NS, 't2');
  check('Nhân sự VẪN cấp lại được mật khẩu cho tài khoản của cô',
    choCo.status === 200 && !!choCo.data?.temporaryPassword, choCo.status);

  // Còn tài khoản gia đình thì không.
  const choPH = await capCho(NS, 'p1');
  check('nhưng KHÔNG cấp lại được mật khẩu cho tài khoản gia đình',
    choPH.status === 403, choPH.status);
  check('và câu từ chối chỉ đúng người làm giúp được, không bỏ gia đình giữa đường',
    /cô phụ trách nhóm|ban giám hiệu/i.test(choPH.data?.error || ''), choPH.data);

  // Danh sách phụ huynh kèm tên con cũng vậy.
  const dsPH = await req('GET', '/api/accounts/parents', { cookie: NS });
  check('Nhân sự KHÔNG mở được danh sách gia đình kèm tên các con',
    dsPH.status === 403, dsPH.status);

  // ===== PHÉP THỬ NGƯỢC — ai VẪN PHẢI làm được =====
  //
  // Không có nhóm này thì bốn phép kiểm trên vẫn xanh kể cả khi cả app mất
  // luôn đường cấp lại mật khẩu cho gia đình — tức là siết chặt tới mức làm
  // hỏng việc của trường mà bài test không hé một tiếng.
  const bghChoPH = await capCho(BGH, 'p1');
  check('ban giám hiệu VẪN cấp lại được cho gia đình', bghChoPH.status === 200, bghChoPH.status);

  // Dùng cô giaovien3 chứ không phải GV: mục [8] bên trên đã ĐÓNG nhóm c1, nên
  // cô của c1 không còn nhóm đang mở nào để mà cấp lại. giaovien3 dạy cả c1 lẫn
  // c2, và con thứ hai của nhà p1 đang học c2.
  const GV3 = (await login('giaovien3', '123456')).cookie;
  const coChoPH = await capCho(GV3, 'p1');
  check('cô của nhóm bé VẪN cấp lại được cho gia đình nhóm mình',
    coChoPH.status === 200, coChoPH.status);

  const bghDsPH = await req('GET', '/api/accounts/parents', { cookie: BGH });
  check('ban giám hiệu VẪN mở được danh sách gia đình',
    bghDsPH.status === 200 && Array.isArray(bghDsPH.data), bghDsPH.status);
  check('và danh sách đó có thật sự kèm tên con — nếu không thì phép kiểm trên rỗng',
    (bghDsPH.data || []).some(x => (x.children || []).length > 0), bghDsPH.data);
}

// ===========================================================================
console.log('\n[11] ẢNH CAMBRIDGE CŨNG PHẢI THEO LỜI HỨA CỦA CHỨC VỤ MARKETING');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // Mục [7] đã canh rất kỹ lời hứa "Marketing chỉ thấy ảnh mà MỌI bé trong ảnh
  // đều có đồng ý truyền thông" — nhưng chỉ canh ở phân hệ Album. Chức vụ
  // `marketing` còn có `/api/cambridge` trong danh sách cho phép, mà chốt duy
  // nhất bên đó hỏi `role === 'parent'`. Marketing là `role === 'admin'` nên đi
  // thẳng qua, cả đường liệt kê lẫn đường trả byte của ảnh.
  //
  // Không phải ảnh vô thưởng vô phạt: chú thích đầu phân hệ tự viết "một tờ
  // Home Connection của nhóm Chồi 2 gần như chắc chắn có ảnh các bé Chồi 2 đang
  // làm việc". Và ô ③ (truyền thông) MẶC ĐỊNH KHÔNG TÍCH.
  const bai = await req('POST', '/api/cambridge', {
    cookie: BGH,
    body: {
      loai: 'ket-noi', tieuDe: 'Home Connection tuần 3', phamVi: 'nhom',
      classId: 'c2', noiDung: 'Tuần này các bé làm việc với khay rót nước.',
      anh: [ANH],
    },
  });
  check('văn phòng đăng được bài Cambridge có ảnh', bai.status === 201, `${bai.status} ${JSON.stringify(bai.data).slice(0, 140)}`);
  const baiId = bai.data?.id;
  await req('POST', `/api/cambridge/${baiId}/cong-bo`, { cookie: BGH });

  const tenAnh = (bai.data?.anh || [])[0];
  check('lấy được tên tệp ảnh để thử tải thẳng', !!tenAnh, bai.data?.anh);

  // VẾ KHẲNG ĐỊNH TRƯỚC: văn phòng vẫn thấy ảnh. Không có phép kiểm này thì
  // mọi phép kiểm phủ định dưới xanh cả khi bài không có ảnh nào.
  const cuaVp = (await req('GET', '/api/cambridge', { cookie: BGH })).data;
  const baiVp = (cuaVp?.bai || []).find(x => x.id === baiId);
  check('văn phòng VẪN thấy ảnh của bài đó', (baiVp?.anh || []).length === 1, baiVp?.anh);

  // MẶC ĐỊNH: bài được coi là ảnh CÓ mặt bé → Marketing không thấy.
  const cuaMk = (await req('GET', '/api/cambridge', { cookie: MK })).data;
  const baiMk = (cuaMk?.bai || []).find(x => x.id === baiId);
  check('Marketing VẪN thấy chính bài đó — chỉ phần ảnh mới bị cắt', !!baiMk, (cuaMk?.bai || []).length);
  check('Marketing KHÔNG nhận được tên tệp ảnh Cambridge', (baiMk?.anh || []).length === 0, baiMk?.anh);
  check('và màn hình của họ nói rõ vì sao, kèm cách làm nó hiện lại',
    /không có mặt bé nào/.test(baiMk?.nhacAnhTamAn || ''), baiMk?.nhacAnhTamAn);

  // CHỐT CHẶN THẬT: đường trả về đúng các byte. Cắt ở danh sách là chưa đủ —
  // tên tệp nằm trong gói JSON họ đã nhận ở lần xem trước.
  const byteMk = await req('GET', `/api/cambridge/anh/${tenAnh}`, { cookie: MK });
  check('Marketing KHÔNG tải được byte nào của ảnh Cambridge', byteMk.status === 403, byteMk.status);

  // Và văn phòng thì tải được — nếu không, phép kiểm trên xanh vì tệp hỏng.
  const byteVp = await req('GET', `/api/cambridge/anh/${tenAnh}`, { cookie: BGH });
  check('văn phòng VẪN tải được đúng tệp đó', byteVp.status === 200, byteVp.status);

  // ĐƯỜNG RA CÓ SẴN: văn phòng tích ô "Ảnh không có mặt bé nào" thì đồng ý
  // truyền thông không còn là câu hỏi. Tính năng không chết.
  await req('PUT', `/api/cambridge/${baiId}`, { cookie: BGH, body: { anhCoMatBe: false } });
  const sau = (await req('GET', '/api/cambridge', { cookie: MK })).data;
  const baiSau = (sau?.bai || []).find(x => x.id === baiId);
  check('tích "ảnh không có mặt bé nào" thì Marketing thấy ảnh', (baiSau?.anh || []).length === 1, baiSau?.anh);
  const byteSau = await req('GET', `/api/cambridge/anh/${tenAnh}`, { cookie: MK });
  check('và tải được', byteSau.status === 200, byteSau.status);

  // Bỏ tích là mất quyền ngay, không cần làm gì thêm.
  await req('PUT', `/api/cambridge/${baiId}`, { cookie: BGH, body: { anhCoMatBe: true } });
  const byteLai = await req('GET', `/api/cambridge/anh/${tenAnh}`, { cookie: MK });
  check('bỏ tích thì Marketing mất quyền tải ngay', byteLai.status === 403, byteLai.status);
}

// ===========================================================================
console.log('\n[12] ĐƯỜNG CŨ SỬA NHÓM KHÔNG ĐƯỢC LÀ LỐI ĐI VÒNG QUA CHỐT PHÂN CÔNG CÔ');
{
  // VÌ SAO MỤC NÀY ĐÁNG GIÁ
  //
  // `PUT /api/admin/classes/:id/teachers` có `chanNeuVanPhong`, vì mô tả chức vụ
  // Văn phòng cơ sở nói rõ họ "KHÔNG đụng tài khoản và KHÔNG phân công cô".
  // Nhưng đường CŨ `PUT /api/admin/classes/:id` cũng phân công cô được — chỉ
  // cần gửi kèm trường `teacherId` — và trước bản vá nó không hỏi chốt đó lần
  // nào. Một chốt chỉ đứng ở một trong hai cửa cùng dẫn vào một phòng.

  // VẾ KHẲNG ĐỊNH TRƯỚC: văn phòng vẫn phải sửa được tên nhóm. Đây là việc hằng
  // ngày của họ, và nếu chốt gắn cho CẢ ĐƯỜNG thì mục này báo đỏ đúng lúc siết
  // quá tay.
  const doiTen = await req('PUT', '/api/admin/classes/c2', {
    cookie: VP, body: { name: 'Lá 1' },
  });
  check('văn phòng cơ sở VẪN sửa được tên nhóm qua đường cũ', doiTen.status === 200,
    `${doiTen.status} ${doiTen.data?.error || ''}`);

  // Còn phân công cô thì không — dù gửi qua đường cũ.
  const ganCu = await req('PUT', '/api/admin/classes/c2', {
    cookie: VP, body: { teacherId: 't2' },
  });
  check('nhưng KHÔNG phân công được cô qua đường cũ', ganCu.status === 403, ganCu.status);
  check('và lời từ chối nói đúng việc bị chặn',
    /phân công cô/i.test(ganCu.data?.error || ''), ganCu.data);

  // Đường mới vẫn chặn như cũ — hai cửa nay nói cùng một câu.
  const ganMoi = await req('PUT', '/api/admin/classes/c2/teachers', {
    cookie: VP, body: { teacherIds: ['t2'], chinhId: 't2' },
  });
  check('đường mới vẫn chặn như trước', ganMoi.status === 403, ganMoi.status);

  // ---- VÀ CANH CƠ SỞ CỦA CHÍNH CÔ ẤY, KHÔNG CHỈ CỦA NHÓM TRONG ĐỊA CHỈ ----
  //
  // `datChuNhiem` → `db.setHomeroomTeacher` quét TOÀN BỘ các nhóm cô từng dạy
  // rồi gỡ cô khỏi tất cả các nhóm khác. `duocChamNhom` ở đầu đường chỉ canh
  // nhóm ghi trong địa chỉ. Nên quản lý cơ sở 1 phân công một cô là cô ấy lặng
  // lẽ mất quyền ở cơ sở 2 — mà `class_teachers` là nguồn sự thật duy nhất của
  // quyền đọc hồ sơ trẻ.
  await req('PUT', '/api/admin/classes/c2/campus', { cookie: BGH, body: { campusId: 'cs1' } });
  await req('PUT', '/api/admin/classes/c3/campus', { cookie: BGH, body: { campusId: 'cs2' } });
  await req('PUT', '/api/admin/classes/c2/teachers', {
    cookie: BGH, body: { teacherIds: ['t2'], chinhId: 't2' },
  });
  await req('PUT', '/api/admin/classes/c3/teachers', {
    cookie: BGH, body: { teacherIds: ['t2'], chinhId: 't2' },
  });
  const dsTruoc = (await req('GET', '/api/admin/teachers', { cookie: BGH })).data || [];
  const t2Truoc = dsTruoc.find(t => t.id === 't2');
  check('dựng được cô dạy CẢ HAI cơ sở — nếu không thì phép kiểm sau rỗng',
    (t2Truoc?.classIds || []).includes('c2') && (t2Truoc?.classIds || []).includes('c3'),
    t2Truoc?.classIds);

  const cheoCoSo = await req('PUT', '/api/admin/classes/c2', {
    cookie: QL, body: { teacherId: 't2' },
  });
  check('quản lý cơ sở 1 KHÔNG phân công lại được cô đang dạy cả cơ sở 2',
    cheoCoSo.status === 403, `${cheoCoSo.status} ${cheoCoSo.data?.error || ''}`);
  check('và lời từ chối nói rõ vì sao, không chỉ "không có quyền"',
    /cơ sở khác/i.test(cheoCoSo.data?.error || ''), cheoCoSo.data);

  const dsSau = (await req('GET', '/api/admin/teachers', { cookie: BGH })).data || [];
  const t2Sau = dsSau.find(t => t.id === 't2');
  check('và cô KHÔNG bị mất nhóm nào ở cơ sở kia',
    (t2Sau?.classIds || []).includes('c2') && (t2Sau?.classIds || []).includes('c3'),
    t2Sau?.classIds);

  // Ban giám hiệu (toàn hệ thống) thì vẫn làm được — đó đúng là người nên làm.
  const cuaBgh = await req('PUT', '/api/admin/classes/c2', { cookie: BGH, body: { teacherId: 't2' } });
  check('ban giám hiệu toàn hệ thống VẪN phân công được', cuaBgh.status === 200,
    `${cuaBgh.status} ${cuaBgh.data?.error || ''}`);
}

// ===========================================================================
console.log('\n[13] /api/auth/me KHÔNG ĐƯỢC LÀ CỬA SAU DẪN TỚI HỒ SƠ BÉ');
{
  // `/api/auth` mở cho MỌI chức vụ — cắt nó là app trắng màn hình ngay sau khi
  // đăng nhập, nên tầng chức vụ tự miễn trừ đường này. Lời khai đi kèm chỗ
  // miễn trừ ấy là "hai đường đầu nói về chính người đang đăng nhập". Với
  // `mePayload` thì lời khai đó SAI: nó trải trọn một dòng của bảng `students`,
  // gồm địa chỉ nhà, nhóm máu và tiền sử bệnh của trẻ.
  //
  // Đo được trước khi vá: Kế toán nhận 403 ở `/api/students` đúng như thiết kế,
  // rồi nhận đủ 11 bé kèm địa chỉ và dị ứng qua `/api/auth/me`. Mà chính
  // `lib/db.js` mô tả vai Kế toán là "KHÔNG cần và KHÔNG mở được hồ sơ bé".
  const NHAY_CAM = ['address', 'bloodType', 'allergies', 'ethnicity', 'dob',
    'soDinhDanh', 'tienSuBenh', 'parentIds'];

  for (const [ten, cookie] of [['Nhân sự', NS], ['Marketing', MK], ['Kế toán', KT]]) {
    const me = (await req('GET', '/api/auth/me', { cookie })).data || {};
    const ds = me.students || [];
    const lo = [];
    for (const b of ds) for (const k of NHAY_CAM) if (b[k] !== undefined) lo.push(`${k}`);
    check(`${ten}: /api/auth/me KHÔNG mang trường nhạy cảm nào của bé`,
      lo.length === 0, [...new Set(lo)]);
  }

  // ĐỐI CHỨNG — không có vế này thì cả mục xanh khi danh sách bé rỗng.
  const meKT = (await req('GET', '/api/auth/me', { cookie: KT })).data || {};
  check('đối chứng: Kế toán VẪN nhận được danh sách bé để dựng ô chọn',
    (meKT.students || []).length > 0, (meKT.students || []).length);
  check('và vẫn đủ mã + tên + nhóm để màn Học phí chạy',
    (meKT.students || []).every(b => b.id && b.name && 'className' in b),
    (meKT.students || [])[0]);

  // Vế ngược: vai ĐƯỢC mở hồ sơ bé thì không bị cắt oan.
  const meVP = (await req('GET', '/api/auth/me', { cookie: VP })).data || {};
  check('VĂN PHÒNG CƠ SỞ (có /api/students) vẫn nhận đủ hồ sơ như cũ',
    (meVP.students || []).some(b => 'address' in b),
    (meVP.students || [])[0] && Object.keys((meVP.students || [])[0]).length);
  const meBGH = (await req('GET', '/api/auth/me', { cookie: BGH })).data || {};
  check('và ban giám hiệu cũng vậy',
    (meBGH.students || []).some(b => 'address' in b),
    (meBGH.students || []).length);
}

// ===========================================================================
console.log('\n[14] CHUYỂN NHÓM CHO BÉ PHẢI HỎI CƠ SỞ CỦA NHÓM ĐÍCH');
{
  // `duocChamBe` tra theo nhóm HIỆN TẠI của bé, nên nó chỉ trả lời được câu
  // "bé này có thuộc cơ sở của mình không". Thiếu chốt trên nhóm ĐÍCH thì
  // quản trị Cấp 3 đẩy được một bé sang cơ sở khác — và đẩy xong là mất luôn,
  // vì lượt kéo về vướng đúng `duocChamBe`. Một chiều, không hoàn tác được
  // bằng chính màn hình vừa gây ra nó.
  //
  // Mục [7] của test/co-so-quan-tri.test.mjs theo thiết kế KHÔNG bắt được ca
  // này: nó chỉ hỏi "thân đường dẫn có nhắc tên một hàm canh không", mà thân
  // đường này có nhắc `duocChamBe`.
  await req('PUT', '/api/admin/classes/c2/campus', { cookie: BGH, body: { campusId: 'cs2' } });
  const cuaMinh = (await req('GET', '/api/admin/students', { cookie: QL })).data || [];
  const be = cuaMinh[0];
  check('quản lý cơ sở 1 có bé để thử', !!be, cuaMinh.length);

  const day = await req('PUT', `/api/admin/students/${be.id}`,
    { cookie: QL, body: { classId: 'c2' } });
  // 404 chứ không phải 403 — đúng nếp `khongThuocCoSo` của tệp này: không nói
  // cho Cấp 3 biết là nhóm ấy CÓ THẬT ở cơ sở khác.
  check('KHÔNG ĐẨY ĐƯỢC BÉ SANG NHÓM CỦA CƠ SỞ KHÁC', day.status === 404,
    `${day.status} ${JSON.stringify(day.data)}`);
  check('và câu từ chối nói đúng thứ bị chặn là nhóm lớp',
    /nhóm lớp/i.test(day.data?.error || ''), day.data?.error);

  const conDo = (await req('GET', '/api/admin/students', { cookie: QL })).data || [];
  check('bé vẫn còn trong tầm của quản lý cơ sở 1 — không bị đẩy đi mất',
    conDo.some(x => x.id === be.id), conDo.length);

  // Vế ngược: chuyển trong CÙNG cơ sở thì vẫn phải làm được.
  // Nhóm đích: tự tạo một nhóm mới bằng CHÍNH tài khoản quản lý cơ sở 1 —
  // đường tạo nhóm gắn sẵn cơ sở của người tạo, nên chắc chắn nó thuộc cs1.
  // Không đi mò trong dữ liệu mẫu: các mục trên đã chuyển nhóm qua lại nhiều
  // lần, và một bài canh phụ thuộc phần sót lại của mục trước là bài canh hay
  // vỡ vì lý do chẳng liên quan gì tới thứ nó định canh.
  const nhomMoi = await req('POST', '/api/admin/classes',
    { cookie: QL, body: { name: 'Nhà trẻ 2 (thử chuyển nhóm)' } });
  const dich = { id: nhomMoi.data?.id || null };
  check('dựng được một nhóm mới thuộc chính cơ sở 1 để làm đích',
    !!dich.id, `${nhomMoi.status} ${JSON.stringify(nhomMoi.data)}`);
  if (dich.id) {
    const trongCoSo = await req('PUT', `/api/admin/students/${be.id}`,
      { cookie: QL, body: { classId: dich.id } });
    check('nhưng chuyển sang nhóm KHÁC CỦA CHÍNH CƠ SỞ MÌNH thì vẫn được',
      trongCoSo.status === 200, `${trongCoSo.status} ${JSON.stringify(trongCoSo.data)}`);
  } else {
    check('nhưng chuyển sang nhóm KHÁC CỦA CHÍNH CƠ SỞ MÌNH thì vẫn được',
      false, 'KHÔNG DỰNG ĐƯỢC TÌNH HUỐNG: cơ sở 1 chỉ còn một nhóm.');
  }

  // Và ban giám hiệu vẫn chuyển được qua lại giữa các cơ sở.
  const bgh = await req('PUT', `/api/admin/students/${be.id}`,
    { cookie: BGH, body: { classId: 'c2' } });
  check('ban giám hiệu toàn hệ thống vẫn chuyển được giữa hai cơ sở',
    bgh.status === 200, `${bgh.status} ${JSON.stringify(bgh.data)}`);
}

await sv.dung();
donThuMucTam(DIR);
tongKet();
