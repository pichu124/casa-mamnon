// Bộ canh máy (scripts/canh-may.js, Đ261g): nó có báo đúng chỗ hỏng, im đúng
// lúc ổn, và không báo lặp không.
//
// Chạy bằng:  node test/canh-may.test.mjs     (TEST_PORT mặc định 7340)
//
// Không cần mạng: /healthz là một máy chủ HTTP nhỏ dựng ngay trong bài, Telegram
// và sendmail được thay bằng hàm giả. Mỗi phép soát thử CẢ HAI chiều (hỏng thì
// báo, sửa thì thôi báo) — chỉ thử một chiều thì không phân biệt được "bắt đúng"
// với "lúc nào cũng kêu".
import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { GOC, thuMucTam, donThuMucTam, taoBoDem } from './_chung.mjs';

const require2 = createRequire(import.meta.url);
const canh = require2(path.join(GOC, 'scripts', 'canh-may.js'));
const { check, tongKet } = taoBoDem();
const PORT = Number(process.env.TEST_PORT || 7340);
const GIO = 3600000;

const cfg = canh.cauHinh({ DATA_DIR: '/tmp/khong-co', PORT: '3000' });
const soTot = () => ({
  healthz: { ok: true }, dia: { phanTram: 40, trongGb: 100, tongGb: 180 },
  saoLuu: { tep: 'school-20261126-0200.db.gz', gioTuoi: 5 }, ffmpeg: true,
});
const ma = (vd) => vd.map(v => v.ma).sort().join(',');

console.log('\n[1] Đánh giá số đo');
check('mọi thứ ổn thì không có vấn đề nào', canh.danhGia(soTot(), cfg).length === 0);
check('app không trả lời → "app"', ma(canh.danhGia({ ...soTot(), healthz: { ok: false, loi: 'ECONNREFUSED' } }, cfg)) === 'app');
check('ổ 84% chưa báo', canh.danhGia({ ...soTot(), dia: { phanTram: 84, trongGb: 29 } }, cfg).length === 0);
const dia85 = canh.danhGia({ ...soTot(), dia: { phanTram: 85, trongGb: 27 } }, cfg);
check('ổ 85% → "dia", có số phần trăm', ma(dia85) === 'dia' && dia85[0].chu.includes('85%'), dia85);
check('bản sao 29 giờ chưa báo', canh.danhGia({ ...soTot(), saoLuu: { tep: 'x', gioTuoi: 29 } }, cfg).length === 0);
check('bản sao 31 giờ → "sao-luu"', ma(canh.danhGia({ ...soTot(), saoLuu: { tep: 'x', gioTuoi: 31 } }, cfg)) === 'sao-luu');
check('chưa có bản sao nào → "sao-luu"', ma(canh.danhGia({ ...soTot(), saoLuu: null }, cfg)) === 'sao-luu');
check('mất ffmpeg → "ffmpeg"', ma(canh.danhGia({ ...soTot(), ffmpeg: false }, cfg)) === 'ffmpeg');
check('CANH_CAN_FFMPEG=0 thì không đòi ffmpeg',
  canh.danhGia({ ...soTot(), ffmpeg: false }, canh.cauHinh({ CANH_CAN_FFMPEG: '0' })).length === 0);
check('tên miền hỏng → "ten-mien"',
  ma(canh.danhGia({ ...soTot(), ngoai: { ok: false, loi: 'CERT' } }, { ...cfg, tenMien: 'a.vn' })) === 'ten-mien');
check('ngưỡng đọc từ biến môi trường',
  canh.cauHinh({ CANH_DIA_PHAN_TRAM: '70', CANH_SAO_LUU_GIO: '50' }).diaPhanTram === 70
  && canh.cauHinh({ CANH_SAO_LUU_GIO: '50' }).saoLuuGio === 50);

