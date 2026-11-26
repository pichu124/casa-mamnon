// Phân hệ Thông báo: giáo viên gửi thông báo cho lớp mình hoặc toàn trường,
// người dùng xem và đánh dấu đã đọc.
const db = require('../lib/db');
const nl = require('../lib/nhom-lop');
const { requireRole } = require('../lib/auth');
const st = require('../lib/sua-thu-hoi');

const BANG = 'notifications';

// Đổi 'Lớp học' → 'Nhóm lớp' ở G0.5/N9. Đây là GIÁ TRỊ lưu trong cột
// `notifications.category`, nên phải đổi đồng thời với data/seed.js và bảng
// màu trong public/js/views/notifications.js — lệch một chỗ là thông báo cũ
// mất màu, mất biểu tượng mà không báo lỗi gì.
const CATEGORIES = ['Nhóm lớp', 'Nhà trường', 'Y tế', 'Học phí', 'Khác'];
const CAU_GHIM_TOAN_TRUONG = 'Thông báo toàn trường do ban giám hiệu ghim. Cơ sở ghim được thông báo của các nhóm trong cơ sở mình.';

// Điều kiện SQL lọc theo phạm vi gửi mà người dùng được thấy.
// Luật "ai thấy thông báo nào" nằm ở MỘT chỗ — lib/thong-bao.js — thay cho hai
// bản chép tay từng trôi lệch giữa tệp này và routes/dashboard.js.
const tb = require('../lib/thong-bao');
const tbb = require('../lib/thong-bao-be');
const tbnv = require('../lib/thong-bao-nv');
const modules = require('../lib/modules');
const audienceFilter = (user, tienTo) => tb.audienceFilter(user, tienTo);
const canSee = tb.canSee;

// Mỗi lượt trả về bao nhiêu thông báo, và trần cho lượt hỏi tự đặt số. Trang
// đầu là cửa sổ mà huy hiệu chuông đếm theo (lib/thong-bao.js, P1).
const MOI_TRANG = tb.TRANG_DAU;
const TRANG_TOI_DA = 300;

// Trần độ dài. Không có trần thì một lần dán nhầm cả một văn bản dài vào ô
// nội dung là MỌI máy trong trường tải khối chữ đó về mãi — thông báo không
// ai dọn, và danh sách thì tải cả trang một lượt.
const TOI_DA_TIEU_DE = 200;
const TOI_DA_NOI_DUNG = 5000;

function loiQuaDai(title, body) {
  if (title !== undefined && String(title).trim().length > TOI_DA_TIEU_DE) {
    return `Tiêu đề dài quá ${TOI_DA_TIEU_DE} ký tự — rút gọn giúp trường nhé`;
  }
  if (body !== undefined && String(body).trim().length > TOI_DA_NOI_DUNG) {
    return `Nội dung dài quá ${TOI_DA_NOI_DUNG} ký tự — nội dung dài nên gửi kèm trong buổi họp hoặc chia làm nhiều thông báo`;
  }
  return null;
}

