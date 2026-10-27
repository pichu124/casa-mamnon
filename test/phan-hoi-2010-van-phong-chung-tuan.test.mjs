// VĂN PHÒNG CƠ SỞ SOẠN KẾ HOẠCH CHUNG TUẦN (L39 — chủ dự án chốt 27/10).
//
// Hướng dẫn thử 26/10 ghi L39: văn phòng cơ sở không có nút "Soạn kế hoạch
// chung tuần" vì chức vụ này bị chặn cả vùng `/api/hanhtrinh`. Chủ dự án chọn
// MỞ cho văn phòng. Mở là mở ĐÚNG phần kế hoạch chung tuần — chữ về cả nhóm,
// đọc ở Lịch sinh hoạt — còn quan sát, ảnh, câu chuyện từng bé thì vẫn đóng.
//
// Bài này canh cả hai chiều, chiều cho phép đứng trước:
//   [1] Văn phòng soạn được cho nhóm thuộc cơ sở mình (chủ đề, phần thêm,
//       chép tuần trước, treo/tải/gỡ tệp).
//   [2] Không với sang nhóm của cơ sở khác.
//   [3] Phần còn lại của Hành trình VẪN đóng — và đóng vì tầng chức vụ.
//   [4] Chức vụ khác (Marketing) không được mở theo.
//   [5] Ô "Hành trình học tập" ở Trang chủ: văn phòng không có (lối vào của họ
//       là nút ở Lịch sinh hoạt); cô, ban giám hiệu, gia đình vẫn có.
//
// Chạy bằng:  node test/phan-hoi-2010-van-phong-chung-tuan.test.mjs
import {
  dungMayChu, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, batPhanHe,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu, ngay, HOM_NAY,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ph2010-van-phong-chung-tuan');
sinhDuLieu(DIR);
batPhanHe(DIR, ['hanhtrinh', 'tkb']);
const mkHT = taoQuanTri(DIR, 'Hiệu Trưởng', 'tc_ht');
datChucVu(DIR, 'tc_ht', 'hieu-truong');
const mkVP1 = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 1', 'tc_vp1');
khoaVaoCoSo(DIR, 'tc_vp1', 'cs1');
datChucVu(DIR, 'tc_vp1', 'vanphong-coso');
const mkVP2 = taoQuanTri(DIR, 'Văn Phòng Cơ Sở 2', 'tc_vp2');
khoaVaoCoSo(DIR, 'tc_vp2', 'cs2');
datChucVu(DIR, 'tc_vp2', 'vanphong-coso');
const mkMK = taoQuanTri(DIR, 'Marketing', 'tc_mk');
datChucVu(DIR, 'tc_mk', 'marketing');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7263), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const PDF_THAT = 'data:application/pdf;base64,'
  + Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n').toString('base64');

// Thứ Hai của tuần này và của tuần sau — dạng YYYY-MM-DD.
function thuHai(chuoi) {
  const [y, m, d] = chuoi.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const lui = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - lui);
  return t.toISOString().slice(0, 10);
}
const TUAN = thuHai(HOM_NAY());
const TUAN_SAU = (() => {
  const [y, m, d] = TUAN.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10);
})();
void ngay;

