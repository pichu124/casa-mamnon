// Bài canh TẦNG CƠ SỞ Ở MÀN CỦA CHÍN PHÂN HỆ MẦM NON (Đ202 — việc 38).
//
// Chạy bằng:  npm run test:tang-co-so-phan-he
//
// VÌ SAO CÓ BÀI NÀY KHI ĐÃ CÓ `test:co-so` VÀ `test:co-so-quan-tri`
//
// `test:co-so` canh các đường làm việc hàng ngày. `test:co-so-quan-tri` mục
// [10] quét mọi đường mà vai quản trị với tới — nhưng danh sách đường của nó
// là danh sách của PHẦN LÕI: students, albums, plans, timetable, admin/*.
// KHÔNG MỘT ĐƯỜNG NÀO CỦA CHÍN PHÂN HỆ MẦM NON nằm trong đó, dù bài ấy có bật
// đủ phân hệ lên.
//
// Mà chín phân hệ ấy chính là chỗ app 2 khác app 1: Nhật ký ngày, Hành trình,
// Đón trả bé, Học phí, Thực đơn, Chụp ảnh ở cổng, Cambridge, Kế hoạch của bé.
// Chúng được viết sau khi tầng cơ sở đã có, mỗi phân hệ một người viết một
// lúc, và mỗi phân hệ tự hỏi `db.classIdsOf` / `db.canAccessStudent` theo cách
// riêng. Đó là đúng loại chỗ một bản sót nằm im mà không ai đối chiếu ra.
//
// VÀ ĐÂY LÀ CHIỀU SAI KHÓ THẤY NHẤT: "THẤY QUÁ NHIỀU".
//
// Sai kiểu "thấy quá ít" thì quản lý cơ sở mở màn ra, không thấy nhóm của
// mình, và gọi điện ngay trong buổi sáng. Sai kiểu "thấy quá nhiều" thì màn
// hình chạy trơn tru, danh sách dài hơn một chút, và KHÔNG CÓ GÌ BÁO — hồ sơ
// bé, ảnh khuôn mặt, số tiền một nhà đang nợ của cơ sở khác nằm ngay đó.
// Trẻ dưới 6 tuổi, theo Nghị định 13/2023/NĐ-CP đây là dữ liệu nhạy cảm.
//
// PHÉP KIỂM PHỦ ĐỊNH XANH RẤT ĐẸP KHI KHÔNG CÓ GÌ ĐỂ TÌM — nên mục [1] dựng
// dữ liệu THẬT cho cơ sở 2 trước, và mục [4] đòi phép quét phải NHÌN THẤY dữ
// liệu của chính cơ sở mình. Thiếu hai vế đó thì cả bài chỉ là quét vào chỗ rỗng.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, batPhanHe,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('tang-co-so-phan-he');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky', 'hanhtrinh', 'dontra', 'hocphi', 'thucdon',
  'thuchup', 'cambridge', 'kehoachbe', 'baocaohoctap']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng P', 'p_ht');          // Cấp 1
