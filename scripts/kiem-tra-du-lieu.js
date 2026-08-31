#!/usr/bin/env node
// Chặn dữ liệu thật của trường lọt lên GitHub.
//
// VÌ SAO
//
// Cách triển khai phổ biến nhất là `git pull` ngay trên máy chủ rồi `npm start`.
// Khi đó cơ sở dữ liệu thật nằm ngay trong thư mục làm việc của git. Chỉ cần một
// lần gõ `git add -A` theo thói quen là toàn bộ hồ sơ 300 học sinh — họ tên, ngày
// sinh, hồ sơ sức khỏe, số điện thoại phụ huynh — bị đẩy lên một kho công khai.
//
// Đây là ảnh khuôn mặt và hồ sơ sức khỏe của trẻ 12 tháng – 6 tuổi, thuộc nhóm nhạy cảm
// theo Nghị định 13/2023/NĐ-CP. Lộ rồi thì không thu lại được: viết lại lịch sử
// git cũng không xóa được thứ người khác đã tải về.
//
// Vì vậy bộ canh này **KHÔNG CÓ ĐƯỜNG THOÁT**. Khác với quy định commit riêng
// (nơi trộn chung đôi khi hợp lý), ở đây không có trường hợp nào mà việc đẩy cơ
// sở dữ liệu hay ảnh của bé lên GitHub là đúng.
//
// CÁCH DÙNG
//
//   node scripts/kiem-tra-du-lieu.js                  # kiểm tra vùng đã `git add`
//   node scripts/kiem-tra-du-lieu.js --khoang A..B    # kiểm tra mọi commit trong khoảng
//   node scripts/kiem-tra-du-lieu.js --tep a b c      # kiểm tra một danh sách tệp
//   node scripts/kiem-tra-du-lieu.js --quet-kho       # soi tệp dữ liệu LẠC trong kho mã
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');

