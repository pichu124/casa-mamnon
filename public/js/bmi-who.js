// BMI THEO BẢNG TĂNG TRƯỞNG WHO — tô màu ô BMI ở phân hệ Sức khỏe (Đ260e).
//
// VÌ SAO CÓ TỆP NÀY
//
// Góp ý của trường 18/11: "Bổ sung thêm về BMI, cảnh báo nếu quá ngưỡng bình
// thường: bé trong khung cho phép để màu xanh, dưới khung màu cam, trên khung
// màu đỏ … để GV nắm thông tin trao đổi với phụ huynh điều chỉnh chế độ ăn."
//
// Chủ dự án duyệt ngày 25/11: tô màu theo WHO, CẢ GIA ĐÌNH CŨNG THẤY MÀU. Đây
// là NGOẠI LỆ CÓ DUYỆT của QUY TẮC 4, và chỉ cho đúng một thứ: chỉ số BMI ở
// phân hệ Sức khỏe. Ranh giới của ngoại lệ:
//
//   • TÍNH Ở TRÌNH DUYỆT, không lưu. Máy chủ không tính, không gửi, không ghi
//     vào `bmiNote` (ô ấy vẫn là chữ do cô và y tế trường tự gõ). Một nhãn
//     không lưu thì không ai lọc, sắp xếp hay đem bé này ra đặt cạnh bé khác.
//   • Chữ trên màn chỉ nói "BMI trong ngưỡng / dưới ngưỡng / trên ngưỡng (theo
//     bảng tăng trưởng WHO)" — nói về CON SỐ, không gán nhãn cho cơ thể bé —
//     và luôn kèm MỘT việc cô và gia đình làm được (QUY TẮC 5).
//   • Không phần trăm, không con số độ lệch nào hiện ra màn hình.
//   • Thiếu giới tính, ngày sinh hay một trong hai số đo, hoặc tuổi lúc đo nằm
//     ngoài 0–72 tháng: KHÔNG tô màu, chỉ hiện con số như cũ.
//
// NGUỒN SỐ LIỆU (bảng L, M, S của BMI theo tháng tuổi, 0–72 tháng):
//
//   • Tháng 0–23: WHO Child Growth Standards (2006), BMI-for-age, đo chiều
//     dài nằm — https://www.who.int/tools/child-growth-standards/standards/body-mass-index-for-age-bmi
//   • Tháng 24–60: cùng bộ chuẩn 2006, đo chiều cao đứng.
//   • Tháng 61–72: WHO Growth Reference 2007 (5–19 tuổi), BMI-for-age —
//     https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age
//   Bảng được kiểm chéo hai nguồn trước khi chép vào; tháng 0–60 khớp từng số
//   với bảng WHO đóng gói trong pygrowup 0.8.2.
//
// CÔNG THỨC
//
//   độ lệch = ((BMI / M)^L − 1) / (L · S)
//   tuổi    = số ngày từ ngày sinh tới ngày đo / 30.4375, làm tròn xuống
//   < −2                         → dưới ngưỡng (cam)
//   > +2 (tới 60 tháng)
//   > +1 (61–72 tháng, bảng 2007) → trên ngưỡng (đỏ)
//   còn lại                      → trong ngưỡng (xanh)
//
// Dùng được ở cả trình duyệt (`window.BmiWho`) lẫn Node (`require`), để bài
// test máy chủ gọi đúng hàm mà màn hình gọi.
(function (goc, tao) {
  const m = tao();
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else goc.BmiWho = m;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // [L, M, S] theo tháng tuổi, chỉ số mảng = số tháng (0..72).
  const BANG = {
    nam: [
      [-0.3053, 13.4069, 0.0956], [0.2708, 14.9441, 0.09027], [0.1118, 16.3195, 0.08677], [0.0068, 16.8987, 0.08495],  // tháng 0–3
      [-0.0727, 17.1579, 0.08378], [-0.137, 17.2919, 0.08296], [-0.1913, 17.3422, 0.08234], [-0.2385, 17.3288, 0.08183],  // tháng 4–7
      [-0.2802, 17.2647, 0.0814], [-0.3176, 17.1662, 0.08102], [-0.3516, 17.0488, 0.08068], [-0.3828, 16.9239, 0.08037],  // tháng 8–11
      [-0.4115, 16.7981, 0.08009], [-0.4382, 16.6743, 0.07982], [-0.463, 16.5548, 0.07958], [-0.4863, 16.4409, 0.07935],  // tháng 12–15
      [-0.5082, 16.3335, 0.07913], [-0.5289, 16.2329, 0.07892], [-0.5484, 16.1392, 0.07873], [-0.5669, 16.0528, 0.07854],  // tháng 16–19
      [-0.5846, 15.9743, 0.07836], [-0.6014, 15.9039, 0.07818], [-0.6174, 15.8412, 0.07802], [-0.6328, 15.7852, 0.07786],  // tháng 20–23
      [-0.6187, 16.0189, 0.07785], [-0.584, 15.98, 0.07792], [-0.5497, 15.9414, 0.078], [-0.5166, 15.9036, 0.07808],  // tháng 24–27
      [-0.485, 15.8667, 0.07818], [-0.4552, 15.8306, 0.07829], [-0.4274, 15.7953, 0.07841], [-0.4016, 15.7606, 0.07854],  // tháng 28–31
      [-0.3782, 15.7267, 0.07867], [-0.3572, 15.6934, 0.07882], [-0.3388, 15.661, 0.07897], [-0.3231, 15.6294, 0.07914],  // tháng 32–35
      [-0.3101, 15.5988, 0.07931], [-0.3, 15.5693, 0.0795], [-0.2927, 15.541, 0.07969], [-0.2884, 15.514, 0.0799],  // tháng 36–39
      [-0.2869, 15.4885, 0.08012], [-0.2881, 15.4645, 0.08036], [-0.2919, 15.442, 0.08061], [-0.2981, 15.421, 0.08087],  // tháng 40–43
      [-0.3067, 15.4013, 0.08115], [-0.3174, 15.3827, 0.08144], [-0.3303, 15.3652, 0.08174], [-0.3452, 15.3485, 0.08205],  // tháng 44–47
      [-0.3622, 15.3326, 0.08238], [-0.3811, 15.3174, 0.08272], [-0.4019, 15.3029, 0.08307], [-0.4245, 15.2891, 0.08343],  // tháng 48–51
      [-0.4488, 15.2759, 0.0838], [-0.4747, 15.2633, 0.08418], [-0.5019, 15.2514, 0.08457], [-0.5303, 15.24, 0.08496],  // tháng 52–55
      [-0.5599, 15.2291, 0.08536], [-0.5905, 15.2188, 0.08577], [-0.6223, 15.2091, 0.08617], [-0.6552, 15.2, 0.08659],  // tháng 56–59
      [-0.6892, 15.1916, 0.087], [-0.7387, 15.2641, 0.0839], [-0.7621, 15.2616, 0.08414], [-0.7856, 15.2604, 0.08439],  // tháng 60–63
      [-0.8089, 15.2605, 0.08464], [-0.8322, 15.2619, 0.0849], [-0.8554, 15.2645, 0.08516], [-0.8785, 15.2684, 0.08543],  // tháng 64–67
      [-0.9015, 15.2737, 0.0857], [-0.9243, 15.2801, 0.08597], [-0.9471, 15.2877, 0.08625], [-0.9697, 15.2965, 0.08653],  // tháng 68–71
      [-0.9921, 15.3062, 0.08682],  // tháng 72–72
    ],
    nu: [
      [-0.0631, 13.3363, 0.09272], [0.3448, 14.5679, 0.09556], [0.1749, 15.7679, 0.09371], [0.0643, 16.3574, 0.09254],  // tháng 0–3
      [-0.0191, 16.6703, 0.09166], [-0.0864, 16.8386, 0.09096], [-0.1429, 16.9083, 0.09036], [-0.1916, 16.902, 0.08984],  // tháng 4–7
      [-0.2344, 16.8404, 0.08939], [-0.2725, 16.7406, 0.08898], [-0.3068, 16.6184, 0.08861], [-0.3381, 16.4875, 0.08828],  // tháng 8–11
      [-0.3667, 16.3568, 0.08797], [-0.3932, 16.2311, 0.08768], [-0.4177, 16.1128, 0.08741], [-0.4407, 16.0028, 0.08716],  // tháng 12–15
      [-0.4623, 15.9017, 0.08693], [-0.4825, 15.8096, 0.08671], [-0.5017, 15.7263, 0.0865], [-0.5199, 15.6517, 0.0863],  // tháng 16–19
      [-0.5372, 15.5855, 0.08612], [-0.5537, 15.5278, 0.08594], [-0.5695, 15.4787, 0.08577], [-0.5846, 15.438, 0.0856],  // tháng 20–23
      [-0.5684, 15.6881, 0.08454], [-0.5684, 15.659, 0.08452], [-0.5684, 15.6308, 0.08449], [-0.5684, 15.6037, 0.08446],  // tháng 24–27
      [-0.5684, 15.5777, 0.08444], [-0.5684, 15.5523, 0.08443], [-0.5684, 15.5276, 0.08444], [-0.5684, 15.5034, 0.08448],  // tháng 28–31
      [-0.5684, 15.4798, 0.08455], [-0.5684, 15.4572, 0.08467], [-0.5684, 15.4356, 0.08484], [-0.5684, 15.4155, 0.08506],  // tháng 32–35
      [-0.5684, 15.3968, 0.08535], [-0.5684, 15.3796, 0.08569], [-0.5684, 15.3638, 0.08609], [-0.5684, 15.3493, 0.08654],  // tháng 36–39
      [-0.5684, 15.3358, 0.08704], [-0.5684, 15.3233, 0.08757], [-0.5684, 15.3116, 0.08813], [-0.5684, 15.3007, 0.08872],  // tháng 40–43
      [-0.5684, 15.2905, 0.08931], [-0.5684, 15.2814, 0.08991], [-0.5684, 15.2732, 0.09051], [-0.5684, 15.2661, 0.0911],  // tháng 44–47
      [-0.5684, 15.2602, 0.09168], [-0.5684, 15.2556, 0.09227], [-0.5684, 15.2523, 0.09286], [-0.5684, 15.2503, 0.09345],  // tháng 48–51
      [-0.5684, 15.2496, 0.09403], [-0.5684, 15.2502, 0.0946], [-0.5684, 15.2519, 0.09515], [-0.5684, 15.2544, 0.09568],  // tháng 52–55
      [-0.5684, 15.2575, 0.09618], [-0.5684, 15.2612, 0.09665], [-0.5684, 15.2653, 0.09709], [-0.5684, 15.2698, 0.0975],  // tháng 56–59
      [-0.5684, 15.2747, 0.09789], [-0.8886, 15.2441, 0.09692], [-0.9068, 15.2434, 0.09738], [-0.9248, 15.2433, 0.09783],  // tháng 60–63
      [-0.9427, 15.2438, 0.09829], [-0.9605, 15.2448, 0.09875], [-0.978, 15.2464, 0.0992], [-0.9954, 15.2487, 0.09966],  // tháng 64–67
      [-1.0126, 15.2516, 0.10012], [-1.0296, 15.2551, 0.10058], [-1.0464, 15.2592, 0.10104], [-1.063, 15.2641, 0.10149],  // tháng 68–71
      [-1.0794, 15.2697, 0.10195],  // tháng 72–72
    ],
  };

  const THANG_TOI_DA = 72;
  const NGAY_MOI_THANG = 30.4375;
  // Bảng 2006 (tới 60 tháng) dùng mốc +2; bảng 2007 (từ 61 tháng) dùng mốc +1.
  const THANG_DOI_MOC = 60;

  const MUC = {
    trong: {
      muc: 'trong', mau: 'xanh', nhan: 'BMI trong ngưỡng',
      goiY: 'Cô và gia đình giữ nếp ăn ngủ, vận động như hiện nay, theo dõi ở lần cân tháng sau.',
    },
    duoi: {
      muc: 'duoi', mau: 'cam', nhan: 'BMI dưới ngưỡng',
      goiY: 'Cô và gia đình cùng xem lại bữa ăn của bé, theo dõi ở lần cân tháng sau.',
    },
    tren: {
      muc: 'tren', mau: 'do', nhan: 'BMI trên ngưỡng',
      goiY: 'Cô và gia đình cùng cân đối bữa ăn và tăng giờ vận động cho bé, theo dõi ở lần cân tháng sau.',
    },
  };
  const NGUON = 'theo bảng tăng trưởng WHO';

  // Giới tính lưu ở `students.gender` dạng chữ do văn phòng gõ hoặc nạp từ tệp:
  // "Nam" / "Nữ", có khi không dấu, có khi tiếng Anh. Không nhận ra thì null —
  // thà không tô màu còn hơn tô theo bảng của giới kia.
  function gioiCua(g) {
    const t = String(g == null ? '' : g).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd').trim().toLowerCase();
    if (['nam', 'trai', 'be trai', 'male', 'm', 'boy'].includes(t)) return 'nam';
    if (['nu', 'gai', 'be gai', 'female', 'f', 'girl'].includes(t)) return 'nu';
    return null;
  }

  // Ngày "YYYY-MM-DD" (có thể kèm giờ phía sau) → số ngày kể từ mốc, tính theo
  // lịch chứ không theo múi giờ của máy.
  function soNgayCua(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isFinite(t) ? Math.round(t / 86400000) : null;
  }

  function thangTuoi(ngaySinh, ngayDo) {
    const a = soNgayCua(ngaySinh), b = soNgayCua(ngayDo);
    if (a === null || b === null || b < a) return null;
    return Math.floor((b - a) / NGAY_MOI_THANG);
  }

  function chiSoBmi(cao, nang) {
    const h = Number(cao), w = Number(nang);
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return null;
    const v = w / ((h / 100) * (h / 100));
    return Number.isFinite(v) ? v : null;
  }

  // Độ lệch của một BMI so với trung vị cùng tháng tuổi, cùng giới (công thức
  // LMS của WHO). Chỉ dùng để chọn màu — không bao giờ in ra màn hình.
  function doLech(bmi, thang, gioi) {
    const g = gioiCua(gioi);
    const dong = g && Number.isInteger(thang) && thang >= 0 && thang <= THANG_TOI_DA ? BANG[g][thang] : null;
    if (!dong || !Number.isFinite(bmi) || bmi <= 0) return null;
    const [L, M, S] = dong;
    return (Math.pow(bmi / M, L) - 1) / (L * S);
  }

  function mucTheoDoLech(d, thang) {
    if (d === null || !Number.isFinite(d)) return null;
    if (d < -2) return MUC.duoi;
    if (d > (thang <= THANG_DOI_MOC ? 2 : 1)) return MUC.tren;
    return MUC.trong;
  }

  // Một lần cân đo của một bé → mức để tô màu, hoặc null nếu thiếu dữ liệu.
  //   x = { height, weight, date }   be = { dob, gender }
  function phanLoai(x, be) {
    if (!x || !be) return null;
    const bmi = chiSoBmi(x.height, x.weight);
    const thang = thangTuoi(be.dob, x.date);
    if (bmi === null || thang === null || thang > THANG_TOI_DA) return null;
    const m = mucTheoDoLech(doLech(bmi, thang, be.gender), thang);
    return m ? { ...m, nguon: NGUON, thang } : null;
  }

  return { BANG, MUC, NGUON, THANG_TOI_DA, gioiCua, thangTuoi, chiSoBmi, doLech, phanLoai };
});
