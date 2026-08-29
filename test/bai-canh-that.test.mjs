// Bài canh cho CHÍNH BỘ KIỂM THỬ: bài canh phải canh thật.
//
// Chạy bằng:  npm run test:bai-canh-that
//
// VÌ SAO CÓ BÀI NÀY
//
// `CLAUDE.md` dặn phải nêu ra khi thấy *"bài kiểm thử luôn đúng hoặc bao phủ
// thiếu đúng chỗ nguy hiểm"*. Đợt này tìm được BA loại, và cả ba đều đã xảy ra
// thật trong kho mã:
//
//   1. **Nhánh `else` tự cho mình qua.** `test/lo-hong-da-va.test.mjs` có
//      `check('phụ huynh KHÔNG mở được hồ sơ con nhà khác', true, 'chỉ có một
//      em đã ra trường')` — dựng không được tình huống thì báo xanh.
//   2. **`if` không có `else`.** `test/co-so-quan-tri.test.mjs` bọc ba phép
//      kiểm về ranh giới ba cơ sở trong một `if`; dựng không được tình huống
//      thì ba phép kiểm IM LẶNG BIẾN MẤT khỏi tổng số.
//   3. **Tệp test không ai chạy.** Viết xong một tệp `.test.mjs` mà quên thêm
//      vào `package.json` thì nó xanh vĩnh viễn vì không bao giờ chạy.
//
// Loại 1 và 3 kiểm được bằng máy, và bài này kiểm. Loại 2 thì không — một `if`
// không `else` trông y hệt một `if` hợp lệ với máy — nên nó phải dựa vào người
// đọc mã, và vào việc mỗi phép kiểm mới đều tự hỏi *"nếu tình huống không dựng
// được thì sao"*.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const THU_MUC = path.join(GOC, 'test');
const tepTest = fs.readdirSync(THU_MUC).filter(t => t.endsWith('.test.mjs')).sort();

// ===========================================================================
console.log('\n[1] MỌI TỆP TEST ĐỀU CÓ NGƯỜI CHẠY');
{
  // Một tệp test không nằm trong `npm test` cũng không nằm trong
  // `test:giao-dien` là một tệp KHÔNG BAO GIỜ CHẠY. Nó xanh vĩnh viễn, và tệ
  // hơn: người viết tin rằng chỗ đó đã có bài canh.
  const pkg = JSON.parse(fs.readFileSync(path.join(GOC, 'package.json'), 'utf8'));
  const chay = `${pkg.scripts.test || ''} ${pkg.scripts['test:giao-dien'] || ''}`;

  check('đọc được hai bộ chạy trong package.json',
    chay.includes('node test/') && chay.length > 200, chay.length);
  check('tìm thấy đủ tệp test để soi', tepTest.length >= 40, tepTest.length);

  const khongChay = tepTest.filter(t => !chay.includes(`test/${t}`));
  check('KHÔNG TỆP TEST NÀO NẰM NGOÀI CẢ HAI BỘ CHẠY',
    khongChay.length === 0,
    khongChay.length
      ? `${khongChay.join(', ')}\n\n  Thêm vào script "test" (hoặc "test:giao-dien") trong package.json.\n`
        + '  Tệp không ai chạy là tệp xanh vĩnh viễn.'
      : undefined);
}