const mk3 = taoQuanTri(DIR, 'Quản lý CS1 P', 'p_cs1');         // Cấp 3, cơ sở 1
khoaVaoCoSo(DIR, 'p_cs1', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4818), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, mkTam) {
  const d = await login(u, mkTam);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

// Dấu riêng, đủ lạ để không trùng với bất cứ chữ nào khác trong app.
const DAU_TIEN = 'MOCTIEN-CUACOSO2-XYZ';
const DAU_CHUDE = 'MOCCHUDE-CUACOSO2-XYZ';
const DAU_BAIHAT = 'MOCBAIHAT-CUACOSO2-XYZ';
const DAU_NHATKY = 'MOCNHATKY-CUACOSO2-XYZ';

try {
  const C1 = await vao('p_ht', mk1);
  const C3 = await vao('p_cs1', mk3);

  // Nhóm Lá 1 (c2) sang cơ sở 2 — s2, s7, s8 thành bé của cơ sở 2.
  const doi = await req('PUT', '/api/admin/classes/c2/campus', { cookie: C1, body: { campusId: 'cs2' } });
  check('dựng được bối cảnh hai cơ sở', doi.status === 200, doi.status);

  // =========================================================================
  console.log('\n[1] DỰNG DỮ LIỆU THẬT CHO CƠ SỞ 2 — không có bước này thì cả bài quét vào chỗ rỗng');
  {
    const tien = await req('POST', '/api/hocphi', {
      cookie: C1,
      body: { studentId: 's2', kyThu: 'Tháng 9/2026', noiDung: DAU_TIEN, soTien: 4200000 },
    });
    check('ghi được một khoản thu cho bé của cơ sở 2', tien.status === 201,
      `${tien.status} ${JSON.stringify(tien.data).slice(0, 140)}`);

    const cd = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: C1,
      body: { classId: 'c2', tuan: '2026-09-07', chuDe: DAU_CHUDE, baiHat: DAU_BAIHAT },
    });
    check('soạn được chủ đề tuần cho nhóm của cơ sở 2', cd.status === 200,
      `${cd.status} ${JSON.stringify(cd.data).slice(0, 140)}`);

    const nk = await req('PUT', '/api/nhatky', {
      cookie: C1,
      body: { danhSach: [{ studentId: 's2', anTrua: 'het', ghiChu: DAU_NHATKY }] },
    });
    check('ghi được nhật ký ngày cho bé của cơ sở 2', nk.status === 200,
      `${nk.status} ${JSON.stringify(nk.data).slice(0, 140)}`);

    // ĐỐI CHỨNG CỦA CHÍNH BƯỚC DỰNG: Cấp 1 phải ĐỌC LẠI ĐƯỢC những gì vừa ghi.
    // Không có vế này thì một lượt ghi âm thầm không vào đâu cả vẫn cho bài
    // xanh, và phép quét bên dưới đi tìm thứ chưa bao giờ tồn tại.
    const doc = await req('GET', '/api/hocphi?studentId=s2', { cookie: C1 });
    check('đối chứng — Cấp 1 đọc lại thấy đúng khoản vừa ghi',
      JSON.stringify(doc.data ?? '').includes(DAU_TIEN), doc.status);
    const doc2 = await req('GET', '/api/hanhtrinh/chu-de?classId=c2&tuan=2026-09-07', { cookie: C1 });
    check('đối chứng — Cấp 1 đọc lại thấy đúng chủ đề và bài hát vừa soạn',
      JSON.stringify(doc2.data ?? '').includes(DAU_CHUDE)
      && JSON.stringify(doc2.data ?? '').includes(DAU_BAIHAT), doc2.status);
  }

  // =========================================================================
  console.log('\n[2] QUÉT MÀN LIỆT KÊ CỦA TỪNG PHÂN HỆ — không dấu vết nào của cơ sở 2');
  {
    // Tên bé của cơ sở 2 và tên nhóm của cơ sở 2, cộng bốn dấu riêng vừa dựng.
    const DAU_VET = [
      ['tên bé cơ sở 2', /Nguyễn Bảo Nam|Bùi Minh Thư|Vũ Hải Đăng/],
      ['tên nhóm cơ sở 2', /Lá 1/],
      ['số tiền của cơ sở 2', new RegExp(DAU_TIEN)],
      ['chủ đề tuần của cơ sở 2', new RegExp(DAU_CHUDE)],
      ['bài hát tuần của cơ sở 2', new RegExp(DAU_BAIHAT)],
      ['nhật ký ngày của cơ sở 2', new RegExp(DAU_NHATKY)],
    ];

    // MỞ — màn liệt kê theo phạm vi của chính người gọi. PHẢI trả 200; trả
    // 403/404 nghĩa là phép quét đi qua mà không quét gì (bài học của
    // `test:co-so-quan-tri` mục [10], chép lại nguyên vẹn vì nó đúng).
    const MO = [
      'GET /api/nhatky?classId=c1',
      'GET /api/nhatky/pham-vi',
      'GET /api/hanhtrinh/hom-nay',
      'GET /api/dontra/nhom?classId=c1',
      'GET /api/hocphi/bang',
      'GET /api/hocphi/uu-dai/bang',
      'GET /api/hocphi/bieu-phi',
      // HAI ĐƯỜNG DƯỚI ĐÂY KHÔNG NHẬN THAM SỐ CHỌN NHÓM/BÉ — chúng tự cắt theo
      // `db.studentsOf(req.user)` và theo bộ lọc `xemDuoc`. Nên chúng nằm ở MỞ
      // chứ không ở CHẶN: cách canh đúng cho chúng là phép quét dấu vết bên
      // dưới (chúng liệt kê TÊN BÉ, nên một bé cơ sở 2 lọt vào là thấy ngay),
      // không phải một mã trả về 403.
      //
      // Ghi rõ ra vì bản đầu của bài này xếp `GET /api/cambridge?studentId=s2`
      // và `GET /api/thuchup?classId=c2` vào CHẶN rồi báo đỏ — mà cả hai trả
      // 200 đúng: chúng KHÔNG ĐỌC tham số ấy, nên phép thử chưa bao giờ chạm
      // tới một chốt chặn nào. Đúng cái bẫy `test:co-so-quan-tri` đã tự ghi lại
      // cho `GET /api/attendance?classId=`. Một đường trong danh sách CHẶN mà
      // không đọc tham số là một dòng trông như đang canh và không canh gì cả.
      'GET /api/thuchup',
      'GET /api/thuchup/ket-qua',
      'GET /api/cambridge',
      'GET /api/cambridge/pham-vi',
      'GET /api/kehoachbe/bai-hoc',
    ];
    // CHẶN — cố ý trỏ thẳng vào dữ liệu của cơ sở 2. PHẢI bị từ chối.
    //
    // Mỗi đường ở đây đều ĐỌC tham số của nó; đã kiểm từng đường trong mã trước
    // khi đưa vào danh sách.
    const CHAN = [
      'GET /api/hocphi?studentId=s2',
      'GET /api/nhatky?classId=c2',
      'GET /api/nhatky?studentId=s2',
      'GET /api/hanhtrinh?studentId=s2',
      'GET /api/hanhtrinh/chu-de?classId=c2&tuan=2026-09-07',
      'GET /api/dontra?studentId=s2',
      'GET /api/dontra/so?classId=c2',
      'GET /api/dontra/nhom?classId=c2',
      'GET /api/kehoachbe?classId=c2',
    ];

    const ro = [];
    const cam = [];
    const lot = [];
    for (const d of [...MO, ...CHAN]) {
      const [m, u] = d.split(' ');
      const r = await req(m, u, { cookie: C3 });
      if (MO.includes(d) && r.status !== 200) cam.push(`${d} -> ${r.status}`);
      if (CHAN.includes(d) && r.status === 200) lot.push(`${d} -> 200`);
      const chuoi = JSON.stringify(r.data ?? '');
      for (const [ten, re] of DAU_VET) if (re.test(chuoi)) ro.push(`${d} -> ${ten}`);
    }

    check(`quét ${MO.length + CHAN.length} đường của phân hệ, KHÔNG đường nào để lọt dấu vết cơ sở 2`,
      ro.length === 0, ro);
    check(`và ${MO.length} màn liệt kê đều THẬT SỰ trả lời được (200)`, cam.length === 0, cam);
    check(`còn ${CHAN.length} đường trỏ thẳng vào cơ sở 2 thì đều BỊ TỪ CHỐI`, lot.length === 0, lot);
  }

  // =========================================================================
  console.log('\n[3] GHI CHÉO CƠ SỞ — đọc đã chặn, ghi cũng phải chặn');
  {
    // Chặn đọc mà quên chặn ghi là kiểu sót dễ xảy ra nhất: người viết nghĩ về
    // "ai NHÌN thấy gì" rồi quên vế "ai SỬA được gì". Và ghi chéo còn nặng hơn
    // đọc chéo — nó đổi dữ liệu thật của một cơ sở khác.
    const GHI_CHEO = [
      ['POST /api/hocphi', { studentId: 's2', kyThu: 'Tháng 10/2026', noiDung: 'Ghi chéo', soTien: 100000 }],
      ['PUT /api/nhatky', { danhSach: [{ studentId: 's2', anTrua: 'het', ghiChu: 'Ghi chéo' }] }],
      ['PUT /api/hanhtrinh/chu-de', { classId: 'c2', tuan: '2026-09-14', chuDe: 'Ghi chéo' }],
      ['POST /api/hanhtrinh/chu-de/chep-tuan-truoc', { classId: 'c2', tuan: '2026-09-14' }],
      ['POST /api/hocphi/uu-dai', { studentId: 's2', ten: 'Ghi chéo', kieu: 'so-tien', giaTri: 100000 }],
      ['POST /api/dontra/nguoi', { studentId: 's2', hoTen: 'Ghi chéo', quanHe: 'Bác' }],
      // Cambridge và Ghi nhanh KHÔNG đọc tham số chọn bé ở đường ĐỌC (xem chú
      // thích ở mục [2]), nhưng đường GHI của chúng thì có — nên chốt chặn của
      // hai phân hệ ấy canh được ở đây chứ không phải ở trên.
      ['POST /api/thuchup', { studentId: 's2', noiDung: 'Ghi chéo' }],
      ['POST /api/cambridge', { classId: 'c2', tieuDe: 'Ghi chéo', noiDung: 'Ghi chéo' }],
    ];
    const lot = [];
    for (const [d, than] of GHI_CHEO) {
      const [m, u] = d.split(' ');
      const r = await req(m, u, { cookie: C3, body: than });
      if (r.status >= 200 && r.status < 300) lot.push(`${d} -> ${r.status}`);
    }
    check(`cả ${GHI_CHEO.length} lượt GHI vào dữ liệu cơ sở 2 đều BỊ TỪ CHỐI`, lot.length === 0, lot);

    // ĐỐI CHỨNG: cùng những lượt ghi ấy nhưng vào bé của CHÍNH cơ sở mình thì
    // phải làm được. Không có vế này thì một chốt chặn "từ chối tất" cũng xanh.
    const ok = await req('POST', '/api/hocphi', {
      cookie: C3, body: { studentId: 's1', kyThu: 'Tháng 10/2026', noiDung: 'Của cơ sở mình', soTien: 100000 },
    });
    check('đối chứng — ghi cho bé của CHÍNH cơ sở mình thì làm được', ok.status === 201,
      `${ok.status} ${JSON.stringify(ok.data).slice(0, 140)}`);
    const ok2 = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: C3, body: { classId: 'c1', tuan: '2026-09-07', chuDe: 'Của cơ sở mình' },
    });
    check('đối chứng — soạn chủ đề cho nhóm của CHÍNH cơ sở mình thì làm được',
      ok2.status === 200, ok2.status);
  }

  // =========================================================================
  console.log('\n[4] PHÉP QUÉT CÓ NHÌN THẤY GÌ KHÔNG — vế khẳng định');
  {
    // Cả mục [2] là một phép kiểm PHỦ ĐỊNH, và phép kiểm phủ định xanh rất đẹp
    // khi mọi đường trả về danh sách rỗng. Vế này đòi phép quét phải nhìn thấy
    // dữ liệu của chính cơ sở 1 ở ít nhất vài màn khác nhau.
    const thay = [];
    for (const u of ['/api/hocphi/bang', '/api/nhatky?classId=c1',
      '/api/dontra/nhom?classId=c1', '/api/hanhtrinh/hom-nay']) {
      const r = await req('GET', u, { cookie: C3 });
      const s = JSON.stringify(r.data ?? '');
      if (/Nguyễn Bảo An|Trần Gia Hân|Chồi 2/.test(s)) thay.push(u);
    }
    check('phép quét NHÌN THẤY dữ liệu của chính cơ sở 1 ở nhiều màn — không phải quét vào chỗ rỗng',
      thay.length >= 2, thay);

    const tien = await req('GET', '/api/hocphi?studentId=s1', { cookie: C3 });
    check('và Cấp 3 vẫn đọc được sổ tiền của bé cơ sở mình', tien.status === 200, tien.status);
  }

  // =========================================================================
  console.log('\n[5] MỌI ĐƯỜNG ĐỌC DỮ LIỆU CỦA BÉ TRONG PHÂN HỆ ĐỀU GỌI MỘT HÀM CANH');
  {
    // Mục [2] đi từ hành vi; mục này đi từ mã nguồn, cùng lối `test:co-so-quan-tri`
    // mục [7]. Hai chiều bù nhau: thêm một đường mới mà quên canh thì mục này
    // đỏ NGAY, kể cả khi chưa ai kịp nghĩ ra tình huống để thử.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { GOC } = await import('./_chung.mjs');
    const PHAN_HE = ['nhatky', 'hanhtrinh', 'dontra', 'hocphi', 'thuchup',
      'cambridge', 'kehoachbe', 'baocaohoctap'];
    const HAM_CANH = /canAccessStudent|canAccessClass|canAccessCampus|classIdsOf|studentsOf|phamViCoSo|beCuaToi|nhomCuaToi/;
    const thieu = [];
    let daSoi = 0;
    for (const ma of PHAN_HE) {
      const tep = path.join(GOC, 'modules', ma, 'routes.js');
      if (!fs.existsSync(tep)) continue;
      const src = fs.readFileSync(tep, 'utf8');
      daSoi += 1;
      if (!HAM_CANH.test(src)) thieu.push(ma);
    }
    check(`đối chứng — soi được routes.js của ${PHAN_HE.length} phân hệ`, daSoi === PHAN_HE.length, daSoi);
    check('MỌI phân hệ đều gọi ít nhất một hàm canh quyền của lib/db.js', thieu.length === 0, thieu);

    // Và không phân hệ nào tự dựng luật cơ sở riêng bằng cách so chuỗi campusId
    // với nhau — hai bản luật cho cùng một khái niệm là hai bản sẽ trôi khỏi nhau.
    const tuDung = [];
    for (const ma of PHAN_HE) {
      const tep = path.join(GOC, 'modules', ma, 'routes.js');
      if (!fs.existsSync(tep)) continue;
      const src = fs.readFileSync(tep, 'utf8').split('\n').filter(d => !/^\s*\/\//.test(d)).join('\n');
      // `db.phamViCoSo(...) === x` là cách ĐÚNG. Cách sai là đọc thẳng
      // `user.campusId` rồi tự so.
      if (/req\.user\.campusId/.test(src)) tuDung.push(ma);
    }
    check('không phân hệ nào đọc thẳng `req.user.campusId` để tự dựng luật cơ sở',
      tuDung.length === 0, tuDung);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
