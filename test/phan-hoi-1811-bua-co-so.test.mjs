// Bài canh NHẬT KÝ NGÀY — BỮA ĂN THEO CƠ SỞ (góp ý 18/11, Đ260g).
//
// Chạy bằng:  node test/phan-hoi-1811-bua-co-so.test.mjs
//
// Nhà trường: "Với bữa sữa chiều thì ở 1 cơ sở sẽ không có. Có cách nào bỏ đi
// không, 2 cơ sở kia thì có bữa này." Nên văn phòng / ban giám hiệu tắt được
// từng bữa cho từng cơ sở (bảng `nhatky_bua_coso`). Bài này canh:
//
//   1. Mặc định (chưa ai tắt gì) vẫn đủ năm bữa ở mọi cơ sở — như cũ.
//   2. Tắt "Bữa sữa chiều" ở cơ sở A: cô và gia đình cơ sở A không còn bữa đó
//      (màn cả nhóm, màn từng bé, bản gửi gia đình); cơ sở B vẫn còn.
//   3. KHÔNG LÀM MẤT DỮ LIỆU ĐÃ GHI: ngày đã có ghi chép của bữa đó thì bữa ấy
//      vẫn hiện, xem và sửa được. Thực đơn ngày đó có món cho bữa ấy thì cũng
//      vẫn hiện (trường đổi ý một ngày).
//   4. Quyền: cô, gia đình không sửa được (403); quản lý cơ sở B không sửa được
//      cơ sở A; không tắt được hết năm bữa.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, khoaVaoCoSo, datChucVu, HOM_NAY as homNayVN,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('bua-co-so');
sinhDuLieu(DIR);
batPhanHe(DIR, ['nhatky']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const mkQL2 = taoQuanTri(DIR, 'Quản Lý Cơ Sở Hai', 'quanly2');
khoaVaoCoSo(DIR, 'quanly2', 'cs2');
datChucVu(DIR, 'quanly2', 'quanly-coso');

const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 5450), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const C1 = await vao('hieutruong', mk1);
const QL2 = await vao('quanly2', mkQL2);
const GV = (await login('giaovien', '123456')).cookie;       // cô nhóm c1 Chồi 2
const GV_NT = (await login('giaovien4', '123456')).cookie;   // cô nhóm c4 Nhà trẻ 1 (cs1)
const PH = (await login('phuhuynh', '123456')).cookie;       // mẹ s1 + s2 (nhóm c1)
const PH_NT = (await login('ph.trang', '123456')).cookie;    // mẹ s9 (nhóm c4)

const HOM_NAY = homNayVN();
const lui = (n) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const HOM_QUA = lui(1);
const NGAY_KHAC = lui(3);
const NAM = 'breakfast,snack_sang,lunch,snack,milk';

const buaNhom = async (classId, ngay, cookie) => {
  const r = await req('GET', `/api/nhatky?classId=${classId}&ngay=${ngay}`, { cookie });
  return { r, ma: ((r.data || {}).buaAn || []).map(b => b.bua) };
};
const beCua = (r, id) => ((r.data || {}).danhSach || []).find(b => b.studentId === id) || {};
const buaCua = (b, kieu) => ((b && b.buaAn) || []).find(x => x.bua === kieu) || null;
const datBua = (cookie, campusId, bua, tat) => req('PUT', '/api/nhatky/bua-co-so', { cookie, body: { campusId, bua, tat } });
const ngayCua = async (cookie, studentId, tu, den) =>
  ((await req('GET', `/api/nhatky?studentId=${studentId}&tu=${tu}&den=${den}`, { cookie })).data || {}).ngayCo || [];

