// Bài canh NÉN VIDEO TRÊN MÁY CHỦ (Đ260f, chủ dự án quyết 25/11).
//
// Chạy bằng:  node test/nen-video-may-chu.test.mjs
//
// Trên iPhone, bản nén trong trình duyệt (`UI.nenVideo`) rất mờ: Safari bỏ qua
// bitrate xin, tệp ra chừng 0,4 MB. Chủ dự án quyết: máy chủ nén bằng ffmpeg,
// đầu ra 720p. Bài này dùng ffmpeg THẬT để dựng video mẫu, gửi từng phần như
// điện thoại gửi, chờ máy chủ nén xong rồi đọc lại tệp ra bằng ffprobe.
//
//   [1] Video dọc của iPhone (ghi ngang + cờ xoay 90°, có tiếng) → album:
//       H.264, yuv420p, cạnh ngắn 720 ĐÃ XOAY ĐÚNG, AAC, faststart, có ảnh bìa;
//       tệp gốc không còn trên đĩa.
//   [2] Tệp nhiều phần, gửi lại một phần, gửi sai thứ tự; video không tiếng.
//   [3] Video nhỏ hơn 720 không bị phóng to — Hành trình (nháp) nhận maTep.
//   [4] Gia đình nhóm đó xem được video và ảnh bìa; gia đình nhóm khác 403.
//   [5] Các ca từ chối: maTep của người khác / đã dùng / sai nơi / bậy → 400;
//       tệp không phải video → câu tiếng Việt; khai quá 500 MB → 400; phụ
//       huynh → 403; lượt của người khác → 404; tối đa 3 lượt dở; huỷ lượt.
//   [6] Tắt phân hệ Album → đường bị chặn; Hành trình vẫn chạy.
//   [7] Khởi động lại giữa chừng → lượt dở thành 'loi' (cô gửi lại).
//   [8] Không có ffmpeg (CASA_FFMPEG trỏ tệp không có) → coNen:false, đường
//       cũ (data URL) vẫn chạy y nguyên.
//
// Máy không có ffmpeg (vd máy chạy CI chưa cài) thì [1]–[7] không chạy được:
// bài báo RÕ là bỏ qua, chỉ chạy [8] — đó đúng là đường app tự đi khi thiếu
// ffmpeg. Đặt CASA_BAT_BUOC_FFMPEG=1 để biến việc thiếu ffmpeg thành lỗi đỏ.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, tatPhanHe, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const CONG = Number(process.env.TEST_PORT || 6010);

const coFf = (() => {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
      && spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch (_) { return false; }
})();

function ff(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg dựng mẫu lỗi: ${r.stderr}`);
}
function probe(tep) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', tep], { encoding: 'utf8' });
  return r.status === 0 ? JSON.parse(r.stdout) : null;
}
const cho = ms => new Promise(r => setTimeout(r, ms));

// Gửi một tệp từng phần như màn hình gửi. Trả về mã lượt.
async function guiTungPhan(BASE, cookie, tienTo, buf, { ten = 'mau.mov', loai = 'video/quicktime' } = {}) {
  const req = taoReq(BASE);
  const bd = await req('POST', `${tienTo}/bat-dau`, { cookie, body: { ten, kichThuoc: buf.length, loai } });
  if (bd.status !== 201) return { bd };
  const { id, kichMoiPhan } = bd.data;
  for (let so = 0; so * kichMoiPhan < buf.length; so += 1) {
    const r = await putPhan(BASE, cookie, tienTo, id, so, buf.subarray(so * kichMoiPhan, (so + 1) * kichMoiPhan));
    if (r.status !== 200) return { bd, loiPhan: r };
  }
  const xong = await req('POST', `${tienTo}/${id}/xong`, { cookie });
  return { bd, id, xong };
}
async function putPhan(BASE, cookie, tienTo, id, so, buf) {
  const res = await fetch(`${BASE}${tienTo}/${id}/phan/${so}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', Cookie: cookie }, body: buf,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* không phải JSON */ }
  return { status: res.status, data };
}
async function choXong(BASE, cookie, tienTo, id, giay = 90) {
  const req = taoReq(BASE);
  let r = null;
  for (let i = 0; i < giay * 4; i += 1) {
    r = await req('GET', `${tienTo}/${id}`, { cookie });
    if (r.status !== 200 || ['xong', 'loi'].includes(r.data.trangThai)) return r;
    await cho(250);
  }
  return r;
}
const moovTruocMdat = (tep) => {
  const d = fs.readFileSync(tep);
  const moov = d.indexOf('moov');
  const mdat = d.indexOf('mdat');
  return moov > 0 && mdat > 0 && moov < mdat;
};

