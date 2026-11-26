#!/usr/bin/env node
// CANH MÁY — giám sát tối thiểu cho máy chạy thật (Đ261g).
//
//   DATA_DIR=/var/lib/casa-mamnon node scripts/canh-may.js            soát một lượt, có vấn đề thì báo
//   DATA_DIR=/var/lib/casa-mamnon node scripts/canh-may.js --thu-kenh gửi một tin thử qua kênh báo
//   DATA_DIR=/var/lib/casa-mamnon node scripts/canh-may.js --gui "…"  gửi một tin bất kỳ (cap-nhat-may-chu.sh dùng)
//
// Chạy mỗi 5 phút bằng systemd timer (cách cài ở docs/DUA-VAO-DUNG.md, mục A6).
// Mỗi lượt soát bốn thứ:
//   1. app còn trả lời /healthz không (hỏi thẳng cổng trong máy; có CANH_TEN_MIEN
//      thì hỏi thêm qua Caddy bằng HTTPS, bắt được cả chứng chỉ hỏng);
//   2. ổ chứa DATA_DIR đã dùng bao nhiêu phần trăm;
//   3. bản sao lưu mới nhất bao nhiêu giờ tuổi (lịch 02:00 có còn chạy không);
//   4. máy còn ffmpeg không (thiếu thì video quay về nén trên điện thoại, mờ).
//
// VÌ SAO KHÔNG BÁO QUA THÔNG BÁO ĐẨY CỦA APP (lib/day.js)
//
// Đó là kênh có sẵn, nhưng nó hỏng đúng lúc cần nó nhất: nạp lib/day.js là nạp
// lib/db.js, tức mở school.db và chạy phần dựng bảng từ một tiến trình thứ hai
// bên cạnh máy chủ đang chạy; đĩa đầy hay cơ sở dữ liệu hỏng thì bộ canh chết
// theo app. Tin đẩy cũng chỉ tới máy của người đang còn phiên đăng nhập. Kênh
// báo phải đứng NGOÀI app, nên ở đây chỉ có hai kênh:
//
//   Telegram   CANH_TELEGRAM_TOKEN, CANH_TELEGRAM_CHAT   (đơn giản nhất: tạo bot qua @BotFather)
//   Thư        CANH_EMAIL (máy cần có lệnh sendmail, ví dụ gói msmtp-mta)
//
// Hai biến Telegram là bí mật: đặt trong tệp môi trường của dịch vụ trên máy
// chủ (/etc/casa-mamnon/canh-may.env, quyền 600), KHÔNG BAO GIỜ ghi vào kho mã.
// Chưa đặt kênh nào thì lượt soát vẫn chạy, in vấn đề ra nhật ký hệ thống
// (journalctl) kèm dòng "CHƯA CÓ KÊNH BÁO", và thoát mã 1.
//
// KHÔNG BÁO LẶP. Cùng một vấn đề chỉ nhắc lại sau CANH_NHAC_LAI_GIO giờ (mặc
// định 6); hết vấn đề thì báo một tin "đã ổn lại". Trạng thái nhớ ở tệp
// DATA_DIR/canh-may.json. Ghi tệp đó hỏng (đĩa đầy) thì vẫn gửi tin — thà báo
// lặp còn hơn im.
//
// Ngưỡng (biến môi trường, đều có mặc định):
//   CANH_DIA_PHAN_TRAM   85    ổ dùng từ mức này trở lên thì báo
//   CANH_SAO_LUU_GIO     30    bản sao mới nhất già hơn ngần này giờ thì báo
//   CANH_URL             http://127.0.0.1:${PORT:-3000}/healthz
//   CANH_TEN_MIEN        (trống) ví dụ lienlac.truong.vn
//   CANH_CAN_FFMPEG      1     đặt 0 nếu trường chấp nhận không có ffmpeg
'use strict';

require('./canh-thu-muc-du-lieu')();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { mocCuaTen } = require('./moc-ban-sao');

const GIO = 3600000;

function cauHinh(env = process.env) {
  const so = (v, mac) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : mac);
  const dataDir = env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(__dirname, '..', 'data');
  return {
    dataDir,
    url: env.CANH_URL || `http://127.0.0.1:${env.PORT || 3000}/healthz`,
    tenMien: (env.CANH_TEN_MIEN || '').trim(),
    diaPhanTram: so(env.CANH_DIA_PHAN_TRAM, 85),
    saoLuuGio: so(env.CANH_SAO_LUU_GIO, 30),
    nhacLaiGio: so(env.CANH_NHAC_LAI_GIO, 6),
    canFfmpeg: env.CANH_CAN_FFMPEG !== '0',
    ffmpeg: env.CASA_FFMPEG || 'ffmpeg',
    tepTrangThai: env.CANH_TRANG_THAI || path.join(dataDir, 'canh-may.json'),
    tenMay: env.CANH_TEN_MAY || os.hostname(),
  };
}

