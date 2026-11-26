// Bài canh Đ261f: TRƯỜNG ĐÔNG LÊN THÌ APP VẪN TRẢ LỜI MỌI NGƯỜI, VÀ KẾT QUẢ KHÔNG ĐỔI.
//
// Chạy bằng:  node test/tai-300-be.test.mjs   (TEST_PORT mặc định 7251)
//
// VÌ SAO CÓ BÀI NÀY
//
// Đợt thử tải 300 bé (báo cáo S, 26/11) đo được hai loại chỗ nghẽn:
//
//   1. XUẤT EXCEL CHẶN CẢ APP. Xuất điểm danh giờ vào ra của một cơ sở trong
//      năm tháng là hơn ba vạn dòng. `lib/xlsx.js` dựng XML, nén và tính CRC
//      một mạch, đồng bộ: 553–697 ms, trong lúc ấy /healthz đứng 668 ms. Mọi
//      cô, mọi gia đình đang mở app cùng chờ một người bấm "Tải tệp".
//   2. HỎI QUYỀN TỪNG BÉ MỘT. `canAccessStudent` trong vòng lặp tốn ba câu
//      truy vấn mỗi bé cho quản trị một cơ sở. Huy hiệu Kế hoạch của bé chạy
//      15 giây một lần cho mỗi quản lý, mỗi lượt 365 câu.
//
// Cả hai đều phải sửa mà KHÔNG ĐỔI KẾT QUẢ. Tệp Excel phải ra đúng từng byte,
// và quyền với bé phải đúng y như `canAccessStudent`. Nên bài này canh hai
// việc: kết quả giữ nguyên (so với bản cũ, so với hàm gốc), và máy chủ vẫn
// trả lời người khác TRONG LÚC đang xuất.
//
// KHÔNG ĐO TỐC ĐỘ BẰNG MILI GIÂY: đo trên máy chạy kiểm thử là đỏ ngẫu nhiên.
// Phép canh vòng lặp đếm số lượt /healthz được trả lời TRƯỚC khi tệp xuất
// xong. Bản đồng bộ cũ trả lời nhiều nhất một lượt, vì nó không nhả máy chủ
// lần nào cho tới khi gửi xong tệp.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem,
  taoReq, taoLogin, khoaVaoCoSo, datChucVu, batPhanHe, HOM_NAY,
} from './_chung.mjs';

const require = createRequire(import.meta.url);
const xlsx = require(path.join(GOC, 'lib', 'xlsx.js'));
const Database = require('better-sqlite3');
const { check, tongKet } = taoBoDem();

// ---------------------------------------------------------------------------
// Tiện ích: mở tệp ZIP, trả về [tên, nội dung đã giải nén, crc khai trong mục lục].
// Viết riêng ở đây, không mượn `xlsx.doc`: bài này canh chính bộ ghi của kho.
function boZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const ra = [];
  for (let i = 0; i < n; i++) {
    const coNen = buf.readUInt32LE(p + 20);
    const dTen = buf.readUInt16LE(p + 28);
    const ten = buf.slice(p + 46, p + 46 + dTen).toString();
    const vt = buf.readUInt32LE(p + 42);
    const bd = vt + 30 + buf.readUInt16LE(vt + 26) + buf.readUInt16LE(vt + 28);
    ra.push([ten, zlib.inflateRawSync(buf.slice(bd, bd + coNen)), buf.readUInt32LE(p + 16)]);
    p += 46 + dTen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return ra;
}
function bamGiaiNen(buf) {
  const h = crypto.createHash('sha256');
  for (const [ten, noi, crc] of boZip(buf)) { h.update(ten); h.update('\0'); h.update(noi); h.update(String(crc)); }
  return h.digest('hex');
}
// Mọi hàng của trang đầu, đọc thẳng từ XML. `xlsx.doc` chỉ đọc 5.000 hàng
// đầu (trần cho tệp người dùng nạp lên), mà tệp xuất ở đây dài hơn thế.
function hangCuaTrangDau(buf) {
  const xml = boZip(buf).find(([ten]) => ten === 'xl/worksheets/sheet1.xml')[1].toString();
  const giai = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return (xml.match(/<row r="\d+">[\s\S]*?<\/row>/g) || []).map(row => {
    const h = [];
    for (const m of row.matchAll(/<c r="([A-Z]+)\d+"[^>]*><is><t xml:space="preserve">([\s\S]*?)<\/t><\/is><\/c>/g)) {
      h[m[1].charCodeAt(0) - 65] = giai(m[2]);
    }
    return h;
  });
}
// Bộ dữ liệu cố định: chữ có dấu, ký tự phải mã hoá, ký tự điều khiển, ô trống,
// ô gộp (cả vùng sai, vùng chồng), tên trang có ký tự cấm, nhiều trang.
function mau() {
  const hang = [['Ngày', 'Mã bé', 'Họ và tên', 'Ghi chú']];
  for (let i = 0; i < 5000; i++) {
    hang.push([`0${i % 9 + 1}/07/2026`, `B${i}`, `Bé Ngô Thị Ánh ${i} <&"'>`, i % 7 ? '' : `=SUM(A1)\u0001\ttab\nxuống`]);
  }
  return [
    { ten: 'Giờ vào ra', dongTieuDe: true, cot: [12, 12, 28], hang },
    { ten: 'Trang/2:*?', hang: [['a', null, undefined, 'b'], [], ['ô gộp']], gop: ['A3:C3', 'A1:B2', 'B1:C1', 'xx'] },
    { hang: [['một'], ['hai']] },
  ];
}
// Băm phần GIẢI NÉN của tệp mà `xlsx.ghi` bản trước Đ261f ghi ra cho `mau()`.
// So phần giải nén chứ không so byte nén: nâng Node có thể đổi bản zlib, và
// byte nén đổi theo mà tệp vẫn y nguyên.
const BAM_BAN_CU = '7f4061aefdd1c9fa1e3451ba402c4ca334b2ab15d33e80adce7acc7a2a4ff303';

