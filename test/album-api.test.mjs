// Kiểm thử tải ảnh lên album ở TẦNG API: phân quyền, và chống tệp độc hại.
//
// KHÔNG CẦN TRÌNH DUYỆT. Chạy bằng:  npm run test:album-api
//
// VÌ SAO TÁCH RA KHỎI test/album.test.mjs
//
// Sáu mục dưới đây là bài API thuần — chúng chỉ gọi `fetch`. Nhưng trước đợt
// Đ34 chúng nằm chung tệp với mục giao diện, mà tệp đó chỉ có trong chuỗi
// `test:giao-dien`. Hệ quả:
//
//   sửa `routes/albums.js` hay `lib/uploads.js` → chạy `npm test` → XANH
//   → mà KHÔNG một chốt chống tệp độc hại nào được chạy.
//
// `CLAUDE.md` chỉ đòi chạy thêm bộ trình duyệt khi đổi thứ gì trong `public/`,
// nên đó là đường đi bình thường của một người sửa mã máy chủ, không phải một
// sự cẩu thả.
//
// Những gì được canh ở đây đều là chốt chặn thật:
//   • tệp giả danh ảnh (đuôi .jpg nhưng ruột là script) bị từ chối;
//   • PNG hợp lệ được nhận;
//   • đường trả byte trả đúng kiểu ảnh và đúng chữ ký đầu tệp;
//   • nhà khác không tải được ảnh dù biết mã.
//
// Phần giao diện — cô bấm chọn ảnh và đăng album trên Chromium thật — ở lại
// `test/album.test.mjs`.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { GOC, thuMucTam, donThuMucTam } from './_chung.mjs';

const PORT = Number(process.env.TEST_PORT || 3305);
const BASE = `http://localhost:${PORT}`;
const DIR = thuMucTam('album-api');

let pass = 0, fail = 0; const errs = [];
const check = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; errs.push(`${n} ${x != null ? JSON.stringify(x).slice(0, 200) : ''}`); console.log('  ✗', n, x ?? ''); } };

const server = spawn('node', ['server.js'], {
  cwd: GOC, stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DIR },
});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch {} });
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 250));
  try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {}
}

async function req(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers };
}
const login = async (u, p) => {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  });
  const sc = r.headers.get('set-cookie');
  return sc ? sc.split(';')[0] : null;
};

// Ảnh JPEG thật 2x2 pixel (đủ để máy chủ nhận dạng chữ ký tệp).
const JPEG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=';
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAP5FBQXqWM+GAAAAAElFTkSuQmCC';
const jpeg = (cap = '') => ({ dataUrl: `data:image/jpeg;base64,${JPEG_B64}`, caption: cap });

console.log('\n[1] Tải ảnh thật lên album mới');
const T = await login('giaovien', '123456');
const P = await login('phuhuynh', '123456');
let albumId, photoId;
{
  const r = await req('POST', '/api/albums', {
    cookie: T,
    body: { title: 'Ảnh thật của lớp', description: 'Có ảnh chụp', photos: [jpeg('Ảnh một'), jpeg('Ảnh hai')] },
  });
  check('tạo album kèm 2 ảnh thật → 201', r.status === 201, r.status);
  albumId = r.data?.id;
  photoId = r.data?.photos?.[0]?.id;
  check('ảnh được lưu thành tệp (có trường file)', !!r.data?.photos?.[0]?.file, r.data?.photos?.[0]);
  check('giữ nguyên chú thích', r.data?.photos?.[0]?.caption === 'Ảnh một');
  const files = fs.existsSync(`${DIR}/uploads`) ? fs.readdirSync(`${DIR}/uploads`) : [];
  check('tệp ảnh nằm trong thư mục dữ liệu', files.length === 2, files);
  check('tên tệp ngẫu nhiên, đúng định dạng', files.every(f => /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(f)), files);
}

