// Bài canh các chỉnh sửa nhỏ theo phản hồi của trường ngày 07/09/2026
// (Đ132 Thực đơn · Đ134 Dặn thuốc · Đ135 Khảo sát).
//
// Chạy bằng:  npm run test:phan-hoi-0709
//
//   [1] Khảo sát: chưa trả lời hết câu thì KHÔNG gửi được — kể cả câu tự luận.
//   [2] Thực đơn: khung năm bữa đúng thứ tự của trường; bộ đọc bảng dán từ
//       Excel đọc được cả hai hướng bảng và ô nhiều dòng trong nháy kép.
//   [3] Dặn thuốc: gia đình dặn lại được đơn cũ — thuốc và ghi chú chép sang,
//       ngày dùng là ngày mới.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('phan-hoi-0709');
sinhDuLieu(DIR);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'ph0709_qt');

const { BASE, dung } = await dungMayChu({ port: 4617, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

try {
  const qt = await login('ph0709_qt', mkQt);
  const ph = await login('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Khảo sát — phải trả lời đủ mọi câu rồi mới gửi được (Đ135)');
  {
    const tao = await req('POST', '/api/surveys', { cookie: qt.cookie, body: {
      title: 'Khảo sát thử đủ câu', deadline: '2030-12-31', audience: 'all',
      questions: [
        { text: 'Gia đình có hài lòng không?', type: 'choice', options: ['Có', 'Chưa'] },
        { text: 'Góp ý thêm cho trường', type: 'text' },
        { text: 'Bé thích món nào nhất?', type: 'text' },
      ],
    } });
    check('đối chứng — tạo được khảo sát ba câu', tao.status === 201 && tao.data.id, `${tao.status} ${JSON.stringify(tao.data).slice(0, 120)}`);
    const id = tao.data.id;
    // Mã câu hỏi do máy chủ đặt (q1, q2, …) và chỉ có ở đường đọc chi tiết.
    const chiTiet = await req('GET', `/api/surveys/${id}`, { cookie: ph.cookie });
    const q = (chiTiet.data && chiTiet.data.questions || []).map(x => x.id);
    check('đối chứng — có đủ ba mã câu hỏi', q.length === 3, q);

    const thieu = await req('POST', `/api/surveys/${id}/respond`, { cookie: ph.cookie, body: { answers: { [q[0]]: 'Có', [q[1]]: 'Rất tốt' } } });
    check('bỏ trống câu tự luận thứ ba → bị từ chối 400', thieu.status === 400, `${thieu.status}`);
    check('câu từ chối nói rõ còn thiếu câu 3', /thiếu câu 3/.test(thieu.data.error || ''), thieu.data.error);
    check('và trả kèm danh sách câu thiếu để màn hình trỏ đúng ô', Array.isArray(thieu.data.thieu) && thieu.data.thieu[0] === 3, thieu.data.thieu);

    const trong = await req('POST', `/api/surveys/${id}/respond`, { cookie: ph.cookie, body: { answers: { [q[0]]: 'Có', [q[1]]: '   ', [q[2]]: 'Cháo' } } });
    check('toàn dấu cách cũng tính là chưa trả lời', trong.status === 400 && /thiếu câu 2/.test(trong.data.error || ''), `${trong.status} ${trong.data.error}`);

    const du = await req('POST', `/api/surveys/${id}/respond`, { cookie: ph.cookie, body: { answers: { [q[0]]: 'Có', [q[1]]: 'Rất tốt', [q[2]]: 'Cháo' } } });
    check('trả lời đủ ba câu → gửi được', du.status === 201, `${du.status} ${JSON.stringify(du.data).slice(0, 100)}`);

    const v = fs.readFileSync(path.join(GOC, 'public/js/views/surveys.js'), 'utf8');
    check('màn hình cũng chặn câu tự luận trống trước khi gửi', /if \(!val\) \{[\s\S]{0,200}còn thiếu câu/.test(v));
  }

  // =========================================================================
  console.log('\n[2] Thực đơn — năm bữa của trường, xem theo thứ; ô dán bảng (Đ132) đã gỡ ở Đ231');
  {
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/menu.js'), 'utf8');
    // Nạp màn thực đơn vào một sandbox nhỏ để gọi thẳng hàm đọc bảng.
    const sb = { App: { views: {} }, UI: { esc: x => String(x), icon: () => '', thuVN: () => 1, todayStr: () => '2026-01-05', DOW: [] }, API: {} };
    vm.createContext(sb);
    vm.runInContext(v, sb);
    const menu = sb.App.views.menu;
    check('đối chứng — nạp được màn thực đơn', !!(menu && menu.BUA_MAC_DINH), Object.keys(sb.App.views));

    const nhan = menu.BUA_MAC_DINH.map(b => b.label);
    check('khung năm bữa đúng thứ tự trường chốt', JSON.stringify(nhan) === JSON.stringify(['Bữa sáng', 'Bữa phụ sáng', 'Bữa trưa', 'Bữa phụ chiều', 'Sữa Vinamilk']), nhan);
    check('ba mã cũ giữ nguyên để Nhật ký ngày còn nối được bữa', ['breakfast', 'lunch', 'snack'].every(t => menu.BUA_MAC_DINH.some(b => b.type === t)));
    check('mỗi bữa có biểu tượng riêng', menu.BUA_MAC_DINH.every(b => menu.MEAL_EMOJI[b.type]));
    check('có dải chọn T2…T6 và "Cả tuần"', /segNgay\(\)/.test(v) && /Cả tuần/.test(v));
    check('màn xem cả tuần vẫn dùng lưới tuần', /class="luoi-tuan"/.test(v));

    // Ô "dán từ bảng" của Đ132 đã GỠ ở Đ231 — chủ dự án chốt 07/10: đổ thực
    // đơn từ Excel chỉ qua tệp mẫu (Đ226, canh ở test/thuc-don-excel.test.mjs).
    check('ô dán từ bảng đã gỡ khỏi màn soạn tuần', !/id="td-dan"/.test(v) && typeof menu.docBangDan !== 'function');
    check('đường tải tệp Excel mẫu vẫn còn ở màn thực đơn', /mn-xl-tai/.test(v) && /\/api\/menu\/nap-excel/.test(v));
  }

  // =========================================================================
  console.log('\n[3] Dặn thuốc — dặn lại đơn cũ (Đ134)');
  {
    const ds = await req('GET', '/api/medicine', { cookie: ph.cookie });
    check('đối chứng — gia đình có đơn cũ trong dữ liệu mẫu', ds.status === 200 && ds.data.length > 0, `${ds.status} ${ds.data && ds.data.length}`);
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/medicine.js'), 'utf8');
    check('thẻ đơn có nút "Dặn lại như đơn này"', /data-dan-lai=/.test(v) && /Dặn lại như đơn này/.test(v));
    check('dặn lại chép THUỐC và GHI CHÚ, không chép ngày (đợt mới là đợt mới)',
      /openCreate\(\{ studentId: m\.studentId, medicines: m\.medicines \|\| \[\], note: m\.note \|\| '' \}\)/.test(v)
      && /value="\$\{UI\.esc\(today\)\}"/.test(v));
    check('ô thuốc điền sẵn từ đơn cũ', /medFieldset\(t\)/.test(v) && /value="\$\{v\('name'\)\}"/.test(v));
    check('màn nói rõ đã chép từ đơn trước để gia đình xem lại', /Đã chép thuốc và ghi chú từ đơn trước/.test(v));
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Phản hồi 07/09: khảo sát đủ câu, thực đơn năm bữa, dặn lại thuốc');
