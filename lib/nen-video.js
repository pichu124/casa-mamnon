// NÉN VIDEO TRÊN MÁY CHỦ (Đ260f, chủ dự án quyết 25/11).
//
// VÌ SAO
//
// Từ Đ150 video được nén ngay trên điện thoại của cô (`UI.nenVideo`: phát lại
// qua canvas rồi thu bằng MediaRecorder). Trên iPhone kết quả rất mờ — Safari
// bỏ qua bitrate xin, tệp ra chỉ khoảng 0,4 MB. Chủ dự án quyết: máy chủ nén,
// đầu ra 720p. Máy chủ của trường có 12 nhân, nén một đoạn 1 phút ở 720p mất
// vài giây.
//
// LUỒNG
//
//   0. GET  <tiền tố>/co-nen  → {coNen} (màn hình hỏi lúc mở form)
//   1. POST <tiền tố>/bat-dau  {ten, kichThuoc, loai}  → {id, coNen, kichMoiPhan}
//   2. PUT  <tiền tố>/:id/phan/:so  (thân application/octet-stream, từng phần
//      `kichMoiPhan` byte, ghi nối vào DATA_DIR/video-tam/<id>.goc)
//   3. POST <tiền tố>/:id/xong  → kiểm chữ ký, đẩy vào hàng đợi nén
//   4. GET  <tiền tố>/:id  → trạng thái lượt ('dang-gui' | 'dang-nen' | 'xong'
//      | 'loi'), phần đã gửi/nén (0–1), maTep khi xong, câu lỗi khi hỏng
//   5. Đăng album / lưu quan sát kèm `videoDaNen: <maTep>` → `dungVideo`
//      chuyển tệp đã nén vào uploads/ như mọi video khác.
//
// NGUYÊN TẮC SỐ 1: THIẾU FFMPEG THÌ APP VẪN CHẠY NHƯ CŨ
//
// `coFfmpeg()` không bao giờ ném. Không có ffmpeg thì `bat-dau` trả
// `{coNen:false}` và màn hình đi đúng đường cũ (nén trên điện thoại, gửi data
// URL). Video gốc KHÔNG BAO GIỜ được phục vụ ra ngoài: không đường nào đọc
// thư mục video-tam, kể cả tệp đã nén — tệp chỉ ra ngoài sau khi đã vào album
// hay quan sát, qua đúng đường có canh quyền của nơi đó.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const express = require('express');
const db = require('./db');
const uploads = require('./uploads');
const { requireRole } = require('./auth');

const THU_MUC_TAM = path.join(db.DATA_DIR, 'video-tam');

const GOC_TOI_DA = 500 * 1024 * 1024;     // video gốc cô khai, trước khi nén
const KICH_MOI_PHAN = 4 * 1024 * 1024;    // mỗi lần PUT
const THAN_PHAN_TOI_DA = '6mb';           // bộ đọc thân của riêng đường PUT phần
const LUOT_DO_MOI_NGUOI = 3;              // đang gửi + đang nén, mỗi người
const VIEC_CUNG_LUC = 2;                  // ffmpeg chạy song song tối đa
const GIOI_HAN_NEN_MS = 10 * 60 * 1000;   // quá thì giết tiến trình, báo lỗi
const GIAY_TOI_DA = 390;                  // khớp TOI_DA_GIAY_VIDEO của màn Album
const GIU_GIO = 24;                       // lượt dở, tệp nén chưa dùng
const MA_RE = /^[a-f0-9]{32}$/;

const LOI_KHONG_PHAI_VIDEO = 'Tệp này không phải video, hoặc video bị hỏng — '
  + 'cô chọn lại đoạn phim quay từ điện thoại giúp nhé';
const LOI_MA = 'Video đã xử lý không còn dùng được (quá 24 giờ, đã đăng rồi, hoặc không phải của cô) — '
  + 'cô chọn lại video giúp nhé';

