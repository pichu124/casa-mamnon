// CAMBRIDGE & KẾT NỐI Ở NHÀ — văn phòng đăng, gia đình đọc.
//
// PHÂN HỆ NÀY CHỦ YẾU LÀ MỘT BÀI TOÁN PHẠM VI
//
// Nội dung thì đơn giản: một tiêu đề, một khối chữ, vài tấm ảnh. Chỗ khó là
// AI ĐỌC ĐƯỢC BÀI NÀO — và sai ở đó có hai kiểu, cả hai đều tệ:
//
//   GỬI THIẾU: gia đình nhóm Lá 1 không thấy tờ Home Connection của chính
//   nhóm mình. Họ không biết mình đang thiếu, nên không ai báo, và văn phòng
//   tưởng đã gửi rồi.
//
//   GỬI THỪA: tờ của nhóm Lá 1 hiện cho gia đình nhóm nhà trẻ. Nhìn thì vô
//   hại, nhưng đó là thư rác — và thư rác làm gia đình ngừng đọc MỌI THỨ
//   khác, kể cả thông báo thật sự quan trọng.
//
// Nên phạm vi lọc ở TẦNG DỮ LIỆU, có một hàm duy nhất quyết định, và có bài
// test đi đủ ba mức phạm vi nhân ba loại người đọc.
const { requireRole } = require('../../lib/auth');
const uploads = require('../../lib/uploads');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOAI = ['cambridge', 'ket-noi'];
const PHAM_VI = ['truong', 'coso', 'nhom'];

const TOI_DA_TIEU_DE = 200;
const TOI_DA_NOI_DUNG = 8000;
const TOI_DA_ANH = 6;
const GIOI_HAN = 60;

function homNay() {
  return new Date().toISOString().slice(0, 10);
}

function chuoi(v, tran) {
  return String(v == null ? '' : v).trim().slice(0, tran);
}

function thuHaiCua(ngay) {
  const t = Date.parse(`${ngay}T00:00:00Z`);
  if (Number.isNaN(t)) return '';
  const lui = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - lui * 86400000).toISOString().slice(0, 10);
}

// Danh sách ảnh lưu phẳng: mỗi dòng một tên tệp.
function tachAnh(s) {
  return String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
}

