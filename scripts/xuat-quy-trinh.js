#!/usr/bin/env node
// Sinh tài liệu QUY TRÌNH TRIỂN KHAI ra tệp Word: docs/QUY-TRINH-TRIEN-KHAI.docx
//
//   npm run tai-lieu:quy-trinh
//
// VÌ SAO TÀI LIỆU LẠI LÀ MỘT SCRIPT
//
// Nhà trường cần một tệp Word để đọc, in và lưu hồ sơ — nhưng tệp Word thì
// không theo dõi thay đổi cùng mã nguồn được. Nên nguồn của tài liệu nằm ở đây
// (chữ) và ở docs/so-do-trien-khai.svg (sơ đồ), cùng nằm trong kho mã: khi app
// đổi cách triển khai thì sửa hai tệp nguồn này rồi chạy lệnh trên, bản Word
// mới sinh ra luôn khớp với phiên bản app hiện tại (tài liệu tự đóng dấu số
// phiên bản mã nguồn ở trang đầu).
//
// Cần: thư viện `docx` (đã nằm trong devDependencies) và trình duyệt Playwright
// (dùng để vẽ sơ đồ SVG thành ảnh — cùng trình duyệt của bộ kiểm thử giao diện).
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GOC = path.join(__dirname, '..');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  LevelFormat, ShadingType, PageBreak,
} = require('docx');

// ---------------------------------------------------------------------------
// 1. Vẽ sơ đồ SVG thành ảnh PNG bằng trình duyệt của Playwright
// ---------------------------------------------------------------------------
async function veSoDo() {
  const { chromium } = require('playwright');
  const CHROMIUM = process.env.CHROMIUM_PATH
    || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const svg = fs.readFileSync(path.join(GOC, 'docs', 'so-do-trien-khai.svg'), 'utf8');
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  await page.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
  const anh = await page.locator('svg').screenshot({ type: 'png' });
  await browser.close();
  return anh;
}

