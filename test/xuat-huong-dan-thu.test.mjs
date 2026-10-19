// Bài canh cho lệnh dựng file Word của hai hướng dẫn thử gửi trường
// (`scripts/xuat-huong-dan-thu.js`).
//
// Chạy bằng:  npm run test:xuat-huong-dan-thu
//
// VÌ SAO CẦN CANH
//
// `docs/HUONG-DAN-KIEM-THU.md` và `docs/HUONG-DAN-THU-NHANH.md` là bản chép của
// hai tài liệu trên claude.ai. Phần đầu mỗi tệp có ghi chú riêng của kho: đường
// dẫn bản chính, cách chép, câu cấm điền mật khẩu. Phần từ tiêu đề trở xuống là
// bản xuất của bản chính, chép nguyên văn. File Word dựng từ hai tệp này đi thẳng
// tới cô, văn phòng và phụ huynh thử. Những chỗ hỏng không ai thấy cho tới khi
// trường cầm giấy, hoặc tới khi đã lên kho mã (lên rồi thì không thu lại được):
//
//   - ghi chú của kho lọt vào file Word;
//   - mật khẩu người phụ trách điền ở bản chính theo bản xuất lên kho;
//   - tên người viết trong dòng ngày của bản xuất lên kho;
//   - phụ đề in số việc cũ, hay ngày của bản lệch với khung thay đổi.
//
// Bài này dựng thật cả hai bản rồi soi chữ trong file Word, và cố tình làm hỏng
// từng chỗ để chắc lệnh dựng từ chối thật.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { GOC, taoBoDem, thuMucTam, donThuMucTam } from './_chung.mjs';

const require = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const xuat = require(path.join(GOC, 'scripts', 'xuat-huong-dan-thu.js'));
const JSZip = require(require.resolve('jszip', { paths: [require.resolve('docx')] }));
const TAM = thuMucTam('xuat-huong-dan-thu');
fs.mkdirSync(TAM, { recursive: true });

// Chữ của ghi chú kho. Không câu nào được có trong file Word.
const DAU_GHI_CHU_KHO = [
  'claude.ai', 'bản chép', 'Bản chính nằm trên', 'Chép từ bản chính',
  'VIEC-DANG-DO', 'TIEN-DO', 'Không bao giờ điền mật khẩu vào bản này', 'tai-lieu:huong-dan-thu',
];

async function chuTrongWord(buf) {
  const z = await JSZip.loadAsync(buf);
  const tep = z.file('word/document.xml');
  if (!tep) return { xml: '', chu: '' };
  const xml = await tep.async('string');
  const chu = xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return { xml, chu };
}
const docTep = (khoa) => fs.readFileSync(path.join(GOC, xuat.HUONG_DAN[khoa].nguon), 'utf8');
const loiKhiDoc = (noiDung, khoa) => {
  try { xuat.docHuongDan(noiDung, xuat.HUONG_DAN[khoa]); return null; } catch (e) { return e.message; }
};

const ketQua = {};

console.log('\n[1] Dựng được cả hai bản từ tệp trong kho');
for (const khoa of Object.keys(xuat.HUONG_DAN)) {
  const loi = loiKhiDoc(docTep(khoa), khoa);
  check(`${khoa}: đọc được tệp, phụ đề khớp với bảng`, loi === null, loi);
  if (loi) continue;
  const phan = xuat.docHuongDan(docTep(khoa), xuat.HUONG_DAN[khoa]);
  const { xml, chu } = await chuTrongWord(await xuat.dungWord(phan));
  ketQua[khoa] = { phan, xml, chu };
  check(`${khoa}: ra tệp Word có thân tài liệu`, xml.length > 1000);
  check(`${khoa}: trang đầu có tiêu đề và phụ đề`, chu.includes(phan.tieuDe) && chu.includes(phan.phuDe));
  check(`${khoa}: phụ đề in lên file Word mang ngày của bản (${phan.ngay})`, phan.phuDe.includes(phan.ngay));
  check(`${khoa}: dòng ngày của bản xuất (tên người viết) KHÔNG vào file Word`, !/\b[A-Z][a-z]{2} \d{1,2}, \d{4}\b/.test(chu));
}
check('bản đầy đủ: thân bắt đầu từ khung "Đợt này thay đổi gì"',
  (ketQua['day-du']?.chu || '').includes('Đợt này thay đổi gì'));

console.log('\n[2] Mỗi dòng thử có đủ ba ô tích Đạt / Không đạt / Chưa thử');
for (const [khoa, { phan, xml }] of Object.entries(ketQua)) {
  // KHÔNG ĐẾM ĐƯỢC THÌ TÍNH LÀ ĐỎ: bộ đếm hỏng ra 0 dòng thì 0 = 3 × 0 vẫn xanh.
  check(`${khoa}: đếm được các dòng thử (≥ 30)`, phan.soDong >= 30, phan.soDong);
  const oTich = (xml.match(/<w:t>☐<\/w:t>/g) || []).length;
  check(`${khoa}: ${oTich} ô tích = 3 × ${phan.soDong} dòng thử`, oTich === 3 * phan.soDong);
  check(`${khoa}: không còn ô tích kiểu <w:sym> (LibreOffice vẽ thành ô đã tích)`, !xml.includes('<w:sym'));
}

