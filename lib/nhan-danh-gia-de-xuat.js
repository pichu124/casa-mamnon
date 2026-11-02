// ĐỀ XUẤT ĐỔI BỘ CHỮ ĐÁNH GIÁ (chủ dự án 02/11).
//
// Quản lý cơ sở gửi đề xuất, ban giám hiệu đồng ý hoặc chưa đồng ý. Ai được
// làm gì do routes/admin.js quyết; tệp này chỉ giữ luật của chính đề xuất.
//
// Không sửa lib/nhan-danh-gia.js mà gọi lại nó: tệp ấy được ba phân hệ dùng
// chung, và người gác chữ cấm (`kiemTraNhan`) phải là MỘT, đứng ở cả đường gửi
// lẫn đường duyệt. Đồng ý = gọi đúng `ghiBo` mà PUT đang gọi, nên nó gộp theo
// từng mã: phần ban giám hiệu sửa trực tiếp ở mã khác không bị đè.
//
// Không truy cập cơ sở dữ liệu ở tầng trên cùng của tệp: bảng có thể chưa có
// lúc tệp được nạp.

const ndg = require('./nhan-danh-gia');
const ngay = require('./ngay');

const TOI_DA_LY_DO = 300;
const TOI_DA_Y_KIEN = 300;
const GAN_DAY = 10;

// Dòng hỏng (sửa thẳng dưới cơ sở dữ liệu) thì coi như rỗng, không làm sập
// màn hình. Chỉ giữ những mã thuộc bộ chữ và giá trị là chuỗi.
function docNhan(chuoi) {
  let v;
  try { v = JSON.parse(chuoi); } catch (_) { return {}; }
  const ra = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return ra;
  for (const ma of ndg.MA) if (typeof v[ma] === 'string') ra[ma] = v[ma];
  return ra;
}

function tenNguoi(db, id) {
  return ((id && db.findUser(id)) || {}).name || '';
}

function tenCoSo(db, id) {
  return ((id && db.findCampus(id)) || {}).name || '';
}

function lucDeDoc(iso) {
  const [y, m, d] = ngay.ngayCua(iso).split('-');
  return `${ngay.gioCua(iso)} ngày ${d}/${m}/${y}`;
}

function dangCho(db) {
  return db.first('nhan_danh_gia_de_xuat',
    "SELECT * FROM nhan_danh_gia_de_xuat WHERE trangThai = 'cho-duyet' LIMIT 1") || null;
}

function bangDangDung(db) {
  return Object.fromEntries(ndg.nhanDangDung(db));
}

// So sánh "đang dùng → đề xuất" theo bộ chữ HIỆN TẠI, không theo lúc gửi.
function thayDoi(db, d) {
  const nhan = docNhan(d.nhan);
  const nen = docNhan(d.nen);
  const dang = bangDangDung(db);
  return ndg.MAC_DINH.filter(([ma]) => ma in nhan).map(([ma, macDinh]) => ({
    ma,
    macDinh,
    dangDung: dang[ma],
    nen: nen[ma] || '',
    deXuat: nhan[ma],
    daDoiTuLucGui: (nen[ma] || '') !== dang[ma],
  }));
}

function moTa(db, d, userId) {
  return {
    id: d.id,
    trangThai: d.trangThai,
    coDeXuatTen: tenNguoi(db, d.coDeXuat),
    coSoTen: tenCoSo(db, d.coSoId),
    lyDo: d.lyDo,
    taoLuc: d.taoLuc,
    nguoiXemTen: tenNguoi(db, d.nguoiXem),
    xemLuc: d.xemLuc || null,
    yKien: d.yKien,
    cuaToi: d.coDeXuat === userId,
    thayDoi: thayDoi(db, d),
  };
}

// Đề xuất đang chờ (mọi người có quyền xem thẻ đều thấy, để biết vì sao mình
// bị chặn gửi), hoặc null.
function choDuyet(db, userId) {
  const d = dangCho(db);
  return d ? moTa(db, d, userId) : null;
}

