// Bài canh ĐẾM GỘP MỐI QUAN TÂM — và canh chặt hơn nữa việc KHÔNG theo dõi ai (Đ149).
//
// Chạy bằng:  npm run test:quan-tam-gop
//
// VÌ SAO CÓ PHẦN NÀY
//
// Nhà trường 10/09: *"mình chỉ muốn xem PH khi vào app quan tâm những gì: kiểu
// về ăn uống thực đơn, hay thời gian biểu, hay kế hoạch của bé hay là hình
// ảnh"*. Đây là thứ tôi đã đề nghị ở đợt trước dưới đúng một hình dạng: **đếm
// gộp theo mục, không theo dõi từng gia đình** — và trường đồng ý đúng hình
// dạng đó.
//
// LỜI HỨA ẤY PHẢI ĐƯỢC CANH BẰNG MÁY, KHÔNG BẰNG TRÍ NHỚ.
//
// Đường ngắn nhất để làm tính năng này là thêm một cột `userId` — chỉ một cột,
// và mọi câu hỏi sau này ("nhà nào chưa đọc thông báo?", "ai xem album nhiều
// nhất?") đều trả lời được ngay. Không ai phải cố tình làm điều xấu: chỉ cần
// một hôm nào đó có người thấy cột ấy nằm sẵn đó.
//
// Nên bài này đọc THẲNG LƯỢC ĐỒ và MÃ NGUỒN, chứ không chỉ thử qua HTTP: ngày
// ai đó thêm cột định danh vào bảng, hay ghi `req.user.id` vào câu lệnh đếm,
// bài đỏ ngay tại chỗ ấy — kể cả khi chưa có màn hình nào đọc nó ra.
//
// Cùng họ với `test/quy-tac-3.test.mjs`: bộ canh có mặt TRƯỚC khi có ai định
// vi phạm, và đó là chủ ý.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, GOC, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('quan-tam-gop');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4648), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QT = await vao('hieutruong', mkQT);
const QL2 = await vao('quanly2', mkCS2);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

const dem = (cookie, muc) => req('POST', '/api/dashboard/quan-tam', { cookie, body: { muc } });
const bang = async (cookie, q = '') => (await req('GET', `/api/admin/quan-tam${q}`, { cookie })).data;

// ===========================================================================
console.log('\n[1] LƯỢC ĐỒ: bảng đếm KHÔNG có chỗ nào ghi một người');
{
  const luoc = fs.readFileSync(path.join(GOC, 'lib', 'schema.sql'), 'utf8');
  const khoi = (luoc.match(/CREATE TABLE IF NOT EXISTS luot_quan_tam \(([\s\S]*?)\);/) || [])[1];
  check('có bảng luot_quan_tam trong lược đồ lõi', !!khoi, khoi);
  const cot = (khoi || '').split('\n')
    .map(d => d.trim().split(/\s+/)[0])
    .filter(c => c && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|--)/i.test(c));
  check('đúng bốn cột: ngay · muc · campusId · soLuot',
    cot.join(',') === 'ngay,muc,campusId,soLuot', cot);

  // Danh sách này là ĐEN, không phải trắng: thêm một cột lạ nào có mùi định
  // danh là đỏ, không cần ai nhớ ra để thêm vào bài canh.
  const MUI_DINH_DANH = /user|parent|student|account|nguoi|phuhuynh|be_?id|ip|ua|agent|session|phien|device|may|token|hash|email|phone|sdt/i;
  const xau = cot.filter(c => MUI_DINH_DANH.test(c));
  check('KHÔNG cột nào mang mùi định danh (user/parent/student/ip/session/…)',
    xau.length === 0, xau);
  check('khoá chính là (ngay, muc, campusId) — một dòng là MỘT CON SỐ, không phải một lượt của một người',
    /PRIMARY KEY \(ngay, muc, campusId\)/.test(khoi || ''), khoi);
}

