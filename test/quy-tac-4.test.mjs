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
  // QUÉT CẢ `public/js`, KHÔNG CHỈ `public/js/views`.
  //
  // Bản trước chỉ quét thư mục `views`, nên `public/js/ui.js`, `public/js/app.js`
  // và `public/js/api.js` nằm NGOÀI tầm nhìn của bộ canh. Đó là ba tệp mà cả
  // ứng dụng đang dựa vào: thêm bao nhiêu dấu hiệu vào `DAU_HIEU` cũng không
  // chạm tới một dòng nào trong đó.
  //
  // Đổi `public/js/views` thành `public/js` chứ KHÔNG thêm vào bên cạnh: hàm
  // `cacTep` đi vào cả thư mục con, nên để cả hai là mỗi tệp trong `views` bị
  // đếm hai lần và món nợ tự nhân đôi.
  'public/js', 'public/sw.js', 'routes', 'modules',
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
  // ĐIỂM SỐ KHI NÓ KHÔNG TỰ GỌI TÊN MÌNH.
  //
  // Bốn dấu hiệu trên đều đi tìm CHỮ: "điểm số", "xếp hạng", "thi đua". Nhưng
  // mã nguồn thì hay không nói chữ nào cả. `public/js/views/hocsinhcu.js` in
  // điểm từng môn cho phụ huynh bằng `m.score ?? m.level` — không khớp mẫu nào,
  // nên tệp đó không nằm trong món nợ và bộ canh vẫn xanh trong khi con số về
  // một đứa trẻ đang hiện ngay trên màn hình gia đình.
  //
  // Nên thêm một dấu hiệu bắt theo TÊN TRƯỜNG DỮ LIỆU, không theo lời văn.
  // `\b` của JS chỉ hiểu chữ ASCII, mà `score`/`diem` đều là ASCII nên dùng
  // được ở đây.
  { ten: 'điểm số của trẻ (tên trường dữ liệu)', re: /\b(score|diem|diemTrungBinh|hocLuc)\b|\.score\b/i },
];

// Được phép, kèm lý do. Không phải mọi phần trăm đều là xếp hạng trẻ.
//
// NGOẠI LỆ THEO DÒNG, KHÔNG THEO CẢ TỆP.
//
// Bản trước bỏ qua NGUYÊN TỆP khi tên tệp có trong danh sách này. Nhưng lý do
// miễn trừ chỉ đúng cho MỘT dấu hiệu — phần trăm phiếu khảo sát của người lớn —
// còn cách viết thì miễn luôn cả năm. Thêm chữ "xếp hạng" hay "điểm thi đua"
// vào `surveys.js` là bộ canh không hé một tiếng: một cửa sau bỏ ngỏ ngay
// trong bộ canh của QUY TẮC 4.
//
// Bộ canh QUY TẮC 2 đã làm đúng hơn từ đầu (hàm `chiDong`), nên đưa về cùng
// dạng: mỗi ngoại lệ phải nói rõ nó chừa ĐÚNG DÒNG NÀO.
const NGOAI_LE = [
  {
    tep: 'public/js/views/surveys.js',
    vi_sao: 'Phần trăm ở đây là tỉ lệ PHỤ HUYNH chọn mỗi phương án trong khảo sát — '
      + 'không phải con số về một đứa trẻ. QUY TẮC 4 cấm xếp hạng TRẺ, không cấm '
      + 'đếm phiếu của người lớn.',
    // Chỉ chừa đúng những dòng in ra tỉ lệ phiếu. Mọi dòng khác của tệp này vẫn
    // bị soi như thường.
    chiDong: (dong) => /\}%|phần trăm|tỉ lệ|ti le/i.test(dong),
  },
  {
    tep: 'data/seed.js',
    vi_sao: 'Chú thích trong dữ liệu mẫu giải thích vì sao mọi bản ghi nề nếp đều '
      + 'points: 0. Nhắc tới "xếp hạng" để nói rằng đang cố ý KHÔNG xếp hạng.',
    // Chừa hai loại dòng, và chỉ hai:
    //   1. dòng CHÚ THÍCH — nó nói về QUY TẮC 4 chứ không sinh ra dữ liệu nào;
    //   2. dòng đặt trường đó về GIÁ TRỊ TRUNG TÍNH (`null` hoặc `0`) — tức là
    //      chính chỗ đang thực thi QUY TẮC 4.
    // `score: 8.5` thì vẫn bị bắt, và đó là điểm khác nhau giữa ngoại lệ này
    // với việc bỏ qua cả tệp như bản trước.
    chiDong: (dong) => /^\s*(\/\/|\*|\/\*)/.test(dong)
      || /\b(score|diem\w*|points|hocLuc)\s*:\s*(null|0)\s*[,}]/.test(dong),
  },
];

