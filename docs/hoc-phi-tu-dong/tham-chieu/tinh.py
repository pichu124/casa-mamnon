#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bản tham chiếu ĐỘC LẬP cho DAC-TA bản 3.1 (tính học phí) — Python 3, chỉ thư viện chuẩn.

Bản 3.1 so với bản 3:
  - 7.2 cùng mã cùng tháng: trong các dòng đang hiệu lực ngày đầu tháng (tu ≤ đầu(m)) giữ dòng
    tu LỚN NHẤT (mới nhất); không dòng nào như vậy → dòng tu NHỎ NHẤT; bằng nhau → dòng nhập sau;
  - 6.1 ap_cho_chu_ky nhận viết tắt 1T/3T/"3 tháng"/6T/12T (hoa/thường) → đổi về tên chuẩn;
  - 10 bỏ lưu ý "6T/12T chưa ghi đã đóng đến"; định nghĩa lưu ý gia hạn mốc 1;
  - 1.2 (sửa sau): ngày hợp lệ nay từ 2000-01-01 tới 2100-12-31 (trước là từ 1900-01-01) — ở MỌI
    ô ngày (thang_ky, ngay_nhap_hoc, da_dong_den, ngay_nghi, thang_moc2, doi_goi_tu, ap_dung_tu,
    tu_ngay, den_ngay). tu trống vẫn là 01/01/1900 bên trong (6.3), den trống vẫn 31/12/9999.
  - 1.2 / 10 (sửa sau nữa): mã TỰ KHAI (be.ma, bieu_phi.ma, quyet_dinh.ma, danh_muc.ma) có dấu
    cách U+0020 ở đầu hoặc cuối là KHÔNG hợp lệ — hậu quả y như mã dạng số / toàn dấu cách (bé bị
    chặn; dòng biểu phí/QĐ/danh mục là dòng lỗi). Dấu cách ở giữa vẫn hợp lệ; tab/NBSP không tính.
    Chỗ tham chiếu (goi, goi_moi, ma_qd, ma_uu_dai, ma_be) KHÔNG xét quy tắc này. Dò trùng không
    đổi: "BE01" và "BE01 " là hai mã khác nhau.

Bản 3 so với bản 2 (đã theo đủ):
  - da_dong_den trống = bé chưa đóng tháng nào → N tính từ tháng nhập học (G22);
  - cùng mã ưu đãi cùng tháng: giữ dòng có tu NHỎ NHẤT (mức cũ thắng trong tháng đổi mức, G18)
    — bản 3.1 thay bằng quy tắc ở trên;
  - chỉ tính các tháng của kỳ (Lk ≤ 15; "thang" đúng Lk phần tử, [] khi chưa đến kỳ);
    cửa sổ ưu đãi = [đầu(N), cuối(E)];
  - đổi gói từ một tháng (goi_moi + doi_goi_tu);
  - chu kỳ nhận viết tắt 1T/3T/"3 tháng"/6T/12T; chu kỳ không trống mà sai = LỖI;
  - ngày hợp lệ 1900-01-01..2100-12-31 (bản 3.1 nâng cận dưới lên 2000-01-01);
    mã chỉ gồm dấu cách không hợp lệ;
  - so_thang_moc1 là số nguyên 1..120; dòng thiếu mã ở biểu phí/QĐ/danh mục → LƯU Ý TOÀN CỤC.

Dùng:   python3 tinh.py kich-ban.json
        → JSON kết quả (mỗi bé có mã không trống một khoá) ra stdout;
          lưu ý toàn cục ra stderr.

