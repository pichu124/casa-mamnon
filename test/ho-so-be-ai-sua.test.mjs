// Bài canh AI SỬA ĐƯỢC PHẦN NHÂN THÂN TRONG HỒ SƠ CỦA BÉ (Đ168).
//
// Chạy bằng:  npm run test:ho-so-sua
//
// NHÀ TRƯỜNG XIN GÌ
//
// Bảng phân quyền 07/09, dòng Hồ sơ bé: *"Admin cơ sở NHẬP, Quản lý cơ sở và
// Hiệu trưởng CHỈNH SỬA, Marketing không thấy"*. Đối chiếu với mã thì vế
// Marketing đã đúng sẵn, còn vế chỉnh sửa thì chênh: mọi tài khoản quản trị
// trong phạm vi cơ sở mình đều sửa được, kể cả Văn phòng cơ sở.
//
// SIẾT THEO TRƯỜNG DỮ LIỆU, KHÔNG SIẾT CẢ ĐƯỜNG
//
// Cùng một đường `PUT /api/admin/students/:id` mang hai loại việc khác hẳn
// nhau: phần NHÂN THÂN của bé (họ tên, ngày sinh, địa chỉ, số định danh, tiền
// sử bệnh, người liên hệ khẩn cấp) và phần VẬN HÀNH HẰNG NGÀY (chuyển bé sang
// nhóm khác, đánh dấu bé đã nghỉ học).
//
// Chặn cả đường là văn phòng thôi chuyển nhóm được cho bé — việc xảy ra giữa
// năm, và chờ quản lý cơ sở duyệt từng lượt thì sổ điểm danh hôm ấy sai. Đó là
// lấy đi một thứ đang chạy, đúng thứ Nguyên tắc số 1 cấm.
//
// Nên mục [3] của bài này quan trọng ngang mục [2]: nó chứng minh văn phòng
// VẪN làm được phần việc của mình. Một chức vụ bị siết tới mức không làm nổi
// việc thì trường sẽ quay lại dùng chung tài khoản, và cả đợt này vô nghĩa.
import fs from 'node:fs';
import path from 'node:path';
import {
  GOC, thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu,
  taoBoDem, taoReq, taoLogin, khoaVaoCoSo, datChucVu,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('ho-so-sua');
sinhDuLieu(DIR);
const mkQT = taoQuanTri(DIR, 'Quản trị chưa khai chức vụ', 'hs_qt');
const mkQL = taoQuanTri(DIR, 'Quản lý CS1', 'hs_ql');
const mkVP = taoQuanTri(DIR, 'Văn phòng CS1', 'hs_vp');
datChucVu(DIR, 'hs_ql', 'quanly-coso');
datChucVu(DIR, 'hs_vp', 'vanphong-coso');
khoaVaoCoSo(DIR, 'hs_ql', 'cs1');
khoaVaoCoSo(DIR, 'hs_vp', 'cs1');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4839), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}

