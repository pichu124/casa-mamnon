// TÁC VỤ ĐỊNH GIỜ — MỘT ĐỒNG HỒ CHO CẢ MÁY CHỦ (Đ154).
//
// VÌ SAO CẦN TỆP NÀY
//
// Trước đợt này máy chủ không có đồng hồ nào. Chỗ đầu tiên cần đến nó là
// "hẹn ngày công bố" của báo cáo học tập: quản lý duyệt hôm nay và hẹn công
// bố ngày 20, thì đúng ngày 20 gia đình phải được báo. Cách cũ là báo LƯỜI —
// tin chỉ được gửi khi có người tình cờ mở một trong bốn màn có gọi
// `baoNeuToiNgay`. Hai hệ quả, cả hai đều thật:
//
//   • Không ai mở màn thì gia đình không bao giờ được báo. Bản báo cáo nằm đó
//     "đã công bố" theo máy, mà nhà không biết.
//   • Khi chính gia đình mở màn thì tin đẩy về điện thoại đúng lúc họ đang
//     nhìn vào bản báo cáo — thông báo cho một việc vừa xảy ra trước mắt.
//
// CÁCH LÀM: nhỏ nhất có thể, và không được kéo sập ai
//
// Không thêm phụ thuộc, không tiến trình thứ hai, không bảng dữ liệu. Chỉ một
// `setInterval` duy nhất, gọi lần lượt các việc đã đăng ký.
//
//   • Mỗi việc chạy trong khối bắt lỗi RIÊNG. Một việc ném lỗi thì các việc
//     còn lại vẫn chạy, và máy chủ không hề hấn gì (Nguyên tắc số 1).
//   • Đồng hồ `.unref()`, nên nó KHÔNG giữ tiến trình sống. Máy chủ đóng là
//     đóng, bài kiểm thử không bị treo vì một cái hẹn còn chờ.
//   • `chay()` gọi tay được. Bài kiểm thử gọi thẳng nó thay vì ngồi đợi 15
//     phút — thứ duy nhất phải đợi là thời gian thật, mà thời gian thật thì
//     không kiểm được.
//
// VIỆC ĐĂNG KÝ Ở ĐÂY PHẢI TỰ CHỊU TRÁCH NHIỆM VỀ HAI ĐIỀU
//
//   1. **Chạy lại nhiều lần không được sinh hậu quả hai lần.** Đồng hồ gọi lại
//      sau mỗi 15 phút, và gọi cả lúc máy chủ vừa khởi động — máy chủ khởi
//      động lại năm lần trong một buổi là chuyện bình thường. Việc nào gửi tin
//      thì phải tự có dấu "đã gửi" trong cơ sở dữ liệu.
//   2. **Tự hỏi phân hệ của mình còn bật không.** Tắt một phân hệ là chặn API
//      của nó, nhưng đồng hồ thì không đi qua API. Việc của phân hệ đã tắt mà
//      vẫn chạy là dữ liệu vẫn sinh ra sau lưng nhà trường.
const MOI_PHUT_MAC_DINH = 15;

const NHIEM_VU = [];
let hen = null;
let lanCuoi = null;

// Đăng ký một việc chạy theo chu kỳ. Trùng tên thì GHI ĐÈ, không thêm lần hai:
// `napApiMoRong` nạp lại phân hệ được (bài kiểm thử làm việc đó liên tục), và
// hai bản của cùng một việc là gửi tin hai lần.
function dangKy(ten, viec) {
  if (!ten || typeof viec !== 'function') return false;
  const i = NHIEM_VU.findIndex(x => x.ten === ten);
  const rec = { ten: String(ten), viec, soLan: 0, loiCuoi: null };
  if (i >= 0) NHIEM_VU[i] = rec; else NHIEM_VU.push(rec);
  return true;
}

// Chạy hết một lượt. KHÔNG BAO GIỜ NÉM: đây là chỗ được gọi từ trong đồng hồ,
// mà lỗi ném ra từ callback của `setInterval` là lỗi không ai bắt — Node mặc
// định cho sập cả tiến trình.
function chay() {
  const ketQua = [];
  for (const nv of NHIEM_VU) {
    try {
      nv.viec();
      nv.soLan += 1;
      nv.loiCuoi = null;
      ketQua.push({ ten: nv.ten, ok: true });
    } catch (err) {
      nv.loiCuoi = err && err.message ? err.message : String(err);
      console.error(`[hen-gio] việc "${nv.ten}" lỗi: ${nv.loiCuoi}`);
      console.error('  Các việc định giờ khác vẫn chạy bình thường.');
      ketQua.push({ ten: nv.ten, ok: false, error: nv.loiCuoi });
    }
  }
  lanCuoi = new Date().toISOString();
  return ketQua;
}

// Bật đồng hồ. Gọi hai lần thì lần sau thay lần trước, không chồng hai đồng hồ.
function batDau({ moiPhut = MOI_PHUT_MAC_DINH, chayNgay = true } = {}) {
  dung();
  const phut = Number(moiPhut) > 0 ? Number(moiPhut) : MOI_PHUT_MAC_DINH;
  if (chayNgay) chay();
  hen = setInterval(chay, phut * 60 * 1000);
  if (typeof hen.unref === 'function') hen.unref();
  return hen;
}

function dung() {
  if (hen) clearInterval(hen);
  hen = null;
}

function dangBat() { return !!hen; }

// Cho màn Quản trị → Tình trạng xem đồng hồ có chạy không và việc nào đang hỏng.
function danhSach() {
  return NHIEM_VU.map(nv => ({ ten: nv.ten, soLan: nv.soLan, loiCuoi: nv.loiCuoi }));
}

function lanChayCuoi() { return lanCuoi; }

module.exports = { dangKy, chay, batDau, dung, dangBat, danhSach, lanChayCuoi, MOI_PHUT_MAC_DINH };
