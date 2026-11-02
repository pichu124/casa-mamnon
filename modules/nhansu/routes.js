// Phân hệ HỒ SƠ NHÂN SỰ & CHẤM CÔNG (Đ152).
//
// Nhà trường 10/09: *"làm luôn cùng đợt này đi bạn. để mình có thể test luôn 1
// thể về phần chấm công giáo viên, nhân viên"*.
//
// ĐÂY LÀ MIỀN DỮ LIỆU CÁ NHÂN CỦA NGƯỜI LỚN — xem chú thích đầu schema.sql.
// Ba điều quan trọng nhất của tệp này:
//
//   1. `chiNhanSu` — chỉ Nhân sự và ban giám hiệu. KHÔNG phải mọi tài khoản
//      quản trị. Đây là chốt chặn duy nhất, nên nó đứng ở dòng đầu của MỌI
//      đường ghi và đọc hồ sơ, và có bài canh đi qua từng chức vụ một.
//   2. Đường dẫn nằm dưới `/api/nhansu`, CỐ Ý KHÔNG dưới `/api/admin`. Tiền tố
//      `/api/admin` đã nằm trong danh sách cho phép của Văn phòng cơ sở, và
//      chú thích ở lib/db.js nói thẳng rằng mọi đường thêm sau này tự động lọt
//      qua đó. Một hồ sơ có số định danh và số tài khoản ngân hàng thì không
//      được đi qua một cánh cửa đã mở sẵn.
//   3. Đường "/toi" — người trong hồ sơ đọc được hồ sơ của chính mình, và chỉ
//      của mình. Không sửa được: hồ sơ nhân sự là bản của nhà trường giữ, còn
//      quyền xem là quyền của người được ghi trong đó.
const ngay = require('../../lib/ngay');
const csv = require('../../lib/csv');
const { requireRole } = require('../../lib/auth');
const uploads = require('../../lib/uploads');
const ngayCong = require('../../lib/ngay-cong');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOAI_CONG = ['di-lam', 'nua-ngay', 'nghi-phep', 'nghi-khong-phep', 'nghi-le'];
const LOAI_DE_NGHI = ['di-lam', 'nua-ngay'];
const TRANG_THAI_GT = ['cho-duyet', 'da-duyet', 'tu-choi', 'da-rut'];

// Excel coi ô bắt đầu bằng = + - @ là CÔNG THỨC và chạy nó. Họ tên do người
// nhập gõ, nên tệp đi ra khỏi app phải vô hiệu hoá chúng. Cùng luật với
// modules/tienan và routes/admin — chép lại ở đây vì `lib/csv.js` cố ý chỉ lo
// việc dựng chuỗi CSV, không lo việc Excel làm gì với chuỗi ấy.
const DAU_CONG_THUC = /^[=+\-@\t\r]/;
function khoaCongThuc(hang) {
  const ra = {};
  for (const [k, v] of Object.entries(hang)) {
    const t = v == null ? '' : String(v);
    ra[k] = DAU_CONG_THUC.test(t) ? `'${t}` : t;
  }
  return ra;
}

// Trường nào là CHỮ, và trần độ dài của nó. Không có bảng này thì mỗi đường
// ghi tự nhớ lấy một bộ trần khác nhau.
const O_CHU = {
  ngaySinh: 10, gioiTinh: 10, cccd: 20, cccdNgayCap: 10, cccdNoiCap: 120,
  mst: 20, soBhxh: 20, dienThoai: 20, email: 120,
  queQuan: 200, hoKhau: 200, choO: 200, danToc: 40,
  honNhan: 20, tenVoChong: 120, dienThoaiVoChong: 20,
  trinhDo: 80, chuyenNganh: 120, chucDanh: 80,
  loaiHopDong: 80, ngayVaoLam: 10, ngayNghiViec: 10,
  nganHang: 120, soTaiKhoan: 40,
  khanCapTen: 120, khanCapQuanHe: 60, khanCapDienThoai: 20,
  ghiChu: 1000,
};

// Những ô KHÔNG BAO GIỜ đi ra ở danh sách, chỉ ở màn chi tiết của đúng một
// người. Danh sách là thứ mở ra nhiều nhất và dễ chụp màn hình nhất; không có
// lý do gì để số định danh của ba mươi người cùng nằm trên một màn.
const O_NHAY_CAM = ['cccd', 'cccdNgayCap', 'cccdNoiCap', 'mst', 'soBhxh',
  'nganHang', 'soTaiKhoan', 'tenVoChong', 'dienThoaiVoChong', 'hoKhau', 'choO',
  'khanCapTen', 'khanCapQuanHe', 'khanCapDienThoai', 'ghiChu'];

