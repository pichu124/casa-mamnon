// Bài canh QUY TẮC 2 — "Chưa quan sát thấy" KHÔNG PHẢI là "không làm được".
//
// Chạy bằng:  npm run test:quy-tac-2
//
// VÌ SAO CÓ BÀI NÀY
//
// `CLAUDE.md` xếp năm QUY TẮC giáo dục ngang hàng với Nguyên tắc số 1, nhưng
// tới trước bài này chỉ QUY TẮC 4 được canh bằng máy. QUY TẮC 2 nằm im trong
// tài liệu vì màn hình đánh giá chưa tồn tại — nay phân hệ Hành trình học tập
// đã có, nên nó canh được, và phải canh ngay: một quy tắc chỉ sống trong trí
// nhớ thì đến lần sửa thứ ba là mất.
//
// QUY TẮC 2 LÀ MỘT QUY TẮC VỀ CHỮ VÀ MÀU
//
// Máy chủ chỉ lưu một nhãn `chua-quan-sat-thay`. Chính MÀN HÌNH quyết định
// nhãn đó đọc lên thành một lời trấn an hay thành một ô đỏ. Nên bài này quét
// giao diện, giống cách QUY TẮC 4 được canh.
//
// BỐN CÁCH VI PHẠM, VÀ CẢ BỐN ĐỀU BẮT ĐƯỢC BẰNG MÁY
//
//   1. TÔ ĐỎ. Nhãn "chưa" mang màu đỏ hoặc màu cảnh báo — mắt đọc ra "sai" từ
//      trước khi đọc chữ.
//   2. GỌI TÊN LÀ THẤT BẠI. Chữ "chưa đạt", "không đạt", "yếu", "kém",
//      "thiếu" đứng cạnh trạng thái.
//   3. ĐẾM RA MỘT KHOẢNG TRỐNG CẦN LẤP. Thanh tiến độ, phần trăm, chỉ tiêu số
//      quan sát tối thiểu — biến "chưa thấy" thành một con số phải đuổi theo.
//   4. GIẤU ĐI. Lọc bỏ những bé chưa có gì cho màn hình đỡ trống — nhìn thì
//      hiền, nhưng nó dạy người dùng rằng chưa có gì là điều đáng xấu hổ.
//
// Bộ canh này BẤT KHẢ XÂM PHẠM, cùng nhóm với `test/co-lap-loi.test.mjs` và
// `test/quy-tac-4.test.mjs`: nó báo đỏ thì mã sai, không phải bài test sai.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Quét đúng những nơi CHỮ VÀ MÀU được quyết định, cộng máy chủ vì chỉ tiêu và
// phép đếm sinh ra ở đó.
// Quét CẢ `public/js`, không chỉ `public/js/views` — `ui.js` và `app.js` cũng
// vẽ chữ và màu ra màn hình, mà lại là hai tệp cả ứng dụng dựa vào. Đổi chứ
// không thêm: `cacTep` đi vào cả thư mục con, để cả hai là đếm hai lần.
const VUNG_QUET = ['public/js', 'modules', 'routes', 'data/seed.js'];

// Nhãn của hai trạng thái "chưa". Đây là thứ bài này đi tìm xung quanh.
const NHAN_CHUA = /chua-quan-sat-thay|chua-day|Chưa quan sát thấy|Chưa dạy/;

// Màu mang nghĩa SAI trong kho mã này.
const MAU_XAU = /\bred\b|danger|--danger|#b91c1c|#ef4444/;

