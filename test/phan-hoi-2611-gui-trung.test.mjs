// Bài canh ĐƠN TRÙNG KHI BẤM GỬI HAI LẦN (kiểm thử thay trường 26/11, R2-L1).
//
// Chạy bằng:  node test/phan-hoi-2611-gui-trung.test.mjs
//
// Mạng chậm, gia đình bấm "Gửi đơn xin phép" hay "Gửi lời dặn thuốc" lần nữa
// vì tưởng chưa ăn. Trước bản vá, máy chủ nhận cả hai và tạo HAI đơn giống
// hệt: văn phòng duyệt hai lần, cô thấy hai đơn thuốc và có thể nhầm liều.
//
// Nút trên màn hình đã khoá khi đang gửi, nhưng máy chủ vẫn phải tự chặn:
// điện thoại còn giữ bản giao diện cũ, hoặc mạng gửi lại yêu cầu. Bài này bắn
// HAI YÊU CẦU SONG SONG, đúng như hai lần bấm cách nhau vài trăm mili giây.
import { thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin, HOM_NAY } from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('gui-trung');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7150), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const PH = (await login('phuhuynh', '123456')).cookie;   // mẹ bé s1
const ngaySau = (n) => new Date(Date.parse(`${HOM_NAY()}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const demDon = async (duong, studentId) =>
  ((await req('GET', duong, { cookie: PH })).data || []).filter(x => x.studentId === studentId).length;

try {
  // =========================================================================
  console.log('\n[1] Đơn xin nghỉ: hai lần bấm song song chỉ tạo MỘT đơn');
  {
    const truoc = await demDon('/api/leave', 's1');
    const than = { studentId: 's1', fromDate: ngaySau(7), toDate: ngaySau(7), reason: 'Con đi khám răng' };
    const [a, b] = await Promise.all([
      req('POST', '/api/leave', { cookie: PH, body: than }),
      req('POST', '/api/leave', { cookie: PH, body: than }),
    ]);
    const ma = [a, b].map(r => r.status).sort().join(',');
    check('một lần tạo mới (201), một lần trả lại đơn đã có (200)', ma === '200,201', [a.status, b.status, a.data, b.data]);
    check('cả hai lần nhận về CÙNG một đơn', a.data && b.data && a.data.id === b.data.id, [a.data?.id, b.data?.id]);
    check('danh sách chỉ thêm đúng một đơn', (await demDon('/api/leave', 's1')) === truoc + 1, { truoc });

    const lanBa = await req('POST', '/api/leave', { cookie: PH, body: { ...than, reason: '  Con đi khám răng ' } });
    check('gửi lại cùng nội dung (khác khoảng trắng) vẫn là đơn cũ', lanBa.status === 200 && lanBa.data.id === a.data.id, lanBa);

    // Đối chứng: nội dung khác thì đó là một đơn khác thật.
    const khacLyDo = await req('POST', '/api/leave', { cookie: PH, body: { ...than, reason: 'Con bị sốt' } });
    check('khác lý do → đơn mới (201)', khacLyDo.status === 201 && khacLyDo.data.id !== a.data.id, khacLyDo);
    const khacNgay = await req('POST', '/api/leave', { cookie: PH, body: { ...than, fromDate: ngaySau(8), toDate: ngaySau(8) } });
    check('khác ngày → đơn mới (201)', khacNgay.status === 201, khacNgay);
    check('tổng cộng ba đơn mới', (await demDon('/api/leave', 's1')) === truoc + 3);
  }

  // =========================================================================
  console.log('\n[2] Dặn thuốc: hai lần bấm song song chỉ tạo MỘT đơn');
  {
    const truoc = await demDon('/api/medicine', 's1');
    const than = {
      studentId: 's1', fromDate: HOM_NAY(), toDate: HOM_NAY(),
      medicines: [{ name: 'Siro ho', dose: '5ml', timing: 'Sau bữa trưa' }], note: 'Để ngăn trước ba lô',
    };
    const [a, b] = await Promise.all([
      req('POST', '/api/medicine', { cookie: PH, body: than }),
      req('POST', '/api/medicine', { cookie: PH, body: than }),
    ]);
    const ma = [a, b].map(r => r.status).sort().join(',');
    check('một lần tạo mới (201), một lần trả lại đơn đã có (200)', ma === '200,201', [a.status, b.status, a.data, b.data]);
    check('cả hai lần nhận về CÙNG một đơn', a.data && b.data && a.data.id === b.data.id, [a.data?.id, b.data?.id]);
    check('danh sách chỉ thêm đúng một đơn', (await demDon('/api/medicine', 's1')) === truoc + 1, { truoc });

    const khacLieu = await req('POST', '/api/medicine', {
      cookie: PH, body: { ...than, medicines: [{ name: 'Siro ho', dose: '10ml', timing: 'Sau bữa trưa' }] },
    });
    check('khác liều → đơn mới (201)', khacLieu.status === 201 && khacLieu.data.id !== a.data.id, khacLieu);
    const khacNgay = await req('POST', '/api/medicine', { cookie: PH, body: { ...than, toDate: ngaySau(1) } });
    check('khác ngày → đơn mới (201)', khacNgay.status === 201, khacNgay);
    check('tổng cộng ba đơn mới', (await demDon('/api/medicine', 's1')) === truoc + 3);
  }
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet();
