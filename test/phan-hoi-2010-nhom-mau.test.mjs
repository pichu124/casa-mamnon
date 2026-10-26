// Góp ý 20/10, mục C1: BỎ NHÓM MÁU KHỎI HỒ SƠ BÉ — phần máy chủ.
//
// Chạy bằng:  node test/phan-hoi-2010-nhom-mau.test.mjs
//
// Trường không dùng ô nhóm máu nữa. Bỏ khỏi chỗ NGƯỜI NHÌN THẤY (tệp mẫu tải
// về, hai tệp xuất danh sách) nhưng KHÔNG đụng dữ liệu (Nguyên tắc số 1 điều 3):
//
//   1. Tệp mẫu CSV tải về không còn cột "Nhóm máu".
//   2. Tệp xuất danh sách bé (CSV) và tệp Hồ sơ bé của Xuất báo cáo (Excel)
//      không còn cột "Nhóm máu" — và vẫn cùng một bộ cột với nhau.
//   3. Tệp CSV ĐỜI CŨ còn cột "Nhóm máu" vẫn nhập được, và giá trị vẫn được lưu.
//   4. Màn Sửa hồ sơ không gửi nhóm máu nữa: lưu hồ sơ KHÔNG xoá nhóm máu đã có.
//   5. (H1) API hồ sơ sức khoẻ trả về cho gia đình KHÔNG đổi — chỉ màn hình ẩn.
import path from 'path';
import { createRequire } from 'module';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const xlsx = createRequire(import.meta.url)(path.join(GOC, 'lib', 'xlsx.js'));
const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-nhom-mau');
sinhDuLieu(DIR);
const mkTam = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5471), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
{
  const dau = await login('hieutruong', mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: dau.cookie, body: { newPassword: 'quantri2026' } });
}
const A = (await login('hieutruong', 'quantri2026')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;
const docDb = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const taiChu = async (duong) => {
  const r = await fetch(sv.BASE + duong, { headers: { Cookie: A } });
  return { status: r.status, chu: (await r.text()).replace(/^﻿/, '') };
};

try {
  // =========================================================================
  console.log('\n[1] Tệp mẫu CSV tải về: không còn cột Nhóm máu');
  {
    const mau = await taiChu('/api/admin/import/template');
    const dau = mau.chu.split(/\r?\n/)[0].split(',');
    check('tải được tệp mẫu', mau.status === 200, mau.status);
    check('mẫu vẫn có cột Dân tộc', dau.includes('Dân tộc'), dau);
    check('mẫu KHÔNG còn cột Nhóm máu', !dau.includes('Nhóm máu'), dau);
  }

  // =========================================================================
  console.log('\n[2] Tệp xuất danh sách bé (CSV) và Hồ sơ bé (Excel): không còn cột Nhóm máu');
  {
    const csv = await taiChu('/api/admin/students/xuat.csv');
    const dauCsv = csv.chu.split(/\r?\n/)[0].split(',');
    check('tải được danh sách bé', csv.status === 200, csv.status);
    check('danh sách vẫn có cột Dân tộc và Tiền sử bệnh',
      dauCsv.includes('Dân tộc') && dauCsv.includes('Tiền sử bệnh / lưu ý đặc biệt'), dauCsv);
    check('danh sách KHÔNG còn cột Nhóm máu', !dauCsv.includes('Nhóm máu'), dauCsv);

    const r = await fetch(`${sv.BASE}/api/xuatbaocao/ho-so-be?pham=truong`, { headers: { Cookie: A } });
    const bang = r.status === 200 ? xlsx.doc(Buffer.from(await r.arrayBuffer())) : [];
    const dauXlsx = ((bang[0] || {}).hang || [])[0] || [];
    check('tải được tệp Hồ sơ bé của Xuất báo cáo', r.status === 200 && dauXlsx.length > 0, r.status);
    check('tệp Hồ sơ bé KHÔNG còn cột Nhóm máu', !dauXlsx.includes('Nhóm máu'), dauXlsx);
    check('và vẫn cùng một bộ cột với tệp danh sách bé',
      JSON.stringify(dauXlsx) === JSON.stringify(dauCsv), [dauXlsx, dauCsv]);
  }

  // =========================================================================
  console.log('\n[3] Tệp CSV đời cũ còn cột Nhóm máu: vẫn nhập được, giá trị vẫn lưu');
  {
    const csvCu = 'Họ tên,Nhóm,Họ tên phụ huynh,Điện thoại,Dân tộc,Nhóm máu\n'
      + 'Hà Thị Cũ,Chồi 2,Hà Văn Cũ,0901777888,Tày,AB\n';
    const nhap = await req('POST', '/api/admin/import/commit', { cookie: A, body: { csv: csvCu } });
    check('nhập được tệp có cột Nhóm máu', nhap.status === 200 && nhap.data?.imported === 1, nhap.data);
    const be = docDb("SELECT ethnicity, bloodType FROM students WHERE name = 'Hà Thị Cũ'")[0] || {};
    check('nhóm máu trong tệp vẫn được lưu vào dữ liệu', be.bloodType === 'AB', be);
    check('dân tộc cũng được lưu', be.ethnicity === 'Tày', be);
  }

  // =========================================================================
  console.log('\n[4] Lưu hồ sơ không kèm nhóm máu: nhóm máu đã có còn nguyên');
  {
    const truoc = docDb("SELECT * FROM students WHERE id = 's1'")[0];
    check('đối chứng — bé s1 có nhóm máu từ dữ liệu mẫu', truoc.bloodType === 'O', truoc.bloodType);
    // Đúng gói màn Sửa hồ sơ gửi sau khi bỏ ô Nhóm máu.
    const luu = await req('PUT', '/api/admin/students/s1', {
      cookie: A,
      body: {
        name: truoc.name, code: truoc.code || '', dob: truoc.dob || '', gender: truoc.gender || '',
        address: 'Địa chỉ mới của bé', ethnicity: truoc.ethnicity || '', soDinhDanh: '', tienSuBenh: '',
        lienHeKhanCap: [], classId: truoc.classId,
      },
    });
    check('lưu được hồ sơ', luu.status === 200, luu.data);
    const sau = docDb("SELECT address, bloodType FROM students WHERE id = 's1'")[0];
    check('địa chỉ đã đổi', sau.address === 'Địa chỉ mới của bé', sau.address);
    check('NHÓM MÁU CÒN NGUYÊN trong dữ liệu', sau.bloodType === 'O', sau.bloodType);
  }

  // =========================================================================
  console.log('\n[5] (H1) API sức khoẻ trả cho gia đình không đổi — chỉ màn hình ẩn');
  {
    const r = await req('GET', '/api/health?studentId=s1', { cookie: PH });
    const loai = new Set((r.data?.records || []).map(x => x.type));
    check('gia đình đọc được hồ sơ sức khoẻ của con', r.status === 200, r.status);
    check('API vẫn trả đủ ba loại ghi nhận như trước',
      loai.has('checkup') && loai.has('vaccination') && loai.has('incident'), [...loai]);
    check('API vẫn trả chỉ số gần nhất', !!r.data?.latestCheckup, r.data?.latestCheckup);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
