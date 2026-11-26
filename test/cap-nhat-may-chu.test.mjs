// scripts/cap-nhat-may-chu.sh (Đ261g): cập nhật có đường lui.
//
// Chạy bằng:  node test/cap-nhat-may-chu.test.mjs      (chỉ Linux/Mac: cần bash và git)
//
// Dựng một "máy chủ" giả trong thư mục tạm: một kho origin, một bản cài ở
// MA_NGUON, và các lệnh giả đặt trước PATH — sudo, systemctl, curl, npm,
// journalctl. curl giả trả {"ok":true} trừ khi bản mã đang cài có tệp HONG,
// tức "bản mới không khởi động được". Bài canh ĐÚNG những lời script hứa: hỏng ở
// bước nào thì mã và thư viện đang chạy còn nguyên ở bước đó.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { thuMucTam, donThuMucTam, taoBoDem } from './_chung.mjs';
import { fileURLToPath } from 'url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(GOC, 'scripts', 'cap-nhat-may-chu.sh');
const { check, tongKet } = taoBoDem();

if (process.platform === 'win32') {
  console.log('Bỏ qua trên Windows: script chạy trên máy chủ Linux.');
  process.exit(0);
}

const T = thuMucTam('cap-nhat-may-chu');
const ORIGIN = path.join(T, 'origin.git');
const DEV = path.join(T, 'dev');
const MA = path.join(T, 'ma');
const DATA = path.join(T, 'data');
const STUB = path.join(T, 'stub');
const LOG = path.join(T, 'log');
fs.mkdirSync(STUB, { recursive: true });
fs.mkdirSync(LOG, { recursive: true });
fs.mkdirSync(path.join(DATA, 'backups'), { recursive: true });

const g = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const viet = (p, s, mode) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, mode ? { mode } : undefined); };

// ---- lệnh giả ----
viet(path.join(STUB, 'sudo'), '#!/bin/sh\nexec "$@"\n', 0o755);
viet(path.join(STUB, 'systemctl'), `#!/bin/sh\necho "$*" >> ${LOG}/systemctl\n`, 0o755);
viet(path.join(STUB, 'journalctl'), '#!/bin/sh\necho "(nhật ký giả)"\n', 0o755);
viet(path.join(STUB, 'curl'), `#!/bin/sh
case "$*" in *healthz*) ;; *) exit 0 ;; esac
[ -e "$MA_NGUON/HONG" ] && exit 22
echo '{"ok":true}'
`, 0o755);
// npm giả: ghi lại thư mục nó chạy và package.json nó thấy; "cài" một gói theo
// tên ghi trong package-lock.json; có tệp npm-hong thì hỏng như mất mạng.
viet(path.join(STUB, 'npm'), `#!/bin/sh
echo "$PWD $*" >> ${LOG}/npm
cp package.json ${LOG}/npm-package.json
[ -e ${T}/npm-hong ] && { echo "network error" >&2; exit 1; }
mkdir -p node_modules && cp package-lock.json node_modules/da-cai.txt
`, 0o755);

// ---- kho origin + bản cài ----
fs.mkdirSync(DEV);
g(T, 'init', '-q', '--bare', '-b', 'main', ORIGIN);
g(DEV, 'init', '-q', '-b', 'main');
g(DEV, 'config', 'user.email', 't@t'); g(DEV, 'config', 'user.name', 't');
viet(path.join(DEV, 'package.json'), JSON.stringify({ name: 'x', scripts: { prepare: 'node scripts/cai-hook.js' }, dependencies: { a: '1' } }));
viet(path.join(DEV, 'package-lock.json'), 'khoa-1');
viet(path.join(DEV, 'scripts', 'backup.js'), `const fs=require('fs'),p=require('path');
if (fs.existsSync(p.join(process.env.DATA_DIR,'backup-hong'))) { console.error('hỏng'); process.exit(1); }
fs.writeFileSync(p.join(process.env.DATA_DIR,'backups','school-20261126-0300.db.gz'),'x');
fs.appendFileSync('${LOG}/backup','1\\n');`);
viet(path.join(DEV, 'scripts', 'canh-may.js'), `require('fs').appendFileSync('${LOG}/bao', process.argv.slice(2).join(' ')+'\\n');`);
viet(path.join(DEV, '.gitignore'), 'node_modules/\n');
g(DEV, 'add', '-A'); g(DEV, 'commit', '-q', '-m', 'v1');
g(DEV, 'remote', 'add', 'origin', ORIGIN); g(DEV, 'push', '-q', 'origin', 'main');
g(T, 'clone', '-q', ORIGIN, MA);
viet(path.join(MA, 'node_modules', 'da-cai.txt'), 'khoa-1');

