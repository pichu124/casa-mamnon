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
    name: 'Trường Tiểu học Ánh Dương',
    address: '25 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM',
    phone: '028 3844 5566',
    email: 'lienhe@anhduong.edu.vn',
    years: [`${YEAR - 1}-${YEAR}`, schoolYear],
    currentYear: schoolYear,
  };

  const classes = [
    { id: 'c1', name: 'Lớp 3A', teacherId: 't1', room: 'Phòng 203', year: schoolYear },
    { id: 'c2', name: 'Lớp 5B', teacherId: 't2', room: 'Phòng 305', year: schoolYear },
  ];

  // Các tài khoản mẫu dùng chung một mật khẩu nên chỉ cần băm một lần.
  // Mật khẩu không bao giờ được lưu ở dạng đọc được.
  const DEMO_HASH = password.hash(DEMO_PASSWORD);

  const users = [
    { id: 't1', username: 'giaovien', passwordHash: DEMO_HASH, role: 'teacher', name: 'Nguyễn Thị Mai Anh', title: 'Cô', phone: '0903 111 222', email: 'maianh@anhduong.edu.vn', classId: 'c1', avatar: { emoji: '👩‍🏫', bg: '#7c5cbf' } },
    { id: 't2', username: 'giaovien2', passwordHash: DEMO_HASH, role: 'teacher', name: 'Trần Văn Hùng', title: 'Thầy', phone: '0903 333 444', email: 'vanhung@anhduong.edu.vn', classId: 'c2', avatar: { emoji: '👨‍🏫', bg: '#2980b9' } },
    { id: 'p1', username: 'phuhuynh', passwordHash: DEMO_HASH, role: 'parent', name: 'Lê Thị Thu Hà', title: 'Chị', phone: '0912 345 678', email: 'thuha@gmail.com', avatar: { emoji: '👩', bg: '#e0576f' } },
    { id: 'p2', username: 'phuhuynh2', passwordHash: DEMO_HASH, role: 'parent', name: 'Phạm Quốc Bảo', title: 'Anh', phone: '0987 654 321', email: 'quocbao@gmail.com', avatar: { emoji: '👨', bg: '#27ae60' } },
    { id: 'p3', username: 'ph.tuan', passwordHash: DEMO_HASH, role: 'parent', name: 'Vũ Anh Tuấn', title: 'Anh', phone: '0909 100 300', email: 'anhtuan@gmail.com', avatar: { emoji: '👨', bg: '#d68910' } },
    { id: 'p4', username: 'ph.lan', passwordHash: DEMO_HASH, role: 'parent', name: 'Đỗ Ngọc Lan', title: 'Chị', phone: '0909 200 400', email: 'ngoclan@gmail.com', avatar: { emoji: '👩', bg: '#16a085' } },
    { id: 'p5', username: 'ph.minh', passwordHash: DEMO_HASH, role: 'parent', name: 'Hoàng Nhật Minh', title: 'Anh', phone: '0909 500 600', email: 'nhatminh@gmail.com', avatar: { emoji: '👨', bg: '#8e44ad' } },
    { id: 'p6', username: 'ph.huong', passwordHash: DEMO_HASH, role: 'parent', name: 'Bùi Thu Hương', title: 'Chị', phone: '0909 700 800', email: 'thuhuong@gmail.com', avatar: { emoji: '👩', bg: '#c0392b' } },
  ];

  const students = [
    { id: 's1', name: 'Nguyễn Minh Khang', dob: '2018-04-12', gender: 'Nam', classId: 'c1', parentIds: ['p1'], avatar: { emoji: '👦', bg: '#3f6ad8' }, address: '12 Hoa Phượng, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Không', code: 'HS2018041' },
    { id: 's2', name: 'Nguyễn Bảo Ngọc', dob: '2016-09-03', gender: 'Nữ', classId: 'c2', parentIds: ['p1'], avatar: { emoji: '👧', bg: '#e0576f' }, address: '12 Hoa Phượng, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Tôm, cua', code: 'HS2016093' },
    { id: 's3', name: 'Phạm Gia Hân', dob: '2018-01-25', gender: 'Nữ', classId: 'c1', parentIds: ['p2'], avatar: { emoji: '👧', bg: '#27ae60' }, address: '45 Trường Sa, Q. Bình Thạnh', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: 'HS2018012' },
    { id: 's4', name: 'Vũ Đức Anh', dob: '2018-07-19', gender: 'Nam', classId: 'c1', parentIds: ['p3'], avatar: { emoji: '🧒', bg: '#d68910' }, address: '78 Phan Xích Long, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Đậu phộng', code: 'HS2018071' },
    { id: 's5', name: 'Đỗ Khánh Vy', dob: '2018-11-08', gender: 'Nữ', classId: 'c1', parentIds: ['p4'], avatar: { emoji: '👧', bg: '#16a085' }, address: '102 Nguyễn Kiệm, Q. Gò Vấp', ethnicity: 'Kinh', bloodType: 'AB', allergies: 'Không', code: 'HS2018118' },
    { id: 's6', name: 'Hoàng Gia Bảo', dob: '2018-03-30', gender: 'Nam', classId: 'c1', parentIds: ['p5'], avatar: { emoji: '👦', bg: '#8e44ad' }, address: '5 Đặng Văn Ngữ, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'A', allergies: 'Không', code: 'HS2018033' },
    { id: 's7', name: 'Bùi Minh Thư', dob: '2016-05-16', gender: 'Nữ', classId: 'c2', parentIds: ['p6'], avatar: { emoji: '👧', bg: '#c0392b' }, address: '210 Lê Văn Sỹ, Q.3', ethnicity: 'Kinh', bloodType: 'O', allergies: 'Sữa bò', code: 'HS2016051' },
    { id: 's8', name: 'Vũ Hải Đăng', dob: '2016-12-01', gender: 'Nam', classId: 'c2', parentIds: ['p3'], avatar: { emoji: '👦', bg: '#2c3e50' }, address: '78 Phan Xích Long, Q. Phú Nhuận', ethnicity: 'Kinh', bloodType: 'B', allergies: 'Không', code: 'HS2016121' },
  ];

  // ---- Điểm danh: 20 ngày học gần nhất ----
  const attendance = [];
  let attId = 1;
  const days = recentWeekdays(20);
  students.forEach((s, si) => {
    days.forEach((d, di) => {
      // hôm nay: lớp 3A đã điểm danh, lớp 5B chưa
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
        note: status === 'absent_excused' ? 'Nghỉ có phép (gia đình xin phép)' : status === 'late' ? 'Đến muộn do kẹt xe' : '',
        markedBy: s.classId === 'c1' ? 't1' : 't2',
      };
      attendance.push(rec);
    });
  });

  // ---- Xin phép nghỉ học ----
  const leaveRequests = [
    { id: 'lv_1', studentId: 's1', parentId: 'p1', fromDate: fmt(daysAhead(1)), toDate: fmt(daysAhead(1)), reason: 'Gia đình có việc riêng, xin phép cho con nghỉ 1 ngày.', status: 'pending', createdAt: iso(daysAgo(0), 8, 30), reviewedBy: null, reviewNote: '' },
    { id: 'lv_2', studentId: 's1', parentId: 'p1', fromDate: fmt(daysAgo(9)), toDate: fmt(daysAgo(8)), reason: 'Con bị sốt nhẹ, gia đình cho con ở nhà theo dõi.', status: 'approved', createdAt: iso(daysAgo(10), 20, 15), reviewedBy: 't1', reviewNote: 'Cô đã nhận thông tin. Chúc con mau khỏe!' },
    { id: 'lv_3', studentId: 's3', parentId: 'p2', fromDate: fmt(daysAgo(4)), toDate: fmt(daysAgo(4)), reason: 'Con về quê dự đám giỗ cùng gia đình.', status: 'approved', createdAt: iso(daysAgo(6), 19, 0), reviewedBy: 't1', reviewNote: 'Đồng ý. Gia đình nhắc con ôn bài nhé.' },
    { id: 'lv_4', studentId: 's2', parentId: 'p1', fromDate: fmt(daysAgo(15)), toDate: fmt(daysAgo(15)), reason: 'Xin nghỉ buổi chiều đi khám răng.', status: 'rejected', createdAt: iso(daysAgo(16), 9, 45), reviewedBy: 't2', reviewNote: 'Chiều đó lớp có bài kiểm tra giữa kỳ, mong gia đình đổi lịch giúp.' },
  ];

  // ---- Thực đơn bán trú: tuần này + tuần sau ----
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

  // ---- Thời khóa biểu ----
  const tt = (subjects) => subjects; // [môn theo tiết]
  const periodTimes = [
    { p: 1, time: '07:30 – 08:05' }, { p: 2, time: '08:10 – 08:45' }, { p: 3, time: '09:00 – 09:35' },
    { p: 4, time: '09:40 – 10:15' }, { p: 5, time: '14:00 – 14:35' }, { p: 6, time: '14:40 – 15:15' }, { p: 7, time: '15:25 – 16:00' },
  ];
  const timetable = [
    {
      classId: 'c1',
      periodTimes,
      days: {
        1: tt(['Chào cờ', 'Toán', 'Tiếng Việt', 'Tiếng Việt', 'Đạo đức', 'Tự nhiên & Xã hội', 'Ôn tập']),
        2: tt(['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Tiếng Anh', 'Mỹ thuật', 'Toán (ôn)', 'Hoạt động trải nghiệm']),
        3: tt(['Tiếng Việt', 'Toán', 'Thể dục', 'Tự nhiên & Xã hội', 'Tin học', 'Tiếng Việt (ôn)', 'Đọc sách thư viện']),
        4: tt(['Toán', 'Tiếng Anh', 'Tiếng Việt', 'Âm nhạc', 'Thể dục', 'Toán (ôn)', 'Câu lạc bộ']),
        5: tt(['Tiếng Việt', 'Toán', 'Tin học', 'Tiếng Việt', 'Hoạt động trải nghiệm', 'Sinh hoạt lớp', '—']),
      },
    },
    {
      classId: 'c2',
      periodTimes,
      days: {
        1: tt(['Chào cờ', 'Toán', 'Tiếng Việt', 'Khoa học', 'Đạo đức', 'Lịch sử & Địa lý', 'Ôn tập']),
        2: tt(['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Tiếng Anh', 'Tin học', 'Khoa học', 'Hoạt động trải nghiệm']),
        3: tt(['Tiếng Việt', 'Toán', 'Thể dục', 'Lịch sử & Địa lý', 'Mỹ thuật', 'Toán (ôn)', 'Đọc sách thư viện']),
        4: tt(['Toán', 'Tiếng Anh', 'Tiếng Việt', 'Âm nhạc', 'Thể dục', 'Tiếng Việt (ôn)', 'Câu lạc bộ']),
        5: tt(['Tiếng Việt', 'Toán', 'Tin học', 'Khoa học', 'Hoạt động trải nghiệm', 'Sinh hoạt lớp', '—']),
      },
    },
  ];

  // ---- Nhận xét hằng ngày ----
  const remarkTexts = [
    { content: 'Con học tập tập trung, hăng hái phát biểu xây dựng bài. Con ăn hết suất và ngủ trưa ngoan.', rating: 'great' },
    { content: 'Con hoàn thành tốt bài tập trên lớp. Giờ ăn trưa con hơi chậm, cô đã động viên con.', rating: 'good' },
    { content: 'Con tích cực tham gia hoạt động nhóm, biết giúp đỡ bạn. Cô khen con trước lớp.', rating: 'great' },
    { content: 'Hôm nay con còn nói chuyện riêng trong giờ học, cô nhắc nhở và con đã sửa ngay. Mong gia đình động viên thêm.', rating: 'needs_effort' },
    { content: 'Con viết bài sạch đẹp, đọc to rõ ràng. Con vui vẻ hòa đồng với các bạn.', rating: 'great' },
    { content: 'Con làm toán còn vài lỗi nhỏ do vội, cô đã hướng dẫn con kiểm tra lại bài. Con tiếp thu nhanh.', rating: 'good' },
  ];
  const skillsPool = [['Tập trung', 'Phát biểu'], ['Hợp tác nhóm'], ['Chữ viết', 'Đọc hiểu'], ['Tự phục vụ'], ['Lễ phép'], ['Sáng tạo']];
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
  const subjectSet3 = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Tự nhiên & Xã hội', 'Đạo đức', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Tin học'];
  const subjectSet5 = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Khoa học', 'Lịch sử & Địa lý', 'Đạo đức', 'Âm nhạc', 'Mỹ thuật', 'Thể dục', 'Tin học'];
  const evalLevels = ['Hoàn thành tốt', 'Hoàn thành xuất sắc', 'Hoàn thành'];
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
          score: ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Khoa học', 'Tin học', 'Lịch sử & Địa lý', 'Tự nhiên & Xã hội'].includes(name) ? 7 + ((si + i + ti) % 4) : null,
          level: pick(evalLevels, si + i + ti),
          comment: '',
        })),
        conduct: 'Tốt',
        overall: pick(['Hoàn thành xuất sắc nhiệm vụ học tập', 'Hoàn thành tốt nhiệm vụ học tập'], si + ti),
        attendanceSummary: { present: 85 + ((si * 3) % 6), absent: (si + ti) % 3, late: si % 2 },
        teacherComment: pick([
          'Con chăm ngoan, tiếp thu bài tốt, tích cực tham gia các hoạt động của lớp. Cần phát huy hơn nữa ở môn Toán.',
          'Con có nhiều tiến bộ trong học kỳ, đọc viết trôi chảy, tính toán nhanh. Cô mong con mạnh dạn phát biểu hơn.',
          'Con học đều các môn, có năng khiếu mỹ thuật. Gia đình nhắc con rèn thêm chữ viết nhé.',
        ], si + ti),
      });
    });
  });

  // ---- Xe buýt ----
  const busRoutes = [
    {
      id: 'bus1', name: 'Tuyến 01 – Phú Nhuận', plate: '51B-123.45',
      driver: { name: 'Chú Trần Văn Tám', phone: '0918 000 111' },
      monitor: { name: 'Cô Lê Thị Xuân', phone: '0918 000 222' },
      studentIds: ['s1', 's4', 's6'],
      stops: [
        { name: 'Ngã tư Phú Nhuận', pickup: '06:40', dropoff: '17:05' },
        { name: 'Chợ Nguyễn Đình Chiểu', pickup: '06:50', dropoff: '16:55' },
        { name: 'Công viên Gia Định', pickup: '07:00', dropoff: '16:45' },
        { name: 'Trường Tiểu học Ánh Dương', pickup: '07:15', dropoff: '16:35' },
      ],
      log: [
        { time: iso(today, 6, 38), text: 'Xe bắt đầu đón học sinh tại Ngã tư Phú Nhuận' },
        { time: iso(today, 7, 12), text: 'Xe đã về đến trường, đủ sĩ số 3/3 học sinh' },
      ],
    },
    {
      id: 'bus2', name: 'Tuyến 02 – Bình Thạnh', plate: '51B-678.90',
      driver: { name: 'Chú Ngô Văn Sáu', phone: '0918 333 444' },
      monitor: { name: 'Cô Phan Mỹ Duyên', phone: '0918 555 666' },
      studentIds: ['s2', 's7'],
      stops: [
        { name: 'Chợ Bà Chiểu', pickup: '06:35', dropoff: '17:10' },
        { name: 'Ngã ba Hàng Xanh', pickup: '06:45', dropoff: '17:00' },
        { name: 'Cầu Thị Nghè', pickup: '06:55', dropoff: '16:50' },
        { name: 'Trường Tiểu học Ánh Dương', pickup: '07:10', dropoff: '16:35' },
      ],
      log: [
        { time: iso(today, 6, 33), text: 'Xe bắt đầu đón học sinh tại Chợ Bà Chiểu' },
        { time: iso(today, 7, 8), text: 'Xe đã về đến trường, đủ sĩ số 2/2 học sinh' },
      ],
    },
  ];

  // ---- Nề nếp ----
  const conduct = [];
  let cdId = 1;
  const conductItems = [
    { type: 'praise', title: 'Tuyên dương giữ gìn vệ sinh lớp học', content: 'Con chủ động nhặt rác và sắp xếp kệ sách gọn gàng.', points: 10 },
    { type: 'praise', title: 'Gương mặt tiêu biểu tuần', content: 'Con đạt nhiều hoa điểm tốt trong tuần, gương mẫu trong giờ tự quản.', points: 20 },
    { type: 'reminder', title: 'Nhắc nhở đồng phục', content: 'Con quên đeo khăn quàng, gia đình nhắc con chuẩn bị trước khi đến lớp nhé.', points: -5 },
    { type: 'praise', title: 'Giúp đỡ bạn học tập', content: 'Con hướng dẫn bạn cùng bàn làm bài tập toán rất nhiệt tình.', points: 15 },
    { type: 'reminder', title: 'Nhắc nhở xếp hàng', content: 'Con còn đùa nghịch khi xếp hàng xuống sân, cô đã nhắc nhở.', points: -5 },
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
      title: 'Khảo sát chất lượng bữa ăn bán trú',
      description: 'Nhà trường mong nhận được ý kiến của quý phụ huynh về chất lượng bữa ăn bán trú học kỳ này để phục vụ các con tốt hơn.',
      createdBy: 't1', createdAt: iso(daysAgo(3), 9, 0), deadline: fmt(daysAhead(5)),
      audience: 'all', status: 'open',
      questions: [
        { id: 'q1', text: 'Mức độ hài lòng của gia đình về thực đơn hiện tại?', type: 'choice', options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Chưa hài lòng'] },
        { id: 'q2', text: 'Con có thường kể về bữa ăn ở trường không?', type: 'choice', options: ['Thường xuyên', 'Thỉnh thoảng', 'Hiếm khi'] },
        { id: 'q3', text: 'Gia đình muốn bổ sung món ăn nào vào thực đơn?', type: 'text' },
      ],
      responses: [
        { userId: 'p2', studentId: 's3', submittedAt: iso(daysAgo(1), 20, 30), answers: { q1: 'Hài lòng', q2: 'Thường xuyên', q3: 'Mong có thêm món súp và trái cây đa dạng hơn.' } },
        { userId: 'p4', studentId: 's5', submittedAt: iso(daysAgo(2), 21, 10), answers: { q1: 'Rất hài lòng', q2: 'Thỉnh thoảng', q3: 'Không có, thực đơn hiện tại rất tốt.' } },
      ],
    },
    {
      id: 'sv2',
      title: 'Đăng ký câu lạc bộ ngoại khóa học kỳ mới',
      description: 'Phụ huynh vui lòng cho biết nguyện vọng đăng ký câu lạc bộ ngoại khóa cho con (Cờ vua, Bóng rổ, Mỹ thuật, STEM, Aerobic).',
      createdBy: 't1', createdAt: iso(daysAgo(12), 8, 0), deadline: fmt(daysAgo(2)),
      audience: 'all', status: 'closed',
      questions: [
        { id: 'q1', text: 'Gia đình đăng ký câu lạc bộ nào cho con?', type: 'choice', options: ['Cờ vua', 'Bóng rổ', 'Mỹ thuật', 'STEM', 'Aerobic', 'Không đăng ký'] },
        { id: 'q2', text: 'Khung giờ phù hợp để đón con sau giờ CLB?', type: 'choice', options: ['16:30', '17:00', '17:30'] },
      ],
      responses: [
        { userId: 'p1', studentId: 's1', submittedAt: iso(daysAgo(10), 19, 0), answers: { q1: 'STEM', q2: '17:00' } },
        { userId: 'p2', studentId: 's3', submittedAt: iso(daysAgo(9), 18, 30), answers: { q1: 'Mỹ thuật', q2: '16:30' } },
        { userId: 'p3', studentId: 's4', submittedAt: iso(daysAgo(9), 21, 45), answers: { q1: 'Bóng rổ', q2: '17:30' } },
        { userId: 'p6', studentId: 's7', submittedAt: iso(daysAgo(8), 20, 0), answers: { q1: 'Cờ vua', q2: '17:00' } },
      ],
    },
  ];

  // ---- Y tế ----
  const health = [];
  let htId = 1;
  students.forEach((s, si) => {
    health.push(
      { id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(40 + si)), type: 'checkup', title: 'Khám sức khỏe định kỳ đầu năm', detail: 'Sức khỏe tổng quát tốt. Răng miệng bình thường.', height: s.classId === 'c1' ? 128 + si : 140 + si, weight: s.classId === 'c1' ? 26 + si : 34 + si, vision: '10/10', bmiNote: 'Cân đối' },
      { id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(70 + si)), type: 'vaccination', title: 'Tiêm nhắc vắc-xin Sởi – Rubella', detail: 'Tiêm tại trường theo chương trình y tế học đường. Không phản ứng phụ.' },
    );
    if (si % 3 === 0) {
      health.push({ id: 'ht_' + htId++, studentId: s.id, date: fmt(daysAgo(6)), type: 'incident', title: 'Trầy xước nhẹ khi chơi ở sân trường', detail: 'Con bị trầy nhẹ ở đầu gối, y tế trường đã sát khuẩn và dán băng cá nhân. Con vui vẻ trở lại lớp ngay sau đó.' });
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
      note: 'Con mới hết ho, nhờ cô cho con uống đúng giờ giúp gia đình. Thuốc để trong ba lô, ngăn trước.',
      status: 'received', createdAt: iso(daysAgo(0), 6, 50), confirmedBy: 't1', confirmedAt: iso(daysAgo(0), 7, 40),
      log: [{ time: iso(daysAgo(0), 11, 15), text: 'Đã cho con uống Siro ho Prospan sau bữa trưa' }],
    },
    {
      id: 'md_2', studentId: 's3', parentId: 'p2',
      fromDate: fmt(daysAgo(5)), toDate: fmt(daysAgo(3)),
      medicines: [{ name: 'Men vi sinh Enterogermina', dose: '1 ống', timing: 'Trước bữa trưa 30 phút' }],
      note: 'Con hơi rối loạn tiêu hóa, bác sĩ kê men vi sinh 3 ngày.',
      status: 'done', createdAt: iso(daysAgo(5), 7, 0), confirmedBy: 't1', confirmedAt: iso(daysAgo(5), 7, 30),
      log: [{ time: iso(daysAgo(3), 11, 0), text: 'Hoàn tất đợt uống thuốc theo dặn của gia đình' }],
    },
  ];

  // ---- Album ảnh (ảnh minh họa bằng gradient + emoji) ----
  const albums = [
    {
      id: 'al1', classId: 'c1', title: 'Lễ khai giảng năm học ' + schoolYear, date: fmt(daysAgo(25)),
      description: 'Những khoảnh khắc đáng nhớ của các con trong ngày khai giảng năm học mới.',
      createdBy: 't1',
      photos: [
        { id: 'ph1', emoji: '🎈', g: ['#ff9a9e', '#fad0c4'], caption: 'Cổng trường rực rỡ cờ hoa' },
        { id: 'ph2', emoji: '🥁', g: ['#a18cd1', '#fbc2eb'], caption: 'Tiết mục trống hội khai trường' },
        { id: 'ph3', emoji: '🎓', g: ['#84fab0', '#8fd3f4'], caption: 'Các con lớp 3A chào đón năm học mới' },
        { id: 'ph4', emoji: '🎏', g: ['#ffecd2', '#fcb69f'], caption: 'Thả bóng bay ước mơ' },
        { id: 'ph5', emoji: '📚', g: ['#89f7fe', '#66a6ff'], caption: 'Nhận sách vở đầu năm' },
        { id: 'ph6', emoji: '🤝', g: ['#fddb92', '#d1fdff'], caption: 'Chụp ảnh cùng cô chủ nhiệm' },
      ],
    },
    {
      id: 'al2', classId: 'c1', title: 'Hoạt động trải nghiệm: Một ngày làm nông dân', date: fmt(daysAgo(11)),
      description: 'Các con được tự tay trồng rau, thu hoạch củ quả tại nông trại giáo dục.',
      createdBy: 't1',
      photos: [
        { id: 'ph7', emoji: '🌱', g: ['#d4fc79', '#96e6a1'], caption: 'Gieo hạt trồng rau' },
        { id: 'ph8', emoji: '🥕', g: ['#fbc2eb', '#a6c1ee'], caption: 'Thu hoạch cà rốt' },
        { id: 'ph9', emoji: '🐄', g: ['#fdfbfb', '#ebedee'], caption: 'Thăm chuồng bò sữa' },
        { id: 'ph10', emoji: '🍅', g: ['#ff9a9e', '#fecfef'], caption: 'Hái cà chua chín' },
        { id: 'ph11', emoji: '😄', g: ['#a1c4fd', '#c2e9fb'], caption: 'Giờ ăn trưa dã ngoại' },
      ],
    },
    {
      id: 'al3', classId: 'c2', title: 'Hội thao chào mừng 20/11', date: fmt(daysAgo(18)),
      description: 'Lớp 5B thi đấu kéo co, nhảy bao bố và tiếp sức chào mừng ngày Nhà giáo Việt Nam.',
      createdBy: 't2',
      photos: [
        { id: 'ph12', emoji: '🏃', g: ['#f6d365', '#fda085'], caption: 'Chạy tiếp sức 4x100m' },
        { id: 'ph13', emoji: '💪', g: ['#84fab0', '#8fd3f4'], caption: 'Kéo co gay cấn' },
        { id: 'ph14', emoji: '🏆', g: ['#fccb90', '#d57eeb'], caption: 'Lớp 5B đạt giải Nhì toàn đoàn' },
        { id: 'ph15', emoji: '🎖️', g: ['#e0c3fc', '#8ec5fc'], caption: 'Trao huy chương' },
      ],
    },
    {
      id: 'al4', classId: 'c1', title: 'Sinh nhật các bạn tháng này', date: fmt(daysAgo(2)),
      description: 'Cả lớp cùng chúc mừng sinh nhật các bạn, ăn bánh kem và chơi trò chơi.',
      createdBy: 't1',
      photos: [
        { id: 'ph16', emoji: '🎂', g: ['#ffd1ff', '#fad0c4'], caption: 'Thổi nến sinh nhật' },
        { id: 'ph17', emoji: '🎁', g: ['#a8edea', '#fed6e3'], caption: 'Tặng quà cho bạn' },
        { id: 'ph18', emoji: '🥳', g: ['#fff1eb', '#ace0f9'], caption: 'Cùng nhau ca hát' },
      ],
    },
  ];

  // ---- Kế hoạch giáo dục ----
  const m0 = today.getMonth() + 1;
  const eduPlans = [
    {
      id: 'ep1', classId: 'c1', month: m0, year: today.getFullYear(),
      theme: 'Em yêu trường em',
      goals: ['Rèn nền nếp tự quản, xếp hàng nhanh nhẹn', 'Hoàn thành bảng nhân chia trong phạm vi 1000', 'Đọc trôi chảy và kể lại được câu chuyện đã học', 'Biết giữ gìn vệ sinh cá nhân và lớp học'],
      weeks: [
        { week: 1, focus: 'Ổn định nền nếp, ôn tập kiến thức', activities: 'Ôn bảng nhân chia; luyện đọc nhóm đôi; trang trí góc học tập của lớp.' },
        { week: 2, focus: 'Chủ đề "Trường học thân thiện"', activities: 'Vẽ tranh về trường em; thi kể chuyện theo tranh; sinh hoạt CLB đọc sách.' },
        { week: 3, focus: 'Học qua trải nghiệm', activities: 'Thực hành đo độ dài trong sân trường; chăm sóc bồn hoa lớp phụ trách.' },
        { week: 4, focus: 'Tổng kết chủ đề', activities: 'Trưng bày sản phẩm học tập; đánh giá nhận xét cuối tháng; khen thưởng gương tiêu biểu.' },
      ],
      note: 'Rất mong quý phụ huynh đồng hành nhắc con ôn bảng nhân chia mỗi tối 10 phút.',
      createdBy: 't1',
    },
    {
      id: 'ep2', classId: 'c2', month: m0, year: today.getFullYear(),
      theme: 'Em là đội viên chăm ngoan',
      goals: ['Nắm vững phân số và các phép tính với phân số', 'Viết được bài văn tả cảnh hoàn chỉnh', 'Rèn kỹ năng thuyết trình trước lớp', 'Tích cực tham gia phong trào Đội'],
      weeks: [
        { week: 1, focus: 'Củng cố kiến thức nền', activities: 'Ôn tập phân số; luyện viết đoạn mở bài, kết bài; sinh hoạt Đội đầu tháng.' },
        { week: 2, focus: 'Dự án nhóm "Quê hương em"', activities: 'Sưu tầm tư liệu về địa phương; làm poster nhóm; thuyết trình trước lớp.' },
        { week: 3, focus: 'Ứng dụng thực tế', activities: 'Toán thực tế: tính chu vi diện tích vườn trường; viết bài tả cảnh sân trường giờ ra chơi.' },
        { week: 4, focus: 'Tổng kết và đánh giá', activities: 'Kiểm tra cuối tháng; bình chọn đội viên tiêu biểu; chuẩn bị chủ đề tháng sau.' },
      ],
      note: 'Phụ huynh hỗ trợ con sưu tầm hình ảnh, tư liệu về quê hương cho dự án tuần 2 nhé.',
      createdBy: 't2',
    },
  ];

  // ---- Thông báo ----
  const notifications = [
    { id: 'nt1', title: 'Thông báo nghỉ Lễ Quốc khánh 2/9', body: 'Nhà trường thông báo lịch nghỉ Lễ Quốc khánh: học sinh nghỉ học từ ngày 01/09 đến hết ngày 02/09. Lịch học trở lại bình thường vào ngày kế tiếp. Kính chúc quý gia đình kỳ nghỉ lễ vui vẻ, an toàn.', category: 'Nhà trường', audience: 'all', createdBy: 't1', createdAt: iso(daysAgo(1), 10, 0), pinned: true, readBy: [] },
    { id: 'nt2', title: 'Thu học phí và tiền ăn bán trú tháng này', body: 'Kính mời quý phụ huynh hoàn tất học phí và tiền ăn bán trú trước ngày 10. Phụ huynh có thể chuyển khoản qua tài khoản của trường hoặc đóng trực tiếp tại phòng kế toán. Chi tiết đã gửi trong sổ liên lạc của từng con.', category: 'Học phí', audience: 'all', createdBy: 't1', createdAt: iso(daysAgo(2), 8, 30), pinned: false, readBy: ['p2'] },
    { id: 'nt3', title: 'Lớp 3A: Chuẩn bị đồ dùng tiết Mỹ thuật thứ Ba', body: 'Cô nhờ gia đình chuẩn bị cho con: giấy A4, màu sáp, kéo và hồ dán cho tiết Mỹ thuật sáng thứ Ba tuần này. Các con sẽ làm sản phẩm thủ công chủ đề "Trường em".', category: 'Lớp học', audience: 'c1', createdBy: 't1', createdAt: iso(daysAgo(0), 7, 45), pinned: false, readBy: [] },
    { id: 'nt4', title: 'Lịch khám sức khỏe định kỳ học kỳ này', body: 'Trạm y tế phường phối hợp cùng nhà trường tổ chức khám sức khỏe định kỳ cho học sinh toàn trường vào tuần sau. Phụ huynh vui lòng cho con ăn sáng đầy đủ trước khi đến trường.', category: 'Y tế', audience: 'all', createdBy: 't2', createdAt: iso(daysAgo(4), 15, 20), pinned: false, readBy: ['p1', 'p2'] },
    { id: 'nt5', title: 'Lớp 5B: Nộp bài dự thi "Viết về thầy cô"', body: 'Các con lớp 5B hoàn thành bài dự thi viết về thầy cô và nộp cho lớp trưởng trước thứ Sáu tuần này. Bài viết tay trên giấy ô ly, tối thiểu 1 trang.', category: 'Lớp học', audience: 'c2', createdBy: 't2', createdAt: iso(daysAgo(1), 16, 0), pinned: false, readBy: [] },
  ];

  // ---- Hội thoại nhắn tin ----
  const conversations = [
    {
      id: 'cv1', type: 'direct', participantIds: ['p1', 't1'],
      messages: [
        { id: 'ms1', senderId: 'p1', text: 'Chào cô Mai Anh, hôm nay Khang về kể được cô khen bài toán ạ. Gia đình cảm ơn cô nhiều!', createdAt: iso(daysAgo(1), 17, 20) },
        { id: 'ms2', senderId: 't1', text: 'Chào chị Hà, đúng rồi ạ. Hôm nay con làm nhanh và đúng cả 5 bài, cô tuyên dương con trước lớp. Con dạo này tiến bộ rõ lắm chị ạ.', createdAt: iso(daysAgo(1), 17, 45) },
        { id: 'ms3', senderId: 'p1', text: 'Dạ vui quá cô ạ. À cô ơi, mai con có tiết Tin học, con cần mang tai nghe không cô?', createdAt: iso(daysAgo(1), 18, 2) },
        { id: 'ms4', senderId: 't1', text: 'Dạ không cần chị nhé, phòng máy của trường có sẵn tai nghe cho các con rồi ạ.', createdAt: iso(daysAgo(1), 18, 10) },
        { id: 'ms5', senderId: 't1', text: 'Chị Hà ơi, sáng nay cô đã nhận thuốc và cho Khang uống siro ho sau bữa trưa đúng giờ rồi nhé. Con ăn hết suất, chị yên tâm ạ.', createdAt: iso(daysAgo(0), 12, 30) },
      ],
      lastRead: { p1: iso(daysAgo(1), 18, 12), t1: iso(daysAgo(0), 12, 30) },
    },
    {
      id: 'cv2', type: 'direct', participantIds: ['p1', 't2'],
      messages: [
        { id: 'ms6', senderId: 't2', text: 'Chào chị Hà, tuần này Bảo Ngọc làm bài văn tả cảnh rất tốt, thầy đọc mẫu trước lớp. Thầy gửi lời khen đến gia đình ạ.', createdAt: iso(daysAgo(2), 16, 40) },
        { id: 'ms7', senderId: 'p1', text: 'Dạ em cảm ơn thầy Hùng ạ. Ở nhà cháu cũng rất thích đọc sách văn học ạ.', createdAt: iso(daysAgo(2), 19, 5) },
      ],
      lastRead: { p1: iso(daysAgo(2), 19, 5), t2: iso(daysAgo(2), 19, 6) },
    },
    {
      id: 'cv3', type: 'direct', participantIds: ['p2', 't1'],
      messages: [
        { id: 'ms8', senderId: 'p2', text: 'Cô ơi, Gia Hân về nhà nói hơi đau bụng, cô để ý giúp em bữa trưa mai của con với ạ.', createdAt: iso(daysAgo(0), 6, 30) },
      ],
      lastRead: { p2: iso(daysAgo(0), 6, 30), t1: iso(daysAgo(3), 8, 0) },
    },
    {
      id: 'cv4', type: 'group', name: 'Lớp 3A – Thông tin chung', classId: 'c1',
      participantIds: ['t1', 'p1', 'p2', 'p3', 'p4', 'p5'],
      messages: [
        { id: 'ms9', senderId: 't1', text: 'Cô chào cả nhà lớp 3A! Tuần này lớp mình sẽ có tiết trải nghiệm ngoài trời vào thứ Năm, phụ huynh cho con mang theo mũ và chai nước cá nhân nhé.', createdAt: iso(daysAgo(2), 9, 0) },
        { id: 'ms10', senderId: 'p3', text: 'Dạ cảm ơn cô đã thông báo ạ.', createdAt: iso(daysAgo(2), 9, 25) },
        { id: 'ms11', senderId: 'p4', text: 'Gia đình em đã nắm thông tin. Cảm ơn cô ạ!', createdAt: iso(daysAgo(2), 10, 12) },
        { id: 'ms12', senderId: 't1', text: 'Cô gửi cả nhà thực đơn tuần mới đã cập nhật trên mục Thực đơn của ứng dụng ạ. Phụ huynh nào có con dị ứng thực phẩm nhắn riêng cho cô nhé.', createdAt: iso(daysAgo(0), 8, 15) },
      ],
      lastRead: { t1: iso(daysAgo(0), 8, 15), p1: iso(daysAgo(2), 10, 30), p2: iso(daysAgo(2), 9, 30), p3: iso(daysAgo(2), 9, 25), p4: iso(daysAgo(2), 10, 12), p5: iso(daysAgo(3), 7, 0) },
    },
  ];

  const db = {
    school, classes, users, students,
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
