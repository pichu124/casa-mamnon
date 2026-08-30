// Bài canh THỰC ĐƠN — phần soạn cả tuần một lượt (Y4).
//
// Chạy bằng:  npm run test:thuc-don
//
// VÌ SAO CÓ BÀI NÀY
//
// Nhà trường nói thẳng hai câu về màn này: "giao diện máy tính hơi khó nhìn"
// và muốn "nhập liệu nhanh nhất có thể". Vế thứ hai đẻ ra một đường ghi MỚI
// (`PUT /api/menu/tuan`) ghi 5 ngày trong một lần — mà một đường ghi nhiều bản
// ghi cùng lúc thì có đúng hai kiểu hỏng đáng sợ, và bài này canh cả hai:
//
//   1. GHI DỞ. Ngày thứ ba sai mà hai ngày đầu đã kịp ghi: người soạn nhận
//      một câu báo lỗi rồi không biết mình đang đứng ở đâu. Mục [3].
//
//   2. GHI THỪA. Ngày người soạn cố ý để trống mà máy vẫn tạo một bản ghi
//      rỗng: màn hình của gia đình hiện ra một ngày trắng, trông y như bếp
//      quên soạn. Mục [4].
//
// Và một điều nữa, quan trọng không kém: ĐƯỜNG CŨ PHẢI CHẠY Y NHƯ CŨ. Thêm
// một cách làm nhanh không được phép làm hỏng cách làm đang có (Nguyên tắc số
// 1). Mục [6].
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('thuc-don');
sinhDuLieu(DIR);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3998), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);
const C3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

