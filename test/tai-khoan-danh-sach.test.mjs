// Bài canh DANH SÁCH TÀI KHOẢN — `GET /api/accounts/danh-sach` (L1, đơn vị 3).
//
// Chạy bằng:  node test/tai-khoan-danh-sach.test.mjs
//
// VÌ SAO CÓ BÀI NÀY
//
// Tab Tài khoản vẽ nút "Cấp lại" theo cờ `capLai` của từng dòng. Cờ ấy mà nói
// khác đường cấp lại thì có hai kiểu hỏng: nút hiện ra rồi bấm vào bị từ chối
// (người dùng mất lòng tin vào màn hình), hoặc tệ hơn, màn hình giấu nút mà
// đường vẫn mở. Nên mục [5] đi TỪNG DÒNG mà từng người nhận được và bấm thật:
// `capLai === false` thì phải 403, `capLai === true` thì phải 200.
//
// Danh sách cũng là chỗ dễ rò tên bé và phụ huynh sang cơ sở khác nhất — một
// lượt gọi trả về cả trường. Mục [4] soi bằng mã và tên, không bằng số đếm.
//
// Mục [6] đếm ĐÚNG SỐ LƯỢT hỏi SQLite khi trường phình ra (khuôn của
// test/album-hieu-nang.test.mjs): một `db.first` đặt trong vòng lặp phụ huynh
// là đủ quay về kiểu "một câu cho mỗi dòng".
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, khoaVaoCoSo, datChucVu,
  dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const require2 = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();

function tren(dir, ma, doiSo = []) {
  execFileSync('node', ['-e', `const D = require('better-sqlite3');
    const db = new D(process.argv[1]);
    ${ma}
    db.close();`, path.join(dir, 'school.db'), ...doiSo], { cwd: GOC, stdio: 'inherit' });
}

const DIR = thuMucTam('tai-khoan-danh-sach');
sinhDuLieu(DIR);

const MK = {};
function quanTri(hoTen, u, chucVu, coSo) {
  MK[u] = taoQuanTri(DIR, hoTen, u);
  if (chucVu) datChucVu(DIR, u, chucVu);
  if (coSo) khoaVaoCoSo(DIR, u, coSo);
}
quanTri('Hiệu Trưởng', 'bgh');
quanTri('Nhân Sự', 'nhansu', 'nhansu');
quanTri('Quản Lý CS1', 'ql1', 'quanly-coso', 'cs1');
quanTri('Quản Lý CS2', 'ql2', 'quanly-coso', 'cs2');
quanTri('Quản Lý Chưa Khoá', 'ql.chuakhoa', 'quanly-coso');
quanTri('Văn Phòng CS1', 'vp1', 'vanphong-coso', 'cs1');
quanTri('Văn Phòng CS2', 'vp2', 'vanphong-coso', 'cs2');
quanTri('Bảo Vệ CS1', 'bv1', 'baove', 'cs1');
quanTri('Kế Toán', 'ketoan', 'ketoan');
quanTri('Marketing', 'marketing', 'marketing');
// Tài khoản đích không dùng để đăng nhập — cấp lại thoải mái.
quanTri('Đích Văn Phòng CS1', 'd.vp1', 'vanphong-coso', 'cs1');
quanTri('Đích Bảo Vệ CS1', 'd.bv1', 'baove', 'cs1');
quanTri('Đích Văn Phòng CS2', 'd.vp2', 'vanphong-coso', 'cs2');
quanTri('Đích Kế Toán', 'd.ketoan', 'ketoan');

// Cô vừa được quản lý cơ sở 1 tạo, CHƯA TỪNG có nhóm: thuộc cơ sở 1 qua
// `giao_vien_co_so` (Đ239d1), phải nằm ở `coChuaNhom` của cơ sở 1.
tren(DIR, `
  const h = db.prepare("SELECT passwordHash FROM users WHERE id = 't1'").get().passwordHash;
  db.prepare("INSERT INTO users (id, username, passwordHash, role, name, title, active) VALUES ('t.moi', 'co.moi', ?, 'teacher', 'Đặng Thị Mới', 'Cô', 1)").run(h);
  db.prepare("INSERT INTO giao_vien_co_so (userId, campusId, taoLuc) VALUES ('t.moi', 'cs1', ?)").run(new Date().toISOString());
`);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7321), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, mk = MK[u]) {
  const r = await login(u, mk);
  if (!r.cookie) throw new Error(`Không đăng nhập được ${u}: ${r.status}`);
  return r.cookie;
}
async function layDs(ck) {
  const r = await req('GET', '/api/accounts/danh-sach', { cookie: ck });
  // Hình dạng rỗng khi bị từ chối, để một mục đỏ không kéo sập cả bài.
  const data = r.status === 200 ? r.data : { quanTri: [], coSo: [], ...(r.data || {}) };
  return { ...r, data };
}

