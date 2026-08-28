// Bài canh QUY TẮC 4 — không phần trăm, không điểm số, không xếp hạng TRẺ.
//
// Chạy bằng:  npm run test:quy-tac-4
//
// VÌ SAO CÓ BÀI NÀY
//
// `CLAUDE.md` xếp QUY TẮC 4 ngang hàng với Nguyên tắc số 1, và nói thẳng rằng nó
// phải được "canh bằng máy, không bằng trí nhớ". Chưa có bài này thì nó mới chỉ
// là một lời hứa: G0.5 đã dọn sạch dữ liệu mẫu (không một điểm số nào,
// `points: 0` ở mọi bản ghi nề nếp), nhưng không có gì giữ cho nó ở nguyên như
// thế qua lần sửa sau.
//
// CÁCH LÀM: BÁNH CÓC, KHÔNG PHẢI CÔNG TẮC
//
// App vẫn còn hai màn hình tiểu học chưa gỡ (N3 trong docs/TIEN-DO.md): Nề nếp
// có bảng xếp hạng trẻ, và Học bạ có ô nhập điểm thang 10. Bài này KHÔNG bắt
// chúng biến mất ngay — làm vậy thì hoặc phải gỡ tính năng khi chưa được duyệt,
// hoặc phải viết một bài test luôn đỏ, và cả hai đều sai.
//
// Thay vào đó nó ghi lại CHÍNH XÁC món nợ đang có và bắt con số ấy chỉ được
// GIẢM. Thêm một chỗ vi phạm mới ở bất cứ đâu → đỏ ngay. Gỡ xong N3 → hạ số
// trong `NO_DA_BIET` xuống, bài test tự siết chặt thêm.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Quét CẢ THƯ MỤC `modules`, không liệt kê từng phân hệ một.
//
// Bản đầu ghi tay 'modules/hocphi' và 'modules/thuchup'. Nghĩa là mọi phân hệ
// THÊM SAU đó đều lọt khỏi bộ canh này mà không ai được báo gì — bộ canh vẫn
// xanh, chỉ là nó không nhìn vào chỗ mới. Phát hiện khi thêm phân hệ Nhật ký
// ngày: nó không nằm trong danh sách nên không được quét một dòng nào.
//
// Đây đúng là kiểu "bài kiểm thử bao phủ thiếu đúng chỗ nguy hiểm" mà
// CLAUDE.md dặn phải nêu: một danh sách viết tay thì luôn lạc hậu so với thư
// mục thật, và lạc hậu về phía NỚI RA.
const VUNG_QUET = [
  'public/js/views', 'routes', 'modules',
  'lib/modules.js', 'data/seed.js',
];

// Mỗi dấu hiệu là một CÁCH xếp trẻ trên dưới nhau.
// Mọi mẫu đều có cờ `i`.
//
// Bản trước không có, nên "ĐIỂM SỐ" ở một tiêu đề viết hoa, "Thi đua" đầu câu,
// hay "XẾP HẠNG" trong một nhãn nút đều lọt sạch — bộ canh xanh trong khi chữ
// vi phạm nằm ngay trên màn hình. Thêm cờ `i` không làm đỏ chỗ nào đang có,
// nghĩa là nó chỉ bịt lỗ chứ không đổi luật.
const DAU_HIEU = [
  { ten: 'xếp hạng trẻ', re: /xếp hạng|\branking\b|xep_hang|xepHang/i },
  { ten: 'điểm thi đua', re: /thi đua|thi_dua|thiDua/i },
  { ten: 'điểm số của trẻ', re: /điểm thang 10|bảng điểm|điểm số|diem_so|diemSo/i },
  // "78%" hiện ra màn hình. Chỉ bắt dạng `${...}%` — đó là phần trăm ĐƯỢC TÍNH
  // rồi in ra, khác hẳn `width:100%` của bố cục.
  { ten: 'phần trăm hiện ra màn hình', re: /\}%/ },
];

// Được phép, kèm lý do. Không phải mọi phần trăm đều là xếp hạng trẻ.
const NGOAI_LE = [
  {
    tep: 'public/js/views/surveys.js',
    vi_sao: 'Phần trăm ở đây là tỉ lệ PHỤ HUYNH chọn mỗi phương án trong khảo sát — '
      + 'không phải con số về một đứa trẻ. QUY TẮC 4 cấm xếp hạng TRẺ, không cấm '
      + 'đếm phiếu của người lớn.',
  },
  {
    tep: 'data/seed.js',
    vi_sao: 'Chú thích trong dữ liệu mẫu giải thích vì sao mọi bản ghi nề nếp đều '
      + 'points: 0. Nhắc tới "xếp hạng" để nói rằng đang cố ý KHÔNG xếp hạng.',
  },
];

// MÓN NỢ ĐÃ BIẾT — chỉ được GIẢM, không được tăng.
//
// Hai màn hình dưới đây là phần tiểu học của app 1, sẽ gỡ ở N3 theo đúng quy
// trình "bỏ tính năng" của CLAUDE.md. Con số là số DÒNG có dấu hiệu vi phạm.
const NO_DA_BIET = {
  'public/js/views/conduct.js': { so: 5, vi_sao: 'Nề nếp: bảng xếp hạng trẻ theo điểm thi đua. Gỡ ở N3.' },
  'routes/conduct.js': { so: 7, vi_sao: 'Nề nếp: máy chủ tính tổng điểm rồi sắp xếp trẻ. Gỡ ở N3.' },
  'public/js/views/reports.js': { so: 1, vi_sao: 'Học bạ: ô nhập điểm thang 10 cho từng môn. Gỡ ở N3.' },
  'routes/reports.js': { so: 4, vi_sao: 'Học bạ: máy chủ kiểm điểm 0–10. Gỡ ở N3.' },
};