// Các đề xuất đã khép gần nhất. `cuaNguoi` = chỉ của người ấy (quản lý cơ sở
// chỉ xem lịch sử của chính mình); null = tất cả (ban giám hiệu).
function ganDay(db, userId, cuaNguoi) {
  const rows = cuaNguoi
    ? db.all('nhan_danh_gia_de_xuat',
      "SELECT * FROM nhan_danh_gia_de_xuat WHERE trangThai <> 'cho-duyet' AND coDeXuat = ? ORDER BY taoLuc DESC LIMIT ?",
      [cuaNguoi, GAN_DAY])
    : db.all('nhan_danh_gia_de_xuat',
      "SELECT * FROM nhan_danh_gia_de_xuat WHERE trangThai <> 'cho-duyet' ORDER BY taoLuc DESC LIMIT ?",
      [GAN_DAY]);
  return rows.map(d => moTa(db, d, userId));
}

function bao409(db, d) {
  const ai = tenNguoi(db, d.coDeXuat) || 'Một quản lý';
  const coSo = tenCoSo(db, d.coSoId);
  return `${ai}${coSo ? ` (${coSo})` : ''} đã gửi một đề xuất lúc ${lucDeDoc(d.taoLuc)} `
    + 'và đề xuất ấy đang chờ ban giám hiệu xem. Mỗi lúc chỉ có một đề xuất cho cả trường — '
    + 'xin chờ ban giám hiệu xem xong rồi gửi lại.';
}

// Gửi đề xuất. Trả về { id } hoặc { status, error, ma? }.
function tao(db, body, userId) {
  const b = body || {};
  const vao = (b.nhan && typeof b.nhan === 'object' && !Array.isArray(b.nhan)) ? b.nhan : {};
  const dang = bangDangDung(db);
  const nhan = {};
  const nen = {};
  for (const ma of ndg.MA) {
    if (!(ma in vao)) continue;
    const loi = ndg.kiemTraNhan(vao[ma]);
    if (loi) return { status: 400, error: loi, ma };
    const chu = String(vao[ma]).trim();
    if (chu !== dang[ma]) { nhan[ma] = chu; nen[ma] = dang[ma]; }
  }
  if (!Object.keys(nhan).length) {
    return { status: 400, error: 'Chưa có chữ nào khác với chữ đang dùng. Anh/chị sửa ít nhất một chữ rồi gửi nhé.' };
  }
  const lyDo = String(b.lyDo == null ? '' : b.lyDo).trim();
  if (!lyDo) return { status: 400, error: 'Xin ghi vì sao muốn đổi — ban giám hiệu đọc dòng này để quyết.' };
  if (lyDo.length > TOI_DA_LY_DO) {
    return { status: 400, error: `Lý do dài quá — tối đa ${TOI_DA_LY_DO} ký tự.` };
  }
  const cho = dangCho(db);
  if (cho) return { status: 409, error: bao409(db, cho) };

  const id = db.nextId('ndgdx');
  try {
    db.tx(() => {
      db.insert('nhan_danh_gia_de_xuat', {
        id, nhan: JSON.stringify(nhan), nen: JSON.stringify(nen), lyDo,
        coDeXuat: userId, coSoId: db.campusOfUser(userId),
        trangThai: 'cho-duyet', yKien: '', taoLuc: new Date().toISOString(),
      });
    });
  } catch (err) {
    // Chỉ mục "một đề xuất chờ" chặn được trường hợp hai người gửi cùng lúc.
    const cho2 = /UNIQUE/i.test(err.message) && dangCho(db);
    if (cho2) return { status: 409, error: bao409(db, cho2) };
    throw err;
  }
  db.audit(userId, 'nhan-danh-gia-de-xuat', null, { id, so: Object.keys(nhan).length });
  return { id };
}

const DA_XEM = 'Đề xuất này đã được xem rồi.';

// Khép một đề xuất đang chờ. Điều kiện `trangThai = 'cho-duyet'` nằm ngay
// trong câu UPDATE: hai người bấm cùng lúc thì người sau không ghi đè.
function khep(db, id, patch) {
  const cot = Object.keys(patch);
  const r = db.run(
    `UPDATE nhan_danh_gia_de_xuat SET ${cot.map(c => `${c} = @${c}`).join(', ')}
     WHERE id = @id AND trangThai = 'cho-duyet'`, { ...patch, id });
  return r.changes === 1;
}

