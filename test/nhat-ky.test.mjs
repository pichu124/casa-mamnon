// Bài canh NHẬT KÝ NGÀY — ăn, ngủ, vệ sinh, thay bỉm, bú bình.
//
// Chạy bằng:  npm run test:nhat-ky
//
// VÌ SAO PHÂN HỆ NÀY ĐÁNG CANH KỸ HƠN CÁC PHÂN HỆ KHÁC
//
// Mục tiêu số một của cả app là THAY HẲN SỔ LIÊN LẠC GIẤY, và đây đúng là
// trang sổ mà gia đình đọc mỗi chiều. Phân hệ nào hỏng thì trường vẫn dùng
// app; phân hệ này mà cô thấy phiền hơn viết sổ thì cả app bị bỏ.
//
// BA THỨ QUYẾT ĐỊNH CÔ CÓ DÙNG HAY KHÔNG, VÀ CẢ BA ĐỀU CANH ĐƯỢC BẰNG MÁY
//
//   1. GHI CẢ NHÓM MỘT LƯỢT, MỘT GIAO DỊCH. Cô có 20 bé và 10 phút cuối giờ.
//      Và nếu ghi nửa chừng gặp lỗi mà máy chủ đã kịp ghi 10 bé đầu, thì gia
//      đình 10 bé sau đọc thấy trống trơn và tưởng con mình bị bỏ quên.
//
//   2. Ô TRỐNG NGHĨA LÀ "CÔ CHƯA GHI", KHÔNG PHẢI "BÉ KHÔNG ĂN". Lẫn hai thứ
//      này là app nói dối về một đứa trẻ. Bài này canh cả ở tầng dữ liệu
//      (null khác 0) lẫn ở chữ trên màn hình.
//
//   3. NHÓM NHÀ TRẺ VÀ NHÓM LÁ KHÁC NHAU. Bé 14 tháng cần ghi thay bỉm và bú
//      bình; bé nhóm Lá thì không, và bắt cô nhóm Lá nhìn ba ô luôn trống mỗi
//      ngày là cách nhanh nhất làm cô bỏ dùng app.
//
// QUY TẮC 4 Ở PHÂN HỆ NÀY
//
// Nhật ký ăn uống là chỗ dễ trượt sang chấm điểm trẻ nhất trong cả app: chỉ
// cần đổi "ăn hết" thành 10 điểm là có ngay một bảng xếp hạng. Mục [7] canh
// điều đó ngay trong mã nguồn của phân hệ.
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, batPhanHe, khoaVaoCoSo, MAU } from './_chung.mjs';
import fs from 'fs';
import path from 'path';
import { GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('nhat-ky');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3976), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);
const C3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;    // cô nhóm c1 (Chồi 2)
const GV2 = (await login('giaovien2', '123456')).cookie;  // cô nhóm khác
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ bé s1

const HOM_NAY = new Date().toISOString().slice(0, 10);

// Cô Phạm Thị Hồng phụ trách nhóm Nhà trẻ 1 (c4) — nhóm 12–36 tháng của dữ
// liệu mẫu. Bài này KHÔNG còn phải tự đổi ngày sinh một bé để dựng tình huống
// nữa: từ N20, lứa nhà trẻ có thật trong dữ liệu mẫu.
const GV_NT = (await login('giaovien4', '123456')).cookie;

// ===========================================================================
console.log('\n[1] Cô mở màn hình lên là thấy CẢ NHÓM, chưa ghi gì cũng thấy');
{
  const r = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  check('mở được', r.status === 200, r.status);
  const ds = r.data?.danhSach || [];
  check('có đủ mọi bé đang học của nhóm', ds.length === 5, ds.length);
  check('mặc định là NGÀY HÔM NAY', r.data?.ngay === HOM_NAY, r.data?.ngay);
  check('bé chưa ghi thì đánh dấu rõ là CHƯA GHI',
    ds.every(b => b.daGhi === false), ds.find(b => b.daGhi));
  check('mỗi bé kèm cờ laNhaTre để màn hình biết hiện ô nào',
    ds.every(b => typeof b.laNhaTre === 'boolean'), ds[0]);

  const beLon = ds.find(b => b.studentId === 's1');
  check('bé 4 tuổi KHÔNG phải nhóm nhà trẻ', beLon?.laNhaTre === false, beLon);
}

