#!/usr/bin/env node
// Chuẩn bị cấu hình cho app Android/iOS.
//
// App native là một vỏ WebView nạp thẳng giao diện từ máy chủ SchoolConnect.
// Cách này giữ nguyên toàn bộ cơ chế đăng nhập bằng cookie và service worker,
// nên app hoạt động y hệt khi mở bằng trình duyệt — không cần sửa gì ở máy chủ.
//
// Dùng:
//   node scripts/prepare-mobile.js https://truong-cua-ban.onrender.com
//   npm run mobile:prepare -- http://192.168.1.15:3000     (thử trong mạng nội bộ)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'capacitor.config.json');

const input = process.argv[2] || process.env.SERVER_URL;

if (!input) {
  console.error(`
Thiếu địa chỉ máy chủ.

  node scripts/prepare-mobile.js <địa chỉ máy chủ>

Ví dụ:
  node scripts/prepare-mobile.js https://truong-anh-duong.onrender.com
  node scripts/prepare-mobile.js http://192.168.1.15:3000

Địa chỉ này là nơi app sẽ tải dữ liệu về. Máy chủ phải đang chạy và điện thoại
phải truy cập được (cùng Wi-Fi nếu dùng địa chỉ nội bộ 192.168.x.x).
`);
  process.exit(1);
}

let url;
try {
  url = new URL(input);
} catch (_) {
  console.error(`Địa chỉ không hợp lệ: ${input}\nPhải bắt đầu bằng http:// hoặc https://`);
  process.exit(1);
}
if (url.protocol !== 'http:' && url.protocol !== 'https:') {
  console.error('Địa chỉ phải bắt đầu bằng http:// hoặc https://');
  process.exit(1);
}

const isPlainHttp = url.protocol === 'http:';
const serverUrl = url.origin;

const config = {
  appId: 'vn.edu.schoolconnect.app',
  appName: 'SchoolConnect',
  webDir: 'public',
  server: {
    url: serverUrl,
    // Android chặn kết nối http thường; chỉ mở khi dùng địa chỉ nội bộ để thử.
    cleartext: isPlainHttp,
  },
  android: {
    allowMixedContent: isPlainHttp,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#4f46e5',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
  },
};

fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');

// Android 9 trở lên chặn kết nối http không mã hóa. Khi thử qua mạng nội bộ thì
// phải mở cờ này, còn khi phát hành bằng https thì gỡ đi cho an toàn.
function patchAndroidManifest(allowCleartext) {
  const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) return null;

  let xml = fs.readFileSync(manifestPath, 'utf8');
  const has = /android:usesCleartextTraffic="[^"]*"/.test(xml);

  if (allowCleartext) {
    xml = has
      ? xml.replace(/android:usesCleartextTraffic="[^"]*"/, 'android:usesCleartextTraffic="true"')
      : xml.replace(/<application\n(\s*)/, '<application\n$1android:usesCleartextTraffic="true"\n$1');
  } else if (has) {
    xml = xml.replace(/\s*android:usesCleartextTraffic="[^"]*"/, '');
  } else {
    return false;
  }

  fs.writeFileSync(manifestPath, xml);
  return true;
}

const patched = patchAndroidManifest(isPlainHttp);

console.log(`Đã ghi capacitor.config.json — app sẽ kết nối tới: ${serverUrl}`);
if (patched === null) {
  console.log('(Chưa có thư mục android/ — chạy "npx cap add android" nếu cần tạo mới.)');
} else if (patched) {
  console.log(isPlainHttp
    ? 'Đã bật cho phép kết nối http trong AndroidManifest.xml'
    : 'Đã gỡ cho phép kết nối http khỏi AndroidManifest.xml (chỉ dùng https)');
}
if (isPlainHttp) {
  console.log(
    '\n⚠️  Đang dùng http:// (không mã hóa). Chỉ nên dùng để thử trong mạng nội bộ.\n' +
    '   Khi phát hành thật cho phụ huynh, hãy dùng địa chỉ https:// .'
  );
}
console.log('\nBước tiếp theo:\n  npx cap sync android\n  npx cap open android');