// ---------------------------------------------------------------------------
// Đo
// ---------------------------------------------------------------------------

// Hỏi /healthz tối đa `lan` lần, cách nhau `cachMs`: một lần khởi động lại
// (cập nhật app) không được thành một tin báo động lúc nửa đêm.
// `X-Forwarded-Proto: https` vì máy chạy FORCE_HTTPS=1 trả 308 cho mọi lời hỏi
// thẳng bằng http — giống hệt header Caddy gửi.
async function hoiHealthz(url, { fetchFn = fetch, lan = 3, cachMs = 5000, henMs = 5000 } = {}) {
  let loi = '';
  for (let i = 0; i < lan; i++) {
    if (i) await new Promise(r => setTimeout(r, cachMs));
    try {
      const r = await fetchFn(url, {
        headers: { 'X-Forwarded-Proto': 'https' }, redirect: 'manual', signal: AbortSignal.timeout(henMs),
      });
      const than = await r.text();
      if (r.status === 200 && /"ok"\s*:\s*true/.test(than)) return { ok: true };
      loi = `trả mã ${r.status}`;
    } catch (e) {
      loi = (e && e.cause && e.cause.code) || (e && e.name === 'TimeoutError' ? 'quá 5 giây không trả lời' : (e && e.message) || 'lỗi mạng');
    }
  }
  return { ok: false, loi };
}

function doDia(thuMuc) {
  const st = fs.statfsSync(thuMuc);
  const tong = st.blocks * st.bsize;
  const trong = st.bavail * st.bsize;
  // Giống cách `df` tính "Use%": phần đã dùng trên phần người thường dùng được.
  const daDung = (st.blocks - st.bfree) * st.bsize;
  const phanTram = Math.round((daDung / (daDung + trong)) * 100);
  return { phanTram, trongGb: trong / 1024 ** 3, tongGb: tong / 1024 ** 3 };
}

// Tuổi bản sao mới nhất, theo đúng luật của kiem-tra-may-chu.js (Đ236): mốc SỚM
// HƠN trong hai mốc tên tệp và giờ sửa tệp. null = chưa có bản nào.
function banSaoMoiNhat(thuMucSaoLuu, bayGio = Date.now()) {
  let ds;
  try { ds = fs.readdirSync(thuMucSaoLuu).filter(f => f.endsWith('.db.gz')); }
  catch { return null; }
  let moiNhat = null;
  for (const f of ds) {
    const mtime = fs.statSync(path.join(thuMucSaoLuu, f)).mtimeMs;
    const ten = mocCuaTen(f);
    const moc = Number.isFinite(ten) ? Math.min(ten, mtime) : mtime;
    if (!moiNhat || moc > moiNhat.moc) moiNhat = { tep: f, moc };
  }
  return moiNhat && { tep: moiNhat.tep, gioTuoi: (bayGio - moiNhat.moc) / GIO };
}

function coFfmpeg(lenh, spawn = spawnSync) {
  const r = spawn(lenh, ['-version'], { stdio: 'ignore', timeout: 10000 });
  return !r.error && r.status === 0;
}

// ---------------------------------------------------------------------------
// Đánh giá: số đo → danh sách vấn đề. Hàm thuần, bài canh gọi thẳng.
// ---------------------------------------------------------------------------
function danhGia(so, cfg) {
  const vd = [];
  if (!so.healthz.ok) {
    vd.push({ ma: 'app', chu: `App không trả lời ở ${cfg.url} (${so.healthz.loi}). Phụ huynh và cô đang không mở được app.` });
  }
  if (so.ngoai && !so.ngoai.ok) {
    vd.push({ ma: 'ten-mien', chu: `Không mở được https://${cfg.tenMien}/healthz từ chính máy chủ (${so.ngoai.loi}). Xem Caddy và chứng chỉ HTTPS.` });
  }
  if (so.dia && so.dia.loi) {
    vd.push({ ma: 'dia', chu: `Không đọc được dung lượng ổ chứa ${cfg.dataDir}: ${so.dia.loi}` });
  } else if (so.dia && so.dia.phanTram >= cfg.diaPhanTram) {
    vd.push({ ma: 'dia', chu: `Ổ chứa dữ liệu đã dùng ${so.dia.phanTram}% (còn ${so.dia.trongGb.toFixed(1)} GB). Đầy là app ghi hỏng ảnh và sao lưu.` });
  }
  if (!so.saoLuu) {
    vd.push({ ma: 'sao-luu', chu: `Chưa có bản sao lưu nào trong ${path.join(cfg.dataDir, 'backups')}.` });
  } else if (so.saoLuu.gioTuoi > cfg.saoLuuGio) {
    vd.push({ ma: 'sao-luu', chu: `Bản sao lưu mới nhất (${so.saoLuu.tep}) đã ${Math.floor(so.saoLuu.gioTuoi)} giờ — lịch sao lưu 02:00 có thể đã ngừng. Xem ~/backup-casa.log.` });
  }
  if (cfg.canFfmpeg && so.ffmpeg === false) {
    vd.push({ ma: 'ffmpeg', chu: 'Máy chủ không còn ffmpeg: video cô đăng sẽ nén trên điện thoại (mờ). Cài lại: sudo apt install -y ffmpeg, rồi khởi động lại app.' });
  }
  return vd;
}

