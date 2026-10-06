// Sinh dữ liệu mẫu vào cơ sở dữ liệu. Ngày tháng được tính tương đối so với hôm
// nay để dữ liệu demo luôn "sống". Chạy lại: npm run seed
const fs = require('fs');
const path = require('path');
const password = require('../lib/password');
const { importSnapshot } = require('../lib/importer');

// Mật khẩu dùng thử; có thể đổi khi triển khai bằng biến môi trường DEMO_PASSWORD.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || '123456';

// DỮ LIỆU MẪU NEO VÀO CÙNG MỘT "HÔM NAY" VỚI MÁY CHỦ.
//
// Trước đây tệp này tính ngày bằng giờ MÁY (`new Date()` rồi getFullYear /
// getMonth / getDate), trong khi máy chủ hỏi `lib/ngay.js` — ngày theo giờ Việt
// Nam. Hai bên lệch nhau suốt từ 17 giờ UTC tới nửa đêm, nên "đơn xin nghỉ cho
// NGÀY MAI" mà dữ liệu mẫu dựng ra lại rơi vào hôm nay của máy chủ.
//
// Hậu quả không chỉ ở bài test: người mở app lần đầu vào buổi tối sẽ thấy dữ
// liệu mẫu lệch một ngày so với mọi màn hình, và sẽ tưởng app tính sai.
//
// Neo vào NỬA ĐÊM THEO GIỜ VIỆT NAM của hôm nay, biểu diễn bằng mốc UTC. Nhờ
// vậy `toISOString().slice(0, 10)` trả về đúng ngày Việt Nam, không cần đổi
// múi giờ lần thứ hai.
const ngay = require('../lib/ngay');
const MOC = Date.parse(`${ngay.homNay()}T00:00:00Z`);

function fmt(d) { return new Date(d).toISOString().slice(0, 10); }
function daysAgo(n) { return new Date(MOC - n * 86400000); }
function daysAhead(n) { return new Date(MOC + n * 86400000); }
// Mốc thời gian ISO cho "h giờ min phút NGÀY d, GIỜ VIỆT NAM".
//
// Bản cũ cộng thẳng h giờ vào 00:00Z rồi dán hậu tố Z — tức khai giờ-tường
// Việt Nam là giờ UTC. Mọi màn hình đọc mốc bằng giờ máy (fmtTime dùng
// getHours) nên hiện lệch +7 tiếng, và mốc từ 17h trở đi nhảy sang ngày hôm
// sau. Trừ đúng độ lệch đã khai ở lib/ngay.js (không chép lại con số).
function iso(d, h, min) {
  return new Date(Date.parse(`${fmt(d)}T00:00:00Z`)
    + (h * 60 + (min || 0) - ngay.LECH_PHUT) * 60000).toISOString();
}
// Cô CỦA ĐÚNG NHÓM ghi sổ cho nhóm mình: t1 (Chồi 2), t2 (Lá 1), t4 (Nhà
// trẻ 1). Bản cũ rẽ nhánh "c1 thì t1, còn lại t2" nên mọi ghi chép của ba bé
// nhà trẻ mang tên cô nhóm Lá — sai người chịu trách nhiệm.
function coCuaNhom(cid) {
  return { c1: 't1', c2: 't2', c4: 't4' }[cid] || 't1';
}
// n ngày học (T2-T6) gần nhất, mới nhất trước
function recentWeekdays(n) {
  const out = [];
  for (let i = 0; out.length < n && i < n * 3; i++) {
    const d = daysAgo(i);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d);
  }
  return out;
}
// Thứ Hai của tuần chứa d
function mondayOf(d) {
  const t = Date.parse(`${fmt(d)}T00:00:00Z`);
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 86400000);
}
function pick(arr, i) { return arr[i % arr.length]; }

// Dữ liệu mẫu cho TÁM PHÂN HỆ MẦM NON.
//
// VÌ SAO TÁCH RA MỘT TỆP RIÊNG
//
// `data/seed.js` đi qua `lib/importer.js`, mà tệp đó chỉ biết các bảng LÕI —
// và phải giữ như vậy: phân hệ là thứ cắm thêm được, gỡ ra được, nên bộ nhập
// dữ liệu lõi không được biết tên bảng của chúng.
//
// VÌ SAO CẦN CÓ
//
// `docs/KE-HOACH.md` mục G0 chốt: *"Seed kể một câu chuyện nhất quán — bé An,
// nhóm Chồi 2, cơ sở 1, chạy xuyên suốt mọi màn hình"*. Nhưng cho tới trước
// đợt này, chạy `npm run seed` rồi bật tám phân hệ mầm non lên thì **màn nào
// cũng trắng trơn**: không một dòng nhật ký, không một bản báo ăn, không một
// quan sát nào. Người của trường mở app xem thử sẽ tưởng phân hệ hỏng.
//
// HAI VIỆC TỆP NÀY LÀM, VÀ VIỆC THỨ HAI DỄ QUÊN
//
//   1. Dựng bảng của phân hệ nếu chưa có. `npm run seed` chạy được mà không
//      cần khởi động máy chủ, nên lúc đó `lib/modules.js` chưa kịp chạy
//      `schema.sql` của phân hệ nào cả.
//
//   2. XOÁ SẠCH bảng của phân hệ trước khi ghi. Danh sách xoá của
//      `lib/importer.js` không nhắc tới bảng nào của phân hệ, nên chạy lại
//      seed sẽ để lại dòng cũ trỏ vào những bé vừa bị xoá — nhật ký của một
//      bé không còn tồn tại, báo ăn của một nhóm không còn tồn tại.
//
// CHỈ ĐƯỢC GỌI TỪ ĐƯỜNG SINH DỮ LIỆU MẪU. Không bao giờ gọi lúc máy chủ khởi
// động: nó XOÁ DỮ LIỆU.
const MODULES_DIR = path.join(__dirname, '..', 'modules');

// Bảng của từng phân hệ, xếp theo thứ tự XOÁ (bảng con trước bảng cha).
const BANG = [
  'nhatky_gui', 'nhatky_vesinh', 'nhatky_bua', 'nhatky_ngay',
  'tienan_chot',
  'dontra_ghi', 'dontra_uyquyen', 'dontra_nguoi',
  'hanhtrinh_quansat', 'hanhtrinh_chude',
  'kehoachbe_de_xuat_ct', 'kehoachbe_ke_ct', 'kehoachbe_muc', 'kehoachbe_ke',
  'cambridge_anh_be', 'cambridge_bai',
  'thuchup_ghinhanh',
  'hocphi_khoan',
];

// Dựng bảng của mọi phân hệ có trong thư mục `modules/`.
//
// Đi qua đúng bộ canh mà máy chủ dùng (`modules.kiemTraSchema`), nên một
// `schema.sql` viết sai bị chặn ở đây y như lúc khởi động — không có đường
// vòng nào chỉ vì đang chạy seed.
function dungBangPhanHe(db) {
  const modules = require('../lib/modules');
  if (!fs.existsSync(MODULES_DIR)) return;
  for (const ten of fs.readdirSync(MODULES_DIR)) {
    const thuMuc = path.join(MODULES_DIR, ten);
    if (!fs.statSync(thuMuc).isDirectory()) continue;
    const tep = path.join(thuMuc, 'schema.sql');
    if (!fs.existsSync(tep)) continue;
    try {
      const sql = fs.readFileSync(tep, 'utf8');
      modules.kiemTraSchema(sql, ten);
      db.sqlite.exec(sql);
    } catch (err) {
      console.warn(`  (bỏ qua lược đồ của phân hệ "${ten}": ${err.message})`);
    }
  }
}

function xoaBangPhanHe(db) {
  for (const b of BANG) {
    try { db.run(`DELETE FROM ${b}`); } catch (_) { /* phân hệ đã bị gỡ */ }
  }
}

// ---------------------------------------------------------------------------

