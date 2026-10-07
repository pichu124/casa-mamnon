#!/usr/bin/env python3
# Đối chiếu ba chiều cho mọi kịch bản: file Excel thật ↔ bản tham chiếu JS ↔ bản tham chiếu Python,
# theo luật so sánh ở cuối DAC-TA.md (bản 3).
#
#   python3 so_sanh.py [thư-mục-kịch-bản ...] [--chi=<tiền tố>]
#
# In mọi chỗ lệch. Mã thoát 1 nếu có lệch. Kết quả đầy đủ ghi vào verify/bao-cao-so-sanh.json
# (nếu có thư mục verify/) hoặc vào tệp mà biến môi trường BAO_CAO chỉ tới.
import sys, os, json, subprocess, glob
from concurrent.futures import ThreadPoolExecutor

DAY = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DAY)
import chay_kich_ban

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')] or [os.path.join(DAY, 'verify', 'scenarios')]
# "ky_vong" trong kịch bản là số tính tay theo đặc tả BẢN 2 — chỉ so khi gọi --ky-vong.
KY_VONG = '--ky-vong' in sys.argv
CHI = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--chi=')), '')
# Trong kho mã hai bản tham chiếu nằm ở tham-chieu/; ở thư mục làm việc lúc dựng thì ở verify/ref-*.
_TC = os.path.join(DAY, 'tham-chieu')
REFS = {
    'js': ['node', os.path.join(_TC, 'tinh.mjs') if os.path.isdir(_TC) else os.path.join(DAY, 'verify', 'ref-js', 'tinh.mjs')],
    'py': [sys.executable, os.path.join(_TC, 'tinh.py') if os.path.isdir(_TC) else os.path.join(DAY, 'verify', 'ref-py', 'tinh.py')],
}
REFS = {k: v for k, v in REFS.items() if os.path.exists(v[-1])}
THANG_EXACT = ('thang', 'trong_ky', 'moc', 'hoc_phi', 'phai_thu')
THANG_FLOAT = ('pt_thuong', 'pt_thuong_tran', 'pt_tong')
BE_EXACT = ('den_ky', 'chu_ky', 'ky_tu', 'ky_den', 'phai_thu_ky')


def ref(name, path):
    r = subprocess.run(REFS[name] + [path], capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        return {'__loi__': r.stderr[-800:]}
    try:
        return json.loads(r.stdout)
    except Exception as e:
        return {'__loi__': f'không đọc được JSON: {e}: {r.stdout[:300]}'}


def bang(a, b, f):
    if f in THANG_FLOAT:
        try:
            return abs(float(a) - float(b)) <= 1e-9
        except (TypeError, ValueError):
            return a == b
    if f == 'trong_ky' or f == 'den_ky':
        return bool(a) == bool(b)
    if f == 'ap':
        return sorted(str(x).casefold() for x in (a or [])) == sorted(str(x).casefold() for x in (b or []))
    if f == 'chu_ky':
        return str(a).casefold() == str(b).casefold()
    return a == b


def so_mot_be(ma, ex_, v, ten):
    lech = []
    if bool(ex_.get('tinh_duoc')) != bool(v.get('tinh_duoc')):
        lech.append(f'  {ma}: tinh_duoc excel={ex_.get("tinh_duoc")} {ten}={v.get("tinh_duoc")}'
                    f'   | excel lỗi: {"; ".join(ex_.get("loi", []))[:200]} | {ten} lỗi: {"; ".join(map(str, v.get("loi", [])))[:200]}')
        return lech
    if not ex_.get('tinh_duoc'):
        return lech
    for f in BE_EXACT:
        if not bang(ex_.get(f), v.get(f), f):
            lech.append(f'  {ma}: {f} excel={ex_.get(f)} {ten}={v.get(f)}')
    th_e, th_v = ex_.get('thang') or [], v.get('thang') or []
    if len(th_e) != len(th_v):
        lech.append(f'  {ma}: số tháng của kỳ excel={len(th_e)} {ten}={len(th_v)}')
    for t, u in zip(th_e, th_v):
        for f in THANG_EXACT + THANG_FLOAT + ('ap',):
            if not bang(t.get(f), u.get(f), f):
                lech.append(f'  {ma} {t.get("thang")}: {f} excel={t.get(f)} {ten}={u.get(f)}')
    return lech


def doi_chieu(path):
    kb = json.load(open(path, encoding='utf-8'))
    kq = {'excel': chay_kich_ban.chay(path)}
    with ThreadPoolExecutor(2) as ex:
        fut = {n: ex.submit(ref, n, path) for n in REFS}
        for n, f in fut.items():
            kq[n] = f.result()
    lech = []
    for n in REFS:
        if '__loi__' in kq[n]:
            lech.append(f'  [{n}] LỖI CHẠY: {kq[n]["__loi__"]}')
    ky_vong = kb.get('ky_vong', {}) or {}
    ma_ds = []
    for b in kb.get('be', []):
        m = b.get('ma')
        if m is None or m == '':
            continue
        if str(m) not in ma_ds:
            ma_ds.append(str(m))
    for ma in ma_ds:
        ex_ = kq['excel'].get(ma)
        if ex_ is None:
            lech.append(f'  {ma}: [excel] thiếu bé')
            continue
        for n in REFS:
            if '__loi__' in kq[n]:
                continue
            v = kq[n].get(ma)
            if v is None:
                lech.append(f'  {ma}: [{n}] thiếu bé')
                continue
            lech += so_mot_be(ma, ex_, v, n)
        kv = ky_vong.get(ma) if KY_VONG else None
        if kv:
            for f in ('tinh_duoc', 'phai_thu_ky', 'ky_tu'):
                if f in kv and kv[f] != ex_.get(f):
                    lech.append(f'  {ma}: {f} excel={ex_.get(f)} TÍNH TAY={kv[f]}')
    return kq, lech


if __name__ == '__main__':
    tong = 0
    files = sorted(f for d in ARGS for f in glob.glob(os.path.join(d, '*.json')) if os.path.basename(f).startswith(CHI))
    bao_cao = {}
    print('Bản tham chiếu:', ', '.join(REFS) or '(chưa có)')
    for f in files:
        try:
            kq, lech = doi_chieu(f)
        except SystemExit as e:
            kq, lech = {}, [f'  LỖI: {e}']
        except Exception as e:
            kq, lech = {}, [f'  LỖI: {type(e).__name__}: {e}']
        so_be = len(json.load(open(f, encoding='utf-8')).get('be', []))
        print(f'{"LỆCH" if lech else "KHỚP"}  {os.path.basename(f)}  ({so_be} bé)', flush=True)
        for l in lech[:60]:
            print(l)
        if len(lech) > 60:
            print(f'  … còn {len(lech) - 60} dòng lệch')
        tong += len(lech)
        bao_cao[os.path.basename(f)] = {'lech': lech, 'kq': kq}
    ra = os.environ.get('BAO_CAO') or os.path.join(DAY, 'verify', 'bao-cao-so-sanh.json')
    if os.path.isdir(os.path.dirname(ra)):
        json.dump(bao_cao, open(ra, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
    print(f'\nTổng: {len(files)} kịch bản, {tong} chỗ lệch')
    sys.exit(1 if tong else 0)
