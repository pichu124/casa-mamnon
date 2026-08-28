// Bài canh DẶN THUỐC — app chỉ ghi thứ app biết chắc.
//
// Chạy bằng:  npm run test:dan-thuoc
//
// VÌ SAO CÓ BÀI NÀY
//
// Nhà trường chạy thử quy trình nhận thuốc thật rồi chốt: app chỉ cần ghi
// "cô đã nhận thuốc", bỏ hẳn bước cô gõ tay từng dòng "đã cho con uống".
//
// Đây không phải chuyện gọn màn hình. Cô đang đứng nhóm với 20 bé thì không
// rảnh tay mở app gõ từng dòng; dòng nào cô không kịp ghi sẽ nằm trống, mà một
// khoảng trống trên màn hình phụ huynh đọc ra thành "cô quên cho con uống".
// Sai, và mất lòng tin nhanh hơn bất cứ lỗi kỹ thuật nào.
//
// Bước bị bỏ rất dễ mọc lại: chỉ cần một lần ai đó thấy màn "Đang theo dõi"
// trống trải rồi thêm lại cái ô nhập cho "đầy đặn". Bài này canh đúng chỗ đó.
//
// Kèm theo: bỏ một bước là NGƯNG GHI THÊM, không phải xóa thứ phụ huynh đã đọc
// thấy. Dòng nhật ký cũ phải còn nguyên.
import { thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, HOM_NAY as homNayVN } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('dan-thuoc');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3948), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const GV = (await login('giaovien', '123456')).cookie;   // cô Mai Anh, nhóm c1
const PH = (await login('phuhuynh', '123456')).cookie;   // chị Thu Hà, mẹ bé s1 (c1)

const man = await (await fetch(`${sv.BASE}/js/views/medicine.js`)).text();

