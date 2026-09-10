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
//
// ĐỢT 2 — PHẢN HỒI NHÀ TRƯỜNG 07/09, ba việc thêm vào tệp này (hai bảng phụ
// mới trong schema.sql, bảng cũ không đổi cột):
//
//   • ĐIỀN SẴN TỪ KẾ HOẠCH CỦA BÉ khi mở báo cáo THÁNG: bài đã tích theo lĩnh
//     vực và phần nhìn lại chảy vào đúng ô của mẫu — chỉ ô CÒN TRỐNG, chỉ vào
//     BẢN NHÁP, và cô sửa được. Chữ ấy chưa tới gia đình: còn cô đọc lại, còn
//     quản lý duyệt. Đường "mời chữ" cũ vẫn giữ cho phần tổng hợp.
//   • QUY TRÌNH DUYỆT: cô gửi → quản lý cơ sở duyệt và chọn NGÀY CÔNG BỐ →
//     gia đình chỉ thấy khi tới ngày ấy, và được báo đúng một lần.
//   • KHOÁ Ô THEO CÔ: nhiều cô một nhóm, ô cô A ghi lần đầu thì cô B không
//     sửa hay xoá được; quản lý cơ sở mở khoá.
const { requireRole } = require('../../lib/auth');
const ngay = require('../../lib/ngay');
const st = require('../../lib/sua-thu-hoi');
const tbb = require('../../lib/thong-bao-be');
const henGio = require('../../lib/hen-gio');
const huyHieu = require('../../lib/huy-hieu');
const baoNT = require('../../lib/bao-nha-truong');

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