// Ban giám hiệu xem. Trả về { ok, quyetDinh } hoặc { status, error, ma? }.
function xem(db, id, body, userId) {
  const d = db.first('nhan_danh_gia_de_xuat', 'SELECT * FROM nhan_danh_gia_de_xuat WHERE id = ?', [id]);
  if (!d) return { status: 404, error: 'Không tìm thấy đề xuất này.' };
  if (d.trangThai !== 'cho-duyet') return { status: 400, error: DA_XEM };
  const b = body || {};
  const quyetDinh = b.quyetDinh;
  if (quyetDinh !== 'da-duyet' && quyetDinh !== 'tu-choi') {
    return { status: 400, error: 'Xin chọn "Đồng ý" hoặc "Chưa đồng ý".' };
  }
  const yKien = String(b.yKien == null ? '' : b.yKien).trim();
  if (yKien.length > TOI_DA_Y_KIEN) return { status: 400, error: `Ý kiến dài quá — tối đa ${TOI_DA_Y_KIEN} ký tự.` };
  if (quyetDinh === 'tu-choi' && !yKien) {
    return { status: 400, error: 'Chưa đồng ý thì xin ghi một dòng vì sao để quản lý cơ sở biết.' };
  }
  const patch = { trangThai: quyetDinh, nguoiXem: userId, xemLuc: new Date().toISOString(), yKien };

  if (quyetDinh === 'tu-choi') {
    if (!khep(db, d.id, patch)) return { status: 400, error: DA_XEM };
  } else {
    const nhan = docNhan(d.nhan);
    if (!Object.keys(nhan).length) {
      return { status: 400, error: 'Đề xuất này không còn chữ nào để áp. Xin bấm "Chưa đồng ý" để khép nó.' };
    }
    // Người gác đứng cả ở đây: dòng có thể đã bị sửa thẳng dưới cơ sở dữ liệu.
    for (const ma of ndg.MA) {
      if (!(ma in nhan)) continue;
      const loi = ndg.kiemTraNhan(nhan[ma]);
      if (loi) return { status: 400, error: loi, ma };
    }
    let kq = null;
    db.tx(() => {
      if (!khep(db, d.id, patch)) { kq = { status: 400, error: DA_XEM }; return; }
      const ghi = ndg.ghiBo(db, nhan, userId);
      // `ghiBo` kiểm lại đúng người gác vừa kiểm, nên nhánh này không xảy ra;
      // nếu có thì ném ra để giao dịch huỷ cả bước khép ở trên.
      if (ghi.loi) throw new Error(`ghiBo từ chối mã ${ghi.ma}: ${ghi.loi}`);
    });
    if (kq) return kq;
  }
  db.audit(userId, 'nhan-danh-gia-duyet', null, { id: d.id, quyetDinh });
  return { ok: true, quyetDinh };
}

// Người gửi rút đề xuất của chính mình. Trả về { ok } hoặc { status, error }.
function rut(db, id, userId) {
  const d = db.first('nhan_danh_gia_de_xuat', 'SELECT * FROM nhan_danh_gia_de_xuat WHERE id = ?', [id]);
  if (!d) return { status: 404, error: 'Không tìm thấy đề xuất này.' };
  if (d.coDeXuat !== userId) return { status: 403, error: 'Chỉ người đã gửi đề xuất mới rút được.' };
  if (d.trangThai !== 'cho-duyet' || !khep(db, d.id, { trangThai: 'da-rut', xemLuc: new Date().toISOString() })) {
    return { status: 400, error: 'Đề xuất này không còn chờ nên không rút được nữa.' };
  }
  db.audit(userId, 'nhan-danh-gia-rut', null, { id: d.id });
  return { ok: true };
}

module.exports = { TOI_DA_LY_DO, TOI_DA_Y_KIEN, dangCho, choDuyet, ganDay, tao, xem, rut };
