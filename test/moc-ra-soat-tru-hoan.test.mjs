// Bài canh MỐC GIỜ RÀ SOÁT và NGÀY PHẢI TRỪ HOÀN (Đ155 — DD-07, DD-13).
//
// Chạy bằng:  npm run test:moc-ra-soat
//
// HAI DÒNG CỦA BẢNG ĐỐI CHIẾU 07/09, CẢ HAI ĐỀU LÀ CHUYỆN CON SỐ SAI
//
// DD-07 — "Mốc giờ cứng 9h; trường nay nói admin điểm danh từ 8h30". Mốc ghi
// cứng trong mã làm bảng rà soát im lặng suốt nửa tiếng đúng lúc văn phòng
// đang cần nó, và muốn đổi thì phải sửa mã. Mà giờ đón bé mỗi cơ sở một khác,
// sang năm học mới còn đổi nữa.
//
// DD-13 — "bảng tháng chưa đánh dấu ngày trong đơn hoàn nhưng bé có mặt để
// trừ hoàn". Gia đình xin nghỉ ba ngày, văn phòng duyệt hoàn ba ngày, rồi nhà
// đổi ý cho con đi học hôm thứ Tư. Từ Đ131 ảnh con tới lớp THẮNG đơn nghỉ nên
// sổ ghi bé có mặt — nhưng con số hoàn vẫn là ba ngày, vì nó do văn phòng gõ
// tay lúc duyệt và không ai quay lại sửa. Trường mất tiền một bữa đã nấu.
//
// ĐIỀU CỐ Ý, canh ở mục [5]: máy **đánh dấu**, KHÔNG tự trừ. Số ngày hoàn là
// một TỔNG do người gõ, nên app không biết được tổng ấy đã trừ sẵn hôm bé đi
// học hay chưa; trừ hộ là đoán, mà đây là sổ tiền.
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, HOM_NAY, ngay,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('moc-ra-soat');
sinhDuLieu(DIR);
batPhanHe(DIR, ['diemdanh', 'xinphep', 'tienan']);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng MRS', 'mrs_qt');

const CSDL = path.join(DIR, 'school.db');
const HOM = HOM_NAY();
const THANG = HOM.slice(0, 7);
const dich = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4726), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

