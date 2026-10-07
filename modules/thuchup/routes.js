// Phân hệ THỬ NGHIỆM của GĐ 0 — phép thử quyết định của cả dự án.
//
// Câu hỏi cần trả lời: cô giáo cầm chính điện thoại của mình, có ghi lại được
// một khoảnh khắc của bé trong dưới 20 giây không, kể cả khi lớp mất sóng?
//
// Nếu câu trả lời là không thì GĐ 2 (hành trình học tập) mất chỗ đứng và kế
// hoạch phải sửa — nên phần này làm trước, đo bằng số, không đoán.
//
// Đây KHÔNG phải bản dùng thật. Bản dùng thật của GĐ 2 sẽ có ba lớp dữ liệu,
// gắn lĩnh vực phát triển, và bước suy ngẫm cuối ngày.
const fs = require('fs');

module.exports = (app, { db }) => {
  const { requireRole } = require('../../lib/auth');
  const uploads = require('../../lib/uploads');

  // Mã do máy của cô sinh (crypto.randomUUID). Chấp nhận rộng hơn UUID một chút
  // để trình duyệt cũ dùng mã dự phòng vẫn gửi được.
  const MA_RE = /^[a-z0-9][a-z0-9-]{7,63}$/i;
  const MAX_NOTE = 500;
  const GIOI_HAN = 50;

  // Khoảng hợp lý cho hai con số do trình duyệt gửi lên. Rộng rãi có chủ ý:
  // chúng chỉ chặn thứ KHÔNG THỂ đúng, không đoán thay cô.
  const GIAY_TOI_DA = 3600;             // một giờ cho một khoảnh khắc
  const CHO_TOI_DA = 30 * 24 * 3600;    // ba mươi ngày nằm trong hàng đợi

  function nowIso() {
    return new Date().toISOString();
  }

  // LỚP DỮ LIỆU 1 — ghi chú thô của cô: chỉ chính cô đã ghi đọc được, cộng quản
  // trị khi cần (CLAUDE.md, "Ba lớp dữ liệu của một quan sát").
  //
  // Trước G0.4 điều này đúng một cách TÌNH CỜ: app 1 gắn một cô một lớp, nên
  // `db.canAccessStudent` cũng vừa đúng là "chỉ cô đã ghi". Nhóm mầm non có 2–3
  // cô cùng phụ trách thì sự trùng khớp đó biến mất — không chặn thêm ở đây là
  // nháp dở dang của cô này hiện thẳng ra cho cô kia đọc. Đó là chỗ mất lòng tin
  // của cô giáo nhanh nhất, nên chặn ở tầng dữ liệu chứ không che ở giao diện.
  function chiCuaChinhCo(user) {
    return user.role === 'teacher' ? user.id : null;
  }

  // Một bản ghi cụ thể có thuộc về người đang hỏi không. Dùng cho những đường
  // trả về NGUYÊN một bản ghi, nơi không lọc được bằng câu truy vấn.
  function doDuocBanGhi(user, r) {
    return !!r && (user.role !== 'teacher' || r.byTeacherId === user.id);
  }

  // Danh sách ghi nhanh gần đây của các bé cô đang phụ trách.
  app.get('/api/thuchup', requireRole('teacher', 'admin'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.json({ ghiNhan: [], soBe: 0 });

    const marks = ids.map(() => '?').join(',');
    const byId = new Map(students.map(s => [s.id, s]));
    const cuaCo = chiCuaChinhCo(req.user);
    const rows = db.all('thuchup_ghinhanh',
      `SELECT * FROM thuchup_ghinhanh WHERE studentId IN (${marks})
         AND (? IS NULL OR byTeacherId = ?)
       ORDER BY taoLuc DESC LIMIT ?`, [...ids, cuaCo, cuaCo, GIOI_HAN]);

    // Dấu vết sửa chữ của cả trang, hỏi MỘT lượt (Đ166). Hỏi từng dòng là dựng
    // lại đúng vòng lặp N+1 mà Đ158 và Đ159 vừa dọn ở hai phân hệ khác.
    const daSua = new Map();
    if (rows.length) {
      const m2 = rows.map(() => '?').join(',');
      for (const x of db.all('thuchup_sua',
        `SELECT ghiId, soLan, suaLuc FROM thuchup_sua WHERE ghiId IN (${m2})`,
        rows.map(r => r.id))) daSua.set(x.ghiId, x);
    }

    res.json({
      soBe: ids.length,
      // BÉ MÀ GIA ĐÌNH ĐÃ DỪNG HỒ SƠ HỌC TẬP — GỬI KÈM ĐỂ MÀN HÌNH NGĂN TỪ GỐC.
      //
      // Đường ghi đã chặn đúng (Đ96), nhưng nó chặn ở phía cuối. Ghi nhanh có
      // HÀNG ĐỢI: cô bấm là bài nằm trong máy rồi mới gửi lên, nên một lời từ
      // chối VĨNH VIỄN ở đó khác hẳn một lời từ chối tạm thời (mất mạng, hết
      // phiên). Bài ấy sẽ không bao giờ gửi được, mà hàng đợi lại dừng ở bản
      // ghi lỗi đầu tiên — nghĩa là một bé đã rút đồng ý làm kẹt luôn bài của
      // những bé khác xếp sau. Đúng vế "mọi tính năng khác vẫn chạy y như cũ"
      // của Nguyên tắc số 1.
      //
      // Gửi danh sách này ra để màn hình (a) không cho bấm vào chip của bé đó,
      // và (b) biết bài nào trong hàng đợi là vô vọng mà bỏ qua, thay vì đoán
      // qua câu chữ của lời từ chối — cách ấy đã hỏng một lần rồi, và chú thích
      // ở khối bắt lỗi của `modules/thuchup/view.js` kể lại đúng lần đó.
      beNgungHoSo: [...db.dsBeNgungHoSoHocTap(ids)],
      ghiNhan: rows.map(r => ({
        ...r,
        tenBe: byId.get(r.studentId)?.name || '',
        ngoaiTuyen: !!r.ngoaiTuyen,
        // Dấu vết sửa chữ (Đ166). Hỏi theo LÔ, không hỏi từng dòng một.
        suaLuc: (daSua.get(r.id) || {}).suaLuc || null,
        // Màn hình không tự suy từ vai: đường PATCH chỉ nhận chính cô đã ghi.
        suaDuoc: r.byTeacherId === req.user.id,
      })),
    });
  });

  // Ghi nhận mới.
  //
  // BẤT BIẾN THEO MÃ: gửi lại đúng một mã thì KHÔNG tạo bản ghi thứ hai, mà trả
  // lại bản cũ kèm cờ trungLap. Điện thoại gửi xong nhưng mất sóng trước khi
  // nhận được trả lời sẽ gửi lại — không có chỗ này thì mỗi lần mất sóng là một
  // bản ghi nhân đôi, và cô sẽ không tin app nữa.
  app.post('/api/thuchup', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const id = String(b.id || '');
    if (!MA_RE.test(id)) {
      return res.status(400).json({ error: 'Mã ghi nhận không hợp lệ' });
    }
    if (!b.studentId || !db.canAccessStudent(req.user, b.studentId)) {
      return res.status(403).json({ error: 'Bé không thuộc nhóm cô phụ trách' });
    }
    // GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP THÌ NGƯNG GHI MỚI (Đ96, ô đồng ý ①).
    //
    // Ghi nhanh là LỚP 1 của hồ sơ học tập — ghi chú thô kèm ảnh của bé — và
    // `hanhtrinh_quansat` có hẳn cột `ghiNhanhId` để kéo bản này sang lớp 2.
    // Chặn ở Hành trình mà bỏ sót đây thì cô chỉ việc đổi màn hình là ghi tiếp
    // được như chưa có gì, và chốt bên kia thành vô nghĩa.
    //
    // Đặt SAU phép chống trùng thì muộn: đường này trả về nguyên bản ghi cũ khi
    // trùng mã, tức một đường đọc. Chặn trước cả chỗ đó là đúng thứ tự.
    if (db.beNgungHoSoHocTap(b.studentId)) {
      return res.status(403).json({
        error: 'Gia đình bé này đã dừng phần hồ sơ học tập. '
          + 'Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.',
      });
    }

    const daCo = db.first('thuchup_ghinhanh',
      'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [id]);
    if (daCo) {
      // Đường chống trùng trả về NGUYÊN bản ghi cũ, kèm cả dòng ghi chú và tên
      // tệp ảnh. Đó là một đường ĐỌC lớp dữ liệu 1, dù nó nằm trong một đường
      // ghi — nên phải hỏi ai đã ghi, y như đường đọc danh sách và đường đọc
      // ảnh. Mã do máy của cô sinh (crypto.randomUUID) nên trùng nhau là chuyện
      // gần như không xảy ra, nhưng "gần như không xảy ra" không phải là kiểm
      // soát truy cập.
      // HAI ĐIỀU KIỆN, KHÔNG PHẢI MỘT.
      //
      // `doDuocBanGhi` hỏi "cô có phải người đã ghi không" — đủ cho cô giáo,
      // KHÔNG đủ cho quản trị. Phía trên mới chỉ kiểm quyền trên `b.studentId`
      // do NGƯỜI GỬI khai, còn bản ghi thì tra theo `id`; hai giá trị đó chưa
      // được đối chiếu với nhau. Nghĩa là một quản trị Cấp 3 khai studentId của
      // bé cơ sở mình cộng với id của bản ghi thuộc cơ sở khác thì đọc được
      // nguyên ghi chú và tên tệp ảnh của cơ sở khác.
      //
      // Mã là UUID nên khó đoán, nhưng "khó đoán" không phải kiểm soát truy cập.
      if (!doDuocBanGhi(req.user, daCo) || !db.canAccessStudent(req.user, daCo.studentId)) {
        return res.status(403).json({ error: 'Ghi chép này là bản nháp của cô khác, cô không xem được' });
      }
      return res.json({ ...daCo, ngoaiTuyen: !!daCo.ngoaiTuyen, trungLap: true });
    }

    const note = String(b.note || '').trim().slice(0, MAX_NOTE);
    if (!note && !b.dataUrl) {
      return res.status(400).json({ error: 'Cần ít nhất một ảnh hoặc một dòng ghi chú' });
    }

    let file = null;
    if (b.dataUrl) {
      try {
        file = uploads.saveDataUrl(b.dataUrl).file;
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Ảnh không hợp lệ' });
      }
    }

    // SỐ GIÂY LÀ DO TRÌNH DUYỆT GỬI LÊN, NÊN PHẢI LỌC TRƯỚC KHI LƯU.
    //
    // Ba con số của phép thử GĐ 0 — nhanh nhất, trung vị, "số lần dưới 20
    // giây" — là bằng chứng nhà trường dùng để quyết định đi tiếp hay dừng.
    // Một bản ghi mang `giay: -5` hay `giay: 1e9` (đồng hồ máy nhảy, một tab
    // mở từ hôm qua, hay ai đó gửi tay) kéo lệch cả ba, và lệch theo hướng
    // KHÓ THẤY NHẤT: số âm làm "nhanh nhất" đẹp lên, số khổng lồ làm trung vị
    // xấu đi.
    //
    // Ngoài khoảng hợp lý thì lưu `null` = "lần này không đo được", chứ KHÔNG
    // từ chối bản ghi: ghi chép của cô về một đứa trẻ không được mất chỉ vì
    // cái đồng hồ. Bảng tổng kết đã lọc `giay IS NOT NULL` sẵn.
    const soGiay = Number(b.giay);
    const giayHopLe = Number.isFinite(soGiay) && soGiay > 0 && soGiay <= GIAY_TOI_DA;
    const cho = Number(b.choBaoLau);
    const choHopLe = Number.isFinite(cho) && cho >= 0 && cho <= CHO_TOI_DA;
    const record = {
      id,
      studentId: b.studentId,
      file,
      note,
      giay: giayHopLe ? Math.round(soGiay * 10) / 10 : null,
      ngoaiTuyen: b.ngoaiTuyen ? 1 : 0,
      choBaoLau: choHopLe ? Math.round(cho * 10) / 10 : null,
      taoLuc: String(b.taoLuc || '').slice(0, 40) || nowIso(),
      nhanLuc: nowIso(),
      byTeacherId: req.user.id,
    };

    try {
      db.insert('thuchup_ghinhanh', record);
    } catch (err) {
      // Hai lần gửi cùng lúc từ hai tab: bản thứ hai đụng khoá chính. Đọc lại
      // bản đã có và trả về như trường hợp trùng, thay vì báo lỗi cho cô.
      const lai = db.first('thuchup_ghinhanh',
        'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [id]);
      if (!lai) throw err;
      // Dọn tệp vừa lưu TRƯỚC khi rẽ nhánh, để đường từ chối bên dưới không bỏ
      // lại một tệp ảnh mồ côi trên đĩa.
      if (file) uploads.remove(file);
      if (!doDuocBanGhi(req.user, lai)) {
        return res.status(403).json({ error: 'Ghi chép này là bản nháp của cô khác, cô không xem được' });
      }
      return res.json({ ...lai, ngoaiTuyen: !!lai.ngoaiTuyen, trungLap: true });
    }

    res.json({ ...record, ngoaiTuyen: !!record.ngoaiTuyen, trungLap: false });
  });

  // Trả về tệp ảnh. Đi qua đây thay vì để lộ thư mục ảnh, để mỗi lượt xem đều
  // được kiểm tra quyền trên chính bé trong ảnh.
  app.get('/api/thuchup/anh/:id', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('thuchup_ghinhanh',
      'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [req.params.id]);
    if (!r || !r.file) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
    if (!db.canAccessStudent(req.user, r.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem ảnh này' });
    }
    if (!doDuocBanGhi(req.user, r)) {
      return res.status(403).json({ error: 'Đây là bản nháp của cô khác' });
    }

    const filePath = uploads.pathOf(r.file);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Tệp ảnh không còn trên máy chủ' });
    }
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Type', uploads.mimeOf(r.file));
    res.sendFile(filePath);
  });

  // SỬA LỜI GHI CHÚ CỦA MỘT BẢN GHI NHANH ĐÃ LÊN MÁY CHỦ (Đ166, HT-03).
  //
  // Nhà trường 07/09: ảnh Ghi nhanh không kèm chữ thì vẫn hợp lệ — đúng, đã
  // làm — nhưng *"thiếu sửa caption sau"*. Trước đợt này bản ghi đã gửi lên là
  // **vĩnh viễn**: phân hệ chỉ có liệt kê, tạo, xem ảnh, xoá. Cô gõ vội một
  // dòng giữa lớp rồi đọc lại thấy sai tên món đồ chơi thì đường duy nhất là
  // XOÁ cả bản ghi — mất luôn tấm ảnh, mất luôn số giây đã đo.
  //
  // CHỈ CHÍNH CÔ ĐÃ GHI, KỂ CẢ QUẢN TRỊ CŨNG KHÔNG. Đây là chỗ đường này CỐ Ý
  // chặt hơn đường XOÁ ngay bên dưới, chứ không phải chép y nguyên luật của
  // nó. Hai việc khác nhau: xoá một bản ghi SAI BÉ là dọn một thứ không nên
  // tồn tại, và văn phòng phải làm được; còn sửa CHỮ trong ghi chép riêng của
  // một cô là viết lại lời của người khác dưới tên người ấy. Bảng ba lớp của
  // CLAUDE.md xếp ghi chú thô vào lớp 1 — *"chỉ cô đã ghi"* — và lớp ấy là
  // chỗ cô được phép nháp dở dang mà không ai nhìn vào.
  //
  // KHÔNG KHOÁ THEO THỜI GIAN. Ghi nhanh là nháp, không phải chứng từ; khoá
  // sau một khoảng thời gian chỉ đẩy cô sang cách cũ là xoá đi ghi lại, tức
  // mất ảnh và mất số liệu — đúng thứ đợt này sinh ra để tránh.
  //
  // SỬA Ở ĐÂY KHÔNG KÉO THEO BẢN ĐÃ CHÉP SANG HÀNH TRÌNH. Ba lớp là ba bản ghi
  // riêng; bản Hành trình có thể đã được cô duyệt và kể cho gia đình rồi. Màn
  // hình nói thẳng câu đó cho cô, chứ không âm thầm sửa hai chỗ.
  app.put('/api/thuchup/:id', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('thuchup_ghinhanh',
      'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy bản ghi này' });
    if (!db.canAccessStudent(req.user, r.studentId)) {
      return res.status(403).json({ error: 'Không có quyền sửa bản ghi của bé này' });
    }
    if (r.byTeacherId !== req.user.id) {
      return res.status(403).json({
        error: 'Đây là ghi chép riêng của cô đã ghi. Người khác xoá được bản ghi sai bé, '
          + 'nhưng không sửa lời của cô.',
      });
    }
    // GIA ĐÌNH ĐÃ RÚT ĐỒNG Ý HỒ SƠ HỌC TẬP THÌ THÔI GHI TIẾP (Đ96).
    //
    // Đường GHI MỚI đã chặn từ trước; đường SỬA thì bản đầu quên, nên rút đồng
    // ý xong cô vẫn viết thêm được vào lớp 1 của bé ấy — chỉ khác là viết đè
    // lên một bản cũ thay vì tạo bản mới. Rút lại đồng ý bất cứ lúc nào là
    // quyền của gia đình theo Nghị định 13/2023, và "thôi ghi thêm" phải đúng
    // ở MỌI đường ghi chứ không riêng đường tạo.
    //
    // XOÁ thì vẫn cho: dọn một bản ghi đi là đi đúng hướng gia đình vừa yêu cầu.
    if (db.beNgungHoSoHocTap(r.studentId)) {
      return res.status(403).json({
        error: 'Gia đình bé này đã dừng phần hồ sơ học tập, nên không ghi thêm gì nữa. '
          + 'Bản ghi cũ vẫn xoá được.',
      });
    }

    // CÙNG MỘT TRẦN VỚI ĐƯỜNG GHI MỚI. Bản đầu cắt ở 2000 trong khi `POST` —
    // đường DUY NHẤT mà bài trong hàng đợi đi lên — cắt ở 500. Nghĩa là cô gõ
    // 900 chữ vào ô sửa của một bài còn kẹt trong máy thì lúc gửi lên mất 400
    // chữ, không một lời báo. Hai trần khác nhau cho cùng một ô là một cái bẫy.
    const note = String((req.body || {}).note ?? '').trim().slice(0, MAX_NOTE);
    // Bản ghi CHỈ CÓ CHỮ mà xoá sạch chữ là biến nó thành một dòng rỗng không
    // ai đọc được — muốn bỏ hẳn thì có đường xoá, và đường ấy dọn cả ảnh.
    if (!note && !r.file) {
      return res.status(400).json({
        error: 'Bản ghi này không có ảnh, nên phải còn lại vài chữ. Muốn bỏ hẳn thì dùng nút Xoá.',
      });
    }
    if (note === (r.note || '')) return res.json({ ok: true, note, doiKhong: false });

    const luc = new Date().toISOString();
    db.update('thuchup_ghinhanh', r.id, { note });
    const cu = db.first('thuchup_sua', 'SELECT * FROM thuchup_sua WHERE ghiId = ?', [r.id]);
    if (cu) db.run('UPDATE thuchup_sua SET soLan = soLan + 1, suaLuc = ? WHERE ghiId = ?', [luc, r.id]);
    else db.insert('thuchup_sua', { ghiId: r.id, soLan: 1, suaLuc: luc });
    // Nhật ký KHÔNG ghi nội dung, cùng nếp Đ152: nó không phải chỗ để lời của
    // cô về một đứa trẻ nằm lần thứ hai.
    db.audit(req.user.id, 'thuchup-sua-chu', r.studentId, { id: r.id });
    res.json({ ok: true, note, doiKhong: true, suaLuc: luc });
  });

  // Xoá một bản Ghi nhanh ghi nhầm.
  //
  // Ghi nhanh là ghi chép THÔ của cô — lớp 1 của bảng ba lớp trong CLAUDE.md.
  // Nháp dở dang được phép tồn tại, nhưng nháp SAI BÉ thì không: nó nằm trong
  // danh sách của một đứa trẻ khác, và nếu có ảnh thì là ảnh của đứa trẻ khác.
  //
  // Chỉ chính cô đã ghi hoặc văn phòng xoá được — cùng luật với `doDuocBanGhi`
  // đang canh đường xem ảnh. Và ảnh phải được dọn cùng, nếu không thì tấm ảnh
  // khuôn mặt trẻ vẫn nằm trên ổ đĩa sau khi bản ghi đã biến mất.
  app.delete('/api/thuchup/:id', requireRole('teacher', 'admin'), (req, res) => {
    const r = db.first('thuchup_ghinhanh',
      'SELECT * FROM thuchup_ghinhanh WHERE id = ?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy bản ghi này' });
    if (!db.canAccessStudent(req.user, r.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xoá bản ghi của bé này' });
    }
    if (!doDuocBanGhi(req.user, r)) {
      return res.status(403).json({ error: 'Đây là ghi chép riêng của cô khác' });
    }
    if (r.file) { try { uploads.remove(r.file); } catch (_) {} }
    db.run('DELETE FROM thuchup_ghinhanh WHERE id = ?', [r.id]);
    db.audit(req.user.id, 'thuchup-xoa', r.studentId, { id: r.id });
    res.json({ ok: true });
  });

  // Số liệu của phép thử: bao nhiêu lần ghi, nhanh nhất/chậm nhất bao lâu.
  // Đây chính là bằng chứng để quyết định đi tiếp hay dừng lại bàn.
  app.get('/api/thuchup/ket-qua', requireRole('teacher', 'admin'), (req, res) => {
    const students = db.studentsOf(req.user);
    const ids = students.map(s => s.id);
    if (!ids.length) return res.json({ soLan: 0 });

    const marks = ids.map(() => '?').join(',');
    const cuaCo = chiCuaChinhCo(req.user);
    const rows = db.all('thuchup_ghinhanh',
      `SELECT giay, ngoaiTuyen FROM thuchup_ghinhanh
       WHERE studentId IN (${marks}) AND giay IS NOT NULL
         AND (? IS NULL OR byTeacherId = ?)`, [...ids, cuaCo, cuaCo]);
    if (!rows.length) return res.json({ soLan: 0 });

    const giay = rows.map(r => Number(r.giay)).sort((a, b) => a - b);
    const giua = giay.length % 2
      ? giay[(giay.length - 1) / 2]
      : (giay[giay.length / 2 - 1] + giay[giay.length / 2]) / 2;

    res.json({
      soLan: giay.length,
      nhanhNhat: giay[0],
      chamNhat: giay[giay.length - 1],
      trungVi: Math.round(giua * 10) / 10,
      duoi20Giay: giay.filter(g => g < 20).length,
      soLanNgoaiTuyen: rows.filter(r => r.ngoaiTuyen).length,
    });
  });
};
