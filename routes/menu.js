// Phân hệ Thực đơn bán trú: xem thực đơn tuần trước / tuần này / tuần sau
// (cả phụ huynh và giáo viên); quản trị (văn phòng, nhà bếp) soạn và sửa.
const db = require('../lib/db');
const ngay = require('../lib/ngay');
const { requireRole } = require('../lib/auth');

// Giới hạn để dữ liệu lưu xuống luôn hiển thị lại được trên điện thoại.
const TOI_DA_BUA = 5;        // số bữa mỗi ngày
const TOI_DA_MON_BUA = 20;   // số món mỗi bữa
const TOI_DA_TEN_MON = 100;  // độ dài tên món
const TOI_DA_NGAY_MOT_LAN = 7;  // số ngày gửi lên trong một lần soạn cả tuần

// Thứ Hai của tuần cách tuần hiện tại `week` tuần (âm = quá khứ), trả về
// YYYY-MM-DD theo GIỜ VIỆT NAM.
//
// Bản cũ tính bằng giờ máy chủ (`new Date()` rồi getFullYear/getMonth/getDate).
// Sáng sớm ở Việt Nam mà máy chủ đứng ở UTC thì "tuần này" của thực đơn lệch
// một ngày so với "hôm nay" của sổ điểm danh — hai màn cô mở cạnh nhau mỗi
// sáng. Nay cả app chỉ có một định nghĩa, ở lib/ngay.js.
function thuHaiCuaTuan(week) {
  return congNgay(ngay.homNay(), -lechThuHai(ngay.homNay()) + week * 7);
}