// ===========================================================================
console.log('\n[1b] Nhóm NHÀ TRẺ thật của dữ liệu mẫu — và mốc 36 tháng');
{
  const r = await req('GET', '/api/nhatky?classId=c4', { cookie: GV_NT });
  check('cô nhóm nhà trẻ mở được nhóm mình', r.status === 200, r.status);
  const ds = r.data?.danhSach || [];
  check('nhóm Nhà trẻ 1 có ba bé', ds.length === MAU.soBeNhaTre, ds.length);

  const huy = ds.find(b => b.studentId === 's9');     // 14 tháng
  const ngoc = ds.find(b => b.studentId === 's10');   // 34 tháng
  const khoi = ds.find(b => b.studentId === 's11');   // 38 tháng
  check('bé 14 tháng: có ô thay bỉm và bú bình', huy?.laNhaTre === true, huy);
  check('bé 34 tháng: vẫn có — chưa qua mốc 36 tháng', ngoc?.laNhaTre === true, ngoc);

  // ĐÂY LÀ BÀI ĐÁNG GIÁ NHẤT CỦA CẢ MỤC NÀY.
  //
  // Bé Khôi 38 tháng NẰM TRONG nhóm tên là "Nhà trẻ 1" — bé vừa qua mốc giữa
  // năm học và trường không chuyển nhóm giữa chừng. Nếu app quyết định theo
  // TÊN NHÓM thì bé này sẽ có ô thay bỉm; quyết định theo NGÀY SINH thì không.
  check('BÉ 38 THÁNG TRONG NHÓM "NHÀ TRẺ" THÌ KHÔNG — luật đi theo NGÀY SINH, không theo tên nhóm',
    khoi?.laNhaTre === false, khoi);
}

// ===========================================================================
console.log('\n[2] Ghi CẢ NHÓM một lượt — thứ quyết định cô có dùng hay không');
{
  const ds = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach;
  const ghi = await req('PUT', '/api/nhatky', {
    cookie: GV,
    body: {
      ngay: HOM_NAY,
      danhSach: ds.map(b => ({
        studentId: b.studentId,
        anTrua: 'gan-het',
        nguTuLuc: '11:30', nguDenLuc: '14:00',
        veSinhSoLan: 2, veSinhTinhChat: 'binh-thuong',
        bimSoLan: 3, buBinhSoLan: 2, buBinhMl: 300,
        ghiChu: 'Hôm nay con vui vẻ',
      })),
    },
  });
  check('ghi được cả nhóm trong MỘT lời gọi', ghi.status === 200, ghi.data);
  check('và báo đúng số bé đã ghi', ghi.data?.daGhi === ds.length, ghi.data);

  const lai = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach;
  check('mở lại thấy mọi bé ĐÃ GHI', lai.every(b => b.daGhi === true), lai.filter(b => !b.daGhi));
  check('và đọc lại đúng thứ vừa ghi', lai[0].anTrua === 'gan-het' && lai[0].nguDenLuc === '14:00', lai[0]);

  // Ghi lần hai phải ĐÈ, không sinh dòng thứ hai.
  await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', anTrua: 'it' }] },
  });
  const sau = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach
    .find(b => b.studentId === 's1');
  check('GHI LẦN HAI ĐÈ LÊN LẦN TRƯỚC, không sinh ra hai dòng cho một ngày',
    sau.anTrua === 'it', sau.anTrua);
}