function sinh(db, moc) {
  const { fmt, daysAgo, daysAhead, thuHai, HOM_NAY, THANG_NAY } = moc;
  // Cùng phép quy đổi giờ Việt Nam → UTC với hàm `iso` ở đầu tệp — bản cũ dán
  // hậu tố Z vào giờ-tường nên mọi mốc hiển thị lệch +7 tiếng.
  const luc = (d, h, m) => new Date(Date.parse(`${fmt(d)}T00:00:00Z`)
    + ((h * 60 + (m || 0)) - ngay.LECH_PHUT) * 60000).toISOString();
  let dem = 0;
  const ma = (p) => `${p}_seed${(dem += 1).toString(36)}`;

  const stats = {};
  const them = (bang, rec) => {
    try { db.insert(bang, rec); stats[bang] = (stats[bang] || 0) + 1; }
    catch (err) { console.warn(`  (không ghi được vào ${bang}: ${err.message})`); }
  };

  // Ba ngày học gần nhất, mới nhất trước.
  const ngayHoc = [];
  for (let i = 0; ngayHoc.length < 3 && i < 12; i++) {
    const d = daysAgo(i);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) ngayHoc.push(d);
  }

  const beChoi2 = ['s1', 's3', 's4', 's5', 's6'];   // nhóm Chồi 2 (c1)
  const beNhaTre = ['s9', 's10', 's11'];            // nhóm Nhà trẻ 1 (c4)

  // ---- NHẬT KÝ NGÀY -------------------------------------------------------
  // Cố ý KHÔNG điền đủ mọi bé mọi ngày: trường thật cũng không bao giờ đủ, và
  // màn hình phải chịu được ô trống. Bé s6 của ngày gần nhất để trống hẳn, để
  // trạng thái "cô chưa ghi" có thật trên dữ liệu mẫu.
  const AN = ['het', 'gan-het', 'it'];
  // TỪNG BỮA (Đ141) đi kèm mỗi dòng nhật ký: ba bữa sáng / trưa / xế của bảng
  // phụ `nhatky_bua` chép đúng ba cột cũ, để màn cô đời mới (ghi theo bước
  // từng bữa) và màn gia đình đời cũ đọc cùng một chuyện. Bữa trống thì không
  // sinh dòng — trống là "cô chưa ghi".
  // Ngày mẫu là ngày CŨ với luật "Lưu là nháp, Gửi mới thấy" (góp ý 06/10,
  // mục 9): gia đình đọc thẳng như trước. Sinh lại dữ liệu mẫu trên một máy
  // đã chạy thì vẫn vậy, không phụ thuộc giờ ghi của dòng mẫu.
  const danhDauCu = (rec) => them('nhatky_gui', {
    studentId: rec.studentId, ngay: rec.ngay, phan: 'cu', banGui: '', guiLuc: rec.capNhatLuc,
  });
  const themBua = (rec) => {
    for (const [cot, bua] of [['anSang', 'breakfast'], ['anTrua', 'lunch'], ['anXe', 'snack']]) {
      if (!rec[cot]) continue;
      them('nhatky_bua', {
        id: ma('nkb'), studentId: rec.studentId, ngay: rec.ngay, bua, muc: rec[cot], ghiChu: '',
        nguoiGhi: rec.nguoiGhi, capNhatLuc: rec.capNhatLuc,
      });
    }
  };
  ngayHoc.forEach((d, i) => {
    beChoi2.forEach((sid, j) => {
      if (i === 0 && sid === 's6') return;
      const rec = {
        id: ma('nk'), studentId: sid, ngay: fmt(d),
        anSang: AN[(i + j) % 3], anTrua: AN[(i + j + 1) % 3], anXe: AN[(i + j + 2) % 3],
        anGhiChu: sid === 's4' ? 'Món có đậu phộng đã đổi sang cháo thịt bằm' : '',
        nguTuLuc: '11:30', nguDenLuc: j % 2 ? '14:00' : '13:45',
        nguGhiChu: j === 1 ? 'Trằn trọc một lúc rồi mới ngủ' : '',
        veSinhSoLan: 1 + ((i + j) % 3), veSinhTinhChat: 'binh-thuong',
        ghiChu: i === 0 && sid === 's1' ? 'Hôm nay con tự xúc hết bát cơm, làm rơi hai lần rồi tự lấy khăn lau.' : '',
        nguoiGhi: 't1', capNhatLuc: luc(d, 16, 10),
      };
      them('nhatky_ngay', rec);
      themBua(rec);
      danhDauCu(rec);
    });

    // Nhóm nhà trẻ có thêm ba ô thay bỉm và bú bình.
    beNhaTre.forEach((sid, j) => {
      const laNhaTre = sid !== 's11';   // s11 đã 38 tháng — qua mốc 36
      const rec = {
        id: ma('nk'), studentId: sid, ngay: fmt(d),
        anSang: AN[j % 3], anTrua: AN[(j + 1) % 3], anXe: '',
        nguTuLuc: '11:15', nguDenLuc: '14:15',
        veSinhSoLan: 2, veSinhTinhChat: 'binh-thuong',
        bimSoLan: laNhaTre ? 3 + (j % 2) : null,
        buBinhSoLan: laNhaTre ? 2 : null,
        buBinhMl: laNhaTre ? 240 + j * 30 : null,
        ghiChu: '', nguoiGhi: 't4', capNhatLuc: luc(d, 16, 20),
      };
      them('nhatky_ngay', rec);
      themBua(rec);
      danhDauCu(rec);
    });
  });

  // ---- BÁO ĂN & TIỀN ĂN ---------------------------------------------------
  // Chốt cho hôm qua và hôm kia; HÔM NAY CỐ Ý ĐỂ TRỐNG, để cô mở màn ra là
  // thấy đúng việc còn phải làm sáng nay.
  for (const d of ngayHoc.slice(1)) {
    them('tienan_chot', {
      id: ma('ta'), ngay: fmt(d), classId: 'c1', soSuat: 5, soSuatMay: 5,
      ghiChu: '', nguoiChot: 't1', chotLuc: luc(d, 7, 40),
    });
    them('tienan_chot', {
      id: ma('ta'), ngay: fmt(d), classId: 'c2', soSuat: 3, soSuatMay: 3,
      ghiChu: '', nguoiChot: 't2', chotLuc: luc(d, 7, 35),
    });
    them('tienan_chot', {
      id: ma('ta'), ngay: fmt(d), classId: 'c4', soSuat: 3, soSuatMay: 3,
      ghiChu: 'Bé Huy mới ốm dậy, bếp nấu cháo riêng', nguoiChot: 't4', chotLuc: luc(d, 7, 45),
    });
  }

  // ---- ĐÓN TRẢ BÉ ---------------------------------------------------------
  const nguoiDon = [
    { id: 'dt_ba_lan', studentId: 's1', hoTen: 'Trần Thị Lan', quanHe: 'Bà ngoại', dienThoai: '0909 111 222', ghiChu: 'Ở cùng nhà, đón chiều thứ Ba và thứ Năm' },
    { id: 'dt_me_ha', studentId: 's1', hoTen: 'Lê Thị Thu Hà', quanHe: 'Mẹ', dienThoai: '0903 222 111', ghiChu: '' },
    { id: 'dt_bo_bao', studentId: 's3', hoTen: 'Phạm Quốc Bảo', quanHe: 'Bố', dienThoai: '0912 555 333', ghiChu: '' },
    { id: 'dt_bac_nam', studentId: 's4', hoTen: 'Vũ Đình Nam', quanHe: 'Bác ruột', dienThoai: '0912 333 444', ghiChu: 'Chỉ đón khi bố mẹ báo trước' },
  ];
  for (const n of nguoiDon) {
    them('dontra_nguoi', {
      ...n, anh: '', dangDung: 1, nguoiTao: 't1',
      taoLuc: luc(daysAgo(30), 8), capNhatLuc: luc(daysAgo(30), 8),
    });
  }

  // Một giấy uỷ quyền còn hiệu lực trong tuần này — để màn hình có cái để hiện.
  them('dontra_uyquyen', {
    id: ma('uq'), studentId: 's5', hoTen: 'Đỗ Minh Tuấn', quanHe: 'Chú ruột',
    dienThoai: '0977 888 999', anh: '',
    tuNgay: fmt(daysAgo(1)), denNgay: fmt(new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + 3 * 86400000)),
    lyDo: 'Bố mẹ đi công tác tỉnh, chú đón giúp ba ngày',
    huyLuc: null, huyBoi: null, nguoiTao: 't1', taoLuc: luc(daysAgo(1), 7, 50),
  });

  // Sổ đón trả của hai ngày gần nhất.
  ngayHoc.slice(0, 2).forEach((d, i) => {
    beChoi2.slice(0, 4).forEach((sid, j) => {
      them('dontra_ghi', {
        id: ma('dg'), studentId: sid, ngay: fmt(d),
        luc: `1${6 + (j % 2)}:${j % 2 ? '30' : '05'}`,
        nguoiDon: sid === 's1' && i === 0 ? 'Trần Thị Lan (Bà ngoại)' : 'Mẹ',
        nguonLoai: sid === 's1' && i === 0 ? 'nguoi' : '',
        nguonId: sid === 's1' && i === 0 ? 'dt_ba_lan' : '',
        ghiChu: '', coGhi: 't1', capNhatLuc: luc(d, 17, 0),
      });
    });
  });

  // ---- HÀNH TRÌNH HỌC TẬP -------------------------------------------------
  const tuanNay = fmt(thuHai(daysAgo(0)));
  them('hanhtrinh_chude', {
    id: ma('ct'), classId: 'c1', tuan: tuanNay,
    chuDe: 'Nước quanh ta',
    moTa: 'Cả tuần cả nhóm chơi với nước: rót, đong, thả vật nổi vật chìm, tưới cây góc sân.',
    cungConONha: 'Cho con phụ rửa rau, rót nước vào bình. Hỏi con "cái này nổi hay chìm?" rồi thả thử.',
    coGhi: 't1', taoLuc: luc(daysAgo(3), 17), capNhatLuc: luc(daysAgo(3), 17),
  });
  them('hanhtrinh_chude', {
    id: ma('ct'), classId: 'c4', tuan: tuanNay,
    chuDe: 'Bàn tay của con',
    moTa: 'Nhận biết bàn tay, tập cầm nắm, in bàn tay lên giấy.',
    cungConONha: 'Cùng con vỗ tay theo nhịp, chơi ú oà bằng hai bàn tay.',
    coGhi: 't4', taoLuc: luc(daysAgo(3), 17), capNhatLuc: luc(daysAgo(3), 17),
  });

  // BA QUAN SÁT, CỐ Ý Ở BA LỚP DỮ LIỆU KHÁC NHAU — đúng bảng ba lớp trong
  // CLAUDE.md. Không có đủ ba thì màn hình chỉ chứng minh được một lớp.
  //
  //   1. Ghi chú thô, cô chưa gắn lĩnh vực   → chỉ cô đã ghi đọc được
  //   2. Đã suy ngẫm, chưa công bố            → cô trong nhóm và quản lý đọc được
  //   3. Đã công bố                           → gia đình bé đó đọc được
  them('hanhtrinh_quansat', {
    id: ma('ht'), studentId: 's4', ngay: fmt(ngayHoc[0]),
    moTa: 'Đức Anh xếp chồng năm khối gỗ, đổ hai lần, lần thứ ba đặt khối to xuống dưới rồi mới xếp tiếp.',
    anh: '', ghiNhanhId: '', linhVuc: '', trangThai: '', minhChung: '', oLopLamGi: '',
    suyNgamLuc: null, giaySuyNgam: null, cauChuyen: '', cungConONha: '', congBoLuc: null,
    coGhi: 't1', taoLuc: luc(ngayHoc[0], 10, 20), capNhatLuc: luc(ngayHoc[0], 10, 20),
  });
  them('hanhtrinh_quansat', {
    id: ma('ht'), studentId: 's3', ngay: fmt(ngayHoc[1]),
    moTa: 'Gia Hân tự lấy khăn lau chỗ nước đổ ra sàn, không ai nhắc.',
    anh: '', ghiNhanhId: '',
    linhVuc: 'thuc-hanh-cuoc-song', trangThai: 'dang-hinh-thanh',
    minhChung: 'Lặp lại ba lần trong tuần', oLopLamGi: 'Đặt khăn lau ở tầm với của bé để con tự lấy được.',
    suyNgamLuc: luc(ngayHoc[1], 17, 5), giaySuyNgam: 96,
    cauChuyen: '', cungConONha: '', congBoLuc: null,
    coGhi: 't1', taoLuc: luc(ngayHoc[1], 9, 40), capNhatLuc: luc(ngayHoc[1], 17, 5),
  });
  them('hanhtrinh_quansat', {
    id: ma('ht'), studentId: 's1', ngay: fmt(ngayHoc[2]),
    moTa: 'Bảo An rót nước từ bình sang ba cái cốc, dừng lại đúng lúc gần đầy, không tràn cốc nào.',
    anh: '', ghiNhanhId: '',
    linhVuc: 'thuc-hanh-cuoc-song', trangThai: 'da-vung',
    minhChung: 'Làm lại được vào hôm sau mà không cần nhắc',
    oLopLamGi: 'Đưa bình nặng hơn một chút để con tập giữ thăng bằng tay.',
    suyNgamLuc: luc(ngayHoc[2], 17, 10), giaySuyNgam: 132,
    cauChuyen: 'Tuần này ở góc thực hành cuộc sống, Bảo An rót nước từ bình sang ba cái cốc. '
      + 'Con nghiêng bình rất chậm và dừng lại đúng lúc nước gần đầy — cả ba cốc đều không tràn.',
    cungConONha: 'Ở nhà bố mẹ cho con rót nước vào cốc của cả nhà lúc ăn cơm nhé.',
    congBoLuc: luc(ngayHoc[2], 17, 30),
    coGhi: 't1', taoLuc: luc(ngayHoc[2], 10, 5), capNhatLuc: luc(ngayHoc[2], 17, 30),
  });

  // ---- KẾ HOẠCH CỦA BÉ ----------------------------------------------------
  // Ba trạng thái duyệt, mỗi bé một trạng thái — để màn quản lý có đủ việc.
  const GOC = ['toan', 'tieng-viet', 'cambridge', 'thuc-hanh-cuoc-song', 'giac-quan'];
  const NOI_DUNG = {
    toan: 'Đếm và ghép số lượng trong phạm vi 5',
    'tieng-viet': 'Kể lại một việc con đã làm trong ngày',
    cambridge: 'Nghe và làm theo hai chỉ dẫn liên tiếp bằng tiếng Anh',
    'thuc-hanh-cuoc-song': 'Rót nước, xúc hạt, tự cài cúc áo',
    'giac-quan': 'Phân biệt vật nổi vật chìm bằng tay và mắt',
  };
  const keCuaBe = [
    { sid: 's1', trangThai: 'da-duyet' },
    { sid: 's3', trangThai: 'cho-duyet' },
    { sid: 's5', trangThai: 'nhap' },
  ];
  for (const k of keCuaBe) {
    const keId = ma('kb');
    them('kehoachbe_ke', {
      id: keId, studentId: k.sid, classId: 'c1', thang: THANG_NAY,
      trangThai: k.trangThai, coLap: 't1', lapLuc: luc(daysAgo(6), 16),
      guiLuc: k.trangThai === 'nhap' ? null : luc(daysAgo(5), 16),
      // NGƯỜI DUYỆT ĐỂ TRỐNG CÓ CHỦ Ý: dữ liệu mẫu KHÔNG có tài khoản quản trị
      // nào — tài khoản đó do `npm run create-admin` tạo riêng, và mã của nó
      // sinh ra lúc chạy nên ở đây không đoán được. Ghi một mã bịa vào là màn
      // hình hiện tên người không tồn tại. Để trống còn là một phép thử nhỏ:
      // màn duyệt phải chịu được ô "người duyệt" rỗng.
      nguoiDuyet: '',
      duyetLuc: k.trangThai === 'da-duyet' ? luc(daysAgo(4), 9) : null,
      yKienDuyet: '', capNhatLuc: luc(daysAgo(4), 9),
    });
    GOC.forEach((g, i) => {
      them('kehoachbe_muc', {
        id: ma('km'), keId, gocLinhVuc: g, noiDung: NOI_DUNG[g],
        ketQua: k.trangThai === 'da-duyet' && i < 2 ? 'dang-hinh-thanh' : '',
        nhanXet: '', tiepTucThangSau: 0, capNhatLuc: luc(daysAgo(4), 9),
      });
    });
  }

  // ---- KẾ HOẠCH GIÁO DỤC CHUNG CẢ TRƯỜNG, THEO TUẦN (góp ý 06/10, mục 4) ----
  // Bảng LÕI (`edu_plan_tuan`) nhưng gieo ở đây cùng dữ liệu phân hệ, để bộ
  // kiểm thử (tắt phần này bằng CASA_SEED_PHAN_HE=0) bắt đầu từ bảng trống.
  {
    const nhan = (thuHai) => `Tuần ${Math.ceil(Number(thuHai.slice(8, 10)) / 7)} tháng ${Number(thuHai.slice(5, 7))}`;
    const tuanTruoc = fmt(thuHai(daysAgo(7)));
    const tuanSau = fmt(thuHai(daysAhead(7)));
    for (const [tuan, chuDe, dong] of [
      [tuanTruoc, 'Trường của bé', [
        'Khám phá: Trong tuần các con làm quen với môi trường xung quanh, từ vựng mới về trường mầm non.',
        'Kỹ năng sống: Bé làm quen với phép lịch sự nhã nhặn; cách tự lau dọn bàn sau bữa ăn.',
        'Âm nhạc: Bài hát của tuần "Trường chúng cháu là trường mầm non".',
      ]],
      [tuanNay, 'Nước quanh ta', [
        'Khám phá: Các con chơi với nước — rót, đong, thả vật nổi vật chìm, tưới cây góc sân.',
        'Kỹ năng sống: Tự rửa tay đúng sáu bước và tiết kiệm nước khi rửa.',
        'Âm nhạc: Bài hát của tuần "Cho tôi đi làm mưa với".',
        'Tạo hình: Vẽ giọt mưa bằng ngón tay.',
      ]],
      [tuanSau, 'Gia đình của bé', [
        'Khám phá: Gọi tên các thành viên trong gia đình, kể về một việc cả nhà làm cùng nhau.',
        'Kỹ năng sống: Chào hỏi khi có khách tới nhà.',
      ]],
    ]) {
      them('edu_plan_tuan', {
        id: ma('kht'), tuan, campusId: '', tieuDe: `${nhan(tuan)}: ${chuDe}`,
        noiDung: dong.join('\n'), nguoiSoan: '', taoLuc: luc(daysAgo(8), 9), capNhatLuc: luc(daysAgo(8), 9),
      });
    }
  }

  // ---- CAMBRIDGE & KẾT NỐI Ở NHÀ ------------------------------------------
  them('cambridge_bai', {
    id: ma('cb'), loai: 'cambridge', tieuDe: 'Cambridge tuần này: Colours',
    noiDung: 'Từ vựng tuần này: red, blue, yellow, green.\n\n'
      + 'Ở lớp các con nghe bài hát về màu sắc và chỉ đúng màu khi cô gọi tên.',
    tuan: tuanNay, phamVi: 'truong', campusId: '', classId: '', anh: '',
    congBoLuc: luc(daysAgo(2), 15), nguoiDang: '',
    taoLuc: luc(daysAgo(2), 14), capNhatLuc: luc(daysAgo(2), 15),
  });
  // Màn Cambridge mở sẵn ở tab Letter for Parent (góp ý 06/10) — dữ liệu mẫu
  // cần ít nhất một lá thư, kẻo người bấm thử mở ra thấy tab đầu trống trơn.
  them('cambridge_bai', {
    id: ma('cb'), loai: 'thu-phu-huynh', tieuDe: 'Thư gửi gia đình: tháng này các con học gì',
    noiDung: 'Tháng này các con làm quen với màu sắc và các con số từ 1 đến 5 bằng tiếng Anh.\n\n'
      + 'Ở nhà, gia đình hỏi con "What colour is it?" khi cùng con xếp đồ chơi nhé.',
    tuan: tuanNay, phamVi: 'truong', campusId: '', classId: '', anh: '',
    congBoLuc: luc(daysAgo(3), 16), nguoiDang: '',
    taoLuc: luc(daysAgo(3), 15), capNhatLuc: luc(daysAgo(3), 16),
  });
  // Mã loại phải đúng `ket-noi` như máy chủ khai (LOAI). Bản cũ ghi `ketnoi` —
  // tờ ấy chỉ hiện ở tab "Tất cả", và tab đó nay không còn.
  them('cambridge_bai', {
    id: ma('cb'), loai: 'ket-noi', tieuDe: 'Kết nối ở nhà: chơi với nước',
    noiDung: 'Cuối tuần này bố mẹ cho con phụ rửa rau, rót nước vào bình, '
      + 'và cùng con thả thử vài thứ vào chậu nước xem cái nào nổi cái nào chìm.',
    tuan: tuanNay, phamVi: 'nhom', campusId: 'cs1', classId: 'c1', anh: '',
    congBoLuc: null, nguoiDang: '',   // CỐ Ý còn là nháp, chưa công bố
    taoLuc: luc(daysAgo(1), 11), capNhatLuc: luc(daysAgo(1), 11),
  });

  // ---- GHI NHANH ----------------------------------------------------------
  // Hai bản chưa ai chép sang Hành trình — đúng thứ nút "chép sang quan sát"
  // cần có để bấm thử.
  them('thuchup_ghinhanh', {
    id: ma('gn'), studentId: 's5', file: null,
    note: 'Khánh Vy tự cài được hai cúc áo khoác, cúc thứ ba nhờ cô.',
    giay: 14.2, ngoaiTuyen: 0, choBaoLau: null,
    taoLuc: luc(ngayHoc[0], 9, 15), nhanLuc: luc(ngayHoc[0], 9, 15), byTeacherId: 't1',
  });
  them('thuchup_ghinhanh', {
    id: ma('gn'), studentId: 's6', file: null,
    note: 'Gia Bảo rủ bạn cùng bê chậu cây ra sân, hai bạn bê được tới nơi.',
    giay: 11.8, ngoaiTuyen: 1, choBaoLau: 2340,   // ghi lúc mất sóng, gửi lên sau
    taoLuc: luc(ngayHoc[0], 10, 40), nhanLuc: luc(ngayHoc[0], 11, 19), byTeacherId: 't1',
  });

  // ---- BÁO CÁO HỌC TẬP ----------------------------------------------------
  //
  // BỐN MẪU DỰNG THEO ĐÚNG BẢY TỆP NHÀ TRƯỜNG GỬI NGÀY 30/08.
  //
  // Vì sao sinh sẵn thay vì để trường tự gõ từ màn trắng: mẫu là thứ dài nhất
  // trong cả phân hệ này — riêng báo cáo học kỳ 0–3 đã hơn sáu chục dòng tiêu
  // chí. Bắt người của trường ngồi gõ lại từ đầu để xem thử phân hệ có dùng
  // được không là bảo đảm họ không xem tới cuối.
  //
  // Đây là ĐIỂM XUẤT PHÁT, không phải bản chốt: mọi dòng đều sửa được ở
  // Quản trị → Báo cáo học tập → Mẫu báo cáo. Danh sách tiêu chí là thứ nhà
  // trường sẽ còn sửa mỗi năm học, theo chương trình của chính họ.
  function mauBaoCao(loai, ten, tuThang, denThang, dong) {
    const mauId = ma('bcm');
    them('baocaohoctap_mau', {
      id: mauId, loai, ten, tuThang, denThang, active: 1,
      taoLuc: luc(daysAgo(20), 8), capNhatLuc: luc(daysAgo(20), 8),
    });
    dong.forEach((d, i) => them('baocaohoctap_dong', {
      id: ma('bcd'), mauId,
      nhom: d[0] || '', nhomEn: d[1] || '', tieuDe: d[2], tieuDeEn: d[3] || '',
      kieu: d[4] || 'chu', gocLinhVuc: d[5] || '', thuTu: i,
    }));
    return mauId;
  }

  const I_TU_PHUC_VU = ['I. KỸ NĂNG TỰ PHỤC VỤ', 'INDEPENDENCE SKILLS'];
  const II_NHAN_THUC = ['II. PHÁT TRIỂN NHẬN THỨC', 'COGNITIVE DEVELOPMENT'];
  const III_XA_HOI = ['III. PHÁT TRIỂN NGÔN NGỮ, TƯƠNG TÁC XÃ HỘI', 'LANGUAGE AND SOCIAL SKILLS'];
  const IV_THE_CHAT = ['IV. GIÁO DỤC THỂ CHẤT', 'PHYSICAL EDUCATION'];

  // Báo cáo tháng lứa nhà trẻ — bốn lĩnh vực nhận thức.
  mauBaoCao('thang', 'Báo cáo tháng (0–3)', 0, 36, [
    [...I_TU_PHUC_VU, 'Lưu ý', 'Note'],
    [...II_NHAN_THUC, 'Lĩnh vực Thực hành cuộc sống', 'Practical life', 'chu', 'thuc-hanh-cuoc-song'],
    [...II_NHAN_THUC, 'Lĩnh vực Giác quan', 'Sensory', 'chu', 'giac-quan'],
    [...II_NHAN_THUC, 'Lĩnh vực Ngôn ngữ', 'Language', 'chu', 'tieng-viet'],
    [...II_NHAN_THUC, 'Lĩnh vực khác', 'Other areas', 'chu', 'toan'],
    [...III_XA_HOI, 'Ngôn ngữ giao tiếp', 'Communicative'],
    [...III_XA_HOI, 'Khả năng tương tác', 'Interaction skills'],
    [...III_XA_HOI, 'Tự tin', 'Confidence'],
    [...IV_THE_CHAT, 'Lưu ý', 'Note'],
  ]);

  // Báo cáo tháng lứa mẫu giáo — thêm Tiếng Anh, Văn hoá, Toán học.
  mauBaoCao('thang', 'Báo cáo tháng (3–6)', 36, 72, [
    [...I_TU_PHUC_VU, 'Lưu ý', 'Note'],
    [...II_NHAN_THUC, 'Lĩnh vực Thực hành cuộc sống', 'Practical life', 'chu', 'thuc-hanh-cuoc-song'],
    [...II_NHAN_THUC, 'Lĩnh vực Giác quan', 'Sensory', 'chu', 'giac-quan'],
    [...II_NHAN_THUC, 'Lĩnh vực ngôn ngữ: Tiếng Việt', 'Language: Vietnamese', 'chu', 'tieng-viet'],
    [...II_NHAN_THUC, 'Lĩnh vực ngôn ngữ: Tiếng Anh', 'Language: English', 'chu', 'cambridge'],
    [...II_NHAN_THUC, 'Lĩnh vực văn hoá', 'Culture', 'chu', 'van-hoa'],
    [...II_NHAN_THUC, 'Lĩnh vực toán học', 'Maths', 'chu', 'toan'],
    [...III_XA_HOI, 'Ngôn ngữ giao tiếp', 'Communicative'],
    [...III_XA_HOI, 'Khả năng tương tác', 'Interaction skills'],
    [...III_XA_HOI, 'Tự tin', 'Confidence'],
    [...IV_THE_CHAT, 'Lưu ý', 'Note'],
  ]);

  // Báo cáo 6 tháng — kiểu bảng chọn mức, sáu nhóm lĩnh vực.
  const XH = ['PHÁT TRIỂN VỀ MẶT XÃ HỘI VÀ CẢM XÚC', 'SOCIAL AND EMOTIONAL DEVELOPMENT'];
  const THCS = ['THỰC HÀNH CUỘC SỐNG', 'PRACTICAL LIFE'];
  const GQ = ['GIÁC QUAN', 'SENSORIAL'];
  const VH = ['VĂN HOÁ', 'CULTURE'];
  const NN = ['NGÔN NGỮ', 'LANGUAGE'];
  const TOAN = ['TOÁN', 'MATHEMATICS'];
  mauBaoCao('hocky', 'Báo cáo 6 tháng (0–3)', 0, 36, [
    [...XH, 'Có tinh thần trách nhiệm', 'Accepts responsibilities', 'muc'],
    [...XH, 'Tự tin thử những điều mới mẻ', 'Confident to try something new', 'muc'],
    [...XH, 'Có thể thực hiện theo lịch trình của nhà trường', 'Able to follow school routine', 'muc'],
    [...XH, 'Có thể yêu cầu trợ giúp khi cần', 'Able to ask for help when needed', 'muc'],
    [...XH, 'Tập trung trong giờ hoạt động nhóm', 'Able to give attention in a group setting', 'muc'],
    [...XH, 'Làm việc và vui chơi hoà thuận với các bạn', 'Works and plays cooperatively with peers', 'muc'],
    [...XH, 'Biết nói "cảm ơn" và "làm ơn" đúng lúc', 'Uses please and thank you appropriately', 'muc'],
    [...THCS, 'Vận động thô phù hợp với lứa tuổi', 'Age-appropriate large motor control', 'muc'],
    [...THCS, 'Vận động tinh phù hợp với lứa tuổi', 'Age-appropriate fine motor control', 'muc'],
    [...THCS, 'Tự lập trong việc chăm sóc bản thân', 'Independent care of self', 'muc'],
    [...GQ, 'Giáo cụ thị giác — ba màu cơ bản', 'Visual materials: three primary colors', 'muc', 'giac-quan'],
    [...GQ, 'Giáo cụ thị giác — ba hình học cơ bản', 'Visual materials: basic shapes', 'muc', 'giac-quan'],
    [...GQ, 'Khái niệm to — nhỏ', 'Concept: big and small', 'muc', 'giac-quan'],
    [...GQ, 'Khái niệm nặng — nhẹ', 'Concept: heavy and light', 'muc', 'giac-quan'],
    [...VH, 'Giáo cụ động vật học — tên gọi con vật', 'Zoology: appellation', 'muc'],
    [...VH, 'Giáo cụ thực vật học — tên gọi hoa, quả, cây', 'Botany: appellation', 'muc'],
    [...VH, 'Thích thú với các bài học khoa học và khám phá', 'Enjoys science and exploration', 'muc'],
    [...NN, 'Thích nghe kể chuyện, đọc sách và thơ', 'Listens actively to stories and books', 'muc', 'tieng-viet'],
    [...NN, 'Nghe hiểu và làm theo hướng dẫn của cô', 'Listens to and follows instructions', 'muc', 'tieng-viet'],
    [...NN, 'Nhận biết và gọi tên đồ vật xung quanh', 'Recognizes and names objects', 'muc', 'tieng-viet'],
    [...TOAN, 'Nhận biết biểu tượng số 1–5', 'Recognizes symbols 1–5', 'muc', 'toan'],
    [...TOAN, 'Đếm được từ 1 đến 5', 'Able to count 1–5', 'muc', 'toan'],
    [...TOAN, 'Nối được số và lượng', 'Able to match numerals and quantities', 'muc', 'toan'],
  ]);

  // Bản đánh giá môn thể chất — đi kèm bộ báo cáo 6 tháng.
  const KNBT = ['KỸ NĂNG BẢN THÂN', ''];
  const HOUSE = ['KỸ NĂNG VẬN ĐỘNG THEO HOUSE, ĐỘI', ''];
  const THAIDO = ['THÁI ĐỘ HỌC TẬP', ''];
  mauBaoCao('hocky', 'Bản đánh giá môn thể chất (3–6)', 36, 72, [
    [...KNBT, 'Thực hiện động tác, kỹ thuật của bài học theo hướng dẫn của cô', '', 'muc'],
    [...KNBT, 'Tính kiên trì và kỉ luật', '', 'muc'],
    [...KNBT, 'Phát triển sự nhanh nhẹn cơ thể', '', 'muc'],
    [...KNBT, 'Phát triển thể lực', '', 'muc'],
    [...KNBT, 'Kỹ năng vận động, di chuyển', '', 'muc'],
    [...KNBT, 'Kỹ năng phản xạ, tư duy', '', 'muc'],
    [...KNBT, 'Kỹ năng bật xa, bật cao', '', 'muc'],
    [...KNBT, 'Kỹ năng chạy, nhảy', '', 'muc'],
    [...KNBT, 'Rèn luyện sức bền', '', 'muc'],
    [...KNBT, 'Sẵn sàng tham gia những bài học và trải nghiệm mới', '', 'muc'],
    [...HOUSE, 'Giúp đỡ nhau khi thực hành theo house, đội', '', 'muc'],
    [...HOUSE, 'Nhận biết được tên house', '', 'muc'],
    [...HOUSE, 'Phát triển tinh thần đội, nhóm', '', 'muc'],
    [...THAIDO, 'Hứng thú và yêu thích giờ vận động', '', 'muc'],
    [...THAIDO, 'Tích cực tham gia vận động', '', 'muc'],
  ]);

  // ---- HỌC PHÍ ------------------------------------------------------------
  // Phân hệ này còn nguyên bản mẫu của app 1 và đang TẮT. Vẫn sinh vài dòng để
  // ai bật lên xem thử không gặp màn trắng.
  for (const sid of ['s1', 's3', 's4']) {
    them('hocphi_khoan', {
      id: ma('hp'), studentId: sid, kyThu: `Tháng ${Number(THANG_NAY.slice(5)) }/${THANG_NAY.slice(0, 4)}`,
      noiDung: 'Học phí và tiền ăn tháng này', soTien: 4500000,
      hanNop: fmt(daysAhead(5)), daNop: sid === 's1' ? 1 : 0,
      ngayNop: sid === 's1' ? fmt(daysAgo(2)) : null,
      ghiChu: '', taoBoi: '', taoLuc: luc(daysAgo(10), 8),
    });
  }

  return stats;
}

