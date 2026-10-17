// Bài canh: BẢN GHI ĐÃ THU HỒI KHÔNG ĐƯỢC SỐNG LẠI Ở MỘT MÀN KHÁC.
//
// Chạy bằng:  npm run test:thu-hoi
//
// VÌ SAO CÓ BÀI NÀY
//
// "Thu hồi" là một lời hứa rất cụ thể với cô và với y tế trường: *cái này gia
// đình sẽ không đọc nữa*. Hộp thoại thu hồi ở màn Sức khoẻ còn tự nêu tên tình
// huống — *"Dùng khi ghi nhầm sang bé khác"*.
//
// Lời hứa ấy được giữ ở tệp route GỐC của mỗi bảng, nơi người viết đang nghĩ về
// nó. Chỗ vỡ nằm ở những tệp KHÁC đọc ké bảng đó: người viết ở đấy đang nghĩ về
// việc của mình — dựng bản báo cáo, dựng màn năm học trước, đếm huy hiệu — và
// không có gì nhắc rằng bảng này thu hồi được.
//
// Một đợt soát tìm được BA chỗ cùng hình dạng, ở ba tệp khác nhau, do ba lần
// viết khác nhau:
//
//   1. `routes/namhoccu.js` — thông báo đã thu hồi in lại cho gia đình ở màn
//      "Năm học trước", kèm tên người gửi, và không nút thu hồi nào chạm tới
//      được nữa vì khoảng lớp đã khép.
//   2. `modules/baocaohoctap/routes.js` — số đo cân nặng / chiều cao đã thu hồi
//      vẫn in vào bản báo cáo gửi gia đình, tức đúng thứ gia đình đọc kỹ nhất
//      và giữ lại.
//   3. `routes/dashboard.js` — huy hiệu "Nhận xét" đếm cả bản đã thu hồi, nên
//      con số chưa xem không bao giờ về 0.
//
// Ba lần cùng một lỗi nghĩa là lỗi thuộc về HÌNH DẠNG, không thuộc về người
// viết. Nên bài này canh hình dạng: mọi câu đọc một trong bốn bảng thu hồi
// được, ở NGOÀI tệp route gốc của nó, phải mang điều kiện lọc.
import fs from 'fs';
import path from 'path';
import { GOC, taoBoDem } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

// Bốn bảng có thể sửa / thu hồi. Danh sách này CỐ Ý viết tay thay vì require
// `lib/sua-thu-hoi.js`: nạp tệp đó là kéo theo `lib/db.js`, tức mở cơ sở dữ
// liệu, chỉ để đọc một mảng bốn chuỗi. Đổi lại, mục [0] đối chiếu hai bản với
// nhau và báo đỏ nếu chúng trôi khỏi nhau.
const BANG = {
  notifications: 'routes/notifications.js',
  conduct: 'routes/conduct.js',
  health: 'routes/health.js',
  remarks: 'routes/remarks.js',
  // 'messages' thêm ở Đ196 (việc 25). Ở bảng này "thu hồi" nghĩa là BỎ CHỮ chứ
  // không phải bỏ dòng (xem `messageDto` trong routes/messages.js), nhưng luật
  // của bài canh này KHÔNG đổi một ly: một tệp khác đọc ké bảng rồi in `text`
  // ra là lời nhắn đã thu hồi sống lại ở một màn khác — đúng hình dạng mà bài
  // này sinh ra để chặn. Bắt được ngay một chỗ: huy hiệu Nhắn tin ở
  // routes/dashboard.js đang đếm cả tin đã thu hồi.
  messages: 'routes/messages.js',
};

// BỎ DÒNG CHÚ THÍCH TRƯỚC KHI DÒ — và vì sao ở ĐÂY thì bỏ được.
//
// Kho mã này có một luật đã học bằng đau: *một bộ canh có ngoại lệ "trong chú
// thích thì không tính" là một bộ canh có lỗ*. Luật ấy đúng cho hai bộ canh
// QUY TẮC, nơi thứ bị cấm là LỜI VĂN — một câu "hoàn thành 78%" nằm trong chú
// thích vẫn có thể bị ai đó chép ra màn hình.
//
// Ở đây thì khác hẳn: thứ bị cấm là một CÂU TRUY VẤN, mà một câu truy vấn
// không bao giờ chạy được từ bên trong một dòng `//`. Bỏ dòng chú thích ở đây
// không mở lỗ nào, còn giữ lại thì bộ canh báo đỏ vào đúng những chú thích
// giải thích các lần vá TRƯỚC — `routes/hocsinh-cu.js` có một đoạn như vậy,
// viết ra chính xác để kể lại lỗi đã sửa.
//
// Bù lại, mục [2] có một phép thử ngược riêng: một câu quên lọc nằm NGAY SAU
// một chú thích nhắc tới mẫu đó thì vẫn phải bị bắt.
function boChuThich(ma) {
  return ma.split('\n').map(d => (/^\s*(\/\/|\*|\/\*)/.test(d) ? '' : d)).join('\n');
}

