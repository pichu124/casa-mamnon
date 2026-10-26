// Bài canh LUỒNG "HÌNH ẢNH GHI NHANH" (Đ242B — B1, B4, B5, B7).
//
// Chạy bằng:  node test/hanh-trinh-ke-anh.test.mjs
//
// Chủ dự án quyết ngày 26/10 (B7): ảnh kể cho gia đình là ảnh QUÁ TRÌNH HỌC
// TẬP. Cô ghi nhanh ảnh, video hoặc một dòng; mục nằm ở "Hình ảnh ghi nhanh"
// cho tới khi cô hoàn thiện rồi kể.
//
// ẢNH GỐC VẪN LÀ TƯ LIỆU LỚP 1. Đường /api/hanhtrinh/anh/:file không nới một
// chữ (test/hanh-trinh.test.mjs [7] vẫn canh). Gia đình chỉ nhận một BẢN CHÉP
// RIÊNG mà cô chủ động gửi kèm, qua một đường riêng có luật đồng ý ảnh nhóm:
// chưa trả lời ≠ đồng ý.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, GOC,
} from './_chung.mjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const Database = createRequire(import.meta.url)('better-sqlite3');

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hanh-trinh-ke-anh');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'thuchup', 'album']);
const mkVP = taoQuanTri(DIR, 'Hiệu Trưởng', 'ka_vp');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7181), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// Hộp `ftyp` ở byte 4–8 là đủ qua phép kiểm chữ ký video của máy chủ.
function mp4(soByte = 4096) {
  const b = Buffer.alloc(soByte);
  b.writeUInt32BE(Math.min(soByte, 0xffffffff), 0);
  b.write('ftypisom', 4, 'ascii');
  return `data:video/mp4;base64,${b.toString('base64')}`;
}
// Tên tệp bản chép KHÔNG BAO GIỜ ra JSON, nên bài này đọc thẳng cơ sở dữ liệu
// tạm để biết tệp nào phải có / phải mất trên đĩa.
const docCsdl = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const layByte = async (duong, cookie) => {
  const r = await fetch(`${sv.BASE}${duong}`, { headers: cookie ? { cookie } : {} });
  return { status: r.status, loai: r.headers.get('content-type') || '' };
};