// Ba mức nghĩa là CÔ ĐÃ THẤY BÉ LÀM. Hai mức còn lại ('chua-day',
// 'chua-quan-sat-thay') thì chưa có gì để hành động.
//
// Danh sách này chép cùng nội dung với `DA_QUAN_SAT_THAY` của phân hệ Hành
// trình, và CỐ Ý chép chứ không require sang: hai phân hệ cắm thêm không được
// phụ thuộc nhau, tắt cái này thì cái kia phải chạy y nguyên — cùng lý do đã
// ghi ở bảng `MUC` bên trên.
const DA_QUAN_SAT_THAY = ['dang-hinh-thanh', 'da-vung', 'vuot-troi'];

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

    // SỐ ĐO ĐÃ THU HỒI THÌ KHÔNG ĐƯỢC IN VÀO BẢN GỬI GIA ĐÌNH.
    //
    // Hộp thoại thu hồi ở màn Sức khoẻ tự nêu tên đúng tình huống này: "Dùng
    // khi ghi nhầm sang bé khác". Y tế gõ nhầm số của bé khác, phát hiện, thu
    // hồi — hồ sơ sức khoẻ sạch, nhưng bản báo cáo tháng gửi gia đình vẫn in
    // con số sai cạnh tên con họ, ở đúng thứ gia đình đọc kỹ nhất và giữ lại.
    //
    // Đây là chỗ thứ hai cùng hình dạng trong một đợt soát (chỗ kia là màn
    // "Năm học trước"): một bảng thu hồi được, đọc từ NGOÀI tệp route gốc của
    // nó, và quên mất điều kiện lọc.
    return db.all('health',
      `SELECT date, height, weight FROM health
        WHERE studentId = ? AND (height IS NOT NULL OR weight IS NOT NULL)
          AND date <= ? AND ${st.dieuKienConHien('health', 'id')}
        ORDER BY date DESC LIMIT 24`,
      [studentId, denNgay])
      .reverse()
      .map(h => ({ ngay: h.date, chieuCao: h.height, canNang: h.weight }));
  }

  function tenNguoi(userId) {
    const u = userId ? db.findUser(userId) : null;
    return u ? `${u.title} ${u.name}` : '';
  }

  // ------------------------------------------------------------ DUYỆT

  function duyetCua(banId) {
    return db.first('baocaohoctap_duyet', 'SELECT * FROM baocaohoctap_duyet WHERE banId = ?', [banId]) || null;
  }

  // GIA ĐÌNH THẤY KHI NÀO — một chỗ quyết, mọi đường đọc hỏi chỗ này.
  //
  // Bản 'da-gui' + đã duyệt + tới ngày công bố. Bản 'da-gui' mà KHÔNG có dòng
  // duyệt là bản gửi trước khi có quy trình duyệt — gia đình đã đọc rồi, giữ
  // nguyên (Nguyên tắc số 1: dữ liệu cũ không đổi nghĩa).
  function giaDinhThay(ban, duyet = duyetCua(ban.id)) {
    if (ban.trangThai !== 'da-gui') return false;
    if (!duyet) return true;
    return duyet.trangThai === 'da-duyet' && !!duyet.ngayCongBo && duyet.ngayCongBo <= ngay.homNay();
  }

  // Một chữ cho màn hình, thay vì bắt màn hình tự ghép hai bảng.
  //   nhap · tra-lai · cho-duyet · cho-ngay (đã duyệt, chưa tới ngày) · da-cong-bo
  function buocCua(ban, duyet = duyetCua(ban.id)) {
    if (ban.trangThai !== 'da-gui') return duyet && duyet.trangThai === 'tu-choi' ? 'tra-lai' : 'nhap';
    if (!duyet) return 'da-cong-bo';
    if (duyet.trangThai !== 'da-duyet') return 'cho-duyet';
    return giaDinhThay(ban, duyet) ? 'da-cong-bo' : 'cho-ngay';
  }

  function goiDuyet(duyet) {
    if (!duyet) return null;
    return {
      ...duyet,
      nguoiGuiTen: tenNguoi(duyet.nguoiGui),
      nguoiDuyetTen: tenNguoi(duyet.nguoiDuyet),
    };
  }

  // BÁO GIA ĐÌNH ĐÚNG MỘT LẦN, KHI TỚI NGÀY CÔNG BỐ.
  //
  // Từ Đ154 chỗ phát hiện "tới ngày" CHÍNH là đồng hồ định giờ ở cuối tệp
  // này: cứ 15 phút quét một lượt, không cần ai mở màn nào. Trước đó việc báo
  // là LƯỜI — tin chỉ đi khi có người tình cờ mở một trong bốn màn có gọi hàm
  // này, nên không ai mở thì gia đình không bao giờ được báo, mà chính gia
  // đình mở thì tin đẩy tới đúng lúc họ đang nhìn vào bản báo cáo.
  //
  // Bốn lời gọi lười cũ GIỮ NGUYÊN, có chủ ý: chúng là lưới hứng cho lúc đồng
  // hồ bị tắt (`HEN_GIO_PHUT=0`) hay máy chủ vừa khởi động lại giữa chừng.
  // `daBaoLuc` chặn gửi lặp nên gọi bao nhiêu lần cũng chỉ gửi một tin;
  // `tbb.gui` không bao giờ ném lỗi.
  function baoNeuToiNgay(ban) {
    const d = duyetCua(ban.id);
    if (!d || d.daBaoLuc || !giaDinhThay(ban, d)) return false;
    const be = db.findStudent(ban.studentId);
    const mau = layMau(ban.mauId);
    const dm = (s) => `${String(s).slice(8, 10)}/${String(s).slice(5, 7)}`;
    db.update('baocaohoctap_duyet', ban.id, { daBaoLuc: new Date().toISOString() }, 'banId');
    tbb.gui({
      studentId: ban.studentId, loai: 'bao-cao', nguoiTao: d.nguoiDuyet || d.nguoiGui || null,
      tieuDe: `Báo cáo học tập của ${be ? be.name : 'con'} đã có`,
      noiDung: `${mau ? mau.ten : 'Báo cáo'} kỳ ${dm(ban.tuNgay)} – ${dm(ban.denNgay)}. Bấm để đọc.`,
      hash: '#/baocaohoctap',
    });
    return true;
  }

  // Báo người của nhà trường, không phải gia đình. Bọc lại đúng một chỗ để
  // hai điều luôn đúng: phân hệ đang TẮT thì không gửi gì, và một lỗi ở đường
  // đẩy không bao giờ làm hỏng lượt gửi báo cáo của cô.
  function baoNhaTruong(studentId, goi) {
    try {
      if (!modules.dangBat('baocaohoctap')) return 0;
      return baoNT.guiChoQuanLyCuaBe(studentId, goi);
    } catch (_) { return 0; }
  }

  // ------------------------------------------------------------ KHOÁ Ô

  function khoaCua(oId) {
    return db.first('baocaohoctap_o_khoa', 'SELECT * FROM baocaohoctap_o_khoa WHERE oId = ?', [oId]) || null;
  }
  function dangKhoa(khoa) { return !!khoa && !khoa.moKhoaLuc; }

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
    const duyet = duyetCua(ban.id);
    return {
      buoc: buocCua(ban, duyet),
      giaDinhThay: giaDinhThay(ban, duyet),
      // Gia đình không cần biết ai gửi ai duyệt lúc nào; chỉ cần biết ngày.
      duyet: choGiaDinh ? (duyet ? { ngayCongBo: duyet.ngayCongBo } : null) : goiDuyet(duyet),
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
        // Khoá ô chỉ là chuyện giữa các cô — gia đình không thấy ai ghi ô nào.
        const khoa = x && !choGiaDinh ? khoaCua(x.id) : null;
        return {
          id: d.id, nhom: d.nhom, nhomEn: d.nhomEn,
          tieuDe: d.tieuDe, tieuDeEn: d.tieuDeEn,
          kieu: d.kieu, gocLinhVuc: d.gocLinhVuc,
          chu: x ? x.chu : '', muc: x ? x.muc : '',
          ...(choGiaDinh ? {} : {
            oId: x ? x.id : null,
            khoa: khoa ? { coGhi: khoa.coGhi, coGhiTen: tenNguoi(khoa.coGhi), dangKhoa: dangKhoa(khoa) } : null,
          }),
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
      //
      // VÀ GIỮ NGUYÊN `id` CỦA DÒNG CÒN NHẬN RA ĐƯỢC. Mọi Ô đã điền của mọi
      // bản báo cáo — kể cả bản ĐÃ GỬI GIA ĐÌNH — trỏ vào dòng mẫu theo
      // `dongId` (bảng baocaohoctap_o). Bản cũ xoá-tạo lại TOÀN BỘ dòng với id
      // mới, nên chỉ cần văn phòng sửa một chữ trong mẫu là mọi bản đã soạn
      // hiện ra trắng trơn: ô vẫn nằm trong bảng nhưng trỏ vào những id không
      // còn tồn tại. Nhận lại dòng cũ theo TIÊU ĐỀ (mỗi dòng cũ chỉ được nhận
      // một lần); dòng đổi hẳn tiêu đề là một tiêu chí khác — nhận id mới, các
      // ô cũ của nó thành mồ côi đúng nghĩa (tiêu chí đó không còn trong mẫu).
      //
      // Ô TIẾNG ANH (nhomEn, tieuDeEn) chỉ bị thay khi lượt gửi CÓ mang giá
      // trị: hộp thoại sửa mẫu hiện tại không chở hai cột này, nên "không gửi"
      // nghĩa là "không đụng tới" — cùng luật với luuHoSoBe. Trước bản vá, mỗi
      // lần bấm Lưu mẫu là hai cột tiếng Anh của MỌI dòng bị xoá trắng vĩnh viễn.
      if (dongVao) {
        const cuDong = cu ? dongCuaMau(id) : [];
        const daNhan = new Set();
        const timDongCu = (d) => {
          // So CẢ NHÓM lẫn tiêu đề: hai mẫu sẵn có đều mang hai dòng cùng tên
          // "Lưu ý" ở hai nhóm khác nhau. Chỉ so tiêu đề thì xoá / kéo một nhóm
          // là dòng "Lưu ý" của nhóm kia nhận nhầm id — mọi ô đã điền của bản
          // báo cáo đã gửi chạy sang tiêu chí khác, lặng lẽ.
          const i = cuDong.findIndex((o, k) => !daNhan.has(k)
            && o.tieuDe === d.tieuDe && String(o.nhom || '') === String(d.nhom || ''));
          if (i === -1) return null;
          daNhan.add(i);
          return cuDong[i];
        };
        db.run('DELETE FROM baocaohoctap_dong WHERE mauId = ?', [id]);
        sach.forEach((d, i) => {
          const dongCu = timDongCu(d);
          db.insert('baocaohoctap_dong', {
            id: dongCu ? dongCu.id : db.nextId('bcd'),
            mauId: id,
            ...d,
            nhomEn: d.nhomEn || (dongCu ? dongCu.nhomEn : ''),
            tieuDeEn: d.tieuDeEn || (dongCu ? dongCu.tieuDeEn : ''),
            thuTu: i,
          });
        });
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
        if (x) baoNeuToiNgay(x);   // tới ngày công bố thì báo gia đình (lười)
        const d = x ? duyetCua(x.id) : null;
        return {
          studentId: b.id, hoTen: b.name, avatar: b.avatar,
          thangTuoi: thangTuoi(b.dob, denNgay),
          banId: x ? x.id : null,
          trangThai: x ? x.trangThai : null,
          daGui: !!x && x.trangThai === 'da-gui',
          buoc: x ? buocCua(x, d) : null,
          ngayCongBo: d ? d.ngayCongBo : '',
          yKien: d && d.trangThai === 'tu-choi' ? d.yKien : '',
        };
      }),
    });
  });

  // BẢN ĐANG CHỜ DUYỆT — màn của quản lý cơ sở / hiệu trưởng.
  //
  // Lọc bằng `canAccessStudent` từng bản: quản lý cơ sở 1 không thấy bản của
  // cơ sở 2, dù đường này không hỏi theo nhóm.
  app.get('/api/baocaohoctap/cho-duyet', requireRole('admin'), (req, res) => {
    const ds = db.all('baocaohoctap_ban',
      `SELECT b.* FROM baocaohoctap_ban b
         JOIN baocaohoctap_duyet d ON d.banId = b.id
        WHERE b.trangThai = 'da-gui' AND d.trangThai = 'cho-duyet'
        ORDER BY d.guiLuc DESC LIMIT ${GIOI_HAN_DANH_SACH}`)
      .filter(b => db.canAccessStudent(req.user, b.studentId));
    res.json({
      danhSach: ds.map(x => {
        const be = db.findStudent(x.studentId);
        const lop = db.findClass(x.classId);
        const m = layMau(x.mauId);
        const d = duyetCua(x.id);
        return {
          banId: x.id, studentId: x.studentId, hoTen: be ? be.name : '', avatar: be ? be.avatar : '',
          nhomLop: lop ? lop.name : '', mauTen: m ? m.ten : '', loai: m ? m.loai : '',
          tuNgay: x.tuNgay, denNgay: x.denNgay,
          nguoiGuiTen: d ? tenNguoi(d.nguoiGui) : '', guiLuc: d ? d.guiLuc : null,
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
    //
    // ĐỢT 2: "công bố" = đã qua quản lý duyệt VÀ tới ngày công bố. Bản cô đã
    // gửi mà quản lý chưa duyệt, hay đã duyệt nhưng chưa tới ngày, với gia
    // đình vẫn là "chưa gửi" — cùng một câu, không lộ ra là đang ở bước nào.
    const laGiaDinh = req.user.role === 'parent';
    baoNeuToiNgay(ban);
    if (laGiaDinh && !giaDinhThay(ban)) {
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
        ORDER BY denNgay DESC LIMIT ${GIOI_HAN_DANH_SACH}`, [studentId])
      // Lọc ở TẦNG DỮ LIỆU: bản đã duyệt mà chưa tới ngày thì với gia đình là
      // chưa có, không phải "có nhưng mờ đi".
      .filter(x => !laGiaDinh || giaDinhThay(x));
    for (const x of ds) baoNeuToiNgay(x);
    res.json({
      studentId,
      ban: ds.map(x => {
        const m = layMau(x.mauId);
        const d = duyetCua(x.id);
        return {
          id: x.id, loai: m ? m.loai : '', mauTen: m ? m.ten : '',
          tuNgay: x.tuNgay, denNgay: x.denNgay,
          trangThai: x.trangThai, daGui: x.trangThai === 'da-gui', guiLuc: x.guiLuc,
          ...(laGiaDinh ? { ngayCongBo: d ? d.ngayCongBo : '' } : { buoc: buocCua(x, d), ngayCongBo: d ? d.ngayCongBo : '' }),
        };
      }),
    });
  });

  // Mở một bản mới cho một bé.
  // GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP THÌ NGƯNG GHI MỚI (Đ96, ô đồng ý ①).
  //
  // Chặn ba đường: MỞ bản mới, SỬA, và GỬI cho gia đình. Gửi cũng là một hành
  // vi mới — nó biến một bản nháp thành thứ gia đình cầm trong tay — nên nếu
  // gia đình đã nói dừng thì đừng đẩy thêm sang nữa.
  //
  // KHÔNG chặn: hai đường đọc (`cua-be`, `ban/:id`) để bản đã có vẫn xem lại
  // được, và `thu-hoi` phải LUÔN chạy — chặn nó là để một bản đã công bố kẹt
  // lại vĩnh viễn ở phía gia đình.
  function chanNeuNgungHoSo(res, studentId) {
    if (!db.beNgungHoSoHocTap(studentId)) return false;
    res.status(403).json({
      error: 'Gia đình bé này đã dừng phần hồ sơ học tập. '
        + 'Cô vẫn ghi nhật ký ngày và vẫn nhắn tin với gia đình như thường.',
    });
    return true;
  }

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
    if (chanNeuNgungHoSo(res, studentId)) return;

    const daCo = db.first('baocaohoctap_ban',
      'SELECT * FROM baocaohoctap_ban WHERE studentId = ? AND mauId = ? AND tuNgay = ? AND denNgay = ?',
      [studentId, mau.id, tuNgay, denNgay]);
    if (daCo) {
      // MỞ LẠI cũng điền sẵn: kế hoạch có thể vừa được nhìn lại sau khi bản
      // này mở lần đầu. Vẫn chỉ ô còn trống, vẫn chỉ bản nháp.
      const daDienSan = dienSanTuKeHoach(daCo, mau);
      return res.json({ ok: true, daCoSan: true, daDienSan, ban: banDayDu(daCo) });
    }

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
    const banMoi = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [id]);
    const daDienSan = dienSanTuKeHoach(banMoi, mau);
    res.status(201).json({ ok: true, daDienSan, ban: banDayDu(banMoi) });
  });

  // ĐIỀN SẴN BÁO CÁO THÁNG TỪ KẾ HOẠCH CỦA BÉ — vế "tự link" nhà trường nhắc
  // lại lần thứ hai ở phản hồi 07/09.
  //
  // Ranh giới để việc này không thành đường rò rỉ lớp 1 → lớp 3:
  //   • chỉ báo cáo loại THÁNG, chỉ bản NHÁP, chỉ ô CHỮ có khai `gocLinhVuc`,
  //     và chỉ ô CÒN TRỐNG — không bao giờ đè lên chữ cô đã gõ;
  //   • ô máy điền KHÔNG có dòng khoá (xem baocaohoctap_o_khoa): chưa cô nào
  //     ghi cả, cô nào cũng sửa được;
  //   • phần tổng hợp / hai ô việc-làm-tiếp KHÔNG điền — đó là chữ cô nói với
  //     gia đình, phải do cô viết;
  //   • chữ điền vào vẫn phải qua cô đọc lại và quản lý duyệt mới tới gia đình.
  //
  // Đọc bảng của phân hệ khác thì hỏi công tắc trước — bước hay quên nhất
  // (modules/README.md). Tắt Kế hoạch của bé thì trả về mảng rỗng, không lỗi.
  function dienSanTuKeHoach(ban, mau) {
    if (!ban || !mau || mau.loai !== 'thang' || ban.trangThai !== 'nhap') return [];
    if (!modules.dangBat('kehoachbe')) return [];
    const thang = String(ban.denNgay || '').slice(0, 7);
    if (!THANG_RE.test(thang)) return [];
    const ke = db.first('kehoachbe_ke',
      'SELECT * FROM kehoachbe_ke WHERE studentId = ? AND thang = ?', [ban.studentId, thang]);
    if (!ke) return [];

    const bai = db.all('kehoachbe_muc_bai',
      `SELECT mb.*, b.ten AS ten, b.gocLinhVuc AS gocLinhVuc
         FROM kehoachbe_muc_bai mb LEFT JOIN kehoachbe_baihoc b ON b.id = mb.baiHocId
        WHERE mb.keId = ? ORDER BY mb.rowid`, [ke.id]).filter(m => m.ten);
    const muc = db.all('kehoachbe_muc', 'SELECT * FROM kehoachbe_muc WHERE keId = ? ORDER BY rowid', [ke.id]);
    if (!bai.length && !muc.length) return [];

    const NHAN = { 'hoc-moi': 'học mới', 'on-tap': 'ôn tập', 'mo-rong': 'mở rộng' };
    const daCo = new Set(db.all('baocaohoctap_o',
      'SELECT dongId FROM baocaohoctap_o WHERE banId = ?', [ban.id]).map(x => x.dongId));
    const luc = ngay.bayGio();
    const daDien = [];
    db.tx(() => {
      for (const d of dongCuaMau(mau.id)) {
        if (d.kieu !== 'chu' || !d.gocLinhVuc || daCo.has(d.id)) continue;
        const bg = bai.filter(m => m.gocLinhVuc === d.gocLinhVuc);
        const mg = muc.filter(m => m.gocLinhVuc === d.gocLinhVuc);
        const dong = [];
        if (bg.length) dong.push(`Bài học tháng này: ${bg.map(m => `${m.ten} (${NHAN[m.nhan] || m.nhan})`).join(', ')}`);
        const daThay = bg.filter(m => m.ketQua === 'da-thay');
        const tiepTuc = bg.filter(m => m.ketQua === 'tiep-tuc');
        if (daThay.length) dong.push(`Đã thấy con làm được: ${daThay.map(m => m.ten).join(', ')}`);
        if (tiepTuc.length) dong.push(`Tiếp tục cùng con: ${tiepTuc.map(m => m.ten).join(', ')}`);
        for (const m of bg) if (String(m.nhanXet || '').trim()) dong.push(`${m.ten}: ${m.nhanXet.trim()}`);
        for (const m of mg) {
          const nd = String(m.noiDung || '').trim();
          const nx = String(m.nhanXet || '').trim();
          if (nd || nx) dong.push([nd, nx].filter(Boolean).join(' — '));
        }
        if (!dong.length) continue;
        db.insert('baocaohoctap_o', {
          id: db.nextId('bco'), banId: ban.id, dongId: d.id,
          chu: dong.join('\n').slice(0, TOI_DA_O), muc: '', capNhatLuc: luc,
        });
        daDien.push(d.id);
      }
      if (daDien.length) db.update('baocaohoctap_ban', ban.id, { capNhatLuc: luc });
    });
    return daDien;
  }

  // Lưu nháp.
  app.put('/api/baocaohoctap/ban/:id', requireRole('teacher', 'admin'), (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!coQuyenSoan(req.user, ban)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    if (chanNeuNgungHoSo(res, ban.studentId)) return;
    // BẢN ĐÃ GỬI GIA ĐÌNH THÌ KHÔNG SỬA THẲNG ĐƯỢC — thu hồi trước đã.
    //
    // Đường /gui đứng sau đủ thứ kiểm tra và ghi audit; để đường lưu-nháp này
    // sửa được bản 'da-gui' là mọi kiểm tra đó thành vô nghĩa: nội dung gia
    // đình đang đọc đổi âm thầm, không vết, không ai hay. Đường /thu-hoi ngay
    // dưới có sẵn cho đúng việc này.
    if (ban.trangThai === 'da-gui') {
      return res.status(400).json({
        error: 'Bản này đã gửi cho gia đình. Cô bấm "Thu về nháp để sửa" trước — sửa xong gửi lại là gia đình thấy bản mới.',
      });
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

    // KHOÁ Ô THEO CÔ — kiểm HẾT trước khi ghi dòng nào.
    //
    // Nhiều cô một nhóm (thay đổi nền lớn nhất của app 2), và một bản báo cáo
    // là chỗ hai cô cùng mở. Luật: ô do cô A ghi LẦN ĐẦU thì cô B không sửa,
    // không xoá; quản lý cơ sở mở khoá. Màn hình gửi lên MỌI ô của bản, nên
    // chỉ ô có nội dung KHÁC bản đang lưu mới bị hỏi — ô cô B không đụng tới
    // thì đi qua. Một ô bị chặn là chặn cả lượt (400/403 trước khi ghi), để cô
    // không rơi vào cảnh nửa bản lưu, nửa bản không.
    for (const s of sach) {
      const cu = db.first('baocaohoctap_o', 'SELECT * FROM baocaohoctap_o WHERE banId = ? AND dongId = ?', [ban.id, s.dongId]);
      if (!cu) continue;
      if (cu.chu === s.chu && cu.muc === s.muc) continue;
      const khoa = khoaCua(cu.id);
      if (dangKhoa(khoa) && khoa.coGhi !== req.user.id) {
        return res.status(403).json({
          error: `Phần này do ${tenNguoi(khoa.coGhi) || 'cô khác'} ghi và đã khoá — nhờ quản lý cơ sở mở`,
          oId: cu.id, dongId: s.dongId,
        });
      }
    }

    const luc = ngay.bayGio();
    const mocKhoa = new Date().toISOString();
    db.tx(() => {
      for (const s of sach) {
        const cu = db.first('baocaohoctap_o', 'SELECT * FROM baocaohoctap_o WHERE banId = ? AND dongId = ?', [ban.id, s.dongId]);
        // Ô bị xoá trắng thì XOÁ hẳn bản ghi, không để lại một dòng rỗng. Một
        // ô rỗng nằm trong bảng sẽ khiến mọi phép đếm "đã điền mấy dòng" sau
        // này đếm sai theo hướng lạc quan. Khoá đi theo ô: ô mất thì khoá mất.
        if (!s.chu && !s.muc) {
          if (cu) { db.remove('baocaohoctap_o', cu.id); db.remove('baocaohoctap_o_khoa', cu.id, 'oId'); }
          continue;
        }
        let oId = cu ? cu.id : null;
        if (cu) {
          if (cu.chu === s.chu && cu.muc === s.muc) continue;   // không đổi thì không đụng, không nhận khoá
          db.update('baocaohoctap_o', cu.id, { chu: s.chu, muc: s.muc, capNhatLuc: luc });
        } else {
          oId = db.nextId('bco');
          db.insert('baocaohoctap_o', { id: oId, banId: ban.id, dongId: s.dongId, chu: s.chu, muc: s.muc, capNhatLuc: luc });
        }
        // NGƯỜI GHI (hoặc ghi lại sau khi mở khoá) NHẬN KHOÁ. Ô máy điền sẵn
        // chưa có khoá — cô đầu tiên sửa nó là người nhận. Chính chủ sửa lại
        // ô của mình thì khoá giữ nguyên.
        const khoa = khoaCua(oId);
        if (!khoa) {
          db.insert('baocaohoctap_o_khoa', { oId, coGhi: req.user.id, khoaLuc: mocKhoa, moKhoaBoi: null, moKhoaLuc: null });
        } else if (!dangKhoa(khoa)) {
          db.update('baocaohoctap_o_khoa', oId, { coGhi: req.user.id, khoaLuc: mocKhoa, moKhoaBoi: null, moKhoaLuc: null }, 'oId');
        }
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
    if (chanNeuNgungHoSo(res, ban.studentId)) return;
    if (ban.trangThai === 'da-gui') return res.json({ ok: true, daGuiTruocDo: true, ban: banDayDu(ban) });

    // Một bản trắng trơn gửi đi thì gia đình mở ra thấy một tờ giấy trắng
    // mang tên con mình. Đòi ít nhất một ô có chữ hoặc phần tổng hợp có chữ.
    const soO = db.count('SELECT COUNT(*) AS n FROM baocaohoctap_o WHERE banId = ?', [ban.id]);
    if (!soO && !String(ban.tongHop || '').trim()) {
      return res.status(400).json({ error: 'Báo cáo chưa có nội dung nào, cô ghi thêm rồi gửi nhé' });
    }

    // QUY TẮC 5 — ĐÁNH GIÁ PHẢI DẪN TỚI HÀNH ĐỘNG.
    //
    // Đây là màn hình DUY NHẤT gia đình đọc được nhãn năm mức. Phân hệ Hành
    // trình chỉ trả `trangThai` cho cô và quản lý, không bao giờ cho phụ
    // huynh; còn bản báo cáo thì mang thẳng nhãn ấy tới nhà. Nên chốt QUY TẮC 5
    // của Hành trình một mình là không đủ — chỗ chữ tới tay gia đình lại là
    // chỗ chưa có chốt nào.
    //
    // Không kèm việc làm được thì gia đình đọc xong chỉ còn một nhãn xếp con
    // mình vào một trong năm ô, không biết làm gì tiếp — đúng thứ QUY TẮC 5
    // sinh ra để tránh.
    //
    // CHỈ ÉP KHI CÔ NÓI ĐÃ THẤY BÉ LÀM, giống hệt Hành trình: hai mức "Chưa
    // dạy" và "Chưa quan sát thấy" không ép, vì ép cô nghĩ ra một việc cho thứ
    // chưa xảy ra là biến quy tắc thành thủ tục giấy tờ — và còn dựng lại đúng
    // áp lực mà QUY TẮC 2 tránh.
    const soODaThay = db.count(
      `SELECT COUNT(*) AS n FROM baocaohoctap_o WHERE banId = ? AND muc IN (${
        DA_QUAN_SAT_THAY.map(() => '?').join(',')})`,
      [ban.id, ...DA_QUAN_SAT_THAY]);
    if (soODaThay > 0
      && !String(ban.oLopLamGi || '').trim() && !String(ban.oNhaChoiGi || '').trim()) {
      return res.status(400).json({
        error: 'Bản này đã ghi nhận điều cô quan sát thấy ở bé. Cô ghi thêm một dòng '
          + '"ở lớp cô làm gì tiếp" hoặc "ở nhà gia đình chơi gì cùng con" giúp nhé — '
          + 'một nhận định không kèm việc làm được thì gia đình đọc xong không biết '
          + 'làm gì với nó.',
      });
    }

    // ĐỢT 2 — "GỬI" LÀ GỬI QUẢN LÝ DUYỆT, KHÔNG PHẢI GỬI THẲNG GIA ĐÌNH.
    //
    // Bản vẫn sang 'da-gui' (khoá tay cô, như cũ), nhưng gia đình chỉ thấy
    // khi quản lý duyệt và tới ngày công bố — xem `giaDinhThay`. Quản lý
    // (admin) tự bấm gửi thì coi như duyệt luôn: một người, một tài khoản,
    // không bắt họ đi vòng sang thẻ Chờ duyệt để duyệt chính mình.
    const luc = ngay.bayGio();
    const moc = new Date().toISOString();
    const laQuanLy = req.user.role === 'admin';
    const ngayCongBo = laQuanLy ? docNgayCongBo((req.body || {}).ngayCongBo) : '';
    if (laQuanLy && ngayCongBo === null) {
      return res.status(400).json({ error: 'Ngày công bố chưa đúng dạng, ví dụ đúng: 2026-09-15' });
    }
    db.tx(() => {
      db.update('baocaohoctap_ban', ban.id, { trangThai: 'da-gui', guiLuc: luc, capNhatLuc: luc });
      db.upsert('baocaohoctap_duyet', {
        banId: ban.id,
        trangThai: laQuanLy ? 'da-duyet' : 'cho-duyet',
        nguoiGui: req.user.id, guiLuc: moc,
        nguoiDuyet: laQuanLy ? req.user.id : null,
        duyetLuc: laQuanLy ? moc : null,
        yKien: '', ngayCongBo,
        // Gửi lại sau khi thu về là một BẢN MỚI với gia đình — báo lại một lần.
        daBaoLuc: null,
      }, ['banId']);
    });
    db.audit(req.user.id, 'baocaohoctap-gui', ban.studentId, {
      id: ban.id, tuNgay: ban.tuNgay, denNgay: ban.denNgay, duyetLuon: laQuanLy || undefined, ngayCongBo: ngayCongBo || undefined,
    });
    const sau = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [ban.id]);
    if (laQuanLy) baoNeuToiNgay(sau);
    // BÁO QUẢN LÝ CÓ BẢN CHỜ DUYỆT (Đ154). Trước đợt này cô gửi xong là im
    // lặng: quản lý chỉ biết khi tự mở đúng màn Báo cáo học tập ra. Huy hiệu
    // trên màn hình chính là dấu vết bền, tin đẩy này là dấu hiệu ngay.
    if (!laQuanLy) {
      const be = db.findStudent(ban.studentId);
      const m = layMau(ban.mauId);
      baoNhaTruong(ban.studentId, {
        tieuDe: 'Có báo cáo học tập chờ duyệt',
        noiDung: `${tenNguoi(req.user.id) || 'Cô'} vừa gửi ${m ? m.ten : 'báo cáo'} của ${be ? be.name : 'một bé'}.`,
        hash: '#/baocaohoctap',
        tru: req.user.id,
      });
    }
    res.json({ ok: true, choDuyet: !laQuanLy, ban: banDayDu(sau) });
  });

  // Ngày công bố: để trống = hôm nay (giờ Việt Nam). Sai dạng thì trả null
  // để đường gọi báo lỗi, không lặng lẽ đổi thành hôm nay.
  function docNgayCongBo(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return ngay.homNay();
    return NGAY_RE.test(s) ? s : null;
  }

  // QUẢN LÝ CƠ SỞ / HIỆU TRƯỞNG DUYỆT, VÀ CHỌN NGÀY CÔNG BỐ.
  //
  // Duyệt: bản giữ 'da-gui', dòng duyệt sang 'da-duyet' kèm `ngayCongBo`;
  // tới ngày (có thể là hôm nay) thì `baoNeuToiNgay` báo gia đình. Trả lại:
  // dòng duyệt 'tu-choi' kèm ý kiến, bản về 'nhap' cho cô sửa rồi gửi lại.
  app.post('/api/baocaohoctap/ban/:id/duyet', requireRole('admin'), (req, res) => {
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [req.params.id]);
    if (!ban) return res.status(404).json({ error: 'Không tìm thấy báo cáo này' });
    if (!db.canAccessStudent(req.user, ban.studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const d = duyetCua(ban.id);
    if (ban.trangThai !== 'da-gui' || !d) {
      return res.status(400).json({ error: 'Bản này cô chưa gửi duyệt' });
    }
    const b = req.body || {};
    const quyet = String(b.quyetDinh || 'da-duyet');
    if (quyet !== 'da-duyet' && quyet !== 'tu-choi') {
      return res.status(400).json({ error: 'Quyết định phải là duyệt hoặc trả lại' });
    }
    const yKien = chuoi(b.yKien, TOI_DA_VIEC);
    const moc = new Date().toISOString();

    if (quyet === 'tu-choi') {
      if (!yKien) return res.status(400).json({ error: 'Trả lại thì ghi giúp cô một dòng vì sao nhé' });
      if (d.daBaoLuc) {
        return res.status(400).json({ error: 'Bản này gia đình đã nhận rồi. Cần sửa thì nhờ cô "Thu về nháp" trước.' });
      }
      db.tx(() => {
        db.update('baocaohoctap_duyet', ban.id, { trangThai: 'tu-choi', nguoiDuyet: req.user.id, duyetLuc: moc, yKien, ngayCongBo: '' }, 'banId');
        db.update('baocaohoctap_ban', ban.id, { trangThai: 'nhap', guiLuc: null, capNhatLuc: ngay.bayGio() });
      });
      db.audit(req.user.id, 'baocaohoctap-tra-lai', ban.studentId, { id: ban.id });
      return res.json({ ok: true, quyetDinh: quyet, ban: banDayDu(db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [ban.id])) });
    }

    // Đã báo gia đình rồi thì ngày công bố không đổi được nữa — đổi là làm
    // lời báo đã gửi thành nói dối.
    if (d.daBaoLuc) return res.status(400).json({ error: 'Bản này gia đình đã nhận rồi' });
    const ngayCongBo = docNgayCongBo(b.ngayCongBo);
    if (ngayCongBo === null) {
      return res.status(400).json({ error: 'Ngày công bố chưa đúng dạng, ví dụ đúng: 2026-09-15' });
    }
    db.update('baocaohoctap_duyet', ban.id, {
      trangThai: 'da-duyet', nguoiDuyet: req.user.id, duyetLuc: moc, yKien, ngayCongBo,
    }, 'banId');
    db.audit(req.user.id, 'baocaohoctap-duyet', ban.studentId, { id: ban.id, ngayCongBo });
    const daBao = baoNeuToiNgay(ban);
    res.json({ ok: true, quyetDinh: quyet, ngayCongBo, daBao, ban: banDayDu(ban) });
  });

  // MỞ KHOÁ MỘT Ô — việc của quản lý cơ sở.
  //
  // Sau khi mở, ô thuộc về mọi người cho tới khi có cô ghi tiếp — cô ấy nhận
  // khoá mới. Ghi lại ai mở, lúc nào.
  app.post('/api/baocaohoctap/o/:id/mo-khoa', requireRole('admin'), (req, res) => {
    const o = db.first('baocaohoctap_o', 'SELECT * FROM baocaohoctap_o WHERE id = ?', [req.params.id]);
    if (!o) return res.status(404).json({ error: 'Không tìm thấy ô này' });
    const ban = db.first('baocaohoctap_ban', 'SELECT * FROM baocaohoctap_ban WHERE id = ?', [o.banId]);
    if (!ban || !db.canAccessStudent(req.user, ban.studentId)) {
      return res.status(403).json({ error: 'Bé này không thuộc phạm vi của tài khoản' });
    }
    const khoa = khoaCua(o.id);
    if (!dangKhoa(khoa)) return res.json({ ok: true, daMoTruocDo: true });
    db.update('baocaohoctap_o_khoa', o.id, { moKhoaBoi: req.user.id, moKhoaLuc: new Date().toISOString() }, 'oId');
    db.audit(req.user.id, 'baocaohoctap-mo-khoa-o', ban.studentId, { banId: ban.id, oId: o.id, coGhi: khoa.coGhi });
    res.json({ ok: true, ban: banDayDu(ban) });
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
  // =========================================================================
  // ĐỒNG HỒ ĐỊNH GIỜ VÀ HUY HIỆU (Đ154)
  // =========================================================================

  // TỚI NGÀY CÔNG BỐ THÌ BÁO GIA ĐÌNH — không chờ ai mở màn nào.
  //
  // Chạy lại được nhiều lần: `baoNeuToiNgay` tự chặn bằng cột `daBaoLuc`, nên
  // máy chủ khởi động lại năm lần trong một buổi cũng chỉ gửi đúng một tin.
  // Trần 500 bản một lượt: một trường mầm non ba cơ sở không bao giờ chạm tới,
  // còn nếu chạm thì lượt sau 15 phút nữa quét tiếp — thà chậm hơn là một câu
  // truy vấn không có trần.
  henGio.dangKy('baocaohoctap:toi-ngay-cong-bo', () => {
    if (!modules.dangBat('baocaohoctap')) return;
    const ds = db.all('baocaohoctap_ban',
      `SELECT b.* FROM baocaohoctap_ban b
         JOIN baocaohoctap_duyet d ON d.banId = b.id
        WHERE b.trangThai = 'da-gui' AND d.trangThai = 'da-duyet'
          AND (d.daBaoLuc IS NULL OR d.daBaoLuc = '')
          AND d.ngayCongBo <> '' AND d.ngayCongBo <= ?
        ORDER BY d.ngayCongBo LIMIT 500`, [ngay.homNay()]);
    for (const ban of ds) baoNeuToiNgay(ban);
  });

  // HUY HIỆU: số bản đang chờ CHÍNH NGƯỜI NÀY duyệt.
  //
  // Chỉ quản trị mới duyệt được nên chỉ quản trị mới có con số. Lọc từng bản
  // bằng `canAccessStudent` — cùng một luật với màn Chờ duyệt, để con số trên
  // ô và số dòng trong màn không bao giờ nói khác nhau.
  huyHieu.dangKy('baocaohoctap', (user) => {
    if (!user || user.role !== 'admin') return 0;
    const cv = db.chucVu(user);
    if (cv !== null && !baoNT.CHUC_VU_NHAN.includes(cv)) return 0;
    return db.all('baocaohoctap_ban',
      `SELECT b.studentId FROM baocaohoctap_ban b
         JOIN baocaohoctap_duyet d ON d.banId = b.id
        WHERE b.trangThai = 'da-gui' AND d.trangThai = 'cho-duyet'
        ORDER BY d.guiLuc DESC LIMIT ${GIOI_HAN_DANH_SACH}`)
      .filter(b => db.canAccessStudent(user, b.studentId)).length;
  });
};