console.log('\n[2] Tuổi bản sao mới nhất');
const DIR = thuMucTam('canh-may');
const BK = path.join(DIR, 'backups');
check('chưa có thư mục backups → null', canh.banSaoMoiNhat(BK) === null);
fs.mkdirSync(BK, { recursive: true });
check('thư mục rỗng → null', canh.banSaoMoiNhat(BK) === null);
// Tên ghi 02:00 hôm 20/11 (giờ VN) nhưng tệp vừa được chép sang (mtime = bây
// giờ): phải lấy mốc trong tên — sớm hơn — như kiem-tra-may-chu.js (Đ236).
fs.writeFileSync(path.join(BK, 'school-20261120-0200.db.gz'), 'x');
const mocTen = Date.UTC(2026, 10, 20, 2 - 7, 0);
const bs = canh.banSaoMoiNhat(BK, mocTen + 30 * GIO);
check('lấy mốc trong tên tệp khi tệp mới được chép sang', bs && bs.tep === 'school-20261120-0200.db.gz' && Math.abs(bs.gioTuoi - 30) < 0.01, bs);
fs.writeFileSync(path.join(BK, 'school-20261121-0200.db.gz'), 'x');
const bs2 = canh.banSaoMoiNhat(BK, mocTen + 30 * GIO);
check('chọn bản mới nhất', bs2 && bs2.tep === 'school-20261121-0200.db.gz' && Math.abs(bs2.gioTuoi - 6) < 0.01, bs2);

console.log('\n[3] Không báo lặp, báo khi đã ổn lại');
const t0 = Date.UTC(2026, 10, 26, 1);
const v1 = [{ ma: 'dia', chu: 'Ổ 90%' }];
let qd = canh.quyetDinh(v1, {}, t0, 6);
check('vấn đề mới thì báo', qd.canBao.length === 1 && qd.canBao[0].loai === 'moi');
qd = canh.quyetDinh(v1, qd.trangThai, t0 + 5 * 60000, 6);
check('5 phút sau, cùng vấn đề: im', qd.canBao.length === 0 && qd.daOn.length === 0 && qd.trangThai.dia);
qd = canh.quyetDinh(v1, qd.trangThai, t0 + 6 * GIO, 6);
check('6 giờ sau vẫn còn: nhắc lại, giữ mốc bắt đầu', qd.canBao.length === 1 && qd.canBao[0].loai === 'nhac-lai' && qd.canBao[0].tuLuc === t0);
const tinNhac = canh.soanTin(qd, 'may-thu');
check('tin nhắc lại ghi "VẪN CÒN"', tinNhac.includes('VẪN CÒN') && tinNhac.includes('Ổ 90%') && tinNhac.includes('may-thu'), tinNhac);
qd = canh.quyetDinh([], qd.trangThai, t0 + 7 * GIO, 6);
check('hết vấn đề: báo đã ổn lại, xoá khỏi trạng thái', qd.daOn.length === 1 && !qd.trangThai.dia);
check('tin "ĐÃ ỔN LẠI"', canh.soanTin(qd, 'm').includes('ĐÃ ỔN LẠI'));
qd = canh.quyetDinh([], qd.trangThai, t0 + 8 * GIO, 6);
check('không có gì: không soạn tin', canh.soanTin(qd, 'm') === '');
check('trạng thái hỏng (không phải object) coi như rỗng', canh.quyetDinh(v1, 'rác', t0, 6).canBao.length === 1);

