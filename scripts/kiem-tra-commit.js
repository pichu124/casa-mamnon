#!/usr/bin/env node
// Canh quy định "sửa tệp dùng chung phải là commit riêng".
//
// VÌ SAO
//
// `lib/db.js`, `lib/auth.js`, `public/js/ui.js`, `public/js/app.js` không thuộc
// về tính năng nào cả — cả ứng dụng đang dựa vào chúng. Trộn việc sửa chúng vào
// cùng commit với việc thêm/bỏ một tính năng gây ra hai vấn đề:
//
//   1. Khi app hỏng, chỉ có một nút để bấm. `git revert` là mất cả hai phần,
//      không gỡ riêng được phần nào.
//   2. Người sửa lúc đó đang bận nghĩ về tính năng mới, không nghĩ về hàng trăm
//      chỗ khác đang gọi tới tệp dùng chung.
//
// CÁCH DÙNG
//
//   node scripts/kiem-tra-commit.js                     # kiểm tra vùng đã `git add`
//   node scripts/kiem-tra-commit.js --commit <mã>       # kiểm tra một commit đã có
//   node scripts/kiem-tra-commit.js --khoang A..B       # kiểm tra mọi commit trong khoảng
//   node scripts/kiem-tra-commit.js --tep a.js b.js     # kiểm tra một danh sách tệp
//
// ĐƯỜNG THOÁT
//
// Đôi khi trộn chung là hợp lý thật (ví dụ đổi tên một biến xuyên suốt). Ghi
// `[tron-co-y]` kèm lý do vào lời commit thì đi qua được, và lý do đó vẫn nằm
// lại trong lịch sử để sau này đọc ra.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');
const CHO_PHEP_TRON = '[tron-co-y]';

// Bốn tệp mà cả ứng dụng đang dựa vào. Danh sách này khớp với CLAUDE.md —
// sửa ở đây thì sửa cả ở đó.
const DUNG_CHUNG = [
  'lib/db.js',
  'lib/auth.js',
  'public/js/ui.js',
  'public/js/app.js',
];

// Tệp thuộc về một tính năng cụ thể.
const LA_TINH_NANG = [
  /^routes\/[^/]+\.js$/,
  /^public\/js\/views\/[^/]+\.js$/,
  /^modules\/[^/]+\/.+$/,
];

function git(...args) {
  return execFileSync('git', args, { cwd: GOC, encoding: 'utf8' });
}

function phanLoai(tepThayDoi) {
  const dungChung = tepThayDoi.filter(f => DUNG_CHUNG.includes(f));
  const tinhNang = tepThayDoi.filter(f => LA_TINH_NANG.some(re => re.test(f)));
  return { dungChung, tinhNang, tron: dungChung.length > 0 && tinhNang.length > 0 };
}

function bienBan({ dungChung, tinhNang }, nhan) {
  const lenh = `    git reset ${tinhNang.join(' ')}`;
  return `
✗ ${nhan} vừa chạm tệp DÙNG CHUNG vừa chạm tệp TÍNH NĂNG.

  Dùng chung:  ${dungChung.join(', ')}
  Tính năng:   ${tinhNang.join(', ')}

  Cả ứng dụng đang dựa vào những tệp dùng chung này — 22/22 tệp route đều gọi
  lib/db.js, riêng UI.esc có hơn 300 chỗ gọi. Nếu commit này làm hỏng gì thì
  không gỡ riêng được phần nào.

  Hãy tách làm hai commit, chạy \`npm test\` sau mỗi commit:

${lenh}
    npm test && git commit -m "<tệp dùng chung>: thêm ..."
    git add ${tinhNang.join(' ')}
    npm test && git commit -m "<tính năng>: ..."

  Nếu lần này trộn chung là có chủ ý, ghi ${CHO_PHEP_TRON} kèm lý do vào lời
  commit — lý do đó sẽ nằm lại trong lịch sử cho người sau đọc.
`;
}