// Bối cảnh hai cơ sở (cùng khuôn test/cap-lai-mat-khau-l1.test.mjs):
//   cơ sở 1: Chồi 2 (c1: cô t1 chính, t3, t5 nước ngoài) và Nhà trẻ 1 (c4: t4, t5)
//   cơ sở 2: Lá 1 (c2: t2, t3, t5) và Mầm 1 (c3: t6)
//   nhà p1 (bé s1 ở c1, s2 ở c2) và p3 (s4 ở c1, s8 ở c2) có con ở CẢ HAI cơ sở.
const BGH = await vao('bgh');
{
  const r = await req('PUT', '/api/admin/classes/c2/campus', { cookie: BGH, body: { campusId: 'cs2' } });
  check('dựng bối cảnh: Lá 1 sang cơ sở 2', r.status === 200, r.data);
}

// Gom mọi thứ một danh sách để lộ ra, để so bằng mã chứ không bằng số đếm.
function trai(ds) {
  const dong = [];
  const nhom = [];
  const con = [];
  const coSo = [];
  for (const d of ds.quanTri || []) dong.push({ ...d, cho: 'quanTri' });
  for (const k of ds.coSo || []) {
    coSo.push(k.campusId);
    for (const d of k.nhanVien) dong.push({ ...d, cho: `nhanVien:${k.campusId}` });
    for (const d of k.coChuaNhom) dong.push({ ...d, cho: `coChuaNhom:${k.campusId}` });
    for (const n of k.nhom) {
      nhom.push(n.classId, n.ten);
      for (const d of n.co) dong.push({ ...d, cho: `co:${n.classId}` });
      for (const d of n.phuHuynh) {
        dong.push({ ...d, cho: `phuHuynh:${n.classId}` });
        con.push(...(d.con || []));
      }
    }
  }
  return { dong, nhom, con, coSo, id: new Set(dong.map(d => d.id)), ten: new Set(dong.map(d => d.username)) };
}
const timNhom = (ds, campusId, classId) =>
  (ds.coSo.find(k => k.campusId === campusId) || { nhom: [] }).nhom.find(n => n.classId === classId);

const TACTOR = ['bgh', 'nhansu', 'ql1', 'ql2', 'ql.chuakhoa', 'vp1', 'vp2'];
const CK = {};
for (const u of TACTOR) CK[u] = await vao(u);
const DS = {};

