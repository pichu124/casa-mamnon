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
  'lib/modules.js',
  'routes',
  'modules/hocphi',
  'modules/thuchup',
  'data/seed.js',
  // Script cũng nói chuyện với người: người vận hành đọc chúng đúng lúc đang
  // chữa cháy, và một câu nói sai tiếng ở đó thì khó chịu hơn ở màn hình.
  'scripts',
];

const CAM = [
  { tu: 'học sinh', thay: 'bé / trẻ' },
  { tu: 'chủ nhiệm', thay: 'cô phụ trách' },
  { tu: 'GVCN', thay: 'cô phụ trách' },
  { tu: 'lớp học', thay: 'nhóm lớp' },
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
    .filter((f) => f.endsWith('.js') || f.endsWith('.html'))
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
        for (const { tu } of CAM) {
          if (!thap.includes(tu.toLowerCase())) continue;
          if (NGOAI_LE.some((n) => dong.includes(n.chua))) continue;
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

tongKet();
