#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kiểm tra nhỏ cho tinh.py (bản tham chiếu Python, DAC-TA bản 3.1 — ngày hợp lệ 2000…2100;
mã tự khai có dấu cách đầu/cuối không hợp lệ).
python3 test_tinh.py"""
import copy
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tinh as T  # noqa: E402

BASE = {
    "cau_hinh": {"thang_ky": "2027-10-01"},
    "quyet_dinh": [{"ma": "QD1", "so_thang_moc1": 12, "so_luong_moc1": 3, "tran_moc1": 0.30,
                    "so_luong_moc2": 2, "tran_moc2": 0.20}],
    "bieu_phi": [{"ma": "MAM", "hoc_phi_thang": 6000000}],
    "danh_muc": [
        {"ma": "CU_DAN", "loai": "Chung", "phan_tram": 0.05},
        {"ma": "ACE", "loai": "Chung", "phan_tram": 0.10},
        {"ma": "NAM_DAU", "loai": "Chung", "phan_tram": 0.20, "ap_cho_moc": "Mốc 1"},
        {"ma": "RIENG", "loai": "Bổ sung", "phan_tram": 0.20, "tran_rieng": 0.25},
        {"ma": "Q12", "loai": "Theo chu kỳ", "phan_tram": 0.03, "ap_cho_chu_ky": "12 tháng"},
    ],
    # bản 3: da_dong_den trống = chưa đóng tháng nào (G22) → BASE ghi rõ đã đóng hết 09/2027
    "be": [{"ma": "B1", "goi": "MAM", "con_gv": "Không", "chu_ky": "Quý",
            "ngay_nhap_hoc": "2025-09-05", "ma_qd": "QD1", "da_dong_den": "2027-09-30"}],
    "uu_dai": [],
}


def run_g(**kw):
    sc = copy.deepcopy(BASE)
    for k, v in kw.items():
        if k == "be1":
            sc["be"][0].update(v)
        elif k == "cfg":
            sc["cau_hinh"].update(v)
        else:
            sc[k] = v
    return T.tinh(sc)


def run(**kw):
    return run_g(**kw)[0]


def months(r):
    return {t["thang"]: t for t in r["thang"]}


class Rounding(unittest.TestCase):
    def test_excel_round(self):
        self.assertEqual(T.xl_round(4199999.999999999, 2), 4200000.0)
        self.assertEqual(1000000 * (1 - 0.07), 929999.9999999999)
        self.assertEqual(T.xl_rounddown(929999.9999999999 / 1000, 0), 930.0)       # chụp 15 chữ số trước
        self.assertEqual(T.xl_rounddown(4199999.999999999 / 1000, 0), 4200.0)
        self.assertEqual(T.xl_round(2.5, 0), 3.0)            # Python round → 2
        self.assertEqual(T.xl_round(-2.5, 0), -3.0)
        self.assertEqual(T.xl_round(0.5, 0), 1.0)
        self.assertEqual(T.xl_round(1.005, 2), 1.01)         # 1.005 thực là 1.00499999…
        self.assertEqual(T.xl_round(1055554.785, 2), 1055554.79)
        self.assertEqual(T.xl_rounddown(5129.99999, 0), 5129.0)
        self.assertEqual(T.xl_round(0, 2), 0.0)

    def test_scenario_30pct_down(self):
        # 3 ưu đãi thường 10%+10%+... chạm trần 30% (mốc 1): 6.000.000 × 0,7 → 4.200.000 cả khi làm tròn xuống
        r = run(be1={"ngay_nhap_hoc": "2027-10-01"},
                cfg={"cach_lam_tron": "Làm tròn xuống"},
                danh_muc=BASE["danh_muc"] + [{"ma": "X", "phan_tram": 0.3}],
                uu_dai=[{"ma_be": "B1", "ma_uu_dai": "X"}])["B1"]
        self.assertTrue(r["tinh_duoc"])
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 4200000)
        self.assertEqual(r["phai_thu_ky"], 12600000)

    def test_rounddown_float_noise(self):
        r = run(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 1000000}], cfg={"cach_lam_tron": "Làm tròn xuống"},
                danh_muc=BASE["danh_muc"] + [{"ma": "S7", "phan_tram": 0.07}],
                uu_dai=[{"ma_be": "B1", "ma_uu_dai": "S7"}])["B1"]
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 930000)            # không phải 929.000

    def test_half_away_unit_1(self):
        r = run(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 1001}], cfg={"don_vi_lam_tron": 1},
                quyet_dinh=[dict(BASE["quyet_dinh"][0], tran_moc1=1)],
                danh_muc=BASE["danh_muc"] + [{"ma": "H", "phan_tram": 0.5}],
                be1={"ngay_nhap_hoc": "2027-10-01"},
                uu_dai=[{"ma_be": "B1", "ma_uu_dai": "H"}])["B1"]
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 501)       # 500,5 → 501


class Period(unittest.TestCase):
    def test_arrears(self):
        # G21: nợ Q3 (07–09) + kỳ Q4 đang tới hạn → thu gộp 07–12 trong đợt 10/2027
        r = run(be1={"da_dong_den": "2027-06-30"})["B1"]
        self.assertEqual((r["den_ky"], r["ky_tu"], r["ky_den"]), (True, "2027-07", "2027-12"))
        self.assertEqual(sum(t["trong_ky"] for t in r["thang"]), 6)
        self.assertEqual(r["phai_thu_ky"], 36000000)

    def test_ky_le(self):
        r = run(cfg={"thang_ky": "2027-11-01"},
                be1={"ngay_nhap_hoc": "2027-11-15", "chu_ky": "12 tháng"})["B1"]
        self.assertEqual((r["ky_tu"], r["ky_den"], r["chu_ky"]), ("2027-11", "2027-12", "12 tháng"))
        self.assertEqual(r["phai_thu_ky"], 12000000)

    def test_not_yet_due(self):
        r = run(be1={"ngay_nhap_hoc": "2027-11-15"})["B1"]
        self.assertTrue(r["tinh_duoc"])
        self.assertFalse(r["den_ky"])
        self.assertEqual(r["phai_thu_ky"], 0)
        self.assertEqual(r["ky_tu"], "2027-11")
        self.assertEqual(r["thang"], [])                     # 3.4 bản 3: chưa đến kỳ → []

    def test_12_thang_quarter_start(self):
        r = run(be1={"chu_ky": "12 tháng", "da_dong_den": "2027-09-30"})["B1"]
        self.assertEqual((r["ky_tu"], r["ky_den"]), ("2027-10", "2028-09"))
        self.assertEqual(r["phai_thu_ky"], 72000000)

    def test_withdrawal(self):
        r = run(be1={"ngay_nghi": "2027-11-10"})["B1"]
        self.assertEqual((r["ky_den"], r["phai_thu_ky"]), ("2027-11", 12000000))
        r = run(be1={"ngay_nghi": "2027-09-20"})["B1"]
        self.assertEqual((r["den_ky"], r["ky_den"], r["phai_thu_ky"]), (False, None, 0))

    def test_chu_ky_defaults(self):
        self.assertEqual(run(be1={"chu_ky": "1 tháng"})["B1"]["chu_ky"], "Quý")
        self.assertEqual(run(be1={"chu_ky": "1 tháng", "con_gv": "có"})["B1"]["ky_den"], "2027-10")
        self.assertEqual(run(be1={"chu_ky": None})["B1"]["chu_ky"], "Quý")
        self.assertEqual(run(be1={"chu_ky": ""})["B1"]["chu_ky"], "Quý")
        self.assertFalse(run(be1={"chu_ky": "Quý "})["B1"]["tinh_duoc"])    # bản 3: sai là LỖI
        self.assertEqual(run(be1={"chu_ky": "6 THÁNG"})["B1"]["chu_ky"], "6 tháng")


class ArrearsG21(unittest.TestCase):
    """GIẢ ĐỊNH G21 (mục 3.3): bé còn nợ thu gộp các tháng nợ + kỳ chứa THANG_THU; > 15 tháng là LỖI.
    Bé B1 trong BASE: Quý, 6.000.000/tháng, không ưu đãi, đợt 10/2027."""

    def period(self, r):
        return (r["tinh_duoc"], r["den_ky"], r["ky_tu"], r["ky_den"],
                [t["thang"] for t in r["thang"] if t["trong_ky"]], r["phai_thu_ky"])

    def test_quy_arrears_example(self):
        # ví dụ của đặc tả: đóng quý, đã đóng hết 08/2027, đợt 10/2027 → thu 09–12/2027
        r = run(be1={"da_dong_den": "2027-08-31"})["B1"]
        self.assertEqual(self.period(r), (True, True, "2027-09", "2027-12",
                                          ["2027-09", "2027-10", "2027-11", "2027-12"], 24000000))
        self.assertTrue(any("Còn nợ" in s for s in r["luu_y"]))
        self.assertTrue(any("Kỳ lẻ" in s for s in r["luu_y"]))     # kỳ đầu 09 vẫn là kỳ lẻ

    def test_one_month_arrears_example(self):
        # ví dụ của đặc tả: 1 tháng (con GV), đã đóng hết 07/2027, đợt 10/2027 → thu 08–10/2027
        r = run(be1={"chu_ky": "1 tháng", "con_gv": "Có", "da_dong_den": "2027-07-31"})["B1"]
        self.assertEqual(self.period(r), (True, True, "2027-08", "2027-10",
                                          ["2027-08", "2027-09", "2027-10"], 18000000))
        self.assertEqual(r["chu_ky"], "1 tháng")

    def test_six_month_arrears_spanning_year(self):
        # 6 tháng, đã đóng hết 03/2027 → kỳ đầu 04–09/2027 (nợ) + kỳ 10/2027–03/2028 → đúng 12 tháng
        r = run(be1={"chu_ky": "6 tháng", "da_dong_den": "2027-03-31"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2027-04", "2028-03"))
        self.assertTrue(all(t["trong_ky"] for t in r["thang"]))
        self.assertEqual(r["phai_thu_ky"], 12 * 6000000)

    def test_k_is_month_difference_not_inclusive_count(self):
        # E1 = 2027-09, THANG_THU = 2027-12: k = 3 → ROUNDUP(3/3)=1 → E0 = 2027-12 (không phải 2028-03)
        r = run(cfg={"thang_ky": "2027-12-01"}, be1={"da_dong_den": "2027-06-30"})["B1"]
        self.assertEqual((r["ky_tu"], r["ky_den"], r["phai_thu_ky"]), ("2027-07", "2027-12", 36000000))
        # THANG_THU = 2028-01: k = 4 → ROUNDUP(4/3)=2 → E0 = 2028-03
        r = run(cfg={"thang_ky": "2028-01-01"}, be1={"da_dong_den": "2027-06-30"})["B1"]
        self.assertEqual((r["ky_tu"], r["ky_den"], r["phai_thu_ky"]), ("2027-07", "2028-03", 54000000))

    def test_limit_15_ok_16_blocked(self):
        # Quý: đã đóng hết 12/2026 → 01–12/2027 = 12 tháng: tính
        r = run(be1={"da_dong_den": "2026-12-31"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2027-01", "2027-12"))
        self.assertEqual(r["phai_thu_ky"], 72000000)
        # Quý: đã đóng hết 09/2026 → 10/2026–12/2027 = 15 tháng: bản 3 VẪN TÍNH (sức chứa 15)
        r = run(be1={"da_dong_den": "2026-09-30"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2026-10", "2027-12"))
        self.assertEqual(len(r["thang"]), 15)
        self.assertEqual(r["phai_thu_ky"], 15 * 6000000)
        # Quý: đã đóng hết 08/2026 → N=09/2026 (kỳ lẻ E1=09/2026, k=13 → +15) → 09/2026–12/2027 = 16: LỖI
        r = run(be1={"da_dong_den": "2026-08-31"})["B1"]
        self.assertFalse(r["tinh_duoc"])
        self.assertIsNone(r["phai_thu_ky"])
        self.assertTrue(any("15" in s for s in r["loi"]), r["loi"])
        # Quý: đã đóng hết 06/2026 → 18 tháng: LỖI
        self.assertFalse(run(be1={"da_dong_den": "2026-06-30"})["B1"]["tinh_duoc"])
        # 1 tháng: 08/2026–10/2027 = 15 được; 07/2026–10/2027 = 16 bị chặn
        gv = {"chu_ky": "1 tháng", "con_gv": "Có"}
        r = run(be1=dict(gv, da_dong_den="2026-07-31"))["B1"]
        self.assertEqual((r["tinh_duoc"], len(r["thang"]), r["phai_thu_ky"]), (True, 15, 90000000))
        self.assertFalse(run(be1=dict(gv, da_dong_den="2026-06-30"))["B1"]["tinh_duoc"])
        # 12 tháng: đã đóng hết 09/2026, đợt 10/2027 → 10/2026–09/2028 = 24 tháng: LỖI
        self.assertFalse(run(be1={"chu_ky": "12 tháng", "da_dong_den": "2026-09-30"})["B1"]["tinh_duoc"])
        # 12 tháng: đã đóng hết 05/2027 → kỳ lẻ 06/2027, k=4 → E0=06/2028: 13 tháng — bản 3 được
        r = run(be1={"chu_ky": "12 tháng", "da_dong_den": "2027-05-31"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2027-06", "2028-06"))
        self.assertEqual(len(r["thang"]), 13)
        # 6 tháng: đã đóng hết 09/2026 → E1=03/2027, k=7 → E0=03/2028: 18 tháng: LỖI
        self.assertFalse(run(be1={"chu_ky": "6 tháng", "da_dong_den": "2026-09-30"})["B1"]["tinh_duoc"])
        # 6 tháng: đã đóng hết 10/2026 → kỳ lẻ 11–12/2026, k=10 → E0=12/2027: 14 tháng được
        r = run(be1={"chu_ky": "6 tháng", "da_dong_den": "2026-10-31"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2026-11", "2027-12"))
        # 16 tháng nợ nhưng nghỉ học 11/2027 → Lk = 15: tính (mục 10 xét Lk sau khi cắt)
        r = run(be1={"da_dong_den": "2026-08-31", "ngay_nghi": "2027-11-05"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2026-09", "2027-11"))
        self.assertEqual(len(r["thang"]), 15)

    def test_arrears_with_withdrawal(self):
        # nợ + nghỉ học giữa kỳ gộp: E = MIN(E0, tháng nghỉ)
        r = run(be1={"da_dong_den": "2027-08-31", "ngay_nghi": "2027-11-10"})["B1"]
        self.assertEqual(self.period(r), (True, True, "2027-09", "2027-11",
                                          ["2027-09", "2027-10", "2027-11"], 18000000))
        # nghỉ trước tháng thu, trong phần nợ: chỉ thu tới tháng nghỉ
        r = run(be1={"da_dong_den": "2027-06-30", "ngay_nghi": "2027-08-20"})["B1"]
        self.assertEqual(self.period(r), (True, True, "2027-07", "2027-08",
                                          ["2027-07", "2027-08"], 12000000))
        # nợ lâu (E0 − N + 1 = 18) nhưng nghỉ học 03/2027 → Lk = 9 ≤ 15: vẫn tính (mục 10 xét Lk)
        r = run(be1={"da_dong_den": "2026-06-30", "ngay_nghi": "2027-03-05"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2026-07", "2027-03"))
        self.assertEqual(r["phai_thu_ky"], 9 * 6000000)
        # nghỉ trước cả tháng N: không thu
        r = run(be1={"da_dong_den": "2027-08-31", "ngay_nghi": "2027-08-15"})["B1"]
        self.assertEqual((r["tinh_duoc"], r["den_ky"], r["ky_den"], r["phai_thu_ky"]),
                         (True, False, None, 0))

    def test_not_due_unchanged(self):
        # N > THANG_THU: không gộp, ky_den = E1 (cắt theo ngày nghỉ)
        r = run(be1={"ngay_nhap_hoc": "2027-11-15"})["B1"]
        self.assertEqual(self.period(r), (True, False, "2027-11", "2027-12", [], 0))
        r = run(be1={"chu_ky": "12 tháng", "da_dong_den": "2027-12-31"})["B1"]
        self.assertEqual(self.period(r), (True, False, "2028-01", "2028-12", [], 0))
        r = run(be1={"chu_ky": "12 tháng", "da_dong_den": "2027-12-31", "ngay_nghi": "2028-05-01"})["B1"]
        self.assertEqual(self.period(r), (True, False, "2028-01", "2028-05", [], 0))
        # đang đúng hạn (N = THANG_THU): không đổi so với trước G21
        r = run(be1={"da_dong_den": "2027-09-30"})["B1"]
        self.assertEqual(self.period(r)[:4], (True, True, "2027-10", "2027-12"))
        self.assertFalse(any("Còn nợ" in s for s in r["luu_y"]))
        # kỳ đầu còn chứa THANG_THU (6T đã đóng hết 06/2027 → 07–12/2027): không gộp thêm
        r = run(be1={"chu_ky": "6 tháng", "da_dong_den": "2027-06-30"})["B1"]
        self.assertEqual((r["ky_tu"], r["ky_den"], r["phai_thu_ky"]), ("2027-07", "2027-12", 36000000))


class Clarifications61(unittest.TestCase):
    def test_invalid_tran_rieng_error_any_type(self):
        # tran_rieng sai ở mục loại Chung → LỖI (không chỉ lưu ý)
        cat = BASE["danh_muc"] + [{"ma": "CX", "loai": "Chung", "phan_tram": 0.1, "tran_rieng": 1.5}]
        self.assertFalse(run(danh_muc=cat, uu_dai=[{"ma_be": "B1", "ma_uu_dai": "CX"}])["B1"]["tinh_duoc"])
        cat[-1]["tran_rieng"] = "20%"
        self.assertFalse(run(danh_muc=cat, uu_dai=[{"ma_be": "B1", "ma_uu_dai": "CX"}])["B1"]["tinh_duoc"])
        # tran_rieng sai ở dòng gán của mục Chung → LỖI
        r = run(uu_dai=[{"ma_be": "B1", "ma_uu_dai": "ACE", "tran_rieng": -0.1}])["B1"]
        self.assertFalse(r["tinh_duoc"])

    def test_valid_tran_rieng_non_special_ignored(self):
        cat = BASE["danh_muc"] + [{"ma": "CX", "loai": "Chung", "phan_tram": 0.1, "tran_rieng": 0.05}]
        r = run(danh_muc=cat, uu_dai=[{"ma_be": "B1", "ma_uu_dai": "CX"}])["B1"]
        self.assertTrue(r["tinh_duoc"])
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 5400000)      # 10%, trần riêng không có tác dụng
        r = run(uu_dai=[{"ma_be": "B1", "ma_uu_dai": "ACE", "tran_rieng": 0.02}])["B1"]
        self.assertTrue(r["tinh_duoc"])
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 5400000)
        self.assertTrue(any("trần riêng" in s for s in r["luu_y"]), r["luu_y"])

    def test_blank_code_rows_ignored(self):
        # dòng biểu phí / QĐ / danh mục có dữ liệu mà mã trống: bỏ qua, không làm hỏng dòng khác,
        # và (bản 3) có LƯU Ý TOÀN CỤC cho từng dòng
        out, gn = run_g(bieu_phi=BASE["bieu_phi"] + [{"ma": "", "hoc_phi_thang": "sai"},
                                                     {"hoc_phi_thang": 1}],
                        quyet_dinh=BASE["quyet_dinh"] + [{"ma": None, "so_thang_moc1": "x"}],
                        danh_muc=BASE["danh_muc"] + [{"ma": "", "phan_tram": 5, "loai": "??"}])
        r = out["B1"]
        self.assertTrue(r["tinh_duoc"], r["loi"])
        self.assertEqual(r["phai_thu_ky"], 18000000)
        miss = [n for n in gn if "thiếu mã" in n]
        self.assertEqual(sum(n.startswith("Biểu phí") for n in miss), 2, gn)
        self.assertEqual(sum(n.startswith("QĐ") for n in miss), 1, gn)
        self.assertEqual(sum(n.startswith("Danh mục") for n in miss), 1, gn)
        # dòng hoàn toàn trống: không lưu ý
        _, gn = run_g(bieu_phi=BASE["bieu_phi"] + [{"ma": None, "ten": ""}])
        self.assertFalse(any("thiếu mã" in n for n in gn), gn)


class FeeVersions(unittest.TestCase):
    def test_switch(self):
        r = run(cfg={"thang_ky": "2028-07-01"},
                bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 6000000},
                          {"ma": "mam", "hoc_phi_thang": 6600000, "ap_dung_tu": "2028-09-15"}],
                be1={"chu_ky": "6 tháng", "da_dong_den": "2028-06-30"})["B1"]
        m = months(r)
        self.assertEqual([m[k]["hoc_phi"] for k in ("2028-07", "2028-08", "2028-09", "2028-12")],
                         [6000000, 6000000, 6600000, 6600000])
        self.assertEqual(r["phai_thu_ky"], 2 * 6000000 + 4 * 6600000)

    def test_no_price_in_period(self):
        r = run(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 6000000, "ap_dung_tu": "2027-11-01"}])["B1"]
        self.assertFalse(r["tinh_duoc"])
        self.assertIsNone(r["phai_thu_ky"])
        # giá chỉ thiếu ở tháng NGOÀI kỳ → vẫn tính
        r = run(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 6000000, "ap_dung_tu": "2027-10-01"}],
                cfg={"thang_ky": "2027-10-01"})["B1"]
        self.assertTrue(r["tinh_duoc"])

    def test_duplicate_start(self):
        r = run(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 1}, {"ma": "Mam", "hoc_phi_thang": 2}])["B1"]
        self.assertFalse(r["tinh_duoc"])
        r = run(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": "6.000.000"}])["B1"]
        self.assertFalse(r["tinh_duoc"])


class Dedup(unittest.TestCase):
    """7.2 bản 3.1: cùng mã cùng tháng → trong các dòng hiệu lực ngày đầu tháng (tu ≤ đầu(m)) giữ dòng
    tu LỚN NHẤT; không có dòng nào như vậy → tu NHỎ NHẤT; bằng nhau → dòng nhập sau.
    B1 (BASE): Quý 10–12/2027, mốc 2 (tối đa 2, trần 20%), 6.000.000/tháng."""

    ROWS = [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "phan_tram": 0.05, "den_ngay": "2027-11-15"},
            {"ma_be": "b1", "ma_uu_dai": "cu_dan", "phan_tram": 0.07, "tu_ngay": "2027-11-16"}]

    @staticmethod
    def cd(p, tu=None, den=None, code="CU_DAN"):
        r = {"ma_be": "B1", "ma_uu_dai": code, "phan_tram": p}
        if tu:
            r["tu_ngay"] = tu
        if den:
            r["den_ngay"] = den
        return r

    def pay(self, rows, **kw):
        r = run(uu_dai=rows, **kw)["B1"]
        self.assertTrue(r["tinh_duoc"], r["loi"])
        m = months(r)
        return [m[k]["phai_thu"] for k in ("2027-10", "2027-11", "2027-12")]

    def both_orders(self, rows, want, **kw):
        self.assertEqual(self.pay(rows, **kw), want, rows)
        self.assertEqual(self.pay(list(reversed(rows)), **kw), want, list(reversed(rows)))

    # (b) mức cũ có hạn 15/11 + mức mới từ 16/11 → tháng 11 mức cũ, tháng 12 mức mới
    def test_b_old_until_15_new_from_16(self):
        r = run(uu_dai=self.ROWS)["B1"]
        m = months(r)
        self.assertEqual(m["2027-10"]["phai_thu"], 5700000)
        self.assertEqual(m["2027-11"]["phai_thu"], 5700000)    # tháng đổi mức: mức đang áp ngày 1/11
        self.assertEqual(m["2027-11"]["ap"], ["CU_DAN"])       # viết như dòng được giữ
        self.assertEqual(m["2027-12"]["phai_thu"], 5580000)    # từ tháng 12 mới 7%
        self.assertEqual(m["2027-12"]["ap"], ["cu_dan"])
        self.assertEqual(r["phai_thu_ky"], 5700000 + 5700000 + 5580000)
        self.assertTrue(any("trùng mã" in s for s in r["luu_y"]), r["luu_y"])
        self.both_orders(self.ROWS, [5700000, 5700000, 5580000])

    # (a) QUÊN ghi hạn cho dòng cũ: 5% không hạn + 7% từ 16/11 không hạn → 11: 5%, 12: 7%
    def test_a_old_open_ended_new_from_16(self):
        rows = [self.cd(0.05), self.cd(0.07, tu="2027-11-16")]
        self.both_orders(rows, [5700000, 5700000, 5580000])
        # dòng cũ có tu rõ (trước cả kỳ) cũng vậy
        rows = [self.cd(0.05, tu="2026-09-01"), self.cd(0.07, tu="2027-11-16")]
        self.both_orders(rows, [5700000, 5700000, 5580000])
        # ap theo cách viết của dòng được giữ; bản 3 sẽ giữ 5% mãi (tu nhỏ nhất)
        r = run(uu_dai=[self.cd(0.05), self.cd(0.07, tu="2027-11-16", code="Cu_Dan")])["B1"]
        m = months(r)
        self.assertEqual((m["2027-11"]["ap"], m["2027-12"]["ap"]), (["CU_DAN"], ["Cu_Dan"]))
        self.assertAlmostEqual(m["2027-12"]["pt_thuong"], 0.07)

    # (c) mức tạm thời lồng trong một dòng không hạn → áp đúng tháng đó
    def test_c_temporary_rate_nested_in_open_ended(self):
        rows = [self.cd(0.05), self.cd(0.07, tu="2027-11-01", den="2027-11-30")]
        self.both_orders(rows, [5700000, 5580000, 5700000])
        # mức tạm thời bắt đầu giữa tháng (10/11–30/11): tháng 11 vẫn mức đang áp ngày 1/11
        rows = [self.cd(0.05), self.cd(0.07, tu="2027-11-10", den="2027-11-30")]
        self.both_orders(rows, [5700000, 5700000, 5700000])

    # (d) cả hai dòng bắt đầu giữa cùng một tháng → tháng đó giữ dòng bắt đầu sớm nhất
    def test_d_both_start_mid_month(self):
        rows = [self.cd(0.03, tu="2027-11-10"), self.cd(0.09, tu="2027-11-20")]
        self.both_orders(rows, [6000000, 5820000, 5460000])    # 10: không; 11: 3%; 12: mới nhất 9%
        r = run(uu_dai=list(reversed(rows)))["B1"]
        self.assertEqual(months(r)["2027-10"]["ap"], [])
        self.assertAlmostEqual(months(r)["2027-11"]["pt_thuong"], 0.03)
        # một dòng hiệu lực từ 1/11 thắng mọi dòng bắt đầu giữa tháng, kể cả dòng bắt đầu sớm hơn?
        # (không có dòng nào sớm hơn 1/11 mà chưa hiệu lực 1/11) — dòng từ 1/11 thắng dòng từ 10/11
        rows = [self.cd(0.03, tu="2027-11-10"), self.cd(0.09, tu="2027-11-01")]
        self.both_orders(rows, [6000000, 5460000, 5820000])    # 11: 9% (hiệu lực 1/11); 12: mới nhất 3%

    # (e) cùng tu → dòng nhập sau
    def test_e_tie_later_row(self):
        self.assertEqual(self.pay([self.cd(0.05), self.cd(0.08)])[0], 5520000)
        self.assertEqual(self.pay([self.cd(0.08), self.cd(0.05)])[0], 5700000)
        # tu trống = 01/01/1900 bên trong (6.3) — nay ô nhập không ghi được ngày đó (1.2: ≥ 2000),
        # nên dòng tu trống luôn CŨ HƠN dòng tu sớm nhất ghi được (2000-01-01): dòng 2000 thắng
        # bất kể thứ tự nhập (không còn trường hợp "bằng nhau" giữa tu trống và tu ghi rõ).
        self.assertEqual(self.pay([self.cd(0.05), self.cd(0.08, tu="2000-01-01")])[0], 5520000)
        self.assertEqual(self.pay([self.cd(0.08, tu="2000-01-01"), self.cd(0.05)])[0], 5520000)
        self.assertEqual(self.pay([self.cd(0.05, tu="2000-01-01"), self.cd(0.08)])[0], 5700000)
        # tu ghi rõ 1900-01-01 (giá trị mặc định bên trong) nay là LỖI dòng → chặn bé
        r = run(uu_dai=[self.cd(0.05), self.cd(0.08, tu="1900-01-01")])["B1"]
        self.assertFalse(r["tinh_duoc"])
        self.assertIn("dòng ưu đãi 2: tu_ngay không phải ngày", r["loi"])
        # cùng tu = đầu tháng (đang hiệu lực) và cùng tu giữa tháng (chưa hiệu lực)
        self.assertEqual(self.pay([self.cd(0.05, tu="2027-11-01"), self.cd(0.08, tu="2027-11-01")])[1],
                         5520000)
        self.assertEqual(self.pay([self.cd(0.08, tu="2027-11-01"), self.cd(0.05, tu="2027-11-01")])[1],
                         5700000)
        self.assertEqual(self.pay([self.cd(0.05, tu="2027-11-10"), self.cd(0.08, tu="2027-11-10")])[1:],
                         [5520000, 5520000])
        self.assertEqual(self.pay([self.cd(0.08, tu="2027-11-10"), self.cd(0.05, tu="2027-11-10")])[1:],
                         [5700000, 5700000])
        # cùng tu mà khác den: vẫn chỉ xét thứ tự nhập
        self.assertEqual(self.pay([self.cd(0.08), self.cd(0.05, den="2027-12-31")])[0], 5700000)

    # (f) "Phủ trọn cả tháng": mọi dòng đủ điều kiện đều hiệu lực ngày đầu tháng → mới nhất thắng
    def test_f_full_month_mode_newest_wins(self):
        hl = {"cfg": {"che_do_hieu_luc": "Phủ trọn cả tháng"}}
        rows = [self.cd(0.05), self.cd(0.07, tu="2027-11-16")]
        self.both_orders(rows, [5700000, 5700000, 5580000], **hl)
        rows = [self.cd(0.05), self.cd(0.07, tu="2027-11-01", den="2027-11-30")]
        self.both_orders(rows, [5700000, 5580000, 5700000], **hl)
        # "mới nhất" theo tu, không theo thứ tự nhập
        rows = [self.cd(0.05, tu="2027-10-01"), self.cd(0.07, tu="2027-09-01")]
        self.both_orders(rows, [5700000, 5700000, 5700000], **hl)
        self.both_orders(rows, [5700000, 5700000, 5700000])   # chế độ mặc định cũng vậy

    def test_full_month_mode_transition_month_gets_neither(self):
        r = run(uu_dai=self.ROWS, cfg={"che_do_hieu_luc": "Phủ trọn cả tháng"})["B1"]
        m = months(r)
        self.assertEqual([m[k]["phai_thu"] for k in ("2027-10", "2027-11", "2027-12")],
                         [5700000, 6000000, 5580000])
        self.assertEqual(m["2027-11"]["ap"], [])

    def test_kept_row_keeps_its_own_position_in_input_order_mode(self):
        # Thứ tự nhập, mốc 2 tối đa 2, trần 20%. Dòng 1: CU_DAN 7% từ 01/11; dòng 4: CU_DAN 5% không hạn.
        # Tháng 10: chỉ dòng 4 đủ điều kiện → ở VỊ TRÍ 4 → giữ ACE, BIG (0,235 → trần 0,2 → 4.800.000).
        # Tháng 11: cả hai hiệu lực 1/11 → giữ dòng 1 (mới nhất) ở VỊ TRÍ 1 → CU_DAN 7% + ACE
        #           → 1 − 0,93 × 0,9 = 0,163 → 5.022.000. (Nếu dòng giữ lấy vị trí 4: ACE, BIG.)
        cat = BASE["danh_muc"] + [{"ma": "BIG", "phan_tram": 0.15}]
        rows = [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "phan_tram": 0.07, "tu_ngay": "2027-11-01"},
                {"ma_be": "B1", "ma_uu_dai": "ACE"}, {"ma_be": "B1", "ma_uu_dai": "BIG"},
                {"ma_be": "B1", "ma_uu_dai": "CU_DAN"}]
        r = run(danh_muc=cat, uu_dai=rows, cfg={"che_do_chon": "Theo thứ tự nhập"})["B1"]
        m = months(r)
        self.assertEqual(sorted(m["2027-10"]["ap"]), ["ACE", "BIG"])
        self.assertEqual(m["2027-10"]["phai_thu"], 4800000)
        self.assertEqual(sorted(m["2027-11"]["ap"]), ["ACE", "CU_DAN"])
        self.assertEqual(m["2027-11"]["phai_thu"], 5022000)

    def test_dedup_before_selection_largest_first(self):
        # % lớn nhất trước: 7.2 chạy TRƯỚC 8 — dòng CU_DAN 30% cũ bị thay bởi 1% mới nhất từ tháng 12,
        # nên tháng 12 chọn ACE + BIG thay vì CU_DAN 30% + BIG.
        cat = BASE["danh_muc"] + [{"ma": "BIG", "phan_tram": 0.15}]
        rows = [self.cd(0.30), {"ma_be": "B1", "ma_uu_dai": "ACE"}, {"ma_be": "B1", "ma_uu_dai": "BIG"},
                self.cd(0.01, tu="2027-11-16")]
        r = run(danh_muc=cat, uu_dai=rows)["B1"]
        m = months(r)
        self.assertEqual(sorted(m["2027-11"]["ap"]), ["BIG", "CU_DAN"])
        self.assertEqual(sorted(m["2027-12"]["ap"]), ["ACE", "BIG"])

    def test_random_matches_rules_1_2_3(self):
        """Viết gọn (diem) của tinh.py khớp quy tắc 1–3 viết thẳng, trên dòng ngẫu nhiên cùng mã."""
        import random
        rnd = random.Random(31)
        dates = [None, "2000-01-01", "2027-09-15", "2027-10-01", "2027-10-10", "2027-10-31",
                 "2027-11-01", "2027-11-16", "2027-11-30", "2027-12-01", "2027-12-20", "2027-12-31"]
        mons = [((2027, 10, 1), (2027, 10, 31)), ((2027, 11, 1), (2027, 11, 30)),
                ((2027, 12, 1), (2027, 12, 31))]

        def d(s, dflt):
            return tuple(map(int, s.split("-"))) if s else dflt

        for it in range(400):
            n = rnd.randint(2, 4)
            ps = rnd.sample([0.01 * k for k in range(1, 20)], n)    # % khác nhau → nhận ra dòng giữ
            rows = []
            for i in range(n):
                tu, den = rnd.choice(dates), rnd.choice(dates)
                if tu and den and tu > den:
                    den = None
                rows.append(self.cd(ps[i], tu=tu, den=den))
            full = rnd.random() < 0.3
            kw = {"cfg": {"che_do_hieu_luc": "Phủ trọn cả tháng"}} if full else {}
            r = run(uu_dai=rows, **kw)["B1"]
            self.assertTrue(r["tinh_duoc"], (rows, r["loi"]))
            for (d0, d1), t in zip(mons, r["thang"]):
                el = []
                for i, row in enumerate(rows):
                    tu, den = d(row.get("tu_ngay"), (1900, 1, 1)), d(row.get("den_ngay"), (9999, 12, 31))
                    ok = (tu <= d0 and den >= d1) if full else (tu <= d1 and den >= d0)
                    if ok:
                        el.append((i, tu, row["phan_tram"]))
                if not el:
                    self.assertEqual(t["ap"], [], (it, rows, t))
                    continue
                on1 = [e for e in el if e[1] <= d0]
                if on1:     # 1. mới nhất trong các dòng hiệu lực ngày đầu tháng; 3. bằng nhau → nhập sau
                    want = max(on1, key=lambda e: (e[1], e[0]))
                else:       # 2. bắt đầu sớm nhất; 3. bằng nhau → nhập sau
                    want = min(el, key=lambda e: (e[1], -e[0]))
                self.assertAlmostEqual(t["pt_thuong"], want[2], msg=(it, full, rows, t["thang"]))

    def test_day_no_positive_and_monotone(self):
        # viết gọn "−tu / tu" chỉ đúng khi mọi số ngày đều dương (như số ngày Excel)
        # (1900, 1, 1) vẫn dùng bên trong làm tu mặc định (6.3) dù ô nhập không ghi được ngày đó
        self.assertGreater(T.day_no((1900, 1, 1)), 0)
        self.assertLess(T.day_no((1900, 1, 1)), T.day_no((1900, 1, 2)))
        self.assertLess(T.day_no((1900, 1, 1)), T.day_no((2000, 1, 1)))
        self.assertEqual(T.day_no((2027, 12, 1)) - T.day_no((2027, 11, 1)), 30)
        self.assertLess(T.day_no((2100, 12, 31)), T.day_no((9999, 12, 31)))


class CatalogCycleAliases(unittest.TestCase):
    """6.1 bản 3.1: ap_cho_chu_ky nhận viết tắt của 3.1 (hoa/thường, không bỏ khoảng trắng)."""

    def go(self, apck, chu_ky="6 tháng", con_gv="Không", assign=True, loai="Theo chu kỳ"):
        cat = BASE["danh_muc"] + [{"ma": "K", "loai": loai, "phan_tram": 0.02, "ap_cho_chu_ky": apck}]
        ud = [{"ma_be": "B1", "ma_uu_dai": "K"}] if assign else []
        return run(danh_muc=cat, be1={"chu_ky": chu_ky, "con_gv": con_gv}, uu_dai=ud)["B1"]

    def applied(self, r):
        self.assertTrue(r["tinh_duoc"], r["loi"])
        return r["thang"][0]["ap"] == ["K"]

    def test_g_6T_matches_6_thang_and_6T(self):
        for apck in ("6T", "6t", "6 tháng", "6 THÁNG"):
            for ck in ("6 tháng", "6T", "6t"):
                r = self.go(apck, chu_ky=ck)
                self.assertTrue(self.applied(r), (apck, ck))
                self.assertEqual(r["thang"][0]["phai_thu"], 5880000)
            self.assertFalse(self.applied(self.go(apck, chu_ky="Quý")), apck)
            self.assertFalse(self.applied(self.go(apck, chu_ky="12T")), apck)

    def test_other_aliases(self):
        for apck, ck, gv, want in (("3T", "Quý", "Không", True), ("3t", "3 tháng", "Không", True),
                                   ("3 tháng", "quý", "Không", True), ("3 THÁNG", "3T", "Không", True),
                                   ("QUÝ", "3T", "Không", True),
                                   ("12T", "12 tháng", "Không", True), ("12t", "12T", "Không", True),
                                   ("12T", "6T", "Không", False),
                                   ("1T", "1 tháng", "Có", True), ("1t", "1T", "có", True),
                                   # 1 tháng mà không phải con GV → chu kỳ áp dụng Quý
                                   ("1T", "1T", "Không", False), ("3T", "1T", "Không", True),
                                   ("Mọi chu kỳ", "12T", "Không", True), ("MỌI CHU KỲ", "1T", "Có", True),
                                   (None, "6T", "Không", True), ("", "Quý", "Không", True)):
            self.assertEqual(self.applied(self.go(apck, chu_ky=ck, con_gv=gv)), want, (apck, ck, gv))

    def test_g_invalid_is_catalog_error(self):
        for apck in ("6 T", "6T ", " 6T", "6", 6, "T6", "Quy", "3 thang", "Mọi chu kỳ ", "Mọi",
                     "24T", "1 năm", True, " 6T"):
            r = self.go(apck)
            self.assertFalse(r["tinh_duoc"], apck)
            self.assertIsNone(r["phai_thu_ky"], apck)
            # bé không có dòng gán mã đó thì không bị chặn
            self.assertTrue(self.go(apck, assign=False)["tinh_duoc"], apck)

    def test_g4_note_uses_canonical_name(self):
        r = self.go("6T", chu_ky="6 tháng", assign=False)
        self.assertTrue(any("Chưa gán ưu đãi theo chu kỳ" in s for s in r["luu_y"]), r["luu_y"])
        r = self.go("6T", chu_ky="Quý", assign=False)
        self.assertFalse(any("Chưa gán ưu đãi theo chu kỳ" in s for s in r["luu_y"]), r["luu_y"])

    def test_alias_on_chung_type(self):
        # viết tắt dùng được ở mọi loại, không riêng "Theo chu kỳ"
        self.assertTrue(self.applied(self.go("6T", loai="Chung")))
        self.assertFalse(self.applied(self.go("12T", loai="Bổ sung")))


class Notes31(unittest.TestCase):
    """10 bản 3.1: bỏ lưu ý '6T/12T chưa ghi đã đóng đến'; định nghĩa lưu ý gia hạn mốc 1."""

    def test_no_stale_6T_12T_note(self):
        for ck in ("6 tháng", "12 tháng"):
            r = run(be1={"chu_ky": ck, "ngay_nhap_hoc": "2027-10-05", "da_dong_den": None})["B1"]
            self.assertTrue(r["tinh_duoc"], r["loi"])
            self.assertFalse(any("chưa ghi đã đóng đến" in s for s in r["luu_y"]), r["luu_y"])

    def test_moc1_extension_note(self):
        # vào 09/2025, QĐ mốc 1 = 12 tháng; thang_moc2 nhập tay 2028-01 → tháng trước = 12/2027
        def notes(den, tm2="2028-01-01", code="NAM_DAU"):
            ud = [{"ma_be": "B1", "ma_uu_dai": code, "den_ngay": den}]
            r = run(be1={"thang_moc2": tm2}, uu_dai=ud)["B1"]
            self.assertTrue(r["tinh_duoc"], r["loi"])
            return any("Gia hạn mốc 1" in s for s in r["luu_y"])
        self.assertTrue(notes("2027-12-30"))
        self.assertFalse(notes("2027-12-31"))            # hết hạn đúng ngày cuối tháng trước mốc 2
        self.assertFalse(notes(None))
        self.assertFalse(notes("2027-12-30", tm2=None))  # không nhập tay
        self.assertFalse(notes("2027-12-30", code="CU_DAN"))    # không phải loại áp cho "Mốc 1"
        self.assertFalse(notes("2027-09-30"))            # ngoài cửa sổ (10–12/2027)
        self.assertTrue(notes("2027-10-15"))


class Slots(unittest.TestCase):
    def _cat(self, n):
        return BASE["danh_muc"] + [{"ma": "U%d" % i, "phan_tram": 0.01} for i in range(n)]

    def test_expired_rows_do_not_take_slots(self):
        rows = [{"ma_be": "B1", "ma_uu_dai": "U%d" % i} for i in range(6)]
        rows.append({"ma_be": "B1", "ma_uu_dai": "U6", "den_ngay": "2027-09-30"})  # hết hạn trước cửa sổ
        rows.append({"ma_be": "B1", "ma_uu_dai": "U7", "tu_ngay": "2028-01-01"})   # sau cửa sổ (tới cuối(E)=2027-12)
        r = run(danh_muc=self._cat(8), uu_dai=rows)["B1"]
        self.assertTrue(r["tinh_duoc"], r["loi"])

    def test_seven_in_window_blocks(self):
        rows = [{"ma_be": "B1", "ma_uu_dai": "U%d" % i} for i in range(7)]
        self.assertFalse(run(danh_muc=self._cat(7), uu_dai=rows)["B1"]["tinh_duoc"])

    def test_bad_row_outside_window_still_blocks(self):
        r = run(uu_dai=[{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "den_ngay": "2020-01-01",
                         "phan_tram": "5%"}])["B1"]
        self.assertFalse(r["tinh_duoc"])

    def test_three_special_one_expired(self):
        cat = BASE["danh_muc"] + [{"ma": "R2", "loai": "Bổ sung", "phan_tram": 0.1},
                                  {"ma": "R3", "loai": "bổ sung", "phan_tram": 0.1}]
        rows = [{"ma_be": "B1", "ma_uu_dai": "RIENG"}, {"ma_be": "B1", "ma_uu_dai": "R2"},
                {"ma_be": "B1", "ma_uu_dai": "R3", "den_ngay": "2026-12-31"}]
        self.assertTrue(run(danh_muc=cat, uu_dai=rows)["B1"]["tinh_duoc"])
        rows[2]["den_ngay"] = None
        self.assertFalse(run(danh_muc=cat, uu_dai=rows)["B1"]["tinh_duoc"])


class SelectionAndCaps(unittest.TestCase):
    def test_largest_first_and_cap(self):
        # mốc 2: tối đa 2 ưu đãi, trần 20%
        cat = BASE["danh_muc"] + [{"ma": "BIG", "phan_tram": 0.15}]
        rows = [{"ma_be": "B1", "ma_uu_dai": c} for c in ("CU_DAN", "ACE", "BIG")]
        r = run(danh_muc=cat, uu_dai=rows)["B1"]
        t = months(r)["2027-10"]
        self.assertEqual(sorted(t["ap"]), ["ACE", "BIG"])
        self.assertAlmostEqual(t["pt_thuong"], 1 - 0.9 * 0.85)
        self.assertAlmostEqual(t["pt_thuong_tran"], 0.2)
        self.assertEqual(t["phai_thu"], 4800000)
        r = run(danh_muc=cat, uu_dai=rows, cfg={"che_do_chon": "theo thứ tự nhập"})["B1"]
        self.assertEqual(sorted(months(r)["2027-10"]["ap"]), ["ACE", "CU_DAN"])

    def test_special_layer(self):
        rows = [{"ma_be": "B1", "ma_uu_dai": "ACE"}, {"ma_be": "B1", "ma_uu_dai": "RIENG"}]
        t = months(run(uu_dai=rows)["B1"])["2027-10"]
        # 1-(0.9)(0.8)=0.28 ; MAX(0.25, 0.10)=0.25 → 25%
        self.assertAlmostEqual(t["pt_tong"], 0.25)
        self.assertEqual(t["phai_thu"], 4500000)

    def test_moc1_only_offer(self):
        # 6 tháng 10/2027–03/2028 (bản 3 chỉ có các tháng của kỳ)
        rows = [{"ma_be": "B1", "ma_uu_dai": "NAM_DAU"}]
        r = run(be1={"ngay_nhap_hoc": "2027-01-10", "chu_ky": "6 tháng"}, uu_dai=rows)["B1"]
        m = months(r)
        self.assertEqual((m["2027-12"]["moc"], m["2028-01"]["moc"]), (1, 2))
        self.assertEqual(m["2027-10"]["phai_thu"], 4800000)
        self.assertEqual(m["2028-01"]["phai_thu"], 6000000)
        r = run(be1={"ngay_nhap_hoc": "2027-01-10", "chu_ky": "6 tháng", "thang_moc2": "2028-06-01"},
                uu_dai=rows)["B1"]
        self.assertEqual(months(r)["2028-03"]["moc"], 1)

    def test_full_month_mode(self):
        rows = [{"ma_be": "B1", "ma_uu_dai": "ACE", "den_ngay": "2027-10-30"}]
        r = run(uu_dai=rows, cfg={"che_do_hieu_luc": "PHỦ TRỌN CẢ THÁNG"})["B1"]
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 6000000)
        r = run(uu_dai=rows)["B1"]
        self.assertEqual(months(r)["2027-10"]["phai_thu"], 5400000)


class Validation(unittest.TestCase):
    def test_codes(self):
        out = run(be=[dict(BASE["be"][0], ma="B1"), dict(BASE["be"][0], ma="b1"),
                      dict(BASE["be"][0], ma=" 01 "), dict(BASE["be"][0], ma="1e3"),
                      dict(BASE["be"][0], ma=7)])
        self.assertFalse(out["B1"]["tinh_duoc"])
        self.assertFalse(out["b1"]["tinh_duoc"])
        self.assertFalse(out[" 01 "]["tinh_duoc"])
        self.assertTrue(out["1e3"]["tinh_duoc"])
        self.assertFalse(out["7"]["tinh_duoc"])
        out = run(be=[BASE["be"][0], dict(BASE["be"][0])])
        self.assertEqual(list(out), ["B1"])
        self.assertFalse(out["B1"]["tinh_duoc"])
        self.assertEqual(out["B1"]["thang"], [])

    def test_global_errors(self):
        for cfg in ({"thang_ky": None}, {"thang_ky": "01/10/2027"}, {"don_vi_lam_tron": 0.5},
                    {"don_vi_lam_tron": "1000"}, {"che_do_chon": "x"},
                    {"thang_ky": "2101-01-01"}, {"thang_ky": "1899-12-01"}, {"thang_ky": 46660},
                    {"thang_ky": "1999-12-01"}, {"thang_ky": "1900-01-01"}):
            self.assertFalse(run(cfg=cfg)["B1"]["tinh_duoc"], cfg)

    def test_child_errors(self):
        for be1 in ({"goi": None}, {"goi": "XX"}, {"ngay_nhap_hoc": "2025-02-30"},
                    {"ma_qd": "QD9"}, {"da_dong_den": "x"}, {"so_luong_moc2": 2.5},
                    {"tran_moc2": 1.5}, {"tran_moc2": True}, {"chu_ky": "Quy"},
                    {"goi_moi": "MAM"}, {"doi_goi_tu": "2027-11-01"}):
            self.assertFalse(run(be1=be1)["B1"]["tinh_duoc"], be1)

    def test_qd_errors(self):
        q = dict(BASE["quyet_dinh"][0], tran_moc1="30%")
        self.assertFalse(run(quyet_dinh=[q])["B1"]["tinh_duoc"])
        self.assertFalse(run(quyet_dinh=BASE["quyet_dinh"] + [dict(BASE["quyet_dinh"][0], ma="qd1")])
                         ["B1"]["tinh_duoc"])
        self.assertTrue(run(quyet_dinh=[dict(BASE["quyet_dinh"][0], so_thang_moc1=12.0)])["B1"]["tinh_duoc"])
        # bản 3: so_thang_moc1 nguyên 1..120
        for v, ok in ((120, True), (120.0, True), (1, True), (121, False), (0, False), (60.5, False)):
            self.assertEqual(run(quyet_dinh=[dict(BASE["quyet_dinh"][0], so_thang_moc1=v)])["B1"]["tinh_duoc"],
                             ok, v)

    def test_assignment_errors(self):
        for row in ({"ma_be": "B1"}, {"ma_be": "B1", "ma_uu_dai": "NOPE"},
                    {"ma_be": "B1", "ma_uu_dai": "CU_DAN", "phan_tram": 1.2},
                    {"ma_be": "B1", "ma_uu_dai": "CU_DAN", "tu_ngay": "2027-12-01", "den_ngay": "2027-11-01"},
                    {"ma_be": "B1", "ma_uu_dai": "CU_DAN", "tran_rieng": "x"}):
            self.assertFalse(run(uu_dai=[row])["B1"]["tinh_duoc"], row)
        # dòng thiếu mã bé / mã bé lạ: chỉ lưu ý toàn cục
        self.assertTrue(run(uu_dai=[{"ma_uu_dai": "CU_DAN"}, {"ma_be": "ZZ", "ma_uu_dai": "X"}])
                        ["B1"]["tinh_duoc"])

    def test_catalog_wildcards_literal(self):
        cat = BASE["danh_muc"] + [{"ma": "A*", "phan_tram": 0.1}]
        self.assertFalse(run(danh_muc=cat, uu_dai=[{"ma_be": "B1", "ma_uu_dai": "AB"}])["B1"]["tinh_duoc"])
        self.assertTrue(run(danh_muc=cat, uu_dai=[{"ma_be": "B1", "ma_uu_dai": "a*"}])["B1"]["tinh_duoc"])


def period(r):
    return (r["tinh_duoc"], r["den_ky"], r["ky_tu"], r["ky_den"],
            [t["thang"] for t in r["thang"]], r["phai_thu_ky"])


def mrange(a, b):
    ya, ma = map(int, a.split("-"))
    yb, mb = map(int, b.split("-"))
    i, j = ya * 12 + ma - 1, yb * 12 + mb - 1
    return ["%04d-%02d" % (k // 12, k % 12 + 1) for k in range(i, j + 1)]


class BlankPaidThroughG22(unittest.TestCase):
    """3.2 bản 3 (G22): da_dong_den trống = bé chưa đóng tháng nào → N = tháng nhập học."""

    def test_new_child_mid_quarter_billed_from_enrolment_with_merge(self):
        # Quý, vào 15/08/2027, đợt 10/2027: kỳ lẻ 08–09 (nợ) gộp với Q4 → 08–12/2027
        r = run(be1={"ngay_nhap_hoc": "2027-08-15", "da_dong_den": None})["B1"]
        self.assertEqual(period(r), (True, True, "2027-08", "2027-12",
                                     mrange("2027-08", "2027-12"), 5 * 6000000))
        self.assertTrue(any("Đã đóng hết tháng" in s for s in r["luu_y"]), r["luu_y"])
        self.assertTrue(any("Còn nợ" in s for s in r["luu_y"]), r["luu_y"])
        self.assertTrue(any("Kỳ lẻ" in s for s in r["luu_y"]), r["luu_y"])
        # "" cũng là trống
        r2 = run(be1={"ngay_nhap_hoc": "2027-08-15", "da_dong_den": ""})["B1"]
        self.assertEqual(period(r2), period(r))

    def test_new_child_mid_quarter_same_quarter_as_run(self):
        # đợt 11/2027, bé vào 10/11/2027 → kỳ lẻ 11–12/2027, không nợ, không lưu ý G22
        r = run(cfg={"thang_ky": "2027-11-01"},
                be1={"ngay_nhap_hoc": "2027-11-10", "da_dong_den": None})["B1"]
        self.assertEqual(period(r), (True, True, "2027-11", "2027-12",
                                     ["2027-11", "2027-12"], 12000000))
        self.assertFalse(any("Đã đóng hết tháng" in s for s in r["luu_y"]), r["luu_y"])
        # đợt 11/2027, bé vào 05/10/2027 (đầu quý) → 10–12/2027, có lưu ý G22 (N < THANG_THU)
        r = run(cfg={"thang_ky": "2027-11-01"},
                be1={"ngay_nhap_hoc": "2027-10-05", "da_dong_den": None})["B1"]
        self.assertEqual(period(r), (True, True, "2027-10", "2027-12",
                                     mrange("2027-10", "2027-12"), 18000000))
        self.assertTrue(any("Đã đóng hết tháng" in s for s in r["luu_y"]), r["luu_y"])

    def test_new_child_enrolled_in_run_month(self):
        r = run(be1={"ngay_nhap_hoc": "2027-10-20", "da_dong_den": None})["B1"]
        self.assertEqual(period(r), (True, True, "2027-10", "2027-12",
                                     mrange("2027-10", "2027-12"), 18000000))
        self.assertFalse(any("Đã đóng hết tháng" in s for s in r["luu_y"]), r["luu_y"])

    def test_not_yet_enrolled(self):
        r = run(be1={"ngay_nhap_hoc": "2027-12-01", "da_dong_den": None})["B1"]
        self.assertEqual(period(r), (True, False, "2027-12", "2027-12", [], 0))
        self.assertIn("Chưa nhập học", r["luu_y"])

    def test_old_child_blank_long_arrears_blocked(self):
        # vào 09/2025, quên ghi ô → nợ từ 09/2025 → 09/2025–12/2027 = 28 tháng > 15 → LỖI + lời nhắc
        r = run(be1={"da_dong_den": None})["B1"]
        self.assertFalse(r["tinh_duoc"])
        self.assertIsNone(r["phai_thu_ky"])
        self.assertEqual(r["thang"], [])
        self.assertTrue(any("15" in s and "Đã đóng hết tháng" in s for s in r["loi"]), r["loi"])
        # 1 tháng (con GV) vào 01/2027 trống → 01–10/2027 = 10 tháng: tính, thu cả 10 tháng
        r = run(be1={"da_dong_den": None, "ngay_nhap_hoc": "2027-01-03",
                     "chu_ky": "1 tháng", "con_gv": "Có"})["B1"]
        self.assertEqual(period(r)[:4], (True, True, "2027-01", "2027-10"))
        self.assertEqual(r["phai_thu_ky"], 10 * 6000000)

    def test_paid_before_enrolment_uses_enrolment(self):
        r = run(be1={"ngay_nhap_hoc": "2027-08-15", "da_dong_den": "2027-06-30"})["B1"]
        self.assertEqual(period(r)[:4], (True, True, "2027-08", "2027-12"))

    def test_twelve_month_new_child_14_months(self):
        # ví dụ của đặc tả: vào 08/2027 đóng 12 tháng, đợt 10/2027 → 08/2027–09/2028 (14 tháng, được)
        r = run(be1={"chu_ky": "12 tháng", "ngay_nhap_hoc": "2027-08-01", "da_dong_den": None})["B1"]
        self.assertEqual(period(r), (True, True, "2027-08", "2028-09",
                                     mrange("2027-08", "2028-09"), 14 * 6000000))
        self.assertEqual(len(r["thang"]), 14)
        self.assertEqual(r["chu_ky"], "12 tháng")

    def test_far_ahead_and_overpaid_notes(self):
        # đã đóng tới 01/2028 ≥ EDATE(10/2027, 3) → lưu ý xa hơn một kỳ; chưa đến kỳ
        r = run(be1={"da_dong_den": "2028-01-31"})["B1"]
        self.assertEqual(period(r), (True, False, "2028-02", "2028-03", [], 0))
        self.assertTrue(any("xa hơn một kỳ" in s for s in r["luu_y"]), r["luu_y"])
        r = run(be1={"da_dong_den": "2027-12-31"})["B1"]
        self.assertFalse(any("xa hơn một kỳ" in s for s in r["luu_y"]), r["luu_y"])
        # nghỉ 09/2027 mà đã đóng tới 12/2027 → Đã nghỉ học + đóng dư; không thu
        r = run(be1={"da_dong_den": "2027-12-31", "ngay_nghi": "2027-09-20"})["B1"]
        self.assertEqual(period(r), (True, False, "2028-01", None, [], 0))
        self.assertIn("Đã nghỉ học", r["luu_y"])
        self.assertTrue(any("đóng dư" in s for s in r["luu_y"]), r["luu_y"])
        # nghỉ giữa 11/2027, đã đóng hết 11/2027: không dư
        r = run(be1={"da_dong_den": "2027-11-30", "ngay_nghi": "2027-11-15"})["B1"]
        self.assertEqual(period(r), (True, False, "2027-12", None, [], 0))
        self.assertFalse(any("đóng dư" in s for s in r["luu_y"]), r["luu_y"])


class OutputShape(unittest.TestCase):
    """3.4 / kết quả bản 3: 'thang' đúng Lk phần tử (các tháng của kỳ), [] khi không đến kỳ."""

    def test_exactly_lk_months(self):
        for be1, lk in (({}, 3), ({"chu_ky": "6 tháng"}, 6), ({"chu_ky": "12 tháng"}, 12),
                        ({"chu_ky": "1 tháng", "con_gv": "Có"}, 1),
                        ({"da_dong_den": "2027-06-30"}, 6), ({"ngay_nghi": "2027-10-02"}, 1)):
            r = run(be1=be1)["B1"]
            self.assertTrue(r["tinh_duoc"], (be1, r["loi"]))
            self.assertEqual(len(r["thang"]), lk, be1)
            self.assertTrue(all(t["trong_ky"] for t in r["thang"]), be1)
            self.assertEqual([t["thang"] for t in r["thang"]], mrange(r["ky_tu"], r["ky_den"]), be1)
            self.assertEqual(r["phai_thu_ky"], sum(t["phai_thu"] for t in r["thang"]))

    def test_not_due_empty(self):
        for be1 in ({"da_dong_den": "2027-12-31"}, {"ngay_nghi": "2027-09-01"},
                    {"ngay_nhap_hoc": "2028-02-01"}):
            r = run(be1=be1)["B1"]
            self.assertTrue(r["tinh_duoc"], be1)
            self.assertFalse(r["den_ky"], be1)
            self.assertEqual((r["thang"], r["phai_thu_ky"]), ([], 0), be1)

    def test_price_missing_outside_period_is_fine(self):
        # giá chỉ có từ 01/2028: kỳ 10–12/2027 thiếu giá → LỖI; bé chưa đến kỳ thì không sao
        bp = [{"ma": "MAM", "hoc_phi_thang": 6000000, "ap_dung_tu": "2028-01-01"}]
        self.assertFalse(run(bieu_phi=bp)["B1"]["tinh_duoc"])
        r = run(bieu_phi=bp, be1={"da_dong_den": "2027-12-31"})["B1"]
        self.assertEqual((r["tinh_duoc"], r["den_ky"]), (True, False))


class PackageChange(unittest.TestCase):
    """4 bản 3: đổi gói từ một tháng (goi_moi + doi_goi_tu) kết hợp biểu phí nhiều phiên bản."""

    BP = [{"ma": "MAM", "hoc_phi_thang": 6000000},
          {"ma": "MAM", "hoc_phi_thang": 6600000, "ap_dung_tu": "2028-08-01"},
          {"ma": "CHOI", "hoc_phi_thang": 7000000},
          {"ma": "CHOI", "hoc_phi_thang": 7500000, "ap_dung_tu": "2028-11-01"}]
    KID = {"chu_ky": "6 tháng", "da_dong_den": "2028-06-30"}     # kỳ 07–12/2028

    def go(self, bp=None, **be1):
        return run(cfg={"thang_ky": "2028-07-01"}, bieu_phi=bp or self.BP,
                   be1=dict(self.KID, **be1))["B1"]

    def test_mid_period_change_with_versions(self):
        r = self.go(goi_moi="choi", doi_goi_tu="2028-09-15")
        self.assertTrue(r["tinh_duoc"], r["loi"])
        self.assertEqual([t["hoc_phi"] for t in r["thang"]],
                         [6000000, 6600000, 7000000, 7000000, 7500000, 7500000])
        self.assertEqual(r["phai_thu_ky"], 41600000)
        self.assertFalse(any("tháng 9" in s for s in r["luu_y"]), r["luu_y"])   # đã khai đổi gói

    def test_no_change_gets_september_note(self):
        r = self.go()
        self.assertEqual(r["phai_thu_ky"], 6000000 + 5 * 6600000)
        self.assertTrue(any("tháng 9" in s for s in r["luu_y"]), r["luu_y"])

    def test_change_before_and_after_period(self):
        r = self.go(goi_moi="CHOI", doi_goi_tu="2028-05-01")
        self.assertEqual(r["phai_thu_ky"], 4 * 7000000 + 2 * 7500000)
        r = self.go(goi_moi="CHOI", doi_goi_tu="2029-01-01")
        self.assertEqual(r["phai_thu_ky"], 6000000 + 5 * 6600000)
        r = self.go(goi_moi="CHOI", doi_goi_tu="2028-07-31")    # cả tháng 7 đã là gói mới
        self.assertEqual(r["thang"][0]["hoc_phi"], 7000000)

    def test_change_errors(self):
        self.assertFalse(self.go(goi_moi="CHOI")["tinh_duoc"])
        self.assertFalse(self.go(doi_goi_tu="2028-09-01")["tinh_duoc"])
        self.assertFalse(self.go(goi_moi="CHOI", doi_goi_tu="01/09/2028")["tinh_duoc"])
        self.assertFalse(self.go(goi_moi="CHOI", doi_goi_tu="2101-09-01")["tinh_duoc"])
        self.assertFalse(self.go(goi_moi="XX", doi_goi_tu="2028-09-01")["tinh_duoc"])
        self.assertFalse(self.go(goi_moi="  ", doi_goi_tu="2028-09-01")["tinh_duoc"])
        self.assertFalse(self.go(goi_moi="01", doi_goi_tu="2028-09-01")["tinh_duoc"])
        # gói mới có dòng lỗi: chặn kể cả khi tháng đổi nằm ngoài kỳ
        bad = self.BP + [{"ma": "choi", "hoc_phi_thang": "7.000.000", "ap_dung_tu": "2029-01-01"}]
        self.assertFalse(self.go(bp=bad, goi_moi="CHOI", doi_goi_tu="2030-01-01")["tinh_duoc"])
        # gói cũ vẫn phải hợp lệ dù đổi trước kỳ
        self.assertFalse(self.go(goi=None, goi_moi="CHOI", doi_goi_tu="2028-01-01")["tinh_duoc"])
        # gói mới chưa có giá ở tháng đổi (giá chỉ từ 10/2028, đổi từ 09/2028) → LỖI
        bp = [self.BP[0], {"ma": "CHOI", "hoc_phi_thang": 7000000, "ap_dung_tu": "2028-10-01"}]
        self.assertFalse(self.go(bp=bp, goi_moi="CHOI", doi_goi_tu="2028-09-01")["tinh_duoc"])
        self.assertTrue(self.go(bp=bp, goi_moi="CHOI", doi_goi_tu="2028-10-01")["tinh_duoc"])


class ChuKyAliases(unittest.TestCase):
    """3.1 bản 3: nhận 1T / 3T / '3 tháng' / 6T / 12T (hoa/thường); không trống mà sai = LỖI."""

    def test_aliases(self):
        cases = [("1T", "Có", "1 tháng", "2027-10"), ("1t", "có", "1 tháng", "2027-10"),
                 ("1T", "Không", "Quý", "2027-12"), ("1 THÁNG", "CÓ", "1 tháng", "2027-10"),
                 ("3T", "Không", "Quý", "2027-12"), ("3 tháng", "Không", "Quý", "2027-12"),
                 ("3 THÁNG", "Có", "Quý", "2027-12"), ("quý", "Không", "Quý", "2027-12"),
                 ("6T", "Không", "6 tháng", "2028-03"), ("6t", "Không", "6 tháng", "2028-03"),
                 ("6 Tháng", "Không", "6 tháng", "2028-03"),
                 ("12T", "Không", "12 tháng", "2028-09"), ("12t", "Có", "12 tháng", "2028-09")]
        for ck, gv, want, ky_den in cases:
            r = run(be1={"chu_ky": ck, "con_gv": gv})["B1"]
            self.assertTrue(r["tinh_duoc"], (ck, r["loi"]))
            self.assertEqual((r["chu_ky"], r["ky_den"]), (want, ky_den), ck)

    def test_invalid_blocks(self):
        for ck in ("Quý ", " 6T", "6T ", "6", 6, 3.0, True, "4T", "T6", "12 thang", "1 thang",
                   "Quy", "Quý", "3 tháng ", "hàng tháng", "invalid", " "):
            r = run(be1={"chu_ky": ck})["B1"]
            self.assertFalse(r["tinh_duoc"], ck)
            self.assertIsNone(r["phai_thu_ky"], ck)
            self.assertTrue(any("Chu kỳ" in s for s in r["loi"]), (ck, r["loi"]))

    def test_catalog_ap_cho_chu_ky_matches_applied_cycle(self):
        # ưu đãi chu kỳ '6 tháng' áp cho bé ghi '6T'
        cat = BASE["danh_muc"] + [{"ma": "K6", "loai": "Theo chu kỳ", "phan_tram": 0.02,
                                   "ap_cho_chu_ky": "6 tháng"}]
        r = run(danh_muc=cat, be1={"chu_ky": "6T"}, uu_dai=[{"ma_be": "B1", "ma_uu_dai": "K6"}])["B1"]
        self.assertEqual(r["thang"][0]["ap"], ["K6"])
        self.assertEqual(r["thang"][0]["phai_thu"], 5880000)


class DateBounds(unittest.TestCase):
    """1.2 bản 3.1: ngày hợp lệ 01/01/2000 … 31/12/2100 ở MỌI ô ngày (trước là từ 01/01/1900).
    Trống vẫn giữ nghĩa cũ: tu trống = 01/01/1900, den trống = 31/12/9999 (6.3)."""

    def test_as_date(self):
        self.assertIsNotNone(T.as_date("2000-01-01"))
        self.assertIsNotNone(T.as_date("2100-12-31"))
        self.assertIsNone(T.as_date("1999-12-31"))
        self.assertIsNone(T.as_date("2101-01-01"))
        self.assertIsNone(T.as_date("9999-12-31"))
        # trước 2000 (kể cả vùng Excel/LibreOffice đếm khác nhau) đều không hợp lệ
        for v in ("1900-01-01", "1900-02-28", "1900-03-01", "1899-12-31", "1999-01-01", "0001-01-01"):
            self.assertIsNone(T.as_date(v), v)
        self.assertIsNone(T.as_date("1900-02-29"))     # Excel coi là có thật — ở đây không (và < 2000)
        self.assertIsNone(T.as_date("2100-02-29"))     # 2100 không nhuận
        self.assertIsNotNone(T.as_date("2000-02-29"))  # 2000 nhuận (chia hết 400)
        self.assertEqual(T.as_date("2000-01-01"), (2000, 1, 1))

    # Mỗi ô ngày: (cách ghi vào kịch bản, lời lỗi riêng của ô đó). 1999-12-31 → lỗi; 2000-01-01 → không.
    @staticmethod
    def _child_field_cases(v):
        return [
            ({"be1": {"ngay_nhap_hoc": v}}, "Ngày nhập học không phải ngày hợp lệ"),
            ({"be1": {"da_dong_den": v}}, "da_dong_den không phải ngày hợp lệ"),
            ({"be1": {"ngay_nghi": v}}, "ngay_nghi không phải ngày hợp lệ"),
            ({"be1": {"thang_moc2": v}}, "thang_moc2 không phải ngày hợp lệ"),
            ({"be1": {"goi_moi": "MAM", "doi_goi_tu": v}}, "Ngày đổi gói không phải ngày hợp lệ"),
            ({"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "tu_ngay": v}]},
             "dòng ưu đãi 1: tu_ngay không phải ngày"),
            ({"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "den_ngay": v}]},
             "dòng ưu đãi 1: den_ngay không phải ngày"),
        ]

    def test_lower_bound_each_child_field(self):
        for kw, msg in self._child_field_cases("1999-12-31"):
            r = run(**kw)["B1"]
            self.assertFalse(r["tinh_duoc"], kw)
            self.assertIn(msg, r["loi"], kw)
        for kw, msg in self._child_field_cases("2000-01-01"):
            r = run(**kw)["B1"]
            self.assertNotIn(msg, r["loi"], kw)
            self.assertFalse(any("không phải ngày" in e for e in r["loi"]), (kw, r["loi"]))
        # 1900-01-01 (trước đây hợp lệ) nay cũng là lỗi ở mọi ô
        for kw, msg in self._child_field_cases("1900-01-01"):
            r = run(**kw)["B1"]
            self.assertFalse(r["tinh_duoc"], kw)
            self.assertIn(msg, r["loi"], kw)

    def test_lower_bound_valid_dates_still_compute(self):
        # 2000-01-01 hợp lệ và bé vẫn ra số ở các ô không kéo theo lỗi khác
        ok = [{"be1": {"ngay_nhap_hoc": "2000-01-01"}},
              {"be1": {"thang_moc2": "2000-01-01"}},
              {"be1": {"goi_moi": "MAM", "doi_goi_tu": "2000-01-01"}},
              {"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "tu_ngay": "2000-01-01"}]},
              {"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "den_ngay": "2100-12-31"}]},
              {"bieu_phi": [{"ma": "MAM", "hoc_phi_thang": 6000000, "ap_dung_tu": "2000-01-01"}]},
              {"be1": {"thang_moc2": "2100-12-01"}}]
        for kw in ok:
            r = run(**kw)["B1"]
            self.assertTrue(r["tinh_duoc"], (kw, r["loi"]))
            self.assertEqual(r["phai_thu_ky"] > 0, True, kw)
        # ưu đãi từ 2000-01-01 thật sự áp vào kỳ
        r = run(uu_dai=[{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "tu_ngay": "2000-01-01"}])["B1"]
        self.assertEqual([t["ap"] for t in r["thang"]], [["CU_DAN"]] * 3)
        # ngày nghỉ 2000-01-01: hợp lệ, bé "đã nghỉ học" (E < N) — không lỗi, không thu
        r = run(be1={"ngay_nghi": "2000-01-01"})["B1"]
        self.assertTrue(r["tinh_duoc"], r["loi"])
        self.assertEqual((r["den_ky"], r["phai_thu_ky"]), (False, 0))
        # đã đóng đến 2000-01-31 → N = tháng nhập học (09/2025) → quá sức chứa 15 tháng (lỗi Lk,
        # KHÔNG phải lỗi ngày)
        r = run(be1={"da_dong_den": "2000-01-31"})["B1"]
        self.assertFalse(any("không phải ngày" in e for e in r["loi"]), r["loi"])

    def test_lower_bound_fee_row(self):
        # ap_dung_tu: 1999-12-31 → dòng biểu phí lỗi (lưu ý toàn cục) → gói có dòng lỗi → chặn bé
        out, gn = run_g(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 6000000},
                                  {"ma": "MAM", "hoc_phi_thang": 7000000, "ap_dung_tu": "1999-12-31"}])
        self.assertFalse(out["B1"]["tinh_duoc"])
        self.assertIn("Biểu phí dòng 2 (MAM): dòng lỗi", gn)
        out, gn = run_g(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 6000000, "ap_dung_tu": "1900-01-01"}])
        self.assertFalse(out["B1"]["tinh_duoc"])
        self.assertIn("Biểu phí dòng 1 (MAM): dòng lỗi", gn)
        # 2000-01-01 → hai phiên bản hợp lệ, dòng mới hơn áp cho kỳ 10–12/2027
        out, gn = run_g(bieu_phi=[{"ma": "MAM", "hoc_phi_thang": 6000000},
                                  {"ma": "MAM", "hoc_phi_thang": 7000000, "ap_dung_tu": "2000-01-01"}])
        self.assertTrue(out["B1"]["tinh_duoc"], out["B1"]["loi"])
        self.assertFalse(any("Biểu phí" in n for n in gn), gn)
        self.assertEqual([t["hoc_phi"] for t in out["B1"]["thang"]], [7000000] * 3)

    def test_lower_bound_thang_ky_is_global(self):
        GERR = "Cấu hình: tháng thu (thang_ky) không phải ngày"
        two = [BASE["be"][0], dict(BASE["be"][0], ma="B2")]
        for tk in ("1999-12-31", "1999-12-01", "1900-01-01"):
            out, _ = run_g(cfg={"thang_ky": tk}, be=two)
            for k in ("B1", "B2"):          # lỗi toàn cục chặn MỌI bé
                self.assertFalse(out[k]["tinh_duoc"], (tk, k))
                self.assertIn(GERR, out[k]["loi"], (tk, k))
        out, _ = run_g(cfg={"thang_ky": "2000-01-01"}, be=two)
        for k in ("B1", "B2"):
            self.assertNotIn(GERR, out[k]["loi"], k)
            self.assertTrue(out[k]["tinh_duoc"], out[k]["loi"])
            self.assertFalse(out[k]["den_ky"])        # nhập học 2025 > tháng thu 01/2000

    def test_upper_bound_unchanged(self):
        bad = [{"be1": {"ngay_nhap_hoc": "2101-01-01"}},
               {"be1": {"da_dong_den": "2101-01-31"}},
               {"be1": {"ngay_nghi": "2101-01-01"}},
               {"be1": {"thang_moc2": "2101-01-01"}},
               {"be1": {"goi_moi": "MAM", "doi_goi_tu": "2101-01-01"}},
               {"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "den_ngay": "2101-01-01"}]},
               {"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "den_ngay": "9999-12-31"}]},
               {"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "CU_DAN", "tu_ngay": "2101-01-01"}]},
               {"bieu_phi": [{"ma": "MAM", "hoc_phi_thang": 6000000},
                             {"ma": "MAM", "hoc_phi_thang": 7000000, "ap_dung_tu": "2101-01-01"}]},
               {"cfg": {"thang_ky": "2101-01-01"}}]
        for kw in bad:
            self.assertFalse(run(**kw)["B1"]["tinh_duoc"], kw)

    def test_paid_through_2100_is_valid_not_due(self):
        r = run(be1={"da_dong_den": "2100-12-31"})["B1"]
        self.assertEqual(period(r), (True, False, "2101-01", "2101-03", [], 0))


class SpaceCodes(unittest.TestCase):
    """1.2 / 10 bản 3: mã chỉ gồm dấu cách U+0020 không hợp lệ."""

    def test_child_codes(self):
        be = [dict(BASE["be"][0], ma=m) for m in ("B1", "  ", " ", "\t", " B2 ", "\u00a0")]
        out = run(be=be)
        self.assertTrue(out["B1"]["tinh_duoc"])
        self.assertFalse(out["  "]["tinh_duoc"])
        self.assertFalse(out[" "]["tinh_duoc"])
        self.assertTrue(out["\t"]["tinh_duoc"], out["\t"]["loi"])        # chỉ U+0020 mới tính
        # bản 3.1 (dấu cách đầu/cuối): " B2 " nay KHÔNG hợp lệ (trước đó hợp lệ) — xem PaddedCodes
        self.assertFalse(out[" B2 "]["tinh_duoc"])
        self.assertTrue(out["\u00a0"]["tinh_duoc"])

    def test_reference_codes(self):
        for kw in ({"be1": {"goi": "  "}}, {"be1": {"ma_qd": " "}},
                   {"uu_dai": [{"ma_be": "B1", "ma_uu_dai": "   "}]}):
            self.assertFalse(run(**kw)["B1"]["tinh_duoc"], kw)

    def test_space_code_rows_do_not_break_others(self):
        out, gn = run_g(bieu_phi=BASE["bieu_phi"] + [{"ma": "  ", "hoc_phi_thang": 1}],
                        quyet_dinh=BASE["quyet_dinh"] + [dict(BASE["quyet_dinh"][0], ma=" ")],
                        danh_muc=BASE["danh_muc"] + [{"ma": "  ", "phan_tram": 0.1}])
        self.assertTrue(out["B1"]["tinh_duoc"], out["B1"]["loi"])
        self.assertEqual(sum("toàn dấu cách" in n for n in gn), 3, gn)


class PaddedCodes(unittest.TestCase):
    """1.2 / 10 bản 3.1 (vòng rà soát 3): mã TỰ KHAI có dấu cách U+0020 ở ĐẦU hoặc CUỐI không hợp
    lệ — hậu quả y như mã dạng số / toàn dấu cách. Ở giữa vẫn hợp lệ; tab/NBSP không phải "dấu cách".
    Chỗ tham chiếu không xét quy tắc này (chỉ là không khớp). Dò trùng không đổi.
    BASE: B1 Quý, MAM 6.000.000/tháng, đợt 10–12/2027 (mốc 2, trần 20%) → 18.000.000."""

    PADS = (("trailing", "%s "), ("leading", " %s"), ("both", " %s "))

    @staticmethod
    def notes_about_row(gn, prefix):
        return [n for n in gn if n.startswith(prefix) and "dấu cách đầu-cuối" in n]

    def test_code_state_unit(self):
        for v in ("MAM ", " MAM", " MAM ", "MAM  ", "A B "):
            self.assertEqual(T.code_state(v, tu_khai=True), "padded", repr(v))
            self.assertEqual(T.code_state(v), "ok", repr(v))           # tham chiếu: không xét
        for v in ("MAM 2", "A  B", "MAM\t", "MAM ", "\tMAM", " MAM", "1e3 x"):
            self.assertEqual(T.code_state(v, tu_khai=True), "ok", repr(v))
        # quy tắc cũ vẫn thắng trước: số / toàn dấu cách
        self.assertEqual(T.code_state(" 01", tu_khai=True), "numeric")
        self.assertEqual(T.code_state("  ", tu_khai=True), "spaces")

    # ------------------------------------------------------------ bốn loại mã tự khai
    def test_child_code_leading_trailing(self):
        for name, fmt in self.PADS:
            m = fmt % "B2"
            out = run(be=[BASE["be"][0], dict(BASE["be"][0], ma=m)])
            self.assertFalse(out[m]["tinh_duoc"], name)
            self.assertIsNone(out[m]["phai_thu_ky"], name)
            self.assertTrue(any("dấu cách ở đầu/cuối" in e for e in out[m]["loi"]), out[m]["loi"])
            self.assertTrue(out["B1"]["tinh_duoc"], name)                   # bé khác không bị kéo theo
            self.assertEqual(out["B1"]["phai_thu_ky"], 18000000, name)

    def test_fee_code_leading_trailing(self):
        for name, fmt in self.PADS:
            g = fmt % "NHA"
            out, gn = run_g(bieu_phi=BASE["bieu_phi"] + [{"ma": g, "hoc_phi_thang": 5000000}],
                            be=[BASE["be"][0], dict(BASE["be"][0], ma="B2", goi=g)])
            self.assertEqual(len(self.notes_about_row(gn, "Biểu phí dòng 2")), 1, (name, gn))
            # dòng lỗi: bé tham chiếu đúng mã đó bị chặn vì "gói có dòng biểu phí lỗi" (không ra 15.000.000)
            self.assertFalse(out["B2"]["tinh_duoc"], name)
            self.assertTrue(any("dòng biểu phí lỗi" in e for e in out["B2"]["loi"]), out["B2"]["loi"])
            self.assertEqual(out["B1"]["phai_thu_ky"], 18000000, name)

    def test_qd_code_leading_trailing(self):
        for name, fmt in self.PADS:
            q = fmt % "QD2"
            out, gn = run_g(quyet_dinh=BASE["quyet_dinh"] + [dict(BASE["quyet_dinh"][0], ma=q)],
                            be=[BASE["be"][0], dict(BASE["be"][0], ma="B2", ma_qd=q)])
            self.assertEqual(len(self.notes_about_row(gn, "QĐ dòng 2")), 1, (name, gn))
            self.assertFalse(out["B2"]["tinh_duoc"], name)
            self.assertTrue(any("bị lỗi" in e for e in out["B2"]["loi"]), out["B2"]["loi"])
            self.assertEqual(out["B1"]["phai_thu_ky"], 18000000, name)

    def test_catalog_code_leading_trailing(self):
        for name, fmt in self.PADS:
            u = fmt % "GIAM"
            out, gn = run_g(danh_muc=BASE["danh_muc"] + [{"ma": u, "loai": "Chung", "phan_tram": 0.10}],
                            be=[BASE["be"][0], dict(BASE["be"][0], ma="B2")],
                            uu_dai=[{"ma_be": "B2", "ma_uu_dai": u}])
            self.assertEqual(len(self.notes_about_row(gn, "Danh mục dòng 6")), 1, (name, gn))
            # mục lỗi: dòng gán tới đúng mã đó là dòng lỗi → bé bị chặn (không ra 16.200.000)
            self.assertFalse(out["B2"]["tinh_duoc"], name)
            self.assertTrue(any("mục danh mục" in e and "bị lỗi" in e for e in out["B2"]["loi"]),
                            out["B2"]["loi"])
            self.assertEqual(out["B1"]["phai_thu_ky"], 18000000, name)

    def test_padded_cycle_catalog_item_is_not_counted_for_g4(self):
        # mục lỗi không phải mục "Theo chu kỳ" hợp lệ → không sinh lưu ý G4 cho bé Quý
        r = run(danh_muc=[{"ma": "QUY ", "loai": "Theo chu kỳ", "phan_tram": 0.02, "ap_cho_chu_ky": "Quý"}])["B1"]
        self.assertTrue(r["tinh_duoc"])
        self.assertFalse(any("Chưa gán ưu đãi theo chu kỳ" in n for n in r["luu_y"]), r["luu_y"])
        r = run(danh_muc=[{"ma": "QUY", "loai": "Theo chu kỳ", "phan_tram": 0.02, "ap_cho_chu_ky": "Quý"}])["B1"]
        self.assertTrue(any("Chưa gán ưu đãi theo chu kỳ" in n for n in r["luu_y"]), r["luu_y"])

    # ------------------------------------------------------------ ở giữa vẫn hợp lệ
    def test_middle_space_valid_everywhere(self):
        out, gn = run_g(bieu_phi=[{"ma": "MAM 2", "hoc_phi_thang": 5000000}],
                        quyet_dinh=[dict(BASE["quyet_dinh"][0], ma="QD 2")],
                        danh_muc=[{"ma": "CU DAN", "loai": "Chung", "phan_tram": 0.10}],
                        be=[dict(BASE["be"][0], ma="B 2", goi="MAM 2", ma_qd="QD 2")],
                        uu_dai=[{"ma_be": "B 2", "ma_uu_dai": "CU DAN"}])
        r = out["B 2"]
        self.assertTrue(r["tinh_duoc"], r["loi"])
        self.assertEqual(r["phai_thu_ky"], 13500000)                  # 5.000.000 × 0,9 × 3
        self.assertEqual(months(r)["2027-10"]["ap"], ["CU DAN"])
        self.assertFalse([n for n in gn if "dấu cách" in n], gn)

    # ------------------------------------------------------------ dò trùng không đổi
    def test_be01_and_be01_space(self):
        b = BASE["be"][0]
        # không dòng gán nào: kết quả thuần (bản trước cho cả hai 18.000.000)
        out = run(be=[dict(b, ma="BE01"), dict(b, ma="BE01 ")])
        self.assertEqual({k: (v["tinh_duoc"], v["phai_thu_ky"]) for k, v in out.items()},
                         {"BE01": (True, 18000000), "BE01 ": (False, None)})
        # có dòng gán: dòng của "BE01" chỉ áp cho BE01; dòng lỗi của "BE01 " không lây sang BE01
        out, gn = run_g(be=[dict(b, ma="BE01"), dict(b, ma="BE01 ")],
                        uu_dai=[{"ma_be": "BE01", "ma_uu_dai": "CU_DAN"},
                                {"ma_be": "BE01 ", "ma_uu_dai": "NOPE"}])
        self.assertEqual(sorted(out), ["BE01", "BE01 "])
        self.assertFalse(out["BE01 "]["tinh_duoc"])
        self.assertFalse(any("trùng" in e for e in out["BE01 "]["loi"]), out["BE01 "]["loi"])
        self.assertTrue(any("dấu cách ở đầu/cuối" in e for e in out["BE01 "]["loi"]), out["BE01 "]["loi"])
        r = out["BE01"]
        self.assertTrue(r["tinh_duoc"], r["loi"])                      # không bị coi là trùng
        self.assertFalse(any("trùng" in e for e in r["loi"]))
        self.assertEqual(r["phai_thu_ky"], 17100000)                   # chỉ CU_DAN 5% của chính BE01
        self.assertEqual(months(r)["2027-10"]["ap"], ["CU_DAN"])
        # hoa/thường: "be01 " vẫn chỉ chặn chính nó
        out = run(be=[dict(b, ma="BE01"), dict(b, ma="be01 ")])
        self.assertEqual((out["BE01"]["tinh_duoc"], out["be01 "]["tinh_duoc"]), (True, False))
        # hai "BE01 " giống hệt: một khoá, bị chặn
        out = run(be=[dict(b, ma="BE01 "), dict(b, ma="BE01 ")])
        self.assertEqual(list(out), ["BE01 "])
        self.assertFalse(out["BE01 "]["tinh_duoc"])

    # ------------------------------------------------------------ dòng giá "MAM " cạnh "MAM"
    def test_fee_version_row_with_trailing_space(self):
        bp = [{"ma": "MAM", "hoc_phi_thang": 6000000},
              {"ma": "MAM ", "hoc_phi_thang": 7000000, "ap_dung_tu": "2027-11-01"}]
        b = BASE["be"][0]
        out, gn = run_g(bieu_phi=bp, be=[b, dict(b, ma="B2", goi="MAM ")])
        self.assertEqual(len(self.notes_about_row(gn, "Biểu phí dòng 2")), 1, gn)
        self.assertFalse([n for n in gn if n.startswith("Biểu phí dòng 1")], gn)
        r = out["B1"]                                                  # bé trên "MAM": không đổi
        self.assertTrue(r["tinh_duoc"], r["loi"])
        self.assertEqual([t["hoc_phi"] for t in r["thang"]], [6000000, 6000000, 6000000])
        self.assertEqual(r["phai_thu_ky"], 18000000)                   # KHÔNG ăn giá 7.000.000 của "MAM "
        self.assertFalse(r["loi"])
        r2 = out["B2"]                                                 # bé gõ đúng "MAM ": gói có dòng lỗi
        self.assertFalse(r2["tinh_duoc"])
        self.assertTrue(any("dòng biểu phí lỗi" in e for e in r2["loi"]), r2["loi"])
        # cũng vậy khi "MAM " là dòng giá đầu tiên (không ap_dung_tu) — bé "MAM " không ra 21.000.000
        bp = [{"ma": "MAM", "hoc_phi_thang": 6000000}, {"ma": "MAM ", "hoc_phi_thang": 7000000}]
        out = run(bieu_phi=bp, be=[b, dict(b, ma="B2", goi="MAM ")])
        self.assertEqual(out["B1"]["phai_thu_ky"], 18000000)
        self.assertFalse(out["B2"]["tinh_duoc"])

    # ------------------------------------------------------------ tab / NBSP ở cuối vẫn hợp lệ
    def test_tab_nbsp_at_end_valid(self):
        for ws in ("\t", " "):
            g, q, u, m = "MAM" + ws, "QD1" + ws, "GIAM" + ws, "B2" + ws
            out, gn = run_g(bieu_phi=BASE["bieu_phi"] + [{"ma": g, "hoc_phi_thang": 5000000}],
                            quyet_dinh=BASE["quyet_dinh"] + [dict(BASE["quyet_dinh"][0], ma=q)],
                            danh_muc=BASE["danh_muc"] + [{"ma": u, "loai": "Chung", "phan_tram": 0.10}],
                            be=[BASE["be"][0], dict(BASE["be"][0], ma=m, goi=g, ma_qd=q)],
                            uu_dai=[{"ma_be": m, "ma_uu_dai": u}])
            r = out[m]
            self.assertTrue(r["tinh_duoc"], (repr(ws), r["loi"]))
            self.assertEqual(r["phai_thu_ky"], 13500000, repr(ws))     # 5.000.000 × 0,9 × 3
            self.assertEqual(months(r)["2027-10"]["ap"], [u])
            self.assertEqual(out["B1"]["phai_thu_ky"], 18000000)       # "MAM\t" là gói khác "MAM"
            self.assertFalse([n for n in gn if "dấu cách" in n], gn)
        # đầu dòng cũng vậy (chỉ U+0020 mới tính)
        out = run(be=[dict(BASE["be"][0], ma="\tB3"), dict(BASE["be"][0], ma=" B4")])
        self.assertTrue(out["\tB3"]["tinh_duoc"])
        self.assertTrue(out[" B4"]["tinh_duoc"])

    # ------------------------------------------------------------ chỗ tham chiếu: không xét quy tắc
    def test_references_not_checked_just_unmatched(self):
        cases = (({"goi": "MAM "}, "không có trong biểu phí"),
                 ({"goi_moi": " MAM", "doi_goi_tu": "2027-11-01"}, "không có trong biểu phí"),
                 ({"ma_qd": "QD1 "}, "không có"))
        for be1, msg in cases:
            r = run(be1=be1)["B1"]
            self.assertFalse(r["tinh_duoc"], be1)
            self.assertTrue(any(msg in e for e in r["loi"]), (be1, r["loi"]))
            self.assertFalse(any("dấu cách" in e for e in r["loi"]), (be1, r["loi"]))
        r = run(uu_dai=[{"ma_be": "B1", "ma_uu_dai": "CU_DAN "}])["B1"]
        self.assertFalse(r["tinh_duoc"])
        self.assertTrue(any("không có trong danh mục" in e for e in r["loi"]), r["loi"])
        self.assertFalse(any("dấu cách" in e for e in r["loi"]), r["loi"])
        # ma_be có dấu cách thừa không khớp bé nào → LƯU Ý TOÀN CỤC, B1 không bị ảnh hưởng
        out, gn = run_g(uu_dai=[{"ma_be": "B1 ", "ma_uu_dai": "CU_DAN"}])
        self.assertEqual(out["B1"]["phai_thu_ky"], 18000000)
        self.assertTrue(any("không khớp bé nào" in n for n in gn), gn)


class WindowNE(unittest.TestCase):
    """6.4 bản 3: cửa sổ = [đầu(N), cuối(E)]."""

    def _cat(self, n):
        return BASE["danh_muc"] + [{"ma": "U%d" % i, "phan_tram": 0.01} for i in range(n)]

    def rows(self, **last):
        rows = [{"ma_be": "B1", "ma_uu_dai": "U%d" % i} for i in range(6)]
        rows.append(dict({"ma_be": "B1", "ma_uu_dai": "U6"}, **last))
        return rows

    def test_edges(self):
        cat = self._cat(7)
        self.assertFalse(run(danh_muc=cat, uu_dai=self.rows(tu_ngay="2027-12-31"))["B1"]["tinh_duoc"])
        self.assertTrue(run(danh_muc=cat, uu_dai=self.rows(tu_ngay="2028-01-01"))["B1"]["tinh_duoc"])
        self.assertFalse(run(danh_muc=cat, uu_dai=self.rows(den_ngay="2027-10-01"))["B1"]["tinh_duoc"])
        self.assertTrue(run(danh_muc=cat, uu_dai=self.rows(den_ngay="2027-09-30"))["B1"]["tinh_duoc"])
        # 6 tháng: cửa sổ tới 03/2028 → dòng từ 01/2028 chiếm ô
        self.assertFalse(run(danh_muc=cat, uu_dai=self.rows(tu_ngay="2028-01-01"),
                             be1={"chu_ky": "6 tháng"})["B1"]["tinh_duoc"])
        # nghỉ học 11/2027 → cửa sổ tới 30/11/2027
        self.assertTrue(run(danh_muc=cat, uu_dai=self.rows(tu_ngay="2027-12-01"),
                            be1={"ngay_nghi": "2027-11-10"})["B1"]["tinh_duoc"])

    def test_arrears_window_starts_at_N(self):
        # nợ từ 07/2027: dòng hết hạn 31/07/2027 vẫn trong cửa sổ → 7 dòng → LỖI
        cat = self._cat(7)
        self.assertFalse(run(danh_muc=cat, uu_dai=self.rows(den_ngay="2027-07-31"),
                             be1={"da_dong_den": "2027-06-30"})["B1"]["tinh_duoc"])

    def test_not_due_child_window_and_empty_window(self):
        cat = self._cat(7)
        # chưa đến kỳ (N=11/2027, E=12/2027): cửa sổ vẫn là [N, E] → 7 dòng → LỖI (đọc đúng chữ 3.4/6.4)
        self.assertFalse(run(danh_muc=cat, uu_dai=self.rows(),
                             be1={"ngay_nhap_hoc": "2027-11-15"})["B1"]["tinh_duoc"])
        # nghỉ trước N: cửa sổ rỗng → không có dòng nào chiếm ô
        r = run(danh_muc=cat, uu_dai=self.rows(), be1={"ngay_nghi": "2027-09-15"})["B1"]
        self.assertEqual((r["tinh_duoc"], r["den_ky"], r["thang"]), (True, False, []))



if __name__ == "__main__":
    unittest.main(verbosity=1)
