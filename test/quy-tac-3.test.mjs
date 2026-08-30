// Bộ canh QUY TẮC 3 — AI GỢI Ý ≠ CÔ QUYẾT ĐỊNH.
//
// Chạy bằng:  npm run test:quy-tac-3
//
// QUY TẮC 3 nói nguyên văn trong `CLAUDE.md`:
//
//   "Mọi thứ AI sinh ra đều là nháp chờ cô duyệt. AI không bao giờ tự đánh giá
//    một đứa trẻ, không bao giờ ghi thẳng vào hồ sơ."
//
// VÌ SAO CÓ BÀI NÀY, TRONG KHI KHO MÃ CHƯA CÓ MỘT DÒNG AI NÀO
//
// `CLAUDE.md` viết rằng năm QUY TẮC được canh bằng máy. Đối chiếu lại thì chỉ
// QUY TẮC 2 và QUY TẮC 4 có bộ canh riêng; QUY TẮC 3 không có gì — tức chính
// tệp quy định đang hứa một điều không đúng, đúng thứ `test:khong-hua-suong`
// sinh ra để chặn ở phía app.
//
// Và đây là quy tắc dễ vi phạm nhất theo cách khó thấy nhất. Ngày ai đó nối
// một dịch vụ AI vào để "gợi ý nhận xét cho cô", đường ngắn nhất luôn là ghi
// thẳng kết quả vào bảng rồi để giao diện hiện ra. Không ai cố ý làm sai; chỉ
// là đường đó ngắn hơn. Bộ canh phải có mặt TRƯỚC ngày đó.
//
// BÀI NÀY CANH ĐƯỢC GÌ KHI CHƯA CÓ AI
//
// Ba thứ, và cả ba đều là thứ máy trả lời được:
//
//   1. Chưa có đường AI nào lọt vào kho mã một cách lặng lẽ.
//   2. Bốn điều kiện bật AI của bản kế hoạch còn nguyên chữ.
//   3. Bảng đồng ý CHƯA có ô riêng cho AI — nên không ai được coi ô ② hay ③
//      là đã đủ.
//
// Ngày thật sự dựng AI, bài này báo đỏ và người dựng buộc phải đọc lại QUY TẮC
// 3 rồi mở rộng bộ canh cho đúng luồng mình vừa làm. Đó là ý đồ, không phải
// phiền toái: bài đỏ ở đây rẻ hơn nhiều so với một nhận định do máy sinh ra
// nằm trong hồ sơ một đứa trẻ mà không cô nào duyệt.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const doc = (p) => { try { return fs.readFileSync(path.join(GOC, p), 'utf8'); } catch (_) { return ''; } };

// Thư mục mã CHẠY THẬT. Cố ý không quét `test/` và `docs/` — chính bài này và
// bản kế hoạch phải được phép nhắc tới chữ "AI".
const VUNG_QUET = ['lib', 'routes', 'modules', 'public/js', 'scripts', 'server.js', 'data/seed.js'];

function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const d = path.join(p, f);
    if (fs.statSync(d).isDirectory()) ra.push(...cacTep(path.relative(GOC, d)));
    else if (/\.(js|mjs|sql|json)$/.test(f)) ra.push(d);
  }
  return ra;
}

// Bỏ chú thích trước khi quét: một dòng giải thích "app này KHÔNG gọi AI" mà
// làm bài đỏ thì bộ canh dạy người ta đừng viết chú thích.
function boChuThich(ma) {
  return ma
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter(d => !/^\s*(\/\/|--)/.test(d))
    .join('\n');
}