console.log('\n[2] Xem ảnh và phân quyền');
{
  const url = `/api/albums/${albumId}/photo/${photoId}`;
  const asTeacher = await fetch(BASE + url, { headers: { Cookie: T } });
  check('giáo viên xem được ảnh', asTeacher.status === 200, asTeacher.status);
  check('trả đúng kiểu ảnh JPEG', asTeacher.headers.get('content-type') === 'image/jpeg', asTeacher.headers.get('content-type'));
  check('ảnh được phép lưu tạm ở máy người xem', /max-age=/.test(asTeacher.headers.get('cache-control') || ''), asTeacher.headers.get('cache-control'));
  const buf = Buffer.from(await asTeacher.arrayBuffer());
  check('nội dung trả về đúng là ảnh JPEG', buf[0] === 0xff && buf[1] === 0xd8, buf.slice(0, 3));

  // LUẬT ẢNH NHÓM (N18) ĐỔI CÂU TRẢ LỜI Ở ĐÂY, VÀ ĐỔI THEO HƯỚNG CHẶT HƠN.
  //
  // Nhóm Chồi 2 trong dữ liệu mẫu có bé s3 mà gia đình đã ký "không đồng ý
  // chia sẻ ảnh". Ảnh vừa đăng CHƯA GẮN THẺ bé nào, nên máy chủ không biết
  // trong ảnh có bé s3 hay không — và tạm ẩn với mọi gia đình cho tới khi cô
  // gắn thẻ. Đây là chủ ý, người dùng đã duyệt.
  const chuaGanThe = await fetch(BASE + url, { headers: { Cookie: P } });
  check('ảnh CHƯA GẮN THẺ trong nhóm có gia đình từ chối: phụ huynh chưa xem được',
    chuaGanThe.status === 403, chuaGanThe.status);

  // Gắn thẻ một bé mà gia đình ĐÃ đồng ý -> ảnh hiện lại ngay với cả nhóm.
  // Đây là vế phải giữ: cơ chế bảo vệ không được biến thành cái khoá chết.
  const gan = await req('PUT', `/api/albums/${albumId}/photos/${photoId}/be`,
    { cookie: T, body: { studentIds: ['s1'] } });
  check('cô gắn thẻ được bé vào ảnh', gan.status === 200, gan.data);

  const parentSameClass = await fetch(BASE + url, { headers: { Cookie: P } });
  check('GẮN THẺ XONG LÀ PHỤ HUYNH XEM ĐƯỢC NGAY', parentSameClass.status === 200, parentSameClass.status);

  const T2 = await login('giaovien2', '123456'); // chủ nhiệm lớp 5B
  const other = await fetch(BASE + url, { headers: { Cookie: T2 } });
  check('giáo viên lớp khác KHÔNG xem được ảnh', other.status === 403, other.status);

  const anon = await fetch(BASE + url);
  check('chưa đăng nhập KHÔNG xem được ảnh', anon.status === 401, anon.status);
}

console.log('\n[3] Chặn tệp không phải ảnh');
{
  const evil = 'data:image/jpeg;base64,' + Buffer.from('#!/bin/sh\nrm -rf /\n').toString('base64');
  const r = await req('POST', '/api/albums', { cookie: T, body: { title: 'Thử', photos: [{ dataUrl: evil }] } });
  check('từ chối tệp giả danh ảnh → 400', r.status === 400, r.data);
  check('báo lỗi rõ ràng bằng tiếng Việt', /JPG|PNG|WebP/.test(r.data?.error || ''), r.data);

  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64');
  const r2 = await req('POST', '/api/albums', { cookie: T, body: { title: 'Thử', photos: [{ dataUrl: svg }] } });
  check('từ chối SVG (có thể chứa mã độc)', r2.status === 400, r2.data);

  const big = 'data:image/jpeg;base64,' + 'A'.repeat(9 * 1024 * 1024);
  const r3 = await req('POST', '/api/albums', { cookie: T, body: { title: 'Thử', photos: [{ dataUrl: big }] } });
  check('từ chối ảnh quá lớn', r3.status === 400 || r3.status === 413, r3.status);

  const png = await req('POST', '/api/albums', {
    cookie: T, body: { title: 'Album PNG', photos: [{ dataUrl: `data:image/png;base64,${PNG_B64}` }] },
  });
  check('chấp nhận ảnh PNG hợp lệ', png.status === 201, png.data);
}