// ===========================================================================
console.log('\n[2] MÃ NGUỒN: không chỗ nào ghi danh tính vào bảng đếm');
{
  const boChuThich = (v) => v.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const quet = (tep) => boChuThich(fs.readFileSync(path.join(GOC, tep), 'utf8'));
  const dsTep = ['routes/dashboard.js', 'routes/admin.js'];
  const cauGhi = [];
  for (const tep of dsTep) {
    for (const m of quet(tep).matchAll(/luot_quan_tam[\s\S]{0,400}?\]\)/g)) cauGhi.push({ tep, cau: m[0] });
  }
  check('tìm được câu lệnh đụng tới luot_quan_tam để soi', cauGhi.length >= 2, cauGhi.length);
  const banDanh = cauGhi.filter(x => /req\.user\.id|user\.id|\.parentId|studentId|\bip\b|sessionId/.test(x.cau));
  check('KHÔNG câu nào kèm req.user.id / parentId / studentId / ip vào bảng đếm',
    banDanh.length === 0, banDanh.map(x => `${x.tep}: ${x.cau.slice(0, 120)}`));

  // Phép thử ngược: phép dò này có bắt được thật không.
  const gia = "db.run(`INSERT INTO luot_quan_tam (ngay, muc, userId) VALUES (?, ?, ?)`, [a, b, req.user.id])";
  check('PHÉP THỬ NGƯỢC — bắt được một câu lệnh có ghi req.user.id',
    /req\.user\.id/.test(gia));
}

// ===========================================================================
console.log('\n[3] Chỉ GIA ĐÌNH được đếm — cô và văn phòng thì không');
{
  const co = await dem(GV, 'menu');
  check('CÔ gọi đường đếm thì bị từ chối — con số phải nói về gia đình',
    co.status === 403, co.status);
  const vp = await dem(QT, 'menu');
  check('văn phòng cũng vậy', vp.status === 403, vp.status);

  const r = await dem(PH, 'menu');
  check('gia đình đếm được, và máy chủ không trả về gì cả (204)', r.status === 204, r.status);
}

// ===========================================================================
console.log('\n[4] Chỉ đếm MỤC CÓ THẬT, và không bao giờ làm hỏng màn của gia đình');
{
  for (const xau of ['', '   ', 'khong-co-man-nay', '../../etc/passwd', 'x'.repeat(500)]) {
    const r = await dem(PH, xau);
    check(`mục lạ "${String(xau).slice(0, 22)}" — vẫn 204, KHÔNG báo lỗi ra màn gia đình`,
      r.status === 204, r.status);
  }
  const b = await bang(QT);
  const la = (b.muc || []).filter(x => !/^[a-z]/.test(x.muc) || x.muc.length > 40);
  check('và không mục lạ nào lọt được vào bảng', la.length === 0, la);
}

