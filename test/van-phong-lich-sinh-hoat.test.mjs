// Bài canh hồi quy: VĂN PHÒNG CƠ SỞ TẠO VÀ SỬA ĐƯỢC LỊCH SINH HOẠT (Đ260m).
//
// Chạy bằng:  node test/van-phong-lich-sinh-hoat.test.mjs   (TEST_PORT tuỳ chọn)
//
// Góp ý văn phòng 18/11: *"Văn phòng có quyền tạo và sửa lịch sinh hoạt."*
//
// Rà lại thì mã ĐÃ cho làm việc này (routes/timetable.js: quản trị +
// canAccessClass; '/api/timetable' có trong danh sách cho phép của chức vụ
// "Văn phòng cơ sở"), nhưng chưa bài nào canh văn phòng cơ sở GHI thành công —
// chỉ có bài canh phía bị chặn. Một lần siết danh sách chức vụ sau này mà quên
// dòng ấy là văn phòng mất quyền lặng lẽ, đúng kiểu "quên theo hướng đóng lại"
// đã ghi trong lib/db.js. Bài này chỉ canh, không đổi mã.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('van-phong-lich-sinh-hoat');
sinhDuLieu(DIR);
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'vanphong1');
khoaVaoCoSo(DIR, 'vanphong1', 'cs1');
datChucVu(DIR, 'vanphong1', 'vanphong-coso');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5472), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const d0 = await login('vanphong1', mkVP);
await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
const VP = (await login('vanphong1', 'quantri2026')).cookie;
const GV = (await login('giaovien', '123456')).cookie;

const LICH = {
  periodTimes: [{ p: '1', time: '07:30 – 08:00' }, { p: '2', time: '08:00 – 09:00' }],
  days: { 1: ['Đón trẻ', 'Khám phá: nước'], 2: ['Đón trẻ', 'Âm nhạc'], 3: ['Đón trẻ', 'Tạo hình'], 4: ['Đón trẻ', 'Vận động'], 5: ['Đón trẻ', 'Ngôn ngữ'] },
};

// ===========================================================================
console.log('\n[1] Văn phòng cơ sở 1 TẠO và SỬA lịch sinh hoạt của nhóm cơ sở mình');
{
  // c4 (Nhà trẻ 1, cơ sở 1) — dữ liệu mẫu chưa chắc có lịch; ghi là tạo hoặc sửa.
  const tao = await req('PUT', '/api/timetable/c4', { cookie: VP, body: LICH });
  check('văn phòng cơ sở ghi lịch nhóm của cơ sở mình → 200', tao.status === 200, tao);
  const doc = await req('GET', '/api/timetable?classId=c4', { cookie: VP });
  check('đọc lại đúng khung giờ vừa ghi', doc.status === 200 && doc.data?.periodTimes?.[1]?.time === '08:00 – 09:00', doc.data);

  const sua = await req('PUT', '/api/timetable/c1', { cookie: VP, body: { ...LICH, days: { ...LICH.days, 1: ['Đón trẻ', 'Khám phá: cây xanh'] } } });
  check('sửa lịch một nhóm khác của cơ sở 1 → 200', sua.status === 200, sua.status);
  const coDoc = await req('GET', '/api/timetable?classId=c1', { cookie: GV });
  check('cô của nhóm đọc được bản văn phòng vừa sửa', coDoc.data?.days?.['1']?.[1] === 'Khám phá: cây xanh', coDoc.data?.days);
}

// ===========================================================================
console.log('\n[2] Không ghi được sang cơ sở khác; cô không ghi');
{
  const khac = await req('PUT', '/api/timetable/c3', { cookie: VP, body: LICH });
  check('nhóm của cơ sở 2 → 403', khac.status === 403, khac.status);
  const co = await req('PUT', '/api/timetable/c1', { cookie: GV, body: LICH });
  check('cô ghi → 403, câu từ chối chỉ đường tới văn phòng', co.status === 403 && /văn phòng/.test(co.data?.error || ''), co.data);
}

await sv.dung();
donThuMucTam(DIR);
tongKet('Văn phòng cơ sở tạo và sửa Lịch sinh hoạt');
