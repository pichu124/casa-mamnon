// Bài canh MÀN TỔNG QUAN MỘT NGÀY CỦA CẢ TRƯỜNG (Đ162).
//
// Chạy bằng:  npm run test:mot-ngay-truong
//
// NHÀ TRƯỜNG XIN GÌ
//
// 07/09: một màn cho hiệu trưởng — tổng số bé; hôm nay đi học / ra về; số nghỉ
// phân theo lý do; số cô và số cô đi làm hôm nay; thống kê nộp học phí; chọn
// từng cơ sở, xem theo ngày. `/api/admin/overview` trước đợt này chỉ trả năm
// con số đếm đầu người — đúng cho việc quản trị, nhưng không trả lời được câu
// hiệu trưởng hỏi mỗi sáng.
//
// BA ĐIỀU CỐ Ý, VÀ CẢ BA ĐỀU ĐƯỢC CANH Ở ĐÂY
//
// [3] KHÔNG MỘT PHẦN TRĂM NÀO, KHÔNG SO CƠ SỞ NÀO HƠN CƠ SỞ NÀO. Mọi con số là
//     số đếm đầu người trong một ngày; bảng cơ sở xếp theo TÊN. Xếp theo sĩ số
//     là biến màn này thành bảng đua nhau giữa ba cơ sở, mà đằng sau mỗi con
//     số ấy là trẻ con đi học hay ở nhà (QUY TẮC 4).
//
// [4] PHÂN HỆ TẮT THÌ TRẢ `null`, KHÔNG TRẢ 0. Hai thứ khác hẳn nhau: 0 nghĩa
//     là "đếm được, và bằng không"; `null` nghĩa là "không có sổ để đếm". Trả
//     0 khi Điểm danh đang tắt là nói với hiệu trưởng rằng hôm nay không bé
//     nào tới lớp.
//
// [5] CẤP 3 CHỈ THẤY CƠ SỞ MÌNH, và KHÔNG nhận bảng chia theo cơ sở — đó đúng
//     là thứ màn Tổng quan đã cố ý che (quy mô của cơ sở khác).
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, tatPhanHe, khoaVaoCoSo, datChucVu,
  HOM_NAY, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('mot-ngay-truong');
sinhDuLieu(DIR);
batPhanHe(DIR, ['diemdanh', 'xinphep', 'nhansu', 'hocphi']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng MN', 'mn_qt');
const mkCS2 = taoQuanTri(DIR, 'Quản lý CS2 MN', 'mn_cs2');
khoaVaoCoSo(DIR, 'mn_cs2', 'cs2');
datChucVu(DIR, 'mn_cs2', 'quanly-coso');

const CSDL = path.join(DIR, 'school.db');
const HOM = HOM_NAY();
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4791), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const motNgay = async (cookie, q = '') => (await req('GET', `/api/admin/mot-ngay${q}`, { cookie })).data;

