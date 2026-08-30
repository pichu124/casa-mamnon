// Bài canh VIDEO TRONG ALBUM.
//
// Chạy bằng:  npm run test:video-album
//
// Nhà trường gửi ngày 30/08, điểm 5: "Nên có video, 1 video bằng nặng bằng trăm
// bức ảnh nhưng cũng quý hơn hàng trăm bức ảnh, khi PH được video hành trình
// học tập của các con".
//
// BA CHỖ ĐÁNG CANH NHẤT
//
//   1. VIDEO PHẢI ĐI QUA ĐÚNG LUẬT ĐỒNG Ý NHƯ ẢNH. Một đoạn video quay cả
//      nhóm còn lộ nhiều hơn một tấm ảnh: có mặt, có giọng, có tên các bé gọi
//      nhau. Cách dựng ở đây là lưu video thành MỘT DÒNG trong `album_photos`
//      y như ảnh, nên nó thừa hưởng nguyên `locAnhChoNguoiXem` — không có
//      đường nào lọt qua vì đó là cùng một đường. Mục [3] kiểm điều đó chạy
//      thật, không chỉ suy luận.
//
//   2. TRẦN DUNG LƯỢNG PHẢI CHẶN THẬT. Video không nén được trong trình duyệt
//      như ảnh. Trần hỏng thì ổ đĩa của trường đầy sau một học kỳ, và đó là
//      kiểu hỏng chỉ lộ ra khi đã muộn. Mục [2].
//
//   3. TỆP KHÔNG PHẢI VIDEO PHẢI BỊ TỪ CHỐI THEO BYTE THẬT, không theo phần
//      khai báo của trình duyệt — cùng luật với ảnh. Mục [2].
import { thuMucTam, donThuMucTam, sinhDuLieu, taoQuanTri, dungMayChu, taoBoDem, taoReq, taoLogin, GOC } from './_chung.mjs';
import fs from 'fs';
import path from 'path';

const { check, tongKet } = taoBoDem();

const DIR = thuMucTam('video-album');
sinhDuLieu(DIR);
const mkQt = taoQuanTri(DIR, 'Hiệu Trưởng', 'va_qt');

const { BASE, dung } = await dungMayChu({ port: 4611, dir: DIR });
const req = taoReq(BASE);
const login = taoLogin(req);

// MỘT TỆP MP4 THẬT ĐỦ ĐỂ ĐI QUA PHÉP KIỂM CHỮ KÝ.
//
// Hộp `ftyp` nằm ở byte 4–8, đúng chỗ máy chủ soi. Không cần là video mở được
// — bài này canh đường đi của tệp, không canh trình phát.
function mp4(soByte = 4096) {
  const b = Buffer.alloc(soByte);
  b.writeUInt32BE(soByte, 0);
  b.write('ftypisom', 4, 'ascii');
  return `data:video/mp4;base64,${b.toString('base64')}`;
}
const ANH = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

