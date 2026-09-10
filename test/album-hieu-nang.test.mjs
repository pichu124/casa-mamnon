// Bài canh HIỆU NĂNG ĐƯỜNG LIỆT KÊ ALBUM (Đ159).
//
// Chạy bằng:  npm run test:album-hieu-nang
//
// MỘT MÓN TRONG SỔ, VÀ KẾT QUẢ ĐO KHÁC VỚI ĐIỀU SỔ GHI
//
// `docs/BAO-CAO-TU-LAM.md` để lại một dòng cho chủ dự án: *"đường liệt kê
// album đếm số ảnh bằng cách nạp từng tấm ảnh của từng album, rồi với mỗi tấm
// lại hỏi tiếp ai được gắn thẻ và nhà đó đồng ý chưa… sau vài năm học, một
// lần gia đình mở màn Album là hàng nghìn câu truy vấn."* Kèm một lý do rất
// đúng cho việc chưa sửa: cách nhanh nhất — nhớ tạm lời đồng ý của từng bé —
// có thể làm app hiện một tấm ảnh mà gia đình VỪA MỚI rút đồng ý, và đó là
// loại lỗi tệ hơn hẳn cái chậm. Dòng ấy kết bằng *"cách sửa an toàn cần đo
// trước"*.
//
// Đo rồi: **đường này KHÔNG còn N+1**. Đ98 gom ba tầng ảnh–thẻ–đồng ý thành
// tra theo lô, Đ144 gom nốt phần chế độ album, và bản đo dưới đây cho thấy số
// truy vấn ĐỨNG YÊN khi số album tăng. Dòng trong sổ đã cũ hơn mã.
//
// NÊN BÀI NÀY LÀ CÁI BÁNH CÓC, KHÔNG PHẢI MỘT BẢN VÁ.
//
// Điều đáng canh không phải "hôm nay nhanh" mà là "ngày mai có ai vô tình
// dựng lại vòng lặp ấy không". Một dòng `db.first(...)` đặt trong `albums.map`
// là đủ để quay về hình dạng cũ, và không bộ canh nào hiện có nhận ra. Bài
// này đếm ĐÚNG SỐ LƯỢT hỏi SQLite — không bấm đồng hồ, vì đồng hồ đổi theo
// máy đang chạy bài rồi người ta nới ngưỡng cho nó xanh.
//
// LUẬT ĐỒNG Ý KHÔNG ĐƯỢC ĐỔI ĐỂ ĐI NHANH HƠN: mục [3] canh đúng nỗi lo mà
// dòng trong sổ nêu ra — rút đồng ý xong thì LƯỢT ĐỌC NGAY SAU ĐÓ phải mất
// ảnh, không có bộ nhớ nào sống qua hai lượt yêu cầu.
import path from 'node:path';
import { createRequire } from 'node:module';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, GOC } from './_chung.mjs';

const require2 = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('album-hieu-nang');
sinhDuLieu(DIR);

// Bọc `prepare` TRƯỚC khi nạp lib/db.js — nó nhớ câu lệnh đã dựng.
const Database = require2('better-sqlite3');
let dem = 0;
const goc = Database.prototype.prepare;
Database.prototype.prepare = function bocDem(...a) {
  const st = goc.apply(this, a);
  for (const m of ['all', 'get', 'run']) {
    if (typeof st[m] !== 'function') continue;
    const f = st[m].bind(st);
    st[m] = (...b) => { dem += 1; return f(...b); };
  }
  return st;
};

process.env.DATA_DIR = DIR;
const db = require2(path.join(GOC, 'lib', 'db.js'));

// ---- Dữ liệu: album của nhiều năm học, mỗi album 12 ảnh có gắn thẻ ---------
const lop = db.classes().map(c => c.id);
const be = db.all('students', 'SELECT id, classId FROM students WHERE active = 1');
function dungAlbum(tuSo, den) {
  const themAlbum = db.sqlite.prepare(
    "INSERT INTO albums (id, classId, title, date, description, createdBy) VALUES (?, ?, ?, ?, '', 't1')");
  const themAnh = db.sqlite.prepare(
    "INSERT INTO album_photos (id, albumId, file, caption, position) VALUES (?, ?, ?, '', ?)");
  const themThe = db.sqlite.prepare(
    'INSERT OR IGNORE INTO photo_students (photoId, studentId) VALUES (?, ?)');
  db.sqlite.transaction(() => {
    for (let i = tuSo; i < den; i++) {
      const id = `alb_${String(i).padStart(4, '0')}`;
      const cid = lop[i % lop.length];
      themAlbum.run(id, cid, `Album ${i}`, `2026-09-${String(i % 28 + 1).padStart(2, '0')}`);
      for (let j = 0; j < 12; j++) {
        const pid = `${id}_p${j}`;
        themAnh.run(pid, id, `${pid}.jpg`, j);
        for (const b of be.filter(x => x.classId === cid).slice(0, 3)) themThe.run(pid, b.id);
      }
    }
  })();
}
dungAlbum(0, 60);

