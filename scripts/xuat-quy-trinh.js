#!/usr/bin/env node
// Sinh tài liệu QUY TRÌNH TRIỂN KHAI ra tệp Word: docs/QUY-TRINH-TRIEN-KHAI.docx
//
//   npm run tai-lieu:quy-trinh
//
// VÌ SAO TÀI LIỆU LẠI LÀ MỘT SCRIPT
//
// Nhà trường cần một tệp Word để đọc, in và lưu hồ sơ — nhưng tệp Word thì
// không theo dõi thay đổi cùng mã nguồn được. Nên nguồn của tài liệu nằm ở đây
// (chữ) và ở docs/so-do-trien-khai*.svg (sơ đồ), cùng nằm trong kho mã: khi app
// đổi cách triển khai thì sửa các tệp nguồn này rồi chạy lệnh trên, bản Word
// mới sinh ra luôn khớp với phiên bản app hiện tại (tài liệu tự đóng dấu số
// phiên bản mã nguồn ở trang đầu).
//
// Tài liệu trình bày HAI phương án đặt máy chủ:
//   A — máy chủ tại trường (Windows + NSSM)
//   B — thuê VPS (Ubuntu + systemd + Caddy), máy trường chỉ giữ bản sao lưu
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
// 1. Vẽ các sơ đồ SVG thành ảnh PNG bằng trình duyệt của Playwright
// ---------------------------------------------------------------------------
async function veSoDo(tenTepSvg) {
  const { chromium } = require('playwright');
  const CHROMIUM = process.env.CHROMIUM_PATH
    || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const svg = fs.readFileSync(path.join(GOC, 'docs', tenTepSvg), 'utf8');
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
const hinh = (anh, ghiChu) => [
  new Paragraph({ spacing: { before: 120, after: 60 }, alignment: AlignmentType.CENTER,
    children: [new ImageRun({ data: anh, type: 'png', transformation: { width: 640, height: 417 } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new TextRun({ text: ghiChu, size: 18, italics: true, color: XAM })] }),
];

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
  const anhTruong = await veSoDo('so-do-trien-khai.svg');
  const anhVps = await veSoDo('so-do-trien-khai-vps.svg');
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
      children: [new TextRun({ text: 'Đưa sổ liên lạc điện tử vào sử dụng thật cho trường khoảng 300 học sinh — hai phương án: máy chủ tại trường hoặc thuê VPS', size: 26, color: XAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Sinh tự động từ kho mã — bản mã nguồn ${phienBan}, ngày ${homNay}`, size: 20, color: XAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
      children: [new TextRun({ text: 'Tạo lại tài liệu sau mỗi lần cập nhật app:  npm run tai-lieu:quy-trinh', size: 20, italics: true, color: XAM })] }),
    trang(),

    // ---------- Cách dùng + lộ trình ----------
    h1('Cách dùng tài liệu này'),
    p('Việc triển khai chia thành 7 giai đoạn, làm theo đúng thứ tự. Cuối mỗi giai đoạn có một bảng kiểm — ',
      { text: 'đánh dấu đủ mọi ô rồi mới sang giai đoạn sau. ', bold: true },
      'Các lệnh trong khung xám gõ mỗi lần một dòng: lệnh Windows gõ vào PowerShell tại thư mục app; lệnh VPS gõ trong phiên SSH.'),
    p({ text: 'Giai đoạn 2 và 3 là hai phương án đặt máy chủ — chỉ làm MỘT trong hai', bold: true },
      ' (chọn ở giai đoạn 1). Các giai đoạn còn lại dùng chung; chỗ nào hai phương án khác nhau, tài liệu đánh dấu rõ [A] / [B].'),
    bang(
      [{ ten: 'Giai đoạn', rong: 1200 }, { ten: 'Việc chính', rong: 5438 }, { ten: 'Thời lượng ước tính', rong: 3000 }],
      [
        ['1', 'Chọn phương án đặt máy chủ, chuẩn bị chung', '1 buổi bàn bạc'],
        ['2', '[A] Dựng máy chủ tại trường (Windows + NSSM)', 'nửa buổi — 1 buổi'],
        ['3', '[B] Thuê và dựng VPS (Ubuntu + systemd + Caddy)', '1 buổi'],
        ['4', 'An toàn dữ liệu: tài khoản, mật khẩu, sao lưu hằng đêm, pháp lý', '1 buổi + chờ ký giấy'],
        ['5', 'Nhập danh sách học sinh thật, in phiếu tài khoản', '1 buổi'],
        ['6', 'Tập huấn giáo viên, phát phiếu, cài app cho người dùng', '1–2 tuần đầu năm học'],
        ['7', 'Vận hành định kỳ: sao lưu, cập nhật, cuối năm học', 'lặp lại quanh năm'],
      ]),
    trang(),

    // ---------- GĐ 1: chọn phương án ----------
    h1('Giai đoạn 1 — Chọn phương án đặt máy chủ'),
    bang(
      [{ ten: 'Tiêu chí', rong: 2438 }, { ten: 'A — Máy chủ tại trường', rong: 3600 }, { ten: 'B — Thuê VPS', rong: 3600 }],
      [
        ['Chi phí', 'Không tốn thêm (tận dụng máy sẵn có)', '~100–200 nghìn/tháng + tên miền ~300–800 nghìn/năm'],
        ['Phụ huynh dùng 4G từ nhà', 'Không có sẵn — phải mở thêm đường Internet', 'Có ngay từ đầu, qua HTTPS'],
        ['Phụ thuộc điện, mạng của trường', 'Có — trường mất điện là app nghỉ', 'Không — VPS chạy 24/7 ở trung tâm dữ liệu'],
        ['Dữ liệu học sinh nằm ở đâu', 'Trong khuôn viên trường', 'Tại nhà cung cấp VPS — chọn máy chủ đặt ở Việt Nam, ghi rõ trong văn bản đồng ý của phụ huynh'],
        ['Kỹ năng cần có', 'Dùng Windows cơ bản', 'Biết vào máy chủ bằng SSH (tài liệu có sẵn lệnh từng bước)'],
        ['Vai trò của máy ở trường', 'Là máy chủ chính', 'Chỉ nhận bản sao lưu kéo về hằng đêm'],
      ]),
    p({ text: 'Khuyến nghị: ', bold: true },
      'muốn phụ huynh dùng qua 4G ngay từ đầu và không phụ thuộc điện/mạng của trường thì chọn B; app và mọi kiểm thử chạy tốt như nhau trên cả hai. Chuyển từ A sang B (hay ngược lại) sau này cũng được — dữ liệu chỉ là một thư mục, chép sang là chạy.'),
    p('Chuẩn bị chung cho cả hai phương án:'),
    bullet('Máy chủ luôn chạy Node.js đúng dòng 22 (LTS) — bản khác bị chặn ngay khi cài, kèm thông báo rõ.'),
    bullet('Thước đo trước khi cho dùng thật là bộ kiểm thử đi kèm: npm test phải xanh toàn bộ trên chính máy sẽ chạy app.'),
    bullet('Phương án B: chọn nhà cung cấp VPS có trung tâm dữ liệu tại Việt Nam (truy cập nhanh, thuận về pháp lý), cấu hình từ 1 vCPU / 1–2GB RAM / 20GB SSD, hệ điều hành Ubuntu LTS; mua thêm một tên miền và trỏ bản ghi A về địa chỉ IP của VPS.'),
    h2('Bảng kiểm giai đoạn 1'),
    oKiem('Đã chốt phương án:  A ☐   /   B ☐'),
    oKiem('[B] Đã thuê VPS (ghi IP: ______________) và có tên miền trỏ về IP đó'),
    oKiem('Đã phân công người phụ trách kỹ thuật: ______________________'),
    trang(),

    // ---------- Sơ đồ ----------
    h1('Sơ đồ triển khai tổng thể'),
    h2('Phương án A — máy chủ tại trường'),
    ...hinh(anhTruong, 'Mũi tên liền: hằng ngày, tự động. Mũi tên đứt: định kỳ / tùy chọn. Nguồn: docs/so-do-trien-khai.svg'),
    h2('Phương án B — thuê VPS, máy trường chỉ giữ bản sao lưu'),
    ...hinh(anhVps, 'Mũi tên liền: hằng ngày, tự động. Mũi tên đứt: định kỳ / khi có việc. Nguồn: docs/so-do-trien-khai-vps.svg'),
    p('Bốn ý chung cho cả hai sơ đồ:'),
    bullet('App luôn chạy bên trong một trình giám sát (NSSM trên Windows, systemd trên Linux): tự chạy khi bật máy, gặp sự cố thì tự bật lại sau vài giây.'),
    bullet('Dữ liệu luôn nằm NGOÀI thư mục mã nguồn (C:\\SchoolConnectData hoặc /var/lib/schoolconnect) — cập nhật app không bao giờ đụng tới dữ liệu.'),
    bullet('Đêm nào cũng tự sao lưu, và luôn có một bản nằm ở nơi thứ hai (phương án B: kéo về máy trường).'),
    bullet('GitHub chỉ giữ mã nguồn và bộ kiểm thử; cập nhật app theo nhịp: tải mã → chạy kiểm thử → xanh hết mới khởi động lại.'),
    trang(),

    // ---------- GĐ 2: Phương án A ----------
    h1('Giai đoạn 2 — [A] Dựng máy chủ tại trường'),
    p({ text: 'Chỉ làm giai đoạn này nếu đã chọn phương án A. ', bold: true }, 'Chọn B thì bỏ qua, sang thẳng giai đoạn 3.'),
    h2('2.1  Chọn máy và cài phần mềm nền'),
    bullet('Một máy Windows để cố định, chạy liên tục trong giờ làm việc (máy bàn văn phòng, 4GB RAM trở lên); nên có UPS.'),
    bullet('Đặt IP tĩnh cho máy (hoặc nhờ người quản lý router gán IP cố định) — để địa chỉ app không đổi.'),
    bullet('Cài Node.js dòng 22: tải tệp -x64.msi tại https://nodejs.org/dist/latest-v22.x/ ; cài Git for Windows: https://git-scm.com/download/win'),
    h2('2.2  Tải app và kiểm chứng toàn bộ'),
    ...lenh(
      'git clone https://github.com/pichu124/School C:\\Users\\Administrator\\School',
      'cd C:\\Users\\Administrator\\School',
      'npm install',
      'npm test                          # 629 bài, khoảng 3 phút',
      'npx playwright install chromium   # tải trình duyệt kiểm thử, chỉ lần đầu',
      'npm run test:giao-dien            # 131 bài trên trình duyệt thật',
    ),
    p('Mỗi bộ phải kết thúc bằng ', { text: 'PASS: …  FAIL: 0', font: 'Consolas' }, '. Có bài đỏ thì dừng lại xử lý trước.'),
    h2('2.3  Đưa dữ liệu ra ngoài thư mục mã nguồn'),
    p('Làm ĐÚNG thứ tự: tắt app trước khi chép, chép xong mới khởi động.'),
    ...lenh(
      'mkdir C:\\SchoolConnectData',
      'copy data\\school.db* C:\\SchoolConnectData\\',
      'xcopy data\\uploads  C:\\SchoolConnectData\\uploads  /E /I',
      'xcopy data\\backups  C:\\SchoolConnectData\\backups  /E /I',
    ),
    chuY('Không đặt C:\\SchoolConnectData trong vùng OneDrive/Google Drive đồng bộ — đồng bộ lúc app đang ghi có thể làm hỏng cơ sở dữ liệu.'),
    h2('2.4  Chạy như dịch vụ Windows bằng NSSM'),
    p('Tải nssm.exe tại nssm.cc, chép vào C:\\nssm\\, rồi chạy PowerShell quyền Administrator:'),
    ...lenh(
      'C:\\nssm\\nssm.exe install SchoolConnect "C:\\Program Files\\nodejs\\node.exe" server.js',
      'C:\\nssm\\nssm.exe set SchoolConnect AppDirectory "C:\\Users\\Administrator\\School"',
      'C:\\nssm\\nssm.exe set SchoolConnect AppEnvironmentExtra DATA_DIR=C:\\SchoolConnectData NODE_ENV=production',
      'C:\\nssm\\nssm.exe start SchoolConnect',
      'New-NetFirewallRule -DisplayName "SchoolConnect" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow',
    ),
    h2('2.5  (Tùy chọn) Cho phụ huynh dùng 4G khi máy chủ vẫn ở trường'),
    p('Cách nhanh nhất là một đường hầm HTTPS: ', { text: 'npx cloudflared tunnel --url http://localhost:3000', font: 'Consolas', size: 19 },
      ' (địa chỉ đổi mỗi lần chạy; bản có tài khoản Cloudflare thì cố định được). Nếu nhu cầu 4G là quan trọng, cân nhắc chuyển hẳn sang phương án B — ổn định và đơn giản hơn về lâu dài.'),
    h2('Bảng kiểm giai đoạn 2 [A]'),
    oKiem('npm test 629 bài + test:giao-dien 131 bài đều đạt trên chính máy này'),
    oKiem('Dữ liệu đã ở C:\\SchoolConnectData (log ghi đúng đường dẫn, hết cảnh báo)'),
    oKiem('Restart Windows xong app tự chạy; điện thoại cùng Wi-Fi vào được qua IP'),
    oKiem('Thư mục data cũ đã đổi tên thành data-cu (xóa hẳn sau 1 tuần yên ổn)'),
    trang(),

    // ---------- GĐ 3: Phương án B ----------
    h1('Giai đoạn 3 — [B] Thuê và dựng VPS'),
    p({ text: 'Chỉ làm giai đoạn này nếu đã chọn phương án B.', bold: true },
      ' Mọi lệnh dưới đây gõ trong phiên SSH trên VPS (Ubuntu LTS). Từ máy Windows, mở PowerShell và gõ: ',
      { text: 'ssh root@<IP-VPS>', font: 'Consolas', size: 19 }, ' (mật khẩu do nhà cung cấp phát khi thuê).'),
    h2('3.1  Cài phần mềm nền trên VPS'),
    ...lenh(
      'apt update && apt -y upgrade',
      'timedatectl set-timezone Asia/Ho_Chi_Minh    # đừng bỏ qua dòng này',
      'curl -fsSL https://deb.nodesource.com/setup_22.x | bash -',
      'apt -y install nodejs git',
      'node --version        # phải in ra v22.x',
    ),
    p({ text: 'Vì sao phải đặt múi giờ: ', bold: true },
      'VPS mới cài luôn chạy giờ UTC, chậm hơn Việt Nam 7 tiếng. Bỏ qua dòng đó thì lịch sao lưu ',
      { text: '"2 giờ sáng"', bold: true }, ' ở mục 4.2 sẽ chạy vào ',
      { text: '9 giờ sáng', bold: true },
      ' — đúng lúc giáo viên điểm danh và phụ huynh mở app — và mọi dấu thời gian trong nhật ký đều lệch 7 tiếng, rất khó tra khi có sự cố. Kiểm tra lại bằng lệnh ',
      { text: 'date', font: 'Consolas', size: 19 }, ', phải in ra giờ Việt Nam.'),
    h2('3.2  Tải app và kiểm chứng'),
    ...lenh(
      'git clone https://github.com/pichu124/School /opt/schoolconnect',
      'cd /opt/schoolconnect',
      'npm install',
      'npm test              # 629 bài — phải PASS toàn bộ, FAIL: 0',
    ),
    p('Bộ giao diện 131 bài cần trình duyệt — không cần chạy trên VPS; chạy trên máy cá nhân của người phụ trách là đủ.'),
    h2('3.3  Chạy như dịch vụ systemd'),
    p('Tạo tệp /etc/systemd/system/schoolconnect.service (dùng lệnh nano tên-tệp để soạn) với nội dung:'),
    ...lenh(
      '[Unit]', 'Description=SchoolConnect', 'After=network.target', '',
      '[Service]', 'WorkingDirectory=/opt/schoolconnect', 'ExecStart=/usr/bin/node server.js',
      'Restart=always', 'RestartSec=3',
      'Environment=DATA_DIR=/var/lib/schoolconnect', 'Environment=NODE_ENV=production', 'Environment=FORCE_HTTPS=1', '',
      '[Install]', 'WantedBy=multi-user.target',
    ),
    p('Rồi bật lên và kiểm tra:'),
    ...lenh(
      'mkdir -p /var/lib/schoolconnect',
      'systemctl enable --now schoolconnect',
      'curl http://localhost:3000/healthz     # phải trả về {"ok":true,...}',
    ),
    h2('3.4  HTTPS bằng Caddy và tên miền'),
    p('Caddy nhận tên miền của trường, tự xin và tự gia hạn chứng chỉ HTTPS — không phải làm gì thêm về sau. Cài theo hướng dẫn chính thức:'),
    ...lenh(
      'apt -y install debian-keyring debian-archive-keyring apt-transport-https curl',
      "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg",
      "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list",
      'apt update && apt -y install caddy',
    ),
    p('Mở tệp /etc/caddy/Caddyfile, xóa nội dung mẫu và thay bằng đúng ba dòng (đổi tên miền thành của trường):'),
    ...lenh('lienlac.truong-cua-ban.vn {', '    reverse_proxy localhost:3000', '}'),
    ...lenh('systemctl reload caddy'),
    p('Chờ khoảng một phút rồi mở https://lienlac.truong-cua-ban.vn từ điện thoại dùng 4G — phải thấy màn hình đăng nhập kèm ổ khóa.'),
    h2('3.5  Khóa cửa VPS'),
    ...lenh(
      'ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable',
      'apt -y install unattended-upgrades     # hệ điều hành tự vá bảo mật',
    ),
    p('KHÔNG mở cổng 3000 ra ngoài — Caddy nói chuyện với app trong nội bộ VPS. Và chuyển SSH sang đăng nhập bằng khóa thay vì mật khẩu: trên máy Windows chạy ',
      { text: 'ssh-keygen', font: 'Consolas', size: 19 }, ' (Enter liên tục), chép nội dung tệp ',
      { text: 'C:\\Users\\<tên>\\.ssh\\id_ed25519.pub', font: 'Consolas', size: 19 }, ' vào tệp ',
      { text: '~/.ssh/authorized_keys', font: 'Consolas', size: 19 },
      ' trên VPS, thử đăng nhập lại không cần mật khẩu, rồi tắt đăng nhập bằng mật khẩu (PasswordAuthentication no trong /etc/ssh/sshd_config, sau đó systemctl restart ssh).'),
    h2('Bảng kiểm giai đoạn 3 [B]'),
    oKiem('npm test 629 bài đạt toàn bộ trên VPS'),
    oKiem('systemctl status schoolconnect báo active (running); reboot VPS xong app tự chạy lại'),
    oKiem('https://tên-miền mở được từ 4G, có ổ khóa trình duyệt'),
    oKiem('ufw đã bật, chỉ mở 22/80/443; SSH đăng nhập bằng khóa, đã tắt mật khẩu'),
    trang(),

    // ---------- GĐ 4 ----------
    h1('Giai đoạn 4 — An toàn dữ liệu và pháp lý'),
    h2('4.1  Tài khoản quản trị và mật khẩu'),
    ...lenh('npm run create-admin "Nguyễn Văn Hiệu" hieutruong     # [B] chạy trong SSH, tại /opt/schoolconnect'),
    p('Lệnh in ra mật khẩu tạm — đăng nhập ngay và đặt mật khẩu riêng (app tự bắt buộc). Sau đó ',
      { text: 'đổi mật khẩu cả 8 tài khoản mẫu', bold: true },
      ' (phuhuynh, phuhuynh2, ph.tuan, ph.lan, ph.minh, ph.huong, giaovien, giaovien2) — tất cả đang dùng chung "123456". App chạy production sẽ tự cảnh báo trong log nếu còn sót. Học sinh mẫu (8 em, tên giả): sau khi nhập danh sách thật, vào Quản trị → Học sinh và cho từng em "nghỉ học" để ẩn đi.'),
    h2('4.2  Sao lưu hằng đêm'),
    p({ text: '[A] Máy chủ tại trường: ', bold: true }, 'tạo tệp sao-luu.bat trong thư mục app rồi hẹn giờ Windows:'),
    ...lenh(
      '@echo off', 'cd /d C:\\Users\\Administrator\\School', 'set DATA_DIR=C:\\SchoolConnectData', 'npm run backup',
    ),
    ...lenh('schtasks /Create /TN "SchoolConnect-SaoLuu" /SC DAILY /ST 02:00 /TR "C:\\Users\\Administrator\\School\\sao-luu.bat"'),
    p('Và mỗi tuần chép thư mục C:\\SchoolConnectData\\backups ra USB hoặc máy khác.'),
    p({ text: '[B] VPS: ', bold: true }, 'trên VPS chạy ', { text: 'crontab -e', font: 'Consolas', size: 19 }, ' và thêm dòng:'),
    ...lenh("0 2 * * * cd /opt/schoolconnect && DATA_DIR=/var/lib/schoolconnect npm run backup"),
    chuY('dòng trên chỉ đúng nếu VPS đã đặt múi giờ Việt Nam ở mục 3.1. VPS để nguyên giờ UTC thì '
      + '"2 giờ sáng" hóa ra 9 giờ sáng — đúng giờ giáo viên điểm danh. Kiểm bằng lệnh date trước khi đặt lịch.'),
    p('Rồi cho ', { text: 'máy ở trường làm kho dự phòng', bold: true },
      ' — vai trò duy nhất của nó trong phương án B: hằng đêm tự kéo thư mục sao lưu từ VPS về. Trên máy trường tạo keo-sao-luu.bat:'),
    ...lenh(
      '@echo off',
      'scp -r truong@<IP-VPS>:/var/lib/schoolconnect/backups C:\\SchoolConnectBackup\\',
    ),
    ...lenh('schtasks /Create /TN "SchoolConnect-KeoSaoLuu" /SC DAILY /ST 03:00 /TR "C:\\SchoolConnectBackup\\keo-sao-luu.bat"'),
    p('Kéo về (chứ không phải VPS đẩy tới) nên máy trường không cần mở cổng nào. Khi album ảnh nhiều làm mỗi đêm chép nặng, chuyển sang WinSCP ở chế độ đồng bộ — chỉ tải phần mới. Kết quả đạt nguyên tắc 3-2-1: bản chính trên VPS, bản sao trên VPS, bản kéo về trường.'),
    p('Thi thoảng kiểm tra bản sao lưu mở được thật: ', { text: 'npm run restore:check', font: 'Consolas', size: 19 }, ' (chi tiết và cách diễn tập khôi phục: docs/SAO-LUU.md).'),
    h2('4.3  Pháp lý — dữ liệu trẻ em dưới 16 tuổi'),
    p('Hồ sơ học sinh thuộc nhóm dữ liệu nhạy cảm theo Nghị định 13/2023/NĐ-CP. Trước khi nhập dữ liệu thật, trường cần văn bản phụ huynh đồng ý, nêu rõ: dữ liệu gì được lưu, dùng vào việc gì, ',
      { text: 'lưu ở đâu (phương án B phải ghi rõ: trên máy chủ thuê của nhà cung cấp X đặt tại Việt Nam, bản dự phòng tại trường)', bold: true },
      ', ai xem được, lưu bao lâu và cách yêu cầu xóa. Với phương án B, xem thêm điều khoản bảo mật/khả năng ký thỏa thuận xử lý dữ liệu của nhà cung cấp VPS. Nên tham khảo tư vấn pháp lý cho mẫu văn bản.'),
    h2('Bảng kiểm giai đoạn 4'),
    oKiem('Tài khoản quản trị riêng đã tạo, mật khẩu mạnh, cất nơi an toàn'),
    oKiem('8 tài khoản mẫu đã đổi hết mật khẩu (log không còn cảnh báo)'),
    oKiem('Sao lưu 02:00 đã chạy thử thật ít nhất 1 lần, restore:check báo tốt'),
    oKiem('[B] Máy trường đã kéo được bản sao lưu đầu tiên về C:\\SchoolConnectBackup'),
    oKiem('Văn bản đồng ý của phụ huynh đã duyệt, có ghi nơi lưu dữ liệu'),
    trang(),

    // ---------- GĐ 5 ----------
    h1('Giai đoạn 5 — Nhập danh sách học sinh thật'),
    bullet('Đăng nhập quản trị → Quản trị → Nhập danh sách → tải tệp CSV mẫu (mở đúng tiếng Việt trong Excel).'),
    bullet('Điền danh sách: mỗi dòng một học sinh kèm lớp, họ tên và số điện thoại phụ huynh. Hai anh em chung phụ huynh sẽ tự gộp về một tài khoản.'),
    bullet('Bấm Xem trước — app liệt kê mọi dòng lỗi và CHƯA ghi gì cả. Sửa trong Excel tới khi hết lỗi.'),
    bullet('Bấm Nhập — app tạo học sinh, lớp còn thiếu, tài khoản phụ huynh kèm mật khẩu ban đầu, và trả về phiếu tài khoản để in phát từng nhà.'),
    bullet('Ai đăng nhập lần đầu cũng bị buộc đổi mật khẩu ngay.'),
    p({ text: 'Trường không dùng hết tính năng? ', bold: true },
      'Quản trị → Tính năng: tắt phân hệ chưa cần. Tắt là API bị chặn thật, dữ liệu giữ nguyên, bật lại lúc nào cũng được.'),
    h2('Bảng kiểm giai đoạn 5'),
    oKiem('Nhập xong không còn dòng lỗi; sĩ số trong app khớp sổ của trường'),
    oKiem('Phiếu tài khoản đã in, niêm phong theo lớp'),
    oKiem('Học sinh mẫu đã cho nghỉ học; phân hệ chưa dùng đã tắt'),
    oKiem('Sao lưu tay 1 bản ngay sau khi nhập xong: npm run backup'),

    // ---------- GĐ 6 ----------
    h1('Giai đoạn 6 — Đưa đến tay giáo viên và phụ huynh'),
    p('Địa chỉ in lên phiếu và hướng dẫn: phương án A là ', { text: 'http://<IP máy chủ>:3000', font: 'Consolas', size: 19 },
      ' (dùng trong Wi-Fi trường); phương án B là ', { text: 'https://tên-miền-của-trường', font: 'Consolas', size: 19 }, ' (dùng ở mọi nơi).'),
    h2('6.1  Tập huấn giáo viên (1 buổi)'),
    bullet('Cài app vào màn hình chính điện thoại (bảng dưới), đăng nhập, đổi mật khẩu.'),
    bullet('Thao tác hằng ngày: điểm danh cả lớp một chạm; viết nhận xét; duyệt đơn xin phép; xác nhận dặn thuốc; đăng album ảnh.'),
    bullet('Cấp lại mật khẩu khi phụ huynh lớp mình quên — ngay trong app, không cần gọi quản trị.'),
    h2('6.2  Hướng dẫn cài app (in kèm phiếu tài khoản)'),
    bang(
      [{ ten: 'Thiết bị', rong: 2400 }, { ten: 'Cách cài', rong: 7238 }],
      [
        ['Android (Chrome)', 'Mở địa chỉ app → menu ⋮ → "Thêm vào Màn hình chính" / "Cài đặt ứng dụng"'],
        ['iPhone/iPad (Safari)', 'Mở địa chỉ app → nút Chia sẻ (ô vuông mũi tên) → "Thêm vào MH chính"'],
      ]),
    h2('6.3  Tuần đầu tiên'),
    bullet('Chạy song song với cách cũ (sổ giấy/Zalo) trong 1–2 tuần; chọn 1–2 lớp làm trước nếu muốn thận trọng.'),
    bullet('Cử một đầu mối hỗ trợ nhận câu hỏi qua nhóm giáo viên; cuối tuần xem Quản trị → Nhật ký để biết mức dùng thật.'),
    h2('Bảng kiểm giai đoạn 6'),
    oKiem('100% giáo viên chủ nhiệm đã đăng nhập và điểm danh thử'),
    oKiem('Phiếu tài khoản + hướng dẫn cài đã phát đến từng nhà'),
    oKiem('Có đầu mối hỗ trợ; giáo viên biết tự cấp lại mật khẩu cho phụ huynh'),
    trang(),

    // ---------- GĐ 7 ----------
    h1('Giai đoạn 7 — Vận hành định kỳ'),
    bang(
      [{ ten: 'Nhịp', rong: 1900 }, { ten: 'Việc', rong: 7738 }],
      [
        ['Hằng ngày', 'Không phải làm gì — điểm danh, sao lưu, hồi phục sự cố đều tự động.'],
        ['Hằng tuần', '[A] Chép backups ra USB/máy khác. [B] Liếc C:\\SchoolConnectBackup xem bản kéo về đêm qua có mới không. Thi thoảng npm run restore:check.'],
        ['Khi có bản cập nhật', '[A] Tại máy trường / [B] ssh vào VPS rồi: git pull → npm test → xanh hết mới khởi động lại ([A] nssm restart SchoolConnect · [B] systemctl restart schoolconnect). Bài đỏ thì DỪNG — app đang chạy vẫn là bản cũ tốt.'],
        ['Hằng tháng [B]', 'Kiểm tra hạn thuê VPS và hạn tên miền — đặt nhắc tự gia hạn, đứt hạn là app nghỉ.'],
        ['Cuối năm học', 'npm run backup trước, rồi Quản trị → Năm học: lên lớp hàng loạt, khối cuối ra trường, dữ liệu năm cũ giữ để tra cứu.'],
        ['Đầu năm học mới', 'Nhập danh sách khối mới (lặp giai đoạn 5), phân công lại giáo viên chủ nhiệm.'],
        ['Trước 04/2027', 'Node 22 hết hỗ trợ — xem lịch hẹn nâng cấp trong docs/TIEN-DO.md (mục B8.7).'],
      ]),
    h2('Sự cố thường gặp'),
    bang(
      [{ ten: 'Hiện tượng', rong: 3400 }, { ten: 'Xử lý', rong: 6238 }],
      [
        ['App không mở được [A]', 'services.msc → SchoolConnect → Start; xem log dịch vụ.'],
        ['App không mở được [B]', 'ssh vào VPS: systemctl status schoolconnect · xem log: journalctl -u schoolconnect -n 50. VPS không vào được SSH: dùng trang quản lý của nhà cung cấp để khởi động lại VPS.'],
        ['Ổ khóa HTTPS mất / báo hết hạn [B]', 'systemctl status caddy; kiểm tra tên miền còn trỏ đúng IP và còn hạn.'],
        ['Phụ huynh quên mật khẩu', 'Giáo viên chủ nhiệm cấp lại ngay trong app.'],
        ['Quên mật khẩu quản trị', 'Chạy npm run create-admin tạo tài khoản quản trị mới.'],
        ['Nghi dữ liệu hỏng / xóa nhầm', 'ĐỪNG thao tác thêm. Tắt dịch vụ, dùng npm run restore theo docs/SAO-LUU.md quay về bản sao lưu gần nhất.'],
        ['Mất hẳn máy chủ', '[A] Dựng máy mới theo GĐ2, chép dữ liệu từ bản sao ngoài vào. [B] Thuê VPS mới theo GĐ3, tải bản sao lưu từ máy trường lên /var/lib/schoolconnect, systemctl start — đây chính là lý do máy trường giữ kho dự phòng.'],
      ]),

    // ---------- Phụ lục ----------
    h1('Phụ lục — Tra cứu nhanh'),
    bang(
      [{ ten: 'Việc', rong: 4400 }, { ten: 'Lệnh / nơi xem', rong: 5238 }],
      [
        ['Chạy đủ kiểm thử', 'npm test  ·  npm run test:giao-dien'],
        ['Sao lưu ngay / xem danh sách / kiểm tra', 'npm run backup  ·  backup:list  ·  restore:check'],
        ['Khởi động lại app', '[A] nssm restart SchoolConnect  ·  [B] systemctl restart schoolconnect'],
        ['Xem app đang chạy không, xem log', '[A] services.msc  ·  [B] systemctl status schoolconnect · journalctl -u schoolconnect -f'],
        ['Tạo tài khoản quản trị', 'npm run create-admin "Họ Tên" tendangnhap'],
        ['Bật/tắt tính năng, xem nhật ký', 'trong app: Quản trị → Tính năng / Nhật ký'],
        ['Hướng dẫn chi tiết từng mảng', 'README.md · docs/SAO-LUU.md · modules/README.md (viết tính năng mới)'],
        ['Sổ tiến độ và các mốc hẹn', 'docs/TIEN-DO.md'],
        ['Tạo lại chính tài liệu này', 'npm run tai-lieu:quy-trinh (nguồn: scripts/xuat-quy-trinh.js + docs/so-do-trien-khai*.svg)'],
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