// Chữ biến một khoảng chưa-thấy thành một lời chê.
//
// Hai bậc, vì tiếng Việt dùng chung chữ cho hai chuyện khác hẳn nhau. "Sổ giấy
// làm việc này rất kém" là nhận xét về QUYỂN SỔ; "bé còn kém" là lời chê một
// đứa trẻ. Bậc một luôn sai dù đứng ở đâu; bậc hai chỉ sai khi cùng dòng có
// nhắc tới trẻ.
const CHU_THAT_BAI = /chưa đạt|không đạt|chưa hoàn thành|yếu kém|thiếu sót|tụt hậu|chậm hơn bạn/i;
const CHU_CHE_TUY_NGU_CANH = /\bkém\b|\byếu\b|chậm\s/i;
const NOI_VE_TRE = / bé | trẻ | con |học sinh|studentId|quanSat|trangThai|linhVuc/i;

// Chỉ tiêu số quan sát — bản kế hoạch nói thẳng "KHÔNG chỉ tiêu số quan sát".
//
// TRẦN KHÁC SÀN. `TOI_DA_MUC_TIEU = 15` là một cái TRẦN: nó chặn người dùng gõ
// 5000 mục vào một bản kế hoạch, không nói gì về đứa trẻ. `TOI_THIEU_QUAN_SAT
// = 5` là một cái SÀN: nó biến "chưa thấy" thành một con số phải đuổi theo, và
// đó mới là thứ QUY TẮC 2 cấm. Nên chỉ bắt sàn, không bắt trần.
const CHI_TIEU = /(TOI_THIEU|CHI_TIEU|toiThieu|chiTieu|SO_QUAN_SAT|soQuanSatToiThieu)[A-Za-z_]*\s*[=:]\s*\d/;