try {
  // Hai cơ sở có nhóm có bé: c4 (Nhà trẻ 1) ở cs1, c1 (Chồi 2) chuyển sang cs2.
  const chuyen = await req('PUT', '/api/admin/classes/c1/campus', { cookie: C1, body: { campusId: 'cs2' } });
  if (chuyen.status !== 200) throw new Error(`Không chuyển được nhóm c1 sang cs2: ${chuyen.status}`);

  // =========================================================================
  console.log('\n[1] Mặc định: chưa ai tắt gì thì mọi cơ sở đủ năm bữa');
  {
    const r = await req('GET', '/api/nhatky/bua-co-so', { cookie: C1 });
    check('ban giám hiệu đọc được cài đặt bữa theo cơ sở', r.status === 200, r.status);
    const coSo = (r.data || {}).coSo || [];
    check('thấy cả ba cơ sở, chưa cơ sở nào tắt bữa nào',
      coSo.map(c => c.id).sort().join(',') === 'cs1,cs2,cs3' && coSo.every(c => Array.isArray(c.tat) && !c.tat.length),
      JSON.stringify(coSo));
    check('kèm năm bữa của trường đúng tên', ((r.data || {}).bua || []).map(b => `${b.ma}:${b.ten}`).join('|')
      === 'breakfast:Bữa sáng|snack_sang:Bữa phụ sáng|lunch:Bữa trưa|snack:Bữa phụ chiều|milk:Bữa sữa chiều',
    JSON.stringify((r.data || {}).bua));
    check('nhóm c4 (cs1) đủ năm bữa', (await buaNhom('c4', HOM_NAY, GV_NT)).ma.join(',') === NAM);
    check('nhóm c1 (cs2) đủ năm bữa', (await buaNhom('c1', HOM_NAY, GV)).ma.join(',') === NAM);
  }

  // Cô ghi Bữa sữa chiều HÔM QUA cho s9 — TRƯỚC khi cơ sở tắt bữa này.
  const ghiQua = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
    classId: 'c4', ngay: HOM_QUA, bua: 'milk', danhSach: [{ studentId: 's9', muc: 'het', ghiChu: 'uống hết hộp' }] } });
  check('đối chứng — ghi được bữa sữa chiều hôm qua khi cơ sở còn dùng', ghiQua.status === 200 && ghiQua.data.daGhi === 1,
    JSON.stringify(ghiQua.data));

  // =========================================================================
  console.log('\n[2] Tắt Bữa sữa chiều ở cs1: cô và gia đình cs1 không còn bữa đó, cs2 vẫn còn');
  {
    const t = await datBua(C1, 'cs1', 'milk', true);
    check('ban giám hiệu tắt được bữa sữa chiều của cs1', t.status === 200 && t.data.ok === true, `${t.status} ${JSON.stringify(t.data)}`);
    const r = await req('GET', '/api/nhatky/bua-co-so', { cookie: C1 });
    const cs = ((r.data || {}).coSo || []).reduce((m, c) => ({ ...m, [c.id]: c.tat }), {});
    check('đọc lại: cs1 tắt đúng milk, cs2 và cs3 không tắt gì',
      (cs.cs1 || []).join(',') === 'milk' && !(cs.cs2 || []).length && !(cs.cs3 || []).length, JSON.stringify(cs));

    const { r: n4, ma } = await buaNhom('c4', HOM_NAY, GV_NT);
    check('màn cô nhóm c4 hôm nay còn bốn bữa, không có Bữa sữa chiều',
      ma.join(',') === 'breakfast,snack_sang,lunch,snack', ma);
    check('từng bé của c4 cũng không còn bữa sữa chiều',
      ((n4.data || {}).danhSach || []).every(b => b.buaAn.length === 4 && !buaCua(b, 'milk')));
    const { r: nhom1, ma: ma1 } = await buaNhom('c1', HOM_NAY, GV);
    check('nhóm c1 (cs2) vẫn đủ năm bữa', ma1.join(',') === NAM, ma1);
    // Thực đơn DÙNG CHUNG hôm nay (dữ liệu mẫu) có món cho bữa sữa — đúng chuyện
    // trường kể. Thực đơn chung không được kéo bữa đã tắt của cs1 trở lại.
    const sua1 = ((nhom1.data || {}).buaAn || []).find(b => b.bua === 'milk');
    check('đối chứng — thực đơn dùng chung hôm nay có món cho bữa sữa (nên cs1 bỏ được là nhờ cài đặt, không nhờ thực đơn trống)',
      !!sua1 && sua1.mon.length > 0, JSON.stringify(sua1));
    check('ngày khác của c4 (không ai ghi bữa sữa) cũng không còn', !(await buaNhom('c4', NGAY_KHAC, GV_NT)).ma.includes('milk'));

    const ghi = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: HOM_NAY, bua: 'milk', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    check('không ghi mới được vào bữa cơ sở đã tắt (400)', ghi.status === 400, `${ghi.status} ${JSON.stringify(ghi.data)}`);
    const ghi2 = await req('PUT', '/api/nhatky/bua', { cookie: GV, body: {
      classId: 'c1', ngay: HOM_NAY, bua: 'milk', danhSach: [{ studentId: 's1', muc: 'it' }] } });
    check('cô cs2 vẫn ghi được bữa sữa chiều', ghi2.status === 200 && ghi2.data.daGhi === 1, JSON.stringify(ghi2.data));

    // Gửi phần ăn uống hôm nay cho gia đình s9: bản gửi không có bữa sữa chiều.
    await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: HOM_NAY, bua: 'lunch', danhSach: [{ studentId: 's9', muc: 'het' }] } });
    const g = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_NAY, phan: 'an', studentIds: ['s9'] } });
    check('đối chứng — cô gửi được phần ăn uống hôm nay cho gia đình s9', g.status === 200, JSON.stringify(g.data));
    const nay = (await ngayCua(PH_NT, 's9', HOM_NAY, HOM_NAY)).find(n => n.ngay === HOM_NAY);
    check('gia đình s9 đọc hôm nay: có các bữa, không có Bữa sữa chiều',
      !!nay && nay.buaAn.length === 4 && !buaCua(nay, 'milk') && buaCua(nay, 'lunch').muc === 'het', JSON.stringify(nay && nay.buaAn));
    // Cô xem từng bé (đường ?studentId=, đọc bản đang ghi chứ không phải bản gửi).
    const co9 = await ngayCua(GV_NT, 's9', HOM_NAY, HOM_NAY);
    check('cô xem riêng s9 hôm nay cũng không có Bữa sữa chiều',
      co9.length === 1 && co9[0].buaAn.length === 4 && !buaCua(co9[0], 'milk'), JSON.stringify(co9.map(n => n.buaAn)));

    const g1 = await req('POST', '/api/nhatky/gui', { cookie: GV, body: { classId: 'c1', ngay: HOM_NAY, phan: 'an', studentIds: ['s1'] } });
    check('đối chứng — cô cs2 gửi được phần ăn uống cho gia đình s1', g1.status === 200 && g1.data.daGui === 1, JSON.stringify(g1.data));
    const n1 = (await ngayCua(PH, 's1', HOM_NAY, HOM_NAY)).find(n => n.ngay === HOM_NAY);
    const m1 = n1 && buaCua(n1, 'milk');
    check('gia đình s1 (cs2) vẫn đọc Bữa sữa chiều — con ăn ít', !!m1 && m1.muc === 'it' && n1.buaAn.length === 5,
      JSON.stringify(n1 && n1.buaAn));
  }

  // =========================================================================
  console.log('\n[3] Ngày đã có ghi chép bữa đó: vẫn hiện, xem và sửa được');
  {
    const { r, ma } = await buaNhom('c4', HOM_QUA, GV_NT);
    check('hôm qua c4 vẫn có Bữa sữa chiều (s9 đã được ghi)', ma.includes('milk'), ma);
    const m = buaCua(beCua(r, 's9'), 'milk');
    check('mức và ghi chú đã ghi còn nguyên', m && m.muc === 'het' && m.ghiChu === 'uống hết hộp', JSON.stringify(m));
    const sua = await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: HOM_QUA, bua: 'milk', danhSach: [{ studentId: 's9', muc: 'it', ghiChu: 'uống hết hộp' }] } });
    check('cô sửa được bữa đã ghi đó', sua.status === 200 && sua.data.daDoi === 1, JSON.stringify(sua.data));
    // s10 chỉ được ghi bữa trưa: bữa sữa hiện ở màn nhóm vì s9, nhưng bản gửi
    // gia đình s10 không mang một bữa cơ sở đã tắt mà con không được ghi.
    await req('PUT', '/api/nhatky/bua', { cookie: GV_NT, body: {
      classId: 'c4', ngay: HOM_QUA, bua: 'lunch', danhSach: [{ studentId: 's10', muc: 'het' }] } });
    const g = await req('POST', '/api/nhatky/gui', { cookie: GV_NT, body: { classId: 'c4', ngay: HOM_QUA, phan: 'an', studentIds: ['s9', 's10'] } });
    check('đối chứng — gửi được phần ăn uống hôm qua cho hai bé', g.status === 200 && g.data.daGui === 2, JSON.stringify(g.data));
    const qua = (await ngayCua(PH_NT, 's9', HOM_QUA, HOM_QUA)).find(n => n.ngay === HOM_QUA);
    const mq = qua && buaCua(qua, 'milk');
    check('gia đình s9 vẫn đọc được bữa sữa chiều hôm qua', !!mq && mq.muc === 'it', JSON.stringify(qua && qua.buaAn));
    const PH10 = (await login('ph.duy', '123456')).cookie;    // bố s10
    const q10 = (await ngayCua(PH10, 's10', HOM_QUA, HOM_QUA)).find(n => n.ngay === HOM_QUA);
    check('gia đình s10 đọc hôm qua: bữa trưa có, không có Bữa sữa chiều',
      !!q10 && buaCua(q10, 'lunch').muc === 'het' && !buaCua(q10, 'milk'), JSON.stringify(q10 && q10.buaAn));
    const sau = await req('GET', `/api/nhatky?classId=c4&ngay=${HOM_QUA}`, { cookie: GV_NT });
    check('màn cô thấy cả hai bé "đã gửi", không có "chưa gửi" giả',
      ['s9', 's10'].every(id => { const a = (beCua(sau, id).gui || {}).an || {}; return a.guiLuc && a.chuaGui === false; }),
      JSON.stringify(['s9', 's10'].map(id => (beCua(sau, id).gui || {}).an)));
  }

  // =========================================================================
  console.log('\n[4] Quyền: cô, gia đình không sửa được; quản lý cs2 không sửa được cs1');
  {
    for (const [ten, ck] of [['cô', GV_NT], ['gia đình', PH_NT]]) {
      const p = await datBua(ck, 'cs1', 'breakfast', true);
      check(`${ten} PUT → 403`, p.status === 403, p.status);
      const g = await req('GET', '/api/nhatky/bua-co-so', { cookie: ck });
      check(`${ten} GET cài đặt → 403`, g.status === 403, g.status);
    }
    const r = await req('GET', '/api/nhatky/bua-co-so', { cookie: QL2 });
    check('quản lý cs2 chỉ thấy cơ sở của mình', r.status === 200 && ((r.data || {}).coSo || []).map(c => c.id).join(',') === 'cs2',
      JSON.stringify((r.data || {}).coSo));
    const p = await datBua(QL2, 'cs1', 'milk', false);
    check('quản lý cs2 KHÔNG bật lại được bữa của cs1 (403)', p.status === 403, p.status);
    check('cs1 vẫn tắt bữa sữa chiều', !(await buaNhom('c4', HOM_NAY, GV_NT)).ma.includes('milk'));
    const p2 = await datBua(QL2, 'cs2', 'snack_sang', true);
    check('quản lý cs2 tắt được bữa của cơ sở mình', p2.status === 200, `${p2.status} ${JSON.stringify(p2.data)}`);
    check('c1 (cs2) không còn Bữa phụ sáng', !(await buaNhom('c1', NGAY_KHAC, GV)).ma.includes('snack_sang'));
    const p3 = await datBua(QL2, 'cs2', 'snack_sang', false);
    check('và bật lại được', p3.status === 200 && (await buaNhom('c1', NGAY_KHAC, GV)).ma.join(',') === NAM);

    const sai = await datBua(C1, 'cs1', 'other', true);
    check('mã bữa ngoài năm bữa của trường → 400', sai.status === 400, sai.status);
    const sai2 = await datBua(C1, 'cs-khong-co', 'milk', true);
    check('cơ sở không tồn tại → 404', sai2.status === 404, sai2.status);
  }

  // =========================================================================
  console.log('\n[5] Không tắt được hết năm bữa');
  {
    for (const b of ['breakfast', 'snack_sang', 'lunch', 'snack']) {
      const p = await datBua(C1, 'cs3', b, true);
      check(`tắt ${b} ở cs3`, p.status === 200, p.status);
    }
    const cuoi = await datBua(C1, 'cs3', 'milk', true);
    check('tắt bữa cuối cùng → 400, kèm lời nói rõ', cuoi.status === 400 && /ít nhất một bữa/.test((cuoi.data || {}).error || ''),
      `${cuoi.status} ${JSON.stringify(cuoi.data)}`);
    const r = await req('GET', '/api/nhatky/bua-co-so', { cookie: C1 });
    const cs3 = ((r.data || {}).coSo || []).find(c => c.id === 'cs3');
    check('cs3 vẫn còn Bữa sữa chiều', cs3 && cs3.tat.length === 4 && !cs3.tat.includes('milk'), JSON.stringify(cs3));
  }

  // =========================================================================
  console.log('\n[6] Thực đơn ngày đó có món cho bữa đã tắt thì bữa ấy vẫn hiện');
  {
    const td = await req('PUT', `/api/menu/${NGAY_KHAC}`, { cookie: C1, body: { campusId: 'cs1', meals: [
      { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: ['Cơm', 'Cá kho'] },
      { type: 'milk', label: 'Sữa chiều', time: '15:30', items: ['Sữa tươi 180ml'] },
    ] } });
    check('đối chứng — soạn được thực đơn có bữa sữa cho bếp cs1', td.status === 200, `${td.status} ${JSON.stringify(td.data).slice(0, 120)}`);
    const { r } = await buaNhom('c4', NGAY_KHAC, GV_NT);
    const m = ((r.data || {}).buaAn || []).find(b => b.bua === 'milk');
    check('c4 ngày đó có lại Bữa sữa chiều, kèm món của bếp', m && m.ten === 'Bữa sữa chiều' && m.mon.join(',') === 'Sữa tươi 180ml',
      JSON.stringify(m));
  }

  // =========================================================================
  console.log('\n[7] Bật lại: cs1 có lại Bữa sữa chiều; có ghi nhật ký thao tác');
  {
    const lai = await datBua(C1, 'cs1', 'milk', false);
    check('ban giám hiệu bật lại được', lai.status === 200, lai.status);
    check('c4 hôm nay có lại năm bữa', (await buaNhom('c4', HOM_NAY, GV_NT)).ma.join(',') === NAM);
    const a = await req('GET', '/api/admin/audit', { cookie: C1 });
    const dong = (Array.isArray(a.data) ? a.data : []).filter(x => x.action === 'nhatky-bua-coso');
    check('mỗi lần tắt / bật đều có dòng nhật ký thao tác', dong.length >= 8, dong.length);
  }
} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