// Cộng n ngày vào một chuỗi YYYY-MM-DD. Neo vào T00:00:00Z rồi cộng theo mili
// giây: phép này không đi qua múi giờ nào cả nên không bao giờ lệch một ngày.
function congNgay(ngayStr, n) {
  const t = Date.parse(`${ngayStr}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

// Hôm đó cách thứ Hai của tuần mấy ngày (thứ Hai = 0, Chủ nhật = 6).
function lechThuHai(ngayStr) {
  const t = Date.parse(`${ngayStr}T00:00:00Z`);
  return (new Date(t).getUTCDay() + 6) % 7;
}

// Chuẩn hóa danh sách bữa ăn của một ngày. Trả về null nếu không hợp lệ.
function lamSachBuaAn(meals) {
  if (!Array.isArray(meals) || !meals.length || meals.length > TOI_DA_BUA) return null;
  const out = [];
  for (const m of meals) {
    const o = m && typeof m === 'object' ? m : {};
    const label = String(o.label || '').trim().slice(0, 40);
    if (!label) return null; // mỗi bữa phải có tên
    if (o.items !== undefined && !Array.isArray(o.items)) return null;
    out.push({
      type: String(o.type || 'other').trim().slice(0, 20) || 'other',
      label,
      time: String(o.time || '').trim().slice(0, 20),
      items: (o.items || [])
        .map(it => String(it ?? '').trim().slice(0, TOI_DA_TEN_MON))
        .filter(Boolean)
        .slice(0, TOI_DA_MON_BUA),
    });
  }
  return out;
}

// BA CƠ SỞ NẤU RIÊNG BẾP — nhà trường chốt ngày 30/08.
//
// Trước đợt này thực đơn là của CẢ TRƯỜNG: một bản ghi mỗi ngày trong `menus`,
// và quản lý cơ sở bị chặn không cho sửa, vì hai người sửa thì người sau âm
// thầm ghi đè người trước.
//
// Nay mỗi cơ sở có bảng riêng `menu_campus`. Luật đọc và ghi gói gọn trong ba
// hàm dưới đây, để không chỗ nào trong tệp này phải tự đoán lại.

// Cơ sở mà một người ĐANG XEM thực đơn của.
//
// • Gia đình  → cơ sở của nhóm con đang học.
// • Cô        → cơ sở của nhóm cô phụ trách.
// • Quản trị Cấp 3 → cơ sở mình bị khoá vào.
// • Quản trị Cấp 1 → không cố định; lấy theo `?campusId=` nếu có, không thì
//                    xem bản dùng chung.
//
// Trả về null nghĩa là "không gắn với cơ sở nào" — khi đó đọc bản dùng chung,
// đúng như app vẫn chạy từ trước tới nay.
function coSoDangXem(user, campusIdMuon) {
  if (!user) return null;
  if (user.role === 'admin') {
    // `phamViCoSo` trả về MỘT MÃ cơ sở (chuỗi) hoặc null, không phải mảng.
    //
    // Bản đầu của hàm này viết `khoa.length === 1` như thể nó là mảng. Chuỗi
    // 'cs2' cũng có `.length`, bằng 3, nên điều kiện không bao giờ đúng và mọi
    // quản lý cơ sở rơi xuống nhánh Cấp 1 — tức ghi thẳng vào bảng dùng chung.
    // Phép thử tay bắt được ngay: món của cơ sở 2 hiện lên màn hình gia đình
    // cơ sở 1. Đúng cái hỏng mà chú thích cũ ở đường PUT đã cảnh báo.
    const khoa = db.phamViCoSo(user);
    if (khoa) return khoa;
    return campusIdMuon && db.canAccessCampus(user, campusIdMuon) ? campusIdMuon : null;
  }
  // Gia đình có con học ở HAI cơ sở (cô dạy hai cơ sở cũng vậy): không được
  // chết cứng ở cơ sở "đầu danh sách". Tôn trọng `?campusId=` khi nó nằm trong
  // các cơ sở CỦA CHÍNH HỌ — để màn hình đổi theo bé đang chọn — còn không
  // gửi gì thì lấy cơ sở đầu tiên, đúng hành vi cũ.
  const nhom = db.classIdsOf(user);
  const cuaMinh = [];
  for (const c of (nhom || [])) {
    const cs = db.campusOfClass(c);
    if (cs && !cuaMinh.includes(cs)) cuaMinh.push(cs);
  }
  if (campusIdMuon && cuaMinh.includes(campusIdMuon)) return campusIdMuon;
  return cuaMinh[0] || null;
}

// Cơ sở mà một người quản trị ĐƯỢC GHI vào.
//
// Cấp 3 chỉ ghi được cơ sở mình. Cấp 1 ghi được bất cứ cơ sở nào nếu nói rõ
// `campusId`, và ghi vào bản DÙNG CHUNG nếu không nói gì — giữ nguyên đường cũ
// cho trường một bếp.
//
// Trả về { ok: false, loi } nếu không được phép.
function coSoDuocGhi(user, campusIdMuon) {
  const khoa = db.phamViCoSo(user);
  if (khoa) {
    if (campusIdMuon && campusIdMuon !== khoa) {
      return { ok: false, loi: 'Tài khoản này chỉ soạn được thực đơn của cơ sở mình phụ trách' };
    }
    return { ok: true, campusId: khoa };
  }
  if (campusIdMuon && !db.findCampus(campusIdMuon)) {
    return { ok: false, loi: 'Không tìm thấy cơ sở này' };
  }
  return { ok: true, campusId: campusIdMuon || null };
}

// Thực đơn của một khoảng ngày cho một cơ sở, ĐÃ GỘP với bản dùng chung.
//
// Dòng riêng của cơ sở thắng; ngày nào cơ sở chưa soạn riêng thì lấy bản dùng
// chung. Nhờ vậy trường có thể chỉ soạn riêng đúng những ngày bếp nấu khác.
function thucDonCua(campusId, from, to) {
  const chung = new Map(db.all('menus',
    'SELECT * FROM menus WHERE date BETWEEN ? AND ? ORDER BY date', [from, to])
    .map(m => [m.date, { date: m.date, meals: m.meals, rieng: false }]));
  if (campusId) {
    for (const m of db.all('menu_campus',
      'SELECT * FROM menu_campus WHERE campusId = ? AND date BETWEEN ? AND ? ORDER BY date',
      [campusId, from, to])) {
      chung.set(m.date, { date: m.date, meals: m.meals, rieng: true, capNhatLuc: m.capNhatLuc });
    }
  }
  return [...chung.values()].sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = (app) => {
  // Thực đơn theo tuần: ?week=0 (tuần này, mặc định) | 1 (tuần sau) | -1 (tuần trước).
  app.get('/api/menu', (req, res) => {
    const week = req.query.week === '1' ? 1 : (req.query.week === '-1' ? -1 : 0);
    const from = thuHaiCuaTuan(week);
    const to = congNgay(from, 4);
    const campusId = coSoDangXem(req.user, String(req.query.campusId || ''));
    const cs = campusId ? db.findCampus(campusId) : null;
    res.json({
      week, from, to,
      campusId: campusId || null,
      tenCoSo: cs ? cs.name : '',
      // Danh sách cơ sở CHỈ cho người soạn được nhiều cơ sở (Cấp 1), để màn
      // hình dựng ô chọn. Gia đình và cô không cần — và cũng không nên thấy
      // tên các cơ sở khác trong một màn thực đơn.
      cacCoSo: req.user && req.user.role === 'admin' && db.phamViCoSo(req.user) === null
        ? db.campuses().map(c => ({ id: c.id, name: c.name }))
        : [],
      menus: thucDonCua(campusId, from, to),
    });
  });

  // SOẠN CẢ TUẦN TRONG MỘT LẦN LƯU.
  //
  // Nhà trường nói thẳng: "giao diện máy tính hơi khó nhìn", và muốn nhập liệu
  // nhanh nhất có thể. Soạn một tuần bằng đường cũ là mở 5 hộp thoại và bấm
  // Lưu 5 lần — mỗi tuần một lần, mỗi năm gần 40 lần.
  //
  // ĐẶT TRƯỚC `/api/menu/:date`. Express khớp đường dẫn theo thứ tự đăng ký,
  // nên để sau thì "tuan" rơi vào chỗ :date và người soạn nhận được câu
  // "Ngày chưa đúng dạng" khó hiểu.
  //
  // MỘT GIAO DỊCH, KHÔNG PHẢI 5 LỜI GỌI. Gọi 5 lần thì lỗi ở ngày thứ ba để
  // lại một tuần soạn dở — hai ngày đã lưu, ba ngày chưa — mà màn hình vừa
  // báo lỗi nên người soạn không biết mình đang đứng ở đâu.
  app.put('/api/menu/tuan', requireRole('admin'), (req, res) => {
    const quyen = coSoDuocGhi(req.user, String((req.body || {}).campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;
    const ds = (req.body || {}).ngay;
    if (!Array.isArray(ds) || !ds.length || ds.length > TOI_DA_NGAY_MOT_LAN) {
      return res.status(400).json({
        error: `Danh sách ngày chưa hợp lệ (gửi từ 1 đến ${TOI_DA_NGAY_MOT_LAN} ngày một lần)`,
      });
    }

    // Kiểm TOÀN BỘ trước khi ghi dòng nào.
    const sach = [];
    const daThay = new Set();
    for (const x of ds) {
      const date = String((x || {}).date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: `Ngày "${date}" chưa đúng dạng, ví dụ đúng: 2026-09-07` });
      }
      if (daThay.has(date)) {
        return res.status(400).json({ error: `Ngày ${date} bị gửi lên hai lần trong cùng một lần lưu` });
      }
      daThay.add(date);

      const cu = campusId
        ? db.first('menu_campus', 'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, date])
        : db.first('menus', 'SELECT * FROM menus WHERE date = ?', [date]);
      // Ngày người soạn để trống hẳn mà trước đó cũng chưa có gì: BỎ QUA. Tạo
      // một bản ghi rỗng là màn hình của gia đình hiện ra một ngày trắng trông
      // như bếp quên soạn.
      const trongHan = Array.isArray((x || {}).meals)
        && (x.meals || []).every(m => !((m && m.items) || []).length);
      if (!cu && trongHan) continue;

      const meals = lamSachBuaAn((x || {}).meals);
      if (!meals) {
        return res.status(400).json({ error: `Thực đơn ngày ${date} chưa hợp lệ. Mỗi bữa cần có tên bữa.` });
      }
      sach.push({ date, meals, cu });
    }

    // Mốc ĐẦY ĐỦ (ISO), không phải giờ-phút trong ngày: `ngay.bayGio()` chỉ trả
    // "HH:MM", lưu vào capNhatLuc là vĩnh viễn không tra được thực đơn cơ sở
    // này được sửa HÔM NÀO — đúng lúc cần đối chiếu "bếp đổi món khi nào" thì
    // sổ chỉ còn giờ mà không còn ngày.
    const luc = new Date().toISOString();
    db.tx(() => {
      for (const { date, meals, cu } of sach) {
        if (campusId) {
          db.upsert('menu_campus',
            { campusId, date, meals, nguoiDang: req.user.id, capNhatLuc: luc },
            ['campusId', 'date']);
        } else if (cu) db.update('menus', cu.id, { meals });
        else db.insert('menus', { id: db.nextId('menu'), date, meals });
      }
    });
    db.audit(req.user.id, 'menu-update-tuan', campusId || null, { soNgay: sach.length, campusId });
    res.json({ daLuu: sach.length, ngay: sach.map(x => x.date), campusId: campusId || null });
  });

  // Quản trị soạn/sửa thực đơn một ngày. Mỗi ngày một bản ghi, ghi đè cả ngày.
  app.put('/api/menu/:date', requireRole('admin'), (req, res) => {
    // ĐƯỜNG NÀY TRƯỚC ĐÂY CHẶN CẤP 3, và chú thích cũ dặn "muốn mở thì thêm
    // cột cơ sở vào `menus`". Không đi đường đó được: `menus.date` là UNIQUE,
    // đổi khoá phải dựng lại bảng, mà lược đồ lõi cấm ALTER TABLE — và dựng
    // lại một bảng đang có dữ liệu thật là đúng thứ Nguyên tắc số 1 cấm.
    //
    // Đường đã đi: bảng phụ `menu_campus`. Quản lý cơ sở ghi vào cơ sở mình,
    // Cấp 1 ghi vào cơ sở nào cũng được hoặc vào bản dùng chung. Không ai ghi
    // đè ai nữa, vì hai người ở hai cơ sở ghi vào hai dòng khác nhau.
    const quyen = coSoDuocGhi(req.user, String((req.body || {}).campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;

    const date = String(req.params.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-09-07' });
    }
    const meals = lamSachBuaAn((req.body || {}).meals);
    if (!meals) {
      return res.status(400).json({ error: 'Danh sách bữa ăn chưa hợp lệ. Mỗi bữa cần có tên bữa.' });
    }

    if (campusId) {
      db.upsert('menu_campus',
        // ISO đủ ngày giờ, cùng đường /api/menu/tuan (Đ118f): 'HH:MM' thì
        // không bao giờ tra được thực đơn cơ sở sửa hôm nào.
        { campusId, date, meals, nguoiDang: req.user.id, capNhatLuc: new Date().toISOString() },
        ['campusId', 'date']);
      db.audit(req.user.id, 'menu-update', date, { soBua: meals.length, campusId });
      return res.json({ date, meals, campusId, rieng: true });
    }

    const cu = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [date]);
    let rec;
    if (cu) {
      rec = { ...cu, meals };
      db.update('menus', cu.id, { meals });
    } else {
      rec = { id: db.nextId('menu'), date, meals };
      db.insert('menus', rec);
    }
    db.audit(req.user.id, 'menu-update', date, { soBua: meals.length });
    res.json({ ...rec, campusId: null, rieng: false });
  });

  // Chép thực đơn của tuần liền trước sang tuần đích (0 = tuần này, 1 = tuần sau).
  // Chỉ chép vào những ngày tuần đích còn trống — không ghi đè thứ đã soạn.
  app.post('/api/menu/copy-week', requireRole('admin'), (req, res) => {
    const quyen = coSoDuocGhi(req.user, String((req.body || {}).campusId || ''));
    if (!quyen.ok) return res.status(403).json({ error: quyen.loi });
    const campusId = quyen.campusId;

    const week = Number((req.body || {}).week);
    if (week !== 0 && week !== 1) {
      return res.status(400).json({ error: 'Tuần đích chưa hợp lệ (0 = tuần này, 1 = tuần sau)' });
    }
    const nguon = thuHaiCuaTuan(week - 1);
    const dich = thuHaiCuaTuan(week);
    const luc = ngay.bayGio();
    let daChep = 0;

    // CHÉP TRONG PHẠM VI CỦA CHÍNH CƠ SỞ ẤY.
    //
    // Nguồn lấy qua `thucDonCua` nên nếu tuần trước cơ sở chưa soạn riêng, nó
    // chép bản dùng chung sang — đúng ý "tuần này giống tuần trước". Đích thì
    // chỉ nhìn dòng RIÊNG: một ngày mới có bản dùng chung mà cơ sở chưa soạn
    // riêng vẫn là "còn trống" với cơ sở đó.
    db.tx(() => {
      const dsNguon = new Map(thucDonCua(campusId, nguon, congNgay(nguon, 4)).map(m => [m.date, m]));
      for (let d = 0; d < 5; d++) {
        const ngayNguon = congNgay(nguon, d);
        const ngayDich = congNgay(dich, d);
        const mNguon = dsNguon.get(ngayNguon);
        if (!mNguon) continue;
        if (campusId) {
          const co = db.first('menu_campus',
            'SELECT * FROM menu_campus WHERE campusId = ? AND date = ?', [campusId, ngayDich]);
          if (co) continue;
          db.insert('menu_campus', {
            campusId, date: ngayDich, meals: mNguon.meals,
            nguoiDang: req.user.id, capNhatLuc: luc,
          });
        } else {
          const mDich = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngayDich]);
          if (mDich) continue; // ngày đã soạn thì giữ nguyên
          db.insert('menus', { id: db.nextId('menu'), date: ngayDich, meals: mNguon.meals });
        }
        daChep++;
      }
    });
    db.audit(req.user.id, 'menu-copy-week', String(week), { daChep, campusId });
    res.json({ daChep, campusId: campusId || null });
  });
};
