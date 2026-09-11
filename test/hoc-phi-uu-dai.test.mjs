// Bài canh BẢNG THEO DÕI ƯU ĐÃI VÀ NHẮC HẠN (Đ169, ý 4 của trường).
//
// Chạy bằng:  npm run test:hoc-phi-uu-dai
//
// NHÀ TRƯỜNG XIN GÌ
//
// 07/09, mảng Học phí và Kế toán, ý (4): *"bảng theo dõi ưu đãi và nhắc báo
// hạn ưu đãi"*. Trước đợt này kho mã không có MỘT khái niệm ưu đãi nào — grep
// `uu-dai`, `giam-gia`, `mien-giam`, `discount` đều ra 0 kết quả.
//
// NĂM ĐIỀU CỐ Ý, CẢ NĂM CANH Ở ĐÂY
//
// [1] MÁY KHÔNG TỰ TRỪ TIỀN. Bảng ưu đãi là chỗ THEO DÕI và NHẮC, không phải
//     công thức tính tự động — cùng lập luận đã chốt ở DD-13. Tự trừ thì một
//     dòng khai sai là sai tiền của một nhà mà không ai đối chiếu ra, và kế
//     toán mất đúng chỗ để nhìn con số trước khi nó thành hoá đơn.
//
// [2] MỨC GHI ĐƯỢC CẢ HAI KIỂU — số tiền và phần trăm. Chủ dự án chốt 11/09,
//     kèm chấp nhận rằng kiểu phần trăm cần đúng MỘT dòng ngoại lệ có lý do
//     viết ra trong `test:quy-tac-4`.
//
// [3] BẢNG XẾP THEO TÊN BÉ, KHÔNG THEO MỨC ƯU ĐÃI. Xếp theo mức là sắp các bé
//     trên dưới nhau theo hoàn cảnh của cha mẹ chúng (QUY TẮC 4).
//
// [4] ĐẶT VÀ GỠ ƯU ĐÃI LÀ VIỆC CỦA NGƯỜI LO TIỀN — cùng chốt chặn với việc đặt
//     ra khoản thu (Đ163): đây cũng là quyết định về số tiền một nhà phải nộp,
//     chỉ khác dấu. Gỡ thì bắt buộc ghi lý do, và là NGƯNG DÙNG chứ không xoá.
//
// [5] NHẮC KHÔNG ĐƯỢC NHẮC HAI LẦN. Đồng hồ chạy 15 phút một lượt; một tin về
//     tiền lặp bốn lần mỗi giờ là cách nhanh nhất để người ta tắt hẳn thông báo.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, tatPhanHe, datChucVu, khoaVaoCoSo,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hoc-phi-uu-dai');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hocphi']);
const mkQT = taoQuanTri(DIR, 'Quản trị', 'uu_qt');
const mkKT = taoQuanTri(DIR, 'Kế toán', 'uu_kt');
const mkVP = taoQuanTri(DIR, 'Văn phòng', 'uu_vp');
datChucVu(DIR, 'uu_kt', 'ketoan');
datChucVu(DIR, 'uu_vp', 'vanphong-coso');

const CSDL = path.join(DIR, 'school.db');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4851), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

const ngayCong = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