// MÓN NỢ ĐÃ BIẾT — chỉ được GIẢM, không được tăng.
//
// Hai màn hình dưới đây là phần tiểu học của app 1, sẽ gỡ ở N3 theo đúng quy
// trình "bỏ tính năng" của CLAUDE.md. Con số là số DÒNG có dấu hiệu vi phạm.
//
// CON SỐ TĂNG VÌ CÁI THƯỚC DÀI RA, KHÔNG PHẢI VÌ NỢ PHÌNH RA.
//
// Bốn con số dưới đây vừa được nâng khi thêm dấu hiệu "điểm số của trẻ (tên
// trường dữ liệu)". Không một dòng vi phạm nào mới được viết — bộ canh chỉ
// nhìn thấy thêm những dòng vốn đã nằm đó, ở đúng bốn tệp đã biết.
//
// Đây là ngoại lệ duy nhất được phép của luật bánh cóc, và nó có canh riêng:
// mục [2b] bên dưới khoá cứng DANH SÁCH TỆP. Số dòng có thể tăng khi thước dài
// ra, nhưng DANH SÁCH TỆP thì không bao giờ được dài thêm — một tệp mới xuất
// hiện ở đây nghĩa là có vi phạm mới thật, và mục [1] sẽ bắt nó trước.
const NO_DA_BIET = {
  // Hai tệp Nề nếp KHÔNG đổi số: dấu hiệu mới không tìm thấy gì thêm ở đó, vì
  // chúng vốn đã gọi thẳng tên "điểm thi đua" và "xếp hạng".
  'public/js/views/conduct.js': { so: 5, vi_sao: 'Nề nếp: bảng xếp hạng trẻ theo điểm thi đua. Gỡ ở N3.' },
  'routes/conduct.js': { so: 7, vi_sao: 'Nề nếp: máy chủ tính tổng điểm rồi sắp xếp trẻ. Gỡ ở N3.' },
  // Hai tệp Học bạ tăng 1 → 6 và 4 → 9. Toàn bộ phần tăng là những dòng dùng
  // `score` mà không nói chữ "điểm" nào — đúng lỗ mà dấu hiệu mới sinh ra để bịt.
  'public/js/views/reports.js': { so: 6, vi_sao: 'Học bạ: ô nhập điểm thang 10 cho từng môn. Gỡ ở N3.' },
  'routes/reports.js': { so: 9, vi_sao: 'Học bạ: máy chủ kiểm điểm 0–10. Gỡ ở N3.' },
};