// Dấu vết của một đường gọi AI thật. CỐ Ý hẹp và cụ thể — bắt tên nhà cung cấp
// và tên gói, không bắt hai chữ "AI" trong một câu tiếng Việt.
const DAU_VET_AI = [
  [/\bopenai\b/i, 'OpenAI'],
  [/\banthropic\b/i, 'Anthropic'],
  [/api\.openai\.com|generativelanguage\.googleapis|api\.anthropic\.com/i, 'địa chỉ dịch vụ AI'],
  [/\bhuggingface\b|\breplicate\.com\b|\bcohere\b/i, 'nhà cung cấp mô hình'],
  [/\bgpt-[0-9]|\bclaude-[0-9]|\bgemini-[0-9]/i, 'tên mô hình'],
  [/\bmodel\s*:\s*['"][\w.-]*(gpt|claude|gemini|llama)/i, 'khai tên mô hình'],
];

// ===========================================================================
console.log('\n[1] Quy tắc phải còn nguyên chữ trong CLAUDE.md');
{
  const cm = doc('CLAUDE.md');
  check('đọc được CLAUDE.md', cm.length > 1000, cm.length);
  check('QUY TẮC 3 còn nguyên: AI gợi ý ≠ cô quyết định',
    /AI gợi ý ≠ cô quyết định/.test(cm));
  check('và còn nguyên vế "nháp chờ cô duyệt"',
    /nháp chờ cô duyệt/i.test(cm));
  check('và vế "không bao giờ ghi thẳng vào hồ sơ"',
    /không bao giờ ghi thẳng vào hồ sơ/i.test(cm));
}

// ===========================================================================
console.log('\n[2] CHƯA CÓ ĐƯỜNG AI NÀO LỌT VÀO KHO MÃ MỘT CÁCH LẶNG LẼ');
let soTepQuet = 0;
{
  const thay = [];
  for (const muc of VUNG_QUET) {
    for (const tep of cacTep(muc)) {
      soTepQuet += 1;
      const ma = boChuThich(fs.readFileSync(tep, 'utf8'));
      for (const [re, ten] of DAU_VET_AI) {
        if (re.test(ma)) thay.push(`${path.relative(GOC, tep)} — ${ten}`);
      }
    }
  }
  check('có thật tệp để quét, không phải bài chạy trong khoảng không',
    soTepQuet > 40, soTepQuet);

  check('KHÔNG CÓ ĐƯỜNG GỌI AI NÀO TRONG MÃ CHẠY THẬT',
    thay.length === 0,
    thay.length
      ? `${thay.join('\n  ')}\n\n  Nếu đây là bước dựng AI thật thì ĐỌC LẠI QUY TẮC 3 trước:\n`
        + '  mọi thứ AI sinh ra là NHÁP CHỜ CÔ DUYỆT, không bao giờ ghi thẳng vào\n'
        + '  hồ sơ. Và bốn điều kiện ở docs/KE-HOACH.md phải đủ cả bốn trước khi bật.\n'
        + '  Sau đó mở rộng chính bài này để canh đúng luồng vừa dựng.'
      : `${soTepQuet} tệp, sạch`);

  // Gói cài đặt cũng vậy — một dòng trong package.json là đủ để mở đường.
  const pkg = JSON.parse(doc('package.json') || '{}');
  const goi = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  const goiAi = goi.filter(g => DAU_VET_AI.some(([re]) => re.test(g)));
  check('và KHÔNG gói AI nào trong danh sách phụ thuộc', goiAi.length === 0, goiAi);
  check('đọc được danh sách gói để soi', goi.length > 0, goi.length);
}

// ===========================================================================
console.log('\n[3] BỐN ĐIỀU KIỆN BẬT AI CỦA BẢN KẾ HOẠCH CÒN NGUYÊN');
{
  // Bốn điều kiện này là thứ biến QUY TẮC 3 thành việc làm được. Xoá bớt một
  // điều rồi bật AI là đúng cách vi phạm mà không ai thấy.
  const kh = doc('docs/KE-HOACH.md');
  check('đọc được bản kế hoạch', kh.length > 1000, kh.length);
  check('① có ô đồng ý RIÊNG cho xử lý bằng AI, và từ chối ở TẦNG DỊCH VỤ',
    /ô đồng ý riêng cho xử lý bằng AI/i.test(kh) && /tầng dịch vụ/i.test(kh));
  check('② thay tên bé bằng mã trước khi gửi ra ngoài',
    /thay\s*\n?\s*tên bé bằng mã/i.test(kh.replace(/\n/g, ' ')));
  check('③ nhà cung cấp cam kết không lưu, không huấn luyện',
    /không lưu và không dùng dữ liệu để huấn luyện/i.test(kh.replace(/\n\s*/g, ' ')));
  check('④ luồng AI ghi vào hồ sơ đánh giá tác động',
    /luồng AI được ghi vào hồ\s*sơ đánh giá tác động/i.test(kh.replace(/\n\s*/g, ' ')));
  check('và câu chốt "Thiếu một trong bốn — không bật"',
    /Thiếu một trong bốn — không bật/.test(kh));
}

// ===========================================================================
console.log('\n[4] BẢNG ĐỒNG Ý CHƯA CÓ Ô CHO AI — nên không ai được coi ô khác là đủ');
{
  // Điều kiện ① đòi một ô đồng ý RIÊNG. Bảng hiện có ba ô: hồ sơ học tập, chia
  // sẻ cho gia đình khác, truyền thông. Không ô nào là "xử lý bằng AI".
  //
  // Phép kiểm này KHÔNG đòi thêm cột ngay — AI thuộc GĐ 3, chưa tới lúc. Nó
  // canh đúng một điều: chừng nào cột đó chưa có thì cũng chưa được có đường
  // AI nào. Hai mục [2] và [4] đi cùng nhau mới thành một câu trọn vẹn.
  const sql = doc('lib/schema.sql');
  const bang = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS student_consent'));
  const than = bang.slice(0, bang.indexOf(');') + 2);
  check('tìm thấy bảng đồng ý trong lược đồ', /studentId/.test(than), than.slice(0, 80));

  const coCotAi = /\bai\w*\s+(INTEGER|TEXT)/i.test(than) || /xuLyBangAi|dongYAi|aiConsent/i.test(than);
  check('bảng đồng ý CHƯA có ô riêng cho AI — đúng như hôm nay', !coCotAi, than);

  // Ba ô đang có phải còn nguyên: người sau dễ tưởng ô ② hay ③ đã bao gồm AI.
  for (const [ma, ten] of [['hoSoHocTap', '① hồ sơ học tập'], ['chiaSeGiaDinh', '② chia sẻ cho gia đình khác'], ['truyenThong', '③ truyền thông']]) {
    check(`ô ${ten} còn nguyên`, new RegExp(`\\b${ma}\\b`).test(than));
  }

  // Và tài liệu phải nói rõ ba ô đó KHÔNG bao gồm AI, nếu không thì lần sau
  // vẫn có người hiểu nhầm.
  const kh = doc('docs/KE-HOACH.md');
  check('bản kế hoạch nói rõ AI cần ô đồng ý RIÊNG, không dùng ké ô nào',
    /ô đồng ý riêng cho xử lý bằng AI/i.test(kh));
}

// ===========================================================================
console.log('\n[5] PHÉP THỬ NGƯỢC — bộ canh này có bắt được thật không');
{
  const thu = (ma) => DAU_VET_AI.filter(([re]) => re.test(boChuThich(ma))).map(([, t]) => t);

  check('BẮT ĐƯỢC một dòng gọi OpenAI',
    thu("const openai = require('openai');").length > 0);
  check('BẮT ĐƯỢC một địa chỉ dịch vụ AI',
    thu("fetch('https://api.anthropic.com/v1/messages')").length > 0);
  check('BẮT ĐƯỢC một khai tên mô hình',
    thu("const body = { model: 'gpt-4o-mini', messages: [] };").length > 0);

  check('KHÔNG bắt nhầm chú thích nói app này không gọi AI',
    thu('// app này KHÔNG gọi openai hay dịch vụ nào tương tự').length === 0);
  check('KHÔNG bắt nhầm chữ "ai" trong câu tiếng Việt',
    thu("const loi = 'Không có quyền — hỏi ai phụ trách nhóm này';").length === 0);
  check('KHÔNG bắt nhầm tên biến tiếng Việt có chữ ai',
    thu('const nguoiDonLaAi = tenNguoi(id);').length === 0);
}

tongKet();
