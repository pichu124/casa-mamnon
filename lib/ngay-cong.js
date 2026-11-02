// TÍNH NGÀY CÔNG CỦA CÔ TỪ GIỜ VÀO / GIỜ RA Ở CỔNG.
//
// VÌ SAO LÀ MỘT HÀM THUẦN, ĐỨNG RIÊNG
//
// Giờ vào/ra có ở hai nơi: `staff_checkin` (ảnh chụp ở cổng, bảng lõi) và
// `nhansu_cham_cong` (bảng công của phân hệ Nhân sự). Màn chấm công, bảng công
// tháng và báo cáo xuất Excel đều sẽ cần cùng một câu trả lời cho câu hỏi
// "hôm đó cô được mấy công". Nếu mỗi nơi tự tính thì sớm muộn ba nơi nói ba
// con số khác nhau — và người phát hiện là kế toán lúc trả lương cuối tháng.
// Một hàm không đọc CSDL, không đọc đồng hồ (hôm nay hay không do bên gọi
// nói), nên bài test chạy trong tích tắc và cho cùng kết quả mọi giờ trong ngày.
//
// ĐỊNH DẠNG ĐẦU VÀO
//
// Cả hai bảng đều lưu 'HH:MM' theo giờ Việt Nam (routes/attendance.js cắt
// `nowTime()` còn 5 ký tự trước khi ghi). Nhận thêm 'HH:MM:SS' cho khỏi vấp
// nếu sau này có chỗ ghi đủ giây. Chuỗi không đọc được coi như không có giờ —
// đúng như ô trống trong bảng.

// Quy tắc mặc định của trường. Bên gọi truyền một phần để ghi đè, phần còn lại
// lấy ở đây (vd. chỉ đổi `phutDuDi` mà vẫn giữ nguyên giờ ca).
const QUY_TAC_MAC_DINH = Object.freeze({
  phutDuCong: 480,    // 8 tiếng tính từ lúc vào tới lúc ra
  ca1Tu: '07:00',     // ca sáng
  ca1Den: '14:00',
  ca2Tu: '12:00',     // ca chiều
  ca2Den: '18:00',
  phutDuDi: 0,        // số phút xê dịch được chấp nhận ở mỗi mép ca
});

