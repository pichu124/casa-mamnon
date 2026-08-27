// Bài canh CÁCH GỌI TÊN của bậc mầm non.
//
// Chạy bằng:  npm run test:goi-ten
//
// VÌ SAO CÓ BÀI NÀY
//
// `CLAUDE.md` quy định màn hình phải nói tiếng của trường mầm non: *bé / trẻ*
// chứ không phải "học sinh", *nhóm lớp* chứ không phải "lớp học", *cô* chứ không
// phải "giáo viên chủ nhiệm". Mã nguồn kế thừa từ app 1 được phép giữ
// `student`/`class` ở TẦNG DỮ LIỆU — bài này không đụng tới tên biến tiếng Anh.
//
// Đợt N9 đã đổi 250+ chỗ. Không có bài canh thì nó trôi ngược lại ngay ở lần
// thêm màn hình sau: người viết màn hình mới chép mẫu từ màn hình cũ, và không
// ai nhớ ra quy định này lúc 11 giờ đêm.
//
// CÁCH LÀM
//
// Bỏ các dòng chú thích rồi quét phần còn lại — chú thích được phép nhắc tới mô
// hình cũ của app 1 ("một cô một lớp", "quan hệ chủ nhiệm") vì đó là lịch sử có
// thật, cần cho người đọc mã. Chuỗi hiện lên màn hình thì không được phép.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Những chỗ chữ đi thẳng ra màn hình hoặc ra câu báo lỗi cho người dùng.
const VUNG_QUET = [
  'public/js/views',
  'public/index.html',
  // Tên app hiện ở ba chỗ người dùng thấy mà không phải màn hình nào cả: thẻ
  // tiêu đề trình duyệt, tên app khi cài lên màn hình chính, và tên kho đệm.
  'public/manifest.json',
  'public/sw.js',
  'lib/modules.js',
  // Hai tệp DÙNG CHUNG cũng in chữ ra màn hình: `app.js` dựng lời mời cài app
  // và banner bật thông báo. Quét chúng ở đây thì việc SỬA chúng vẫn phải là
  // một commit riêng — bài canh chỉ đọc, không sửa.
  'public/js/app.js',
  'lib/db.js',
  'routes',
  'modules/hocphi',
  'modules/thuchup',
  'data/seed.js',
  // Script cũng nói chuyện với người: người vận hành đọc chúng đúng lúc đang
  // chữa cháy, và một câu nói sai tiếng ở đó thì khó chịu hơn ở màn hình.
  'scripts',
];

// Ranh giới từ tiếng Việt. `\b` của JavaScript chỉ biết chữ ASCII nên "em"
// trong "thêm", "xem", "điểm" sẽ lọt qua nếu dùng nó. Chặn cả chữ số và dấu
// chấm để `0.9em`, `1.2rem` trong CSS không bị bắt nhầm.
const TR = '\\p{L}\\p{N}';
const truoc = (t) => `(?<![${TR}.])${t}`;
const sau = (t) => `${t}(?![${TR}])`;
const rieng = (t) => new RegExp(truoc(sau(t)), 'iu');

