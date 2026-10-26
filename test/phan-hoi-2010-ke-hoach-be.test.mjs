// Bài canh góp ý của trường 20/10 cho phân hệ KẾ HOẠCH CỦA BÉ — phần máy chủ.
//
// Chạy bằng:  node test/phan-hoi-2010-ke-hoach-be.test.mjs
//
//   N6. "Nhìn lại cuối tháng" có thêm "Mở rộng ở tháng sau" bên cạnh "Dạy mới"
//       và "Ôn tập": lưu được, đọc lại được, và tháng sau bài được gợi ý / chép
//       sang đúng nhãn MỞ RỘNG (không bị đổi thành ôn tập).
//   N8. Máy chủ cho cô giaovien2 xem đúng nhóm của mình, kể cả theo bảng phân
//       công nhiều cô – một nhóm; lời "Không có quyền" chỉ dành cho nhóm KHÔNG
//       phải của cô. (Lỗi N8 nằm ở màn hình — bài giao diện cùng tên canh nó.)
//
// Màn hình có `test/phan-hoi-2010-ke-hoach-be-giao-dien.test.mjs`.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, MAU,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-ke-hoach-be');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3872), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QL = await vao('hieutruong', mk1);
const GV = (await login('giaovien', '123456')).cookie;    // t1 — nhóm c1
const GV2 = (await login('giaovien2', '123456')).cookie;  // t2 — nhóm c2 Lá 1
const GV3 = (await login('giaovien3', '123456')).cookie;  // t3 — dạy c1 và c2 (bảng phân công)

const THANG = HOM_NAY().slice(0, 7);
const [Y, M] = THANG.split('-').map(Number);
const THANG_SAU = new Date(Date.UTC(Y, M, 1)).toISOString().slice(0, 7);
const nhom = async (cookie = GV, thang = THANG) => (await req('GET', `/api/kehoachbe?classId=c1&thang=${thang}`, { cookie })).data || {};
const cuaBe = async (id, cookie = GV, thang = THANG) => ((await nhom(cookie, thang)).danhSach || []).find(x => x.studentId === id) || {};
const dong = (k, baiHocId) => ((k || {}).baiHoc || []).find(b => b.baiHocId === baiHocId) || {};

