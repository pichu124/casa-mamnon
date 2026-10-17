// Bài canh HÀNH TRÌNH BỐN TAB + NHÌN LẠI CUỐI THÁNG BẰNG CHỮ QUY ƯỚC — góp ý 06/10, mục 7.
//
// Chạy bằng:  npm run test:hanh-trinh-bon-tab
//
// Nhà trường: tab "Kế hoạch của bé" trong Hành trình cho cả cô và gia đình; cô
// cập nhật mức độ từng bài bằng "ký tự quy ước", có "Tiếp tục ở tháng sau"
// (dạy mới vì bé nghỉ chưa học / ôn tập), và bài ở mức Hoàn thành / Xuất sắc tự
// sang Báo cáo tháng. Chủ dự án chốt 06/10: GIỮ năm trạng thái trung tính kèm
// chữ M/S/W/N/NA; "Hoàn thành / Xuất sắc" = Đã vững (S) / Vượt trội (M); gia
// đình KHÔNG thấy mức độ từng bài (giữ bài canh Đ191); không nới QUY TẮC 4.
import fs from 'fs';
import path from 'path';
import {
  thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin,
  batPhanHe, HOM_NAY, GOC,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('hanh-trinh-bon-tab');
sinhDuLieu(DIR);
batPhanHe(DIR, ['kehoachbe', 'hanhtrinh', 'baocaohoctap']);
const mk1 = taoQuanTri(DIR, 'Hiệu Trưởng', 'hieutruong');
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 4871), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);
async function vao(u, m) {
  const d = await login(u, m);
  await req('POST', '/api/auth/set-new-password', { cookie: d.cookie, body: { newPassword: 'quantri2026' } });
  return (await login(u, 'quantri2026')).cookie;
}
const QL = await vao('hieutruong', mk1);
const GV = (await login('giaovien', '123456')).cookie;    // t1 — cô phụ trách nhóm c1
const GV3 = (await login('giaovien3', '123456')).cookie;  // t3 — cũng dạy c1
const PH = (await login('phuhuynh', '123456')).cookie;    // mẹ s1

const THANG = HOM_NAY().slice(0, 7);
const [Y, M] = THANG.split('-').map(Number);
const THANG_SAU = new Date(Date.UTC(Y, M, 1)).toISOString().slice(0, 7);
const nhom = async (cookie = GV, thang = THANG) => (await req('GET', `/api/kehoachbe?classId=c1&thang=${thang}`, { cookie })).data || {};
const cuaBe = async (id, cookie = GV, thang = THANG) => ((await nhom(cookie, thang)).danhSach || []).find(x => x.studentId === id) || {};
const luu = (cookie, ct, danhSach, thang = THANG) => req('PUT', '/api/kehoachbe', { cookie, body: { classId: 'c1', thang, chuongTrinh: ct, danhSach } });