console.log('\n[3] Ghi chú của kho KHÔNG lọt vào file Word');
for (const [khoa, { chu }] of Object.entries(ketQua)) {
  const lot = DAU_GHI_CHU_KHO.filter(s => chu.includes(s));
  check(`${khoa}: không câu nào của ghi chú kho có trong file Word`, lot.length === 0, lot);
  // Đối chứng: ghi chú ấy CÓ THẬT trong tệp markdown, nên phép trên có soi đúng chỗ.
  check(`${khoa}: đối chứng — tệp markdown có ghi chú kho phía trên thân`,
    docTep(khoa).includes('Chép từ bản chính lần cuối') && docTep(khoa).includes('claude.ai'));
}
{
  // PHÉP THỬ NGƯỢC — một dòng ghi chú lỡ chép vào thân thì bộ soi phải bắt được.
  const khoa = 'ngan';
  const md = docTep(khoa).replace('## Trước khi thử', '## Trước khi thử\n\nTệp này là bản chép của tài liệu trên claude.ai.');
  const { chu } = await chuTrongWord(await xuat.dungWord(xuat.docHuongDan(md, xuat.HUONG_DAN[khoa])));
  check('PHÉP THỬ NGƯỢC — bắt được ghi chú kho lọt vào thân', DAU_GHI_CHU_KHO.some(s => chu.includes(s)));
}