try {
  const qt = await login('va_qt', mkQt);
  const co = await login('giaovien', '123456');
  const ph = await login('phuhuynh', '123456');

  // =========================================================================
  console.log('\n[1] Cô đăng được video vào album của nhóm mình');
  {
    // Album phải có ít nhất một tệp ngay lúc tạo — dựng luôn bằng video, vì đó
    // cũng chính là đường cô sẽ đi khi quay xong rồi mới mở app.
    const al = await req('POST', '/api/albums', { cookie: co.cookie, body: {
      classId: 'c1', title: 'Giờ hoạt động góc', date: '2026-08-20',
      photos: [{ video: mp4(), caption: 'Con rót nước vào ly' }] } });
    check('cô tạo được album', al.status === 200 || al.status === 201,
      `${al.status} ${JSON.stringify(al.data).slice(0, 120)}`);
    globalThis.AL = al.data.id || (al.data.album || {}).id;
    check('đối chứng — có mã album để làm tiếp', !!globalThis.AL, JSON.stringify(al.data).slice(0, 140));

    const r = await req('POST', `/api/albums/${globalThis.AL}/photos`, { cookie: co.cookie, body: {
      photos: [{ video: mp4(), caption: 'Con xếp tháp hồng' }] } });
    check('cô đăng thêm được một video nữa', r.status === 201,
      `${r.status} ${JSON.stringify(r.data).slice(0, 140)}`);
    const v = (r.data.photos || [])[0];
    check('video lưu thành một dòng trong album, có tên tệp thật',
      !!v && /^[a-f0-9]{32}\.(mp4|webm)$/.test(v.file || ''), JSON.stringify(v));
    globalThis.VID = v && v.id;
    globalThis.VFILE = v && v.file;

    check('tệp video có thật trong kho',
      fs.existsSync(path.join(DIR, 'uploads', globalThis.VFILE)), globalThis.VFILE);

    const xem = await req('GET', `/api/albums/${globalThis.AL}`, { cookie: co.cookie });
    const trongAlbum = ((xem.data.photos || xem.data.album?.photos) || [])
      .find(x => x.id === globalThis.VID);
    check('mở lại album vẫn thấy video', !!trongAlbum, JSON.stringify(xem.data).slice(0, 160));
  }

  // =========================================================================
  console.log('\n[2] Trần dung lượng và định dạng chặn thật');
  {
    // 8,5 MB: vượt trần 8 MB của ta, NHƯNG base64 của nó (11,3 MB) vẫn lọt qua
    // thân yêu cầu 12 MB của Express — nên nó thử đúng chốt chặn CỦA MÌNH.
    // Hai chốt là hai thứ khác nhau, và mục ngay dưới thử cái còn lại.
    const to = await req('POST', `/api/albums/${globalThis.AL}/photos`, { cookie: co.cookie, body: {
      photos: [{ video: mp4(Math.round(8.5 * 1024 * 1024)), caption: 'Video quá nặng' }] } });
    check('video vượt trần bị từ chối', to.status === 400, `${to.status}`);
    check('lời từ chối nói bằng tiếng cô hiểu, có nhắc quay ngắn lại',
      /(nặng|dài|ngắn)/i.test((to.data || {}).error || ''), (to.data || {}).error);

    // VƯỢT LUÔN CẢ THÂN YÊU CẦU CỦA MÁY CHỦ.
    //
    // Màn hình đã chặn trước nên cô thật không tới đây, nhưng máy chủ vẫn phải
    // trả lời tử tế: bản đầu trả "Lỗi máy chủ" — một câu không cho ai biết
    // phải làm gì, và cũng không nói được rằng vấn đề là dung lượng.
    const qua = await req('POST', `/api/albums/${globalThis.AL}/photos`, { cookie: co.cookie, body: {
      photos: [{ video: mp4(20 * 1024 * 1024), caption: 'Vượt cả thân yêu cầu' }] } });
    check('tệp vượt cả thân yêu cầu vẫn được trả lời tử tế, không phải "Lỗi máy chủ"',
      qua.status === 413 && /(nặng|dung lượng|ngắn)/i.test((qua.data || {}).error || ''),
      `${qua.status} ${JSON.stringify(qua.data)}`);

    // Khai là video nhưng byte bên trong là ảnh PNG → phải trượt.
    const gia = await req('POST', `/api/albums/${globalThis.AL}/photos`, { cookie: co.cookie, body: {
      photos: [{ video: ANH.replace('data:image/png', 'data:video/mp4') }] } });
    check('tệp khai là video mà byte bên trong không phải video → từ chối',
      gia.status === 400, `${gia.status}`);

    const rong = await req('POST', `/api/albums/${globalThis.AL}/photos`, { cookie: co.cookie, body: {
      photos: [{ video: 'data:video/mp4;base64,' }] } });
    check('chuỗi rỗng cũng bị từ chối', rong.status === 400, `${rong.status}`);
  }

  // =========================================================================
  console.log('\n[3] Video đi qua ĐÚNG luật đồng ý như ảnh — không có đường riêng');
  {
    // Gắn video cho một bé, rồi rút đồng ý chia sẻ của bé đó.
    const gan = await req('PUT', `/api/albums/${globalThis.AL}/photos/${globalThis.VID}/be`,
      { cookie: co.cookie, body: { studentIds: ['s3'] } });
    check('đối chứng — gắn được thẻ bé vào video, y như với ảnh',
      gan.status === 200, `${gan.status} ${JSON.stringify(gan.data).slice(0, 120)}`);

    // BẬT ĐỒNG Ý CHIA SẺ CHO BÉ ĐÓ TRƯỚC, để phép so hai chiều có nghĩa.
    //
    // Dữ liệu mẫu có bé đã từ chối chia sẻ, nên nếu không đặt tường minh thì
    // "trước" và "sau" đều ẩn — và bài canh xanh vì lý do sai.
    const bat = await req('PUT', '/api/admin/students/s3/dong-y', { cookie: qt.cookie, body: {
      chiaSeGiaDinh: true } });
    check('đối chứng — bật được đồng ý chia sẻ của bé s3',
      bat.status === 200, `${bat.status} ${JSON.stringify(bat.data).slice(0, 120)}`);

    const truoc = await req('GET', `/api/albums/${globalThis.AL}`, { cookie: ph.cookie });
    const thayTruoc = ((truoc.data.photos || truoc.data.album?.photos) || [])
      .some(x => x.id === globalThis.VID);
    check('đối chứng — trước khi rút đồng ý, gia đình khác XEM ĐƯỢC video',
      thayTruoc, JSON.stringify(truoc.data).slice(0, 160));

    const rut = await req('PUT', '/api/admin/students/s3/dong-y', { cookie: qt.cookie, body: {
      chiaSeGiaDinh: false } });
    check('đối chứng — rút được đồng ý chia sẻ của bé s3',
      rut.status === 200, `${rut.status} ${JSON.stringify(rut.data).slice(0, 120)}`);

    const sau = await req('GET', `/api/albums/${globalThis.AL}`, { cookie: ph.cookie });
    const thaySau = ((sau.data.photos || sau.data.album?.photos) || [])
      .some(x => x.id === globalThis.VID);
    check('VIDEO BIẾN MẤT KHỎI MÀN HÌNH GIA ĐÌNH KHÁC, y hệt một tấm ảnh',
      !thaySau, JSON.stringify(sau.data).slice(0, 200));

    // Cô vẫn thấy — lọc là lọc cho gia đình, không phải xoá.
    const coXem = await req('GET', `/api/albums/${globalThis.AL}`, { cookie: co.cookie });
    check('cô vẫn thấy video của nhóm mình — lọc chứ không xoá',
      ((coXem.data.photos || coXem.data.album?.photos) || []).some(x => x.id === globalThis.VID),
      JSON.stringify(coXem.data).slice(0, 160));
  }

  // =========================================================================
  console.log('\n[4] Xoá video thì tệp cũng biến khỏi kho');
  {
    const xoa = await req('DELETE', `/api/albums/${globalThis.AL}/photos/${globalThis.VID}`,
      { cookie: co.cookie });
    check('cô xoá được video', xoa.status === 200, `${xoa.status}`);
    check('tệp video không còn trong kho',
      !fs.existsSync(path.join(DIR, 'uploads', globalThis.VFILE)), globalThis.VFILE);
  }

  // =========================================================================
  console.log('\n[5] Trần dung lượng ghi ở ĐÚNG MỘT CHỖ, và có nói ra con số');
  {
    const up = fs.readFileSync(path.join(GOC, 'lib/uploads.js'), 'utf8');
    const so = (up.match(/MAX_VIDEO_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/) || [])[1];
    check('có một trần riêng cho video, khai bằng số MB đọc được', !!so, so);
    check('trần không quá 50 MB — video quay điện thoại vượt xa con số đó rất nhanh',
      Number(so) > 0 && Number(so) <= 50, so);
    check('và chú thích nói ra hệ quả về dung lượng ổ đĩa',
      /GB|ổ đĩa|sao lưu/i.test(up.slice(Math.max(0, up.indexOf('MAX_VIDEO_BYTES') - 900),
        up.indexOf('MAX_VIDEO_BYTES'))),
      'chưa có chú thích về dung lượng');
  }
} finally {
  await dung();
  donThuMucTam(DIR);
}

tongKet('Video trong album');