// LIÊN KẾT CỦA THÔNG BÁO CŨ (Đ260b).
//
// Trước Đ260b chỉ thông báo khảo sát được ghi liên kết; tin "Album mới: …",
// "Thực đơn … đã có", "Lịch sinh hoạt nhóm … vừa được cập nhật" do máy tự gửi
// chỉ mang liên kết trong tin đẩy, nên trong app bấm vào chỉ ra một hộp chữ.
// Những tin ấy đã nằm sẵn trong máy của trường; suy lại liên kết LÚC ĐỌC từ
// đúng mẫu tiêu đề mà máy đã dùng — không ghi gì vào bảng.
//
// Album tra theo ĐÚNG nhóm nhận của thông báo (người đọc thấy được thông báo
// nghĩa là nhóm ấy của họ); không tìm ra thì mở danh sách Album. Màn đích tự
// hỏi máy chủ, nên liên kết suy ra không mở thêm quyền nào.
function taoSuyLienKet() {
  const nho = new Map();
  const tra = (khoa, hoi) => {
    if (!nho.has(khoa)) nho.set(khoa, hoi());
    return nho.get(khoa);
  };
  return function suy(n) {
    const t = String(n.title || '');
    if (/^Thực đơn (tuần )?từ .+ đã có$/.test(t)) return '#/menu';
    if (/^Lịch sinh hoạt nhóm .+ vừa được cập nhật$/.test(t)) return '#/timetable/lich';
    const album = t.match(/^Album mới: (.+)$/) || t.match(/^Album "(.+)" có thêm ảnh$/);
    // Đọc bảng của phân hệ khác thì hỏi công tắc trước (phan-he-doc-cheo):
    // Album / Khảo sát đang tắt thì không trỏ tới màn đã đóng.
    if (album && n.audience && n.audience !== 'all' && modules.dangBat('album')) {
      const a = tra(`a:${n.audience}:${album[1]}`, () => db.first('albums',
        'SELECT id FROM albums WHERE classId = ? AND title = ? ORDER BY date DESC LIMIT 1', [n.audience, album[1]]));
      return a ? `#/albums/${a.id}` : '#/albums';
    }
    const ks = t.match(/^Khảo sát mới: (.+)$/);
    if (ks && modules.dangBat('khaosat')) {
      const k = tra(`k:${n.audience}:${ks[1]}`, () => db.first('surveys',
        'SELECT id FROM surveys WHERE audience = ? AND title = ? ORDER BY createdAt DESC LIMIT 1', [n.audience, ks[1]]));
      return k ? `#/surveys/${k.id}` : '#/surveys';
    }
    return '';
  };
}