const DIR = thuMucTam('nen-video-may-chu');
const DIR2 = thuMucTam('nen-video-may-chu-khong-ff');
const MAU = path.join(DIR, '..', 'nen-video-may-chu-mau');
fs.rmSync(MAU, { recursive: true, force: true });
fs.mkdirSync(MAU, { recursive: true });

try {
  if (!coFf) {
    if (process.env.CASA_BAT_BUOC_FFMPEG === '1') {
      check('máy chạy bài có ffmpeg và ffprobe (CASA_BAT_BUOC_FFMPEG=1)', false);
    } else {
      console.log('\n⚠  MÁY NÀY KHÔNG CÓ ffmpeg — BỎ QUA [1]–[7], chỉ chạy [8] (đường app tự đi khi thiếu ffmpeg).');
      console.log('   Cài ffmpeg (sudo apt install -y ffmpeg) để chạy đủ bài.\n');
    }
  } else {
    // Mẫu A: iPhone quay dọc = ghi 1920x1080 + cờ xoay 90°, có tiếng.
    ff(['-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
      '-t', '3', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path.join(MAU, 'a0.mp4')]);
    ff(['-display_rotation', '90', '-i', path.join(MAU, 'a0.mp4'), '-c', 'copy', path.join(MAU, 'a.mov')]);
    // Mẫu B: nặng (MJPEG) để chia nhiều phần, KHÔNG có tiếng, ngang 1280x720.
    ff(['-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30', '-t', '5', '-c:v', 'mjpeg', '-q:v', '2',
      '-pix_fmt', 'yuvj420p', path.join(MAU, 'b.mov')]);
    // Mẫu C: nhỏ hơn 720 — không được phóng to.
    ff(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25', '-t', '2', '-c:v', 'libx264', '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p', path.join(MAU, 'c.mp4')]);
    const A = fs.readFileSync(path.join(MAU, 'a.mov'));
    const B = fs.readFileSync(path.join(MAU, 'b.mov'));
    const C = fs.readFileSync(path.join(MAU, 'c.mp4'));
    const pa = probe(path.join(MAU, 'a.mov'));
    check('đối chứng — mẫu A ghi 1920x1080 kèm cờ xoay 90° (như iPhone quay dọc)',
      JSON.stringify(pa).includes('"rotation"') && pa.streams.some(s => s.width === 1920), pa && pa.streams.map(s => [s.width, s.height]));
    check('đối chứng — mẫu B đủ nặng để chia nhiều phần (> 8 MB)', B.length > 8 * 1024 * 1024, B.length);

    sinhDuLieu(DIR);
    const sv = await dungMayChu({ port: CONG, dir: DIR, env: { HEN_GIO_PHUT: '0' } });
    const req = taoReq(sv.BASE);
    const login = taoLogin(req);
    let co = (await login('giaovien', '123456')).cookie;
    const co2 = (await login('giaovien2', '123456')).cookie;
    const ph = (await login('phuhuynh', '123456')).cookie;
    const phKhac = (await login('ph.trang', '123456')).cookie;
    check('đối chứng — đăng nhập được hai cô và hai gia đình', !!co && !!co2 && !!ph && !!phKhac);
    const TT = '/api/albums/video';
    const HT = '/api/hanhtrinh/video';
    const tamCon = () => { try { return fs.readdirSync(path.join(DIR, 'video-tam')); } catch (_) { return []; } };

    // =====================================================================
    console.log('\n[1] Video dọc của iPhone → album: H.264 720p đã xoay đúng, có tiếng, faststart, có ảnh bìa');
    let albumId = null;
    let fileA = null;
    let photoA = null;
    {
      const g = await guiTungPhan(sv.BASE, co, TT, A);
      check('bat-dau trả coNen:true, mã lượt 32 hex và cỡ mỗi phần',
        g.bd.status === 201 && g.bd.data.coNen === true && /^[a-f0-9]{32}$/.test(g.bd.data.id) && g.bd.data.kichMoiPhan > 0,
        g.bd);
      check('xong → 202 "dang-nen"', g.xong && g.xong.status === 202 && g.xong.data.trangThai === 'dang-nen', g.xong);
      const tt = await choXong(sv.BASE, co, TT, g.id);
      check('máy chủ nén xong, trả maTep', tt.data.trangThai === 'xong' && tt.data.maTep === g.id, tt.data);
      check('tệp gốc đã xoá khỏi thư mục tạm sau khi nén', !tamCon().includes(`${g.id}.goc`), tamCon());
      const al = await req('POST', '/api/albums', { cookie: co, body: {
        classId: 'c1', title: 'Bé chơi cát', description: 'Cả nhóm ra sân cát', photos: [{ videoDaNen: g.id, caption: 'Con xúc cát' }] } });
      check('tạo album bằng maTep → 201', al.status === 201, al);
      albumId = al.data.id;
      fileA = al.data.photos && al.data.photos[0] && al.data.photos[0].file;
      photoA = al.data.photos && al.data.photos[0] && al.data.photos[0].id;
      check('ảnh trong album là tệp .mp4 tên ngẫu nhiên', /^[a-f0-9]{32}\.mp4$/.test(fileA || ''), fileA);
      const ra = path.join(DIR, 'uploads', fileA || 'x');
      const p = probe(ra);
      const v = p && p.streams.find(s => s.codec_type === 'video');
      const a = p && p.streams.find(s => s.codec_type === 'audio');
      check('đầu ra H.264, yuv420p', v && v.codec_name === 'h264' && v.pix_fmt === 'yuv420p', v && [v.codec_name, v.pix_fmt]);
      check('đã xoay theo cờ của iPhone: dọc 720x1280 (cạnh ngắn 720)', v && v.width === 720 && v.height === 1280, v && [v.width, v.height]);
      check('không còn cờ xoay trong tệp ra (trình phát nào cũng đứng đúng)', !JSON.stringify(v || {}).includes('"rotation":90') && !JSON.stringify(v || {}).includes('"rotation": 90'));
      check('giữ tiếng: AAC', a && a.codec_name === 'aac', a && a.codec_name);
      check('faststart: hộp moov đứng trước mdat (phát được trước khi tải hết)', fs.existsSync(ra) && moovTruocMdat(ra));
      check('có ảnh bìa JPEG cạnh dài ≤ 640 nằm cạnh video', (() => {
        const bia = path.join(DIR, 'uploads', String(fileA).replace('.mp4', '.jpg'));
        const pb = fs.existsSync(bia) ? probe(bia) : null;
        const s = pb && pb.streams[0];
        return !!s && s.codec_name === 'mjpeg' && Math.max(s.width, s.height) <= 640;
      })());
      check('thư mục tạm không còn tệp nào của lượt đã dùng', !tamCon().some(t => t.startsWith(g.id)), tamCon());
      const dung2 = await req('POST', `/api/albums/${albumId}/photos`, { cookie: co, body: { photos: [{ videoDaNen: g.id }] } });
      check('dùng lại maTep đã dùng → 400', dung2.status === 400 && /không còn dùng được/.test(dung2.data.error || ''), dung2);
      const ct = await req('GET', `/api/albums/${albumId}`, { cookie: co });
      const pp = (ct.data.photos || []).find(x => x.id === photoA);
      check('chi tiết album báo video có ảnh bìa (coBia)', pp && pp.coBia === true, pp);
    }

    // =====================================================================
    console.log('\n[2] Nhiều phần: gửi lại một phần, gửi sai thứ tự; video không tiếng');
    {
      const bd = await req('POST', `${TT}/bat-dau`, { cookie: co, body: { ten: 'b.mov', kichThuoc: B.length, loai: 'video/quicktime' } });
      const { id, kichMoiPhan } = bd.data;
      const phan = so => B.subarray(so * kichMoiPhan, (so + 1) * kichMoiPhan);
      const soPhan = Math.ceil(B.length / kichMoiPhan);
      check('đối chứng — mẫu B chia thành ≥ 3 phần', soPhan >= 3, soPhan);
      const sai = await putPhan(sv.BASE, co, TT, id, 1, phan(1));
      check('gửi phần 1 khi chưa có phần 0 → 400 "sai thứ tự"', sai.status === 400 && /sai thứ tự/.test(sai.data.error || ''), sai);
      check('phần 0 → 200', (await putPhan(sv.BASE, co, TT, id, 0, phan(0))).status === 200);
      check('gửi lại phần 0 (mạng chập chờn) → 200, không nhân đôi', (await putPhan(sv.BASE, co, TT, id, 0, phan(0))).data.daNhan === kichMoiPhan);
      const nhay = await putPhan(sv.BASE, co, TT, id, 2, phan(2));
      check('nhảy cóc sang phần 2 → 400', nhay.status === 400, nhay);
      const khac = await putPhan(sv.BASE, co2, TT, id, 1, phan(1));
      check('cô khác gửi phần vào lượt này → 404 (không xác nhận lượt tồn tại)', khac.status === 404, khac);
      const thieu = await putPhan(sv.BASE, co, TT, id, 1, phan(1).subarray(0, 1000));
      check('phần giữa bị cụt → 400', thieu.status === 400, thieu);
      const somXong = await req('POST', `${TT}/${id}/xong`, { cookie: co });
      check('báo xong khi chưa gửi đủ → 400', somXong.status === 400, somXong);
      for (let so = 1; so < soPhan; so += 1) await putPhan(sv.BASE, co, TT, id, so, phan(so));
      const giua = await req('GET', `${TT}/${id}`, { cookie: co });
      check('đang gửi: GET báo đủ byte', giua.data.trangThai === 'dang-gui' && giua.data.daNhan === B.length, giua.data);
      check('xong → 202', (await req('POST', `${TT}/${id}/xong`, { cookie: co })).status === 202);
      const tt = await choXong(sv.BASE, co, TT, id);
      check('nén xong tệp nhiều phần', tt.data.trangThai === 'xong', tt.data);
      const r = await req('POST', `/api/albums/${albumId}/photos`, { cookie: co, body: { photos: [{ videoDaNen: id }] } });
      check('thêm vào album bằng maTep → 201', r.status === 201, r);
      const f = r.data.photos && r.data.photos[0] && r.data.photos[0].file;
      const p = probe(path.join(DIR, 'uploads', f || 'x'));
      const v = p && p.streams.find(s => s.codec_type === 'video');
      check('ngang 1280x720 giữ nguyên (cạnh ngắn đã là 720), H.264', v && v.codec_name === 'h264' && v.width === 1280 && v.height === 720, v && [v.width, v.height]);
      check('video không tiếng vẫn nén được (không có luồng tiếng)', p && !p.streams.some(s => s.codec_type === 'audio'));
      check('dài đúng bằng bản gốc (~5 giây)', p && Math.abs(Number(p.format.duration) - 5) < 0.3, p && p.format.duration);
    }

    // =====================================================================
    console.log('\n[3] Video nhỏ hơn 720 không bị phóng to — Hành trình nhận maTep');
    {
      const g = await guiTungPhan(sv.BASE, co, HT, C, { ten: 'c.mp4', loai: 'video/mp4' });
      const tt = await choXong(sv.BASE, co, HT, g.id);
      check('Hành trình: nén xong', tt.data.trangThai === 'xong', tt.data);
      const sai = await req('POST', '/api/albums', { cookie: co, body: { classId: 'c1', title: 'x', photos: [{ videoDaNen: g.id }] } });
      check('maTep gửi ở Hành trình không dùng được ở Album → 400', sai.status === 400, sai);
      const n = await req('POST', '/api/hanhtrinh/nhap', { cookie: co, body: { moTa: '', videoDaNen: g.id } });
      check('lưu nháp Hành trình bằng maTep → 201, là video', n.status === 201 && n.data.nhap && n.data.nhap.laVideo, n);
      const f = n.data.nhap && n.data.nhap.anh;
      const p = probe(path.join(DIR, 'uploads', f || 'x'));
      const v = p && p.streams.find(s => s.codec_type === 'video');
      check('640x360 giữ nguyên, không phóng to', v && v.width === 640 && v.height === 360, v && [v.width, v.height]);
      check('Hành trình không tạo ảnh bìa', !fs.existsSync(path.join(DIR, 'uploads', String(f).replace('.mp4', '.jpg'))));
      const lai = await req('POST', '/api/hanhtrinh/nhap', { cookie: co, body: { moTa: 'x', videoDaNen: g.id } });
      check('maTep đã dùng ở Hành trình → 400', lai.status === 400, lai);
      const bay = await req('POST', '/api/hanhtrinh/nhap', { cookie: co, body: { moTa: 'x', videoDaNen: '../../school' } });
      check('maTep bậy → 400', bay.status === 400, bay);
    }

    // =====================================================================
    console.log('\n[4] Gia đình nhóm đó xem được; gia đình nhóm khác thì không');
    {
      // Nhóm Chồi 2 trong dữ liệu mẫu có bé đã rút đồng ý chia sẻ ảnh, nên ảnh
      // chưa gắn thẻ tạm ẩn với các nhà (luật ảnh nhóm). Gắn thẻ bé s1 — con
      // của `phuhuynh` — đúng như cô làm khi đăng.
      const gan = await req('PUT', `/api/albums/${albumId}/photos/${photoA}/be`, { cookie: co, body: { studentIds: ['s1'] } });
      check('đối chứng — gắn thẻ bé vào video máy chủ nén, y như ảnh', gan.status === 200, gan);
      const xem = await fetch(`${sv.BASE}/api/albums/${albumId}/photo/${photoA}`, { headers: { Cookie: ph } });
      const buf = Buffer.from(await xem.arrayBuffer());
      check('gia đình nhóm Chồi 2 tải được video (200, video/mp4)', xem.status === 200 && /video\/mp4/.test(xem.headers.get('content-type') || '') && buf.length > 1000,
        [xem.status, xem.headers.get('content-type')]);
      const bia = await fetch(`${sv.BASE}/api/albums/${albumId}/photo/${photoA}?bia=1`, { headers: { Cookie: ph } });
      check('…và ảnh bìa (image/jpeg)', bia.status === 200 && /image\/jpeg/.test(bia.headers.get('content-type') || ''), bia.status);
      const khac = await fetch(`${sv.BASE}/api/albums/${albumId}/photo/${photoA}`, { headers: { Cookie: phKhac } });
      check('gia đình nhóm khác → 403', khac.status === 403, khac.status);
      const khacBia = await fetch(`${sv.BASE}/api/albums/${albumId}/photo/${photoA}?bia=1`, { headers: { Cookie: phKhac } });
      check('gia đình nhóm khác xin ảnh bìa → 403', khacBia.status === 403, khacBia.status);
    }

    // =====================================================================
    console.log('\n[5] Các ca từ chối');
    {
      const g = await guiTungPhan(sv.BASE, co, TT, C, { ten: 'c.mp4', loai: 'video/mp4' });
      await choXong(sv.BASE, co, TT, g.id);
      const xemTrom = await req('GET', `${TT}/${g.id}`, { cookie: co2 });
      check('cô khác hỏi trạng thái lượt của cô → 404', xemTrom.status === 404, xemTrom);
      const ke = await req('POST', '/api/albums', { cookie: co2, body: { classId: 'c2', title: 'Mượn', photos: [{ videoDaNen: g.id }] } });
      check('cô khác dùng maTep của cô → 400', ke.status === 400, ke);
      const cuaMinh = await req('POST', `/api/albums/${albumId}/photos`, { cookie: co, body: { photos: [{ videoDaNen: g.id }] } });
      check('…mã vẫn còn nguyên cho chính chủ', cuaMinh.status === 201, cuaMinh);

      const chu = await guiTungPhan(sv.BASE, co, TT, Buffer.from('Đây là một tệp chữ, không phải video. '.repeat(50)), { ten: 'ghi-chu.mov', loai: 'video/quicktime' });
      check('tệp chữ đổi đuôi .mov → xong 400, câu tiếng Việt "không phải video"',
        chu.xong && chu.xong.status === 400 && /không phải video/.test(chu.xong.data.error || ''), chu.xong);
      const gia = Buffer.alloc(64 * 1024, 7);
      gia.writeUInt32BE(32, 0);
      gia.write('ftypisom', 4, 'ascii');
      const gg = await guiTungPhan(sv.BASE, co, TT, gia, { ten: 'hong.mp4', loai: 'video/mp4' });
      check('tệp có chữ ký MP4 nhưng hỏng → qua bước xong (202)', gg.xong && gg.xong.status === 202, gg.xong);
      const ttg = await choXong(sv.BASE, co, TT, gg.id);
      check('…máy chủ báo "loi" bằng câu tiếng Việt, không lộ chữ kỹ thuật',
        ttg.data.trangThai === 'loi' && /không phải video/.test(ttg.data.loi || '') && !/ffmpeg|ffprobe|Error/i.test(ttg.data.loi || ''), ttg.data);

      const to = await req('POST', `${TT}/bat-dau`, { cookie: co, body: { ten: 'dai.mov', kichThuoc: 501 * 1024 * 1024, loai: 'video/quicktime' } });
      check('khai 501 MB → 400, nói trần 500 MB', to.status === 400 && /500 MB/.test(to.data.error || ''), to);
      const anh = await req('POST', `${TT}/bat-dau`, { cookie: co, body: { ten: 'a.jpg', kichThuoc: 1000, loai: 'image/jpeg' } });
      check('khai loại ảnh → 400', anh.status === 400, anh);
      const phGui = await req('POST', `${TT}/bat-dau`, { cookie: ph, body: { ten: 'a.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
      check('phụ huynh gọi bat-dau → 403', phGui.status === 403, phGui);
      const phHt = await req('POST', `${HT}/bat-dau`, { cookie: ph, body: { ten: 'a.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
      check('phụ huynh gọi bat-dau ở Hành trình → 403', phHt.status === 403, phHt);
      const la = await req('POST', `${TT}/bat-dau`, { body: { ten: 'a.mov', kichThuoc: 1000 } });
      check('chưa đăng nhập → 401', la.status === 401, la);
      const leo = await req('GET', `${TT}/..%2F..%2Fschool.db`, { cookie: co });
      check('mã lượt kiểu ../ → 404', leo.status === 404, leo);

      const luot = [];
      for (let i = 0; i < 3; i += 1) {
        luot.push((await req('POST', `${TT}/bat-dau`, { cookie: co, body: { ten: `v${i}.mov`, kichThuoc: 1000, loai: 'video/quicktime' } })).data.id);
      }
      const thu4 = await req('POST', `${TT}/bat-dau`, { cookie: co, body: { ten: 'v4.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
      check('lượt dở thứ 4 cùng lúc → 429 kèm lời nhắn chờ', thu4.status === 429 && /chờ/.test(thu4.data.error || ''), thu4);
      const huy = await req('DELETE', `${TT}/${luot[0]}`, { cookie: co });
      check('huỷ một lượt (DELETE) → 200', huy.status === 200, huy);
      check('…lượt đã huỷ hỏi lại → 404, tệp tạm đã dọn',
        (await req('GET', `${TT}/${luot[0]}`, { cookie: co })).status === 404 && !tamCon().some(t => t.startsWith(luot[0])));
      check('…huỷ xong thì gửi được lượt mới',
        (await req('POST', `${TT}/bat-dau`, { cookie: co, body: { ten: 'v5.mov', kichThuoc: 1000, loai: 'video/quicktime' } })).status === 201);
      // Lượt còn dở dùng cho [7].
      globalThis.LUOT_DO = luot[1];
    }

    // =====================================================================
    console.log('\n[6] Tắt phân hệ Album → đường gửi video của Album bị chặn');
    {
      tatPhanHe(DIR, ['album']);
      const r = await req('POST', `${TT}/bat-dau`, { cookie: co2, body: { ten: 'a.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
      check('Album tắt → bat-dau 404 "đang được nhà trường tắt"', r.status === 404 && /tắt/.test(r.data.error || ''), r);
      const ht = await req('POST', `${HT}/bat-dau`, { cookie: co2, body: { ten: 'a.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
      check('…Hành trình vẫn gửi được', ht.status === 201, ht);
      batPhanHe(DIR, ['album']);
    }

    // =====================================================================
    console.log('\n[7] Khởi động lại giữa chừng → lượt dở thành "loi", cô gửi lại');
    {
      await sv.khoiDongLai();
      co = (await taoLogin(req)('giaovien', '123456')).cookie;
      const r = await req('GET', `${TT}/${globalThis.LUOT_DO}`, { cookie: co });
      check('lượt đang gửi dở trước khi khởi động lại → "loi" kèm lời bảo gửi lại',
        r.status === 200 && r.data.trangThai === 'loi' && /gửi lại/.test(r.data.loi || ''), r.data);
      const vanVao = await req('GET', '/api/albums', { cookie: co });
      check('app vẫn chạy sau khởi động lại (danh sách album 200)', vanVao.status === 200);
    }
    sv.dung();
  }

  // =========================================================================
  console.log('\n[8] Không có ffmpeg → coNen:false, đường cũ (data URL) chạy y nguyên');
  {
    sinhDuLieu(DIR2);
    const sv2 = await dungMayChu({ port: CONG + 1, dir: DIR2, env: { CASA_FFMPEG: '/khong-co/ffmpeg', HEN_GIO_PHUT: '0' } });
    const req = taoReq(sv2.BASE);
    const co = (await taoLogin(req)('giaovien', '123456')).cookie;
    const bd = await req('POST', '/api/albums/video/bat-dau', { cookie: co, body: { ten: 'a.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
    check('bat-dau → 200 {coNen:false}', bd.status === 200 && bd.data.coNen === false, bd);
    const bdHt = await req('POST', '/api/hanhtrinh/video/bat-dau', { cookie: co, body: { ten: 'a.mov', kichThuoc: 1000, loai: 'video/quicktime' } });
    check('Hành trình cũng {coNen:false}', bdHt.status === 200 && bdHt.data.coNen === false, bdHt);
    const b = Buffer.alloc(4096);
    b.writeUInt32BE(4096, 0);
    b.write('ftypisom', 4, 'ascii');
    const al = await req('POST', '/api/albums', { cookie: co, body: {
      classId: 'c1', title: 'Đường cũ', photos: [{ video: `data:video/mp4;base64,${b.toString('base64')}` }] } });
    check('tạo album bằng video data URL như trước → 201', al.status === 201, al);
    const n = await req('POST', '/api/hanhtrinh/nhap', { cookie: co, body: { moTa: '', video: `data:video/mp4;base64,${b.toString('base64')}` } });
    check('nháp Hành trình bằng video data URL như trước → 201', n.status === 201, n);
    check('đăng nhập và trang chủ vẫn chạy', (await req('GET', '/api/modules', { cookie: co })).status === 200);
    sv2.dung();
  }
} catch (err) {
  console.error(err);
  check('bài chạy hết không ném lỗi', false, err.message);
} finally {
  donThuMucTam(DIR);
  donThuMucTam(DIR2);
  donThuMucTam(MAU);
}
tongKet();