const CAM = [
  { tu: 'học sinh', thay: 'bé / trẻ' },
  { tu: 'chủ nhiệm', thay: 'cô phụ trách' },
  { tu: 'GVCN', thay: 'cô phụ trách' },
  { tu: 'lớp học', thay: 'nhóm lớp' },

  // "em" là cách gọi của bậc phổ thông. Trẻ 2–6 tuổi là *bé*, là *con*.
  // Gọi sai một chữ thôi nhưng nó dựng lại đúng cái không khí trường học mà
  // app này cố tình không muốn mang sang.
  { tu: 'em', thay: 'bé / con', re: rieng('em') },

  // Viết tắt của người trong ngành. Phụ huynh không biết "HS", "PH" là gì, và
  // CLAUDE.md quy định không để lộ thuật ngữ kỹ thuật ra màn hình.
  { tu: 'HS', thay: 'bé', re: new RegExp(truoc(sau('HS')), 'u') },
  { tu: 'PH', thay: 'phụ huynh / gia đình', re: new RegExp(truoc(sau('PH')), 'u') },

  // App này tên là CASA Mầm non. Màn đăng nhập tự xưng "SchoolConnect" là tên
  // của app 1 — trường tiểu học — trong khi dữ liệu bên trong đã là Trường Mầm
  // non CASA. Cô mở app ra và thấy hai cái tên không khớp nhau.
  { tu: 'SchoolConnect', thay: 'CASA Mầm non', re: /schoolconnect/i },

  // Gợi ý mẫu trong ô nhập cũng là chữ hiện lên màn hình. Màn "Soạn kế hoạch"
  // còn mời cô "Ôn bảng nhân chia; luyện đọc nhóm đôi" — nguyên văn kế thừa từ
  // app 1. Cô mầm non mở ra đọc câu đó sẽ hiểu app này không làm cho mình.
  {
    tu: 'chữ của bậc tiểu học',
    thay: 'hoạt động của trường mầm non',
    re: /bảng cửu chương|bảng nhân|nhân chia|luyện đọc|chính tả|đoạn văn|ôn tập kiến thức|bài tập về nhà|kiểm tra giữa kỳ|kiểm tra cuối kỳ/i,
  },

  // "lớp" là từ ĐÚNG trong nhiều câu của trường mầm non — "ở lớp", "tới lớp",
  // "vào lớp 1", "đứng lớp". Chỉ SAI khi nó thay chỗ cho ĐƠN VỊ, tức chỗ mà
  // màn hình đang gọi là "nhóm". Nên chặn đúng những cụm đó, không chặn cả từ.
  {
    tu: 'lớp (dùng thay cho "nhóm")',
    thay: 'nhóm',
    // "nhóm lớp" là CÁCH GỌI ĐÚNG, nên mọi nhánh đều chừa nó ra bằng
    // `(?<!nhóm )`. Không chừa thì sửa xong lại báo đỏ chính câu đã sửa đúng.
    re: new RegExp(
      `${truoc('(tên|mã|thấy|xếp|rõ)')}\\s+(?<!nhóm )lớp(?![${TR}])`
      + `|${truoc('(?<!nhóm )lớp')}\\s+(này|cũ|đó|không tồn tại)(?![${TR}])`
      + `|của (?<!nhóm )lớp(?![${TR}])`
      + `|Quản trị\\s*→\\s*Lớp`, 'iu'),
  },
];

// Ngoại lệ phải nêu LÝ DO. Danh sách này cố ý để trống lúc mới viết — thêm vào
// đây là một quyết định, không phải một cách cho qua.
const NGOAI_LE = [
  {
    chua: 'trường tiểu học bên cạnh',
    vi_sao: 'Nhóm Lá đi làm quen lớp 1 ở trường tiểu học thật — đây là danh từ đúng.',
  },
  {
    chua: "'Tên bé', 'Tên học sinh'",
    vi_sao: 'Tên cột NHẬN VÀO khi nhập tệp Excel của trường. Tệp có sẵn của nhà '
      + 'trường rất có thể còn ghi theo mẫu cũ của Phòng; từ chối nó vì cái tên '
      + 'cột là bắt trường gõ lại 300 dòng. Chỗ XUẤT RA đã nói đúng tiếng mầm non.',
  },
  {
    chua: "'Mã của bé', 'Mã bé', 'Mã học sinh'",
    vi_sao: 'Cùng lý do: nhận vào thì rộng, xuất ra thì đúng.',
  },
  {
    tep: 'scripts/prepare-mobile.js',
    vi_sao: 'Vỏ đóng gói Android/Capacitor của app 1. App 2 đã chốt CHỈ làm PWA và '
      + 'cả thư mục này nằm trong món nợ N2 chờ gỡ. Đổi tên trong một thứ sắp bỏ là '
      + 'làm nó trông như đang được dùng — nguy hiểm hơn để nguyên.',
  },
  {
    tu: 'SchoolConnect',
    re: /TEN_DICH_VU|SchoolConnect-SaoLuu/,
    vi_sao: 'Chỗ NHẬN DIỆN lịch sao lưu trên máy chủ. Máy dựng theo quy trình app 1 '
      + 'đặt dịch vụ tên "schoolconnect"; bỏ tên cũ đi là bộ kiểm báo "chưa từng sao '
      + 'lưu" trên một máy đang sao lưu đều đặn. Nhận vào thì rộng, xuất ra thì đúng.',
  },
  {
    tu: 'em',
    re: /senderId: 'p\d+'/,
    vi_sao: 'Lời thoại của phụ huynh trong dữ liệu mẫu. Phụ huynh tự xưng "em" khi '
      + 'nhắn với cô — đó là tiếng Việt đúng và tự nhiên, không phải gọi trẻ là "em". '
      + 'Chặn ở đây là ép dữ liệu mẫu nói thứ tiếng Việt không ai nói.',
  },
  {
    tep: 'scripts/xuat-quy-trinh.js',
    vi_sao: 'Đây là NỘI DUNG của tài liệu triển khai app 1, đã dán cảnh báo "chưa cập '
      + 'nhật cho app 2" ngay trang đầu (N1). Đổi chữ trong đó là làm nó TRÔNG như '
      + 'đã cập nhật trong khi quy trình thì chưa — nguy hiểm hơn là để nguyên. '
      + 'Chính khối cảnh báo cũng phải trích nguyên mấy từ cũ để nói rõ cái gì đã đổi.',
  },
];