module.exports = (app) => {
  // Danh sách thông báo: ghim trước, rồi mới nhất trước; kèm trạng thái đã đọc
  // và tên người gửi. Trạng thái đã đọc lấy bằng một phép nối, không phải tra
  // từng thông báo một.
  app.get('/api/notifications', (req, res) => {
    // Phạm vi gửi + mốc ngày tạo tài khoản của gia đình (P2) — cùng một bộ
    // lọc với huy hiệu chuông ở routes/dashboard.js.
    const f = tb.boLocThongBao(req.user, 'n.');

    // CẮT CỬA SỔ NGAY TRONG CÂU TRUY VẤN.
    //
    // Thông báo chỉ thêm vào chứ không ai dọn, nên bảng này dài ra mãi: sau
    // vài năm học, mở màn Thông báo là kéo cả lịch sử của trường về điện
    // thoại, chỉ để xem mấy dòng trên cùng. Ở đây không có bộ lọc nào chạy sau
    // câu truy vấn — `audienceFilter` đã lo phần "ai được thấy gì" ngay trong
    // `WHERE` — nên cắt thẳng bằng LIMIT là con số trả về đúng bằng con số
    // người này xem được, và màn hình suy ra "còn nữa hay hết" bằng cách đếm.
    //
    // Thông báo ghim vẫn đứng đầu nhờ `ORDER BY n.pinned DESC`, nên trang đầu
    // luôn có chúng — cắt cửa sổ không làm rơi mất thứ nhà trường muốn nổi lên.
    //
    // Hình dạng câu trả lời KHÔNG đổi (vẫn là một mảng): điện thoại đang giữ
    // bản app cũ vẫn chạy y như trước, chỉ là danh sách dừng ở trang đầu.
    const bo = Math.max(0, Math.floor(Number(req.query.bo) || 0));
    const soLuong = Math.min(TRANG_TOI_DA,
      Math.max(1, Math.floor(Number(req.query.soLuong) || MOI_TRANG)));

    const list = db.all('notifications',
      `SELECT n.*, (r.userId IS NOT NULL) AS read, l.lienKet AS lienKet
       FROM notifications n
       LEFT JOIN notification_reads r ON r.notificationId = n.id AND r.userId = ?
       LEFT JOIN notification_lien_ket l ON l.notificationId = n.id
       WHERE ${f.sql} AND ${st.dieuKienConHien(BANG, 'n.id')}
       ORDER BY n.pinned DESC, n.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, ...f.params, soLuong, bo]);

    // TÊN NGƯỜI GỬI: TRA MỘT LƯỢT CHO CẢ DANH SÁCH.
    //
    // Bản trước gọi `db.findUser` trong `.map`, tức MỘT câu truy vấn cho MỖI
    // dòng thông báo — đo được 406 câu cho 405 dòng, chỉ để lấy vài cái tên mà
    // phần lớn là trùng nhau (cả trường thường chỉ vài người đăng thông báo).
    // Việc này không đụng tệp dùng chung: `db.all` đã có sẵn.
    const maNguoi = [...new Set(list.map(n => n.createdBy).filter(Boolean))];
    const nguoi = new Map();
    if (maNguoi.length) {
      const marks = maNguoi.map(() => '?').join(',');
      for (const u of db.all('users', `SELECT * FROM users WHERE id IN (${marks})`, maNguoi)) {
        nguoi.set(u.id, u);
      }
    }

    // Đ260b: cô và văn phòng thấy tin nào gửi riêng mấy gia đình. Phụ huynh
    // không cần (và không được biết) danh sách người nhận.
    const soBe = new Map();
    if (req.user.role !== 'parent' && list.length) {
      const marks = list.map(() => '?').join(',');
      for (const r of db.all('notification_nguoi_nhan',
        `SELECT notificationId, COUNT(*) AS n FROM notification_nguoi_nhan
          WHERE notificationId IN (${marks}) GROUP BY notificationId`, list.map(n => n.id))) {
        soBe.set(r.notificationId, r.n);
      }
    }

    // Đ124: mỗi dòng nói rõ gửi cho ai — "Toàn trường" hay "Nhóm X · Cơ sở Y".
    const moTaPhamVi = tb.taoMoTaPhamVi();
    const suyLienKet = taoSuyLienKet();
    const cuaTruong = st.ganDauDaSua(BANG, list.map(({ lienKet: daGhi, ...n }) => {
      const author = n.createdBy ? nguoi.get(n.createdBy) : null;
      const pv = moTaPhamVi(n.audience);
      const lienKet = daGhi || suyLienKet(n);
      return {
        ...n,
        // G2: bấm vào thì mở thẳng màn này (khảo sát, album, thực đơn…). Tin
        // không có liên kết (thông báo gõ tay) hiện hộp chi tiết.
        ...(lienKet ? { lienKet } : {}),
        ...(soBe.has(n.id) ? { soBeNhan: soBe.get(n.id) } : {}),
        // Thông báo mình tự gửi thì huy hiệu không đếm (routes/dashboard.js),
        // nên màn hình cũng không tô nó là chưa đọc — nếu không là có chấm
        // "chưa đọc" mà chuông im (P1).
        read: !!n.read || (!!n.createdBy && n.createdBy === req.user.id),
        authorName: author ? `${author.title} ${author.name}` : '',
        coTheSua: st.laChuBanGhi(req.user, n.createdBy),
        // Thu hồi vẫn theo `coTheSua`; sửa chữ thì hẹp hơn (R4-B3).
        suaNoiDungDuoc: suaNoiDungDuoc(req.user, n, id => nguoi.get(id)),
        toanTruong: pv.toanTruong,
        tenNhom: pv.tenNhom,
        tenCoSo: pv.tenCoSo,
      };
    }));

    res.json(cuaTruong);
  });

  // THÔNG BÁO RIÊNG VỀ CON (Đ137) — một đường RIÊNG, không gộp vào danh sách
  // trên. Danh sách trên có khế ước `bo`/`soLuong` (xin một dòng nhận đúng một
  // dòng, ghép từng trang ra đúng danh sách) mà app cũ và bài canh đang dựa
  // vào; nhét thêm nguồn thứ hai vào là hai con đếm giẫm lên nhau. Màn Thông
  // báo tự ghép hai nguồn ở trang đầu. Cô, văn phòng: mảng rỗng.
  app.get('/api/notifications/rieng-be', (req, res) => {
    res.json(tbb.danhSachCua(req.user, { soLuong: tbb.TRANG_DAU, bo: 0 }));
  });

  // CHUÔNG RIÊNG CỦA CÔ, VĂN PHÒNG, QUẢN LÝ (Đ260c) — đường thứ ba, đứng cạnh
  // `/rieng-be` chứ không nhét vào nó: khế ước của `/rieng-be` là "cô, văn
  // phòng: mảng rỗng". Phụ huynh gọi đường này thì nhận mảng rỗng.
  app.get('/api/notifications/rieng-nv', (req, res) => {
    res.json(tbnv.danhSachCua(req.user));
  });

  // Mở một màn (Xin phép, Khảo sát…) là đã đọc những dòng chuông của màn ấy.
  app.post('/api/notifications/rieng-nv/da-xem', (req, res) => {
    res.json({ ok: true, marked: tbnv.docTheoMan(req.user, String((req.body || {}).man || '').slice(0, 40)) });
  });

  // Đánh dấu đã đọc một thông báo.
  app.post('/api/notifications/:id/read', (req, res) => {
    // Chuông riêng của cô / văn phòng (Đ260c) có mã 'tbn_…'. Dòng của người
    // khác trả 404 như không có.
    if (tbnv.laMa(req.params.id)) {
      const r = tbnv.danhDaDoc(req.user, req.params.id);
      if (!r.ok) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
      return res.json({ ok: true });
    }
    // Thông báo riêng về con (Đ137) có mã 'tbb…' — đánh dấu ở bảng riêng.
    if (tbb.laMaRiengBe(req.params.id)) {
      const r = tbb.danhDaDoc(req.user, req.params.id);
      if (!r.ok) return res.status(r.ma).json({ error: r.ma === 404 ? 'Không tìm thấy thông báo' : 'Không có quyền xem thông báo này' });
      return res.json({ ok: true });
    }
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!canSee(req.user, n)) {
      return res.status(403).json({ error: 'Không có quyền xem thông báo này' });
    }
    db.run('INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt) VALUES (?, ?, ?)',
      [n.id, req.user.id, new Date().toISOString()]);
    res.json({ ok: true });
  });

  // Đánh dấu đã đọc tất cả thông báo người dùng thấy được.
  app.post('/api/notifications/read-all', (req, res) => {
    const f = audienceFilter(req.user, 'n.');
    const nn = tb.locNguoiNhan(req.user, 'notifications', 'n.id');
    const r = db.run(
      `INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt)
       SELECT n.id, ?, ? FROM notifications n WHERE ${f.sql} AND ${nn.sql}`,
      [req.user.id, new Date().toISOString(), ...f.params, ...nn.params]);
    const rieng = tbb.docTatCa(req.user) + tbnv.docTatCa(req.user);
    res.json({ ok: true, marked: r.changes + rieng });
  });

  // Giáo viên tạo thông báo mới.
  app.post('/api/notifications', requireRole('teacher', 'admin'), (req, res) => {
    const { title, body, category, audience, pinned } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề thông báo' });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung thông báo' });
    }
    const daiQua = loiQuaDai(title, body);
    if (daiQua) return res.status(400).json({ error: daiQua });
    if (audience !== 'all' && audience !== 'class') {
      return res.status(400).json({ error: 'Phạm vi gửi không hợp lệ' });
    }
    // TOÀN TRƯỜNG LÀ VIỆC CỦA QUẢN LÝ, VĂN PHÒNG, HIỆU TRƯỞNG (Đ260b). Cô gửi
    // cho nhóm mình: cả nhóm, hoặc vài gia đình tích chọn.
    if (audience === 'all' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cô gửi thông báo cho nhóm mình. Thông báo toàn trường do văn phòng hoặc ban giám hiệu gửi.' });
    }
    // Ghim lên đầu là việc của quản trị (Đ260b).
    if (pinned !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ văn phòng hoặc ban giám hiệu mới ghim được thông báo' });
    }
    if (pinned === true && audience === 'all' && !ghimDuocToanTruong(req.user)) {
      return res.status(403).json({ error: CAU_GHIM_TOAN_TRUONG });
    }
    // Cô mầm non có thể phụ trách nhiều nhóm, nên "gửi cho nhóm" phải hỏi cho
    // rõ nhóm nào. Cô chỉ có một nhóm thì vẫn không phải chọn gì — giữ nguyên
    // đúng số thao tác như trước.
    let nhomNhan = '';
    if (audience === 'class') {
      if (req.user.role === 'admin') {
        // Quản trị (văn phòng cơ sở, ban giám hiệu) cũng gửi được cho MỘT
        // nhóm. Trước vá, nhánh này rơi vào `nhomDangThaoTac` — hàm chỉ trả
        // lời cho vai cô — nên mọi tài khoản quản trị nhận câu 400 "Tài khoản
        // chưa gắn với nhóm lớp nào", một câu sai sự thật và không có lối ra.
        // `canAccessClass` tự siết theo cơ sở: Cấp 3 chỉ gửi được nhóm của
        // cơ sở mình.
        nhomNhan = String((req.body || {}).classId || '');
        if (!nhomNhan || !db.findClass(nhomNhan)) {
          return res.status(400).json({ error: 'Vui lòng chọn nhóm nhận thông báo' });
        }
        if (!db.canAccessClass(req.user, nhomNhan)) {
          return res.status(403).json({ error: 'Nhóm này không thuộc phạm vi của tài khoản' });
        }
      } else {
        const nhomCuaCo = nl.nhomCuaCo(req.user.id);
        nhomNhan = nl.nhomDangThaoTac(req.user, (req.body || {}).classId);
        if (!nhomNhan) {
          return res.status(400).json({
            error: nhomCuaCo.length > 1
              ? 'Cô đang phụ trách nhiều nhóm — vui lòng chọn nhóm nhận thông báo'
              : 'Tài khoản chưa gắn với nhóm lớp nào',
          });
        }
      }
    }
    const nhan = tb.kiemNguoiNhan(req.user, audience === 'class' ? nhomNhan : 'all', (req.body || {}).nguoiNhan);
    if (nhan.loi) return res.status(nhan.ma).json({ error: nhan.loi });
    const rec = {
      id: db.nextId('nt'),
      title: String(title).trim(),
      body: String(body).trim(),
      category: CATEGORIES.includes(category) ? category : 'Khác',
      audience: audience === 'class' ? nhomNhan : 'all',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      pinned: pinned === true,
    };
    db.insert('notifications', rec);
    // Ghi người nhận TRƯỚC khi đẩy: `dayTin` đọc đúng bảng này để chỉ đẩy tới
    // phụ huynh của các bé được chọn.
    if (nhan.ids.length) tb.ghiNguoiNhan('notifications', rec.id, nhan.ids);
    // VỀ TỚI ĐIỆN THOẠI, KHÔNG CHỈ KÊU CHUÔNG TRONG APP (Đ194, việc 16).
    //
    // Nhà trường (A11): thông báo nhà trường phải đẩy về máy. Đây là loại tin
    // đông người nhận nhất trong cả app — một tin `audience: 'all'` của trường
    // ba cơ sở đi tới MỌI máy đã đăng ký — nên nó chỉ mở được sau khi có trần
    // số tin gửi đồng thời (việc 17) và khoá gộp (việc 18), và ba việc ấy làm
    // cùng một đợt là vì thế.
    //
    // Mở thẳng màn Thông báo: tin này không có màn nào riêng của nó.
    tb.dayTin(rec, '#/notifications');
    db.audit(req.user.id, 'notification-create', rec.id, {
      audience: rec.audience, ...(nhan.ids.length ? { soBeNhan: nhan.ids.length } : {}), ...(rec.pinned ? { pinned: true } : {}),
    });
    res.status(201).json({ ...rec, readBy: [], ...(nhan.ids.length ? { soBeNhan: nhan.ids.length } : {}) });
  });

  // Quản trị Cấp 3 chỉ sửa/thu hồi được thông báo TRONG CƠ SỞ MÌNH.
  //
  // `laChuBanGhi` trả lời "người gửi hoặc quản trị" — đúng cho vai cô, nhưng
  // với quản trị nó không hỏi cơ sở, nên quản lý cơ sở A sửa và thu hồi được
  // thông báo nhóm của cơ sở B. Thông báo gửi cả trường (audience = 'all')
  // vẫn như cũ: nó gửi cho cả cơ sở mình nên không tính là "của cơ sở khác".
  // `campusOfClass` đọc được cả nhóm đã đóng, nên thông báo của năm cũ không
  // làm chốt này chặn nhầm Cấp 1.
  // GHIM TIN TOÀN TRƯỜNG (theo review Đ260b): tin ghim đứng đầu danh sách
  // của mọi gia đình ba cơ sở, nên chỉ quản trị không khoá cơ sở hoặc hiệu
  // trưởng ghim / bỏ ghim được. Văn phòng, quản lý một cơ sở ghim tin của nhóm
  // trong cơ sở mình (`trongPhamViCoSo`).
  function ghimDuocToanTruong(user) {
    return db.phamViCoSo(user) === null || db.chucVu(user) === 'hieu-truong';
  }

  // SỬA CHỮ TRONG TIN NHÓM DO CÔ GỬI (Đ261c, kiểm thử R4-B3).
  //
  // Phụ huynh đọc tin dưới tên người gửi. Văn phòng, quản lý cơ sở sửa chữ
  // trong tin cô gửi là gia đình đọc lời văn phòng viết dưới tên cô, kèm
  // "đã chỉnh sửa" — như thể cô tự sửa. Nên nội dung tin NHÓM DO CÔ GỬI chỉ
  // cô ấy và ban giám hiệu cấp 1 sửa được; quản trị cơ sở vẫn ghim và thu hồi
  // được như cũ. Tin do quản trị gửi (lời nhà trường) và tin TOÀN TRƯỜNG giữ
  // nguyên luật đang có (L12, chờ trường quyết).
  // `tim` tra người gửi — đường danh sách truyền bảng đã tra sẵn (không N+1).
  function suaNoiDungDuoc(user, n, tim = db.findUser) {
    if (!st.laChuBanGhi(user, n.createdBy)) return false;
    if (user.role !== 'admin' || n.createdBy === user.id) return true;
    if (!n.audience || n.audience === 'all') return true;
    const nguoiGui = n.createdBy ? tim(n.createdBy) : null;
    if (!nguoiGui || nguoiGui.role !== 'teacher') return true;
    return ghimDuocToanTruong(user);
  }

  function trongPhamViCoSo(user, n) {
    if (!user || user.role !== 'admin') return true;   // vai cô: laChuBanGhi đã giữ
    const pham = db.phamViCoSo(user);
    if (pham === null || !n.audience || n.audience === 'all') return true;
    return db.campusOfClass(n.audience) === pham;
  }

  // Sửa lại một thông báo đã gửi. Chỉ người gửi hoặc quản trị.
  app.put('/api/notifications/:id', requireRole('teacher', 'admin'), (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n || st.daThuHoi(BANG, n.id)) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!st.laChuBanGhi(req.user, n.createdBy)) {
      return res.status(403).json({ error: 'Chỉ người gửi hoặc quản trị mới sửa được thông báo này' });
    }
    if (!trongPhamViCoSo(req.user, n)) {
      return res.status(403).json({ error: 'Thông báo này thuộc cơ sở khác' });
    }
    // GHIM / BỎ GHIM (Đ260b) — chỉ quản trị, trong phạm vi cơ sở (chốt ngay
    // trên). Cô gửi ô này thì 403, kể cả với tin của chính cô: thứ tự đầu
    // danh sách của cả nhóm là việc nhà trường quyết.
    const body = req.body || {};
    if (body.pinned !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ văn phòng hoặc ban giám hiệu mới ghim được thông báo' });
      }
      if (typeof body.pinned !== 'boolean') return res.status(400).json({ error: 'Giá trị ghim không hợp lệ' });
      if (n.audience === 'all' && !ghimDuocToanTruong(req.user)) {
        return res.status(403).json({ error: CAU_GHIM_TOAN_TRUONG });
      }
    }
    const patch = {};
    const daiQuaSua = loiQuaDai(req.body.title, req.body.body);
    if (daiQuaSua) return res.status(400).json({ error: daiQuaSua });
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề thông báo' });
      patch.title = String(req.body.title).trim();
    }
    if (req.body.body !== undefined) {
      if (!String(req.body.body).trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung thông báo' });
      patch.body = String(req.body.body).trim();
    }
    if (req.body.category !== undefined) {
      patch.category = CATEGORIES.includes(req.body.category) ? req.body.category : 'Khác';
    }
    if (Object.keys(patch).length && !suaNoiDungDuoc(req.user, n)) {
      return res.status(403).json({
        error: 'Thông báo nhóm này do cô gửi nên chỉ người gửi hoặc ban giám hiệu sửa được nội dung. '
          + 'Văn phòng vẫn ghim hoặc thu hồi được.',
      });
    }
    // CỐ Ý không cho đổi `audience`: đổi phạm vi gửi sau khi đã gửi nghĩa là một
    // nhóm phụ huynh mất thông báo họ đã đọc, một nhóm khác bỗng thấy thông báo
    // không dành cho mình.
    // Ghim không phải sửa nội dung: lượt chỉ ghim / bỏ ghim không ghi dấu "đã
    // chỉnh sửa", nhật ký riêng. Lượt sửa không có ô ghim chạy y như trước.
    const chiGhim = body.pinned !== undefined && !Object.keys(patch).length;
    if (!chiGhim) {
      db.update('notifications', n.id, patch);
      st.ghiDaSua(BANG, n.id, req.user.id);
      db.audit(req.user.id, 'notification-update', n.id, patch);
    }
    if (typeof body.pinned === 'boolean' && body.pinned !== !!n.pinned) {
      db.update('notifications', n.id, { pinned: body.pinned });
      db.audit(req.user.id, body.pinned ? 'notification-pin' : 'notification-unpin', n.id, { title: n.title });
    }
    res.json({ ...db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [n.id]), daSua: !chiGhim });
  });

  // Thu hồi một thông báo: ẩn khỏi mọi danh sách, KHÔNG xóa dữ liệu.
  app.delete('/api/notifications/:id', requireRole('teacher', 'admin'), (req, res) => {
    const n = db.first('notifications', 'SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!n) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    if (!st.laChuBanGhi(req.user, n.createdBy)) {
      return res.status(403).json({ error: 'Chỉ người gửi hoặc quản trị mới thu hồi được thông báo này' });
    }
    if (!trongPhamViCoSo(req.user, n)) {
      return res.status(403).json({ error: 'Thông báo này thuộc cơ sở khác' });
    }
    st.ghiThuHoi(BANG, n.id, req.user.id);
    db.audit(req.user.id, 'notification-withdraw', n.id, { title: n.title });
    res.json({ ok: true });
  });
};