function dayMoi(thayDoi, tin) {
  for (const [tep, noiDung] of Object.entries(thayDoi)) {
    if (noiDung === null) fs.rmSync(path.join(DEV, tep));
    else viet(path.join(DEV, tep), noiDung);
  }
  g(DEV, 'add', '-A'); g(DEV, 'commit', '-q', '-m', tin); g(DEV, 'push', '-q', 'origin', 'main');
  return g(DEV, 'rev-parse', 'HEAD');
}
function chay() {
  for (const f of ['systemctl', 'npm', 'backup', 'bao']) fs.rmSync(path.join(LOG, f), { force: true });
  const r = spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    env: {
      PATH: `${STUB}:${process.env.PATH}`, HOME: T, MA_NGUON: MA, DATA_DIR: DATA,
      CANH_ENV: path.join(T, 'khong-co.env'), CHO_GIAY: '2',
    },
  });
  return { ma: r.status, out: `${r.stdout}${r.stderr}` };
}
const doc = (f) => { try { return fs.readFileSync(path.join(LOG, f), 'utf8'); } catch { return ''; } };
const soLan = (f, chu) => doc(f).split('\n').filter(l => l.includes(chu)).length;
const head = () => g(MA, 'rev-parse', 'HEAD');
const thuVien = () => fs.readFileSync(path.join(MA, 'node_modules', 'da-cai.txt'), 'utf8');
const v1 = head();

console.log('\n[1] Không có gì mới');
let r = chay();
check('thoát 0, báo đã là bản mới nhất, không khởi động lại', r.ma === 0 && r.out.includes('Đã là bản mới nhất') && !doc('systemctl'), r.out);
check('vẫn sao lưu trước khi hỏi mã mới', soLan('backup', '1') === 1);

console.log('\n[2] Kho mã có sửa tay');
fs.appendFileSync(path.join(MA, 'package-lock.json'), 'sua-tay');
r = chay();
check('dừng, mã 1, nói rõ có sửa tay', r.ma === 1 && r.out.includes('sửa tay'), r.out);
check('chưa sao lưu, chưa khởi động lại', !doc('backup') && !doc('systemctl'));
g(MA, 'checkout', '-q', '--', 'package-lock.json');

console.log('\n[3] Sao lưu hỏng');
const v2 = dayMoi({ 'a.txt': 'moi' }, 'v2');
viet(path.join(DATA, 'backup-hong'), '');
r = chay();
check('dừng, mã 1, mã vẫn bản cũ, không khởi động lại', r.ma === 1 && r.out.includes('Sao lưu hỏng') && head() === v1 && !doc('systemctl'), r.out);
fs.rmSync(path.join(DATA, 'backup-hong'));

console.log('\n[4] Bản mới, thư viện không đổi');
r = chay();
check('thoát 0, mã lên bản mới', r.ma === 0 && head() === v2, r.out);
check('khởi động lại đúng hai lần', soLan('systemctl', 'restart casa-mamnon') === 2, doc('systemctl'));
check('không chạy npm', !doc('npm'));
check('in bản sao trước cập nhật', r.out.includes('school-20261126-0300.db.gz'));

console.log('\n[5] Thư viện đổi, cài vào thư mục tạm rồi đổi chỗ');
const v3 = dayMoi({ 'package-lock.json': 'khoa-3' }, 'v3');
r = chay();
check('thoát 0, mã lên bản mới', r.ma === 0 && head() === v3, r.out);
const dongNpm = doc('npm');
check('npm ci chạy trong thư mục tạm, không trong MA_NGUON', dongNpm.includes('/.cai-thu-vien.') && dongNpm.includes('ci --omit=dev'), dongNpm);
check('package.json ở thư mục tạm đã bỏ mục scripts (prepare)', !('scripts' in JSON.parse(doc('npm-package.json'))));
check('node_modules mới đang dùng, bản cũ giữ ở node_modules.truoc-cap-nhat',
  thuVien() === 'khoa-3' && fs.readFileSync(path.join(MA, 'node_modules.truoc-cap-nhat', 'da-cai.txt'), 'utf8') === 'khoa-1');
check('không còn thư mục tạm', !fs.readdirSync(MA).some(f => f.startsWith('.cai-thu-vien.')));

console.log('\n[6] Cài thư viện hỏng giữa chừng (mất mạng)');
dayMoi({ 'package-lock.json': 'khoa-4' }, 'v4');
viet(path.join(T, 'npm-hong'), '');
r = chay();
check('dừng, mã 1, mã và node_modules đang chạy còn nguyên', r.ma === 1 && head() === v3 && thuVien() === 'khoa-3', r.out);
check('không khởi động lại, không để lại thư mục tạm', !doc('systemctl') && !fs.readdirSync(MA).some(f => f.startsWith('.cai-thu-vien.')));
fs.rmSync(path.join(T, 'npm-hong'));

console.log('\n[7] Bản mới không lên được → quay lui');
dayMoi({ HONG: 'x', 'package-lock.json': 'khoa-5' }, 'v5 hỏng');
r = chay();
check('mã 1, mã về bản trước, node_modules về bản trước', r.ma === 1 && head() === v3 && thuVien() === 'khoa-3', r.out);
check('đã khởi động lại bản cũ (lần thử bản mới + lần quay lui)', soLan('systemctl', 'restart casa-mamnon') === 2, doc('systemctl'));
check('báo người trực qua canh-may.js --gui, ghi HỎNG và bản sao', doc('bao').includes('--gui') && doc('bao').includes('HỎNG') && doc('bao').includes('school-20261126-0300.db.gz'), doc('bao'));
check('lời in ra nói bản cũ đã chạy lại', r.out.includes('bản cũ đã chạy lại'));

donThuMucTam(T);
tongKet();
