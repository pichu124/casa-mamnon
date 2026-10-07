#!/usr/bin/env python3
# Chạy MỘT kịch bản kiểm thử qua file Excel thật và in kết quả theo định dạng ở DAC-TA.md (bản 3).
#
#   python3 chay_kich_ban.py kich-ban.json [ket-qua.json]
#
# Sinh file từ tao_file.py với dữ liệu của kịch bản, cho LibreOffice tính lại toàn bộ công
# thức (tinh_lai.py), rồi đọc trang Danh sách bé và trang Tính theo tháng. Không bước nào
# tính thay file Excel.
import sys, json, os, subprocess, tempfile
from openpyxl import load_workbook

DAY = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DAY)
from tinh_lai import tinh_lai


def thang(v):
    return v.strftime('%Y-%m') if hasattr(v, 'strftime') else None


def chay(kb_path, giu=None):
    with tempfile.TemporaryDirectory() as tmp:
        x = giu or os.path.join(tmp, 'kb.xlsx')
        kb = json.load(open(kb_path, encoding='utf-8'))
        # Sức chứa vừa đủ cho kịch bản: công thức y hệt bản 300 bé, chỉ vùng ngắn hơn — chạy nhanh hơn nhiều.
        nb = max(10, len(kb.get('be', [])) + 2)
        nu = max(nb * 5, len(kb.get('uu_dai', [])) + 5)
        tuy_chon = [] if os.environ.get('SUC_CHUA_DAY') else [f'--suc-chua={nb}', f'--suc-chua-ud={nu}']
        subprocess.run([sys.executable, os.path.join(DAY, 'tao_file.py'), x, f'--kich-ban={kb_path}'] + tuy_chon,
                       check=True, capture_output=True)
        loi = tinh_lai(x)
        if loi:
            raise SystemExit(f'File Excel có ô lỗi sau khi tính: {loi[:20]}')
        wb = load_workbook(x, data_only=True)
        be = wb['Danh sách bé']
        hb = {c.value: c.column - 1 for c in be[3]}
        tt = wb['Tính theo tháng']
        ht = {c.value: c.column - 1 for c in tt[4]}
        thang_cua = {}
        for row in tt.iter_rows(min_row=5, values_only=True):
            if row[ht['Tính được (1/0)']] != 1 or row[ht['Trong kỳ thu (1/0)']] != 1:
                continue
            thang_cua.setdefault(row[ht['Bé số']], []).append({
                'thang': thang(row[ht['Tháng']]), 'trong_ky': row[ht['Trong kỳ thu (1/0)']] == 1,
                'moc': row[ht['Mốc']], 'hoc_phi': int(round(row[ht['Học phí gốc tháng']] or 0)),
                'pt_thuong': row[ht['% thường (lũy tiến)']], 'pt_thuong_tran': row[ht['% thường sau trần mốc']],
                'pt_tong': row[ht['% giảm tổng']], 'phai_thu': int(round(row[ht['Phải thu tháng (đồng)']] or 0)),
                'ap': [s for s in str(row[ht['Mã ưu đãi được áp']] or '').split(',') if s],
                'ghi_chu': row[ht['Ghi chú']] or ''})
        out = {}
        for idx, row in enumerate(be.iter_rows(min_row=4, values_only=True), 1):
            ma = row[hb['Mã bé']]
            if ma is None or ma == '':
                continue
            k = str(ma)
            if k in out:
                continue
            tinh = row[hb['tính được']] == 1
            den = row[hb['đến kỳ']] == 1
            th = thang_cua.get(idx, []) if (tinh and den) else []
            out[k] = {
                'tinh_duoc': tinh, 'den_ky': den, 'chu_ky': row[hb['Chu kỳ đang tính']],
                'ky_tu': thang(row[hb['Kỳ từ tháng']]), 'ky_den': thang(row[hb['Kỳ đến tháng']]),
                'thang': th,
                'phai_thu_ky': sum(t['phai_thu'] for t in th if t['trong_ky']) if tinh else None,
                'loi': [s for s in str(row[hb['LỖI — phải sửa']] or '').split('. ') if s.strip()],
                'luu_y': [s for s in str(row[hb['Lưu ý']] or '').split('. ') if s.strip()],
            }
        return out


if __name__ == '__main__':
    kq = chay(os.path.abspath(sys.argv[1]))
    s = json.dumps(kq, ensure_ascii=False, indent=1)
    if len(sys.argv) > 2:
        open(sys.argv[2], 'w', encoding='utf-8').write(s)
    else:
        print(s)
