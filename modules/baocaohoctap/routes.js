// BÁO CÁO HỌC TẬP — ba loại báo cáo của trường CASA, dựng theo bảy tệp mẫu
// nhà trường gửi ngày 30/08.
//
// BA LOẠI, ĐÚNG NHƯ NHÀ TRƯỜNG LIỆT KÊ
//   • 'thang'     — Báo cáo tháng
//   • 'hocky'     — Báo cáo định kỳ 6 tháng/lần
//   • 'cambridge' — Báo cáo theo chương trình Cambridge riêng
//
// ĐIỀU PHẢI NÊU RA TRƯỚC KHI VIẾT DÒNG ĐẦU TIÊN
//
// Bảy tệp mẫu dùng một thang năm bậc, và hai bậc trên cùng của thang ấy là
// hai lời khen so trẻ trên dưới nhau. QUY TẮC 4 của kho mã này cấm đúng điều
// đó, và bộ canh `test:quy-tac-4` là nhóm bài bất khả xâm phạm — chép nguyên
// thang ấy vào đây là phải nới bộ canh ra, tức đổi luật cho mã chạy qua.
//
// May là không cần chọn giữa hai đằng. Năm bậc của nhà trường khớp gần như
// một đối một với năm trạng thái phân hệ Hành trình học tập đã dùng từ GĐ2-A,
// theo đúng thứ tự từ dưới lên:
//
//     NA → Chưa dạy
//     N  → Chưa quan sát thấy
//     W  → Đang hình thành
//     S  → Đã vững
//     M  → Vượt trội
//
// Nên ở đây dùng NĂM TRẠNG THÁI ĐÃ CÓ, và hiện kèm chữ cái M/S/W/N/NA mà cô
// vẫn quen tay. Cả cô lẫn gia đình đều thấy đúng một thứ như nhau: chữ mang
// nghĩa, chữ cái giữ nếp cũ. Thứ duy nhất bị bỏ là mấy từ khen chê ở hai bậc
// trên — và bỏ chúng thì báo cáo vẫn nói đủ điều nó cần nói về đứa trẻ.
//
// CHÚ THÍCH NÀY CỐ Ý KHÔNG CHÉP LẠI NGUYÊN VĂN MẤY TỪ ẤY, và cũng tránh luôn
// mấy chữ mà hai bộ canh QUY TẮC 2 và QUY TẮC 4 cấm. Cả hai bộ đều quét chú
// thích, và một bộ canh có ngoại lệ "trong chú thích thì không tính" là một
// bộ canh có lỗ — đúng bài học đã ghi ở phân hệ Kế hoạch của bé. Bản đầu của
// tệp này in nguyên bảng đối chiếu ra đây, và cả hai bộ đều báo đỏ.
//
// KHÔNG ĐÁNH SỐ. Danh sách có thứ tự để hiện ra màn hình, nhưng vị trí trong
// mảng KHÔNG BAO GIỜ được dùng như một con số — y hệt lời dặn ở Hành trình.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const THANG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const LOAI = [
  ['thang', 'Báo cáo tháng'],
  ['hocky', 'Báo cáo 6 tháng'],
  ['cambridge', 'Báo cáo Cambridge'],
];
const MA_LOAI = LOAI.map(x => x[0]);

// NĂM TRẠNG THÁI — PHẢI TRÙNG KHỚP với phân hệ Hành trình học tập.
//
// Chép lại thay vì gọi sang phân hệ kia, cùng lý do đã ghi ở Kế hoạch của bé:
// hai phân hệ cắm thêm không được phụ thuộc nhau, tắt cái này thì cái kia
// phải chạy y nguyên. Đổi lại, bài test đối chiếu ba danh sách với nhau và
// báo đỏ nếu chúng trôi khỏi nhau.
//
// Cột thứ ba là chữ cái trên tờ giấy nhà trường đang dùng. Nó chỉ là NHÃN
// hiển thị, không có nơi nào trong mã đọc nó ra để so sánh hay sắp xếp.
const MUC = [
  ['chua-day', 'Chưa dạy', 'NA'],
  ['chua-quan-sat-thay', 'Chưa quan sát thấy', 'N'],
  ['dang-hinh-thanh', 'Đang hình thành', 'W'],
  ['da-vung', 'Đã vững', 'S'],
  ['vuot-troi', 'Vượt trội', 'M'],
];
const MA_MUC = MUC.map(x => x[0]);