console.log('\n[4] Thêm và xóa ảnh trong album có sẵn');
{
  const add = await req('POST', `/api/albums/${albumId}/photos`, { cookie: T, body: { photos: [jpeg('Ảnh ba')] } });
  check('thêm ảnh vào album → 201', add.status === 201, add.status);

  const detail = await req('GET', `/api/albums/${albumId}`, { cookie: T });
  check('album giờ có 3 ảnh', detail.data?.photos?.length === 3, detail.data?.photos?.length);
  check('giáo viên chủ nhiệm được phép sửa (canEdit)', detail.data?.canEdit === true);

  const asParent = await req('GET', `/api/albums/${albumId}`, { cookie: P });
  check('phụ huynh KHÔNG được phép sửa', asParent.data?.canEdit === false, asParent.data?.canEdit);

  const parentAdd = await req('POST', `/api/albums/${albumId}/photos`, { cookie: P, body: { photos: [jpeg()] } });
  check('phụ huynh KHÔNG thêm được ảnh → 403', parentAdd.status === 403, parentAdd.status);

  const T2 = await login('giaovien2', '123456');
  const otherAdd = await req('POST', `/api/albums/${albumId}/photos`, { cookie: T2, body: { photos: [jpeg()] } });
  check('giáo viên lớp khác KHÔNG thêm được ảnh → 403', otherAdd.status === 403, otherAdd.status);

  const target = detail.data.photos[2];
  const before = fs.readdirSync(`${DIR}/uploads`).length;
  const del = await req('DELETE', `/api/albums/${albumId}/photos/${target.id}`, { cookie: T });
  check('xóa ảnh → 200', del.status === 200, del.status);
  const after = fs.readdirSync(`${DIR}/uploads`).length;
  check('tệp ảnh bị xóa khỏi đĩa (không rác lại)', after === before - 1, { before, after });

  const gone = await fetch(`${BASE}/api/albums/${albumId}/photo/${target.id}`, { headers: { Cookie: T } });
  check('ảnh đã xóa thì không xem được nữa', gone.status === 404, gone.status);
}

console.log('\n[5] Xóa cả album thì dọn sạch ảnh');
{
  const made = await req('POST', '/api/albums', { cookie: T, body: { title: 'Album tạm', photos: [jpeg(), jpeg()] } });
  const before = fs.readdirSync(`${DIR}/uploads`).length;
  const del = await req('DELETE', `/api/albums/${made.data.id}`, { cookie: T });
  check('xóa album → 200', del.status === 200, del.status);
  const after = fs.readdirSync(`${DIR}/uploads`).length;
  check('toàn bộ ảnh của album bị xóa khỏi đĩa', after === before - 2, { before, after });
  const gone = await req('GET', `/api/albums/${made.data.id}`, { cookie: T });
  check('album không còn tồn tại', gone.status === 404, gone.status);
}

console.log('\n[6] Ảnh minh họa bằng emoji của dữ liệu cũ vẫn dùng được');
{
  const r = await req('GET', '/api/albums', { cookie: P });
  const old = r.data.find(a => a.cover && a.cover.emoji);
  check('album cũ vẫn hiển thị bình thường', !!old, r.data?.length);
  const detail = await req('GET', `/api/albums/${old.id}`, { cookie: P });
  check('ảnh emoji giữ nguyên màu nền', Array.isArray(detail.data?.photos?.[0]?.g), detail.data?.photos?.[0]);
}

