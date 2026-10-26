// Bài canh VĂN PHÒNG LƯU ẢNH CÂU CHUYỆN ĐÃ KỂ VÀO ALBUM (góp ý 20/10, B6 —
// chủ dự án chọn phương án a ngày 26/10).
//
// Chạy bằng:  node test/phan-hoi-2010-album-tu-cau-chuyen.test.mjs
//
// Văn phòng cơ sở bị chặn cả vùng /api/hanhtrinh — họ không được đọc ghi chép
// của cô (lớp 1: mô tả, ảnh gốc, nháp; lớp 2: nhận định). Nhưng trường muốn họ
// gom được ảnh câu chuyện ĐÃ KỂ cho gia đình vào album. Nên đường mới nằm ở
// màn Album, chỉ đọc BẢN CHÉP LỚP 3 (`hanhtrinh_ke_tep`) của câu chuyện đã công
// bố, và gói trả về không có một chữ nào của lớp 1 hay lớp 2.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';
import path from 'path';
import { createRequire } from 'module';

const Database = createRequire(import.meta.url)('better-sqlite3');

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-album-tu-cau-chuyen');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'album']);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng', 'tc_ht');
datChucVu(DIR, 'tc_ht', 'hieu-truong');
const mkVP1 = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 1', 'tc_vp1');
khoaVaoCoSo(DIR, 'tc_vp1', 'cs1');
datChucVu(DIR, 'tc_vp1', 'vanphong-coso');
const mkVP2 = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 2', 'tc_vp2');
khoaVaoCoSo(DIR, 'tc_vp2', 'cs2');
datChucVu(DIR, 'tc_vp2', 'vanphong-coso');
const mkMK = taoQuanTri(DIR, 'Marketing', 'tc_mk');
datChucVu(DIR, 'tc_mk', 'marketing');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7261), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function mp4(soByte = 4096) {
  const b = Buffer.alloc(soByte);
  b.writeUInt32BE(soByte, 0);
  b.write('ftypisom', 4, 'ascii');
  return `data:video/mp4;base64,${b.toString('base64')}`;
}
// Tên tệp bản chép không bao giờ ra JSON, nên đọc thẳng cơ sở dữ liệu tạm.
const docCsdl = (sql, ...thamSo) => {
  const c = new Database(path.join(DIR, 'school.db'), { readonly: true, fileMustExist: true });
  try { return c.prepare(sql).all(...thamSo); } finally { c.close(); }
};
const tepCua = (qsId) => docCsdl('SELECT id, file FROM hanhtrinh_ke_tep WHERE quanSatId = ?', qsId)[0] || null;
const layByte = async (duong, cookie) => {
  const r = await fetch(`${sv.BASE}${duong}`, { headers: cookie ? { cookie } : {} });
  return { status: r.status, loai: r.headers.get('content-type') || '' };
};