try {
  const d = await login('ka_vp', mkVP);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const VP = (await login('ka_vp', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô nhóm c1
  const GV3 = (await login('giaovien3', '123456')).cookie;  // t3 — cũng phụ trách c1
  const PH = (await login('phuhuynh', '123456')).cookie;    // p1 — mẹ bé s1

  // =========================================================================
  console.log('\n[g] Video ghi được ở lớp 1, quá trần 8 MB thì từ chối');
  {
    const v = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Bé rót nước từ bình sang ly.', video: mp4() } });
    check('cô ghi quan sát kèm video → 201', v.status === 201, v.data);
    check('video nằm ở cột tệp có sẵn, đuôi .mp4', /^[a-f0-9]{32}\.mp4$/.test(v.data?.anh || ''), v.data?.anh);
    check('gói trả về nói rõ đây là video', v.data?.laVideo === true, v.data?.laVideo);
    const b = await layByte(`/api/hanhtrinh/anh/${v.data?.anh}`, GV);
    check('cô đã ghi mở được video của mình, đúng loại tệp', b.status === 200 && /video\/mp4/.test(b.loai), b);
    check('gia đình KHÔNG mở được tệp gốc lớp 1', (await layByte(`/api/hanhtrinh/anh/${v.data?.anh}`, PH)).status === 403);

    const anh = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Bé xếp tháp.', anh: ANH } });
    check('quan sát kèm ảnh vẫn như cũ, laVideo = false', anh.status === 201 && anh.data?.laVideo === false, anh.data);

    const nang = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Video dài', video: mp4(8.5 * 1024 * 1024) } });
    check('video quá 8 MB → 400 kèm lời dễ hiểu', nang.status === 400 && /nặng quá/.test(nang.data?.error || ''), nang);
    const khongPhai = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'x', video: ANH } });
    check('ảnh khai là video → 400', khongPhai.status === 400, khongPhai);
    const ca2 = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'x', anh: ANH, video: mp4() } });
    check('vừa ảnh vừa video trong một ghi chép → 400', ca2.status === 400, ca2);

    const n = await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { video: mp4() } });
    check('nháp chưa gắn bé nhận video', n.status === 201 && n.data?.nhap?.coAnh === true && n.data?.nhap?.laVideo === true, n.data);
    const nNang = await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { video: mp4(8.5 * 1024 * 1024) } });
    check('nháp: video quá 8 MB → 400', nNang.status === 400, nNang);
    const g = await req('POST', `/api/hanhtrinh/nhap/${n.data?.nhap?.id}/gan`, { cookie: GV, body: { studentId: 's1' } });
    check('gắn bé cho nháp video, không mô tả → 201, video đi theo', g.status === 201 && g.data?.laVideo === true && /\.mp4$/.test(g.data?.anh || ''), g.data);
  }

  // =========================================================================
  console.log('\n[h] B5 — có tệp thì mô tả được để trống; trống cả hai vẫn 400');
  {
    const a = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', anh: ANH } });
    check('chỉ ảnh, không mô tả → 201', a.status === 201 && a.data?.moTa === '', a.data);
    const v = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: '  ', video: mp4() } });
    check('chỉ video, mô tả toàn dấu cách → 201', v.status === 201, v.data);
    const rong = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: '  ' } });
    check('trống cả mô tả lẫn tệp → 400', rong.status === 400, rong);
    const nRong = await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { moTa: '' } });
    check('nháp trống cả hai → 400', nRong.status === 400, nRong);

    const suaCoTep = await req('PUT', `/api/hanhtrinh/${a.data?.id}`, { cookie: GV, body: { moTa: '' } });
    check('quan sát có tệp: xoá trắng mô tả được', suaCoTep.status === 200 && suaCoTep.data?.moTa === '', suaCoTep);
    const chu = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Chỉ có chữ' } });
    const suaKhongTep = await req('PUT', `/api/hanhtrinh/${chu.data?.id}`, { cookie: GV, body: { moTa: '' } });
    check('quan sát chỉ có chữ: xoá trắng mô tả vẫn 400', suaKhongTep.status === 400, suaKhongTep);

    const gn = await req('POST', '/api/thuchup', { cookie: GV, body: { id: crypto.randomUUID(), studentId: 's1', dataUrl: ANH } });
    check('đối chứng — Ghi nhanh chỉ có ảnh', gn.status === 200 || gn.status === 201, gn);
    const chep = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', ghiNhanhId: gn.data?.id } });
    check('chép Ghi nhanh chỉ có ảnh sang Hành trình → 201 (ảnh được chép)', chep.status === 201 && !!chep.data?.anh, chep.data);
  }

  // =========================================================================
  console.log('\n[i] GET /api/hanhtrinh/cho-ke — chỉ mục CHƯA kể, chỉ của người đang đăng nhập');
  {
    const n = (await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { moTa: 'Nháp chữ của cô A', nhom: 'chu-nhiem' } })).data?.nhap;
    const q = (await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Quan sát chưa kể', video: mp4() } })).data;
    const gn = (await req('POST', '/api/thuchup', { cookie: GV, body: { id: crypto.randomUUID(), studentId: 's1', note: 'Ghi nhanh chưa dùng', dataUrl: ANH } })).data;
    const ck = await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV });
    check('cô mở được danh sách → 200', ck.status === 200 && Array.isArray(ck.data?.muc), ck);
    const tim = (ds, nguon, id) => (ds || []).find(m => m.nguon === nguon && m.id === id);
    const mN = tim(ck.data?.muc, 'nhap', n?.id);
    const mQ = tim(ck.data?.muc, 'quansat', q?.id);
    const mG = tim(ck.data?.muc, 'ghinhanh', gn?.id);
    check('có nháp chưa gắn bé, studentId = null, giữ chương trình', !!mN && mN.studentId === null && mN.nhom === 'chu-nhiem' && mN.moTa === 'Nháp chữ của cô A', mN);
    check('có quan sát chưa kể, kèm tên bé và đường tệp lớp 1', !!mQ && mQ.hoTen === 'Nguyễn Bảo An' && mQ.coTep === true
      && mQ.laVideo === true && mQ.tepUrl === `/api/hanhtrinh/anh/${q.anh}`, mQ);
    check('có Ghi nhanh chưa dùng', !!mG && mG.studentId === 's1' && mG.moTa === 'Ghi nhanh chưa dùng' && mG.coTep === true
      && mG.tepUrl === `/api/thuchup/anh/${gn.id}`, mG);
    check('mỗi mục đủ khoá', [mN, mQ, mG].every(m => m && ['nguon', 'id', 'studentId', 'hoTen', 'moTa', 'coTep', 'laVideo', 'tepUrl', 'nhom', 'goc', 'taoLuc'].every(k => k in m)), [mN, mQ, mG]);
    check('kèm trần video để màn hình nén trước khi gửi', ck.data?.toiDaVideo === 8 * 1024 * 1024, ck.data?.toiDaVideo);
    const lucs = (ck.data?.muc || []).map(m => m.taoLuc);
    check('mới nhất trước', lucs.every((t, i) => i === 0 || String(lucs[i - 1]) >= String(t)), lucs.slice(0, 6));

    const ck3 = (await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV3 })).data?.muc || [];
    check('cô B cùng nhóm KHÔNG thấy mục nào của cô A', !ck3.some(m => [n?.id, q?.id, gn?.id].includes(m.id)), ck3.map(m => m.id));
    const ckVP = (await req('GET', '/api/hanhtrinh/cho-ke', { cookie: VP })).data?.muc || [];
    check('văn phòng KHÔNG thấy nháp hay quan sát của cô', !ckVP.some(m => [n?.id, q?.id, gn?.id].includes(m.id)), ckVP.map(m => m.id));
    const qVP = (await req('POST', '/api/hanhtrinh', { cookie: VP, body: { studentId: 's1', anh: ANH } })).data;
    check('văn phòng thấy mục của CHÍNH mình',
      ((await req('GET', '/api/hanhtrinh/cho-ke', { cookie: VP })).data?.muc || []).some(m => m.id === qVP?.id));
    check('phụ huynh → 403', (await req('GET', '/api/hanhtrinh/cho-ke', { cookie: PH })).status === 403);

    const coQ = async () => ((await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV })).data?.muc || []).some(m => m.id === q?.id);
    const cb = await req('POST', `/api/hanhtrinh/${q?.id}/cong-bo`, { cookie: GV, body: { cauChuyen: 'Con rót nước rất khéo.', cungConONha: 'Cho con tự rót nước bữa tối.' } });
    check('đối chứng — kể được', cb.status === 200, cb);
    check('đã kể thì rời danh sách', !(await coQ()));
    await req('POST', `/api/hanhtrinh/${q?.id}/thu-hoi`, { cookie: GV, body: {} });
    check('thu hồi thì quay lại danh sách', await coQ());

    await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', ghiNhanhId: gn?.id } });
    check('Ghi nhanh đã chép sang Hành trình thì rời danh sách',
      !((await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV })).data?.muc || []).some(m => m.nguon === 'ghinhanh' && m.id === gn?.id));
    const gan = await req('POST', `/api/hanhtrinh/nhap/${n?.id}/gan`, { cookie: GV, body: { studentId: 's1' } });
    const sauGan = (await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV })).data?.muc || [];
    check('nháp gắn bé xong thì thành mục quan sát, không còn mục nháp',
      !sauGan.some(m => m.id === n?.id) && sauGan.some(m => m.nguon === 'quansat' && m.id === gan.data?.id), sauGan.map(m => m.nguon + ':' + m.id));

    await req('PUT', '/api/admin/modules/thuchup', { cookie: VP, body: { enabled: false } });
    const tat = await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV });
    check('tắt Ghi nhanh: danh sách vẫn chạy, không còn mục ghinhanh', tat.status === 200 && !(tat.data?.muc || []).some(m => m.nguon === 'ghinhanh'), tat.status);
    await req('PUT', '/api/admin/modules/thuchup', { cookie: VP, body: { enabled: true } });
  }

  // Ghi một quan sát kèm tệp rồi kể. Trả về { q, cb }.
  const KE = { cauChuyen: 'Hôm nay con tự rót nước vào ly, không làm đổ giọt nào.', cungConONha: 'Bữa tối để con tự rót nước nhé.' };
  const ghiVaKe = async ({ cookie = GV, studentId = 's1', tep = { anh: ANH }, ke = {} } = {}) => {
    const q = (await req('POST', '/api/hanhtrinh', { cookie, body: { studentId, moTa: 'Con rót nước', ...tep } })).data;
    const cb = await req('POST', `/api/hanhtrinh/${q?.id}/cong-bo`, { cookie, body: { ...KE, ...ke } });
    return { q, cb };
  };
  const muc = async (cookie, id, studentId = 's1') =>
    ((await req('GET', `/api/hanhtrinh?studentId=${studentId}`, { cookie })).data?.quanSat || []).find(x => x.id === id);
  const tepCuaQs = (id) => docCsdl('SELECT * FROM hanhtrinh_ke_tep WHERE quanSatId = ?', id);
  const tepTrenDia = (file) => fs.existsSync(path.join(DIR, 'uploads', file));

  // =========================================================================
  console.log('\n[a] Công bố KHÔNG kèm tệp (app cũ, kemTep mặc định false) — gia đình không có ảnh');
  {
    const { q, cb } = await ghiVaKe();
    check('đối chứng — công bố được', cb.status === 200 && cb.data?.daCongBo === true, cb.data);
    const ph = await muc(PH, q.id);
    check('gia đình thấy câu chuyện', !!ph && ph.cauChuyen === KE.cauChuyen, ph);
    check('nhưng không có tệp kể nào', Array.isArray(ph?.tepKe) && ph.tepKe.length === 0, ph?.tepKe);
    check('máy chủ không chép tệp nào', tepCuaQs(q.id).length === 0);
  }

  // =========================================================================
  console.log('\n[b] kemTep → gia đình nhận đúng { id, loai } của BẢN CHÉP, không gì của lớp 1');
  let B = null;
  {
    const { q, cb } = await ghiVaKe({ ke: { kemTep: true, beTrongAnh: [] } });
    check('công bố kèm tệp → 200', cb.status === 200, cb.data);
    const dong = tepCuaQs(q.id)[0];
    check('có đúng một bản chép, tệp KHÁC tệp lớp 1, nằm trên đĩa',
      tepCuaQs(q.id).length === 1 && dong.file !== q.anh && tepTrenDia(dong.file) && dong.loai === 'anh', dong);
    check('chỉ có bé chính trong ảnh → đã xác nhận', dong?.daXacNhanBe === 1
      && docCsdl('SELECT studentId FROM hanhtrinh_ke_tep_be WHERE tepId = ?', dong?.id).map(x => x.studentId).join() === 's1');
    const hs = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data;
    const ph = (hs?.quanSat || []).find(x => x.id === q.id);
    check('gia đình nhận đúng một tệp, chỉ hai khoá id và loai',
      ph?.tepKe?.length === 1 && Object.keys(ph.tepKe[0]).sort().join() === 'id,loai' && ph.tepKe[0].loai === 'anh', ph?.tepKe);
    check('mã tệp gia đình nhận là mã bản chép, không phải tên tệp', ph?.tepKe?.[0]?.id === dong?.id);
    const goi = JSON.stringify(hs);
    check('gói gia đình KHÔNG chứa tên tệp lớp 1 lẫn tên tệp bản chép', !goi.includes(q.anh) && !goi.includes(dong.file));
    check('và không có mô tả lớp 1', ph && !('moTa' in ph) && !('anh' in ph), ph && Object.keys(ph));
    const co = await muc(GV, q.id);
    check('cô thấy tệp kể kèm bé trong ảnh và trạng thái hiện với gia đình',
      co?.tepKe?.[0]?.hienVoiGiaDinh === true && co.tepKe[0].daXacNhanBe === true
      && (co.tepKe[0].beTrongAnh || []).map(x => x.id).join() === 's1' && co.tepKe[0].beTrongAnh[0].hoTen === 'Nguyễn Bảo An', co?.tepKe);
    check('câu trả lời công bố cũng mang tepKe', cb.data?.tepKe?.[0]?.id === dong?.id, cb.data?.tepKe);
    B = { q, tep: dong };
  }

  // =========================================================================
  console.log('\n[c] GET /api/hanhtrinh/ke-tep/:id — đúng gia đình mới mở được');
  {
    const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — con s3, cùng nhóm c1
    const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm c2
    const u = `/api/hanhtrinh/ke-tep/${B.tep.id}`;
    const ph = await layByte(u, PH);
    check('gia đình của bé → 200, đúng loại ảnh', ph.status === 200 && /image\/png/.test(ph.loai), ph);
    check('gia đình KHÁC cùng nhóm → 403', (await layByte(u, PH2)).status === 403);
    check('chưa đăng nhập → 401/403', [401, 403].includes((await layByte(u, null)).status));
    check('cô đã ghi → 200', (await layByte(u, GV)).status === 200);
    check('cô nhóm khác → 403', (await layByte(u, GV2)).status === 403);
    check('ẢNH GỐC lớp 1 vẫn 403 với gia đình — đường cũ không nới',
      (await layByte(`/api/hanhtrinh/anh/${B.q.anh}`, PH)).status === 403);
    check('mã không có → 404', (await layByte('/api/hanhtrinh/ke-tep/htk_khongco', PH)).status === 404);
    const r = await fetch(`${sv.BASE}${u}`, { headers: { cookie: PH } });
    check('trả kèm Cache-Control riêng tư', /private/.test(r.headers.get('cache-control') || ''), r.headers.get('cache-control'));
  }

  // =========================================================================
  console.log('\n[d] Thu hồi / đổi bé / xoá → bản chép bị gỡ, cả trên đĩa');
  {
    const u = `/api/hanhtrinh/ke-tep/${B.tep.id}`;
    const th = await req('POST', `/api/hanhtrinh/${B.q.id}/thu-hoi`, { cookie: GV, body: {} });
    check('đối chứng — thu hồi được', th.status === 200, th);
    check('ke-tep → 404', (await layByte(u, PH)).status === 404);
    check('tệp chép đã xoá khỏi đĩa', !tepTrenDia(B.tep.file));
    check('dòng bản chép và dòng bé trong ảnh đã gỡ', tepCuaQs(B.q.id).length === 0
      && docCsdl('SELECT 1 FROM hanhtrinh_ke_tep_be WHERE tepId = ?', B.tep.id).length === 0);
    check('tệp lớp 1 còn nguyên', tepTrenDia(B.q.anh));
    const lai = await req('POST', `/api/hanhtrinh/${B.q.id}/cong-bo`, { cookie: GV, body: { kemTep: true, beTrongAnh: [] } });
    const moi = tepCuaQs(B.q.id)[0];
    check('công bố lại kèm tệp → bản chép MỚI', lai.status === 200 && !!moi && moi.id !== B.tep.id && tepTrenDia(moi.file), moi);
    const doi = await req('PUT', `/api/hanhtrinh/${B.q.id}`, { cookie: GV, body: { studentId: 's4' } });
    check('đổi bé → câu chuyện thu lại và bản chép gỡ', doi.status === 200 && doi.data?.daCongBo === false
      && tepCuaQs(B.q.id).length === 0 && !tepTrenDia(moi.file), doi.data);

    const { q } = await ghiVaKe({ ke: { kemTep: true, beTrongAnh: [] } });
    const t = tepCuaQs(q.id)[0];
    const xoa = await req('DELETE', `/api/hanhtrinh/${q.id}`, { cookie: GV });
    check('xoá quan sát → bản chép gỡ cả dòng lẫn tệp', xoa.status === 200 && !!t && tepCuaQs(q.id).length === 0 && !tepTrenDia(t.file), xoa);

    const boKem = await ghiVaKe({ ke: { kemTep: true, beTrongAnh: [] } });
    const t2 = tepCuaQs(boKem.q.id)[0];
    await req('POST', `/api/hanhtrinh/${boKem.q.id}/cong-bo`, { cookie: GV, body: {} });
    check('công bố lại KHÔNG gửi kemTep (app cũ) → giữ nguyên bản chép', tepCuaQs(boKem.q.id)[0]?.id === t2?.id);
    await req('POST', `/api/hanhtrinh/${boKem.q.id}/cong-bo`, { cookie: GV, body: { kemTep: false } });
    check('kemTep: false → gỡ bản chép', tepCuaQs(boKem.q.id).length === 0 && !tepTrenDia(t2.file));
  }

  // =========================================================================
  console.log('\n[e] Ảnh có bé khác: chưa trả lời ≠ đồng ý');
  {
    const thu = async (beKhac) => {
      const { q, cb } = await ghiVaKe({ ke: { kemTep: true, beTrongAnh: [beKhac] } });
      const t = tepCuaQs(q.id)[0];
      return { q, cb, t, ph: await muc(PH, q.id), byte: (await layByte(`/api/hanhtrinh/ke-tep/${t?.id}`, PH)).status, co: await muc(GV, q.id) };
    };
    const tuChoi = await thu('s3');   // gia đình bé Hân từ chối chia sẻ
    check('bé kia TỪ CHỐI → gia đình bé chính không có tepKe', tuChoi.cb.status === 200 && tuChoi.ph?.tepKe?.length === 0, tuChoi.ph?.tepKe);
    check('và byte → 403', tuChoi.byte === 403, tuChoi.byte);
    check('cô thấy ảnh đang ẩn kèm lý do nêu tên bé', tuChoi.co?.tepKe?.[0]?.hienVoiGiaDinh === false
      && /Phạm Gia Hân/.test(tuChoi.co.tepKe[0].lyDo || ''), tuChoi.co?.tepKe);
    const chuaTraLoi = await thu('s6'); // chưa nộp giấy
    check('bé kia CHƯA TRẢ LỜI → vẫn ẩn', chuaTraLoi.ph?.tepKe?.length === 0 && chuaTraLoi.byte === 403, chuaTraLoi.ph?.tepKe);
    const dongY = await thu('s4');
    check('bé kia ĐỒNG Ý → gia đình thấy', dongY.ph?.tepKe?.length === 1 && dongY.byte === 200, dongY.ph?.tepKe);
    check('bé trong ảnh ghi đủ, có cả bé chính', docCsdl('SELECT studentId FROM hanhtrinh_ke_tep_be WHERE tepId = ? ORDER BY studentId', dongY.t.id).map(x => x.studentId).join() === 's1,s4');

    const sua = await req('POST', `/api/hanhtrinh/${tuChoi.q.id}/cong-bo`, { cookie: GV, body: { kemTep: true, beTrongAnh: ['s4'] } });
    check('cô sửa lại bé trong ảnh (bỏ nhầm bé Hân) → hiện', sua.status === 200
      && (await muc(PH, tuChoi.q.id))?.tepKe?.length === 1 && tepCuaQs(tuChoi.q.id)[0]?.id === tuChoi.t.id);

    const GV2 = (await login('giaovien2', '123456')).cookie;
    const ngoai = (await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', anh: ANH } })).data;
    const sai = await req('POST', `/api/hanhtrinh/${ngoai.id}/cong-bo`, { cookie: GV, body: { ...KE, kemTep: true, beTrongAnh: ['s7'] } });
    check('gắn bé nhóm khác cô không phụ trách → 403, không công bố', sai.status === 403 && !(await muc(GV, ngoai.id))?.daCongBo, sai);
    check('đối chứng — cô nhóm c2 vẫn chạy', (await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV2 })).status === 200);
  }

  // =========================================================================
  console.log('\n[f] Cô chưa trả lời "trong ảnh có ai" — nhóm có nhà từ chối thì ẩn');
  {
    const { q, cb } = await ghiVaKe({ ke: { kemTep: true } });
    const co = await muc(GV, q.id);
    check('chưa xác nhận bé (daXacNhanBe=0), nhóm c1 có nhà từ chối → gia đình không thấy',
      cb.status === 200 && tepCuaQs(q.id)[0]?.daXacNhanBe === 0 && (await muc(PH, q.id))?.tepKe?.length === 0, tepCuaQs(q.id));
    check('byte → 403', (await layByte(`/api/hanhtrinh/ke-tep/${tepCuaQs(q.id)[0]?.id}`, PH)).status === 403);
    check('cô thấy lý do: chưa cho biết trong ảnh có ai', co?.tepKe?.[0]?.hienVoiGiaDinh === false && !!co.tepKe[0].lyDo, co?.tepKe);

    // Nhóm c2 chưa nhà nào từ chối → ảnh chưa xác nhận vẫn hiện (như album).
    const GV2 = (await login('giaovien2', '123456')).cookie;
    const c2 = await ghiVaKe({ cookie: GV2, studentId: 's2', ke: { kemTep: true } });
    const ph = await muc(PH, c2.q.id, 's2');
    check('nhóm chưa ai từ chối → gia đình bé s2 thấy', c2.cb.status === 200 && ph?.tepKe?.length === 1, ph?.tepKe);
  }

  // =========================================================================
  console.log('\n[g2] Video: kể kèm video, mở theo đoạn (Range), về album gắn thẻ mọi bé có mặt');
  {
    const al = await req('POST', '/api/albums', { cookie: GV, body: { title: 'Góc làm việc', cheDo: 'theo-the', photos: [{ dataUrl: ANH }] } });
    check('đối chứng — album theo thẻ của nhóm c1', al.status === 201, al.data);
    const { q, cb } = await ghiVaKe({ tep: { video: mp4() }, ke: { kemTep: true, beTrongAnh: ['s4'], albumId: al.data?.id } });
    check('kể kèm video và lưu về album → 200', cb.status === 200 && cb.data?.daVeAlbum?.id === al.data?.id, cb.data);
    const ph = await muc(PH, q.id);
    check('gia đình nhận tệp loại video', ph?.tepKe?.[0]?.loai === 'video', ph?.tepKe);
    const r = await fetch(`${sv.BASE}/api/hanhtrinh/ke-tep/${ph?.tepKe?.[0]?.id}`, { headers: { cookie: PH, Range: 'bytes=0-99' } });
    check('mở theo đoạn → 206, đúng loại video', r.status === 206 && /video\/mp4/.test(r.headers.get('content-type') || ''), r.status);
    const ds = (await req('GET', `/api/albums/${al.data?.id}`, { cookie: GV })).data?.photos || [];
    const v = ds[ds.length - 1] || {};
    check('album có tấm video mới', /\.mp4$/.test(v.file || ''), v);
    check('gắn thẻ bé chính VÀ bé có mặt', (v.beTrongAnh || []).map(x => x.id).sort().join() === 's1,s4', v.beTrongAnh);
  }

  // =========================================================================
  console.log('\n[j] Chương trình và góc khi kể; phần cô không được ghi → 403');
  {
    const { q, cb } = await ghiVaKe({ ke: { nhom: 'chu-nhiem', goc: 'toan' } });
    check('kể kèm Montessori + góc Toán → 200', cb.status === 200, cb.data);
    check('cô và gia đình đều thấy góc', (await muc(GV, q.id))?.goc === 'toan' && (await muc(PH, q.id))?.goc === 'toan');
    await req('POST', `/api/hanhtrinh/${q.id}/thu-hoi`, { cookie: GV, body: {} });
    const ck = ((await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV })).data?.muc || []).find(m => m.id === q.id);
    check('thu hồi rồi, mục quay lại Hình ảnh ghi nhanh còn nguyên chương trình và góc', ck?.nhom === 'chu-nhiem' && ck?.goc === 'toan', ck);
    const ck2 = (await req('GET', '/api/hanhtrinh/cho-ke', { cookie: GV })).data;
    check('cho-ke kèm danh sách góc theo chương trình', (ck2?.gocKeHoach || []).some(g => g.ma === 'toan' && g.chuongTrinh === 'chu-nhiem'), ck2?.gocKeHoach);

    const q2 = (await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', anh: ANH } })).data;
    const saiGoc = await req('POST', `/api/hanhtrinh/${q2.id}/cong-bo`, { cookie: GV, body: { ...KE, nhom: 'chu-nhiem', goc: 'cambridge' } });
    check('góc không thuộc chương trình đã chọn → 400', saiGoc.status === 400, saiGoc);
    const laGoc = await req('POST', `/api/hanhtrinh/${q2.id}/cong-bo`, { cookie: GV, body: { ...KE, goc: 'khong-co' } });
    check('góc lạ → 400', laGoc.status === 400, laGoc);
    const laNhom = await req('POST', `/api/hanhtrinh/${q2.id}/cong-bo`, { cookie: GV, body: { ...KE, nhom: 'khong-co' } });
    check('chương trình lạ → 400', laNhom.status === 400, laNhom);

    const ql = await req('PUT', '/api/admin/classes/c1/teachers', { cookie: VP, body: { teacherIds: ['t1', 't3'], chinhId: 't1', nhom: { t3: 'nuoc-ngoai' } } });
    check('đối chứng — khai cô Bích Ngọc là cô nước ngoài của c1', ql.status === 200, ql);
    const cam = await req('POST', `/api/hanhtrinh/${q2.id}/cong-bo`, { cookie: GV, body: { ...KE, nhom: 'nuoc-ngoai' } });
    check('cô phụ trách nhóm đổi sang phần Cambridge (của cô nước ngoài) → 403', cam.status === 403, cam);
    check('và chưa công bố, chương trình không đổi', !(await muc(GV, q2.id))?.daCongBo && (await muc(GV, q2.id))?.nhomCo !== 'nuoc-ngoai');
    const q3 = (await req('POST', '/api/hanhtrinh', { cookie: GV3, body: { studentId: 's1', moTa: 'Bé hát Hello song' } })).data;
    const nn = await req('POST', `/api/hanhtrinh/${q3.id}/cong-bo`, { cookie: GV3, body: { ...KE, nhom: 'nuoc-ngoai', goc: 'cambridge' } });
    check('cô nước ngoài kể vào phần Cambridge → 200', nn.status === 200 && (await muc(PH, q3.id))?.nhomCo === 'nuoc-ngoai', nn.data);
  }

  // =========================================================================
  console.log('\n[k] Bé gia đình đã dừng hồ sơ học tập — ghi video và kể đều bị chặn');
  {
    const r = await req('POST', '/api/hanhtrinh', { cookie: VP, body: { studentId: 's9', video: mp4() } });
    check('ghi video cho bé s9 → 403', r.status === 403, r);
    const q = (await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's5', anh: ANH } })).data;
    const dung = await req('PUT', '/api/admin/students/s5/dong-y', { cookie: VP, body: { hoSoHocTap: false } });
    check('đối chứng — văn phòng ghi gia đình bé s5 dừng hồ sơ', dung.status === 200, dung);
    const cb = await req('POST', `/api/hanhtrinh/${q?.id}/cong-bo`, { cookie: GV, body: { ...KE, kemTep: true, beTrongAnh: [] } });
    check('kể kèm tệp cho bé đã dừng hồ sơ → 403, không chép tệp', cb.status === 403 && tepCuaQs(q?.id).length === 0, cb);
  }

  // =========================================================================
  console.log('\n[z] Mã nguồn: đường ảnh lớp 1 không đổi, chỉ đúng các đường sendFile đã biết');
  {
    const ma = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/routes.js'), 'utf8');
    const dsDuong = [...ma.matchAll(/app\.get\('([^']+)'/g)].map(m => m[1]);
    const coSend = dsDuong.filter(d => {
      const i = ma.indexOf(`app.get('${d}'`);
      const j = ma.indexOf('app.', i + 5);
      return ma.slice(i, j < 0 ? ma.length : j).includes('res.sendFile');
    });
    check('sendFile chỉ ở /anh/:file và /ke-tep/:id', coSend.sort().join() === '/api/hanhtrinh/anh/:file,/api/hanhtrinh/ke-tep/:id', coSend);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
