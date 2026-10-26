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
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe,
} from './_chung.mjs';
import crypto from 'crypto';

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

  // =========================================================================
  console.log('\n[k] Bé gia đình đã dừng hồ sơ học tập — ghi video cũng bị chặn');
  {
    const r = await req('POST', '/api/hanhtrinh', { cookie: VP, body: { studentId: 's9', video: mp4() } });
    check('ghi video cho bé s9 → 403', r.status === 403, r);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