try {
  const vao = async (u, mk) => {
    const d = await login(u, mk);
    if (!mk || mk === '123456') return d.cookie;
    await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
    return (await login(u, 'quantri2026')).cookie;
  };
  const HT = await vao('tc_ht', mkHT);
  const VP1 = await vao('tc_vp1', mkVP1);
  const VP2 = await vao('tc_vp2', mkVP2);
  const MK = await vao('tc_mk', mkMK);
  const GV = (await login('giaovien', '123456')).cookie;
  const PH = (await login('phuhuynh', '123456')).cookie;
  check('đối chứng — đăng nhập đủ sáu tài khoản', [HT, VP1, VP2, MK, GV, PH].every(Boolean));

  // =========================================================================
  console.log('\n[1] Văn phòng cơ sở 1 soạn được kế hoạch chung tuần của nhóm cơ sở 1');
  {
    const doc = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: VP1 });
    check('đọc được kế hoạch chung tuần của nhóm c1', doc.status === 200, doc.status);
    check('máy chủ báo văn phòng được soạn (để Lịch sinh hoạt vẽ nút)', doc.data?.duocSoan === true, doc.data);

    const ghi = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: VP1,
      body: { classId: 'c1', tuan: TUAN, chuDe: 'Văn phòng soạn: Mùa thu', baiHat: 'Bài hát mùa thu', nhacGiaDinh: 'Nhớ mang mũ' },
    });
    check('soạn được chủ đề và phần thêm', ghi.status === 200, ghi.status);
    check('chữ văn phòng gõ nằm đúng chỗ',
      ghi.data?.chuDe === 'Văn phòng soạn: Mùa thu' && ghi.data?.them?.baiHat === 'Bài hát mùa thu', ghi.data);

    const chep = await req('POST', '/api/hanhtrinh/chu-de/chep-tuan-truoc', {
      cookie: VP1, body: { classId: 'c1', tuan: TUAN_SAU },
    });
    check('chép được tuần trước sang tuần sau', chep.status === 200, chep);

    const treo = await req('POST', '/api/hanhtrinh/chu-de/tep', {
      cookie: VP1, body: { classId: 'c1', tuan: TUAN, ten: 'ke-hoach.pdf', dataUrl: PDF_THAT },
    });
    check('treo được tệp kế hoạch tuần', treo.status === 201, treo.status);
    const tep = (treo.data?.tep || [])[0];
    const tai = tep ? await req('GET', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: VP1 }) : { status: 0 };
    check('mở lại được tệp vừa treo', tai.status === 200, tai.status);
    const go = tep ? await req('DELETE', `/api/hanhtrinh/chu-de/tep/${tep.id}`, { cookie: VP1 }) : { status: 0 };
    check('gỡ được tệp', go.status === 200, go.status);

    const coDoc = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: GV });
    check('cô nhóm c1 thấy đúng chủ đề văn phòng vừa soạn',
      coDoc.data?.chuDe?.chuDe === 'Văn phòng soạn: Mùa thu', coDoc.data?.chuDe);
  }

  // =========================================================================
  console.log('\n[2] Không với sang nhóm của cơ sở khác');
  {
    const doc = await req('GET', `/api/hanhtrinh/chu-de?classId=c3&tuan=${TUAN}`, { cookie: VP1 });
    check('văn phòng cơ sở 1 KHÔNG đọc được nhóm c3 (cơ sở 2)', doc.status === 403, doc.status);
    const ghi = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: VP1, body: { classId: 'c3', tuan: TUAN, chuDe: 'Sang cơ sở khác' },
    });
    check('…và KHÔNG soạn được', ghi.status === 403, ghi.status);
    const treo = await req('POST', '/api/hanhtrinh/chu-de/tep', {
      cookie: VP1, body: { classId: 'c3', tuan: TUAN, ten: 'x.pdf', dataUrl: PDF_THAT },
    });
    check('…và KHÔNG treo được tệp', treo.status === 403, treo.status);
    const nguoc = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: VP2, body: { classId: 'c1', tuan: TUAN, chuDe: 'Cơ sở 2 sửa của cơ sở 1' },
    });
    check('văn phòng cơ sở 2 KHÔNG soạn được nhóm c1', nguoc.status === 403, nguoc.status);
    const mat = await req('GET', `/api/hanhtrinh/chu-de?classId=c3&tuan=${TUAN}`, { cookie: VP2 });
    check('đối chứng — văn phòng cơ sở 2 đọc được nhóm c3 của mình', mat.status === 200, mat.status);
  }

  // =========================================================================
  console.log('\n[3] Phần còn lại của Hành trình VẪN đóng với văn phòng');
  {
    for (const [ten, method, duong] of [
      ['danh sách quan sát của một bé', 'GET', '/api/hanhtrinh?studentId=s1'],
      ['việc hôm nay của Hành trình', 'GET', '/api/hanhtrinh/hom-nay'],
      ['nháp của cô', 'GET', '/api/hanhtrinh/nhap'],
      ['mục chờ kể', 'GET', '/api/hanhtrinh/cho-ke'],
      ['nhắc nhẹ', 'GET', '/api/hanhtrinh/nhac-nhe'],
      ['ảnh gốc của quan sát', 'GET', '/api/hanhtrinh/anh/x.jpg'],
      ['bản chép câu chuyện', 'GET', '/api/hanhtrinh/ke-tep/x'],
      ['ghi một quan sát', 'POST', '/api/hanhtrinh'],
      ['đường gần giống tên', 'GET', '/api/hanhtrinh/chu-de-khac'],
      ['viết hoa để lách', 'GET', '/API/HANHTRINH?studentId=s1'],
    ]) {
      const r = await req(method, duong, { cookie: VP1, body: method === 'GET' ? undefined : { studentId: 's1', moTa: 'x' } });
      check(`văn phòng KHÔNG mở được ${ten}`, r.status === 403, r.status);
    }
    const r = await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: VP1 });
    const loi = String(r.data?.error || '');
    check('và bị chặn ĐÚNG VÌ CHỨC VỤ, không phải tình cờ trùng mã 403',
      loi.includes('Văn phòng cơ sở'), loi);
  }

  // =========================================================================
  console.log('\n[4] Chức vụ khác không được mở theo');
  {
    const doc = await req('GET', `/api/hanhtrinh/chu-de?classId=c1&tuan=${TUAN}`, { cookie: MK });
    check('Marketing KHÔNG đọc được kế hoạch chung tuần', doc.status === 403, doc.status);
    const ghi = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: MK, body: { classId: 'c1', tuan: TUAN, chuDe: 'Marketing sửa' },
    });
    check('Marketing KHÔNG soạn được', ghi.status === 403, ghi.status);
    const ph = await req('PUT', '/api/hanhtrinh/chu-de', {
      cookie: PH, body: { classId: 'c1', tuan: TUAN, chuDe: 'Phụ huynh sửa' },
    });
    check('gia đình vẫn KHÔNG soạn được', ph.status === 403, ph.status);
  }

  // =========================================================================
  console.log('\n[5] Ô "Hành trình học tập" ở Trang chủ');
  {
    const hien = async (cookie) => (await req('GET', '/api/hanhtrinh/chu-de/hien-o', { cookie })).data?.hien;
    check('văn phòng cơ sở: KHÔNG hiện ô (lối vào ở Lịch sinh hoạt)', (await hien(VP1)) === false);
    check('cô: hiện ô', (await hien(GV)) === true);
    check('ban giám hiệu: hiện ô', (await hien(HT)) === true);
    check('gia đình: hiện ô', (await hien(PH)) === true);
    const mods = await req('GET', '/api/modules', { cookie: VP1 });
    const ht = (Array.isArray(mods.data) ? mods.data : (mods.data?.modules || [])).find(m => m.key === 'hanhtrinh');
    check('danh sách phân hệ của văn phòng có Hành trình kèm điều kiện hiện ô',
      !!ht && ht.dieuKienHien === '/api/hanhtrinh/chu-de/hien-o', ht || mods.data);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}

tongKet();
