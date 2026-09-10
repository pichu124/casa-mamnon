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

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOAI_CONG = ['di-lam', 'nua-ngay', 'nghi-phep', 'nghi-khong-phep', 'nghi-le'];

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

  function bangThang(thang, chiUserId) {
    const [tu, den] = khoangThang(thang);
    const nguoi = chiUserId
      ? nguoiCuaTruong().filter(u => u.id === chiUserId)
      : nguoiCuaTruong();
    const ids = nguoi.map(u => u.id);
    const theoNguoi = new Map();
    if (ids.length) {
      const m = ids.map(() => '?').join(',');
      for (const r of db.all('nhansu_cham_cong',
        `SELECT * FROM nhansu_cham_cong WHERE ngay BETWEEN ? AND ? AND userId IN (${m})
         ORDER BY ngay`, [tu, den, ...ids])) {
        if (!theoNguoi.has(r.userId)) theoNguoi.set(r.userId, []);
        theoNguoi.get(r.userId).push({
          ngay: r.ngay, loai: r.loai, gioVao: r.gioVao, gioRa: r.gioRa, ghiChu: r.ghiChu,
        });
      }
    }
    const danhSach = nguoi.map((u) => {
      const dong = theoNguoi.get(u.id) || [];
      const dem = (l) => dong.filter(x => x.loai === l).length;
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
        soCong: dem('di-lam') + (dem('nua-ngay') * 0.5),
        soNgayDiLam: dem('di-lam'),
        soNuaNgay: dem('nua-ngay'),
        soNghiPhep: dem('nghi-phep'),
        soNghiKhongPhep: dem('nghi-khong-phep'),
        soNghiLe: dem('nghi-le'),
      };
    });
    return { thang, tuNgay: tu, denNgay: den, danhSach };
  }

  app.get('/api/nhansu/cham-cong/toi', requireRole('teacher', 'admin'), (req, res) => {
    const thang = thangHopLe(req, res);
    if (!thang) return;
    const b = bangThang(thang, req.user.id);
    res.json({ ...b, cuaToi: b.danhSach[0] || null, danhSach: undefined });
  });

  app.get('/api/nhansu/cham-cong', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const thang = thangHopLe(req, res);
    if (!thang) return;
    res.json(bangThang(thang));
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
    const gioVao = String(than.gioVao || '').trim();
    const gioRa = String(than.gioRa || '').trim();
    for (const [ten, g] of [['giờ vào', gioVao], ['giờ ra', gioRa]]) {
      if (g && !GIO_RE.test(g)) return res.status(400).json({ error: `Ô ${ten} chưa đúng dạng giờ:phút` });
    }
    if (gioVao && gioRa && gioRa < gioVao) {
      return res.status(400).json({ error: 'Giờ ra phải sau giờ vào' });
    }
    db.upsert('nhansu_cham_cong', {
      userId: u.id, ngay: n, loai, gioVao, gioRa,
      ghiChu: String(than.ghiChu || '').trim().slice(0, 300),
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
    const them = nguoi.filter(u => !daCo.has(u.id));
    db.tx(() => {
      for (const u of them) {
        db.insert('nhansu_cham_cong', {
          userId: u.id, ngay: n, loai, gioVao: '', gioRa: '', ghiChu: '',
          nguoiGhi: req.user.id, capNhatLuc: new Date().toISOString(),
        });
      }
    });
    db.audit(req.user.id, 'nhansu-cham-ca-truong', null, { ngay: n, loai, soNguoi: them.length });
    res.json({ ok: true, ngay: n, soDaCoTruoc: daCo.size, soVuaGhi: them.length });
  });

  app.get('/api/nhansu/cham-cong.csv', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    const thang = thangHopLe(req, res);
    if (!thang) return;
    const b = bangThang(thang);
    const COT = ['Họ và tên', 'Vai trò', 'Số công', 'Ngày đi làm', 'Nửa ngày',
      'Nghỉ phép', 'Nghỉ không phép', 'Nghỉ lễ'];
    const duLieu = b.danhSach.map(x => khoaCongThuc({
      'Họ và tên': x.hoTen,
      'Vai trò': x.vai === 'teacher' ? 'Cô' : 'Văn phòng',
      'Số công': x.soCong,
      'Ngày đi làm': x.soNgayDiLam,
      'Nửa ngày': x.soNuaNgay,
      'Nghỉ phép': x.soNghiPhep,
      'Nghỉ không phép': x.soNghiKhongPhep,
      'Nghỉ lễ': x.soNghiLe,
    }));
    db.audit(req.user.id, 'nhansu-xuat-cong', null, { thang, soNguoi: duLieu.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cham-cong-${thang}.csv"`);
    res.send(csv.stringify(COT, duLieu));
  });

  // Danh sách ô nhạy cảm để bài canh đọc được, và để màn hình biết ô nào không
  // bao giờ được vẽ ở danh sách.
  app.get('/api/nhansu/o-nhay-cam', requireRole('teacher', 'admin'), (req, res) => {
    if (chiNhanSu(req, res)) return;
    res.json({ o: O_NHAY_CAM });
  });
};