function sinhDuLieuPhanHe(db, moc) {
  dungBangPhanHe(db);
  let stats = {};
  db.tx(() => {
    xoaBangPhanHe(db);
    stats = sinh(db, moc);
  });
  return stats;
}

// ---------------------------------------------------------------------------

function generate() {
  const today = new Date(MOC);
  const YEAR = today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1; // năm học bắt đầu tháng 8
  const schoolYear = `${YEAR}-${YEAR + 1}`;

  const school = {
    name: 'Trường Mầm non CASA',
    address: 'Cơ sở 1 — 25 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM',
    phone: '028 3844 5566',
    email: 'lienhe@casamamnon.edu.vn',
    years: [`${YEAR - 1}-${YEAR}`, schoolYear],
    currentYear: schoolYear,
  };

  // Ba cơ sở thật của trường. Số điện thoại và email ở đây là HOTLINE VĂN PHÒNG
  // của từng cơ sở — thứ phụ huynh cần khi có việc gấp, và cũng là thứ thay chỗ
  // cho số điện thoại riêng của cô trên màn hình hồ sơ bé.
  const campuses = [
    { id: 'cs1', name: 'Cơ sở 1', address: '25 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM',
      phone: '028 3844 5566', email: 'coso1@casamamnon.edu.vn' },
    { id: 'cs2', name: 'Cơ sở 2', address: '112 Nguyễn Thị Minh Khai, Q. 3, TP.HCM',
      phone: '028 3844 5577', email: 'coso2@casamamnon.edu.vn' },
    { id: 'cs3', name: 'Cơ sở 3', address: '48 Phan Xích Long, Q. Phú Nhuận, TP.HCM',
      phone: '028 3844 5588', email: 'coso3@casamamnon.edu.vn' },
  ];

  // Tên nhóm đi theo bậc mầm non (Nhà trẻ → Mầm → Chồi → Lá), số phía sau là
  // nhóm song song thứ mấy trong cùng bậc — KHÔNG phải khối lớp. `grade` giữ
  // lại tuổi của bậc cho những màn hình cũ còn đọc.
  //
  // Câu chuyện của bộ dữ liệu mẫu nằm ở CƠ SỞ 1 (bé An, nhóm Chồi 2). Nhóm
  // Mầm 1 ở cơ sở 2 tồn tại để phép thử "cơ sở A không thấy cơ sở B" có thật
  // hai cơ sở mà so — một tính năng cách ly mà dữ liệu mẫu chỉ có một cơ sở thì
  // không bài kiểm thử nào chứng minh được.
  const classes = [
    { id: 'c1', name: 'Chồi 2', teacherId: 't1', teacherIds: ['t1', 't3'], campusId: 'cs1', room: 'Cơ sở 1 — Phòng Hoa Sen', grade: 4, year: schoolYear },
    { id: 'c2', name: 'Lá 1', teacherId: 't2', teacherIds: ['t2', 't3'], campusId: 'cs1', room: 'Cơ sở 1 — Phòng Hướng Dương', grade: 5, year: schoolYear },
    { id: 'c3', name: 'Mầm 1', teacherId: null, teacherIds: [], campusId: 'cs2', room: 'Cơ sở 2 — Phòng Hoa Mai', grade: 3, year: schoolYear },
    { id: 'c4', name: 'Nhà trẻ 1', teacherId: 't4', teacherIds: ['t4'], campusId: 'cs1', room: 'Cơ sở 1 — Phòng Búp Sen', grade: 1, year: schoolYear },
  ];

  // Các tài khoản mẫu dùng chung một mật khẩu nên chỉ cần băm một lần.
  // Mật khẩu không bao giờ được lưu ở dạng đọc được.
  const DEMO_HASH = password.hash(DEMO_PASSWORD);

  // Ba cô, hai nhóm — và cô Bích Ngọc phụ trách CẢ HAI nhóm. Đó là mô hình thật
  // của trường mầm non, và cũng là thứ dữ liệu mẫu cũ (một cô một lớp) không kể
  // được: xem G0.4 trong docs/TIEN-DO.md.
  const users = [
    { id: 't1', username: 'giaovien', passwordHash: DEMO_HASH, role: 'teacher', name: 'Nguyễn Thị Mai Anh', title: 'Cô', phone: '0903 111 222', email: 'maianh@casamamnon.edu.vn', classId: 'c1', avatar: { emoji: '👩‍🏫', bg: '#7c5cbf' } },
    { id: 't2', username: 'giaovien2', passwordHash: DEMO_HASH, role: 'teacher', name: 'Trần Thu Hương', title: 'Cô', phone: '0903 333 444', email: 'thuhuong@casamamnon.edu.vn', classId: 'c2', avatar: { emoji: '👩‍🏫', bg: '#2980b9' } },
    { id: 't3', username: 'giaovien3', passwordHash: DEMO_HASH, role: 'teacher', name: 'Lê Thị Bích Ngọc', title: 'Cô', phone: '0903 555 666', email: 'bichngoc@casamamnon.edu.vn', classId: null, avatar: { emoji: '👩‍🏫', bg: '#16a085' } },
    { id: 'p1', username: 'phuhuynh', passwordHash: DEMO_HASH, role: 'parent', name: 'Lê Thị Thu Hà', title: 'Chị', phone: '0912 345 678', email: 'thuha@gmail.com', avatar: { emoji: '👩', bg: '#e0576f' } },
    { id: 'p2', username: 'phuhuynh2', passwordHash: DEMO_HASH, role: 'parent', name: 'Phạm Quốc Bảo', title: 'Anh', phone: '0987 654 321', email: 'quocbao@gmail.com', avatar: { emoji: '👨', bg: '#27ae60' } },
    { id: 'p3', username: 'ph.tuan', passwordHash: DEMO_HASH, role: 'parent', name: 'Vũ Anh Tuấn', title: 'Anh', phone: '0909 100 300', email: 'anhtuan@gmail.com', avatar: { emoji: '👨', bg: '#d68910' } },
    { id: 'p4', username: 'ph.lan', passwordHash: DEMO_HASH, role: 'parent', name: 'Đỗ Ngọc Lan', title: 'Chị', phone: '0909 200 400', email: 'ngoclan@gmail.com', avatar: { emoji: '👩', bg: '#16a085' } },
    { id: 'p5', username: 'ph.minh', passwordHash: DEMO_HASH, role: 'parent', name: 'Hoàng Nhật Minh', title: 'Anh', phone: '0909 500 600', email: 'nhatminh@gmail.com', avatar: { emoji: '👨', bg: '#8e44ad' } },
    { id: 'p6', username: 'ph.huong', passwordHash: DEMO_HASH, role: 'parent', name: 'Bùi Thu Hương', title: 'Chị', phone: '0909 700 800', email: 'thuhuong@gmail.com', avatar: { emoji: '👩', bg: '#c0392b' } },
    { id: 't4', username: 'giaovien4', passwordHash: DEMO_HASH, role: 'teacher', name: 'Phạm Thị Hồng', title: 'Cô', phone: '0903 777 888', email: 'thihong@casamamnon.edu.vn', classId: 'c4', avatar: { emoji: '👩‍🏫', bg: '#e67e22' } },
    { id: 'p7', username: 'ph.trang', passwordHash: DEMO_HASH, role: 'parent', name: 'Ngô Thùy Trang', title: 'Chị', phone: '0909 111 555', email: 'thuytrang@gmail.com', avatar: { emoji: '👩', bg: '#9b59b6' } },
    { id: 'p8', username: 'ph.duy', passwordHash: DEMO_HASH, role: 'parent', name: 'Lý Khánh Duy', title: 'Anh', phone: '0909 222 666', email: 'khanhduy@gmail.com', avatar: { emoji: '👨', bg: '#34495e' } },
    { id: 'p9', username: 'ph.nga', passwordHash: DEMO_HASH, role: 'parent', name: 'Trịnh Hồng Nga', title: 'Chị', phone: '0909 333 777', email: 'hongnga@gmail.com', avatar: { emoji: '👩', bg: '#1abc9c' } },
  ];

  // Trung tâm của cả bộ dữ liệu mẫu là BÉ AN — nhóm Chồi 2, cơ sở 1. Bé xuất
  // hiện xuyên suốt: điểm danh, nhận xét, dặn thuốc, album, tin nhắn, đơn xin
  // nghỉ. Anh của bé (bé Nam) học nhóm Lá 1, cùng một mẹ — nhờ vậy màn hình
  // "đổi con đang xem" của phụ huynh có thật sự hai bé để đổi.
  //
  // Tuổi khớp với bậc: Chồi 2 là 4–5 tuổi, Lá 1 là 5–6 tuổi.
  // Ngày sinh của một bé đúng N tháng tuổi tính từ hôm nay.
  //
  // Lứa nhà trẻ phải giữ đúng số tháng dù dữ liệu mẫu chạy vào lúc nào: một bé
  // ghi cứng "sinh 2024-06" thì sang năm sau thành 26 tháng, và bài canh mốc
  // 36 tháng sẽ đổi kết quả mà không ai đụng vào mã.
  // NGÀY TRONG THÁNG PHẢI SUY TỪ HÔM NAY, KHÔNG ĐƯỢC GHIM CỨNG.
  //
  // Bản cũ ghim ngày 12. Nó đúng vào ngày 12 trở đi của tháng, và SAI MỘT
  // THÁNG vào mùng 1 đến 11: lùi 14 tháng từ mùng 1 tháng 9 ra "12 tháng 7",
  // muộn hơn mùng 1 tháng 7 mười một ngày, nên bé đọc ra 13 tháng chứ không
  // phải 14. Bài canh mốc 36 tháng cũng lệch theo, và cả hai chỉ đỏ vào 11
  // ngày đầu mỗi tháng — kiểu hỏng chờ đúng ngày trường cài máy mới nổ.
  //
  // Nay lùi n tháng từ chính ngày hôm nay rồi lùi thêm 3 ngày, nên bé luôn
  // hơn n tháng từ 3 đến 9 ngày: không bao giờ đứng ngay mốc, cũng không bao
  // giờ tràn sang tháng kế. Ghim ngày ở mức tối đa 25 để tháng 28 hay 30
  // ngày không bị tràn.
  function thangTruoc(n) {
    const ngayTrongThang = Math.min(today.getUTCDate(), 25);
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - n, ngayTrongThang));
    d.setUTCDate(d.getUTCDate() - 3);
    return d.toISOString().slice(0, 10);
  }

  const namChoi = YEAR - 4;   // các bé nhóm Chồi sinh năm này
  const namLa = YEAR - 5;     // các bé nhóm Lá
  const students = [
    { id: 's1', name: 'Nguyễn Bảo An', dob: `${namChoi}-04-12`, gender: 'Nữ', classId: 'c1', parentIds: ['p1'], avatar: { emoji: '👧', bg: '#3f6ad8' }, address: '12 Hoa Phượng, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Không', code: `MN${namChoi}041` },
    { id: 's2', name: 'Nguyễn Bảo Nam', dob: `${namLa}-09-03`, gender: 'Nam', classId: 'c2', parentIds: ['p1'], avatar: { emoji: '👦', bg: '#e0576f' }, address: '12 Hoa Phượng, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Tôm, cua', code: `MN${namLa}093` },
    { id: 's3', name: 'Phạm Gia Hân', dob: `${namChoi}-01-25`, gender: 'Nữ', classId: 'c1', parentIds: ['p2'], avatar: { emoji: '👧', bg: '#27ae60' }, address: '45 Trường Sa, Q. Bình Thạnh', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: `MN${namChoi}012` },
    { id: 's4', name: 'Vũ Đức Anh', dob: `${namChoi}-07-19`, gender: 'Nam', classId: 'c1', parentIds: ['p3'], avatar: { emoji: '🧒', bg: '#d68910' }, address: '78 Phan Xích Long, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Đậu phộng', code: `MN${namChoi}071` },
    { id: 's5', name: 'Đỗ Khánh Vy', dob: `${namChoi}-11-08`, gender: 'Nữ', classId: 'c1', parentIds: ['p4'], avatar: { emoji: '👧', bg: '#16a085' }, address: '102 Nguyễn Kiệm, Q. Gò Vấp', ethnicity: 'Kinh', bloodType: 'AB', allergies: 'Không', code: `MN${namChoi}118` },
    { id: 's6', name: 'Hoàng Gia Bảo', dob: `${namChoi}-03-30`, gender: 'Nam', classId: 'c1', parentIds: ['p5'], avatar: { emoji: '👦', bg: '#8e44ad' }, address: '5 Đặng Văn Ngữ, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Không', code: `MN${namChoi}033` },
    { id: 's7', name: 'Bùi Minh Thư', dob: `${namLa}-05-16`, gender: 'Nữ', classId: 'c2', parentIds: ['p6'], avatar: { emoji: '👧', bg: '#c0392b' }, address: '210 Lê Văn Sỹ, Q.3', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Sữa bò', code: `MN${namLa}051` },
    { id: 's8', name: 'Vũ Hải Đăng', dob: `${namLa}-12-01`, gender: 'Nam', classId: 'c2', parentIds: ['p3'], avatar: { emoji: '👦', bg: '#2c3e50' }, address: '78 Phan Xích Long, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: `MN${namLa}121` },
    // NHÓM NHÀ TRẺ — ba bé nhỏ nhất trường.
    //
    // Trường nhận bé từ 12 tháng, nhưng dữ liệu mẫu cũ toàn bé 4–6 tuổi. Nghĩa
    // là phần app dành riêng cho lứa nhỏ nhất — thay bỉm, bú bình, cách nói
    // tuổi bằng THÁNG thay vì bằng năm — không có bé nào chạm tới, và bài kiểm
    // thử nào cũng phải tự dựng tình huống. Ba bé dưới đây làm cho lứa đó có
    // thật trong dữ liệu mẫu.
    //
    // Ngày sinh tính LÙI TỪ HÔM NAY chứ không theo năm cố định: bé phải luôn
    // đúng 14 / 34 / 38 tháng dù chạy dữ liệu mẫu vào lúc nào.
    //
    // BÉ KHÔI 38 THÁNG NẰM TRONG NHÓM NHÀ TRẺ LÀ CỐ Ý. Bé vừa qua mốc 36 tháng
    // giữa năm học, và trường thì không chuyển nhóm cho bé giữa chừng — chuyện
    // rất thường. Nhờ có bé đó mà chứng minh được app quyết định hiện ô thay
    // bỉm theo NGÀY SINH của từng bé, không theo tên nhóm bé đang học.
    { id: 's9', name: 'Ngô Gia Huy', dob: thangTruoc(14), gender: 'Nam', classId: 'c4', parentIds: ['p7'], avatar: { emoji: '👶', bg: '#9b59b6' }, address: '33 Nguyễn Đình Chiểu, Q.1', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Không', code: `MN${YEAR}201` },
    { id: 's10', name: 'Lý Bảo Ngọc', dob: thangTruoc(34), gender: 'Nữ', classId: 'c4', parentIds: ['p8'], avatar: { emoji: '👶', bg: '#34495e' }, address: '17 Cách Mạng Tháng 8, Q.3', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Không', code: `MN${YEAR}202` },
    { id: 's11', name: 'Trịnh Minh Khôi', dob: thangTruoc(38), gender: 'Nam', classId: 'c4', parentIds: ['p9'], avatar: { emoji: '🧒', bg: '#1abc9c' }, address: '88 Điện Biên Phủ, Q. Bình Thạnh', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: `MN${YEAR}203` },
  ];

  // ---- Điểm danh: 20 ngày học gần nhất ----
  const attendance = [];
  let attId = 1;
  const days = recentWeekdays(20);
  students.forEach((s, si) => {
    days.forEach((d, di) => {
      // hôm nay: nhóm Chồi 2 đã điểm danh, nhóm Lá 1 chưa
      if (di === 0 && s.classId === 'c2') return;
      let status = 'present';
      if ((di + si) % 11 === 5) status = 'late';
      if ((di * 3 + si) % 17 === 8) status = 'absent_excused';
      const rec = {
        id: 'att_' + attId++,
        studentId: s.id,
        date: fmt(d),
        status,
        checkIn: status === 'present' ? `07:${String(15 + ((di + si * 7) % 30)).padStart(2, '0')}` : status === 'late' ? '08:05' : null,
        checkOut: status === 'absent_excused' ? null : (di === 0 ? null : '16:30'),
        note: status === 'absent_excused' ? 'Nghỉ có phép (gia đình xin phép)' : status === 'late' ? 'Gia đình đưa bé tới muộn' : '',
        markedBy: coCuaNhom(s.classId),
      };
      attendance.push(rec);
    });
  });

  // ---- Xin phép nghỉ học ----
  const leaveRequests = [
    { id: 'lv_1', studentId: 's1', parentId: 'p1', fromDate: fmt(daysAhead(1)), toDate: fmt(daysAhead(1)), reason: 'Gia đình có việc riêng, xin phép cho con nghỉ 1 ngày.', status: 'pending', createdAt: iso(daysAgo(0), 8, 30), reviewedBy: null, reviewNote: '' },
    { id: 'lv_2', studentId: 's1', parentId: 'p1', fromDate: fmt(daysAgo(9)), toDate: fmt(daysAgo(8)), reason: 'Con bị sốt nhẹ, gia đình cho con ở nhà theo dõi.', status: 'approved', createdAt: iso(daysAgo(10), 20, 15), reviewedBy: 't1', reviewNote: 'Cô đã nhận thông tin. Chúc con mau khỏe!' },
    { id: 'lv_3', studentId: 's3', parentId: 'p2', fromDate: fmt(daysAgo(4)), toDate: fmt(daysAgo(4)), reason: 'Con về quê cùng gia đình một hôm.', status: 'approved', createdAt: iso(daysAgo(6), 19, 0), reviewedBy: 't1', reviewNote: 'Cô đã nhận thông tin ạ. Gia đình đi đường cẩn thận nhé.' },
    { id: 'lv_4', studentId: 's2', parentId: 'p1', fromDate: fmt(daysAgo(15)), toDate: fmt(daysAgo(15)), reason: 'Xin cho con nghỉ buổi chiều đi tiêm nhắc mũi cúm.', status: 'rejected', createdAt: iso(daysAgo(16), 9, 45), reviewedBy: 't2', reviewNote: 'Chiều đó nhóm có buổi làm quen với cô lớp 1, cô mong gia đình đổi lịch tiêm giúp ạ.' },
  ];

  // ---- Thực đơn bữa ăn ở trường: tuần này + tuần sau ----
  const breakfasts = [
    ['Phở bò', 'Sữa tươi'], ['Bánh mì ốp la', 'Sữa đậu nành'], ['Xôi gà', 'Nước cam'],
    ['Bún riêu cua', 'Sữa chua'], ['Hủ tiếu Nam Vang', 'Sữa tươi'], ['Cháo gà cà rốt', 'Chuối'],
    ['Bánh cuốn chả', 'Sữa tươi'], ['Mì Quảng gà', 'Dưa hấu'], ['Nui xào bò', 'Sữa chua uống'], ['Bánh giò', 'Nước ép táo'],
  ];
  const lunches = [
    ['Cơm trắng', 'Gà kho gừng', 'Canh bí đỏ nấu tôm', 'Rau muống xào tỏi', 'Dưa hấu'],
    ['Cơm trắng', 'Cá basa kho tộ', 'Canh chua cá lóc', 'Cải thìa xào nấm', 'Chuối'],
    ['Cơm trắng', 'Thịt bò xào thiên lý', 'Canh rau ngót thịt bằm', 'Đậu que xào', 'Nho'],
    ['Cơm trắng', 'Sườn non ram mặn', 'Canh khoai mỡ tôm', 'Bắp cải luộc', 'Thanh long'],
    ['Cơm trắng', 'Trứng chiên thịt bằm', 'Canh mồng tơi cua đồng', 'Su su xào cà rốt', 'Xoài chín'],
    ['Cơm trắng', 'Tôm rim thịt', 'Canh cải xanh cá thác lác', 'Bí xanh luộc', 'Cam'],
    ['Cơm trắng', 'Gà chiên nước mắm', 'Canh chua thơm cà', 'Rau dền luộc', 'Dưa lưới'],
    ['Cơm trắng', 'Thịt kho trứng cút', 'Canh bầu nấu tôm', 'Cải ngọt xào', 'Táo'],
    ['Cơm trắng', 'Cá diêu hồng chiên sốt cà', 'Canh cải bó xôi', 'Mướp xào', 'Chuối'],
    ['Cơm trắng', 'Bò kho cà rốt + bánh mì', 'Canh cải thảo', 'Rau lang luộc', 'Quýt'],
  ];
  const snacks = [
    ['Bánh flan', 'Sữa tươi'], ['Chè đậu xanh'], ['Yaourt trái cây'], ['Bánh bông lan', 'Sữa'],
    ['Súp gà ngô non'], ['Bánh su kem'], ['Chè chuối'], ['Sữa chua nếp cẩm'], ['Bánh da lợn'], ['Trái cây tổng hợp'],
  ];
  const menus = [];
  const monday = mondayOf(today);
  for (let w = 0; w < 2; w++) {
    for (let d = 0; d < 5; d++) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + w * 7 + d);
      const k = w * 5 + d;
      menus.push({
        id: `menu_${w}_${d}`,
        date: fmt(date),
        meals: [
          { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: pick(breakfasts, k) },
          { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: pick(lunches, k) },
          { type: 'snack', label: 'Bữa xế', time: '14:30', items: pick(snacks, k) },
        ],
      });
    }
  }

  // ---- Lịch sinh hoạt một ngày ----
  //
  // Mầm non không có "tiết học" như tiểu học mà có MỐC SINH HOẠT trong ngày, và
  // gia đình quan tâm nhất là mấy giờ con ăn, mấy giờ con ngủ. Cấu trúc dữ liệu
  // của app 1 (khung giờ + việc theo từng mốc) tả được đúng như vậy nên giữ
  // nguyên, chỉ đổi nội dung — không phải tính năng nào cũng cần viết lại.
  const tt = (hoatDong) => hoatDong; // [hoạt động theo mốc giờ]
  const periodTimes = [
    { p: 1, time: '07:00 – 08:00' }, { p: 2, time: '08:00 – 08:30' }, { p: 3, time: '08:30 – 09:15' },
    { p: 4, time: '09:15 – 10:30' }, { p: 5, time: '10:30 – 11:15' }, { p: 6, time: '11:15 – 14:00' }, { p: 7, time: '14:00 – 16:30' },
  ];
  const timetable = [
    {
      classId: 'c1',
      periodTimes,
      days: {
        1: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Khám phá: Trường mầm non của bé', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        2: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Tạo hình: Vẽ và nặn', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Kể chuyện · Trả bé']),
        3: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Âm nhạc: Hát và vận động', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        4: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Làm quen với sách và chữ', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi vận động · Trả bé']),
        5: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Bé tập làm nội trợ', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Nêu gương cuối tuần · Trả bé']),
      },
    },
    {
      classId: 'c2',
      periodTimes,
      days: {
        1: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Khám phá: Nước và hiện tượng tự nhiên', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        2: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Làm quen chữ cái', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Kể chuyện · Trả bé']),
        3: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Làm quen với toán: Đếm và so sánh', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        4: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Tạo hình: Cắt dán', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi vận động · Trả bé']),
        5: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Bé chuẩn bị vào lớp 1', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Nêu gương cuối tuần · Trả bé']),
      },
    },
  ];

  // ---- Nhận xét hằng ngày ----
  // Viết theo QUY TẮC 1: MÔ TẢ điều cô đã thấy, không phán xét con.
  // Câu mở đầu luôn là việc quan sát được, không phải lời khen chung chung.
  const remarkTexts = [
    { content: 'Hôm nay con tự xúc hết bát cơm mà không cần cô nhắc, ngủ trưa một mạch tới 14 giờ.', rating: 'great' },
    { content: 'Giờ chơi góc, con xếp khối gỗ thành một cái cầu rồi cho ô tô chạy qua, làm đi làm lại bốn lần.', rating: 'great' },
    { content: 'Con rủ bạn Gia Hân cùng chơi bán hàng, hai bạn chơi với nhau gần hết giờ hoạt động góc.', rating: 'great' },
    { content: 'Sáng nay con khóc khi mẹ về, cô bế con ra xem cá khoảng năm phút thì con nín và vào chơi cùng các bạn.', rating: 'good' },
    { content: 'Con còn nhờ cô xúc giúp mấy thìa cuối bữa trưa. Cô để con tự xúc trước rồi mới giúp phần còn lại.', rating: 'good' },
    { content: 'Con cất dép vào đúng ô của mình, không cần cô nhắc. Ba hôm nay con đều tự làm việc này.', rating: 'great' },
  ];
  // Lĩnh vực phát triển theo chương trình mầm non — cô gắn SAU khi đã mô tả,
  // và có thể không gắn (QUY TẮC 1: quan sát ≠ đánh giá).
  const skillsPool = [['Tự phục vụ'], ['Nhận thức', 'Sáng tạo'], ['Tình cảm — kỹ năng xã hội'], ['Ngôn ngữ'], ['Thể chất'], ['Thẩm mỹ']];
  const remarks = [];
  let rmId = 1;
  students.forEach((s, si) => {
    recentWeekdays(10).forEach((d, di) => {
      if ((di + si) % 3 === 2) return; // không phải ngày nào cũng có nhận xét
      const t = pick(remarkTexts, di + si);
      remarks.push({
        id: 'rm_' + rmId++,
        studentId: s.id,
        teacherId: coCuaNhom(s.classId),
        date: fmt(d),
        content: t.content,
        rating: t.rating,
        skills: pick(skillsPool, di + si),
        parentSeen: di > 1,
      });
    });
  });

  // ---- Báo cáo học tập ----
  // KHÔNG MỘT ĐIỂM SỐ NÀO trong dữ liệu mẫu — QUY TẮC 4.
  //
  // Cột `score` của bảng `reports` vẫn còn (đó là phân hệ học bạ đời tiểu học,
  // sẽ gỡ ở N3), nhưng nó là cột TÙY CHỌN, nên dữ liệu mẫu để trống và chỉ dùng
  // `level` — một câu mô tả. Người mở app lần đầu phải thấy ngay rằng app này
  // không chấm điểm trẻ; dữ liệu mẫu là thứ họ nhìn trước cả tài liệu.
  // Tên ngắn, đúng cách cô gọi hằng ngày. Tên dài kiểu "Phát triển tình cảm —
  // kỹ năng xã hội" xuống dòng ba lần trên màn hình điện thoại, đẩy nút Lưu ra
  // khỏi tầm tay — thử trên trình duyệt thật mới thấy.
  const linhVucPhatTrien = ['Thể chất', 'Nhận thức', 'Ngôn ngữ', 'Tình cảm — xã hội', 'Thẩm mỹ'];
  const subjectSet3 = linhVucPhatTrien;
  const subjectSet5 = linhVucPhatTrien;
  const evalLevels = [
    'Con làm được, thường xuyên',
    'Con làm được khi có cô gợi ý',
    'Cô đang tiếp tục quan sát thêm',
  ];
  const reports = [];
  students.forEach((s, si) => {
    // Bé nhà trẻ (14–38 tháng) không có "học bạ học kỳ" — sinh học bạ của năm
    // học trước cho một bé 14 tháng là dữ liệu không thể có thật.
    if (s.classId === 'c4') return;
    const subs = s.classId === 'c1' ? subjectSet3 : subjectSet5;
    [`Học kỳ 1 (${YEAR - 1}-${YEAR})`, `Học kỳ 2 (${YEAR - 1}-${YEAR})`].forEach((term, ti) => {
      reports.push({
        id: `rp_${s.id}_${ti}`,
        studentId: s.id,
        term,
        year: `${YEAR - 1}-${YEAR}`,
        subjects: subs.map((name, i) => ({
          name,
          score: null,   // QUY TẮC 4 — không chấm điểm trẻ
          level: pick(evalLevels, si + i + ti),
          comment: '',
        })),
        // Ô "Hạnh kiểm" của học bạ đời tiểu học chỉ nhận 4 mức Tốt/Khá/Trung
        // bình/Cần cố gắng — tức là xếp loại trẻ, đi ngược QUY TẮC 4. Màn hình
        // đó sẽ gỡ ở N3. Chừng nào chưa gỡ, dữ liệu mẫu để MỌI bé cùng một mức
        // để không bé nào bị xếp trên hay dưới bé nào.
        conduct: 'Tốt',
        overall: pick([
          'Con đã quen nền nếp của nhóm, tự phục vụ được phần lớn việc của mình.',
          'Con mạnh dạn hơn hẳn so với đầu năm, chủ động rủ bạn cùng chơi.',
        ], si + ti),
        attendanceSummary: { present: 85 + ((si * 3) % 6), absent: (si + ti) % 3, late: si % 2 },
        // QUY TẮC 5 — mỗi nhận định đi kèm một việc làm được, ở lớp và ở nhà.
        teacherComment: pick([
          'Con tự xúc ăn và tự cất dép được rồi. Ở lớp cô sẽ để con tự lấy nước uống; ở nhà gia đình thử cho con tự xúc bữa tối nhé.',
          'Con thích xếp khối và chơi rất lâu với một thứ. Ở lớp cô sẽ thêm khối vào góc xây dựng; ở nhà, nhà mình thử xếp cốc, xếp hộp cùng con.',
          'Con còn ngại nói trước đông người. Ở lớp cô sẽ mời con kể chuyện trong nhóm nhỏ ba bạn trước; ở nhà gia đình hỏi con "hôm nay con chơi gì" mỗi tối nhé.',
        ], si + ti),
      });
    });
  });

  // ---- Xe buýt ----
  const busRoutes = [
    {
      id: 'bus1', name: 'Tuyến 01 – Phú Nhuận (Cơ sở 1)', plate: '51B-123.45',
      driver: { name: 'Chú Trần Văn Tám', phone: '0918 000 111' },
      monitor: { name: 'Cô Lê Thị Xuân', phone: '0918 000 222' },
      studentIds: ['s1', 's4', 's6'],
      stops: [
        { name: 'Ngã tư Phú Nhuận', pickup: '06:40', dropoff: '17:05' },
        { name: 'Chợ Nguyễn Đình Chiểu', pickup: '06:50', dropoff: '16:55' },
        { name: 'Công viên Gia Định', pickup: '07:00', dropoff: '16:45' },
        { name: 'Trường Mầm non CASA — Cơ sở 1', pickup: '07:15', dropoff: '16:35' },
      ],
      log: [
        { time: iso(today, 6, 38), text: 'Xe bắt đầu đón bé tại Ngã tư Phú Nhuận' },
        { time: iso(today, 7, 12), text: 'Xe đã về tới trường, đủ 3/3 bé, cô đã bàn giao cho lớp' },
      ],
    },
    {
      id: 'bus2', name: 'Tuyến 02 – Bình Thạnh (Cơ sở 1)', plate: '51B-678.90',
      driver: { name: 'Chú Ngô Văn Sáu', phone: '0918 333 444' },
      monitor: { name: 'Cô Phan Mỹ Duyên', phone: '0918 555 666' },
      studentIds: ['s2', 's7'],
      stops: [
        { name: 'Chợ Bà Chiểu', pickup: '06:35', dropoff: '17:10' },
        { name: 'Ngã ba Hàng Xanh', pickup: '06:45', dropoff: '17:00' },
        { name: 'Cầu Thị Nghè', pickup: '06:55', dropoff: '16:50' },
        { name: 'Trường Mầm non CASA — Cơ sở 1', pickup: '07:10', dropoff: '16:35' },
      ],
      log: [
        { time: iso(today, 6, 33), text: 'Xe bắt đầu đón bé tại Chợ Bà Chiểu' },
        { time: iso(today, 7, 8), text: 'Xe đã về tới trường, đủ 2/2 bé, cô đã bàn giao cho lớp' },
      ],
    },
  ];

  // ---- Nề nếp ----
  const conduct = [];
  let cdId = 1;
  // MỌI bản ghi đều `points: 0` — QUY TẮC 4, không xếp hạng trẻ.
  //
  // Phân hệ Nề nếp cộng điểm rồi xếp hạng cả lớp là phần của app 1 tiểu học, sẽ
  // gỡ ở N3. Chừng nào chưa gỡ, dữ liệu mẫu tuyệt đối không được tiếp tay: để
  // điểm bằng 0 hết thì bảng xếp hạng phẳng lì, không bé nào đứng trên bé nào.
  // Nội dung cũng đổi sang MÔ TẢ việc đã thấy thay vì tuyên dương/nhắc nhở.
  const conductItems = [
    { type: 'praise', title: 'Con tự cất dép vào đúng ô', content: 'Sáng nay con vào lớp, tự tháo dép và để vào ô có ảnh của mình, không cần cô nhắc.', points: 0 },
    { type: 'praise', title: 'Con giúp bạn lau bàn sau giờ ăn', content: 'Ăn xong con lấy khăn lau chỗ mình ngồi rồi lau giúp cả chỗ bạn ngồi cạnh.', points: 0 },
    { type: 'reminder', title: 'Con chưa quen chờ tới lượt', content: 'Ở góc xây dựng con muốn lấy khối bạn đang cầm. Cô ngồi xuống cùng hai bạn và hướng dẫn con hỏi mượn.', points: 0 },
    { type: 'praise', title: 'Con kể lại được câu chuyện vừa nghe', content: 'Cuối giờ con kể lại chuyện Ba chú lợn con cho các bạn, nhớ đúng thứ tự.', points: 0 },
    { type: 'reminder', title: 'Con còn ngại rửa tay bằng xà phòng', content: 'Con rửa rất nhanh rồi bỏ đi. Cô rửa cùng con và đếm tới 20, hôm nay con làm theo được.', points: 0 },
  ];
  students.forEach((s, si) => {
    recentWeekdays(15).forEach((d, di) => {
      if ((di * 2 + si) % 7 !== 3) return;
      const it = pick(conductItems, di + si);
      conduct.push({ id: 'cd_' + cdId++, studentId: s.id, date: fmt(d), ...it, byTeacherId: coCuaNhom(s.classId) });
    });
  });

  // ---- Khảo sát ----
  const surveys = [
    {
      id: 'sv1',
      title: 'Khảo sát bữa ăn của bé tại trường',
      description: 'Nhà trường mong nhận được ý kiến của gia đình về bữa ăn của các bé, để bếp điều chỉnh cho hợp khẩu vị lứa tuổi.',
      createdBy: 't1', createdAt: iso(daysAgo(3), 9, 0), deadline: fmt(daysAhead(5)),
      audience: 'all', status: 'open',
      questions: [
        { id: 'q1', text: 'Mức độ hài lòng của gia đình về thực đơn hiện tại?', type: 'choice', options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Chưa hài lòng'] },
        { id: 'q2', text: 'Bé có kể về bữa ăn ở trường khi về nhà không?', type: 'choice', options: ['Thường xuyên', 'Thỉnh thoảng', 'Hiếm khi'] },
        { id: 'q3', text: 'Gia đình muốn bếp bổ sung món nào cho bé?', type: 'text' },
      ],
      responses: [
        { userId: 'p2', studentId: 's3', submittedAt: iso(daysAgo(1), 20, 30), answers: { q1: 'Hài lòng', q2: 'Thường xuyên', q3: 'Mong bếp có thêm món súp và trái cây mềm cho bé dễ ăn.' } },
        { userId: 'p4', studentId: 's5', submittedAt: iso(daysAgo(2), 21, 10), answers: { q1: 'Rất hài lòng', q2: 'Thỉnh thoảng', q3: 'Không có, thực đơn hiện tại rất tốt.' } },
      ],
    },
    {
      id: 'sv2',
      title: 'Đăng ký hoạt động ngoài giờ cho bé',
      description: 'Gia đình cho biết nguyện vọng đăng ký hoạt động ngoài giờ cho bé (Aerobic, Vẽ, Âm nhạc, Bé khéo tay).',
      createdBy: 't1', createdAt: iso(daysAgo(12), 8, 0), deadline: fmt(daysAgo(2)),
      audience: 'all', status: 'closed',
      questions: [
        { id: 'q1', text: 'Gia đình đăng ký hoạt động nào cho bé?', type: 'choice', options: ['Aerobic', 'Vẽ', 'Âm nhạc', 'Bé khéo tay', 'Không đăng ký'] },
        { id: 'q2', text: 'Mấy giờ gia đình đón bé được?', type: 'choice', options: ['16:30', '17:00', '17:30'] },
      ],
      responses: [
        { userId: 'p1', studentId: 's1', submittedAt: iso(daysAgo(10), 19, 0), answers: { q1: 'Âm nhạc', q2: '17:00' } },
        { userId: 'p2', studentId: 's3', submittedAt: iso(daysAgo(9), 18, 30), answers: { q1: 'Vẽ', q2: '16:30' } },
        { userId: 'p3', studentId: 's4', submittedAt: iso(daysAgo(9), 21, 45), answers: { q1: 'Aerobic', q2: '17:30' } },
        { userId: 'p6', studentId: 's7', submittedAt: iso(daysAgo(8), 20, 0), answers: { q1: 'Bé khéo tay', q2: '17:00' } },
      ],
    },
  ];

  // ---- Y tế ----
  const health = [];
  let htId = 1;
  students.forEach((s, si) => {
    health.push(
      // Chiều cao / cân nặng đúng lứa 4–6 tuổi. Số liệu sai lứa tuổi là thứ cô
      // và y tế trường nhận ra ngay, và nhận ra là mất tin vào cả bộ dữ liệu.
      // Nhóm nhà trẻ (c4, 14–38 tháng) phải mang số đo nhà trẻ — 78–90 cm,
      // 10–14 kg — không phải số của bé 5–6 tuổi. Số liệu sai lứa tuổi là thứ
      // cô và y tế trường nhận ra ngay (CLAUDE.md, dòng đầu).
      { id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(40 + si)), type: 'checkup', title: 'Cân đo định kỳ đầu năm', detail: 'Bé ăn ngủ bình thường, răng miệng sạch. Không có gì bất thường.', height: s.classId === 'c4' ? 78 + (si % 5) * 3 : s.classId === 'c1' ? 102 + si : 110 + si, weight: s.classId === 'c4' ? 10 + (si % 5) : s.classId === 'c1' ? 16 + si : 19 + si, vision: 'Bình thường', bmiNote: 'Cân đối theo tuổi' },
      { id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(70 + si)), type: 'vaccination', title: 'Tiêm nhắc vắc-xin Sởi – Rubella', detail: 'Tiêm tại trạm y tế phường, gia đình gửi lại sổ tiêm cho nhà trường. Không phản ứng phụ.' },
    );
    if (si % 3 === 0) {
      health.push({ id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(6)), type: 'incident', title: 'Trầy nhẹ đầu gối khi chơi ngoài trời', detail: 'Bé ngã khi chạy ở sân cỏ, trầy nhẹ đầu gối. Y tế trường rửa sạch và dán băng cá nhân, bé nín ngay và vào chơi tiếp. Cô đã nhắn báo gia đình lúc 09:40.' });
    }
  });

  // ---- Dặn thuốc ----
  const medicineRequests = [
    {
      id: 'md_1', studentId: 's1', parentId: 'p1',
      fromDate: fmt(today), toDate: fmt(daysAhead(1)),
      medicines: [
        { name: 'Siro ho Prospan', dose: '5ml', timing: 'Sau bữa trưa' },
        { name: 'Vitamin C 500mg', dose: '1 viên', timing: 'Sau bữa xế' },
      ],
      note: 'Bé mới hết ho, nhờ cô cho bé uống đúng giờ giúp gia đình. Thuốc để trong ba lô, ngăn trước, có dán tên bé.',
      status: 'received', createdAt: iso(daysAgo(0), 6, 50), confirmedBy: 't1', confirmedAt: iso(daysAgo(0), 7, 40),
      log: [{ time: iso(daysAgo(0), 11, 15), text: 'Cô đã cho bé uống Siro ho Prospan sau bữa trưa' }],
    },
    {
      id: 'md_2', studentId: 's3', parentId: 'p2',
      fromDate: fmt(daysAgo(5)), toDate: fmt(daysAgo(3)),
      medicines: [{ name: 'Men vi sinh Enterogermina', dose: '1 ống', timing: 'Trước bữa trưa 30 phút' }],
      note: 'Bé hơi rối loạn tiêu hóa, bác sĩ kê men vi sinh 3 ngày.',
      status: 'done', createdAt: iso(daysAgo(5), 7, 0), confirmedBy: 't1', confirmedAt: iso(daysAgo(5), 7, 30),
      log: [{ time: iso(daysAgo(3), 11, 0), text: 'Hoàn tất đợt uống thuốc theo dặn của gia đình' }],
    },
  ];

  // ---- Album ảnh (ảnh minh họa bằng gradient + emoji) ----
  const albums = [
    {
      id: 'al1', classId: 'c1', title: 'Ngày hội đến trường của bé ' + schoolYear, date: fmt(daysAgo(25)),
      description: 'Buổi sáng đầu tiên của năm học mới ở nhóm Chồi 2.',
      createdBy: 't1',
      photos: [
        { id: 'ph1', emoji: '🎈', g: ['#ff9a9e', '#fad0c4'], caption: 'Cổng trường rực rỡ cờ hoa' },
        { id: 'ph2', emoji: '🥁', g: ['#a18cd1', '#fbc2eb'], caption: 'Màn trống hội ngày khai trường' },
        { id: 'ph3', emoji: '🧸', g: ['#84fab0', '#8fd3f4'], caption: 'Các bé nhóm Chồi 2 ngày đầu tới lớp' },
        { id: 'ph4', emoji: '🎏', g: ['#ffecd2', '#fcb69f'], caption: 'Thả bóng bay ước mơ' },
        { id: 'ph5', emoji: '🎒', g: ['#89f7fe', '#66a6ff'], caption: 'Bé tự cất ba lô vào ô của mình' },
        { id: 'ph6', emoji: '🤝', g: ['#fddb92', '#d1fdff'], caption: 'Chụp ảnh cùng cô Mai Anh và cô Bích Ngọc' },
      ],
    },
    {
      id: 'al2', classId: 'c1', title: 'Bé tập làm vườn ở góc thiên nhiên', date: fmt(daysAgo(11)),
      description: 'Cả nhóm gieo hạt, tưới cây và quan sát góc thiên nhiên của nhóm suốt hai tuần.',
      createdBy: 't1',
      photos: [
        { id: 'ph7', emoji: '🌱', g: ['#d4fc79', '#96e6a1'], caption: 'Gieo hạt trồng rau' },
        { id: 'ph8', emoji: '🥕', g: ['#fbc2eb', '#a6c1ee'], caption: 'Thu hoạch cà rốt' },
        { id: 'ph9', emoji: '💧', g: ['#fdfbfb', '#ebedee'], caption: 'Bé tự tưới cây mỗi sáng' },
        { id: 'ph10', emoji: '🍅', g: ['#ff9a9e', '#fecfef'], caption: 'Hái cà chua chín' },
        { id: 'ph11', emoji: '😄', g: ['#a1c4fd', '#c2e9fb'], caption: 'Ăn xế ngay ở sân trường' },
      ],
    },
    {
      id: 'al3', classId: 'c2', title: 'Ngày hội vận động của nhóm Lá 1', date: fmt(daysAgo(18)),
      description: 'Các bé nhóm Lá 1 chơi ném vòng, bò chui ống và kéo co cùng cô.',
      createdBy: 't2',
      photos: [
        { id: 'ph12', emoji: '🏃', g: ['#f6d365', '#fda085'], caption: 'Bé bò chui qua ống' },
        { id: 'ph13', emoji: '💪', g: ['#84fab0', '#8fd3f4'], caption: 'Kéo co cùng cô' },
        { id: 'ph14', emoji: '🪀', g: ['#fccb90', '#d57eeb'], caption: 'Trò chơi ném vòng cổ chai' },
        { id: 'ph15', emoji: '🎈', g: ['#e0c3fc', '#8ec5fc'], caption: 'Cả nhóm cùng thả bóng' },
      ],
    },
    {
      id: 'al4', classId: 'c1', title: 'Sinh nhật các bé tháng này', date: fmt(daysAgo(2)),
      description: 'Cả nhóm cùng hát mừng sinh nhật các bé, ăn bánh và chơi trò chơi.',
      createdBy: 't1',
      photos: [
        { id: 'ph16', emoji: '🎂', g: ['#ffd1ff', '#fad0c4'], caption: 'Thổi nến sinh nhật' },
        { id: 'ph17', emoji: '🎁', g: ['#a8edea', '#fed6e3'], caption: 'Bé tự tay tặng quà cho bạn' },
        { id: 'ph18', emoji: '🥳', g: ['#fff1eb', '#ace0f9'], caption: 'Cùng nhau ca hát' },
      ],
    },
  ];

  // ---- Kế hoạch giáo dục ----
  const m0 = today.getUTCMonth() + 1;
  const eduPlans = [
    {
      id: 'ep1', classId: 'c1', month: m0, year: today.getUTCFullYear(),
      theme: 'Trường mầm non của bé',
      goals: ['Bé nhớ tên cô, tên bạn và tên nhóm của mình', 'Bé tự cất ba lô, cất dép vào đúng ô', 'Bé tự xúc ăn và tự uống nước', 'Bé biết rửa tay bằng xà phòng trước khi ăn'],
      weeks: [
        { week: 1, focus: 'Làm quen cô, bạn và các góc chơi', activities: 'Chơi trò gọi tên; cô dẫn bé đi thăm từng góc; tập cất ba lô vào ô có ảnh của mình.' },
        { week: 2, focus: 'Bé tự phục vụ', activities: 'Tập tự xúc ăn; tập rửa tay theo sáu bước, cô đếm cùng bé tới 20; tập tự kéo ghế.' },
        { week: 3, focus: 'Bé chơi cùng bạn', activities: 'Chơi đóng vai bán hàng theo nhóm ba bé; xây nhà bằng khối gỗ; hát và vận động theo nhạc.' },
        { week: 4, focus: 'Nhìn lại một tháng', activities: 'Trưng bày tranh bé vẽ ở góc phụ huynh; cô ghi lại một khoảnh khắc của từng bé để kể cho gia đình.' },
      ],
      note: 'Ở nhà gia đình thử để bé tự xúc bữa tối và tự cất dép nhé — ở lớp bé đang tập đúng hai việc này.',
      createdBy: 't1',
    },
    {
      id: 'ep2', classId: 'c2', month: m0, year: today.getUTCFullYear(),
      theme: 'Bé chuẩn bị vào lớp 1',
      goals: ['Bé ngồi vào bàn làm một việc trong 15 phút', 'Bé nhận ra tên mình khi nhìn thấy chữ', 'Bé tự đi vệ sinh và tự mặc áo khoác', 'Bé kể lại được việc đã xảy ra trong ngày'],
      weeks: [
        { week: 1, focus: 'Ngồi vào bàn và làm cho xong', activities: 'Tô màu theo nét; xâu hạt theo mẫu; cô ngồi cạnh nhắc bé làm nốt phần còn lại.' },
        { week: 2, focus: 'Làm quen mặt chữ', activities: 'Tìm tên mình trong ô đựng đồ; ghép chữ cái đầu của tên; nghe và kể lại chuyện.' },
        { week: 3, focus: 'Bé tự làm việc của mình', activities: 'Tự mặc và cởi áo khoác; tự chuẩn bị chỗ ngủ trưa; tự rót nước.' },
        { week: 4, focus: 'Nhìn lại một tháng', activities: 'Bé kể lại một ngày ở lớp cho cả nhóm nghe; cô ghi lại và gửi về cho gia đình.' },
      ],
      note: 'Buổi tối gia đình thử hỏi bé "hôm nay con chơi gì" và chờ bé kể hết — đó chính là việc nhóm đang tập ở tuần 4.',
      createdBy: 't2',
    },
  ];

  // ---- Thông báo ----
  const notifications = [
    { id: 'nt1', title: 'Thông báo nghỉ Lễ Quốc khánh 2/9', body: 'Nhà trường thông báo lịch nghỉ Lễ Quốc khánh: các bé nghỉ từ ngày 01/09 đến hết ngày 02/09, ngày kế tiếp đón bé bình thường. Kính chúc quý gia đình kỳ nghỉ lễ vui vẻ, an toàn.', category: 'Nhà trường', audience: 'all', createdBy: 't1', createdAt: iso(daysAgo(1), 10, 0), pinned: true, readBy: [] },
    { id: 'nt2', title: 'Thu học phí và tiền ăn tháng này', body: 'Kính mời quý phụ huynh hoàn tất học phí và tiền ăn trước ngày 10. Gia đình có thể chuyển khoản qua tài khoản của trường hoặc đóng trực tiếp tại văn phòng cơ sở 1. Chi tiết từng khoản đã gửi trong mục Học phí của từng bé.', category: 'Học phí', audience: 'all', createdBy: 't1', createdAt: iso(daysAgo(2), 8, 30), pinned: false, readBy: ['p2'] },
    { id: 'nt3', title: 'Nhóm Chồi 2: gửi thêm một bộ quần áo dự phòng', body: 'Tuần này nhóm mình chơi với nước và cát ở sân, cô nhờ gia đình gửi thêm cho bé một bộ quần áo dự phòng để trong ba lô. Cô sẽ thay cho bé ngay khi bé bị ướt ạ.', category: 'Nhóm lớp', audience: 'c1', createdBy: 't1', createdAt: iso(daysAgo(0), 7, 45), pinned: false, readBy: [] },
    { id: 'nt4', title: 'Lịch cân đo định kỳ toàn trường', body: 'Nhà trường phối hợp trạm y tế phường cân đo định kỳ cho các bé vào tuần sau. Gia đình cho bé ăn sáng bình thường trước khi tới lớp, kết quả sẽ hiện trong mục Y tế của từng bé.', category: 'Y tế', audience: 'all', createdBy: 't2', createdAt: iso(daysAgo(4), 15, 20), pinned: false, readBy: ['p1', 'p2'] },
    { id: 'nt5', title: 'Nhóm Lá 1: buổi làm quen với cô giáo lớp 1', body: 'Thứ Sáu tuần này các bé nhóm Lá 1 sẽ sang trường tiểu học bên cạnh, làm quen với cô giáo lớp 1 và ngồi thử vào bàn học. Gia đình cho bé mang giày dễ đi và một chai nước nhé.', category: 'Nhóm lớp', audience: 'c2', createdBy: 't2', createdAt: iso(daysAgo(1), 16, 0), pinned: false, readBy: [] },
  ];

  // ---- Hội thoại nhắn tin ----
  const conversations = [
    {
      id: 'cv1', type: 'direct', participantIds: ['p1', 't1'],
      messages: [
        { id: 'ms1', senderId: 'p1', text: 'Chào cô Mai Anh, tối qua An về khoe tự xúc hết bát cơm ở lớp ạ. Ở nhà cháu vẫn đòi mẹ đút cô ạ.', createdAt: iso(daysAgo(1), 17, 20) },
        { id: 'ms2', senderId: 't1', text: 'Chào chị Hà, đúng rồi ạ. Hai hôm nay bé tự xúc hết, cô không phải nhắc. Chị thử ở nhà để bé tự xúc bữa tối, mình ngồi cạnh chứ đừng đút, khoảng một tuần là bé quen ạ.', createdAt: iso(daysAgo(1), 17, 45) },
        { id: 'ms3', senderId: 'p1', text: 'Dạ em sẽ thử ạ. À cô ơi, mai nhóm mình chơi với nước, em cần gửi thêm gì cho bé không cô?', createdAt: iso(daysAgo(1), 18, 2) },
        { id: 'ms4', senderId: 't1', text: 'Dạ chị gửi thêm một bộ quần áo dự phòng để trong ba lô giúp cô nhé, bé ướt là cô thay ngay ạ.', createdAt: iso(daysAgo(1), 18, 10) },
        { id: 'ms5', senderId: 't1', text: 'Chị Hà ơi, sáng nay cô đã nhận thuốc và cho An uống siro ho sau bữa trưa đúng giờ rồi nhé. Bé ăn hết suất, ngủ trưa ngon, chị yên tâm ạ.', createdAt: iso(daysAgo(0), 12, 30) },
      ],
      lastRead: { p1: iso(daysAgo(1), 18, 12), t1: iso(daysAgo(0), 12, 30) },
    },
    {
      id: 'cv2', type: 'direct', participantIds: ['p1', 't2'],
      messages: [
        { id: 'ms6', senderId: 't2', text: 'Chào chị Hà, chiều nay Nam ngồi tô màu liền một mạch gần 20 phút mới đứng dậy — trước đây bé chỉ ngồi được vài phút. Cô ghi lại để gia đình biết ạ.', createdAt: iso(daysAgo(2), 16, 40) },
        { id: 'ms7', senderId: 'p1', text: 'Dạ em cảm ơn cô Hương ạ. Ở nhà cháu cũng bắt đầu chịu ngồi lâu hơn khi xếp hình ạ.', createdAt: iso(daysAgo(2), 19, 5) },
      ],
      lastRead: { p1: iso(daysAgo(2), 19, 5), t2: iso(daysAgo(2), 19, 6) },
    },
    {
      id: 'cv3', type: 'direct', participantIds: ['p2', 't1'],
      messages: [
        { id: 'ms8', senderId: 'p2', text: 'Cô ơi, tối qua Gia Hân kêu đau bụng một lúc rồi thôi. Mai cô để ý giúp em bữa trưa của bé với ạ.', createdAt: iso(daysAgo(0), 6, 30) },
      ],
      lastRead: { p2: iso(daysAgo(0), 6, 30), t1: iso(daysAgo(3), 8, 0) },
    },
    {
      id: 'cv4', type: 'group', name: 'Nhóm Chồi 2 – Thông tin chung', classId: 'c1',
      participantIds: ['t1', 'p1', 'p2', 'p3', 'p4', 'p5'],
      messages: [
        { id: 'ms9', senderId: 't1', text: 'Cô chào cả nhà nhóm Chồi 2! Thứ Năm tuần này nhóm mình chơi ngoài trời cả buổi sáng, gia đình cho bé đội mũ và mang theo một chai nước nhỏ nhé.', createdAt: iso(daysAgo(2), 9, 0) },
        { id: 'ms10', senderId: 'p3', text: 'Dạ cảm ơn cô đã thông báo ạ.', createdAt: iso(daysAgo(2), 9, 25) },
        { id: 'ms11', senderId: 'p4', text: 'Gia đình em đã nắm thông tin. Cảm ơn cô ạ!', createdAt: iso(daysAgo(2), 10, 12) },
        { id: 'ms12', senderId: 't1', text: 'Cô gửi cả nhà thực đơn tuần mới trên mục Thực đơn của ứng dụng ạ. Gia đình nào có bé dị ứng thức ăn nhắn riêng cho cô để cô báo bếp nhé.', createdAt: iso(daysAgo(0), 8, 15) },
      ],
      lastRead: { t1: iso(daysAgo(0), 8, 15), p1: iso(daysAgo(2), 10, 30), p2: iso(daysAgo(2), 9, 30), p3: iso(daysAgo(2), 9, 25), p4: iso(daysAgo(2), 10, 12), p5: iso(daysAgo(3), 7, 0) },
    },
  ];

  // Hồ sơ mở rộng và người liên hệ khẩn cấp. Cố ý KHÔNG điền cho mọi bé: trường
  // thật cũng không bao giờ đủ 100%, và màn hình phải chịu được ô trống.
  const studentProfiles = [
    { studentId: 's1', soDinhDanh: '079322001234', tienSuBenh: 'Không có gì đặc biệt' },
    { studentId: 's2', soDinhDanh: '079321005678', tienSuBenh: 'Dị ứng tôm cua — nổi mẩn quanh miệng. Hen nhẹ khi trở trời, có ống xịt trong ba lô.' },
    { studentId: 's4', soDinhDanh: '079322009012', tienSuBenh: 'Dị ứng đậu phộng. TUYỆT ĐỐI không cho ăn món có đậu phộng, kể cả dầu.' },
  ];
  // Giấy đồng ý. CỐ Ý dựng đủ ba trạng thái để mọi màn hình và mọi bài canh
  // đều gặp cả ba: đồng ý, từ chối, và chưa thu được giấy.
  //
  // Bé s3 (Phạm Gia Hân) là bé gia đình KHÔNG đồng ý chia sẻ ảnh. Nhờ có bé đó
  // trong nhóm Chồi 2 mà luật ảnh nhóm thật sự chạy trên dữ liệu mẫu, thay vì
  // nằm im vì không có gì để chặn.
  const consents = [
    { studentId: 's1', hoSoHocTap: 1, chiaSeGiaDinh: 1, truyenThong: 0, nguoiKy: 'Lê Thị Thu Hà', ngayKy: `${YEAR}-08-15` },
    { studentId: 's3', hoSoHocTap: 1, chiaSeGiaDinh: 0, truyenThong: 0, nguoiKy: 'Phạm Quốc Bảo', ngayKy: `${YEAR}-08-16`, ghiChu: 'Gia đình xin không đăng ảnh con lên nhóm chung' },
    { studentId: 's4', hoSoHocTap: 1, chiaSeGiaDinh: 1, truyenThong: 1, nguoiKy: 'Vũ Đình Khoa', ngayKy: `${YEAR}-08-15` },
    { studentId: 's5', hoSoHocTap: 1, chiaSeGiaDinh: 1, truyenThong: 0, nguoiKy: 'Đỗ Minh Tuấn', ngayKy: `${YEAR}-08-18` },
    // BÉ s9 LÀ BÉ GIA ĐÌNH ĐÃ DỪNG PHẦN HỒ SƠ HỌC TẬP (ô ①).
    //
    // Cùng lý do như bé s3 ở trên với ô ②: không có một bé như vậy trong dữ
    // liệu mẫu thì chốt chặn của Đ96 nằm im, không màn hình nào và không lượt
    // chạy thử nào đi qua nó lấy một lần. Ô ② vẫn để 1 — gia đình chỉ dừng
    // phần hồ sơ học tập, không nói gì về ảnh nhóm, và app phải phân biệt
    // được hai điều đó.
    { studentId: 's9', hoSoHocTap: 0, chiaSeGiaDinh: 1, truyenThong: 0, nguoiKy: 'Ngô Thùy Trang', ngayKy: `${YEAR}-09-02`, ghiChu: 'Gia đình xin dừng phần hồ sơ học tập, vẫn nhận nhật ký ngày như thường' },
    // s2, s6, s7, s8 chưa nộp giấy — đúng thực tế đầu năm học.
  ];

  // Số CCCD của phụ huynh. Cũng cố ý không đủ: văn phòng thu dần trong năm.
  const userProfiles = [
    { userId: 'p1', soCccd: '079182004321' },
    { userId: 'p3', soCccd: '079185008765' },
  ];
  const emergencyContacts = [
    { studentId: 's1', hoTen: 'Bà Trần Thị Lan', quanHe: 'Bà ngoại', dienThoai: '0909 111 222', ghiChu: 'Ở cùng nhà, đón được bé buổi chiều' },
    { studentId: 's2', hoTen: 'Bà Trần Thị Lan', quanHe: 'Bà ngoại', dienThoai: '0909 111 222', ghiChu: '' },
    { studentId: 's4', hoTen: 'Chú Vũ Đình Nam', quanHe: 'Bác ruột', dienThoai: '0912 333 444', ghiChu: 'Gọi khi không liên lạc được bố mẹ' },
  ];

  const db = {
    school, campuses, classes, users, students, studentProfiles, userProfiles, emergencyContacts,
    consents,
    attendance, leaveRequests, menus, timetable, remarks, reports,
    busRoutes, conduct, surveys, health, medicineRequests, albums, eduPlans,
    notifications, conversations,
  };

  const stats = importSnapshot(db);

  // DỮ LIỆU MẪU CHO TÁM PHÂN HỆ MẦM NON.
  //
  // `importSnapshot` chỉ biết các bảng LÕI, và phải giữ như vậy — phân hệ là
  // thứ cắm thêm được, gỡ ra được. Nhưng nếu dừng ở đó thì bật phân hệ lên là
  // màn nào cũng trắng trơn, trong khi bản kế hoạch chốt "seed kể một câu
  // chuyện nhất quán, mở màn hình nào cũng gặp lại đúng bé đó".
  //
  // Nuốt lỗi ở đây là CÓ CHỦ Ý: gỡ một phân hệ đi thì bảng của nó không còn,
  // và dữ liệu mẫu của phần lõi không được phép chết theo.
  //
  // TẮT ĐƯỢC BẰNG `CASA_SEED_PHAN_HE=0`, VÀ BỘ KIỂM THỬ TẮT SẴN.
  //
  // Mọi bộ test phân hệ đều dựng trên nền "phân hệ này chưa có dòng nào": chúng
  // tự ghi rồi tự đếm. Đổ dữ liệu mẫu vào là hỏng hàng loạt phép kiểm — mà đó
  // là những phép kiểm về ranh giới nháp ↔ đã công bố, về nhà mình ↔ nhà khác,
  // tức đúng chỗ đáng canh nhất.
  //
  // Bẻ dữ liệu mẫu để né từng bài test là sai hướng: nó làm câu chuyện của dữ
  // liệu mẫu méo đi (kế hoạch của bé An phải chuyển sang nhóm khác chỉ vì một
  // bài test), mà vẫn sẽ hỏng lại ở bài test tiếp theo. Tách hai đường thì mỗi
  // đường được là chính nó.
  let statsPhanHe = {};
  try {
    if (process.env.CASA_SEED_PHAN_HE === '0') throw new Error('__bo_qua__');
    const dbThat = require('../lib/db');
    statsPhanHe = sinhDuLieuPhanHe(dbThat, {
      fmt, daysAgo, daysAhead, thuHai: mondayOf,
      HOM_NAY: ngay.homNay(), THANG_NAY: ngay.thangNay(),
    });
  } catch (err) {
    if (err.message !== '__bo_qua__') {
      console.warn(`Không sinh được dữ liệu mẫu cho phân hệ: ${err.message}`);
    }
  }

  const tong = Object.values(stats).reduce((a, b) => a + b, 0);
  const tongPhanHe = Object.values(statsPhanHe).reduce((a, b) => a + b, 0);
  console.log(`Đã sinh dữ liệu mẫu vào cơ sở dữ liệu (${tong.toLocaleString('vi-VN')} bản ghi lõi`
    + `${tongPhanHe ? ` + ${tongPhanHe.toLocaleString('vi-VN')} bản ghi của phân hệ` : ''}).`);
  return db;
}

if (require.main === module) {
  const db = require('../lib/db');
  if (process.argv.includes('--force') || db.isEmpty()) {
    generate();
  } else {
    console.log('Cơ sở dữ liệu đã có dữ liệu — không đụng gì cả.');
    console.log('Muốn XÓA SẠCH và tạo lại dữ liệu mẫu (chạy `npm run backup` trước đã):');
    console.log('  npm run seed -- --force');
  }
  db.close();
}

module.exports = { generate };
