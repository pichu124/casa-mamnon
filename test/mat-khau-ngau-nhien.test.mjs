// Bài canh MỌI MẬT KHẨU ĐỀU SINH BẰNG NGUỒN NGẪU NHIÊN THẬT (Đ212).
//
// Chạy bằng:  npm run test:mat-khau-ngau-nhien
//
// `Math.random` KHÔNG phải bộ sinh dùng cho việc bảo mật. Nó có trạng thái nội
// bộ và các giá trị nối nhau theo một quy luật, nên biết một dãy giá trị liên
// tiếp là suy ngược ra trạng thái rồi tính được những giá trị TRƯỚC và SAU.
//
// CHỖ NGUY NHẤT LÀ CHỖ SINH HÀNG LOẠT. `routes/admin.js` nhập danh sách đầu
// năm từ CSV: HÀNG TRĂM mật khẩu phụ huynh sinh liên tiếp từ cùng một dòng
// chảy rồi in ra một lượt cho người nhập. Ai có vài mật khẩu liên tiếp của mẻ
// ấy — một phụ huynh hai con, một cô nhận danh sách lớp mình, một tờ in bỏ
// quên — về nguyên tắc suy ra được mật khẩu của CÁC NHÀ KHÁC.
//
// VÌ SAO BÀI NÀY SINH RA MUỘN HƠN BẢN VÁ ĐẦU TIÊN, ghi lại để người sau biết:
// Đ117 đã vá hai chỗ (`routes/accounts.js`, `scripts/create-admin.js`) nhưng
// KHÔNG để lại bài canh nào. Hậu quả đo được: hai chỗ còn lại
// (`routes/admin.js`, `scripts/ban-thu.js`) mang y nguyên lỗi ấy suốt từ đó
// tới Đ212 mà không có gì kêu một tiếng — và cũng không có gì ngăn ai đó lùi
// lại chính hai chỗ đã vá. Một bản vá không kèm bài canh là một bản vá chờ bị
// gỡ.
//
// BÀI NÀY CANH THEO SỔ NỢ, KHÔNG CẤM TUYỆT ĐỐI. `Math.random` vẫn dùng được ở
// chỗ không phải bí mật (sinh tên đăng nhập, sinh khoá chống nhân đôi). Nhưng
// mỗi chỗ như thế phải có tên trong sổ dưới đây kèm lý do, và sổ chỉ được
// NGẮN ĐI. Thêm một chỗ mới là bài đỏ, và người thêm buộc phải đọc lại vì sao.
import fs from 'node:fs';
import path from 'node:path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const doc = (p) => fs.readFileSync(path.join(GOC, p), 'utf8');

// Bỏ chú thích trước khi soi: chính các tệp đã vá đều NHẮC TỚI `Math.random`
// trong chú thích để giải thích vì sao không dùng nó. Soi cả chú thích là bài
// đỏ ở đúng những chỗ đã làm đúng.
const boChuThich = (v) => v
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

// ---------------------------------------------------------------------------
// BỐN BỘ SINH MẬT KHẨU CỦA CẢ KHO. Mỗi dòng: tệp, tên hàm, vì sao nó là bí mật.
const BO_SINH = [
  ['routes/accounts.js', 'sinhMatKhauTam',
    'mật khẩu tạm cấp lại khi quên — mở được hồ sơ trẻ (đã vá Đ117)'],
  ['scripts/create-admin.js', null,
    'mật khẩu của tài khoản quản trị THẬT (đã vá Đ117)'],
  ['routes/admin.js', 'sinhMatKhau',
    'tạo tài khoản cô, và HÀNG TRĂM mật khẩu phụ huynh khi nhập CSV đầu năm (Đ212)'],
  ['scripts/ban-thu.js', 'sinhMatKhau',
    'mật khẩu cô và phụ huynh của buổi thử, chạy qua đường hầm công khai (Đ212)'],
];

// SỔ NỢ: những chỗ `Math.random` ĐƯỢC PHÉP ở lại, vì không sinh ra bí mật.
// Chỉ được ngắn đi, không được dài ra.
const DUOC_PHEP = {
  'routes/admin.js': {
    so: 1,
    vi_sao: 'sinh TÊN ĐĂNG NHẬP dự phòng khi trùng — tên đăng nhập không phải bí mật',
  },
  'modules/thuchup/view.js': {
    so: 1,
    vi_sao: 'khoá chống nhân đôi ở máy của cô, và đã ưu tiên crypto.randomUUID() trước',
  },
};

// Vùng mã CHẠY THẬT. Cố ý không quét `test/` — chính bài này phải được nhắc tên.
const VUNG = ['lib', 'routes', 'modules', 'public/js', 'scripts', 'server.js', 'data'];

// Tên tệp trả về LUÔN viết bằng '/', vì nó là khoá tra trong DUOC_PHEP. Trên
// Windows path.relative ra 'routes\x.js': không khớp khoá nào, và cả sổ nợ
// thành "chỗ mới" — bài đỏ oan ở máy của người mới tải mã về.
const tuongDoi = (p) => path.relative(GOC, p).split(path.sep).join('/');

function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [tuongDoi(p)];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const d = path.join(p, f);
    if (fs.statSync(d).isDirectory()) ra.push(...cacTep(tuongDoi(d)));
    else if (/\.(js|mjs)$/.test(f)) ra.push(tuongDoi(d));
  }
  return ra;
}