// ---------------------------------------------------------------------------
// 2. Các hàm dựng đoạn văn — để phần nội dung bên dưới đọc như văn bản thường
// ---------------------------------------------------------------------------
const XANH_DAM = '1E3A8A', XAM = '475569', DO = '9F1239', NEN_MA = 'F1F5F9', NEN_BANG = 'EEF2FF';

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: t, color: XANH_DAM })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 }, children: [new TextRun({ text: t, color: XANH_DAM })] });
const p = (...runs) => new Paragraph({ spacing: { after: 120 }, children: runs.map(r => typeof r === 'string' ? new TextRun(r) : new TextRun(r)) });
const chuY = (t) => new Paragraph({
  spacing: { after: 140 }, indent: { left: 240 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: DO } },
  children: [new TextRun({ text: 'Lưu ý:  ', bold: true, color: DO }), new TextRun({ text: t })],
});
const bullet = (t) => new Paragraph({ numbering: { reference: 'cham', level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const oKiem = (t) => new Paragraph({ spacing: { after: 60 }, indent: { left: 240 }, children: [new TextRun({ text: '☐   ', bold: true }), new TextRun(t)] });
const lenh = (...dong) => dong.map(d => new Paragraph({
  shading: { type: ShadingType.CLEAR, fill: NEN_MA },
  spacing: { after: 20 }, indent: { left: 240 },
  children: [new TextRun({ text: d, font: 'Consolas', size: 19 })],
}));
const trang = () => new Paragraph({ children: [new PageBreak()] });

const RONG_BANG = 9638; // A4 trừ lề 2cm mỗi bên, tính bằng DXA
function bang(cot, hang) { // cot: [{ten, rong}], hang: [[ô, ...]]
  const vien = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const o = (noiDung, dau, rong) => new TableCell({
    width: { size: rong, type: WidthType.DXA },
    shading: dau ? { type: ShadingType.CLEAR, fill: NEN_BANG } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: vien, bottom: vien, left: vien, right: vien },
    children: [new Paragraph({ children: [new TextRun({ text: String(noiDung), bold: dau, size: 20 })] })],
  });
  return new Table({
    width: { size: RONG_BANG, type: WidthType.DXA },
    columnWidths: cot.map(c => c.rong),
    rows: [
      new TableRow({ tableHeader: true, children: cot.map(c => o(c.ten, true, c.rong)) }),
      ...hang.map(h => new TableRow({ children: h.map((v, i) => o(v, false, cot[i].rong)) })),
    ],
  });
}

// ---------------------------------------------------------------------------
// 3. Nội dung tài liệu
// ---------------------------------------------------------------------------
async function main() {
  const anhSoDo = await veSoDo();
  const phienBan = (() => {
    try { return execSync('git rev-parse --short HEAD', { cwd: GOC }).toString().trim(); }
    catch { return 'không rõ'; }
  })();
  const homNay = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const noiDung = [
    // ---------- Trang bìa ----------
    new Paragraph({ spacing: { before: 2200, after: 200 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'QUY TRÌNH TRIỂN KHAI SCHOOLCONNECT', bold: true, size: 52, color: XANH_DAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 },
      children: [new TextRun({ text: 'Đưa sổ liên lạc điện tử vào sử dụng thật cho trường khoảng 300 học sinh', size: 26, color: XAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Sinh tự động từ kho mã — bản mã nguồn ${phienBan}, ngày ${homNay}`, size: 20, color: XAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
      children: [new TextRun({ text: 'Tạo lại tài liệu sau mỗi lần cập nhật app:  npm run tai-lieu:quy-trinh', size: 20, italics: true, color: XAM })] }),
    trang(),

    // ---------- Cách dùng + lộ trình ----------
    h1('Cách dùng tài liệu này'),
    p('Tài liệu chia việc triển khai thành 7 giai đoạn, làm theo đúng thứ tự. Cuối mỗi giai đoạn có một bảng kiểm — ',
      { text: 'đánh dấu đủ mọi ô rồi mới sang giai đoạn sau. ', bold: true },
      'Các lệnh trong khung xám gõ vào PowerShell, mỗi lần một dòng, tại thư mục app (ví dụ C:\\Users\\Administrator\\School).'),
    p('Giai đoạn 1–5 hoàn toàn trong mạng nội bộ của trường, không phụ thuộc Internet ổn định hay tên miền. Giai đoạn 6 (mở ra Internet cho phụ huynh dùng 4G) là tùy chọn và làm sau cùng.'),
    bang(
      [{ ten: 'Giai đoạn', rong: 1200 }, { ten: 'Việc chính', rong: 5438 }, { ten: 'Thời lượng ước tính', rong: 3000 }],
      [
        ['1', 'Chuẩn bị máy chủ, cài phần mềm, chạy đủ kiểm thử', 'nửa buổi'],
        ['2', 'Cấu hình chạy thật: dữ liệu ra ngoài, chạy như dịch vụ Windows', 'nửa buổi'],
        ['3', 'An toàn dữ liệu: tài khoản, mật khẩu, sao lưu hằng đêm, pháp lý', '1 buổi + chờ ký giấy'],
        ['4', 'Nhập danh sách học sinh thật, in phiếu tài khoản', '1 buổi'],
        ['5', 'Tập huấn giáo viên, phát phiếu, cài app cho người dùng', '1–2 tuần đầu năm học'],
        ['6', '(Tùy chọn) Mở ra Internet cho phụ huynh dùng qua 4G', '1 buổi'],
        ['7', 'Vận hành định kỳ: sao lưu, cập nhật, cuối năm học', 'lặp lại quanh năm'],
      ]),

    h1('Sơ đồ triển khai tổng thể'),
    new Paragraph({ spacing: { before: 120, after: 60 }, alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: anhSoDo, type: 'png', transformation: { width: 640, height: 402 } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new TextRun({ text: 'Mũi tên liền: luồng hằng ngày, tự động. Mũi tên đứt: định kỳ / tùy chọn. Nguồn hình: docs/so-do-trien-khai.svg', size: 18, italics: true, color: XAM })] }),
    p('Đọc sơ đồ theo bốn ý chính:'),
    bullet('Trái trên — máy chủ của trường: app chạy bên trong dịch vụ Windows (NSSM) nên tự bật khi khởi động máy và tự hồi phục khi gặp sự cố; toàn bộ dữ liệu nằm ở C:\\SchoolConnectData, tách hẳn khỏi thư mục mã nguồn; đêm nào cũng tự sao lưu.'),
    bullet('Phải trên — người dùng trong trường kết nối qua Wi-Fi nội bộ tới địa chỉ IP của máy chủ; phụ huynh ở nhà chỉ dùng được khi đã làm giai đoạn 6.'),
    bullet('Phải dưới — GitHub chỉ giữ mã nguồn và bộ kiểm thử, có 4 lớp canh tự động để không bao giờ chứa dữ liệu học sinh.'),
    bullet('Trái dưới — cập nhật app luôn theo một nhịp ba bước: tải mã, chạy kiểm thử, xanh hết mới khởi động lại.'),
    trang(),

    // ---------- GĐ 1 ----------
    h1('Giai đoạn 1 — Chuẩn bị máy chủ'),
    h2('1.1  Chọn máy'),
    bullet('Một máy Windows để cố định tại trường, chạy liên tục trong giờ làm việc (máy bàn văn phòng là đủ; 4GB RAM trở lên).'),
    bullet('Cắm dây mạng hoặc Wi-Fi ổn định; nên có UPS hoặc ít nhất ổ cắm không bị rút nhầm.'),
    bullet('Đặt IP tĩnh cho máy này (hoặc nhờ người quản lý router "gán IP cố định theo địa chỉ máy") — để địa chỉ app không đổi mỗi lần mất điện.'),
    h2('1.2  Cài phần mềm nền'),
    bullet('Node.js đúng dòng 22 (LTS): tải tệp -x64.msi tại https://nodejs.org/dist/latest-v22.x/ — bản khác dòng 22 sẽ bị chặn ngay khi cài app, kèm thông báo rõ.'),
    bullet('Git for Windows: https://git-scm.com/download/win (cài mặc định, Next liên tục).'),
    h2('1.3  Tải app và kiểm chứng toàn bộ'),
    ...lenh(
      'git clone https://github.com/pichu124/School C:\\Users\\Administrator\\School',
      'cd C:\\Users\\Administrator\\School',
      'npm install',
      'npm test                          # 549 bài, khoảng 3 phút',
      'npx playwright install chromium   # tải trình duyệt kiểm thử, chỉ lần đầu',
      'npm run test:giao-dien            # 106 bài trên trình duyệt thật',
    ),
    p('Mỗi bộ kiểm thử phải kết thúc bằng dòng ', { text: 'PASS: …  FAIL: 0', font: 'Consolas' },
      '. Có bài đỏ thì dừng lại xử lý trước — không mang một hệ thống chưa xanh vào dùng thật.'),
    h2('Bảng kiểm giai đoạn 1'),
    oKiem('node --version in ra v22.x'),
    oKiem('npm test: toàn bộ 549 bài đạt trên chính máy này'),
    oKiem('npm run test:giao-dien: toàn bộ 106 bài đạt'),
    oKiem('Máy chủ đã có IP tĩnh, ghi lại địa chỉ: ______________________'),

    // ---------- GĐ 2 ----------
    h1('Giai đoạn 2 — Cấu hình chạy thật'),
    h2('2.1  Đưa dữ liệu ra ngoài thư mục mã nguồn'),
    p('Mặc định dữ liệu nằm trong thư mục app — tiện khi thử nhưng nguy hiểm khi dùng thật. Chuyển ra C:\\SchoolConnectData theo ĐÚNG thứ tự (tắt app trước khi chép, chép xong mới khởi động):'),
    ...lenh(
      'mkdir C:\\SchoolConnectData',
      'copy data\\school.db* C:\\SchoolConnectData\\',
      'xcopy data\\uploads  C:\\SchoolConnectData\\uploads  /E /I',
      'xcopy data\\backups  C:\\SchoolConnectData\\backups  /E /I',
    ),
    chuY('Không đặt C:\\SchoolConnectData trong vùng OneDrive/Google Drive đồng bộ — đồng bộ lúc app đang ghi có thể làm hỏng cơ sở dữ liệu.'),
    h2('2.2  Chạy như dịch vụ Windows bằng NSSM'),
    p('NSSM làm app tự chạy khi bật máy, tự bật lại trong vài giây khi gặp sự cố, không cần ai đăng nhập vào máy. Tải nssm.exe tại nssm.cc, chép vào C:\\nssm\\, rồi chạy PowerShell quyền Administrator:'),
    ...lenh(
      'C:\\nssm\\nssm.exe install SchoolConnect "C:\\Program Files\\nodejs\\node.exe" server.js',
      'C:\\nssm\\nssm.exe set SchoolConnect AppDirectory "C:\\Users\\Administrator\\School"',
      'C:\\nssm\\nssm.exe set SchoolConnect AppEnvironmentExtra DATA_DIR=C:\\SchoolConnectData NODE_ENV=production',
      'C:\\nssm\\nssm.exe start SchoolConnect',
    ),
    h2('2.3  Mở tường lửa cho máy khác trong trường truy cập'),
    ...lenh('New-NetFirewallRule -DisplayName "SchoolConnect" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow'),
    h2('2.4  Kiểm chứng'),
    bullet('Trên chính máy chủ mở http://localhost:3000 — thấy màn hình đăng nhập.'),
    bullet('Trên một điện thoại cùng Wi-Fi mở http://<IP máy chủ>:3000 — cũng vào được.'),
    bullet('Khởi động lại máy chủ (restart Windows) — không gõ gì cả, chờ máy lên là app tự chạy lại.'),
    bullet('Xem log của dịch vụ (services.msc → SchoolConnect) hoặc chạy tay một lần: dòng "Cơ sở dữ liệu:" phải trỏ vào C:\\SchoolConnectData\\school.db và KHÔNG còn cảnh báo dữ liệu nằm trong thư mục mã nguồn.'),
    h2('Bảng kiểm giai đoạn 2'),
    oKiem('Dữ liệu đã ở C:\\SchoolConnectData (log ghi đúng đường dẫn này)'),
    oKiem('Restart Windows xong app tự chạy, không cần đăng nhập'),
    oKiem('Điện thoại cùng Wi-Fi vào được app qua địa chỉ IP'),
    oKiem('Thư mục data cũ trong thư mục app đã đổi tên thành data-cu (xóa hẳn sau 1 tuần yên ổn)'),
    trang(),

    // ---------- GĐ 3 ----------
    h1('Giai đoạn 3 — An toàn dữ liệu và pháp lý'),
    h2('3.1  Tài khoản quản trị và mật khẩu'),
    ...lenh('npm run create-admin "Nguyễn Văn Hiệu" hieutruong'),
    p('Lệnh in ra mật khẩu tạm — đăng nhập ngay và đặt mật khẩu riêng (app sẽ tự bắt buộc). Sau đó ',
      { text: 'đổi mật khẩu cả 8 tài khoản mẫu', bold: true },
      ' (phuhuynh, phuhuynh2, ph.tuan, ph.lan, ph.minh, ph.huong, giaovien, giaovien2) — tất cả đang dùng chung "123456". Chạy với NODE_ENV=production, app sẽ tự cảnh báo trong log nếu còn sót tài khoản dùng mật khẩu mẫu.'),
    p('Học sinh mẫu (8 em, tên giả): sau khi nhập danh sách thật ở giai đoạn 4, vào Quản trị → Học sinh và cho từng em mẫu "nghỉ học" để ẩn khỏi danh sách hằng ngày.'),
    h2('3.2  Sao lưu tự động hằng đêm'),
    p('Tạo tệp sao-luu.bat trong thư mục app với nội dung:'),
    ...lenh('@echo off', 'cd /d C:\\Users\\Administrator\\School', 'set DATA_DIR=C:\\SchoolConnectData', 'npm run backup'),
    p('Rồi hẹn giờ chạy hằng đêm lúc 02:00 (PowerShell quyền Administrator):'),
    ...lenh('schtasks /Create /TN "SchoolConnect-SaoLuu" /SC DAILY /ST 02:00 /TR "C:\\Users\\Administrator\\School\\sao-luu.bat"'),
    p('Bản sao nằm ở C:\\SchoolConnectData\\backups, tự giữ vòng đời 7 ngày / 4 tuần / 12 tháng. ',
      { text: 'Mỗi tuần một lần', bold: true }, ', chép thư mục backups sang USB hoặc máy khác — sao lưu nằm cùng ổ đĩa với dữ liệu thì hỏng ổ là mất cả hai. Chi tiết và cách diễn tập khôi phục: docs/SAO-LUU.md.'),
    h2('3.3  Pháp lý — dữ liệu trẻ em dưới 16 tuổi'),
    p('Hồ sơ học sinh (họ tên, ngày sinh, sức khỏe, liên hệ phụ huynh) thuộc nhóm dữ liệu nhạy cảm theo Nghị định 13/2023/NĐ-CP. Trước khi nhập dữ liệu thật, trường cần có văn bản phụ huynh đồng ý, nêu rõ: dữ liệu gì được lưu, dùng vào việc gì, lưu ở đâu (máy chủ đặt tại trường), ai xem được (giáo viên chủ nhiệm và ban giám hiệu), lưu bao lâu và cách yêu cầu xóa. Nên tham khảo ý kiến tư vấn pháp lý cho mẫu văn bản này.'),
    h2('Bảng kiểm giai đoạn 3'),
    oKiem('Đã có tài khoản quản trị riêng, mật khẩu mạnh, ghi nơi an toàn'),
    oKiem('8 tài khoản mẫu đã đổi hết mật khẩu (log không còn cảnh báo)'),
    oKiem('Sao lưu 02:00 đã chạy thử ít nhất 1 lần (chạy tay sao-luu.bat và thấy tệp mới trong backups)'),
    oKiem('npm run restore:check báo bản sao lưu mới nhất mở được'),
    oKiem('Đã có lịch chép backups ra USB/máy khác hằng tuần, giao cho: ______________'),
    oKiem('Văn bản đồng ý của phụ huynh đã được duyệt'),

    // ---------- GĐ 4 ----------
    h1('Giai đoạn 4 — Nhập danh sách học sinh thật'),
    bullet('Đăng nhập quản trị → Quản trị → Nhập danh sách → tải tệp CSV mẫu (mở đúng tiếng Việt trong Excel).'),
    bullet('Điền danh sách: mỗi dòng một học sinh kèm lớp, họ tên và số điện thoại phụ huynh. Hai anh em chung một phụ huynh sẽ tự gộp về một tài khoản.'),
    bullet('Bấm Xem trước — app liệt kê mọi dòng lỗi (thiếu lớp, trùng mã, thiếu phụ huynh…) và CHƯA ghi gì cả. Sửa trong Excel tới khi hết lỗi.'),
    bullet('Bấm Nhập — app tạo học sinh, lớp còn thiếu, tài khoản phụ huynh kèm mật khẩu ban đầu, và trả về danh sách phiếu tài khoản để in phát từng nhà.'),
    bullet('Ai đăng nhập lần đầu cũng bị buộc đổi mật khẩu ngay — không ai dùng lâu mật khẩu in trên giấy.'),
    p({ text: 'Trường không dùng hết tính năng? ', bold: true },
      'Vào Quản trị → Tính năng và tắt phân hệ chưa cần (chưa có xe đưa đón thì tắt Xe buýt…). Tắt là API bị chặn thật và dữ liệu giữ nguyên, bật lại lúc nào cũng được.'),
    h2('Bảng kiểm giai đoạn 4'),
    oKiem('Nhập xong không còn dòng lỗi; sĩ số trong app khớp sổ của trường'),
    oKiem('Phiếu tài khoản đã in, niêm phong theo lớp'),
    oKiem('Học sinh mẫu đã cho nghỉ học (ẩn khỏi danh sách)'),
    oKiem('Đã tắt các phân hệ trường chưa dùng'),
    oKiem('Sao lưu tay 1 bản ngay sau khi nhập xong: npm run backup'),
    trang(),

    // ---------- GĐ 5 ----------
    h1('Giai đoạn 5 — Đưa đến tay giáo viên và phụ huynh'),
    h2('5.1  Tập huấn giáo viên (1 buổi)'),
    bullet('Cài app vào màn hình chính điện thoại (xem 5.2), đăng nhập, đổi mật khẩu.'),
    bullet('Thao tác hằng ngày: điểm danh cả lớp một chạm; viết nhận xét; duyệt đơn xin phép; xác nhận dặn thuốc; đăng album ảnh.'),
    bullet('Cấp lại mật khẩu khi phụ huynh lớp mình quên (trong app, không cần gọi quản trị).'),
    h2('5.2  Hướng dẫn cài app (in kèm phiếu tài khoản)'),
    bang(
      [{ ten: 'Thiết bị', rong: 2400 }, { ten: 'Cách cài', rong: 7238 }],
      [
        ['Android (Chrome)', 'Mở địa chỉ app → menu ⋮ → "Thêm vào Màn hình chính" / "Cài đặt ứng dụng"'],
        ['iPhone/iPad (Safari)', 'Mở địa chỉ app → nút Chia sẻ (ô vuông mũi tên) → "Thêm vào MH chính"'],
      ]),
    p('Sau khi cài, app có biểu tượng riêng, mở toàn màn hình như app tải từ cửa hàng.'),
    h2('5.3  Tuần đầu tiên'),
    bullet('Chạy song song với cách cũ (sổ giấy/Zalo) trong 1–2 tuần, chọn 1–2 lớp làm trước nếu muốn thận trọng.'),
    bullet('Cử một đầu mối hỗ trợ (thường là người quản trị) nhận câu hỏi qua nhóm giáo viên.'),
    bullet('Cuối tuần đầu: xem Quản trị → Nhật ký để biết mức độ sử dụng thật.'),
    h2('Bảng kiểm giai đoạn 5'),
    oKiem('100% giáo viên chủ nhiệm đã đăng nhập và điểm danh thử'),
    oKiem('Phiếu tài khoản + hướng dẫn cài đã phát đến từng nhà'),
    oKiem('Có đầu mối hỗ trợ, giáo viên biết cách tự cấp lại mật khẩu cho phụ huynh'),

    // ---------- GĐ 6 ----------
    h1('Giai đoạn 6 (tùy chọn) — Mở ra Internet cho phụ huynh dùng 4G'),
    p('Chưa làm giai đoạn này thì app vẫn đầy đủ trong Wi-Fi của trường. Làm khi trường muốn phụ huynh xem được từ nhà. ',
      { text: 'Điều kiện tiên quyết: đã xong giai đoạn 3 (đổi hết mật khẩu mẫu) và bắt buộc chạy qua HTTPS.', bold: true }),
    bang(
      [{ ten: 'Cách', rong: 2600 }, { ten: 'Phù hợp khi', rong: 4038 }, { ten: 'Ghi chú', rong: 3000 }],
      [
        ['Cloudflare Tunnel', 'Dùng thử nhanh, miễn phí', 'npx cloudflared tunnel --url http://localhost:3000 — địa chỉ đổi mỗi lần chạy; bản có tài khoản thì cố định được'],
        ['Render + Docker', 'Muốn chạy 24/7 không phụ thuộc máy ở trường', 'repo có sẵn Dockerfile và render.yaml; dữ liệu khi đó nằm trên cloud — cân nhắc điều khoản với phụ huynh'],
        ['VPS riêng', 'Trường có người quản trị hệ thống', 'Linux + systemd, hướng dẫn trong README'],
      ]),
    p('Khi đã có HTTPS, đặt thêm biến FORCE_HTTPS=1 (thêm vào dòng AppEnvironmentExtra của NSSM) để mọi truy cập HTTP tự chuyển sang HTTPS.'),
    h2('Bảng kiểm giai đoạn 6'),
    oKiem('Địa chỉ https:// mở được từ 4G, có ổ khóa trình duyệt'),
    oKiem('FORCE_HTTPS=1 đã bật'),
    oKiem('Đã báo địa chỉ mới cho phụ huynh (app cài lại theo địa chỉ mới)'),
    trang(),

    // ---------- GĐ 7 ----------
    h1('Giai đoạn 7 — Vận hành định kỳ'),
    bang(
      [{ ten: 'Nhịp', rong: 1900 }, { ten: 'Việc', rong: 7738 }],
      [
        ['Hằng ngày', 'Không phải làm gì — điểm danh, sao lưu, hồi phục sự cố đều tự động.'],
        ['Hằng tuần', 'Chép C:\\SchoolConnectData\\backups ra USB/máy khác. Thi thoảng chạy npm run restore:check.'],
        ['Khi có bản cập nhật', 'git pull → npm test → xanh hết mới nssm restart SchoolConnect. Bài đỏ thì DỪNG, app đang chạy vẫn là bản cũ tốt.'],
        ['Cuối năm học', 'npm run backup trước, rồi Quản trị → Năm học: lên lớp hàng loạt, khối cuối ra trường, dữ liệu năm cũ giữ để tra cứu.'],
        ['Đầu năm học mới', 'Nhập danh sách khối mới (lặp giai đoạn 4), phân công lại giáo viên chủ nhiệm.'],
        ['Trước 04/2027', 'Node 22 hết hỗ trợ — xem lịch hẹn nâng cấp trong docs/TIEN-DO.md (mục B8.7).'],
      ]),
    h2('Sự cố thường gặp'),
    bang(
      [{ ten: 'Hiện tượng', rong: 3400 }, { ten: 'Xử lý', rong: 6238 }],
      [
        ['App không mở được', 'services.msc → SchoolConnect → Start. Vẫn không được: xem log dịch vụ, gọi đầu mối kỹ thuật.'],
        ['Điện thoại không vào được, máy chủ vẫn chạy', 'Kiểm tra cùng Wi-Fi chưa; IP máy chủ có đổi không (nếu chưa đặt IP tĩnh); tường lửa cổng 3000.'],
        ['Phụ huynh quên mật khẩu', 'Giáo viên chủ nhiệm cấp lại ngay trong app — không cần tới quản trị.'],
        ['Quên mật khẩu quản trị', 'Chạy npm run create-admin tạo tài khoản quản trị mới.'],
        ['Nghi dữ liệu hỏng / xóa nhầm', 'ĐỪNG thao tác thêm. Tắt dịch vụ, dùng npm run restore theo docs/SAO-LUU.md để quay về bản sao lưu gần nhất.'],
        ['Máy chủ hỏng hẳn', 'Cài máy mới theo giai đoạn 1–2, chép C:\\SchoolConnectData từ bản sao lưu ngoài (USB/máy khác) vào, khởi động dịch vụ.'],
      ]),

    // ---------- Phụ lục ----------
    h1('Phụ lục — Tra cứu nhanh'),
    bang(
      [{ ten: 'Việc', rong: 4400 }, { ten: 'Lệnh / nơi xem', rong: 5238 }],
      [
        ['Chạy đủ kiểm thử', 'npm test  ·  npm run test:giao-dien'],
        ['Sao lưu ngay / xem danh sách / kiểm tra', 'npm run backup  ·  backup:list  ·  restore:check'],
        ['Khởi động lại app', 'nssm restart SchoolConnect'],
        ['Tạo tài khoản quản trị', 'npm run create-admin "Họ Tên" tendangnhap'],
        ['Bật/tắt tính năng, xem nhật ký', 'trong app: Quản trị → Tính năng / Nhật ký'],
        ['Hướng dẫn chi tiết từng mảng', 'README.md · docs/SAO-LUU.md · modules/README.md (viết tính năng mới)'],
        ['Sổ tiến độ và các mốc hẹn', 'docs/TIEN-DO.md'],
        ['Tạo lại chính tài liệu này', 'npm run tai-lieu:quy-trinh (nguồn: scripts/xuat-quy-trinh.js + docs/so-do-trien-khai.svg)'],
      ]),
  ];

  const doc = new Document({
    creator: 'SchoolConnect',
    title: 'Quy trình triển khai SchoolConnect',
    description: 'Sinh tự động từ kho mã bằng npm run tai-lieu:quy-trinh',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
    },
    numbering: {
      config: [{
        reference: 'cham',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 220 } } } }],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children: noiDung,
    }],
  });

  const ra = path.join(GOC, 'docs', 'QUY-TRINH-TRIEN-KHAI.docx');
  fs.writeFileSync(ra, await Packer.toBuffer(doc));
  console.log(`Đã sinh ${path.relative(GOC, ra)} (bản mã nguồn ${phienBan}).`);
}

main().catch(err => { console.error('Không sinh được tài liệu:', err); process.exit(1); });