// Danh sách tệp còn nợ, KHOÁ CỨNG. Chỉ được ngắn đi.
const TEP_CON_NO = Object.keys(NO_DA_BIET);

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
      const nl = NGOAI_LE.filter((n) => n.tep === tuongDoi);
      const dongs = fs.readFileSync(tep, 'utf8').split('\n');
      dongs.forEach((dong, i) => {
        if (nl.some((n) => n.chiDong(dong))) return;
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
console.log('\n[2b] Danh sách tệp còn nợ chỉ được NGẮN ĐI, không bao giờ dài ra');
{
  // Số dòng nợ được phép tăng khi bộ canh siết chặt thêm (thước dài ra thì đo
  // được nhiều hơn). Nhưng DANH SÁCH TỆP thì không: một tệp mới ở đây nghĩa là
  // có chỗ vi phạm mới thật, và cách duy nhất đúng là sửa chỗ đó chứ không
  // phải ghi thêm một dòng nợ.
  check('vẫn đúng bốn tệp của phần tiểu học, không thêm tệp nào',
    TEP_CON_NO.length === 4, TEP_CON_NO);
  check('cả bốn đều thuộc hai phân hệ đã tắt sẵn (Nề nếp, Báo cáo)',
    TEP_CON_NO.every(t => /conduct|reports/.test(t)), TEP_CON_NO);
  check('mọi tệp còn nợ đều tồn tại thật — sổ nợ không có mục ruỗng',
    TEP_CON_NO.every(t => fs.existsSync(path.join(GOC, t))),
    TEP_CON_NO.filter(t => !fs.existsSync(path.join(GOC, t))));
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

  // Dấu hiệu mới: điểm số viết bằng tên trường dữ liệu, không có chữ nào tố cáo.
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const x = mon.score ?? mon.level;\nconst y = { diem: 8.5 };\n");
  const batNgam = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.js'] || [];
  check('BẮT ĐƯỢC ĐIỂM SỐ KHI NÓ KHÔNG TỰ GỌI TÊN MÌNH',
    batNgam.length >= 2 && batNgam.every(v => v.dau.includes('tên trường dữ liệu')), batNgam);

  // Và không bắt nhầm những chữ chỉ TRÔNG giống.
  fs.writeFileSync(path.join(tam, 'ban.js'),
    "const a = 'diemDanh';\nconst b = scoreboardHidden;\nconst c = 'điểm đón bé';\n");
  const khongBat = quet(['test/__tam-qt4'])['test/__tam-qt4/ban.js'] || [];
  check('KHÔNG bắt nhầm "diemDanh", "scoreboard", hay "điểm đón bé"',
    khongBat.length === 0, khongBat);

  fs.writeFileSync(path.join(tam, 'ban.js'), "const a = '<div style=\"width:100%\"></div>';\n");
  check('KHÔNG bắt nhầm width:100% của bố cục',
    Object.keys(quet(['test/__tam-qt4'])).length === 0, quet(['test/__tam-qt4']));
  fs.rmSync(tam, { recursive: true, force: true });
}

// ===========================================================================
console.log('\n[5] NGOẠI LỆ CHỪA ĐÚNG DÒNG, KHÔNG CHỪA CẢ TỆP');
{
  // Bản trước bỏ qua NGUYÊN TỆP khi tên tệp có trong NGOAI_LE. Lý do miễn trừ
  // chỉ đúng cho MỘT dấu hiệu (phần trăm phiếu khảo sát của người lớn), nhưng
  // cách viết miễn luôn cả năm — thêm chữ "xếp hạng" vào `surveys.js` là bộ
  // canh không hé một tiếng. Một cửa sau bỏ ngỏ ngay trong bộ canh.
  //
  // Mục này canh chính ngoại lệ đó: nó phải chừa đúng dòng đã nêu lý do, và
  // KHÔNG chừa gì thêm.
  check('mọi ngoại lệ đều nói rõ nó chừa dòng nào — không có ngoại lệ cả tệp',
    NGOAI_LE.every(n => typeof n.chiDong === 'function'),
    NGOAI_LE.map(n => `${n.tep}: ${typeof n.chiDong}`));
  check('và mọi ngoại lệ đều có lý do viết thành chữ',
    NGOAI_LE.every(n => typeof n.vi_sao === 'string' && n.vi_sao.trim().length >= 40),
    NGOAI_LE.map(n => (n.vi_sao || '').length));
  check('mọi tệp được nêu ngoại lệ đều còn tồn tại thật',
    NGOAI_LE.every(n => fs.existsSync(path.join(GOC, n.tep))),
    NGOAI_LE.filter(n => !fs.existsSync(path.join(GOC, n.tep))).map(n => n.tep));

  // Phép thử ngược cho chính ngoại lệ: một dòng vi phạm THẬT nằm trong tệp
  // được miễn trừ vẫn phải bị bắt.
  for (const n of NGOAI_LE) {
    check(`${n.tep}: dòng "Bảng xếp hạng của nhóm" KHÔNG được ngoại lệ chừa`,
      !n.chiDong("const t = 'Bảng xếp hạng của nhóm';"), n.tep);
    check(`${n.tep}: dòng "score: 8.5" KHÔNG được ngoại lệ chừa`,
      !n.chiDong('  score: 8.5,'), n.tep);
  }

  // Và chiều còn lại: đúng dòng đã nêu lý do thì phải được chừa thật, nếu không
  // ngoại lệ chỉ là chữ chết và bộ canh sẽ đỏ oan.
  const ls = NGOAI_LE.find(n => n.tep === 'public/js/views/surveys.js');
  check('surveys.js: dòng in tỉ lệ phiếu của người lớn thì ĐƯỢC chừa',
    !!ls && ls.chiDong('return `${Math.round(pct)}%`;'), !!ls);
  const sd = NGOAI_LE.find(n => n.tep === 'data/seed.js');
  check('seed.js: dòng đặt điểm về giá trị trung tính thì ĐƯỢC chừa',
    !!sd && sd.chiDong('          score: null,   // QUY TẮC 4 — không chấm điểm trẻ'), !!sd);
}

tongKet();