console.log('\n[1] Mỗi bộ sinh mật khẩu đều dùng crypto, KHÔNG dùng Math.random');
for (const [tep, ten, viSao] of BO_SINH) {
  const tho = doc(tep);
  const ma = boChuThich(tho);
  check(`${tep} — tồn tại để mà soi`, tho.length > 0, tep);
  check(`${tep} — dùng crypto.randomInt (${viSao})`,
    /crypto\.randomInt\(/.test(ma), 'không thấy crypto.randomInt');
  check(`${tep} — KHÔNG còn Math.random trong chỗ sinh mật khẩu`,
    !/Math\.random/.test(ma) || DUOC_PHEP[tep],
    (ma.match(/.{0,60}Math\.random.{0,40}/) || [])[0]);
  if (ten) {
    // Cắt đúng thân hàm rồi soi — kẻo `crypto.randomInt` nằm ở một hàm khác
    // trong cùng tệp mà hàm sinh mật khẩu vẫn dùng Math.random.
    const dau = ma.indexOf(`function ${ten}(`);
    check(`${tep} — cắt được thân hàm ${ten}`, dau > 0, dau);
    const than = ma.slice(dau, dau + 500);
    check(`${tep} — ĐÍCH THÂN ${ten} gọi crypto.randomInt`,
      /crypto\.randomInt\(/.test(than), than.slice(0, 200));
    check(`${tep} — và ${ten} KHÔNG gọi Math.random`,
      !/Math\.random/.test(than), than.slice(0, 200));
  }
  check(`${tep} — có nạp crypto`,
    /require\('crypto'\)|require\("crypto"\)/.test(ma), 'thiếu require crypto');
}

console.log('\n[2] Sổ nợ Math.random chỉ được NGẮN ĐI, không được dài ra');
{
  const thay = {};
  for (const muc of VUNG) {
    for (const tep of cacTep(muc)) {
      const ma = boChuThich(doc(tep));
      const so = (ma.match(/Math\.random/g) || []).length;
      if (so) thay[tep] = so;
    }
  }
  check('tên tệp trong vùng quét viết bằng / trên mọi hệ',
    VUNG.flatMap(cacTep).every((t) => !t.includes('\\')),
    VUNG.flatMap(cacTep).filter((t) => t.includes('\\')).slice(0, 3));
  const moi = Object.keys(thay).filter((t) => !DUOC_PHEP[t]);
  check('KHÔNG chỗ nào mới sinh ra cách dùng Math.random',
    moi.length === 0, moi.map((t) => `${t}: ${thay[t]} chỗ`));

  for (const [tep, { so, vi_sao }] of Object.entries(DUOC_PHEP)) {
    const thuc = thay[tep] || 0;
    check(`${tep} — nợ ≤ ${so} chỗ (${vi_sao})`, thuc <= so, `đang là ${thuc}`);
    if (thuc < so) {
      check(`${tep} — sổ nợ nên siết xuống ${thuc}`, false,
        'đã bớt rồi thì sửa con số trong bài canh cho khớp');
    }
  }
}

console.log('\n[3] Bộ chữ mật khẩu giữ nguyên — vẫn đọc được qua điện thoại');
{
  // Đổi nguồn ngẫu nhiên KHÔNG được đổi mặt chữ: bộ chữ cố ý bỏ các ký tự dễ
  // nhầm (0/O, 1/l/I) vì cô phải đọc mật khẩu cho phụ huynh qua điện thoại.
  for (const tep of ['routes/accounts.js', 'routes/admin.js', 'scripts/ban-thu.js']) {
    const ma = boChuThich(doc(tep));
    check(`${tep} — bộ chữ vẫn bỏ o/l/i/0/1`,
      /'abcdefghjkmnpqrstuvwxyz'/.test(ma), 'bộ chữ đã đổi');
    check(`${tep} — bộ số vẫn bỏ 0 và 1`,
      /'23456789'/.test(ma), 'bộ số đã đổi');
  }
}

console.log('\n[4] Đối chứng: crypto.randomInt thật sự sinh ra chuỗi đúng khuôn');
{
  const crypto = await import('node:crypto');
  const CHU = 'abcdefghjkmnpqrstuvwxyz';
  const SO = '23456789';
  const pick = (s) => s[crypto.randomInt(s.length)];
  const sinh = () => {
    let out = '';
    for (let i = 0; i < 5; i++) out += pick(CHU);
    for (let i = 0; i < 3; i++) out += pick(SO);
    return out;
  };
  const mau = Array.from({ length: 200 }, sinh);
  check('mọi mật khẩu đúng 8 ký tự', mau.every((m) => m.length === 8), mau[0]);
  check('5 ký tự đầu đều nằm trong bộ chữ đã chọn',
    mau.every((m) => [...m.slice(0, 5)].every((c) => CHU.includes(c))), mau[0]);
  check('3 ký tự cuối đều nằm trong bộ số đã chọn',
    mau.every((m) => [...m.slice(5)].every((c) => SO.includes(c))), mau[0]);
  // KHÔNG đo "ngẫu nhiên tới đâu" — một bài canh không làm được việc đó, và
  // giả vờ làm được là tự lừa mình. Chỉ đo điều đo được: 200 lượt sinh liên
  // tiếp không đụng nhau, tức bộ sinh không kẹt ở một giá trị.
  check('200 lượt sinh liên tiếp không trùng nhau', new Set(mau).size === 200,
    `${new Set(mau).size} khác nhau`);
}

tongKet();