// Tuần SAU — chọn tuần sau để không giẫm lên thực đơn tuần này của dữ liệu mẫu.
const tuanSau = (await req('GET', '/api/menu?week=1', { cookie: C1 })).data;
const NGAY = [0, 1, 2, 3, 4].map(i =>
  new Date(Date.parse(`${tuanSau.from}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10));

function bua(mon) {
  return [
    { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: mon.slice(0, 1) },
    { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: mon },
    { type: 'snack', label: 'Bữa xế', time: '14:30', items: mon.slice(0, 1) },
  ];
}
function trong() {
  return [
    { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: [] },
    { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: [] },
    { type: 'snack', label: 'Bữa xế', time: '14:30', items: [] },
  ];
}
async function docTuanSau() {
  const d = (await req('GET', '/api/menu?week=1', { cookie: C1 })).data;
  return new Map((d.menus || []).map(m => [m.date, m]));
}

// ===========================================================================
console.log('\n[1] Soạn cả tuần trong MỘT lần lưu');
{
  const r = await req('PUT', '/api/menu/tuan', {
    cookie: C1,
    body: {
      ngay: NGAY.map((date, i) => ({ date, meals: bua([`Món ngày ${i + 1}`, 'Canh rau ngót']) })),
    },
  });
  check('lưu được', r.status === 200, r.data);
  check('báo đúng số ngày đã lưu', r.data?.daLuu === 5, r.data);

  const co = await docTuanSau();
  check('cả 5 ngày đều có mặt trên màn hình xem', NGAY.every(d => co.has(d)), [...co.keys()]);
  check('món lưu xuống đúng của từng ngày',
    NGAY.every((d, i) => (co.get(d).meals.find(m => m.type === 'lunch')?.items || [])
      .includes(`Món ngày ${i + 1}`)), co.get(NGAY[0])?.meals);
  check('giữ đủ ba bữa mỗi ngày',
    NGAY.every(d => (co.get(d).meals || []).length === 3), co.get(NGAY[0])?.meals?.length);
}

// ===========================================================================
console.log('\n[2] Cô và gia đình không soạn; quản lý cơ sở chỉ soạn bếp mình');
{
  const co = await req('PUT', '/api/menu/tuan', {
    cookie: GV, body: { ngay: [{ date: NGAY[0], meals: bua(['Cô soạn']) }] },
  });
  check('cô KHÔNG soạn được thực đơn', co.status === 403, co.status);

  const ph = await req('PUT', '/api/menu/tuan', {
    cookie: PH, body: { ngay: [{ date: NGAY[0], meals: bua(['Phụ huynh soạn']) }] },
  });
  check('phụ huynh KHÔNG soạn được', ph.status === 403, ph.status);

  // QUẢN LÝ CƠ SỞ NAY SOẠN ĐƯỢC — NHƯNG CHỈ BẾP CỦA MÌNH.
  //
  // Luật này ĐỔI ở đợt thực đơn theo cơ sở. Trước đó đường này chặn Cấp 3, vì
  // bảng `menus` có một dòng mỗi ngày cho cả trường nên hai người sửa thì
  // người sau âm thầm đè người trước. Nhà trường chốt ngày 30/08 rằng ba cơ sở
  // nấu riêng bếp, nên đã tách bảng `menu_campus` rồi mới mở đường ra — đúng
  // thứ tự mà chú thích cũ dặn, chỉ khác chỗ là bảng phụ chứ không thêm cột
  // (lược đồ lõi cấm ALTER TABLE).
  //
  // Vế "không đè nhau" nay do `test:thuc-don-co-so` canh riêng và kỹ hơn: nó
  // kiểm cả hai chiều, cơ sở 2 thấy món mình VÀ cơ sở 1 không bị đổi theo.
  const cs = await req('PUT', '/api/menu/tuan', {
    cookie: C3, body: { ngay: [{ date: NGAY[0], meals: bua(['Cơ sở 1 soạn']) }] },
  });
  check('quản lý một cơ sở SOẠN ĐƯỢC bếp của cơ sở mình', cs.status === 200, cs.status);
  check('và máy chủ nói rõ nó vào bếp nào', !!cs.data?.campusId, JSON.stringify(cs.data));

  const csLac = await req('PUT', '/api/menu/tuan', {
    cookie: C3, body: { campusId: 'cs2', ngay: [{ date: NGAY[0], meals: bua(['Lấn sang cơ sở 2']) }] },
  });
  check('nhưng KHÔNG soạn được sang bếp cơ sở khác', csLac.status === 403, csLac.status);
  check('và câu từ chối nói rõ vì sao',
    /cơ sở mình phụ trách/i.test(csLac.data?.error || ''), csLac.data?.error);

  // BẢN DÙNG CHUNG KHÔNG BỊ ĐỘNG TỚI. Quản lý cơ sở vừa ghi vào bảng riêng của
  // cơ sở mình, nên bản của Cấp 1 phải còn nguyên — đây là chỗ kiểm rằng việc
  // mở đường ra KHÔNG làm sống lại cái hỏng mà nó từng bị chặn để tránh.
  const con = await docTuanSau();
  check('bản DÙNG CHUNG vẫn là bản của quản trị toàn hệ thống',
    (con.get(NGAY[0]).meals.find(m => m.type === 'lunch')?.items || []).includes('Món ngày 1'),
    con.get(NGAY[0])?.meals);
}

// ===========================================================================
console.log('\n[3] Một ngày sai thì KHÔNG ngày nào bị ghi dở');
{
  const truoc = await docTuanSau();
  const monCu = truoc.get(NGAY[0]).meals.find(m => m.type === 'lunch').items;

  const r = await req('PUT', '/api/menu/tuan', {
    cookie: C1,
    body: {
      ngay: [
        { date: NGAY[0], meals: bua(['Món mới ngày một']) },
        { date: NGAY[1], meals: bua(['Món mới ngày hai']) },
        // Bữa thiếu TÊN — máy chủ phải từ chối cả mẻ.
        { date: NGAY[2], meals: [{ type: 'lunch', label: '', time: '10:45', items: ['Cơm'] }] },
        { date: NGAY[3], meals: bua(['Món mới ngày bốn']) },
      ],
    },
  });
  check('cả mẻ bị từ chối', r.status === 400, r.status);
  check('báo lỗi nói rõ NGÀY NÀO sai, không bắt dò tay',
    new RegExp(NGAY[2]).test(r.data?.error || ''), r.data?.error);

  const sau = await docTuanSau();
  check('NGÀY ĐẦU KHÔNG BỊ GHI DỞ — vẫn là món cũ',
    JSON.stringify(sau.get(NGAY[0]).meals.find(m => m.type === 'lunch').items) === JSON.stringify(monCu),
    sau.get(NGAY[0])?.meals);
  check('ngày thứ hai cũng vậy',
    !(sau.get(NGAY[1]).meals.find(m => m.type === 'lunch')?.items || []).includes('Món mới ngày hai'),
    sau.get(NGAY[1])?.meals);

  // Ngày sai định dạng cũng chặn cả mẻ.
  const xau = await req('PUT', '/api/menu/tuan', {
    cookie: C1,
    body: { ngay: [{ date: NGAY[0], meals: bua(['X']) }, { date: '07/09/2026', meals: bua(['Y']) }] },
  });
  check('ngày sai định dạng chặn cả mẻ', xau.status === 400, xau.status);
  check('và ngày hợp lệ đứng trước nó KHÔNG bị ghi',
    !((await docTuanSau()).get(NGAY[0]).meals.find(m => m.type === 'lunch')?.items || []).includes('X'));
}

// ===========================================================================
console.log('\n[4] Ngày để trống hẳn thì BỎ QUA, không tạo ngày trắng');
{
  // Thứ Bảy của tuần sau — chắc chắn chưa ai soạn.
  const thuBay = new Date(Date.parse(`${NGAY[4]}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const r = await req('PUT', '/api/menu/tuan', {
    cookie: C1,
    body: {
      ngay: [
        { date: NGAY[0], meals: bua(['Món giữ lại']) },
        { date: thuBay, meals: trong() },
      ],
    },
  });
  check('lưu được', r.status === 200, r.data);
  check('CHỈ ĐẾM ngày thật sự có món', r.data?.daLuu === 1, r.data);
  check('ngày trống KHÔNG được tạo bản ghi rỗng',
    !(r.data?.ngay || []).includes(thuBay), r.data?.ngay);

  const kiem = (await req('GET', '/api/menu?week=1', { cookie: C1 })).data;
  check('và nó cũng không hiện ra trên màn hình',
    !(kiem.menus || []).some(m => m.date === thuBay), (kiem.menus || []).map(m => m.date));

  // Nhưng XOÁ HẾT MÓN của một ngày ĐÃ CÓ thì vẫn lưu được — đó là người soạn
  // cố ý dọn sạch, khác hẳn một ngày chưa ai đụng tới.
  const don = await req('PUT', '/api/menu/tuan', {
    cookie: C1, body: { ngay: [{ date: NGAY[4], meals: trong() }] },
  });
  check('dọn sạch món của một ngày đã có thì vẫn lưu', don.status === 200 && don.data?.daLuu === 1, don.data);
  const sau = await docTuanSau();
  check('ngày đó còn nguyên tên bữa, chỉ trống món',
    (sau.get(NGAY[4]).meals || []).length === 3
    && !(sau.get(NGAY[4]).meals.find(m => m.type === 'lunch')?.items || []).length,
    sau.get(NGAY[4])?.meals);
}

// ===========================================================================
console.log('\n[5] Dữ liệu gửi lên vô lý thì từ chối trước khi ghi');
{
  const rong = await req('PUT', '/api/menu/tuan', { cookie: C1, body: { ngay: [] } });
  check('danh sách rỗng bị từ chối', rong.status === 400, rong.status);

  const khongPhaiMang = await req('PUT', '/api/menu/tuan', { cookie: C1, body: { ngay: 'thứ hai' } });
  check('không phải mảng cũng bị từ chối', khongPhaiMang.status === 400, khongPhaiMang.status);

  const qua = await req('PUT', '/api/menu/tuan', {
    cookie: C1,
    body: {
      ngay: Array.from({ length: 9 }, (_, i) => ({
        date: new Date(Date.parse(`${NGAY[0]}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10),
        meals: bua(['X']),
      })),
    },
  });
  check('gửi quá nhiều ngày một lúc bị từ chối', qua.status === 400, qua.status);

  const trung = await req('PUT', '/api/menu/tuan', {
    cookie: C1,
    body: { ngay: [{ date: NGAY[0], meals: bua(['A']) }, { date: NGAY[0], meals: bua(['B']) }] },
  });
  check('cùng một ngày gửi hai lần bị từ chối — không đoán lấy bản nào',
    trung.status === 400, trung.status);
  check('báo lỗi nói rõ là trùng ngày', /hai lần/i.test(trung.data?.error || ''), trung.data?.error);
}

// ===========================================================================
console.log('\n[6] ĐƯỜNG CŨ VẪN CHẠY Y NHƯ CŨ — thêm cách nhanh, không bỏ cách đang có');
{
  const r = await req('PUT', `/api/menu/${NGAY[3]}`, {
    cookie: C1, body: { meals: bua(['Soạn bằng đường cũ']) },
  });
  check('soạn từng ngày vẫn lưu được', r.status === 200, r.data);
  const co = await docTuanSau();
  check('và món lưu xuống đúng',
    (co.get(NGAY[3]).meals.find(m => m.type === 'lunch')?.items || []).includes('Soạn bằng đường cũ'),
    co.get(NGAY[3])?.meals);

  // "tuan" KHÔNG được rơi vào chỗ :date của đường cũ. Express khớp theo thứ tự
  // đăng ký, nên đường mới phải nằm TRƯỚC — để sau thì người soạn nhận câu
  // "Ngày chưa đúng dạng" khó hiểu thay vì lưu được.
  const ma = fs.readFileSync(path.join(GOC, 'routes/menu.js'), 'utf8');
  check('đường /api/menu/tuan đăng ký TRƯỚC /api/menu/:date',
    ma.indexOf("'/api/menu/tuan'") > -1
    && ma.indexOf("'/api/menu/tuan'") < ma.indexOf("'/api/menu/:date'"),
    { tuan: ma.indexOf("'/api/menu/tuan'"), date: ma.indexOf("'/api/menu/:date'") });

  const chep = await req('POST', '/api/menu/copy-week', { cookie: C1, body: { week: 1 } });
  check('chép tuần trước vẫn chạy', chep.status === 200, chep.data);

  const xem = await req('GET', '/api/menu', { cookie: PH });
  check('phụ huynh vẫn xem được thực đơn như cũ', xem.status === 200, xem.status);
  check('và vẫn nhận đủ 5 ngày của tuần', (xem.data?.menus || []).length === 5, xem.data?.menus?.length);
}

// ===========================================================================
console.log('\n[7] "Khó nhìn trên máy tính" — 5 ngày xếp NGANG, không xếp dọc');
{
  // Phần này canh được bằng mã nguồn: có lưới, lưới chỉ bật ở màn rộng, và
  // màn hình thật sự dùng nó. Cảm giác đẹp xấu thì máy không đo được, nhưng
  // "5 ngày vẫn xếp một cột trên máy tính" thì đo được.
  const css = fs.readFileSync(path.join(GOC, 'public/css/app.css'), 'utf8');
  check('có lưới tuần trong CSS', /\.luoi-tuan\s*\{/.test(css));
  check('lưới CHỈ bật ở màn rộng — điện thoại vẫn một cột',
    /@media \(min-width: 700px\)[\s\S]{0,400}\.luoi-tuan\s*\{[^}]*grid-template-columns/.test(css));

  const view = fs.readFileSync(path.join(GOC, 'public/js/views/menu.js'), 'utf8');
  check('màn xem dùng lưới đó', /class="luoi-tuan"/.test(view));
  check('màn soạn cả tuần cũng dùng, với cột rộng hơn để có chỗ gõ',
    /luoi-tuan dang-soan/.test(view) && /\.luoi-tuan\.dang-soan/.test(css));
}

// ===========================================================================
console.log('\n[8] "Nhập nhanh nhất có thể" — ba ô gõ mỗi ngày, một nút Lưu');
{
  const view = fs.readFileSync(path.join(GOC, 'public/js/views/menu.js'), 'utf8');
  check('có nút mở màn soạn cả tuần', /Soạn cả tuần/.test(view));
  check('một nút Lưu duy nhất cho cả tuần', /Lưu cả tuần/.test(view));
  check('tên bữa và giờ ăn được GẤP LẠI, không chiếm chỗ khi không cần',
    /<details>[\s\S]*?Sửa tên bữa và giờ ăn/.test(view));
  check('có nút chép nhanh từ ngày liền trước', /Giống hôm trước/.test(view) && /chepNgayTruoc/.test(view));

  // Chuyển qua chuyển lại giữa các ngày mà mất chữ đang gõ là lỗi khó chịu
  // nhất của kiểu màn này.
  check('đọc lại những gì đang gõ trước khi vẽ lại màn',
    /docManHinh\(\)[\s\S]{0,200}veSoanTuan/.test(view.replace(/\n/g, '\n')));

  // Hộp thoại soạn TỪNG NGÀY vẫn còn: ai quen cách cũ vẫn dùng được.
  check('cách soạn từng ngày vẫn còn nguyên', /moSoan\(date\)/.test(view) && /luuSoan\(\)/.test(view));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
