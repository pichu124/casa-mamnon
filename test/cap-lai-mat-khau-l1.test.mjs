// Bài canh MA TRẬN CẤP LẠI MẬT KHẨU theo L1 (góp ý 20/10 mục 12).
//
// Chạy bằng:  node test/cap-lai-mat-khau-l1.test.mjs
//
// VÌ SAO CÓ BÀI NÀY
//
// Đường cấp lại mật khẩu TRẢ THẲNG mật khẩu tạm về cho người bấm. Ai cấp lại
// được cho ai là ai đăng nhập được thành người đó. Trước L1, luật nằm trong
// một chuỗi `if` và có một lỗ: quản lý cơ sở CHƯA khoá vào cơ sở nào thì
// `phamViCoSo` trả null và chuỗi ấy nhận họ là ban giám hiệu, tức cấp lại được
// cả mật khẩu ban giám hiệu.
//
// Bài này đi TỪNG Ô của ma trận người làm × tài khoản đích, bằng lời gọi thật:
//   - ô ✓ thì phải 200, có mật khẩu tạm, và PHIÊN CỦA NGƯỜI BỊ CẤP LẠI BỊ ĐÁ;
//   - ô ✗ thì phải 403, KHÔNG có mật khẩu tạm nào lọt ra, và phiên của người
//     đích còn nguyên (từ chối mà vẫn đổi mật khẩu thì còn tệ hơn cho qua).
//
// Hàng văn phòng cơ sở cố ý toàn ✗ ở đơn vị này: cửa `/api/accounts` của văn
// phòng (lib/db.js) mở ở đơn vị sau, SAU khi luật mới đã chạy.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, khoaVaoCoSo, datChucVu,
  dungMayChu, taoBoDem, taoReq, taoLogin } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cap-lai-mat-khau-l1');
sinhDuLieu(DIR);

// Mật khẩu hiện tại của từng tài khoản — đổi theo mỗi lần cấp lại thành công.
const MK = {};
for (const u of ['giaovien', 'giaovien2', 'giaovien4', 'phuhuynh', 'ph.lan', 'ph.huong']) MK[u] = '123456';
function quanTri(hoTen, u, chucVu, coSo) {
  MK[u] = taoQuanTri(DIR, hoTen, u);
  if (chucVu) datChucVu(DIR, u, chucVu);
  if (coSo) khoaVaoCoSo(DIR, u, coSo);
}

// Người làm.
quanTri('Hiệu Trưởng', 'bgh');                                   // chưa khai chức vụ, không khoá
quanTri('Hiệu Phó', 'bgh.cv', 'hieu-truong');                    // chức vụ khai rõ, không khoá
quanTri('Hiệu Phó Khoá', 'bgh.khoa', 'hieu-truong', 'cs1');      // khoá cơ sở thì không còn là cấp 1
quanTri('Nhân Sự', 'nhansu', 'nhansu');
quanTri('Quản Lý CS1', 'ql1', 'quanly-coso', 'cs1');
quanTri('Quản Lý CS2', 'ql2', 'quanly-coso', 'cs2');
quanTri('Quản Lý Chưa Khoá', 'ql.chuakhoa', 'quanly-coso');
quanTri('Văn Phòng CS1', 'vp1', 'vanphong-coso', 'cs1');
quanTri('Văn Phòng Chưa Khoá', 'vp.chuakhoa', 'vanphong-coso');   // cấu hình dở: không cấp lại cho ai
quanTri('Bảo Vệ CS1', 'bv1', 'baove', 'cs1');
quanTri('Kế Toán', 'ketoan', 'ketoan');
quanTri('Marketing', 'marketing', 'marketing');

// Tài khoản đích (tách riêng khỏi người làm, để đá phiên đích không cắt
// ngang người đang bấm).
quanTri('Đích Ban Giám Hiệu', 'd.bgh');
quanTri('Đích Kế Toán', 'd.ketoan', 'ketoan');
quanTri('Đích Quản Lý CS1', 'd.ql1', 'quanly-coso', 'cs1');
quanTri('Đích Văn Phòng CS1', 'd.vp1', 'vanphong-coso', 'cs1');
quanTri('Đích Bảo Vệ CS1', 'd.bv1', 'baove', 'cs1');
quanTri('Đích Văn Phòng CS2', 'd.vp2', 'vanphong-coso', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7301), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u) {
  const r = await login(u, MK[u]);
  if (!r.cookie) throw new Error(`Không đăng nhập được ${u}: ${r.status}`);
  return r.cookie;
}