// Sổ điểm danh hôm nay do dữ liệu mẫu sinh ra không đoán trước được, nên bài
// này DỰNG LẤY sổ của chính hôm nay: xoá sạch rồi ghi đúng những dòng mình
// muốn đếm. Đo trên một con số mình không đặt ra thì phép kiểm chẳng nói gì.
function dungSoDiemDanh() {
  const conn = new Database(CSDL);
  try {
    const be = conn.prepare("SELECT id, classId FROM students WHERE active = 1 ORDER BY id").all();
    conn.prepare('DELETE FROM attendance WHERE date = ?').run(HOM);
    const them = conn.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, checkOut, note, markedBy)
                               VALUES (?, ?, ?, ?, ?, ?, '', 't1')`);
    const dat = [
      ['present', '07:40', '16:30'],   // có mặt, đã ra về
      ['present', '07:45', null],      // có mặt, chưa ra về
      ['absent_excused', null, null],
      ['absent_unexcused', null, null],
    ];
    let i = 0;
    for (const b of be) {
      if (i >= dat.length) break;
      const [tt, vao2, ra] = dat[i];
      them.run(`at_mn_${i}`, b.id, HOM, tt, vao2, ra);
      i += 1;
    }
    return { soBe: be.length, daCham: Math.min(dat.length, be.length) };
  } finally { conn.close(); }
}

try {
  const QT = await vao('mn_qt', mkQT);
  const CS2 = await vao('mn_cs2', mkCS2);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;
  const boi = dungSoDiemDanh();

  // =========================================================================
  console.log('\n[1] Hiệu trưởng mở được màn một ngày, và con số đúng như sổ');
  {
    const d = await motNgay(QT);
    check('mở được màn', !!d && !!d.be, d);
    check('mặc định là HÔM NAY', d.ngay === HOM && d.laHomNay === true, { ngay: d.ngay, hom: HOM });
    check('tổng số bé đang học đúng', d.be.dangHoc === boi.soBe, { noi: d.be.dangHoc, that: boi.soBe });
    check('có mặt: đếm đúng hai dòng present', d.be.coMat === 2, d.be.coMat);
    check('đã ra về: đếm đúng dòng có giờ ra', d.be.daRaVe === 1, d.be.daRaVe);
    check('nghỉ có phép và nghỉ không phép tách riêng',
      d.be.nghiCoPhep === 1 && d.be.nghiKhongPhep === 1, { cp: d.be.nghiCoPhep, kp: d.be.nghiKhongPhep });
    check('chưa chấm = số bé trừ số dòng đã có',
      d.be.chuaCham === boi.soBe - boi.daCham, { noi: d.be.chuaCham, that: boi.soBe - boi.daCham });
  }

  // =========================================================================
  console.log('\n[2] Chọn ngày khác, và ngày sai dạng thì từ chối');
  {
    const sai = await req('GET', '/api/admin/mot-ngay?ngay=11-09-2026', { cookie: QT });
    check('ngày sai dạng thì từ chối và nói ví dụ đúng',
      sai.status === 400 && /2026-09/.test(sai.data?.error || ''), sai.data);

    const truoc = new Date(Date.parse(`${HOM}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
    const d = await motNgay(QT, `?ngay=${truoc}`);
    check('xem được một ngày đã qua', d.ngay === truoc && d.laHomNay === false, d.ngay);
    check('và ngày đó KHÔNG mang con số của hôm nay',
      d.be.coMat !== 2 || d.be.daRaVe !== 1, { coMat: d.be.coMat, raVe: d.be.daRaVe });
  }

  // =========================================================================
  console.log('\n[3] KHÔNG phần trăm, KHÔNG xếp hạng cơ sở (QUY TẮC 4)');
  {
    const d = await motNgay(QT);
    const tho = JSON.stringify(d);
    check('máy chủ KHÔNG trả về trường phần trăm hay tỉ lệ nào',
      !/phanTram|tiLe|percent|ratio/i.test(tho), tho.slice(0, 200));
    check('và không có chuỗi nào kèm dấu phần trăm', !/\d\s*%/.test(tho), tho.slice(0, 200));

    check('có bảng chia theo cơ sở cho hiệu trưởng', (d.theoCoSo || []).length >= 2, (d.theoCoSo || []).length);
    const ten = d.theoCoSo.map(x => x.ten);
    const daXep = [...ten].sort((a, b) => String(a).localeCompare(String(b), 'vi'));
    check('cơ sở xếp theo TÊN, không xếp theo sĩ số',
      JSON.stringify(ten) === JSON.stringify(daXep), ten);
    // Đối chứng: phải có cơ sở lệch sĩ số, nếu không thì phép kiểm trên vô nghĩa.
    check('đối chứng — các cơ sở KHÔNG cùng sĩ số, nên phép so trên có nghĩa',
      new Set(d.theoCoSo.map(x => x.dangHoc)).size > 1, d.theoCoSo.map(x => x.dangHoc));

    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
    const dau = v.indexOf('async veMotNgay() {');
    // Cắt tới hết thân hàm, không cắt theo số ký tự — đếm tay là tự gài bẫy cho mình.
    const cuoi = v.indexOf('\n  },', dau);
    const than = v.slice(dau, cuoi > dau ? cuoi : v.length);
    check('màn hình nói rõ đây không phải bảng so cơ sở nào hơn cơ sở nào',
      /không phải bảng so cơ sở nào hơn/.test(than), 'admin.js');
    check('và "chưa chấm" được giải thích là việc của người lớn, không nói về bé',
      /việc của người lớn chưa xong/.test(than), 'admin.js');
  }

  // =========================================================================
  console.log('\n[4] Phân hệ TẮT thì trả null, KHÔNG trả 0');
  {
    const co = await motNgay(QT);
    check('bật Nhân sự thì có khối chấm công', co.co && typeof co.co.tong === 'number', co.co);
    check('bật Học phí thì có khối học phí', co.hocPhi && typeof co.hocPhi.daNop === 'number', co.hocPhi);

    tatPhanHe(DIR, ['nhansu', 'hocphi', 'diemdanh']);
    await sv.khoiDongLai();
    const tat = await motNgay(QT);
    check('tắt Nhân sự thì khối chấm công là null, không phải số 0', tat.co === null, tat.co);
    check('tắt Học phí thì khối học phí là null', tat.hocPhi === null, tat.hocPhi);
    check('tắt Điểm danh thì mọi con số của sổ điểm danh là null',
      tat.be.coMat === null && tat.be.daRaVe === null
        && tat.be.nghiCoPhep === null && tat.be.chuaCham === null, tat.be);
    check('nhưng tổng số bé đang học VẪN đếm được — đó là bảng của phần lõi',
      tat.be.dangHoc === boi.soBe, tat.be.dangHoc);

    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
    const dau = v.indexOf('async veMotNgay() {');
    check('màn hình vẽ dấu gạch cho null, không vẽ số 0',
      /=== null \|\| v === undefined \? '—'/.test(v.slice(dau, dau + 1200)), 'admin.js');

    batPhanHe(DIR, ['nhansu', 'hocphi', 'diemdanh']);
    await sv.khoiDongLai();
  }

  // =========================================================================
  console.log('\n[5] Cấp 3 chỉ thấy cơ sở mình, cô và gia đình không vào được');
  {
    const cs2 = await motNgay(CS2);
    check('quản lý cơ sở mở được màn', !!cs2 && !!cs2.be, cs2);
    check('và KHÔNG nhận bảng chia theo cơ sở — đó là quy mô của cơ sở khác',
      (cs2.theoCoSo || []).length === 0, cs2.theoCoSo);
    const qt = await motNgay(QT);
    check('sĩ số của cơ sở 2 nhỏ hơn sĩ số toàn trường',
      cs2.be.dangHoc < qt.be.dangHoc, { cs2: cs2.be.dangHoc, qt: qt.be.dangHoc });
    check('và máy nói rõ mình đang khoá ở cơ sở nào', cs2.coSo === 'cs2', cs2.coSo);

    check('CÔ không mở được', (await req('GET', '/api/admin/mot-ngay', { cookie: GV })).status === 403);
    check('gia đình càng không', (await req('GET', '/api/admin/mot-ngay', { cookie: PH })).status === 403);
  }

  // =========================================================================
  console.log('\n[5b] Thẻ "Danh sách nhóm lớp" gom theo cơ sở (Đ167)');
  {
    // Ý (4) mảng Hồ sơ bé: bố cục duyệt theo Cơ sở → Lớp → Bé. Cây ba tầng ĐÃ
    // CÓ từ Đ124 ở trang chủ văn phòng; thứ còn phẳng là thẻ này ở màn Quản
    // trị, nơi tên cơ sở đứng lẫn trong dòng phụ cùng hàng với tên cô.
    const v = fs.readFileSync(path.join(GOC, 'public/js/views/admin.js'), 'utf8');
    const ma = v.split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
    check('có hàm gom nhóm theo cơ sở', /nhomTheoCoSo\(d\) \{/.test(ma), 'admin.js');
    check('thẻ danh sách nhóm lớp dùng hàm ấy', /this\.nhomTheoCoSo\(d\)\.map/.test(ma), 'admin.js');
    check('và THÔI nối tên cơ sở vào dòng phụ của từng nhóm',
      !/c\.campusId \? ' · ' \+ UI\.esc/.test(ma), 'admin.js');

    // Chạy CHÍNH hàm ấy trên dữ liệu dựng tay, để đo HÀNH VI chứ không chỉ soi
    // hình dạng mã — soi mã thì đổi tên biến là bài xanh mà màn hình đã hỏng.
    //
    // Cắt đúng thân hàm bằng hai mốc, không đếm ký tự: đếm tay là tự gài bẫy.
    const dau = ma.indexOf('nhomTheoCoSo(d) {');
    const cuoi = ma.indexOf('\n  },', dau);
    check('cắt được đúng thân hàm ra để chạy thử', dau > 0 && cuoi > dau, { dau, cuoi });
    const than = ma.slice(dau, cuoi + 4);
    // eslint-disable-next-line no-new-func
    const fn = new Function('UI', `return function ${than}`)({ esc: (x) => x });
    const raBa = fn({
      campuses: [{ id: 'b', name: 'Cơ sở B' }, { id: 'a', name: 'Cơ sở A' }],
      classes: [
        { id: 'x', name: 'Lá 1', campusId: 'b' },
        { id: 'y', name: 'Chồi 2', campusId: 'a' },
        { id: 'z', name: 'Ánh Dương', campusId: 'a' },
      ],
    });
    check('gom đúng thành hai cơ sở', raBa.length === 2, raBa.map(x => x.ten));
    check('cơ sở xếp theo TÊN', raBa[0].ten === 'Cơ sở A', raBa.map(x => x.ten));
    check('nhóm trong mỗi cơ sở cũng xếp theo tên tiếng Việt',
      JSON.stringify(raBa[0].nhom.map(n => n.name)) === JSON.stringify(['Ánh Dương', 'Chồi 2']),
      raBa[0].nhom.map(n => n.name));
    check('NHIỀU cơ sở thì có hiện tiêu đề', raBa.every(x => x.tieuDe === true), raBa.map(x => x.tieuDe));

    const raMot = fn({
      campuses: [{ id: 'a', name: 'Cơ sở A' }],
      classes: [{ id: 'x', name: 'Lá 1', campusId: 'a' }],
    });
    check('MỘT cơ sở thì KHÔNG hiện tiêu đề nào — chữ thừa',
      raMot.length === 1 && raMot[0].tieuDe === false, raMot.map(x => x.tieuDe));

    const raTrong = fn({ campuses: [], classes: [{ id: 'x', name: 'Lá 1', campusId: null }] });
    check('trường chưa khai cơ sở thì vẫn gom được, không rơi mất nhóm nào',
      raTrong.length === 1 && raTrong[0].nhom.length === 1, raTrong);
  }

  // =========================================================================
  console.log('\n[6] Ngày trường nghỉ thì nói ra, không để hiệu trưởng đọc nhầm');
  {
    const tao = await req('POST', '/api/leave/lich-nghi', { cookie: QT, body: {
      ten: 'Nghỉ lễ thử', tuNgay: HOM, denNgay: HOM } });
    check('đặt được một đợt nghỉ cho hôm nay', tao.status === 201 || tao.status === 200, tao.status);
    const d = await motNgay(QT);
    check('màn một ngày nói rõ hôm nay trường nghỉ',
      d.truongNghi && /Nghỉ lễ thử/.test(d.truongNghi.ten), d.truongNghi);
    check('và sĩ số vẫn đếm được như thường — nghỉ không xoá sổ',
      typeof d.be.dangHoc === 'number' && d.be.dangHoc > 0, d.be.dangHoc);
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Màn một ngày của cả trường (Đ162)');
