// Bài canh HIỆU NĂNG CAMBRIDGE (Đ158 — ba món của Đ120).
//
// Chạy bằng:  npm run test:cambridge-hieu-nang
//
// VÌ SAO BÀI NÀY ĐẾM TRUY VẤN CHỨ KHÔNG BẤM ĐỒNG HỒ
//
// Vòng rà Đ120 (02/09) ghi ba món về phân hệ Cambridge và đặt mốc "làm TRƯỚC
// khi trường bật": `keml` vẫn ~65 truy vấn mỗi bài sau bước lọc; tra ảnh bằng
// `LIKE '%tên tệp%'`; tải cả bảng rồi lọc. Cả ba đều là chuyện SỐ LƯỢT HỎI
// CƠ SỞ DỮ LIỆU, không phải chuyện máy chạy nhanh hay chậm — mà đo bằng đồng
// hồ thì kết quả đổi theo máy đang chạy bài, theo lúc máy bận, theo bộ đệm
// còn nóng hay đã nguội. Một bài như thế sẽ đỏ vì lý do chẳng liên quan, rồi
// người ta nới ngưỡng cho nó xanh, rồi nó không canh gì nữa.
//
// Nên bài này ĐẾM ĐÚNG SỐ LƯỢT hỏi SQLite, bằng cách bọc `prepare` của
// better-sqlite3 TRƯỚC KHI nạp `lib/db.js`. Con số đếm được là con số thật,
// giống hệt nhau ở mọi máy, và nó bắt được đúng thứ vòng rà đã nêu.
//
// Bài chạy TRONG CÙNG TIẾN TRÌNH, không dựng máy chủ: phải bọc được `prepare`
// thì mới đếm được, mà tiến trình con thì không bọc từ ngoài vào.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, GOC } from './_chung.mjs';

const require2 = createRequire(import.meta.url);
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cambridge-hieu-nang');
sinhDuLieu(DIR);

// ---- Bọc `prepare` TRƯỚC khi nạp lib/db.js ---------------------------------
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
const modules = require2(path.join(GOC, 'lib', 'modules.js'));

// Lược đồ của phân hệ: nạp tay, vì bài này không đi qua `napApiMoRong`.
db.sqlite.exec(fs.readFileSync(path.join(GOC, 'modules', 'cambridge', 'schema.sql'), 'utf8'));

// ---- Dữ liệu: 40 bài phạm vi TRƯỜNG, mỗi bài 3 ảnh -------------------------
//
// Phạm vi TRƯỜNG là trường hợp đắt nhất: `anhHienVoiGiaDinh` phải hỏi "nhóm
// này có nhà nào từ chối chia sẻ ảnh không" cho MỌI nhóm của trường, và mỗi
// câu hỏi ấy là hai truy vấn.
const SO_BAI = 40;
const luc = new Date().toISOString();
{
  const them = db.sqlite.prepare(`INSERT INTO cambridge_bai
    (id, loai, tieuDe, noiDung, tuan, phamVi, classId, campusId, anh, congBoLuc, nguoiDang, taoLuc, capNhatLuc)
    VALUES (?, 'cambridge', ?, 'Nội dung thử', '2026-W37', 'truong', '', '', ?, ?, 't1', ?, ?)`);
  db.sqlite.transaction(() => {
    for (let i = 0; i < SO_BAI; i++) {
      const id = `camhn_${String(i).padStart(3, '0')}`;
      them.run(id, `Bài ${i}`, [`${id}-a.jpg`, `${id}-b.jpg`, `${id}-c.jpg`].join('\n'), luc, luc, luc);
    }
  })();
}

// ---- Bộ định tuyến giả: giữ lại hàm xử lý của từng đường --------------------
const tay = new Map();
const appGia = {
  get(duong, ...fn) { tay.set(`GET ${duong}`, fn[fn.length - 1]); },
  post(duong, ...fn) { tay.set(`POST ${duong}`, fn[fn.length - 1]); },
  put(duong, ...fn) { tay.set(`PUT ${duong}`, fn[fn.length - 1]); },
  delete(duong, ...fn) { tay.set(`DELETE ${duong}`, fn[fn.length - 1]); },
};
require2(path.join(GOC, 'modules', 'cambridge', 'routes.js'))(appGia, { db, modules });