function boChuThich(noiDung) {
  return noiDung
    .split('\n')
    .filter((d) => {
      const t = d.trim();
      return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--'));
    })
    .join('\n');
}

function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  return fs.readdirSync(p)
    .filter((f) => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.json'))
    .map((f) => path.join(p, f));
}

// Trả về danh sách vi phạm: { tep, dong, tu, trich }
export function quet(vung = VUNG_QUET) {
  const viPham = [];
  for (const muc of vung) {
    for (const tep of cacTep(muc)) {
      const tuongDoi = path.relative(GOC, tep).split(path.sep).join('/');
      if (NGOAI_LE.some((n) => n.tep === tuongDoi)) continue;
      const dongs = boChuThich(fs.readFileSync(tep, 'utf8')).split('\n');
      dongs.forEach((dong, i) => {
        const thap = dong.toLowerCase();
        for (const { tu, re } of CAM) {
          if (re ? !re.test(dong) : !thap.includes(tu.toLowerCase())) continue;
          if (NGOAI_LE.some((n) => (n.tu ? n.tu === tu : true)
            && (n.chua ? dong.includes(n.chua) : false || (n.re ? n.re.test(dong) : false)))) continue;
          viPham.push({ tep: tuongDoi, dong: i + 1, tu, trich: dong.trim().slice(0, 110) });
        }
      });
    }
  }
  return viPham;
}


// Từ lặp đôi liền nhau — "chưa chưa", "nhóm nhóm". Tiếng Việt có lặp thật
// ("nhà nhà", "người người", "ngày ngày") nên phải chừa đường; nhưng đó là văn
// vẻ, hiếm gặp trong nhãn giao diện, nên danh sách chừa để trống cho tới khi
// thật sự cần.
const LAP_DUOC_PHEP = [];
const RE_LAP = /(?<!\p{L})(\p{L}{2,})[ \t]+\1(?!\p{L})/giu;

export function quetLapDoi(vung = VUNG_QUET) {
  const viPham = [];
  for (const muc of vung) {
    for (const tep of cacTep(muc)) {
      const tuongDoi = path.relative(GOC, tep).split(path.sep).join('/');
      const dongs = boChuThich(fs.readFileSync(tep, 'utf8')).split('\n');
      dongs.forEach((dong, i) => {
        for (const m of dong.matchAll(RE_LAP)) {
          const tu = m[1].toLowerCase();
          // Chỉ soi chữ tiếng Việt CÓ DẤU: tên biến và từ khoá tiếng Anh lặp
          // nhau là chuyện bình thường của mã nguồn (`case case`, `x x`).
          if (!/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(tu)) continue;
          if (LAP_DUOC_PHEP.includes(tu)) continue;
          viPham.push({ tep: tuongDoi, dong: i + 1, tu, trich: dong.trim().slice(0, 110) });
        }
      });
    }
  }
  return viPham;
}