try {
  // =========================================================================
  console.log('\n[1] Cô, phụ huynh và chức vụ không lo tài khoản: 403');
  {
    for (const [u, mk, ten] of [
      ['giaovien', '123456', 'cô'], ['phuhuynh', '123456', 'phụ huynh'],
      ['ketoan', MK.ketoan, 'Kế toán'], ['marketing', MK.marketing, 'Marketing'], ['bv1', MK.bv1, 'Bảo vệ'],
    ]) {
      const r = await layDs(await vao(u, mk));
      check(`${ten} gọi danh sách tài khoản → 403`, r.status === 403, r.status);
      check(`${ten}: không một tên đăng nhập nào lọt ra`,
        !/ph\.lan|giaovien|"username"/.test(JSON.stringify(r.data || {})), r.data);
    }
  }

  // =========================================================================
  console.log('\n[2] Ban giám hiệu nhận đủ: quản trị, ba cơ sở, nhóm, cô, gia đình');
  {
    const r = await layDs(CK.bgh);
    check('ban giám hiệu: 200', r.status === 200, r.status);
    const ds = DS.bgh = r.data;
    const t = trai(ds);
    const quanTri = (ds.quanTri || []).map(d => d.username);
    check('`quanTri` có tài khoản quản trị không khoá cơ sở (Nhân sự, Kế toán, chính mình)',
      ['bgh', 'nhansu', 'ketoan', 'ql.chuakhoa'].every(u => quanTri.includes(u)), quanTri);
    check('`quanTri` KHÔNG có tài khoản đã khoá vào một cơ sở', !quanTri.some(u => ['ql1', 'vp1', 'd.vp2'].includes(u)), quanTri);
    check('mỗi cơ sở đang mở một khối', ['cs1', 'cs2', 'cs3'].every(c => t.coSo.includes(c)), t.coSo);
    const nv1 = (ds.coSo.find(k => k.campusId === 'cs1') || { nhanVien: [] }).nhanVien.map(d => d.username);
    check('nhân viên cơ sở 1: quản lý, văn phòng, bảo vệ của cơ sở 1, không ai của cơ sở 2',
      ['ql1', 'vp1', 'bv1', 'd.vp1', 'd.bv1'].every(u => nv1.includes(u)) && !nv1.some(u => ['ql2', 'vp2', 'd.vp2'].includes(u)), nv1);
    const vp1 = t.dong.find(d => d.username === 'vp1');
    check('dòng văn phòng có loại và tên chức vụ', vp1?.loai === 'nhan-vien-co-so' && vp1?.chucVuTen === 'Văn phòng cơ sở', vp1);
    const choi2 = timNhom(ds, 'cs1', 'c1');
    check('Chồi 2 nằm trong khối cơ sở 1, Lá 1 trong khối cơ sở 2',
      !!choi2 && choi2.ten === 'Chồi 2' && !!timNhom(ds, 'cs2', 'c2'), t.nhom);
    const t1 = choi2?.co.find(d => d.id === 't1');
    const t5 = choi2?.co.find(d => d.id === 't5');
    check('cô t1 là cô chính của Chồi 2, cô t5 là cô nước ngoài',
      t1?.coChinh === true && t1?.loai === 'co' && t5?.coChinh === false && t5?.nhomCo === 'nuoc-ngoai', { t1, t5 });
    check('cô phụ trách chính đứng đầu nhóm', choi2?.co[0]?.id === 't1', choi2?.co.map(d => d.id));
    const p1Cs1 = choi2?.phuHuynh.find(d => d.id === 'p1');
    const p1Cs2 = timNhom(ds, 'cs2', 'c2')?.phuHuynh.find(d => d.id === 'p1');
    check('nhà có con ở hai cơ sở: mỗi nhóm chỉ kể đúng bé của nhóm ấy',
      JSON.stringify(p1Cs1?.con) === '["Nguyễn Bảo An"]' && JSON.stringify(p1Cs2?.con) === '["Nguyễn Bảo Nam"]', { p1Cs1, p1Cs2 });
    check('dòng phụ huynh có số điện thoại và loại', p1Cs1?.sdt === '0912 345 678' && p1Cs1?.loai === 'phu-huynh', p1Cs1);
    const coMoi = (ds.coSo.find(k => k.campusId === 'cs1') || { coChuaNhom: [] }).coChuaNhom.map(d => d.id);
    check('cô chưa từng có nhóm do cơ sở 1 tạo nằm ở `coChuaNhom` của cơ sở 1', coMoi.includes('t.moi'), coMoi);
    check('không mật khẩu băm nào lọt ra', !JSON.stringify(ds).includes('passwordHash'));
    check('chính mình: capLai === false', t.dong.find(d => d.username === 'bgh')?.capLai === false);
  }

  // =========================================================================
  console.log('\n[3] Nhân sự chỉ nhận dòng cô — không gia đình, không tên bé');
  {
    const r = await layDs(CK.nhansu);
    check('Nhân sự: 200', r.status === 200, r.status);
    const ds = DS.nhansu = r.data;
    const t = trai(ds);
    check('Nhân sự không nhận `quanTri`', (ds.quanTri || []).length === 0, ds.quanTri);
    check('Nhân sự KHÔNG thấy một dòng phụ huynh nào',
      !t.dong.some(d => d.loai === 'phu-huynh' || d.cho.startsWith('phuHuynh')), t.dong.filter(d => d.loai === 'phu-huynh'));
    check('mọi dòng Nhân sự nhận đều là cô', t.dong.length > 0 && t.dong.every(d => d.loai === 'co'),
      t.dong.filter(d => d.loai !== 'co').map(d => d.username));
    check('Nhân sự thấy cô của cả hai cơ sở', ['t1', 't2', 't6', 't.moi'].every(id => t.id.has(id)), [...t.id]);
    const chu = JSON.stringify(ds);
    check('không tên bé nào, không tên đăng nhập phụ huynh nào trong câu trả lời',
      !/Nguyễn Bảo An|Đỗ Khánh Vy|Bùi Minh Thư|ph\.lan|phuhuynh/.test(chu), chu.slice(0, 200));
  }

  // =========================================================================
  console.log('\n[4] Quản lý và văn phòng cơ sở chỉ thấy cơ sở của mình');
  {
    const CS = {
      cs1: {
        nhom: ['c1', 'c4', 'Chồi 2', 'Nhà trẻ 1'],
        tk: ['giaovien', 'giaovien4', 'co.moi', 'ph.lan', 'ph.trang', 'ql1', 'vp1', 'd.vp1', 'd.bv1'],
        be: ['Nguyễn Bảo An', 'Đỗ Khánh Vy', 'Vũ Đức Anh', 'Ngô Gia Huy'],
      },
      cs2: {
        nhom: ['c2', 'c3', 'Lá 1', 'Mầm 1'],
        tk: ['giaovien2', 'giaovien.nn2', 'ph.huong', 'ql2', 'vp2', 'd.vp2'],
        be: ['Nguyễn Bảo Nam', 'Bùi Minh Thư', 'Vũ Hải Đăng'],
      },
    };
    for (const [u, cua, khac] of [['ql1', 'cs1', 'cs2'], ['vp1', 'cs1', 'cs2'], ['ql2', 'cs2', 'cs1'], ['vp2', 'cs2', 'cs1']]) {
      const r = await layDs(CK[u]);
      check(`${u}: 200`, r.status === 200, r.status);
      const ds = DS[u] = r.data;
      const t = trai(ds);
      check(`${u}: không nhận \`quanTri\``, (ds.quanTri || []).length === 0, ds.quanTri);
      check(`${u}: đúng một khối, là cơ sở ${cua}`, JSON.stringify(t.coSo) === JSON.stringify([cua]), t.coSo);
      check(`${u}: thấy nhóm, cô, gia đình, nhân viên của cơ sở mình`,
        CS[cua].nhom.every(x => t.nhom.includes(x)) && CS[cua].tk.every(x => t.ten.has(x)),
        { nhom: t.nhom, thieu: CS[cua].tk.filter(x => !t.ten.has(x)) });
      check(`${u}: KHÔNG một nhóm nào của cơ sở kia`, !CS[khac].nhom.some(x => t.nhom.includes(x)), t.nhom);
      check(`${u}: KHÔNG một tài khoản nào chỉ thuộc cơ sở kia`,
        !CS[khac].tk.some(x => t.ten.has(x)), CS[khac].tk.filter(x => t.ten.has(x)));
      check(`${u}: KHÔNG một tên bé nào của cơ sở kia`, !CS[khac].be.some(x => t.con.includes(x)),
        CS[khac].be.filter(x => t.con.includes(x)));
      check(`${u}: tên bé cơ sở kia không xuất hiện ở bất kỳ chỗ nào của câu trả lời`,
        !CS[khac].be.some(x => JSON.stringify(ds).includes(x)));
    }
    const t = trai(DS.ql1);
    const p3 = t.dong.find(d => d.id === 'p3');
    check('nhà có con ở hai cơ sở: quản lý cơ sở 1 chỉ thấy bé cơ sở 1', JSON.stringify(p3?.con) === '["Vũ Đức Anh"]', p3);

    const r = await layDs(await vao('ql.chuakhoa'));
    const t2 = trai(r.data || {});
    check('quản lý chưa khoá cơ sở: thấy cả trường nhưng không nhận `quanTri`',
      r.status === 200 && (r.data?.quanTri || []).length === 0 && ['cs1', 'cs2'].every(c => t2.coSo.includes(c)), t2.coSo);
    check('quản lý chưa khoá cơ sở: không dòng quản trị nào có capLai',
      t2.dong.filter(d => !['co', 'phu-huynh'].includes(d.loai)).every(d => d.capLai === false));
    DS['ql.chuakhoa'] = r.data;
  }

  // =========================================================================
  console.log('\n[5] Cờ capLai khớp đúng đường cấp lại, từng dòng');
  {
    const MAT_KHAU_TAM = /^[a-z]{5}[2-9]{3}$/;
    const idActor = new Set(trai(DS.bgh).dong.filter(d => TACTOR.includes(d.username)).map(d => d.id));
    for (const u of TACTOR) {
      const t = trai(DS[u] || {});
      const theoId = new Map();
      let lech = 0;
      for (const d of t.dong) {
        if (theoId.has(d.id) && theoId.get(d.id).capLai !== d.capLai) lech += 1;
        theoId.set(d.id, d);
      }
      check(`${u}: một tài khoản hiện ở nhiều chỗ thì capLai giống nhau ở mọi chỗ`, lech === 0, lech);
      let sai403 = [];
      let sai200 = [];
      let so200 = 0;
      let so403 = 0;
      for (const d of theoId.values()) {
        if (d.capLai && idActor.has(d.id)) continue;   // không đá phiên người đang thử
        const r = await req('POST', `/api/accounts/${d.id}/reset-password`, { cookie: CK[u], body: {} });
        if (d.capLai) {
          so200 += 1;
          if (r.status !== 200 || !MAT_KHAU_TAM.test(r.data?.temporaryPassword || '')) sai200.push([d.username, r.status]);
        } else {
          so403 += 1;
          if (r.status !== 403 || JSON.stringify(r.data || {}).includes('temporaryPassword')) sai403.push([d.username, r.status]);
        }
      }
      console.log(`  (${u}: ${so403} dòng capLai=false, ${so200} dòng capLai=true đã bấm thử)`);
      check(`${u}: mọi dòng capLai === false → POST 403, không lộ mật khẩu tạm`, sai403.length === 0, sai403);
      check(`${u}: mọi dòng capLai === true đã thử → POST 200 kèm mật khẩu tạm`, so200 >= 2 && sai200.length === 0,
        { so200, sai200 });
    }
    // Đối chứng: phép thử trên không xanh vì mọi cờ đều cùng một giá trị.
    const vp1 = trai(DS.vp1).dong;
    check('đối chứng — văn phòng cơ sở 1: dòng gia đình capLai, dòng cô và quản lý thì không',
      vp1.filter(d => d.loai === 'phu-huynh').every(d => d.capLai)
        && vp1.filter(d => d.loai !== 'phu-huynh').every(d => !d.capLai)
        && vp1.some(d => d.loai === 'co'), vp1.map(d => [d.username, d.loai, d.capLai]));
    const ql1 = trai(DS.ql1).dong;
    check('đối chứng — quản lý cơ sở 1: capLai cho văn phòng cơ sở mình, không cho chính mình',
      ql1.find(d => d.username === 'd.vp1')?.capLai === true && ql1.find(d => d.username === 'ql1')?.capLai === false);

    const sau = trai((await layDs(CK.bgh)).data || {});
    check('vừa cấp lại xong thì dòng hiện "đang dùng mật khẩu tạm"',
      sau.dong.find(d => d.username === 'ph.lan')?.matKhauTam === true, sau.dong.find(d => d.username === 'ph.lan'));
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

// ===========================================================================
console.log('\n[6] Số truy vấn KHÔNG tăng theo số bé và số phụ huynh');
{
  const DIR2 = thuMucTam('tai-khoan-danh-sach-quy-mo');
  sinhDuLieu(DIR2);
  taoQuanTri(DIR2, 'Hiệu Trưởng', 'bgh');
  taoQuanTri(DIR2, 'Quản Lý CS1', 'ql1');
  datChucVu(DIR2, 'ql1', 'quanly-coso');
  khoaVaoCoSo(DIR2, 'ql1', 'cs1');
  taoQuanTri(DIR2, 'Văn Phòng CS1', 'vp1');
  datChucVu(DIR2, 'vp1', 'vanphong-coso');
  khoaVaoCoSo(DIR2, 'vp1', 'cs1');

  // Bọc `prepare` TRƯỚC khi nạp lib/db.js — nó nhớ câu lệnh đã dựng.
  const Database = require2('better-sqlite3');
  let dem = 0;
  const goc = Database.prototype.prepare;
  Database.prototype.prepare = function bocDem(...a) {
    const st = goc.apply(this, a);
    for (const m of ['all', 'get', 'run']) {
      if (typeof st[m] !== 'function') continue;
      const f = st[m].bind(st);
      st[m] = (...b) => { dem += 1; return f(...b); };
    }
    return st;
  };
  process.env.DATA_DIR = DIR2;
  const db = require2(path.join(GOC, 'lib', 'db.js'));

  const tay = new Map();
  const ghi = (k) => (d, ...f) => tay.set(`${k} ${d}`, f[f.length - 1]);
  require2(path.join(GOC, 'routes', 'accounts.js'))({ get: ghi('GET'), post: ghi('POST'), put: ghi('PUT'), delete: ghi('DELETE') });
  const tayDs = tay.get('GET /api/accounts/danh-sach')
    || ((_q, res) => res.status(404).json({ error: 'Chưa có đường danh sách' }));
  function goi(user) {
    let ma = 200;
    let ra = null;
    const res = { status(n) { ma = n; return res; }, json(o) { ra = o; return res; } };
    dem = 0;
    tayDs({ user, query: {}, params: {}, body: {} }, res);
    return { ma, so: dem, data: ra };
  }

  const lop = db.classes().map(c => c.id);
  const hash = db.findUser('t1').passwordHash;
  let daCo = 0;
  function themBe(den) {
    const be = db.sqlite.prepare("INSERT INTO students (id, name, classId, active) VALUES (?, ?, ?, 1)");
    const ph = db.sqlite.prepare("INSERT INTO users (id, username, passwordHash, role, name, title, phone, active) VALUES (?, ?, ?, 'parent', ?, 'Chị', '0909', 1)");
    const noi = db.sqlite.prepare('INSERT INTO student_parents (studentId, parentId) VALUES (?, ?)');
    db.sqlite.transaction(() => {
      for (let i = daCo; i < den; i++) {
        be.run(`qm_s${i}`, `Bé Thử ${i}`, lop[i % lop.length]);
        ph.run(`qm_p${i}`, `qm.ph${i}`, hash, `Mẹ Thử ${i}`);
        noi.run(`qm_s${i}`, `qm_p${i}`);
      }
    })();
    daCo = den;
  }
  const nguoi = {
    bgh: db.findUserByUsername('bgh'),
    ql1: db.findUserByUsername('ql1'),
    vp1: db.findUserByUsername('vp1'),
  };
  const soPh = (d) => (d?.coSo || []).reduce((s, k) => s + k.nhom.reduce((x, n) => x + n.phuHuynh.length, 0), 0);

  themBe(600);
  const truoc = Object.fromEntries(Object.entries(nguoi).map(([k, u]) => [k, goi(u)]));
  themBe(2400);
  const sau = Object.fromEntries(Object.entries(nguoi).map(([k, u]) => [k, goi(u)]));
  for (const k of Object.keys(nguoi)) {
    console.log(`  (${k}: 600 bé → ${truoc[k].so} truy vấn, 2400 bé → ${sau[k].so} truy vấn)`);
    check(`${k}: gấp bốn số bé và phụ huynh, số truy vấn gần như không đổi`,
      truoc[k].ma === 200 && sau[k].ma === 200 && sau[k].so <= truoc[k].so + 4, { truoc: truoc[k].so, sau: sau[k].so });
  }
  // Đối chứng: danh sách thật sự phình theo, không phải trả rỗng cho nhanh.
  check('đối chứng — ban giám hiệu nhận đủ 2400 phụ huynh thử', soPh(sau.bgh.data) >= 2400, soPh(sau.bgh.data));
  check('đối chứng — quản lý cơ sở 1 nhận phụ huynh thử của cơ sở 1, ít hơn cả trường',
    soPh(sau.ql1.data) > 600 && soPh(sau.ql1.data) < soPh(sau.bgh.data), soPh(sau.ql1.data));
  db.close();
  donThuMucTam(DIR2);
}

tongKet();
