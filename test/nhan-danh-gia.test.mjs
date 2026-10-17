// Bài canh BỘ CHỮ ĐÁNH GIÁ nhà trường tự sửa được (Đ185, Câu 6).
//
// Chạy bằng:  npm run test:nhan-danh-gia
//
// VÌ SAO CÓ BÀI NÀY
//
// Bộ canh giữ QUY TẮC 4 là bộ QUÉT MÃ NGUỒN — nó đọc tệp trên đĩa, nó không
// đọc được cơ sở dữ liệu. Cho nhà trường sửa năm chữ đánh giá là đưa chúng ra
// NGOÀI tầm nhìn của bộ canh ấy, vĩnh viễn: quản lý gõ "Giỏi / Khá / Trung
// bình / Yếu / Kém" là quy tắc bị phá đúng nghĩa đen, hiện thẳng lên màn hình
// gia đình, và không một bài canh cũ nào hé một tiếng.
//
// Nhà trường đã được hỏi thẳng chuyện này và trả lời rằng họ KHÔNG BAO GIỜ
// đánh giá theo Giỏi/Khá, chỉ dùng "Hoàn thành, đang thực hiện, chưa học tới".
// Nên đường làm sạch là: cho sửa, nhưng đường ghi có người gác.
//
// BÀI NÀY CHÍNH LÀ PHẦN BÙ LẠI CHỖ BỘ CANH KIA KHÔNG VỚI TỚI. Nó thuộc nhóm
// canh 5 QUY TẮC, tức là nhóm bất khả xâm phạm: nới nó ra là mở lại đúng cái
// lỗ nó sinh ra để bịt.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('nhan-danh-gia');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ndg_qt');
const mkCs2 = taoQuanTri(DIR, 'Quản lý cơ sở 2', 'ndg_cs2');
khoaVaoCoSo(DIR, 'ndg_cs2', 'cs2');