try {
  const dm = (await req('GET', '/api/kehoachbe/bai-hoc', { cookie: GV })).data || {};
  const bai = (goc, ten) => (dm.baiHoc || []).find(b => b.gocLinhVuc === goc && b.ten === ten);
  const thapHong = bai('giac-quan', 'Tháp hồng');
  const hopMau = bai('giac-quan', 'Hộp màu 1');
  const rotNuoc = bai('thuc-hanh-cuoc-song', 'Rót nước');
  const colours = bai('cambridge', 'Colours');

  // =========================================================================
  console.log('\n[1] Năm trạng thái kèm chữ quy ước, hai cách "tiếp tục ở tháng sau"');
  {
    const d = await nhom();
    check('mức độ = năm trạng thái trung tính, đúng chữ NA / N / W / S / M',
      (d.mucDo || []).map(x => `${x.ma}:${x.chuCai}`).join(',') === 'chua-day:NA,chua-quan-sat-thay:N,dang-hinh-thanh:W,da-vung:S,vuot-troi:M', d.mucDo);
    check('"Tiếp tục ở tháng sau" có hai lựa chọn: dạy mới / ôn tập',
      (d.tiepTuc || []).map(x => x.ma).join(',') === 'hoc-moi,on-tap', d.tiepTuc);
    check('không chữ nào là phần trăm hay điểm số', !/%|điểm/.test(JSON.stringify(d.mucDo)));
  }

  // Một kế hoạch đã duyệt cho s1: ba bài Montessori.
  await luu(GV, 'chu-nhiem', [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [
    { baiHocId: thapHong.id, nhan: 'hoc-moi' }, { baiHocId: hopMau.id, nhan: 'hoc-moi' }, { baiHocId: rotNuoc.id, nhan: 'on-tap' }] }]);
  await req('POST', '/api/kehoachbe/gui-duyet', { cookie: GV, body: { classId: 'c1', thang: THANG, studentId: 's1', chuongTrinh: 'chu-nhiem' } });
  const ke1 = (await cuaBe('s1')).ke;
  await req('POST', '/api/kehoachbe/duyet', { cookie: QL, body: { quyetDinh: 'da-duyet', phan: [{ keId: ke1.id, chuongTrinh: 'chu-nhiem' }] } });
  const dong = (k, baiHocId) => (k.baiHoc || []).find(b => b.baiHocId === baiHocId) || {};

  // =========================================================================
  console.log('\n[2] Cô nhìn lại từng bài bằng chữ quy ước — kết luận hai mức suy ra cho các chỗ đang đọc');
  {
    const r = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke1.id, baiHoc: [
      { id: dong(ke1, thapHong.id).id, mucDo: 'da-vung', tiepTuc: '' },
      { id: dong(ke1, hopMau.id).id, mucDo: 'chua-day', tiepTuc: 'hoc-moi' },
      { id: dong(ke1, rotNuoc.id).id, mucDo: 'dang-hinh-thanh', tiepTuc: 'on-tap' },
    ] } });
    check('lưu được phần nhìn lại trên bản ĐÃ DUYỆT', r.status === 200, r.data);
    const k = (await cuaBe('s1')).ke;
    check('Tháp hồng mang mức S (đã vững)', dong(k, thapHong.id).mucDo === 'da-vung', dong(k, thapHong.id));
    check('Đã vững → kết luận "đã thấy con làm được" (báo cáo tháng đọc cột này)', dong(k, thapHong.id).ketQua === 'da-thay');
    check('Hộp màu: chưa dạy + tiếp tục DẠY MỚI tháng sau', dong(k, hopMau.id).mucDo === 'chua-day'
      && dong(k, hopMau.id).tiepTuc === 'hoc-moi' && dong(k, hopMau.id).ketQua === 'tiep-tuc' && dong(k, hopMau.id).tiepTucThangSau);
    check('Rót nước: đang hình thành + ÔN TẬP tháng sau', dong(k, rotNuoc.id).tiepTuc === 'on-tap' && dong(k, rotNuoc.id).ketQua === 'tiep-tuc');

    const sai = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke1.id, baiHoc: [{ id: dong(ke1, thapHong.id).id, mucDo: 'xuat-sac' }] } });
    check('mức độ lạ → 400', sai.status === 400, sai.status);
    const sai2 = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke1.id, baiHoc: [{ id: dong(ke1, thapHong.id).id, tiepTuc: 'nghi-luon' }] } });
    check('lựa chọn tiếp tục lạ → 400', sai2.status === 400, sai2.status);
    const cu = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: ke1.id, baiHoc: [{ id: dong(ke1, thapHong.id).id, ketQua: 'da-thay' }] } });
    check('app đời cũ gửi kết luận hai mức vẫn lưu được', cu.status === 200, cu.status);
    check('và không xoá mức độ chữ quy ước đã ghi', dong((await cuaBe('s1')).ke, thapHong.id).mucDo === 'da-vung');
  }

  // =========================================================================
  console.log('\n[3] Tháng sau: bài "tiếp tục" lên sẵn với ĐÚNG nhãn cô chọn');
  {
    const gy = await req('GET', `/api/kehoachbe/goi-y?studentId=s1&thang=${THANG_SAU}`, { cookie: GV });
    const g = (id) => (gy.data.baiHoc || []).find(b => b.baiHocId === id);
    check('Hộp màu gợi ý DẠY MỚI (tháng này bé chưa học)', g(hopMau.id)?.nhan === 'hoc-moi', gy.data.baiHoc);
    check('Rót nước gợi ý ÔN TẬP', g(rotNuoc.id)?.nhan === 'on-tap', gy.data.baiHoc);
    check('Tháp hồng (đã vững, không tiếp tục) KHÔNG lên', !g(thapHong.id));
    const chep = await req('POST', '/api/kehoachbe/chep-thang-truoc', { cookie: GV, body: { classId: 'c1', thang: THANG_SAU, chiTiepTuc: true, chuongTrinh: 'chu-nhiem' } });
    check('chép phần Montessori sang tháng sau (chỉ bài tiếp tục)', chep.status === 200 && chep.data.daChep >= 1, chep.data);
    const k2 = (await cuaBe('s1', GV, THANG_SAU)).ke;
    check('bài chép sang mang đúng nhãn: Hộp màu dạy mới, Rót nước ôn tập',
      dong(k2, hopMau.id).nhan === 'hoc-moi' && dong(k2, rotNuoc.id).nhan === 'on-tap' && !dong(k2, thapHong.id).id, k2.baiHoc);
    check('mức độ của tháng trước KHÔNG chép sang tháng sau', !dong(k2, hopMau.id).mucDo && !dong(k2, rotNuoc.id).mucDo);
  }

  // =========================================================================
  console.log('\n[4] Lưu lại kế hoạch (dòng bài ghi lại mã mới) KHÔNG làm mất mức độ đã nhìn lại');
  {
    await luu(GV, 'chu-nhiem', [{ studentId: 's3', capNhatLucGoc: null, baiHoc: [{ baiHocId: thapHong.id, nhan: 'hoc-moi' }] }]);
    let k = (await cuaBe('s3')).ke;
    await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: k.id, baiHoc: [{ id: dong(k, thapHong.id).id, mucDo: 'vuot-troi' }] } });
    k = (await cuaBe('s3')).ke;
    const r = await luu(GV, 'chu-nhiem', [{ studentId: 's3', capNhatLucGoc: k.chuongTrinh['chu-nhiem'].capNhatLuc,
      baiHoc: [{ baiHocId: thapHong.id, nhan: 'mo-rong' }, { baiHocId: hopMau.id, nhan: 'hoc-moi' }] }]);
    check('đổi nhãn và thêm bài', r.status === 200 && r.data.daLuu === 1, r.data);
    k = (await cuaBe('s3')).ke;
    check('Tháp hồng vẫn mang mức M sau khi lưu lại', dong(k, thapHong.id).mucDo === 'vuot-troi' && dong(k, thapHong.id).nhan === 'mo-rong', dong(k, thapHong.id));
  }

  // =========================================================================
  console.log('\n[5] Quyền: cô nhìn lại đúng phần chương trình của mình');
  {
    await req('PUT', '/api/admin/classes/c1/teachers', { cookie: QL, body: { teacherIds: ['t1', 't3'], chinhId: 't1', nhom: { t3: 'nuoc-ngoai' } } });
    const k = (await cuaBe('s1')).ke;
    const r = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV3, body: { id: k.id, baiHoc: [{ id: dong(k, thapHong.id).id, mucDo: 'da-vung' }] } });
    check('cô nước ngoài KHÔNG nhìn lại bài Montessori', r.status === 403, r.status);
    await luu(GV3, 'nuoc-ngoai', [{ studentId: 's1', capNhatLucGoc: null, baiHoc: [{ baiHocId: colours.id, nhan: 'hoc-moi' }] }]);
    const k2 = (await cuaBe('s1')).ke;
    const r2 = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV, body: { id: k2.id, baiHoc: [{ id: dong(k2, colours.id).id, mucDo: 'da-vung' }] } });
    check('cô phụ trách nhóm KHÔNG nhìn lại bài Cambridge khi đã có cô nước ngoài', r2.status === 403, r2.status);
    const r3 = await req('PUT', '/api/kehoachbe/nhin-lai', { cookie: GV3, body: { id: k2.id, baiHoc: [{ id: dong(k2, colours.id).id, mucDo: 'dang-hinh-thanh' }] } });
    check('cô nước ngoài nhìn lại bài Cambridge của mình', r3.status === 200, r3.status);
  }

  // =========================================================================
  console.log('\n[6] Gia đình: chỉ TÊN BÀI của phần đã duyệt, không mức độ, kèm tên góc thật');
  {
    const d = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH })).data || {};
    const ds = d.baiThangNay || [];
    check('thấy bài Montessori đã duyệt', ds.some(b => b.ten === 'Tháp hồng'), ds.map(b => b.ten));
    check('KHÔNG thấy bài Cambridge còn nháp', !ds.some(b => b.ten === 'Colours'), ds.map(b => b.ten));
    check('mỗi bài vẫn đúng ba khoá: tên, góc, nhãn (bài canh Đ191)', ds.every(b => Object.keys(b).sort().join(',') === 'gocLinhVuc,nhan,ten'), ds[0]);
    const goi = JSON.stringify(ds);
    check('không có mức độ, chữ quy ước hay kết luận nào', !/mucDo|ketQua|tiepTuc|da-vung|"S"|Đã vững/.test(goi), goi.slice(0, 200));
    check('có tên góc của kế hoạch (không còn hiện mã trần "giac-quan")',
      (d.gocKeHoach || []).some(g => g.ma === 'giac-quan' && g.ten === 'Giác quan' && g.chuongTrinh === 'chu-nhiem'), d.gocKeHoach);
    check('bốn tab của gia đình đứng trên ba chương trình từ máy chủ', (d.nhomCoTab || []).length === 3, d.nhomCoTab);
  }

  // =========================================================================
  console.log('\n[7] Mã nguồn: bốn tab, chữ quy ước, không có "Đánh giá cuối tháng" ở phân hệ Kế hoạch');
  {
    const v = fs.readFileSync(path.join(GOC, 'modules/hanhtrinh/view.js'), 'utf8');
    check('màn cô có tab "Kế hoạch của bé" đứng trước ba chương trình', /data-nhom="kehoach">Kế hoạch của bé</.test(v));
    check('màn gia đình có bốn tab', /id="ht-ph-tabs"/.test(v) && /data-tab="kehoach">Kế hoạch của bé</.test(v));
    const kh = ['routes.js', 'view.js', 'schema.sql'].map(t => fs.readFileSync(path.join(GOC, 'modules/kehoachbe', t), 'utf8')).join('\n');
    check('phân hệ Kế hoạch vẫn gọi là "Nhìn lại", không "Đánh giá cuối tháng"', !/Đánh giá cuối tháng/.test(kh));
    check('màu của mức độ không đỏ, không cam', !/MAU_KET_QUA[^}]*(red|orange)/.test(kh) && !/MAU = \{[^}]*(red|orange)/.test(v));
  }

  // =========================================================================
  console.log('\n[8] Ghi nháp CHƯA GẮN BÉ: lớp 1, chỉ cô đã ghi; gắn bé + chương trình thành quan sát');
  {
    const PH1 = PH;
    const GV2 = (await login('giaovien2', '123456')).cookie;   // cô nhóm khác
    const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const trong = await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: {} });
    check('nháp trống trơn → 400', trong.status === 400, trong.status);
    const t = await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { moTa: 'Một bạn tự cài khuy áo khoác', anh: ANH, nhom: 'chu-nhiem' } });
    check('cô ghi nháp chưa gắn bé, kèm ảnh', t.status === 201 && t.data.nhap.coAnh, t.data);
    const nhapId = t.data.nhap.id;
    const anh = t.data.nhap.anh;
    const ds = (await req('GET', '/api/hanhtrinh/nhap', { cookie: GV })).data.nhap || [];
    check('cô thấy nháp của mình', ds.some(n => n.id === nhapId), ds);
    const ds3 = (await req('GET', '/api/hanhtrinh/nhap', { cookie: GV3 })).data.nhap || [];
    check('cô khác KHÔNG thấy nháp của cô này', !ds3.some(n => n.id === nhapId), ds3);
    const dsQl = (await req('GET', '/api/hanhtrinh/nhap', { cookie: QL })).data.nhap || [];
    check('văn phòng cũng KHÔNG thấy (ghi chép riêng của đúng một người)', !dsQl.some(n => n.id === nhapId));
    check('gia đình không mở được đường nháp', (await req('GET', '/api/hanhtrinh/nhap', { cookie: PH1 })).status === 403);
    check('ảnh của nháp: chính cô mở được', (await req('GET', `/api/hanhtrinh/anh/${anh}`, { cookie: GV })).status === 200);
    check('ảnh của nháp: cô khác KHÔNG mở được', (await req('GET', `/api/hanhtrinh/anh/${anh}`, { cookie: GV3 })).status === 403);
    check('ảnh của nháp: gia đình KHÔNG mở được', (await req('GET', `/api/hanhtrinh/anh/${anh}`, { cookie: PH1 })).status === 403);
    const lan = await req('POST', `/api/hanhtrinh/nhap/${nhapId}/gan`, { cookie: GV3, body: { studentId: 's1' } });
    check('cô khác KHÔNG gắn được nháp của cô này — và không biết nó có tồn tại (404)', lan.status === 404, lan.status);
    const ngoai = await req('POST', `/api/hanhtrinh/nhap/${nhapId}/gan`, { cookie: GV, body: { studentId: 's9' } });
    check('gắn vào bé ngoài nhóm của cô → 403', ngoai.status === 403, ngoai.status);
    const sai = await req('POST', `/api/hanhtrinh/nhap/${nhapId}/gan`, { cookie: GV, body: { studentId: 's1', nhom: 'nuoc-ngoai' } });
    check('gắn vào phần Cambridge khi nhóm đã có cô nước ngoài → 403', sai.status === 403, sai.status);
    const g = await req('POST', `/api/hanhtrinh/nhap/${nhapId}/gan`, { cookie: GV, body: { studentId: 's1', nhom: 'chu-nhiem' } });
    check('gắn bé s1 + chương trình Montessori → thành quan sát', g.status === 201 && g.data.nhomCo === 'chu-nhiem', g.data);
    check('nháp đã rời bảng nháp', !((await req('GET', '/api/hanhtrinh/nhap', { cookie: GV })).data.nhap || []).some(n => n.id === nhapId));
    const ht = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: GV })).data;
    check('quan sát mới nằm đúng tab Montessori, giữ ảnh', (ht.quanSat || []).some(q => q.id === g.data.id && q.nhomCo === 'chu-nhiem' && q.anh === anh));
    const htPh = (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie: PH1 })).data;
    check('gia đình KHÔNG thấy quan sát mới (chưa kể thành câu chuyện)', !(htPh.quanSat || []).some(q => q.id === g.data.id));
    const t2 = await req('POST', '/api/hanhtrinh/nhap', { cookie: GV, body: { moTa: 'ghi nhầm' } });
    check('cô khác không bỏ được nháp của cô này (404 — không lộ là có nháp)', (await req('DELETE', `/api/hanhtrinh/nhap/${t2.data.nhap.id}`, { cookie: GV2 })).status === 404);
    check('văn phòng cũng không bỏ được', (await req('DELETE', `/api/hanhtrinh/nhap/${t2.data.nhap.id}`, { cookie: QL })).status === 404);
    check('chính cô bỏ được nháp ghi nhầm', (await req('DELETE', `/api/hanhtrinh/nhap/${t2.data.nhap.id}`, { cookie: GV })).status === 200);
  }

  // =========================================================================
  console.log('\n[9] Quan sát gắn chương trình cô chọn — đúng vai');
  {
    const a = await req('POST', '/api/hanhtrinh', { cookie: GV3, body: { studentId: 's1', moTa: 'Bé hát Hello song', nhom: 'nuoc-ngoai' } });
    check('cô nước ngoài ghi vào phần Cambridge', a.status === 201 && a.data.nhomCo === 'nuoc-ngoai', a.data);
    const b = await req('POST', '/api/hanhtrinh', { cookie: GV3, body: { studentId: 's1', moTa: 'thử ghi sang phần khác', nhom: 'chu-nhiem' } });
    check('cô nước ngoài KHÔNG ghi vào phần Montessori', b.status === 403, b.status);
    const c = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'Bé bật xa', nhom: 'the-chat' } });
    check('phần Thể chất nhóm CHƯA khai cô nào: cô phụ trách nhóm ghi thay được (như trước)', c.status === 201 && c.data.nhomCo === 'the-chat', c.data);
    const d = await req('POST', '/api/hanhtrinh', { cookie: GV, body: { studentId: 's1', moTa: 'nhóm lạ', nhom: 'bong-da' } });
    check('chương trình lạ → 400', d.status === 400, d.status);
  }

  // =========================================================================
  console.log('\n[10] Lời nhắc của cô theo CHƯƠNG TRÌNH và theo TUẦN — chỉ tên bé');
  {
    const n3 = (await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: GV3 })).data;
    check('lời nhắc của cô nước ngoài có danh sách "tuần này"', Array.isArray(n3.tuanNay) && /^\d{4}-\d{2}-\d{2}$/.test(n3.tuTuan), n3);
    check('s1 vừa có quan sát Cambridge của cô → KHÔNG nằm trong danh sách tuần này của cô', !(n3.tuanNay || []).some(b => b.studentId === 's1'));
    check('bé khác của nhóm chưa có gì phần Cambridge → có tên', (n3.tuanNay || []).some(b => b.studentId === 's3'));
    check('nói rõ là phần Cambridge (cô dạy hai nhóm, hai vai: kể đủ cả hai)', /Cambridge/.test(n3.chuongTrinh) && /Montessori/.test(n3.chuongTrinh), n3.chuongTrinh);
    check('mỗi bé CHỈ có tên — không con số nào', (n3.tuanNay || []).every(b => Object.keys(b).sort().join(',') === 'avatar,hoTen,studentId'));
    const n1 = (await req('GET', '/api/hanhtrinh/nhac-nhe', { cookie: GV })).data;
    check('quan sát Cambridge của cô nước ngoài KHÔNG làm cô phụ trách nhóm "xong việc" với bé khác', Array.isArray(n1.tuanNay), n1);
    check('s1 có quan sát Montessori của cô phụ trách nhóm → không nằm trong danh sách của cô ấy', !(n1.tuanNay || []).some(b => b.studentId === 's1'));
  }

  // =========================================================================
  console.log('\n[11] Màn bốn tab của cô biết trước cô ghi được phần nào — gia đình không nhận gì thêm');
  {
    const cua = async (cookie) => (await req('GET', '/api/hanhtrinh?studentId=s1', { cookie })).data || {};
    const sx = (x) => [...(x || [])].sort().join(',');
    check('cô nước ngoài của nhóm: chỉ ghi được phần Cambridge', sx((await cua(GV3)).nhomDuocGhi) === 'nuoc-ngoai', (await cua(GV3)).nhomDuocGhi);
    check('cô phụ trách nhóm (nhóm đã có cô nước ngoài): Montessori và phần P.E chưa ai giữ',
      sx((await cua(GV)).nhomDuocGhi) === 'chu-nhiem,the-chat', (await cua(GV)).nhomDuocGhi);
    check('văn phòng ghi được cả ba phần', sx((await cua(QL)).nhomDuocGhi) === 'chu-nhiem,nuoc-ngoai,the-chat', (await cua(QL)).nhomDuocGhi);
    check('gia đình KHÔNG nhận khoá này', !('nhomDuocGhi' in (await cua(PH))));
    const hn = (await req('GET', '/api/hanhtrinh/hom-nay', { cookie: GV3 })).data || {};
    const be = (hn.danhSachBe || []);
    check('danh sách bé của màn cô kèm nhóm của từng bé (để chọn nhóm rồi chọn bé)',
      be.some(b => b.id === 's1' && b.classId === 'c1') && be.some(b => b.id === 's2' && b.classId === 'c2'), be.slice(0, 3));
  }

} finally {
  await sv.dung();
  donThuMucTam(DIR);
}
tongKet();