// ===========================================================================
console.log('\n[1] Màn hình và câu báo lỗi nói tiếng của trường mầm non');
{
  const viPham = quet();
  for (const { tu, thay } of CAM) {
    const cua = viPham.filter((v) => v.tu === tu);
    check(`không còn chỗ nào dùng "${tu}" (thay bằng: ${thay})`,
      cua.length === 0,
      cua.slice(0, 6).map((v) => `${v.tep}:${v.dong} ${v.trich}`));
  }
  check('tổng số vi phạm bằng 0', viPham.length === 0, viPham.length);
}

// ===========================================================================
console.log('\n[2] Bộ canh này có thật sự bắt được không');
{
  // Một bài canh luôn xanh là một bài canh vô dụng. Dựng một tệp bẩn rồi soi nó
  // bằng chính hàm quét ở trên — nếu không bắt được thì bài [1] xanh cũng vô nghĩa.
  const tam = path.join(GOC, 'test', '__tam-goi-ten');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = 'Danh sách học sinh';\nconst b = 'Giáo viên chủ nhiệm';\n// chú thích nhắc học sinh thì được bỏ qua\n");
  const bat = quet(['test/__tam-goi-ten']);
  check('bắt được chuỗi "học sinh" trong mã', bat.some((v) => v.tu === 'học sinh'), bat);
  check('bắt được chuỗi "chủ nhiệm" trong mã', bat.some((v) => v.tu === 'chủ nhiệm'), bat);
  check('CHỈ bắt hai chỗ — dòng chú thích được bỏ qua đúng như thiết kế',
    bat.length === 2, bat.map((v) => `${v.dong}:${v.tu}`));

  fs.writeFileSync(path.join(tam, 'ban.js'), "const a = 'Danh sách bé';\n");
  check('sửa đúng rồi thì hết báo', quet(['test/__tam-goi-ten']).length === 0);

  // Bốn từ thêm sau (em / HS / PH / lớp-thay-cho-nhóm) đều dùng biểu thức chính
  // quy có ranh giới từ tiếng Việt, tinh hơn hẳn phép so chuỗi. Càng tinh thì
  // càng phải thử ngược: một biểu thức viết hụt sẽ im lặng cho qua tất cả.
  fs.writeFileSync(path.join(tam, 'ban.js'), [
    "const a = 'Đánh dấu em này đã nghỉ học';",
    "const b = 'Mã HS: 123';",
    "const c = 'PH: Nguyễn Văn A';",
    "const d = 'Vui lòng nhập tên lớp';",
    "const e = 'Không có quyền xem của lớp này';",
    '',
  ].join('\n'));
  const bat2 = quet(['test/__tam-goi-ten']);
  check('bắt được "em" khi gọi bé', bat2.some((v) => v.tu === 'em'), bat2);
  check('bắt được viết tắt "HS"', bat2.some((v) => v.tu === 'HS'), bat2);
  check('bắt được viết tắt "PH"', bat2.some((v) => v.tu === 'PH'), bat2);
  check('bắt được "lớp" dùng thay cho "nhóm"',
    bat2.filter((v) => v.tu.startsWith('lớp (')).length === 2, bat2);

  // Và phải KHÔNG bắt những chỗ tiếng Việt vốn đúng. Bắt nhầm thì bộ canh bị
  // vô hiệu hóa bằng cách thêm ngoại lệ, và lúc đó nó hết tác dụng thật.
  fs.writeFileSync(path.join(tam, 'ban.js'), [
    "const a = 'Nhóm lớp này chưa có cô phụ trách';",   // nhóm lớp = đúng
    "const b = 'Ở lớp cô sẽ để con tự lấy nước uống';",  // ở lớp = đúng
    "const c = 'Bé chuẩn bị vào lớp 1';",                // lớp 1 = đúng
    "const d = 'Giờ đến lớp';",                          // đến lớp = đúng
    "const e = 'Xem thêm điểm danh của bé';",            // thêm / điểm ≠ em
    "const f = 'font-size:0.9em';",                      // đơn vị CSS ≠ em
    "const g = 'PHIẾU LIÊN LẠC';",                       // PH nằm trong từ khác
    '',
  ].join('\n'));
  const sach = quet(['test/__tam-goi-ten']);
  check('KHÔNG bắt nhầm tiếng Việt vốn đúng ("nhóm lớp", "ở lớp", "vào lớp 1", "thêm", "0.9em")',
    sach.length === 0, sach);

  // Ngoại lệ cũng phải được canh: một ngoại lệ viết rộng quá sẽ lặng lẽ mở cửa
  // cho cả tệp, và không ai biết cho tới khi chữ sai đã ra màn hình.
  fs.writeFileSync(path.join(tam, 'ban.js'), [
    "{ id: 'ms1', senderId: 'p1', text: 'Dạ em cảm ơn cô ạ' },",   // lời thoại → được chừa
    "const x = 'Đánh dấu em này đã nghỉ';",                          // nhãn → vẫn phải bắt
    '',
  ].join('\n'));
  const cheLoc = quet(['test/__tam-goi-ten']);
  check('ngoại lệ "lời thoại phụ huynh" chỉ chừa ĐÚNG DÒNG lời thoại, không chừa cả tệp',
    cheLoc.length === 1 && cheLoc[0].dong === 2, cheLoc);

  fs.rmSync(tam, { recursive: true, force: true });
}