// Đi vào cả thư mục con. Không có phần này thì 'modules' quét ra rỗng, vì mọi
// tệp của phân hệ nằm trong thư mục con của nó.
function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const con = path.join(p, f);
    if (fs.statSync(con).isDirectory()) ra.push(...cacTep(path.relative(GOC, con)));
    // Quét cả `.sql` và `.json`, không chỉ `.js`.
    //
    // Một cột tên `diem_so` trong schema.sql, hay một nhãn "Bảng xếp hạng"
    // trong module.json, là vi phạm y hệt — nhưng bản trước chỉ đọc `.js` nên
    // hai chỗ đó là cửa sau bỏ ngỏ.
    else if (/\.(js|sql|json)$/.test(f)) ra.push(con);
  }
  return ra;
}

export function quet(vung = VUNG_QUET) {
  const theoTep = {};
  for (const muc of vung) {
    for (const tep of cacTep(muc)) {
      const tuongDoi = path.relative(GOC, tep).split(path.sep).join('/');
      if (NGOAI_LE.some((n) => n.tep === tuongDoi)) continue;
      const dongs = fs.readFileSync(tep, 'utf8').split('\n');
      dongs.forEach((dong, i) => {
        const hit = DAU_HIEU.filter((d) => d.re.test(dong));
        if (!hit.length) return;
        (theoTep[tuongDoi] ||= []).push({ dong: i + 1, dau: hit.map((h) => h.ten).join(', '), trich: dong.trim().slice(0, 100) });
      });
    }
  }
  return theoTep;
}

// ===========================================================================
console.log('\n[1] Không có chỗ vi phạm MỚI nào ngoài món nợ đã ghi');
{
  const theoTep = quet();
  const moi = Object.keys(theoTep).filter((t) => !NO_DA_BIET[t]);
  check('không màn hình nào mới sinh ra cách xếp trẻ trên dưới nhau',
    moi.length === 0,
    moi.map((t) => `${t}: ${theoTep[t].map((v) => v.dong + ' ' + v.trich).join(' | ')}`).slice(0, 5));
}

// ===========================================================================
console.log('\n[2] Món nợ cũ chỉ được GIẢM, không được phình ra');
{
  const theoTep = quet();
  for (const [tep, { so, vi_sao }] of Object.entries(NO_DA_BIET)) {
    const thuc = (theoTep[tep] || []).length;
    check(`${tep} — nợ ≤ ${so} dòng (${vi_sao})`, thuc <= so, `đang là ${thuc}`);
    if (thuc < so) {
      console.log(`      ↓ đã giảm còn ${thuc}/${so} — hạ con số trong NO_DA_BIET xuống để siết chặt thêm.`);
    }
  }
}

// ===========================================================================
console.log('\n[3] Dữ liệu mẫu tuyệt đối sạch — đây là thứ người ta nhìn đầu tiên');
{
  // G0.5 đã dọn. Bài này giữ cho nó ở nguyên như thế.
  const seed = fs.readFileSync(path.join(GOC, 'data', 'seed.js'), 'utf8');
  check('không bản ghi nề nếp nào có điểm khác 0',
    !/points:\s*-?[1-9]/.test(seed), (seed.match(/points:\s*-?\d+/g) || []).slice(0, 5));
  check('không môn nào trong học bạ có điểm số',
    !/score:\s*[0-9]/.test(seed), (seed.match(/score:\s*[^,\n]+/g) || []).slice(0, 5));
  check('mọi bé cùng một mức hạnh kiểm — không xếp loại bé này trên bé kia',
    new Set(seed.match(/conduct: '[^']*'/g) || []).size <= 1,
    [...new Set(seed.match(/conduct: '[^']*'/g) || [])]);
}

// ===========================================================================
console.log('\n[4] Bộ canh này có thật sự bắt được không');
{
  const tam = path.join(GOC, 'test', '__tam-qt4');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = `Hoàn thành ${pct}%`;\nconst b = 'Bảng xếp hạng của nhóm';\nconst c = 'điểm thi đua';\n");
  const bat = quet(['test/__tam-qt4']);
  const ds = bat['test/__tam-qt4/ban.js'] || [];
  check('bắt được phần trăm in ra màn hình', ds.some((v) => v.dau.includes('phần trăm')), ds);
  check('bắt được bảng xếp hạng', ds.some((v) => v.dau.includes('xếp hạng')), ds);
  check('bắt được điểm thi đua', ds.some((v) => v.dau.includes('thi đua')), ds);

  fs.writeFileSync(path.join(tam, 'ban.js'), "const a = '<div style=\"width:100%\"></div>';\n");
  check('KHÔNG bắt nhầm width:100% của bố cục',
    Object.keys(quet(['test/__tam-qt4'])).length === 0, quet(['test/__tam-qt4']));
  fs.rmSync(tam, { recursive: true, force: true });
}

tongKet();
