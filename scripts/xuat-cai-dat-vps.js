#!/usr/bin/env node
// Sinh tài liệu CÀI ĐẶT VPS TỪ A ĐẾN Z ra tệp Word: docs/CAI-DAT-VPS.docx
//
//   npm run tai-lieu:cai-dat-vps
//
// VÌ SAO LÀ MỘT SCRIPT CHỨ KHÔNG PHẢI MỘT TỆP WORD ĐỂ SẴN
//
// Cùng lý do đã ghi ở `scripts/xuat-quy-trinh.js`: tệp Word không theo dõi thay
// đổi cùng mã nguồn được. Nguồn nằm ở đây, trong kho mã; app đổi cách cài thì
// sửa tệp này rồi chạy lại lệnh trên, và bản Word mới luôn khớp với phiên bản
// app hiện tại — trang bìa tự đóng dấu mã commit và ngày sinh.
//
// VÌ SAO KHÔNG SỬA `xuat-quy-trinh.js` MÀ THÊM TỆP MỚI BÊN CẠNH
//
// `QUY-TRINH-TRIEN-KHAI.docx` là tài liệu của APP 1 (SchoolConnect, tiểu học),
// mang sang lúc tách kho và tự nó mở đầu bằng cảnh báo "đừng làm theo nguyên
// văn cho app 2". Nó trình bày HAI phương án (máy tại trường / VPS) cho một
// trường tiểu học ~300 học sinh. Tài liệu này thì khác hẳn: MỘT phương án duy
// nhất (VPS tại Việt Nam), viết cho CASA Mầm non, và viết cho người làm lần
// đầu. Trộn hai thứ vào một script là làm hỏng cả hai.
//
// Cần thư viện `docx` (đã nằm trong devDependencies). KHÔNG cần Playwright —
// tài liệu này không có sơ đồ, cố ý: người đang dựng máy chủ cần lệnh chép
// được, không cần hình.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GOC = path.join(__dirname, '..');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  LevelFormat, ShadingType, PageBreak,
} = require('docx');