function tepDaThemVaoVungCho() {
  return git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
    .split('\n').map(s => s.trim()).filter(Boolean);
}

function tepCuaCommit(ma) {
  return git('show', '--name-only', '--format=', '--diff-filter=ACMR', ma)
    .split('\n').map(s => s.trim()).filter(Boolean);
}

function loiCommit(ma) {
  return git('show', '--format=%B', '--no-patch', ma);
}

// --- Chạy ------------------------------------------------------------------
function main(argv) {
  const cf = (ten) => { const i = argv.indexOf(ten); return i >= 0 ? argv[i + 1] : null; };
  let hong = 0;

  // Móc commit-msg của git truyền vào đường dẫn tệp chứa lời commit.
  const tepLoiNhan = cf('--tin-nhan');
  const danhSachTep = argv.indexOf('--tep');
  const maCommit = cf('--commit');
  const khoang = cf('--khoang');

  if (danhSachTep >= 0) {
    const tep = argv.slice(danhSachTep + 1).filter(f => !f.startsWith('--'));
    const kq = phanLoai(tep);
    if (kq.tron) { console.error(bienBan(kq, 'Danh sách tệp này')); return 1; }
    console.log('✓ Danh sách tệp không trộn tệp dùng chung với tệp tính năng.');
    return 0;
  }

  if (khoang) {
    const dsMa = git('rev-list', khoang).split('\n').map(s => s.trim()).filter(Boolean);
    if (!dsMa.length) { console.log('✓ Không có commit nào trong khoảng để kiểm tra.'); return 0; }
    for (const ma of dsMa) {
      const loi = loiCommit(ma);
      const nhan = `Commit ${ma.slice(0, 8)} ("${loi.split('\n')[0].slice(0, 60)}")`;
      if (loi.includes(CHO_PHEP_TRON)) { console.log(`↷ ${nhan} — bỏ qua theo ${CHO_PHEP_TRON}`); continue; }
      const kq = phanLoai(tepCuaCommit(ma));
      if (kq.tron) { console.error(bienBan(kq, nhan)); hong++; }
      else console.log(`✓ ${nhan}`);
    }
    if (hong) console.error(`\n${hong} commit vi phạm quy định commit riêng.`);
    return hong ? 1 : 0;
  }

  if (maCommit) {
    const loi = loiCommit(maCommit);
    if (loi.includes(CHO_PHEP_TRON)) { console.log(`↷ Bỏ qua theo ${CHO_PHEP_TRON}`); return 0; }
    const kq = phanLoai(tepCuaCommit(maCommit));
    if (kq.tron) { console.error(bienBan(kq, `Commit ${maCommit.slice(0, 8)}`)); return 1; }
    console.log(`✓ Commit ${maCommit.slice(0, 8)} không trộn tệp dùng chung với tệp tính năng.`);
    return 0;
  }

  // Mặc định: kiểm tra vùng đã `git add`.
  if (tepLoiNhan && fs.existsSync(tepLoiNhan)) {
    const loi = fs.readFileSync(tepLoiNhan, 'utf8');
    if (loi.includes(CHO_PHEP_TRON)) {
      console.log(`↷ Bỏ qua kiểm tra commit riêng theo ${CHO_PHEP_TRON}`);
      return 0;
    }
  }
  const kq = phanLoai(tepDaThemVaoVungCho());
  if (kq.tron) { console.error(bienBan(kq, 'Commit sắp tạo')); return 1; }
  console.log('✓ Commit này không trộn tệp dùng chung với tệp tính năng.');
  return 0;
}

module.exports = { phanLoai, DUNG_CHUNG, LA_TINH_NANG, CHO_PHEP_TRON };

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    // Không chặn công việc của người dùng vì bản thân bài kiểm tra hỏng.
    console.error(`Không kiểm tra được commit (${err.message}) — bỏ qua.`);
    process.exit(0);
  }
}
