// Bài canh BỐN ĐIỂM NHÀ TRƯỜNG GIAO TỰ QUYẾT (Đ204 — việc 48).
//
// Chạy bằng:  npm run test:bon-diem-truong-giao
//
// Bốn điểm này cố ý để lại từ GĐ 1 và GĐ 2, chờ trường dùng thật rồi quyết.
// Nay quyết: MỘT điểm MỞ, BA điểm GIỮ NGUYÊN.
//
// VÌ SAO BA ĐIỂM "GIỮ NGUYÊN" CŨNG CẦN BÀI CANH — đây là phần đáng đọc nhất.
//
// Một quyết định "không làm" không để lại dấu vết nào trong mã. Sáu tháng nữa
// người tiếp quản đọc màn hình, thấy thiếu, và dựng nó lên trong mười phút vì
// trông như một chỗ bỏ sót. Ba điểm dưới đây không phải chỗ bỏ sót: chúng là
// QUY TẮC 2 và QUY TẮC 4 của CLAUDE.md nói ra thành màn hình cụ thể. Nên mỗi
// điểm được ghim bằng một phép kiểm, và ngày ai đó dựng nó lên thì bài này đỏ
// và bắt người ấy đọc lại lý do trước.
//
//   (1) Y3-b    — MỞ: gia đình xem được bảng tiền ăn theo tháng của con.
//   (2) Y5-c    — GIỮ: uỷ quyền đón một lần không cần văn phòng duyệt.
//   (3) GĐ2-C-b — GIỮ: gia đình KHÔNG xem kế hoạch tháng của con (QUY TẮC 2).
//   (4) GĐ2-D-b — GIỮ: KHÔNG đếm bao nhiêu gia đình đã đọc tờ Cambridge.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, GOC, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('bon-diem-truong-giao');
sinhDuLieu(DIR);
batPhanHe(DIR, ['tienan', 'dontra', 'kehoachbe', 'cambridge', 'diemdanh', 'xinphep']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng D', 'd_qt');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4819), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
// NGÀY VÀ THÁNG THEO GIỜ VIỆT NAM, không phải UTC.
//
// `new Date().toISOString()` lệch 7 tiếng, nên suốt buổi sáng giờ Việt Nam nó
// còn trả về NGÀY HÔM TRƯỚC — và bài canh sẽ dựng đơn nghỉ vào một tháng khác
// với tháng nó đi đọc, rồi đỏ mà không ai hiểu vì sao. Bộ canh `test:mot-hom-nay`
// bắt được đúng chỗ này khi bài vừa viết xong.
const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);

