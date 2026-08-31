// Bài canh: APP HỨA THÌ APP PHẢI LÀM.
//
// Chạy bằng:  npm run test:hua-thi-lam
//
// VÌ SAO CÓ BÀI NÀY
//
// Một đợt soát tìm được năm chỗ cùng một hình dạng, ở năm phân hệ khác nhau:
// màn hình nói ra một điều mà máy chủ không hề làm, hoặc máy chủ làm sẵn một
// điều mà không màn hình nào gọi tới. Không chỗ nào là lỗi cú pháp, không chỗ
// nào làm app sập, nên không bài test nào cũ bắt được — chúng chỉ làm người
// dùng tin sai:
//
//   1. Điểm danh ghi "Gia đình đã thấy ảnh" trong khi app KHÔNG hề biết gia
//      đình đã mở hay chưa. Cô đọc dòng đó rồi thôi không gọi điện.
//   2. Gia đình bấm "Ngưng dùng" một người được đón, và cô vẫn ghi sổ trả bé
//      bằng đúng tên đó từ danh sách cũ còn trong bộ nhớ trang.
//   3. Quản trị mở Khảo sát / Dặn thuốc thì rơi vào NHÁNH CỦA GIA ĐÌNH, tức
//      màn hình hỏi "con bạn là bé nào" với một người không có con nào.
//   4. `/api/schoolyear/alumni` lọc đúng theo cơ sở, chạy tốt, và KHÔNG màn
//      hình nào gọi tới — bé ra trường biến mất khỏi mọi màn của trường.
//   5. Nhà trường tắt một mẫu báo cáo thì mẫu ấy rơi khỏi danh sách và không
//      còn nút nào bật lại được. Một cửa MỘT CHIỀU.
//   6. Cô soạn chủ đề tuần sau từ thứ Sáu, nhưng gia đình chỉ đọc được chủ đề
//      TUẦN NÀY — mà "Cùng con ở nhà" là thứ nhà chơi vào cuối tuần.
//
// Bài này canh cả sáu, ở mức LỜI HỨA chứ không ở mức câu chữ: chỗ nào kiểm
// được bằng một lượt gọi thật thì gọi thật, chỗ nào chỉ có trên màn hình thì
// dò trong mã nguồn kèm phép thử ngược.
import fs from 'fs';
import path from 'path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, taoBeRaTruong, dongNhom, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hua-thi-lam');
sinhDuLieu(DIR);
batPhanHe(DIR, ['baocaohoctap', 'dontra', 'hanhtrinh']);

// Vài bé đã ra trường ở nhóm c1 — chỗ duy nhất dựng được tình huống này.
taoBeRaTruong(DIR, 'c1', 3, '2025-05-31', 'ratruong');

