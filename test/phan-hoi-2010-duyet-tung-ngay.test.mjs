// Góp ý của trường 20/10 — Đ242E: DUYỆT ĐƠN NGHỈ TỪNG NGÀY (E1), TỰ GHI ĐIỂM
// DANH (D4), NGÀY TRƯỜNG NGHỈ KHÔNG PHẢI "CHƯA ĐIỂM DANH" (D5).
//
// Chạy bằng:  node test/phan-hoi-2010-duyet-tung-ngay.test.mjs
//
// Đi đúng ví dụ của trường: đơn 21/10 – 24/10/2026, gia đình gửi lúc 7h30 sáng
// 21/10 (giờ Việt Nam).
//   • 21/10 — gửi sau 7h sáng của chính ngày đó → nghỉ KHÔNG phép, KHÔNG hoàn.
//   • 22, 23/10 — nghỉ có phép, được hoàn.
//   • 24/10 — Thứ Bảy, không hoàn.
// "Số ngày được hoàn" cũ vẫn là một con số (= số dòng được hoàn) để bảng tiền
// ăn và tệp xuất đang đọc nó vẫn đúng.
//
// D4: duyệt xong thì sổ điểm danh tự có dòng cho ngày đã qua; ngày tới hạn sau
// đó do việc định giờ ghi. Không bao giờ đè dòng cô đã ghi, chạy lại không ghi
// đôi, sửa đơn chỉ sửa đúng dòng do việc tự động này ghi.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-duyet-tung-ngay');
sinhDuLieu(DIR);
batPhanHe(DIR, ['xinphep', 'diemdanh', 'tienan']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const CSDL = path.join(DIR, 'school.db');
const moCsdl = () => new Database(CSDL);

// Dựng sổ điểm danh của bé s1 cho đúng các ngày bài này dùng: dữ liệu mẫu có
// điểm danh 20 ngày học gần nhất, tính lùi từ hôm nay, nên phải dọn trước để
// bài chạy ngày nào cũng ra một kết quả.
{
  const c = moCsdl();
  c.prepare(`DELETE FROM attendance WHERE studentId = 's1' AND date IN
    ('2026-09-14','2026-09-15','2026-10-16','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24')`).run();
  c.prepare("DELETE FROM attendance WHERE date = '2026-09-15'").run();
  // 20/10: cô đã cho bé vào lớp — dòng này không được đụng tới.
  c.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
    VALUES ('att_co_ghi_2010', 's1', '2026-10-20', 'present', '07:40', NULL, '', 't1')`).run();
  c.close();
}

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7141), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const VP = await vao('hieutruong', mkQT);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

async function guiDon(tu, den, guiLuc) {
  const r = await req('POST', '/api/leave', {
    cookie: PH, body: { studentId: 's1', fromDate: tu, toDate: den, reason: 'Con bị sốt, gia đình xin cho con ở nhà' },
  });
  const id = r.data?.id;
  if (id && guiLuc) {
    const c = moCsdl();
    c.prepare('UPDATE leave_requests SET createdAt = ? WHERE id = ?').run(guiLuc, id);
    c.close();
  }
  return id;
}
const donCua = async (cookie, id) => ((await req('GET', '/api/leave', { cookie })).data || []).find(l => l.id === id);
const diemDanhS1 = async (thang) => {
  const ds = (await req('GET', `/api/attendance?studentId=s1&month=${thang}`, { cookie: PH })).data || [];
  return new Map(ds.map(r => [r.date, r]));
};
const theoNgayMap = (ds) => new Map((ds || []).map(x => [x.ngay, x]));

// ===========================================================================
console.log('\n[1] Màn duyệt nhận GỢI Ý từng ngày, đúng ví dụ 21–24/10 của trường');
// 07:30 sáng 21/10 giờ Việt Nam = 00:30 UTC.
const DON = await guiDon('2026-10-21', '2026-10-24', '2026-10-21T00:30:00.000Z');
let GOI_Y = [];
{
  check('gia đình gửi được đơn', !!DON, DON);
  const l = await donCua(VP, DON);
  GOI_Y = l?.goiYTheoNgay || [];
  const g = theoNgayMap(GOI_Y);
  check('đơn chờ duyệt có gợi ý cho đủ 4 ngày', GOI_Y.length === 4, GOI_Y);
  check('21/10 — gửi sau 7h sáng: KHÔNG phép, KHÔNG hoàn, nói rõ lý do',
    g.get('2026-10-21')?.coPhep === 'khong' && g.get('2026-10-21')?.duocHoan === 'khong'
      && /sau 7 giờ sáng/.test(g.get('2026-10-21')?.lyDo || ''), g.get('2026-10-21'));
  check('22/10 và 23/10 — có phép, được hoàn',
    ['2026-10-22', '2026-10-23'].every(d => g.get(d)?.coPhep === 'co' && g.get(d)?.duocHoan === 'co'),
    [g.get('2026-10-22'), g.get('2026-10-23')]);
  check('24/10 — Thứ Bảy: không hoàn, lý do Thứ Bảy/Chủ Nhật',
    g.get('2026-10-24')?.duocHoan === 'khong' && /Thứ Bảy\/Chủ Nhật/.test(g.get('2026-10-24')?.lyDo || ''),
    g.get('2026-10-24'));
  check('chưa duyệt thì chưa có dòng theo ngày nào được lưu', l?.theoNgay === null, l?.theoNgay);

  const lPh = await donCua(PH, DON);
  check('gia đình không nhận gợi ý duyệt của văn phòng', !lPh?.goiYTheoNgay, lPh?.goiYTheoNgay);
}

// ===========================================================================
console.log('\n[2] Kiểm dữ liệu từng dòng — sai thì từ chối, đơn vẫn chờ');
{
  const thieu = await req('POST', `/api/leave/${DON}/review`, {
    cookie: VP, body: { status: 'approved', theoNgay: GOI_Y.slice(0, 3) },
  });
  check('thiếu dòng của một ngày thì từ chối', thieu.status === 400, thieu.data);
  const ngoai = await req('POST', `/api/leave/${DON}/review`, {
    cookie: VP, body: { status: 'approved', theoNgay: [...GOI_Y.slice(0, 3), { ngay: '2026-10-25', coPhep: 'co', duocHoan: 'co' }] },
  });
  check('dòng của ngày ngoài đơn thì từ chối', ngoai.status === 400, ngoai.data);
  const khongPhepMaHoan = await req('POST', `/api/leave/${DON}/review`, {
    cookie: VP,
    body: { status: 'approved', theoNgay: GOI_Y.map(x => (x.ngay === '2026-10-21' ? { ...x, duocHoan: 'co' } : x)) },
  });
  check('nghỉ không phép mà ghi được hoàn thì từ chối', khongPhepMaHoan.status === 400, khongPhepMaHoan.data);
  const co = await req('POST', `/api/leave/${DON}/review`, { cookie: GV, body: { status: 'approved', theoNgay: GOI_Y } });
  check('cô vẫn không duyệt được', co.status === 403, co.status);
  const l = await donCua(VP, DON);
  check('sau các lần bấm hụt, đơn vẫn chờ và chưa có dòng nào', l?.status === 'pending' && l?.theoNgay === null, l?.status);
}

// ===========================================================================
console.log('\n[3] Duyệt theo từng ngày: số ngày hoàn cũ = số dòng được hoàn');
{
  const r = await req('POST', `/api/leave/${DON}/review`, {
    cookie: VP,
    body: {
      status: 'approved', theoNgay: GOI_Y,
      ghiChuHoan: 'Đã báo bếp cắt suất từ 22/10', reviewNote: 'Chúc con mau khoẻ!',
    },
  });
  check('duyệt được', r.status === 200, r.data);
  check('hoàn tiền ăn 2 ngày (22 và 23/10)',
    r.data?.hoanTien?.hoanTienAn === 'co' && r.data?.hoanTien?.soNgay === 2, r.data?.hoanTien);
  check('ghi chú nội bộ và lời nhắn gia đình giữ nguyên',
    /cắt suất/.test(r.data?.hoanTien?.ghiChu || '') && r.data?.reviewNote === 'Chúc con mau khoẻ!', r.data);
  const t = theoNgayMap(r.data?.theoNgay);
  check('lưu đủ 4 dòng theo ngày', t.size === 4, r.data?.theoNgay);
  check('dòng 21/10 lưu đúng không phép, không hoàn',
    t.get('2026-10-21')?.coPhep === 'khong' && t.get('2026-10-21')?.duocHoan === 'khong', t.get('2026-10-21'));

  const thang = (await req('GET', '/api/tienan/thang?thang=2026-10', { cookie: VP })).data;
  const be = (thang?.danhSach || []).find(x => x.studentId === 's1');
  check('bảng tiền ăn tháng đọc đúng 2 ngày hoàn từ đơn này', be?.soNgayHoanTienAn === 2, be?.soNgayHoanTienAn);
}

// ===========================================================================
console.log('\n[4] D4 — duyệt xong, sổ điểm danh tự có dòng cho các ngày đã qua');
{
  const dd = await diemDanhS1('2026-10');
  check('21/10 → Nghỉ không phép', dd.get('2026-10-21')?.status === 'absent_unexcused', dd.get('2026-10-21'));
  check('22/10, 23/10 → Nghỉ có phép',
    dd.get('2026-10-22')?.status === 'absent_excused' && dd.get('2026-10-23')?.status === 'absent_excused',
    [dd.get('2026-10-22'), dd.get('2026-10-23')]);
  check('24/10 (Thứ Bảy) — không sinh dòng điểm danh cuối tuần', !dd.has('2026-10-24'), dd.get('2026-10-24'));
  check('dòng tự ghi có đánh dấu nguồn', dd.get('2026-10-22')?.markedBy === 'tu-dong:don-nghi', dd.get('2026-10-22')?.markedBy);
}

// ===========================================================================
console.log('\n[5] Gia đình thấy kết quả từng ngày — không lộ ghi chú nội bộ');
{
  const l = await donCua(PH, DON);
  const t = theoNgayMap(l?.theoNgay);
  check('gia đình thấy 4 dòng theo ngày', t.size === 4, l?.theoNgay);
  check('kèm lý do của ngày không phép', /sau 7 giờ sáng/.test(t.get('2026-10-21')?.lyDo || ''), t.get('2026-10-21'));
  check('ghi chú nội bộ về tiền ăn không đi ra ngoài', l?.hoanTien?.ghiChu === '', l?.hoanTien);
  check('không lộ trạng thái nội bộ của việc ghi điểm danh',
    [...t.values()].every(x => !('diemDanh' in x) && !('attId' in x)), l?.theoNgay);
}

// ===========================================================================
console.log('\n[6] Không bao giờ đè dòng cô đã ghi; chạy lại không ghi đôi');
let DON2;
{
  DON2 = await guiDon('2026-10-19', '2026-10-20', '2026-10-18T12:00:00.000Z');
  const l = await donCua(VP, DON2);
  const r = await req('POST', `/api/leave/${DON2}/review`, {
    cookie: VP, body: { status: 'approved', theoNgay: l?.goiYTheoNgay },
  });
  check('duyệt đơn 19–20/10', r.status === 200, r.data);
  const dd = await diemDanhS1('2026-10');
  check('19/10 chưa có dòng → tự ghi Nghỉ có phép', dd.get('2026-10-19')?.status === 'absent_excused', dd.get('2026-10-19'));
  check('20/10 cô đã cho bé vào lớp → GIỮ NGUYÊN có mặt',
    dd.get('2026-10-20')?.status === 'present' && dd.get('2026-10-20')?.markedBy === 't1', dd.get('2026-10-20'));
  const lv = await donCua(VP, DON2);
  const t = theoNgayMap(lv?.theoNgay);
  check('văn phòng thấy dòng 20/10 được đánh dấu: sổ đã có dòng khác',
    t.get('2026-10-20')?.diemDanh === 'da-co' && t.get('2026-10-20')?.diemDanhCo === 'present', t.get('2026-10-20'));

  await sv.khoiDongLai();
  await sv.khoiDongLai();
  const c = moCsdl();
  const so = c.prepare("SELECT COUNT(*) AS n FROM attendance WHERE studentId = 's1' AND date BETWEEN '2026-10-19' AND '2026-10-24'").get().n;
  const giu = c.prepare("SELECT status, markedBy FROM attendance WHERE id = 'att_co_ghi_2010'").get();
  c.close();
  check('khởi động lại hai lần (việc định giờ chạy lại) — vẫn đúng 5 dòng, không ghi đôi', so === 5, so);
  check('dòng của cô vẫn nguyên', giu?.status === 'present' && giu?.markedBy === 't1', giu);
}

// ===========================================================================
console.log('\n[7] D4 — ngày tới hạn sau lúc duyệt thì việc định giờ ghi');
{
  // Đơn cho một ngày còn ở phía trước: lúc duyệt chưa ghi gì.
  const id = await guiDon('2027-03-02', '2027-03-02');
  const l = await donCua(VP, id);
  const r = await req('POST', `/api/leave/${id}/review`, { cookie: VP, body: { status: 'approved', theoNgay: l?.goiYTheoNgay } });
  check('duyệt đơn ngày tương lai', r.status === 200, r.data);
  const c0 = moCsdl();
  const truoc = c0.prepare("SELECT COUNT(*) AS n FROM attendance WHERE studentId = 's1' AND date = '2027-03-02'").get().n;
  // Giả lập "ngày ấy đã tới": dời đơn và dòng theo ngày về 16/10/2026 (thứ Sáu).
  c0.prepare("UPDATE leave_requests SET fromDate = '2026-10-16', toDate = '2026-10-16' WHERE id = ?").run(id);
  c0.prepare("UPDATE leave_ngay SET ngay = '2026-10-16' WHERE leaveId = ?").run(id);
  c0.close();
  check('ngày chưa tới thì chưa có dòng điểm danh', truoc === 0, truoc);
  await sv.khoiDongLai();
  const dd = await diemDanhS1('2026-10');
  check('việc định giờ ghi Nghỉ có phép cho ngày tới hạn', dd.get('2026-10-16')?.status === 'absent_excused', dd.get('2026-10-16'));
}

// ===========================================================================
console.log('\n[8] Sửa đơn sau khi đã ghi: chỉ sửa dòng do việc tự động ghi');
{
  // 23/10: bé được chụp ảnh tới lớp sau khi đã ghi nghỉ — dòng thành của cô.
  const c = moCsdl();
  c.prepare("UPDATE attendance SET status = 'present', checkIn = '08:10', markedBy = 't1' WHERE studentId = 's1' AND date = '2026-10-23'").run();
  c.close();
  const l = await donCua(VP, DON);
  const moi = (l?.theoNgay || []).map(x => (['2026-10-22', '2026-10-23'].includes(x.ngay)
    ? { ngay: x.ngay, coPhep: 'khong', duocHoan: 'khong', lyDo: 'Văn phòng sửa' }
    : { ngay: x.ngay, coPhep: x.coPhep, duocHoan: x.duocHoan, lyDo: x.lyDo }));

  const co = await req('PUT', `/api/leave/${DON}/ngay`, { cookie: GV, body: { theoNgay: moi } });
  check('cô không sửa được dòng theo ngày', co.status === 403, co.status);
  const ph = await req('PUT', `/api/leave/${DON}/ngay`, { cookie: PH, body: { theoNgay: moi } });
  check('gia đình cũng không', ph.status === 403, ph.status);

  const r = await req('PUT', `/api/leave/${DON}/ngay`, { cookie: VP, body: { theoNgay: moi } });
  check('văn phòng sửa được', r.status === 200, r.data);
  check('số ngày hoàn cập nhật theo: còn 0 → không hoàn',
    r.data?.hoanTien?.hoanTienAn === 'khong' && r.data?.hoanTien?.soNgay === null, r.data?.hoanTien);
  check('ghi chú nội bộ cũ vẫn còn', /cắt suất/.test(r.data?.hoanTien?.ghiChu || ''), r.data?.hoanTien);
  const dd = await diemDanhS1('2026-10');
  check('22/10 (dòng tự ghi) → đổi theo thành Nghỉ không phép', dd.get('2026-10-22')?.status === 'absent_unexcused', dd.get('2026-10-22'));
  check('23/10 (dòng của cô) → GIỮ NGUYÊN có mặt',
    dd.get('2026-10-23')?.status === 'present' && dd.get('2026-10-23')?.markedBy === 't1', dd.get('2026-10-23'));
  const t = theoNgayMap(r.data?.theoNgay);
  check('và dòng 23/10 được đánh dấu cho văn phòng xem', t.get('2026-10-23')?.diemDanh === 'da-co', t.get('2026-10-23'));
}

// ===========================================================================
console.log('\n[9] Đơn duyệt kiểu cũ (một con số) đọc và hiện như trước');
{
  const id = await guiDon('2027-03-09', '2027-03-10');
  const r = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP, body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 1 },
  });
  check('đường duyệt cũ vẫn chạy', r.status === 200 && r.data?.hoanTien?.soNgay === 1, r.data);
  check('đơn cũ không có dòng theo ngày', r.data?.theoNgay === null, r.data?.theoNgay);
  const sua = await req('PUT', `/api/leave/${id}/ngay`, { cookie: VP, body: { theoNgay: [] } });
  check('đơn cũ không bị đổi số liệu qua đường sửa từng ngày', sua.status === 400, sua.data);
  const l = await donCua(VP, id);
  check('số ngày hoàn của đơn cũ vẫn là 1', l?.hoanTien?.soNgay === 1, l?.hoanTien);
}

// ===========================================================================
console.log('\n[10] Ngày trùng lịch nghỉ của trường — không hoàn hai lần');
{
  const dot = await req('POST', '/api/leave/lich-nghi', {
    cookie: VP, body: { ten: 'Nghỉ thử 15/9', tuNgay: '2026-09-15', denNgay: '2026-09-15', loai: 'khac' },
  });
  check('đặt được đợt nghỉ 15/9', dot.status === 201, dot.data);
  const id = await guiDon('2026-09-14', '2026-09-15', '2026-09-13T12:00:00.000Z');
  const l = await donCua(VP, id);
  const g = theoNgayMap(l?.goiYTheoNgay);
  check('14/9 — ngày thường: có phép, được hoàn', g.get('2026-09-14')?.duocHoan === 'co', g.get('2026-09-14'));
  check('15/9 — trường nghỉ: ghi theo lịch nghỉ, KHÔNG hoàn lần nữa',
    g.get('2026-09-15')?.coPhep === 'co' && g.get('2026-09-15')?.duocHoan === 'khong'
      && /Trường nghỉ/.test(g.get('2026-09-15')?.lyDo || ''), g.get('2026-09-15'));
  const hai = await req('POST', `/api/leave/${id}/review`, {
    cookie: VP,
    body: { status: 'approved', theoNgay: (l?.goiYTheoNgay || []).map(x => ({ ...x, duocHoan: 'co' })) },
  });
  check('ghi hoàn cho ngày trường nghỉ đã hoàn thì từ chối', hai.status === 400, hai.data);
  const ok = await req('POST', `/api/leave/${id}/review`, { cookie: VP, body: { status: 'approved', theoNgay: l?.goiYTheoNgay } });
  check('duyệt theo gợi ý thì được, hoàn 1 ngày', ok.status === 200 && ok.data?.hoanTien?.soNgay === 1, ok.data);
  const dd = await diemDanhS1('2026-09');
  check('ngày trường nghỉ không sinh dòng điểm danh từng bé', !dd.has('2026-09-15'), dd.get('2026-09-15'));
}

// ===========================================================================
console.log('\n[11] D5 — ngày trường nghỉ không nằm trong bảng rà soát "chưa điểm danh"');
{
  const rs = (await req('GET', '/api/attendance/ra-soat?date=2026-09-15', { cookie: VP })).data;
  check('bảng rà soát ngày trường nghỉ không liệt kê bé nào cần gọi',
    rs?.quaGio === true && (rs?.danhSach || []).length === 0, { so: rs?.soCanRaSoat, ds: (rs?.danhSach || []).length });
  check('và nói rõ bao nhiêu bé nghỉ theo lịch của trường', rs?.soTruongNghi > 0, rs?.soTruongNghi);
  const thuong = (await req('GET', '/api/attendance/ra-soat?date=2026-09-16', { cookie: VP })).data;
  check('ngày thường bên cạnh vẫn rà soát như cũ', thuong?.soTruongNghi === 0, thuong?.soTruongNghi);
}

// ===========================================================================
console.log('\n[12] Lược đồ: bảng theo ngày là bảng mới, chỉ thêm');
{
  const sql = fs.readFileSync(path.join(GOC, 'lib/schema.sql'), 'utf8');
  check('có CREATE TABLE IF NOT EXISTS leave_ngay', /CREATE TABLE IF NOT EXISTS leave_ngay/.test(sql));
  check('khoá ngoại về đơn có ON DELETE CASCADE',
    /leave_ngay[\s\S]*?REFERENCES leave_requests\(id\) ON DELETE CASCADE/.test(sql));
  check('lược đồ lõi vẫn không có câu ALTER TABLE nào', !sql.split('\n').some(d => /^\s*ALTER\s+TABLE/i.test(d)));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
