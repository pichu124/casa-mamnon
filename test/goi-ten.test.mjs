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
  // QUÉT CẢ THƯ MỤC `modules`, KHÔNG LIỆT KÊ TAY TỪNG PHÂN HỆ.
  //
  // Bản trước ghi tay 'modules/hocphi' và 'modules/thuchup', nên năm phân hệ
  // thêm sau đó (Nhật ký ngày, Báo ăn & tiền ăn, Đón trả bé, Hành trình học
  // tập, và mọi cái sau nữa) lọt hết mà bài canh vẫn xanh — nó không sai, nó
  // chỉ không nhìn tới chỗ mới.
  //
  // Đây đúng là lỗi N19 đã sửa cho `test/quy-tac-4.test.mjs` nhưng quên sửa
  // sang đây. Một danh sách viết tay thì luôn lạc hậu so với thư mục thật, và
  // lạc hậu về phía NỚI RA.
  'modules',
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

  // "em" là cách gọi của bậc phổ thông. Trẻ 12 tháng – 6 tuổi là *bé*, là *con*.
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

  // "Môn học" là đơn vị chương trình của phổ thông. Màn Lịch sinh hoạt là chỗ cô
  // soạn một ngày của nhóm — đón bé, thể dục sáng, ăn, ngủ trưa, trả bé — mà ô
  // nhập của nó vẫn để gợi ý "Tên môn học". Cô mở ra thấy chữ đó là hiểu ngay
  // app này làm cho trường phổ thông.
  //
  // Chừa "chuyên môn", "môn ăn", "món" — trùng âm chứ khác nghĩa. Chừa bằng
  // chính biểu thức, không bằng ngoại lệ: ngoại lệ chừa CẢ DÒNG.
  { tu: 'môn học', thay: 'hoạt động', re: /(?<!chuyên\s)môn\s+học/iu },

  // "Khối" 1–12 là cách xếp của phổ thông. Mầm non đi theo bậc Nhà trẻ → Mầm →
  // Chồi → Lá. Chừa "khối lượng", "khối chữ", "một khối".
  { tu: 'khối (lớp 1–12)', thay: 'bậc mầm non', re: /\bKhối\b(?!\s*(lượng|chữ|dữ liệu|nhà))/u },

  // Phân hệ này tên "Thời khóa biểu" nhưng ruột đã là lịch sinh hoạt một ngày từ
  // lâu — đón bé, thể dục sáng, ăn, ngủ trưa, trả bé. Cô đọc "thời khóa biểu"
  // rồi đi tìm "tiết học", không thấy. Nhà trường đã chốt đổi tên (N12).
  { tu: 'thời khóa biểu', thay: 'lịch sinh hoạt', re: /thời khóa biểu/i },

  // "tiết" là đơn vị giờ học của phổ thông. Mầm non có MỐC SINH HOẠT.
  //
  // Chừa "chi tiết", "tiết kiệm", "tiết mục" — ba từ khác hẳn, chỉ trùng âm.
  // Chừa bằng chính biểu thức thay vì bằng ngoại lệ: ngoại lệ chừa CẢ DÒNG,
  // nên một dòng có "tiết kiệm" sẽ vô tình chừa luôn chữ "tiết" sai nằm cạnh.
  {
    tu: 'tiết (giờ học của phổ thông)',
    thay: 'mốc sinh hoạt',
    re: /(?<!chi )(?<![\p{L}])tiết(?!\s*(kiệm|mục))(?![\p{L}])/iu,
  },

  // Gợi ý mẫu trong ô nhập cũng là chữ hiện lên màn hình. Màn "Soạn kế hoạch"
  // còn mời cô "Ôn bảng nhân chia; luyện đọc nhóm đôi" — nguyên văn kế thừa từ
  // app 1. Cô mầm non mở ra đọc câu đó sẽ hiểu app này không làm cho mình.
  {
    tu: 'chữ của bậc tiểu học',
    thay: 'hoạt động của trường mầm non',
    re: /bảng cửu chương|bảng nhân|nhân chia|luyện đọc|chính tả|đoạn văn|ôn tập kiến thức|bài tập về nhà|kiểm tra giữa kỳ|kiểm tra cuối kỳ/i,
  },

  // "tự học" là việc của học sinh phổ thông. Một bé 18 tháng không tự học, và
  // màn Lịch sinh hoạt từng gọi mốc chưa xếp hoạt động là "Nghỉ / tự học" —
  // vừa sai lứa tuổi, vừa làm gia đình đọc ra là hôm đó nhóm được nghỉ.
  { tu: 'tự học', thay: 'chưa xếp hoạt động', re: /tự\s+học/iu },

  // NHÃN TRẠNG THÁI "Đang học" TRÊN MỘT MỐC SINH HOẠT.
  //
  // Một ngày ở nhóm mầm non có bữa trưa và giấc ngủ trưa — hai mốc dài nhất
  // trong ngày. Nhãn "Đang học" treo lên trên dòng "Ngủ trưa" lúc 12h30 là màn
  // hình nói sai chuyện đang xảy ra với con, ngay trên màn của gia đình.
  //
  // CHỈ chặn khi nó là NHÃN. "Đang học" là chữ ĐÚNG ở chỗ khác — cột Tình trạng
  // của tệp Excel danh sách bé phân biệt "Đang học" với "Đã nghỉ", và nhiều câu
  // có "bé đang học nhóm…". Chặn cả từ là bắt sửa đúng những chỗ đang đúng.
  {
    tu: 'nhãn "Đang học" trên mốc sinh hoạt',
    thay: 'Đang diễn ra',
    re: /UI\.badge\(\s*['"`]Đang học/iu,
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
    tu: 'khối (lớp 1–12)',
    chua: 'Khối cuối cấp',
    vi_sao: 'Ô này ở màn Chuyển năm học và ĐÃ BỊ GIẤU khi mọi nhóm đi theo bậc mầm '
      + 'non (N11). Nó chỉ hiện với nhóm đặt tên theo số kiểu "Lớp 5A" — mà với '
      + 'nhóm như vậy thì "khối" đúng là từ đúng. Giấu đi rồi mà vẫn đổi tên nó là '
      + 'làm hỏng đúng chỗ nó còn dùng được.',
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

// ĐI VÀO CẢ THƯ MỤC CON.
//
// Không có phần này thì 'modules' quét ra rỗng, vì mọi tệp của một phân hệ
// nằm trong thư mục con của nó — đúng cái bẫy đi kèm với việc bỏ danh sách
// viết tay ở trên.
function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const con = path.join(p, f);
    if (fs.statSync(con).isDirectory()) ra.push(...cacTep(path.relative(GOC, con)));
    // KHÔNG quét .sql. Bộ lọc bỏ chú thích của bài này hiểu `//` và `/* */` của
    // JavaScript, không hiểu `--` của SQL — nên mọi chú thích trong schema.sql
    // sẽ bị đọc như chữ hiện ra màn hình. Mà lược đồ thì không in gì cho ai
    // đọc cả: CLAUDE.md cho phép giữ `student`/`class` ở TẦNG DỮ LIỆU, đây
    // đúng là tầng đó.
    else if (/\.(js|html|json)$/.test(f)) ra.push(con);
  }
  return ra;
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
    "const f = 'Lưu thời khóa biểu';",
    "const g = 'Thứ 2 — môn học từng tiết';",
    '',
  ].join('\n'));
  const bat2 = quet(['test/__tam-goi-ten']);
  check('bắt được "em" khi gọi bé', bat2.some((v) => v.tu === 'em'), bat2);
  check('bắt được viết tắt "HS"', bat2.some((v) => v.tu === 'HS'), bat2);
  check('bắt được viết tắt "PH"', bat2.some((v) => v.tu === 'PH'), bat2);
  check('bắt được "lớp" dùng thay cho "nhóm"',
    bat2.filter((v) => v.tu.startsWith('lớp (')).length === 2, bat2);
  check('bắt được "thời khóa biểu"', bat2.some((v) => v.tu === 'thời khóa biểu'), bat2);
  check('bắt được "tiết" kiểu giờ học phổ thông',
    bat2.some((v) => v.tu.startsWith('tiết (')), bat2);

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
    "const h = 'Ảnh tự thu nhỏ để tiết kiệm dung lượng';",  // tiết kiệm ≠ tiết học
    "const i = 'Tiết mục trống hội';",                       // tiết mục ≠ tiết học
    "const j = 'Xem chi tiết thông báo';",                   // chi tiết ≠ tiết học
    '',
  ].join('\n'));
  const sach = quet(['test/__tam-goi-ten']);
  check('KHÔNG bắt nhầm tiếng Việt vốn đúng ("nhóm lớp", "ở lớp", "vào lớp 1", "thêm", "0.9em", "chi tiết", "tiết kiệm", "tiết mục")',
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
  // Màn Hồ sơ bé từng tính tuổi bằng `nămNay − nămSinh`. Với trẻ 12 tháng – 6 tuổi thì
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

// ===========================================================================
console.log('\n[9] Vùng quét không được thu hẹp lặng lẽ');
{
  // Bài học N19: một danh sách viết tay thì luôn lạc hậu so với thư mục thật,
  // và lạc hậu về phía NỚI RA. Bản trước của chính bài này ghi tay hai phân hệ,
  // nên năm phân hệ thêm sau đó lọt hết mà bài canh vẫn xanh.
  check('quét CẢ thư mục modules, không liệt kê tay từng phân hệ',
    VUNG_QUET.includes('modules') && !VUNG_QUET.some(v => v.startsWith('modules/')), VUNG_QUET);

  // Mảng đúng mà hàm đi tìm tệp không đệ quy thì vẫn quét ra rỗng — đó chính
  // là lỗi đã có ở quy-tac-4.
  const dsTep = [];
  for (const m of ['modules']) dsTep.push(...cacTep(m));
  const tuongDoi = dsTep.map(t => path.relative(GOC, t).split(path.sep).join('/'));
  for (const phanHe of fs.readdirSync(path.join(GOC, 'modules'))
    .filter(f => fs.statSync(path.join(GOC, 'modules', f)).isDirectory())) {
    check(`thật sự đọc tới tệp của phân hệ "${phanHe}"`,
      tuongDoi.some(t => t.startsWith(`modules/${phanHe}/`)), tuongDoi.slice(0, 5));
  }
}

// ===========================================================================
console.log('\n[10] Tệp cấu hình triển khai — chỗ bộ quét ở trên KHÔNG với tới');
{
  // `cacTep` chỉ nhận .js, .html, .json, nên render.yaml và Dockerfile nằm
  // ngoài tầm với của mọi mục phía trên. Đó đúng là chỗ tên của app 1 sống dai
  // nhất: tên dịch vụ, tên ổ đĩa, dòng đầu Dockerfile — ba chỗ không ai mở ra
  // đọc cho tới lúc triển khai.
  //
  // Ở đây so chữ thẳng, không lọc chú thích: mấy tệp này không có chú thích
  // nào cần nhắc tên app 1 cả.
  for (const t of ['render.yaml', 'Dockerfile', '.dockerignore']) {
    const p = path.join(GOC, t);
    if (!fs.existsSync(p)) { check(`${t} tồn tại`, false, 'không tìm thấy'); continue; }
    const noiDung = fs.readFileSync(p, 'utf8');
    check(`${t} không còn mang tên app 1`, !/schoolconnect/i.test(noiDung),
      (noiDung.split('\n').find(d => /schoolconnect/i.test(d)) || '').trim());
  }

  // HAI CON SỐ TRONG render.yaml ĐÁNG CANH RIÊNG, VÌ SAI THÌ KHÔNG AI THẤY.
  const rd = fs.readFileSync(path.join(GOC, 'render.yaml'), 'utf8');

  // (1) Ổ đĩa. 1 GB là con số kế thừa từ app 1 — trường tiểu học gần như không
  //     có ảnh. Ở đây một tuần chụp là đầy, và đầy ổ nghĩa là cô đăng ảnh lên
  //     thì hỏng, giữa buổi, không ai hiểu vì sao.
  const co = /sizeGB:\s*(\d+)/.exec(rd);
  check('render.yaml khai ổ đĩa lớn hơn con số kế thừa từ app 1',
    !!co && Number(co[1]) >= 10, co && co[1]);

  // (2) Máy đặt ngoài Việt Nam. Render không có vùng nào trong nước, nên chừng
  //     nào tệp này còn `region: singapore` thì nó PHẢI mang cảnh báo — dữ liệu
  //     ở đây là ảnh khuôn mặt và hồ sơ sức khoẻ của trẻ dưới 6 tuổi, thuộc
  //     nhóm nhạy cảm của NĐ 13/2023 và Luật 91/2025. Bỏ cảnh báo đi là để
  //     người triển khai sau tưởng tệp này dùng thật được.
  if (/region:\s*singapore/.test(rd)) {
    check('render.yaml nói rõ máy đặt NGOÀI Việt Nam', /NGOÀI/i.test(rd));
    check('và nói rõ chỉ dùng để chạy thử, không dùng cho dữ liệu trẻ thật',
      /CHỈ ĐỂ CHẠY THỬ/i.test(rd) && /13\/2023/.test(rd));
  }

  // Alpine + better-sqlite3 = phải biên dịch lại từ mã C++, mà ảnh alpine của
  // Node không có sẵn python3/make/g++. Lệnh build gãy ngay bước cài.
  const df = fs.readFileSync(path.join(GOC, 'Dockerfile'), 'utf8');
  check('Dockerfile KHÔNG dựng trên alpine (better-sqlite3 không có bản dựng sẵn cho musl)',
    !/^FROM\s+\S*alpine/mi.test(df),
    (df.split('\n').find(d => /^FROM/i.test(d)) || '').trim());
}

tongKet();
