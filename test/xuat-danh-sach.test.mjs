// Bài canh XUẤT DANH SÁCH BÉ RA EXCEL.
//
// Chạy bằng:  npm run test:xuat-danh-sach
//
// VÌ SAO CÓ BÀI NÀY
//
// Tệp này khác mọi màn hình khác ở một điểm: NÓ ĐI RA KHỎI APP. Nó nằm trong
// thư mục Tải về, được gửi qua Zalo, chép vào USB, gửi kèm email. Mọi chốt chặn
// của app dừng lại ở lúc bấm nút — sau đó là một tệp trần trong máy người ta.
//
// Nên ba thứ phải canh bằng máy, không bằng trí nhớ:
//
//   • ĐÚNG NGƯỜI. Chỉ quản trị. Cô và phụ huynh không có đường nào tới đây.
//   • ĐÚNG PHẠM VI. Quản lý một cơ sở xuất ra tệp của cơ sở mình, không phải cả
//     trường. Tệp này CHẶT HƠN màn hình mà nút bấm đang đứng cạnh, và đó là chủ
//     ý — xem chú thích ở routes/admin.js.
//   • KHÔNG BIẾN THÀNH THỨ CHẠY ĐƯỢC. Excel coi ô bắt đầu bằng = + - @ là công
//     thức và chạy nó. Họ tên và địa chỉ do người nhập gõ. Một cái tên bắt đầu
//     bằng "=" là đủ để tệp danh sách bé thành thứ chạy được trên máy văn phòng.
import fs from 'fs';
import path from 'path';
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, khoaVaoCoSo, MAU, GOC } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('xuat-danh-sach');
sinhDuLieu(DIR);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');      // Cấp 1 — cả trường
const mk3 = taoQuanTri(DIR, 'Quản lý CS1', 'quanlycs1');       // Cấp 3 — một cơ sở
khoaVaoCoSo(DIR, 'quanlycs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 3952), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(tenDangNhap, mkTam) {
  const d = await login(tenDangNhap, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(tenDangNhap, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);
const C3 = await vao('quanlycs1', mk3);
const GV = (await login('giaovien', '123456')).cookie;
const PH = (await login('phuhuynh', '123456')).cookie;

// Tải tệp về dưới dạng chữ, kèm mã trạng thái và tên tệp.
async function taiVe(cookie, query = '') {
  const res = await fetch(`${sv.BASE}/api/admin/students/xuat.csv${query}`, { headers: { cookie } });
  // Đọc từng byte chứ không gọi res.text(): chuẩn giải mã UTF-8 BÓC dấu BOM đi,
  // nên res.text() không bao giờ nhìn thấy nó — mà BOM đúng là thứ phải canh.
  const byte = new Uint8Array(await res.arrayBuffer());
  return {
    status: res.status,
    kieu: res.headers.get('content-type') || '',
    tenTep: (res.headers.get('content-disposition') || ''),
    byte,
    chu: new TextDecoder('utf-8').decode(byte),
  };
}

// Đọc tệp CSV thành các dòng ô, hiểu cả ô có dấu nháy kép.
function docCsv(chu) {
  const sach = chu.replace(/^﻿/, '');
  const dong = [];
  let o = '', hang = [], trongNhay = false;
  for (let i = 0; i < sach.length; i++) {
    const c = sach[i];
    if (trongNhay) {
      if (c === '"' && sach[i + 1] === '"') { o += '"'; i++; }
      else if (c === '"') trongNhay = false;
      else o += c;
    } else if (c === '"') trongNhay = true;
    else if (c === ',') { hang.push(o); o = ''; }
    else if (c === '\r') { /* bỏ qua */ }
    else if (c === '\n') { hang.push(o); dong.push(hang); hang = []; o = ''; }
    else o += c;
  }
  if (o || hang.length) { hang.push(o); dong.push(hang); }
  return dong.filter(h => h.length > 1 || h[0] !== '');
}

// ===========================================================================
console.log('\n[1] Chỉ quản trị mới xuất được — tệp này là cả trường trong một tệp');
{
  const qt = await taiVe(C1);
  check('quản trị tải được tệp', qt.status === 200, qt.status);
  check('trình duyệt nhận ra đây là tệp để tải về, không phải trang web',
    /attachment/.test(qt.tenTep) && /danh-sach-be-\d{4}-\d{2}-\d{2}\.csv/.test(qt.tenTep), qt.tenTep);
  check('có dấu BOM ở đầu — không có thì Excel trên Windows hiện tiếng Việt thành ký tự lạ',
    qt.byte[0] === 0xEF && qt.byte[1] === 0xBB && qt.byte[2] === 0xBF,
    [...qt.byte.slice(0, 3)]);

  const co = await taiVe(GV);
  check('CÔ KHÔNG XUẤT ĐƯỢC danh sách bé', co.status === 403, co.status);
  const ph = await taiVe(PH);
  check('PHỤ HUYNH KHÔNG XUẤT ĐƯỢC danh sách bé', ph.status === 403, ph.status);
  const la = await fetch(`${sv.BASE}/api/admin/students/xuat.csv`);
  check('người chưa đăng nhập cũng không', la.status === 401 || la.status === 403, la.status);
}

// ===========================================================================
console.log('\n[2] Nội dung đủ để văn phòng làm báo cáo');
{
  const { chu } = await taiVe(C1);
  const dong = docCsv(chu);
  const dau = dong[0];
  for (const cot of ['Mã bé', 'Họ và tên', 'Ngày sinh', 'Tuổi', 'Nhóm lớp', 'Cơ sở',
    'Số định danh cá nhân', 'Tiền sử bệnh / lưu ý đặc biệt', 'Bố / mẹ', 'Người liên hệ khẩn cấp']) {
    check(`có cột "${cot}"`, dau.includes(cot), dau);
  }
  check('xuất đủ mọi bé đang học của dữ liệu mẫu', dong.length - 1 === MAU.soBe, dong.length - 1);

  const an = dong.find(h => h[1] === 'Nguyễn Bảo An');
  check('bé An có đủ nhóm lớp và cơ sở', an && an[dau.indexOf('Nhóm lớp')] === 'Chồi 2'
    && an[dau.indexOf('Cơ sở')] === 'Cơ sở 1', an);
  check('cột Tuổi nói bằng tiếng người, không phải một con số trần',
    /^\d+ (tuổi|tháng)( \d+ tháng)?$/.test(an[dau.indexOf('Tuổi')] || ''), an && an[dau.indexOf('Tuổi')]);

  // BÉ 14 THÁNG PHẢI ĐỌC LÀ "14 THÁNG", KHÔNG PHẢI "1 TUỔI".
  //
  // Đây là ví dụ mở đầu của CLAUDE.md, và nó từng SAI thật: hàm tính tuổi chỉ
  // đếm tháng cho bé dưới 12 tháng, nên bé 14 tháng ra đúng "1 tuổi". Không ai
  // thấy suốt một thời gian dài vì dữ liệu mẫu không có bé nào dưới 4 tuổi —
  // chỉ tới khi thêm nhóm nhà trẻ (N20) thì lỗi mới lộ ra.
  const huy = dong.find(h => h[1] === 'Ngô Gia Huy');       // 14 tháng
  const khoi = dong.find(h => h[1] === 'Trịnh Minh Khôi');  // 38 tháng
  check('BÉ 14 THÁNG ĐỌC LÀ "14 tháng", KHÔNG phải "1 tuổi"',
    huy && huy[dau.indexOf('Tuổi')] === '14 tháng', huy && huy[dau.indexOf('Tuổi')]);
  check('bé đã qua 36 tháng thì mới nói bằng năm',
    khoi && /^3 tuổi/.test(khoi[dau.indexOf('Tuổi')] || ''), khoi && khoi[dau.indexOf('Tuổi')]);

  // Hai bản của hàm tính tuổi — một ở máy chủ cho tệp Excel, một ở trình duyệt
  // cho màn hồ sơ bé — buộc phải ở hai nơi vì trình duyệt không nạp được tệp
  // trong lib/. Canh để chúng không trôi ra khỏi nhau: lệch mốc là cùng một bé
  // đọc ra hai tuổi khác nhau ở hai màn hình.
  const maMayChu = fs.readFileSync(path.join(GOC, 'routes/admin.js'), 'utf8');
  const maManHinh = fs.readFileSync(path.join(GOC, 'public/js/views/student.js'), 'utf8');
  check('HAI BẢN CỦA HÀM TÍNH TUỔI DÙNG CÙNG MỘT MỐC 36 THÁNG',
    /thang < 36/.test(maMayChu) && /thang < 36/.test(maManHinh),
    [/thang < 36/.test(maMayChu), /thang < 36/.test(maManHinh)]);

  const ducAnh = dong.find(h => h[1] === 'Vũ Đức Anh');
  check('tiền sử bệnh đi theo bé ra tệp — thứ văn phòng cần khi làm hồ sơ sức khỏe',
    /đậu phộng/i.test(ducAnh[dau.indexOf('Tiền sử bệnh / lưu ý đặc biệt')] || ''), ducAnh);
  check('người liên hệ khẩn cấp có tên, quan hệ và số gọi trong CÙNG một ô',
    /—/.test(an[dau.indexOf('Người liên hệ khẩn cấp')] || '')
    && /\(/.test(an[dau.indexOf('Người liên hệ khẩn cấp')] || ''), an && an[dau.indexOf('Người liên hệ khẩn cấp')]);

  // Bé đã nghỉ: mặc định không xuất, hỏi thì mới có.
  await req('DELETE', '/api/admin/students/s6', { cookie: C1 });
  const macDinh = docCsv((await taiVe(C1)).chu);
  check('MẶC ĐỊNH KHÔNG XUẤT BÉ ĐÃ NGHỈ — sĩ số báo cáo phải là bé đang học',
    !macDinh.some(h => h[1] === 'Hoàng Gia Bảo'), macDinh.length - 1);
  const keCaNghi = docCsv((await taiVe(C1, '?keCaNghi=1')).chu);
  const nghi = keCaNghi.find(h => h[1] === 'Hoàng Gia Bảo');
  check('hỏi thì có, và ghi rõ bé đã nghỉ', !!nghi && nghi[keCaNghi[0].indexOf('Tình trạng')] === 'Đã nghỉ', nghi);
}

// ===========================================================================
console.log('\n[3] Quản lý một cơ sở xuất ra tệp CỦA CƠ SỞ MÌNH');
{
  // Chuyển nhóm Lá 1 sang cơ sở 2 để hai cơ sở có bé thật.
  const mv = await req('PUT', '/api/admin/classes/c2/campus', { cookie: C1, body: { campusId: 'cs2' } });
  check('chuyển được nhóm Lá 1 sang cơ sở 2', mv.status === 200, mv.status);

  const cua3 = docCsv((await taiVe(C3)).chu);
  const ten3 = cua3.slice(1).map(h => h[1]);
  check('quản lý cơ sở 1 CHỈ xuất ra bé của cơ sở 1',
    ten3.length > 0 && ten3.every(t => !['Nguyễn Bảo Nam', 'Bùi Minh Thư', 'Vũ Hải Đăng'].includes(t)), ten3);
  // 079321005678 là số định danh của bé Nguyễn Bảo Nam — nhóm Lá 1, cơ sở 2.
  const chu3 = (await taiVe(C3)).chu;
  check('KHÔNG số định danh nào của cơ sở khác lọt vào tệp', !/079321005678/.test(chu3));
  check('và cũng không có tiền sử bệnh của bé cơ sở khác', !/tôm cua/i.test(chu3));

  const cua1 = docCsv((await taiVe(C1)).chu);
  check('còn Cấp 1 vẫn xuất được cả trường — tầng cơ sở không cắt bớt quyền cũ',
    cua1.length > cua3.length, [cua1.length, cua3.length]);
}

// ===========================================================================
console.log('\n[4] Tệp không được biến thành thứ chạy được trên máy văn phòng');
{
  await req('PUT', '/api/admin/students/s1', {
    cookie: C1,
    body: { name: '=1+1', address: '@SUM(A1:A9)', tienSuBenh: '-2+3' },
  });
  const dong = docCsv((await taiVe(C1)).chu);
  const dau = dong[0];
  const hang = dong.find(h => /1\+1/.test(h[dau.indexOf('Họ và tên')] || ''));
  check('ô bắt đầu bằng "=" bị vô hiệu hóa trước khi vào tệp',
    hang && hang[dau.indexOf('Họ và tên')] === "'=1+1", hang && hang[dau.indexOf('Họ và tên')]);
  check('ô bắt đầu bằng "@" cũng vậy',
    hang && hang[dau.indexOf('Địa chỉ')] === "'@SUM(A1:A9)", hang && hang[dau.indexOf('Địa chỉ')]);
  check('ô bắt đầu bằng "-" cũng vậy',
    hang && hang[dau.indexOf('Tiền sử bệnh / lưu ý đặc biệt')] === "'-2+3",
    hang && hang[dau.indexOf('Tiền sử bệnh / lưu ý đặc biệt')]);

  // Trả lại tên cũ để mục sau đọc đúng.
  await req('PUT', '/api/admin/students/s1', { cookie: C1, body: { name: 'Nguyễn Bảo An' } });
}

// ===========================================================================
console.log('\n[5] Mỗi lần xuất đều để lại dấu — hỏi "ai đã tải" phải trả lời được');
{
  const nk = await req('GET', '/api/admin/audit', { cookie: C1 });
  const ds = Array.isArray(nk.data) ? nk.data : (nk.data?.rows || nk.data?.items || []);
  const dauVet = ds.filter(x => x.action === 'students-export');
  check('nhật ký có ghi lần xuất danh sách', dauVet.length > 0, dauVet.length);
  check('ghi rõ AI đã xuất — nhật ký trả về tên người, không phải mã tài khoản',
    dauVet[0] && /Hiệu Trưởng|Quản lý/.test(dauVet[0].who || ''), dauVet[0]);
  check('và xuất RA BAO NHIÊU BÉ — con số nói được mức độ của lần tải đó',
    dauVet.some(x => /soBe/.test(typeof x.detail === 'string' ? x.detail : JSON.stringify(x.detail || ''))),
    dauVet[0] && dauVet[0].detail);
}

// ===========================================================================
console.log('\n[+] TUỔI CỦA BÉ NHÀ TRẺ KHÔNG ĐƯỢC PHỤ THUỘC VÀO HÔM NAY LÀ MÙNG MẤY');
{
  // Bản đầu của `thangTruoc` trong data/seed.js GHIM CỨNG ngày 12. Nó đúng từ
  // ngày 12 trở đi của tháng, và SAI ĐÚNG MỘT THÁNG vào mùng 1 đến 11: lùi 14
  // tháng từ mùng 1 tháng 9 ra "12 tháng 7", muộn hơn mùng 1 tháng 7 mười một
  // ngày, nên bé đọc ra 13 tháng chứ không phải 14.
  //
  // Mục [2] ở trên bắt được, nhưng CHỈ vào 11 ngày đầu mỗi tháng — nghĩa là bộ
  // kiểm thử xanh 20 ngày rồi đỏ 11 ngày mà không ai đụng vào mã. Đúng kiểu
  // hỏng nằm chờ ngày trường cài máy mới nổ, và cũng đúng kiểu làm người tiếp
  // quản mất lòng tin vào bộ kiểm thử.
  //
  // Bài này lấy CHÍNH hàm đang nằm trong data/seed.js ra chạy — không chép lại
  // công thức — rồi thử với MỌI ngày trong tháng của ba năm liên tiếp. Ai sửa
  // công thức thì bài chạy đúng công thức mới.
  const nguonSeed = fs.readFileSync(path.join(GOC, 'data/seed.js'), 'utf8');
  const than = (() => {
    const i = nguonSeed.indexOf('function thangTruoc(n)');
    if (i < 0) return null;
    let mo = nguonSeed.indexOf('{', i), sau = mo, d = 0;
    for (; sau < nguonSeed.length; sau++) {
      if (nguonSeed[sau] === '{') d++;
      else if (nguonSeed[sau] === '}' && --d === 0) break;
    }
    return nguonSeed.slice(mo + 1, sau);
  })();
  check('đọc được hàm thangTruoc từ data/seed.js', !!than && than.includes('getUTCMonth'), than);

  // Dựng lại hàm với `today` do bài này quyết định. Dịch MỘT LẦN rồi gọi lại,
  // chứ không dịch trong vòng lặp ba nghìn vòng.
  const thangTruocVoi = new Function('today', 'n', than);

  // Đếm số tháng tròn — cùng cách máy chủ tính tuổi bé.
  const soThangTron = (dob, hom) => {
    const a = new Date(dob + 'T00:00:00Z'), b = new Date(hom + 'T00:00:00Z');
    let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    if (b.getUTCDate() < a.getUTCDate()) m--;
    return m;
  };

  const sai = [];
  let daThu = 0;
  for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2028, 11, 31); t += 86400000) {
    const today = new Date(t);
    const hom = today.toISOString().slice(0, 10);
    for (const n of [14, 34, 38]) {      // đúng ba bé nhà trẻ của dữ liệu mẫu
      daThu++;
      const dob = thangTruocVoi(today, n);
      const ra = soThangTron(dob, hom);
      if (ra !== n) sai.push(sai.length < 5 ? { hom, muon: n, ra, dob } : null);
    }
  }
  check('thử đủ mọi ngày của ba năm, không phải chỉ vài ngày', daThu >= 3000, daThu);
  check('BÉ MẪU LUÔN ĐÚNG SỐ THÁNG, DÙ HÔM NAY LÀ MÙNG MẤY',
    sai.length === 0, sai.filter(Boolean).slice(0, 5));

  // Đối chứng: bản ghim cứng ngày 12 PHẢI sai, nếu không thì phép thử ở trên
  // không chứng minh được gì.
  const banCu = (today, n) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - n, 12));
    return d.toISOString().slice(0, 10);
  };
  const mung1 = new Date(Date.UTC(2026, 8, 1));
  check('ĐỐI CHỨNG: bản ghim cứng ngày 12 ra sai vào mùng 1 — bài trên có bắt thật',
    soThangTron(banCu(mung1, 14), '2026-09-01') === 13,
    soThangTron(banCu(mung1, 14), '2026-09-01'));
}

sv.dung();
donThuMucTam(DIR);
tongKet();