// ===========================================================================
console.log('\n[3] Ô NHÀ TRẺ chỉ dành cho bé nhà trẻ');
{
  // Ghi cho nhóm nhà trẻ thật, gửi kèm ô bỉm và bú bình cho CẢ BA bé.
  await req('PUT', '/api/nhatky', {
    cookie: GV_NT,
    body: {
      ngay: HOM_NAY,
      danhSach: ['s9', 's10', 's11'].map(id => ({
        studentId: id, anTrua: 'het', bimSoLan: 3, buBinhSoLan: 2, buBinhMl: 300,
      })),
    },
  });
  const ds = (await req('GET', '/api/nhatky?classId=c4', { cookie: GV_NT })).data.danhSach;
  const huy = ds.find(b => b.studentId === 's9');     // 14 tháng
  const khoi = ds.find(b => b.studentId === 's11');   // 38 tháng
  check('bé nhà trẻ GIỮ số lần thay bỉm', huy.bimSoLan === 3, huy.bimSoLan);
  check('và giữ lượng sữa bú bình', huy.buBinhMl === 300, huy.buBinhMl);
  check('BÉ ĐÃ QUA MỐC THÌ MÁY CHỦ BỎ mấy ô đó đi, dù cô có lỡ gửi lên',
    khoi.bimSoLan === null && khoi.buBinhSoLan === null && khoi.buBinhMl === null, khoi);

  const beLon = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach
    .find(b => b.studentId === 's1');
  check('bé 4 tuổi ở nhóm khác cũng vậy',
    beLon.bimSoLan === null && beLon.buBinhSoLan === null, beLon);
}

// ===========================================================================
console.log('\n[4] Ô TRỐNG nghĩa là "cô chưa ghi", KHÔNG phải "bé không ăn"');
{
  await req('PUT', '/api/nhatky', {
    cookie: GV,
    body: { ngay: HOM_NAY, danhSach: [{ studentId: 's3', veSinhSoLan: '', anTrua: '' }] },
  });
  const b = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach
    .find(x => x.studentId === 's3');
  check('ô số để trống lưu thành null, KHÔNG phải 0', b.veSinhSoLan === null, b.veSinhSoLan);
  check('ô chọn để trống lưu thành chuỗi rỗng, không tự điền', b.anTrua === '', b.anTrua);

  // Và 0 vẫn ghi được — "không lần nào" là một thông tin thật.
  await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's3', veSinhSoLan: 0 }] },
  });
  const b0 = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach
    .find(x => x.studentId === 's3');
  check('nhưng SỐ 0 thì vẫn ghi được — "không lần nào" khác "chưa ghi"',
    b0.veSinhSoLan === 0, b0.veSinhSoLan);

  const chu = await (await fetch(`${sv.BASE}/modules/nhatky/view.js`)).text().catch(() => '');
  const chuFile = chu || fs.readFileSync(path.join(GOC, 'modules/nhatky/view.js'), 'utf8');
  check('màn hình gia đình nói đúng chữ "cô chưa ghi", không để trống trơn',
    /cô chưa ghi/.test(chuFile));
}

