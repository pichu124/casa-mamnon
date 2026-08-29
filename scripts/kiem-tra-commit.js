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
// Đôi khi trộn chung là hợp lý thật (ví dụ đổi tên một biến xuyên suốt). Thêm
// một dòng riêng vào cuối lời commit:
//
//   Tron-co-y: đổi tên biến xuyên suốt, tách ra thì mã không chạy được
//
// Phải là một DÒNG RIÊNG và phải có lý do đi kèm. Cố ý viết như vậy để lời
// commit chỉ nhắc tới quy định này trong văn xuôi thì không vô tình mở đường
// thoát — chính lỗi đó đã xảy ra một lần khi bộ canh chỉ tìm chuỗi trong bài.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');
// Đường thoát phải là một dòng riêng "Tron-co-y: <lý do>", không phải chỉ là
// một chuỗi xuất hiện đâu đó trong bài — nếu không thì chính lời commit giải
// thích quy định này cũng vô tình mở đường thoát.
const DONG_THOAT = /^[ \t]*Tron-co-y:[ \t]*(\S.*)$/mi;
const VI_DU_THOAT = 'Tron-co-y: <lý do>';

// Trả về lý do nếu lời commit có xin đường thoát hợp lệ, ngược lại trả null.
function xinThoat(loi) {
  const m = DONG_THOAT.exec(loi || '');
  return m ? m[1].trim() : null;
}

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

  Nếu lần này trộn chung là có chủ ý, thêm một dòng riêng vào cuối lời commit:

    ${VI_DU_THOAT}

  Lý do đó sẽ nằm lại trong lịch sử cho người sau đọc.
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


// Đường thoát KHÔNG cần thiết cũng là một lỗi, chỉ là lỗi nhẹ hơn.
//
// Xin phép trộn trong khi commit không hề trộn thì lời commit ghi lại một điều
// KHÔNG ĐÚNG, và người sau đọc lịch sử sẽ tưởng chỗ đó từng phải đánh đổi.
// Nặng hơn: dùng đường thoát cho quen tay là bước đầu của việc dùng nó lúc
// thật sự đang trộn. Đã xảy ra thật ở đợt Đ51 — nên có dòng này.
//
// CỐ Ý CHỈ NHẮC, KHÔNG CHẶN: chặn thì người ta phải sửa lời commit vì một việc
// không sai về mặt kết quả, và một bộ canh gây phiền là một bộ canh bị tắt.
function nhacThoatThua(lyDo, kq, nhan) {
  if (!lyDo || kq.tron) return;
  console.warn(
    `\n⚠  ${nhan} có dòng "${VI_DU_THOAT.split(':')[0]}:" nhưng KHÔNG hề trộn.\n` +
    '   Bỏ dòng đó đi: lời commit đang ghi lại một điều không đúng, và dùng\n' +
    '   đường thoát cho quen tay là bước đầu của việc dùng nó lúc đang trộn thật.\n'
  );
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
      const lyDo = xinThoat(loi);
      const kqThoat = phanLoai(tepCuaCommit(ma));
      if (lyDo) {
        console.log(`↷ ${nhan} — bỏ qua có chủ ý: ${lyDo}`);
        nhacThoatThua(lyDo, kqThoat, nhan);
        continue;
      }
      const kq = kqThoat;
      if (kq.tron) { console.error(bienBan(kq, nhan)); hong++; }
      else console.log(`✓ ${nhan}`);
    }
    if (hong) console.error(`\n${hong} commit vi phạm quy định commit riêng.`);
    return hong ? 1 : 0;
  }

  if (maCommit) {
    const loi = loiCommit(maCommit);
    const lyDo = xinThoat(loi);
    const kqCommit = phanLoai(tepCuaCommit(maCommit));
    if (lyDo) {
      console.log(`↷ Bỏ qua có chủ ý: ${lyDo}`);
      nhacThoatThua(lyDo, kqCommit, `Commit ${maCommit.slice(0, 8)}`);
      return 0;
    }
    const kq = kqCommit;
    if (kq.tron) { console.error(bienBan(kq, `Commit ${maCommit.slice(0, 8)}`)); return 1; }
    console.log(`✓ Commit ${maCommit.slice(0, 8)} không trộn tệp dùng chung với tệp tính năng.`);
    return 0;
  }

  // Mặc định: kiểm tra vùng đã `git add`.
  if (tepLoiNhan && fs.existsSync(tepLoiNhan)) {
    const lyDo = xinThoat(fs.readFileSync(tepLoiNhan, 'utf8'));
    if (lyDo) {
      console.log(`↷ Bỏ qua kiểm tra commit riêng, lý do đã ghi: ${lyDo}`);
      nhacThoatThua(lyDo, phanLoai(tepDaThemVaoVungCho()), 'Commit sắp tạo');
      return 0;
    }
  }
  const kq = phanLoai(tepDaThemVaoVungCho());
  if (kq.tron) { console.error(bienBan(kq, 'Commit sắp tạo')); return 1; }
  console.log('✓ Commit này không trộn tệp dùng chung với tệp tính năng.');
  return 0;
}

module.exports = { phanLoai, xinThoat, nhacThoatThua, DUNG_CHUNG, LA_TINH_NANG, VI_DU_THOAT };

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    // Không chặn công việc của người dùng vì bản thân bài kiểm tra hỏng.
    console.error(`Không kiểm tra được commit (${err.message}) — bỏ qua.`);
    process.exit(0);
  }
}
