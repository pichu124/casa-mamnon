// Bài canh cho lệnh dựng file Word của hai hướng dẫn thử gửi trường
// (`scripts/xuat-huong-dan-thu.js`).
//
// Chạy bằng:  npm run test:xuat-huong-dan-thu
//
// VÌ SAO CẦN CANH
//
// `docs/HUONG-DAN-KIEM-THU.md` và `docs/HUONG-DAN-THU-NHANH.md` là bản chép của
// hai tài liệu trên claude.ai. Phần đầu mỗi tệp có ghi chú riêng của kho: đường
// dẫn bản chính, cách chép, câu cấm điền mật khẩu. File Word dựng từ hai tệp này
// thì đi thẳng tới cô, văn phòng và phụ huynh thử. Hai chỗ hỏng không ai thấy cho
// tới khi trường cầm giấy:
//
//   - ghi chú của kho lọt vào file Word;
//   - phụ đề in số việc cũ sau khi bản chính thêm hay bớt việc.
//
// Bài này dựng thật cả hai bản rồi soi chữ trong file Word, và cố tình làm lệch
// phụ đề để chắc lệnh dựng từ chối thật.
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

console.log('\n[4] Phụ đề lệch với bảng thì TỪ CHỐI dựng');
for (const khoa of Object.keys(xuat.HUONG_DAN)) {
  const md = docTep(khoa);
  const { donVi } = xuat.HUONG_DAN[khoa];
  const dongPhuDe = md.split('\n').find((l, i) => i > 0 && l.trim());
  const so = Number(dongPhuDe.match(new RegExp(`(\\d+)\\s+${donVi}`))[1]);

  const thuaMot = md.replace(dongPhuDe, dongPhuDe.replace(`${so} ${donVi}`, `${so + 1} ${donVi}`));
  const loiSo = loiKhiDoc(thuaMot, khoa);
  check(`${khoa}: phụ đề ghi ${so + 1} ${donVi} trong khi bảng có ${so} → từ chối`,
    loiSo !== null && loiSo.includes('phụ đề'), loiSo);

  const ngay = dongPhuDe.match(/\d{1,2}\/\d{1,2}\/\d{4}/)[0];
  const lechNgay = md.replace(dongPhuDe, dongPhuDe.replace(ngay, '01/01/2020'));
  const loiNgay = loiKhiDoc(lechNgay, khoa);
  check(`${khoa}: ngày ở phụ đề khác ngày chép → từ chối`, loiNgay !== null && loiNgay.includes('ngày'), loiNgay);

  const khongNgayChep = md.replace(/Chép từ bản chính lần cuối/g, 'Đã chép');
  check(`${khoa}: thiếu dòng "Chép từ bản chính lần cuối" → từ chối`, loiKhiDoc(khongNgayChep, khoa) !== null);

  const khongMoc = md.split('\n').filter(l => !l.startsWith(xuat.HUONG_DAN[khoa].moc)).join('\n');
  check(`${khoa}: mất dòng mốc của thân → từ chối`, loiKhiDoc(khongMoc, khoa) !== null);
}

console.log('\n[5] Chạy bằng dòng lệnh');
{
  const ra = path.join(TAM, 'ra');
  const r = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'xuat-huong-dan-thu.js'), '--ra', ra],
    { cwd: GOC, encoding: 'utf8' });
  check('dựng xong, thoát mã 0', r.status === 0, r.stderr);
  const tep = fs.existsSync(ra) ? fs.readdirSync(ra).sort() : [];
  check('ra đúng hai tệp Word mang ngày chép trong tên',
    tep.length === 2 && tep.every(t => /-\d{2}-\d{2}-\d{4}\.docx$/.test(t)), tep);

  const sai = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'xuat-huong-dan-thu.js'), '--chi', 'khong-co', '--ra', ra],
    { cwd: GOC, encoding: 'utf8' });
  check('chọn bản không có → báo lỗi tiếng Việt, thoát mã khác 0',
    sai.status !== 0 && /Không dựng được file Word/.test(sai.stderr), sai.stderr);

  // Thư mục ra mặc định nằm trong kho mã: phải bị git bỏ qua, không thì một lần
  // "git add ." là file Word dựng ra lên kho.
  const bq = spawnSync('git', ['check-ignore', '-q', 'ban-word/thu.docx'], { cwd: GOC });
  check('thư mục ra mặc định ban-word/ bị git bỏ qua', bq.status === 0, bq.status);
}

donThuMucTam(TAM);
tongKet();