// ---- Bộ định tuyến giả ------------------------------------------------------
const tay = new Map();
const appGia = {
  get(d, ...f) { tay.set(`GET ${d}`, f[f.length - 1]); },
  post(d, ...f) { tay.set(`POST ${d}`, f[f.length - 1]); },
  put(d, ...f) { tay.set(`PUT ${d}`, f[f.length - 1]); },
  delete(d, ...f) { tay.set(`DELETE ${d}`, f[f.length - 1]); },
  patch(d, ...f) { tay.set(`PATCH ${d}`, f[f.length - 1]); },
};
require2(path.join(GOC, 'routes', 'albums.js'))(appGia);

function goi(khoa, req) {
  let ra = null;
  let ma = 200;
  const res = {
    status(n) { ma = n; return res; },
    json(o) { ra = o; return res; },
    setHeader() { return res; },
    send(o) { ra = o; return res; },
    sendFile() { return res; },
  };
  tay.get(khoa)({ query: {}, params: {}, body: {}, ...req }, res);
  return { ma, data: ra };
}
function do1(khoa, req) {
  dem = 0;
  const r = goi(khoa, req);
  return { so: dem, ...r };
}

try {
  const co = db.findUser('t1');
  const ph = db.findUser('p1');

  // =========================================================================
  console.log('\n[1] Số truy vấn KHÔNG tăng theo số album');
  {
    const co60 = do1('GET /api/albums', { user: co });
    const ph60 = do1('GET /api/albums', { user: ph });
    check('cô mở được danh sách album', co60.ma === 200 && (co60.data || []).length > 0,
      `${co60.ma} ${(co60.data || []).length}`);
    check('gia đình cũng vậy', ph60.ma === 200 && (ph60.data || []).length > 0,
      `${ph60.ma} ${(ph60.data || []).length}`);
    console.log(`  (60 album: cô ${co60.so} truy vấn, gia đình ${ph60.so} truy vấn)`);

    dungAlbum(60, 240);   // gấp bốn số album
    const co240 = do1('GET /api/albums', { user: co });
    const ph240 = do1('GET /api/albums', { user: ph });
    console.log(`  (240 album: cô ${co240.so} truy vấn, gia đình ${ph240.so} truy vấn)`);

    // NGƯỠNG LÀ "KHÔNG ĐỔI", KHÔNG PHẢI MỘT CON SỐ TUYỆT ĐỐI.
    //
    // Chốt cứng "phải dưới 15 truy vấn" thì bài đỏ ngay khi ai đó thêm một câu
    // hỏi chính đáng cho cả trang. Thứ đáng canh là HÌNH DẠNG: gấp bốn số
    // album mà số truy vấn vẫn gần như cũ nghĩa là không có vòng lặp theo
    // album; tăng theo là có.
    check('gấp bốn số album, số truy vấn của CÔ gần như không đổi',
      co240.so <= co60.so + 4, { truoc: co60.so, sau: co240.so });
    check('và của GIA ĐÌNH cũng vậy — đây là vai đắt nhất',
      ph240.so <= ph60.so + 4, { truoc: ph60.so, sau: ph240.so });

    // Đối chứng: nếu bài không thật sự tăng số album thì hai phép kiểm trên vô nghĩa.
    check('đối chứng — số album đã tăng thật',
      db.count('SELECT COUNT(*) FROM albums') >= 240, db.count('SELECT COUNT(*) FROM albums'));
  }

  // =========================================================================
  console.log('\n[2] Kèm cả lớp cũ cũng không mở ra vòng lặp mới');
  {
    const thuong = do1('GET /api/albums', { user: ph });
    const kemCu = do1('GET /api/albums', { user: ph, query: { keCaLopCu: '1' } });
    console.log(`  (gia đình: ${thuong.so} → ${kemCu.so} truy vấn khi hỏi cả lớp cũ)`);
    check('hỏi thêm lớp cũ chỉ tốn thêm vài truy vấn, không phải mỗi lớp một lượt',
      kemCu.so <= thuong.so + 6, { thuong: thuong.so, kemCu: kemCu.so });
  }

  // =========================================================================
  console.log('\n[3] ĐI NHANH KHÔNG ĐƯỢC ĐỔI LUẬT ĐỒNG Ý');
  {
    // Đây là đúng nỗi lo mà dòng trong `BAO-CAO-TU-LAM.md` nêu ra: cách tăng
    // tốc nhanh nhất là nhớ tạm lời đồng ý của từng bé, và bộ nhớ ấy sẽ hiện
    // một tấm ảnh mà gia đình VỪA MỚI rút đồng ý.
    const conCuaToi = db.all('student_parents', 'SELECT studentId FROM student_parents WHERE parentId = ?', ['p1'])
      .map(r => r.studentId);
    check('đối chứng — gia đình p1 có con để thử', conCuaToi.length > 0, conCuaToi);
    const lopCuaCon = (db.findStudent(conCuaToi[0]) || {}).classId;

    // Một bé KHÁC trong cùng nhóm nói KHÔNG với việc chia sẻ ảnh.
    const beKhac = be.find(b => b.classId === lopCuaCon && !conCuaToi.includes(b.id));
    check('đối chứng — nhóm ấy có bé của nhà khác', !!beKhac, lopCuaCon);

    // BỐI CẢNH: mọi nhà trong nhóm ĐÃ KÝ đồng ý chia sẻ. Không dựng bối cảnh
    // này thì ảnh vốn đã ẩn (dữ liệu mẫu để trống ô đồng ý = CHƯA TRẢ LỜI, mà
    // im lặng không phải là đồng ý), và phép so "trước / sau khi rút" đo trên
    // hai con số 0 — xanh mà chẳng chứng minh gì.
    const kyDongY = db.sqlite.prepare(
      `INSERT INTO student_consent (studentId, hoSoHocTap, chiaSeGiaDinh, truyenThong, nguoiKy, ngayKy, ghiChu, capNhatLuc)
       VALUES (?, 1, 1, NULL, 'Bố mẹ', '2026-09-01', '', ?)
       ON CONFLICT(studentId) DO UPDATE SET chiaSeGiaDinh = 1, capNhatLuc = excluded.capNhatLuc`);
    db.sqlite.transaction(() => {
      for (const b of be) kyDongY.run(b.id, new Date().toISOString());
    })();

    const truoc = goi('GET /api/albums', { user: ph });
    const soAnhTruoc = (truoc.data || []).reduce((s, a) => s + (Number(a.photoCount) || 0), 0);
    check('trước khi rút đồng ý, gia đình thấy ảnh', soAnhTruoc > 0, soAnhTruoc);

    db.run(`INSERT INTO student_consent (studentId, hoSoHocTap, chiaSeGiaDinh, truyenThong, nguoiKy, ngayKy, ghiChu, capNhatLuc)
            VALUES (?, NULL, 0, NULL, '', '', '', ?)
            ON CONFLICT(studentId) DO UPDATE SET chiaSeGiaDinh = 0, capNhatLuc = excluded.capNhatLuc`,
    [beKhac.id, new Date().toISOString()]);

    const sau = goi('GET /api/albums', { user: ph });
    const soAnhSau = (sau.data || []).reduce((s, a) => s + (Number(a.photoCount) || 0), 0);
    check('LƯỢT ĐỌC NGAY SAU KHI RÚT ĐỒNG Ý đã mất ảnh — không bộ nhớ nào sống qua hai lượt',
      soAnhSau < soAnhTruoc, { truoc: soAnhTruoc, sau: soAnhSau });

    // Và cô thì vẫn thấy đủ: cô là người chụp và người gắn thẻ.
    const coSau = goi('GET /api/albums', { user: co });
    check('nhưng CÔ vẫn thấy đủ ảnh — giấu ảnh khỏi cô là làm cô không gắn thẻ được',
      (coSau.data || []).reduce((s, a) => s + (Number(a.photoCount) || 0), 0) > soAnhSau);
  }
} finally {
  Database.prototype.prepare = goc;
  try { db.close(); } catch (_) { /* đã đóng */ }
  donThuMucTam(DIR);
}

tongKet('Hiệu năng đường liệt kê Album (Đ159)');