const BGH = await vao('bgh');
// Dựng hai cơ sở có cô và gia đình thật: nhóm Lá 1 (c2) sang cơ sở 2.
//   cô cơ sở 1: giaovien4 (Nhà trẻ 1, c4)   cô cơ sở 2: giaovien2 (Lá 1, c2)
//   PH cơ sở 1: ph.lan (bé s5, Chồi 2 — nhóm của cô giaovien)
//   PH cơ sở 2: ph.huong (bé s7, Lá 1)
{
  const r = await req('PUT', '/api/admin/classes/c2/campus', { cookie: BGH, body: { campusId: 'cs2' } });
  check('dựng bối cảnh: Lá 1 sang cơ sở 2', r.status === 200, r.data);
}

const id = {};
{
  const qt = (await req('GET', '/api/admin/managers', { cookie: BGH })).data || [];
  for (const u of qt) id[u.username] = u.id;
  Object.assign(id, { giaovien2: 't2', giaovien4: 't4', 'ph.lan': 'p4', 'ph.huong': 'p6' });
  const thieu = ['d.bgh', 'd.ketoan', 'd.ql1', 'd.vp1', 'd.bv1', 'd.vp2'].filter(u => !id[u]);
  check('đọc được mã mọi tài khoản đích', thieu.length === 0, thieu);
}

const DICH = ['d.bgh', 'd.ketoan', 'd.ql1', 'd.vp1', 'd.bv1', 'd.vp2', 'giaovien4', 'giaovien2', 'ph.lan', 'ph.huong'];
const TEN_DICH = {
  'd.bgh': 'ban giám hiệu', 'd.ketoan': 'Kế toán (cấp 2)', 'd.ql1': 'QL cơ sở 1',
  'd.vp1': 'VP cơ sở 1', 'd.bv1': 'Bảo vệ cơ sở 1', 'd.vp2': 'VP cơ sở 2',
  giaovien4: 'cô cơ sở 1', giaovien2: 'cô cơ sở 2', 'ph.lan': 'phụ huynh cơ sở 1', 'ph.huong': 'phụ huynh cơ sở 2',
};

