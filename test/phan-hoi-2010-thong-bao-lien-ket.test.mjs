// Bài canh góp ý 20/10 — G2: bấm thông báo khảo sát là làm khảo sát luôn.
//
// Chạy bằng:  node test/phan-hoi-2010-thong-bao-lien-ket.test.mjs
//
// Khảo sát tạo xong thì app tự gửi một thông báo nhà trường. Thông báo đó
// mang theo `lienKet` = '#/surveys/<mã khảo sát>' để màn Thông báo mở thẳng
// khảo sát. Thông báo khác (gõ tay, thông báo cũ) KHÔNG có `lienKet`.
// Liên kết không mở thêm quyền nào: gia đình ngoài phạm vi khảo sát vẫn bị
// chặn ở đường khảo sát như trước.
import {
  thuMucTam, donThuMucTam, sinhDuLieu, dungMayChu, taoBoDem, taoReq, taoLogin,
} from './_chung.mjs';

const { check, tongKet } = taoBoDem();
const DIR = thuMucTam('phan-hoi-2010-thong-bao-lien-ket');
sinhDuLieu(DIR);
const sv = await dungMayChu({ port: Number(process.env.TEST_PORT || 7161), dir: DIR });
const req = taoReq(sv.BASE);
const login = taoLogin(req);

const dsThongBao = async (cookie) =>
  (await req('GET', '/api/notifications?bo=0&soLuong=100', { cookie })).data || [];

try {
  const co = await login('giaovien', '123456');        // t1 — nhóm Chồi 2 (c1)
  const ph = await login('phuhuynh2', '123456');       // p2 — mẹ bé s3, Chồi 2
  const phNgoai = await login('ph.trang', '123456');   // p7 — bé s9, Nhà trẻ 1

  console.log('\n[G2] Thông báo khảo sát mang liên kết tới đúng khảo sát');
  const ks = await req('POST', '/api/surveys', {
    cookie: co.cookie,
    body: {
      title: 'Khảo sát G2 giờ đón bé', description: '', deadline: '2030-01-01', audience: 'class',
      questions: [{ text: 'Gia đình đón bé lúc mấy giờ?', type: 'choice', options: ['16 giờ', '17 giờ'] }],
    },
  });
  check('đối chứng — cô tạo được khảo sát cho nhóm mình', ks.status === 201, ks.status);

  const tin = (await dsThongBao(ph.cookie)).find(n => n.title === 'Khảo sát mới: Khảo sát G2 giờ đón bé');
  check('đối chứng — gia đình trong nhóm nhận thông báo khảo sát', !!tin);
  check('thông báo khảo sát có lienKet = "#/surveys/<mã khảo sát>"',
    tin && tin.lienKet === `#/surveys/${ks.data.id}`, tin && tin.lienKet);

  const goTay = await req('POST', '/api/notifications', {
    cookie: co.cookie,
    body: { title: 'Mai nhóm chơi với nước G2', body: 'Gia đình gửi thêm một bộ quần áo.', category: 'Nhóm lớp', audience: 'class' },
  });
  check('đối chứng — cô gửi được thông báo gõ tay', goTay.status === 201, goTay.status);
  const tinGoTay = (await dsThongBao(ph.cookie)).find(n => n.title === 'Mai nhóm chơi với nước G2');
  check('thông báo gõ tay KHÔNG có lienKet (bấm vào vẫn mở hộp chi tiết như cũ)',
    tinGoTay && !('lienKet' in tinGoTay), tinGoTay);

  const dsCo = await dsThongBao(co.cookie);
  check('mọi thông báo không phải khảo sát đều không có lienKet',
    dsCo.filter(n => !/^Khảo sát mới:/.test(n.title)).every(n => !('lienKet' in n)),
    dsCo.filter(n => 'lienKet' in n).map(n => n.title));

  console.log('\n[G2] Liên kết không mở thêm quyền');
  check('gia đình ngoài nhóm không thấy thông báo khảo sát',
    !(await dsThongBao(phNgoai.cookie)).some(n => n.title === 'Khảo sát mới: Khảo sát G2 giờ đón bé'));
  const moNgoai = await req('GET', `/api/surveys/${ks.data.id}`, { cookie: phNgoai.cookie });
  check('gia đình ngoài nhóm mở thẳng đường khảo sát vẫn bị chặn (404 như cũ)', moNgoai.status === 404, moNgoai.status);
  const traLoiNgoai = await req('POST', `/api/surveys/${ks.data.id}/respond`, {
    cookie: phNgoai.cookie, body: { answers: { q1: '16 giờ' } },
  });
  check('và không gửi được câu trả lời', traLoiNgoai.status === 404, traLoiNgoai.status);
  const moTrong = await req('GET', `/api/surveys/${ks.data.id}`, { cookie: ph.cookie });
  check('đối chứng — gia đình trong nhóm mở được khảo sát', moTrong.status === 200, moTrong.status);
} finally {
  sv.dung();
  donThuMucTam(DIR);
}
tongKet('G2 — thông báo khảo sát có liên kết');