Viết thẳng theo từng mục của đặc tả; số mục ghi ở đầu mỗi khối.
"""
import datetime
import json
import math
import re
import sys
from collections import defaultdict
from decimal import Decimal, Context, ROUND_HALF_UP, ROUND_DOWN

# ---------------------------------------------------------------------------
# Hằng giá trị chọn (viết chuẩn). So sánh không phân biệt hoa/thường (mục 1.2).
# ---------------------------------------------------------------------------
HL_OPTS = ["Trùng ít nhất 1 ngày", "Phủ trọn cả tháng"]
CHON_OPTS = ["% lớn nhất trước", "Theo thứ tự nhập"]
LT_OPTS = ["Làm tròn thường", "Làm tròn xuống"]
CK_OPTS = ["1 tháng", "Quý", "6 tháng", "12 tháng"]
CK_LEN = {"1 tháng": 1, "Quý": 3, "6 tháng": 6, "12 tháng": 12}
# 3.1  Cách viết được nhận cho ô chu_ky của bé (không phân biệt hoa/thường, không bỏ khoảng trắng)
CK_ALIAS = {
    "1 tháng": "1 tháng", "1t": "1 tháng",
    "quý": "Quý", "3 tháng": "Quý", "3t": "Quý",
    "6 tháng": "6 tháng", "6t": "6 tháng",
    "12 tháng": "12 tháng", "12t": "12 tháng",
}
MAX_LK = 15                  # 3.3 / 10: sức chứa kỳ của file
LOAI_OPTS = ["Chung", "Theo chu kỳ", "Bổ sung"]
MOC_OPTS = ["Cả hai", "Mốc 1", "Mốc 2"]
# 6.1 (bản 3.1)  ap_cho_chu_ky: "Mọi chu kỳ", tên chuẩn, và cách viết tắt của mục 3.1
#                 (không phân biệt hoa/thường, không bỏ khoảng trắng) → tên chuẩn
APCK_ALIAS = dict(CK_ALIAS, **{"mọi chu kỳ": "Mọi chu kỳ"})

DATE_MIN = (1900, 1, 1)      # tu mặc định 01/01/1900 (6.3 — chỉ là mặc định, ô nhập phải ≥ 2000)
DATE_MAX = (9999, 12, 31)    # den mặc định 31/12/9999 (chỉ là mặc định — ô nhập phải ≤ 2100)
VALID_Y_MIN, VALID_Y_MAX = 2000, 2100   # 1.2 (bản 3.1): ngày hợp lệ 01/01/2000 … 31/12/2100


# ===========================================================================
# 1.2  Kiểu dữ liệu
# ===========================================================================
class _Invalid:
    """NaN / Infinity trong JSON: không phải số thật, không phải chữ."""
    def __repr__(self):
        return "<khong-hop-le>"


def _parse_constant(_name):
    return _Invalid()


def is_blank(v):
    """Trống = null, thiếu khoá (→ None qua .get), hoặc chuỗi rỗng."""
    return v is None or (isinstance(v, str) and v == "")


def as_number(v):
    """Số thật (JSON number, hữu hạn) → float; mọi thứ khác → None."""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    try:
        f = float(v)
    except (OverflowError, ValueError):
        return None
    return f if math.isfinite(f) else None


def is_whole(f):
    return f is not None and f == math.floor(f)


def _leap(y):
    return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)


def dim(y, m):
    if m == 2:
        return 29 if _leap(y) else 28
    return 30 if m in (4, 6, 9, 11) else 31


_DATE_RE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")


def as_date(v):
    """1.2: ngày thật dạng chuỗi "YYYY-MM-DD" từ 01/01/2000 tới 31/12/2100 → (y, m, d); khác → None.
    Mọi ô ngày đều kiểm qua hàm này (cận nằm trọn năm nên chỉ cần so năm)."""
    if not isinstance(v, str) or not _DATE_RE.fullmatch(v):
        return None
    y, m, d = int(v[0:4]), int(v[5:7]), int(v[8:10])
    if not (VALID_Y_MIN <= y <= VALID_Y_MAX) or not (1 <= m <= 12) or not (1 <= d <= dim(y, m)):
        return None
    return (y, m, d)


_DIGITS = re.compile(r"[0-9]+")


def code_state(v, tu_khai=False):
    """1.2: 'blank' | 'numeric' (mã dạng số) | 'spaces' (chỉ gồm dấu cách U+0020)
    | 'padded' (có dấu cách U+0020 ở đầu/cuối — CHỈ xét khi tu_khai=True)
    | 'invalid' (không phải chữ) | 'ok'.  Chỉ 'ok' là mã hợp lệ.

    tu_khai=True cho mã TỰ KHAI (bản 3.1, 1.2): be.ma, bieu_phi.ma, quyet_dinh.ma, danh_muc.ma.
    Chỗ THAM CHIẾU (be.goi, be.goi_moi, be.ma_qd, uu_dai.ma_uu_dai) gọi với tu_khai=False:
    dấu cách thừa ở đó không bị quy tắc này bắt — mã đơn giản không khớp (hoặc khớp đúng dòng
    tự khai cũng có dấu cách thừa, mà dòng đó đã là dòng lỗi)."""
    if is_blank(v):
        return "blank"
    if isinstance(v, str):
        core = v.strip(" ")          # chỉ U+0020, như TRIM của Excel (tab, NBSP không tính)
        if core == "":
            return "spaces"
        if _DIGITS.fullmatch(core):
            return "numeric"
        if tu_khai and core != v:    # bản 3.1: dấu cách ở đầu hoặc ở cuối; ở giữa vẫn hợp lệ
            return "padded"
        return "ok"
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return "numeric"
    return "invalid"


def ckey(v):
    """Khoá so mã không phân biệt hoa/thường; không bỏ khoảng trắng; không ký tự đại diện."""
    return v.lower() if isinstance(v, str) else None


def enum_val(v, options, default):
    """(giá trị chuẩn, hợp lệ?). Trống → mặc định."""
    if is_blank(v):
        return default, True
    if isinstance(v, str):
        lv = v.lower()
        for o in options:
            if lv == o.lower():
                return o, True
    return None, False


def apck_val(v):
    """6.1 bản 3.1: (tên chuẩn, hợp lệ?) cho ap_cho_chu_ky. Trống → "Mọi chu kỳ"."""
    if is_blank(v):
        return "Mọi chu kỳ", True
    if isinstance(v, str):
        c = APCK_ALIAS.get(v.lower())
        if c is not None:
            return c, True
    return None, False


def day_no(d):
    """Số ngày của (y, m, d) — số thứ tự ngày, luôn DƯƠNG (01/01/0001 = 1), tăng theo ngày.
    7.2 viết gọn chỉ đúng khi mọi số ngày đều dương (như số ngày Excel, 01/01/1900 = 1)."""
    return datetime.date(*d).toordinal()


def out_key(v):
    """Khoá kết quả = mã y như nhập (mã không phải chữ thì viết thành chữ)."""
    if isinstance(v, str):
        return v
    if isinstance(v, float) and math.isfinite(v) and v == math.floor(v) and abs(v) < 1e16:
        return str(int(v))
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
    try:
        return json.dumps(v, ensure_ascii=False)
    except (TypeError, ValueError):
        return repr(v)


# ===========================================================================
# 1.1  Tháng — chỉ số tháng nguyên: y*12 + (m-1).  Ngày = bộ (y, m, d).
# ===========================================================================
def mi_of(d):
    return d[0] * 12 + d[1] - 1


def dau(mi):
    return (mi // 12, mi % 12 + 1, 1)


def cuoi(mi):
    y, m = mi // 12, mi % 12 + 1
    return (y, m, dim(y, m))


def mstr(mi):
    return "%04d-%02d" % (mi // 12, mi % 12 + 1)


def month_no(mi):
    return mi % 12 + 1


# ===========================================================================
# 9  ROUND / ROUNDDOWN kiểu Excel: chụp về 15 chữ số có nghĩa, rồi làm tròn
#    nửa ra xa số 0 (ROUND) hoặc về phía 0 (ROUNDDOWN).
# ===========================================================================
_SNAP15 = Context(prec=15, rounding=ROUND_HALF_UP)
_WIDE = Context(prec=4000)


def _xl(x, n, mode):
    if x == 0:
        return 0.0
    d = _SNAP15.create_decimal(Decimal(x))
    if d.as_tuple().exponent >= -n:
        return float(d)
    return float(d.quantize(Decimal(1).scaleb(-n), rounding=mode, context=_WIDE))


def xl_round(x, n=0):
    return _xl(x, n, ROUND_HALF_UP)


def xl_rounddown(x, n=0):
    return _xl(x, n, ROUND_DOWN)


def num_out(x):
    """Số nguyên viết dạng int cho JSON gọn; còn lại giữ float."""
    if isinstance(x, float) and math.isfinite(x) and x == math.floor(x) and abs(x) < 2 ** 53:
        return int(x)
    return x


def _rows(sc, name):
    v = sc.get(name) if isinstance(sc, dict) else None
    if not isinstance(v, list):
        return []
    return [r if isinstance(r, dict) else {} for r in v]


def _has_data(r):
    return any(not is_blank(v) for v in r.values())


# ===========================================================================
# Chương trình chính
# ===========================================================================
def tinh(sc):
    gnotes = []          # lưu ý toàn cục
    gerr = []            # lỗi toàn cục (mục 2 / 10)

    # ------------------------------------------------------------------ 2
    cfg = sc.get("cau_hinh") if isinstance(sc, dict) else None
    if not isinstance(cfg, dict):
        cfg = {}
    THANG_THU = None
    tk = cfg.get("thang_ky")
    if is_blank(tk):
        gerr.append("Cấu hình: thiếu tháng thu (thang_ky)")
    else:
        d = as_date(tk)
        if d is None:
            gerr.append("Cấu hình: tháng thu (thang_ky) không phải ngày")
        else:
            THANG_THU = mi_of(d)
    HL, ok = enum_val(cfg.get("che_do_hieu_luc"), HL_OPTS, HL_OPTS[0])
    if not ok:
        gerr.append("Cấu hình: chế độ hiệu lực không hợp lệ")
    CHON, ok = enum_val(cfg.get("che_do_chon"), CHON_OPTS, CHON_OPTS[0])
    if not ok:
        gerr.append("Cấu hình: chế độ chọn ưu đãi không hợp lệ")
    LT, ok = enum_val(cfg.get("cach_lam_tron"), LT_OPTS, LT_OPTS[0])
    if not ok:
        gerr.append("Cấu hình: cách làm tròn không hợp lệ")
    dv_raw = cfg.get("don_vi_lam_tron")
    DV = 1000.0
    if not is_blank(dv_raw):
        f = as_number(dv_raw)
        if f is None or f < 1:
            gerr.append("Cấu hình: đơn vị làm tròn phải là số ≥ 1")
        else:
            DV = f

    # ------------------------------------------------------------------ 4
    fee_rows = defaultdict(list)     # khoá gói → [(tháng bắt đầu | None, học phí)]
    fee_bad = set()                  # khoá gói có dòng lỗi
    fee_seen = set()                 # mọi khoá gói xuất hiện (kể cả dòng lỗi)
    fee_starts = defaultdict(list)   # khoá gói → các tháng bắt đầu (kể cả None) để dò trùng
    for i, r in enumerate(_rows(sc, "bieu_phi")):
        c = r.get("ma")
        st = code_state(c, tu_khai=True)
        if st == "blank":
            if _has_data(r):   # 6.1: dòng có số liệu nhưng thiếu mã
                gnotes.append("Biểu phí dòng %d: dòng có số liệu nhưng thiếu mã — đang bị bỏ qua" % (i + 1))
            continue
        k = ckey(c)
        if st != "ok":         # 10: mã dạng số, toàn dấu cách, hoặc có dấu cách đầu/cuối → dòng lỗi
            gnotes.append("Biểu phí dòng %d: mã gói dạng số/toàn dấu cách/dấu cách đầu-cuối/không hợp lệ — dòng lỗi" % (i + 1))
            if k is not None:
                fee_seen.add(k)
                fee_bad.add(k)
            continue
        fee_seen.add(k)
        good = True
        hp = as_number(r.get("hoc_phi_thang"))
        if hp is None or hp < 0:
            good = False
        start = None
        a = r.get("ap_dung_tu")
        if not is_blank(a):
            d = as_date(a)
            if d is None:
                good = False
            else:
                start = mi_of(d)
        if good:
            fee_starts[k].append(start)
            fee_rows[k].append((start, hp))
        else:
            fee_bad.add(k)
            gnotes.append("Biểu phí dòng %d (%s): dòng lỗi" % (i + 1, c))
    for k, starts in fee_starts.items():
        if len(starts) != len(set(starts)):
            fee_bad.add(k)
            gnotes.append("Biểu phí: gói %s có hai dòng cùng tháng bắt đầu" % k)

    def hp_of(k, m):
        best = None
        for start, hp in fee_rows.get(k, ()):
            if start is None or start <= m:
                s = -1 if start is None else start
                if best is None or s > best[0]:
                    best = (s, hp)
        return None if best is None else best[1]

    # ------------------------------------------------------------------ 5
    qd_entries = defaultdict(list)
    for i, r in enumerate(_rows(sc, "quyet_dinh")):
        c = r.get("ma")
        st = code_state(c, tu_khai=True)
        if st == "blank":
            if _has_data(r):   # 6.1
                gnotes.append("QĐ dòng %d: dòng có số liệu nhưng thiếu mã — đang bị bỏ qua" % (i + 1))
            continue
        k = ckey(c)
        if st != "ok":         # 10: mã dạng số, toàn dấu cách, hoặc có dấu cách đầu/cuối → dòng lỗi
            gnotes.append("QĐ dòng %d: mã dạng số/toàn dấu cách/dấu cách đầu-cuối/không hợp lệ — dòng lỗi" % (i + 1))
            if k is not None:
                qd_entries[k].append(None)
            continue
        vals = {}
        good = True
        # 5: so_thang_moc1 nguyên 1..120; so_luong_* nguyên ≥ 0
        for fld, lo, hi in (("so_thang_moc1", 1, 120), ("so_luong_moc1", 0, None),
                            ("so_luong_moc2", 0, None)):
            f = as_number(r.get(fld))
            if f is None or not is_whole(f) or f < lo or (hi is not None and f > hi):
                good = False
            vals[fld] = f
        for fld in ("tran_moc1", "tran_moc2"):
            f = as_number(r.get(fld))
            if f is None or not (0 <= f <= 1):
                good = False
            vals[fld] = f
        qd_entries[k].append(vals if good else None)
    QD = {}
    for k, lst in qd_entries.items():
        QD[k] = lst[0] if (len(lst) == 1 and lst[0] is not None) else None

    # ------------------------------------------------------------------ 6.1
    cat_entries = defaultdict(list)
    for i, r in enumerate(_rows(sc, "danh_muc")):
        c = r.get("ma")
        st = code_state(c, tu_khai=True)
        if st == "blank":
            if _has_data(r):   # 6.1
                gnotes.append("Danh mục dòng %d: dòng có số liệu nhưng thiếu mã — đang bị bỏ qua" % (i + 1))
            continue
        k = ckey(c)
        if st != "ok":         # 10: mã dạng số, toàn dấu cách, hoặc có dấu cách đầu/cuối → mục lỗi
            gnotes.append("Danh mục dòng %d: mã dạng số/toàn dấu cách/dấu cách đầu-cuối/không hợp lệ — mục lỗi" % (i + 1))
            if k is not None:
                cat_entries[k].append(None)
            continue
        good = True
        loai, ok1 = enum_val(r.get("loai"), LOAI_OPTS, "Chung")
        moc, ok2 = enum_val(r.get("ap_cho_moc"), MOC_OPTS, "Cả hai")
        apck, ok3 = apck_val(r.get("ap_cho_chu_ky"))
        good = ok1 and ok2 and ok3
        p = None
        if not is_blank(r.get("phan_tram")):
            p = as_number(r.get("phan_tram"))
            if p is None or not (0 <= p <= 1):
                good = False
        tr = None
        if not is_blank(r.get("tran_rieng")):
            tr = as_number(r.get("tran_rieng"))
            if tr is None or not (0 <= tr <= 1):
                good = False
            elif good and loai != "Bổ sung":
                gnotes.append("Danh mục %s: trần riêng chỉ dùng cho loại Bổ sung — bị bỏ qua" % c)
        cat_entries[k].append({"loai": loai, "moc": moc, "apck": apck, "p": p, "tran": tr}
                              if good else None)
    CAT = {}
    for k, lst in cat_entries.items():
        CAT[k] = lst[0] if (len(lst) == 1 and lst[0] is not None) else None
        if len(lst) > 1:
            gnotes.append("Danh mục: mã ưu đãi %s bị trùng" % k)

    # ------------------------------------------------------------------ 3 (mã bé)
    be_rows = _rows(sc, "be")
    child_key_count = defaultdict(int)
    for b in be_rows:
        c = b.get("ma")
        if isinstance(c, str) and c != "":
            child_key_count[c.lower()] += 1

    # ------------------------------------------------------------------ 6.2
    ud_by_child = defaultdict(list)
    for i, r in enumerate(_rows(sc, "uu_dai")):
        mb, mu = r.get("ma_be"), r.get("ma_uu_dai")
        if is_blank(mb) and is_blank(mu):
            continue
        if is_blank(mb):
            gnotes.append("Ưu đãi dòng %d: dòng ưu đãi thiếu mã bé" % (i + 1))
            continue
        k = ckey(mb)
        if k is None or k not in child_key_count:
            gnotes.append("Ưu đãi dòng %d: mã bé %s không khớp bé nào" % (i + 1, out_key(mb)))
            continue
        ud_by_child[k].append(_prep_ud(i, r, CAT))

    # ------------------------------------------------------------------ từng bé
    out = {}
    for bi, b in enumerate(be_rows):
        c = b.get("ma")
        if is_blank(c):
            if _has_data(b):
                gnotes.append("Bé dòng %d: có dữ liệu nhưng thiếu mã bé — không có kết quả" % (bi + 1))
            continue
        res = _child(b, c, gerr, THANG_THU, HL, CHON, LT, DV, fee_rows, fee_bad, fee_seen,
                     hp_of, QD, CAT, child_key_count, ud_by_child)
        k = out_key(c)
        if k in out:     # hai bé mã giống hệt: một khoá, đã bị chặn vì trùng
            res["tinh_duoc"] = False
            res["phai_thu_ky"] = None
            res["thang"] = []
        out[k] = res
    return out, gnotes


# ---------------------------------------------------------------------------
# 6.2 / 6.3  Chuẩn hoá một dòng gán (lỗi của dòng xét cho MỌI dòng của bé)
# ---------------------------------------------------------------------------
def _prep_ud(idx, r, CAT):
    errs = []
    code = r.get("ma_uu_dai")
    st = code_state(code)
    item = None
    if st == "blank":
        errs.append("dòng ưu đãi %d thiếu mã ưu đãi" % (idx + 1))
    elif st != "ok":
        errs.append("dòng ưu đãi %d: mã ưu đãi dạng số/toàn dấu cách/không hợp lệ" % (idx + 1))
    else:
        k = code.lower()
        if k not in CAT:
            errs.append("dòng ưu đãi %d: mã %s không có trong danh mục" % (idx + 1, code))
        elif CAT[k] is None:
            errs.append("dòng ưu đãi %d: mục danh mục %s bị lỗi" % (idx + 1, code))
        else:
            item = CAT[k]
    # p
    p = None
    rp = r.get("phan_tram")
    if not is_blank(rp):
        f = as_number(rp)
        if f is None or not (0 <= f <= 1):
            errs.append("dòng ưu đãi %d: %% không phải số trong [0,1]" % (idx + 1))
        else:
            p = f
    elif item is not None:
        if item["p"] is None:
            errs.append("dòng ưu đãi %d: không có %% (cả dòng lẫn danh mục)" % (idx + 1))
        else:
            p = item["p"]
    # tu / den
    tu, den, dates_ok = DATE_MIN, DATE_MAX, True
    for fld in ("tu_ngay", "den_ngay"):
        v = r.get(fld)
        if not is_blank(v):
            d = as_date(v)
            if d is None:
                errs.append("dòng ưu đãi %d: %s không phải ngày" % (idx + 1, fld))
                dates_ok = False
            elif fld == "tu_ngay":
                tu = d
            else:
                den = d
    if dates_ok and tu > den:
        errs.append("dòng ưu đãi %d: từ ngày sau đến ngày" % (idx + 1))
    # tran_rieng dòng
    tr_row = None
    rt = r.get("tran_rieng")
    if not is_blank(rt):
        f = as_number(rt)
        if f is None or not (0 <= f <= 1):
            errs.append("dòng ưu đãi %d: trần riêng không phải số trong [0,1]" % (idx + 1))
        else:
            tr_row = f
    rieng = item is not None and item["loai"] == "Bổ sung"
    notes = []
    if tr_row is not None and item is not None and not rieng:
        # 6.1: trần riêng HỢP LỆ ở dòng gán không phải Bổ sung → bỏ qua, chỉ LƯU Ý
        notes.append("dòng ưu đãi %d (%s): trần riêng chỉ dùng cho loại Bổ sung — bị bỏ qua"
                     % (idx + 1, code))
    if tr_row is not None:
        tran = tr_row
    elif item is not None and item["tran"] is not None:
        tran = item["tran"]
    else:
        tran = 1.0
    return {
        "idx": idx, "code": code, "key": ckey(code), "p": p, "tu": tu, "den": den,
        "tran": tran, "rieng": rieng,
        "loai": item["loai"] if item else None,
        "moc": item["moc"] if item else None,
        "apck": item["apck"] if item else None,
        "errs": errs, "notes": notes,
    }


# ---------------------------------------------------------------------------
# 3 – 9  Một bé
# ---------------------------------------------------------------------------
def _pkg_check(v, label, fee_seen, fee_bad, loi):
    """Kiểm một mã gói của bé (goi / goi_moi). Trả khoá gói nếu dùng được, ngược lại None."""
    st = code_state(v)
    if st == "blank":
        loi.append("Chưa có %s" % label)
        return None
    if st != "ok":
        loi.append("%s: mã dạng số/toàn dấu cách/không hợp lệ" % label)
        return None
    k = v.lower()
    if k not in fee_seen:
        loi.append("%s %s không có trong biểu phí" % (label, v))
        return None
    if k in fee_bad:
        loi.append("%s %s có dòng biểu phí lỗi" % (label, v))
        return None
    return k


def _child(b, c, gerr, THANG_THU, HL, CHON, LT, DV, fee_rows, fee_bad, fee_seen, hp_of,
           QD, CAT, child_key_count, ud_by_child):
    loi = list(gerr)
    luu = []
    ck = None

    def blocked(extra=None):
        r = {"tinh_duoc": False, "den_ky": None, "chu_ky": ck, "ky_tu": None, "ky_den": None,
             "thang": [], "phai_thu_ky": None, "loi": loi, "luu_y": luu}
        if extra:
            r.update(extra)
        return r

    # ---------------------------------------------------------------- 3.1 chu kỳ áp dụng
    cgv = b.get("con_gv")
    is_gv = isinstance(cgv, str) and cgv.lower() == "có"
    ck_in = b.get("chu_ky")
    if is_blank(ck_in):
        ck = "Quý"
        luu.append("Chưa chọn chu kỳ — đang dùng mặc định Quý")
    else:
        ck = CK_ALIAS.get(ck_in.lower()) if isinstance(ck_in, str) else None
        if ck is None:
            loi.append("Chu kỳ %s không hợp lệ (nhận: 1 tháng/1T, Quý/3 tháng/3T, 6 tháng/6T, "
                       "12 tháng/12T)" % out_key(ck_in))
        elif ck == "1 tháng" and not is_gv:
            ck = "Quý"
            luu.append("1 tháng chỉ dành cho con/em giáo viên — đang tính theo Quý")

    # ---------------------------------------------------------------- 10 lỗi của bé
    st = code_state(c, tu_khai=True)
    if st == "numeric":
        loi.append("Mã bé dạng số")
    elif st == "spaces":
        loi.append("Mã bé chỉ gồm dấu cách")
    elif st == "padded":
        loi.append("Mã bé có dấu cách ở đầu/cuối")
    elif st == "invalid":
        loi.append("Mã bé không hợp lệ")
    elif child_key_count[c.lower()] > 1:
        loi.append("Mã bé trùng")

    # 4  gói, đổi gói
    gk = _pkg_check(b.get("goi"), "gói học phí", fee_seen, fee_bad, loi)
    gm_raw, dg_raw = b.get("goi_moi"), b.get("doi_goi_tu")
    gmk, DG = None, None
    if is_blank(gm_raw) != is_blank(dg_raw):
        loi.append("Đổi gói: phải ghi cả gói mới lẫn ngày đổi gói (hoặc bỏ trống cả hai)")
    if not is_blank(dg_raw):
        DG = as_date(dg_raw)
        if DG is None:
            loi.append("Ngày đổi gói không phải ngày hợp lệ")
    if not is_blank(gm_raw):
        gmk = _pkg_check(gm_raw, "gói mới", fee_seen, fee_bad, loi)

    nh = b.get("ngay_nhap_hoc")
    NH = None
    if is_blank(nh):
        loi.append("Thiếu ngày nhập học")
    else:
        NH = as_date(nh)
        if NH is None:
            loi.append("Ngày nhập học không phải ngày hợp lệ")

    mq = b.get("ma_qd")
    qst = code_state(mq)
    qd = None
    if qst == "blank":
        loi.append("Thiếu mã quyết định tuyển sinh")
    elif qst != "ok":
        loi.append("Mã QĐ dạng số/toàn dấu cách/không hợp lệ")
    else:
        qk = mq.lower()
        if qk not in QD:
            loi.append("QĐ %s không có" % mq)
        elif QD[qk] is None:
            loi.append("QĐ %s bị lỗi hoặc trùng mã" % mq)
        else:
            qd = QD[qk]

    opt_dates = {}
    for fld in ("thang_moc2", "da_dong_den", "ngay_nghi"):
        v = b.get(fld)
        opt_dates[fld] = None
        if not is_blank(v):
            d = as_date(v)
            if d is None:
                loi.append("%s không phải ngày hợp lệ" % fld)
            else:
                opt_dates[fld] = d

    slm2 = None
    v = b.get("so_luong_moc2")
    if not is_blank(v):
        f = as_number(v)
        if f is None or not is_whole(f) or f < 0:
            loi.append("Số lượng ưu đãi mốc 2 riêng không phải số nguyên ≥ 0")
        else:
            slm2 = f
    trm2 = None
    v = b.get("tran_moc2")
    if not is_blank(v):
        f = as_number(v)
        if f is None or not (0 <= f <= 1):
            loi.append("Trần mốc 2 riêng không phải số trong [0,1]")
        else:
            trm2 = f

    uds = ud_by_child.get(c.lower(), []) if isinstance(c, str) else []
    for u in uds:                      # 10: xét MỌI dòng của bé, kể cả ngoài cửa sổ
        loi.extend(u["errs"])
        luu.extend(u["notes"])

    if loi:
        return blocked()

    L = CK_LEN[ck]
    NHm = mi_of(NH)

    # ---------------------------------------------------------------- 3.2  N
    dd = opt_dates["da_dong_den"]
    goc = mi_of(dd) + 1 if dd is not None else NHm       # G22: trống = chưa đóng tháng nào
    N = max(goc, NHm)

    # ---------------------------------------------------------------- 3.3  E1 → E0 → E
    if L == 1:
        E1 = N
    elif month_no(N) in (1, 4, 7, 10):
        E1 = N + L - 1
    else:
        E1 = N + (3 - (month_no(N) - 1) % 3) - 1    # tháng cuối quý chứa N (kỳ lẻ, G14)
        luu.append("Kỳ lẻ: từ %s tới hết quý" % mstr(N))
    if N > THANG_THU or THANG_THU <= E1:
        E0 = E1
    else:
        k = THANG_THU - E1                           # hiệu số tháng (10/2027 − 09/2027 = 1)
        E0 = E1 + L * (-(-k // L))                   # EDATE(E1, L × ROUNDUP(k / L))  (G21)
    nn = opt_dates["ngay_nghi"]
    E = min(E0, mi_of(nn)) if nn is not None else E0
    den_ky = (N <= THANG_THU) and (N <= E)
    Lk = (E - N + 1) if den_ky else 0

    if dd is None and N < THANG_THU:
        luu.append("Chưa ghi 'Đã đóng hết tháng' — đang tính như bé chưa đóng tháng nào "
                   "từ tháng nhập học %s" % mstr(NHm))
    if dd is not None and mi_of(dd) >= THANG_THU + L:
        luu.append("'Đã đóng hết tháng' %s xa hơn một kỳ — kiểm tra có gõ nhầm năm" % mstr(mi_of(dd)))
    if N > THANG_THU:
        luu.append("Chưa nhập học" if NHm > THANG_THU else "Chưa đến kỳ")
    if E < N:
        luu.append("Đã nghỉ học")
        if dd is not None and nn is not None and mi_of(dd) > mi_of(nn):
            luu.append("Đã đóng dư — kiểm tra hoàn tiền (file không tính)")
    if den_ky and N < THANG_THU:
        luu.append("Còn nợ từ tháng %s (đợt này thu gộp tới hết %s)" % (mstr(N), mstr(E)))
    if den_ky and Lk > MAX_LK:
        msg = ("Kỳ cần thu %d tháng (%s–%s), quá %d tháng — quá sức chứa của file, lập phiếu tay"
               % (Lk, mstr(N), mstr(E), MAX_LK))
        if dd is None:
            msg += "; nếu bé đã đóng, hãy ghi ô 'Đã đóng hết tháng'"
        loi.append(msg)

    info = {"den_ky": den_ky, "ky_tu": mstr(N), "ky_den": mstr(E) if E >= N else None}
    if loi:
        return blocked(info)

    # G19: kỳ ≥ 2 tháng chứa một tháng 9 không phải tháng đầu kỳ, bé chưa khai đổi gói
    if den_ky and Lk >= 2 and gmk is None and any(month_no(N + t) == 9 for t in range(1, Lk)):
        luu.append("Kỳ vắt qua tháng 9 — nếu bé lên nhóm tuổi, ghi gói mới + ngày đổi gói")

    # ---------------------------------------------------------------- 3.4  tháng của kỳ, cửa sổ
    months = [N + t for t in range(Lk)]
    if E >= N:
        W_from, W_to = dau(N), cuoi(E)
        win = [u for u in uds if u["tu"] <= W_to and u["den"] >= W_from]      # 6.4
    else:
        win = []                                                              # cửa sổ rỗng

    # ---------------------------------------------------------------- 5  mốc
    tm2 = opt_dates["thang_moc2"]
    MOC2_default = NHm + int(qd["so_thang_moc1"])
    MOC2 = mi_of(tm2) if tm2 is not None else MOC2_default
    if tm2 is not None:
        # 10 (bản 3.1): có thang_moc2 nhập tay + dòng gán trong cửa sổ áp cho "Mốc 1"
        # có den trước ngày cuối của tháng liền trước THANG_MOC2
        ends_early = [u for u in win if u["moc"] == "Mốc 1" and u["den"] < cuoi(MOC2 - 1)]
        if ends_early:
            luu.append("Gia hạn mốc 1 tới %s nhưng ưu đãi 'Mốc 1' %s hết hạn trước"
                       % (mstr(MOC2 - 1), ", ".join(str(u["code"]) for u in ends_early)))

    # ---------------------------------------------------------------- 6.4  sức chứa
    n_thuong = sum(1 for u in win if not u["rieng"])
    n_rieng = sum(1 for u in win if u["rieng"])
    if n_thuong > 6:
        loi.append("Quá 6 dòng ưu đãi thường trong cửa sổ — quá sức chứa của file")
    if n_rieng > 2:
        loi.append("Quá 2 dòng ưu đãi riêng trong cửa sổ — quá sức chứa của file")

    # G4
    ck_items = [k for k, it in CAT.items()
                if it is not None and it["loai"] == "Theo chu kỳ" and it["apck"] == ck]
    if ck_items and not any(u["key"] in ck_items for u in win):
        luu.append("Chưa gán ưu đãi theo chu kỳ %s" % ck)

    # 4  gói theo tháng
    def goi_of(m):
        if gmk is not None and DG is not None and m >= mi_of(DG):
            return gmk
        return gk

    thang = []
    total = 0.0
    for m in months:                 # mọi tháng ở đây đều thuộc kỳ
        moc = 2 if m >= MOC2 else 1
        if moc == 1:
            sl, tr = qd["so_luong_moc1"], qd["tran_moc1"]
        else:
            sl = slm2 if slm2 is not None else qd["so_luong_moc2"]
            tr = trm2 if trm2 is not None else qd["tran_moc2"]
        hp = hp_of(goi_of(m), m)
        if hp is None:
            loi.append("Tháng %s thuộc kỳ nhưng gói chưa có giá" % mstr(m))
            hp = 0.0
        elif hp == 0:
            luu.append("Học phí tháng %s bằng 0" % mstr(m))

        # 7.1 đủ điều kiện
        d0, d1 = dau(m), cuoi(m)
        elig = []
        for u in win:
            if HL == "Trùng ít nhất 1 ngày":
                a_ok = u["tu"] <= d1 and u["den"] >= d0
            else:
                a_ok = u["tu"] <= d0 and u["den"] >= d1
            b_ok = u["moc"] == "Cả hai" or u["moc"] == "Mốc %d" % moc
            c_ok = u["apck"] == "Mọi chu kỳ" or u["apck"] == ck
            if a_ok and b_ok and c_ok:
                elig.append(u)
        # 7.2 (bản 3.1) cùng mã: diem = −tu nếu tu ≤ đầu(m), ngược lại tu (tu bằng số ngày);
        #     giữ diem NHỎ NHẤT; bằng nhau → dòng nhập sau.
        #     = dòng mới nhất trong các dòng hiệu lực ngày đầu tháng; không có → dòng bắt đầu sớm nhất.
        def diem(u):
            n = day_no(u["tu"])
            return -n if u["tu"] <= d0 else n
        best = {}
        for u in elig:
            cur = best.get(u["key"])
            if cur is None:
                best[u["key"]] = u
                continue
            du, dc = diem(u), diem(cur)
            if du < dc or (du == dc and u["idx"] > cur["idx"]):
                best[u["key"]] = u
        n_drop = sum(1 for u in elig if best[u["key"]] is not u)
        if n_drop:
            luu.append("Tháng %s: %d dòng ưu đãi trùng mã bị bỏ (giữ dòng hiệu lực ngày đầu tháng "
                       "mới nhất)" % (mstr(m), n_drop))
        elig = [u for u in elig if best[u["key"]] is u]      # giữ thứ tự nhập

        # 8 chọn nhóm thường
        thuong = [u for u in elig if not u["rieng"]]
        rieng = [u for u in elig if u["rieng"]]
        if CHON == "% lớn nhất trước":
            order = sorted(thuong, key=lambda u: -u["p"])   # sort ổn định: bằng nhau → nhập trước
        else:
            order = list(thuong)
        kept = order[:int(sl)]
        if len(order) > len(kept):
            luu.append("Tháng %s: %d ưu đãi bị bỏ vì vượt số lượng" % (mstr(m), len(order) - len(kept)))
        kept_ids = set(u["idx"] for u in kept)
        kept_in = [u for u in thuong if u["idx"] in kept_ids]    # thứ tự nhập để nhân

        # 9 % và tiền
        prod = 1.0
        for u in kept_in:
            prod *= (1 - u["p"])
        pt_thuong = 1 - prod if kept_in else 0.0
        pt_thuong_tran = min(pt_thuong, tr)
        if pt_thuong > tr:
            luu.append("Tháng %s: chạm trần %s" % (mstr(m), tr))
        if not rieng:
            pt_tong = pt_thuong_tran
        else:
            hs = 1.0
            for u in rieng:
                hs *= (1 - u["p"])
            tr_r = max(u["tran"] for u in rieng)
            pt_tong = min(1 - (1 - pt_thuong_tran) * hs, max(tr_r, pt_thuong_tran))
            if not (pt_tong > pt_thuong_tran):
                luu.append("Tháng %s: chính sách riêng không có tác dụng" % mstr(m))
        truoc = xl_round(hp * (1 - pt_tong), 2)
        if LT == "Làm tròn thường":
            pt = xl_round(truoc / DV, 0) * DV
        else:
            pt = xl_rounddown(truoc / DV, 0) * DV
        total += pt
        ap = [u["code"] for u in kept] + [u["code"] for u in rieng]
        thang.append({"thang": mstr(m), "trong_ky": True, "moc": moc,
                      "hoc_phi": num_out(hp), "pt_thuong": pt_thuong,
                      "pt_thuong_tran": pt_thuong_tran, "pt_tong": pt_tong,
                      "phai_thu": num_out(pt), "ap": ap})

    if loi:
        return blocked(info)
    res = {"tinh_duoc": True, "chu_ky": ck}
    res.update(info)
    res.update({"thang": thang, "phai_thu_ky": num_out(total) if den_ky else 0,
                "loi": loi, "luu_y": luu})
    return res


def main(argv):
    if len(argv) != 2:
        sys.stderr.write("Dùng: python3 tinh.py kich-ban.json\n")
        return 2
    with open(argv[1], encoding="utf-8") as fh:
        sc = json.load(fh, parse_constant=_parse_constant)
    out, gnotes = tinh(sc)
    for n in gnotes:
        sys.stderr.write("LƯU Ý TOÀN CỤC: %s\n" % n)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