// KHOANH TRỌN CÂU SQL quanh chỗ khớp — dùng cho CẢ phép quét thật [1] lẫn phép
// thử ngược [2], để phép thử ngược thử đúng cái đang chạy chứ không thử một
// bản chép tay.
//
// Nhận cả ba loại nháy (` ' "): câu viết bằng nháy đơn/kép mà chỉ dò backtick
// thì khung trượt sang đoạn mã bên cạnh. NHƯNG đang ở TRONG một template
// literal (số backtick phía trước lẻ) thì khung phải là chính backtick đó —
// một câu `SELECT 'x' AS a FROM remarks …` có nháy đơn ngay trước FROM, lấy
// nháy đơn làm mép là khung bị cắt cụt và câu quên lọc được miễn oan.
function khungCau(ma, index) {
  const truocKhop = ma.slice(0, index);
  const soBacktick = (truocKhop.match(/`/g) || []).length;
  const dau = soBacktick % 2 === 1
    ? truocKhop.lastIndexOf('`')
    : Math.max(0, truocKhop.lastIndexOf('`'), truocKhop.lastIndexOf("'"), truocKhop.lastIndexOf('"'));
  const nhay = dau > 0 || ma[dau] === '`' ? ma[dau] : '`';
  const cuoi = ma.indexOf(nhay, index);
  return ma.slice(dau, cuoi > 0 ? cuoi + 1 : index + 400);
}

// Vùng quét: mọi tệp máy chủ có thể đọc bảng.
//
// Tên tệp trả về LUÔN viết bằng '/': nó được so với tệp gốc trong BANG. Ghép
// bằng path.join thì trên Windows ra 'routes\albums.js', tệp gốc mất miễn trừ
// và thành "lỗ" giả — bài đỏ oan ở máy của người mới tải mã về.
function cacTep() {
  const ra = [];
  const them = (thuMuc, sau = 0) => {
    for (const ten of fs.readdirSync(path.join(GOC, thuMuc))) {
      const duong = `${thuMuc}/${ten}`;
      const day = path.join(GOC, duong);
      if (fs.statSync(day).isDirectory()) { if (sau < 1) them(duong, sau + 1); continue; }
      if (ten.endsWith('.js')) ra.push(duong);
    }
  };
  them('routes');
  them('modules');
  them('lib');
  return ra;
}

// ===========================================================================
console.log('\n[0] Danh sách bảng viết tay phải khớp lib/sua-thu-hoi.js');
{
  const nguon = fs.readFileSync(path.join(GOC, 'lib', 'sua-thu-hoi.js'), 'utf8');
  const khop = nguon.match(/BANG_HOP_LE\s*=\s*\[([^\]]*)\]/);
  check('đọc được danh sách bảng trong lib/sua-thu-hoi.js', !!khop, khop && khop[1]);
  const thuc = (khop ? khop[1] : '').split(',')
    .map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).sort();
  check('BỐN BẢNG THU HỒI ĐƯỢC KHỚP VỚI DANH SÁCH BÀI NÀY ĐANG CANH',
    thuc.join(',') === Object.keys(BANG).sort().join(','),
    { trongMa: thuc, trongBaiCanh: Object.keys(BANG).sort() });
}