// ---------------------------------------------------------------------------
// Chống báo lặp: vấn đề nào mới, nào tới hạn nhắc lại, nào đã hết.
// trangThai = { <ma>: { tuLuc, baoLuc, chu } }
// ---------------------------------------------------------------------------
function quyetDinh(vanDe, trangThaiCu, bayGio, nhacLaiGio) {
  const cu = trangThaiCu && typeof trangThaiCu === 'object' ? trangThaiCu : {};
  const moi = {};
  const canBao = [];
  for (const v of vanDe) {
    const t = cu[v.ma];
    if (!t) {
      moi[v.ma] = { tuLuc: bayGio, baoLuc: bayGio, chu: v.chu };
      canBao.push({ ...v, loai: 'moi' });
    } else if (bayGio - t.baoLuc >= nhacLaiGio * GIO) {
      moi[v.ma] = { ...t, baoLuc: bayGio, chu: v.chu };
      canBao.push({ ...v, loai: 'nhac-lai', tuLuc: t.tuLuc });
    } else {
      moi[v.ma] = { ...t, chu: v.chu };
    }
  }
  const daOn = Object.keys(cu).filter(ma => !moi[ma]).map(ma => ({ ma, chu: cu[ma].chu, tuLuc: cu[ma].tuLuc }));
  return { canBao, daOn, trangThai: moi };
}