console.log('\n[4] Hỏi /healthz (hàm fetch giả)');
const fetchGia = (dsTraLoi, ghi = []) => async (url, opt) => {
  ghi.push({ url, opt });
  const r = dsTraLoi.shift();
  if (r instanceof Error) throw r;
  return { status: r.status, ok: r.status < 300, text: async () => r.body };
};
let ghi = [];
let h = await canh.hoiHealthz('http://x/healthz', { fetchFn: fetchGia([{ status: 200, body: '{"ok":true}' }], ghi), cachMs: 0 });
check('200 {"ok":true} → ổn, một lần hỏi', h.ok && ghi.length === 1);
check('gửi kèm X-Forwarded-Proto: https (máy chạy FORCE_HTTPS)', ghi[0].opt.headers['X-Forwarded-Proto'] === 'https');
const loiNoi = Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
h = await canh.hoiHealthz('http://x', { fetchFn: fetchGia([loiNoi, loiNoi, { status: 200, body: '{"ok":true}' }]), cachMs: 0 });
check('hai lần đầu hỏng (đang khởi động lại), lần ba được → ổn', h.ok);
h = await canh.hoiHealthz('http://x', { fetchFn: fetchGia([loiNoi, loiNoi, loiNoi]), cachMs: 0 });
check('ba lần hỏng → không ổn, ghi mã lỗi', !h.ok && h.loi === 'ECONNREFUSED', h);
h = await canh.hoiHealthz('http://x', { fetchFn: fetchGia([{ status: 308, body: '' }]), lan: 1, cachMs: 0 });
check('308 (chuyển sang https) không được coi là ổn', !h.ok && h.loi.includes('308'), h);
h = await canh.hoiHealthz('http://x', { fetchFn: fetchGia([{ status: 200, body: '<html>' }]), lan: 1, cachMs: 0 });
check('200 nhưng không phải {"ok":true} (trang khác) → không ổn', !h.ok);

console.log('\n[5] Gửi tin (Telegram, sendmail giả)');
check('không đặt gì → không có kênh', canh.kenhCo({}).length === 0);
check('thiếu CHAT thì chưa tính Telegram', canh.kenhCo({ CANH_TELEGRAM_TOKEN: 'a' }).length === 0);
ghi = [];
let kq = await canh.gui('xin chào', { CANH_TELEGRAM_TOKEN: 'TOKEN-GIA', CANH_TELEGRAM_CHAT: '-100' }, { fetchFn: fetchGia([{ status: 200, body: '{}' }], ghi) });
const than = JSON.parse(ghi[0].opt.body);
check('Telegram: đúng địa chỉ bot, đúng chat, đúng chữ',
  kq.daGui[0] === 'telegram' && ghi[0].url === 'https://api.telegram.org/botTOKEN-GIA/sendMessage'
  && than.chat_id === '-100' && than.text === 'xin chào', { kq, than });
kq = await canh.gui('x', { CANH_TELEGRAM_TOKEN: 'TOKEN-GIA', CANH_TELEGRAM_CHAT: '1' }, { fetchFn: fetchGia([{ status: 401, body: '' }]) });
check('Telegram từ chối: báo lỗi, không lộ token', kq.daGui.length === 0 && kq.loi[0].includes('401') && !kq.loi.join('').includes('TOKEN-GIA'), kq);
let vao = null;
kq = await canh.gui('Ổ đầy\n⚠ MỚI: x', { CANH_EMAIL: 'truc@vd.vn', CANH_SENDMAIL: '/x/sendmail' },
  { spawn: (lenh, args, opt) => { vao = { lenh, args, input: opt.input }; return { status: 0 }; } });
check('thư: gọi sendmail -t, có người nhận, tiêu đề mã hoá UTF-8, có nội dung',
  kq.daGui[0] === 'email' && vao.lenh === '/x/sendmail' && vao.args[0] === '-t'
  && vao.input.includes('To: truc@vd.vn') && /Subject: =\?UTF-8\?B\?/.test(vao.input) && vao.input.includes('Ổ đầy'), vao);
kq = await canh.gui('x', { CANH_EMAIL: 'a@b' }, { spawn: () => ({ error: Object.assign(new Error('x'), { code: 'ENOENT' }) }) });
check('máy không có sendmail: báo lỗi, không ném', kq.daGui.length === 0 && kq.loi[0].includes('ENOENT'), kq);