// ===========================================================================
console.log('\n[7] CẮT CỬA SỔ danh sách album — và cắt SAU khi lọc quyền');
{
  // VÌ SAO PHẢI CẮT
  //
  // Mỗi album kéo theo ảnh của nó, mỗi ảnh kéo theo thẻ bé, mỗi bé kéo theo
  // giấy đồng ý. Đ98 gom ba tầng ấy thành tra theo lô, nhưng khối lượng vẫn
  // lớn dần theo số năm nhà trường dùng app và không có gì chặn: sang năm thứ
  // ba, phụ huynh mở màn Album là kéo cả lịch sử ảnh của nhóm về điện thoại
  // chỉ để xem mấy album trên cùng.
  //
  // VÌ SAO CẮT SAU KHI LỌC, KHÔNG PHẢI TRONG CÂU TRUY VẤN
  //
  // Phụ huynh chỉ xem được album chụp trong đúng khoảng con còn ở nhóm đó, và
  // bộ lọc ấy chạy trong JavaScript chứ không nằm trong `WHERE`. Cắt trước khi
  // lọc thì số dòng trả về KHÔNG phải số dòng người này xem được, và màn hình
  // — vốn suy ra "còn nữa hay hết" bằng cách đếm — sẽ giấu mất nút "xem cũ
  // hơn" đúng lúc vẫn còn album để xem.
  const day = await req('GET', '/api/albums?keCaLopCu=1', { cookie: T });
  check('không truyền gì thì trả về như cũ', day.status === 200 && day.data.length >= 3,
    day.data?.length);

  const mot = await req('GET', '/api/albums?keCaLopCu=1&soLuong=1', { cookie: T });
  check('xin một trang một album thì nhận đúng một', mot.data?.length === 1, mot.data?.length);
  check('và là album mới nhất — đúng album đứng đầu danh sách đầy đủ',
    mot.data?.[0]?.id === day.data?.[0]?.id, { mot: mot.data?.[0]?.id, day: day.data?.[0]?.id });

  const hai = await req('GET', '/api/albums?keCaLopCu=1&bo=1&soLuong=1', { cookie: T });
  check('trang sau nối tiếp, KHÔNG lặp lại album của trang trước',
    hai.data?.[0]?.id === day.data?.[1]?.id && hai.data?.[0]?.id !== mot.data?.[0]?.id,
    { hai: hai.data?.[0]?.id, day1: day.data?.[1]?.id });

  const het = await req('GET', `/api/albums?keCaLopCu=1&bo=${day.data.length}`, { cookie: T });
  check('bỏ qua hết thì trả về danh sách rỗng, không lỗi',
    het.status === 200 && het.data.length === 0, { status: het.status, n: het.data?.length });

  // Trần và số vô nghĩa: không được để một lượt hỏi kéo cả kho về.
  const tran = await req('GET', '/api/albums?keCaLopCu=1&soLuong=99999', { cookie: T });
  check('số lượng vượt trần thì bị chặn lại, không sập', tran.status === 200, tran.status);
  const am = await req('GET', '/api/albums?keCaLopCu=1&bo=-5&soLuong=0', { cookie: T });
  check('số âm hay số không cũng không làm hỏng gì', am.status === 200 && am.data.length >= 1,
    { status: am.status, n: am.data?.length });

  // VẾ QUAN TRỌNG NHẤT: cắt cửa sổ KHÔNG được mở thêm cho ai.
  const P2 = await login('phuhuynh', '123456');
  const cuaPh = await req('GET', '/api/albums?keCaLopCu=1&soLuong=200', { cookie: P2 });
  const cuaPhDay = await req('GET', '/api/albums?keCaLopCu=1', { cookie: P2 });
  check('PHỤ HUYNH XIN CẢ TRANG LỚN CŨNG KHÔNG THẤY THÊM ALBUM NÀO',
    cuaPh.data.length === cuaPhDay.data.length, {
      xinLon: cuaPh.data?.length, macDinh: cuaPhDay.data?.length });
  // Và ghép từng trang lại phải ra ĐÚNG danh sách cũ — không thừa một album
  // nào (rò quyền), không thiếu một album nào (mất ảnh của con).
  const gop = [];
  for (let i = 0; i < 10 && gop.length <= cuaPhDay.data.length; i++) {
    const t = await req('GET', `/api/albums?keCaLopCu=1&bo=${gop.length}&soLuong=2`, { cookie: P2 });
    if (!t.data.length) break;
    gop.push(...t.data.map(a => a.id));
  }
  check('GHÉP TỪNG TRANG LẠI RA ĐÚNG DANH SÁCH CŨ — không thừa, không thiếu',
    gop.join(',') === cuaPhDay.data.map(a => a.id).join(','),
    { ghep: gop, day: cuaPhDay.data.map(a => a.id) });

  // Màn hình phải có nút, nếu không thì cắt cửa sổ là GIẤU MẤT album.
  const man = fs.readFileSync(path.join(GOC, 'public/js/views/albums.js'), 'utf8');
  check('MÀN ALBUM CÓ NÚT "xem album cũ hơn"', /Xem album cũ hơn/.test(man));
  check('và nút đó gọi máy chủ kèm chỗ bỏ qua', /bo=\$\{bo\}/.test(man));
}

server.kill('SIGTERM');
await new Promise(r => setTimeout(r, 600));
donThuMucTam(DIR);

console.log(`\n===== PASS: ${pass}  FAIL: ${fail} =====`);
if (errs.length) { console.log('\nLỖI:'); errs.forEach(e => console.log(' ✗', e)); process.exit(1); }