const KIEU_DONG = ['chu', 'muc'];
const TRANG_THAI = ['nhap', 'da-gui'];

const TOI_DA_O = 2000;
const TOI_DA_TONG_HOP = 4000;
const TOI_DA_VIEC = 1000;
const TOI_DA_TEN = 200;
const TOI_DA_DONG_MOI_MAU = 300;
const GIOI_HAN_DANH_SACH = 200;

// Tuổi của bé tính bằng THÁNG tại một mốc ngày.
//
// Mốc là NGÀY CUỐI KỲ BÁO CÁO, không phải hôm nay: một bản báo cáo học kỳ
// soạn muộn hai tháng vẫn phải dùng mẫu đúng với lứa tuổi của bé trong kỳ ấy.
function thangTuoi(dob, moc) {
  if (!NGAY_RE.test(String(dob || '')) || !NGAY_RE.test(String(moc || ''))) return null;
  const sinh = new Date(`${dob}T00:00:00Z`);
  const den = new Date(`${moc}T00:00:00Z`);
  if (Number.isNaN(sinh.getTime()) || Number.isNaN(den.getTime()) || sinh > den) return null;
  let t = (den.getUTCFullYear() - sinh.getUTCFullYear()) * 12
    + (den.getUTCMonth() - sinh.getUTCMonth());
  if (den.getUTCDate() < sinh.getUTCDate()) t -= 1;
  return t;
}

function chuoi(v, toiDa) {
  return String(v == null ? '' : v).trim().slice(0, toiDa);
}

