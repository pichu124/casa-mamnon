// Bài canh: RÚT ĐỒNG Ý ① "HỒ SƠ HỌC TẬP" PHẢI CÓ HIỆU LỰC THẬT.
//
// Chạy bằng:  npm run test:rut-dong-y
//
// VÌ SAO CÓ BÀI NÀY
//
// Trước Đ96, ô ① là một cột dữ liệu thuần tuý: gia đình gạt ô, máy chủ trả
// 200, nhật ký thao tác ghi lại, màn hình đổi sang "Không đồng ý" — rồi KHÔNG
// GÌ ĐỔI CẢ. Cô vẫn ghi quan sát mới, vẫn lập kế hoạch tháng, vẫn mở và gửi
// báo cáo học tập cho bé đó.
//
// Nặng hơn phần thiếu chốt: màn của gia đình HỨA THẲNG BẰNG CHỮ rằng trường
// ghi hồ sơ học tập cho con — nên gia đình bấm "Rút lại" là tin rằng trường đã
// ngưng. Một lời rút được ghi vào nhật ký mà không có hiệu lực còn tệ hơn
// không có nút rút: nó tạo ra bằng chứng giấy tờ rằng trường đã nhận lời rút.
//
// `docs/KE-HOACH.md` mục 6 đặt sẵn nghĩa vụ: *"Rút lại được bất cứ lúc nào —
// app phải định nghĩa rõ chuyện gì xảy ra khi rút."*
//
// BỐN NHÓM, VÀ NHÓM [1] LÀ QUAN TRỌNG NHẤT
//
//   [1] BA GIÁ TRỊ, KHÔNG PHẢI HAI. `hoSoHocTap` là true / false / null, và
//       `null` nghĩa là CHƯA THU ĐƯỢC GIẤY. Chỉ `false` mới chặn. Viết
//       `if (!hoSoHocTap)` là tháng Chín cả trường không ghi được gì, vì đầu
//       năm học hàng chục tờ giấy chưa về. Đây là bài canh đắt nhất của tệp.
//
//   [2] TÁM ĐƯỜNG GHI, LIỆT KÊ TƯỜNG MINH. Chốt đặt ở từng phân hệ nên cơ chế
//       cô lập lỗi vẫn giữ được — một phân hệ quên chốt chỉ hỏng chính nó —
//       nhưng đổi lại là quên rất dễ và im lặng. Nhóm này gọi thẳng từng đường.
//
//   [3] NGƯNG GHI ≠ MẤT DỮ LIỆU, VÀ KHÔNG PHẢI CỬA MỘT CHIỀU. Phần đã ghi vẫn
//       đọc được, thu hồi/xoá vẫn chạy, và đồng ý lại thì ghi được ngay.
//
//   [4] KẾ HOẠCH CẢ NHÓM: BỎ QUA BÉ ĐÓ, KHÔNG TỪ CHỐI CẢ LÔ. Một bé làm hỏng
//       kế hoạch tháng của cả nhóm là vi phạm Nguyên tắc số 1 ở vế "mọi tính
//       năng khác vẫn chạy y như cũ".
import fs from 'fs';
import path from 'path';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY, GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('rut-dong-y');
sinhDuLieu(DIR, { phanHe: true });
batPhanHe(DIR, ['hanhtrinh', 'kehoachbe', 'baocaohoctap', 'thuchup', 'nhatky']);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'rdy_qt');