// ===========================================================================
console.log('\n[2] KHÔNG PHÉP KIỂM NÀO TỰ CHO MÌNH QUA MÀ KHÔNG CÓ LÝ DO');
{
  // `check('...', true, ...)` là một phép kiểm không kiểm gì cả. Đôi khi nó
  // đúng — "không có tệp cơ sở dữ liệu" THẬT SỰ là bằng chứng cho "không tạo
  // tài khoản mẫu nào". Nhưng mỗi lần dùng phải là một quyết định, không phải
  // một cách cho qua.
  //
  // SỔ NÀY CHỈ ĐƯỢC NGẮN ĐI, không bao giờ dài ra — cùng luật bánh cóc với
  // món nợ N3 của `test:quy-tac-4`.
  const DUOC_PHEP = {
    'lo-hong-da-va.test.mjs': 1,
    'khong-hua-suong.test.mjs': 2,
    'bai-canh-that.test.mjs': 0,
  };

  const dem = {};
  for (const t of tepTest) {
    const ma = fs.readFileSync(path.join(THU_MUC, t), 'utf8');
    // Bỏ dòng chú thích trước khi đếm — chính tệp này nhắc tới mẫu đó để giải
    // thích nó, và một bộ canh bắt nhầm lời giải thích của chính nó là vô dụng.
    const n = ma.split('\n')
      .filter(d => !/^\s*(\/\/|\*|\/\*)/.test(d))
      .filter(d => /check\([^)]*,\s*true\s*,/.test(d)).length;
    if (n) dem[t] = n;
  }

  const moi = Object.entries(dem).filter(([t]) => !(t in DUOC_PHEP));
  check('KHÔNG TỆP NÀO MỚI SINH RA PHÉP KIỂM TỰ CHO MÌNH QUA',
    moi.length === 0,
    moi.map(([t, n]) => `${t}: ${n} chỗ`));

  const phinh = Object.entries(dem).filter(([t, n]) => t in DUOC_PHEP && n > DUOC_PHEP[t]);
  check('SỐ CHỖ ĐƯỢC PHÉP CHỈ ĐƯỢC GIẢM, KHÔNG ĐƯỢC PHÌNH RA',
    phinh.length === 0,
    phinh.map(([t, n]) => `${t}: ${n} > ${DUOC_PHEP[t]}`));

  // Sổ không được phép có mục ruỗng: một tệp đã hết chỗ nào thì phải hạ số
  // xuống, nếu không lần sau ai đó thêm lại vào đúng tệp ấy sẽ lọt.
  const ruong = Object.entries(DUOC_PHEP)
    .filter(([t, n]) => n > 0 && (dem[t] || 0) < n);
  check('sổ cho phép không có mục ruỗng — hết chỗ nào thì hạ số xuống',
    ruong.length === 0,
    ruong.map(([t, n]) => `${t}: sổ ghi ${n}, thực tế ${dem[t] || 0}`));
}

// ===========================================================================
console.log('\n[3] PHÉP THỬ NGƯỢC — bộ canh này có bắt được thật không');
{
  // Chạy chính hai phép đếm trên với dữ liệu bịa, không đụng kho mã thật.
  const demTrong = (ma) => ma.split('\n')
    .filter(d => !/^\s*(\/\/|\*|\/\*)/.test(d))
    .filter(d => /check\([^)]*,\s*true\s*,/.test(d)).length;

  // GHÉP TÊN HÀM TỪ MỘT BIẾN, KHÔNG VIẾT THẲNG.
  //
  // Viết thẳng `check(..., true, ...)` trong chuỗi mẫu thì chính mục [2] bên
  // trên đếm những dòng này là vi phạm — và tệp canh sẽ phải tự xin ngoại lệ
  // cho mình. Tự xin ngoại lệ là đúng thứ nó đang cấm.
  const K = 'check';
  check('BẮT ĐƯỢC phép kiểm tự cho mình qua',
    demTrong(`  ${K}('gì đó', true, 'không dựng được tình huống');`) === 1);
  check('bắt được cả khi có khoảng trắng thừa',
    demTrong(`  ${K}('gì đó',   true  , 'lý do');`) === 1);
  check('KHÔNG bắt nhầm phép kiểm so sánh với true',
    demTrong(`  ${K}('gì đó', x === true, y);`) === 0);
  check('KHÔNG bắt nhầm phép kiểm bình thường',
    demTrong(`  ${K}('gì đó', a.length > 0, a);`) === 0);
  check('KHÔNG bắt nhầm dòng chú thích nhắc tới mẫu đó',
    demTrong(`  // đừng viết ${K}('gì đó', true, '...') ở đây`) === 0);

  const chayGia = 'node test/a.test.mjs && node test/b.test.mjs';
  const thieu = ['a.test.mjs', 'b.test.mjs', 'c.test.mjs']
    .filter(t => !chayGia.includes(`test/${t}`));
  check('BẮT ĐƯỢC tệp test không ai chạy', thieu.length === 1 && thieu[0] === 'c.test.mjs', thieu);
}

tongKet();