// ===========================================================================
console.log('\n[5] Ghi sai thì TỪ CHỐI CẢ MẺ, không ghi được nửa nhóm');
{
  const truoc = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach
    .find(x => x.studentId === 's4');

  const hong = await req('PUT', '/api/nhatky', {
    cookie: GV,
    body: {
      ngay: HOM_NAY,
      danhSach: [
        { studentId: 's4', anTrua: 'het' },
        { studentId: 's6', anTrua: 'ngon-lanh' },   // mức ăn không có thật
      ],
    },
  });
  check('mức ăn lạ thì bị từ chối', hong.status === 400, hong.data);
  check('và câu báo lỗi nói rõ BÉ NÀO sai', /Hoàng Gia Bảo|Vũ Đức Anh/.test(hong.data?.error || ''), hong.data?.error);

  const sau = (await req('GET', '/api/nhatky?classId=c1', { cookie: GV })).data.danhSach
    .find(x => x.studentId === 's4');
  // Chỗ này chứng minh KIỂM TRƯỚC KHI GHI, không chứng minh giao dịch.
  //
  // Nói cho đúng vì đây là chỗ dễ tự lừa mình: bài canh xanh không có nghĩa là
  // db.tx() đang làm việc. Máy chủ duyệt hết cả danh sách rồi mới ghi dòng
  // nào, nên bé đầu không bị ghi — kể cả khi bỏ db.tx() đi thì bài này vẫn
  // xanh. Giao dịch là lớp thứ hai, cho trường hợp hỏng GIỮA lúc ghi (đĩa đầy,
  // ràng buộc bảng) — thứ không dựng ra được từ một lời gọi API, nên nó được
  // canh bằng việc đọc mã chứ không bằng tình huống.
  check('KIỂM CẢ DANH SÁCH RỒI MỚI GHI: bé đầu không bị ghi khi bé sau sai',
    sau.anTrua === truoc.anTrua, [truoc.anTrua, sau.anTrua]);
  const maNguon = fs.readFileSync(path.join(GOC, 'modules/nhatky/routes.js'), 'utf8');
  check('và vòng ghi nằm trong MỘT giao dịch, cho trường hợp hỏng giữa chừng',
    /db\.tx\(\(\) => \{[\s\S]{0,400}nhatky_ngay/.test(maNguon));

  const gioNguoc = await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', nguTuLuc: '14:00', nguDenLuc: '11:30' }] },
  });
  check('giờ dậy trước giờ ngủ thì bị từ chối', gioNguoc.status === 400, gioNguoc.data?.error);

  const soLa = await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', veSinhSoLan: 500 }] },
  });
  check('số lần vô lý thì bị từ chối, KHÔNG tự cắt bớt rồi ghi bừa',
    soLa.status === 400, soLa.data?.error);

  const maiSau = await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: '2099-01-01', danhSach: [{ studentId: 's1', anTrua: 'het' }] },
  });
  check('không ghi nhật ký cho ngày chưa tới', maiSau.status === 400, maiSau.data?.error);
}

// ===========================================================================
console.log('\n[6] Ai được đọc, ai được ghi');
{
  const coKhac = await req('GET', '/api/nhatky?classId=c1', { cookie: GV2 });
  check('cô nhóm khác KHÔNG đọc được nhật ký nhóm này', coKhac.status === 403, coKhac.status);
  const coKhacGhi = await req('PUT', '/api/nhatky', {
    cookie: GV2, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', anTrua: 'het' }] },
  });
  check('và KHÔNG ghi được', coKhacGhi.status === 403, coKhacGhi.status);

  const phGhi = await req('PUT', '/api/nhatky', {
    cookie: PH, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', anTrua: 'het' }] },
  });
  check('phụ huynh KHÔNG ghi được — đây là ghi chép của cô', phGhi.status === 403, phGhi.status);

  const conMinh = await req('GET', '/api/nhatky?studentId=s1', { cookie: PH });
  check('phụ huynh đọc được nhật ký CON MÌNH', conMinh.status === 200, conMinh.status);
  check('và thấy tên cô đã ghi, để biết hỏi ai',
    !!conMinh.data?.ngayCo?.[0]?.nguoiGhiTen, conMinh.data?.ngayCo?.[0]);

  const conNhaKhac = await req('GET', '/api/nhatky?studentId=s4', { cookie: PH });
  check('nhưng KHÔNG đọc được nhật ký con nhà khác', conNhaKhac.status === 403, conNhaKhac.status);

  const nhomLa = await req('GET', '/api/nhatky?classId=c1', { cookie: PH });
  check('phụ huynh cũng KHÔNG mở được màn cả nhóm', nhomLa.status === 403, nhomLa.status);
}

