// Bài canh PHẠM VI TỪNG ALBUM và LỜI KỂ ĐI KÈM (Đ197 — việc 29, 31, 32).
//
// Chạy bằng:  npm run test:album-pham-vi
//
// ĐIỀU QUAN TRỌNG NHẤT CỦA CẢ BÀI NÀY NẰM Ở MỤC [2]
//
// Nhà trường xin phân quyền từng album ở bốn mức, trong đó có mức "cả trường".
// Mở rộng tầm nhìn là chỗ dễ nhất để ai đó nghĩ *"cả trường xem được thì khỏi
// lọc nữa cho nhanh"* — và lọc mà bỏ ở đây thì thứ rò ra là ẢNH KHUÔN MẶT CỦA
// TRẺ DƯỚI 6 TUỔI mà gia đình chưa đồng ý cho hiện với nhà khác.
//
// CLAUDE.md nói thẳng: *"một ảnh chỉ hiện cho gia đình khác khi MỌI bé trong
// ảnh đều có đồng ý chia sẻ. Lọc ở tầng dữ liệu, không che ở giao diện."*
//
// Hai câu hỏi XẾP CHỒNG, không thay nhau:
//   • `album_che_do` — ai MỞ ĐƯỢC album này;
//   • `db.locAnhChoNguoiXem` — trong album ấy, nhà này thấy TẤM NÀO.
//
// Mục [2] dựng đúng cảnh nguy hiểm: một nhà ngoài nhóm mở album 'ca-truong',
// và đo xem họ có thấy tấm có mặt bé mà gia đình chưa đồng ý không.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('album-pham-vi');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng H', 'h_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4801), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d0 = await login('h_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('h_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1 (Chồi 2)
  const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm c2 (Lá 1)
  const PH1 = (await login('phuhuynh', '123456')).cookie;   // p1 — có con ở c1 và c2
  // NGƯỜI NGOÀI THẬT SỰ của nhóm c1 là p7 — con s9 học nhóm c4 (Nhà trẻ 1).
  //
  // Bản đầu của bài này dùng p4, và phép kiểm đối chứng ngay dưới bắt được:
  // p4 có con s5 ĐANG HỌC c1, tức là người trong nhóm. Một bài canh rò rỉ mà
  // "người ngoài" hoá ra là người trong thì nó không canh gì cả.
  const PH_NGOAI = (await login('ph.trang', '123456')).cookie;   // p7 — con s9 ở c4

  const ds = (await req('GET', '/api/albums', { cookie: GV })).data || [];
  const album = ds.find(a => a.className === 'Chồi 2');

  // =========================================================================
  console.log('\n[1] BỐN MỨC PHẠM VI, và MẶC ĐỊNH KHÔNG ĐỔI MỘT CHỮ NÀO');
  {
    check('đối chứng — tìm được album của nhóm Chồi 2', !!album, ds.map(a => a.className));
    const ct = await req('GET', `/api/albums/${album.id}`, { cookie: GV });
    check('album đang có vẫn ở chế độ cũ — ngày luật mới ra đời không album nào đổi tầm nhìn',
      ct.data?.cheDo === 'cong-khai', ct.data?.cheDo);
    check('và máy chủ nói ra tên chế độ bằng tiếng của trường',
      typeof ct.data?.tenCheDo === 'string' && ct.data.tenCheDo.length > 0, ct.data?.tenCheDo);

    const ma = fs.readFileSync(path.join(GOC, 'routes/albums.js'), 'utf8');
    const khoi = (ma.match(/const CHE_DO = \[([^\]]*)\]/) || [])[1] || '';
    const cacMuc = khoi.split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    check('đủ BỐN mức phạm vi', cacMuc.length === 4, cacMuc);
    check('và hai mức cũ giữ nguyên MÃ — album đã lưu không đổi nghĩa',
      cacMuc.includes('cong-khai') && cacMuc.includes('theo-the'), cacMuc);
  }

  // =========================================================================
  console.log('\n[2] MỞ RỘNG TẦM NHÌN KHÔNG NỚI LUẬT ẢNH NHÓM — mục đáng giá nhất');
  {
    // Nhà p4 không có con ở nhóm c1, nên hôm nay không mở được album ấy.
    const truoc = await req('GET', `/api/albums/${album.id}`, { cookie: PH_NGOAI });
    check('đối chứng — nhà ngoài nhóm hôm nay KHÔNG mở được album',
      truoc.status === 403 || truoc.status === 404, truoc.status);

    // Album của dữ liệu mẫu chưa có lời kể, nên chưa mở ra cả trường được —
    // chính là chốt của việc 32, đo luôn ở đây.
    const chuaKe = await req('PUT', `/api/albums/${album.id}/che-do`, {
      cookie: GV, body: { cheDo: 'ca-truong' },
    });
    check('THIẾU LỜI KỂ THÌ CHƯA MỞ RA CẢ TRƯỜNG ĐƯỢC (việc 32)',
      chuaKe.status === 400, chuaKe.status);
    check('và câu từ chối nói rõ thiếu gì, bằng tiếng của trường',
      /lời kể|gợi ý cùng con/.test(chuaKe.data?.error || ''), chuaKe.data?.error);

    // Cô viết lời kể rồi mới mở được.
    const moi = await req('POST', '/api/albums', {
      cookie: GV,
      body: {
        title: 'Hội chợ mùa thu của nhóm',
        description: 'Sáng nay cả nhóm bày gian hàng bánh, các bé tự rót nước mời khách.',
        cungConONha: 'Tối nay bố mẹ thử để bé rót nước mời cả nhà một lượt xem sao nhé.',
        photos: [{ emoji: '🎪' }, { emoji: '🍪' }],
      },
    });
    check('cô lập được album mới kèm lời kể và gợi ý cùng con',
      moi.status === 201, `${moi.status} ${JSON.stringify(moi.data).slice(0, 140)}`);
    const alMoi = moi.data?.id || moi.data?.album?.id;

    const mo = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: GV, body: { cheDo: 'ca-truong' },
    });
    check('CÓ LỜI KỂ RỒI THÌ MỞ RA CẢ TRƯỜNG ĐƯỢC', mo.status === 200, mo.data);
    check('và máy chủ nói đây là MỞ RỘNG, để màn hình hỏi lại cô một câu',
      mo.data?.doiGi === 'mo-rong', mo.data?.doiGi);

    const nhaNgoai = await req('GET', `/api/albums/${alMoi}`, { cookie: PH_NGOAI });
    check('nhà ngoài nhóm NAY MỞ ĐƯỢC album cả trường', nhaNgoai.status === 200, nhaNgoai.status);
    check('và album ấy nằm trong danh sách của họ',
      JSON.stringify((await req('GET', '/api/albums', { cookie: PH_NGOAI })).data).includes(alMoi));

    // ===== CHỖ NGUY HIỂM THẬT =====
    //
    // Album 'ca-truong' của nhóm c1, và trong nhóm c1 có bé s3 mà gia đình TỪ
    // CHỐI chia sẻ ảnh. Cô gắn thẻ s3 vào một tấm; nhà p4 phải KHÔNG thấy tấm
    // đó, dù họ mở được album.
    const ct = await req('GET', `/api/albums/${alMoi}`, { cookie: GV });
    const anh = (ct.data.photos || [])[0];
    check('đối chứng — album mới có ảnh để gắn thẻ', !!anh, (ct.data.photos || []).length);
    const gan = await req('PUT', `/api/albums/${alMoi}/photos/${anh.id}/be`, {
      cookie: GV, body: { studentIds: ['s3'] },
    });
    check('cô gắn được thẻ bé s3 (gia đình bé này TỪ CHỐI chia sẻ ảnh)',
      gan.status === 200, `${gan.status} ${JSON.stringify(gan.data).slice(0, 120)}`);

    const nhaNgoai2 = await req('GET', `/api/albums/${alMoi}`, { cookie: PH_NGOAI });
    const thay = (nhaNgoai2.data.photos || []).map(p => p.id);
    check('MỞ ĐƯỢC ALBUM CẢ TRƯỜNG VẪN KHÔNG THẤY ẢNH CỦA BÉ CHƯA ĐỒNG Ý CHIA SẺ',
      !thay.includes(anh.id), thay);

    // CHẶN ĐÚNG TẤM, KHÔNG CHẶN CẢ ALBUM.
    //
    // Nhóm c1 có bé s3 mà gia đình từ chối chia sẻ, nên ảnh CHƯA GẮN THẺ cũng
    // tạm ẩn với nhà khác — đó là luật có sẵn và nó đúng: chưa biết trong ảnh
    // là ai thì chưa thể nói ảnh ấy chia sẻ được. Nên muốn đo "vẫn thấy tấm
    // còn lại" thì phải gắn thẻ tấm ấy cho một bé CÓ đồng ý.
    const anh2 = (ct.data.photos || [])[1];
    await req('PUT', `/api/albums/${alMoi}/photos/${anh2.id}/be`, {
      cookie: GV, body: { studentIds: ['s1'] },
    });
    const thay2 = ((await req('GET', `/api/albums/${alMoi}`, { cookie: PH_NGOAI })).data.photos || [])
      .map(p => p.id);
    check('NHƯNG VẪN THẤY TẤM CỦA BÉ ĐÃ ĐỒNG Ý — chặn đúng tấm, không chặn cả album',
      thay2.includes(anh2.id) && !thay2.includes(anh.id), thay2);

    globalThis.AL_MOI = alMoi;
  }

  // =========================================================================
  console.log('\n[3] CHỌN TỪNG NHÀ — và không ai ngoài danh sách lọt vào');
  {
    const alMoi = globalThis.AL_MOI;
    const rong = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: GV, body: { cheDo: 'chon-nha', nha: [] },
    });
    check('CHỌN TỪNG NHÀ MÀ KHÔNG CHỌN NHÀ NÀO THÌ TỪ CHỐI — không để album ẩn im lặng',
      rong.status === 400, rong.status);
    check('và nói rõ phải chọn gì', /ít nhất một gia đình/.test(rong.data?.error || ''), rong.data);

    const ngoai = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: GV, body: { cheDo: 'chon-nha', nha: ['p7'] },
    });
    check('CÔ KHÔNG CHỌN ĐƯỢC NHÀ NGOÀI PHẠM VI CỦA MÌNH', ngoai.status === 403, ngoai.status);

    const dat = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: GV, body: { cheDo: 'chon-nha', nha: ['p1'] },
    });
    check('cô chọn được một nhà trong nhóm mình', dat.status === 200, dat.data);
    check('máy chủ nói lại số nhà đã chọn', dat.data?.soNha === 1, dat.data?.soNha);
    check('và nói đây là THU HẸP so với cả trường', dat.data?.doiGi === 'hep-lai', dat.data?.doiGi);

    const duocChon = await req('GET', `/api/albums/${alMoi}`, { cookie: PH1 });
    check('nhà được chọn mở được album', duocChon.status === 200, duocChon.status);
    const khongChon = await req('GET', `/api/albums/${alMoi}`, { cookie: PH_NGOAI });
    check('NHÀ KHÔNG ĐƯỢC CHỌN THÌ KHÔNG MỞ ĐƯỢC NỮA — thu hẹp có hiệu lực ngay',
      khongChon.status === 403 || khongChon.status === 404, khongChon.status);

    const hoi = await req('GET', `/api/albums/${alMoi}/nha`, { cookie: GV });
    check('cô đọc lại được danh sách nhà đã chọn để tích sẵn ô',
      hoi.status === 200 && (hoi.data.nha || []).includes('p1'), hoi.data);

    // Rời khỏi chế độ ấy thì danh sách phải được dọn: để lại thì lần sau bấm
    // vào là một danh sách cũ sống lại mà không ai bấm gì.
    await req('PUT', `/api/albums/${alMoi}/che-do`, { cookie: GV, body: { cheDo: 'cong-khai' } });
    const sauKhiRoi = await req('GET', `/api/albums/${alMoi}/nha`, { cookie: GV });
    check('RỜI KHỎI CHẾ ĐỘ THÌ DANH SÁCH NHÀ ĐƯỢC DỌN — không để một danh sách cũ sống lại',
      (sauKhiRoi.data.nha || []).length === 0, sauKhiRoi.data);
  }

  // =========================================================================
  console.log('\n[4] AI ĐẶT ĐƯỢC PHẠM VI — "ai cũng được, trừ phụ huynh" (việc 31)');
  {
    const alMoi = globalThis.AL_MOI;
    const ph = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: PH1, body: { cheDo: 'ca-truong' },
    });
    check('GIA ĐÌNH KHÔNG đặt được phạm vi album', ph.status === 403, ph.status);

    const vp = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: QT, body: { cheDo: 'theo-the' },
    });
    check('VĂN PHÒNG NAY ĐẶT ĐƯỢC — trước đợt này chỉ vai cô mới đặt được',
      vp.status === 200, vp.status);

    const coKhac = await req('PUT', `/api/albums/${alMoi}/che-do`, {
      cookie: GV2, body: { cheDo: 'cong-khai' },
    });
    check('cô nhóm khác thì không', coKhac.status === 403, coKhac.status);
  }

  // =========================================================================
  console.log('\n[5] LỜI KỂ ĐI KÈM — bắt đúng chỗ, không chặn lúc cô đang vội (việc 32)');
  {
    // ĐƯỜNG THOÁT: cô vội thì vẫn đăng được album không lời kể, y như trước.
    const voi = await req('POST', '/api/albums', {
      cookie: GV, body: { title: 'Ảnh nhanh cuối giờ', photos: [{ emoji: '📸' }] },
    });
    check('CÔ ĐANG VỘI VẪN ĐĂNG ĐƯỢC — không chặn cứng lúc cô không có thời gian',
      voi.status === 201, `${voi.status} ${JSON.stringify(voi.data).slice(0, 120)}`);

    const alVoi = voi.data?.id || voi.data?.album?.id;
    const moRong = await req('PUT', `/api/albums/${alVoi}/che-do`, {
      cookie: GV, body: { cheDo: 'ca-truong' },
    });
    check('NHƯNG MUỐN CẢ TRƯỜNG XEM THÌ PHẢI VIẾT MỘT CÂU — chặn đúng chỗ đáng chặn',
      moRong.status === 400, moRong.status);
    const hep = await req('PUT', `/api/albums/${alVoi}/che-do`, {
      cookie: GV, body: { cheDo: 'theo-the' },
    });
    check('thu hẹp lại thì không đòi gì cả — chỉ chiều MỞ RA mới cần lời kể',
      hep.status === 200, hep.status);

    // Gợi ý cùng con ở nhà đọc lại được — QUY TẮC 5 nằm ở đó.
    const ct = await req('GET', `/api/albums/${globalThis.AL_MOI}`, { cookie: GV });
    check('gợi ý CÙNG CON Ở NHÀ đọc lại được (QUY TẮC 5)',
      /rót nước mời cả nhà/.test(ct.data?.cungConONha || ''), ct.data?.cungConONha);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
