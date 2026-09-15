// Bài canh MÀN "XEM THEO TỪNG LỨA" CỦA VĂN PHÒNG (Đ206 — việc 13).
//
// Chạy bằng:  npm run test:cambridge-theo-lua
//
// Mã đã tách đủ ba lứa từ Đ187, nhưng văn phòng chưa có chỗ nào nhìn theo lứa.
// Câu họ cần trả lời rất cụ thể: *"lứa 5–6 năm nay có mấy bé, và đã có bài nào
// cho lứa ấy chưa"* — hôm nay phải mở từng bài ra đếm bằng mắt.
//
// VÀ ĐÂY LÀ MÀN DỄ TRƯỢT QUY TẮC 4 NHẤT TRONG CẢ PHÂN HỆ.
//
// Nó có sẵn cả hai nửa của cái bảng bị cấm: danh sách bé, và số bài. Ghép hai
// nửa lại là ra "bé này học được mấy bài", rồi xếp các bé theo con số ấy — và
// bước đó chỉ cách bản đúng đúng một dòng mã. Mục [3] canh riêng chuyện đó.
//
// Vế thứ hai, thuộc QUY TẮC 2: lứa CHƯA CÓ BÀI NÀO và bé CHƯA VÀO chương
// trình không được trình bày như một khoảng trống cần lấp. Máy chỉ nói con số;
// màn hình nói thành câu, và nói kèm LÝ DO.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('cambridge-theo-lua');
sinhDuLieu(DIR);
batPhanHe(DIR, ['cambridge']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng C', 'c_qt');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2 C', 'c_cs2');
khoaVaoCoSo(DIR, 'c_cs2', 'cs2');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4821), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d0 = await login('c_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d0.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('c_qt', 'quantri2026')).cookie;
  const d2 = await login('c_cs2', mkCS2);
  await req('POST', '/api/auth/set-new-password', { cookie: d2.cookie, body: { newPassword: 'quantri2026' } });
  const CS2 = (await login('c_cs2', 'quantri2026')).cookie;
  const CO = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] VĂN PHÒNG NHÌN ĐƯỢC BA LỨA, và mỗi lứa nói đủ hai con số');
  {
    const d = await req('GET', '/api/cambridge/theo-lua', { cookie: QT });
    check('văn phòng mở được màn theo lứa', d.status === 200,
      `${d.status} ${JSON.stringify(d.data).slice(0, 160)}`);
    check('đủ BA lứa, không thiếu lứa nào', (d.data.lua || []).length === 3,
      (d.data.lua || []).map(x => x.ma));
    check('và đúng ba lứa của chương trình',
      (d.data.lua || []).map(x => x.ma).join(',') === '3-4,4-5,5-6',
      (d.data.lua || []).map(x => x.ma));
    for (const l of d.data.lua || []) {
      check(`lứa ${l.ma} nói được SỐ BÉ`, typeof l.soBe === 'number', l.soBe);
      check(`lứa ${l.ma} nói được SỐ BÀI`, typeof l.soBai === 'number', l.soBai);
    }
    check('phép quét NHÌN THẤY bé thật — không phải bảng rỗng',
      (d.data.lua || []).reduce((s, l) => s + l.soBe, 0) > 0,
      (d.data.lua || []).map(l => `${l.ma}:${l.soBe}`).join(' '));
    check('và nói ra đang đếm trên mấy nhóm', d.data.soNhom > 0, d.data.soNhom);
  }

  // =========================================================================
  console.log('\n[2] BÉ NHÓM NHÀ TRẺ ĐỨNG NGOÀI — lời khai thắng ngày sinh (Đ193)');
  {
    // Nhóm Nhà trẻ 1 (c4) có bé 34 và 38 tháng. Bé 38 tháng đủ tuổi lứa 3–4
    // theo ngày sinh, nhưng nhóm đã khai là nhà trẻ nên bé ấy KHÔNG vào
    // chương trình — cùng luật Đ193 đã dựng cho nhật ký ngày.
    const khai = await req('PUT', '/api/admin/classes/c4/lua-tuoi', {
      cookie: QT, body: { lua: 'nha-tre' },
    });
    // ĐỐI CHỨNG PHẢI ĐỌC GIÁ TRỊ TRẢ VỀ, KHÔNG CHỈ ĐỌC MÃ 200.
    //
    // Bản đầu của dòng này gửi nhầm tên ô (`khai` thay vì `lua`) — đường ấy
    // hiểu ô rỗng là "GỠ lời khai", nên nó trả về 200 và bài canh đi tiếp với
    // nhóm c4 KHÔNG hề được khai là nhà trẻ. Một đối chứng chỉ đọc mã 200 là
    // một đối chứng không đối chứng gì cả.
    check('đối chứng — khai được nhóm c4 là nhà trẻ',
      khai.status === 200 && khai.data && khai.data.lua === 'nha-tre',
      `${khai.status} ${JSON.stringify(khai.data).slice(0, 140)}`);

    const d = await req('GET', '/api/cambridge/theo-lua', { cookie: QT });
    const ngoai = d.data.ngoaiChuongTrinh || [];
    check('có bé nằm ngoài chương trình', ngoai.length > 0, ngoai.length);
    check('và bé nhóm nhà trẻ nằm trong số đó',
      ngoai.some(b => /Nhà trẻ/.test(b.tenNhom)), ngoai.map(b => b.tenNhom));
    check('MỖI BÉ NGOÀI CHƯƠNG TRÌNH ĐỀU KÈM LÝ DO — không phải danh sách thiếu sót',
      ngoai.every(b => !!b.viSao), ngoai.map(b => b.viSao));
    check('và lý do nói đúng: nhóm nhà trẻ, hoặc chưa tới tuổi',
      ngoai.every(b => /nhà trẻ|chưa tới tuổi/.test(b.viSao)), [...new Set(ngoai.map(b => b.viSao))]);
    check('bé nhóm nhà trẻ KHÔNG bị xếp vào lứa nào',
      !(d.data.lua || []).some(l => l.danhSachBe.some(b => /Nhà trẻ/.test(b.tenNhom))),
      (d.data.lua || []).flatMap(l => l.danhSachBe.map(b => b.tenNhom)));
  }

  // =========================================================================
  console.log('\n[3] QUY TẮC 4 — màn này KHÔNG được ghép bé với một con số của riêng bé');
  {
    const d = await req('GET', '/api/cambridge/theo-lua', { cookie: QT });
    const chuoi = JSON.stringify(d.data || {});
    check('KHÔNG có phần trăm, điểm, thứ hạng nào',
      !/%|"diem"|"score"|"rank"|"thuHang"|"xepLoai"|"xepHang"/i.test(chuoi), chuoi.slice(0, 200));

    // CHỖ TRƯỢT THẬT: mỗi dòng bé chỉ được mang tên và nhóm. Thêm một con số
    // vào đó — "đã học 4 bài" — là ra đúng cái bảng bị cấm.
    const moiBe = (d.data.lua || []).flatMap(l => l.danhSachBe);
    check('đối chứng — có bé thật để soi', moiBe.length > 0, moiBe.length);
    const thuaKhoa = [...new Set(moiBe.flatMap(b => Object.keys(b)))]
      .filter(k => !['studentId', 'hoTen', 'tenNhom'].includes(k));
    check('MỖI DÒNG BÉ CHỈ MANG TÊN VÀ NHÓM — không một con số nào của riêng bé',
      thuaKhoa.length === 0, thuaKhoa);
    check('và không dòng bé nào mang giá trị kiểu số',
      !moiBe.some(b => Object.values(b).some(v => typeof v === 'number')),
      moiBe.slice(0, 2));

    // Bài "mọi lứa" KHÔNG cộng vào từng lứa — cộng vào là con số mỗi lứa
    // trông đầy hơn thực tế, và văn phòng tưởng lứa ấy đã đủ tài liệu.
    check('bài "mọi lứa" đếm RIÊNG, không cộng vào lứa nào',
      typeof d.data.baiMoiLua === 'number', d.data.baiMoiLua);

    // QUY TẮC 2 ở màn hình: lứa chưa có bài nói thành câu, không thành ô đỏ.
    const view = fs.readFileSync(path.join(GOC, 'modules/cambridge/view.js'), 'utf8');
    const khoi = view.slice(view.indexOf('async moTheoLua('), view.indexOf('khoiBlock(d) {'));
    check('đối chứng — cắt đúng khối màn theo lứa', khoi.includes('theo-lua'), khoi.length);
    check('lứa chưa có bài nói thành CÂU, không phải số 0 trơ trọi',
      /Chưa có bài nào đăng riêng cho lứa này/.test(khoi));
    check('và màn nói rõ nó KHÔNG nói bé nào học tới đâu',
      /không.{0,20}nói bé nào học tới đâu/i.test(khoi), (khoi.match(/.*học tới đâu.*/) || [])[0]);
    check('màn không dựng thanh tiến độ hay phần trăm nào',
      !/progress|width:\s*\$\{|%<\/|tiến độ/i.test(khoi),
      (khoi.match(/.*(progress|tiến độ).*/i) || [])[0]);
  }

  // =========================================================================
  console.log('\n[4] PHÂN QUYỀN — văn phòng đọc, cô và gia đình thì không');
  {
    const co = await req('GET', '/api/cambridge/theo-lua', { cookie: CO });
    check('CÔ KHÔNG mở được màn này', co.status === 403, co.status);
    check('và câu từ chối chỉ ra chỗ cô vẫn làm được',
      /Hành trình|Cùng con ở nhà/.test(co.data?.error || ''), co.data?.error);
    const ph = await req('GET', '/api/cambridge/theo-lua', { cookie: PH });
    check('GIA ĐÌNH KHÔNG mở được màn này', ph.status === 403, ph.status);
  }

  // =========================================================================
  console.log('\n[5] TẦNG CƠ SỞ — quản lý cơ sở chỉ đếm bé của cơ sở mình');
  {
    // Nhóm Chồi 2 (c1) và Nhà trẻ 1 (c4) ở cơ sở 1; Mầm 1 (c3) ở cơ sở 2.
    const cs2 = await req('GET', '/api/cambridge/theo-lua', { cookie: CS2 });
    check('quản lý cơ sở 2 mở được màn', cs2.status === 200, cs2.status);
    const ten = [...(cs2.data.lua || []).flatMap(l => l.danhSachBe),
      ...(cs2.data.ngoaiChuongTrinh || [])].map(b => b.tenNhom);
    check('và KHÔNG thấy nhóm nào của cơ sở 1',
      !ten.some(x => /Chồi 2|Nhà trẻ 1|Lá 1/.test(x)), [...new Set(ten)]);

    const c1 = await req('GET', '/api/cambridge/theo-lua', { cookie: QT });
    const tenC1 = (c1.data.lua || []).flatMap(l => l.danhSachBe).map(b => b.tenNhom);
    check('đối chứng — Cấp 1 thì thấy nhóm của cơ sở 1',
      tenC1.some(x => /Chồi 2/.test(x)), [...new Set(tenC1)]);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