const ffmpeg = () => process.env.CASA_FFMPEG || 'ffmpeg';
const ffprobe = () => process.env.CASA_FFPROBE || 'ffprobe';
const bayGio = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Máy có ffmpeg không — dò MỘT lần, không bao giờ ném.
// ---------------------------------------------------------------------------
let coSan = null;
let coNice = false;
function coFfmpeg() {
  if (coSan !== null) return coSan;
  const thu = (lenh, args = ['-version']) => {
    try {
      const r = spawnSync(lenh, args, { stdio: 'ignore', timeout: 10000, windowsHide: true });
      return !r.error && r.status === 0;
    } catch (_) { return false; }
  };
  coSan = thu(ffmpeg()) && thu(ffprobe());
  coNice = coSan && process.platform !== 'win32' && thu('nice', ['-n', '10', 'true']);
  if (!coSan) {
    console.warn('[nen-video] Máy chủ chưa có ffmpeg — video vẫn nén trên điện thoại như cũ. '
      + 'Cài bằng: sudo apt install -y ffmpeg (rồi khởi động lại app).');
  }
  return coSan;
}

function duongTam(id, duoi) { return path.join(THU_MUC_TAM, `${id}.${duoi}`); }
const DUOI_TAM = ['goc', 'dang.mp4', 'mp4', 'jpg'];

function xoaTep(id) {
  for (const d of DUOI_TAM) { try { fs.unlinkSync(duongTam(id, d)); } catch (_) { /* không có */ } }
}

function capNhat(id, patch) {
  db.update('video_nen', id, { ...patch, capNhatLuc: bayGio() });
}