// Mỗi mục: nhận diện một loại tệp không bao giờ được đưa lên kho mã.
const CAM = [
  // Bắt cả tên có ĐUÔI THÊM phía sau, không chỉ tên kết thúc bằng `.db`.
  //
  // Chỗ này từng có một lỗ, và lỗ đó do CHÍNH KHO MÃ NÀY sinh ra: khi khôi phục
  // dữ liệu, `scripts/restore.js` đổi tên cơ sở dữ liệu cũ thành
  // `school.db.truoc-khi-khoi-phuc-<số>`. Tên ấy không khớp mẫu cũ (vì phần
  // đuôi không phải -wal, -shm hay một con số), và cũng không khớp `*.db` trong
  // .gitignore. Tức là một bản sao NGUYÊN VẸN hồ sơ của cả trường nằm ngay
  // trong thư mục làm việc, git nhìn thấy, và bộ canh này nói "sạch".
  //
  // CLAUDE.md viết bộ canh này "không có đường thoát". Có một đường, và nó tự
  // mở ra sau mỗi lần khôi phục — đúng lúc người ta đang thao tác vội.
  { ten: 'cơ sở dữ liệu', re: /(^|\/)[^/]+\.(db|sqlite|sqlite3)([-.][^/]*)?$/i },
  { ten: 'ảnh của bé đã tải lên', re: /(^|\/)uploads?\// },
  { ten: 'bản sao lưu', re: /(^|\/)backups?\// },
  { ten: 'bản lưu trước khi khôi phục', re: /(^|\/)\.khoi-phuc-|truoc-khi-khoi-phuc/ },
  { ten: 'kho dữ liệu JSON đời cũ', re: /(^|\/)(db|sessions)\.json/ },
  { ten: 'tệp bí mật (mật khẩu, khóa)', re: /(^|\/)\.env($|\.)/ },
  { ten: 'khóa ký ứng dụng', re: /\.(jks|keystore|pem|key|p12)$/i },
  { ten: 'danh sách bé chưa nhập', re: /(^|\/)data\/.*\.(csv|xlsx|xls)$/i },
];

// MIỄN TRỪ PHẢI HẸP TỚI MỨC KHÔNG CÒN CHỖ NÀO LỌT.
//
// Bản trước miễn trừ TRỌN thư mục `test/` bằng một dòng `/^test\//`, với lý do
// "dữ liệu mẫu dùng cho kiểm thử thì không phải của trẻ em thật". Lý do đúng
// cho MÃ của bộ test; sai cho mọi thứ khác lọt vào cùng thư mục.
//
// Vì các bài test dựng máy chủ thật, chạy trên cơ sở dữ liệu thật, và ghi ảnh
// thật. Chúng nhắm vào thư mục tạm của hệ điều hành, nhưng chỉ cần một lần
// `DATA_DIR` trỏ nhầm, một lần chép bản sao về `test/` để soi, hay một lần
// người vận hành để tệp `school.db` của trường vào đó cho tiện — là một cơ sở
// dữ liệu có thật của trẻ đi thẳng qua bộ canh mà không một dòng cảnh báo nào.
//
// Đây là bộ canh mà CLAUDE.md ghi "KHÔNG có đường thoát". Một dòng miễn trừ
// rộng bằng cả thư mục thì đúng là một đường thoát.
//
// Nay chỉ miễn trừ đúng thứ cần: TỆP MÃ của bộ test, và tệp dữ liệu nhỏ dạng
// JSON mà bộ test dùng làm bản chụp đối chiếu (ví dụ `test/khe-uoc.json`).
const NGOAI_LE = [
  /^test\/[\w.-]+\.(test\.)?mjs$/,   // mã của bộ kiểm thử
  /^test\/[\w.-]+\.json$/,           // bản chụp đối chiếu, ví dụ khe-uoc.json
  /^docs\/.*\.(csv|xlsx)$/i,         // tệp mẫu đính kèm hướng dẫn nhập danh sách
];

function git(...args) {
  return execFileSync('git', args, { cwd: GOC, encoding: 'utf8' });
}

function soiTep(danhSach) {
  const dinh = [];
  for (const tep of danhSach) {
    if (NGOAI_LE.some(re => re.test(tep))) continue;
    const loai = CAM.find(c => c.re.test(tep));
    if (loai) dinh.push({ tep, loai: loai.ten });
  }
  return dinh;
}

function bienBan(dinh, nhan) {
  return `
✗ ${nhan} có tệp DỮ LIỆU không được đưa lên kho mã:

${dinh.map(d => `    ${d.tep}\n      → ${d.loai}`).join('\n')}

  Kho mã này là nơi chứa MÃ NGUỒN, không phải nơi chứa dữ liệu của trường.
  Hồ sơ của bé gồm ảnh khuôn mặt và dữ liệu sức khỏe của trẻ 12 tháng – 6 tuổi — thuộc
  nhóm nhạy cảm theo Nghị định 13/2023/NĐ-CP. Một khi đã đẩy lên thì không thu
  lại được: người khác có thể đã tải về trước khi kịp xóa.

  Gỡ ra khỏi vùng chờ (KHÔNG xóa tệp trên đĩa):

    git reset ${dinh.map(d => d.tep).join(' ')}

  Nếu tệp đang bị git theo dõi từ trước, gỡ theo dõi hẳn:

    git rm --cached ${dinh.map(d => d.tep).join(' ')}

  Khi chạy thật, hãy để dữ liệu NẰM NGOÀI thư mục mã nguồn:

    DATA_DIR=/var/lib/casa-mamnon npm start

  Bộ canh này không có đường thoát. Nếu thấy nó chặn nhầm, sửa danh sách NGOAI_LE
  trong scripts/kiem-tra-du-lieu.js ở một commit riêng, có giải thích.
`;
}

// ---------------------------------------------------------------------------
// Soi tệp dữ liệu LẠC trong thư mục mã nguồn.
//
// Ba mục ở trên đều soi thứ đang chờ vào git. Nhưng có một loại nguy hiểm mà
// chúng không bao giờ thấy: tệp dữ liệu nằm ngay trong kho mã và bị `.gitignore`
// GIẤU ĐI. Nó không hiện trong `git status`, không vào commit nào — nên ai cũng
// tưởng là không có. Trong khi đó:
//
//   • `docker build` không đọc `.gitignore`. `COPY . .` đóng gói nó vào ảnh.
//   • `rsync`, `scp -r`, `tar czf` cả thư mục cũng mang nó đi theo.
//   • Người tiếp quản mã `zip` cả thư mục gửi cho người khác.
//
// Đã xảy ra thật: một `undefined/school.db` 520 KB với hồ sơ 8 bé nằm trong kho
// mã nhiều ngày, do một bài kiểm thử đặt `DATA_DIR` thành chuỗi "undefined".
//
// `data/` được BỎ QUA có chủ ý: đó là chỗ máy chủ tự đặt dữ liệu khi chạy thử
// mà không đặt DATA_DIR, và `server.js` đã có lời nhắc riêng cho nó. Mục này
// chỉ đi tìm thứ NẰM SAI CHỖ — thứ không ai chờ đợi nên không ai đi dọn.
const BO_QUA_KHI_QUET = new Set(['node_modules', '.git', 'data', 'android']);

function quetKho(goc = GOC) {
  const dinh = [];
  (function di(thuMuc, tienTo) {
    let muc;
    try { muc = fs.readdirSync(thuMuc, { withFileTypes: true }); }
    catch { return; }
    for (const m of muc) {
      if (m.isSymbolicLink()) continue;
      const duong = tienTo ? `${tienTo}/${m.name}` : m.name;
      if (m.isDirectory()) {
        if (BO_QUA_KHI_QUET.has(m.name)) continue;
        di(path.join(thuMuc, m.name), duong);
        continue;
      }
      if (NGOAI_LE.some(re => re.test(duong))) continue;
      const loai = CAM.find(c => c.re.test(duong));
      if (loai) dinh.push({ tep: duong, loai: loai.ten });
    }
  })(goc, '');
  return dinh;
}

function bienBanKho(dinh) {
  return `
✗ Có tệp DỮ LIỆU nằm lạc trong thư mục mã nguồn:

${dinh.map(d => `    ${d.tep}\n      → ${d.loai}`).join('\n')}

  Những tệp này KHÔNG hiện trong \`git status\` vì .gitignore đã giấu chúng đi —
  nên rất dễ tưởng là không có. Nhưng \`docker build\` không đọc .gitignore, và
  \`rsync\`/\`tar\`/\`zip\` cả thư mục thì mang chúng đi theo.

  Xem chúng chứa gì rồi xóa:

    ls -la ${[...new Set(dinh.map(d => path.dirname(d.tep)))].join(' ')}
    rm -rf ${[...new Set(dinh.map(d => d.tep.split('/')[0]))].join(' ')}

  Nếu đó là dữ liệu CẦN GIỮ, chuyển ra ngoài kho mã trước khi xóa. Khi chạy
  thật, hãy để dữ liệu nằm hẳn ngoài thư mục mã nguồn:

    DATA_DIR=/var/lib/casa-mamnon npm start
`;
}

function main(argv) {
  const cf = (ten) => { const i = argv.indexOf(ten); return i >= 0 ? argv[i + 1] : null; };
  const danhSachTep = argv.indexOf('--tep');
  const khoang = cf('--khoang');

  if (danhSachTep >= 0) {
    const dinh = soiTep(argv.slice(danhSachTep + 1).filter(f => !f.startsWith('--')));
    if (dinh.length) { console.error(bienBan(dinh, 'Danh sách tệp này')); return 1; }
    console.log('✓ Không có tệp dữ liệu nào trong danh sách.');
    return 0;
  }

  if (argv.includes('--quet-kho')) {
    const dinh = quetKho();
    if (dinh.length) { console.error(bienBanKho(dinh)); return 1; }
    console.log('✓ Không có tệp dữ liệu nào nằm lạc trong kho mã.');
    return 0;
  }

  if (khoang) {
    const dsMa = git('rev-list', khoang).split('\n').map(s => s.trim()).filter(Boolean);
    let hong = 0;
    for (const ma of dsMa) {
      const tep = git('show', '--name-only', '--format=', '--diff-filter=ACMR', ma)
        .split('\n').map(s => s.trim()).filter(Boolean);
      const dinh = soiTep(tep);
      if (dinh.length) { console.error(bienBan(dinh, `Commit ${ma.slice(0, 8)}`)); hong++; }
    }
    if (hong) { console.error(`\n${hong} commit chứa dữ liệu không được đưa lên.`); return 1; }
    console.log(`✓ ${dsMa.length} commit, không commit nào chứa tệp dữ liệu.`);
    return 0;
  }

  const tep = git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
    .split('\n').map(s => s.trim()).filter(Boolean);
  const dinh = soiTep(tep);
  if (dinh.length) { console.error(bienBan(dinh, 'Commit sắp tạo')); return 1; }
  console.log('✓ Commit này không chứa dữ liệu của trường.');
  return 0;
}

module.exports = { soiTep, quetKho, CAM, NGOAI_LE };

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    // Khác với bộ canh commit riêng: ở đây hỏng thì CHẶN, không cho qua.
    // Thà phiền một lần còn hơn để lọt hồ sơ trẻ em lên kho công khai.
    console.error(`✗ Không kiểm tra được dữ liệu: ${err.message}`);
    console.error('  Chặn commit để an toàn. Sửa lỗi trên rồi thử lại,');
    console.error('  hoặc kiểm tra bằng tay: git diff --cached --name-only');
    process.exit(1);
  }
}