// ===========================================================================
console.log('\n[5] Bảng gộp: cộng đúng, và chỉ VĂN PHÒNG đọc được');
{
  await dem(PH, 'menu');
  await dem(PH, 'menu');
  await dem(PH, 'albums');

  const b = await bang(QT);
  const menu = (b.muc || []).find(x => x.muc === 'menu');
  const album = (b.muc || []).find(x => x.muc === 'albums');
  check('bảng có mục Thực đơn với đúng 3 lượt', menu && menu.soLuot === 3, menu);
  check('và mục Album với 1 lượt', album && album.soLuot === 1, album);
  check('gọi tên mục bằng TIẾNG CỦA TRƯỜNG, không phải tên màn trong mã',
    menu && menu.ten === 'Thực đơn', menu && menu.ten);
  check('xếp theo số lượt giảm dần', (b.muc || [])[0].muc === 'menu', (b.muc || []).map(x => x.muc));
  check('có tổng lượt để văn phòng tự đối chiếu', b.tongLuot === 4, b.tongLuot);
  // QUY TẮC 4: kho mã này chặn mọi tỉ lệ hiện lên màn hình. Bản đầu của đợt này
  // có trả về tỉ lệ mỗi mục và bộ canh báo đỏ — đúng. Nay canh cả chiều ngược
  // lại, để trường đó không lặng lẽ quay về ở một đợt sau.
  check('KHÔNG trả về tỉ lệ phần trăm nào — QUY TẮC 4',
    (b.muc || []).every(x => x.phanTram === undefined && x.tiLe === undefined),
    (b.muc || [])[0]);

  // CHỖ DỄ RÒ NHẤT: bảng gộp KHÔNG được kèm bất cứ thứ gì chỉ ra một nhà.
  const chu = JSON.stringify(b);
  check('câu trả lời KHÔNG chứa chữ "userId"/"parentId"/"studentId"',
    !/userId|parentId|studentId/i.test(chu), chu.slice(0, 200));
  check('và KHÔNG chứa tên hay mã của bất kỳ ai',
    !/"ten":"(Anh|Chị|Cô|Bé) /.test(chu), chu.slice(0, 200));

  const coDoc = await req('GET', '/api/admin/quan-tam', { cookie: GV });
  check('CÔ KHÔNG đọc được bảng này', coDoc.status === 403, coDoc.status);
  const phDoc = await req('GET', '/api/admin/quan-tam', { cookie: PH });
  check('gia đình cũng không', phDoc.status === 403, phDoc.status);
}

// ===========================================================================
console.log('\n[6] Quản lý một CƠ SỞ chỉ thấy số của cơ sở mình');
{
  const b2 = await bang(QL2);
  check('quản lý CS2 mở được bảng', !!b2 && Array.isArray(b2.muc), b2);
  check('và bảng nói rõ nó đang gộp theo cơ sở nào', b2.coSo === 'cs2', b2.coSo);
  // Bé của tài khoản phụ huynh mẫu nằm ở cơ sở 1, nên số vừa đếm KHÔNG rơi vào CS2.
  check('số của cơ sở khác KHÔNG lọt sang', (b2.muc || []).length === 0, b2.muc);
  check('ban giám hiệu thì thấy cả trường', (await bang(QT)).coSo === '', (await bang(QT)).coSo);
}

// ===========================================================================
console.log('\n[7] Lọc theo khoảng ngày, và khoảng ngược thì từ chối');
{
  const NGAY = HOM_NAY();
  const homQua = new Date(Date.parse(`${NGAY}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const chiHomQua = await bang(QT, `?tu=${homQua}&den=${homQua}`);
  check('khoảng không chạm hôm nay thì không có số nào',
    (chiHomQua.muc || []).length === 0, chiHomQua.muc);
  const caHai = await bang(QT, `?tu=${homQua}&den=${NGAY}`);
  check('khoảng có chứa hôm nay thì có', (caHai.muc || []).length >= 2, (caHai.muc || []).length);
  const nguoc = await req('GET', `/api/admin/quan-tam?tu=${NGAY}&den=${homQua}`, { cookie: QT });
  check('khoảng ngược thì từ chối, không trả bảng rỗng khó hiểu', nguoc.status === 400, nguoc.status);
}

// ===========================================================================
console.log('\n[8] KHO: sau tất cả, trong bảng vẫn không có một dòng nào chỉ ra ai');
{
  const conn = new Database(path.join(DIR, 'school.db'));
  const cot = conn.prepare('PRAGMA table_info(luot_quan_tam)').all().map(c => c.name);
  check('kho thật cũng đúng bốn cột ấy', cot.join(',') === 'ngay,muc,campusId,soLuot', cot);
  const dong = conn.prepare('SELECT * FROM luot_quan_tam').all();
  check('mỗi dòng chỉ là (ngày, mục, cơ sở, số lượt)',
    dong.every(d => Object.keys(d).length === 4 && Number.isInteger(d.soLuot)), dong.slice(0, 3));
  check('và có ít nhất một dòng để nói rằng phép đo này có thật', dong.length >= 1, dong.length);
  conn.close();
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Đếm gộp mối quan tâm — không theo dõi ai');