// ---------------------------------------------------------------------------
// Hàm dựng đoạn — giữ ĐÚNG bộ màu và bộ hàm của `xuat-quy-trinh.js`, để hai
// tệp Word của cùng một dự án nhìn ra là một bộ.
// ---------------------------------------------------------------------------
const XANH_DAM = '1E3A8A', XAM = '475569', DO = '9F1239', XANH_LA = '166534';
const NEN_MA = 'F1F5F9', NEN_BANG = 'EEF2FF';

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: t, color: XANH_DAM })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 }, children: [new TextRun({ text: t, color: XANH_DAM })] });
const p = (...runs) => new Paragraph({ spacing: { after: 120 }, children: runs.map(r => typeof r === 'string' ? new TextRun(r) : new TextRun(r)) });
const chuY = (t) => new Paragraph({
  spacing: { after: 140 }, indent: { left: 240 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: DO } },
  children: [new TextRun({ text: 'Lưu ý:  ', bold: true, color: DO }), new TextRun({ text: t })],
});
const viSao = (t) => new Paragraph({
  spacing: { after: 140 }, indent: { left: 240 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: XANH_LA } },
  children: [new TextRun({ text: 'Vì sao:  ', bold: true, color: XANH_LA }), new TextRun({ text: t })],
});
const bullet = (t) => new Paragraph({ numbering: { reference: 'cham', level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const oKiem = (t) => new Paragraph({ spacing: { after: 60 }, indent: { left: 240 }, children: [new TextRun({ text: '☐   ', bold: true }), new TextRun(t)] });
const lenh = (...dong) => dong.map(d => new Paragraph({
  shading: { type: ShadingType.CLEAR, fill: NEN_MA },
  spacing: { after: 20 }, indent: { left: 240 },
  children: [new TextRun({ text: d, font: 'Consolas', size: 19 })],
}));
const trang = () => new Paragraph({ children: [new PageBreak()] });

const RONG_BANG = 9638;
function bang(cot, hang) {
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
// Vài con số ĐỌC THẲNG TỪ KHO MÃ, không gõ tay vào tài liệu.
//
// Gõ tay là cách chắc chắn để tài liệu lệch khỏi mã sau vài tháng — đúng cái
// bẫy mà `docs/TRIEN-KHAI.md` đã dính hai lần ở lời dặn "clone nhánh nào".
// ---------------------------------------------------------------------------
function doTuKhoMa() {
  const pkg = JSON.parse(fs.readFileSync(path.join(GOC, 'package.json'), 'utf8'));
  const sv = fs.readFileSync(path.join(GOC, 'server.js'), 'utf8');
  const cong = (sv.match(/process\.env\.PORT \|\| (\d+)/) || [])[1] || '3000';
  const nhanh = (() => {
    try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: GOC }).toString().trim(); }
    catch { return '(không rõ)'; }
  })();
  const dotMoiNhat = (() => {
    // DÒ NGƯỢC LÊN, không chỉ nhìn đúng dòng cuối. Dòng cuối có thể là một mục
    // không mang số đợt — và khi đó trang bìa in "(không rõ)" mà không ai để ý,
    // vì tài liệu vẫn sinh ra bình thường. Bản đầu của script này dính đúng vậy.
    try {
      const d = fs.readFileSync(path.join(GOC, 'docs', 'TIEN-DO.md'), 'utf8').trim().split('\n');
      for (let i = d.length - 1; i >= 0 && i > d.length - 40; i--) {
        const m = d[i].match(/\*\*(Đ\d+)/);
        if (m) return m[1];
      }
      return '(không rõ)';
    } catch { return '(không rõ)'; }
  })();
  return { node: (pkg.engines && pkg.engines.node) || '22.x', cong, nhanh, dotMoiNhat };
}

async function main() {
  const { node: NODE_YC, cong: CONG, dotMoiNhat: DOT } = doTuKhoMa();
  const phienBan = (() => {
    try { return execSync('git rev-parse --short HEAD', { cwd: GOC }).toString().trim(); }
    catch { return 'không rõ'; }
  })();
  const homNay = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const noiDung = [
    // ======================= TRANG BÌA =======================
    new Paragraph({ spacing: { before: 2200, after: 200 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'CÀI ĐẶT CASA MẦM NON LÊN VPS', bold: true, size: 52, color: XANH_DAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 },
      children: [new TextRun({ text: 'Hướng dẫn từ A đến Z cho người làm lần đầu — từ lúc mới thuê máy tới lúc trường bấm thử được', size: 26, color: XAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Sinh tự động từ kho mã — bản mã nguồn ${phienBan}, đợt ${DOT}, ngày ${homNay}`, size: 20, color: XAM })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
      children: [new TextRun({ text: 'Tạo lại tài liệu sau mỗi lần cập nhật app:  npm run tai-lieu:cai-dat-vps', size: 20, italics: true, color: XAM })] }),
    trang(),

    // ======================= ĐỌC TRƯỚC =======================
    h1('Đọc trước khi bắt đầu'),
    p('Tài liệu này viết cho ', { text: 'CASA Mầm non (app 2)', bold: true },
      ', và chỉ trình bày MỘT phương án: thuê VPS đặt tại Việt Nam, chạy Ubuntu. '
      + 'Làm từ trên xuống, không đảo thứ tự. Cuối mỗi bước có bảng kiểm — đánh dấu đủ rồi mới đi tiếp.'),
    p('Các lệnh trong khung xám gõ trong phiên SSH vào VPS, mỗi lần một dòng. '
      + 'Chỗ nào có dấu ngoặc nhọn như <tên miền của trường> thì thay bằng giá trị thật, bỏ luôn dấu ngoặc.'),
    chuY('Tệp docs/QUY-TRINH-TRIEN-KHAI.docx nằm cùng thư mục là tài liệu của APP 1 — '
      + 'trường tiểu học, và chính nó mở đầu bằng lời dặn đừng làm theo nguyên văn cho app này. '
      + 'Đừng lẫn hai tệp.'),

    h2('Hai điều nhà trường phải chốt trước, không phải việc kỹ thuật'),
    p({ text: '1. Máy chủ đặt tại Việt Nam. ', bold: true },
      'Dữ liệu ở app này là thông tin trẻ 12 tháng – 6 tuổi, kèm ảnh khuôn mặt và hồ sơ sức khoẻ — '
      + 'nhóm dữ liệu nhạy cảm theo Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15. '
      + 'Không phải vì luật cấm hẳn đặt máy ở nước ngoài, mà vì đặt ngoài thì kéo theo thủ tục chuyển dữ liệu '
      + 'xuyên biên giới — hồ sơ, đăng ký và trách nhiệm mà trường chưa làm, và không nên phải làm chỉ để chạy một sổ liên lạc.'),
    p({ text: '2. Tên miền và tài khoản VPS đứng tên trường, ', bold: true },
      'không phải tên cá nhân của ai. Người làm phần mềm nghỉ việc thì trường vẫn phải vào được máy chủ của mình.'),
    p('Chưa thuê máy thì xem ', { text: 'docs/XIN-BAO-GIA-VPS.md', bold: true },
      ' — có sẵn bản yêu cầu chép thẳng gửi nhà cung cấp, kèm mười câu phải hỏi rõ trong báo giá.'),

    h2('Cấu hình máy tối thiểu'),
    bang([{ ten: 'Thứ', rong: 3000 }, { ten: 'Tối thiểu', rong: 2400 }, { ten: 'Ghi chú', rong: 4238 }], [
      ['Hệ điều hành', 'Ubuntu 22.04 / 24.04', 'Bản LTS. Tài liệu này viết theo Ubuntu.'],
      ['RAM', '2 GB', '1 GB chạy được nhưng nén ảnh lúc đông sẽ chậm.'],
      ['CPU', '2 nhân', ''],
      ['Ổ đĩa', '100 GB trở lên', 'Ảnh mới là thứ chiếm chỗ. Xem bước 8 để tính.'],
      ['Node.js', NODE_YC, 'Bước 2 cài. Đừng dùng bản Node của Ubuntu — thường quá cũ.'],
      ['Tên miền', 'một tên, trỏ về IP máy', 'Bắt buộc, vì HTTPS bắt buộc. Xem bước 9.'],
    ]),
    viSao('Ổ đĩa để 100 GB không phải để dư. Bản kế hoạch dự trù 80–160 GB ảnh cho ba cơ sở, '
      + 'và bản sao lưu ảnh nằm cùng ổ nên phải cộng thêm phần của nó. Tính dung lượng theo con số ảnh, '
      + 'đừng theo dung lượng cơ sở dữ liệu — cơ sở dữ liệu chỉ vài chục MB.'),
    trang(),

    // ======================= BƯỚC 1 =======================
    h1('Bước 1 — Vào máy, đặt múi giờ, tạo người dùng riêng'),
    p('Nhà cung cấp gửi cho anh địa chỉ IP và cách đăng nhập. ',
      { text: 'Có hai kiểu, và chúng khác nhau ở bước tạo người dùng bên dưới', bold: true }, ':'),
    bullet('Cho thẳng tài khoản root — thường gặp ở VPS giá rẻ trong nước.'),
    bullet('Cho một tài khoản sẵn có (ubuntu, opc, debian…) có quyền sudo, và KHOÁ đăng nhập root. '
      + 'Oracle Cloud, AWS, Google Cloud đều thuộc nhóm này. Đây là cách làm an toàn hơn, không phải trục trặc.'),
    ...lenh(
      'ssh <tên-đăng-nhập>@<địa-chỉ-IP-của-máy>',
      '',
      'whoami                           # xem mình đang là ai — nhớ kết quả này'),
    p('Vào được rồi thì việc đầu tiên là ', { text: 'đặt múi giờ', bold: true }, ':'),
    ...lenh(
      'sudo timedatectl set-timezone Asia/Ho_Chi_Minh',
      'timedatectl                      # phải thấy "Asia/Ho_Chi_Minh (+07)"'),
    p('Dùng `sudo` kể cả khi đang là root — thừa một chữ thì không sao, thiếu thì lệnh bị từ chối. '
      + 'Lệnh `timedatectl` không có `set-timezone` chỉ để XEM nên không cần quyền gì.'),
    viSao('VPS thuê về gần như luôn đặt sẵn UTC, lệch giờ Việt Nam 7 tiếng. Để nguyên thì dòng lịch '
      + 'sao lưu "2 giờ sáng" ở bước 8 sẽ chạy lúc 9 giờ sáng — giữa lúc cô đang điểm danh và đăng ảnh, '
      + 'đúng lúc máy bận nhất. Và mọi dấu thời gian trong nhật ký lệch 7 tiếng, nên khi cần tra "ai đổi '
      + 'số tài khoản lúc mấy giờ" thì sổ không khớp với giờ người ta nhớ. Làm bước này TRƯỚC mọi thứ khác '
      + 'vì các bước sau đều đọc theo giờ của máy.'),
    p({ text: 'Nếu whoami in ra "root"', bold: true },
      ' — tạo một người dùng thường để chạy app:'),
    ...lenh(
      'adduser casa                     # đặt mật khẩu khi máy hỏi',
      'usermod -aG sudo casa',
      'su - casa                        # từ đây trở đi làm bằng tài khoản này',
      'whoami                           # phải in ra: casa'),
    p({ text: 'Nếu whoami in ra tên khác root', bold: true },
      ' (ubuntu, opc, debian…) — ',
      { text: 'BỎ QUA phần tạo người dùng, đi thẳng sang bước 2. ', bold: true },
      'Tài khoản ấy đã đúng là thứ bước này muốn tạo rồi: một người dùng thường có quyền sudo. '
      + 'Tạo thêm một tài khoản nữa chỉ là thêm một cái tên phải nhớ.'),
    chuY('Ở máy loại thứ hai, gõ `adduser casa` mà không có `sudo` sẽ báo '
      + '"Only root may add a user or group to the system". Đó là máy đang làm đúng, không phải hỏng. '
      + 'Muốn tạo thật thì thêm sudo: `sudo adduser casa`.'),
    viSao('App chạy bằng root thì một lỗi bất kỳ trong app cũng thành quyền root trên cả máy. '
      + 'Điều tài liệu này cần KHÔNG phải cái tên "casa" — mà là app không chạy bằng root. '
      + 'Tài khoản nào cũng được, miễn không phải root.'),
    p({ text: 'GHI LẠI TÊN TÀI KHOẢN NÀY. ', bold: true },
      'Bước 3 và bước 7 đều cần đúng cái tên đó. Tài liệu gọi nó là ',
      { text: '<tài-khoản-chạy-app>', bold: true }, '.'),
    h2('Bảng kiểm bước 1'),
    oKiem('SSH vào được máy'),
    oKiem('timedatectl in ra Asia/Ho_Chi_Minh (+07)'),
    oKiem('whoami in ra một tên KHÁC root, và đã ghi lại tên đó'),
    trang(),

    // ======================= BƯỚC 2 =======================
    h1('Bước 2 — Cài Node.js và git'),
    ...lenh(
      'sudo apt update',
      'sudo apt install -y git curl',
      '',
      '# Node 22 từ kho chính thức của NodeSource',
      'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -',
      'sudo apt install -y nodejs',
      '',
      'node -v                          # phải ra v22.x',
      'npm -v'),
    chuY('Đừng cài Node bằng `apt install nodejs` không thêm kho NodeSource. Bản Node của Ubuntu '
      + 'thường quá cũ, và app khai rõ cần ' + NODE_YC + ' trong package.json.'),
    h2('Bảng kiểm bước 2'),
    oKiem('node -v in ra v22'),
    oKiem('git --version chạy được'),
    trang(),

    // ======================= BƯỚC 3 =======================
    h1('Bước 3 — Tạo thư mục dữ liệu NGOÀI kho mã'),
    ...lenh(
      'sudo mkdir -p /var/lib/casa-mamnon',
      'sudo chown -R "$USER":"$USER" /var/lib/casa-mamnon',
      '',
      '',
      '# HAI phép kiểm, không phải một:',
      'ls -ld /var/lib/casa-mamnon      # cột chủ sở hữu phải là tài khoản của anh',
      'ls -la /var/lib/casa-mamnon      # và BÊN TRONG phải trống'),
    chuY('`sudo mkdir -p` KHÔNG báo lỗi khi thư mục đã tồn tại — nó im lặng bỏ qua. '
      + 'Nên nếu máy này từng được cài thử, dữ liệu của lần trước vẫn nằm nguyên trong đó và '
      + 'không có gì báo cho anh biết. Dấu hiệu đọc được ngay ở dòng `ls -ld`: cột thứ hai là '
      + '2 cộng số thư mục con, nên thư mục mới tinh phải là 2 — ra 4 hay hơn là bên trong đã có thứ gì đó. '
      + 'Ngày giờ ở cuối dòng cũng vậy: không phải hôm nay thì thư mục không phải vừa tạo.'),
    p({ text: 'Thấy có school.db, uploads/ hay backups/ bên trong thì DỪNG, đừng đi tiếp. ', bold: true },
      'Hai bước sau đổi hẳn ý nghĩa: `create-admin` ở bước 5 sẽ THÊM một tài khoản vào sổ cũ chứ không '
      + 'tạo mới từ đầu; và chốt chặn NODE_ENV=production chỉ dừng máy chủ khi cơ sở dữ liệu TRỐNG, nên '
      + 'có dữ liệu cũ là app bật lên chạy bằng dữ liệu lần thử trước mà không có gì báo.'),
    p('Muốn giữ lần cài cũ thì bỏ qua bước 5 và đăng nhập bằng tài khoản cũ. Muốn làm lại từ đầu thì '
      + 'dọn đi — nhưng ', { text: 'sao lưu trước đã', bold: true }, ', kể cả khi nghĩ trong đó chỉ có dữ liệu thử:'),
    ...lenh(
      '# Cất lần cài cũ sang một bên thay vì xoá — đổi tên là việc lấy lại được,',
      '# xoá thì không. Ổ đĩa thừa vài trăm MB không đáng để đánh đổi.',
      'sudo mv /var/lib/casa-mamnon /var/lib/casa-mamnon.cu-$(date +%F)',
      'sudo mkdir -p /var/lib/casa-mamnon',
      'sudo chown -R "$USER":"$USER" /var/lib/casa-mamnon',
      'ls -la /var/lib/casa-mamnon      # lần này phải trống thật'),
    p('`$USER` ở đây là ', { text: 'chính tài khoản anh đang đăng nhập', bold: true },
      ' — không cần gõ tên vào, máy tự điền. Nhờ vậy lệnh này đúng cho cả máy dùng root '
      + 'lẫn máy dùng ubuntu/opc.'),
    p('Từ đây trở đi ', { text: 'mọi lệnh của app đều chạy kèm DATA_DIR=/var/lib/casa-mamnon', bold: true },
      '. Không có nó thì app để dữ liệu ở ./data, tức ngay trong thư mục mã nguồn.'),
    viSao('Máy chủ thật cập nhật app bằng `git pull`. Dữ liệu nằm trong kho mã thì chỉ cần một lần '
      + '`git add -A` theo thói quen là ảnh khuôn mặt trẻ và hồ sơ sức khoẻ lên GitHub — lộ rồi thì viết lại '
      + 'lịch sử git cũng không thu lại được. App tự canh chỗ này: chạy với NODE_ENV=production mà dữ liệu vẫn '
      + 'nằm trong kho mã thì nó DỪNG trước khi mở cổng, và câu báo lỗi in ra sẵn lệnh cần chạy. '
      + 'Đó là hành vi ĐÚNG, không phải lỗi cần sửa.'),
    h2('Bảng kiểm bước 3'),
    oKiem('Thư mục /var/lib/casa-mamnon thuộc về tài khoản chạy app'),
    oKiem('ls -la cho thấy BÊN TRONG trống — hoặc đã chủ động quyết giữ lần cài cũ'),
    trang(),

    // ======================= BƯỚC 4 =======================
    h1('Bước 4 — Lấy mã về'),
    p({ text: 'Máy chủ chỉ cài nhánh main. ', bold: true },
      'Từ 07/10/2026 việc làm xong được đưa vào main bằng pull request (lần gần nhất: #2, Đ117 → Đ232b); '
      + 'nhánh làm việc là chỗ đang làm dở, không phải chỗ để cài. Đây là một LUẬT, không phải lời khẳng định '
      + '"main đã đầy đủ" — lời khẳng định ấy từng sai hai lần khi nhánh làm việc dài thêm. Nên vẫn đo trước khi cài.'),
    p('Xem main đang ở đợt nào (máy nào cũng được):'),
    ...lenh(
      'git clone <đường-dẫn-kho-mã> /tmp/soi && tail -1 /tmp/soi/docs/TIEN-DO.md | cut -c1-60',
      '# Thấp hơn đợt anh đang chờ thì việc mới CHƯA vào main: nhờ người phụ trách kho mã',
      '# gộp pull request trước. ĐỪNG cài nhánh làm việc lên máy chủ thật.',
      '',
      '# /opt thuộc về root, nên dọn chỗ và trao quyền TRƯỚC khi clone.',
      '# Thiếu hai dòng này thì git báo "Permission denied" hoặc',
      '# "could not create leading directories".',
      'sudo mkdir -p /opt/casa-mamnon',
      'sudo chown "$USER":"$USER" /opt/casa-mamnon',
      '',
      '# Lấy mã về từ main (nhánh mặc định).',
      '# Dấu chấm cuối là "clone vào đúng thư mục đang đứng", vì thư mục đã có sẵn.',
      'cd /opt/casa-mamnon',
      'git clone <đường-dẫn-kho-mã> .',
      'npm ci --omit=dev'),
    viSao('Clone vào /opt chứ không vào thư mục nhà (/home/ubuntu) là để app không biến mất '
      + 'nếu về sau ai đó xoá tài khoản người dùng ấy. Nhưng /opt thuộc root, nên phải trao quyền '
      + 'cho tài khoản chạy app trước — nếu không thì mọi lần `git pull` sau này cũng phải gõ sudo, '
      + 'và một thư mục mã do root sở hữu mà dịch vụ chạy bằng tài khoản thường là chỗ sinh lỗi quyền khó đọc.'),
    p('Kiểm ngay sau khi clone, một lệnh:'),
    ...lenh(
      'tail -1 docs/TIEN-DO.md | cut -c1-60',
      `# Phải thấy số đợt khớp với bản anh đang chờ. Bản sinh tài liệu này là đợt ${DOT}.`),
    chuY(`Tài liệu này sinh từ mã ở đợt ${DOT}. Số đợt ĐỔI THEO THỜI GIAN — luôn chạy lệnh kiểm `
      + 'ở trên thay vì tin con số in ở đây.'),
    h2('Bảng kiểm bước 4'),
    oKiem('npm ci chạy xong không lỗi'),
    oKiem('tail -1 docs/TIEN-DO.md in ra đúng đợt đang chờ'),
    trang(),

    // ======================= BƯỚC 5 =======================
    h1('Bước 5 — Tạo tài khoản quản trị (TRƯỚC khi bật dịch vụ)'),
    ...lenh(
      'cd /opt/casa-mamnon',
      'DATA_DIR=/var/lib/casa-mamnon npm run create-admin -- "<họ tên hiệu trưởng>" <tên-đăng-nhập>'),
    p('Lệnh in ra ', { text: 'một mật khẩu tạm, một lần duy nhất — chép lại ngay', bold: true },
      '. Lần đăng nhập đầu app sẽ bắt đổi mật khẩu.'),
    viSao('Với NODE_ENV=production, cơ sở dữ liệu trống thì máy chủ DỪNG có chủ ý thay vì tự sinh dữ liệu mẫu. '
      + 'Dữ liệu mẫu kèm 15 tài khoản dùng chung mật khẩu "123456"; sinh chúng ra trên một máy đang mở ra Internet '
      + 'là tự mở cửa cho người lạ. Vì vậy phải tạo tài khoản thật TRƯỚC, rồi mới bật dịch vụ.'),
    chuY('Đừng đi đường tắt "tạm bỏ NODE_ENV=production cho nó lên đã". Đó đúng là lúc 15 tài khoản '
      + 'mật khẩu 123456 được sinh ra trên một máy công khai.'),
    h2('Bảng kiểm bước 5'),
    oKiem('Đã chép lại mật khẩu tạm vào chỗ an toàn'),
    trang(),

    // ======================= BƯỚC 6 =======================
    h1('Bước 6 — Thử sao lưu và khôi phục, TRƯỚC khi có dữ liệu thật'),
    ...lenh(
      'DATA_DIR=/var/lib/casa-mamnon npm run backup',
      'DATA_DIR=/var/lib/casa-mamnon npm run backup:list',
      'DATA_DIR=/var/lib/casa-mamnon npm run restore:check'),
    viSao('Một bản sao chưa từng khôi phục thử là một bản sao chưa biết có dùng được không. '
      + 'Thử lúc này — khi máy còn trống — thì sai cũng không mất gì. Thử lần đầu vào ngày ổ đĩa hỏng '
      + 'là quá muộn để phát hiện bản sao không mở ra được.'),
    p('`restore.js` cố ý ', { text: 'từ chối chạy khi máy chủ đang chạy', bold: true },
      ' — khôi phục trong lúc máy chủ đang ghi là hỏng dữ liệu âm thầm. Ở bước này dịch vụ chưa bật nên không vướng.'),
    h2('Bảng kiểm bước 6'),
    oKiem('npm run backup sinh ra tệp, backup:list nhìn thấy nó'),
    oKiem('restore:check chạy xong không báo lỗi'),
    trang(),

    // ======================= BƯỚC 7 =======================
    h1('Bước 7 — Dựng dịch vụ tự bật lại'),
    p('Để app tự chạy lại sau khi máy khởi động lại hoặc app chết:'),
    chuY('Dòng User= bên dưới phải mang ĐÚNG tên tài khoản ghi lại ở bước 1 (casa, ubuntu, opc…). '
      + 'Ghi sai tên thì dịch vụ không bật được, và câu báo lỗi của systemd không nói thẳng ra là do tên người dùng.'),
    p('Muốn khỏi gõ tay, để máy tự điền tên tài khoản bằng cách thay dòng ',
      { text: 'User=<tài-khoản-chạy-app>', bold: true }, ' thành ',
      { text: 'User=$USER', bold: true },
      ' — nhưng phải bỏ dấu nháy quanh UNIT ở dòng đầu (viết <<UNIT thay vì <<\'UNIT\'), '
      + 'nếu không shell sẽ không thay. Gõ tay tên cho chắc thì an toàn hơn.'),
    ...lenh(
      "sudo tee /etc/systemd/system/casa-mamnon.service >/dev/null <<'UNIT'",
      '[Unit]',
      'Description=CASA Mam non',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=<tài-khoản-chạy-app>',
      'WorkingDirectory=/opt/casa-mamnon',
      'Environment=NODE_ENV=production',
      'Environment=DATA_DIR=/var/lib/casa-mamnon',
      `Environment=PORT=${CONG}`,
      'ExecStart=/usr/bin/node server.js',
      'Restart=always',
      'RestartSec=5',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'UNIT',
      '',
      'sudo systemctl daemon-reload',
      'sudo systemctl enable --now casa-mamnon',
      'systemctl status casa-mamnon     # phải thấy "active (running)"'),
    p('Kiểm thứ systemd ĐANG THẬT SỰ DÙNG, chứ không đọc lại tệp vừa gõ:'),
    ...lenh('systemctl show casa-mamnon -p User -p Environment'),
    viSao('systemd đọc tệp service vào bộ nhớ MỘT LẦN rồi dùng bản trong bộ nhớ ấy. '
      + 'Sửa tệp trên đĩa mà quên `daemon-reload` thì `systemctl restart` vẫn chạy — bằng bản CŨ. '
      + '`systemctl show` in ra bản đang có hiệu lực, nên nó là chỗ duy nhất trả lời đúng câu '
      + '"app đang chạy với DATA_DIR nào".'),
    p('Xem app có trả lời không:'),
    ...lenh(`curl -s localhost:${CONG}/healthz`),
    p({ text: 'Khởi động lại HAI LẦN liên tiếp và kiểm cả hai lần đều lên được.', bold: true }),
    ...lenh(
      'sudo systemctl restart casa-mamnon && sleep 3 && systemctl is-active casa-mamnon',
      'sudo systemctl restart casa-mamnon && sleep 3 && systemctl is-active casa-mamnon'),
    viSao('Đây là phép thử cho lược đồ dữ liệu. Một câu lệnh tạo bảng viết sai thì LẦN ĐẦU chạy được — '
      + 'vì bảng chưa tồn tại nên câu nào cũng trôi — và lần thứ hai mới chết. Khởi động một lần rồi báo xong '
      + 'là bỏ sót đúng loại lỗi ấy.'),
    h2('Bảng kiểm bước 7'),
    oKiem('Dòng User= trong tệp service mang đúng tên tài khoản của bước 1'),
    oKiem('systemctl status in ra active (running)'),
    oKiem('curl /healthz trả về kết quả'),
    oKiem('Khởi động lại hai lần, cả hai lần đều active'),
    trang(),

    // ======================= BƯỚC 8 =======================
    h1('Bước 8 — Sao lưu hằng đêm và soát máy hằng tuần'),
    ...lenh(
      'crontab -e',
      '',
      '# Sao lưu 2 giờ sáng hằng ngày',
      '0 2 * * * cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js >> /var/lib/casa-mamnon/backup.log 2>&1',
      '',
      '# Sao lưu ra ổ ngoài, 3 giờ sáng Chủ nhật',
      '0 3 * * 0 cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/backup.js --out <ổ-ngoài> >> /var/lib/casa-mamnon/backup.log 2>&1',
      '',
      '# Soát máy chủ 7 giờ sáng thứ Hai',
      '0 7 * * 1 cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon /usr/bin/node scripts/kiem-tra-may-chu.js >> /var/lib/casa-mamnon/soat-may-chu.log 2>&1'),
    chuY('Giờ "2 giờ sáng" ở đây chỉ đúng nếu bước 1 đã đặt múi giờ. Chưa làm bước 1 thì dòng này '
      + 'chạy lúc 9 giờ sáng giờ Việt Nam.'),
    h2('Hai cái bẫy của cron, cả hai đều hỏng im lặng'),
    p({ text: '1. Dùng /usr/bin/node scripts/backup.js, ĐỪNG dùng npm run backup. ', bold: true },
      'Cron chạy với một PATH rất hẹp, thường không có `npm`. Gõ `npm run backup` vào cron là mỗi đêm '
      + 'nó ghi một dòng "command not found" rồi thôi — app vẫn chạy bình thường, màn hình không có gì lạ, '
      + 'và chỉ tới hôm cần khôi phục mới biết chưa từng có bản sao nào.'),
    p({ text: '2. Máy đã từng chạy app khác thì XEM crontab CŨ trước khi thêm dòng mới. ', bold: true },
      'Dựng app này lên một máy từng chạy app khác là chuyện thường. Dòng cron cũ vẫn còn, vẫn chạy '
      + 'hằng đêm, và vẫn sao lưu THƯ MỤC CỦA APP CŨ. Nhìn từ ngoài thì "lịch sao lưu có chạy" — '
      + 'chỉ là nó sao lưu nhầm chỗ.'),
    ...lenh(
      'crontab -l                       # lịch của tài khoản đang dùng',
      'sudo crontab -l                  # và của root, dễ quên',
      '',
      '# Thấy dòng nào trỏ vào thư mục của app cũ thì SỬA dòng đó,',
      '# đừng thêm dòng mới bên cạnh — hai dòng cùng chạy là hai lần tốn ổ đĩa',
      '# cho một thứ không ai dùng.'),
    chuY('Dùng `crontab -e` của tài khoản chạy app, KHÔNG dùng `sudo crontab -e`. Thư mục dữ liệu '
      + 'thuộc tài khoản ấy; chạy sao lưu bằng root sẽ sinh tệp thuộc root ngay trong đó, và lần sau '
      + 'tài khoản thường ghi vào lại báo lỗi quyền.'),
    p({ text: 'Bản sao nằm cùng ổ đĩa với dữ liệu gốc thì không phải là bản sao. ', bold: true },
      'Ổ hỏng là mất cả hai cùng lúc — đó là lý do có dòng cron thứ hai ra ổ ngoài. Script tự in cảnh báo '
      + 'khi phát hiện hai chỗ nằm cùng ổ.'),
    p('Sáng thứ Hai mở kết quả soát ra xem:'),
    ...lenh('grep "CẦN SỬA" /var/lib/casa-mamnon/soat-may-chu.log | tail -20'),
    viSao('Thứ bộ soát bắt được — lịch sao lưu ngừng chạy, bản sao mới nhất đã 3 ngày tuổi, ổ đĩa sắp đầy, '
      + 'chứng chỉ HTTPS sắp hết hạn — đều là những thứ hỏng dần trong im lặng nhiều tuần SAU ngày cài. '
      + 'Chỉ chạy tay đúng hôm cài thì nó chỉ soát cái ngày mà mọi thứ chắc chắn đang tốt.'),
    h2('Bảng kiểm bước 8'),
    oKiem('crontab -l in ra đủ ba dòng, và KHÔNG còn dòng nào trỏ vào app cũ'),
    oKiem('Sáng hôm sau: backup:list có một bản mang mốc 02:0x — lịch đã chạy thật'),
    oKiem('Đã chốt chỗ để bản sao ra ổ ngoài'),
    trang(),

    // ======================= BƯỚC 9 =======================
    h1('Bước 9 — Tên miền và HTTPS'),
    p('Trỏ tên miền của trường về IP của VPS (bản ghi A), rồi:'),
    ...lenh(
      'sudo apt install -y nginx',
      '',
      "sudo tee /etc/nginx/sites-available/casa-mamnon >/dev/null <<'CONF'",
      'server {',
      '    server_name <tên-miền-của-trường>;',
      '    client_max_body_size 20M;',
      '    location / {',
      `        proxy_pass http://127.0.0.1:${CONG};`,
      '        proxy_set_header Host $host;',
      '        proxy_set_header X-Real-IP $remote_addr;',
      '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
      '        proxy_set_header X-Forwarded-Proto $scheme;',
      '    }',
      '}',
      'CONF',
      '',
      'sudo ln -sf /etc/nginx/sites-available/casa-mamnon /etc/nginx/sites-enabled/',
      'sudo rm -f /etc/nginx/sites-enabled/default',
      'sudo nginx -t && sudo systemctl reload nginx',
      '',
      '# Chứng chỉ HTTPS miễn phí, tự gia hạn',
      'sudo apt install -y certbot python3-certbot-nginx',
      'sudo certbot --nginx -d <tên-miền-của-trường>'),
    chuY('client_max_body_size 20M là bắt buộc. Mặc định nginx chỉ cho 1 MB, và cô đăng ảnh hay video '
      + 'ngắn sẽ bị chặn ở tầng nginx trước khi tới app — app không hề biết để báo lỗi tử tế.'),
    viSao('HTTPS không phải để cho đẹp. Không có HTTPS thì app KHÔNG cài được lên màn hình chính điện thoại '
      + 'và KHÔNG mở được lúc mất mạng — hai thứ mà cô cần nhất ở sân trường. Thông báo đẩy cũng không chạy.'),
    h2('Bật buộc HTTPS — chỉ SAU KHI ổ khoá đã lên'),
    p('Giờ mới thêm biến này vào tệp service, rồi nạp lại:'),
    ...lenh(
      'sudo sed -i "/Environment=PORT=/a Environment=FORCE_HTTPS=1" \\',
      '  /etc/systemd/system/casa-mamnon.service',
      '',
      'sudo systemctl daemon-reload',
      'sudo systemctl restart casa-mamnon',
      'systemctl show casa-mamnon -p Environment   # phải thấy FORCE_HTTPS=1'),
    chuY('ĐỪNG bật FORCE_HTTPS ở bước 7. Lúc ấy chưa có nginx nên phép kiểm '
      + '`curl localhost:3000/healthz` của chính bước đó sẽ nhận một lệnh chuyển hướng sang https '
      + 'thay vì câu trả lời — và người cài sẽ tưởng app hỏng.'),
    viSao('Không có biến này thì ai gõ http:// vẫn vào được bằng kết nối không mã hoá, '
      + 'và mật khẩu của cô đi qua mạng dưới dạng chữ thường. App KHÔNG cần khai thêm biến nào cho '
      + 'nginx: `server.js` đã bật `trust proxy` sẵn, nên nó đọc được `X-Forwarded-Proto` mà bước 9 '
      + 'đã khai trong cấu hình nginx ở trên.'),
    p('Đóng cổng app, chỉ để nginx nói chuyện với thế giới:'),
    ...lenh(
      'sudo ufw allow OpenSSH',
      "sudo ufw allow 'Nginx Full'",
      'sudo ufw enable',
      'sudo ufw status'),
    h2('Bảng kiểm bước 9'),
    oKiem('Mở https://<tên-miền> trên điện thoại thấy màn đăng nhập, có ổ khoá'),
    oKiem(`Gõ http://<IP>:${CONG} từ ngoài KHÔNG vào được (tường lửa đã chặn)`),
    oKiem('Cài được app lên màn hình chính điện thoại'),
    oKiem('systemctl show in ra FORCE_HTTPS=1'),
    oKiem('Gõ http://<tên-miền> tự nhảy sang https://'),
    trang(),

    // ======================= BƯỚC 10 =======================
    h1('Bước 10 — Soát lần cuối rồi bàn giao'),
    ...lenh('cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu'),
    p({ text: 'Mục tiêu là 0 mục cần sửa. ', bold: true },
      'Bộ soát in ra từng mục kèm cách sửa. Còn mục nào "CẦN SỬA" thì sửa xong hãy cho trường bấm thử.'),
    h2('Việc của nhà trường sau khi bàn giao'),
    bang([{ ten: 'Việc', rong: 3600 }, { ten: 'Làm ở đâu trong app', rong: 6038 }], [
      ['Đổi mật khẩu quản trị', 'Đăng nhập lần đầu, app tự bắt đổi'],
      ['Khai cơ sở, nhóm lớp, danh sách bé', 'Quản trị → tương ứng từng mục'],
      ['Bật / tắt tính năng', 'Quản trị → Tính năng'],
      ['Khai số tài khoản nhận tiền, hoặc tải ảnh mã QR', 'Quản trị → Học phí → Tài khoản nhận tiền'],
      ['Xem ai đã làm gì', 'Quản trị → Nhật ký'],
    ]),
    h2('Bảng kiểm bước 10'),
    oKiem('kiem-tra-may-chu in ra 0 mục cần sửa'),
    oKiem('Đã bàn giao mật khẩu quản trị cho hiệu trưởng'),
    oKiem('Đã hướng dẫn nhà trường chỗ bật/tắt tính năng'),
    trang(),

    // ======================= CẬP NHẬT =======================
    h1('Về sau — cập nhật app'),
    p('Thứ tự dưới đây quan trọng hơn từng lệnh riêng lẻ:'),
    ...lenh(
      '# 1. SAO LƯU TRƯỚC — không bỏ lần nào',
      'cd /opt/casa-mamnon && DATA_DIR=/var/lib/casa-mamnon npm run backup',
      '',
      '# 2. Lấy mã mới — KHÔNG gõ sudo. Bước 4 đã trao quyền thư mục cho',
      '#    tài khoản chạy app, nên pull bằng sudo là tạo ra tệp thuộc root',
      '#    ngay giữa thư mục mã, và lần pull sau sẽ báo lỗi quyền.',
      'cd /opt/casa-mamnon && git pull',
      '',
      '# 3. Cài lại phụ thuộc nếu package.json đổi',
      'npm ci --omit=dev',
      '',
      '# 4. Khởi động lại HAI LẦN, kiểm cả hai',
      '#    Nếu lệnh restart in ra cảnh báo "...changed on disk. Run',
      "#    'systemctl daemon-reload'..." + ' thì tệp service đã bị sửa mà systemd',
      '#    chưa đọc lại — app vừa khởi động bằng bản CŨ. Chạy daemon-reload',
      '#    rồi restart lại, đừng bỏ qua cảnh báo đó.',
      'sudo systemctl daemon-reload',
      'sudo systemctl restart casa-mamnon && sleep 3 && systemctl is-active casa-mamnon',
      'sudo systemctl restart casa-mamnon && sleep 3 && systemctl is-active casa-mamnon',
      '',
      '# 5. Soát lại',
      'DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu'),
    chuY('git pull kéo từ đúng nhánh đã clone ở bước 4 — với máy cài theo bản này là main. Máy nào cài TRƯỚC '
      + '07/10/2026 theo nhánh làm việc thì chuyển sang main MỘT lần (dữ liệu nằm ngoài thư mục mã nên '
      + 'không bị đụng; lúc gộp 07/10 mã hai nhánh trùng nhau): git fetch origin main && git checkout -B main origin/main. Kiểm nhánh đang đứng bằng '
      + 'git branch --show-current.'),
    trang(),

    // ======================= HỎNG THÌ LÀM GÌ =======================
    h1('Hỏng thì làm gì'),
    bang([{ ten: 'Hiện tượng', rong: 3400 }, { ten: 'Xử lý', rong: 6238 }], [
      ['App không mở được', 'systemctl status casa-mamnon · xem log: journalctl -u casa-mamnon -n 50'],
      ['Máy chủ dừng ngay khi bật, báo dữ liệu nằm trong kho mã',
        'Đọc chính câu báo lỗi — nó in sẵn lệnh cần chạy. Thường là quên DATA_DIR trong tệp service.'],
      ['Máy chủ dừng, báo cơ sở dữ liệu trống', 'Chưa làm bước 5. Tạo tài khoản quản trị rồi bật lại.'],
      ['Ổ khoá HTTPS mất / báo hết hạn', 'sudo certbot renew --dry-run · kiểm tên miền còn trỏ đúng IP'],
      ['Cô đăng ảnh báo lỗi, ảnh nhỏ thì được', 'Thiếu client_max_body_size 20M trong nginx (bước 9).'],
      ['Giờ trong nhật ký lệch 7 tiếng', 'Chưa làm bước 1. Đặt múi giờ rồi khởi động lại dịch vụ.'],
      ['backup:list thấy bản sao cũ nhiều ngày, app vẫn chạy bình thường',
        'Lịch sao lưu chưa đặt, hoặc đang trỏ vào thư mục app cũ, hoặc gọi `npm` mà cron không có npm trong PATH. Xem crontab -l và tail /var/lib/casa-mamnon/backup.log.'],
      ['restart báo "unit file ... changed on disk"',
        'Tệp service đã bị sửa mà systemd chưa đọc lại — app vừa khởi động bằng bản CŨ, tức chỗ vừa sửa CHƯA có hiệu lực. Xem lại tệp bằng cat, rồi sudo systemctl daemon-reload và restart lại. Kiểm bằng systemctl show casa-mamnon -p User -p Environment.'],
      ['Mở app bị chuyển hướng vòng vo không vào được',
        'Nhiều khả năng bật FORCE_HTTPS=1 khi chưa có nginx/HTTPS. Tắt biến đó, daemon-reload, dựng xong bước 9 rồi bật lại.'],
      ['Đổi DATA_DIR/PORT trong tệp service mà app không đổi theo',
        'Cùng nguyên nhân trên: thiếu daemon-reload. systemctl show in ra giá trị đang thật sự có hiệu lực.'],
      ['Đăng nhập thấy dữ liệu lạ / tài khoản mình không tạo',
        'Nhiều khả năng DATA_DIR đang trỏ vào lần cài thử trước. Xem lại bước 3: ls -la /var/lib/casa-mamnon.'],
      ['git clone báo Permission denied vào /opt',
        'Chưa chạy hai dòng sudo mkdir + sudo chown ở đầu bước 4. /opt thuộc root.'],
      ['adduser báo "Only root may add a user"',
        'Máy cho đăng nhập bằng tài khoản thường (ubuntu, opc…) chứ không phải root — đó là máy làm ĐÚNG. Dùng luôn tài khoản đó, bỏ qua phần tạo người dùng ở bước 1. Muốn tạo thật thì thêm sudo.'],
      ['Dịch vụ không bật được sau khi dựng systemd',
        'journalctl -u casa-mamnon -n 50. Hay gặp nhất: dòng User= trong tệp service không khớp tài khoản có thật trên máy (bước 7).'],
      ['Phụ huynh quên mật khẩu', 'Cô hoặc văn phòng cấp lại ngay trong app.'],
      ['Quên mật khẩu quản trị', 'npm run create-admin tạo tài khoản quản trị mới.'],
      ['Nghi dữ liệu hỏng hoặc xoá nhầm',
        'ĐỪNG thao tác thêm. Tắt dịch vụ, dùng npm run restore theo docs/SAO-LUU.md quay về bản sao gần nhất.'],
      ['Mất hẳn máy chủ', 'Dựng VPS mới theo tài liệu này từ bước 1, rồi đổ bản sao ở ổ ngoài vào /var/lib/casa-mamnon trước khi bật dịch vụ.'],
    ]),
    trang(),

    // ======================= TRA CỨU NHANH =======================
    h1('Phụ lục — Tra cứu nhanh'),
    bang([{ ten: 'Việc', rong: 4000 }, { ten: 'Lệnh / nơi xem', rong: 5638 }], [
      ['Khởi động lại app', 'sudo systemctl restart casa-mamnon'],
      ['Xem app có chạy không', 'systemctl status casa-mamnon'],
      ['Xem log đang chạy', 'journalctl -u casa-mamnon -f'],
      ['Sao lưu ngay', 'DATA_DIR=/var/lib/casa-mamnon npm run backup'],
      ['Xem danh sách bản sao', 'DATA_DIR=/var/lib/casa-mamnon npm run backup:list'],
      ['Kiểm bản sao mở ra được không', 'DATA_DIR=/var/lib/casa-mamnon npm run restore:check'],
      ['Soát toàn bộ máy chủ', 'DATA_DIR=/var/lib/casa-mamnon npm run kiem-tra-may-chu'],
      ['Tạo tài khoản quản trị', 'npm run create-admin -- "Họ Tên" tendangnhap'],
      ['Xem đang chạy đợt nào', 'tail -1 docs/TIEN-DO.md | cut -c1-60'],
      ['Hướng dẫn sao lưu chi tiết', 'docs/SAO-LUU.md'],
      ['Hướng dẫn triển khai (bản Markdown)', 'docs/TRIEN-KHAI.md'],
      ['Tạo lại chính tài liệu này', 'npm run tai-lieu:cai-dat-vps'],
    ]),
  ];

  const doc = new Document({
    creator: 'CASA Mầm non',
    title: 'Cài đặt CASA Mầm non lên VPS',
    description: 'Sinh tự động từ kho mã bằng npm run tai-lieu:cai-dat-vps',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
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

  const ra = path.join(GOC, 'docs', 'CAI-DAT-VPS.docx');
  fs.writeFileSync(ra, await Packer.toBuffer(doc));
  console.log(`Đã sinh ${path.relative(GOC, ra)} (bản mã nguồn ${phienBan}, đợt ${DOT}).`);
}

main().catch(err => { console.error('Không sinh được tài liệu:', err); process.exit(1); });
