// Bài canh SỬA LỜI GHI CHÚ CỦA BẢN GHI NHANH (Đ166, HT-03).
//
// Chạy bằng:  npm run test:ghi-nhanh-sua
//
// NHÀ TRƯỜNG XIN GÌ
//
// 07/09, dòng HT-03: ảnh Ghi nhanh không kèm chữ thì vẫn hợp lệ — đúng, đã làm
// từ trước — nhưng *"thiếu sửa caption sau"*.
//
// Trước đợt này bản ghi đã gửi lên là VĨNH VIỄN: phân hệ chỉ có liệt kê, tạo,
// xem ảnh, xoá, xem kết quả. Cô gõ vội một dòng giữa lớp rồi đọc lại thấy sai
// thì đường duy nhất là XOÁ cả bản ghi — mất luôn tấm ảnh và số giây đã đo.
//
// BA ĐIỀU CỐ Ý, CẢ BA CANH Ở ĐÂY
//
// [2] CHỈ CHÍNH CÔ ĐÃ GHI, KỂ CẢ QUẢN TRỊ CŨNG KHÔNG. Đây là chỗ đường sửa cố
//     ý CHẶT HƠN đường xoá ngay bên cạnh nó. Hai việc khác nhau: xoá một bản
//     ghi sai bé là dọn một thứ không nên tồn tại, và văn phòng phải làm được;
//     sửa CHỮ trong ghi chép riêng của một cô là viết lại lời của người khác
//     dưới tên người ấy. Bảng ba lớp của CLAUDE.md xếp ghi chú thô vào lớp 1 —
//     "chỉ cô đã ghi".
//
// [3] CÓ DẤU VẾT, NHƯNG KHÔNG GIỮ LỜI CŨ. Lời ở đây có thể đã được chép sang
//     Hành trình và kể cho gia đình; người đọc lại sổ cần biết bản dưới đã đổi
//     lúc nào. Nhưng giữ lại từng bản nháp là biến một ô ghi vội thành hồ sơ
//     theo dõi cô giáo.
//
// [4] BẢN CÒN TRONG MÁY CŨNG SỬA ĐƯỢC. Đây là vế dễ bỏ sót nhất, và cũng là
//     lúc cô cần sửa nhất: bài kẹt vì mất mạng hoặc vì gia đình đã dừng hồ sơ,
//     cô đọc lại thấy sai chữ, mà trước đợt này đường duy nhất là "Bỏ bài này".
import fs from 'node:fs';
import path from 'node:path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ghi-nhanh-sua');
sinhDuLieu(DIR);
batPhanHe(DIR, ['thuchup']);
const mkQT = taoQuanTri(DIR, 'Quản trị', 'gn_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4827), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

let n = 0;
const maMoi = () => `gn-thu-${Date.now()}-${n++}`;

async function ghi(cookie, studentId, note) {
  const id = maMoi();
  const r = await req('POST', '/api/thuchup', {
    cookie,
    body: { id, studentId, note, giay: 12.5, taoLuc: new Date().toISOString() },
  });
  return { id, r };
}

try {
  const d = await login('gn_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('gn_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;   // cô nhóm c1 (có s1)
  const GV2 = (await login('giaovien2', '123456')).cookie; // cô nhóm c2
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Cô sửa được lời ghi chú của chính mình');
  {
    const { id, r } = await ghi(GV, 's1', 'be choi voi bong');
    check('ghi được một bản để sửa', r.status === 200 || r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);

    const sua = await req('PUT', `/api/thuchup/${id}`, { cookie: GV, body: { note: 'Bé chơi với quả bóng đỏ' } });
    check('CÔ SỬA ĐƯỢC lời của chính mình', sua.status === 200, `${sua.status} ${JSON.stringify(sua.data)}`);

    const ds = await req('GET', '/api/thuchup', { cookie: GV });
    const g = (ds.data?.ghiNhan || []).find(x => x.id === id);
    check('và lời mới thật sự nằm trong sổ', g && g.note === 'Bé chơi với quả bóng đỏ', g?.note);
    check('KHÔNG mất tấm ảnh hay số giây đã đo — sửa chữ không phải xoá rồi ghi lại',
      g && g.giay === 12.5, g?.giay);

    const lai = await req('PUT', `/api/thuchup/${id}`, { cookie: GV, body: { note: 'Bé chơi với quả bóng đỏ' } });
    check('sửa lại đúng lời cũ thì máy nhận nhưng nói là không đổi gì',
      lai.status === 200 && lai.data?.doiKhong === false, lai.data);
  }

  // =========================================================================
  console.log('\n[2] CHỈ chính cô đã ghi — quản trị cũng không sửa lời của cô');
  {
    const { id } = await ghi(GV, 's1', 'loi cua co mot');

    const qt = await req('PUT', `/api/thuchup/${id}`, { cookie: QT, body: { note: 'quản trị viết lại' } });
    check('QUẢN TRỊ KHÔNG sửa được lời của cô', qt.status === 403, qt.status);
    check('và câu từ chối nói rõ vì sao, kèm cho biết vẫn xoá được bản sai bé',
      /ghi chép riêng/i.test(qt.data?.error || '') && /xoá/i.test(qt.data?.error || ''), qt.data?.error);

    const co2 = await req('PUT', `/api/thuchup/${id}`, { cookie: GV2, body: { note: 'cô khác viết' } });
    check('cô nhóm khác càng không', co2.status === 403, co2.status);
    const ph = await req('PUT', `/api/thuchup/${id}`, { cookie: PH, body: { note: 'nhà viết' } });
    check('gia đình không vào được phân hệ này', ph.status === 403 || ph.status === 404, ph.status);

    // ĐỐI CHỨNG: quản trị VẪN xoá được bản ghi sai bé. Thiếu vế này thì mục
    // trên xanh cả khi đợt này siết nhầm cả đường xoá.
    const xoa = await req('DELETE', `/api/thuchup/${id}`, { cookie: QT });
    check('đối chứng — quản trị VẪN xoá được bản ghi sai bé, đường xoá không bị siết theo',
      xoa.status === 200, `${xoa.status} ${JSON.stringify(xoa.data)}`);
  }

  // =========================================================================
  console.log('\n[3] Dấu vết: có ngày sửa, KHÔNG giữ lời cũ');
  {
    const { id } = await ghi(GV, 's1', 'ban dau');
    const truoc = await req('GET', '/api/thuchup', { cookie: GV });
    const gTruoc = (truoc.data?.ghiNhan || []).find(x => x.id === id);
    check('bản chưa sửa thì KHÔNG mang dấu đã sửa', !gTruoc?.suaLuc, gTruoc?.suaLuc);

    await req('PUT', `/api/thuchup/${id}`, { cookie: GV, body: { note: 'lan sua thu nhat' } });
    const sau = await req('GET', '/api/thuchup', { cookie: GV });
    const gSau = (sau.data?.ghiNhan || []).find(x => x.id === id);
    check('sửa xong thì có dấu ngày sửa', !!gSau?.suaLuc, gSau?.suaLuc);
    check('máy chủ nói cho màn hình biết ai sửa được bản này', gSau?.suaDuoc === true, gSau?.suaDuoc);

    // KHÔNG giữ lời cũ ở bất cứ đâu trong gói trả về.
    const tho = JSON.stringify(sau.data);
    check('lời CŨ không còn nằm trong gói dữ liệu — không giữ từng bản nháp của cô',
      !tho.includes('ban dau'), tho.slice(0, 160));

    const ds2 = await req('GET', '/api/thuchup', { cookie: QT });
    const gQT = (ds2.data?.ghiNhan || []).find(x => x.id === id);
    check('quản trị đọc được bản ghi nhưng máy nói rõ là KHÔNG sửa được',
      gQT && gQT.suaDuoc === false, gQT?.suaDuoc);
  }

  // =========================================================================
  console.log('\n[4] Không biến bản ghi thành một dòng rỗng');
  {
    const { id } = await ghi(GV, 's1', 'chi co chu, khong co anh');
    const rong = await req('PUT', `/api/thuchup/${id}`, { cookie: GV, body: { note: '   ' } });
    check('bản CHỈ CÓ CHỮ mà xoá sạch chữ thì bị từ chối', rong.status === 400, rong.status);
    check('và câu từ chối chỉ sang đúng đường cần dùng',
      /xoá/i.test(rong.data?.error || ''), rong.data?.error);

    const con = await req('GET', '/api/thuchup', { cookie: GV });
    const g = (con.data?.ghiNhan || []).find(x => x.id === id);
    check('bản ghi vẫn còn nguyên lời cũ sau lần bị từ chối', g?.note === 'chi co chu, khong co anh', g?.note);

    const bay = await req('PUT', '/api/thuchup/khong-co-that', { cookie: GV, body: { note: 'x' } });
    check('mã bịa thì trả 404, không phải lỗi máy chủ', bay.status === 404, bay.status);
  }

  // =========================================================================
  console.log('\n[5] Màn hình: sửa được cả bài ĐÃ GỬI lẫn bài CÒN TRONG MÁY');
  {
    const v = fs.readFileSync(path.join(GOC, 'modules/thuchup/view.js'), 'utf8');
    const ma = v.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');

    check('có ô sửa lời ghi chú', /moSuaChu\(/.test(ma), 'view.js');
    check('bản đã gửi lên thì gọi máy chủ', /API\.put\(`\/api\/thuchup\//.test(ma), 'view.js');
    check('BÀI CÒN TRONG MÁY thì sửa thẳng vào kho trong máy, không gọi mạng',
      /data-sua-may/.test(ma) && /luuVaoMay\(\{ \.\.\.rec, note \}\)/.test(ma), 'view.js');
    check('nút sửa của bản đã gửi chỉ hiện khi máy chủ nói suaDuoc',
      /g\.suaDuoc \?/.test(ma), 'view.js');
    check('dòng "đã sửa" hiện ra khi có dấu vết', /g\.suaLuc \?/.test(ma), 'view.js');
    check('và ô sửa nói thẳng rằng bản kể cho gia đình KHÔNG đổi theo',
      /không đổi theo/.test(v), 'view.js');

    // Đối chứng: nút "Bỏ bài này" vẫn còn — đợt này THÊM một đường, không thay
    // đường cũ. Bỏ mất nó là cô hết cách dọn một bài vô vọng.
    check('đối chứng — nút "Bỏ bài này" của hàng đợi vẫn còn nguyên',
      /data-bo=/.test(ma) && /Bỏ bài này/.test(v), 'view.js');
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Sửa lời ghi chú bản Ghi nhanh (Đ166, HT-03)');