// 1 = phải 200, 0 = phải 403, null = ô không thuộc ma trận của bài này.
//              bgh ktoan ql1 vp1 bv1 vp2 co1 co2 ph1 ph2
const MA_TRAN = {
  bgh:           [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'bgh.cv':      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'bgh.khoa':    [0, 0, 0, null, null, 0, 1, 0, 1, 0],
  nhansu:        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
  ql1:           [0, 0, 0, 1, 1, 0, 1, 0, 1, 0],
  ql2:           [0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
  'ql.chuakhoa': [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  // Văn phòng: luật đã có ('phu-huynh' trong cơ sở) nhưng cửa `/api/accounts`
  // ở lib/db.js chưa mở — commit riêng ngay sau đổi hàng này thành 1 ở ph1.
  vp1:           [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  // Văn phòng CHƯA gắn cơ sở: phạm vi rơi về cả trường — không được vì thế mà
  // cấp lại mật khẩu gia đình cả ba cơ sở.
  'vp.chuakhoa': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bv1:           [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ketoan:        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  marketing:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  giaovien:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  phuhuynh:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

// Một phiên sống cho mỗi tài khoản đích, để soi ai bị đá và ai không.
const phien = {};
for (const d of DICH) phien[d] = await vao(d);
const conPhien = async (d) => (await req('GET', '/api/auth/me', { cookie: phien[d] })).status;
{
  const song = [];
  for (const d of DICH) song.push(await conPhien(d));
  check('mọi tài khoản đích đều đang có phiên sống trước khi thử', song.every(s => s === 200), song);
}

const MAT_KHAU_TAM = /^[a-z]{5}[2-9]{3}$/;

// ===========================================================================
console.log('\n[1] Ma trận người làm × tài khoản đích');
for (const [nguoi, hang] of Object.entries(MA_TRAN)) {
  const ck = await vao(nguoi);
  for (let i = 0; i < DICH.length; i++) {
    if (hang[i] === null) continue;
    const d = DICH[i];
    const ten = `${nguoi} → ${TEN_DICH[d]}`;
    const r = await req('POST', `/api/accounts/${id[d]}/reset-password`, { cookie: ck, body: {} });
    if (hang[i]) {
      check(`${ten}: 200 kèm mật khẩu tạm`,
        r.status === 200 && MAT_KHAU_TAM.test(r.data?.temporaryPassword || ''), { status: r.status, data: r.data });
      check(`${ten}: phiên của người bị cấp lại bị đá`, (await conPhien(d)) === 401);
    } else {
      check(`${ten}: 403`, r.status === 403, r.status);
      check(`${ten}: không có mật khẩu tạm nào lọt ra`,
        !JSON.stringify(r.data || {}).includes('temporaryPassword'), r.data);
      check(`${ten}: phiên của người đích còn nguyên`, (await conPhien(d)) === 200);
    }
    // Mật khẩu đã đổi (đúng hay sai ô) thì đăng nhập lại, để một ô hỏng không
    // kéo đỏ dây chuyền các ô sau.
    if (r.data?.temporaryPassword) {
      MK[d] = r.data.temporaryPassword;
      phien[d] = await vao(d);
    }
  }
}

// ===========================================================================
console.log('\n[2] Không ai tự cấp lại cho chính mình');
{
  for (const u of ['bgh', 'ql1', 'nhansu']) {
    const ck = await vao(u);
    const r = await req('POST', `/api/accounts/${id[u]}/reset-password`, { cookie: ck, body: {} });
    check(`${u} tự cấp lại cho mình → 403`, r.status === 403 && !r.data?.temporaryPassword, r.status);
  }
}

// ===========================================================================
console.log('\n[3] Cô không còn cấp lại cho gia đình, và được chỉ đúng người giúp');
{
  const GV = await vao('giaovien');
  const r = await req('POST', `/api/accounts/${id['ph.lan']}/reset-password`, { cookie: GV, body: {} });
  check('cô → phụ huynh nhóm mình: 403', r.status === 403, r.status);
  check('câu từ chối chỉ sang văn phòng cơ sở',
    r.data?.error === 'Cấp lại mật khẩu cho gia đình nay do văn phòng cơ sở làm. '
      + 'Cô nhờ văn phòng hoặc quản lý cơ sở giúp nhé.', r.data);

  const ds = await req('GET', '/api/accounts/parents', { cookie: GV });
  check('cô KHÔNG đọc được danh sách tài khoản phụ huynh (1c-5): 403', ds.status === 403, ds.status);
  check('và nhận một câu tiếng Việt chỉ sang văn phòng cơ sở', /văn phòng cơ sở/.test(ds.data?.error || ''), ds.data);
  check('không một tên đăng nhập phụ huynh nào lọt ra', !/ph\.lan|phuhuynh/.test(JSON.stringify(ds.data || {})), ds.data);

  const NS = await vao('nhansu');
  const ns = await req('POST', `/api/accounts/${id['ph.lan']}/reset-password`, { cookie: NS, body: {} });
  check('Nhân sự → phụ huynh: câu từ chối kể đủ văn phòng cơ sở, quản lý cơ sở, ban giám hiệu',
    /văn phòng cơ sở/.test(ns.data?.error || '') && /quản lý cơ sở/.test(ns.data?.error || '')
      && /ban giám hiệu/.test(ns.data?.error || ''), ns.data);
}

// ===========================================================================
console.log('\n[4] Phép thử ngược — người còn làm được vẫn làm được');
{
  const ds = await req('GET', '/api/accounts/parents', { cookie: BGH });
  check('ban giám hiệu VẪN đọc được danh sách phụ huynh',
    ds.status === 200 && (ds.data || []).some(p => p.username === 'ph.lan'), ds.status);
  const QL1 = await vao('ql1');
  const dsQL = await req('GET', '/api/accounts/parents', { cookie: QL1 });
  const tenQL = (dsQL.data || []).map(p => p.username);
  check('quản lý cơ sở 1 đọc được phụ huynh cơ sở mình, không thấy phụ huynh cơ sở 2',
    dsQL.status === 200 && tenQL.includes('ph.lan') && !tenQL.includes('ph.huong'), tenQL);
}

sv.dung();
await new Promise(r => setTimeout(r, 300));
donThuMucTam(DIR);
tongKet();