const { BASE, dung } = await dungMayChu({ port: Number(process.env.TEST_PORT || 4661), dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const QT = await vao('ndg_qt', mkQt);
  const CS2 = await vao('ndg_cs2', mkCs2);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  const doc = async (cookie) => (await req('GET', '/api/admin/nhan-danh-gia', { cookie })).data || {};
  const ghi = (cookie, nhan) => req('PUT', '/api/admin/nhan-danh-gia', { cookie, body: { nhan } });

  // =========================================================================
  console.log('\n[1] Mặc định: chưa ai sửa thì app nói y như trước');
  {
    const d = await doc(QT);
    const ds = d.nhan || [];
    check('trả về đủ năm chữ', ds.length === 5, ds.map(n => n.ma));
    check('mã đúng năm mã đang dùng trong cơ sở dữ liệu',
      ['chua-day', 'chua-quan-sat-thay', 'dang-hinh-thanh', 'da-vung', 'vuot-troi']
        .every(m => ds.some(n => n.ma === m)), ds.map(n => n.ma));
    check('chưa sửa thì nhãn trùng khít nhãn mặc định',
      ds.every(n => n.nhan === n.macDinh && !n.daSua), ds);
    // QUY TẮC 2 nằm ngay ở đây: hai chữ "chưa" phải còn nguyên nghĩa trung tính.
    check('vẫn còn đủ hai chữ "chưa" của QUY TẮC 2',
      ds.some(n => n.nhan === 'Chưa quan sát thấy') && ds.some(n => n.nhan === 'Chưa dạy'), ds.map(n => n.nhan));
  }

  // =========================================================================
  console.log('\n[2] ĐƯỜNG GHI CÓ NGƯỜI GÁC — và người gác chặn thật');
  {
    // Danh sách này là những cách xếp trẻ trên dưới nhau mà tiếng Việt học
    // đường thật sự dùng. Mỗi dòng phải bị TỪ CHỐI, không phải chỉ bị giấu đi
    // ở màn hình.
    const cam = [
      ['Giỏi', 'bậc xếp loại quen nhất'],
      ['Khá', 'bậc thứ hai của cùng thang ấy'],
      ['Trung bình', 'bậc giữa'],
      ['Yếu', 'bậc dưới'],
      ['Kém', 'bậc dưới cùng'],
      ['Đạt', 'chấm đúng–sai'],
      ['Chưa đạt', 'vế còn lại của cặp đúng–sai'],
      ['Xếp loại A', 'nói thẳng chữ xếp loại'],
      ['Loại B', 'chia trẻ thành loại A, B, C'],
      ['Hạng 2', 'thứ hạng'],
      ['8 điểm', 'điểm số'],
      ['80%', 'phần trăm về một đứa trẻ'],
      ['3 sao', 'đếm sao cũng là một thang'],
      ['⭐⭐⭐', 'đếm sao bằng biểu tượng'],
    ];
    let chan = 0;
    for (const [chu, vi] of cam) {
      const r = await ghi(QT, { 'da-vung': chu });
      if (r.status === 400) chan++;
      else check(`CHẶN "${chu}" (${vi})`, false, r.status);
    }
    check(`CHẶN ĐỦ ${cam.length} cách xếp trẻ trên dưới nhau`, chan === cam.length, `${chan}/${cam.length}`);

    const r = await ghi(QT, { 'da-vung': 'Giỏi' });
    check('câu từ chối nói bằng tiếng của trường, không phải mã máy',
      /không xếp các bé trên dưới nhau/.test(r.data?.error || ''), r.data);
    check('và mách luôn chữ dùng được',
      /Hoàn thành|Đang thực hiện|Chưa học tới/.test(r.data?.error || ''), r.data);

    // KHÔNG GHI NỬA CHỪNG. Gửi một bộ có bốn chữ hợp lệ và một chữ cấm thì
    // CẢ LƯỢT phải dừng — ghi được một nửa rồi báo lỗi là trạng thái tệ nhất,
    // vì người gõ không biết phần nào đã vào.
    await ghi(QT, {
      'chua-day': 'Chưa học tới',
      'dang-hinh-thanh': 'Đang thực hiện',
      'da-vung': 'Hoàn thành',
      'vuot-troi': 'Giỏi',
    });
    const sau = await doc(QT);
    check('MỘT CHỮ SAI LÀ CẢ LƯỢT DỪNG — không chữ nào vào được',
      (sau.nhan || []).every(n => n.nhan === n.macDinh), (sau.nhan || []).map(n => n.nhan));
  }

  // =========================================================================
  console.log('\n[3] Chữ nhà trường thật sự dùng thì lưu được, và đi tới tận màn của cô');
  {
    const r = await ghi(QT, {
      'chua-day': 'Chưa học tới',
      'dang-hinh-thanh': 'Đang thực hiện',
      'da-vung': 'Hoàn thành',
    });
    check('lưu được đúng bộ chữ trường đang dùng', r.status === 200, r.data);

    const d = await doc(QT);
    const m = Object.fromEntries((d.nhan || []).map(n => [n.ma, n]));
    check('đọc lại ra đúng chữ vừa lưu',
      m['da-vung']?.nhan === 'Hoàn thành' && m['chua-day']?.nhan === 'Chưa học tới', d.nhan);
    check('và đánh dấu rõ chữ nào đã sửa so với mặc định',
      m['da-vung']?.daSua === true && m['chua-quan-sat-thay']?.daSua === false, d.nhan);

    // ĐI TỚI TẬN MÀN CỦA CÔ, ở CẢ HAI phân hệ dùng thang này. Lưu vào sổ mà
    // màn hình vẫn nói chữ cũ thì bộ chữ sửa được chỉ là một ô nhập vô nghĩa.
    const ke = (await req('GET', '/api/kehoachbe?studentId=s1', { cookie: GV })).data || {};
    const nhanKe = (ke.ketQua || []).find(x => x.ma === 'da-vung');
    check('phân hệ Kế hoạch của bé gửi chữ MỚI cho màn của cô',
      nhanKe && nhanKe.ten === 'Hoàn thành', ke.ketQua);

    const ht = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data || {};
    const nhanHt = (ht.trangThai || []).find(x => x.ma === 'da-vung');
    check('phân hệ Hành trình cũng gửi đúng chữ ấy — hai màn không nói khác nhau',
      nhanHt && nhanHt.ten === 'Hoàn thành', ht.trangThai);

    // MÃ KHÔNG ĐỔI. Đây là điều làm cho chuyện đổi chữ không đụng bản ghi cũ:
    // cơ sở dữ liệu giữ mã, không giữ chữ.
    check('MÃ KHÔNG ĐỔI MỘT CHỮ NÀO — bản ghi cũ vì thế không bị ảnh hưởng',
      (ke.ketQua || []).map(x => x.ma).join(',') === 'chua-day,chua-quan-sat-thay,dang-hinh-thanh,da-vung,vuot-troi',
      (ke.ketQua || []).map(x => x.ma));
  }

  // =========================================================================
  console.log('\n[4] MỘT BỘ CHO CẢ TRƯỜNG nên chỉ ban giám hiệu sửa được');
  {
    // Trường nói bộ chữ giống nhau giữa ba cơ sở. Nếu quản lý một cơ sở sửa
    // được thì họ gõ một chữ là cả ba cơ sở đổi theo, mà hai cơ sở kia không
    // hề biết ai đổi và đổi lúc nào.
    const d = await doc(CS2);
    check('quản lý bị khoá vào một cơ sở vẫn XEM được bộ chữ', (d.nhan || []).length === 5, d.nhan);
    check('nhưng màn hình nói rõ là không sửa được', d.suaDuoc === false, d.suaDuoc);
    const r = await ghi(CS2, { 'da-vung': 'Đã vững' });
    check('và máy chủ TỪ CHỐI thật, không chỉ ẩn nút', r.status === 403, r.status);
    check('câu từ chối nói rõ vì sao', /MỌI cơ sở/.test(r.data?.error || ''), r.data);
    check('ban giám hiệu thì sửa được', (await doc(QT)).suaDuoc === true);
  }

  // =========================================================================
  console.log('\n[5] Cô và gia đình không mở được đường sửa bộ chữ');
  {
    check('cô KHÔNG đọc được đường quản trị này',
      (await req('GET', '/api/admin/nhan-danh-gia', { cookie: GV })).status === 403);
    check('cô KHÔNG sửa được', (await ghi(GV, { 'da-vung': 'Hoàn thành' })).status === 403);
    check('gia đình KHÔNG đọc được',
      (await req('GET', '/api/admin/nhan-danh-gia', { cookie: PH })).status === 403);
    check('gia đình KHÔNG sửa được', (await ghi(PH, { 'da-vung': 'Hoàn thành' })).status === 403);
  }

  // =========================================================================
  console.log('\n[6] Sổ hỏng hoặc bị sửa thẳng dưới cơ sở dữ liệu thì về mặc định, không nổ');
  {
    // Một bản ghi đè có thể đã được ghi trước khi có người gác, hoặc bị sửa
    // thẳng bằng công cụ SQLite. Lúc đó màn hình phải về chữ mặc định chứ
    // tuyệt đối không hiện chữ cấm ra trước mặt cô và gia đình.
    const ndg = (await import(pathToFileURL(path.join(GOC, 'lib', 'nhan-danh-gia.js')).href)).default;
    check('đọc được lib bộ chữ', !!ndg && typeof ndg.kiemTraNhan === 'function', Object.keys(ndg || {}));

    const gia = { first: () => ({ value: { 'da-vung': 'Giỏi', 'chua-day': 'Chưa học tới' } }) };
    const dung2 = ndg.nhanDangDung(gia);
    const map = Object.fromEntries(dung2);
    check('CHỮ CẤM ĐÃ NẰM SẴN TRONG SỔ vẫn KHÔNG hiện ra — về nhãn mặc định',
      map['da-vung'] === 'Đã vững', map['da-vung']);
    check('còn chữ hợp lệ trong cùng sổ ấy thì vẫn dùng',
      map['chua-day'] === 'Chưa học tới', map['chua-day']);

    const hong = { first: () => { throw new Error('sổ hỏng'); } };
    check('sổ hỏng thì về hết mặc định, không nổ',
      Object.fromEntries(ndg.nhanDangDung(hong))['da-vung'] === 'Đã vững');
    check('sổ trống cũng vậy',
      Object.fromEntries(ndg.nhanDangDung({ first: () => null }))['vuot-troi'] === 'Vượt trội');
  }

  // =========================================================================
  console.log('\n[7] `\\b` của JavaScript chỉ hiểu chữ ASCII — cái bẫy đã sập một lần');
  {
    // Bản đầu của danh sách chữ cấm viết `/\bđạt\b/i` và `/\bđiểm\b/i`. Cả hai
    // KHÔNG BAO GIỜ khớp: `đ` không phải chữ ASCII nên `\b` đứng trước nó không
    // thấy ranh giới nào. Nghĩa là hai chữ bị cấm quan trọng nhất đi qua cửa
    // sạch sẽ, trong khi `/\bgiỏi\b/` (bắt đầu bằng `g`) thì chặn được — một
    // người gác chặn đúng nửa danh sách, và không nhận ra được bằng mắt.
    const ndg = (await import(pathToFileURL(path.join(GOC, 'lib', 'nhan-danh-gia.js')).href)).default;
    check('ĐỐI CHỨNG: `/\\bđạt\\b/` thật sự không khớp "Đạt" — cái bẫy có thật',
      /\bđạt\b/i.test('Đạt') === false);
    check('nhưng người gác thật thì CHẶN "Đạt"', !!ndg.kiemTraNhan('Đạt'));
    check('và CHẶN "Điểm"', !!ndg.kiemTraNhan('Điểm'));
    // SOI MÃ, KHÔNG SOI CHÚ THÍCH. Chính tệp ấy có một khối chú thích kể lại
    // cái bẫy và trích nguyên mẫu hỏng làm ví dụ — soi cả chú thích thì bài
    // canh đỏ vì lời giải thích, chứ không phải vì mã.
    const dongMa = fs.readFileSync(path.join(GOC, 'lib', 'nhan-danh-gia.js'), 'utf8')
      .split('\n').filter(d => !/^\s*(\/\/|\*|\/\*)/.test(d)).join('\n');
    check('không mẫu nào TRONG MÃ còn dùng `\\b` trước một chữ có dấu',
      !/\\b[^\x00-\x7f]/.test(dongMa), (dongMa.match(/.*\\b[^\x00-\x7f].*/) || [])[0]);

    // Và không bắt oan: chữ trường thật sự dùng phải đi qua được.
    for (const t of ['Hoàn thành', 'Đang thực hiện', 'Chưa học tới', 'Chưa quan sát thấy', 'Đang hình thành', 'Vượt trội']) {
      check(`cho qua chữ trường dùng thật: "${t}"`, ndg.kiemTraNhan(t) === null, ndg.kiemTraNhan(t));
    }
    check('chữ rỗng thì từ chối và nói rõ', /không được để trống/.test(ndg.kiemTraNhan('') || ''));
    check('chữ dài quá màn hình điện thoại thì từ chối',
      /dài quá/.test(ndg.kiemTraNhan('x'.repeat(200)) || ''));
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Bộ chữ đánh giá: sửa được, nhưng không sửa thành xếp loại');
