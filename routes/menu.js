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

// Thực đơn hiện là của CẢ TRƯỜNG (một bản ghi mỗi ngày), nên chỉ quản trị toàn
// hệ thống soạn được. Xem chú thích dài ở PUT /api/menu/:date.
function chanNeuChiMotCoSo(req, res) {
  if (db.phamViCoSo(req.user) === null) return false;
  res.status(403).json({
    error: 'Thực đơn hiện dùng chung cho MỌI cơ sở, nên chỉ tài khoản quản trị '
      + 'toàn hệ thống mới soạn được. Xin liên hệ ban giám hiệu.',
  });
  return true;
}

module.exports = (app) => {
  // Thực đơn theo tuần: ?week=0 (tuần này, mặc định) | 1 (tuần sau) | -1 (tuần trước).
  app.get('/api/menu', (req, res) => {
    const week = req.query.week === '1' ? 1 : (req.query.week === '-1' ? -1 : 0);
    const from = thuHaiCuaTuan(week);
    const to = congNgay(from, 4);
    const menus = db.all('menus',
      'SELECT * FROM menus WHERE date BETWEEN ? AND ? ORDER BY date', [from, to]);
    res.json({ week, from, to, menus });
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
    if (chanNeuChiMotCoSo(req, res)) return;
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

      const cu = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [date]);
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

    db.tx(() => {
      for (const { date, meals, cu } of sach) {
        if (cu) db.update('menus', cu.id, { meals });
        else db.insert('menus', { id: db.nextId('menu'), date, meals });
      }
    });
    db.audit(req.user.id, 'menu-update-tuan', null, { soNgay: sach.length });
    res.json({ daLuu: sach.length, ngay: sach.map(x => x.date) });
  });

  // Quản trị soạn/sửa thực đơn một ngày. Mỗi ngày một bản ghi, ghi đè cả ngày.
  app.put('/api/menu/:date', requireRole('admin'), (req, res) => {
    // CHỈ CẤP 1 — và đây là chỗ cần nói rõ vì sao, vì nó có thể phải đổi.
    //
    // Bảng `menus` có MỘT bản ghi cho mỗi NGÀY, không phải mỗi ngày mỗi cơ sở.
    // Tức là mô hình dữ liệu hiện tại nói: cả trường ăn chung một thực đơn.
    // Điều đó khớp với yêu cầu nhà trường đưa ra ("thực đơn và lịch sinh hoạt
    // sẽ do admin làm và up lên"), nên tạm thời đúng.
    //
    // Cho quản lý cơ sở sửa mà giữ nguyên bảng này thì người sửa sau ghi đè
    // người sửa trước, âm thầm, mỗi ngày — hỏng theo kiểu khó lần ra nhất.
    // Nếu sau này ba cơ sở nấu bếp riêng, việc phải làm là THÊM cột cơ sở vào
    // `menus` rồi mới mở đường này ra, chứ không phải bỏ dòng chặn dưới đây.
    if (chanNeuChiMotCoSo(req, res)) return;
    const date = String(req.params.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày chưa đúng dạng, ví dụ đúng: 2026-09-07' });
    }
    const meals = lamSachBuaAn((req.body || {}).meals);
    if (!meals) {
      return res.status(400).json({ error: 'Danh sách bữa ăn chưa hợp lệ. Mỗi bữa cần có tên bữa.' });
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
    res.json(rec);
  });

  // Chép thực đơn của tuần liền trước sang tuần đích (0 = tuần này, 1 = tuần sau).
  // Chỉ chép vào những ngày tuần đích còn trống — không ghi đè thứ đã soạn.
  app.post('/api/menu/copy-week', requireRole('admin'), (req, res) => {
    if (chanNeuChiMotCoSo(req, res)) return;
    const week = Number((req.body || {}).week);
    if (week !== 0 && week !== 1) {
      return res.status(400).json({ error: 'Tuần đích chưa hợp lệ (0 = tuần này, 1 = tuần sau)' });
    }
    const nguon = thuHaiCuaTuan(week - 1);
    const dich = thuHaiCuaTuan(week);
    let daChep = 0;
    db.tx(() => {
      for (let d = 0; d < 5; d++) {
        const ngayNguon = congNgay(nguon, d);
        const ngayDich = congNgay(dich, d);
        const mNguon = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngayNguon]);
        if (!mNguon) continue;
        const mDich = db.first('menus', 'SELECT * FROM menus WHERE date = ?', [ngayDich]);
        if (mDich) continue; // ngày đã soạn thì giữ nguyên
        db.insert('menus', { id: db.nextId('menu'), date: ngayDich, meals: mNguon.meals });
        daChep++;
      }
    });
    db.audit(req.user.id, 'menu-copy-week', String(week), { daChep });
    res.json({ daChep });
  });
};