try {
  const d0 = await login('d_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('d_qt', 'quantri2026')).cookie;
  const CO = (await login('giaovien', '123456')).cookie;       // cô của c1
  const PH = (await login('phuhuynh', '123456')).cookie;       // p1 — s1 (c1), s2 (c2)
  const PH3 = (await login('ph.lan', '123456')).cookie;        // p4 — s5 (c1)

  // =========================================================================
  console.log('\n[1] Y3-b MỞ — gia đình xem được bảng tiền ăn theo tháng của con');
  {
    // DỰNG MỘT ĐƠN HOÀN THẬT TRƯỚC ĐÃ, KÈM GHI CHÚ NỘI BỘ CỦA VĂN PHÒNG.
    //
    // Không có bước này thì `donHoan` rỗng, và mọi phép kiểm "không lộ ghi chú
    // nội bộ" bên dưới xanh nguyên vì KHÔNG CÓ GÌ ĐỂ LỘ. Thử ngược đã chứng
    // minh đúng chỗ này: bản đầu của bài trả thẳng cả `donHoan` gốc ra cho gia
    // đình mà bài vẫn xanh — một phép kiểm phủ định quét vào chỗ rỗng.
    const don = await req('POST', '/api/leave', {
      cookie: PH, body: { studentId: 's1', fromDate: NGAY, toDate: NGAY, reason: 'Con bị sốt' },
    });
    check('đối chứng — gửi được một đơn xin nghỉ', don.status === 200 || don.status === 201,
      `${don.status} ${JSON.stringify(don.data).slice(0, 140)}`);
    const duyet = await req('POST', `/api/leave/${don.data.id}/review`, {
      cookie: QT,
      body: { status: 'approved', hoanTienAn: 'co', soNgayHoan: 1,
        ghiChuHoan: 'NOIBO-me-xin-giam-vi-bo-mat-viec' },
    });
    check('đối chứng — văn phòng duyệt kèm hoàn tiền ăn và một ghi chú nội bộ',
      duyet.status === 200, `${duyet.status} ${JSON.stringify(duyet.data).slice(0, 140)}`);

    const d = await req('GET', `/api/tienan/cua-be?studentId=s1&thang=${THANG}`, { cookie: PH });
    check('gia đình mở được bảng tiền ăn của CON MÌNH', d.status === 200,
      `${d.status} ${JSON.stringify(d.data).slice(0, 160)}`);
    check('bảng nói đúng tên bé và nhóm', d.data?.be?.id === 's1' && !!d.data?.be?.hoTen,
      JSON.stringify(d.data?.be || {}));
    for (const k of ['soNgayAnOTruong', 'soNgayVangCoPhep', 'soNgayVangKhongPhep',
      'soNgayTruongNghi', 'soNgayHoanTienAn']) {
      check(`có con số "${k}"`, typeof d.data?.[k] === 'number', d.data?.[k]);
    }

    // NHÀ VÀ TRƯỜNG PHẢI RA CÙNG MỘT CON SỐ.
    //
    // Một bảng đối chiếu mà hai bên ra hai số còn tệ hơn không có bảng: nhà gọi
    // lên hỏi, kế toán mở màn của mình ra thấy số khác, và không ai biết số nào
    // đúng. Đo thẳng bằng cách so hai đường.
    const bangTruong = await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: QT });
    check('đối chứng — bảng của trường đọc được', bangTruong.status === 200, bangTruong.status);
    const dongTruong = (bangTruong.data?.danhSach || []).find(x => x.studentId === 's1');
    check('đối chứng — bảng của trường có dòng của bé này', !!dongTruong,
      (bangTruong.data?.danhSach || []).map(x => x.studentId));
    const lech = ['soNgayAnOTruong', 'soNgayVangCoPhep', 'soNgayVangKhongPhep',
      'soNgayTruongNghi', 'soNgayHoanTienAn']
      .filter(k => d.data[k] !== dongTruong[k])
      .map(k => `${k}: nhà ${d.data[k]} ≠ trường ${dongTruong[k]}`);
    check('NHÀ VÀ TRƯỜNG RA ĐÚNG CÙNG MỘT CON SỐ ở cả năm ô', lech.length === 0, lech);

    // BA THỨ CỦA BẢNG TRƯỜNG KHÔNG ĐƯỢC ĐI RA NGOÀI.
    const chuoi = JSON.stringify(d.data || {});
    check('đối chứng — bảng của nhà CÓ ít nhất một đơn hoàn để mà lộ',
      (d.data?.donHoan || []).length > 0, d.data?.donHoan);
    check('đối chứng — chính đơn ấy ở bảng của TRƯỜNG có mang ghi chú nội bộ',
      (dongTruong.donHoan || []).some(x => /NOIBO-/.test(String(x.ghiChu || ''))),
      (dongTruong.donHoan || []).map(x => x.ghiChu));
    check('KHÔNG kèm ghi chú nội bộ của văn phòng về nhà này',
      !/ghiChu/.test(chuoi), (chuoi.match(/.{0,40}ghiChu.{0,40}/) || [])[0]);
    check('KHÔNG kèm mấy cờ sổ tay của kế toán',
      !/vatThang|trungLichNghi|soNgayBeCoMat|soNgayCoMatTrongDonHoan/.test(chuoi),
      (chuoi.match(/.{0,30}(vatThang|trungLichNghi|soNgayBeCoMat).{0,30}/) || [])[0]);
    check('và KHÔNG có tên hay số liệu của bất kỳ bé nào khác',
      !/Nguyễn Bảo Nam|Bùi Minh Thư|Trần Gia Hân|danhSach/.test(chuoi), chuoi.slice(0, 120));

    // NHÀ KHÁC THÌ KHÔNG.
    const trom = await req('GET', `/api/tienan/cua-be?studentId=s1&thang=${THANG}`, { cookie: PH3 });
    check('NHÀ KHÁC KHÔNG MỞ ĐƯỢC bảng tiền ăn của bé này', trom.status === 403, trom.status);
    const con2 = await req('GET', `/api/tienan/cua-be?studentId=s5&thang=${THANG}`, { cookie: PH3 });
    check('đối chứng — nhà ấy mở được bảng của chính con mình', con2.status === 200, con2.status);

    // Hai màn của TRƯỜNG vẫn đóng với gia đình — mở một cửa không phải mở cả nhà.
    const bang = await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: PH });
    check('gia đình VẪN KHÔNG mở được bảng đối chiếu cả trường', bang.status === 403, bang.status);
    const baoAn = await req('GET', '/api/tienan/bao-an', { cookie: PH });
    check('và VẪN KHÔNG mở được màn báo ăn của cô', baoAn.status === 403, baoAn.status);

    // Ô Tiền ăn phải HIỆN trên trang chủ của gia đình, không thì đường API này
    // là một cửa không lối vào.
    const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/tienan/module.json'), 'utf8'));
    check('phân hệ khai vai `parent` để ô hiện trên trang chủ gia đình',
      (mj.roles || []).includes('parent'), mj.roles);
    const view = fs.readFileSync(path.join(GOC, 'modules/tienan/view.js'), 'utf8');
    check('và màn hình có nhánh riêng cho gia đình, không đi vào màn của cô',
      /laGiaDinh\(\)/.test(view) && /manCuaBe/.test(view));
  }

  // =========================================================================
  console.log('\n[2] Y5-c GIỮ — uỷ quyền đón một lần KHÔNG cần văn phòng duyệt');
  {
    // QUYẾT: GIỮ NGUYÊN. Gia đình là người có quyền quyết ai đón con mình, và
    // bắt duyệt là thêm một khâu chờ đúng lúc gấp nhất — 4 giờ chiều, mẹ kẹt
    // họp, nhờ bác sang đón. Khâu duyệt ấy chỉ chạy được khi văn phòng đang
    // ngồi trước máy, mà đúng giờ đó văn phòng đang ở sân trả bé.
    //
    // ĐỔI LẠI KHÔNG ĐƯỢC LỎNG Ở CHỖ KHÁC, và đó là thứ mục này canh: mỗi lượt
    // uỷ quyền phải còn vết AI TẠO và LÚC NÀO trong Nhật ký thao tác — chặt
    // hơn mẩu giấy hay cuộc điện thoại của cách cũ, thứ không để lại gì.
    const tao = await req('POST', '/api/dontra/uyquyen', {
      cookie: PH,
      body: { studentId: 's1', hoTen: 'Bác Tư hàng xóm', quanHe: 'Bác',
        tuNgay: NGAY },
    });
    check('gia đình tạo được uỷ quyền một lần, KHÔNG phải chờ duyệt',
      tao.status === 200 || tao.status === 201, `${tao.status} ${JSON.stringify(tao.data).slice(0, 160)}`);
    check('và bản ghi KHÔNG mang trạng thái chờ duyệt nào',
      !/cho-duyet|choDuyet|pending/.test(JSON.stringify(tao.data || {})),
      JSON.stringify(tao.data || {}).slice(0, 160));

    const nk = await req('GET', '/api/admin/audit', { cookie: QT });
    const vet = (nk.data?.items || nk.data || []).filter(x => /uyquyen|uy-quyen/i.test(x.action || ''));
    check('LƯỢT UỶ QUYỀN CÓ VẾT trong Nhật ký thao tác', vet.length > 0,
      (nk.data?.items || nk.data || []).slice(0, 4).map(x => x.action));
    // Nhật ký trả về TÊN người làm (`who`) chứ không trả mã tài khoản — đúng
    // hơn cho màn của văn phòng, và vẫn trả lời được câu "ai, lúc nào".
    check('vết ấy ghi ai tạo và lúc nào',
      vet.every(x => !!x.who && !!x.at), JSON.stringify(vet[0] || {}).slice(0, 200));
    check('và ghi rõ người được uỷ quyền là ai, từ ngày nào',
      vet.some(x => /Bác Tư hàng xóm/.test(String(x.detail || ''))),
      String((vet[0] || {}).detail || '').slice(0, 160));

    // Và người ngoài vẫn không uỷ quyền hộ nhà khác được.
    const cheo = await req('POST', '/api/dontra/uyquyen', {
      cookie: PH3, body: { studentId: 's1', hoTen: 'Người lạ', quanHe: 'Bác' },
    });
    check('NHÀ KHÁC KHÔNG uỷ quyền hộ được — bỏ khâu duyệt không phải bỏ khâu quyền',
      cheo.status === 403, cheo.status);
  }

  // =========================================================================
  console.log('\n[3] GĐ2-C-b GIỮ — gia đình KHÔNG xem kế hoạch tháng của con');
  {
    // QUYẾT: GIỮ NGUYÊN, và lý do là QUY TẮC 2 chứ không phải quyền riêng tư.
    //
    // Kế hoạch tháng là chỗ cô viết *"tháng này con chưa cầm kéo được, tháng
    // sau tập"*. Đó là việc trong nghề của cô — một mốc để cô tự soi, không
    // phải một lời hứa với gia đình. Đưa nó ra thì nó thành bảng đối chiếu:
    // nhà đọc "chưa cầm kéo được" là nghe thấy một khoảng trống cần lấp, rồi
    // hỏi cuối tháng "con tôi làm được chưa" — và đó đúng là điều QUY TẮC 2
    // cấm, chỉ khác là áp lực rơi lên cả cô lẫn đứa trẻ.
    //
    // Thứ gia đình đọc được vẫn còn nguyên và nhiều hơn: câu chuyện học tập cô
    // chủ động công bố (lớp 3 của ba lớp dữ liệu), và khối kế hoạch chung tuần
    // ở đầu Lịch sinh hoạt (Đ201).
    const nhom = await req('GET', '/api/kehoachbe?classId=c1', { cookie: PH });
    check('gia đình KHÔNG mở được kế hoạch tháng của nhóm', nhom.status === 403, nhom.status);
    const goiY = await req('GET', '/api/kehoachbe/goi-y?studentId=s1', { cookie: PH });
    check('và cũng không mở được đường gợi ý của một bé', goiY.status === 403, goiY.status);
    const bai = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: PH });
    check('cả danh mục bài học cũng đóng với gia đình', bai.status === 403, bai.status);

    check('đối chứng — cô thì mở được, tức là phép đo trên không phải đo màn hỏng',
      (await req('GET', '/api/kehoachbe?classId=c1', { cookie: CO })).status === 200);

    // Ghim bằng MÃ NGUỒN: không đường nào của phân hệ mở cho vai gia đình.
    const ma = fs.readFileSync(path.join(GOC, 'modules/kehoachbe/routes.js'), 'utf8')
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('KHÔNG đường nào của Kế hoạch của bé khai vai `parent`',
      !/requireRole\([^)]*'parent'/.test(ma), (ma.match(/requireRole\([^)]*parent[^)]*\)/g) || []));
    const mj = JSON.parse(fs.readFileSync(path.join(GOC, 'modules/kehoachbe/module.json'), 'utf8'));
    check('và ô của phân hệ KHÔNG hiện trên trang chủ gia đình',
      !(mj.roles || []).includes('parent'), mj.roles);
  }

  // =========================================================================
  console.log('\n[4] GĐ2-D-b GIỮ — KHÔNG đếm bao nhiêu gia đình đã đọc tờ Cambridge');
  {
    // QUYẾT: GIỮ NGUYÊN. Một con số "12/25 nhà đã đọc" nghe vô hại, nhưng nó
    // là một bảng xếp các GIA ĐÌNH trên dưới nhau — và bước tiếp theo bao giờ
    // cũng là mở ra xem NHÀ NÀO chưa đọc, rồi nhắc. Cùng lý do đã ghi ở Đ131
    // cho việc đếm gộp mối quan tâm của phụ huynh: đếm GỘP thì được, đếm theo
    // từng nhà thì không.
    //
    // Nó cũng không giúp nhà trường quyết gì: tờ Cambridge đã gửi rồi, biết
    // thêm số nhà đã mở cũng không đổi việc phải làm.
    const ma = fs.readFileSync(path.join(GOC, 'modules/cambridge/routes.js'), 'utf8')
      .split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    const dauHieu = [
      ['đếm số nhà đã đọc', /soNhaDaDoc|soDaDoc|daDocCount|luotDoc|soLuotXem/],
      ['bảng ai đã đọc', /daDocBoi|nguoiDaDoc|xemBoi/],
    ];
    const pham = dauHieu.filter(([, re]) => re.test(ma)).map(([t]) => t);
    check('phân hệ Cambridge KHÔNG đếm lượt đọc của gia đình', pham.length === 0, pham);

    const sql = fs.readFileSync(path.join(GOC, 'modules/cambridge/schema.sql'), 'utf8');
    check('và KHÔNG có bảng nào ghi nhà nào đã mở tờ nào',
      !/daDoc|da_doc|luot_doc|luotDoc/i.test(sql), (sql.match(/.*[dD]a.?[dD]oc.*/) || [])[0]);

    const view = fs.readFileSync(path.join(GOC, 'modules/cambridge/view.js'), 'utf8');
    check('màn hình cũng không hiện con số nào kiểu "mấy nhà đã đọc"',
      !/nhà đã đọc|gia đình đã đọc|đã xem:/i.test(view),
      (view.match(/.*(nhà đã đọc|gia đình đã đọc).*/i) || [])[0]);

    // ĐỐI CHỨNG CỦA CHÍNH CÁCH DÒ: nó phải bắt được nếu ai đó thật sự thêm.
    const gia = "const soNhaDaDoc = db.count('SELECT COUNT(*) FROM cambridge_doc');";
    check('phép thử ngược — cách dò này BẮT ĐƯỢC một dòng đếm lượt đọc',
      dauHieu.some(([, re]) => re.test(gia)));
    // VÀ NÓ PHẢI SOI ĐÚNG TỆP ĐANG CHẠY. Thử ngược đầu tiên của mục này chèn
    // một dòng đếm vào `modules/cambridge/routes.js` qua mốc
    // `module.exports = (app) => {` — mà tệp ấy khai `(app, { db })`, nên lượt
    // phá KHÔNG chèn được gì và bài vẫn xanh. Bài xanh vì không có gì bị sửa,
    // chứ không phải vì phép dò làm đúng việc.
    check('đối chứng — đọc đúng tệp routes.js đang chạy của Cambridge',
      ma.length > 2000 && /app\.(get|post)\('\/api\/cambridge/.test(ma), ma.length);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