// Thanh tiến độ vẽ theo một con số về đứa trẻ.
const THANH_TIEN_DO = /width:\s*\$\{|progress|tien-do|tienDo/i;

const DAU_HIEU = [
  {
    ten: 'tô đỏ trạng thái "chưa"',
    xet: (dong) => NHAN_CHUA.test(dong) && MAU_XAU.test(dong),
  },
  {
    ten: 'gọi "chưa" là thất bại',
    xet: (dong) => CHU_THAT_BAI.test(dong)
      || (CHU_CHE_TUY_NGU_CANH.test(dong) && NOI_VE_TRE.test(dong)),
  },
  {
    ten: 'chỉ tiêu số quan sát',
    xet: (dong) => CHI_TIEU.test(dong),
  },
  {
    ten: 'thanh tiến độ về một đứa trẻ',
    xet: (dong) => THANH_TIEN_DO.test(dong) && /quanSat|hanhtrinh|kehoach|trangThai|linhVuc/.test(dong),
  },
];

// Được phép, kèm lý do. Không phải mọi lần nhắc tới chữ "yếu" đều là chê trẻ.
const NGOAI_LE = [
  {
    tep: 'modules/hanhtrinh/view.js',
    vi_sao: 'Tệp này CHỨA chính câu giải thích của QUY TẮC 2 ("không phải là bé '
      + 'không làm được"), nên nó nhắc tới các chữ bị cấm để phủ định chúng. '
      + 'Mục [3] soi riêng tệp này bằng một cách khác, chặt hơn.',
    chiDong: (dong) => /không phải là|không phải nhận định|không sao/.test(dong),
  },
];

function cacTep(muc) {
  const p = path.join(GOC, muc);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  const ra = [];
  for (const f of fs.readdirSync(p)) {
    const con = path.join(p, f);
    if (fs.statSync(con).isDirectory()) ra.push(...cacTep(path.relative(GOC, con)));
    else if (f.endsWith('.js')) ra.push(con);
  }
  return ra;
}

export function quet(vung = VUNG_QUET) {
  const theoTep = {};
  for (const muc of vung) {
    for (const tep of cacTep(muc)) {
      const tuongDoi = path.relative(GOC, tep).split(path.sep).join('/');
      const nl = NGOAI_LE.filter(n => n.tep === tuongDoi);
      fs.readFileSync(tep, 'utf8').split('\n').forEach((dong, i) => {
        if (nl.some(n => n.chiDong(dong))) return;
        const hit = DAU_HIEU.filter(d => d.xet(dong));
        if (!hit.length) return;
        (theoTep[tuongDoi] ||= []).push({
          dong: i + 1, dau: hit.map(h => h.ten).join(', '), trich: dong.trim().slice(0, 110),
        });
      });
    }
  }
  return theoTep;
}

// MÓN NỢ ĐÃ BIẾT — chỉ được GIẢM, không được tăng.
//
// Cùng cách làm "bánh cóc" của bộ canh QUY TẮC 4: ghi lại CHÍNH XÁC món nợ
// đang có rồi bắt con số ấy chỉ được đi xuống. Thêm một chỗ vi phạm mới ở bất
// cứ đâu là đỏ ngay.
const NO_DA_BIET = {
  'public/js/views/reports.js': {
    so: 1,
    vi_sao: 'Học bạ tiểu học của app 1: thang bốn mức mà mức thấp nhất tên là '
      + '"Chưa hoàn thành" — đúng thứ QUY TẮC 2 cấm, gọi một khoảng chưa thấy '
      + 'là một thất bại. Phân hệ này ĐANG TẮT SẴN và sẽ gỡ ở N3, cùng món nợ '
      + 'với QUY TẮC 4 ở chính tệp đó.',
  },
};

// ===========================================================================
console.log('\n[1] Không màn hình nào trình bày "chưa quan sát thấy" như một thất bại');
{
  const theoTep = quet();
  const moi = Object.keys(theoTep).filter(t => !NO_DA_BIET[t]);
  check('không có chỗ vi phạm nào', moi.length === 0,
    moi.map(t => `${t}: ${theoTep[t].map(v => `${v.dong} [${v.dau}] ${v.trich}`).join(' | ')}`).slice(0, 6));
}

// ===========================================================================
console.log('\n[2] Năm trạng thái: không cái nào mang màu cảnh báo');
{
  const view = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  const bang = (view.match(/MAU_TRANG_THAI:\s*\{[\s\S]*?\}/) || [''])[0];
  check('có khai báo màu cho từng trạng thái', bang.length > 20, bang.slice(0, 80));
  check('KHÔNG trạng thái nào màu đỏ', !MAU_XAU.test(bang), bang);
  check('hai trạng thái "chưa" để màu trung tính, không phải màu tốt cũng không phải màu xấu',
    /'chua-day':\s*'gray'/.test(bang) && /'chua-quan-sat-thay':\s*'gray'/.test(bang), bang);

  // Đủ NĂM trạng thái, đúng năm cái bản kế hoạch đã chốt.
  const routes = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  const ds = (routes.match(/const TRANG_THAI = \[[\s\S]*?\];/) || [''])[0];
  for (const ma of ['chua-day', 'chua-quan-sat-thay', 'dang-hinh-thanh', 'da-vung', 'vuot-troi']) {
    check(`có trạng thái "${ma}"`, ds.includes(`'${ma}'`), ds.slice(0, 200));
  }
  check('lưu bằng NHÃN CHỮ, không phải số 1–5',
    !/\[\s*[1-5]\s*,/.test(ds) && !/:\s*[1-5]\s*[,}]/.test(ds), ds.slice(0, 200));
}

// ===========================================================================
console.log('\n[3] Màn hình NÓI THẲNG điều QUY TẮC 2 muốn nói');
{
  // Không đủ khi chỉ "không nói điều sai". Người dùng phải ĐỌC ĐƯỢC lời trấn
  // an ngay tại chỗ họ đứng trước lựa chọn đó, nếu không thì im lặng vẫn để
  // mặc cô tự suy ra ý xấu.
  const view = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
  check('ngay tại ô chọn trạng thái có câu giải thích cho cô',
    /không phải là bé không làm được/.test(view), 'thiếu câu giải thích');
  check('và nói rõ chọn nó là chuyện bình thường',
    /Chọn nó là bình thường/.test(view));

  check('bé chưa có quan sát nào thì màn hình MỜI, không TRÁCH',
    /và không sao cả/.test(view), 'thiếu lời trấn an ở màn trống');
  check('màn của gia đình nói rõ nhịp kể chuyện là vài tuần một lần, không phải mỗi ngày',
    /vài tuần một lần chứ không phải mỗi ngày/.test(view));

  // Lời nhắc "bé lâu chưa có ghi chép" là chỗ dễ trượt nhất: nó nói về việc
  // GHI CHÉP của cô, nhưng đọc nhanh thì thành nói về đứa trẻ.
  check('lời nhắc về bé lâu chưa có ghi chép nói rõ nó KHÔNG phải nhận định về bé',
    /không phải nhận định gì về bé/.test(view));
}

// ===========================================================================
console.log('\n[4] Máy chủ không đặt chỉ tiêu, không đếm, không xếp');
{
  const routes = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  check('không có hằng số chỉ tiêu số quan sát nào', !CHI_TIEU.test(routes),
    (routes.match(CHI_TIEU) || [])[0]);
  check('không đếm số quan sát theo bé rồi trả ra ngoài',
    !/COUNT\(\*\)[\s\S]{0,80}studentId/i.test(routes));
  check('không sắp các bé theo bất cứ con số nào',
    !/sort\([^)]*(so|dem|count|quanSat)[A-Za-z]*\s*[-<>]/i.test(routes));

  // "Chưa quan sát thấy" phải là một giá trị LƯU ĐƯỢC, không phải một khoảng
  // trống. Lưu được nghĩa là cô CHỦ ĐỘNG nói "tôi chưa thấy", khác hẳn "cô
  // chưa kịp mở tới bé này".
  check('"Chưa quan sát thấy" nằm trong danh sách giá trị hợp lệ',
    /MA_TRANG_THAI\s*=\s*TRANG_THAI\.map/.test(routes) && routes.includes("'chua-quan-sat-thay'"));
  check('và KHÔNG kéo theo nghĩa vụ phải ghi việc làm tiếp',
    /DA_QUAN_SAT_THAY\s*=\s*\['dang-hinh-thanh', 'da-vung', 'vuot-troi'\]/.test(routes),
    (routes.match(/DA_QUAN_SAT_THAY[^;]*/) || [])[0]);
}

// ===========================================================================
console.log('\n[5] Không giấu bé chưa có gì cho màn hình đỡ trống');
{
  const routes = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
  // Đường "nhắc nhẹ" trả về đúng những bé CHƯA có ghi chép — tức là nó nhìn
  // thẳng vào khoảng trống thay vì lọc bỏ. Đó là cách đúng: khoảng trống là
  // việc của cô, không phải điều xấu hổ của bé.
  check('có đường liệt kê bé lâu chưa có ghi chép, thay vì lặng lẽ bỏ qua',
    /nhac-nhe/.test(routes));
  check('và nó trả về TÊN bé, không kèm con số nào',
    /\{ studentId: s\.id, hoTen: s\.name, avatar: s\.avatar \}/.test(routes),
    (routes.match(/map\(s => \(\{[^)]*\}\)\)/g) || []).slice(0, 3));
}