// ===========================================================================
console.log('\n[7] QUY TẮC 4 — nhật ký ăn uống KHÔNG được thành bảng điểm');
{
  // Chỗ dễ trượt nhất trong cả app: chỉ cần đổi "ăn hết" thành 10 điểm là có
  // ngay một cách xếp các bé trên dưới nhau.
  const tep = ['routes.js', 'view.js', 'schema.sql', 'module.json']
    .map(t => fs.readFileSync(path.join(GOC, 'modules/nhatky', t), 'utf8')).join('\n');

  check('mức ăn lưu bằng NHÃN CHỮ, không phải số',
    /'het'|'gan-het'|'nua-suat'/.test(tep) && !/anTrua:\s*\d/.test(tep));
  check('không in phần trăm ra màn hình', !/\}%/.test(tep));
  check('không có màn hình nào sắp các bé theo mức ăn',
    !/sort\([^)]*an(Trua|Sang|Xe)/i.test(tep));

  // QUAN TRỌNG HƠN CẢ MẤY DÒNG TRÊN: bộ canh QUY TẮC 4 của cả kho mã phải
  // THẬT SỰ nhìn vào phân hệ này.
  //
  // Bản đầu của test/quy-tac-4.test.mjs liệt kê tay từng phân hệ
  // ('modules/hocphi', 'modules/thuchup'), nên phân hệ thêm sau đó lọt hết mà
  // bộ canh vẫn xanh. Nay nó quét cả thư mục `modules`. Dòng dưới canh để
  // không ai lặng lẽ đổi ngược lại thành danh sách viết tay.
  const canh = fs.readFileSync(path.join(GOC, 'test/quy-tac-4.test.mjs'), 'utf8');
  // Soi ĐÚNG mảng VUNG_QUET, không soi cả tệp: chú thích trong tệp đó có nhắc
  // tên hai phân hệ cũ để giải thích vì sao đã bỏ cách liệt kê tay.
  const mang = (canh.match(/const VUNG_QUET = \[([\s\S]*?)\]/) || [])[1] || '';
  check('BỘ CANH QUY TẮC 4 QUÉT CẢ THƯ MỤC modules, không liệt kê tay từng phân hệ',
    /'modules'/.test(mang) && !/'modules\//.test(mang), mang.trim());

  // Và canh bằng HÀNH VI, không chỉ bằng chữ: bộ canh phải thật sự đọc tới tệp
  // của phân hệ này. Một mảng đúng mà hàm đi tìm tệp không đệ quy vào thư mục
  // con thì vẫn quét ra rỗng — đó chính là lỗi đã có.
  const timTep = (canh.match(/function cacTep[\s\S]*?\n\}/) || [''])[0];
  check('và hàm đi tìm tệp có ĐI VÀO thư mục con của từng phân hệ',
    /isDirectory\(\)/.test(timTep), timTep.slice(0, 120));
}

// ===========================================================================
console.log('\n[8] Tắt phân hệ thì API bị chặn, dữ liệu vẫn còn nguyên');
{
  const tat = await req('PUT', '/api/admin/modules/nhatky', { cookie: C1, body: { enabled: false } });
  check('quản trị tắt được phân hệ', tat.status === 200, tat.status);

  const goi = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  check('TẮT RỒI THÌ API BỊ CHẶN, không chỉ ẩn cái ô vuông trên màn hình',
    goi.status === 404 || goi.status === 403, goi.status);

  await req('PUT', '/api/admin/modules/nhatky', { cookie: C1, body: { enabled: true } });
  const lai = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  check('bật lại là chạy tiếp', lai.status === 200, lai.status);
  check('VÀ DỮ LIỆU ĐÃ GHI CÒN NGUYÊN — tắt là ngưng dùng, không phải xoá',
    (lai.data?.danhSach || []).some(b => b.daGhi), lai.data?.danhSach?.length);
}

// ===========================================================================
console.log('\n[9] Tầng cơ sở vẫn canh ở phân hệ mới');
{
  // Chuyển nhóm Lá 1 sang cơ sở 2, rồi thử bằng tài khoản quản lý cơ sở 1.
  await req('PUT', '/api/admin/classes/c2/campus', { cookie: C1, body: { campusId: 'cs2' } });
  const doc = await req('GET', '/api/nhatky?classId=c2', { cookie: C3 });
  check('quản lý cơ sở 1 KHÔNG đọc được nhật ký nhóm của cơ sở 2', doc.status === 403, doc.status);
  const ghi = await req('PUT', '/api/nhatky', {
    cookie: C3, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's2', anTrua: 'het' }] },
  });
  check('và KHÔNG ghi được', ghi.status === 403, ghi.status);
  const cuaMinh = await req('GET', '/api/nhatky?classId=c1', { cookie: C3 });
  check('nhưng nhóm của cơ sở mình thì vẫn bình thường', cuaMinh.status === 200, cuaMinh.status);
}