try {
  const d = await login('mrs_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('mrs_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] Mặc định vẫn là 9h — Nguyên tắc số 1: không đổi thứ đang chạy');
  {
    const c = await req('GET', '/api/attendance/cai-dat', { cookie: QT });
    check('đọc được mốc giờ', c.status === 200, c.data);
    check('trường chưa đặt gì thì vẫn là 9h đúng như trước Đ155',
      c.data.gioRaSoat === '09:00' && c.data.gioRaSoatChu === '9h', c.data);
    check('nói rõ khoảng đặt được, để màn hình khỏi tự bịa',
      c.data.somNhat === '06:00' && c.data.muonNhat === '12:00', c.data);

    const so = await req('GET', `/api/attendance/class?date=${HOM}&classId=c1`, { cookie: GV });
    check('sổ điểm danh của cô mang theo mốc giờ',
      so.data.gioRaSoat === '09:00' && so.data.gioRaSoatChu === '9h',
      { g: so.data.gioRaSoat, c: so.data.gioRaSoatChu });
  }

  // =========================================================================
  console.log('\n[2] Ai đặt được, ai không');
  {
    const co = await req('PUT', '/api/attendance/cai-dat', { cookie: GV, body: { gioRaSoat: '08:30' } });
    check('CÔ không đặt được mốc của cả trường', co.status === 403, co.status);
    const ph = await req('PUT', '/api/attendance/cai-dat', { cookie: PH, body: { gioRaSoat: '08:30' } });
    check('gia đình càng không', ph.status === 403 || ph.status === 404, ph.status);
    const coDoc = await req('GET', '/api/attendance/cai-dat', { cookie: GV });
    check('nhưng CÔ ĐỌC được — cô là người nhìn bảng rà soát',
      coDoc.status === 200 && coDoc.data.gioRaSoat === '09:00', coDoc.data);
    check('và máy nói thẳng ra cô không sửa được, để màn hình khỏi mời bấm',
      coDoc.data.suaDuoc === false, coDoc.data.suaDuoc);
  }

  // =========================================================================
  console.log('\n[3] Đặt 8h30 — đúng câu nhà trường nói, không làm tròn');
  {
    const sai = await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '8h30' } });
    check('dạng sai thì từ chối và nói ví dụ đúng',
      sai.status === 400 && /08:30/.test(sai.data?.error || ''), sai.data);
    const som = await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '05:00' } });
    check('5h sáng thì từ chối — bảng sẽ kêu từ lúc cô chưa tới trường',
      som.status === 400 && /cô chưa tới trường/.test(som.data?.error || ''), som.data);
    const muon = await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '16:00' } });
    check('4h chiều thì cũng từ chối — gọi cho gia đình không còn kịp',
      muon.status === 400 && /không còn kịp/.test(muon.data?.error || ''), muon.data);

    const ok = await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '08:30' } });
    check('đặt 08:30 thì được', ok.status === 200 && ok.data.gioRaSoat === '08:30', ok.data);
    check('và nói lại bằng tiếng của trường: "8h30", không phải "08:30 giờ"',
      ok.data.gioRaSoatChu === '8h30', ok.data.gioRaSoatChu);

    const so = await req('GET', `/api/attendance/class?date=${HOM}&classId=c1`, { cookie: GV });
    check('sổ của cô nhận mốc mới ngay, không phải khởi động lại máy chủ',
      so.data.gioRaSoat === '08:30' && so.data.gioRaSoatChu === '8h30',
      { g: so.data.gioRaSoat, c: so.data.gioRaSoatChu });
  }

  // =========================================================================
  console.log('\n[4] Mốc mới ĂN NGAY vào bảng rà soát và vào nút Chốt sổ vắng');
  {
    // Bài này chạy được ở BẤT KỲ giờ nào trong ngày, kể cả 2h sáng: nó không
    // hỏi "bây giờ là mấy giờ" để rẽ nhánh kết quả, mà đặt mốc ở HAI PHÍA của
    // thời điểm hiện tại rồi đo cả hai chiều. Phía nào rơi ra ngoài khoảng
    // 06:00–12:00 thì mục này nói thẳng là đã bỏ, không lặng lẽ báo xanh.
    const bayGio = String(ngay.bayGio()).slice(0, 5);
    const SOM = '06:00';
    const MUON = '12:00';
    const phut = (g) => Number(g.slice(0, 2)) * 60 + Number(g.slice(3, 5));
    const chuoiGio = (p) => `${String(Math.floor(p / 60)).padStart(2, '0')}:${String(p % 60).padStart(2, '0')}`;

    const trongKhoang = (pp) => Math.max(phut(SOM), Math.min(phut(MUON), pp));
    const truocDo = chuoiGio(trongKhoang(phut(bayGio) - 60));
    if (truocDo <= bayGio) {
      const dat = await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: truocDo } });
      check(`đặt mốc lùi về ${truocDo} (bây giờ ${bayGio})`, dat.status === 200, dat.data);
      const sau = await req('GET', `/api/attendance/ra-soat?date=${HOM}`, { cookie: QT });
      check('mốc đã qua thì bảng rà soát CÓ nghĩa ngay',
        sau.status === 200 && sau.data.quaGio === true, { moc: sau.data.gioRaSoat, quaGio: sau.data.quaGio });
      const chot = await req('POST', '/api/attendance/chot-vang', { cookie: QT, body: { date: HOM, classId: 'c1' } });
      check('và nút Chốt sổ vắng mở ra theo', chot.status === 200, `${chot.status} ${JSON.stringify(chot.data).slice(0, 140)}`);
    } else {
      console.log(`  (bây giờ ${bayGio}, sớm hơn cả trần dưới ${SOM} — bỏ vế "mốc đã qua")`);
      check('trần dưới 06:00 vẫn giữ, không cho đặt sớm hơn',
        (await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '05:59' } })).status === 400);
    }

    const sauDo = chuoiGio(trongKhoang(phut(bayGio) + 60));
    if (sauDo > bayGio) {
      const dat = await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: sauDo } });
      check(`đặt mốc đẩy tới ${sauDo} (bây giờ ${bayGio})`, dat.status === 200, dat.data);
      const chua = await req('GET', `/api/attendance/ra-soat?date=${HOM}`, { cookie: QT });
      check('mốc chưa tới thì bảng rà soát im lặng trở lại',
        chua.data.quaGio === false, { moc: chua.data.gioRaSoat, quaGio: chua.data.quaGio });
      const chot = await req('POST', '/api/attendance/chot-vang', { cookie: QT, body: { date: HOM, classId: 'c1' } });
      check('và nút Chốt sổ vắng từ chối theo đúng mốc mới',
        chot.status === 400 && /trước đó các cô vẫn đang đón bé/.test(chot.data?.error || ''), chot.data);
      check('lời từ chối nói giờ bằng tiếng của trường, không phải "12:00 giờ"',
        new RegExp(`sau ${Number(sauDo.slice(0, 2))}h`).test(chot.data?.error || ''), chot.data?.error);
    } else {
      console.log(`  (bây giờ ${bayGio}, muộn hơn cả trần trên ${MUON} — bỏ vế "mốc chưa tới")`);
      check('trần trên 12:00 vẫn giữ, không cho đặt muộn hơn',
        (await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '12:01' } })).status === 400);
    }

    // Trả mốc về mặc định để các mục sau không phụ thuộc giờ chạy.
    await req('PUT', '/api/attendance/cai-dat', { cookie: QT, body: { gioRaSoat: '09:00' } });
  }

  // =========================================================================
  console.log('\n[5] DD-13 — ngày trong đơn hoàn mà bé VẪN ĐI HỌC');
  {
    // Dựng bối cảnh thật: một đơn nghỉ đã duyệt, hoàn 3 ngày, mà bé có mặt 1 hôm.
    const tu = `${THANG}-05`;
    const den = `${THANG}-07`;
    const conn = new Database(CSDL);
    const luc = new Date().toISOString();
    conn.prepare(`INSERT INTO leave_requests (id, studentId, parentId, fromDate, toDate, reason, status, createdAt, reviewedBy, reviewNote)
                  VALUES (?, 's1', 'p1', ?, ?, 'Về quê', 'approved', ?, 't1', '')`)
      .run('lv_mrs1', tu, den, luc);
    conn.prepare(`INSERT INTO leave_refund (leaveId, hoanTienAn, soNgay, ghiChu, nguoiGhi, capNhatLuc)
                  VALUES ('lv_mrs1', 'co', 3, '', 't1', ?)`).run(luc);
    // DỮ LIỆU MẪU VỐN ĐÃ CÓ ĐIỂM DANH trong khoảng này — dọn sạch cả khoảng
    // rồi mới dựng đúng một hôm có mặt, để con số đo được là con số bài này
    // tự đặt ra chứ không phải con số của dữ liệu mẫu.
    conn.prepare('DELETE FROM attendance WHERE studentId = ? AND date BETWEEN ? AND ?').run('s1', tu, den);
    conn.prepare(`INSERT INTO attendance (id, studentId, date, status, checkIn, note, markedBy)
                  VALUES (?, 's1', ?, 'present', '07:45', '', 't1')`)
      .run('at_mrs1', dich(tu, 1));
    conn.close();

    const b = await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: QT });
    check('bảng tháng mở được', b.status === 200, b.status);
    const be = (b.data.danhSach || []).find(x => x.studentId === 's1');
    check('có dòng của bé', !!be, (b.data.danhSach || []).length);
    const don = (be.donHoan || []).find(x => x.fromDate === tu);
    check('đơn hoàn 3 ngày vẫn nguyên vẹn', !!don && Number(don.soNgay) === 3, don);
    check('MÁY ĐÁNH DẤU: đơn này có 1 hôm bé vẫn đi học', don.soNgayBeCoMat === 1, don.soNgayBeCoMat);
    check('và bé có con số tổng để kế toán trừ', be.soNgayCoMatTrongDonHoan === 1, be.soNgayCoMatTrongDonHoan);
    check('cả tháng cũng có con số ấy', b.data.tong.soNgayCoMatTrongDonHoan >= 1, b.data.tong.soNgayCoMatTrongDonHoan);

    // KHÔNG TỰ TRỪ — đây là điều cố ý, và là chỗ dễ bị "sửa cho tiện" nhất.
    check('KHÔNG tự trừ: số ngày hoàn vẫn đúng bằng con số văn phòng đã gõ',
      be.soNgayHoanTienAn >= 3, { hoan: be.soNgayHoanTienAn, coMat: be.soNgayCoMatTrongDonHoan });

    const csvR = await fetch(`${sv.BASE}/api/tienan/thang.csv?thang=${THANG}`, { headers: { Cookie: QT } });
    const csvT = await csvR.text();
    check('CSV cho kế toán có hẳn một cột riêng',
      /Số ngày bé vẫn đi học trong đơn hoàn/.test(csvT), csvT.slice(0, 200));
    check('và dòng cảnh báo nói rõ phải trừ ra',
      /bé vẫn đi học 1 hôm — trừ ra/.test(csvT), (csvT.match(/.{0,80}trừ ra.{0,20}/) || [])[0]);
  }

  // =========================================================================
  console.log('\n[6] Bé không đi học hôm nào trong đơn thì KHÔNG có cảnh báo giả');
  {
    const tu = `${THANG}-20`;
    const den = `${THANG}-21`;
    const conn = new Database(CSDL);
    const luc = new Date().toISOString();
    conn.prepare(`INSERT INTO leave_requests (id, studentId, parentId, fromDate, toDate, reason, status, createdAt, reviewedBy, reviewNote)
                  VALUES (?, 's3', 'p2', ?, ?, 'Ốm', 'approved', ?, 't1', '')`)
      .run('lv_mrs2', tu, den, luc);
    conn.prepare(`INSERT INTO leave_refund (leaveId, hoanTienAn, soNgay, ghiChu, nguoiGhi, capNhatLuc)
                  VALUES ('lv_mrs2', 'co', 2, '', 't1', ?)`).run(luc);
    conn.prepare('DELETE FROM attendance WHERE studentId = ? AND date BETWEEN ? AND ?').run('s3', tu, den);
    conn.close();

    const b = await req('GET', `/api/tienan/thang?thang=${THANG}`, { cookie: QT });
    const be = (b.data.danhSach || []).find(x => x.studentId === 's3');
    const don = (be.donHoan || []).find(x => x.fromDate === tu);
    check('đơn của bé nghỉ thật thì không bị đánh dấu', don && don.soNgayBeCoMat === 0, don);
    check('và bé đó không có con số phải trừ', be.soNgayCoMatTrongDonHoan === 0, be.soNgayCoMatTrongDonHoan);
  }

  // =========================================================================
  console.log('\n[7] Cài đặt hỏng thì vẫn chạy như cũ, không kéo màn Điểm danh xuống');
  {
    const conn = new Database(CSDL);
    conn.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('diemdanh', ?)")
      .run(JSON.stringify({ gioRaSoat: 'hai mươi lăm giờ' }));
    conn.close();
    const so = await req('GET', `/api/attendance/class?date=${HOM}&classId=c1`, { cookie: GV });
    check('giá trị rác thì rơi về mặc định 9h, không phải màn trắng',
      so.status === 200 && so.data.gioRaSoat === '09:00', { s: so.status, g: so.data && so.data.gioRaSoat });

    const conn2 = new Database(CSDL);
    conn2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('diemdanh', ?)").run('{ không phải JSON');
    conn2.close();
    const so2 = await req('GET', `/api/attendance/class?date=${HOM}&classId=c1`, { cookie: GV });
    check('dòng cài đặt hỏng hẳn cũng vậy',
      so2.status === 200 && so2.data.gioRaSoat === '09:00', { s: so2.status, g: so2.data && so2.data.gioRaSoat });
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Mốc giờ rà soát và ngày phải trừ hoàn (Đ155)');