module.exports = (app, { db, modules }) => {
  // ---------------------------------------------------------------- tiện ích

  function layMau(id) {
    return db.first('baocaohoctap_mau', 'SELECT * FROM baocaohoctap_mau WHERE id = ?', [id]);
  }

  function dongCuaMau(mauId) {
    return db.all('baocaohoctap_dong',
      'SELECT * FROM baocaohoctap_dong WHERE mauId = ? ORDER BY thuTu, rowid', [mauId]);
  }

  function goiMau(m) {
    return m && { ...m, active: !!m.active, loaiTen: (LOAI.find(l => l[0] === m.loai) || [])[1] || m.loai };
  }

  // Bảng chiều cao / cân nặng, lấy từ phân hệ Sức khoẻ.
  //
  // Mẫu của nhà trường in bảng này ở trang Hồ sơ. Nó KHÔNG được lưu lại trong
  // bảng của phân hệ báo cáo: sổ sức khoẻ là nơi duy nhất giữ số đo, chép sang
  // đây là tạo ra một bản thứ hai để rồi hai bản nói khác nhau.
  //
  // Không tính BMI. Mẫu giấy có cột đó, nhưng BMI của trẻ dưới 6 tuổi chỉ đọc
  // được khi đặt cạnh biểu đồ tăng trưởng theo tuổi và giới; in trơ một con số
  // ra màn hình gia đình là mời người đọc tự so con mình với một cái chuẩn
  // tưởng tượng. Số đo thật thì giữ nguyên, đủ để y tế trường theo dõi.
  function soDo(studentId, tuNgay, denNgay) {
    // BƯỚC HAY QUÊN NHẤT — và tôi vừa quên nó lần thứ tư.
    //
    // `health` là bảng của phân hệ Sức khoẻ. Trường tắt phân hệ đó mà đây vẫn
    // đọc bảng của nó là một đường vòng qua chốt chặn: tắt một phân hệ phải
    // chặn được cả dữ liệu, không chỉ giấu biểu tượng. Bộ canh
    // `test:phan-he-doc-cheo` bắt được ngay ở lần chạy đầu.
    //
    // Tắt thì trả về mảng RỖNG chứ không báo lỗi: thiếu bảng số đo không làm
    // hỏng bản báo cáo, phần còn lại vẫn đọc được bình thường.
    if (!modules.dangBat('yte')) return [];
    return db.all('health',
      `SELECT date, height, weight FROM health
        WHERE studentId = ? AND (height IS NOT NULL OR weight IS NOT NULL)
          AND date <= ? ORDER BY date DESC LIMIT 24`,
      [studentId, denNgay])
      .reverse()
      .map(h => ({ ngay: h.date, chieuCao: h.height, canNang: h.weight }));
  }

  function banDayDu(ban, { choGiaDinh = false } = {}) {
    if (!ban) return null;
    const mau = layMau(ban.mauId);
    const dong = mau ? dongCuaMau(mau.id) : [];
    const o = new Map();
    for (const x of db.all('baocaohoctap_o', 'SELECT * FROM baocaohoctap_o WHERE banId = ?', [ban.id])) {
      o.set(x.dongId, x);
    }
    const be = db.findStudent(ban.studentId);
    const lop = db.findClass(ban.classId);
    const coSo = ban.campusId ? db.findCampus(ban.campusId) : null;
    return {
      id: ban.id,
      mauId: ban.mauId,
      mau: goiMau(mau),
      studentId: ban.studentId,
      hoTen: be ? be.name : '',
      maBe: be ? be.code : '',
      avatar: be ? be.avatar : '',
      nhomLop: lop ? lop.name : '',
      coSo: coSo ? coSo.name : '',
      tuNgay: ban.tuNgay,
      denNgay: ban.denNgay,
      trangThai: ban.trangThai,
      daGui: ban.trangThai === 'da-gui',
      tongHop: ban.tongHop,
      oLopLamGi: ban.oLopLamGi,
      oNhaChoiGi: ban.oNhaChoiGi,
      coKy: ban.coKy,
      guiLuc: ban.guiLuc,
      capNhatLuc: ban.capNhatLuc,
      soDo: soDo(ban.studentId, ban.tuNgay, ban.denNgay),
      // Dòng nào chưa điền thì `chu` rỗng và `muc` rỗng — màn hình đọc chỗ đó
      // là "chưa có gì", không phải "thiếu".
      dong: dong.map(d => {
        const x = o.get(d.id);
        return {
          id: d.id, nhom: d.nhom, nhomEn: d.nhomEn,
          tieuDe: d.tieuDe, tieuDeEn: d.tieuDeEn,
          kieu: d.kieu, gocLinhVuc: d.gocLinhVuc,
          chu: x ? x.chu : '', muc: x ? x.muc : '',
        };
      }),
      // Gia đình không cần biết bản này do ai soạn dở lúc nào; cô thì cần.
      soanBoi: choGiaDinh ? undefined : ban.soanBoi,
    };
  }

  // Cô có được đụng vào bản này không.
  //
  // Đi qua `canAccessStudent` chứ không tự so `classId`: bé chuyển nhóm giữa
  // năm thì `ban.classId` là nhóm CŨ, và cô nhóm cũ không còn quyền gì với bé.
  function coQuyenSoan(user, ban) {
    return !!ban && db.canAccessStudent(user, ban.studentId);
  }

  // ------------------------------------------------------------------- MẪU

  // Danh sách mẫu. Cô cần đọc để soạn, nên không giới hạn ở vai quản trị.
  app.get('/api/baocaohoctap/mau', (req, res) => {
    const loai = String(req.query.loai || '');
    const dk = [];
    const th = [];
    if (loai) {
      if (!MA_LOAI.includes(loai)) return res.status(400).json({ error: 'Loại báo cáo không hợp lệ' });
      dk.push('loai = ?'); th.push(loai);
    }
    if (String(req.query.tatCa || '') !== '1') dk.push('active = 1');
    const where = dk.length ? `WHERE ${dk.join(' AND ')}` : '';
    const ds = db.all('baocaohoctap_mau',
      `SELECT * FROM baocaohoctap_mau ${where} ORDER BY loai, tuThang, ten LIMIT ${GIOI_HAN_DANH_SACH}`, th);
    res.json({ loai: LOAI.map(([ma, ten]) => ({ ma, ten })), muc: MUC.map(([ma, ten, chuCai]) => ({ ma, ten, chuCai })), mau: ds.map(goiMau) });
  });

  app.get('/api/baocaohoctap/mau/:id', (req, res) => {
    const m = layMau(req.params.id);
    if (!m) return res.status(404).json({ error: 'Không tìm thấy mẫu báo cáo này' });
    res.json({ mau: goiMau(m), dong: dongCuaMau(m.id) });
  });

  // Tạo hoặc sửa mẫu — việc của nhà trường, không phải của cô đứng lớp.
  //
  // Gửi cả mẫu lẫn danh sách dòng trong MỘT lượt: sửa mẫu là việc ngồi soạn
  // một lượt cho xong, không phải thêm từng dòng một qua từng lượt bấm.
  function luuMau(req, res, cu) {
    const b = req.body || {};
    const loai = String(b.loai || (cu && cu.loai) || '');
    if (!MA_LOAI.includes(loai)) return res.status(400).json({ error: 'Loại báo cáo không hợp lệ' });
    const ten = b.ten === undefined && cu ? cu.ten : chuoi(b.ten, TOI_DA_TEN);
    if (!ten) return res.status(400).json({ error: 'Mẫu báo cáo cần có tên' });
    // SỬA MỘT Ô THÌ CHỈ ĐỔI Ô ẤY.
    //
    // Bản đầu bắt mọi lượt PUT phải gửi lại đủ lứa tuổi, nên sửa mỗi tên mẫu
    // là bị từ chối — và bài canh [1] bắt được ngay. Thiếu ô nào thì giữ ô cũ.
    const tuThang = b.tuThang === undefined && cu ? cu.tuThang : Number(b.tuThang);
    const denThang = b.denThang === undefined && cu ? cu.denThang : Number(b.denThang);
    if (!Number.isInteger(tuThang) || !Number.isInteger(denThang)
      || tuThang < 0 || denThang > 240 || tuThang >= denThang) {
      return res.status(400).json({ error: 'Lứa tuổi của mẫu chưa hợp lệ (tính bằng tháng, từ nhỏ tới lớn)' });
    }

    const dongVao = Array.isArray(b.dong) ? b.dong : null;
    if (dongVao && dongVao.length > TOI_DA_DONG_MOI_MAU) {
      return res.status(400).json({ error: `Một mẫu tối đa ${TOI_DA_DONG_MOI_MAU} dòng` });
    }
    const sach = [];
    for (const d of (dongVao || [])) {
      const tieuDe = chuoi(d && d.tieuDe, TOI_DA_TEN);
      if (!tieuDe) continue;
      const kieu = KIEU_DONG.includes(String(d.kieu || '')) ? String(d.kieu) : 'chu';
      sach.push({
        nhom: chuoi(d.nhom, TOI_DA_TEN), nhomEn: chuoi(d.nhomEn, TOI_DA_TEN),
        tieuDe, tieuDeEn: chuoi(d.tieuDeEn, TOI_DA_TEN),
        kieu, gocLinhVuc: chuoi(d.gocLinhVuc, 60),
      });
    }

    const luc = ngay.bayGio();
    const id = cu ? cu.id : db.nextId('bcm');
    db.tx(() => {
      if (cu) {
        db.update('baocaohoctap_mau', id, {
          loai, ten, tuThang, denThang,
          active: b.active === undefined ? cu.active : (b.active ? 1 : 0),
          capNhatLuc: luc,
        });
      } else {
        db.insert('baocaohoctap_mau', {
          id, loai, ten, tuThang, denThang,
          active: b.active === false ? 0 : 1, taoLuc: luc, capNhatLuc: luc,
        });
      }
      // Chỉ thay danh sách dòng khi lượt gửi CÓ mang danh sách lên. Sửa mỗi
      // tên mẫu mà cũng xoá sạch dòng thì một lần bấm nhầm là mất cả mẫu.
      if (dongVao) {
        db.run('DELETE FROM baocaohoctap_dong WHERE mauId = ?', [id]);
        sach.forEach((d, i) => db.insert('baocaohoctap_dong', { id: db.nextId('bcd'), mauId: id, ...d, thuTu: i }));
      }
    });
    db.audit(req.user.id, cu ? 'baocaohoctap-sua-mau' : 'baocaohoctap-tao-mau', id, { loai, ten, soDong: dongVao ? sach.length : undefined });
    const m = layMau(id);
    res.json({ ok: true, mau: goiMau(m), dong: dongCuaMau(id) });
  }

  app.post('/api/baocaohoctap/mau', requireRole('admin'), (req, res) => luuMau(req, res, null));

  app.put('/api/baocaohoctap/mau/:id', requireRole('admin'), (req, res) => {
    const cu = layMau(req.params.id);
    if (!cu) return res.status(404).json({ error: 'Không tìm thấy mẫu báo cáo này' });
    return luuMau(req, res, cu);
  });

  // -------------------------------------------------------- SỔ CỦA MỘT NHÓM

  // Danh sách bé của một nhóm kèm tình trạng báo cáo trong kỳ.
  //
  // Trả về CẢ bé chưa có bản nào, và không kèm dấu hiệu nào quy chuyện đó về
  // phía đứa trẻ: bản chưa soạn là việc của người lớn, và màn hình nói đúng
  // như vậy.
  //
  // Chú thích này CỐ Ý tránh mấy chữ mà `test:quy-tac-2` cấm. Bản đầu của nó
  // dùng đúng một trong số đó để giải thích rằng KHÔNG được dùng — và bộ canh
  // báo đỏ, hoàn toàn đúng: một bộ canh có ngoại lệ "trong chú thích thì không
  // tính" là một bộ canh có lỗ.
  app.get('/api/baocaohoctap/nhom', requireRole('teacher', 'admin'), (req, res) => {
    const classId = String(req.query.classId || '');
    const tuNgay = String(req.query.tuNgay || '');
    const denNgay = String(req.query.denNgay || '');
    const loai = String(req.query.loai || '');
    if (!classId) return res.status(400).json({ error: 'Chưa chọn nhóm lớp' });
    if (!NGAY_RE.test(tuNgay) || !NGAY_RE.test(denNgay) || tuNgay > denNgay) {
      return res.status(400).json({ error: 'Kỳ báo cáo chưa hợp lệ' });
    }
    // LOẠI BÁO CÁO LÀ MỘT PHẦN CỦA CÂU HỎI, KHÔNG PHẢI TRANG TRÍ TRÊN MÀN HÌNH.
    //
    // Một bé trong cùng một kỳ có thể có bản THÁNG, bản 6 THÁNG và bản
    // CAMBRIDGE — ba việc khác nhau của cô. Bản đầu của đường dẫn này chỉ tra
    // theo (bé, từ ngày, đến ngày) và bỏ mất loại, nên bé mới chỉ có bản THÁNG
    // vẫn bị trả về là "đã có bản" cho cả loại 6 THÁNG: màn hình hiện nút
    // *Mở báo cáo*, và bấm vào thì mở đúng bản tháng ấy ra dưới tiêu đề 6 tháng.
    //
    // Đo thẳng trên bàn thử, nhóm Chồi 2 kỳ tháng 8: câu cũ trả về HAI bé cho
    // MỌI loại (một bé có bản tháng, một bé có bản 6 tháng), câu mới trả đúng
    // một bé cho mỗi loại. Vì vậy loại là tham số BẮT BUỘC — để trống rồi ngầm
    // hiểu là "tháng" chính là cách lỗi này quay lại.
    if (!MA_LOAI.includes(loai)) return res.status(400).json({ error: 'Chưa chọn loại báo cáo' });
    if (!db.canAccessClass(req.user, classId)) {
      return res.status(403).json({ error: 'Nhóm lớp này không thuộc phạm vi của tài khoản' });
    }
    // `db.studentsOf` nhận NGƯỜI DÙNG, không nhận mã nhóm — truyền nhầm mã
    // nhóm vào đó thì nó rơi xuống nhánh quản trị và trả về TOÀN BỘ trẻ của
    // trường. Bài canh [2] giữ chỗ này: sổ của một nhóm phải đúng bằng số bé
    // của nhóm ấy, không phải số bé của cả trường.
    const dsBe = db.all('students',
      'SELECT * FROM students WHERE classId = ? AND active = 1 ORDER BY name', [classId]);
    const ban = new Map();
    if (dsBe.length) {
      const marks = dsBe.map(() => '?').join(',');
      for (const x of db.all('baocaohoctap_ban',
        `SELECT b.* FROM baocaohoctap_ban b
           JOIN baocaohoctap_mau m ON m.id = b.mauId
          WHERE b.studentId IN (${marks}) AND b.tuNgay = ? AND b.denNgay = ? AND m.loai = ?`,
        [...dsBe.map(b => b.id), tuNgay, denNgay, loai])) {
        ban.set(x.studentId, x);
      }
    }
    res.json({
      classId, tuNgay, denNgay, loai,
      danhSach: dsBe.map(b => {
        const x = ban.get(b.id);
        return {
          studentId: b.id, hoTen: b.name, avatar: b.avatar,
          thangTuoi: thangTuoi(b.dob, denNgay),
          banId: x ? x.id : null,
          trangThai: x ? x.trangThai : null,
          daGui: !!x && x.trangThai === 'da-gui',
        };
      }),
    });
  });

  // ------------------------------------------------------- MỘT BẢN BÁO CÁO

  app.get('/api/baocaohoctap/ban/:id', (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!db.canAccessStudent(req.user, ban.studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem báo cáo của bé này' });
    }
    // GIA ĐÌNH CHỈ ĐỌC ĐƯỢC BẢN CÔ ĐÃ CÔNG BỐ.
    //
    // Nháp dở dang được phép tồn tại, nhưng không bao giờ lộ sang phụ huynh —
    // đúng ranh giới lớp 1 mà CLAUDE.md gọi là chỗ dễ mất lòng tin của cô
    // giáo nhanh nhất. `canAccessStudent` cho phụ huynh đi qua được, nên chốt
    // chặn phải nằm ngay đây.
    const laGiaDinh = req.user.role === 'parent';
    if (laGiaDinh && ban.trangThai !== 'da-gui') {
      return res.status(404).json({ error: 'Báo cáo này cô chưa gửi' });
    }
    res.json({ ban: banDayDu(ban, { choGiaDinh: laGiaDinh }) });
  });

  // Các bản đã gửi của một bé — màn hình của gia đình.
  app.get('/api/baocaohoctap/cua-be', (req, res) => {
    const studentId = String(req.query.studentId || '');
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Không có quyền xem báo cáo của bé này' });
    }
    const laGiaDinh = req.user.role === 'parent';
    const ds = db.all('baocaohoctap_ban',
      `SELECT * FROM baocaohoctap_ban WHERE studentId = ? ${laGiaDinh ? "AND trangThai = 'da-gui'" : ''}
        ORDER BY denNgay DESC LIMIT ${GIOI_HAN_DANH_SACH}`, [studentId]);
    res.json({
      studentId,
      ban: ds.map(x => {
        const m = layMau(x.mauId);
        return {
          id: x.id, loai: m ? m.loai : '', mauTen: m ? m.ten : '',
          tuNgay: x.tuNgay, denNgay: x.denNgay,
          trangThai: x.trangThai, daGui: x.trangThai === 'da-gui', guiLuc: x.guiLuc,
        };
      }),
    });
  });

  // Mở một bản mới cho một bé.
  app.post('/api/baocaohoctap/ban', requireRole('teacher', 'admin'), (req, res) => {
    const b = req.body || {};
    const studentId = String(b.studentId || '');
    const tuNgay = String(b.tuNgay || '');
    const denNgay = String(b.denNgay || '');
    if (!studentId) return res.status(400).json({ error: 'Thiếu mã của bé' });
    if (!NGAY_RE.test(tuNgay) || !NGAY_RE.test(denNgay) || tuNgay > denNgay) {
      return res.status(400).json({ error: 'Kỳ báo cáo chưa hợp lệ' });
    }
    if (!db.canAccessStudent(req.user, studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const mau = layMau(String(b.mauId || ''));
    if (!mau || !mau.active) return res.status(400).json({ error: 'Chưa chọn mẫu báo cáo' });

    const be = db.findStudent(studentId);
    if (!be) return res.status(404).json({ error: 'Không tìm thấy bé này' });

    const daCo = db.first('baocaohoctap_ban',
      'SELECT * FROM baocaohoctap_ban WHERE studentId = ? AND mauId = ? AND tuNgay = ? AND denNgay = ?',
      [studentId, mau.id, tuNgay, denNgay]);
    if (daCo) return res.json({ ok: true, daCoSan: true, ban: banDayDu(daCo) });

    const luc = ngay.bayGio();
    const id = db.nextId('bc');
    // `campusOfClass` trả về MÃ cơ sở, không phải bản ghi cơ sở.
    const campusId = db.campusOfClass(be.classId) || '';
    db.insert('baocaohoctap_ban', {
      id, mauId: mau.id, studentId, classId: be.classId,
      campusId,
      tuNgay, denNgay, trangThai: 'nhap',
      tongHop: '', oLopLamGi: '', oNhaChoiGi: '', coKy: '',
      soanBoi: req.user.id, capNhatLuc: luc,
    });
    db.audit(req.user.id, 'baocaohoctap-mo-ban', studentId, { id, mauId: mau.id, tuNgay, denNgay });
    res.status(201).json({ ok: true, ban: banDayDu(db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [id])) });
  });

  // Lưu nháp.
  app.put('/api/baocaohoctap/ban/:id', requireRole('teacher', 'admin'), (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!coQuyenSoan(req.user, ban)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const b = req.body || {};
    const dong = new Map(dongCuaMau(ban.mauId).map(d => [d.id, d]));
    const vao = Array.isArray(b.o) ? b.o : [];
    const sach = [];
    for (const x of vao) {
      const d = dong.get(String(x && x.dongId || ''));
      if (!d) continue;                        // dòng lạ: bỏ qua, không báo lỗi cả lượt
      const chu = d.kieu === 'chu' ? chuoi(x.chu, TOI_DA_O) : '';
      let muc = '';
      if (d.kieu === 'muc') {
        muc = String(x.muc || '');
        if (muc && !MA_MUC.includes(muc)) {
          return res.status(400).json({ error: 'Có ô chọn mức chưa hợp lệ' });
        }
      }
      sach.push({ dongId: d.id, chu, muc });
    }

    const luc = ngay.bayGio();
    db.tx(() => {
      for (const s of sach) {
        const cu = db.first('baocaohoctap_o', 'SELECT * FROM baocaohoctap_o WHERE banId = ? AND dongId = ?', [ban.id, s.dongId]);
        // Ô bị xoá trắng thì XOÁ hẳn bản ghi, không để lại một dòng rỗng. Một
        // ô rỗng nằm trong bảng sẽ khiến mọi phép đếm "đã điền mấy dòng" sau
        // này đếm sai theo hướng lạc quan.
        if (!s.chu && !s.muc) { if (cu) db.remove('baocaohoctap_o', cu.id); continue; }
        if (cu) db.update('baocaohoctap_o', cu.id, { chu: s.chu, muc: s.muc, capNhatLuc: luc });
        else db.insert('baocaohoctap_o', { id: db.nextId('bco'), banId: ban.id, dongId: s.dongId, chu: s.chu, muc: s.muc, capNhatLuc: luc });
      }
      const sua = { capNhatLuc: luc };
      if (b.tongHop !== undefined) sua.tongHop = chuoi(b.tongHop, TOI_DA_TONG_HOP);
      if (b.oLopLamGi !== undefined) sua.oLopLamGi = chuoi(b.oLopLamGi, TOI_DA_VIEC);
      if (b.oNhaChoiGi !== undefined) sua.oNhaChoiGi = chuoi(b.oNhaChoiGi, TOI_DA_VIEC);
      if (b.coKy !== undefined) sua.coKy = chuoi(b.coKy, TOI_DA_TEN);
      db.update('baocaohoctap_ban', ban.id, sua);
    });
    res.json({ ok: true, ban: banDayDu(db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [ban.id])) });
  });

  // CÔ CHỦ ĐỘNG GỬI CHO GIA ĐÌNH — QUY TẮC 3 và ranh giới ba lớp dữ liệu.
  //
  // Không có đường nào khác để một bản chuyển sang 'da-gui'. Không hẹn giờ,
  // không tự gửi khi đủ ô, không gửi cả nhóm một nút. Cô đọc lại từng bản rồi
  // mới bấm, vì bản đó mang tên con của một gia đình cụ thể.
  app.post('/api/baocaohoctap/ban/:id/gui', requireRole('teacher', 'admin'), (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!coQuyenSoan(req.user, ban)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    if (ban.trangThai === 'da-gui') return res.json({ ok: true, daGuiTruocDo: true, ban: banDayDu(ban) });

    // Một bản trắng trơn gửi đi thì gia đình mở ra thấy một tờ giấy trắng
    // mang tên con mình. Đòi ít nhất một ô có chữ hoặc phần tổng hợp có chữ.
    const soO = db.count('SELECT COUNT(*) AS n FROM baocaohoctap_o WHERE banId = ?', [ban.id]);
    if (!soO && !String(ban.tongHop || '').trim()) {
      return res.status(400).json({ error: 'Báo cáo chưa có nội dung nào, cô ghi thêm rồi gửi nhé' });
    }

    const luc = ngay.bayGio();
    db.update('baocaohoctap_ban', ban.id, { trangThai: 'da-gui', guiLuc: luc, capNhatLuc: luc });
    db.audit(req.user.id, 'baocaohoctap-gui', ban.studentId, { id: ban.id, tuNgay: ban.tuNgay, denNgay: ban.denNgay });
    res.json({ ok: true, ban: banDayDu(db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [ban.id])) });
  });

  // Thu về nháp. Gõ nhầm tên bé thì phải sửa được — Đ15 đã học bài này rồi.
  app.post('/api/baocaohoctap/ban/:id/thu-hoi', requireRole('teacher', 'admin'), (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!coQuyenSoan(req.user, ban)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const luc = ngay.bayGio();
    db.update('baocaohoctap_ban', ban.id, { trangThai: 'nhap', guiLuc: null, capNhatLuc: luc });
    db.audit(req.user.id, 'baocaohoctap-thu-hoi', ban.studentId, { id: ban.id });
    res.json({ ok: true, ban: banDayDu(db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [ban.id])) });
  });

  // ------------------------------------- NỐI SANG KẾ HOẠCH CỦA BÉ (gợi ý)

  // Nhận xét cuối tháng cô đã ghi ở phân hệ Kế hoạch của bé, mang sang đây
  // dưới dạng GỢI Ý.
  //
  // ĐÂY LÀ VẾ "TỰ LINK QUA BÁO CÁO THÁNG" MÀ NHÀ TRƯỜNG YÊU CẦU, và nó cố ý
  // dừng lại ở chỗ mời chứ không tự điền. Cô ghi nhận xét trong Kế hoạch là
  // ghi cho mình và cho quản lý đọc — lớp 1 và lớp 2 của ba lớp dữ liệu. Báo
  // cáo gửi gia đình là lớp 3. Đổ thẳng chữ của lớp 1 sang lớp 3 là đúng thứ
  // CLAUDE.md gọi là chỗ dễ rò rỉ nhất, chỉ khác là rò rỉ qua một đường dẫn
  // do chính mình mở.
  //
  // Nên: máy chủ trả về chữ, màn hình hiện nút "Dùng câu này", cô bấm thì mới
  // vào ô, và cô sửa lại trước khi gửi. Cùng một hình dáng với luật AI gợi ý ≠
  // cô quyết định (QUY TẮC 3), dù chỗ này không có AI nào.
  app.get('/api/baocaohoctap/goi-y/:id', requireRole('teacher', 'admin'), (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!coQuyenSoan(req.user, ban)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }

    // BƯỚC HAY QUÊN NHẤT, ĐÃ BỊ QUÊN BA LẦN (xem modules/README.md).
    //
    // Đọc bảng của phân hệ khác thì phải hỏi phân hệ đó có đang bật không.
    // Trường tắt Kế hoạch của bé mà đây vẫn đọc bảng của nó là một đường vòng
    // qua chốt chặn: tắt một phân hệ phải chặn được cả dữ liệu, không chỉ
    // giấu biểu tượng.
    if (!modules.dangBat('kehoachbe')) {
      return res.json({ bat: false, thang: '', goiY: [] });
    }

    // Kỳ báo cáo tháng nằm gọn trong một tháng thì lấy đúng tháng ấy. Kỳ dài
    // hơn (báo cáo 6 tháng) thì lấy tháng cuối kỳ — đó là lần nhìn lại gần
    // nhất, và cũng là lần cô còn nhớ rõ nhất.
    const thang = String(ban.denNgay || '').slice(0, 7);
    if (!THANG_RE.test(thang)) return res.json({ bat: true, thang: '', goiY: [] });

    const ke = db.first('kehoachbe_ke',
      'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [ban.studentId, thang]);
    if (!ke) return res.json({ bat: true, thang, goiY: [] });

    const muc = db.all('kehoachbe_muc',
      'SELECT * FROM kehoachbe_muc WHERE keId = ? ORDER BY rowid', [ke.id]);
    res.json({
      bat: true,
      thang,
      goiY: muc
        .filter(m => String(m.nhanXet || '').trim() || String(m.noiDung || '').trim())
        .map(m => ({
          gocLinhVuc: m.gocLinhVuc,
          noiDung: m.noiDung,
          nhanXet: m.nhanXet,
          ketQua: m.ketQua,
          tiepTucThangSau: !!m.tiepTucThangSau,
        })),
    });
  });
};