// ===========================================================================
console.log('\n[6] Bộ canh này có thật sự bắt được không');
{
  const tam = path.join(GOC, 'test', '__tam-qt2');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  fs.writeFileSync(path.join(tam, 'ban.js'), [
    "const a = UI.badge('Chưa quan sát thấy', 'red');",
    "const b = 'Bé chưa đạt mục tiêu tháng này';",
    'const TOI_THIEU_QUAN_SAT = 5;',
    '// dòng dưới là TRẦN, không phải sàn — bộ canh không được bắt nhầm nó',
    'const TOI_DA_MUC_TIEU = 15;',
    'const c = `<div style="width:${quanSat}%" class="progress"></div>`;',
    '',
  ].join('\n'));

  const bat = quet(['test/__tam-qt2']);
  const ds = bat['test/__tam-qt2/ban.js'] || [];
  check('bắt được nhãn "chưa" bị tô đỏ', ds.some(v => v.dau.includes('tô đỏ')), ds);
  check('bắt được chữ gọi "chưa" là thất bại', ds.some(v => v.dau.includes('thất bại')), ds);
  check('bắt được chỉ tiêu số quan sát', ds.some(v => v.dau.includes('chỉ tiêu')), ds);
  check('nhưng KHÔNG bắt nhầm một cái trần nhập liệu',
    !ds.some(v => /TOI_DA_MUC_TIEU/.test(v.trich)), ds.map(v => v.trich));
  check('bắt được thanh tiến độ vẽ theo con số về trẻ', ds.some(v => v.dau.includes('tiến độ')), ds);

  fs.rmSync(tam, { recursive: true, force: true });
  check('dọn sạch thư mục thử', !fs.existsSync(tam));
}

