// Bài canh THU HỒI LỜI NHẮN và PHÒNG CHUNG DO CÔ TẠO (Đ196 — việc 25, 27, 28).
//
// Chạy bằng:  npm run test:nhan-tin-thu-hoi-phong
//
// HAI VIỆC, HAI KIỂU NGUY HIỂM KHÁC NHAU
//
// Việc 25 nguy hiểm theo hướng MẤT DỮ LIỆU: "thu hồi" trong các app nhắn tin
// thường nghĩa là xoá thật. Nội dung giữa một gia đình và cô của con họ là thứ
// có thể thành bằng chứng khi có khiếu nại — xoá thật là mất nó vĩnh viễn.
//
// Việc 27 nguy hiểm theo hướng RÒ RỈ: một phòng chung mời nhầm người là gia
// đình nhà khác đọc được mọi thứ nói trong đó, và không ai biết cho tới lúc có
// người kể lại.
//
// VIỆC 28 KHÔNG PHẢI MỘT TÍNH NĂNG THỨ HAI. "Nhóm phụ huynh tuỳ chọn" chính là
// một phòng chung chỉ có phụ huynh — một đường, hai việc. Mục [4] đo đúng điều
// đó thay vì dựng thêm một đường nữa.
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhan-tin-thu-hoi-phong');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng G', 'g_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4791), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d0 = await login('g_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('g_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1
  const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm c2
  const PH = (await login('phuhuynh', '123456')).cookie;    // có con ở c1 và c2
  const PH4 = (await login('ph.lan', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] THU HỒI: GIỮ CHỖ, BỎ CHỮ — không xoá khỏi cơ sở dữ liệu');
  let cvId = '';
  let tinId = '';
  {
    const mo = await req('POST', '/api/messages/start', {
      cookie: PH, body: { kenh: 'nhom', studentId: 's1' },
    });
    check('gia đình mở được cuộc với cô phụ trách nhóm', mo.status === 200 && mo.data?.id, mo.status);
    cvId = mo.data.id;

    const g1 = await req('POST', `/api/messages/${cvId}`, {
      cookie: PH, body: { text: 'Cô ơi chiều nay bà ngoại đón bé lúc 4 giờ ạ.' },
    });
    check('gửi được lời nhắn', g1.status === 200, g1.status);
    tinId = g1.data.id;
    await req('POST', `/api/messages/${cvId}`, {
      cookie: PH, body: { text: 'À nhầm ạ, để em nhắn lại.' },
    });

    const truoc = await req('GET', `/api/messages/${cvId}`, { cookie: GV });
    check('đối chứng — cô đọc được cả hai lời nhắn',
      (truoc.data.messages || []).length === 2, (truoc.data.messages || []).length);
    check('và lời nhắn đầu đang có chữ',
      (truoc.data.messages || [])[0]?.text?.includes('bà ngoại'), (truoc.data.messages || [])[0]?.text);

    const th = await req('POST', `/api/messages/${cvId}/tin/${tinId}/thu-hoi`, { cookie: PH });
    check('người gửi thu hồi được lời nhắn của mình', th.status === 200, th.status);

    const sau = await req('GET', `/api/messages/${cvId}`, { cookie: GV });
    const ds = sau.data.messages || [];
    check('CHỖ CỦA TIN VẪN CÒN — cuộc trò chuyện không thủng một lỗ giữa dòng',
      ds.length === 2, ds.length);
    check('nhưng CHỮ KHÔNG CÒN ĐI RA KHỎI MÁY CHỦ',
      ds[0]?.text === '' && !JSON.stringify(ds[0]).includes('bà ngoại'), JSON.stringify(ds[0]));
    check('và màn hình biết đây là tin đã thu hồi để nói cho người đọc',
      ds[0]?.daThuHoi === true, ds[0]?.daThuHoi);
    check('tin còn lại KHÔNG bị đụng tới',
      ds[1]?.text?.includes('nhắn lại') && ds[1]?.daThuHoi === false, ds[1]?.text);

    // CHÍNH NGƯỜI THU HỒI CŨNG KHÔNG ĐỌC LẠI ĐƯỢC. Cho họ đọc thì hai người
    // trong cùng một phòng nhìn thấy hai nội dung khác nhau, và khi có khiếu
    // nại thì không ai biết màn hình nào là thật.
    const tuXem = await req('GET', `/api/messages/${cvId}`, { cookie: PH });
    check('NGƯỜI TỰ THU HỒI CŨNG KHÔNG ĐỌC LẠI ĐƯỢC CHỮ CŨ',
      (tuXem.data.messages || [])[0]?.text === '', (tuXem.data.messages || [])[0]?.text);
  }

  // =========================================================================
  console.log('\n[2] THU HỒI LÀ ĐÁNH DẤU ẨN, KHÔNG XOÁ — và chỉ người gửi làm được');
  {
    // Dòng gốc PHẢI còn trong bảng: đây là thứ tra được khi có khiếu nại, và
    // là chỗ khác nhau lớn nhất giữa app này với một app nhắn tin thường.
    const ma = fs.readFileSync(path.join(GOC, 'routes/messages.js'), 'utf8')
      .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    check('KHÔNG có câu DELETE nào trên bảng messages',
      !/DELETE FROM messages/i.test(ma), (ma.match(/DELETE FROM \w+/gi) || []).join(', '));
    check('mà đi qua đúng cơ chế thu hồi đã canh ở bốn chỗ khác',
      /st\.ghiThuHoi\('messages'/.test(ma));
    check('và mỗi lượt thu hồi ghi một dòng nhật ký',
      /db\.audit\([^)]*'tin-nhan-thu-hoi'/.test(ma));

    const g = await req('POST', `/api/messages/${cvId}`, {
      cookie: PH, body: { text: 'Nhờ cô nhắc bé uống thuốc sau bữa trưa ạ.' },
    });
    const id2 = g.data.id;
    const coGo = await req('POST', `/api/messages/${cvId}/tin/${id2}/thu-hoi`, { cookie: GV });
    check('CÔ KHÔNG thu hồi được lời của gia đình', coGo.status === 403, coGo.status);
    const qtGo = await req('POST', `/api/messages/${cvId}/tin/${id2}/thu-hoi`, { cookie: QT });
    check('QUẢN TRỊ CŨNG KHÔNG — trường không có nút xoá tiếng nói của phụ huynh',
      qtGo.status === 403 || qtGo.status === 404, qtGo.status);
    const van = await req('GET', `/api/messages/${cvId}`, { cookie: PH });
    check('nên lời ấy vẫn còn nguyên chữ',
      (van.data.messages || []).some(m => m.text.includes('uống thuốc')));

    const nhaKhac = await req('POST', `/api/messages/${cvId}/tin/${tinId}/thu-hoi`, { cookie: PH4 });
    check('nhà khác thì không vào nổi cuộc này để mà thu hồi',
      nhaKhac.status === 403 || nhaKhac.status === 404, nhaKhac.status);

    // HUY HIỆU KHÔNG ĐƯỢC ĐẾM TIN ĐÃ THU HỒI.
    //
    // Chỗ này do chính `test:thu-hoi` bắt được khi thêm bảng `messages` vào
    // danh sách nó canh: `routes/dashboard.js` đọc ké bảng để đếm tin chưa
    // đọc, và người viết ở đấy đang nghĩ về huy hiệu chứ không nghĩ về thu
    // hồi. Hậu quả: gia đình thấy con số 1 trên ô Nhắn tin cho một lời nhắn
    // mà mở ra chỉ còn chỗ trống — huy hiệu hứa một thứ mà màn hình không có.
    const g2 = await req('POST', `/api/messages/${cvId}`, {
      cookie: PH, body: { text: 'Một lời nữa để đếm huy hiệu.' },
    });
    const truocHuy = (await req('GET', '/api/dashboard/badges', { cookie: GV })).data?.nhantin;
    check('đối chứng — huy hiệu Nhắn tin của cô đang đếm lời nhắn mới',
      Number(truocHuy) > 0, truocHuy);
    await req('POST', `/api/messages/${cvId}/tin/${g2.data.id}/thu-hoi`, { cookie: PH });
    const sauHuy = (await req('GET', '/api/dashboard/badges', { cookie: GV })).data?.nhantin;
    check('THU HỒI RỒI THÌ HUY HIỆU GIẢM THEO — không đếm thứ màn hình không có',
      Number(sauHuy) === Number(truocHuy) - 1, `${truocHuy} → ${sauHuy}`);
  }

  // =========================================================================
  console.log('\n[3] PHÒNG CHUNG DO CÔ TẠO — và chốt chặn ai mời được ai');
  let phongId = '';
  {
    const hoi = await req('GET', '/api/messages/phong-chung/moi-duoc', { cookie: GV });
    check('cô hỏi được trước ai mình mời được', hoi.status === 200, hoi.status);
    const nguoi = hoi.data.nguoi || [];
    check('đối chứng — danh sách không rỗng', nguoi.length > 0, nguoi.length);
    check('và KHÔNG có chính cô trong đó', !nguoi.some(x => x.hoTen.includes('Giáo Viên A')), nguoi.length);

    const phuHuynh = nguoi.filter(x => x.vai === 'parent').map(x => x.id);
    check('cô mời được gia đình của nhóm mình', phuHuynh.length > 0, phuHuynh.length);

    const tao = await req('POST', '/api/messages/phong-chung', {
      cookie: GV, body: { ten: 'Chuẩn bị hội chợ mùa xuân', thanhVien: phuHuynh.slice(0, 2) },
    });
    check('cô lập được phòng chung', tao.status === 201, `${tao.status} ${JSON.stringify(tao.data).slice(0, 120)}`);
    phongId = tao.data?.id;

    const mo = await req('GET', `/api/messages/${phongId}`, { cookie: GV });
    check('cô mở được phòng vừa lập', mo.status === 200, mo.status);
    check('phòng mang đúng tên cô đặt', mo.data?.title === 'Chuẩn bị hội chợ mùa xuân', mo.data?.title);
    const g = await req('POST', `/api/messages/${phongId}`, {
      cookie: GV, body: { text: 'Chào cả nhà, tuần sau mình họp nhanh 15 phút nhé.' },
    });
    check('nhắn được vào phòng chung', g.status === 200, g.status);

    const tv = await req('GET', `/api/messages/${phongId}`, { cookie: PH });
    check('thành viên được mời đọc được', tv.status === 200 && (tv.data.messages || []).length === 1, tv.status);

    // RÒ RỈ LÀ KIỂU HỎNG NẶNG NHẤT CỦA MỤC NÀY.
    const ngoai = await req('GET', `/api/messages/${phongId}`, { cookie: PH4 });
    check('NGƯỜI KHÔNG ĐƯỢC MỜI KHÔNG ĐỌC ĐƯỢC MỘT CHỮ NÀO',
      ngoai.status === 403 || ngoai.status === 404, ngoai.status);

    // Và phòng phải nằm trong danh sách của thành viên, nếu không thì lập
    // xong rồi không ai tìm lại được.
    const ds = await req('GET', '/api/messages', { cookie: PH });
    const co = JSON.stringify(ds.data).includes(phongId);
    check('phòng chung hiện trong danh sách hội thoại của thành viên', co, ds.status);
  }

  // =========================================================================
  console.log('\n[4] AI LẬP ĐƯỢC, VÀ MỜI AI — hai chốt khác nhau');
  {
    const phTao = await req('POST', '/api/messages/phong-chung', {
      cookie: PH, body: { ten: 'Nhóm phụ huynh tự lập', thanhVien: ['p4'] },
    });
    check('GIA ĐÌNH KHÔNG lập được phòng chung', phTao.status === 403, phTao.status);

    // Cô KHÔNG mời được người ngoài tầm với của mình. Đây là chốt giữ cho một
    // phòng chung không thành đường rò sang nhóm khác.
    const hoi2 = await req('GET', '/api/messages/phong-chung/moi-duoc', { cookie: GV2 });
    const cuaGV2 = new Set((hoi2.data.nguoi || []).map(x => x.id));
    const hoi1 = await req('GET', '/api/messages/phong-chung/moi-duoc', { cookie: GV });
    const chiCuaGV = (hoi1.data.nguoi || []).filter(x => !cuaGV2.has(x.id) && x.vai === 'parent');
    check('đối chứng — có ít nhất một gia đình chỉ cô nhóm c1 chạm tới được',
      chiCuaGV.length > 0, chiCuaGV.length);
    const len = await req('POST', '/api/messages/phong-chung', {
      cookie: GV2, body: { ten: 'Thử mời người ngoài nhóm', thanhVien: [chiCuaGV[0]?.id] },
    });
    check('CÔ KHÔNG MỜI ĐƯỢC GIA ĐÌNH NGOÀI NHÓM MÌNH', len.status === 403, len.status);
    check('và câu từ chối NÓI RA ai bị từ chối, không cụt lủn',
      /Không mời được vào phòng: .+/.test(len.data?.error || ''), len.data?.error);

    // VIỆC 28 — "nhóm phụ huynh tuỳ chọn" chính là phòng chung chỉ có phụ
    // huynh. Không có đường thứ hai, và mục này chứng minh điều đó.
    const chiPH = (hoi1.data.nguoi || []).filter(x => x.vai === 'parent').map(x => x.id).slice(0, 2);
    const nhomPH = await req('POST', '/api/messages/phong-chung', {
      cookie: GV, body: { ten: 'Ban đại diện cha mẹ bé nhóm Chồi 2', thanhVien: chiPH },
    });
    check('NHÓM PHỤ HUYNH TUỲ CHỌN = phòng chung chỉ có phụ huynh, không cần đường thứ hai',
      nhomPH.status === 201, nhomPH.status);

    const rong = await req('POST', '/api/messages/phong-chung', {
      cookie: GV, body: { ten: 'Phòng một mình', thanhVien: [] },
    });
    check('phòng chỉ có mình cô thì từ chối, nói bằng tiếng của trường',
      rong.status === 400 && /ít nhất một người/.test(rong.data?.error || ''), rong.data);
    const khongTen = await req('POST', '/api/messages/phong-chung', {
      cookie: GV, body: { ten: '   ', thanhVien: chiPH },
    });
    check('phòng không tên cũng vậy', khongTen.status === 400, khongTen.status);
  }

  // =========================================================================
  console.log('\n[5] CUỘC ĐÃ ĐÓNG THÌ KHÔNG THU HỒI ĐƯỢC NỮA — kho lưu là kho lưu');
  {
    const g = await req('POST', `/api/messages/${cvId}`, {
      cookie: PH, body: { text: 'Một lời nữa trước khi đóng.' },
    });
    const id3 = g.data.id;
    const dong = await req('POST', `/api/messages/${cvId}/dong`, { cookie: QT });
    check('ban giám hiệu đóng được cuộc', dong.status === 200, dong.status);
    const th = await req('POST', `/api/messages/${cvId}/tin/${id3}/thu-hoi`, { cookie: PH });
    check('ĐÓNG RỒI THÌ KHÔNG AI THU HỒI THÊM ĐƯỢC — một kho lưu mà sửa được thì không còn là kho lưu',
      th.status === 403 || th.status === 404, th.status);
  }

  // =========================================================================
  console.log('\n[6] DANH SÁCH HỘI THOẠI CŨNG KHÔNG ĐẾM, KHÔNG IN TIN ĐÃ THU HỒI');
  {
    // LỖI CÓ TỪ TRƯỚC, tìm được khi đọc mã ở Đ239n. Mục [2] đã canh huy hiệu
    // trên trang chủ; nhưng màn Nhắn tin có câu đếm RIÊNG của nó cho từng
    // dòng, và câu ấy quên lọc. Cô gửi rồi thu hồi trước khi nhà kịp đọc: ô
    // Nhắn tin báo 0, mở màn Nhắn tin vẫn thấy chấm đỏ "1" với tên in đậm,
    // bấm vào thì không có gì mới. Còn tệ hơn: dòng xem trước dưới tên in
    // NGUYÊN CHỮ của lời đã thu hồi — đúng thứ cô vừa rút lại.
    const tong = (ds) => (ds.conversations || []).reduce((s, c) => s + (Number(c.unreadCount) || 0), 0);
    const mo = await req('POST', '/api/messages/start', {
      cookie: PH4, body: { kenh: 'nhom', studentId: 's5' },
    });
    check('gia đình bé s5 mở được cuộc với cô phụ trách nhóm', mo.status === 200 && mo.data?.id, mo.status);
    const cv6 = mo.data.id;
    const g = await req('POST', `/api/messages/${cv6}`, {
      cookie: GV, body: { text: 'Chị ơi chiều nay bé Bảo An bị sốt nhẹ ạ.' },
    });
    check('cô nhắn được cho gia đình', g.status === 200 && g.data?.id, g.status);

    const ds0 = (await req('GET', '/api/messages', { cookie: PH4 })).data;
    const dong0 = (ds0.conversations || []).find(c => c.id === cv6);
    const huy0 = (await req('GET', '/api/dashboard/badges', { cookie: PH4 })).data?.nhantin;
    check('đối chứng — trước khi thu hồi, dòng của cuộc này đếm 1 tin chưa đọc',
      dong0?.unreadCount === 1, dong0?.unreadCount);
    check('đối chứng — và dòng xem trước đang in chữ của lời nhắn',
      dong0?.lastMessage?.text?.includes('sốt nhẹ') && dong0?.lastMessage?.daThuHoi !== true,
      JSON.stringify(dong0?.lastMessage));
    check('đối chứng — danh sách và huy hiệu đang nói cùng một con số',
      tong(ds0) === Number(huy0), `danh sách ${tong(ds0)}, huy hiệu ${huy0}`);

    // Cô nhắn nhầm tên bé — thu hồi trước khi gia đình mở ra đọc.
    const th = await req('POST', `/api/messages/${cv6}/tin/${g.data.id}/thu-hoi`, { cookie: GV });
    check('cô thu hồi được lời mình vừa gửi', th.status === 200, th.status);

    const ds1 = (await req('GET', '/api/messages', { cookie: PH4 })).data;
    const dong1 = (ds1.conversations || []).find(c => c.id === cv6);
    const huy1 = (await req('GET', '/api/dashboard/badges', { cookie: PH4 })).data?.nhantin;
    check('THU HỒI RỒI THÌ DÒNG ĐÓ KHÔNG CÒN CHẤM ĐỎ — không đếm thứ mở ra không có',
      dong1?.unreadCount === 0, dong1?.unreadCount);
    check('huy hiệu trang chủ giảm đúng một', Number(huy1) === Number(huy0) - 1, `${huy0} → ${huy1}`);
    check('DANH SÁCH VÀ HUY HIỆU VẪN NÓI CÙNG MỘT CON SỐ',
      tong(ds1) === Number(huy1), `danh sách ${tong(ds1)}, huy hiệu ${huy1}`);

    // Dòng xem trước đi cùng luật với `messageDto`: GIỮ CHỖ, BỎ CHỮ. Cuộc vẫn
    // còn tin cuối ấy — mở ra là thấy một dòng "đã thu hồi" — nhưng chữ không
    // rời máy chủ, ở màn này cũng như ở màn trong.
    check('dòng xem trước KHÔNG in lại chữ của lời đã thu hồi',
      !JSON.stringify(dong1 || {}).includes('sốt nhẹ'), JSON.stringify(dong1?.lastMessage));
    check('và báo được đây là tin đã thu hồi, giống hệt màn trong cuộc trò chuyện',
      dong1?.lastMessage?.daThuHoi === true && dong1?.lastMessage?.text === '',
      JSON.stringify(dong1?.lastMessage));
    const trong = await req('GET', `/api/messages/${cv6}`, { cookie: PH4 });
    const cuoi = (trong.data.messages || []).at(-1);
    check('màn trong cuộc trò chuyện nói cùng một điều với dòng xem trước',
      cuoi?.daThuHoi === true && cuoi?.text === dong1?.lastMessage?.text, JSON.stringify(cuoi));
  }

  // =========================================================================
  console.log('\n[7] CHUÔNG THÔNG BÁO CỦA GIA ĐÌNH CŨNG KHÔNG GIỮ CHỮ CỦA TIN ĐÃ THU HỒI');
  {
    // LỖI CÓ TỪ TRƯỚC, tìm được khi soát bản sửa Đ239o. Cô nhắn vào kênh theo
    // bé thì máy chủ còn ghi một dòng chuông `thongbao_be` cho gia đình, kèm
    // 140 chữ đầu của tin (Đ151). Đường thu hồi chỉ đánh dấu bảng `messages`,
    // nên màn Thông báo vẫn in nguyên câu cô vừa rút lại — đúng cảnh nhắn nhầm
    // nhà: chuyện sức khoẻ của bé này nằm lại trên điện thoại nhà bé kia.
    const MAU = 'sốt nhẹ 37,8 độ';
    const chuong = async () => (await req('GET', '/api/notifications/rieng-be', { cookie: PH4 })).data || [];
    const soChuaDoc = async () => Number((await req('GET', '/api/dashboard/badges', { cookie: PH4 })).data?.thongbao);

    const mo = await req('POST', '/api/messages/start', {
      cookie: GV, body: { kenh: 'nhom', studentId: 's5' },
    });
    check('cô mở được kênh nhóm với gia đình bé s5', mo.status === 200 && mo.data?.id, mo.status);
    const cv7 = mo.data.id;
    const huy0 = await soChuaDoc();

    const gA = await req('POST', `/api/messages/${cv7}`, {
      cookie: GV, body: { text: `Chị ơi chiều nay bé Bảo An bị ${MAU}, cô đã cho bé nằm nghỉ ạ.` },
    });
    const gB = await req('POST', `/api/messages/${cv7}`, {
      cookie: GV, body: { text: 'Mai nhóm mình đi dạo vườn rau, chị cho bé mang mũ giúp cô ạ.' },
    });
    check('cô nhắn được hai lời', gA.status === 200 && gB.status === 200, `${gA.status} ${gB.status}`);

    const c1 = await chuong();
    check('đối chứng — trước khi thu hồi, chuông của gia đình đang in chữ của lời nhắn',
      c1.some(n => n.laRiengBe && (n.body || '').includes(MAU)), JSON.stringify(c1.slice(0, 2)));
    check('đối chứng — số chưa đọc của gia đình tăng đúng hai',
      (await soChuaDoc()) === huy0 + 2, `${huy0} → ${await soChuaDoc()}`);

    const th = await req('POST', `/api/messages/${cv7}/tin/${gA.data.id}/thu-hoi`, { cookie: GV });
    check('cô thu hồi được lời nhắn nhầm', th.status === 200, th.status);

    const c2 = await chuong();
    check('THU HỒI RỒI THÌ CHUÔNG CỦA GIA ĐÌNH KHÔNG CÒN MỘT CHỮ NÀO CỦA TIN ẤY',
      !JSON.stringify(c2).includes(MAU) && !JSON.stringify(c2).includes('Bảo An'),
      JSON.stringify(c2.filter(n => JSON.stringify(n).includes(MAU))));
    check('lời nhắn KHÔNG thu hồi vẫn báo như cũ — chỉ đúng dòng của tin ấy biến mất',
      c2.some(n => (n.body || '').includes('vườn rau')), JSON.stringify(c2.slice(0, 2)));
    check('số chưa đọc giảm theo — không đếm một dòng mở ra không có',
      (await soChuaDoc()) === huy0 + 1, `${huy0} → ${await soChuaDoc()}`);

    // THU HỒI LÀ ẨN, KHÔNG XOÁ — với dòng chuông cũng như với dòng tin.
    const csdl = new Database(path.join(DIR, 'school.db'), { readonly: true });
    try {
      const conDong = csdl.prepare(
        "SELECT COUNT(*) AS n FROM thongbao_be WHERE studentId = 's5' AND loai = 'tin-nhan' AND noiDung LIKE ?",
      ).get(`%${MAU}%`).n;
      check('dòng chuông gốc vẫn còn trong cơ sở dữ liệu — chỉ không đi ra khỏi máy chủ nữa',
        conDong === 1, conDong);
    } finally { csdl.close(); }
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