// ===========================================================================
console.log('\n[1] Màn hình của cô KHÔNG còn bước "đã cho uống"');
{
  check('không còn ô nhập nhật ký thuốc trên màn của cô',
    !/id="md-log-|md-log-\$\{/.test(man));
  check('không còn nút "Ghi nhật ký"', !/Ghi nhật ký/.test(man));
  check('không còn hàm submitLog — không màn hình nào gọi đường ghi nhật ký nữa',
    !/submitLog/.test(man));
  check('không còn gợi ý gõ "Đã cho con uống..."', !/Đã cho con uống/.test(man));

  // Và thứ PHẢI còn lại.
  check('vẫn còn nút "Xác nhận đã nhận thuốc" — đây là thứ nhà trường giữ',
    /Xác nhận đã nhận thuốc/.test(man));
  check('vẫn còn cách cất đơn khi hết đợt, để danh sách của cô không dày lên mãi',
    /markDone/.test(man));
}

// ===========================================================================
console.log('\n[2] Luồng thật: gia đình gửi thuốc → cô nhận → gia đình thấy');
{
  const hnay = homNayVN();
  const gui = await req('POST', '/api/medicine', {
    cookie: PH,
    body: {
      studentId: 's1', fromDate: hnay, toDate: hnay,
      medicines: [{ name: 'Siro ho Prospan', dose: '5ml', timing: 'Sau bữa trưa' }],
      note: 'Thuốc để ngăn trước ba lô của con ạ',
    },
  });
  check('gia đình gửi được lời dặn thuốc', gui.status === 201, gui.data);
  const id = gui.data?.id;
  check('đơn mới ở trạng thái CHỜ XÁC NHẬN', gui.data?.status === 'pending', gui.data?.status);

  const nhan = await req('POST', `/api/medicine/${id}/confirm`, { cookie: GV });
  check('cô xác nhận đã nhận thuốc', nhan.status === 200, nhan.data);
  check('có ghi lại AI nhận và nhận LÚC NÀO — thứ duy nhất app biết chắc',
    !!nhan.data?.confirmedBy && !!nhan.data?.confirmedAt, nhan.data?.confirmedAt);

  const cuaMe = (await req('GET', '/api/medicine', { cookie: PH })).data.find(m => m.id === id);
  check('gia đình thấy đơn đã được cô nhận', cuaMe?.status === 'received', cuaMe?.status);
  check('kèm tên cô đã nhận, để gia đình biết hỏi ai',
    !!cuaMe?.confirmedByName, cuaMe?.confirmedByName);

  // Không có bước "đã cho uống" thì cũng KHÔNG được tự sinh ra một dòng nào
  // giả vờ rằng có. Nhật ký của đơn mới phải trống.
  check('ĐƠN MỚI KHÔNG TỰ MỌC RA DÒNG NHẬT KÝ NÀO — app không hứa thay cô',
    (cuaMe?.log || []).length === 0, cuaMe?.log);

  // Cất đơn khi hết đợt vẫn phải chạy.
  const cat = await req('POST', `/api/medicine/${id}/done`, { cookie: GV });
  check('cô cất được đơn khi hết đợt thuốc', cat.data?.status === 'done', cat.status);
}

// ===========================================================================
console.log('\n[3] Dòng nhật ký CŨ vẫn còn — bỏ bước ≠ xóa thứ đã đọc thấy');
{
  // Giả lập một đơn đời cũ: có nhật ký cô từng ghi trước khi nhà trường bỏ bước.
  const hnay = homNayVN();
  const gui = await req('POST', '/api/medicine', {
    cookie: PH,
    body: { studentId: 's1', fromDate: hnay, toDate: hnay, medicines: [{ name: 'Hapacol' }] },
  });
  const id = gui.data?.id;
  await req('POST', `/api/medicine/${id}/confirm`, { cookie: GV });

  const ghi = await req('POST', `/api/medicine/${id}/log`,
    { cookie: GV, body: { text: 'Đã cho con uống sau bữa trưa' } });
  check('đường ghi nhật ký CỐ Ý còn sống — điện thoại còn giữ bản app cũ vẫn gọi được',
    ghi.status === 200, ghi.status);

  const cuaMe = (await req('GET', '/api/medicine', { cookie: PH })).data.find(m => m.id === id);
  check('DÒNG CŨ VẪN VỀ TỚI MÀN HÌNH GIA ĐÌNH, không bị nuốt mất',
    (cuaMe?.log || []).some(e => /uống sau bữa trưa/.test(e.text)), cuaMe?.log);
  check('và màn hình vẫn có chỗ vẽ dòng cũ ra', /logItems/.test(man));
}

// ===========================================================================
console.log('\n[4] Ranh giới cũ không được nới ra theo');
{
  // s2 (Nguyễn Bảo Nam) học nhóm c2, không phải nhóm của cô Mai Anh.
  const ngoai = await req('POST', '/api/medicine', {
    cookie: PH,
    body: { studentId: 's2', fromDate: '2026-08-27', toDate: '2026-08-27', medicines: [{ name: 'Hapacol' }] },
  });
  check('mẹ dặn thuốc được cho CẢ HAI con của mình', ngoai.status === 201, ngoai.status);

  const idNgoai = ngoai.data?.id;
  const co = await req('POST', `/api/medicine/${idNgoai}/confirm`, { cookie: GV });
  check('cô KHÔNG xác nhận được đơn của bé nhóm khác', co.status === 403, co.status);
  const coGhi = await req('POST', `/api/medicine/${idNgoai}/log`, { cookie: GV, body: { text: 'x' } });
  check('và cũng KHÔNG ghi được nhật ký cho bé nhóm khác', coGhi.status === 403, coGhi.status);

  const phGhi = await req('POST', `/api/medicine/${idNgoai}/confirm`, { cookie: PH });
  check('phụ huynh KHÔNG tự xác nhận thay cô được', phGhi.status === 403, phGhi.status);
}

sv.dung();
donThuMucTam(DIR);
tongKet();
