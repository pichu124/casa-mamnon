// Bài canh: `package-lock.json` phải KHỚP `package.json` và KHÔNG mang gói thừa.
//
// Chạy bằng:  npm run test:khoa-goi
//
// VÌ SAO CẦN MỘT CÁI MÁY CANH CHO TỆP KHÓA GÓI
//
// Ngày 27/08 (N2) kho này gỡ vỏ Android: bốn gói `@capacitor/*` biến khỏi
// `package.json`, nhưng `package-lock.json` KHÔNG được làm lại. Suốt sáu ngày
// tệp khóa mang 385 mục thừa — gấp bốn lần số gói thật — và không bộ canh nào
// kêu, vì:
//
//   • `npm ci` (CI, Docker) lấy `package.json` làm gốc rồi lặng lẽ bỏ qua mục
//     thừa → cài vẫn đúng, xanh vẫn xanh.
//   • `npm audit` thì đọc CẢ tệp khóa → báo 11 lỗ, có cả một lỗ "nghiêm trọng"
//     ở `tar`, toàn của những gói không ai cài. Lỗ THẬT duy nhất (`qs`, một
//     gói Express dùng cho mọi yêu cầu) chìm giữa tiếng chuông giả.
//   • Người dùng gõ `npm install` trên máy mình → npm tự cắt 385 mục → cây làm
//     việc bẩn dù họ chưa sửa gì. Lần đầu chạy thử app đã thấy `git status`
//     đỏ một tệp sáu nghìn dòng.
//
// Bài này KHÔNG gọi `npm` (để chạy được y hệt trên Windows lẫn CI): nó đọc
// thẳng tệp khóa và đi lại đúng luật tìm gói của Node — từ gốc, theo từng
// `dependencies`, tìm `node_modules/<tên>` gần nhất rồi lùi dần lên trên.
// Mục nào không ai với tới là mục thừa. Gói nào bắt buộc mà không tìm thấy là
// gói thiếu.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const docJson = (ten) => JSON.parse(fs.readFileSync(path.join(GOC, ten), 'utf8'));
const pkg = docJson('package.json');
const lock = docJson('package-lock.json');
const goi = lock.packages || {};

// ===========================================================================
console.log('\n[1] Tệp khóa có hình dạng mà bài này hiểu được');
{
  check('lockfileVersion >= 2 (npm 7 trở lên — mới có bảng `packages`)',
    Number(lock.lockfileVersion) >= 2, lock.lockfileVersion);
  check('có mục gốc `packages[""]`', !!goi[''], Object.keys(goi).length);
  check('tên gói gốc khớp package.json', lock.name === pkg.name, [lock.name, pkg.name]);
}

// ===========================================================================
console.log('\n[2] Ba bảng phụ thuộc ở gốc tệp khóa khớp package.json — so theo TẬP, không theo thứ tự');
{
  const goc = goi[''] || {};
  for (const bang of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const a = pkg[bang] || {};
    const b = goc[bang] || {};
    const tenA = Object.keys(a).sort();
    const tenB = Object.keys(b).sort();
    const thua = tenB.filter(t => !(t in a));
    const thieu = tenA.filter(t => !(t in b));
    const lech = tenA.filter(t => t in b && a[t] !== b[t]).map(t => `${t}: ${a[t]} ≠ ${b[t]}`);
    check(`${bang}: tệp khóa không khai gói mà package.json đã bỏ`, thua.length === 0, thua);
    check(`${bang}: tệp khóa không thiếu gói package.json đang khai`, thieu.length === 0, thieu);
    check(`${bang}: khoảng phiên bản từng gói giống nhau`, lech.length === 0, lech);
  }
}

// ===========================================================================
// Luật tìm gói của Node: từ thư mục của gói đang xét, tìm `node_modules/<tên>`
// ngay dưới nó; không có thì lùi lên thư mục gói cha, cho tới gốc kho.
function timTu(duong, ten) {
  let p = duong;
  for (;;) {
    const ung = p ? `${p}/node_modules/${ten}` : `node_modules/${ten}`;
    if (goi[ung]) return ung;
    if (!p) return null;
    const i = p.lastIndexOf('/node_modules/');
    p = i < 0 ? '' : p.slice(0, i);
  }
}

// GỐC ĐI THEO package.json, KHÔNG THEO MỤC GỐC CỦA TỆP KHÓA. Nếu đi theo tệp
// khóa thì một tệp khóa cũ vẫn "tự với tới" đúng những gói package.json đã bỏ
// — chính cảnh 385 mục Capacitor — và bài này xanh oan. Ở gốc, devDependencies
// cũng là bắt buộc: bộ kiểm thử và bộ xuất tài liệu nằm ở đó.
function phuThuocGoc() {
  const ra = [];
  for (const ten of Object.keys(pkg.dependencies || {})) ra.push({ ten, batBuoc: true });
  for (const ten of Object.keys(pkg.devDependencies || {})) ra.push({ ten, batBuoc: true });
  for (const ten of Object.keys(pkg.optionalDependencies || {})) ra.push({ ten, batBuoc: false });
  return ra;
}

function phuThuocCua(muc) {
  const ra = [];
  const peerTuyChon = (muc.peerDependenciesMeta || {});
  for (const [ten] of Object.entries(muc.dependencies || {})) ra.push({ ten, batBuoc: true });
  for (const [ten] of Object.entries(muc.optionalDependencies || {})) ra.push({ ten, batBuoc: false });
  for (const [ten] of Object.entries(muc.peerDependencies || {})) {
    ra.push({ ten, batBuoc: !(peerTuyChon[ten] && peerTuyChon[ten].optional) });
  }
  return ra;
}

console.log('\n[3] Mọi mục trong tệp khóa đều có người cần tới — không có gói thừa');
const daToi = new Set(['']);
const thieu = [];
{
  const hang = [''];
  while (hang.length) {
    const duong = hang.shift();
    const muc = goi[duong];
    if (!muc || muc.link) continue;
    for (const { ten, batBuoc } of (duong === '' ? phuThuocGoc() : phuThuocCua(muc))) {
      const dich = timTu(duong, ten);
      if (!dich) { if (batBuoc) thieu.push(`${duong || '(gốc)'} cần ${ten}`); continue; }
      if (!daToi.has(dich)) { daToi.add(dich); hang.push(dich); }
    }
  }
  const thua = Object.keys(goi).filter(k => !daToi.has(k));
  check(`không mục nào bị bỏ rơi (tệp khóa có ${Object.keys(goi).length - 1} gói, với tới được ${daToi.size - 1})`,
    thua.length === 0, { soThua: thua.length, viDu: thua.slice(0, 8) });
}

// ===========================================================================
console.log('\n[4] Không gói nào bắt buộc mà tệp khóa không có');
{
  check('mọi phụ thuộc bắt buộc đều tìm thấy theo luật node_modules', thieu.length === 0, thieu.slice(0, 8));
}

// ===========================================================================
console.log('\n[5] Bài canh này có mặt ở chỗ người ta chạy');
{
  check('có lệnh gõ tay `npm run test:khoa-goi`',
    typeof pkg.scripts['test:khoa-goi'] === 'string', Object.keys(pkg.scripts).length);
  check('và nằm trong `npm test`', pkg.scripts.test.includes('test/khoa-goi.test.mjs'));
}

tongKet();