function goi(khoa, req) {
  const fn = tay.get(khoa);
  if (!fn) throw new Error(`Không có đường ${khoa}`);
  let ra = null;
  let ma = 200;
  const res = {
    status(n) { ma = n; return res; },
    json(o) { ra = o; return res; },
    setHeader() { return res; },
    send(o) { ra = o; return res; },
  };
  fn({ query: {}, params: {}, body: {}, ...req }, res);
  return { ma, data: ra };
}

// Đếm số truy vấn của MỘT lượt gọi.
function demTruyVan(khoa, req) {
  dem = 0;
  const r = goi(khoa, req);
  return { so: dem, ...r };
}

try {
  const co = db.findUser('t1');
  const ph = db.findUser('p1');
  const soNhom = db.classes().length;
  check('dữ liệu thử đủ nặng: nhiều nhóm và nhiều bài',
    soNhom >= 3 && db.count('SELECT COUNT(*) FROM cambridge_bai') >= SO_BAI, { soNhom });

  // =========================================================================
  console.log('\n[1] Liệt kê Cambridge — số truy vấn KHÔNG tăng theo số bài');
  {
    const co40 = demTruyVan('GET /api/cambridge', { user: co });
    check('cô mở được danh sách', co40.ma === 200 && (co40.data.bai || []).length > 0,
      `${co40.ma} ${(co40.data.bai || []).length} bài`);
    const soBaiTraVe = (co40.data.bai || []).length;
    const moiBai = co40.so / soBaiTraVe;
    console.log(`  (đo được: ${co40.so} truy vấn cho ${soBaiTraVe} bài = ${moiBai.toFixed(1)} mỗi bài)`);

    // NGƯỠNG ĐẶT Ở ĐÂU VÀ VÌ SAO
    //
    // Vòng rà Đ120 đo được ~65 truy vấn MỖI BÀI. Bản vá gom mọi câu hỏi lặp
    // vào một bộ nhớ sống đúng một lượt yêu cầu, nên phần đắt còn lại là hằng
    // số cho cả trang. Đặt ngưỡng 5 truy vấn/bài: rộng hơn con số thật khá
    // nhiều (để bài không đỏ vì một câu hỏi thêm chính đáng), nhưng vẫn kém
    // con số cũ hơn một bậc — quay lại kiểu hỏi từng bài là đỏ ngay.
    check(`mỗi bài dưới 5 truy vấn (cũ: ~65)`, moiBai < 5, moiBai.toFixed(1));

    // PHÉP ĐO CHẶT HƠN CẢ NGƯỠNG: thêm bài mà số truy vấn gần như không đổi.
    const themLuc = new Date().toISOString();
    const them = db.sqlite.prepare(`INSERT INTO cambridge_bai
      (id, loai, tieuDe, noiDung, tuan, phamVi, classId, campusId, anh, congBoLuc, nguoiDang, taoLuc, capNhatLuc)
      VALUES (?, 'cambridge', ?, 'x', '2026-W38', 'truong', '', '', ?, ?, 't1', ?, ?)`);
    db.sqlite.transaction(() => {
      for (let i = 0; i < 40; i++) {
        const id = `camhn2_${String(i).padStart(3, '0')}`;
        them.run(id, `Bài thêm ${i}`, `${id}-a.jpg`, themLuc, themLuc, themLuc);
      }
    })();
    const co80 = demTruyVan('GET /api/cambridge', { user: co });
    console.log(`  (gấp đôi số bài: ${co40.so} → ${co80.so} truy vấn)`);
    check('gấp đôi số bài KHÔNG gấp đôi số truy vấn',
      co80.so < co40.so * 1.6, { truoc: co40.so, sau: co80.so });
  }

  // =========================================================================
  console.log('\n[2] Gia đình cũng vậy — và đây là vai đắt nhất');
  {
    const r = demTruyVan('GET /api/cambridge', { user: ph });
    const n = (r.data.bai || []).length;
    console.log(`  (đo được: ${r.so} truy vấn cho ${n} bài)`);
    check('gia đình mở được danh sách', r.ma === 200 && n > 0, `${r.ma} ${n}`);
    check('và cũng dưới 5 truy vấn mỗi bài', r.so / n < 5, (r.so / n).toFixed(1));
  }

  // =========================================================================
  console.log('\n[3] Tra ảnh: một truy vấn theo chỉ mục, không quét cả bảng');
  {
    // Chỉ mục được dựng bù lúc nạp phân hệ, cho những bài chưa có dòng.
    const soDong = db.count('SELECT COUNT(*) FROM cambridge_anh');
    check('chỉ mục ảnh đã được dựng bù cho dữ liệu có sẵn', soDong >= SO_BAI * 3, soDong);

    const chu = db.first('cambridge_anh', "SELECT baiId FROM cambridge_anh WHERE file = 'camhn_000-b.jpg'");
    check('tra được đúng bài từ tên tệp', chu && chu.baiId === 'camhn_000', chu);

    // Đường trả ảnh cần tệp có thật trên đĩa để đi hết, nhưng thứ đang đo là
    // SỐ LƯỢT HỎI trước khi tới đó — nên đo tới lúc nó trả lời, dù trả lời gì.
    const r = demTruyVan('GET /api/cambridge/anh/:file', { user: co, params: { file: 'camhn_000-b.jpg' } });
    console.log(`  (đo được: ${r.so} truy vấn cho một tấm ảnh)`);
    check('một tấm ảnh dưới 10 truy vấn — không còn quét cả bảng bài', r.so < 10, r.so);

    // ĐƯỜNG LÙI PHẢI CÒN SỐNG: xoá dòng chỉ mục đi thì vẫn tìm ra CHỦ của ảnh.
    //
    // Không đo bằng mã trả về: đường này dùng CHUNG câu "Không tìm thấy ảnh"
    // cho hai chuyện khác hẳn nhau — không tìm ra bài chủ, và tìm ra rồi
    // nhưng tệp không còn trên đĩa (bài này không dựng tệp thật). Thứ phân
    // biệt được hai chuyện ấy là DẤU VẾT: chỉ khi tìm ra chủ thì chỉ mục mới
    // được vá lại.
    db.run("DELETE FROM cambridge_anh WHERE file = 'camhn_001-a.jpg'");
    check('đối chứng — dòng chỉ mục đã mất thật',
      !db.first('cambridge_anh', "SELECT baiId FROM cambridge_anh WHERE file = 'camhn_001-a.jpg'"));
    goi('GET /api/cambridge/anh/:file', { user: co, params: { file: 'camhn_001-a.jpg' } });
    const va = db.first('cambridge_anh', "SELECT baiId FROM cambridge_anh WHERE file = 'camhn_001-a.jpg'");
    check('mất dòng chỉ mục thì rơi về cách cũ, tìm ra chủ và VÁ LẠI ngay tại chỗ',
      !!va && va.baiId === 'camhn_001', va);

    const lac = goi('GET /api/cambridge/anh/:file', { user: co, params: { file: 'khong-co-that.jpg' } });
    check('tên tệp không có thật thì báo không tìm thấy', lac.ma === 404, lac.ma);
    check('và KHÔNG đẻ ra một dòng chỉ mục rác',
      !db.first('cambridge_anh', "SELECT baiId FROM cambridge_anh WHERE file = 'khong-co-that.jpg'"));
  }

  // =========================================================================
  console.log('\n[4] Chỉ mục ảnh đi theo bài, và KHÔNG phải nguồn sự thật');
  {
    const ma = fs.readFileSync(path.join(GOC, 'modules/cambridge/routes.js'), 'utf8');
    check('ghi bài xong là đồng bộ chỉ mục ngay',
      /dongBoAnh\(rec\.id, rec\.anh\)/.test(ma) && /dongBoAnh\(cu\.id, patch\.anh\)/.test(ma), 'routes.js');
    check('và có đường dựng lại, gọi ngay lúc nạp phân hệ',
      /function dungLaiChiMucAnh/.test(ma) && /^\s*dungLaiChiMucAnh\(\);/m.test(ma), 'routes.js');
    check('lược đồ khai bảng đúng tiền tố phân hệ',
      /CREATE TABLE IF NOT EXISTS cambridge_anh \(/.test(
        fs.readFileSync(path.join(GOC, 'modules/cambridge/schema.sql'), 'utf8')),
      'schema.sql');

    // BẤT BIẾN THẬT SỰ ĐÁNG CANH: chỉ mục nói đúng những gì cột `anh` nói.
    function doiChieu() {
      const theoCot = new Map();
      for (const b of db.all('cambridge_bai', "SELECT id, anh FROM cambridge_bai WHERE anh <> ''")) {
        for (const f of String(b.anh).split('\n').map(x => x.trim()).filter(Boolean)) theoCot.set(f, b.id);
      }
      const theoChiMuc = new Map(db.all('cambridge_anh', 'SELECT file, baiId FROM cambridge_anh')
        .map(r => [r.file, r.baiId]));
      return {
        thieu: [...theoCot.keys()].filter(f => theoChiMuc.get(f) !== theoCot.get(f)),
        thua: [...theoChiMuc.keys()].filter(f => !theoCot.has(f)),
      };
    }

    // ĐỐI CHỨNG CÓ CHỦ Ý: bài mà bài kiểm thử này ghi THẲNG vào cơ sở dữ liệu
    // sau khi phân hệ đã nạp thì CHƯA có trong chỉ mục — đúng như thiết kế,
    // vì `dongBoAnh` chỉ chạy ở đường ghi của app. Đó cũng là cảnh có thật:
    // khôi phục một bản sao lưu, hay sửa tay vào tệp dữ liệu.
    const truoc = doiChieu();
    check('đối chứng — bài ghi thẳng vào CSDL thì chưa có trong chỉ mục',
      truoc.thieu.length > 0, truoc.thieu.slice(0, 3));

    // VÀ LƯỢT KHỞI ĐỘNG SAU PHẢI DỰNG BÙ. Nạp lại phân hệ = khởi động lại
    // máy chủ, vì `dungLaiChiMucAnh()` chạy ngay trong thân hàm nạp.
    delete require2.cache[require2.resolve(path.join(GOC, 'modules', 'cambridge', 'routes.js'))];
    require2(path.join(GOC, 'modules', 'cambridge', 'routes.js'))(appGia, { db, modules });
    const sau = doiChieu();
    check('khởi động lại thì chỉ mục được dựng bù, KHÔNG thiếu tệp nào',
      sau.thieu.length === 0, sau.thieu.slice(0, 5));
    check('và KHÔNG thừa tệp nào không còn ai trỏ tới', sau.thua.length === 0, sau.thua.slice(0, 5));
  }

  // =========================================================================
  console.log('\n[5] Đọc cột nào — không kéo cả bảng bài về để vứt đi');
  {
    const ma = fs.readFileSync(path.join(GOC, 'modules/cambridge/routes.js'), 'utf8');
    check('bước lọc chỉ đọc cột cần, KHÔNG đọc cột `anh` của mọi bài',
      /SELECT id, congBoLuc, phamVi, classId, campusId FROM cambridge_bai/.test(ma), 'routes.js');
    check('nguyên bài chỉ đọc cho ĐÚNG một trang',
      /SELECT \* FROM cambridge_bai WHERE id IN \(/.test(ma), 'routes.js');
    check('và giữ nguyên thứ tự đã xếp — WHERE id IN không hứa thứ tự nào',
      /daySo\.get\(a\.id\) - daySo\.get\(b\.id\)/.test(ma), 'routes.js');
  }
} finally {
  Database.prototype.prepare = goc;
  try { db.close(); } catch (_) { /* đã đóng */ }
  donThuMucTam(DIR);
}

tongKet('Hiệu năng Cambridge (Đ158)');