// ---------------------------------------------------------------------------
// Chạy một lệnh ffmpeg/ffprobe: mảng tham số, KHÔNG qua shell, giới hạn thời
// gian, giữ đuôi stderr để ghi nhật ký. Chạy dưới `nice -n 10` (nice thay
// tiến trình bằng ffmpeg nên giết pid là giết ffmpeg): máy chủ trả lời cô và
// gia đình trước, nén sau. `os.setPriority` không dùng được ở đây vì trên Linux
// nó chỉ hạ đúng một luồng, mà libx264 mở thêm luồng ngay khi bắt đầu.
// ---------------------------------------------------------------------------
function chay(lenh, args, { viec, gioiHan = GIOI_HAN_NEN_MS, moiDong } = {}) {
  return new Promise((xong, hong) => {
    let p;
    try {
      p = coNice
        ? spawn('nice', ['-n', '10', lenh, ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
        : spawn(lenh, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (err) { hong(err); return; }
    if (viec) viec.proc = p;
    let ra = '';
    let duoiLoi = '';
    let quaGio = false;
    const hen = setTimeout(() => { quaGio = true; try { p.kill('SIGKILL'); } catch (_) { /* đã tắt */ } }, gioiHan);
    p.stdout.on('data', (d) => {
      const s = d.toString();
      if (ra.length < 2 * 1024 * 1024) ra += s;
      if (moiDong) s.split('\n').forEach(moiDong);
    });
    p.stderr.on('data', (d) => { duoiLoi = (duoiLoi + d.toString()).slice(-4000); });
    p.on('error', (err) => { clearTimeout(hen); hong(err); });
    p.on('close', (code) => {
      clearTimeout(hen);
      if (viec) viec.proc = null;
      if (quaGio) { const e = new Error('QUA_GIO'); hong(e); return; }
      xong({ code, ra, duoiLoi });
    });
  });
}

// Cạnh NGẮN về 720 (không phóng to video nhỏ hơn), giữ tỉ lệ, số chẵn. Dấu
// nháy đơn bọc biểu thức để dấu phẩy trong min() không bị hiểu là ngắt bộ lọc.
// ffmpeg tự xoay theo metadata của iPhone TRƯỚC bộ lọc này, nên iw/ih là kích
// thước đã xoay.
const LOC_720 = "scale=w='if(gt(iw,ih),-2,trunc(min(720,iw)/2)*2)':h='if(gt(iw,ih),trunc(min(720,ih)/2)*2,-2)'";
const LOC_BIA = "scale=w='if(gt(iw,ih),trunc(min(640,iw)/2)*2,-2)':h='if(gt(iw,ih),-2,trunc(min(640,ih)/2)*2)'";

class LoiChoCo extends Error {}

async function nenMot(id, viec) {
  const r = db.first('video_nen', 'SELECT * FROM video_nen WHERE id = ?', [id]);
  if (!r || viec.huy) return;
  const goc = duongTam(id, 'goc');

  // 1. Hỏi ffprobe: có luồng hình không, dài bao lâu.
  const tham = await chay(ffprobe(), ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', goc],
    { viec, gioiHan: 60 * 1000 });
  if (viec.huy) return;
  let info = null;
  try { info = tham.code === 0 ? JSON.parse(tham.ra) : null; } catch (_) { info = null; }
  const hinh = info && (info.streams || []).find(s => s.codec_type === 'video');
  if (!hinh) throw new LoiChoCo(LOI_KHONG_PHAI_VIDEO);
  const doDai = Number((info.format || {}).duration) || Number(hinh.duration) || 0;
  if (doDai > GIAY_TOI_DA + 1) {
    throw new LoiChoCo('Video dài quá — tối đa 6 phút rưỡi. Cô cắt bớt ngay trên điện thoại '
      + '(mở video trong thư viện ảnh, bấm Sửa) rồi gửi lại nhé');
  }

  // 2. Nén. -map_metadata -1 bỏ cả toạ độ GPS iPhone ghi vào video.
  const tam = duongTam(id, 'dang.mp4');
  const kq = await chay(ffmpeg(), [
    '-hide_banner', '-nostdin', '-y', '-loglevel', 'error',
    '-i', goc,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', LOC_720,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-maxrate', '2200k', '-bufsize', '4400k',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
    '-movflags', '+faststart', '-map_metadata', '-1',
    '-progress', 'pipe:1', '-nostats',
    '-f', 'mp4', tam,
  ], {
    viec,
    moiDong: (dong) => {
      const m = /^out_time_us=(\d+)/.exec(dong.trim());
      if (m && doDai > 0) viec.tienDo = Math.min(0.99, Number(m[1]) / 1e6 / doDai);
    },
  });
  if (viec.huy) return;
  if (kq.code !== 0) {
    console.error(`[nen-video] ffmpeg lỗi (mã ${kq.code}) với lượt ${id}: ${kq.duoiLoi.slice(-800)}`);
    throw new LoiChoCo('Máy chủ chưa xử lý được video này — cô thử gửi lại, hoặc chọn đoạn phim khác giúp nhé');
  }
  const kich = fs.statSync(tam).size;
  if (!kich) throw new LoiChoCo(LOI_KHONG_PHAI_VIDEO);
  if (kich > uploads.MAX_VIDEO_NEN_BYTES) {
    throw new LoiChoCo('Video sau khi xử lý vẫn nặng quá — cô cắt ngắn đoạn phim rồi gửi lại nhé');
  }
  fs.renameSync(tam, duongTam(id, 'mp4'));

  // 3. Ảnh bìa cho ô lưới album (khung ~0,5 giây). Hỏng thì bỏ, không phải lỗi.
  let coBia = 0;
  if (r.vung === 'album') {
    const bia = duongTam(id, 'jpg');
    for (const moc of ['0.5', '0']) {
      try {
        const b = await chay(ffmpeg(), ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error',
          '-ss', moc, '-i', duongTam(id, 'mp4'), '-frames:v', '1', '-vf', LOC_BIA, '-q:v', '4', '-f', 'image2', bia],
        { viec, gioiHan: 60 * 1000 });
        if (b.code === 0 && fs.existsSync(bia) && fs.statSync(bia).size > 0) { coBia = 1; break; }
      } catch (_) { /* thử mốc sau */ }
      if (viec.huy) return;
    }
  }

  try { fs.unlinkSync(goc); } catch (_) { /* đã không còn */ }
  capNhat(id, { trangThai: 'xong', loi: '', coBia, doDaiGiay: doDai || null, xongLuc: bayGio() });
}

// ---------------------------------------------------------------------------
// Hàng đợi: tối đa VIEC_CUNG_LUC việc cùng lúc, phần còn lại chờ lượt.
// ---------------------------------------------------------------------------
const HANG = [];
const DANG_CHAY = new Map();   // id → { proc, huy, tienDo }

function dayVaoHang(id) {
  HANG.push(id);
  chayTiep();
}

function chayTiep() {
  while (DANG_CHAY.size < VIEC_CUNG_LUC && HANG.length) {
    const id = HANG.shift();
    const viec = { proc: null, huy: false, tienDo: 0 };
    DANG_CHAY.set(id, viec);
    nenMot(id, viec)
      .catch((err) => {
        if (viec.huy) return;
        const loi = err instanceof LoiChoCo ? err.message
          : err && err.message === 'QUA_GIO'
            ? 'Video này xử lý lâu quá nên máy chủ đã dừng — cô cắt ngắn đoạn phim rồi gửi lại nhé'
            : 'Máy chủ chưa xử lý được video này — cô thử gửi lại giúp nhé';
        if (!(err instanceof LoiChoCo)) console.error(`[nen-video] lượt ${id} lỗi:`, err);
        try { capNhat(id, { trangThai: 'loi', loi }); } catch (_) { /* dòng đã bị huỷ */ }
        xoaTep(id);
      })
      .finally(() => {
        if (viec.huy) xoaTep(id);
        DANG_CHAY.delete(id);
        chayTiep();
      });
  }
}

function huyViec(id) {
  const i = HANG.indexOf(id);
  if (i >= 0) HANG.splice(i, 1);
  const viec = DANG_CHAY.get(id);
  if (viec) {
    viec.huy = true;
    if (viec.proc) { try { viec.proc.kill('SIGKILL'); } catch (_) { /* đã tắt */ } }
  }
}

// ---------------------------------------------------------------------------
// Khởi động lại máy chủ giữa chừng: hàng đợi trong bộ nhớ đã mất, nên lượt dở
// chuyển 'loi' để màn hình bảo cô gửi lại, không hỏi mãi một lượt không ai làm.
// ---------------------------------------------------------------------------
let daKhoiDong = false;
function khoiDong() {
  if (daKhoiDong) return;
  daKhoiDong = true;
  try {
    db.run(`UPDATE video_nen SET trangThai = 'loi', loi = ?, capNhatLuc = ?
      WHERE trangThai IN ('dang-gui', 'dang-nen')`,
    ['Máy chủ vừa khởi động lại giữa chừng — cô gửi lại video giúp nhé', bayGio()]);
  } catch (err) {
    console.error('[nen-video] không đánh dấu được lượt dở sau khởi động:', err.message);
  }
  require('./hen-gio').dangKy('nen-video:don-rac', donRac);
  // Dò ffmpeg ngay lúc khởi động, để dòng nhắc "chưa có ffmpeg" (nếu có) nằm
  // ở đầu nhật ký dịch vụ chứ không đợi tới lượt cô gửi video đầu tiên.
  coFfmpeg();
}

// Dọn rác (đồng hồ định giờ, mỗi 15 phút): lượt dở và tệp nén không ai dùng
// quá 24 giờ, cùng tệp tạm mồ côi không còn dòng nào trỏ tới.
function donRac() {
  const moc = new Date(Date.now() - GIU_GIO * 3600 * 1000).toISOString();
  let ds = [];
  try {
    ds = db.all('video_nen', 'SELECT id FROM video_nen WHERE capNhatLuc < ? LIMIT 500', [moc]);
  } catch (_) { return 0; }
  for (const r of ds) {
    if (DANG_CHAY.has(r.id)) continue;
    xoaTep(r.id);
    db.run('DELETE FROM video_nen WHERE id = ?', [r.id]);
  }
  let tep = [];
  try { tep = fs.readdirSync(THU_MUC_TAM); } catch (_) { tep = []; }
  const mocMs = Date.parse(moc);
  for (const t of tep) {
    const id = t.split('.')[0];
    if (!MA_RE.test(id) || DANG_CHAY.has(id)) continue;
    if (db.first('video_nen', 'SELECT id FROM video_nen WHERE id = ?', [id])) continue;
    try {
      if (fs.statSync(path.join(THU_MUC_TAM, t)).mtimeMs < mocMs) fs.unlinkSync(path.join(THU_MUC_TAM, t));
    } catch (_) { /* tệp vừa biến mất */ }
  }
  return ds.length;
}

// ---------------------------------------------------------------------------
// Dùng mã tệp khi đăng album / lưu quan sát. Chỉ mã của CHÍNH người gửi, đúng
// nơi đã gửi, đã nén xong, chưa dùng, chưa quá 24 giờ. Trả về { file } trong
// uploads/ hoặc ném Error có câu tiếng Việt (chỗ gọi trả 400).
// ---------------------------------------------------------------------------
function dungVideo(user, maTep, vung) {
  const ma = String(maTep || '');
  if (!user || !MA_RE.test(ma)) throw new Error(LOI_MA);
  const r = db.first('video_nen', 'SELECT * FROM video_nen WHERE id = ? AND userId = ?', [ma, user.id]);
  const moc = new Date(Date.now() - GIU_GIO * 3600 * 1000).toISOString();
  if (!r || r.vung !== vung || r.trangThai !== 'xong' || !r.xongLuc || r.xongLuc < moc) throw new Error(LOI_MA);
  if (!fs.existsSync(duongTam(ma, 'mp4'))) throw new Error(LOI_MA);
  const ra = uploads.luuVideoDaNen(duongTam(ma, 'mp4'), r.coBia ? duongTam(ma, 'jpg') : null);
  capNhat(ma, { trangThai: 'da-dung', dungLuc: bayGio() });
  try { fs.unlinkSync(duongTam(ma, 'jpg')); } catch (_) { /* đã chuyển đi hoặc không có */ }
  return ra;
}

// Byte đầu tệp có giống video điện thoại quay ra không: MP4/MOV (hộp ftyp,
// hoặc QuickTime đời cũ mở bằng moov/mdat/wide/free/skip), WebM/MKV (EBML).
function laChuKyVideo(b) {
  if (!b || b.length < 12) return false;
  const hop = b.toString('ascii', 4, 8);
  if (['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(hop)) return true;
  return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
}

// ---------------------------------------------------------------------------
// Đăng ký năm đường dưới `tienTo` (vd '/api/albums/video'). Gọi từ route của
// phân hệ nên đường nằm trong vùng api của phân hệ đó: tắt phân hệ là đường
// bị `chanApiDaTat` chặn.
//
//   vung   'album' | 'hanhtrinh' — mã chỉ dùng được ở đúng nơi đã gửi.
//   chan   (req, res) => true nếu đã trả lời từ chối (vd Marketing chỉ xem ảnh).
// ---------------------------------------------------------------------------
function ganDuong(app, tienTo, { vung, chan } = {}) {
  khoiDong();
  const quyen = requireRole('teacher', 'admin');
  const docPhan = express.raw({ type: 'application/octet-stream', limit: THAN_PHAN_TOI_DA });

  // Lượt của chính người gọi. Lượt của người khác trả 404 như lượt không có:
  // không xác nhận cho ai là mã ấy tồn tại.
  const timLuot = (req, res, next) => {
    const id = String(req.params.id || '');
    const r = MA_RE.test(id)
      ? db.first('video_nen', 'SELECT * FROM video_nen WHERE id = ? AND userId = ? AND vung = ?', [id, req.user.id, vung])
      : null;
    if (!r) return res.status(404).json({ error: 'Không tìm thấy lượt gửi video này — cô gửi lại giúp nhé' });
    req.luotVideo = r;
    return next();
  };

  // Màn hình hỏi MỘT lần lúc mở form để biết đi đường nào, khỏi mở một lượt
  // gửi chỉ để biết máy chủ không nén được. Đăng ký trước `${tienTo}/:id`.
  app.get(`${tienTo}/co-nen`, quyen, (req, res) => res.json({ coNen: coFfmpeg() }));

  app.post(`${tienTo}/bat-dau`, quyen, (req, res) => {
    if (chan && chan(req, res)) return;
    if (!coFfmpeg()) return res.json({ coNen: false });
    const b = req.body || {};
    const kich = Number(b.kichThuoc);
    if (!Number.isInteger(kich) || kich <= 0) {
      return res.status(400).json({ error: 'Chưa đọc được dung lượng video — cô chọn lại tệp giúp nhé' });
    }
    if (kich > GOC_TOI_DA) {
      return res.status(400).json({
        error: `Video nặng quá (tối đa ${Math.round(GOC_TOI_DA / 1048576)} MB) — cô cắt ngắn trên điện thoại rồi gửi lại nhé`,
      });
    }
    const loai = String(b.loai || '');
    if (loai && !/^video\//i.test(loai)) {
      return res.status(400).json({ error: 'Chỉ nhận video quay từ điện thoại (MP4, MOV, WebM)' });
    }
    const dangDo = db.count(`SELECT COUNT(*) FROM video_nen WHERE userId = ?
      AND trangThai IN ('dang-gui', 'dang-nen')`, [req.user.id]);
    if (dangDo >= LUOT_DO_MOI_NGUOI) {
      return res.status(429).json({ error: `Cô đang gửi ${LUOT_DO_MOI_NGUOI} video cùng lúc rồi — chờ một video xong rồi gửi tiếp nhé` });
    }
    const id = crypto.randomBytes(16).toString('hex');
    fs.mkdirSync(THU_MUC_TAM, { recursive: true });
    fs.writeFileSync(duongTam(id, 'goc'), '');
    const luc = bayGio();
    db.insert('video_nen', {
      id, userId: req.user.id, vung, ten: String(b.ten || '').slice(0, 200), kichThuoc: kich,
      kichMoiPhan: KICH_MOI_PHAN, daNhan: 0, soPhan: 0, trangThai: 'dang-gui', loi: '', coBia: 0,
      taoLuc: luc, capNhatLuc: luc,
    });
    return res.status(201).json({ id, coNen: true, kichMoiPhan: KICH_MOI_PHAN });
  });

  // Người lạ và lượt của người khác bị từ chối TRƯỚC khi đọc thân yêu cầu.
  app.put(`${tienTo}/:id/phan/:so`, quyen, timLuot, docPhan, (req, res) => {
    const r = req.luotVideo;
    if (r.trangThai !== 'dang-gui') {
      return res.status(409).json({ error: 'Lượt gửi này đã đóng — cô gửi lại video giúp nhé' });
    }
    if (!/^\d{1,6}$/.test(String(req.params.so))) return res.status(400).json({ error: 'Phần video không hợp lệ' });
    const so = Number(req.params.so);
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Phần video rỗng — cô gửi lại giúp nhé' });
    // Gửi lại phần vừa rồi (mạng chập chờn: máy chủ nhận rồi mà máy cô chưa
    // nghe trả lời) thì ghi đè đúng chỗ đó; mọi thứ tự khác là sai.
    if (so !== r.soPhan && so !== r.soPhan - 1) {
      return res.status(400).json({ error: 'Phần video gửi sai thứ tự — cô gửi lại video giúp nhé' });
    }
    const viTri = so * r.kichMoiPhan;
    const het = viTri + buf.length;
    if (het > r.kichThuoc) return res.status(400).json({ error: 'Video gửi lên dài hơn dung lượng đã báo — cô gửi lại giúp nhé' });
    if (het < r.kichThuoc && buf.length !== r.kichMoiPhan) {
      return res.status(400).json({ error: 'Phần video bị thiếu — cô gửi lại giúp nhé' });
    }
    const fd = fs.openSync(duongTam(r.id, 'goc'), 'r+');
    try {
      fs.ftruncateSync(fd, viTri);
      fs.writeSync(fd, buf, 0, buf.length, viTri);
    } finally { fs.closeSync(fd); }
    capNhat(r.id, { daNhan: het, soPhan: so + 1 });
    return res.json({ daNhan: het, kichThuoc: r.kichThuoc });
  });

  app.post(`${tienTo}/:id/xong`, quyen, timLuot, (req, res) => {
    const r = req.luotVideo;
    if (r.trangThai === 'dang-nen' || r.trangThai === 'xong') return res.status(202).json({ trangThai: r.trangThai });
    if (r.trangThai !== 'dang-gui') {
      return res.status(409).json({ error: r.loi || 'Lượt gửi này đã đóng — cô gửi lại video giúp nhé' });
    }
    if (r.daNhan !== r.kichThuoc) return res.status(400).json({ error: 'Video chưa gửi đủ — cô gửi lại giúp nhé' });
    let dau = null;
    try {
      const fd = fs.openSync(duongTam(r.id, 'goc'), 'r');
      try { dau = Buffer.alloc(16); fs.readSync(fd, dau, 0, 16, 0); } finally { fs.closeSync(fd); }
    } catch (_) { dau = null; }
    if (!laChuKyVideo(dau)) {
      xoaTep(r.id);
      db.run('DELETE FROM video_nen WHERE id = ?', [r.id]);
      return res.status(400).json({ error: LOI_KHONG_PHAI_VIDEO });
    }
    capNhat(r.id, { trangThai: 'dang-nen' });
    dayVaoHang(r.id);
    return res.status(202).json({ trangThai: 'dang-nen' });
  });

  app.get(`${tienTo}/:id`, quyen, timLuot, (req, res) => {
    const r = req.luotVideo;
    const ra = { trangThai: r.trangThai, daNhan: r.daNhan, kichThuoc: r.kichThuoc };
    // `tienDo` ở đây là phần TỆP đã gửi / đã nén, không phải điều gì về đứa
    // trẻ (QUY TẮC 2 canh thanh tiến độ gắn với trạng thái của bé).
    const dangGui = r.trangThai === 'dang-gui';
    const dangNen = r.trangThai === 'dang-nen';
    if (dangGui) ra.tienDo = r.kichThuoc ? r.daNhan / r.kichThuoc : 0;
    if (dangNen) ra.tienDo = (DANG_CHAY.get(r.id) || {}).tienDo || 0;
    if (r.trangThai === 'xong') { ra.maTep = r.id; ra.coBia = !!r.coBia; }
    if (r.trangThai === 'loi') ra.loi = r.loi || 'Chưa xử lý được video này — cô gửi lại giúp nhé';
    return res.json(ra);
  });

  // Cô dừng lại, hoặc đóng form giữa chừng: bỏ lượt, dọn tệp.
  app.delete(`${tienTo}/:id`, quyen, timLuot, (req, res) => {
    const r = req.luotVideo;
    huyViec(r.id);
    if (r.trangThai !== 'da-dung') xoaTep(r.id);
    db.run('DELETE FROM video_nen WHERE id = ?', [r.id]);
    return res.json({ ok: true });
  });
}

module.exports = {
  coFfmpeg, ganDuong, dungVideo, donRac, laChuKyVideo,
  THU_MUC_TAM, GOC_TOI_DA, KICH_MOI_PHAN, GIAY_TOI_DA,
};
