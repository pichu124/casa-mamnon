// Sinh dữ liệu mẫu vào cơ sở dữ liệu. Ngày tháng được tính tương đối so với hôm
// nay để dữ liệu demo luôn "sống". Chạy lại: npm run seed
const password = require('../lib/password');
const { importSnapshot } = require('../lib/importer');

// Mật khẩu dùng thử; có thể đổi khi triển khai bằng biến môi trường DEMO_PASSWORD.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || '123456';

function fmt(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function iso(d, h, min) { const x = new Date(d); x.setHours(h, min || 0, 0, 0); return x.toISOString(); }
// n ngày học (T2-T6) gần nhất, mới nhất trước
function recentWeekdays(n) {
  const out = [];
  for (let i = 0; out.length < n && i < n * 3; i++) {
    const d = daysAgo(i);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d);
  }
  return out;
}
// Thứ Hai của tuần chứa d
function mondayOf(d) {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function pick(arr, i) { return arr[i % arr.length]; }

function generate() {
  const today = new Date();
  const YEAR = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1; // năm học bắt đầu tháng 8
  const schoolYear = `${YEAR}-${YEAR + 1}`;

  const school = {
    name: 'Trường Mầm non CASA',
    address: 'Cơ sở 1 — 25 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM',
    phone: '028 3844 5566',
    email: 'lienhe@casamamnon.edu.vn',
    years: [`${YEAR - 1}-${YEAR}`, schoolYear],
    currentYear: schoolYear,
  };

  // Ba cơ sở thật của trường. Số điện thoại và email ở đây là HOTLINE VĂN PHÒNG
  // của từng cơ sở — thứ phụ huynh cần khi có việc gấp, và cũng là thứ thay chỗ
  // cho số điện thoại riêng của cô trên màn hình hồ sơ bé.
  const campuses = [
    { id: 'cs1', name: 'Cơ sở 1', address: '25 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM',
      phone: '028 3844 5566', email: 'coso1@casamamnon.edu.vn' },
    { id: 'cs2', name: 'Cơ sở 2', address: '112 Nguyễn Thị Minh Khai, Q. 3, TP.HCM',
      phone: '028 3844 5577', email: 'coso2@casamamnon.edu.vn' },
    { id: 'cs3', name: 'Cơ sở 3', address: '48 Phan Xích Long, Q. Phú Nhuận, TP.HCM',
      phone: '028 3844 5588', email: 'coso3@casamamnon.edu.vn' },
  ];

  // Tên nhóm đi theo bậc mầm non (Nhà trẻ → Mầm → Chồi → Lá), số phía sau là
  // nhóm song song thứ mấy trong cùng bậc — KHÔNG phải khối lớp. `grade` giữ
  // lại tuổi của bậc cho những màn hình cũ còn đọc.
  //
  // Câu chuyện của bộ dữ liệu mẫu nằm ở CƠ SỞ 1 (bé An, nhóm Chồi 2). Nhóm
  // Mầm 1 ở cơ sở 2 tồn tại để phép thử "cơ sở A không thấy cơ sở B" có thật
  // hai cơ sở mà so — một tính năng cách ly mà dữ liệu mẫu chỉ có một cơ sở thì
  // không bài kiểm thử nào chứng minh được.
  const classes = [
    { id: 'c1', name: 'Chồi 2', teacherId: 't1', teacherIds: ['t1', 't3'], campusId: 'cs1', room: 'Cơ sở 1 — Phòng Hoa Sen', grade: 4, year: schoolYear },
    { id: 'c2', name: 'Lá 1', teacherId: 't2', teacherIds: ['t2', 't3'], campusId: 'cs1', room: 'Cơ sở 1 — Phòng Hướng Dương', grade: 5, year: schoolYear },
    { id: 'c3', name: 'Mầm 1', teacherId: null, teacherIds: [], campusId: 'cs2', room: 'Cơ sở 2 — Phòng Hoa Mai', grade: 3, year: schoolYear },
  ];

  // Các tài khoản mẫu dùng chung một mật khẩu nên chỉ cần băm một lần.
  // Mật khẩu không bao giờ được lưu ở dạng đọc được.
  const DEMO_HASH = password.hash(DEMO_PASSWORD);

  // Ba cô, hai nhóm — và cô Bích Ngọc phụ trách CẢ HAI nhóm. Đó là mô hình thật
  // của trường mầm non, và cũng là thứ dữ liệu mẫu cũ (một cô một lớp) không kể
  // được: xem G0.4 trong docs/TIEN-DO.md.
  const users = [
    { id: 't1', username: 'giaovien', passwordHash: DEMO_HASH, role: 'teacher', name: 'Nguyễn Thị Mai Anh', title: 'Cô', phone: '0903 111 222', email: 'maianh@casamamnon.edu.vn', classId: 'c1', avatar: { emoji: '👩‍🏫', bg: '#7c5cbf' } },
    { id: 't2', username: 'giaovien2', passwordHash: DEMO_HASH, role: 'teacher', name: 'Trần Thu Hương', title: 'Cô', phone: '0903 333 444', email: 'thuhuong@casamamnon.edu.vn', classId: 'c2', avatar: { emoji: '👩‍🏫', bg: '#2980b9' } },
    { id: 't3', username: 'giaovien3', passwordHash: DEMO_HASH, role: 'teacher', name: 'Lê Thị Bích Ngọc', title: 'Cô', phone: '0903 555 666', email: 'bichngoc@casamamnon.edu.vn', classId: null, avatar: { emoji: '👩‍🏫', bg: '#16a085' } },
    { id: 'p1', username: 'phuhuynh', passwordHash: DEMO_HASH, role: 'parent', name: 'Lê Thị Thu Hà', title: 'Chị', phone: '0912 345 678', email: 'thuha@gmail.com', avatar: { emoji: '👩', bg: '#e0576f' } },
    { id: 'p2', username: 'phuhuynh2', passwordHash: DEMO_HASH, role: 'parent', name: 'Phạm Quốc Bảo', title: 'Anh', phone: '0987 654 321', email: 'quocbao@gmail.com', avatar: { emoji: '👨', bg: '#27ae60' } },
    { id: 'p3', username: 'ph.tuan', passwordHash: DEMO_HASH, role: 'parent', name: 'Vũ Anh Tuấn', title: 'Anh', phone: '0909 100 300', email: 'anhtuan@gmail.com', avatar: { emoji: '👨', bg: '#d68910' } },
    { id: 'p4', username: 'ph.lan', passwordHash: DEMO_HASH, role: 'parent', name: 'Đỗ Ngọc Lan', title: 'Chị', phone: '0909 200 400', email: 'ngoclan@gmail.com', avatar: { emoji: '👩', bg: '#16a085' } },
    { id: 'p5', username: 'ph.minh', passwordHash: DEMO_HASH, role: 'parent', name: 'Hoàng Nhật Minh', title: 'Anh', phone: '0909 500 600', email: 'nhatminh@gmail.com', avatar: { emoji: '👨', bg: '#8e44ad' } },
    { id: 'p6', username: 'ph.huong', passwordHash: DEMO_HASH, role: 'parent', name: 'Bùi Thu Hương', title: 'Chị', phone: '0909 700 800', email: 'thuhuong@gmail.com', avatar: { emoji: '👩', bg: '#c0392b' } },
  ];

  // Trung tâm của cả bộ dữ liệu mẫu là BÉ AN — nhóm Chồi 2, cơ sở 1. Bé xuất
  // hiện xuyên suốt: điểm danh, nhận xét, dặn thuốc, album, tin nhắn, đơn xin
  // nghỉ. Anh của bé (bé Nam) học nhóm Lá 1, cùng một mẹ — nhờ vậy màn hình
  // "đổi con đang xem" của phụ huynh có thật sự hai bé để đổi.
  //
  // Tuổi khớp với bậc: Chồi 2 là 4–5 tuổi, Lá 1 là 5–6 tuổi.
  const namChoi = YEAR - 4;   // các bé nhóm Chồi sinh năm này
  const namLa = YEAR - 5;     // các bé nhóm Lá
  const students = [
    { id: 's1', name: 'Nguyễn Bảo An', dob: `${namChoi}-04-12`, gender: 'Nữ', classId: 'c1', parentIds: ['p1'], avatar: { emoji: '👧', bg: '#3f6ad8' }, address: '12 Hoa Phượng, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Không', code: `MN${namChoi}041` },
    { id: 's2', name: 'Nguyễn Bảo Nam', dob: `${namLa}-09-03`, gender: 'Nam', classId: 'c2', parentIds: ['p1'], avatar: { emoji: '👦', bg: '#e0576f' }, address: '12 Hoa Phượng, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Tôm, cua', code: `MN${namLa}093` },
    { id: 's3', name: 'Phạm Gia Hân', dob: `${namChoi}-01-25`, gender: 'Nữ', classId: 'c1', parentIds: ['p2'], avatar: { emoji: '👧', bg: '#27ae60' }, address: '45 Trường Sa, Q. Bình Thạnh', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: `MN${namChoi}012` },
    { id: 's4', name: 'Vũ Đức Anh', dob: `${namChoi}-07-19`, gender: 'Nam', classId: 'c1', parentIds: ['p3'], avatar: { emoji: '🧒', bg: '#d68910' }, address: '78 Phan Xích Long, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Đậu phộng', code: `MN${namChoi}071` },
    { id: 's5', name: 'Đỗ Khánh Vy', dob: `${namChoi}-11-08`, gender: 'Nữ', classId: 'c1', parentIds: ['p4'], avatar: { emoji: '👧', bg: '#16a085' }, address: '102 Nguyễn Kiệm, Q. Gò Vấp', ethnicity: 'Kinh', bloodType: 'AB', allergies: 'Không', code: `MN${namChoi}118` },
    { id: 's6', name: 'Hoàng Gia Bảo', dob: `${namChoi}-03-30`, gender: 'Nam', classId: 'c1', parentIds: ['p5'], avatar: { emoji: '👦', bg: '#8e44ad' }, address: '5 Đặng Văn Ngữ, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Không', code: `MN${namChoi}033` },
    { id: 's7', name: 'Bùi Minh Thư', dob: `${namLa}-05-16`, gender: 'Nữ', classId: 'c2', parentIds: ['p6'], avatar: { emoji: '👧', bg: '#c0392b' }, address: '210 Lê Văn Sỹ, Q.3', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Sữa bò', code: `MN${namLa}051` },
    { id: 's8', name: 'Vũ Hải Đăng', dob: `${namLa}-12-01`, gender: 'Nam', classId: 'c2', parentIds: ['p3'], avatar: { emoji: '👦', bg: '#2c3e50' }, address: '78 Phan Xích Long, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: `MN${namLa}121` },
  ];

  // ---- Điểm danh: 20 ngày học gần nhất ----
  const attendance = [];
  let attId = 1;
  const days = recentWeekdays(20);
  students.forEach((s, si) => {
    days.forEach((d, di) => {
      // hôm nay: nhóm Chồi 2 đã điểm danh, nhóm Lá 1 chưa
      if (di === 0 && s.classId === 'c2') return;
      let status = 'present';
      if ((di + si) % 11 === 5) status = 'late';
      if ((di * 3 + si) % 17 === 8) status = 'absent_excused';
      const rec = {
        id: 'att_' + attId++,
        studentId: s.id,
        date: fmt(d),
        status,
        checkIn: status === 'present' ? `07:${String(15 + ((di + si * 7) % 30)).padStart(2, '0')}` : status === 'late' ? '08:05' : null,
        checkOut: status === 'absent_excused' ? null : (di === 0 ? null : '16:30'),
        note: status === 'absent_excused' ? 'Nghỉ có phép (gia đình xin phép)' : status === 'late' ? 'Gia đình đưa bé tới muộn' : '',
        markedBy: s.classId === 'c1' ? 't1' : 't2',
      };
      attendance.push(rec);
    });
  });

  // ---- Xin phép nghỉ học ----
  const leaveRequests = [
    { id: 'lv_1', studentId: 's1', parentId: 'p1', fromDate: fmt(daysAhead(1)), toDate: fmt(daysAhead(1)), reason: 'Gia đình có việc riêng, xin phép cho con nghỉ 1 ngày.', status: 'pending', createdAt: iso(daysAgo(0), 8, 30), reviewedBy: null, reviewNote: '' },
    { id: 'lv_2', studentId: 's1', parentId: 'p1', fromDate: fmt(daysAgo(9)), toDate: fmt(daysAgo(8)), reason: 'Con bị sốt nhẹ, gia đình cho con ở nhà theo dõi.', status: 'approved', createdAt: iso(daysAgo(10), 20, 15), reviewedBy: 't1', reviewNote: 'Cô đã nhận thông tin. Chúc con mau khỏe!' },
    { id: 'lv_3', studentId: 's3', parentId: 'p2', fromDate: fmt(daysAgo(4)), toDate: fmt(daysAgo(4)), reason: 'Con về quê cùng gia đình một hôm.', status: 'approved', createdAt: iso(daysAgo(6), 19, 0), reviewedBy: 't1', reviewNote: 'Cô đã nhận thông tin ạ. Gia đình đi đường cẩn thận nhé.' },
    { id: 'lv_4', studentId: 's2', parentId: 'p1', fromDate: fmt(daysAgo(15)), toDate: fmt(daysAgo(15)), reason: 'Xin cho con nghỉ buổi chiều đi tiêm nhắc mũi cúm.', status: 'rejected', createdAt: iso(daysAgo(16), 9, 45), reviewedBy: 't2', reviewNote: 'Chiều đó nhóm có buổi làm quen với cô lớp 1, cô mong gia đình đổi lịch tiêm giúp ạ.' },
  ];

  // ---- Thực đơn bữa ăn ở trường: tuần này + tuần sau ----
  const breakfasts = [
    ['Phở bò', 'Sữa tươi'], ['Bánh mì ốp la', 'Sữa đậu nành'], ['Xôi gà', 'Nước cam'],
    ['Bún riêu cua', 'Sữa chua'], ['Hủ tiếu Nam Vang', 'Sữa tươi'], ['Cháo gà cà rốt', 'Chuối'],
    ['Bánh cuốn chả', 'Sữa tươi'], ['Mì Quảng gà', 'Dưa hấu'], ['Nui xào bò', 'Sữa chua uống'], ['Bánh giò', 'Nước ép táo'],
  ];
  const lunches = [
    ['Cơm trắng', 'Gà kho gừng', 'Canh bí đỏ nấu tôm', 'Rau muống xào tỏi', 'Dưa hấu'],
    ['Cơm trắng', 'Cá basa kho tộ', 'Canh chua cá lóc', 'Cải thìa xào nấm', 'Chuối'],
    ['Cơm trắng', 'Thịt bò xào thiên lý', 'Canh rau ngót thịt bằm', 'Đậu que xào', 'Nho'],
    ['Cơm trắng', 'Sườn non ram mặn', 'Canh khoai mỡ tôm', 'Bắp cải luộc', 'Thanh long'],
    ['Cơm trắng', 'Trứng chiên thịt bằm', 'Canh mồng tơi cua đồng', 'Su su xào cà rốt', 'Xoài chín'],
    ['Cơm trắng', 'Tôm rim thịt', 'Canh cải xanh cá thác lác', 'Bí xanh luộc', 'Cam'],
    ['Cơm trắng', 'Gà chiên nước mắm', 'Canh chua thơm cà', 'Rau dền luộc', 'Dưa lưới'],
    ['Cơm trắng', 'Thịt kho trứng cút', 'Canh bầu nấu tôm', 'Cải ngọt xào', 'Táo'],
    ['Cơm trắng', 'Cá diêu hồng chiên sốt cà', 'Canh cải bó xôi', 'Mướp xào', 'Chuối'],
    ['Cơm trắng', 'Bò kho cà rốt + bánh mì', 'Canh cải thảo', 'Rau lang luộc', 'Quýt'],
  ];
  const snacks = [
    ['Bánh flan', 'Sữa tươi'], ['Chè đậu xanh'], ['Yaourt trái cây'], ['Bánh bông lan', 'Sữa'],
    ['Súp gà ngô non'], ['Bánh su kem'], ['Chè chuối'], ['Sữa chua nếp cẩm'], ['Bánh da lợn'], ['Trái cây tổng hợp'],
  ];
  const menus = [];
  const monday = mondayOf(today);
  for (let w = 0; w < 2; w++) {
    for (let d = 0; d < 5; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + w * 7 + d);
      const k = w * 5 + d;
      menus.push({
        id: `menu_${w}_${d}`,
        date: fmt(date),
        meals: [
          { type: 'breakfast', label: 'Bữa sáng', time: '07:00', items: pick(breakfasts, k) },
          { type: 'lunch', label: 'Bữa trưa', time: '10:45', items: pick(lunches, k) },
          { type: 'snack', label: 'Bữa xế', time: '14:30', items: pick(snacks, k) },
        ],
      });
    }
  }

  // ---- Lịch sinh hoạt một ngày ----
  //
  // Mầm non không có "tiết học" như tiểu học mà có MỐC SINH HOẠT trong ngày, và
  // gia đình quan tâm nhất là mấy giờ con ăn, mấy giờ con ngủ. Cấu trúc dữ liệu
  // của app 1 (khung giờ + việc theo từng mốc) tả được đúng như vậy nên giữ
  // nguyên, chỉ đổi nội dung — không phải tính năng nào cũng cần viết lại.
  const tt = (hoatDong) => hoatDong; // [hoạt động theo mốc giờ]
  const periodTimes = [
    { p: 1, time: '07:00 – 08:00' }, { p: 2, time: '08:00 – 08:30' }, { p: 3, time: '08:30 – 09:15' },
    { p: 4, time: '09:15 – 10:30' }, { p: 5, time: '10:30 – 11:15' }, { p: 6, time: '11:15 – 14:00' }, { p: 7, time: '14:00 – 16:30' },
  ];
  const timetable = [
    {
      classId: 'c1',
      periodTimes,
      days: {
        1: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Khám phá: Trường mầm non của bé', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        2: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Tạo hình: Vẽ và nặn', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Kể chuyện · Trả bé']),
        3: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Âm nhạc: Hát và vận động', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        4: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Làm quen với sách và chữ', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi vận động · Trả bé']),
        5: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Bé tập làm nội trợ', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Nêu gương cuối tuần · Trả bé']),
      },
    },
    {
      classId: 'c2',
      periodTimes,
      days: {
        1: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Khám phá: Nước và hiện tượng tự nhiên', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        2: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Làm quen chữ cái', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Kể chuyện · Trả bé']),
        3: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Làm quen với toán: Đếm và so sánh', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi góc · Trả bé']),
        4: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Tạo hình: Cắt dán', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Ăn xế · Chơi vận động · Trả bé']),
        5: tt(['Đón bé, chơi tự chọn', 'Thể dục sáng', 'Ăn sáng', 'Bé chuẩn bị vào lớp 1', 'Chơi ngoài trời', 'Ăn trưa · Ngủ trưa', 'Nêu gương cuối tuần · Trả bé']),
      },
    },
  ];

  // ---- Nhận xét hằng ngày ----
  // Viết theo QUY TẮC 1: MÔ TẢ điều cô đã thấy, không phán xét con.
  // Câu mở đầu luôn là việc quan sát được, không phải lời khen chung chung.
  const remarkTexts = [
    { content: 'Hôm nay con tự xúc hết bát cơm mà không cần cô nhắc, ngủ trưa một mạch tới 14 giờ.', rating: 'great' },
    { content: 'Giờ chơi góc, con xếp khối gỗ thành một cái cầu rồi cho ô tô chạy qua, làm đi làm lại bốn lần.', rating: 'great' },
    { content: 'Con rủ bạn Gia Hân cùng chơi bán hàng, hai bạn chơi với nhau gần hết giờ hoạt động góc.', rating: 'great' },
    { content: 'Sáng nay con khóc khi mẹ về, cô bế con ra xem cá khoảng năm phút thì con nín và vào chơi cùng các bạn.', rating: 'good' },
    { content: 'Con còn nhờ cô xúc giúp mấy thìa cuối bữa trưa. Cô để con tự xúc trước rồi mới giúp phần còn lại.', rating: 'good' },
    { content: 'Con cất dép vào đúng ô của mình, không cần cô nhắc. Ba hôm nay con đều tự làm việc này.', rating: 'great' },
  ];
  // Lĩnh vực phát triển theo chương trình mầm non — cô gắn SAU khi đã mô tả,
  // và có thể không gắn (QUY TẮC 1: quan sát ≠ đánh giá).
  const skillsPool = [['Tự phục vụ'], ['Nhận thức', 'Sáng tạo'], ['Tình cảm — kỹ năng xã hội'], ['Ngôn ngữ'], ['Thể chất'], ['Thẩm mỹ']];
  const remarks = [];
  let rmId = 1;
  students.forEach((s, si) => {
    recentWeekdays(10).forEach((d, di) => {
      if ((di + si) % 3 === 2) return; // không phải ngày nào cũng có nhận xét
      const t = pick(remarkTexts, di + si);
      remarks.push({
        id: 'rm_' + rmId++,
        studentId: s.id,
        teacherId: s.classId === 'c1' ? 't1' : 't2',
        date: fmt(d),
        content: t.content,
        rating: t.rating,
        skills: pick(skillsPool, di + si),
        parentSeen: di > 1,
      });
    });
  });

  // ---- Báo cáo học tập ----
  // KHÔNG MỘT ĐIỂM SỐ NÀO trong dữ liệu mẫu — QUY TẮC 4.
  //
  // Cột `score` của bảng `reports` vẫn còn (đó là phân hệ học bạ đời tiểu học,
  // sẽ gỡ ở N3), nhưng nó là cột TÙY CHỌN, nên dữ liệu mẫu để trống và chỉ dùng
  // `level` — một câu mô tả. Người mở app lần đầu phải thấy ngay rằng app này
  // không chấm điểm trẻ; dữ liệu mẫu là thứ họ nhìn trước cả tài liệu.
  // Tên ngắn, đúng cách cô gọi hằng ngày. Tên dài kiểu "Phát triển tình cảm —
  // kỹ năng xã hội" xuống dòng ba lần trên màn hình điện thoại, đẩy nút Lưu ra
  // khỏi tầm tay — thử trên trình duyệt thật mới thấy.
  const linhVucPhatTrien = ['Thể chất', 'Nhận thức', 'Ngôn ngữ', 'Tình cảm — xã hội', 'Thẩm mỹ'];
  const subjectSet3 = linhVucPhatTrien;
  const subjectSet5 = linhVucPhatTrien;
  const evalLevels = [
    'Con làm được, thường xuyên',
    'Con làm được khi có cô gợi ý',
    'Cô đang tiếp tục quan sát thêm',
  ];
  const reports = [];
  students.forEach((s, si) => {
    const subs = s.classId === 'c1' ? subjectSet3 : subjectSet5;
    [`Học kỳ 1 (${YEAR - 1}-${YEAR})`, `Học kỳ 2 (${YEAR - 1}-${YEAR})`].forEach((term, ti) => {
      reports.push({
        id: `rp_${s.id}_${ti}`,
        studentId: s.id,
        term,
        year: `${YEAR - 1}-${YEAR}`,
        subjects: subs.map((name, i) => ({
          name,
          score: null,   // QUY TẮC 4 — không chấm điểm trẻ
          level: pick(evalLevels, si + i + ti),
          comment: '',
        })),
        // Ô "Hạnh kiểm" của học bạ đời tiểu học chỉ nhận 4 mức Tốt/Khá/Trung
        // bình/Cần cố gắng — tức là xếp loại trẻ, đi ngược QUY TẮC 4. Màn hình
        // đó sẽ gỡ ở N3. Chừng nào chưa gỡ, dữ liệu mẫu để MỌI bé cùng một mức
        // để không bé nào bị xếp trên hay dưới bé nào.
        conduct: 'Tốt',
        overall: pick([
          'Con đã quen nền nếp của nhóm, tự phục vụ được phần lớn việc của mình.',
          'Con mạnh dạn hơn hẳn so với đầu năm, chủ động rủ bạn cùng chơi.',
        ], si + ti),
        attendanceSummary: { present: 85 + ((si * 3) % 6), absent: (si + ti) % 3, late: si % 2 },
        // QUY TẮC 5 — mỗi nhận định đi kèm một việc làm được, ở lớp và ở nhà.
        teacherComment: pick([
          'Con tự xúc ăn và tự cất dép được rồi. Ở lớp cô sẽ để con tự lấy nước uống; ở nhà gia đình thử cho con tự xúc bữa tối nhé.',
          'Con thích xếp khối và chơi rất lâu với một thứ. Ở lớp cô sẽ thêm khối vào góc xây dựng; ở nhà, nhà mình thử xếp cốc, xếp hộp cùng con.',
          'Con còn ngại nói trước đông người. Ở lớp cô sẽ mời con kể chuyện trong nhóm nhỏ ba bạn trước; ở nhà gia đình hỏi con "hôm nay con chơi gì" mỗi tối nhé.',
        ], si + ti),
      });
    });
  });

  // ---- Xe buýt ----
  const busRoutes = [
    {
      id: 'bus1', name: 'Tuyến 01 – Phú Nhuận (Cơ sở 1)', plate: '51B-123.45',
      driver: { name: 'Chú Trần Văn Tám', phone: '0918 000 111' },
      monitor: { name: 'Cô Lê Thị Xuân', phone: '0918 000 222' },
      studentIds: ['s1', 's4', 's6'],
      stops: [
        { name: 'Ngã tư Phú Nhuận', pickup: '06:40', dropoff: '17:05' },
        { name: 'Chợ Nguyễn Đình Chiểu', pickup: '06:50', dropoff: '16:55' },
        { name: 'Công viên Gia Định', pickup: '07:00', dropoff: '16:45' },
        { name: 'Trường Mầm non CASA — Cơ sở 1', pickup: '07:15', dropoff: '16:35' },
      ],
      log: [
        { time: iso(today, 6, 38), text: 'Xe bắt đầu đón bé tại Ngã tư Phú Nhuận' },
        { time: iso(today, 7, 12), text: 'Xe đã về tới trường, đủ 3/3 bé, cô đã bàn giao cho lớp' },
      ],
    },
    {
      id: 'bus2', name: 'Tuyến 02 – Bình Thạnh (Cơ sở 1)', plate: '51B-678.90',
      driver: { name: 'Chú Ngô Văn Sáu', phone: '0918 333 444' },
      monitor: { name: 'Cô Phan Mỹ Duyên', phone: '0918 555 666' },
      studentIds: ['s2', 's7'],
      stops: [
        { name: 'Chợ Bà Chiểu', pickup: '06:35', dropoff: '17:10' },
        { name: 'Ngã ba Hàng Xanh', pickup: '06:45', dropoff: '17:00' },
        { name: 'Cầu Thị Nghè', pickup: '06:55', dropoff: '16:50' },
        { name: 'Trường Mầm non CASA — Cơ sở 1', pickup: '07:10', dropoff: '16:35' },
      ],
      log: [
        { time: iso(today, 6, 33), text: 'Xe bắt đầu đón bé tại Chợ Bà Chiểu' },
        { time: iso(today, 7, 8), text: 'Xe đã về tới trường, đủ 2/2 bé, cô đã bàn giao cho lớp' },
      ],
    },
  ];

  // ---- Nề nếp ----
  const conduct = [];
  let cdId = 1;
  // MỌI bản ghi đều `points: 0` — QUY TẮC 4, không xếp hạng trẻ.
  //
  // Phân hệ Nề nếp cộng điểm rồi xếp hạng cả lớp là phần của app 1 tiểu học, sẽ
  // gỡ ở N3. Chừng nào chưa gỡ, dữ liệu mẫu tuyệt đối không được tiếp tay: để
  // điểm bằng 0 hết thì bảng xếp hạng phẳng lì, không bé nào đứng trên bé nào.
  // Nội dung cũng đổi sang MÔ TẢ việc đã thấy thay vì tuyên dương/nhắc nhở.
  const conductItems = [
    { type: 'praise', title: 'Con tự cất dép vào đúng ô', content: 'Sáng nay con vào lớp, tự tháo dép và để vào ô có ảnh của mình, không cần cô nhắc.', points: 0 },
    { type: 'praise', title: 'Con giúp bạn lau bàn sau giờ ăn', content: 'Ăn xong con lấy khăn lau chỗ mình ngồi rồi lau giúp cả chỗ bạn ngồi cạnh.', points: 0 },
    { type: 'reminder', title: 'Con chưa quen chờ tới lượt', content: 'Ở góc xây dựng con muốn lấy khối bạn đang cầm. Cô ngồi xuống cùng hai bạn và hướng dẫn con hỏi mượn.', points: 0 },
    { type: 'praise', title: 'Con kể lại được câu chuyện vừa nghe', content: 'Cuối giờ con kể lại chuyện Ba chú lợn con cho các bạn, nhớ đúng thứ tự.', points: 0 },
    { type: 'reminder', title: 'Con còn ngại rửa tay bằng xà phòng', content: 'Con rửa rất nhanh rồi bỏ đi. Cô rửa cùng con và đếm tới 20, hôm nay con làm theo được.', points: 0 },
  ];
  students.forEach((s, si) => {
    recentWeekdays(15).forEach((d, di) => {
      if ((di * 2 + si) % 7 !== 3) return;
      const it = pick(conductItems, di + si);
      conduct.push({ id: 'cd_' + cdId++, studentId: s.id, date: fmt(d), ...it, byTeacherId: s.classId === 'c1' ? 't1' : 't2' });
    });
  });

  // ---- Khảo sát ----
  const surveys = [
    {
      id: 'sv1',
      title: 'Khảo sát bữa ăn của bé tại trường',
      description: 'Nhà trường mong nhận được ý kiến của gia đình về bữa ăn của các bé, để bếp điều chỉnh cho hợp khẩu vị lứa tuổi.',
      createdBy: 't1', createdAt: iso(daysAgo(3), 9, 0), deadline: fmt(daysAhead(5)),
      audience: 'all', status: 'open',
      questions: [
        { id: 'q1', text: 'Mức độ hài lòng của gia đình về thực đơn hiện tại?', type: 'choice', options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Chưa hài lòng'] },
        { id: 'q2', text: 'Bé có kể về bữa ăn ở trường khi về nhà không?', type: 'choice', options: ['Thường xuyên', 'Thỉnh thoảng', 'Hiếm khi'] },
        { id: 'q3', text: 'Gia đình muốn bếp bổ sung món nào cho bé?', type: 'text' },
      ],
      responses: [
        { userId: 'p2', studentId: 's3', submittedAt: iso(daysAgo(1), 20, 30), answers: { q1: 'Hài lòng', q2: 'Thường xuyên', q3: 'Mong bếp có thêm món súp và trái cây mềm cho bé dễ ăn.' } },
        { userId: 'p4', studentId: 's5', submittedAt: iso(daysAgo(2), 21, 10), answers: { q1: 'Rất hài lòng', q2: 'Thỉnh thoảng', q3: 'Không có, thực đơn hiện tại rất tốt.' } },
      ],
    },
    {
      id: 'sv2',
      title: 'Đăng ký hoạt động ngoài giờ cho bé',
      description: 'Gia đình cho biết nguyện vọng đăng ký hoạt động ngoài giờ cho bé (Aerobic, Vẽ, Âm nhạc, Bé khéo tay).',
      createdBy: 't1', createdAt: iso(daysAgo(12), 8, 0), deadline: fmt(daysAgo(2)),
      audience: 'all', status: 'closed',
      questions: [
        { id: 'q1', text: 'Gia đình đăng ký hoạt động nào cho bé?', type: 'choice', options: ['Aerobic', 'Vẽ', 'Âm nhạc', 'Bé khéo tay', 'Không đăng ký'] },
        { id: 'q2', text: 'Mấy giờ gia đình đón bé được?', type: 'choice', options: ['16:30', '17:00', '17:30'] },
      ],
      responses: [
        { userId: 'p1', studentId: 's1', submittedAt: iso(daysAgo(10), 19, 0), answers: { q1: 'Âm nhạc', q2: '17:00' } },
        { userId: 'p2', studentId: 's3', submittedAt: iso(daysAgo(9), 18, 30), answers: { q1: 'Vẽ', q2: '16:30' } },
        { userId: 'p3', studentId: 's4', submittedAt: iso(daysAgo(9), 21, 45), answers: { q1: 'Aerobic', q2: '17:30' } },
        { userId: 'p6', studentId: 's7', submittedAt: iso(daysAgo(8), 20, 0), answers: { q1: 'Bé khéo tay', q2: '17:00' } },
      ],
    },
  ];

  // ---- Y tế ----
  const health = [];
  let htId = 1;
  students.forEach((s, si) => {
    health.push(
      // Chiều cao / cân nặng đúng lứa 4–6 tuổi. Số liệu sai lứa tuổi là thứ cô
      // và y tế trường nhận ra ngay, và nhận ra là mất tin vào cả bộ dữ liệu.
      { id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(40 + si)), type: 'checkup', title: 'Cân đo định kỳ đầu năm', detail: 'Bé ăn ngủ bình thường, răng miệng sạch. Không có gì bất thường.', height: s.classId === 'c1' ? 102 + si : 110 + si, weight: s.classId === 'c1' ? 16 + si : 19 + si, vision: 'Bình thường', bmiNote: 'Cân đối theo tuổi' },
      { id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(70 + si)), type: 'vaccination', title: 'Tiêm nhắc vắc-xin Sởi – Rubella', detail: 'Tiêm tại trạm y tế phường, gia đình gửi lại sổ tiêm cho nhà trường. Không phản ứng phụ.' },
    );
    if (si % 3 === 0) {
      health.push({ id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(6)), type: 'incident', title: 'Trầy nhẹ đầu gối khi chơi ngoài trời', detail: 'Bé ngã khi chạy ở sân cỏ, trầy nhẹ đầu gối. Y tế trường rửa sạch và dán băng cá nhân, bé nín ngay và vào chơi tiếp. Cô đã nhắn báo gia đình lúc 09:40.' });
    }
  });

  // ---- Dặn thuốc ----
  const medicineRequests = [
    {
      id: 'md_1', studentId: 's1', parentId: 'p1',
      fromDate: fmt(today), toDate: fmt(daysAhead(1)),
      medicines: [
        { name: 'Siro ho Prospan', dose: '5ml', timing: 'Sau bữa trưa' },
        { name: 'Vitamin C 500mg', dose: '1 viên', timing: 'Sau bữa xế' },
      ],
      note: 'Bé mới hết ho, nhờ cô cho bé uống đúng giờ giúp gia đình. Thuốc để trong ba lô, ngăn trước, có dán tên bé.',
      status: 'received', createdAt: iso(daysAgo(0), 6, 50), confirmedBy: 't1', confirmedAt: iso(daysAgo(0), 7, 40),
      log: [{ time: iso(daysAgo(0), 11, 15), text: 'Cô đã cho bé uống Siro ho Prospan sau bữa trưa' }],
    },
    {
      id: 'md_2', studentId: 's3', parentId: 'p2',
      fromDate: fmt(daysAgo(5)), toDate: fmt(daysAgo(3)),
      medicines: [{ name: 'Men vi sinh Enterogermina', dose: '1 ống', timing: 'Trước bữa trưa 30 phút' }],
      note: 'Bé hơi rối loạn tiêu hóa, bác sĩ kê men vi sinh 3 ngày.',
      status: 'done', createdAt: iso(daysAgo(5), 7, 0), confirmedBy: 't1', confirmedAt: iso(daysAgo(5), 7, 30),
      log: [{ time: iso(daysAgo(3), 11, 0), text: 'Hoàn tất đợt uống thuốc theo dặn của gia đình' }],
    },
  ];

  // ---- Album ảnh (ảnh minh họa bằng gradient + emoji) ----
  const albums = [
    {
      id: 'al1', classId: 'c1', title: 'Ngày hội đến trường của bé ' + schoolYear, date: fmt(daysAgo(25)),
      description: 'Buổi sáng đầu tiên của năm học mới ở nhóm Chồi 2.',
      createdBy: 't1',
      photos: [
        { id: 'ph1', emoji: '🎈', g: ['#ff9a9e', '#fad0c4'], caption: 'Cổng trường rực rỡ cờ hoa' },
        { id: 'ph2', emoji: '🥁', g: ['#a18cd1', '#fbc2eb'], caption: 'Màn trống hội ngày khai trường' },
        { id: 'ph3', emoji: '🧸', g: ['#84fab0', '#8fd3f4'], caption: 'Các bé nhóm Chồi 2 ngày đầu tới lớp' },
        { id: 'ph4', emoji: '🎏', g: ['#ffecd2', '#fcb69f'], caption: 'Thả bóng bay ước mơ' },
        { id: 'ph5', emoji: '🎒', g: ['#89f7fe', '#66a6ff'], caption: 'Bé tự cất ba lô vào ô của mình' },
        { id: 'ph6', emoji: '🤝', g: ['#fddb92', '#d1fdff'], caption: 'Chụp ảnh cùng cô Mai Anh và cô Bích Ngọc' },
      ],
    },
    {
      id: 'al2', classId: 'c1', title: 'Bé tập làm vườn ở góc thiên nhiên', date: fmt(daysAgo(11)),
      description: 'Cả nhóm gieo hạt, tưới cây và quan sát góc thiên nhiên của nhóm suốt hai tuần.',
      createdBy: 't1',
      photos: [
        { id: 'ph7', emoji: '🌱', g: ['#d4fc79', '#96e6a1'], caption: 'Gieo hạt trồng rau' },
        { id: 'ph8', emoji: '🥕', g: ['#fbc2eb', '#a6c1ee'], caption: 'Thu hoạch cà rốt' },
        { id: 'ph9', emoji: '💧', g: ['#fdfbfb', '#ebedee'], caption: 'Bé tự tưới cây mỗi sáng' },
        { id: 'ph10', emoji: '🍅', g: ['#ff9a9e', '#fecfef'], caption: 'Hái cà chua chín' },
        { id: 'ph11', emoji: '😄', g: ['#a1c4fd', '#c2e9fb'], caption: 'Ăn xế ngay ở sân trường' },
      ],
    },
    {
      id: 'al3', classId: 'c2', title: 'Ngày hội vận động của nhóm Lá 1', date: fmt(daysAgo(18)),
      description: 'Các bé nhóm Lá 1 chơi ném vòng, bò chui ống và kéo co cùng cô.',
      createdBy: 't2',
      photos: [
        { id: 'ph12', emoji: '🏃', g: ['#f6d365', '#fda085'], caption: 'Bé bò chui qua ống' },
        { id: 'ph13', emoji: '💪', g: ['#84fab0', '#8fd3f4'], caption: 'Kéo co cùng cô' },
        { id: 'ph14', emoji: '🪀', g: ['#fccb90', '#d57eeb'], caption: 'Trò chơi ném vòng cổ chai' },
        { id: 'ph15', emoji: '🎈', g: ['#e0c3fc', '#8ec5fc'], caption: 'Cả nhóm cùng thả bóng' },
      ],
    },
    {
      id: 'al4', classId: 'c1', title: 'Sinh nhật các bé tháng này', date: fmt(daysAgo(2)),
      description: 'Cả nhóm cùng hát mừng sinh nhật các bé, ăn bánh và chơi trò chơi.',
      createdBy: 't1',
      photos: [
        { id: 'ph16', emoji: '🎂', g: ['#ffd1ff', '#fad0c4'], caption: 'Thổi nến sinh nhật' },
        { id: 'ph17', emoji: '🎁', g: ['#a8edea', '#fed6e3'], caption: 'Bé tự tay tặng quà cho bạn' },
        { id: 'ph18', emoji: '🥳', g: ['#fff1eb', '#ace0f9'], caption: 'Cùng nhau ca hát' },
      ],
    },
  ];

  // ---- Kế hoạch giáo dục ----
  const m0 = today.getMonth() + 1;
  const eduPlans = [
    {
      id: 'ep1', classId: 'c1', month: m0, year: today.getFullYear(),
      theme: 'Trường mầm non của bé',
      goals: ['Bé nhớ tên cô, tên bạn và tên nhóm của mình', 'Bé tự cất ba lô, cất dép vào đúng ô', 'Bé tự xúc ăn và tự uống nước', 'Bé biết rửa tay bằng xà phòng trước khi ăn'],
      weeks: [
        { week: 1, focus: 'Làm quen cô, bạn và các góc chơi', activities: 'Chơi trò gọi tên; cô dẫn bé đi thăm từng góc; tập cất ba lô vào ô có ảnh của mình.' },
        { week: 2, focus: 'Bé tự phục vụ', activities: 'Tập tự xúc ăn; tập rửa tay theo sáu bước, cô đếm cùng bé tới 20; tập tự kéo ghế.' },
        { week: 3, focus: 'Bé chơi cùng bạn', activities: 'Chơi đóng vai bán hàng theo nhóm ba bé; xây nhà bằng khối gỗ; hát và vận động theo nhạc.' },
        { week: 4, focus: 'Nhìn lại một tháng', activities: 'Trưng bày tranh bé vẽ ở góc phụ huynh; cô ghi lại một khoảnh khắc của từng bé để kể cho gia đình.' },
      ],
      note: 'Ở nhà gia đình thử để bé tự xúc bữa tối và tự cất dép nhé — ở lớp bé đang tập đúng hai việc này.',
      createdBy: 't1',
    },
    {
      id: 'ep2', classId: 'c2', month: m0, year: today.getFullYear(),
      theme: 'Bé chuẩn bị vào lớp 1',
      goals: ['Bé ngồi vào bàn làm một việc trong 15 phút', 'Bé nhận ra tên mình khi nhìn thấy chữ', 'Bé tự đi vệ sinh và tự mặc áo khoác', 'Bé kể lại được việc đã xảy ra trong ngày'],
      weeks: [
        { week: 1, focus: 'Ngồi vào bàn và làm cho xong', activities: 'Tô màu theo nét; xâu hạt theo mẫu; cô ngồi cạnh nhắc bé làm nốt phần còn lại.' },
        { week: 2, focus: 'Làm quen mặt chữ', activities: 'Tìm tên mình trong ô đựng đồ; ghép chữ cái đầu của tên; nghe và kể lại chuyện.' },
        { week: 3, focus: 'Bé tự làm việc của mình', activities: 'Tự mặc và cởi áo khoác; tự chuẩn bị chỗ ngủ trưa; tự rót nước.' },
        { week: 4, focus: 'Nhìn lại một tháng', activities: 'Bé kể lại một ngày ở lớp cho cả nhóm nghe; cô ghi lại và gửi về cho gia đình.' },
      ],
      note: 'Buổi tối gia đình thử hỏi bé "hôm nay con chơi gì" và chờ bé kể hết — đó chính là việc nhóm đang tập ở tuần 4.',
      createdBy: 't2',
    },
  ];

  // ---- Thông báo ----
  const notifications = [
    { id: 'nt1', title: 'Thông báo nghỉ Lễ Quốc khánh 2/9', body: 'Nhà trường thông báo lịch nghỉ Lễ Quốc khánh: các bé nghỉ từ ngày 01/09 đến hết ngày 02/09, ngày kế tiếp đón bé bình thường. Kính chúc quý gia đình kỳ nghỉ lễ vui vẻ, an toàn.', category: 'Nhà trường', audience: 'all', createdBy: 't1', createdAt: iso(daysAgo(1), 10, 0), pinned: true, readBy: [] },
    { id: 'nt2', title: 'Thu học phí và tiền ăn tháng này', body: 'Kính mời quý phụ huynh hoàn tất học phí và tiền ăn trước ngày 10. Gia đình có thể chuyển khoản qua tài khoản của trường hoặc đóng trực tiếp tại văn phòng cơ sở 1. Chi tiết từng khoản đã gửi trong mục Học phí của từng bé.', category: 'Học phí', audience: 'all', createdBy: 't1', createdAt: iso(daysAgo(2), 8, 30), pinned: false, readBy: ['p2'] },
    { id: 'nt3', title: 'Nhóm Chồi 2: gửi thêm một bộ quần áo dự phòng', body: 'Tuần này nhóm mình chơi với nước và cát ở sân, cô nhờ gia đình gửi thêm cho bé một bộ quần áo dự phòng để trong ba lô. Cô sẽ thay cho bé ngay khi bé bị ướt ạ.', category: 'Nhóm lớp', audience: 'c1', createdBy: 't1', createdAt: iso(daysAgo(0), 7, 45), pinned: false, readBy: [] },
    { id: 'nt4', title: 'Lịch cân đo định kỳ toàn trường', body: 'Nhà trường phối hợp trạm y tế phường cân đo định kỳ cho các bé vào tuần sau. Gia đình cho bé ăn sáng bình thường trước khi tới lớp, kết quả sẽ hiện trong mục Y tế của từng bé.', category: 'Y tế', audience: 'all', createdBy: 't2', createdAt: iso(daysAgo(4), 15, 20), pinned: false, readBy: ['p1', 'p2'] },
    { id: 'nt5', title: 'Nhóm Lá 1: buổi làm quen với cô giáo lớp 1', body: 'Thứ Sáu tuần này các bé nhóm Lá 1 sẽ sang trường tiểu học bên cạnh, làm quen với cô giáo lớp 1 và ngồi thử vào bàn học. Gia đình cho bé mang giày dễ đi và một chai nước nhé.', category: 'Nhóm lớp', audience: 'c2', createdBy: 't2', createdAt: iso(daysAgo(1), 16, 0), pinned: false, readBy: [] },
  ];

  // ---- Hội thoại nhắn tin ----
  const conversations = [
    {
      id: 'cv1', type: 'direct', participantIds: ['p1', 't1'],
      messages: [
        { id: 'ms1', senderId: 'p1', text: 'Chào cô Mai Anh, tối qua An về khoe tự xúc hết bát cơm ở lớp ạ. Ở nhà cháu vẫn đòi mẹ đút cô ạ.', createdAt: iso(daysAgo(1), 17, 20) },
        { id: 'ms2', senderId: 't1', text: 'Chào chị Hà, đúng rồi ạ. Hai hôm nay bé tự xúc hết, cô không phải nhắc. Chị thử ở nhà để bé tự xúc bữa tối, mình ngồi cạnh chứ đừng đút, khoảng một tuần là bé quen ạ.', createdAt: iso(daysAgo(1), 17, 45) },
        { id: 'ms3', senderId: 'p1', text: 'Dạ em sẽ thử ạ. À cô ơi, mai nhóm mình chơi với nước, em cần gửi thêm gì cho bé không cô?', createdAt: iso(daysAgo(1), 18, 2) },
        { id: 'ms4', senderId: 't1', text: 'Dạ chị gửi thêm một bộ quần áo dự phòng để trong ba lô giúp cô nhé, bé ướt là cô thay ngay ạ.', createdAt: iso(daysAgo(1), 18, 10) },
        { id: 'ms5', senderId: 't1', text: 'Chị Hà ơi, sáng nay cô đã nhận thuốc và cho An uống siro ho sau bữa trưa đúng giờ rồi nhé. Bé ăn hết suất, ngủ trưa ngon, chị yên tâm ạ.', createdAt: iso(daysAgo(0), 12, 30) },
      ],
      lastRead: { p1: iso(daysAgo(1), 18, 12), t1: iso(daysAgo(0), 12, 30) },
    },
    {
      id: 'cv2', type: 'direct', participantIds: ['p1', 't2'],
      messages: [
        { id: 'ms6', senderId: 't2', text: 'Chào chị Hà, chiều nay Nam ngồi tô màu liền một mạch gần 20 phút mới đứng dậy — trước đây bé chỉ ngồi được vài phút. Cô ghi lại để gia đình biết ạ.', createdAt: iso(daysAgo(2), 16, 40) },
        { id: 'ms7', senderId: 'p1', text: 'Dạ em cảm ơn cô Hương ạ. Ở nhà cháu cũng bắt đầu chịu ngồi lâu hơn khi xếp hình ạ.', createdAt: iso(daysAgo(2), 19, 5) },
      ],
      lastRead: { p1: iso(daysAgo(2), 19, 5), t2: iso(daysAgo(2), 19, 6) },
    },
    {
      id: 'cv3', type: 'direct', participantIds: ['p2', 't1'],
      messages: [
        { id: 'ms8', senderId: 'p2', text: 'Cô ơi, tối qua Gia Hân kêu đau bụng một lúc rồi thôi. Mai cô để ý giúp em bữa trưa của bé với ạ.', createdAt: iso(daysAgo(0), 6, 30) },
      ],
      lastRead: { p2: iso(daysAgo(0), 6, 30), t1: iso(daysAgo(3), 8, 0) },
    },
    {
      id: 'cv4', type: 'group', name: 'Nhóm Chồi 2 – Thông tin chung', classId: 'c1',
      participantIds: ['t1', 'p1', 'p2', 'p3', 'p4', 'p5'],
      messages: [
        { id: 'ms9', senderId: 't1', text: 'Cô chào cả nhà nhóm Chồi 2! Thứ Năm tuần này nhóm mình chơi ngoài trời cả buổi sáng, gia đình cho bé đội mũ và mang theo một chai nước nhỏ nhé.', createdAt: iso(daysAgo(2), 9, 0) },
        { id: 'ms10', senderId: 'p3', text: 'Dạ cảm ơn cô đã thông báo ạ.', createdAt: iso(daysAgo(2), 9, 25) },
        { id: 'ms11', senderId: 'p4', text: 'Gia đình em đã nắm thông tin. Cảm ơn cô ạ!', createdAt: iso(daysAgo(2), 10, 12) },
        { id: 'ms12', senderId: 't1', text: 'Cô gửi cả nhà thực đơn tuần mới trên mục Thực đơn của ứng dụng ạ. Gia đình nào có bé dị ứng thức ăn nhắn riêng cho cô để cô báo bếp nhé.', createdAt: iso(daysAgo(0), 8, 15) },
      ],
      lastRead: { t1: iso(daysAgo(0), 8, 15), p1: iso(daysAgo(2), 10, 30), p2: iso(daysAgo(2), 9, 30), p3: iso(daysAgo(2), 9, 25), p4: iso(daysAgo(2), 10, 12), p5: iso(daysAgo(3), 7, 0) },
    },
  ];

  // Hồ sơ mở rộng và người liên hệ khẩn cấp. Cố ý KHÔNG điền cho mọi bé: trường
  // thật cũng không bao giờ đủ 100%, và màn hình phải chịu được ô trống.
  const studentProfiles = [
    { studentId: 's1', soDinhDanh: '079322001234', tienSuBenh: 'Không có gì đặc biệt' },
    { studentId: 's2', soDinhDanh: '079321005678', tienSuBenh: 'Dị ứng tôm cua — nổi mẩn quanh miệng. Hen nhẹ khi trở trời, có ống xịt trong ba lô.' },
    { studentId: 's4', soDinhDanh: '079322009012', tienSuBenh: 'Dị ứng đậu phộng. TUYỆT ĐỐI không cho ăn món có đậu phộng, kể cả dầu.' },
  ];
  // Số CCCD của phụ huynh. Cũng cố ý không đủ: văn phòng thu dần trong năm.
  const userProfiles = [
    { userId: 'p1', soCccd: '079182004321' },
    { userId: 'p3', soCccd: '079185008765' },
  ];
  const emergencyContacts = [
    { studentId: 's1', hoTen: 'Bà Trần Thị Lan', quanHe: 'Bà ngoại', dienThoai: '0909 111 222', ghiChu: 'Ở cùng nhà, đón được bé buổi chiều' },
    { studentId: 's2', hoTen: 'Bà Trần Thị Lan', quanHe: 'Bà ngoại', dienThoai: '0909 111 222', ghiChu: '' },
    { studentId: 's4', hoTen: 'Chú Vũ Đình Nam', quanHe: 'Bác ruột', dienThoai: '0912 333 444', ghiChu: 'Gọi khi không liên lạc được bố mẹ' },
  ];

  const db = {
    school, campuses, classes, users, students, studentProfiles, userProfiles, emergencyContacts,
    attendance, leaveRequests, menus, timetable, remarks, reports,
    busRoutes, conduct, surveys, health, medicineRequests, albums, eduPlans,
    notifications, conversations,
  };

  const stats = importSnapshot(db);
  const tong = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`Đã sinh dữ liệu mẫu vào cơ sở dữ liệu (${tong.toLocaleString('vi-VN')} bản ghi).`);
  return db;
}

if (require.main === module) {
  const db = require('../lib/db');
  if (process.argv.includes('--force') || db.isEmpty()) {
    generate();
  } else {
    console.log('Cơ sở dữ liệu đã có dữ liệu. Dùng --force để xóa và tạo lại.');
  }
  db.close();
}

module.exports = { generate };
