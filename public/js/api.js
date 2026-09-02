// Gọi API JSON. Mọi hàm ném Error(message) khi thất bại; 401 sẽ đưa về màn đăng nhập.
window.API = (() => {
  // MẤT MẠNG KHÁC HẲN HẾT PHIÊN — VÀ APP PHẢI PHÂN BIỆT ĐƯỢC HAI THỨ ĐÓ.
  //
  // Trước đây cả hai đều chỉ là một Error mang chữ, nên chỗ gọi không có cách
  // nào biết mình đang gặp cái nào. `App.init()` bắt lỗi rồi đưa thẳng về màn
  // đăng nhập, nên cô đứng ở sân trường sóng yếu mở app lên là gặp màn đăng
  // nhập trắng — mà màn đăng nhập cũng phải gọi máy chủ, nên cô không qua nổi.
  // Kể cả Ghi nhanh, thứ cả GĐ 0 dựng lên để hứa "mất mạng vẫn ghi được", cũng
  // không mở tới nơi.
  //
  // CHỈ THÊM, KHÔNG ĐỔI: chữ của lỗi giữ nguyên từng ký tự, nên mọi chỗ đang
  // bắt lỗi theo cách cũ chạy y như trước. Thêm một lá cờ `matMang` trên chính
  // đối tượng lỗi cho chỗ nào cần biết.
  function loiMatMang() {
    const e = new Error('Không có kết nối mạng. Vui lòng kiểm tra lại đường truyền.');
    e.matMang = true;
    return e;
  }

  async function request(method, path, body, goiNen) {
    let res;
    try {
      res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
      });
    } catch (_) {
      // Mất sóng giữa chừng (hay gặp khi dùng 4G trên điện thoại)
      throw loiMatMang();
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* không phải JSON */ }
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      // Lời gọi NỀN là lời gọi app tự phát sau lưng cô (hỏi huy hiệu định kỳ).
      // Hết phiên ở đó mà giật ngay về màn đăng nhập là xoá mất thứ cô đang gõ
      // dở — chỗ gọi tự quyết bằng cờ `hetPhien` thay vì bị quyết hộ.
      if (goiNen) {
        const e = new Error('Phiên đăng nhập đã hết hạn');
        e.hetPhien = true;
        throw e;
      }
      App.onUnauthorized();
      throw new Error('Phiên đăng nhập đã hết hạn');
    }
    if (!res.ok) {
      // 503 kèm đầu đề riêng là câu trả lời của CHÍNH MÁY NÀY (service worker
      // dựng ra khi không gọi được máy chủ), không phải của máy chủ trường.
      // `navigator.onLine` đứng làm lớp dự phòng cho máy đang giữ bản service
      // worker đời cũ, chưa biết gắn đầu đề đó.
      if (res.status === 503
        && (res.headers.get('X-CASA-Mat-Mang') === '1' || navigator.onLine === false)) {
        throw loiMatMang();
      }
      throw new Error((data && data.error) || `Lỗi ${res.status}`);
    }
    return data;
  }
  return {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b || {}),
    put: (p, b) => request('PUT', p, b || {}),
    del: (p) => request('DELETE', p),
    // Lỗi này là do mất mạng hay do máy chủ? Để chỗ gọi khỏi phải nhớ tên cờ.
    laMatMang: (err) => !!(err && err.matMang),
    // GET kiểu NỀN: hết phiên thì KHÔNG tự đưa về màn đăng nhập, chỉ ném lỗi
    // mang cờ `hetPhien` cho chỗ gọi tự xử. CHỈ THÊM — get/post/put/del giữ
    // nguyên hành vi cũ cho mọi chỗ đang dùng.
    getNen: (p) => request('GET', p, undefined, true),
    laHetPhien: (err) => !!(err && err.hetPhien),
  };
})();