// ===========================================================================
console.log('\n[3] Không đụng tới tên biến tiếng Anh của tầng dữ liệu');
{
  // `CLAUDE.md` cho phép giữ `student`/`class` ở tầng dữ liệu. Bài canh chỉ soi
  // chữ tiếng Việt có dấu, nên tên biến tiếng Anh không bao giờ bị bắt nhầm.
  const tam = path.join(GOC, 'test', '__tam-goi-ten2');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "function studentsOf(u){ return db.classIdsOf(u); }\nconst datChuNhiem = 1;\n");
  check('tên biến studentsOf / classIdsOf / datChuNhiem không bị bắt nhầm',
    quet(['test/__tam-goi-ten2']).length === 0, quet(['test/__tam-goi-ten2']));
  fs.rmSync(tam, { recursive: true, force: true });
}


// ===========================================================================
console.log('\n[4] Không có chữ nào bị lặp đôi ("chưa chưa", "nhóm nhóm")');
{
  // VÌ SAO CÓ MỤC NÀY
  //
  // Đợt N9–N11 đổi 250+ chỗ bằng tìm-thay hàng loạt. Một lần thay
  // "chưa phụ trách lớp nào" → "chưa phụ trách nhóm nào" chồng lên một lần thay
  // trước đó đã đẻ ra `'chưa chưa phụ trách nhóm nào'` và nó nằm yên trên màn
  // Quản trị → Giáo viên cho tới khi có người soi từng dòng.
  //
  // Đây đúng là kiểu lỗi mà máy bắt dễ còn mắt người bắt khó: câu vẫn đọc trôi,
  // vẫn đúng ngữ pháp ở mọi chỗ khác, chỉ thừa một từ. Mà đợt đổi chữ hàng loạt
  // thì còn nhiều đợt nữa.
  const viPham = quetLapDoi();
  check('không màn hình nào hiện một từ hai lần liền nhau',
    viPham.length === 0,
    viPham.slice(0, 8).map((v) => `${v.tep}:${v.dong} "${v.tu} ${v.tu}" — ${v.trich}`));

  // Bộ canh phải bắt được thật, không phải luôn xanh.
  const tam = path.join(GOC, 'test', '__tam-lap-doi');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = 'chưa chưa phụ trách nhóm nào';\nconst b = 'Nhóm Chồi 2';\n");
  const bat = quetLapDoi(['test/__tam-lap-doi']);
  check('bắt được "chưa chưa" nếu ai đó lỡ tay lần nữa',
    bat.length === 1 && bat[0].tu === 'chưa', bat);
  fs.rmSync(tam, { recursive: true, force: true });
}

