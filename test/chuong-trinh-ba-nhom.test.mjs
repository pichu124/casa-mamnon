// Bài canh BA NHÓM CHƯƠNG TRÌNH XUYÊN BA PHÂN HỆ (Đ195 — việc 19, 22, 24).
//
// Chạy bằng:  npm run test:chuong-trinh-ba-nhom
//
// VÌ SAO BA VIỆC NÀY ĐI MỘT BÀI CANH
//
// Nhà trường (Câu 11): ba nhóm cô — cô phụ trách nhóm (Montessori), cô nước
// ngoài (Cambridge), cô thể chất (Thể chất chuyên sâu) — và cả ba "sẽ giúp lên
// kế hoạch và đánh giá -> báo cáo học tập cho từng trẻ". Ba câu ấy rơi vào ba
// phân hệ khác nhau: Hành trình (sổ quan sát), Kế hoạch của bé (bài học), Báo
// cáo học tập (bản 6 tháng).
//
// BA PHÂN HỆ KHÔNG ĐƯỢC PHỤ THUỘC NHAU — tắt cái này thì cái kia phải chạy y
// nguyên, nên bản đồ "góc nào thuộc chương trình nào" phải CHÉP LẠI ở mỗi nơi
// cần nó. Chép lại thì hai bản sẽ trôi khỏi nhau ở lần sửa thứ hai, và cái
// trôi ra sẽ là cái ít người mở hơn.
//
// Bài này là chỗ chặn điều đó: nó ĐỐI CHIẾU hai bản với nhau. Cùng lối đã
// dùng cho năm trạng thái M/S/W/N/NA giữa Hành trình và Báo cáo.
import path from 'node:path';
import fs from 'node:fs';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, batPhanHe, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('chuong-trinh-ba-nhom');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Hiệu Trưởng F', 'f_qt');
batPhanHe(DIR, ['hanhtrinh', 'kehoachbe', 'baocaohoctap']);

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4781), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

// Đọc bản đồ góc → chương trình từ MÃ NGUỒN của từng phân hệ. Soi mã chứ
// không soi câu trả lời API, vì thứ cần canh là hai BẢN CHÉP có khớp nhau
// không — API chỉ nói cho biết một trong hai bản.
function banDo(tep) {
  const s = fs.readFileSync(path.join(GOC, tep), 'utf8');
  const khoi = (s.match(/const CHUONG_TRINH_CUA_GOC = \{([\s\S]*?)\};/) || [])[1] || '';
  const ra = {};
  for (const m of khoi.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) ra[m[1]] = m[2];
  return ra;
}