async function vao(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Chỉ những khoá này được ra khỏi máy chủ cho một mục.
const KHOA_DUOC = new Set(['id', 'loai', 'studentId', 'hoTen', 'cauChuyen', 'keLuc', 'tepUrl', 'daCo', 'lyDo']);

try {
  const HT = await vao('tc_ht', mkHT);
  const VP1 = await vao('tc_vp1', mkVP1);
  const VP2 = await vao('tc_vp2', mkVP2);
  const MK = await vao('tc_mk', mkMK);
  const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô nhóm Chồi 2 (c1, cơ sở 1)
  const GV2 = (await login('giaovien2', '123456')).cookie;  // t2 — cô nhóm Lá 1 (c2), không dạy c1
  const PH1 = (await login('phuhuynh', '123456')).cookie;   // p1 — mẹ bé s1 (đồng ý chia sẻ)
  const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — bố bé s3 (TỪ CHỐI chia sẻ)
  const PH4 = (await login('ph.lan', '123456')).cookie;     // p4 — mẹ bé s5

  const al = await req('POST', '/api/albums', {
    cookie: GV, body: { title: 'Góc làm việc từng bé', cheDo: 'theo-the', photos: [{ dataUrl: ANH }] },
  });
  const alCK = await req('POST', '/api/albums', {
    cookie: GV, body: { title: 'Cả nhóm đi dạo', photos: [{ dataUrl: ANH }] },
  });
  check('đối chứng — cô nhóm c1 tạo được album theo thẻ và album cả nhóm',
    al.status === 201 && alCK.status === 201, [al.data, alCK.data]);
  const AL = al.data?.id;
  const ALCK = alCK.data?.id;
  const anhAlbum = async (cookie) => (await req('GET', `/api/albums/${AL}`, { cookie })).data?.photos || [];

  // Mỗi tình huống một quan sát của bé s1. Mô tả (lớp 1) có dấu riêng để soi rò.
  const ghi = async (moTa, tep) => {
    const r = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa, ...tep } });
    if (r.status !== 201) throw new Error(`Không ghi được quan sát: ${JSON.stringify(r.data)}`);
    return r.data;
  };
  const ke = async (id, cauChuyen, them) => {
    const r = await req('POST', `/api/hanhtrinh/${id}/cong-bo`, {
      cookie: GV, body: { cauChuyen, cungConONha: 'Tối nay cùng con rót nước.', ...them },
    });
    if (r.status !== 200) throw new Error(`Không kể được: ${JSON.stringify(r.data)}`);
    return r.data;
  };

  const Q1 = await ghi('MOTA-LOP1-MOT bé xếp tháp hồng', { anh: ANH });
  await ke(Q1.id, 'KE-MOT An xếp tháp hồng từ lớn tới nhỏ.', { kemTep: true, beTrongAnh: [] });
  const Q2 = await ghi('MOTA-LOP1-HAI bé rót nước cùng bạn', { video: mp4() });
  await ke(Q2.id, 'KE-HAI An rót nước cùng Hân.', { kemTep: true, beTrongAnh: ['s3'] });
  const Q3 = await ghi('MOTA-LOP1-BA kể không kèm ảnh', { anh: ANH });
  await ke(Q3.id, 'KE-BA An tưới cây.', {});
  const Q4 = await ghi('MOTA-LOP1-BON sẽ thu hồi', { anh: ANH });
  await ke(Q4.id, 'KE-BON An gấp khăn.', { kemTep: true, beTrongAnh: [] });
  const tepQ4 = tepCua(Q4.id);
  const thuHoi = await req('POST', `/api/hanhtrinh/${Q4.id}/thu-hoi`, { cookie: GV });
  check('đối chứng — cô thu hồi được câu chuyện Q4', thuHoi.status === 200, thuHoi.data);
  const Q5 = await ghi('MOTA-LOP1-NAM chưa kể', { anh: ANH });
  // Gửi kèm mà KHÔNG trả lời "trong ảnh có bé nào" — nhóm c1 có nhà từ chối (s3).
  const Q6 = await ghi('MOTA-LOP1-SAU chưa xác nhận bé', { anh: ANH });
  await ke(Q6.id, 'KE-SAU An cắt chuối.', { kemTep: true });

  const t1 = tepCua(Q1.id);
  const t2 = tepCua(Q2.id);
  const t6 = tepCua(Q6.id);
  check('đối chứng — Q1, Q2, Q6 có bản chép lớp 3; Q3, Q5 không có; Q4 đã gỡ khi thu hồi',
    t1 && t2 && t6 && !tepCua(Q3.id) && !tepCua(Q5.id) && tepQ4 && !tepCua(Q4.id));

  const dsCua = (cookie, albumId = AL) => req('GET', `/api/albums/${albumId}/tu-cau-chuyen`, { cookie });
  const them = (cookie, tepId, albumId = AL) =>
    req('POST', `/api/albums/${albumId}/tu-cau-chuyen`, { cookie, body: { tepId } });

  // =========================================================================
  console.log('\n[1] Văn phòng cơ sở 1 liệt kê được ảnh câu chuyện đã kể của nhóm c1');
  let muc = [];
  {
    const ct = await req('GET', `/api/albums/${AL}`, { cookie: VP1 });
    check('màn album báo văn phòng được thêm từ câu chuyện', ct.status === 200 && ct.data?.themTuCauChuyen === true, ct.data?.themTuCauChuyen);
    const r = await dsCua(VP1);
    check('liệt kê → 200', r.status === 200, r);
    muc = r.data?.muc || [];
    const ids = muc.map(m => m.id);
    check('có Q1 (ảnh) và Q2 (video)', ids.includes(t1.id) && ids.includes(t2.id), ids);
    const m1 = muc.find(m => m.id === t1.id) || {};
    const m2 = muc.find(m => m.id === t2.id) || {};
    check('mục kèm tên bé và chú thích câu chuyện (lớp 3)',
      m1.hoTen === 'Nguyễn Bảo An' && m1.cauChuyen === 'KE-MOT An xếp tháp hồng từ lớn tới nhỏ.', m1);
    check('mục nói đúng loại tệp', m1.loai === 'anh' && m2.loai === 'video', [m1.loai, m2.loai]);
    check('Q3 (kể không kèm ảnh) không có trong danh sách', !JSON.stringify(r.data).includes('KE-BA'));
    check('Q4 (đã thu hồi) không có trong danh sách',
      !ids.includes(tepQ4.id) && !JSON.stringify(r.data).includes('KE-BON'));
    check('Q5 (chưa kể) không có trong danh sách', !JSON.stringify(r.data).includes('MOTA-LOP1-NAM'));
    const s = JSON.stringify(r.data);
    check('gói trả về KHÔNG có mô tả lớp 1 nào', !/MOTA-LOP1/.test(s));
    check('gói trả về KHÔNG có tên tệp gốc lớp 1 nào',
      ![Q1, Q2, Q3, Q5, Q6].some(q => q.anh && s.includes(q.anh)));
    check('gói trả về KHÔNG có tên tệp của bản chép', ![t1, t2, t6].some(t => s.includes(t.file)));
    const khoaLa = [...new Set(muc.flatMap(m => Object.keys(m)))].filter(k => !KHOA_DUOC.has(k));
    check('mỗi mục chỉ có đúng các khoá lớp 3 được phép (không moTa, anh, nhận định)', !khoaLa.length, khoaLa);
    const m6 = muc.find(m => m.id === t6.id) || {};
    check('Q6 (cô chưa cho biết bé trong ảnh, nhóm có nhà từ chối) hiện kèm lý do chưa thêm được',
      !!m6.lyDo, m6);

    const b1 = await layByte(m1.tepUrl, VP1);
    check('văn phòng xem được ảnh của mục, đúng loại tệp', b1.status === 200 && /image\/png/.test(b1.loai), b1);
    const b2 = await layByte(m2.tepUrl, VP1);
    check('văn phòng xem được video của mục', b2.status === 200 && /video\/mp4/.test(b2.loai), b2);
  }

  // =========================================================================
  console.log('\n[2] Đối chứng: văn phòng VẪN bị chặn ở Hành trình');
  {
    const ht = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: VP1 });
    check('GET /api/hanhtrinh → 403', ht.status === 403, ht.status);
    const kt = await layByte(`/api/hanhtrinh/ke-tep/${t1.id}`, VP1);
    check('GET /api/hanhtrinh/ke-tep/:id → 403', kt.status === 403, kt);
    const goc = await layByte(`/api/hanhtrinh/anh/${Q1.anh}`, VP1);
    check('ảnh gốc lớp 1 → 403', goc.status === 403, goc);
  }

  // =========================================================================
  console.log('\n[3] Văn phòng thêm ảnh câu chuyện vào album; thêm trùng thì báo');
  let anhMot = null;
  let anhHai = null;
  {
    const truoc = (await anhAlbum(GV)).length;
    const r = await them(VP1, t1.id);
    check('thêm Q1 → 201', r.status === 201 && r.data?.added === 1, r);
    const ds = await anhAlbum(GV);
    check('album có thêm đúng một tấm', ds.length === truoc + 1, { truoc, sau: ds.length });
    anhMot = ds.find(p => p.id === r.data?.photoId) || {};
    check('tấm mới là bản chép riêng (khác tệp lớp 1 và tệp lớp 3)',
      !!anhMot.file && anhMot.file !== Q1.anh && anhMot.file !== t1.file, anhMot.file);
    check('chú thích là câu chuyện đã kể', anhMot.caption === 'KE-MOT An xếp tháp hồng từ lớn tới nhỏ.', anhMot.caption);
    check('gắn thẻ đúng bé s1', (anhMot.beTrongAnh || []).map(b => b.id).join() === 's1', anhMot.beTrongAnh);

    const lai = await them(VP1, t1.id);
    check('thêm lại Q1 → 409, báo đã có', lai.status === 409 && /đã có/i.test(lai.data?.error || ''), lai);
    check('không thêm trùng', (await anhAlbum(GV)).length === truoc + 1);
    const ds2 = (await dsCua(VP1)).data?.muc || [];
    check('danh sách đánh dấu Q1 đã có trong album', (ds2.find(m => m.id === t1.id) || {}).daCo === true);

    // Cô kể lại Q1 và chọn album này — không được chép đôi.
    await ke(Q1.id, 'KE-MOT An xếp tháp hồng từ lớn tới nhỏ.', { albumId: AL });
    check('cô kể lại kèm album → album vẫn không có tấm đôi', (await anhAlbum(GV)).length === truoc + 1);

    const v = await them(VP1, t2.id);
    check('thêm Q2 (video) → 201', v.status === 201, v);
    anhHai = (await anhAlbum(GV)).find(p => p.id === v.data?.photoId) || {};
    check('tấm mới là video', /\.mp4$/.test(anhHai.file || ''), anhHai.file);
    check('gắn thẻ bé chính và mọi bé có mặt (s1, s3)',
      (anhHai.beTrongAnh || []).map(b => b.id).sort().join() === 's1,s3', anhHai.beTrongAnh);

    const sau = (await anhAlbum(GV)).length;
    const k6 = await them(VP1, t6.id);
    check('Q6 chưa xác nhận bé trong ảnh → 400', k6.status === 400, k6);
    const k4 = await them(VP1, tepQ4.id);
    check('bản chép của câu chuyện đã thu hồi → 404', k4.status === 404, k4);
    const kx = await them(VP1, 'htk_khong_co');
    check('mã lạ → 404', kx.status === 404, kx);
    check('không lượt hỏng nào thêm ảnh', (await anhAlbum(GV)).length === sau);
  }

  // =========================================================================
  console.log('\n[4] Luật ảnh nhóm giữ nguyên ở tầng dữ liệu album');
  {
    const p1 = (await anhAlbum(PH1)).map(p => p.id);
    check('mẹ bé s1 thấy tấm Q1 (chỉ có con mình)', p1.includes(anhMot.id), p1);
    check('mẹ bé s1 KHÔNG thấy tấm Q2 — bé s3 trong ảnh chưa đồng ý chia sẻ', !p1.includes(anhHai.id), p1);
    const b = await layByte(`/api/albums/${AL}/photo/${anhHai.id}`, PH1);
    check('mẹ bé s1 tải thẳng byte tấm Q2 → 403', b.status === 403, b);
    const p2 = (await anhAlbum(PH2)).map(p => p.id);
    check('bố bé s3 thấy tấm Q2 (có con mình, bé s1 đã đồng ý)', p2.includes(anhHai.id), p2);
    check('bố bé s3 không thấy tấm Q1 (album theo thẻ)', !p2.includes(anhMot.id), p2);
    // Câu chuyện Q2 là lớp 3 của riêng bé s1 — nhà bé s3 thấy tấm ảnh nhưng
    // KHÔNG được đọc chữ cô kể cho nhà bé s1 (reviewer Đ242, lỗi chặn).
    const tamHaiCuaPH2 = (await anhAlbum(PH2)).find(p => p.id === anhHai.id) || {};
    check('bố bé s3 KHÔNG đọc được câu chuyện của bé s1 trong chú thích',
      !JSON.stringify(tamHaiCuaPH2).includes('KE-HAI'), tamHaiCuaPH2.caption);
    const p4 = (await anhAlbum(PH4)).map(p => p.id);
    check('nhà bé s5 (không có trong ảnh) không thấy tấm nào', !p4.includes(anhMot.id) && !p4.includes(anhHai.id), p4);
  }

  // =========================================================================
  console.log('\n[5] Người ngoài phạm vi bị từ chối');
  {
    const truoc = (await anhAlbum(GV)).length;
    const ds2 = await dsCua(VP2);
    check('văn phòng cơ sở 2 liệt kê → 403', ds2.status === 403, ds2);
    const th2 = await them(VP2, t6.id);
    check('văn phòng cơ sở 2 thêm → 403', th2.status === 403, th2);
    const b2 = await layByte(muc.find(m => m.id === t1.id).tepUrl, VP2);
    check('văn phòng cơ sở 2 xem ảnh của mục → 403', b2.status === 403, b2);
    const gv2 = await dsCua(GV2);
    check('cô nhóm khác → 403', gv2.status === 403, gv2);
    const ph = await dsCua(PH1);
    check('phụ huynh → 403', ph.status === 403, ph);
    const phB = await layByte(muc.find(m => m.id === t1.id).tepUrl, PH1);
    check('phụ huynh xem ảnh qua đường mới → 403', phB.status === 403, phB);
    const mk = await them(MK, t1.id);
    check('Marketing (chỉ xem ảnh) thêm → 403', mk.status === 403, mk);
    check('album không đổi', (await anhAlbum(GV)).length === truoc);
    const gv = await dsCua(GV);
    check('đối chứng — cô nhóm c1 liệt kê được', gv.status === 200 && (gv.data?.muc || []).length >= 2, gv.status);
  }

  // =========================================================================
  console.log('\n[6] Album cả nhóm xem được thì không nhận câu chuyện riêng của một bé');
  {
    const ct = await req('GET', `/api/albums/${ALCK}`, { cookie: VP1 });
    check('màn album cả nhóm không mời thêm từ câu chuyện', ct.status === 200 && ct.data?.themTuCauChuyen === false, ct.data?.themTuCauChuyen);
    const ds = await dsCua(VP1, ALCK);
    check('liệt kê → 400', ds.status === 400, ds);
    const th = await them(VP1, t1.id, ALCK);
    check('thêm → 400', th.status === 400, th);
  }

  // =========================================================================
  console.log('\n[7] Tắt phân hệ Hành trình → danh sách rỗng, không lỗi');
  {
    const tat = await req('PUT', '/api/admin/modules/hanhtrinh', { cookie: HT, body: { enabled: false } });
    check('đối chứng — hiệu trưởng tắt được Hành trình', tat.status === 200, tat);
    const ds = await dsCua(VP1);
    check('liệt kê → 200, danh sách rỗng', ds.status === 200 && Array.isArray(ds.data?.muc) && !ds.data.muc.length, ds);
    const th = await them(VP1, t6.id);
    check('thêm → 400 nói rõ phân hệ đang tắt', th.status === 400 && /Hành trình/.test(th.data?.error || ''), th);
    const b = await layByte(muc.find(m => m.id === t1.id).tepUrl, VP1);
    check('ảnh của mục → 404', b.status === 404, b);
    const ct = await req('GET', `/api/albums/${AL}`, { cookie: VP1 });
    check('album vẫn mở được, ảnh đã thêm vẫn còn, không mời thêm từ câu chuyện',
      ct.status === 200 && ct.data.photos.some(p => p.id === anhMot.id) && ct.data.themTuCauChuyen === false, ct.status);
  }

  // =========================================================================
  console.log('\n[8] Bảng bản chép chưa có (cài phân hệ từ bản cũ) → danh sách rỗng, không lỗi');
  {
    await req('PUT', '/api/admin/modules/hanhtrinh', { cookie: HT, body: { enabled: true } });
    // CHỈ trên cơ sở dữ liệu TẠM của bài này — dựng lại trạng thái một trường
    // đang chạy bản Hành trình chưa có bảng bản chép.
    const c = new Database(path.join(DIR, 'school.db'));
    try { c.exec('DROP TABLE hanhtrinh_ke_tep_be; DROP TABLE hanhtrinh_ke_tep;'); } finally { c.close(); }
    const ds = await dsCua(VP1);
    check('liệt kê → 200, danh sách rỗng', ds.status === 200 && Array.isArray(ds.data?.muc) && !ds.data.muc.length, ds);
    const ct = await req('GET', `/api/albums/${AL}`, { cookie: VP1 });
    check('album vẫn mở được', ct.status === 200 && ct.data.photos.length > 0, ct.status);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