function doiRaPhut(gio) {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(gio || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const p = Number(m[2]);
  if (h > 23 || p > 59) return null;
  return h * 60 + p;
}

const KHONG_CO = Object.freeze({ trangThai: '', cong: 0, lyDo: '' });

function tinhTuGio(gioVao, gioRa, { laHomNay = false, quyTac } = {}) {
  const q = { ...QUY_TAC_MAC_DINH, ...(quyTac || {}) };
  const vao = doiRaPhut(gioVao);
  const ra = doiRaPhut(gioRa);

  // Không có giờ vào là chưa có dữ liệu gì để nói — không phải "vắng". Nghỉ
  // phép, nghỉ lễ hay quên chụp ở cổng là chuyện Nhân sự ghi riêng.
  if (vao === null) return { ...KHONG_CO };

  // Có vào mà chưa có ra: hôm nay thì cô có thể vẫn đang ở trường, chưa phải
  // lỗi. Ngày đã qua thì cần cô hoặc Nhân sự giải thích (quên chụp lúc về,
  // máy ở cổng hỏng...), chứ không tự trừ công.
  if (ra === null) {
    return laHomNay
      ? { trangThai: 'dang-lam', cong: 0, lyDo: '' }
      : { trangThai: 'can-giai-trinh', cong: 0, lyDo: 'thieu-gio-ra' };
  }

  // Giờ ra sớm hơn giờ vào là dữ liệu sai (sửa tay nhầm, đảo hai ô). Trường
  // không có ca đêm qua 0 giờ nên không có cách hiểu nào khác — để người xem lại.
  if (ra < vao) return { trangThai: 'can-giai-trinh', cong: 0, lyDo: 'chua-du-gio' };

  // Không trừ giờ nghỉ trưa: cô mầm non trông bé ngủ trưa ngay tại lớp, giờ
  // ấy vẫn là giờ làm.
  //
  // Xét đủ giờ TRƯỚC khi xét ca: 07:00–15:00 đủ 8 tiếng thì là một công, dù
  // không phủ trọn ca chiều.
  if (ra - vao >= q.phutDuCong) return { trangThai: 'du-cong', cong: 1, lyDo: '' };

  const phuCa = (tu, den) => {
    const a = doiRaPhut(tu);
    const b = doiRaPhut(den);
    return a !== null && b !== null && vao <= a + q.phutDuDi && ra >= b - q.phutDuDi;
  };
  if (phuCa(q.ca1Tu, q.ca1Den) || phuCa(q.ca2Tu, q.ca2Den)) {
    return { trangThai: 'nua-ngay', cong: 0.5, lyDo: '' };
  }

  // Không đủ giờ, không trọn ca nào: không tự kết luận là mất công — có thể cô
  // được cho về sớm, đi tập huấn... Đánh dấu để người có thẩm quyền xem.
  return { trangThai: 'can-giai-trinh', cong: 0, lyDo: 'chua-du-gio' };
}

// ---------------------------------------------------------------------------
// BẢNG CÔNG GỘP — một câu trả lời cho "hôm đó cô được mấy công" (K1-2)
//
// Phần dưới ĐỌC CSDL, nhưng nhận `db` làm tham số chứ không tự nạp: màn Nhân
// sự, tổng quan quản trị và báo cáo xuất Excel cùng gọi một hàm, và bài test
// truyền được một `db` giả. Bên gọi tự hỏi phân hệ Nhân sự có đang bật không.
//
// LUẬT GỘP cho mỗi (người, ngày):
//   1. Có dòng trong `nhansu_cham_cong` → dùng dòng ấy. Từ ngày quy tắc áp
//      dụng, cổng thôi chép sang bảng công (routes/attendance.js), nên mọi dòng
//      ở đó là dòng ghi tay và dòng ghi tay luôn thắng. Dòng cũ — kể cả dòng
//      cổng đã chép trước ngày áp dụng — giữ nguyên, KHÔNG tính lại.
//   2. Không có dòng, ngày nằm trong một đợt quy tắc, có giờ ở cổng → tính bằng
//      `tinhTuGio` với tham số của đúng đợt ấy.
//   3. Không có gì, ngày thường đã qua trong một đợt quy tắc, trường không
//      nghỉ, người còn làm → 'chua-co-cong': chỉ để biết, 0 công, không phải
//      việc cần xử lý.
// Thứ Bảy, Chủ nhật, ngày trường nghỉ: có giờ cổng thì tính như thường,
// không có thì không có gì.
// ---------------------------------------------------------------------------
const ngayVN = require('./ngay');

const CONG_THEO_LOAI = { 'di-lam': 1, 'nua-ngay': 0.5 };
const LOAI_THEO_TRANG_THAI = { 'du-cong': 'di-lam', 'nua-ngay': 'nua-ngay' };
const GHI_CHU_CONG = 'Chụp ảnh ở cổng';
const GHI_CHU_GIAI_TRINH = 'Giải trình đã duyệt';
const NGAY_MS = 86400000;

function congNgay(ngay, soNgay) {
  return new Date(Date.parse(`${ngay}T00:00:00Z`) + soNgay * NGAY_MS).toISOString().slice(0, 10);
}

// Mọi đợt quy tắc, theo thứ tự bắt đầu. Bảng chưa có (phân hệ chưa nạp
// schema) thì coi như chưa bật — đúng mặc định của nhà trường.
function cacQuyTac(db) {
  try {
    return db.all('nhansu_quy_tac_cong',
      'SELECT * FROM nhansu_quy_tac_cong ORDER BY apDungTu, batLuc');
  } catch (_) { return []; }
}

// Đợt áp cho ngày `ngay`, hoặc null. Hai đợt chồng nhau (không nên có) thì
// đợt bắt đầu sau thắng.
function quyTacCuaNgay(ds, ngay) {
  let ra = null;
  for (const q of ds || []) {
    if (q.apDungTu <= ngay && (!q.tatTu || ngay < q.tatTu)) ra = q;
  }
  return ra;
}

function thamSo(q) {
  const ra = {};
  for (const k of Object.keys(QUY_TAC_MAC_DINH)) if (q[k] != null && q[k] !== '') ra[k] = q[k];
  return ra;
}

function bangCong(db, ids, tu, den, { homNay } = {}) {
  const ra = new Map((ids || []).map(id => [id, []]));
  if (!ra.size || !tu || !den) return ra;
  const hn = homNay || ngayVN.homNay();
  const dau = [...ra.keys()].map(() => '?').join(',');
  const p = [tu, den, ...ra.keys()];
  const doc = (bang, sql, thamSoSql) => {
    try { return db.all(bang, sql, thamSoSql); } catch (_) { return []; }
  };
  const quyTac = cacQuyTac(db);

  const tay = doc('nhansu_cham_cong',
    `SELECT * FROM nhansu_cham_cong WHERE ngay BETWEEN ? AND ? AND userId IN (${dau})`, p);
  const cong = quyTac.length ? doc('staff_checkin',
    `SELECT userId, ngay, gioVao, gioRa FROM staff_checkin
      WHERE ngay BETWEEN ? AND ? AND userId IN (${dau})`, p) : [];
  const giaiTrinh = doc('nhansu_giai_trinh',
    `SELECT * FROM nhansu_giai_trinh WHERE ngay BETWEEN ? AND ? AND userId IN (${dau})
      ORDER BY guiLuc`, p);
  const daDuyet = new Set(giaiTrinh.filter(g => g.trangThai === 'da-duyet').map(g => `${g.userId}|${g.ngay}`));

  const theoNgay = new Map([...ra.keys()].map(id => [id, new Map()]));
  for (const r of tay) {
    const q = quyTacCuaNgay(quyTac, r.ngay);
    let nguon = 'tay';
    if (!q && r.ghiChu === GHI_CHU_CONG) nguon = 'cong-cu';
    else if (daDuyet.has(`${r.userId}|${r.ngay}`) && String(r.ghiChu || '').startsWith(GHI_CHU_GIAI_TRINH)) nguon = 'giai-trinh';
    theoNgay.get(r.userId).set(r.ngay, {
      ngay: r.ngay, loai: r.loai, gioVao: r.gioVao, gioRa: r.gioRa, ghiChu: r.ghiChu,
      nguon, cong: CONG_THEO_LOAI[r.loai] || 0, trangThai: 'da-ghi', lyDo: '', loaiTinh: r.loai,
    });
  }
  for (const c of cong) {
    const m = theoNgay.get(c.userId);
    if (m.has(c.ngay)) continue;
    const q = quyTacCuaNgay(quyTac, c.ngay);
    if (!q) continue;
    const t = tinhTuGio(c.gioVao, c.gioRa, { laHomNay: c.ngay === hn, quyTac: thamSo(q) });
    if (!t.trangThai) continue;
    m.set(c.ngay, {
      ngay: c.ngay, loai: '', gioVao: c.gioVao || '', gioRa: c.gioRa || '', ghiChu: '',
      nguon: 'tinh', cong: t.cong, trangThai: t.trangThai, lyDo: t.lyDo,
      loaiTinh: LOAI_THEO_TRANG_THAI[t.trangThai] || '',
    });
  }

  // 'chua-co-cong': chỉ những ngày THƯỜNG ĐÃ QUA nằm trong một đợt quy tắc.
  const homQua = congNgay(hn, -1);
  const cuoi = den < homQua ? den : homQua;
  const ngayXet = [];
  for (let n = tu; n <= cuoi; n = congNgay(n, 1)) {
    const thu = new Date(`${n}T00:00:00Z`).getUTCDay();
    if (thu >= 1 && thu <= 5 && quyTacCuaNgay(quyTac, n)) ngayXet.push(n);
  }
  if (ngayXet.length) {
    const nguoi = new Map(doc('users',
      `SELECT id, active, createdAt FROM users WHERE id IN (${dau})`, [...ra.keys()]).map(u => [u.id, u]));
    const hoSo = new Map(doc('nhansu_ho_so',
      `SELECT userId, ngayVaoLam, ngayNghiViec FROM nhansu_ho_so WHERE userId IN (${dau})`,
      [...ra.keys()]).map(h => [h.userId, h]));
    // Nạp muộn: nghi-hoc kéo theo lib/db, còn bài test hàm thuần ở trên thì không cần CSDL.
    let dotNghi = [];
    try { dotNghi = require('./nghi-hoc').truongNghiTrongKhoang(ngayXet[0], ngayXet[ngayXet.length - 1], null); } catch (_) { dotNghi = []; }
    const coSo = (userId) => {
      if (!dotNghi.some(d => d.campusId)) return '';
      const r = doc('user_campus', 'SELECT campusId FROM user_campus WHERE userId = ?', [userId])[0]
        || doc('class_teachers',
          `SELECT cc.campusId FROM class_teachers ct JOIN class_campus cc ON cc.classId = ct.classId
           JOIN classes c ON c.id = ct.classId AND c.active = 1
           WHERE ct.teacherId = ? ORDER BY ct.vaiTro = 'chinh' DESC LIMIT 1`, [userId])[0];
      return r ? r.campusId : '';
    };
    for (const [userId, m] of theoNgay) {
      const u = nguoi.get(userId);
      if (!u || u.active === 0 || u.active === false) continue;
      const h = hoSo.get(userId) || {};
      const batDau = h.ngayVaoLam || (u.createdAt ? ngayVN.ngayCua(Date.parse(u.createdAt)) : '');
      const cs = coSo(userId);
      for (const n of ngayXet) {
        if (m.has(n) || (batDau && n < batDau) || (h.ngayNghiViec && n > h.ngayNghiViec)) continue;
        if (dotNghi.some(d => d.tuNgay <= n && d.denNgay >= n && (!d.campusId || d.campusId === cs))) continue;
        m.set(n, {
          ngay: n, loai: '', gioVao: '', gioRa: '', ghiChu: '',
          nguon: '', cong: 0, trangThai: 'chua-co-cong', lyDo: '', loaiTinh: '',
        });
      }
    }
  }

  // Giải trình của ngày: cái đang chờ, không có thì cái gửi gần nhất.
  const gtNgay = new Map();
  for (const g of giaiTrinh) {
    const k = `${g.userId}|${g.ngay}`;
    const cu = gtNgay.get(k);
    if (!cu || cu.trangThai !== 'cho-duyet') gtNgay.set(k, g);
  }
  for (const [userId, m] of theoNgay) {
    const dong = [...m.values()].sort((a, b) => (a.ngay < b.ngay ? -1 : 1));
    for (const d of dong) {
      const g = gtNgay.get(`${userId}|${d.ngay}`);
      d.giaiTrinh = g ? {
        id: g.id, trangThai: g.trangThai, loaiDeNghi: g.loaiDeNghi,
        gioVaoDeNghi: g.gioVaoDeNghi, gioRaDeNghi: g.gioRaDeNghi, lyDo: g.lyDo,
        guiLuc: g.guiLuc, ghiChuDuyet: g.ghiChuDuyet,
      } : null;
    }
    ra.set(userId, dong);
  }
  return ra;
}

// Cộng dồn các ngày của MỘT người (mảng `bangCong` trả về). Nửa ngày 0.5 —
// quy ước duy nhất app tự đặt; hệ số, phụ cấp, thuế là việc của kế toán.
function tongHopCong(dong) {
  const dem = (f) => (dong || []).filter(f).length;
  const theoLoai = (l) => dem(x => x.loaiTinh === l);
  return {
    soCong: theoLoai('di-lam') + (theoLoai('nua-ngay') * 0.5),
    soNgayDiLam: theoLoai('di-lam'),
    soNuaNgay: theoLoai('nua-ngay'),
    soNghiPhep: dem(x => x.loai === 'nghi-phep'),
    soNghiKhongPhep: dem(x => x.loai === 'nghi-khong-phep'),
    soNghiLe: dem(x => x.loai === 'nghi-le'),
    soCanGiaiTrinh: dem(x => x.trangThai === 'can-giai-trinh'),
    soDangLam: dem(x => x.trangThai === 'dang-lam'),
    soChoDuyet: dem(x => x.giaiTrinh && x.giaiTrinh.trangThai === 'cho-duyet'),
  };
}

module.exports = {
  QUY_TAC_MAC_DINH, tinhTuGio,
  GHI_CHU_GIAI_TRINH, congNgay, cacQuyTac, quyTacCuaNgay, bangCong, tongHopCong,
};
