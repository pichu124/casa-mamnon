// Bài canh các lỗi album của đợt kiểm thử thay trường R4 (Đ261c).
//
// Chạy bằng:  node test/kiem-thu-r4-album.test.mjs
//
//   [1] B4 — gắn thẻ bé vào ảnh có bé khác đã rút đồng ý: nhà không thấy tấm
//       ấy thì cũng không được nhận tin "Có ảnh mới của …".
//   [2] B2 — bé được cho nghỉ: gia đình vẫn xem album của giai đoạn con đã
//       học, ở mục "Album của các năm học trước" (dòng 8.13).
//   [3] B2 — nhận lại rồi nghỉ lần nữa: xem được CẢ HAI giai đoạn, nhưng
//       không xem được album đăng trong thời gian con vắng.
//   [4] B2 — hồ sơ cũ không có khoảng học nào: lưới an toàn từ ngày bắt đầu
//       dựng lại tới ngày nghỉ.
//   [5] B6 — đếm video riêng với ảnh trong danh sách album.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('kiem-thu-r4-album');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng R', 'r_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7110), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
const sql = (cau, ...tham) => {
  const c = new Database(path.join(DIR, 'school.db'));
  try {
    const st = c.prepare(cau);
    return st.reader ? st.all(...tham) : st.run(...tham);
  } finally { c.close(); }
};
const ngayLui = (n) => {
  const d = new Date(`${HOM_NAY()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

try {
  const d0 = await login('r_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('r_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;     // cô nhóm c1 (Chồi 2)
  const GV2 = (await login('giaovien2', '123456')).cookie;   // cô nhóm c2 (Lá 1)
  const PH1 = (await login('phuhuynh', '123456')).cookie;    // p1 — mẹ bé An (s1, đồng ý chia sẻ)
  const PH2 = (await login('phuhuynh2', '123456')).cookie;   // p2 — bố bé Gia Hân (s3, đã rút đồng ý)
  const PH6 = (await login('ph.huong', '123456')).cookie;    // p6 — mẹ bé Minh Thư (s7, nhóm c2)
  const PH8 = (await login('ph.duy', '123456')).cookie;      // p8 — bố bé Bảo Ngọc (s10, nhóm c4)

  const tinAlbumCua = async (cookie, tenBe) => ((await req('GET', '/api/notifications/rieng-be', { cookie })).data || [])
    .filter(n => n.loai === 'album' && (n.title || '').includes(`Có ảnh mới của ${tenBe}`));

  // =========================================================================
  console.log('\n[1] B4 — KHÔNG BÁO "CÓ ẢNH MỚI" CHO TẤM NHÀ ẤY KHÔNG THẤY ĐƯỢC');
  {
    const tao = await req('POST', '/api/albums', {
      cookie: GV, body: { title: 'Chơi cát buổi sáng', photos: [{ emoji: '🏖️' }, { emoji: '🪣' }] },
    });
    check('cô lập được album có hai tấm', tao.status === 201, tao.status);
    const al = tao.data?.id;
    const anh = (await req('GET', `/api/albums/${al}`, { cookie: GV })).data?.photos || [];
    check('đối chứng — album có đủ hai tấm', anh.length === 2, anh.length);

    // Tấm 1 có bé An và bé Gia Hân (gia đình bé Hân đã rút đồng ý).
    const gan = await req('PUT', `/api/albums/${al}/photos/${anh[0].id}/be`, {
      cookie: GV, body: { studentIds: ['s1', 's3'] },
    });
    check('cô gắn được thẻ bé An và bé Gia Hân', gan.status === 200, gan.status);
    const xemPH1 = ((await req('GET', `/api/albums/${al}`, { cookie: PH1 })).data?.photos || []).map(p => p.id);
    check('đối chứng — nhà bé An KHÔNG thấy tấm có bé Gia Hân', !xemPH1.includes(anh[0].id), xemPH1);
    check('NHÀ KHÔNG THẤY TẤM ẢNH THÌ KHÔNG NHẬN TIN "Có ảnh mới của Nguyễn Bảo An"',
      (await tinAlbumCua(PH1, 'Nguyễn Bảo An')).length === 0, await tinAlbumCua(PH1, 'Nguyễn Bảo An'));
    const xemPH2 = ((await req('GET', `/api/albums/${al}`, { cookie: PH2 })).data?.photos || []).map(p => p.id);
    check('nhà bé Gia Hân thấy tấm ấy (con mình + bé An đã đồng ý)', xemPH2.includes(anh[0].id), xemPH2);
    check('nên nhà bé Gia Hân VẪN nhận tin báo',
      (await tinAlbumCua(PH2, 'Phạm Gia Hân')).length === 1, await tinAlbumCua(PH2, 'Phạm Gia Hân'));

    // Đối chứng: tấm 2 chỉ có bé An — nhà bé An thấy, nên được báo.
    await req('PUT', `/api/albums/${al}/photos/${anh[1].id}/be`, { cookie: GV, body: { studentIds: ['s1'] } });
    check('tấm chỉ có bé An thì nhà bé An nhận tin như cũ',
      (await tinAlbumCua(PH1, 'Nguyễn Bảo An')).length === 1, await tinAlbumCua(PH1, 'Nguyễn Bảo An'));

    // Đường gắn thẻ NHIỀU ẢNH một lượt đi cùng luật.
    const tao2 = await req('POST', '/api/albums', {
      cookie: GV, body: { title: 'Đi dạo vườn rau', photos: [{ emoji: '🥬' }, { emoji: '🌽' }] },
    });
    const al2 = tao2.data?.id;
    const anh2 = (await req('GET', `/api/albums/${al2}`, { cookie: GV })).data?.photos || [];
    sql('DELETE FROM thongbao_be WHERE studentId = ?', 's1');
    const nhieu = await req('PUT', `/api/albums/${al2}/gan-the-nhieu-anh`, {
      cookie: GV, body: { photoIds: anh2.map(p => p.id), studentIds: ['s1', 's3'] },
    });
    check('cô gắn được hai bé vào nhiều ảnh một lượt', nhieu.status === 200, nhieu.status);
    check('GẮN NHIỀU ẢNH: nhà bé An không thấy tấm nào nên không nhận tin',
      (await tinAlbumCua(PH1, 'Nguyễn Bảo An')).length === 0, await tinAlbumCua(PH1, 'Nguyễn Bảo An'));

    // Album "Chỉ những nhà cô chọn" mà nhà không được chọn: cũng không báo.
    const tao3 = await req('POST', '/api/albums', {
      cookie: GV, body: { title: 'Ảnh riêng vài nhà', photos: [{ emoji: '🎨' }] },
    });
    const al3 = tao3.data?.id;
    const doi = await req('PUT', `/api/albums/${al3}/che-do`, { cookie: GV, body: { cheDo: 'chon-nha', nha: ['p2'] } });
    check('đối chứng — đặt được chế độ chọn nhà (chỉ p2)', doi.status === 200, doi.status);
    const anh3 = (await req('GET', `/api/albums/${al3}`, { cookie: GV })).data?.photos || [];
    await req('PUT', `/api/albums/${al3}/photos/${anh3[0].id}/be`, { cookie: GV, body: { studentIds: ['s1'] } });
    check('album "Chỉ những nhà cô chọn": nhà không được chọn không nhận tin',
      (await tinAlbumCua(PH1, 'Nguyễn Bảo An')).length === 0, await tinAlbumCua(PH1, 'Nguyễn Bảo An'));
  }

  // =========================================================================
  console.log('\n[2] B2 — CHO NGHỈ: GIA ĐÌNH VẪN XEM ALBUM CỦA GIAI ĐOẠN CON ĐÃ HỌC (8.13)');
  const ALBUM_CU = 'al3';   // album mẫu của nhóm Lá 1, chụp khi bé Minh Thư còn học
  {
    const truoc = (await req('GET', '/api/albums', { cookie: PH6 })).data || [];
    check('đối chứng — trước khi nghỉ, nhà bé Minh Thư thấy album nhóm Lá 1',
      truoc.some(a => a.id === ALBUM_CU), truoc.map(a => a.id));

    const nghi = await req('DELETE', '/api/admin/students/s7', { cookie: QT });
    check('ban giám hiệu cho bé Minh Thư nghỉ được', nghi.status === 200, nghi.status);

    const cu = (await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH6 })).data || [];
    const dong = cu.find(a => a.id === ALBUM_CU);
    check('SAU KHI NGHỈ, ALBUM CŨ VẪN CÓ TRONG DANH SÁCH (kèm album các năm trước)', !!dong, cu.map(a => a.id));
    check('và được đánh dấu là album của nhóm con từng học — màn hình xếp vào "Album của các năm học trước"',
      dong?.lopCuCuaCon === true, dong);
    const mo = await req('GET', `/api/albums/${ALBUM_CU}`, { cookie: PH6 });
    check('MỞ ĐƯỢC ALBUM CŨ', mo.status === 200, mo.status);
    check('và thấy ảnh trong đó', (mo.data?.photos || []).length > 0, (mo.data?.photos || []).length);
    const nhc = (await req('GET', '/api/namhoccu', { cookie: PH6 })).data?.khoang || [];
    check('mục "Năm học trước" có đúng giai đoạn bé đã học nhóm Lá 1',
      nhc.some(k => k.studentId === 's7' && k.classId === 'c2'), nhc);
  }

  // =========================================================================
  console.log('\n[3] B2 — NHẬN LẠI RỒI NGHỈ LẦN NỮA: GIỮ CẢ HAI GIAI ĐOẠN');
  {
    // Lùi lần nghỉ thứ nhất về 20 ngày trước, để giai đoạn hai tách hẳn ra.
    const NGHI_1 = ngayLui(20);
    sql('UPDATE student_class_periods SET den = ? WHERE studentId = ? AND den IS NOT NULL', NGHI_1, 's7');
    sql('UPDATE students SET leftAt = ? WHERE id = ?', NGHI_1, 's7');
    sql('UPDATE albums SET date = ? WHERE id = ?', ngayLui(25), ALBUM_CU);

    // Album đăng trong lúc bé VẮNG (10 ngày trước).
    const vang = await req('POST', '/api/albums', {
      cookie: GV2, body: { title: 'Ảnh lúc bé vắng', photos: [{ emoji: '🌧️' }] },
    });
    sql('UPDATE albums SET date = ? WHERE id = ?', ngayLui(10), vang.data?.id);

    const nhan = await req('PUT', '/api/admin/students/s7', { cookie: QT, body: { active: true } });
    check('nhận lại được bé', nhan.status === 200, nhan.status);
    const sau = await req('POST', '/api/albums', {
      cookie: GV2, body: { title: 'Ảnh sau khi bé đi học lại', photos: [{ emoji: '☀️' }] },
    });
    check('cô đăng được album sau khi bé đi học lại', sau.status === 201, sau.status);
    const alSau = sau.data?.id;

    const nghi2 = await req('DELETE', '/api/admin/students/s7', { cookie: QT });
    check('cho bé nghỉ lần thứ hai được', nghi2.status === 200, nghi2.status);

    const ds = ((await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH6 })).data || []).map(a => a.id);
    check('GIAI ĐOẠN MỘT: album cũ vẫn xem được', ds.includes(ALBUM_CU), ds);
    check('GIAI ĐOẠN HAI: album đăng sau khi nhận lại cũng xem được', ds.includes(alSau), ds);
    check('mở được album của giai đoạn hai',
      (await req('GET', `/api/albums/${alSau}`, { cookie: PH6 })).status === 200);
    check('NHƯNG album đăng lúc con VẮNG thì không — nhận lại không mở ngược về đầu năm',
      !ds.includes(vang.data?.id), ds);
    check('và không mở thẳng được album ấy',
      (await req('GET', `/api/albums/${vang.data?.id}`, { cookie: PH6 })).status === 403);
  }

  // =========================================================================
  console.log('\n[4] B2 — HỒ SƠ CŨ KHÔNG CÓ KHOẢNG HỌC NÀO: LƯỚI AN TOÀN');
  {
    // Dựng đúng dữ liệu cũ có thật: bé đã nghỉ từ trước bản vá, không có
    // dòng nào trong sổ khoảng học.
    const tao = await req('POST', '/api/albums', {
      cookie: (await login('giaovien4', '123456')).cookie,
      body: { title: 'Bé chơi xếp khối', photos: [{ emoji: '🧱' }] },
    });
    check('cô nhóm Nhà trẻ 1 đăng được album', tao.status === 201, tao.status);
    const alNt = tao.data?.id;
    sql('UPDATE albums SET date = ? WHERE id = ?', ngayLui(15), alNt);
    const sauNghi = await req('POST', '/api/albums', {
      cookie: (await login('giaovien4', '123456')).cookie,
      body: { title: 'Ảnh sau khi bé nghỉ', photos: [{ emoji: '🍂' }] },
    });
    sql("UPDATE students SET active = 0, leftAt = ? WHERE id = 's10'", ngayLui(5));
    sql("DELETE FROM student_class_periods WHERE studentId = 's10'");

    const ds = ((await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH8 })).data || []).map(a => a.id);
    check('BÉ KHÔNG CÓ KHOẢNG NÀO VẪN XEM ĐƯỢC ALBUM TRƯỚC NGÀY NGHỈ', ds.includes(alNt), ds);
    check('mở được album ấy', (await req('GET', `/api/albums/${alNt}`, { cookie: PH8 })).status === 200);
    check('nhưng không xem được album chụp sau ngày nghỉ', !ds.includes(sauNghi.data?.id), ds);
    const nhc = (await req('GET', '/api/namhoccu', { cookie: PH8 })).data?.khoang || [];
    const k = nhc.find(x => x.studentId === 's10');
    check('mục "Năm học trước" cũng có giai đoạn dựng lại', !!k, nhc);
    if (k) {
      check('và mở được giai đoạn ấy', (await req('GET', `/api/namhoccu/${k.id}`, { cookie: PH8 })).status === 200);
    }
    // Hết 12 tháng thì lưới an toàn cũng đóng, cùng luật Đ44.
    sql("UPDATE students SET leftAt = '2020-01-15' WHERE id = 's10'");
    const ds2 = ((await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH8 })).data || []).map(a => a.id);
    check('NGHỈ QUÁ 12 THÁNG THÌ KHÔNG CÒN XEM ĐƯỢC — lưới an toàn không mở rộng hạn', !ds2.includes(alNt), ds2);

    // Hồ sơ cũ ĐANG HỌC, không có khoảng nào, được cho nghỉ SAU bản vá: lần
    // cho nghỉ phải tự ghi khoảng, không trông vào lưới an toàn.
    sql("DELETE FROM student_class_periods WHERE studentId = 's11'");
    const nghi = await req('DELETE', '/api/admin/students/s11', { cookie: QT });
    check('cho bé Minh Khôi (hồ sơ cũ, chưa có khoảng nào) nghỉ được', nghi.status === 200, nghi.status);
    const kh = sql("SELECT tu, den FROM student_class_periods WHERE studentId = 's11'");
    check('CHO NGHỈ GHI LẠI ĐÚNG MỘT KHOẢNG ĐÃ ĐÓNG cho hồ sơ cũ', kh.length === 1 && !!kh[0].den, kh);
    const PH9 = (await login('ph.nga', '123456')).cookie;
    const ds3 = ((await req('GET', '/api/albums?keCaLopCu=1', { cookie: PH9 })).data || []).map(a => a.id);
    check('và gia đình vẫn xem album của giai đoạn con đã học', ds3.includes(alNt), ds3);
  }

  // =========================================================================
  console.log('\n[5] B6 — DANH SÁCH ALBUM ĐẾM VIDEO RIÊNG, KHÔNG GỌI VIDEO LÀ ẢNH');
  {
    // Hộp `ftyp` ở byte 4–8 là đủ qua phép kiểm chữ ký video của máy chủ.
    const mp4 = () => {
      const b = Buffer.alloc(4096);
      b.writeUInt32BE(4096, 0);
      b.write('ftypisom', 4, 'ascii');
      return `data:video/mp4;base64,${b.toString('base64')}`;
    };
    const chiVideo = await req('POST', '/api/albums', {
      cookie: GV, body: { title: 'Chỉ có video', photos: [{ video: mp4() }] },
    });
    check('cô đăng được album chỉ có video', chiVideo.status === 201, chiVideo.status);
    await req('POST', `/api/albums/${chiVideo.data?.id}/photos`, { cookie: GV, body: { photos: [{ video: mp4() }] } });
    const tron = await req('POST', '/api/albums', {
      cookie: GV, body: { title: 'Ảnh và video', photos: [{ emoji: '🎈' }, { emoji: '🧸' }] },
    });
    await req('POST', `/api/albums/${tron.data?.id}/photos`, { cookie: GV, body: { photos: [{ video: mp4() }] } });
    const ds = (await req('GET', '/api/albums', { cookie: GV })).data || [];
    const a1 = ds.find(a => a.id === chiVideo.data?.id);
    const a2 = ds.find(a => a.id === tron.data?.id);
    check('ALBUM CHỈ CÓ VIDEO: máy chủ nói rõ 2 video', a1 && a1.photoCount === 2 && a1.videoCount === 2, a1);
    check('ALBUM TRỘN: 3 tệp, trong đó 1 video', a2 && a2.photoCount === 3 && a2.videoCount === 1, a2);
    const anhCu = ds.find(a => a.id === 'al1');
    check('album chỉ có ảnh: 0 video (màn hình cũ vẫn đọc photoCount như trước)',
      anhCu && anhCu.videoCount === 0 && anhCu.photoCount > 0, anhCu);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
