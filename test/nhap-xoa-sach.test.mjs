// NHẬP LẠI LÀ SẠCH — KHÔNG BẢNG NÀO ĐƯỢC PHÉP GIỮ DỮ LIỆU MỒ CÔI.
//
// `lib/importer.js` xoá dữ liệu cũ theo một danh sách bảng viết tay. Lịch sử
// đã hai lần chứng minh danh sách viết tay sẽ rơi rớt: Đ32 (bảng phân hệ bị bỏ
// quên) và lần này — `record_edits`, bảng cờ đã-sửa/đã-thu-hồi KHÔNG có khoá
// ngoại nên không tự sạch theo bảng cha. Cờ thu hồi mồ côi có thể ẩn nhầm một
// bản ghi MỚI trùng mã sau khi seed/nhập lại — kiểu hỏng im lặng nhất.
//
// Bộ này không tin danh sách nữa: seed ĐẦY đủ dữ liệu (kể cả tám phân hệ),
// chạy importSnapshot rỗng, rồi hỏi CHÍNH sqlite_master — mọi bảng phải trống.
// Ngày ai đó thêm một bảng mới mà quên danh sách xoá (và bảng đó không có
// ON DELETE CASCADE), bài này đỏ ngay, kèm tên bảng.
import path from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoBoDem, GOC } from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const Database = require_('better-sqlite3');

const DIR = thuMucTam('nhap-xoa-sach');
sinhDuLieu(DIR, { phanHe: true });
const { check, tongKet } = taoBoDem();

// Gieo thêm một cờ thu hồi mồ côi giả lập — đúng thứ từng bị bỏ sót.
{
  const d = new Database(path.join(DIR, 'school.db'));
  d.prepare(`INSERT INTO record_edits (bang, recordId, thuHoi, thuHoiLuc, thuHoiBoi)
             VALUES ('notifications', 'nt_x', 1, '2026-01-01T00:00:00Z', 'ad_x')`).run();
  const soTruoc = d.prepare("SELECT COUNT(*) AS n FROM record_edits").get().n;
  check('trước khi nhập: có cờ thu hồi trong record_edits', soTruoc > 0, soTruoc);
  d.close();
}

// Chạy importSnapshot rỗng ở tiến trình RIÊNG (lib/db.js giữ kết nối theo
// vòng đời tiến trình — mở trong tiến trình bài test là tự chuốc SQLITE_BUSY).
execFileSync(process.execPath, ['-e', `
  const importer = require(${JSON.stringify(path.join(GOC, 'lib', 'importer.js'))});
  importer.importSnapshot({}, { clear: true });
`], { cwd: GOC, env: { ...process.env, DATA_DIR: DIR }, stdio: 'inherit' });

console.log('\n[1] Sau importSnapshot rỗng, mọi bảng trong sqlite_master phải trống');
{
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true });
  const bang = d.prepare(`SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all().map(r => r.name);
  check('đọc được danh sách bảng', bang.length > 20, bang.length);
  const conDuLieu = [];
  for (const t of bang) {
    const n = d.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n;
    if (n > 0) conDuLieu.push(`${t} (${n} dòng)`);
  }
  check('không bảng nào còn dữ liệu — danh sách xoá của importer không bỏ sót ai',
    conDuLieu.length === 0, conDuLieu);
  d.close();
}

donThuMucTam(DIR);
tongKet();