try {
  const QT = await vao('uu_qt', mkQT);
  const KT = await vao('uu_kt', mkKT);
  const VP = await vao('uu_vp', mkVP);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Đặt ưu đãi — cả hai kiểu mức');
  {
    const tien = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT,
      body: { studentId: 's1', ten: 'Ưu đãi nhà có hai bé cùng học', kieu: 'so-tien', giaTri: 500000 },
    });
    check('kế toán đặt được ưu đãi ghi bằng SỐ TIỀN', tien.status === 201, `${tien.status} ${JSON.stringify(tien.data)}`);

    const pt = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT,
      body: { studentId: 's3', ten: 'Ưu đãi con cán bộ', kieu: 'phan-tram', giaTri: 10, denNgay: ngayCong(200) },
    });
    check('và đặt được ưu đãi ghi bằng PHẦN TRĂM', pt.status === 201, `${pt.status} ${JSON.stringify(pt.data)}`);

    const qua = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT, body: { studentId: 's1', ten: 'Sai', kieu: 'phan-tram', giaTri: 1000 },
    });
    check('phần trăm quá 100 bị chặn — gần như luôn là gõ nhầm', qua.status === 400, qua.data?.error);

    const kieuLa = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT, body: { studentId: 's1', ten: 'Sai', kieu: 'ty-le-vang', giaTri: 5 },
    });
    check('kiểu mức lạ bị chặn', kieuLa.status === 400, kieuLa.status);

    const am = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT, body: { studentId: 's1', ten: 'Sai', kieu: 'so-tien', giaTri: -5 },
    });
    check('mức âm bị chặn', am.status === 400, am.status);

    const nguoc = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT,
      body: { studentId: 's1', ten: 'Sai', kieu: 'so-tien', giaTri: 1000, tuNgay: ngayCong(30), denNgay: ngayCong(10) },
    });
    check('ngày hết hạn trước ngày bắt đầu bị chặn', nguoc.status === 400, nguoc.data?.error);

    const khongTen = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT, body: { studentId: 's1', kieu: 'so-tien', giaTri: 1000 },
    });
    check('thiếu tên ưu đãi thì từ chối, và gợi ý một ví dụ',
      khongTen.status === 400 && /ví dụ/i.test(khongTen.data?.error || ''), khongTen.data?.error);
  }

  // =========================================================================
  console.log('\n[2] Ai đặt và ai gỡ — cùng chốt chặn với việc đặt ra khoản thu');
  {
    const vp = await req('POST', '/api/hocphi/uu-dai', {
      cookie: VP, body: { studentId: 's1', ten: 'VP đặt', kieu: 'so-tien', giaTri: 1000 },
    });
    check('VĂN PHÒNG không đặt được ưu đãi — cũng là quyết định về tiền', vp.status === 403, vp.status);
    const co = await req('POST', '/api/hocphi/uu-dai', {
      cookie: GV, body: { studentId: 's1', ten: 'Cô đặt', kieu: 'so-tien', giaTri: 1000 },
    });
    check('CÔ càng không', co.status === 403, co.status);

    const qt = await req('POST', '/api/hocphi/uu-dai', {
      cookie: QT, body: { studentId: 's4', ten: 'QT đặt', kieu: 'so-tien', giaTri: 200000 },
    });
    check('quản trị chưa khai chức vụ vẫn đặt được', qt.status === 201, qt.status);

    // GỠ: ngưng dùng chứ không xoá, và bắt buộc ghi lý do.
    const khongLyDo = await req('POST', `/api/hocphi/uu-dai/${qt.data.id}/go`, { cookie: KT, body: {} });
    check('gỡ mà không ghi lý do thì bị chặn', khongLyDo.status === 400, khongLyDo.data?.error);

    const go = await req('POST', `/api/hocphi/uu-dai/${qt.data.id}/go`, {
      cookie: KT, body: { lyDo: 'gia đình thôi học' },
    });
    check('gỡ được khi có lý do', go.status === 200, go.status);

    const lai = await req('POST', `/api/hocphi/uu-dai/${qt.data.id}/go`, {
      cookie: KT, body: { lyDo: 'lần hai' },
    });
    check('gỡ lần hai bị chặn', lai.status === 400, lai.status);

    const con = await req('GET', '/api/hocphi/uu-dai?studentId=s4', { cookie: KT });
    check('ưu đãi đã gỡ biến khỏi danh sách của bé', (con.data?.uuDai || []).length === 0, con.data?.uuDai);

    // NGƯNG DÙNG CHỨ KHÔNG XOÁ — dòng gốc còn nguyên trong bảng làm chứng từ.
    const conn = new Database(CSDL);
    const v = conn.prepare('SELECT COUNT(*) AS n FROM hocphi_uudai WHERE id = ?').get(qt.data.id);
    const g = conn.prepare('SELECT * FROM hocphi_uudai_go WHERE uuDaiId = ?').get(qt.data.id);
    conn.close();
    check('DÒNG GỐC vẫn còn trong bảng — gỡ là ngưng dùng, không phải xoá', v.n === 1, v);
    check('và sổ ghi lại ai gỡ, lúc nào, vì sao',
      g && g.lyDo === 'gia đình thôi học' && !!g.luc && !!g.boiUserId, g);
  }

  // =========================================================================
  console.log('\n[3] Bảng theo dõi — xếp theo TÊN BÉ, và đánh dấu hạn');
  {
    // Dựng ba mốc hạn: đã quá, sắp tới, và còn xa.
    await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT, body: { studentId: 's5', ten: 'Sắp hết hạn', kieu: 'so-tien', giaTri: 300000, denNgay: ngayCong(5) },
    });
    await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT, body: { studentId: 's6', ten: 'Còn xa', kieu: 'so-tien', giaTri: 300000, denNgay: ngayCong(300) },
    });
    // Quá hạn: máy chủ không cho đặt ngày quá khứ qua API nên ghi thẳng vào sổ.
    const conn = new Database(CSDL);
    conn.prepare(`INSERT INTO hocphi_uudai (id, studentId, ten, kieu, giaTri, denNgay, taoLuc)
                  VALUES ('uu_qua', 's4', 'Đã quá hạn', 'so-tien', 100000, ?, ?)`)
      .run(ngayCong(-30), new Date().toISOString());
    conn.close();

    const b = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: KT });
    check('kế toán mở được bảng', b.status === 200 && Array.isArray(b.data?.bang), b.status);
    check('bảng chỉ liệt kê bé CÓ ưu đãi', (b.data.bang || []).every(x => x.uuDai.length > 0),
      (b.data.bang || []).map(x => x.uuDai.length));

    const ten = b.data.bang.map(x => x.tenBe);
    const xep = [...ten].sort((a, c) => String(a).localeCompare(String(c), 'vi'));
    check('BÉ xếp theo TÊN, không theo mức ưu đãi', JSON.stringify(ten) === JSON.stringify(xep), ten);
    // Đối chứng: phải có bé lệch mức, nếu không phép so trên vô nghĩa.
    const mucs = b.data.bang.flatMap(x => x.uuDai).map(u => u.giaTri);
    check('đối chứng — các mức ưu đãi KHÔNG bằng nhau, nên phép so trên có nghĩa',
      new Set(mucs).size > 1, mucs);

    const tatCa = b.data.bang.flatMap(x => x.uuDai);
    check('ưu đãi quá hạn được đánh dấu', tatCa.some(u => u.ten === 'Đã quá hạn' && u.hetHan === true),
      tatCa.filter(u => u.hetHan).map(u => u.ten));
    check('ưu đãi SẮP hết hạn được đánh dấu — và đây là thứ không sống nhờ đồng hồ',
      tatCa.some(u => u.ten === 'Sắp hết hạn' && u.sapHetHan === true),
      tatCa.filter(u => u.sapHetHan).map(u => u.ten));
    check('ưu đãi còn hạn xa thì KHÔNG bị đánh dấu',
      tatCa.some(u => u.ten === 'Còn xa' && !u.sapHetHan && !u.hetHan),
      tatCa.map(u => `${u.ten}:${u.sapHetHan}/${u.hetHan}`));

    check('bảng nói rõ nhắc trước bao nhiêu ngày', b.data.nhacTruocNgay > 0, b.data.nhacTruocNgay);

    const co = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: GV });
    check('CÔ không mở được bảng ưu đãi', co.status === 403, co.status);
    const ph = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: PH });
    check('gia đình không mở được — quyết định ai đọc được ưu đãi là của nhà trường',
      ph.status === 403, ph.status);
    const phBe = await req('GET', '/api/hocphi/uu-dai?studentId=s1', { cookie: PH });
    check('và cũng không xem được ưu đãi của chính con mình trong đợt này',
      phBe.status === 403, phBe.status);
  }

  // =========================================================================
  console.log('\n[4] Nhắc hạn — và KHÔNG nhắc hai lần');
  {
    const demDaNhac = () => {
      const c = new Database(CSDL);
      try {
        return c.prepare('SELECT id, ten, daNhacLuc FROM hocphi_uudai WHERE daNhacLuc IS NOT NULL').all();
      } finally { c.close(); }
    };
    check('trước khi đồng hồ quét thì chưa ưu đãi nào được đánh dấu đã nhắc',
      demDaNhac().length === 0, demDaNhac().map(x => x.ten));

    // Đồng hồ QUÉT NGAY lúc máy chủ lên (lib/hen-gio.js: `if (chayNgay) chay()`),
    // nên khởi động lại là cách đo thật việc định giờ — đúng kỹ thuật bài canh
    // của Đ154 đã dùng. Gọi thẳng lib/hen-gio trong tiến trình test thì vô
    // nghĩa: việc được đăng ký ở tiến trình của máy chủ, không phải ở đây.
    await sv.khoiDongLai();
    const lan1 = demDaNhac();
    check('máy chủ lên là đồng hồ quét: ưu đãi SẮP hết hạn được đánh dấu đã nhắc',
      lan1.some(x => x.ten === 'Sắp hết hạn'), lan1.map(x => x.ten));
    check('ưu đãi còn hạn xa KHÔNG bị nhắc', !lan1.some(x => x.ten === 'Còn xa'), lan1.map(x => x.ten));
    check('ưu đãi ĐÃ QUÁ hạn cũng không nhắc — nhắc trước thì còn kịp làm gì, quá rồi thì nằm ở bảng',
      !lan1.some(x => x.ten === 'Đã quá hạn'), lan1.map(x => x.ten));

    await sv.khoiDongLai();
    const lan2 = demDaNhac();
    check('QUÉT LẠI KHÔNG NHẮC THÊM LẦN NÀO — cột daNhacLuc là chốt chặn',
      lan2.length === lan1.length, { lan1: lan1.length, lan2: lan2.length });
    check('và dấu thời gian của lần nhắc đầu KHÔNG bị ghi đè',
      JSON.stringify(lan1.map(x => x.daNhacLuc).sort())
      === JSON.stringify(lan2.map(x => x.daNhacLuc).sort()),
      { lan1: lan1.map(x => x.daNhacLuc), lan2: lan2.map(x => x.daNhacLuc) });

    // Đối chứng: phép kiểm trên chỉ có nghĩa nếu lượt đầu THẬT SỰ nhắc được ai.
    check('đối chứng — lượt quét đầu có nhắc ít nhất một ưu đãi', lan1.length >= 1, lan1.length);

    // TẮT PHÂN HỆ THÌ ĐỒNG HỒ PHẢI IM. Việc định giờ được đăng ký lúc nạp phân
    // hệ và ở lại trong đồng hồ; nhà trường tắt Học phí xong mà tin nhắc hạn
    // vẫn đẩy về điện thoại quản lý thì công tắc kia coi như không có tác dụng.
    const c1 = new Database(CSDL);
    c1.prepare(`INSERT INTO hocphi_uudai (id, studentId, ten, kieu, giaTri, denNgay, taoLuc)
                VALUES ('uu_tat', 's1', 'Đặt lúc phân hệ sắp tắt', 'so-tien', 50000, ?, ?)`)
      .run(ngayCong(3), new Date().toISOString());
    c1.close();
    tatPhanHe(DIR, ['hocphi']);
    await sv.khoiDongLai();
    const khiTat = demDaNhac();
    check('PHÂN HỆ TẮT: đồng hồ chạy nhưng KHÔNG nhắc ưu đãi mới nào',
      !khiTat.some(x => x.ten === 'Đặt lúc phân hệ sắp tắt'), khiTat.map(x => x.ten));

    batPhanHe(DIR, ['hocphi']);
    await sv.khoiDongLai();
    const batLai = demDaNhac();
    check('bật lại thì lượt quét kế tiếp nhắc ngay, không mất tin',
      batLai.some(x => x.ten === 'Đặt lúc phân hệ sắp tắt'), batLai.map(x => x.ten));
  }

  // =========================================================================
  console.log('\n[4b] Ai ĐỌC được bảng ưu đãi — lỗi rà soát đối kháng bắt được');
  {
    // Hai đường đọc ưu đãi nằm dưới tiền tố `/api/hocphi`, mà tiền tố ấy có
    // trong phần việc của Văn phòng cơ sở. Bản đầu chỉ đòi `requireRole('admin')`
    // nên văn phòng đọc được bảng hoàn cảnh tiền bạc của mọi bé trong cơ sở —
    // trong khi chú thích của chính Đ169 chốt là mặc định ĐÓNG.
    const vpBang = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: VP });
    check('VĂN PHÒNG không mở được bảng ưu đãi', vpBang.status === 403, vpBang.status);
    const vpBe = await req('GET', '/api/hocphi/uu-dai?studentId=s1', { cookie: VP });
    check('và cũng không xem được ưu đãi của một bé', vpBe.status === 403, vpBe.status);
    check('câu từ chối nói rõ họ vẫn xem được sổ tiền từng bé',
      /sổ tiền/i.test(vpBe.data?.error || ''), vpBe.data?.error);

    // Nhưng người NHẬN TIN nhắc hạn phải mở được — không thì tin dẫn tới một
    // màn hình họ không vào được.
    const mkQL = taoQuanTri(DIR, 'Quản lý cơ sở', 'uu_ql');
    datChucVu(DIR, 'uu_ql', 'quanly-coso');
    await sv.khoiDongLai();
    const QL = await vao('uu_ql', mkQL);
    const qlBang = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: QL });
    check('QUẢN LÝ CƠ SỞ — người nhận tin nhắc hạn — thì mở được',
      qlBang.status === 200, `${qlBang.status} ${JSON.stringify(qlBang.data).slice(0, 120)}`);

    // Và văn phòng VẪN đọc được sổ tiền từng bé — siết đúng chỗ, không siết lan.
    const vpTien = await req('GET', '/api/hocphi?studentId=s1', { cookie: VP });
    check('đối chứng — văn phòng VẪN đọc được sổ tiền của bé', vpTien.status === 200, vpTien.status);
  }

  // =========================================================================
  console.log('\n[4c] Con số trên ô Học phí và cánh cửa mở nó ra — cùng một câu');
  {
    // LỖI RÀ SOÁT ĐỐI KHÁNG BẮT ĐƯỢC, ba người phản bác đều xác nhận.
    //
    // Văn phòng cơ sở CÓ ô Học phí (họ ghi sổ và xác nhận đã nộp), nên huy hiệu
    // của phân hệ hocphi hiện lên máy họ. Nhưng hàm đếm chỉ hỏi `role === 'admin'`
    // mà quên hỏi `docUuDaiDuoc` — thứ đang gác cả bốn đường ưu đãi lẫn nút
    // "Ưu đãi" trong view. Hậu quả: ô Học phí của văn phòng hiện một con số đỏ
    // mà TRONG APP KHÔNG CÓ MÀN NÀO mở ra để xử lý, và cũng không có cách nào
    // cho nó về 0 — nó nằm đó tới khi hạn trôi quá cận dưới 30 ngày.
    //
    // Một con số đỏ không bấm được là thứ dạy người dùng thôi nhìn huy hiệu.
    // Luật ở đây: AI ĐẾM ĐƯỢC thì phải MỞ ĐƯỢC, và cả hai do cùng một câu quyết.
    const huy = async (cookie) =>
      Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.hocphi || 0);

    const QL2 = (await login('uu_ql', 'quantri2026')).cookie;
    const nKT = await huy(KT);
    const nQL = await huy(QL2);
    const nVP = await huy(VP);

    check('KẾ TOÁN vẫn thấy con số ưu đãi sắp hết hạn', nKT > 0, nKT);
    check('QUẢN LÝ CƠ SỞ cũng thấy — họ là người nhận tin nhắc hạn', nQL > 0, nQL);
    check('VĂN PHÒNG KHÔNG thấy con số họ không mở ra được', nVP === 0, nVP);

    // Đối chứng: siết đúng chỗ, không siết lan — ô Học phí của văn phòng vẫn
    // còn, và họ vẫn ghi sổ được như cũ.
    const vpOn = await req('GET', '/api/hocphi?studentId=s1', { cookie: VP });
    check('đối chứng — văn phòng VẪN dùng được phần Học phí của họ', vpOn.status === 200, vpOn.status);

    // Và canh ở tầng mã: hàm đếm phải hỏi ĐÚNG cái chốt đang gác các đường HTTP,
    // không phải chép lại một danh sách chức vụ thứ hai rồi để hai bên lệch nhau.
    const rr = fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8');
    const iH = rr.indexOf("huyHieu.dangKy('hocphi'");
    // Bỏ dòng chú thích trước khi soi, để một câu chú thích nhắc tên hàm không
    // tự làm bài canh này xanh.
    const than = rr.slice(iH, rr.indexOf('\n  });', iH))
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('hàm đếm gọi CHÍNH chốt đang gác các đường ưu đãi, không chép danh sách thứ hai',
      /docUuDaiDuoc\(user\)/.test(than) && !/CHUC_VU_DOC_UU_DAI/.test(than), than.slice(0, 200));
  }

  // =========================================================================
  console.log('\n[4d] Bé chưa xếp nhóm, và ô "Từ ngày" phải nói được ra màn hình');
  {
    // (1) HUY HIỆU VÀ BẢNG PHẢI NHÌN CÙNG MỘT DANH SÁCH BÉ.
    //
    // Huy hiệu đếm theo phạm vi của tài khoản, còn bảng đi vòng qua nhóm lớp —
    // nên ưu đãi của một bé chưa xếp nhóm được ĐẾM mà không hiện ở đâu để gỡ.
    // Kế toán thấy số đỏ, mở bảng ra thì không có dòng nào: một con số không
    // bấm được, đúng họ lỗi với mục [4c].
    const conn = new Database(CSDL);
    conn.prepare(`INSERT INTO students (id, code, name, dob, gender, classId, active, createdAt)
                  VALUES ('s_treo2', 'TREO2', 'Bé Treo Ưu Đãi', '2023-06-06', 'Nam', NULL, 1, ?)`)
      .run(new Date().toISOString());
    conn.close();

    const dat = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT,
      body: { studentId: 's_treo2', ten: 'Ưu đãi của bé chưa xếp nhóm', kieu: 'so-tien', giaTri: 400000, denNgay: ngayCong(5) },
    });
    check('đặt được ưu đãi cho bé chưa xếp nhóm', dat.status === 201, `${dat.status} ${JSON.stringify(dat.data)}`);

    const b = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: KT });
    const dong = (b.data?.bang || []).find(x => x.studentId === 's_treo2');
    check('BẢNG ƯU ĐÃI CÓ bé chưa xếp nhóm — thứ huy hiệu đang đếm thì bảng phải mở ra được',
      !!dong, (b.data?.bang || []).map(x => x.studentId));
    check('và nói rõ bé ấy chưa xếp nhóm chứ không để trống',
      dong?.tenNhom === 'Chưa xếp nhóm', dong?.tenNhom);

    // (2) "TỪ NGÀY" ĐANG CÂM. Biểu mẫu có ô, máy chủ lưu, mà không màn nào hiện
    // — kế toán đặt ưu đãi "từ tháng sau" rồi nhìn bảng thấy nó nằm đó y như
    // một ưu đãi đang chạy, và trừ tiền sớm cả học kỳ. Máy VẪN không tự trừ,
    // nhưng nó phải nói thật là dòng này chưa tới ngày áp dụng.
    const sau = await req('POST', '/api/hocphi/uu-dai', {
      cookie: KT,
      body: {
        studentId: 's6', ten: 'Ưu đãi bắt đầu từ học kỳ sau', kieu: 'so-tien', giaTri: 200000,
        tuNgay: ngayCong(60), denNgay: ngayCong(200),
      },
    });
    check('đặt được ưu đãi có ngày bắt đầu ở tương lai', sau.status === 201, sau.status);

    const b2 = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: KT });
    const u = (b2.data?.bang || []).flatMap(x => x.uuDai).find(x => x.id === sau.data?.id);
    check('bảng trả về ngày bắt đầu của ưu đãi', !!u && !!u.tuNgay, u);
    check('VÀ NÓI RÕ NÓ CHƯA TỚI NGÀY ÁP DỤNG', u?.chuaHieuLuc === true, u);

    const dangChay = (b2.data?.bang || []).flatMap(x => x.uuDai).find(x => !x.tuNgay);
    check('đối chứng — ưu đãi không đặt ngày bắt đầu thì KHÔNG bị đánh dấu chưa hiệu lực',
      dangChay ? dangChay.chuaHieuLuc === false : false, dangChay);

    const v = fs.readFileSync(path.join(GOC, 'modules/hocphi/view.js'), 'utf8')
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('màn hình IN RA ngày bắt đầu', /từ \$\{UI\.esc\(UI\.fmtDateShort\(u\.tuNgay\)\)\}/.test(v), 'view.js');
    check('và có nhãn riêng cho dòng chưa tới ngày áp dụng',
      /u\.chuaHieuLuc \? UI\.badge\('Chưa tới ngày áp dụng'/.test(v), 'view.js');
  }

  // =========================================================================
  console.log('\n[4e] Huy hiệu đếm bằng MỘT câu hỏi, không nạp cả trường');
  {
    // Bản đầu gọi `db.studentsOf(user)` — nạp trọn hồ sơ mọi bé trong phạm vi
    // rồi mới hỏi một câu đếm. Hàm này chạy ở MỖI lần mở trang chủ, của MỖI
    // tài khoản quản trị, để trả về một con số gần như luôn bằng 0: cái giá đi
    // theo SĨ SỐ TOÀN TRƯỜNG chứ không theo số việc đang chờ.
    //
    // Đổi cách đếm thì phải chứng minh PHẠM VI KHÔNG ĐỔI — đó mới là phần dễ
    // hỏng. Bé chưa xếp nhóm không thuộc cơ sở nào, nên Cấp 1 đếm còn Cấp 3
    // thì không, y như `db.canAccessStudent` vẫn trả lời từ trước.
    const r = fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8');
    const iH = r.indexOf("huyHieu.dangKy('hocphi'");
    const than = r.slice(iH, r.indexOf('\n  });', iH))
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('hàm đếm KHÔNG còn nạp danh sách bé vào bộ nhớ', !/studentsOf/.test(than), than.slice(0, 200));
    check('mà hỏi thẳng bằng một câu đếm', /SELECT COUNT\(\*\)/.test(than), than.slice(0, 200));

    const huy = async (cookie) =>
      Number((await req('GET', '/api/dashboard/badges', { cookie })).data?.hocphi || 0);
    const nKT = await huy(KT);
    check('kế toán toàn trường ĐẾM CẢ ưu đãi của bé chưa xếp nhóm', nKT > 0, nKT);

    const mkQL2 = taoQuanTri(DIR, 'Quản lý CS2', 'uu_ql2');
    datChucVu(DIR, 'uu_ql2', 'quanly-coso');
    khoaVaoCoSo(DIR, 'uu_ql2', 'cs2');
    await sv.khoiDongLai();
    const QL2 = await vao('uu_ql2', mkQL2);
    const bangQL2 = await req('GET', '/api/hocphi/uu-dai/bang', { cookie: QL2 });
    const demQL2 = (bangQL2.data?.bang || []).flatMap(x => x.uuDai).length;
    check('QUẢN LÝ CƠ SỞ 2 không thấy bé chưa xếp nhóm trong bảng',
      !(bangQL2.data?.bang || []).some(x => x.studentId === 's_treo2'),
      (bangQL2.data?.bang || []).map(x => x.studentId));
    check('SỐ TRÊN Ô KHÔNG BAO GIỜ LỚN HƠN SỐ DÒNG MỞ RA ĐƯỢC',
      (await huy(QL2)) <= demQL2, { huyHieu: await huy(QL2), dongTrongBang: demQL2 });
  }

  // =========================================================================
  console.log('\n[5] Máy KHÔNG tự trừ tiền, và màn hình nói thẳng điều đó');
  {
    // Khoản thu của bé có ưu đãi vẫn giữ nguyên số tiền đã ghi.
    const tao = await req('POST', '/api/hocphi', {
      cookie: KT,
      body: { studentId: 's1', kyThu: 'Tháng 9/2026', noiDung: 'Học phí tháng 9', soTien: 3000000 },
    });
    check('ghi được một khoản cho bé đang có ưu đãi', tao.status === 201, tao.status);
    const ds = await req('GET', '/api/hocphi?studentId=s1', { cookie: KT });
    const k = (ds.data?.khoan || []).find(x => x.noiDung === 'Học phí tháng 9');
    check('SỐ TIỀN CỦA KHOẢN KHÔNG BỊ MÁY TỰ TRỪ — bảng ưu đãi để theo dõi, không phải công thức',
      k && k.soTien === 3000000, k?.soTien);

    const v = fs.readFileSync(path.join(GOC, 'modules/hocphi/view.js'), 'utf8');
    check('màn hình nói thẳng là máy không tự trừ tiền', /không tự trừ tiền/.test(v), 'view.js');
    check('và mức ưu đãi in ra được cả hai kiểu',
      /phan-tram/.test(v) && /toLocaleString\('vi-VN'\)/.test(v), 'view.js');

    // Ngoại lệ QUY TẮC 4 phải CÓ LÝ DO viết ra, và chừa đúng một dòng.
    const q4 = fs.readFileSync(path.join(GOC, 'test/quy-tac-4.test.mjs'), 'utf8');
    const i = q4.indexOf("tep: 'modules/hocphi/view.js'");
    check('ngoại lệ QUY TẮC 4 cho mức phần trăm có mặt', i > 0, i);
    const khoi = q4.slice(i, i + 1200);
    check('và nói rõ lý do', /vi_sao/.test(khoi) && /TIỀN NGƯỜI LỚN NỘP/.test(khoi), khoi.slice(0, 120));
    check('ghi rõ chủ dự án đã duyệt, ngày nào', /CHỦ DỰ ÁN ĐÃ DUYỆT 11\/09/.test(khoi), 'quy-tac-4');
    check('và chừa ĐÚNG MỘT DÒNG, không chừa cả tệp', /chiDong:/.test(khoi), khoi.slice(0, 120));

    // HUY HIỆU PHẢI CÓ CẬN DƯỚI. Bản đầu chỉ có trần, nên mọi ưu đãi đã hết hạn
    // từ bao giờ vẫn được đếm mãi — cuối năm học 80 ưu đãi cùng hết hạn là sang
    // tháng 6 ô Học phí hiện một con số đỏ không bao giờ về 0, và một con số
    // như vậy thì người ta thôi nhìn nó.
    const r = fs.readFileSync(path.join(GOC, 'modules/hocphi/routes.js'), 'utf8');
    const iHuy = r.indexOf("huyHieu.dangKy('hocphi'");
    const thanHuy = r.slice(iHuy, r.indexOf('\n  });', iHuy));
    check('huy hiệu đếm có CẢ TRẦN LẪN SÀN, không đếm ưu đãi đã quá hạn từ lâu',
      /denNgay <= \? AND (u\.)?denNgay >= \?/.test(thanHuy), thanHuy.slice(0, 200));

    // ĐỢT GHI SỔ HÀNG LOẠT PHẢI NẰM TRONG MỘT GIAO DỊCH.
    const iDot = r.indexOf("app.post('/api/hocphi/hang-loat'");
    const thanDot = r.slice(iDot, r.indexOf("\n  });", iDot));
    check('cả đợt ghi sổ nằm trong db.tx — đứt nửa chừng không để lại tiền mồ côi',
      /db\.tx\(\(\) => \{/.test(thanDot), 'routes.js');

    // TIN ĐẨY KHÔNG NÊU TÊN ƯU ĐÃI. Tên ưu đãi là chữ tự do, kế toán rất có thể
    // gõ hoàn cảnh của nhà vào đó; tin đẩy hiện trên MÀN HÌNH KHOÁ điện thoại.
    const iQuet = r.indexOf('function quetHanUuDai');
    const thanQuet = r.slice(iQuet, r.indexOf('\n  }', iQuet));
    check('tin nhắc hạn KHÔNG mang tên ưu đãi ra màn hình khoá',
      !/\$\{u\.ten\}/.test(thanQuet), thanQuet.slice(0, 300));
    check('và bé đã nghỉ học thì thôi nhắc', /active === false \|\| be\.active === 0/.test(thanQuet), 'routes.js');
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Bảng theo dõi ưu đãi và nhắc hạn (Đ169)');