try {
  const QT = await vao('hs_qt', mkQT);
  const QL = await vao('hs_ql', mkQL);
  const VP = await vao('hs_vp', mkVP);

  // =========================================================================
  console.log('\n[1] Ai sửa được phần nhân thân');
  {
    const qt = await req('PUT', '/api/admin/students/s1', { cookie: QT, body: { address: 'Địa chỉ QT ghi' } });
    check('quản trị CHƯA KHAI CHỨC VỤ vẫn sửa được — trường vừa cài xong phải dùng được',
      qt.status === 200, `${qt.status} ${JSON.stringify(qt.data)}`);

    const ql = await req('PUT', '/api/admin/students/s1', { cookie: QL, body: { address: 'Địa chỉ quản lý ghi' } });
    check('QUẢN LÝ CƠ SỞ sửa được — đúng bảng của trường', ql.status === 200, ql.status);

    const vp = await req('PUT', '/api/admin/students/s1', { cookie: VP, body: { address: 'Địa chỉ văn phòng ghi' } });
    check('VĂN PHÒNG CƠ SỞ KHÔNG còn sửa được phần nhân thân', vp.status === 403, vp.status);
  }

  // =========================================================================
  console.log('\n[2] Chặn ĐỦ mọi trường nhân thân, không chỉ vài cái dễ nhớ');
  {
    // Giá trị phải KHÁC giá trị đang có thật, vì chốt chặn nay chỉ nổ khi giá
    // trị ĐỔI (xem mục [3b]). Dữ liệu mẫu để dân tộc "Kinh" và nhóm máu "O",
    // nên hai ô ấy phải gõ giá trị khác — không thì phép kiểm đo nhầm và xanh
    // vì một lý do không liên quan.
    const truong = {
      name: 'Tên mới', code: 'MA-MOI-1', dob: '2022-05-05', gender: 'nam',
      address: 'Địa chỉ mới', ethnicity: 'Tày', bloodType: 'AB',
      soDinhDanh: '0123456789', tienSuBenh: 'dị ứng hải sản',
      lienHeKhanCap: [{ hoTen: 'Bà ngoại', dienThoai: '0900000000', quanHe: 'bà' }],
    };
    // Đối chứng: chứng minh mấy giá trị trên KHÁC thật, chứ không phải chặn
    // được vì chúng trùng nhau theo một kiểu nào đó.
    {
      const cu = (await req('GET', '/api/admin/students?classId=c1', { cookie: QL })).data;
      const t = (Array.isArray(cu) ? cu : cu?.students || []).find(x => x.id === 's1') || {};
      check('đối chứng — mọi giá trị sắp gửi đều KHÁC giá trị đang có',
        Object.entries(truong).filter(([k]) => k !== 'lienHeKhanCap')
          .every(([k, v]) => String(t[k] ?? '') !== String(v)),
        Object.keys(truong).map(k => `${k}: ${t[k]}`));
    }
    for (const [k, v] of Object.entries(truong)) {
      const r = await req('PUT', '/api/admin/students/s1', { cookie: VP, body: { [k]: v } });
      check(`văn phòng bị chặn ở trường "${k}"`, r.status === 403, `${k} → ${r.status}`);
    }

    // Và lời từ chối phải NÓI RA những gì họ vẫn làm được — một lời từ chối
    // cụt lủn là chỗ người dùng quay về sổ giấy.
    const r = await req('PUT', '/api/admin/students/s1', { cookie: VP, body: { name: 'x' } });
    const loi = String(r.data?.error || '');
    check('câu từ chối nói việc đó của ai', /quản lý cơ sở|ban giám hiệu/i.test(loi), loi);
    check('và nói ra những gì họ VẪN làm được', /chuyển được bé|đã nghỉ|giấy đồng ý/i.test(loi), loi);
    check('không lộ thuật ngữ kỹ thuật', !/403|role|api|admin/i.test(loi), loi);

    // Không ghi lọt gì cả: hồ sơ phải còn nguyên sau mọi lượt bị từ chối.
    const be = (await req('GET', '/api/admin/students', { cookie: QL })).data;
    const s1 = (Array.isArray(be) ? be : be?.students || []).find(x => x.id === 's1');
    check('hồ sơ bé KHÔNG bị ghi lọt một chữ nào sau các lượt bị chặn',
      s1 && s1.name !== 'Tên mới' && s1.address === 'Địa chỉ quản lý ghi',
      { name: s1?.name, address: s1?.address });
  }

  // =========================================================================
  console.log('\n[3] Văn phòng VẪN làm được phần việc hằng ngày của mình');
  {
    // Chuyển nhóm: việc xảy ra giữa năm, chờ duyệt từng lượt thì sổ điểm danh
    // hôm ấy sai.
    const chuyen = await req('PUT', '/api/admin/students/s1', { cookie: VP, body: { classId: 'c2' } });
    check('VĂN PHÒNG VẪN CHUYỂN ĐƯỢC bé sang nhóm khác trong cơ sở mình',
      chuyen.status === 200, `${chuyen.status} ${JSON.stringify(chuyen.data)}`);

    const ve = await req('PUT', '/api/admin/students/s1', { cookie: VP, body: { classId: 'c1' } });
    check('và chuyển về lại được', ve.status === 200, ve.status);

    // Đánh dấu bé đã nghỉ, rồi nhận lại.
    const nghi = await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: false } });
    check('VĂN PHÒNG VẪN đánh dấu được bé đã nghỉ học', nghi.status === 200, nghi.status);
    const lai = await req('PUT', '/api/admin/students/s6', { cookie: VP, body: { active: true } });
    check('và nhận lại được', lai.status === 200, lai.status);

    // Ghi giấy đồng ý — đường riêng, cố ý không đụng tới.
    const dy = await req('PUT', '/api/admin/students/s1/dong-y', {
      cookie: VP, body: { hoSoHocTap: true },
    });
    check('VĂN PHÒNG VẪN ghi được giấy đồng ý của gia đình', dy.status === 200, `${dy.status} ${JSON.stringify(dy.data)}`);

    // Và vẫn ĐỌC được hồ sơ — siết ghi, không siết đọc.
    const doc = await req('GET', '/api/admin/students', { cookie: VP });
    check('văn phòng vẫn ĐỌC được danh sách hồ sơ bé', doc.status === 200, doc.status);
  }

  // =========================================================================
  console.log('\n[3b] GỬI TRỌN BIỂU MẪU — đúng cách màn hình thật gửi');
  {
    // MỤC NÀY BẮT ĐƯỢC MỘT LỖI THẬT CỦA BẢN ĐẦU Đ168.
    //
    // Mục [3] ở trên gửi TỪNG TRƯỜNG một — đúng như API cho phép, nhưng KHÔNG
    // PHẢI cách màn hình gửi. Hàm `suaHocSinh` của public/js/views/admin.js
    // luôn gửi TRỌN biểu mẫu: mười trường nhân thân cộng `classId` trong cùng
    // một gói PUT. Bản đầu của chốt chặn nổ khi một trường CÓ MẶT trong gói,
    // nên văn phòng chỉ đổi ô Nhóm rồi bấm Lưu cũng nhận 403 — mất luôn việc
    // chuyển nhóm và việc ghi giấy đồng ý (đường đồng ý nằm sau nó trong cùng
    // khối try của màn hình). Đúng hai việc mà câu từ chối hứa họ vẫn làm được.
    const be = (await req('GET', '/api/admin/students?classId=c1', { cookie: QL })).data;
    const s1 = (Array.isArray(be) ? be : be?.students || []).find(x => x.id === 's1');
    check('đọc được hồ sơ hiện tại để dựng biểu mẫu', !!s1, s1?.id);

    // Biểu mẫu y như trình duyệt gửi: mọi trường, giá trị GIỮ NGUYÊN, chỉ đổi nhóm.
    const nguyenMau = {
      name: s1.name,
      code: s1.code || '',
      dob: s1.dob || '',
      gender: s1.gender || '',
      address: s1.address || '',
      ethnicity: s1.ethnicity || '',
      bloodType: s1.bloodType || '',
      soDinhDanh: s1.soDinhDanh || '',
      tienSuBenh: s1.tienSuBenh || '',
      lienHeKhanCap: s1.lienHeKhanCap || [],
    };
    const doiNhom = await req('PUT', '/api/admin/students/s1', {
      cookie: VP, body: { ...nguyenMau, classId: 'c2' },
    });
    check('VĂN PHÒNG CHUYỂN ĐƯỢC NHÓM khi gửi trọn biểu mẫu — không đổi gì khác thì không phải là sửa',
      doiNhom.status === 200, `${doiNhom.status} ${JSON.stringify(doiNhom.data)}`);
    await req('PUT', '/api/admin/students/s1', { cookie: VP, body: { ...nguyenMau, classId: 'c1' } });

    // Và vẫn chặn khi thật sự ĐỔI một trường nhân thân trong cùng gói ấy.
    const doiTen = await req('PUT', '/api/admin/students/s1', {
      cookie: VP, body: { ...nguyenMau, name: 'Tên bị đổi lén', classId: 'c1' },
    });
    check('nhưng ĐỔI một trường nhân thân trong cùng gói thì vẫn bị chặn',
      doiTen.status === 403, doiTen.status);
    const con = (await req('GET', '/api/admin/students?classId=c1', { cookie: QL })).data;
    check('và tên bé không bị ghi lọt',
      (Array.isArray(con) ? con : con?.students || []).some(x => x.id === 's1' && x.name === s1.name),
      s1.name);

    // Giấy đồng ý — đường riêng, nằm SAU đường PUT trong cùng khối của màn hình.
    const dy = await req('PUT', '/api/admin/students/s1/dong-y', { cookie: VP, body: { truyenThong: false } });
    check('và ghi giấy đồng ý vẫn chạy — việc thứ hai câu từ chối hứa',
      dy.status === 200, dy.status);
  }

  // =========================================================================
  console.log('\n[4] Danh sách trường nhân thân KHÔNG được trôi khỏi vòng lặp ghi');
  {
    // Đây là chỗ bản vá này dễ hỏng lặng lẽ nhất: thêm một trường nhân thân mới
    // vào vòng lặp ghi mà quên khai vào danh sách chặn là mở lại đúng cánh cửa
    // vừa đóng — và không có gì báo, vì đường vẫn chạy bình thường.
    const src = fs.readFileSync(path.join(GOC, 'routes/admin.js'), 'utf8');
    const dau = src.indexOf('const TRUONG_NHAN_THAN = [');
    check('tìm thấy danh sách trường nhân thân', dau > 0, dau);
    const ds = src.slice(dau, src.indexOf('];', dau));

    // Vòng lặp ghi của chính đường PUT.
    const putDau = src.indexOf("app.put('/api/admin/students/:id'");
    const than = src.slice(putDau, putDau + 6000);
    const mVong = than.match(/for \(const k of \[([^\]]+)\]\) \{/);
    check('tìm thấy vòng lặp ghi các trường chữ', !!mVong, mVong && mVong[1]);
    for (const k of (mVong ? mVong[1] : '').split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean)) {
      check(`trường "${k}" trong vòng lặp ghi CÓ trong danh sách chặn`, ds.includes(`'${k}'`), ds);
    }

    // Ba trường ghi ở bảng riêng cũng phải có tên trong danh sách.
    for (const k of ['soDinhDanh', 'tienSuBenh', 'lienHeKhanCap']) {
      check(`trường "${k}" (bảng hồ sơ mở rộng) CÓ trong danh sách chặn`, ds.includes(`'${k}'`), ds);
    }
    // Và hai trường VẬN HÀNH thì cố ý KHÔNG có.
    for (const k of ['classId', 'active']) {
      check(`trường vận hành "${k}" cố ý KHÔNG nằm trong danh sách chặn`, !ds.includes(`'${k}'`), ds);
    }
  }
} finally {
  sv.dung();
  await new Promise(r => setTimeout(r, 300));
  donThuMucTam(DIR);
}

tongKet('Ai sửa được phần nhân thân của hồ sơ bé (Đ168)');
