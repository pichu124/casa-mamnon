// Bài canh LƯU ẢNH CÂU CHUYỆN VỀ ALBUM — ai làm được (phản hồi 20/10, mục B6).
//
// Chạy bằng:  node test/phan-hoi-2010-anh-ve-album.test.mjs
//
// Trước đây chỉ cô phụ trách nhóm của album lưu được ảnh của câu chuyện
// Hành trình về album. Nhà trường muốn ban giám hiệu và văn phòng / quản lý cơ
// sở cũng làm được — nhưng ĐÚNG phạm vi: ban giám hiệu toàn trường, quản trị
// khoá vào một cơ sở thì chỉ nhóm thuộc cơ sở mình. Cô nhóm khác và phụ huynh
// vẫn bị từ chối, và luật ảnh album theo thẻ giữ nguyên ở tầng dữ liệu.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-anh-ve-album');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'album']);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng', 'av_ht');
datChucVu(DIR, 'av_ht', 'hieu-truong');
const mkCS1 = taoQuanTri(DIR, 'Quản Lý Cơ Sở 1', 'av_cs1');
khoaVaoCoSo(DIR, 'av_cs1', 'cs1');
datChucVu(DIR, 'av_cs1', 'quanly-coso');
const mkCS2 = taoQuanTri(DIR, 'Quản Lý Cơ Sở 2', 'av_cs2');
khoaVaoCoSo(DIR, 'av_cs2', 'cs2');
datChucVu(DIR, 'av_cs2', 'quanly-coso');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5241), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function vao(u, mk) {
  const d = await login(u, mk);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const HT = await vao('av_ht', mkHT);
  const CS1 = await vao('av_cs1', mkCS1);
  const CS2 = await vao('av_cs2', mkCS2);
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm Chồi 2 (c1, cơ sở 1)
  const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm Lá 1 (c2) — không dạy c1
  const PH1 = (await login('phuhuynh', '123456')).cookie;   // p1 — con s1 ở c1
  const PH2 = (await login('phuhuynh2', '123456')).cookie;  // p2 — con s3 ở c1

  const al = await req('POST', '/api/albums', {
    cookie: GV, body: { title: 'Góc làm việc của từng bé', cheDo: 'theo-the', photos: [{ dataUrl: ANH }] },
  });
  check('đối chứng — cô nhóm c1 tạo được album theo thẻ', al.status === 201 && al.data?.cheDo === 'theo-the', al.data);
  const AL = al.data?.id;
  const soAnh = async () => ((await req('GET', `/api/albums/${AL}`, { cookie: GV })).data?.photos || []).length;

  // Mỗi tình huống một quan sát có ảnh của bé s1, do cô nhóm c1 ghi.
  const ghi = async (moTa) => {
    const r = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa, anh: ANH } });
    if (r.status !== 201) throw new Error(`Không ghi được quan sát: ${JSON.stringify(r.data)}`);
    return r.data.id;
  };
  const congBo = (cookie, id) => req('POST', `/api/hanhtrinh/${id}/cong-bo`, {
    cookie, body: { cauChuyen: 'Hôm nay An tự rót nước vào ly.', cungConONha: 'Tối nay để con tự rót nước.', albumId: AL },
  });
  const daCongBo = async (id) => {
    const ht = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data || {};
    const q = (ht.quanSat || []).find(x => x.id === id);
    return !!(q && q.daCongBo);
  };

  // =========================================================================
  console.log('\n[1] Ban giám hiệu (toàn trường) lưu ảnh về album của nhóm c1');
  {
    const Q = await ghi('Bé xếp tháp hồng từ lớn tới nhỏ.');
    const truoc = await soAnh();
    const r = await congBo(HT, Q);
    check('được — câu chuyện công bố kèm album', r.status === 200 && r.data?.daCongBo === true, r.data);
    check('câu trả lời cho biết ảnh đã về đúng album', r.data?.daVeAlbum?.id === AL, r.data?.daVeAlbum);
    const ds = (await req('GET', `/api/albums/${AL}`, { cookie: GV })).data?.photos || [];
    check('album có thêm đúng một tấm', ds.length === truoc + 1, { truoc, sau: ds.length });
    const moi = ds[ds.length - 1] || {};
    check('tấm mới gắn thẻ ĐÚNG bé s1, không bé nào khác',
      (moi.beTrongAnh || []).length === 1 && moi.beTrongAnh[0].id === 's1', moi.beTrongAnh);
    check('gia đình bé s1 thấy tấm mới',
      ((await req('GET', `/api/albums/${AL}`, { cookie: PH1 })).data?.photos || []).some(p => p.id === moi.id));
    check('gia đình bé khác cùng nhóm KHÔNG thấy tấm đó (album theo thẻ, lọc ở máy chủ)',
      !((await req('GET', `/api/albums/${AL}`, { cookie: PH2 })).data?.photos || []).some(p => p.id === moi.id));
  }

  // =========================================================================
  console.log('\n[2] Quản lý cơ sở 1 (đúng cơ sở của nhóm c1) lưu được');
  {
    const Q = await ghi('Bé tự mặc áo khoác, cài được hai cúc.');
    const truoc = await soAnh();
    const r = await congBo(CS1, Q);
    check('được', r.status === 200 && r.data?.daVeAlbum?.id === AL, r.data);
    check('album có thêm đúng một tấm', (await soAnh()) === truoc + 1);
  }

  // =========================================================================
  console.log('\n[3] Người KHÔNG có quyền với nhóm của album vẫn bị từ chối, và không có gì đổi');
  {
    const Q = await ghi('Bé tưới cây ở góc thiên nhiên.');
    const truoc = await soAnh();

    const cs2 = await congBo(CS2, Q);
    check('quản lý cơ sở 2 → 403', cs2.status === 403, cs2);
    const gv2 = await congBo(GV2, Q);
    check('cô nhóm khác → 403', gv2.status === 403, gv2);
    const ph = await congBo(PH1, Q);
    check('phụ huynh (kể cả nhà của chính bé) → 403', ph.status === 403, ph);
    check('không lượt nào làm câu chuyện bị công bố', !(await daCongBo(Q)));
    check('album không thêm tấm nào', (await soAnh()) === truoc, { truoc, sau: await soAnh() });

    // Cô nhóm c1 chọn album của nhóm khác — chốt album ở máy chủ vẫn đứng.
    const alKhac = await req('POST', '/api/albums', {
      cookie: GV2, body: { title: 'Lá 1 theo thẻ', cheDo: 'theo-the', photos: [{ dataUrl: ANH }] },
    });
    check('đối chứng — album theo thẻ của nhóm c2', alKhac.status === 201, alKhac.data);
    const saiNhom = await req('POST', `/api/hanhtrinh/${Q}/cong-bo`, {
      cookie: GV, body: { cauChuyen: 'Hôm nay An tưới cây.', cungConONha: 'Cùng con tưới cây ở nhà.', albumId: alKhac.data?.id },
    });
    check('cô nhóm c1 lưu vào album của nhóm c2 (cô không phụ trách) → 403', saiNhom.status === 403, saiNhom);
    const qtSaiNhom = await req('POST', `/api/hanhtrinh/${Q}/cong-bo`, {
      cookie: CS1, body: { cauChuyen: 'Hôm nay An tưới cây.', cungConONha: 'Cùng con tưới cây ở nhà.', albumId: alKhac.data?.id },
    });
    check('quản trị lưu ảnh của bé nhóm c1 vào album nhóm c2 → vẫn từ chối (album khác nhóm của bé)',
      qtSaiNhom.status === 400, qtSaiNhom);
    check('và vẫn chưa công bố', !(await daCongBo(Q)));
  }

  // =========================================================================
  console.log('\n[4] Cô phụ trách nhóm vẫn lưu được như cũ');
  {
    const Q = await ghi('Bé rót nước từ bình sang cốc.');
    const r = await congBo(GV, Q);
    check('được', r.status === 200 && r.data?.daVeAlbum?.id === AL, r.data);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