const DIR_A = thuMucTam('tai-300-be-a');
const DIR_B = thuMucTam('tai-300-be-b');
let sv = null;

try {
  // =========================================================================
  console.log('\n[1] lib/xlsx: bản bất đồng bộ ra ĐÚNG TỪNG BYTE của bản cũ');
  {
    check('có xlsx.ghiAsync bên cạnh xlsx.ghi', typeof xlsx.ghiAsync === 'function');
  }
  if (typeof xlsx.ghiAsync === 'function') {
    const cu = xlsx.ghi(mau());
    const moi = await xlsx.ghiAsync(mau());
    check('ghiAsync ra đúng từng byte của ghi', Buffer.isBuffer(moi) && moi.equals(cu), { cu: cu.length, moi: moi && moi.length });
    check('phần giải nén của ghi KHÔNG ĐỔI so với bản trước Đ261f', bamGiaiNen(cu) === BAM_BAN_CU, bamGiaiNen(cu));
    check('CRC khai trong tệp khớp nội dung (Excel từ chối tệp sai CRC)',
      boZip(moi).every(([, noi, crc]) => zlib.crc32(noi) === crc));
    const doc = xlsx.doc(moi);
    check('đọc lại được bằng bộ đọc của kho: đủ ba trang', doc.length === 3, doc.map(b => b.ten));
    check('đủ dòng và đúng chữ có dấu, ký tự đặc biệt',
      doc[0].hang.length === 5001 && doc[0].hang[5000][2] === 'Bé Ngô Thị Ánh 4999 <&"\'>', doc[0].hang[5000]);
    check('tên trang có ký tự cấm được thay như cũ', doc[1].ten === 'Trang 2   ', doc[1].ten);
    const rong = await xlsx.ghiAsync([{ ten: 'Trống', hang: [] }]);
    check('bảng rỗng: vẫn ra tệp, đúng byte bản cũ', rong.equals(xlsx.ghi([{ ten: 'Trống', hang: [] }])));

    // Bản đồng bộ chiếm trọn vòng lặp; bản mới phải nhả ra giữa chừng.
    const lon = [{ ten: 'Lớn', dongTieuDe: true, hang: Array.from({ length: 30000 }, (_, i) => [`${i}`, 'Nguyễn Văn A', 'Có mặt', '07:30', '16:45']) }];
    let nhip = 0;
    const dem = setInterval(() => { nhip++; }, 1);
    xlsx.ghi(lon);
    const nhipDongBo = nhip;
    await xlsx.ghiAsync(lon);
    clearInterval(dem);
    check('bản cũ không nhả vòng lặp lần nào (đúng là chỗ gây đứng app)', nhipDongBo === 0, nhipDongBo);
    check('bản mới nhả vòng lặp NHIỀU LẦN trong lúc dựng 30.000 dòng', nhip - nhipDongBo >= 5, nhip - nhipDongBo);
  }

  // =========================================================================
  console.log('\n[2] Máy không có zlib.crc32 (Node cũ): dùng bản JavaScript, tệp không đổi');
  if (typeof xlsx.ghiAsync !== 'function') check('bản dự phòng: cần xlsx.ghiAsync', false);
  else {
    const ra = execFileSync('node', ['-e', `
      const zlib = require('zlib'); delete zlib.crc32;
      const x = require(${JSON.stringify(path.join(GOC, 'lib', 'xlsx.js'))});
      const m = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      x.ghiAsync(m).then(b => process.stdout.write(JSON.stringify({ giong: b.equals(x.ghi(m)), b64: b.toString('base64') })));
    `], { cwd: GOC, input: JSON.stringify(mau()), maxBuffer: 64 * 1024 * 1024 }).toString();
    const kq = JSON.parse(ra);
    check('bản dự phòng: ghiAsync vẫn đúng từng byte của ghi', kq.giong === true);
    check('và đúng từng byte của máy có zlib.crc32', Buffer.from(kq.b64, 'base64').equals(xlsx.ghi(mau())));
  }

  // =========================================================================
  console.log('\n[3] db.beDuocXemTrong trả lời ĐÚNG NHƯ canAccessStudent, mọi bé × mọi vai');
  {
    sinhDuLieu(DIR_A);
    taoQuanTri(DIR_A, 'Hiệu Trưởng A', 'ht_a');
    taoQuanTri(DIR_A, 'Quản lý CS1 A', 'ql1_a'); khoaVaoCoSo(DIR_A, 'ql1_a', 'cs1');
    taoQuanTri(DIR_A, 'Quản lý CS2 A', 'ql2_a'); khoaVaoCoSo(DIR_A, 'ql2_a', 'cs2');
    // Những ca dễ lệch nhất: bé đã nghỉ (gần đây / quá 12 tháng), bé chưa xếp
    // nhóm, nhóm chưa gắn cơ sở, nhóm đã đóng mà cô vẫn còn dòng phân công,
    // bé ở cơ sở 2.
    const c = new Database(path.join(DIR_A, 'school.db'));
    const luc = new Date().toISOString();
    c.prepare("INSERT INTO classes (id, name, year, active) VALUES ('c_dong', 'Nhóm đã đóng', '2024-2025', 0)").run();
    c.prepare("INSERT INTO class_campus (classId, campusId) VALUES ('c_dong', 'cs1')").run();
    c.prepare("INSERT INTO class_teachers (classId, teacherId, vaiTro) VALUES ('c_dong', 't1', 'chinh')").run();
    c.prepare("INSERT INTO classes (id, name, year, active) VALUES ('c_le', 'Nhóm chưa gắn cơ sở', '2026-2027', 1)").run();
    const them = c.prepare('INSERT INTO students (id, name, classId, active, leftAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    them.run('x_nghi_moi', 'Bé nghỉ gần đây', 'c1', 0, HOM_NAY(), luc);
    them.run('x_nghi_xa', 'Bé nghỉ đã lâu', 'c1', 0, '2020-01-15', luc);
    them.run('x_khong_nhom', 'Bé chưa xếp nhóm', null, 1, null, luc);
    them.run('x_nhom_dong', 'Bé nhóm đã đóng', 'c_dong', 0, HOM_NAY(), luc);
    them.run('x_nhom_le', 'Bé nhóm lẻ', 'c_le', 1, null, luc);
    them.run('x_cs2', 'Bé cơ sở 2', 'c3', 1, null, luc);
    const ganPh = c.prepare('INSERT OR IGNORE INTO student_parents (studentId, parentId) VALUES (?, ?)');
    for (const id of ['x_nghi_moi', 'x_nghi_xa', 'x_khong_nhom', 'x_nhom_dong', 'x_cs2']) ganPh.run(id, 'p1');
    c.close();

    process.env.DATA_DIR = DIR_A;
    const db = require(path.join(GOC, 'lib', 'db.js'));
    const ids = [...db.all('students', 'SELECT id FROM students').map(r => r.id), 'khong-co-be-nay', '', null, 's1'];
    const nguoi = [
      ...db.all('users', 'SELECT id FROM users').map(r => db.findUser(r.id)),
      { id: 'la', role: 'khach' }, { role: 'parent' }, null,
    ];
    check('có db.beDuocXemTrong bên cạnh db.canAccessStudent', typeof db.beDuocXemTrong === 'function');
    if (typeof db.beDuocXemTrong !== 'function') db.beDuocXemTrong = () => new Set(['(chưa có hàm)']);
    const vai = new Set(nguoi.filter(Boolean).map(u => u.role));
    check('dữ liệu có đủ ba vai cùng quản trị cả trường lẫn quản trị một cơ sở',
      ['admin', 'teacher', 'parent'].every(v => vai.has(v))
        && nguoi.some(u => u && u.role === 'admin' && db.phamViCoSo(u) === 'cs1')
        && nguoi.some(u => u && u.role === 'admin' && db.phamViCoSo(u) === null), [...vai]);
    let lech = [];
    for (const u of nguoi) {
      const mong = new Set(ids.filter(id => db.canAccessStudent(u, id)));
      const thuc = db.beDuocXemTrong(u, ids);
      const ma = [...new Set([...mong, ...thuc])].filter(id => mong.has(id) !== thuc.has(id));
      if (ma.length) lech.push({ nguoi: u && (u.username || u.id || u.role), ma });
    }
    check(`không lệch một cặp nào (${nguoi.length} người × ${ids.length} mã)`, lech.length === 0, lech);
    const ql1 = db.findUserByUsername('ql1_a');
    const ql2 = db.findUserByUsername('ql2_a');
    check('quản lý cơ sở 2 KHÔNG thấy bé cơ sở 1, kể cả bé đã nghỉ',
      !['s1', 'x_nghi_moi', 'x_nghi_xa'].some(id => db.beDuocXemTrong(ql2, ids).has(id)));
    check('quản lý cơ sở 1 vẫn thấy bé đã nghỉ của cơ sở mình (bản studentIdsOf sẽ làm mất)',
      db.beDuocXemTrong(ql1, ids).has('x_nghi_xa') && !db.studentIdsOf(ql1).includes('x_nghi_xa'));
    check('gia đình: con nghỉ quá 12 tháng không còn trong tập', !db.beDuocXemTrong(db.findUser('p1'), ids).has('x_nghi_xa')
      && db.beDuocXemTrong(db.findUser('p1'), ids).has('x_nghi_moi'));
    check('danh sách rỗng, người rỗng: tập rỗng', db.beDuocXemTrong(ql1, []).size === 0 && db.beDuocXemTrong(null, ids).size === 0);
    db.close();
  }

  // =========================================================================
  // Máy chủ thật trên một cơ sở 300 bé × 100 ngày học.
  sinhDuLieu(DIR_B);
  batPhanHe(DIR_B, ['xuatbaocao', 'kehoachbe']);
  const mkHT = taoQuanTri(DIR_B, 'Hiệu Trưởng B', 'ht_b');
  const mkQ1 = taoQuanTri(DIR_B, 'Quản lý CS1 B', 'ql1_b');
  khoaVaoCoSo(DIR_B, 'ql1_b', 'cs1'); datChucVu(DIR_B, 'ql1_b', 'quanly-coso');
  const mkQ2 = taoQuanTri(DIR_B, 'Quản lý CS2 B', 'ql2_b');
  khoaVaoCoSo(DIR_B, 'ql2_b', 'cs2'); datChucVu(DIR_B, 'ql2_b', 'quanly-coso');
  const SO_BE = 300;
  const SO_NGAY = 100;
  const ngayHoc = [];
  for (let t = Date.UTC(2026, 6, 1); ngayHoc.length < SO_NGAY; t += 86400000) {
    const d = new Date(t);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) ngayHoc.push(d.toISOString().slice(0, 10));
  }
  const TU = ngayHoc[0];
  const DEN = ngayHoc[ngayHoc.length - 1];
  {
    const c = new Database(path.join(DIR_B, 'school.db'));
    const luc = new Date().toISOString();
    const beMoi = c.prepare('INSERT INTO students (id, code, name, classId, active, createdAt) VALUES (?, ?, ?, ?, 1, ?)');
    const dd = c.prepare('INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut) VALUES (?, ?, ?, ?, ?, ?)');
    const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ'];
    c.transaction(() => {
      for (let i = 0; i < SO_BE; i++) {
        const id = `tai_${String(i).padStart(3, '0')}`;
        // Tên trùng nhau có chủ ý (cứ 50 bé lặp một vòng): thứ tự hai bé
        // trùng tên trong tệp là chỗ dễ lệch nhất khi đổi cách sắp xếp.
        beMoi.run(id, `T${i}`, `${HO[i % 6]} Minh ${i % 50}`, ['c1', 'c2', 'c4'][i % 3], luc);
        ngayHoc.forEach((d, j) => dd.run(`${id}_${j}`, id, d, (i + j) % 17 ? 'present' : 'absent_excused', '07:3' + (j % 10), '16:4' + (i % 10)));
      }
    })();
    c.close();
  }
  sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7251), dir: DIR_B });
  const req = taoReq(sv.BASE);
  const login = taoLogin(req);
  const vao = async (u, m) => {
    const d = await login(u, m);
    await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
    return (await login(u, 'quantri2026')).cookie;
  };
  const HT = await vao('ht_b', mkHT);
  const Q1 = await vao('ql1_b', mkQ1);
  const Q2 = await vao('ql2_b', mkQ2);
  const GV = (await login('giaovien', '123456')).cookie;
  const XUAT = `/api/xuatbaocao/diemdanh-be?kieu=gio&pham=coso&campusId=cs1&tu=${TU}&den=${DEN}`;
  const tai = async (duong, cookie) => {
    const r = await fetch(sv.BASE + duong, { headers: { Cookie: cookie } });
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, buf, loai: r.headers.get('content-type') || '', json: () => JSON.parse(buf.toString()) };
  };

  // =========================================================================
  console.log(`\n[4] Xuất giờ vào ra ${SO_BE} bé × ${SO_NGAY} ngày: máy chủ vẫn trả lời người khác`);
  {
    check('bối cảnh: hiệu trưởng, hai quản lý cơ sở và cô vào được', !!HT && !!Q1 && !!Q2 && !!GV);
    // Hỏi /healthz liên tục trong lúc chờ tệp. Đếm những lượt được trả lời
    // TRƯỚC khi máy chủ gửi phần đầu của tệp xuất.
    let xong = false;
    let traLoi = 0;
    const tre = [];
    const xuat = fetch(sv.BASE + XUAT, { headers: { Cookie: HT } }).then(r => { xong = true; return r; });
    while (!xong) {
      const t = performance.now();
      const h = await fetch(sv.BASE + '/healthz');
      await h.arrayBuffer();
      if (!xong) { traLoi++; tre.push(performance.now() - t); }
      await new Promise(r => setTimeout(r, 3));
    }
    const r = await xuat;
    const buf = Buffer.from(await r.arrayBuffer());
    console.log(`    (tham khảo, không canh: ${traLoi} lượt /healthz trả lời trong lúc xuất, chờ lâu nhất ${Math.round(Math.max(0, ...tre))} ms)`);
    check('tệp xuất được', r.status === 200 && /spreadsheetml/.test(r.headers.get('content-type') || ''), r.status);
    check('MÁY CHỦ TRẢ LỜI NGƯỜI KHÁC TRONG LÚC XUẤT (bản cũ: nhiều nhất 1 lượt)', traLoi >= 3, traLoi);
    const dong = hangCuaTrangDau(buf).slice(1);
    const cua = dong.filter(h => /^T\d+$/.test(h[1] || ''));
    check(`đủ ${SO_BE * SO_NGAY} dòng của các bé vừa dựng`, cua.length === SO_BE * SO_NGAY, cua.length);
    // Thứ tự: theo ngày rồi theo tên (cùng `localeCompare(…, 'vi')` của bản cũ).
    const khoa = dong.map(h => [h[0].split('/').reverse().join('-'), h[2]]);
    const dungThuTu = khoa.every((k, i) => i === 0 || khoa[i - 1][0] < k[0]
      || (khoa[i - 1][0] === k[0] && khoa[i - 1][1].localeCompare(k[1], 'vi') <= 0));
    check('sắp theo ngày rồi theo tên như cũ', dungThuTu);
  }

  // =========================================================================
  console.log('\n[5] Mỗi lúc một lượt xuất: lượt chen ngang nghe 429, xong thì xuất tiếp được');
  {
    const [a, b] = await Promise.all([tai(XUAT, HT), tai(XUAT, Q1)]);
    const ma = [a.status, b.status].sort();
    check('hai lượt cùng lúc: một lượt được, một lượt 429', ma[0] === 200 && ma[1] === 429, ma);
    const bi = a.status === 429 ? a : b;
    check('câu báo đúng lời, tiếng Việt', bi.status === 429 && bi.json().error === 'Đang xuất một báo cáo khác, thử lại sau ít giây',
      bi.status === 429 ? bi.json() : null);
    const sau = await tai(XUAT, Q1);
    check('lượt trước xong thì lượt sau xuất được ngay', sau.status === 200 && /spreadsheetml/.test(sau.loai), sau.status);
    const sai = await tai('/api/xuatbaocao/diemdanh-be?kieu=gio&pham=coso&campusId=cs1&thang=2026-13', HT);
    check('lượt bị từ chối vì nhập sai vẫn trả lời 400 như cũ', sai.status === 400, sai.status);
    const tiep = await tai(`/api/xuatbaocao/ho-so-be?pham=coso&campusId=cs1`, HT);
    check('và không giữ khoá lại: xuất phần khác ngay sau đó được', tiep.status === 200, tiep.status);
  }

  // =========================================================================
  console.log('\n[6] Quyền với bé không đổi: quản lý cơ sở 2 không thấy bé cơ sở 1');
  {
    const THANG = HOM_NAY().slice(0, 7);
    const lap = await req('PUT', '/api/kehoachbe', {
      cookie: GV,
      body: {
        classId: 'c1', thang: THANG,
        danhSach: ['s1', 's3', 's4'].map(studentId => ({ studentId, muc: [{ gocLinhVuc: 'toan', noiDung: 'Bộ gậy số' }] })),
      },
    });
    check('bối cảnh: cô lập kế hoạch cho ba bé nhóm c1 (cơ sở 1)', lap.status === 200, lap.data);
    const gui = await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG } });
    check('và gửi duyệt', gui.status === 200 && gui.data?.daGui > 0, gui.data);

    const cho = async (ck) => (await req('GET', '/api/kehoachbe/cho-duyet', { cookie: ck })).data || {};
    const be = (d) => (d.nhom || []).flatMap(n => n.ds.map(x => x.studentId));
    const c1 = await cho(Q1);
    const c2 = await cho(Q2);
    const ht = await cho(HT);
    check('quản lý cơ sở 1 thấy cả ba bé chờ duyệt', ['s1', 's3', 's4'].every(id => be(c1).includes(id)), be(c1));
    check('hiệu trưởng (cả trường) thấy cả ba bé', ['s1', 's3', 's4'].every(id => be(ht).includes(id)), be(ht));
    check('QUẢN LÝ CƠ SỞ 2 KHÔNG thấy bé nào của cơ sở 1', c2.tong === 0 && be(c2).length === 0, c2.tong);

    const huy = async (ck) => (await req('GET', '/api/dashboard/badges', { cookie: ck })).data || {};
    const h1 = await huy(Q1);
    const h2 = await huy(Q2);
    check('huy hiệu Kế hoạch của quản lý cơ sở 1 đếm đúng 3 bản', h1.kehoachbe === 3, h1.kehoachbe);
    check('HUY HIỆU CỦA QUẢN LÝ CƠ SỞ 2 KHÔNG ĐẾM bản của cơ sở 1', !h2.kehoachbe, h2.kehoachbe);

    const khongDuoc = await tai('/api/xuatbaocao/ho-so-be?pham=coso&campusId=cs1', Q2);
    check('quản lý cơ sở 2 xin xuất hồ sơ cơ sở 1: 403', khongDuoc.status === 403, khongDuoc.status);
    const hs2 = await tai('/api/xuatbaocao/ho-so-be?pham=coso', Q2);
    const tenTrongTep = hs2.status === 200 ? xlsx.doc(hs2.buf)[0].hang.flat().join('|') : '';
    check('hồ sơ bé cơ sở 2 xuất được, không có tên bé cơ sở 1',
      hs2.status === 200 && !/Nguyễn Bảo An|Minh 0\b/.test(tenTrongTep), hs2.status);
    const kh2 = await tai(`/api/xuatbaocao/kehoach-be?pham=coso&thang=${THANG}`, Q2);
    const chuKh2 = kh2.status === 200 ? xlsx.doc(kh2.buf).map(b => b.hang.flat().join('|')).join('|') : '';
    check('kế hoạch bé cơ sở 2 không chứa bé cơ sở 1', kh2.status === 200 && !/Nguyễn Bảo An/.test(chuKh2), kh2.status);
    const kh1 = await tai(`/api/xuatbaocao/kehoach-be?pham=coso&thang=${THANG}`, Q1);
    const chuKh1 = kh1.status === 200 ? xlsx.doc(kh1.buf).map(b => b.hang.flat().join('|')).join('|') : '';
    check('kế hoạch bé cơ sở 1 có bé đã lập kế hoạch', kh1.status === 200 && /Nguyễn Bảo An/.test(chuKh1), kh1.status);
  }
} finally {
  sv?.dung();
  donThuMucTam(DIR_A);
  donThuMucTam(DIR_B);
}
tongKet();