try {
  // =========================================================================
  console.log('\n[N6] "Tiếp tục ở tháng sau" có ba lựa chọn');
  {
    const d = await nhom();
    check('dạy mới / ôn tập / mở rộng, đúng thứ tự và đúng chữ',
      (d.tiepTuc || []).map(x => `${x.ma}:${x.ten}`).join(',')
        === 'hoc-moi:Dạy mới ở tháng sau,on-tap:Ôn tập ở tháng sau,mo-rong:Mở rộng ở tháng sau', d.tiepTuc);
  }

  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
  const bai = (goc, ten) => (dm.baiHoc || []).find(b => b.gocLinhVuc === goc && b.ten === ten);
  const thapHong = bai('giac-quan', 'Tháp hồng');
  const rotNuoc = bai('thuc-hanh-cuoc-song', 'Rót nước');
  await req('PUT', '/api/kehoachbe', { cookie: GV, body: { classId: 'c1', thang: THANG, chuongTrinh: 'chu-nhiem',
    danhSach: [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [
      { baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: rotNuoc.id, nhan: 'hoc-moi' }] }] } });
  await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
  const ke1 = (await cuaBe('s1')).ke;
  await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: ke1.id, chuongTrinh: 'chu-nhiem' }] } });

  console.log('\n[N6] Lưu "Mở rộng ở tháng sau" và đọc lại');
  {
    const r = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke1.id, baiHoc: [
      { id: dong(ke1, thapHong.id).id, mucDo: 'da-vung', tiepTuc: 'mo-rong' },
      { id: dong(ke1, rotNuoc.id).id, mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' },
    ] } });
    check('lưu được lựa chọn mở rộng', r.status === 200, r.data);
    const k = (await cuaBe('s1')).ke;
    check('đọc lại: Tháp hồng mang "mở rộng ở tháng sau"', dong(k, thapHong.id).tiepTuc === 'mo-rong', dong(k, thapHong.id));
    check('mở rộng là một việc của tháng sau (tiếp tục cùng con), không phải dấu trừ',
      dong(k, thapHong.id).ketQua === 'tiep-tuc' && !!dong(k, thapHong.id).tiepTucThangSau, dong(k, thapHong.id));
    check('mức độ cô chọn giữ nguyên (S · Đã vững)', dong(k, thapHong.id).mucDo === 'da-vung');
    const sai = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke1.id, baiHoc: [{ id: dong(ke1, thapHong.id).id, tiepTuc: 'nghi-luon' }] } });
    check('lựa chọn lạ vẫn bị chặn (400)', sai.status === 400, sai.status);
  }

  console.log('\n[N6] Tháng sau: bài "mở rộng" được gợi ý và chép sang đúng nhãn Mở rộng');
  {
    const gy = await req('GET', `/api/kehoachbe/goi-y?studentId=s1&thang=${THANG_SAU}`, { cookie: GV });
    const g = (id) => ((gy.data || {}).baiHoc || []).find(b => b.baiHocId === id);
    check('gợi ý Tháp hồng là MỞ RỘNG', g(thapHong.id)?.nhan === 'mo-rong', (gy.data || {}).baiHoc);
    check('gợi ý Rót nước vẫn là ÔN TẬP', g(rotNuoc.id)?.nhan === 'on-tap', (gy.data || {}).baiHoc);
    const x = await cuaBe('s1', GV, THANG_SAU);
    check('màn tháng sau tích sẵn Tháp hồng · mở rộng', ((x.goiY || {}).baiHoc || []).find(b => b.baiHocId === thapHong.id)?.nhan === 'mo-rong', x.goiY);
    const chep = await req('POST', '/api/kehoachbe/chep-thang-truoc', { cookie: GV, body: { classId: 'c1', thang: THANG_SAU, chiTiepTuc: true, chuongTrinh: 'chu-nhiem' } });
    check('chép phần Montessori sang tháng sau', chep.status === 200 && chep.data.daChep >= 1, chep.data);
    const k2 = (await cuaBe('s1', GV, THANG_SAU)).ke;
    check('bài chép sang mang đúng nhãn: Tháp hồng mở rộng, Rót nước ôn tập',
      dong(k2, thapHong.id).nhan === 'mo-rong' && dong(k2, rotNuoc.id).nhan === 'on-tap', (k2 || {}).baiHoc);
  }

  // =========================================================================
  console.log('\n[N8] Máy chủ cho giaovien2 xem đúng nhóm Lá 1 của mình');
  {
    const macDinh = await req('GET', `/api/kehoachbe?thang=${THANG}`, { cookie: GV2 });
    check('không ghi nhóm: máy chủ chọn nhóm Lá 1 của cô', macDinh.status === 200 && macDinh.data.classId === 'c2', [macDinh.status, macDinh.data?.classId]);
    check('đủ bé nhóm Lá 1', (macDinh.data.danhSach || []).length === MAU.soBeNhomLa1, (macDinh.data.danhSach || []).length);
    const ghiRo = await req('GET', `/api/kehoachbe?classId=c2&thang=${THANG}`, { cookie: GV2 });
    check('ghi rõ nhóm Lá 1: xem được', ghiRo.status === 200, ghiRo.data);
    const nhomKhac = await req('GET', `/api/kehoachbe?classId=c1&thang=${THANG}`, { cookie: GV2 });
    check('nhóm KHÔNG phải của cô: "Không có quyền xem kế hoạch của nhóm này"',
      nhomKhac.status === 403 && /Không có quyền xem kế hoạch của nhóm này/.test(nhomKhac.data?.error || ''), nhomKhac);
    const ba = await req('GET', `/api/kehoachbe?thang=${THANG}`, { cookie: GV3 });
    check('cô dạy hai nhóm (bảng phân công nhiều cô – một nhóm) thấy cả hai nhóm',
      ba.status === 200 && (ba.data.nhom || []).map(n => n.id).sort().join(',') === 'c1,c2', ba.data?.nhom);
    const ba2 = await req('GET', `/api/kehoachbe?classId=c2&thang=${THANG}`, { cookie: GV3 });
    check('và xem được nhóm Lá 1', ba2.status === 200, ba2.status);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
