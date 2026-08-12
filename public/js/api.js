// Gọi API JSON. Mọi hàm ném Error(message) khi thất bại; 401 sẽ đưa về màn đăng nhập.
window.API = (() => {
  async function request(method, path, body) {
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
      throw new Error('Không có kết nối mạng. Vui lòng kiểm tra lại đường truyền.');
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* không phải JSON */ }
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      App.onUnauthorized();
      throw new Error('Phiên đăng nhập đã hết hạn');
    }
    if (!res.ok) throw new Error((data && data.error) || `Lỗi ${res.status}`);
    return data;
  }
  return {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b || {}),
    put: (p, b) => request('PUT', p, b || {}),
    del: (p) => request('DELETE', p),
  };
})();