try {
  const d = await login('f_qt', mkQT);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  const QT = (await login('f_qt', 'quantri2026')).cookie;
  const GV = (await login('giaovien', '123456')).cookie;

  // =========================================================================
  console.log('\n[1] HAI BẢN CHÉP CỦA BẢN ĐỒ KHÔNG ĐƯỢC TRÔI KHỎI NHAU');
  {
    const ke = banDo('modules/kehoachbe/routes.js');
    const bc = banDo('modules/baocaohoctap/routes.js');
    check('đọc được bản đồ ở phân hệ Kế hoạch của bé', Object.keys(ke).length > 0, Object.keys(ke).length);
    check('đọc được bản đồ ở phân hệ Báo cáo học tập', Object.keys(bc).length > 0, Object.keys(bc).length);
    check('HAI BẢN KHỚP NHAU TỪNG DÒNG — góc nào cũng cùng một chương trình',
      JSON.stringify(ke) === JSON.stringify(bc),
      `${JSON.stringify(ke)}\n  vs\n  ${JSON.stringify(bc)}`);

    // Và bản đồ phải dùng ĐÚNG mã nhóm cô của lib/nhom-co.js — không đặt bộ
    // mã thứ hai cho cùng một khái niệm.
    const nc = fs.readFileSync(path.join(GOC, 'lib/nhom-co.js'), 'utf8');
    const maNhom = [...nc.matchAll(/\['([a-z-]+)', '[^']+', '[^']+', (?:true|false)\]/g)].map(m => m[1]);
    check('đối chứng — đọc được ba mã nhóm cô từ lib/nhom-co.js',
      maNhom.length === 3, maNhom);
    check('MỌI chương trình trong bản đồ đều là một mã nhóm cô CÓ THẬT',
      Object.values(ke).every(v => maNhom.includes(v)),
      Object.values(ke).filter(v => !maNhom.includes(v)));
    check('và cả BA nhóm cô đều có ít nhất một góc — không nhóm nào là tab rỗng vĩnh viễn',
      maNhom.every(m => Object.values(ke).includes(m)),
      maNhom.filter(m => !Object.values(ke).includes(m)));
  }

  // =========================================================================
  console.log('\n[2] VIỆC 22 — Kế hoạch của bé chia ba tab, góc cũ KHÔNG đổi nghĩa');
  {
    const d2 = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    check('cô đọc được danh mục bài học', d2.status === 200, d2.status);
    const tab = d2.data.chuongTrinhTab || [];
    check('máy chủ khai ba tab chương trình', tab.length === 3, tab.map(t => t.ma));
    check('mỗi tab nói rõ nó là chương trình nào — màn hình không phải tự kể',
      tab.every(t => t.ten && t.chuongTrinh), tab.map(t => `${t.ten}/${t.chuongTrinh}`));

    // NGUYÊN TẮC SỐ 1: thêm tầng nhìn KHÔNG được đổi nghĩa dữ liệu đã lưu.
    const goc = (d2.data.gocLinhVuc || []).map(x => x.ma);
    check('SÁU góc của nhà trường vẫn đứng đầu, đúng thứ tự cũ',
      goc.slice(0, 6).join(',') === 'toan,tieng-viet,cambridge,thuc-hanh-cuoc-song,giac-quan,van-hoa', goc);
    check('MỌI góc đều thuộc đúng MỘT tab — không góc nào rơi ra ngoài, không góc nào đứng hai chỗ',
      goc.every(g => tab.filter(t => (t.goc || []).some(x => x.ma === g)).length === 1), goc);
    check('và mỗi góc vẫn mang theo mã chương trình của nó',
      (d2.data.gocLinhVuc || []).every(x => !!x.chuongTrinh));

    // Góc Thể chất phải có BÀI, không chỉ có tên: một tab mở ra rỗng là chỗ
    // cô đóng app lại.
    const baiTC = (d2.data.baiHoc || []).filter(b => b.gocLinhVuc === 'the-chat');
    check('góc Thể chất có sẵn bài để cô thể chất bắt đầu', baiTC.length >= 6, baiTC.length);
  }

  // =========================================================================
  console.log('\n[3] VIỆC 24 — sổ quan sát chia ba tab, và nhóm ĐƯỢC GHI LẠI chứ không suy ra');
  {
    const ghi = await req('POST', '/api/hanhtrinh', {
      cookie: GV,
      body: { studentId: 's1', moTa: 'Bé tự rót nước đầy ly, không đổ giọt nào.' },
    });
    check('cô ghi được một quan sát', ghi.status === 201, ghi.status);
    check('câu trả lời nói luôn quan sát ấy thuộc chương trình nào',
      !!ghi.data?.nhomCo && !!ghi.data?.tenNhomCo, `${ghi.data?.nhomCo} / ${ghi.data?.tenNhomCo}`);

    const ds = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV });
    const tab = ds.data.nhomCoTab || [];
    check('màn hành trình khai ba tab', tab.length === 3, tab.map(t => t.ma));
    check('mỗi quan sát mang theo tab của nó',
      (ds.data.quanSat || []).every(q => !!q.nhomCo), (ds.data.quanSat || []).map(q => q.nhomCo));
    check('SỐ CỘNG LẠI CỦA BA TAB = SỐ QUAN SÁT — không dòng nào mất chỗ đứng',
      tab.reduce((s, t) => s + t.soQuanSat, 0) === (ds.data.quanSat || []).length,
      `${tab.map(t => `${t.ma}:${t.soQuanSat}`).join(' ')} / ${(ds.data.quanSat || []).length}`);

    // ĐÂY LÀ PHÉP KIỂM ĐÁNG GIÁ NHẤT CỦA MỤC NÀY.
    //
    // Nhóm của cô là thuộc tính của một LƯỢT PHÂN CÔNG và nó đổi được. Suy ra
    // lúc đọc thì trường khai lại vai của một cô là TOÀN BỘ quan sát cũ nhảy
    // sang tab khác — lịch sử học tập của một đứa trẻ đổi vì một thao tác
    // hành chính xảy ra sau đó.
    const truoc = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV }))
      .data.quanSat.find(q => q.id === ghi.data.id);
    check('đối chứng — quan sát vừa ghi đang ở tab của cô phụ trách nhóm',
      truoc?.nhomCo === 'chu-nhiem', truoc?.nhomCo);

    // Khai lại vai của chính cô ấy sang "cô nước ngoài".
    const doi = await req('PUT', '/api/admin/classes/c1/teachers', {
      cookie: QT,
      body: { teacherIds: ['t1'], chinhId: 't1', nhom: { t1: 'nuoc-ngoai' } },
    });
    check('ban giám hiệu khai lại vai của cô', doi.status === 200, doi.status);

    const sau = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV }))
      .data.quanSat.find(q => q.id === ghi.data.id);
    check('ĐỔI VAI CỦA CÔ KHÔNG LÀM QUAN SÁT CŨ NHẢY TAB — lịch sử của bé giữ nguyên',
      sau?.nhomCo === 'chu-nhiem', sau?.nhomCo);

    // Còn quan sát GHI SAU khi đổi vai thì đi theo vai mới — đó mới là đúng.
    const moi = await req('POST', '/api/hanhtrinh', {
      cookie: GV,
      body: { studentId: 's1', moTa: 'Bé hát theo bài Greetings, nhớ gần hết lời.' },
    });
    check('QUAN SÁT GHI SAU thì đi theo vai MỚI của cô',
      moi.data?.nhomCo === 'nuoc-ngoai', moi.data?.nhomCo);
  }

  // =========================================================================
  console.log('\n[4] VIỆC 19 — báo cáo 6 tháng chia ba nhóm chương trình');
  {
    // Mẫu là việc của nhà trường, và cơ sở dữ liệu thử thì trống — nên dựng
    // một mẫu 6 tháng có đủ BA chương trình cùng một vài dòng KHÔNG khai góc,
    // để mục này đo được cả hai chuyện: chia đúng tab, và dòng không khai góc
    // vẫn có chỗ đứng.
    const tao = await req('POST', '/api/baocaohoctap/mau', { cookie: QT, body: {
      loai: 'hocky', ten: 'Báo cáo 6 tháng 3–6 tuổi', tuThang: 36, denThang: 72,
      dong: [
        { nhom: 'I. LƯU Ý CHUNG', tieuDe: 'Cô muốn kể thêm', kieu: 'chu' },
        { nhom: 'II. PHÁT TRIỂN NHẬN THỨC', tieuDe: 'Thực hành cuộc sống', kieu: 'muc', gocLinhVuc: 'thuc-hanh-cuoc-song' },
        { nhom: 'II. PHÁT TRIỂN NHẬN THỨC', tieuDe: 'Toán', kieu: 'muc', gocLinhVuc: 'toan' },
        { nhom: 'III. TIẾNG ANH', tieuDe: 'Cambridge', kieu: 'muc', gocLinhVuc: 'cambridge' },
        { nhom: 'IV. THỂ CHẤT', tieuDe: 'Vận động', kieu: 'muc', gocLinhVuc: 'the-chat' },
      ] } });
    check('nhà trường dựng được mẫu 6 tháng có đủ ba chương trình',
      tao.status === 200 && tao.data?.mau, `${tao.status} ${JSON.stringify(tao.data).slice(0, 140)}`);

    const mau = await req('GET', '/api/baocaohoctap/mau', { cookie: QT });
    check('đọc được danh sách mẫu', mau.status === 200, mau.status);
    const m = (mau.data?.mau || []).find(x => x.loai === 'hocky');
    check('đối chứng — có ít nhất một mẫu 6 tháng để mở bản', !!m, (mau.data?.mau || []).map(x => x.loai));

    if (m) {
      const ban = await req('POST', '/api/baocaohoctap/ban', {
        cookie: GV, body: { studentId: 's1', mauId: m.id, tuNgay: '2026-03-01', denNgay: '2026-08-31' },
      });
      check('cô mở được một bản 6 tháng', ban.status === 201 || ban.status === 200,
        `${ban.status} ${JSON.stringify(ban.data).slice(0, 120)}`);
      const id = ban.data?.ban?.id || ban.data?.id;
      const xem = await req('GET', `/api/baocaohoctap/ban/${encodeURIComponent(id)}`, { cookie: GV });
      const b = xem.data?.ban || {};
      const tab = b.chuongTrinhTab || [];
      // ĐỐI CHỨNG TRƯỚC MỌI PHÉP ĐO DƯỚI ĐÂY.
      //
      // Ba phép kiểm dưới đều dạng "mọi dòng đều..." và "tổng bằng nhau", mà
      // cả ba đều ĐÚNG khi danh sách rỗng. Bản đầu của mục này mở bản không
      // thành công nên `b.dong` rỗng, và ba phép ấy xanh trong khi không đo
      // gì cả. Dòng này chặn đúng chuyện đó.
      check('đối chứng — bản mở ra có đủ năm dòng của mẫu', (b.dong || []).length === 5,
        (b.dong || []).length);
      check('bản báo cáo khai ba tab chương trình', tab.length === 3, tab.map(t => t.ma));
      check('mỗi dòng mang theo chương trình của nó',
        (b.dong || []).length > 0 && (b.dong || []).every(x => !!x.chuongTrinh),
        (b.dong || []).filter(x => !x.chuongTrinh).length);
      check('SỐ CỘNG LẠI CỦA BA TAB = SỐ DÒNG — không dòng nào của báo cáo mất chỗ đứng',
        (b.dong || []).length > 0 && tab.reduce((s, t) => s + t.soDong, 0) === (b.dong || []).length,
        `${tab.map(t => `${t.ma}:${t.soDong}`).join(' ')} / ${(b.dong || []).length}`);
      check('và CẢ BA tab đều có dòng — mẫu này cố ý phủ đủ ba chương trình',
        tab.every(t => t.soDong > 0), tab.map(t => `${t.ma}:${t.soDong}`).join(' '));
      // Dòng không khai góc vẫn phải có chỗ: mất một dòng của báo cáo là mất
      // một điều cô đã viết về đứa trẻ.
      const khongGoc = (b.dong || []).filter(x => !x.gocLinhVuc);
      check('đối chứng — mẫu có ít nhất một dòng không khai góc', khongGoc.length > 0, khongGoc.length);
      check('dòng KHÔNG khai góc vẫn có tab để đứng, không rơi ra ngoài',
        khongGoc.length > 0 && khongGoc.every(x => tab.some(t => t.ma === x.chuongTrinh)), khongGoc.length);
    }
  }

  // =========================================================================
  console.log('\n[5] TẮT MỘT PHÂN HỆ THÌ HAI PHÂN HỆ KIA CHẠY Y NGUYÊN');
  {
    await req('PUT', '/api/admin/modules/kehoachbe', { cookie: QT, body: { enabled: false } });
    const ht = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV });
    check('TẮT Kế hoạch của bé thì Hành trình vẫn mở được',
      ht.status === 200 && (ht.data.nhomCoTab || []).length === 3, ht.status);
    const bc = await req('GET', '/api/baocaohoctap/mau?loai=hocky', { cookie: QT });
    check('và Báo cáo học tập cũng vậy — bản đồ chép lại nên không kéo nhau sập',
      bc.status === 200, bc.status);
    await req('PUT', '/api/admin/modules/kehoachbe', { cookie: QT, body: { enabled: true } });
    const lai = await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV });
    check('bật lại là chạy tiếp, danh mục còn nguyên',
      lai.status === 200 && (lai.data.baiHoc || []).length > 0, lai.status);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
  tongKet();
}