module.exports = (app, { db }) => {
  // =========================================================================
  // MỘT HÀM DUY NHẤT QUYẾT ĐỊNH AI ĐỌC ĐƯỢC BÀI NÀO
  // =========================================================================
  //
  // Quản trị đi theo tầng cơ sở như mọi chỗ khác. Cô và gia đình đi theo NHÓM
  // của mình — và với gia đình, "nhóm của mình" nghĩa là nhóm của bất kỳ đứa
  // con nào, vì một nhà có thể có hai bé ở hai nhóm.
  function xemDuoc(bai, user) {
    if (!bai || !user) return false;
    // Nháp chỉ người đăng và quản trị thấy.
    if (!bai.congBoLuc && user.role !== 'admin') return false;

    if (user.role === 'admin') {
      const pham = db.phamViCoSo(user);
      if (pham === null) return true;                     // Cấp 1 — toàn hệ thống
      if (bai.phamVi === 'truong') return true;
      if (bai.phamVi === 'coso') return bai.campusId === pham;
      return db.classIdsOfCampus(pham).includes(bai.classId);
    }

    if (bai.phamVi === 'truong') return true;
    const nhomCuaToi = db.classIdsOf(user);
    if (bai.phamVi === 'nhom') return nhomCuaToi.includes(bai.classId);
    // Phạm vi CƠ SỞ: đúng khi một trong những nhóm của mình thuộc cơ sở đó.
    return nhomCuaToi.some(cid => db.campusOfClass(cid) === bai.campusId);
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  function keml(bai) {
    return {
      ...bai,
      anh: tachAnh(bai.anh),
      daCongBo: !!bai.congBoLuc,
      nguoiDangTen: tenNguoi(bai.nguoiDang),
      tenNhom: bai.classId ? ((db.findClass(bai.classId) || {}).name || '') : '',
      tenCoSo: bai.campusId ? ((db.findCampus(bai.campusId) || {}).name || '') : '',
    };
  }

  // =========================================================================
  // ĐỌC
  // =========================================================================
  app.get('/api/cambridge', (req, res) => {
    const loai = LOAI.includes(String(req.query.loai || '')) ? req.query.loai : '';
    const rows = db.all('cambridge_bai',
      `SELECT * FROM cambridge_bai ${loai ? 'WHERE loai = ?' : ''}
       ORDER BY COALESCE(NULLIF(tuan, ''), substr(taoLuc, 1, 10)) DESC, taoLuc DESC
       LIMIT ?`, loai ? [loai, GIOI_HAN * 2] : [GIOI_HAN * 2]);

    const bai = rows.filter(b => xemDuoc(b, req.user)).slice(0, GIOI_HAN).map(keml);
    res.json({
      bai,
      loai: [
        { ma: 'cambridge', ten: 'Cambridge' },
        { ma: 'ket-noi', ten: 'Kết nối ở nhà' },
      ],
      duocDang: req.user.role === 'admin',
      // Danh mục để văn phòng dựng ô chọn phạm vi. Chỉ gửi cho người đăng
      // được — danh sách nhóm và cơ sở của cả trường không việc gì phải đi ra
      // màn hình của gia đình.
      ...(req.user.role === 'admin' ? {
        nhom: db.classIdsOf(req.user).map(id => db.findClass(id)).filter(Boolean)
          .map(c => ({ id: c.id, name: c.name })),
        coSo: db.campuses().map(c => ({ id: c.id, name: c.name })),
      } : {}),
    });
  });

  // Ảnh của một bài. ĐI QUA CANH QUYỀN, không phục vụ tĩnh: một tờ Home
  // Connection của nhóm có thể có ảnh các bé đang làm việc.
  app.get('/api/cambridge/anh/:file', (req, res) => {
    const file = String(req.params.file || '');
    // Nối chuỗi thay vì nhúng biến vào chuỗi mẫu.
    //
    // Ký tự đại diện của SQL đứng ngay sau một biến nhúng sẽ trùng với dấu
    // hiệu "phần trăm được tính rồi in ra màn hình" mà bộ canh QUY TẮC 4 đi
    // tìm. Ở đây nó không phải phần trăm nào cả — nhưng viết cách khác thì rẻ
    // hơn nhiều so với mở một ngoại lệ cho cả tệp, mà ngoại lệ mở cả tệp thì
    // che luôn những vi phạm thật sau này.
    const mau = '%' + file + '%';
    const chu = db.all('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE anh LIKE ?', [mau])
      .find(b => tachAnh(b.anh).includes(file));
    if (!chu) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!xemDuoc(chu, req.user)) return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    const duong = uploads.pathOf(file);
    if (!duong || !uploads.exists(file)) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    res.setHeader('Content-Type', uploads.mimeOf(file));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(duong);
  });

  // =========================================================================
  // ĐĂNG — VIỆC CỦA VĂN PHÒNG
  // =========================================================================
  //
  // Nhà trường nói rõ "văn phòng đăng lên, phụ huynh đọc". Cô không đăng: nội
  // dung Cambridge là chương trình của cả trường, và một tờ gửi nhầm nhóm thì
  // không rút lại được khỏi điện thoại đã đọc.
  //
  // `requireRole` để rộng tới 'teacher' một cách CÓ CHỦ Ý: nếu chặn ngay ở đó
  // thì cô nhận câu "Không có quyền thực hiện" cụt lủn. Hàm này chặn thật, và
  // nói được một câu có ích — kèm chỉ đường sang phần thuộc về cô.
  function chanNeuKhongPhaiVanPhong(req, res) {
    if (req.user.role === 'admin') return false;
    res.status(403).json({
      error: 'Nội dung Cambridge và Kết nối ở nhà do văn phòng đăng. '
        + 'Cô có mục "Cùng con ở nhà" theo tuần ở phân hệ Hành trình học tập.',
    });
    return true;
  }

  function lamSach(req, b, cu) {
    const tieuDe = chuoi(b.tieuDe !== undefined ? b.tieuDe : (cu || {}).tieuDe, TOI_DA_TIEU_DE);
    if (!tieuDe) return { loi: 'Cần một tiêu đề cho bài đăng' };

    const loai = chuoi(b.loai !== undefined ? b.loai : (cu || {}).loai, 20) || 'cambridge';
    if (!LOAI.includes(loai)) return { loi: 'Loại bài đăng không hợp lệ' };

    const phamVi = chuoi(b.phamVi !== undefined ? b.phamVi : (cu || {}).phamVi, 20) || 'truong';
    if (!PHAM_VI.includes(phamVi)) return { loi: 'Phạm vi gửi không hợp lệ' };

    let campusId = '';
    let classId = '';
    if (phamVi === 'coso') {
      campusId = chuoi(b.campusId !== undefined ? b.campusId : (cu || {}).campusId, 40);
      if (!db.findCampus(campusId)) return { loi: 'Chưa chọn cơ sở, hoặc cơ sở không tồn tại' };
      if (!db.canAccessCampus(req.user, campusId)) return { loi: 'Không có quyền đăng cho cơ sở này' };
    }
    if (phamVi === 'nhom') {
      classId = chuoi(b.classId !== undefined ? b.classId : (cu || {}).classId, 40);
      if (!db.findClass(classId)) return { loi: 'Chưa chọn nhóm, hoặc nhóm không tồn tại' };
      if (!db.canAccessClass(req.user, classId)) return { loi: 'Không có quyền đăng cho nhóm này' };
    }
    // GỬI CẢ TRƯỜNG THÌ PHẢI LÀ NGƯỜI CỦA CẢ TRƯỜNG.
    //
    // Quản lý một cơ sở gửi được cho cơ sở mình và các nhóm của mình, nhưng
    // không gửi được cho hai cơ sở kia — cùng luật với thực đơn ở N15.
    if (phamVi === 'truong' && db.phamViCoSo(req.user) !== null) {
      return {
        loi: 'Gửi cho cả trường thì cần tài khoản quản trị toàn hệ thống. '
          + 'Quản lý cơ sở gửi được cho cơ sở mình hoặc cho một nhóm.',
      };
    }

    const tuanRaw = chuoi(b.tuan !== undefined ? b.tuan : (cu || {}).tuan, 10);
    const tuan = tuanRaw ? (NGAY_RE.test(tuanRaw) ? thuHaiCua(tuanRaw) : null) : '';
    if (tuan === null) return { loi: 'Tuần chưa đúng dạng, ví dụ đúng: 2026-09-07' };

    return {
      loai, tieuDe, phamVi, campusId, classId, tuan,
      noiDung: chuoi(b.noiDung !== undefined ? b.noiDung : (cu || {}).noiDung, TOI_DA_NOI_DUNG),
    };
  }

  // Nhận danh sách ảnh dạng data URL, trả { anh } hoặc { loi }.
  function nhanAnh(ds) {
    if (!Array.isArray(ds)) return { anh: null };
    if (ds.length > TOI_DA_ANH) return { loi: `Mỗi bài tối đa ${TOI_DA_ANH} ảnh` };
    const ten = [];
    for (const a of ds) {
      if (!a) continue;
      try { ten.push(uploads.saveDataUrl(a).file); }
      catch (err) { return { loi: err.message || 'Ảnh không hợp lệ' }; }
    }
    return { anh: ten.join('\n') };
  }

  app.post('/api/cambridge', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const s = lamSach(req, req.body || {}, null);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const a = nhanAnh((req.body || {}).anh);
    if (a.loi) return res.status(400).json({ error: a.loi });

    const luc = new Date().toISOString();
    const rec = {
      id: db.nextId('cam'), ...s, anh: a.anh || '',
      congBoLuc: null, nguoiDang: req.user.id, taoLuc: luc, capNhatLuc: luc,
    };
    db.insert('cambridge_bai', rec);
    db.audit(req.user.id, 'cambridge-tao', rec.id, { loai: rec.loai, phamVi: rec.phamVi });
    res.status(201).json(keml(rec));
  });

  app.put('/api/cambridge/:id', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const cu = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(cu, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });

    const s = lamSach(req, req.body || {}, cu);
    if (s.loi) return res.status(400).json({ error: s.loi });
    const patch = { ...s, capNhatLuc: new Date().toISOString() };
    const a = nhanAnh((req.body || {}).anh);
    if (a.loi) return res.status(400).json({ error: a.loi });
    if (a.anh !== null) {
      // Ảnh cũ không còn ai trỏ tới thì bỏ tệp đi.
      const giu = new Set(tachAnh(a.anh));
      for (const f of tachAnh(cu.anh)) {
        if (!giu.has(f)) { try { uploads.remove(f); } catch (_) { /* tệp đã mất thì thôi */ } }
      }
      patch.anh = a.anh;
    }

    db.update('cambridge_bai', cu.id, patch);
    db.audit(req.user.id, 'cambridge-sua', cu.id, { phamVi: patch.phamVi });
    res.json(keml(db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [cu.id])));
  });

  // Công bố là một BƯỚC RIÊNG, không phải hệ quả của việc bấm Lưu.
  app.post('/api/cambridge/:id/cong-bo', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    if (b.congBoLuc) return res.status(400).json({ error: 'Bài này đã công bố rồi' });
    if (!chuoi(b.noiDung, 10) && !tachAnh(b.anh).length) {
      return res.status(400).json({ error: 'Bài chưa có nội dung hay ảnh nào để gửi tới gia đình' });
    }
    const luc = new Date().toISOString();
    db.update('cambridge_bai', b.id, { congBoLuc: luc, capNhatLuc: luc });
    db.audit(req.user.id, 'cambridge-cong-bo', b.id, { phamVi: b.phamVi });
    res.json({ ok: true, id: b.id, daCongBo: true, congBoLuc: luc });
  });

  // Thu hồi: gỡ khỏi màn hình gia đình, KHÔNG xoá chữ đã viết.
  app.post('/api/cambridge/:id/thu-hoi', requireRole('teacher', 'admin'), (req, res) => {
    if (chanNeuKhongPhaiVanPhong(req, res)) return;
    const b = db.first('cambridge_bai', 'SELECT * FROM cambridge_bai WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    if (!xemDuoc(b, req.user)) return res.status(403).json({ error: 'Bài đăng ngoài phạm vi của mình' });
    if (!b.congBoLuc) return res.status(400).json({ error: 'Bài này chưa công bố' });
    db.update('cambridge_bai', b.id, { congBoLuc: null, capNhatLuc: new Date().toISOString() });
    db.audit(req.user.id, 'cambridge-thu-hoi', b.id, {});
    res.json({ ok: true, id: b.id, daCongBo: false });
  });

  void homNay;
};