const { BASE, dung } = await dungMayChu({ port: 4601, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

const NGAY = HOM_NAY();
const THANG = NGAY.slice(0, 7);

// Bé s9 (Ngô Gia Huy, nhóm Nhà trẻ 1) là bé dữ liệu mẫu đã đặt hoSoHocTap = 0.
// Bé s10 cùng nhóm chưa nộp giấy → hoSoHocTap = null.
const BE_DA_DUNG = 's9';

try {
  const qt = await login('rdy_qt', mkQt);
  const co4 = await login('giaovien4', '123456');   // cô nhóm Nhà trẻ 1

  // Lấy một bé CÙNG NHÓM chưa nộp giấy, để so.
  const soNhom = await req('GET', '/api/students?classId=c4', { cookie: co4.cookie });
  const dsC4 = (soNhom.data || soNhom.data?.students || []);
  const beChuaKy = (Array.isArray(dsC4) ? dsC4 : []).find(b => b.id !== BE_DA_DUNG);

  // =========================================================================
  console.log('\n[1] BA GIÁ TRỊ — chỉ "đã nói không" mới chặn');
  {
    const dy = await req('GET', `/api/dong-y?studentId=${BE_DA_DUNG}`, { cookie: co4.cookie })
      .catch(() => ({ data: null }));
    // Hỏi thẳng qua đường quản trị cho chắc hình dạng dữ liệu.
    const hs = await req('GET', `/api/admin/students/${BE_DA_DUNG}`, { cookie: qt.cookie });
    const dongY = (hs.data && (hs.data.dongY || (hs.data.student || {}).dongY)) || (dy.data || {}).dongY || null;
    check('dữ liệu mẫu CÓ một bé mà gia đình đã dừng hồ sơ học tập',
      !!dongY && dongY.hoSoHocTap === false, JSON.stringify(dongY));

    const chan = await req('POST', '/api/hanhtrinh', { cookie: co4.cookie, body: {
      studentId: BE_DA_DUNG, ngay: NGAY, moTa: 'thử ghi cho bé đã dừng' } });
    check('bé gia đình ĐÃ NÓI KHÔNG: ghi quan sát mới bị chặn', chan.status === 403,
      `${chan.status} ${JSON.stringify(chan.data).slice(0, 120)}`);
    check('câu từ chối nói về quyết định của NGƯỜI LỚN, không nói gì về đứa trẻ',
      /gia đình/i.test((chan.data || {}).error || '')
      && !/(bé chưa|con chưa|chưa đạt|không đủ)/i.test((chan.data || {}).error || ''),
      (chan.data || {}).error);
    check('và câu từ chối CHỈ ĐƯỜNG cho cô làm tiếp việc khác (QUY TẮC 5)',
      /nhật ký|nhắn tin/i.test((chan.data || {}).error || ''), (chan.data || {}).error);

    // ĐỐI CHỨNG QUAN TRỌNG NHẤT CỦA CẢ TỆP.
    //
    // Bé CHƯA NỘP GIẤY phải ghi được bình thường. Không có dòng này thì một
    // bản vá viết `if (!hoSoHocTap)` vẫn xanh hết mọi phép trên — và tháng
    // Chín cả trường không ghi được gì.
    check('đối chứng — tìm được một bé cùng nhóm CHƯA nộp giấy', !!beChuaKy,
      JSON.stringify((Array.isArray(dsC4) ? dsC4 : []).map(b => b.id)));
    const chuaKy = await req('POST', '/api/hanhtrinh', { cookie: co4.cookie, body: {
      studentId: beChuaKy.id, ngay: NGAY, moTa: 'Bé tự xúc cơm hết bát' } });
    check('bé CHƯA NỘP GIẤY (null) vẫn ghi được bình thường — KHÔNG chặn',
      chuaKy.status === 200 || chuaKy.status === 201,
      `${chuaKy.status} ${JSON.stringify(chuaKy.data).slice(0, 120)}`);
    globalThis.QS_CHUA_KY = (chuaKy.data || {}).id || ((chuaKy.data || {}).quanSat || {}).id;

    // Và bé đã đồng ý (= true) cũng vậy — s1 nhóm Chồi 2.
    const co1 = await login('giaovien', '123456');
    const daDongY = await req('POST', '/api/hanhtrinh', { cookie: co1.cookie, body: {
      studentId: 's1', ngay: NGAY, moTa: 'Bé rót nước vào ly không đổ' } });
    check('bé ĐÃ ĐỒNG Ý (true) vẫn ghi được bình thường',
      daDongY.status === 200 || daDongY.status === 201, `${daDongY.status}`);
  }

  // =========================================================================
  console.log('\n[2] TÁM ĐƯỜNG GHI — liệt kê tường minh, không đường nào hở');
  {
    // Ghi nhanh: LỚP 1 của hồ sơ học tập. Chặn Hành trình mà quên đây thì cô
    // chỉ việc đổi màn hình là ghi tiếp được như chưa có gì.
    const gn = await req('POST', '/api/thuchup', { cookie: co4.cookie, body: {
      id: '11111111-2222-4333-8444-555555555555', studentId: BE_DA_DUNG,
      note: 'thử ghi nhanh cho bé đã dừng', ngay: NGAY } });
    check('Ghi nhanh (lớp 1) bị chặn', gn.status === 403, `${gn.status}`);

    // Báo cáo học tập: mở bản mới.
    const mau = await req('GET', '/api/baocaohoctap/mau', { cookie: qt.cookie });
    const mauNhaTre = (mau.data.mau || []).find(m => m.loai === 'thang' && m.active);
    check('đối chứng — có mẫu báo cáo tháng để mà thử', !!mauNhaTre,
      JSON.stringify((mau.data.mau || []).map(m => m.loai)));
    const moBan = await req('POST', '/api/baocaohoctap/ban', { cookie: co4.cookie, body: {
      studentId: BE_DA_DUNG, mauId: mauNhaTre.id, tuNgay: `${THANG}-01`, denNgay: `${THANG}-28` } });
    check('Báo cáo học tập: MỞ bản mới bị chặn', moBan.status === 403, `${moBan.status}`);

    // Kế hoạch của bé: đường ghi một bé (qua danh sách một phần tử).
    const ke = await req('PUT', '/api/kehoachbe', { cookie: co4.cookie, body: {
      classId: 'c4', thang: THANG,
      danhSach: [{ studentId: BE_DA_DUNG, muc: [{ gocLinhVuc: 'thuc-hanh-cuoc-song', noiDung: 'thử' }] }] } });
    check('Kế hoạch của bé: bé đã dừng KHÔNG được ghi (bỏ qua, không lỗi)',
      ke.status === 200 && (ke.data.boQuaNgungHoSo || []).length === 1 && ke.data.daLuu === 0,
      `${ke.status} ${JSON.stringify(ke.data)}`);

    // ĐƯỜNG THỨ CHÍN — BỊ BỎ SÓT Ở LẦN VÁ ĐẦU.
    //
    // "Nhìn lại cuối tháng" mới là chỗ cô xếp bé vào một trong năm mức phát
    // triển và viết nhận xét — tức nội dung hồ sơ học tập theo nghĩa đúng nhất
    // của nó. Đợt Đ96 chốt tám đường và quên đúng đường này, nên gia đình gạt
    // ô ① xong thì cuối tháng cô vẫn ghi được như chưa có gì.
    //
    // Dựng đúng cảnh thật: cô ĐÃ lập kế hoạch cho bé từ trước, RỒI gia đình mới
    // rút. Bật đồng ý lên một lát để lập kế hoạch qua đúng đường của app, rồi
    // tắt lại — không ghi thẳng vào bảng, vì cảnh này app làm được thật.
    await req('PUT', `/api/admin/students/${BE_DA_DUNG}/dong-y`,
      { cookie: qt.cookie, body: { hoSoHocTap: true } });
    await req('PUT', '/api/kehoachbe', { cookie: co4.cookie, body: {
      classId: 'c4', thang: THANG,
      danhSach: [{ studentId: BE_DA_DUNG, muc: [
        { gocLinhVuc: 'thuc-hanh-cuoc-song', noiDung: 'Tự xúc ăn, tự cất bát' }] }] } });
    await req('PUT', `/api/admin/students/${BE_DA_DUNG}/dong-y`,
      { cookie: qt.cookie, body: { hoSoHocTap: false } });

    // Đường "một bé" đã gỡ ở Đ203 — đọc qua đường cả nhóm.
    const keCuaBeDaDung = await req('GET',
      `/api/kehoachbe?classId=c4&thang=${THANG}`, { cookie: co4.cookie });
    const banKe = ((keCuaBeDaDung.data?.danhSach || [])
      .find(x => x.studentId === BE_DA_DUNG) || {}).ke;
    check('đối chứng — bé đã dừng vẫn CÓ bản kế hoạch cũ để nhìn lại',
      !!banKe && !!banKe.id, JSON.stringify(keCuaBeDaDung.data || {}).slice(0, 140));
    if (banKe && banKe.id) {
      const nhinLai = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: co4.cookie, body: {
        id: banKe.id,
        muc: (banKe.muc || []).slice(0, 1).map(m => ({ id: m.id, ketQua: 'dang-hinh-thanh' })),
      } });
      check('Kế hoạch của bé: NHÌN LẠI CUỐI THÁNG cũng bị chặn',
        nhinLai.status === 403, `${nhinLai.status} ${JSON.stringify(nhinLai.data)}`);
      check('và câu từ chối nói rõ phần đã ghi vẫn giữ nguyên',
        /vẫn giữ nguyên|xem lại được/i.test(nhinLai.data?.error || ''), nhinLai.data?.error);
    } else {
      check('Kế hoạch của bé: NHÌN LẠI CUỐI THÁNG cũng bị chặn',
        false, 'KHÔNG DỰNG ĐƯỢC TÌNH HUỐNG: bé đã dừng không có bản kế hoạch cũ nào.');
    }
  }

  // =========================================================================
  console.log('\n[3] NGƯNG GHI ≠ MẤT DỮ LIỆU, và KHÔNG phải cửa một chiều');
  {
    // Gia đình vẫn đọc được hành trình của con (đường ĐỌC không bị chặn).
    const doc = await req('GET', `/api/hanhtrinh?studentId=${BE_DA_DUNG}`, { cookie: co4.cookie });
    check('đường ĐỌC hành trình vẫn mở sau khi gia đình rút', doc.status === 200, `${doc.status}`);

    // Nhật ký ngày — sổ liên lạc — KHÔNG bị chặn. Đây là quyết định đã ghi ở
    // docs/QUYET-DINH-TU-CHOT.md mục 7: rút ① là "đừng dựng hồ sơ đánh giá con
    // tôi", không phải "đừng kể hôm nay con ăn gì".
    const nk = await req('PUT', '/api/nhatky', { cookie: co4.cookie, body: {
      classId: 'c4', ngay: NGAY,
      danhSach: [{ studentId: BE_DA_DUNG, an: { trua: 'het' } }] } });
    check('NHẬT KÝ NGÀY (sổ liên lạc) KHÔNG bị chặn — cố ý',
      nk.status === 200 || nk.status === 201, `${nk.status} ${JSON.stringify(nk.data).slice(0, 120)}`);

    // ĐỒNG Ý LẠI thì ghi được ngay — rút không phải cửa một chiều.
    const bat = await req('PUT', `/api/admin/students/${BE_DA_DUNG}/dong-y`,
      { cookie: qt.cookie, body: { hoSoHocTap: true } });
    check('văn phòng ghi nhận gia đình đồng ý lại', bat.status === 200, `${bat.status}`);
    const lai = await req('POST', '/api/hanhtrinh', { cookie: co4.cookie, body: {
      studentId: BE_DA_DUNG, ngay: NGAY, moTa: 'Bé xếp giày vào kệ' } });
    check('ĐỒNG Ý LẠI thì ghi được NGAY, không cần khởi động lại gì',
      lai.status === 200 || lai.status === 201, `${lai.status}`);

    // Trả về trạng thái cũ cho phần sau của bài.
    await req('PUT', `/api/admin/students/${BE_DA_DUNG}/dong-y`,
      { cookie: qt.cookie, body: { hoSoHocTap: false } });
    const chanLai = await req('POST', '/api/hanhtrinh', { cookie: co4.cookie, body: {
      studentId: BE_DA_DUNG, ngay: NGAY, moTa: 'thử ghi sau khi rút lần nữa' } });
    check('rút lại lần nữa thì chặn lại ngay', chanLai.status === 403, `${chanLai.status}`);

    // XOÁ và THU HỒI phải LUÔN chạy — chặn chúng là để câu chuyện đã công bố
    // kẹt lại vĩnh viễn ở phía gia đình.
    const qsId = (lai.data || {}).id || ((lai.data || {}).quanSat || {}).id;
    if (qsId) {
      const xoa = await req('DELETE', `/api/hanhtrinh/${qsId}`, { cookie: co4.cookie });
      check('XOÁ quan sát vẫn chạy dù gia đình đã rút', xoa.status === 200, `${xoa.status}`);
    } else {
      check('đối chứng — dựng được một quan sát để thử đường xoá', false, 'không lấy được mã quan sát');
    }
  }

  // =========================================================================
  // CÔ PHẢI BIẾT TRƯỚC KHI GÕ, KHÔNG PHẢI SAU.
  //
  // Chốt ở đường ghi là đủ để đúng luật, chưa đủ để dùng được: cô soạn xong cả
  // một quan sát rồi mới bị từ chối là mất công của cô, và cô sẽ nghĩ app hỏng.
  console.log('\n[3b] Đường liệt kê nói trước, để màn hình đặt câu ấy lên trên ô nhập');
  {
    const co = await req('GET', `/api/hanhtrinh?studentId=${BE_DA_DUNG}`, { cookie: co4.cookie });
    check('cô thấy cờ "gia đình đã dừng hồ sơ học tập" ngay ở đường liệt kê',
      co.data.ngungHoSoHocTap === true, JSON.stringify(co.data.ngungHoSoHocTap));

    // ĐỐI CHỨNG: cờ phải là false cho bé bình thường, không phải luôn true.
    const be2 = await req('GET', `/api/hanhtrinh?studentId=${beChuaKy.id}`, { cookie: co4.cookie });
    check('đối chứng — bé chưa nộp giấy thì cờ là false, không phải luôn true',
      be2.data.ngungHoSoHocTap === false, JSON.stringify(be2.data.ngungHoSoHocTap));

    // GIA ĐÌNH KHÔNG NHẬN CỜ NÀY. Họ đã biết — chính họ vừa gạt ô — và nhắc
    // lại trên màn của con là biến quyết định của người lớn thành một nhãn dán
    // lên đứa trẻ (QUY TẮC 2).
    const ph = await login('ph.trang', '123456');
    const nha = await req('GET', `/api/hanhtrinh?studentId=${BE_DA_DUNG}`, { cookie: ph.cookie });
    check('gia đình KHÔNG nhận cờ đó — không dán nhãn lên đứa trẻ',
      nha.status === 200 && nha.data.ngungHoSoHocTap === undefined,
      `${nha.status} ${JSON.stringify(nha.data.ngungHoSoHocTap)}`);
  }

  // =========================================================================
  console.log('\n[3c] CỜ MÁY CHỦ GỬI RA PHẢI CÓ MÀN HÌNH ĐỌC');
  {
    // Đ96 dựng hai cờ rồi để chúng nằm chết ở máy chủ suốt một đợt: màn hình
    // không đọc cái nào. Hậu quả không phải mất dữ liệu mà là mất lòng tin của
    // cô — cô lưu kế hoạch cả nhóm, đọc "Đã lưu cho 24 bé", tưởng cả nhóm
    // xong; hoặc soạn trọn một quan sát rồi mới ăn 403.
    //
    // Canh ở tầng chữ vì đây đúng là chỗ hỏng: máy chủ đúng, màn hình không
    // dùng tới cái đúng đó. Cùng hình dạng với bài học Đ102.
    const manKe = fs.readFileSync(path.join(GOC, 'modules/kehoachbe/view.js'), 'utf8');
    check('MÀN KẾ HOẠCH ĐỌC `boQuaNgungHoSo` máy chủ trả về',
      /boQuaNgungHoSo/.test(manKe), 'không thấy boQuaNgungHoSo trong kehoachbe/view.js');
    check('và nói ra ở CẢ BA lượt ghi cả nhóm (lưu, đặt cả nhóm, chép tháng trước)',
      (manKe.match(/nhacBoQua\(/g) || []).length >= 4,
      (manKe.match(/nhacBoQua\(/g) || []).length);
    check('nhánh "không lưu được bé nào" KHÔNG còn nói ngược việc cô vừa làm',
      /Không lưu được bé nào/.test(manKe),
      'nhánh daLuu = 0 vẫn báo "Chưa có bé nào được gõ nội dung"');

    const manHt = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
    check('MÀN HÀNH TRÌNH ĐỌC `ngungHoSoHocTap` và nhắc TRƯỚC khi cô gõ',
      /ngungHoSoHocTap/.test(manHt), 'không thấy ngungHoSoHocTap trong hanhtrinh/view.js');
    // Grep chữ trong tệp view là phép kiểm gần-như-luôn-xanh: chữ còn đó mà
    // máy chủ thôi gửi cờ là tính năng chết không ai hay. Hỏi thẳng đường mà
    // hộp thoại ghi quan sát đang dùng: /hom-nay phải mang cờ cho ĐÚNG bé.
    const homNayHt = await req('GET', '/api/hanhtrinh/hom-nay', { cookie: co4.cookie });
    const beDungTrongDs = (homNayHt.data?.danhSachBe || []).find(b => b.id === BE_DA_DUNG);
    check('và máy chủ THẬT SỰ gửi cờ đó trong danh sách bé của màn Hôm nay',
      !!beDungTrongDs && beDungTrongDs.ngungHoSoHocTap === true, beDungTrongDs);

    const manTc = fs.readFileSync(path.join(GOC, 'modules/thuchup/view.js'), 'utf8');
    check('MÀN GHI NHANH ngăn từ gốc — chip của bé đã dừng không bấm được',
      /_ngungHoSo/.test(manTc) && /disabled/.test(manTc), 'không thấy chốt ở chip chọn bé');
    check('và hàng đợi BỎ QUA bài vô vọng thay vì dừng cả hàng',
      /viNgungHoSo/.test(manTc) && /continue;/.test(manTc),
      'hàng đợi vẫn break ở bài không bao giờ gửi được');

    // Máy chủ phải thật sự gửi danh sách ấy ra, không chỉ màn hình đọc suông.
    const ds = await req('GET', '/api/thuchup', { cookie: co4.cookie });
    check('máy chủ gửi kèm danh sách bé đã dừng để màn hình ngăn từ gốc',
      Array.isArray(ds.data?.beNgungHoSo) && ds.data.beNgungHoSo.includes(BE_DA_DUNG),
      JSON.stringify(ds.data?.beNgungHoSo));
  }

  // =========================================================================
  console.log('\n[4] KẾ HOẠCH CẢ NHÓM — một bé không làm hỏng lô của cả nhóm');
  {
    const dat = await req('POST', '/api/kehoachbe/dat-ca-nhom', { cookie: co4.cookie, body: {
      classId: 'c4', thang: THANG,
      muc: [{ gocLinhVuc: 'thuc-hanh-cuoc-song', noiDung: 'Tập rót nước' }] } });
    check('đặt cả nhóm vẫn CHẠY, không bị một bé làm hỏng cả lô',
      dat.status === 200 && dat.data.daDat > 0,
      `${dat.status} ${JSON.stringify(dat.data)}`);
    check('và nói rõ đã bỏ qua bé nào — im lặng bỏ qua cũng là nói dối cô',
      (dat.data.boQuaNgungHoSo || []).length === 1,
      JSON.stringify(dat.data.boQuaNgungHoSo));

    // ĐỐI CHỨNG: nhóm phải có nhiều hơn một bé, nếu không thì "không hỏng cả
    // lô" chẳng chứng minh được gì.
    check('đối chứng — nhóm có nhiều hơn một bé để phép so trên có nghĩa',
      dat.data.daDat >= 2, `đã đặt cho ${dat.data.daDat} bé`);
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet();