// ===========================================================================
console.log('\n[10] Nhật ký nối thẳng với THỰC ĐƠN của ngày đó');
{
  // Nhà trường yêu cầu thẳng: "link luôn với thực đơn từng ngày, tránh phải gõ
  // tay lại". Không có phần này thì cô phải nhớ hôm nay ăn món gì rồi tự gõ vào
  // ô ghi chú — và hai màn hình của cùng một trường nói hai chuyện khác nhau về
  // cùng một bữa ăn.
  const td = await req('GET', '/api/menu?week=0', { cookie: GV });
  const menus = (td.data?.menus || []).filter(m => m.date <= HOM_NAY);
  const NGAY = menus[0]?.date;
  check('dữ liệu mẫu có ít nhất một ngày đã soạn thực đơn để đối chiếu', !!NGAY, td.data?.from);

  const r = await req('GET', `/api/nhatky?classId=c1&ngay=${NGAY}`, { cookie: GV });
  check('màn nhật ký của cô có kèm thực đơn', !!r.data?.thucDon, Object.keys(r.data || {}));

  // Không chỉ "có gì đó": phải là ĐÚNG món của màn Thực đơn. Sai chỗ này thì
  // app tự bịa ra một bữa ăn không ai nấu.
  const truaMenu = (menus[0].meals || []).find(m => m.type === 'lunch');
  check('bữa trưa trong nhật ký khớp TỪNG MÓN với màn Thực đơn',
    JSON.stringify(r.data?.thucDon?.anTrua?.mon) === JSON.stringify(truaMenu?.items),
    r.data?.thucDon?.anTrua);
  check('và mang theo tên bữa lẫn giờ ăn của trường',
    r.data?.thucDon?.anTrua?.ten === truaMenu?.label
    && r.data?.thucDon?.anTrua?.gio === truaMenu?.time, r.data?.thucDon?.anTrua);

  const ngayTrong = await req('GET', '/api/nhatky?classId=c1&ngay=2019-01-01', { cookie: GV });
  check('ngày chưa ai soạn thực đơn thì ba ô đều rỗng, KHÔNG phải lỗi',
    ngayTrong.status === 200 && ngayTrong.data?.thucDon
    && ngayTrong.data.thucDon.anTrua === null, ngayTrong.data?.thucDon);

  // Gia đình cũng phải thấy — đây mới là chỗ tiết kiệm công gõ thật sự: cô
  // không phải chép tên món vào ô ghi chú của từng bé.
  await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: NGAY, danhSach: [{ studentId: 's1', anTrua: 'het' }] },
  });
  const ph = await req('GET', `/api/nhatky?studentId=s1&tu=${NGAY}&den=${NGAY}`, { cookie: PH });
  check('màn của gia đình cũng kèm thực đơn hôm đó',
    JSON.stringify(ph.data?.ngayCo?.[0]?.thucDon?.anTrua?.mon) === JSON.stringify(truaMenu?.items),
    ph.data?.ngayCo?.[0]?.thucDon);
}