// ===========================================================================
console.log('\n[5] Tuổi của bé nói theo cách của trường mầm non');
{
  // VÌ SAO CÓ MỤC NÀY
  //
  // Màn Hồ sơ bé từng tính tuổi bằng `nămNay − nămSinh`. Với trẻ 2–6 tuổi thì
  // lệch một năm là lệch rất nhiều: bé sinh tháng 12 bị ghi già hơn tuổi thật
  // gần trọn một năm, suốt từ tháng 1 cho tới sinh nhật. Cô nhìn con số đó rồi
  // chờ đợi ở bé những việc bé chưa tới tuổi làm — và ở tuổi này, sáu tháng là
  // một khoảng cách thật sự.
  //
  // Hàm nằm trong tệp chạy ở trình duyệt, không phải mô-đun Node. Nạp bằng cách
  // dựng sẵn hai thứ nó cần (`App`, `UI.parseDate`) rồi chạy tệp — vẫn là chạy
  // đúng đoạn mã thật, không phải chép lại một bản song song.
  const nguon = fs.readFileSync(path.join(GOC, 'public/js/views/student.js'), 'utf8');
  const App = { views: {} };
  const UI = {
    parseDate(x) {
      if (x instanceof Date) return x;
      if (/^\d{4}-\d{2}-\d{2}$/.test(x)) { const [y, m, d] = x.split('-').map(Number); return new Date(y, m - 1, d); }
      return new Date(x);
    },
  };
  // eslint-disable-next-line no-new-func
  new Function('App', 'UI', nguon)(App, UI);
  const tuoi = (dob, moc) => App.views.student.tuoiCuaBe(dob, moc);

  check('tròn năm thì nói tròn năm', tuoi('2021-08-27', '2026-08-27') === '5 tuổi',
    tuoi('2021-08-27', '2026-08-27'));
  check('chưa tới sinh nhật thì KHÔNG cộng thêm một tuổi',
    tuoi('2021-12-20', '2026-08-27') === '4 tuổi 8 tháng', tuoi('2021-12-20', '2026-08-27'));
  check('cách tính cũ (hiệu hai con số năm) sẽ ra 5 — lệch gần trọn một năm',
    2026 - 2021 === 5);
  check('qua sinh nhật một tháng thì nói kèm tháng',
    tuoi('2022-07-15', '2026-08-27') === '4 tuổi 1 tháng', tuoi('2022-07-15', '2026-08-27'));
  check('kém một ngày nữa mới tròn tuổi thì vẫn là tuổi cũ',
    tuoi('2022-08-28', '2026-08-27') === '3 tuổi 11 tháng', tuoi('2022-08-28', '2026-08-27'));

  // Nhà trẻ nhận bé từ 18–24 tháng. Ở tuổi đó cả trường lẫn gia đình đều đếm
  // bằng THÁNG, không ai nói "1 tuổi 8 tháng".
  check('bé chưa tròn một tuổi thì đếm bằng tháng',
    tuoi('2025-02-27', '2026-01-27') === '11 tháng', tuoi('2025-02-27', '2026-01-27'));

  check('chưa có ngày sinh thì không bịa ra tuổi', tuoi(null) === null && tuoi('') === null);
  check('ngày sinh nhập nhầm sang tương lai thì không hiện tuổi âm',
    tuoi('2030-01-01', '2026-08-27') === null, tuoi('2030-01-01', '2026-08-27'));
  check('ngày sinh hỏng thì không nổ, chỉ không hiện',
    tuoi('không phải ngày', '2026-08-27') === null, tuoi('không phải ngày', '2026-08-27'));

  check('màn hình KHÔNG còn tính tuổi bằng hiệu hai con số năm',
    !/getFullYear\(\)\s*-\s*UI\.parseDate/.test(nguon));
}

tongKet();