function gioVN(moc) {
  return new Date(moc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
}

function soanTin({ canBao, daOn }, tenMay) {
  if (!canBao.length && !daOn.length) return '';
  const dong = [`CASA Mầm non — máy ${tenMay}`];
  for (const v of canBao) {
    dong.push(`${v.loai === 'nhac-lai' ? '⚠ VẪN CÒN (từ ' + gioVN(v.tuLuc) + ')' : '⚠ MỚI'}: ${v.chu}`);
  }
  for (const v of daOn) dong.push(`✓ ĐÃ ỔN LẠI: ${v.chu}`);
  return dong.join('\n');
}

// ---------------------------------------------------------------------------
// Gửi
// ---------------------------------------------------------------------------
function kenhCo(env = process.env) {
  const k = [];
  if (env.CANH_TELEGRAM_TOKEN && env.CANH_TELEGRAM_CHAT) k.push('telegram');
  if (env.CANH_EMAIL) k.push('email');
  return k;
}

// Trả về { daGui: [...], loi: [...] }. Không bao giờ ném. Không in token ra
// nhật ký: lỗi của Telegram chỉ ghi mã trả về.
async function gui(tin, env = process.env, { fetchFn = fetch, spawn = spawnSync } = {}) {
  const daGui = [];
  const loi = [];
  if (env.CANH_TELEGRAM_TOKEN && env.CANH_TELEGRAM_CHAT) {
    try {
      const r = await fetchFn(`https://api.telegram.org/bot${env.CANH_TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.CANH_TELEGRAM_CHAT, text: tin.slice(0, 4000) }),
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok) daGui.push('telegram'); else loi.push(`telegram trả mã ${r.status}`);
    } catch (e) {
      loi.push(`telegram: ${(e && e.cause && e.cause.code) || (e && e.name) || 'lỗi mạng'}`);
    }
  }
  if (env.CANH_EMAIL) {
    const sendmail = env.CANH_SENDMAIL || '/usr/sbin/sendmail';
    const tieuDe = tin.split('\n').find(l => l.startsWith('⚠')) ? 'CASA Mầm non: máy chủ cần xem' : 'CASA Mầm non: máy chủ';
    const thu = [
      `To: ${env.CANH_EMAIL}`,
      `Subject: =?UTF-8?B?${Buffer.from(tieuDe).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      tin,
      '',
    ].join('\n');
    const r = spawn(sendmail, ['-t'], { input: thu, timeout: 30000 });
    if (!r.error && r.status === 0) daGui.push('email');
    else loi.push(`email: ${r.error ? r.error.code || r.error.message : 'sendmail thoát mã ' + r.status}`);
  }
  return { daGui, loi };
}

function docTrangThai(tep) {
  try { return JSON.parse(fs.readFileSync(tep, 'utf8')); } catch { return {}; }
}

function ghiTrangThai(tep, tt) {
  try {
    fs.writeFileSync(`${tep}.tmp`, JSON.stringify(tt, null, 1));
    fs.renameSync(`${tep}.tmp`, tep);
    return true;
  } catch { return false; }
}

async function soatMotLuot(cfg, { fetchFn = fetch, spawn = spawnSync, bayGio = Date.now(), lan = 3, cachMs = 5000 } = {}) {
  const so = {};
  so.healthz = await hoiHealthz(cfg.url, { fetchFn, lan, cachMs });
  if (cfg.tenMien) so.ngoai = await hoiHealthz(`https://${cfg.tenMien}/healthz`, { fetchFn, lan, cachMs });
  try { so.dia = doDia(cfg.dataDir); } catch (e) { so.dia = { loi: e.code || e.message }; }
  so.saoLuu = banSaoMoiNhat(path.join(cfg.dataDir, 'backups'), bayGio);
  so.ffmpeg = cfg.canFfmpeg ? coFfmpeg(cfg.ffmpeg, spawn) : null;
  return { so, vanDe: danhGia(so, cfg) };
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const cfg = cauHinh(env);
  const kenh = kenhCo(env);
  const thuKenh = argv.includes('--thu-kenh');
  const iGui = argv.indexOf('--gui');
  if (thuKenh || iGui >= 0) {
    const tin = thuKenh
      ? `CASA Mầm non — máy ${cfg.tenMay}: tin thử của bộ canh máy. Nhận được tin này là kênh báo đã nối đúng.`
      : `CASA Mầm non — máy ${cfg.tenMay}\n${argv[iGui + 1] || ''}`;
    if (!kenh.length) {
      console.error('CHƯA CÓ KÊNH BÁO: đặt CANH_TELEGRAM_TOKEN + CANH_TELEGRAM_CHAT, hoặc CANH_EMAIL. Tin không gửi được:');
      console.error(tin);
      return 1;
    }
    const kq = await gui(tin, env);
    if (kq.daGui.length) console.log(`Đã gửi qua: ${kq.daGui.join(', ')}`);
    if (kq.loi.length) console.error(`Gửi hỏng: ${kq.loi.join('; ')}`);
    return kq.loi.length ? 1 : 0;
  }

  const { vanDe } = await soatMotLuot(cfg);
  const qd = quyetDinh(vanDe, docTrangThai(cfg.tepTrangThai), Date.now(), cfg.nhacLaiGio);
  const tin = soanTin(qd, cfg.tenMay);
  for (const v of vanDe) console.error(`⚠ ${v.chu}`);
  if (!vanDe.length) console.log('Máy ổn: app trả lời, ổ còn chỗ, sao lưu mới, có ffmpeg.');
  if (tin) {
    if (!kenh.length) {
      console.error('CHƯA CÓ KÊNH BÁO — không ai nhận được tin này. Chủ dự án chọn kênh: xem docs/DUA-VAO-DUNG.md, mục A6.');
      ghiTrangThai(cfg.tepTrangThai, qd.trangThai);
    } else {
      const kq = await gui(tin, env);
      if (kq.loi.length) console.error(`Gửi tin báo hỏng: ${kq.loi.join('; ')}`);
      // Không gửi được kênh nào thì KHÔNG ghi nhớ — lượt sau gửi lại.
      if (kq.daGui.length) ghiTrangThai(cfg.tepTrangThai, qd.trangThai);
    }
  } else {
    ghiTrangThai(cfg.tepTrangThai, qd.trangThai);
  }
  return vanDe.length ? 1 : 0;
}

module.exports = { cauHinh, hoiHealthz, doDia, banSaoMoiNhat, coFfmpeg, danhGia, quyetDinh, soanTin, kenhCo, gui, soatMotLuot, main };

if (require.main === module) {
  main().then(ma => process.exit(ma), (e) => {
    console.error(`Bộ canh máy lỗi: ${e && e.stack ? e.stack : e}`);
    process.exit(2);
  });
}