console.log('\n[6] Chạy thật như systemd timer (máy chủ /healthz giả, không kênh báo)');
let healthOk = true;
const may = http.createServer((req, res) => {
  if (req.url === '/healthz' && healthOk && req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}');
  } else { res.statusCode = 503; res.end('no'); }
});
await new Promise(r => may.listen(PORT, '127.0.0.1', r));
// ffmpeg giả: một tệp chạy được, thoát 0. Windows không chạy được tệp #!/bin/sh,
// nên ở đó bỏ phần soát ffmpeg (CANH_CAN_FFMPEG=0) — phần ấy đã canh ở [1].
const WIN = process.platform === 'win32';
const FAKE_FF = path.join(DIR, 'ffmpeg-gia.sh');
fs.writeFileSync(FAKE_FF, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
const envGoc = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^CANH_|^PORT$|^CASA_FF/.test(k)));
const tenMoi = () => {
  const t = new Date(Date.now() + 7 * GIO - 60000).toISOString();
  return `school-${t.slice(0, 10).replace(/-/g, '')}-${t.slice(11, 13)}${t.slice(14, 16)}.db.gz`;
};
fs.rmSync(BK, { recursive: true, force: true }); fs.mkdirSync(BK);
fs.writeFileSync(path.join(BK, tenMoi()), 'x');
function chay(env = {}, args = []) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(GOC, 'scripts', 'canh-may.js'), ...args], {
      cwd: GOC,
      env: {
        ...envGoc, DATA_DIR: DIR, CANH_URL: `http://127.0.0.1:${PORT}/healthz`,
        CASA_FFMPEG: FAKE_FF, CANH_TEN_MAY: 'may-thu', ...(WIN ? { CANH_CAN_FFMPEG: '0' } : {}), ...env,
      },
    });
    let out = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('close', code => resolve({ code, out }));
  });
}
let r = await chay();
check('mọi thứ ổn → mã 0, "Máy ổn"', r.code === 0 && r.out.includes('Máy ổn'), r);
r = await chay({ CANH_DIA_PHAN_TRAM: '0' });
check('ổ vượt ngưỡng, chưa có kênh → mã 1, nói rõ CHƯA CÓ KÊNH BÁO', r.code === 1 && r.out.includes('CHƯA CÓ KÊNH BÁO') && r.out.includes('Ổ chứa dữ liệu'), r);
if (!WIN) {
  r = await chay({ CASA_FFMPEG: path.join(DIR, 'khong-co-ffmpeg') });
  check('mất ffmpeg → mã 1, nhắc lệnh cài', r.code === 1 && r.out.includes('apt install -y ffmpeg'), r);
}
r = await chay({}, ['--gui', 'thử']);
check('--gui khi chưa có kênh → mã 1, in tin ra nhật ký', r.code === 1 && r.out.includes('CHƯA CÓ KÊNH BÁO') && r.out.includes('thử'), r);
check('tệp trạng thái nằm trong DATA_DIR', fs.existsSync(path.join(DIR, 'canh-may.json')));
fs.rmSync(path.join(DIR, 'canh-may.json'), { force: true });
healthOk = false;
// Rút ngắn khoảng chờ giữa ba lần hỏi để bài chạy nhanh: gọi thẳng soatMotLuot.
const cfgTest = { ...canh.cauHinh({ DATA_DIR: DIR, CASA_FFMPEG: FAKE_FF, CANH_CAN_FFMPEG: WIN ? '0' : '1' }), url: `http://127.0.0.1:${PORT}/healthz` };
const kqLuot = await canh.soatMotLuot(cfgTest, { cachMs: 0 });
check('app trả 503 → vấn đề "app"', ma(kqLuot.vanDe) === 'app', kqLuot.vanDe);
healthOk = true;
const kqLai = await canh.soatMotLuot(cfgTest, { cachMs: 0 });
check('app trả lời lại → hết vấn đề', kqLai.vanDe.length === 0, kqLai.vanDe);
await new Promise(r2 => may.close(r2));

donThuMucTam(DIR);
tongKet();