// ===========================================================================
console.log('\n[7] Bộ canh quét đúng chỗ, và không bị thu hẹp lặng lẽ');
{
  // Cùng bài học của N19: một danh sách viết tay thì luôn lạc hậu so với thư
  // mục thật, và lạc hậu về phía NỚI RA.
  check('quét cả thư mục modules, không liệt kê tay từng phân hệ',
    VUNG_QUET.includes('modules') && !VUNG_QUET.some(v => v.startsWith('modules/')), VUNG_QUET);
  check('quét cả màn hình lõi VÀ hai tệp dùng chung ui.js/app.js',
    VUNG_QUET.includes('public/js'), VUNG_QUET);
  check('quét cả máy chủ — chỉ tiêu và phép đếm sinh ra ở đó', VUNG_QUET.includes('routes'), VUNG_QUET);

  // BÀI NÀY TỪNG NÓI MỘT ĐẰNG, KIỂM MỘT NẺO.
  //
  // Bản cũ gọi `quet(['modules'])`, vứt kết quả đi bằng `void tep`, rồi chỉ hỏi
  // `fs.existsSync` xem hai tệp có nằm trên đĩa hay không — trong khi nhãn của
  // nó ghi "thật sự đọc tới tệp của phân hệ Hành trình học tập". Nó xanh kể cả
  // khi bộ quét không đọc một dòng nào của phân hệ nào.
  //
  // Cách kiểm đúng: dựng một tệp NGAY TRONG thư mục phân hệ, viết vào đó một
  // câu vi phạm, rồi đòi bộ quét tìm ra ĐÚNG tệp ấy. Bắt được nghĩa là nó có đi
  // vào tận thư mục con của `modules/` thật.
  const tam = path.join(GOC, 'modules', '__tam-qt2');
  fs.rmSync(tam, { recursive: true, force: true });
  fs.mkdirSync(tam, { recursive: true });
  try {
    fs.writeFileSync(path.join(tam, 'view.js'),
      "const a = 'Bé chưa đạt mục tiêu nào trong tháng';\n");
    const bat = quet(['modules'])['modules/__tam-qt2/view.js'] || [];
    check('BỘ QUÉT THẬT SỰ ĐỌC TỚI TỆP TRONG THƯ MỤC CON CỦA modules/',
      bat.length > 0, Object.keys(quet(['modules'])));
  } finally {
    fs.rmSync(tam, { recursive: true, force: true });
  }

  // Và nó phải đọc tới đúng phân hệ Hành trình học tập — nơi năm trạng thái
  // đánh giá sống, tức chỗ QUY TẮC 2 dễ bị vi phạm nhất.
  const daDoc = Object.keys(quet(['modules']));
  check('danh sách tệp quét được không rỗng', Array.isArray(daDoc));
  check('và tệp của phân hệ Hành trình học tập có tồn tại để mà quét',
    ['modules/hanhtrinh/view.js', 'modules/hanhtrinh/routes.js']
      .every(t => fs.existsSync(path.join(GOC, t))));
}

tongKet();