module.exports = (app, { db }) => {
  // CHỈ NHÂN SỰ VÀ BAN GIÁM HIỆU.
  //
  // "Ban giám hiệu" ở đây gồm cả tài khoản quản trị CHƯA khai chức vụ — đó là
  // Cấp 1 theo đúng định nghĩa ở lib/db.js, và là tài khoản trường đang dùng
  // trước khi ai kịp khai chức vụ cho ai.
  //
  // Quản lý cơ sở bị chặn dù họ là Cấp 3 có `api: null`: hồ sơ nhân sự là việc
  // của cả trường chứ không của một cơ sở, và người quản một cơ sở không có
  // phần trong số định danh hay số tài khoản ngân hàng của người cơ sở khác.
  const CHUC_VU_DUOC = ['hieu-truong', 'nhansu'];
  function chiNhanSu(req, res) {
    if (req.user.role !== 'admin') {
      res.status(403).json({
        error: 'Hồ sơ nhân sự do bộ phận Nhân sự và ban giám hiệu giữ. '
          + 'Cô xem phần "Của tôi" để biết trường đang giữ những gì về mình nhé.',
      });
      return true;
    }
    const cv = db.chucVu(req.user);
    if (cv !== null && !CHUC_VU_DUOC.includes(cv)) {
      res.status(403).json({
        error: 'Phần này chỉ dành cho bộ phận Nhân sự và ban giám hiệu.',
      });
      return true;
    }
    return false;
  }

  function lamSach(than) {
    const ra = {};
    for (const [o, tran] of Object.entries(O_CHU)) {
      if (than[o] === undefined) continue;
      ra[o] = String(than[o] ?? '').trim().slice(0, tran);
    }
    if (than.soCon !== undefined) {
      const n = Number(than.soCon);
      ra.soCon = Number.isInteger(n) && n >= 0 && n <= 20 ? n : 0;
    }
    return ra;
  }

  const RONG = Object.fromEntries([...Object.keys(O_CHU).map(k => [k, '']), ['soCon', 0]]);

  function hoSoCua(userId) {
    const r = db.first('nhansu_ho_so', 'SELECT * FROM nhansu_ho_so WHERE userId = ?', [userId]);
    return { ...RONG, ...(r || {}), userId, coHoSo: !!r };
  }

  // Người của trường: cô và tài khoản quản trị. KHÔNG gồm phụ huynh — hồ sơ
  // nhân sự là của người làm việc ở trường.
  function nguoiCuaTruong() {
    return db.all('users',
      `SELECT id, username, name, title, role, avatar, active FROM users
        WHERE role IN ('teacher', 'admin') ORDER BY role, name`);
  }

  function tomTat(u) {
    const h = db.first('nhansu_ho_so',
      'SELECT chucDanh, ngayVaoLam, ngayNghiViec, dienThoai, loaiHopDong FROM nhansu_ho_so WHERE userId = ?',
      [u.id]);
    return {
      userId: u.id,
      hoTen: `${u.title || ''} ${u.name}`.trim(),
      vai: u.role,
      avatar: u.avatar,
      dangLam: !(h && h.ngayNghiViec),
      chucDanh: (h && h.chucDanh) || '',
      loaiHopDong: (h && h.loaiHopDong) || '',
      ngayVaoLam: (h && h.ngayVaoLam) || '',
      ngayNghiViec: (h && h.ngayNghiViec) || '',
      dienThoai: (h && h.dienThoai) || '',
      coHoSo: !!h,
    };
  }

  // -------------------------------------------------------------------------
  // HỒ SƠ
  // -------------------------------------------------------------------------
  app.get('/api/nhansu/ho-so', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const ds = nguoiCuaTruong().map(tomTat);
    res.json({
      danhSach: ds,
      soNguoi: ds.length,
      soDangLam: ds.filter(x => x.dangLam).length,
      soChuaCoHoSo: ds.filter(x => !x.coHoSo).length,
    });
  });

  // HỒ SƠ CỦA CHÍNH MÌNH — khai TRƯỚC đường `/:userId`, nếu không Express khớp
  // "toi" thành một mã người dùng và câu trả lời là "không tìm thấy".
  app.get('/api/nhansu/ho-so/toi', requireRole('teacher', 'admin'), (req, res) => {
    const u = db.findUser(req.user.id);
    res.json({
      hoSo: hoSoCua(req.user.id),
      hoTen: u ? `${u.title || ''} ${u.name}`.trim() : '',
      // Nói thẳng ai sửa được, để người đọc biết hỏi ai khi thấy sai.
      suaDuoc: false,
      aiSua: 'Bộ phận Nhân sự của nhà trường',
    });
  });

  app.get('/api/nhansu/ho-so/:userId', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const u = db.findUser(req.params.userId);
    if (!u || (u.role !== 'teacher' && u.role !== 'admin')) {
      return res.status(404).json({ error: 'Không tìm thấy người này trong danh sách của trường' });
    }
    db.audit(req.user.id, 'nhansu-xem-ho-so', u.id, null);
    res.json({ hoSo: hoSoCua(u.id), hoTen: `${u.title || ''} ${u.name}`.trim(), vai: u.role });
  });

  app.put('/api/nhansu/ho-so/:userId', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const u = db.findUser(req.params.userId);
    if (!u || (u.role !== 'teacher' && u.role !== 'admin')) {
      return res.status(404).json({ error: 'Không tìm thấy người này trong danh sách của trường' });
    }
    const sach = lamSach(req.body || {});
    for (const o of ['ngaySinh', 'cccdNgayCap', 'ngayVaoLam', 'ngayNghiViec']) {
      if (sach[o] && !NGAY_RE.test(sach[o])) {
        return res.status(400).json({ error: `Ngày ở ô "${o}" chưa đúng dạng ngày/tháng/năm` });
      }
    }
    if (sach.ngayVaoLam && sach.ngayNghiViec && sach.ngayNghiViec < sach.ngayVaoLam) {
      return res.status(400).json({ error: 'Ngày nghỉ việc phải sau ngày vào làm' });
    }
    const rec = {
      ...hoSoCua(u.id), ...sach,
      userId: u.id,
      capNhatLuc: new Date().toISOString(),
      nguoiCapNhat: req.user.id,
    };
    delete rec.coHoSo;
    db.upsert('nhansu_ho_so', rec, ['userId']);
    // Ghi nhật ký nhưng KHÔNG ghi nội dung: nhật ký thao tác không phải chỗ để
    // số định danh của một người nằm lần thứ hai.
    db.audit(req.user.id, 'nhansu-sua-ho-so', u.id, { soO: Object.keys(sach).length });
    res.json({ hoSo: hoSoCua(u.id) });
  });

  // -------------------------------------------------------------------------
  // CHẤM CÔNG
  // -------------------------------------------------------------------------
  function khoangThang(thang) {
    const [nam, th] = thang.split('-').map(Number);
    const cuoi = new Date(Date.UTC(nam, th, 0));
    return [`${thang}-01`, cuoi.toISOString().slice(0, 10)];
  }

  function thangHopLe(req, res) {
    const t = String(req.query.thang || '').trim() || ngay.thangNay();
    if (!THANG_RE.test(t)) { res.status(400).json({ error: 'Tháng chưa hợp lệ (YYYY-MM)' }); return null; }
    return t;
  }

  // `xemAnh`: kèm tên tệp ảnh chấm công ở cổng của từng ngày — trước đợt vá
  // này ảnh được chụp, giữ 90 ngày, mà không màn nào mở ra được (vòng rà
  // Đ232). `{ khoa }` cho Nhân sự / Ban giám hiệu (khoá một cơ sở thì chỉ ảnh
  // của cơ sở ấy, cùng luật với đường xem ảnh); `{ toi: true }` cho chính
  // người được chụp. Không truyền thì như cũ — không có tên tệp nào.
  function ganAnhCong(theoNguoi, tu, den, ids, xemAnh) {
    if (!xemAnh || !ids.length) return;
    let ds = [];
    try {
      ds = db.all('staff_checkin',
        `SELECT userId, ngay, anhVao, anhRa, campusId FROM staff_checkin
          WHERE ngay BETWEEN ? AND ? AND userId IN (${ids.map(() => '?').join(',')})
            AND (COALESCE(anhVao, '') != '' OR COALESCE(anhRa, '') != '')`, [tu, den, ...ids]);
    } catch (_) { return; }
    for (const r of ds) {
      if (!xemAnh.toi && xemAnh.khoa && xemAnh.khoa !== r.campusId) continue;
      const d = (theoNguoi.get(r.userId) || []).find(x => x.ngay === r.ngay);
      if (!d) continue;
      if (r.anhVao) d.anhVao = r.anhVao;
      if (r.anhRa) d.anhRa = r.anhRa;
    }
  }

  // Mỗi phần tử của `ngay` giữ nguyên các ô cũ (`loai` CHỈ là loại ghi tay)
  // và có thêm nguon, cong, trangThai, lyDo, loaiTinh, giaiTrinh — gộp theo
  // luật ở lib/ngay-cong.js. Các số đếm cộng cả ngày tính từ giờ cổng.
  function bangThang(thang, chiUserId, xemAnh) {
    const [tu, den] = khoangThang(thang);
    const nguoi = chiUserId
      ? nguoiCuaTruong().filter(u => u.id === chiUserId)
      : nguoiCuaTruong();
    const ids = nguoi.map(u => u.id);
    const theoNguoi = ngayCong.bangCong(db, ids, tu, den, { homNay: ngay.homNay() });
    ganAnhCong(theoNguoi, tu, den, ids, xemAnh);
    const danhSach = nguoi.map((u) => {
      const dong = theoNguoi.get(u.id) || [];
      return {
        userId: u.id,
        hoTen: `${u.title || ''} ${u.name}`.trim(),
        vai: u.role,
        avatar: u.avatar,
        ngay: dong,
        // CÔNG ở đây là SỐ NGÀY LÀM VIỆC của một người lớn — không dính dáng gì
        // tới trẻ, và cũng không phải một cách xếp ai hơn ai. Nửa ngày tính
        // 0.5, và đó là quy ước duy nhất app tự đặt; mọi thứ khác (hệ số, phụ
        // cấp, thuế, bảo hiểm) kế toán tự tính trên tệp xuất ra.
        ...ngayCong.tongHopCong(dong),
      };
    });
    return { thang, tuNgay: tu, denNgay: den, quyTac: quyTacHomNay(), danhSach };
  }

  // -------------------------------------------------------------------------
  // QUY TẮC TÍNH CÔNG TỪ GIỜ Ở CỔNG (K1-2)
  // -------------------------------------------------------------------------
  const ngayMai = () => ngayCong.congNgay(ngay.homNay(), 1);
  function quyTacHomNay() {
    return ngayCong.quyTacCuaNgay(ngayCong.cacQuyTac(db), ngay.homNay());
  }
  function trangThaiQuyTac() {
    const hn = ngay.homNay();
    const ds = ngayCong.cacQuyTac(db);
    const hienTai = ngayCong.quyTacCuaNgay(ds, hn);
    const sapToi = ds.find(q => q.apDungTu > hn && (!q.tatTu || q.tatTu > q.apDungTu)) || null;
    return {
      homNay: hn, ngayMai: ngayMai(), dangBat: !!hienTai, hienTai, sapToi,
      lichSu: ds, macDinh: ngayCong.QUY_TAC_MAC_DINH,
    };
  }

  app.get('/api/nhansu/cham-cong/toi', requireRole('teacher', 'admin'), (req, res) => {
    const thang = thangHopLe(req, res);
    if (!thang) return;
    const b = bangThang(thang, req.user.id, { toi: true });
    const [tu, den] = khoangThang(thang);
    const giaiTrinh = db.all('nhansu_giai_trinh',
      `SELECT id, ngay, loaiDeNghi, gioVaoDeNghi, gioRaDeNghi, lyDo, trangThai, guiLuc,
              duyetLuc, loaiDuyet, ghiChuDuyet
         FROM nhansu_giai_trinh WHERE userId = ? AND ngay BETWEEN ? AND ?
        ORDER BY ngay DESC, guiLuc DESC`, [req.user.id, tu, den]);
    res.json({ ...b, cuaToi: b.danhSach[0] || null, danhSach: undefined, giaiTrinh });
  });

  // GỬI GIẢI TRÌNH cho một ngày của chính mình. Chỉ ngày công tính ra "cần
  // giải trình" hoặc "chưa có công" — ngày đã có dòng ghi tay thì đã có người
  // quyết rồi, ngày đủ công thì không có gì để giải trình.
  app.post('/api/nhansu/cham-cong/toi', requireRole('teacher', 'admin'), (req, res) => {
    const than = req.body || {};
    const n = String(than.ngay || '').trim();
    if (!NGAY_RE.test(n)) return res.status(400).json({ error: 'Ngày chưa hợp lệ (YYYY-MM-DD)' });
    if (n > ngay.homNay()) return res.status(400).json({ error: 'Chưa tới ngày này nên chưa giải trình được' });
    if (!ngayCong.quyTacCuaNgay(ngayCong.cacQuyTac(db), n)) {
      return res.status(400).json({ error: 'Ngày này chưa tính công từ giờ ở cổng. Cần sửa thì nhờ bộ phận Nhân sự nhé.' });
    }
    const loai = String(than.loaiDeNghi || '');
    if (!LOAI_DE_NGHI.includes(loai)) return res.status(400).json({ error: 'Chọn "đi làm" hoặc "nửa ngày"' });
    const gioVao = String(than.gioVaoDeNghi || '').trim();
    const gioRa = String(than.gioRaDeNghi || '').trim();
    for (const [ten, g] of [['giờ vào', gioVao], ['giờ ra', gioRa]]) {
      if (g && !GIO_RE.test(g)) return res.status(400).json({ error: `Ô ${ten} chưa đúng dạng giờ:phút` });
    }
    if (gioVao && gioRa && gioRa < gioVao) return res.status(400).json({ error: 'Giờ ra phải sau giờ vào' });
    const lyDo = String(than.lyDo || '').trim();
    if (lyDo.length < 5 || lyDo.length > 500) {
      return res.status(400).json({ error: 'Lý do cần từ 5 đến 500 ký tự' });
    }
    const cho = db.first('nhansu_giai_trinh',
      "SELECT id FROM nhansu_giai_trinh WHERE userId = ? AND ngay = ? AND trangThai = 'cho-duyet'", [req.user.id, n]);
    if (cho) return res.status(409).json({ error: 'Ngày này đã có một giải trình đang chờ duyệt' });
    const d = (ngayCong.bangCong(db, [req.user.id], n, n, { homNay: ngay.homNay() }).get(req.user.id) || [])[0];
    if (d && d.trangThai === 'da-ghi') {
      return res.status(400).json({ error: 'Ngày này Nhân sự đã ghi công rồi. Cần sửa thì nhờ bộ phận Nhân sự nhé.' });
    }
    if (!d || !['can-giai-trinh', 'chua-co-cong'].includes(d.trangThai)) {
      return res.status(400).json({ error: 'Ngày này không cần giải trình' });
    }
    const gt = {
      id: db.nextId('gt'), userId: req.user.id, ngay: n, loaiDeNghi: loai,
      gioVaoDeNghi: gioVao, gioRaDeNghi: gioRa, lyDo, trangThai: 'cho-duyet',
      nguoiGui: req.user.id, guiLuc: new Date().toISOString(),
    };
    try {
      db.insert('nhansu_giai_trinh', gt);
    } catch (err) {
      if (/UNIQUE/i.test(err.message)) return res.status(409).json({ error: 'Ngày này đã có một giải trình đang chờ duyệt' });
      throw err;
    }
    db.audit(req.user.id, 'nhansu-giai-trinh-gui', req.user.id, { ngay: n, loai });
    res.status(201).json({ ok: true, giaiTrinh: gt });
  });

  // RÚT giải trình đang chờ của chính mình. Không xoá dòng — chuyển 'da-rut'.
  app.delete('/api/nhansu/cham-cong/toi', requireRole('teacher', 'admin'), (req, res) => {
    const id = String(req.query.id || '');
    const g = id ? db.first('nhansu_giai_trinh',
      'SELECT * FROM nhansu_giai_trinh WHERE id = ? AND userId = ?', [id, req.user.id]) : null;
    if (!g) return res.status(404).json({ error: 'Không tìm thấy giải trình này' });
    if (g.trangThai !== 'cho-duyet') return res.status(400).json({ error: 'Giải trình này đã được xử lý, không rút được nữa' });
    db.run("UPDATE nhansu_giai_trinh SET trangThai = 'da-rut' WHERE id = ? AND trangThai = 'cho-duyet'", [id]);
    db.audit(req.user.id, 'nhansu-giai-trinh-rut', req.user.id, { ngay: g.ngay });
    res.json({ ok: true });
  });

  app.get('/api/nhansu/cham-cong', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const thang = thangHopLe(req, res);
    if (!thang) return;
    res.json(bangThang(thang, null, { khoa: db.phamViCoSo(req.user) }));
  });

  app.put('/api/nhansu/cham-cong/:userId/:ngay', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const u = db.findUser(req.params.userId);
    if (!u || (u.role !== 'teacher' && u.role !== 'admin')) {
      return res.status(404).json({ error: 'Không tìm thấy người này trong danh sách của trường' });
    }
    const n = String(req.params.ngay);
    if (!NGAY_RE.test(n)) return res.status(400).json({ error: 'Ngày chưa hợp lệ (YYYY-MM-DD)' });

    const than = req.body || {};
    // Ô LOẠI để trống nghĩa là XOÁ dòng công của ngày đó, không phải ghi một
    // dòng rỗng. Người chấm nhầm một ngày phải có đường lui, mà đường lui ấy
    // không được để lại một dòng "không rõ là gì" trong bảng lương.
    if (than.loai === '' || than.loai === null) {
      db.run('DELETE FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?', [u.id, n]);
      db.audit(req.user.id, 'nhansu-xoa-cong', u.id, { ngay: n });
      return res.json({ ok: true, daXoa: true });
    }
    const loai = String(than.loai || 'di-lam');
    if (!LOAI_CONG.includes(loai)) return res.status(400).json({ error: 'Loại ngày công chưa hợp lệ' });
    // Ô nào KHÔNG gửi thì giữ giá trị đang có: màn chọn loại ngày chỉ gửi
    // `{ loai }`, và đổi "đi làm" sang "nửa ngày" không được xoá mất giờ vào/ra.
    const cu = db.first('nhansu_cham_cong',
      'SELECT gioVao, gioRa, ghiChu FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?', [u.id, n]) || {};
    const lay = k => String((than[k] !== undefined ? than[k] : cu[k]) || '').trim();
    const gioVao = lay('gioVao');
    const gioRa = lay('gioRa');
    for (const [ten, g] of [['giờ vào', gioVao], ['giờ ra', gioRa]]) {
      if (g && !GIO_RE.test(g)) return res.status(400).json({ error: `Ô ${ten} chưa đúng dạng giờ:phút` });
    }
    if (gioVao && gioRa && gioRa < gioVao) {
      return res.status(400).json({ error: 'Giờ ra phải sau giờ vào' });
    }
    db.upsert('nhansu_cham_cong', {
      userId: u.id, ngay: n, loai, gioVao, gioRa,
      ghiChu: lay('ghiChu').slice(0, 300),
      nguoiGhi: req.user.id, capNhatLuc: new Date().toISOString(),
    }, ['userId', 'ngay']);
    db.audit(req.user.id, 'nhansu-cham-cong', u.id, { ngay: n, loai });
    res.json({ ok: true });
  });

  // CHẤM CẢ TRƯỜNG MỘT LƯỢT cho một ngày — thao tác thật của văn phòng lúc
  // sáng. CỐ Ý KHÔNG ĐÈ dòng đã có: người vừa chấm tay xong mà bấm nhầm nút này
  // là mất phần vừa nhập, và không có gì báo cho họ biết.
  app.post('/api/nhansu/cham-cong/ca-truong', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const n = String((req.body || {}).ngay || ngay.homNay());
    if (!NGAY_RE.test(n)) return res.status(400).json({ error: 'Ngày chưa hợp lệ (YYYY-MM-DD)' });
    const loai = String((req.body || {}).loai || 'di-lam');
    if (!LOAI_CONG.includes(loai)) return res.status(400).json({ error: 'Loại ngày công chưa hợp lệ' });

    const nguoi = nguoiCuaTruong().filter(u => u.active !== 0 && u.active !== false);
    const daCo = new Set(db.all('nhansu_cham_cong',
      'SELECT userId FROM nhansu_cham_cong WHERE ngay = ?', [n]).map(r => r.userId));
    // Ngày đã có quy tắc tính công thì người có giờ ở cổng đã có công tính sẵn;
    // ghi tay "đi làm" cho họ là đè mất con số đúng bằng một con số đoán.
    let coGioCong = new Set();
    if (ngayCong.quyTacCuaNgay(ngayCong.cacQuyTac(db), n)) {
      try {
        coGioCong = new Set(db.all('staff_checkin',
          "SELECT userId FROM staff_checkin WHERE ngay = ? AND COALESCE(gioVao, '') != ''", [n]).map(r => r.userId));
      } catch (_) { coGioCong = new Set(); }
    }
    const chuaCo = nguoi.filter(u => !daCo.has(u.id));
    const them = chuaCo.filter(u => !coGioCong.has(u.id));
    db.tx(() => {
      for (const u of them) {
        db.insert('nhansu_cham_cong', {
          userId: u.id, ngay: n, loai, gioVao: '', gioRa: '', ghiChu: '',
          nguoiGhi: req.user.id, capNhatLuc: new Date().toISOString(),
        });
      }
    });
    db.audit(req.user.id, 'nhansu-cham-ca-truong', null, { ngay: n, loai, soNguoi: them.length });
    res.json({
      ok: true, ngay: n, soDaCoTruoc: daCo.size, soVuaGhi: them.length,
      soCoGioCong: chuaCo.length - them.length,
    });
  });

  app.get('/api/nhansu/cham-cong.csv', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const thang = thangHopLe(req, res);
    if (!thang) return;
    const b = bangThang(thang);
    // Tám cột cũ giữ nguyên thứ tự (tệp của kế toán có thể đang đọc theo vị
    // trí); hai cột mới đứng cuối.
    const COT = ['Họ và tên', 'Vai trò', 'Số công', 'Ngày đi làm', 'Nửa ngày',
      'Nghỉ phép', 'Nghỉ không phép', 'Nghỉ lễ', 'Cần giải trình', 'Giải trình chờ duyệt'];
    const duLieu = b.danhSach.map(x => khoaCongThuc({
      'Họ và tên': x.hoTen,
      'Vai trò': x.vai === 'teacher' ? 'Cô' : 'Văn phòng',
      'Số công': x.soCong,
      'Ngày đi làm': x.soNgayDiLam,
      'Nửa ngày': x.soNuaNgay,
      'Nghỉ phép': x.soNghiPhep,
      'Nghỉ không phép': x.soNghiKhongPhep,
      'Nghỉ lễ': x.soNghiLe,
      'Cần giải trình': x.soCanGiaiTrinh,
      'Giải trình chờ duyệt': x.soChoDuyet,
    }));
    db.audit(req.user.id, 'nhansu-xuat-cong', null, { thang, soNguoi: duLieu.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cham-cong-${thang}.csv"`);
    res.send(csv.stringify(COT, duLieu));
  });

  // -------------------------------------------------------------------------
  // DUYỆT GIẢI TRÌNH — Nhân sự và ban giám hiệu
  // -------------------------------------------------------------------------
  app.get('/api/nhansu/giai-trinh', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const dk = [];
    const p = [];
    const thang = String(req.query.thang || '').trim();
    if (thang) {
      if (!THANG_RE.test(thang)) return res.status(400).json({ error: 'Tháng chưa hợp lệ (YYYY-MM)' });
      dk.push('g.ngay BETWEEN ? AND ?');
      p.push(...khoangThang(thang));
    }
    const tt = String(req.query.trangThai || '').trim();
    if (tt) {
      if (!TRANG_THAI_GT.includes(tt)) return res.status(400).json({ error: 'Trạng thái chưa hợp lệ' });
      dk.push('g.trangThai = ?');
      p.push(tt);
    }
    const ds = db.all('nhansu_giai_trinh',
      `SELECT g.*, u.name, u.title, u.role, s.gioVao AS gioVaoCong, s.gioRa AS gioRaCong
         FROM nhansu_giai_trinh g
         JOIN users u ON u.id = g.userId
         LEFT JOIN staff_checkin s ON s.userId = g.userId AND s.ngay = g.ngay
        ${dk.length ? `WHERE ${dk.join(' AND ')}` : ''}
        ORDER BY g.guiLuc DESC LIMIT 500`, p);
    res.json({
      danhSach: ds.map(({ name, title, role, ...g }) => ({
        ...g,
        hoTen: `${title || ''} ${name}`.trim(),
        vai: role,
        gioVaoCong: g.gioVaoCong || '',
        gioRaCong: g.gioRaCong || '',
        laCuaToi: g.userId === req.user.id,
      })),
    });
  });

  // Duyệt: trong MỘT giao dịch, ghi dòng tay vào bảng công (loại và giờ do
  // người duyệt chọn) và chuyển giải trình sang 'da-duyet'. Từ chối phải có
  // lý do — người gửi cần biết vì sao. Không ai tự duyệt việc của mình.
  app.put('/api/nhansu/giai-trinh/:id', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const g = db.first('nhansu_giai_trinh', 'SELECT * FROM nhansu_giai_trinh WHERE id = ?', [String(req.params.id)]);
    if (!g) return res.status(404).json({ error: 'Không tìm thấy giải trình này' });
    if (g.userId === req.user.id) {
      return res.status(403).json({ error: 'Giải trình của chính mình cần một người khác duyệt' });
    }
    if (g.trangThai !== 'cho-duyet') return res.status(400).json({ error: 'Giải trình này đã được xử lý rồi' });
    const than = req.body || {};
    const ghiChu = String(than.ghiChu || '').trim().slice(0, 300);
    const luc = new Date().toISOString();

    if (than.duyet === false) {
      if (!ghiChu) return res.status(400).json({ error: 'Ghi lý do từ chối để người gửi biết nhé' });
      db.run(`UPDATE nhansu_giai_trinh SET trangThai = 'tu-choi', nguoiDuyet = ?, duyetLuc = ?, ghiChuDuyet = ?
               WHERE id = ? AND trangThai = 'cho-duyet'`, [req.user.id, luc, ghiChu, g.id]);
      db.audit(req.user.id, 'nhansu-giai-trinh-tu-choi', g.userId, { ngay: g.ngay });
      return res.json({ ok: true, trangThai: 'tu-choi' });
    }
    if (than.duyet !== true) return res.status(400).json({ error: 'Chọn duyệt hoặc từ chối' });

    const loai = String(than.loai || g.loaiDeNghi);
    if (!LOAI_CONG.includes(loai)) return res.status(400).json({ error: 'Loại ngày công chưa hợp lệ' });
    const lay = (k, deNghi) => String((than[k] !== undefined ? than[k] : g[deNghi]) || '').trim();
    const gioVao = lay('gioVao', 'gioVaoDeNghi');
    const gioRa = lay('gioRa', 'gioRaDeNghi');
    for (const [ten, gio] of [['giờ vào', gioVao], ['giờ ra', gioRa]]) {
      if (gio && !GIO_RE.test(gio)) return res.status(400).json({ error: `Ô ${ten} chưa đúng dạng giờ:phút` });
    }
    if (gioVao && gioRa && gioRa < gioVao) return res.status(400).json({ error: 'Giờ ra phải sau giờ vào' });

    const ketQua = db.tx(() => {
      const daCo = db.first('nhansu_cham_cong',
        'SELECT 1 AS co FROM nhansu_cham_cong WHERE userId = ? AND ngay = ?', [g.userId, g.ngay]);
      if (daCo) return 'da-co';
      const doi = db.run(`UPDATE nhansu_giai_trinh SET trangThai = 'da-duyet', nguoiDuyet = ?, duyetLuc = ?,
                           loaiDuyet = ?, ghiChuDuyet = ? WHERE id = ? AND trangThai = 'cho-duyet'`,
      [req.user.id, luc, loai, ghiChu, g.id]);
      if (!doi.changes) return 'da-xu-ly';
      db.insert('nhansu_cham_cong', {
        userId: g.userId, ngay: g.ngay, loai, gioVao, gioRa,
        ghiChu: `${ngayCong.GHI_CHU_GIAI_TRINH}${ghiChu ? `: ${ghiChu}` : ''}`.slice(0, 300),
        nguoiGhi: req.user.id, capNhatLuc: luc,
      });
      return 'ok';
    });
    if (ketQua === 'da-co') {
      return res.status(409).json({ error: 'Ngày này đã có dòng công ghi tay. Sửa thẳng ở bảng công, hoặc từ chối giải trình kèm lý do.' });
    }
    if (ketQua === 'da-xu-ly') return res.status(400).json({ error: 'Giải trình này đã được xử lý rồi' });
    db.audit(req.user.id, 'nhansu-giai-trinh-duyet', g.userId, { ngay: g.ngay, loai });
    res.json({ ok: true, trangThai: 'da-duyet' });
  });

  // -------------------------------------------------------------------------
  // BẬT / TẮT / ĐỔI QUY TẮC TÍNH CÔNG — chỉ từ NGÀY MAI trở đi. Ngày đã qua
  // và hôm nay giữ nguyên cách tính đang có; không dòng nào bị xoá.
  // -------------------------------------------------------------------------
  app.get('/api/nhansu/quy-tac-cong', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    res.json(trangThaiQuyTac());
  });

  app.put('/api/nhansu/quy-tac-cong', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const than = req.body || {};
    const mai = ngayMai();
    const ds = ngayCong.cacQuyTac(db);
    const luc = new Date().toISOString();
    const tuNgayMai = (n, ten) => {
      if (!NGAY_RE.test(n)) return `Ngày ${ten} chưa hợp lệ (YYYY-MM-DD)`;
      if (n < mai) return `Chỉ ${ten} được từ ngày mai trở đi — những ngày đã qua giữ nguyên như đã tính`;
      return null;
    };

    if (than.bat === false) {
      const tatTu = String(than.tatTu || mai);
      const loi = tuNgayMai(tatTu, 'tắt');
      if (loi) return res.status(400).json({ error: loi });
      const conChay = ds.filter(q => !q.tatTu || q.tatTu > tatTu);
      if (!conChay.length) return res.status(400).json({ error: 'Quy tắc tính công đang tắt rồi' });
      db.tx(() => {
        for (const q of conChay) {
          db.update('nhansu_quy_tac_cong', q.id, { tatTu, nguoiTat: req.user.id, tatLuc: luc });
        }
      });
      db.audit(req.user.id, 'nhansu-quy-tac-cong-tat', null, { tatTu });
      return res.json(trangThaiQuyTac());
    }
    if (than.bat !== true) return res.status(400).json({ error: 'Chọn bật hoặc tắt' });

    const apDungTu = String(than.apDungTu || mai);
    const loi = tuNgayMai(apDungTu, 'áp dụng');
    if (loi) return res.status(400).json({ error: loi });
    const goc = ds.filter(q => !q.tatTu).pop() || ngayCong.QUY_TAC_MAC_DINH;
    const moi = {};
    for (const k of ['phutDuCong', 'phutDuDi']) {
      const v = than[k] !== undefined ? Number(than[k]) : Number(goc[k]);
      const [thap, cao] = k === 'phutDuCong' ? [60, 720] : [0, 120];
      if (!Number.isInteger(v) || v < thap || v > cao) {
        return res.status(400).json({
          error: k === 'phutDuCong' ? 'Số phút đủ một công phải từ 60 đến 720' : 'Số phút xê dịch phải từ 0 đến 120',
        });
      }
      moi[k] = v;
    }
    for (const k of ['ca1Tu', 'ca1Den', 'ca2Tu', 'ca2Den']) {
      moi[k] = String(than[k] !== undefined ? than[k] : goc[k]).trim();
      if (!GIO_RE.test(moi[k])) return res.status(400).json({ error: 'Giờ ca chưa đúng dạng giờ:phút' });
    }
    if (moi.ca1Tu >= moi.ca1Den || moi.ca2Tu >= moi.ca2Den) {
      return res.status(400).json({ error: 'Giờ kết thúc ca phải sau giờ bắt đầu' });
    }
    // Đợt nào còn chạy tới ngày áp dụng mới thì đóng lại đúng ở ngày đó.
    const conChay = ds.filter(q => !q.tatTu || q.tatTu > apDungTu);
    db.tx(() => {
      for (const q of conChay) {
        db.update('nhansu_quy_tac_cong', q.id, { tatTu: apDungTu, nguoiTat: req.user.id, tatLuc: luc });
      }
      db.insert('nhansu_quy_tac_cong', {
        id: db.nextId('qtc'), apDungTu, tatTu: null, ...moi, nguoiBat: req.user.id, batLuc: luc,
      });
    });
    db.audit(req.user.id, 'nhansu-quy-tac-cong-bat', null, { apDungTu, ...moi, doi: conChay.length > 0 });
    res.json(trangThaiQuyTac());
  });

  // Danh sách ô nhạy cảm để bài canh đọc được, và để màn hình biết ô nào không
  // bao giờ được vẽ ở danh sách.
  app.get('/api/nhansu/o-nhay-cam', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    res.json({ o: O_NHAY_CAM });
  });

  // ẢNH CHẤM CÔNG Ở CỔNG (góp ý 06/10, mục 2) — ảnh khuôn mặt người lớn.
  //
  // Ảnh do cổng chụp (`/api/attendance/nhan-vien/anh`, bảng lõi
  // `staff_checkin`), nhưng XEM thì ở đây, theo đúng luật hồ sơ nhân sự của
  // Đ152: Nhân sự và Ban giám hiệu (qua `chiNhanSu`); quản trị gắn MỘT cơ sở
  // thì chỉ ảnh của cơ sở mình. Mỗi người xem ảnh của CHÍNH MÌNH qua đường
  // `/toi` riêng. Bảo vệ và văn phòng cơ sở — người bấm chụp — KHÔNG mở lại
  // được. Không ai nhận tấm ảnh thì 404 trước khi hỏi quyền, để không dò được.
  function dongAnhCong(file) {
    if (!file) return null;
    return db.first('staff_checkin',
      'SELECT userId, campusId FROM staff_checkin WHERE anhVao = ? OR anhRa = ?', [file, file]);
  }
  function guiAnh(res, file) {
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.sendFile(duong);
  }

  app.get('/api/nhansu/anh-cham-cong/:file', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const file = String(req.params.file || '');
    const r = dongAnhCong(file);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    const khoa = db.phamViCoSo(req.user);
    if (khoa && khoa !== r.campusId) {
      return res.status(403).json({ error: 'Ảnh chấm công của cơ sở khác' });
    }
    return guiAnh(res, file);
  });

  app.get('/api/nhansu/anh-cham-cong/:file/toi', requireRole('teacher', 'admin'), (req, res) => {
    const file = String(req.params.file || '');
    const r = dongAnhCong(file);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (r.userId !== req.user.id) return res.status(403).json({ error: 'Đây không phải ảnh chấm công của mình' });
    return guiAnh(res, file);
  });
};