console.log('\n[4] Từ chối dựng khi tệp có thứ không được lên kho hay lên giấy');
{
  check('đọc được ngày kiểu bản xuất claude.ai: "Oct 19, 2026"',
    JSON.stringify(xuat.docNgay('Oct 19, 2026')) === JSON.stringify({ ngay: 19, thang: 10, nam: 2026 }));
  check('và kiểu "19/10/2026"', JSON.stringify(xuat.docNgay('19/10/2026')) === JSON.stringify({ ngay: 19, thang: 10, nam: 2026 }));
  check('chữ không phải ngày thì không đọc thành ngày', xuat.docNgay('hôm nay') === null && xuat.docNgay('Abc 19, 2026') === null);
  check('ngày vô lý (13/13/2026, Oct 32, 2026) không đọc thành ngày',
    xuat.docNgay('13/13/2026') === null && xuat.docNgay('Oct 32, 2026') === null && xuat.docNgay('10/19/2026') === null);
}
for (const khoa of Object.keys(xuat.HUONG_DAN)) {
  const md = docTep(khoa);
  const { donVi } = xuat.HUONG_DAN[khoa];
  const phan = xuat.docHuongDan(md, xuat.HUONG_DAN[khoa]);
  const dongNgay = md.split('\n').find(l => xuat.docNgay(l.trim()));

  const coTen = md.replace(dongNgay, `${dongNgay} · @Người Viết`);
  const loiTen = loiKhiDoc(coTen, khoa);
  check(`${khoa}: dòng ngày còn " · @tên người viết" → từ chối`, loiTen !== null && loiTen.includes('tên người'), loiTen);

  const tenKhongAcong = md.replace(dongNgay, `${dongNgay} · Người Viết`);
  check(`${khoa}: dòng ngày kèm tên người không có "@" → vẫn từ chối`, loiKhiDoc(tenKhongAcong, khoa) !== null);

  check(`${khoa}: mất dòng ngày dưới tiêu đề → từ chối`, loiKhiDoc(md.replace(`${dongNgay}\n`, ''), khoa) !== null);

  // Mật khẩu do app sinh ra (5–6 chữ + 3–4 số) chép vào BẤT CỨ đâu, kể cả ngoài bảng.
  const mkMay = md.replace(phan.phuDeGoc, `${phan.phuDeGoc}\n\nMật khẩu chung: kqmtfa4827`);
  const loiMkMay = loiKhiDoc(mkMay, khoa);
  check(`${khoa}: mật khẩu do app sinh nằm ở một đoạn văn → từ chối, không in lại mật khẩu`,
    loiMkMay !== null && loiMkMay.includes('mật khẩu') && !loiMkMay.includes('kqmtfa4827'), loiMkMay);

  const so = phan.soDong;
  const thuaMot = md.replace(phan.phuDeGoc, phan.phuDeGoc.replace(`${so} ${donVi}`, `${so + 1} ${donVi}`));
  const loiSo = loiKhiDoc(thuaMot, khoa);
  check(`${khoa}: phụ đề ghi ${so + 1} ${donVi} trong khi bảng có ${so} → từ chối`,
    loiSo !== null && loiSo.includes('phụ đề'), loiSo);

  const phuDeLechNgay = md.replace(phan.phuDeGoc, phan.phuDeGoc.replace(' · ', ' 01/01/2020 · '));
  const loiNgayPhuDe = loiKhiDoc(phuDeLechNgay, khoa);
  check(`${khoa}: phụ đề ghi một ngày khác ngày của bản → từ chối`, loiNgayPhuDe !== null && loiNgayPhuDe.includes('phụ đề'), loiNgayPhuDe);
}
{
  // Bản đầy đủ: ngày trong khung "Đợt này thay đổi gì (bản …)" phải là ngày của bản.
  const md = docTep('day-du');
  const m = md.match(/^> \*\*Đợt này thay đổi gì \(bản (\d{1,2}\/\d{1,2}\/\d{4})/m);
  check('bản đầy đủ: đối chứng — khung thay đổi có ghi ngày của bản', !!m);
  if (m) {
    const lech = md.replace(`(bản ${m[1]}`, '(bản 25/12/2030');
    const loi = loiKhiDoc(lech, 'day-du');
    check('bản đầy đủ: sửa ngày trong khung mà quên ô ngày dưới tiêu đề → từ chối',
      loi !== null && loi.includes('Đợt này thay đổi gì'), loi);
  }

  // Bảng mật khẩu: bản chính có thể đã được điền. Chép nguyên văn là mật khẩu lên kho.
  // Dòng hieutruong của BẢNG MẬT KHẨU (hai ô trống), không phải của bảng tài khoản phía trên.
  const dongMk = md.split('\n').find(l => /^\| hieutruong \|\s*\|\s*\|$/.test(l));
  check('bản đầy đủ: đối chứng — có dòng hieutruong để trống trong bảng mật khẩu', !!dongMk);
  if (dongMk) {
    const daDien = md.replace(dongMk, '| hieutruong | Thu12345abc |  |');
    const loi = loiKhiDoc(daDien, 'day-du');
    check('bản đầy đủ: bảng mật khẩu có chữ → từ chối, nói rõ ô nào',
      loi !== null && loi.includes('mật khẩu') && loi.includes('hieutruong'), loi);
  }
  const doiTenCot = md.replace('| Tài khoản | Mật khẩu lần đầu |', '| Tài khoản | MK lần đầu |');
  check('bản đầy đủ: đối chứng — tìm thấy tiêu đề bảng mật khẩu để đổi tên', doiTenCot !== md);
  const loiDoiTen = loiKhiDoc(doiTenCot, 'day-du');
  check('bản đầy đủ: cột mật khẩu bị đổi tên trên bản chính → từ chối (bộ chặn không câm)',
    loiDoiTen !== null && loiDoiTen.includes('cột'), loiDoiTen);
  const mkBangKhac = md.replace('| Mất mật khẩu của |', '| Mất mật khẩu của (vd ghi tạm: hgtrnp735) |');
  check('bản đầy đủ: mật khẩu do app sinh ghi vào bảng "Mất mật khẩu của" → từ chối',
    mkBangKhac !== md && loiKhiDoc(mkBangKhac, 'day-du') !== null);
  check('bản đầy đủ: ô giữ chỗ "*(như dòng đầu)*" và bảng "Mất mật khẩu của" không bị bắt nhầm',
    md.includes('*(như dòng đầu)*') && md.includes('| Mất mật khẩu của |') && loiKhiDoc(md, 'day-du') === null);
}

console.log('\n[5] Chạy bằng dòng lệnh');
{
  const ra = path.join(TAM, 'ra');
  const r = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'xuat-huong-dan-thu.js'), '--ra', ra],
    { cwd: GOC, encoding: 'utf8' });
  check('dựng xong, thoát mã 0', r.status === 0, r.stderr);
  const tep = fs.existsSync(ra) ? fs.readdirSync(ra).sort() : [];
  check('ra đúng hai tệp Word mang ngày của bản trong tên',
    tep.length === 2 && tep.every(t => /-\d{2}-\d{2}-\d{4}\.docx$/.test(t)), tep);

  const sai = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'xuat-huong-dan-thu.js'), '--chi', 'khong-co', '--ra', ra],
    { cwd: GOC, encoding: 'utf8' });
  check('chọn bản không có → báo lỗi tiếng Việt, thoát mã khác 0',
    sai.status !== 0 && /Không dựng được file Word/.test(sai.stderr), sai.stderr);

  const raSoat = path.join(TAM, 'chi-soat');
  const soat = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'xuat-huong-dan-thu.js'), '--kiem-tra', '--ra', raSoat],
    { cwd: GOC, encoding: 'utf8' });
  check('--kiem-tra: soát cả hai tệp, thoát mã 0, không ghi tệp nào',
    soat.status === 0 && (soat.stdout.match(/✓/g) || []).length === 2 && !fs.existsSync(raSoat), soat.stdout + soat.stderr);

  // Thư mục ra mặc định nằm trong kho mã: phải bị git bỏ qua, không thì một lần
  // "git add ." là file Word dựng ra lên kho.
  const bq = spawnSync('git', ['check-ignore', '-q', 'ban-word/thu.docx'], { cwd: GOC });
  check('thư mục ra mặc định ban-word/ bị git bỏ qua', bq.status === 0, bq.status);
}

donThuMucTam(TAM);
tongKet();