// ===========================================================================
console.log('\n[1] Mọi câu ĐỌC bảng thu hồi được, ngoài tệp gốc, đều phải lọc');
{
  const tep = cacTep();
  // Đối chứng: quét vào chỗ rỗng thì mục này xanh mà không kiểm gì cả.
  check('quét được đủ tệp máy chủ để soi', tep.length >= 25, tep.length);
  check('tên tệp trong vùng quét viết bằng / trên mọi hệ',
    tep.every(t => !t.includes('\\')), tep.filter(t => t.includes('\\')).slice(0, 3));
  // Tệp gốc của từng bảng phải nằm trong vùng quét. Nếu không khớp được tên
  // (khác dấu phân cách, đổi chỗ tệp), dòng `t === tepGoc` ở dưới không bao
  // giờ đúng và tệp gốc bị soi như mọi tệp khác.
  check('tệp gốc của mọi bảng trong BANG đều có trong vùng quét',
    Object.values(BANG).every(g => tep.includes(g)),
    Object.values(BANG).filter(g => !tep.includes(g)));

  const lo = [];
  let soCauDaSoi = 0;

  for (const t of tep) {
    const ma = boChuThich(fs.readFileSync(path.join(GOC, t), 'utf8'));
    for (const [bang, tepGoc] of Object.entries(BANG)) {
      if (t === tepGoc) continue;                    // tệp gốc tự lo phần của nó
      const re = new RegExp(`FROM\\s+${bang}\\b`, 'g');
      let m;
      while ((m = re.exec(ma))) {
        const cau = khungCau(ma, m.index);
        soCauDaSoi++;

        // Ba trường hợp KHÔNG cần lọc, và cả ba đều có lý do đọc được:
        //  - tra ĐÚNG MỘT bản ghi theo mã: chính là đường sửa / thu hồi / bỏ
        //    thu hồi, nó phải thấy được bản đã thu hồi thì mới bỏ được;
        //  - câu đã mang sẵn điều kiện (gọi thẳng hoặc qua một biến trung gian);
        //  - câu đọc bảng `record_edits` chứ không phải bảng dữ liệu.
        const traMotDong = /WHERE\s+id\s*=\s*\?/.test(cau);
        const daLoc = /dieuKienConHien|conHien/.test(cau);
        if (traMotDong || daLoc) continue;
        lo.push(`${t} → ${cau.replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
  }

  check('có câu để mà soi — không phải quét vào chỗ rỗng', soCauDaSoi > 0, soCauDaSoi);
  check('KHÔNG CÂU NÀO ĐỌC BẢNG THU HỒI ĐƯỢC MÀ QUÊN LỌC',
    lo.length === 0,
    lo.length
      ? `${lo.join('\n  ')}\n\n  Thêm \`AND \${st.dieuKienConHien('<bảng>', '<cột id>')}\` vào câu.\n`
        + '  Thu hồi là lời hứa "gia đình sẽ không đọc cái này nữa" — giữ lời hứa ở\n'
        + '  một màn rồi phá nó ở màn khác thì tệ hơn không hứa.'
      : undefined);
}

// ===========================================================================
console.log('\n[2] PHÉP THỬ NGƯỢC — bộ canh này có bắt được thật không');
{
  // Chạy đúng phép dò trên mã bịa, không đụng kho mã thật.
  const doTrong = (nguyen) => {
    const ma = boChuThich(nguyen);
    const ra = [];
    for (const bang of Object.keys(BANG)) {
      const re = new RegExp(`FROM\\s+${bang}\\b`, 'g');
      let m;
      while ((m = re.exec(ma))) {
        const cau = khungCau(ma, m.index);   // ĐÚNG hàm khoanh đang dùng ở [1]
        if (/WHERE\s+id\s*=\s*\?/.test(cau) || /dieuKienConHien|conHien/.test(cau)) continue;
        ra.push(cau);
      }
    }
    return ra;
  };

  check('BẮT ĐƯỢC câu quên lọc',
    doTrong('db.all(`SELECT * FROM notifications WHERE audience = ?`, [x])').length === 1);
  check('bắt được cả bảng số đo sức khoẻ',
    doTrong('db.all(`SELECT date FROM health WHERE studentId = ?`, [x])').length === 1);
  check('KHÔNG bắt nhầm câu đã gọi thẳng điều kiện',
    doTrong('db.all(`SELECT * FROM remarks WHERE studentId = ? AND ${st.dieuKienConHien(\'remarks\', \'id\')}`)').length === 0);
  check('KHÔNG bắt nhầm câu dùng biến trung gian',
    doTrong('db.all(`SELECT * FROM conduct WHERE studentId = ? AND ${conHien}`)').length === 0);
  check('KHÔNG bắt nhầm đường sửa / thu hồi tra một bản ghi theo mã',
    doTrong("db.first('health', 'SELECT * FROM health WHERE id = ?', [id])").length === 0);
  check('KHÔNG bắt nhầm bảng khác tên gần giống',
    doTrong('db.all(`SELECT * FROM notification_reads WHERE userId = ?`)').length === 0);
  check('KHÔNG bắt nhầm một dòng CHÚ THÍCH nhắc tới mẫu đó',
    doTrong('// câu `SELECT * FROM remarks` ở đây đọc ra cả dòng đã gỡ').length === 0);
  check('BẮT ĐƯỢC câu trong backtick có NHÁY ĐƠN ngay trước FROM mà quên lọc',
    doTrong("db.all(`SELECT 'nhan-xet' AS loai, * FROM remarks WHERE studentId = ?`, [x])").length === 1);
  check('và KHÔNG bắt nhầm câu như thế khi nó đã lọc',
    doTrong("db.all(`SELECT 'nhan-xet' AS loai, * FROM remarks WHERE studentId = ? AND ${conHien}`, [x])").length === 0);
  check('câu viết bằng nháy đơn (không backtick) vẫn khoanh đúng',
    doTrong("db.all('SELECT * FROM conduct WHERE studentId = ?', [x])").length === 1);
  check('NHƯNG VẪN BẮT ĐƯỢC câu quên lọc nằm ngay sau chú thích ấy',
    doTrong('// câu `SELECT * FROM remarks` ở đây đọc ra cả dòng đã gỡ\n'
      + 'db.all(`SELECT * FROM remarks WHERE studentId = ?`, [x])').length === 1);
}

tongKet('Bản ghi đã thu hồi không sống lại ở màn khác');
