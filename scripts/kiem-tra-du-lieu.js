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
// Đây là ảnh khuôn mặt và hồ sơ sức khỏe của trẻ 2–6 tuổi, thuộc nhóm nhạy cảm
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
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const GOC = path.join(__dirname, '..');

// Mỗi mục: nhận diện một loại tệp không bao giờ được đưa lên kho mã.
const CAM = [
  { ten: 'cơ sở dữ liệu', re: /(^|\/)[^/]+\.(db|sqlite|sqlite3)(-wal|-shm|\.\d+)?$/i },
  { ten: 'ảnh của bé đã tải lên', re: /(^|\/)uploads?\// },
  { ten: 'bản sao lưu', re: /(^|\/)backups?\// },
  { ten: 'bản lưu trước khi khôi phục', re: /(^|\/)\.khoi-phuc-/ },
  { ten: 'kho dữ liệu JSON đời cũ', re: /(^|\/)(db|sessions)\.json/ },
  { ten: 'tệp bí mật (mật khẩu, khóa)', re: /(^|\/)\.env($|\.)/ },
  { ten: 'khóa ký ứng dụng', re: /\.(jks|keystore|pem|key|p12)$/i },
  { ten: 'danh sách bé chưa nhập', re: /(^|\/)data\/.*\.(csv|xlsx|xls)$/i },
];

// Dữ liệu mẫu dùng cho kiểm thử thì được phép — nó không phải của trẻ em thật.
const NGOAI_LE = [
  /^test\//,
  /^docs\/.*\.(csv|xlsx)$/i,   // tệp mẫu đính kèm hướng dẫn nhập danh sách
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
  Hồ sơ của bé gồm ảnh khuôn mặt và dữ liệu sức khỏe của trẻ 2–6 tuổi — thuộc
  nhóm nhạy cảm theo Nghị định 13/2023/NĐ-CP. Một khi đã đẩy lên thì không thu
  lại được: người khác có thể đã tải về trước khi kịp xóa.

  Gỡ ra khỏi vùng chờ (KHÔNG xóa tệp trên đĩa):

    git reset ${dinh.map(d => d.tep).join(' ')}

  Nếu tệp đang bị git theo dõi từ trước, gỡ theo dõi hẳn:

    git rm --cached ${dinh.map(d => d.tep).join(' ')}

  Khi chạy thật, hãy để dữ liệu NẰM NGOÀI thư mục mã nguồn:

    DATA_DIR=/var/lib/schoolconnect npm start

  Bộ canh này không có đường thoát. Nếu thấy nó chặn nhầm, sửa danh sách NGOAI_LE
  trong scripts/kiem-tra-du-lieu.js ở một commit riêng, có giải thích.
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

module.exports = { soiTep, CAM, NGOAI_LE };

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
