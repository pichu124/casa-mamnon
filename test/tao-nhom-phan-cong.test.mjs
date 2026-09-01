// TẠO NHÓM KÈM PHÂN CÔNG CÔ PHẢI QUA ĐỦ CHỐT NHƯ ĐƯỜNG SỬA.
//
// `PUT /api/admin/classes/:id` đã trả giá để có hai chốt ở nhánh `teacherId`:
// văn phòng cơ sở không được phân công cô, và không được kéo một cô đang dạy
// ở cơ sở khác về (vì `setHomeroomTeacher` sẽ lặng lẽ gỡ cô khỏi các nhóm bên
// đó). Nhưng `POST /api/admin/classes` — tạo nhóm mới kèm `teacherId` — từng
// thiếu CẢ HAI, thành lối đi vòng quanh đúng hai chốt ấy.
//
// Kèm theo: danh sách cô của một nhóm phải GIỮ được cô có tài khoản đang khoá
// (nghỉ thai sản) nếu cô ĐANG có sẵn trong nhóm — giữ không phải là thêm;
// thêm MỚI một tài khoản khoá thì vẫn bị từ chối như cũ.
import path from 'path';
import { createRequire } from 'module';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, datChucVu, khoaVaoCoSo,
} from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const Database = require_('better-sqlite3');

const DIR = thuMucTam('tao-nhom-phan-cong');
sinhDuLieu(DIR);

// Bối cảnh: t4 (đang dạy c4 ở cơ sở 1) dạy thêm c3 ở CƠ SỞ 2; t3 bị khoá tài
// khoản (đang là cô phụ của c1 và c2).
{
  const d = new Database(path.join(DIR, 'school.db'));
  d.prepare(`INSERT OR REPLACE INTO class_teachers (classId, teacherId, vaiTro)
             VALUES ('c3', 't4', 'chinh')`).run();
  d.prepare("UPDATE users SET active = 0 WHERE id = 't3'").run();
  d.close();
}

const mkQL = taoQuanTri(DIR, 'Quản Lý CS1', 'quanly1');
const mkVP = taoQuanTri(DIR, 'Văn Phòng CS1', 'vanphong1');
const mkBGH = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
khoaVaoCoSo(DIR, 'quanly1', 'cs1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4140), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const { check, tongKet } = taoBoDem();

function dongPhanCong(classId, teacherId) {
  const d = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try {
    return d.prepare('SELECT vaiTro FROM class_teachers WHERE classId = ? AND teacherId = ?')
      .get(classId, teacherId);
  } finally { d.close(); }
}

console.log('\n[1] Quản lý cơ sở không kéo được cô đang dạy ở cơ sở khác qua đường TẠO nhóm');
{
  const ql = await login('quanly1', mkQL);
  const r = await req('POST', '/api/admin/classes', {
    cookie: ql.cookie,
    body: { name: 'Nhóm thử kéo cô', teacherId: 't4' },
  });
  check('tạo nhóm kèm cô của cơ sở khác → 403', r.status === 403, { status: r.status, data: r.data });
  check('phân công của cô ở cơ sở 2 còn nguyên', dongPhanCong('c3', 't4')?.vaiTro === 'chinh',
    dongPhanCong('c3', 't4'));
  check('phân công của cô ở c4 còn nguyên', !!dongPhanCong('c4', 't4'), dongPhanCong('c4', 't4'));
}

console.log('\n[2] Văn phòng cơ sở không phân công cô được qua đường TẠO nhóm');
{
  const vp = await login('vanphong1', mkVP);
  const co = await req('POST', '/api/admin/classes', {
    cookie: vp.cookie,
    body: { name: 'Nhóm VP kèm cô', teacherId: 't2' },
  });
  check('tạo nhóm KÈM cô → 403', co.status === 403, { status: co.status, data: co.data });

  const khong = await req('POST', '/api/admin/classes', {
    cookie: vp.cookie,
    body: { name: 'Nhóm VP không cô' },
  });
  check('tạo nhóm KHÔNG kèm cô vẫn là việc hằng ngày của văn phòng → 201',
    khong.status === 201, { status: khong.status, data: khong.data });
}

console.log('\n[3] Danh sách cô: GIỮ được cô đang nghỉ có sẵn trong nhóm, không THÊM mới được');
{
  const bgh = await login('hieutruong', mkBGH);
  const giu = await req('PUT', '/api/admin/classes/c1/teachers', {
    cookie: bgh.cookie,
    body: { teacherIds: ['t1', 't3'], chinhId: 't1' },
  });
  check('lưu danh sách c1 CÓ KÈM cô đang nghỉ (t3, vốn có sẵn) → 200',
    giu.status === 200, { status: giu.status, data: giu.data });
  check('dòng phân công của t3 trong c1 còn nguyên', !!dongPhanCong('c1', 't3'), dongPhanCong('c1', 't3'));

  const them = await req('PUT', '/api/admin/classes/c4/teachers', {
    cookie: bgh.cookie,
    body: { teacherIds: ['t4', 't3'], chinhId: 't4' },
  });
  check('THÊM MỚI cô đang khoá vào nhóm cô chưa từng có (c4) vẫn bị từ chối → 400',
    them.status === 400, { status: them.status, data: them.data });
}

sv.dung();
donThuMucTam(DIR);
tongKet();