const mk = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4080), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vaoQuanTri(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const QT = await vaoQuanTri('hieutruong', mk);
const CO = (await login('giaovien', '123456')).cookie;      // cô nhóm c1
const PH = (await login('phuhuynh', '123456')).cookie;      // mẹ bé s1 (nhóm c1)

const doc = (p) => fs.readFileSync(path.join(GOC, p), 'utf8');

try {
  // =========================================================================
  console.log('\n[0] Bối cảnh dựng được — nếu không thì mọi mục dưới xanh giả');
  {
    check('quản trị đăng nhập được', !!QT);
    check('cô đăng nhập được', !!CO);
    check('gia đình đăng nhập được', !!PH);
    const me = await req('GET', '/api/auth/me', { cookie: PH });
    check('gia đình có bé để xem', (me.data.students || []).length > 0,
      (me.data.students || []).length);
  }

  // =========================================================================
  console.log('\n[1] BÉ ĐÃ RA TRƯỜNG PHẢI CÓ ĐƯỜNG ĐỌC — không chỉ có đường API');
  {
    const r = await req('GET', '/api/schoolyear/alumni', { cookie: QT });
    check('máy chủ trả về bé đã ra trường', r.status === 200 && Array.isArray(r.data)
      && r.data.length >= 3, { status: r.status, so: (r.data || []).length });
    const be = (r.data || []).find(s => String(s.id).startsWith('ratruong'));
    check('mỗi dòng có đủ thứ để dựng bảng: tên, nhóm cuối, ngày rời trường',
      !!be && !!be.name && be.className !== undefined && !!be.leftAt, be);

    // Đây là nửa đã hỏng: đường API đúng, mà không màn hình nào gọi.
    const ad = doc('public/js/views/admin.js');
    check('MÀN QUẢN TRỊ THẬT SỰ GỌI /api/schoolyear/alumni',
      /\/api\/schoolyear\/alumni/.test(ad));
    check('và gọi nó từ tab Năm học, nơi chú thích ở routes/hocsinh-cu.js chỉ tới',
      /tabNamHoc[\s\S]{0,4000}?taiBeRaTruong/.test(ad));

    // Cô KHÔNG có đường này, và đó là cố ý — bé đã rời trường thì không còn
    // nhóm nào của cô nữa.
    const rc = await req('GET', '/api/schoolyear/alumni', { cookie: CO });
    check('cô đứng lớp không mở được danh sách bé ra trường', rc.status === 403,
      rc.status);

    // Chú thích ở tệp kia là thứ đã nói dối suốt: nó bảo "cô và quản trị đã có
    // đường riêng", trong khi cô thì không có, và đường của quản trị thì chưa
    // ai nối vào màn hình.
    const hc = doc('routes/hocsinh-cu.js');
    check('chú thích ở routes/hocsinh-cu.js không còn hứa hộ cho cô',
      !/Giáo viên và quản trị đã có đường riêng/.test(hc));
  }

  // =========================================================================
  console.log('\n[2] TẮT MỘT MẪU BÁO CÁO KHÔNG ĐƯỢC LÀ CỬA MỘT CHIỀU');
  {
    const tao = await req('POST', '/api/baocaohoctap/mau', {
      cookie: QT,
      body: {
        loai: 'thang', ten: 'Mẫu thử tắt bật', tuThang: 12, denThang: 72,
        dong: [{ nhom: 'I. TỰ PHỤC VỤ', tieuDe: 'Tự xúc ăn', kieu: 'muc' }],
      },
    });
    check('tạo được mẫu báo cáo', tao.status === 200 || tao.status === 201, tao.status);
    const mauId = (tao.data && (tao.data.mau ? tao.data.mau.id : tao.data.id)) || null;
    check('có mã mẫu để thao tác tiếp', !!mauId, tao.data);

    const tat = await req('PUT', `/api/baocaohoctap/mau/${mauId}`, {
      cookie: QT, body: { active: false },
    });
    check('tắt được mẫu', tat.status === 200, tat.status);

    const mac = await req('GET', '/api/baocaohoctap/mau', { cookie: QT });
    check('danh sách MẶC ĐỊNH giấu mẫu đã tắt — đúng như trước, không đổi',
      !(mac.data.mau || []).some(m => m.id === mauId));

    const het = await req('GET', '/api/baocaohoctap/mau?tatCa=1', { cookie: QT });
    const trongDs = (het.data.mau || []).find(m => m.id === mauId);
    check('nhưng xin CẢ mẫu đã tắt thì thấy lại', !!trongDs);
    check('và nó nói rõ đang tắt, để màn hình dán được nhãn',
      !!trongDs && trongDs.active === false, trongDs && trongDs.active);

    const bat = await req('PUT', `/api/baocaohoctap/mau/${mauId}`, {
      cookie: QT, body: { active: true },
    });
    check('bật lại được', bat.status === 200, bat.status);
    const sau = await req('GET', '/api/baocaohoctap/mau', { cookie: QT });
    check('bật xong thì mẫu về lại danh sách mặc định',
      (sau.data.mau || []).some(m => m.id === mauId));
    check('VÀ DÒNG BÊN TRONG MẪU CÒN NGUYÊN — tắt là ngưng dùng, không phải xoá',
      (await req('GET', `/api/baocaohoctap/mau/${mauId}`, { cookie: QT })).data.dong.length === 1);

    // Nửa còn lại nằm ở màn hình: máy chủ có `tatCa=1` từ đầu, nhưng màn hình
    // không bao giờ xin nó, nên nhà trường không có nút nào bật lại.
    const v = doc('modules/baocaohoctap/view.js');
    check('MÀN MẪU BÁO CÁO XIN CẢ MẪU ĐÃ TẮT', /baocaohoctap\/mau.*tatCa=1/.test(v));
    check('và chỗ CHỌN MẪU ĐỂ SOẠN vẫn lọc mẫu đang tắt ra',
      /mauHop\s*=\s*this\._mau\.filter\([\s\S]{0,120}?active/.test(v));

    // Đối chứng: mẫu đang tắt không được rơi vào danh sách cô dùng để soạn.
    await req('PUT', `/api/baocaohoctap/mau/${mauId}`, { cookie: QT, body: { active: false } });
    const cuaCo = await req('GET', '/api/baocaohoctap/mau', { cookie: CO });
    check('cô không thấy mẫu nhà trường đã tắt',
      !(cuaCo.data.mau || []).some(m => m.id === mauId));
  }

  // =========================================================================
  console.log('\n[3] NGƯỜI ĐÓN GIA ĐÌNH ĐÃ NGƯNG DÙNG THÌ KHÔNG GHI SỔ BẰNG HỌ');
  {
    const them = await req('POST', '/api/dontra/nguoi', {
      cookie: PH,
      body: { studentId: 's1', hoTen: 'Bà Nguyễn Thị Tám', quanHe: 'Bà nội', dienThoai: '0909000111' },
    });
    check('gia đình khai được người đón thường xuyên',
      them.status === 201 || them.status === 200, them.status);
    const nid = them.data && them.data.id;

    const ok = await req('POST', '/api/dontra/ghi', {
      cookie: CO,
      body: { studentId: 's1', nguonLoai: 'thuong-xuyen', nguonId: nid, luc: '16:30' },
    });
    check('đang dùng thì cô ghi sổ trả bé bình thường', ok.status === 200 || ok.status === 201,
      { status: ok.status, data: ok.data });

    const ngung = await req('PUT', `/api/dontra/nguoi/${nid}`, {
      cookie: PH, body: { dangDung: false },
    });
    check('gia đình ngưng dùng được', ngung.status === 200, ngung.status);

    // ĐÂY LÀ PHÉP KIỂM CHÍNH: danh sách cũ còn trong bộ nhớ trang của cô, nên
    // cô vẫn gửi lên đúng mã ấy. Máy chủ phải là chỗ nói không.
    const chan = await req('POST', '/api/dontra/ghi', {
      cookie: CO,
      body: { studentId: 's1', nguonLoai: 'thuong-xuyen', nguonId: nid, luc: '16:40' },
    });
    check('NGƯNG DÙNG RỒI THÌ MÁY CHỦ TỪ CHỐI, dù màn hình cũ vẫn gửi lên',
      chan.status === 400, { status: chan.status, data: chan.data });
    check('và lời từ chối nói tiếng của trường, có tên người, có đường ra',
      chan.status === 400 && /ngưng dùng/i.test(chan.data.error || '')
        && /Người khác/.test(chan.data.error || ''), chan.data);

    // GIỮ ĐƯỜNG RA CHO CÔ. Chặn mà không có lối khác là đẩy cô ra ngoài app.
    const khac = await req('POST', '/api/dontra/ghi', {
      cookie: CO,
      body: { studentId: 's1', nguonLoai: 'khac', nguoiDon: 'Bà Nguyễn Thị Tám', luc: '16:45' },
    });
    check('cô vẫn trả bé được bằng "Người khác" và ghi rõ tên',
      khac.status === 200 || khac.status === 201, { status: khac.status, data: khac.data });
  }

  // =========================================================================
  console.log('\n[4] CHỦ ĐỀ TUẦN SAU PHẢI TỚI ĐƯỢC GIA ĐÌNH');
  {
    const t = HOM_NAY();
    const thuHai = (ngay) => {
      const ms = Date.parse(`${ngay}T00:00:00Z`);
      const lui = (new Date(ms).getUTCDay() + 6) % 7;
      return new Date(ms - lui * 86400000).toISOString().slice(0, 10);
    };
    const tuanNay = thuHai(t);
    const tuanSau = new Date(Date.parse(`${tuanNay}T00:00:00Z`) + 7 * 86400000)
      .toISOString().slice(0, 10);

    const a = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO,
      body: {
        classId: 'c1', tuan: tuanNay, chuDe: 'Bàn tay của con',
        cungConONha: 'Cùng con rửa tay trước bữa cơm.',
      },
    });
    const b = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: CO,
      body: {
        classId: 'c1', tuan: tuanSau, chuDe: 'Cây trong vườn',
        cungConONha: 'Cuối tuần cho con tưới một chậu cây.',
      },
    });
    check('cô soạn được chủ đề tuần này', a.status === 200, a.status);
    check('cô soạn được chủ đề tuần sau', b.status === 200, b.status);

    const r = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH });
    check('gia đình đọc được chủ đề TUẦN NÀY — khoá cũ giữ nguyên hình dạng',
      r.status === 200 && r.data.chuDeTuan && r.data.chuDeTuan.chuDe === 'Bàn tay của con',
      r.data && r.data.chuDeTuan);
    check('GIA ĐÌNH ĐỌC ĐƯỢC CẢ CHỦ ĐỀ TUẦN SAU',
      !!r.data.chuDeTuanSau && r.data.chuDeTuanSau.chuDe === 'Cây trong vườn',
      r.data.chuDeTuanSau);
    check('kèm lời rủ chơi cuối tuần — chính thứ nhà cần đọc trước',
      !!r.data.chuDeTuanSau && /tưới một chậu cây/.test(r.data.chuDeTuanSau.cungConONha || ''));
    check('và màn hình của gia đình có chỗ hiện nó',
      /chuDeTuanSau/.test(doc('modules/hanhtrinh/view.js')));

    // Ranh giới không được nới ra theo: nhà khác vẫn không đọc được chủ đề của
    // nhóm không phải của con mình.
    const nha2 = (await login('ph.huong', '123456')).cookie;   // mẹ bé s7, nhóm c2
    const r2 = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: nha2 });
    check('nhà khác vẫn không mở được hồ sơ bé không phải con mình',
      r2.status === 403 || r2.status === 404, r2.status);
  }

  // =========================================================================
  console.log('\n[5] QUẢN TRỊ KHÔNG ĐƯỢC RƠI VÀO MÀN HÌNH CỦA GIA ĐÌNH');
  {
    for (const tep of ['public/js/views/surveys.js', 'public/js/views/medicine.js']) {
      const s = doc(tep);
      check(`${path.basename(tep)}: chia nhánh theo "không phải phụ huynh", không theo "là giáo viên"`,
        /role\s*!==\s*'parent'[\s\S]{0,120}?renderTeacher/.test(s));
      check(`${path.basename(tep)}: không còn nhánh cũ chỉ nhận 'teacher'`,
        !/role\s*===\s*'teacher'\s*\)\s*return this\.renderTeacher/.test(s));
    }

    // Điểm danh thì KHÁC, và khác có lý do: `nhomCuaCo` chỉ được đặt cho vai
    // 'teacher', nên đẩy quản trị vào màn của cô là đẩy vào một màn trống. Bài
    // này canh luôn để lần sau không ai "sửa cho đồng bộ".
    const dd = doc('public/js/views/attendance.js');
    check('Điểm danh CỐ Ý không đi theo — và có chú thích nói vì sao',
      /nhomCuaCo/.test(dd));
  }

  // =========================================================================
  console.log('\n[6] KHÔNG NÓI HỘ GIA ĐÌNH ĐIỀU APP KHÔNG BIẾT');
  {
    const dd = doc('public/js/views/attendance.js');
    check('màn Điểm danh KHÔNG còn nói "Gia đình đã thấy ảnh"',
      !/Gia đình đã thấy ảnh/.test(dd));
    check('mà nói đúng thứ app làm được: đã gửi đi', /Đã gửi cho gia đình/.test(dd));

    // Quét rộng: không tệp nào trong public/ được nói hộ gia đình chuyện "đã
    // xem / đã đọc / đã thấy" ảnh, vì không có bảng nào ghi việc đó.
    const lo = [];
    const quet = (thuMuc, sau = 0) => {
      for (const ten of fs.readdirSync(path.join(GOC, thuMuc))) {
        const duong = path.join(thuMuc, ten);
        if (fs.statSync(path.join(GOC, duong)).isDirectory()) {
          if (sau < 2) quet(duong, sau + 1);
          continue;
        }
        if (!ten.endsWith('.js')) continue;
        const noi = fs.readFileSync(path.join(GOC, duong), 'utf8');
        for (const d of noi.split('\n')) {
          if (/^\s*(\/\/|\*|\/\*)/.test(d)) continue;
          if (/Gia đình đã (thấy|xem|đọc) ảnh/.test(d)) lo.push(`${duong} → ${d.trim().slice(0, 70)}`);
        }
      }
    };
    quet('public/js');
    quet('modules');
    check('KHÔNG MÀN NÀO NÓI HỘ GIA ĐÌNH ĐÃ XEM ẢNH', lo.length === 0, lo);
  }

  // =========================================================================
  console.log('\n[7] PHÉP THỬ NGƯỢC — mấy mục dò theo mã nguồn có bắt được thật không');
  {
    const doNhanh = (ma) => /role\s*!==\s*'parent'[\s\S]{0,120}?renderTeacher/.test(ma);
    check('BẮT ĐƯỢC nhánh cũ chỉ nhận giáo viên',
      !doNhanh("if (App.state.user.role === 'teacher') return this.renderTeacher(root);"));
    check('nhận đúng nhánh đã sửa',
      doNhanh("if (App.state.user.role !== 'parent') return this.renderTeacher(root);"));

    const doAnh = (d) => !/^\s*(\/\/|\*|\/\*)/.test(d) && /Gia đình đã (thấy|xem|đọc) ảnh/.test(d);
    check('BẮT ĐƯỢC câu nói hộ gia đình', doAnh("  const t = 'Gia đình đã thấy ảnh';"));
    check('bắt được cả biến thể "đã xem ảnh"', doAnh("  const t = 'Gia đình đã xem ảnh';"));
    check('KHÔNG bắt nhầm câu nói đúng sự thật',
      !doAnh("  const t = 'Đã gửi cho gia đình';"));

    const doTatCa = (ma) => /baocaohoctap\/mau.*tatCa=1/.test(ma);
    check('BẮT ĐƯỢC màn hình quên xin mẫu đã tắt',
      !doTatCa("await API.get('/api/baocaohoctap/mau')"));
    check('nhận đúng màn hình đã xin',
      doTatCa("await API.get(`/api/baocaohoctap/mau${this.laQuanTri() ? '?tatCa=1' : ''}`)"));
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}

tongKet();