// ===========================================================================
console.log('\n[11] Tắt phân hệ Thực đơn thì nhật ký KHÔNG hiện thực đơn nữa');
{
  // CLAUDE.md hứa: tắt một tính năng thì "tính năng biến khỏi màn hình". Nhật
  // ký đọc thẳng bảng `menus`, nên nếu không hỏi công tắc thì trường tắt Thực
  // đơn xong vẫn thấy thực đơn cũ hiện ra ở đây — dữ liệu không còn ai cập
  // nhật, mà màn hình vẫn nói như thật.
  const tat = await req('PUT', '/api/admin/modules/thucdon', { cookie: C1, body: { enabled: false } });
  check('quản trị tắt được phân hệ Thực đơn', tat.status === 200, tat.status);

  const r = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  check('NHẬT KÝ VẪN CHẠY BÌNH THƯỜNG — tắt phân hệ khác không kéo theo phân hệ này',
    r.status === 200 && (r.data?.danhSach || []).length > 0, r.status);
  check('nhưng không còn thực đơn trong đó', r.data?.thucDon === null, r.data?.thucDon);

  const ph = await req('GET', '/api/nhatky?studentId=s1', { cookie: PH });
  check('màn của gia đình cũng vậy', ph.status === 200
    && (ph.data?.ngayCo || []).every(n => n.thucDon === null), ph.data?.ngayCo?.[0]?.thucDon);

  await req('PUT', '/api/admin/modules/thucdon', { cookie: C1, body: { enabled: true } });
  const lai = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  check('bật lại là thực đơn hiện lại, dữ liệu còn nguyên', !!lai.data?.thucDon, lai.data?.thucDon);
}

// ===========================================================================
console.log('\n[12] Giờ ngủ trưa: cô CHỌN trong khung, nhưng khung không phải hàng rào');
{
  const r = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  const khung = r.data?.khungGioNgu || [];
  check('máy chủ gửi kèm khung giờ ngủ để cô bấm', khung.length > 0, khung.length);
  check('mọi mốc đều đúng dạng HH:MM', khung.every(g => /^([01]\d|2[0-3]):[0-5]\d$/.test(g)), khung[0]);
  check('và xếp theo thứ tự tăng dần', khung.join(',') === khung.slice().sort().join(','));
  check('phủ đủ khung 12h–14h nhà trường nói',
    khung.includes('12:00') && khung.includes('13:00') && khung.includes('14:00'), khung);
  check('rộng hơn 12h–14h ở hai đầu — bé ngủ sớm hay dậy muộn là chuyện thường',
    khung[0] < '12:00' && khung[khung.length - 1] > '14:00', [khung[0], khung[khung.length - 1]]);

  // KHUNG LÀ ĐỂ BẤM NHANH, KHÔNG PHẢI ĐỂ CHẶN.
  //
  // Bé ngủ 09:50 vì sáng đó mệt là chuyện có thật. App từ chối ghi điều đã xảy
  // ra thì cô quay lại quyển sổ giấy — ở đó cô viết được mọi thứ.
  const ngoai = await req('PUT', '/api/nhatky', {
    cookie: GV,
    body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', nguTuLuc: '09:50', nguDenLuc: '10:20' }] },
  });
  check('giờ NGOÀI khung vẫn ghi được', ngoai.status === 200, ngoai.data);
  const doc = await req('GET', '/api/nhatky?classId=c1', { cookie: GV });
  const be = (doc.data?.danhSach || []).find(b => b.studentId === 's1');
  check('và đọc lại đúng như đã ghi', be?.nguTuLuc === '09:50' && be?.nguDenLuc === '10:20', be);

  const sai = await req('PUT', '/api/nhatky', {
    cookie: GV, body: { ngay: HOM_NAY, danhSach: [{ studentId: 's1', nguTuLuc: '25:00' }] },
  });
  check('nhưng giờ vô nghĩa thì vẫn bị từ chối', sai.status === 400, sai.status);

  // Màn hình phải GHÉP giờ đã lưu vào danh sách chọn. Thiếu bước này thì mở lại
  // bản ghi 09:50 sẽ thấy ô trống, và cô bấm Lưu lần nữa là XOÁ MẤT giờ cũ.
  const view = fs.readFileSync(path.join(GOC, 'modules/nhatky/view.js'), 'utf8');
  check('màn của cô ghép giờ đã lưu vào danh sách chọn, không bỏ rơi',
    /gioChon\([\s\S]*?!ds\.includes\(dangChon\)/.test(view));
  check('và không còn ô gõ giờ tự do cho giấc ngủ trưa',
    !/type="time"[^>]*ngu(TuLuc|DenLuc)/.test(view) && !/id="nk-ca-ngu-tu"[^>]*type="time"/.test(view));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
