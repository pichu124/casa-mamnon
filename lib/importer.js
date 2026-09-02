// Nạp một khối dữ liệu dạng JSON (hình dạng của db.json đời cũ) vào SQLite.
//
// Dùng chung cho hai việc: sinh dữ liệu mẫu (data/seed.js) và chuyển đổi dữ liệu
// thật của trường từ bản JSON cũ sang (scripts/migrate-json-to-sqlite.js).
// Toàn bộ nằm trong một giao dịch: hoặc nạp trọn vẹn, hoặc không ghi gì cả.
const fs = require('fs');
const path = require('path');
const db = require('./db');

// "Lớp 3A" → 3, phục vụ thao tác lên lớp cuối năm.
function gradeOf(className) {
  const m = String(className || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

const nowIso = () => new Date().toISOString();

// BẢNG CỦA PHÂN HỆ CẮM THÊM — TÌM RA, KHÔNG LIỆT KÊ TAY.
//
// VÌ SAO CẦN
//
// Danh sách xoá bên dưới chỉ có bảng LÕI. Nhập lại một kho JSON đời cũ, hay
// chạy `npm run seed -- --force`, sẽ xoá sạch bé và nhóm nhưng ĐỂ NGUYÊN nhật
// ký ngày, quan sát, kế hoạch, sổ đón trả của những bé vừa bị xoá.
//
// Hai hậu quả, và cái thứ hai nặng hơn:
//
//   1. Dữ liệu mồ côi: hàng nghìn dòng trỏ vào `studentId` không còn tồn tại.
//   2. GHI CHÉP VỀ MỘT ĐỨA TRẺ SỐNG SÓT SAU KHI ĐỨA TRẺ ĐÓ ĐÃ BỊ XOÁ KHỎI HỆ
//      THỐNG. Nghị định 13/2023 cho chủ thể dữ liệu quyền xoá; xoá bé mà nhật
//      ký ăn ngủ vệ sinh của bé vẫn nằm lại là chưa xoá.
//
// VÌ SAO TÌM RA CHỨ KHÔNG LIỆT KÊ
//
// Phân hệ là thứ cắm thêm được và gỡ ra được. Một danh sách viết tay ở đây sẽ
// lạc hậu ngay lần thêm phân hệ tiếp theo — và lạc hậu về phía BỎ SÓT, tức là
// im lặng. `lib/modules.js` đã ép mọi bảng của phân hệ phải mang tên bắt đầu
// bằng mã phân hệ; dựa vào đúng quy ước đó mà tra `sqlite_master`.
function bangCuaPhanHe() {
  // ĐỌC THẲNG THƯ MỤC `modules/`, KHÔNG HỎI `lib/modules.js`.
  //
  // Danh sách phân hệ cắm thêm trong bộ nhớ chỉ có sau khi máy chủ gọi
  // `napMoRong()`. Còn `importSnapshot` thì hay chạy ngoài máy chủ — trong
  // `data/seed.js`, trong `scripts/migrate-json-to-sqlite.js`. Hỏi bộ nhớ ở đó
  // là nhận về danh sách rỗng, và hàm này lặng lẽ không xoá gì cả.
  //
  // CHỈ phân hệ CẮM THÊM, không tính phân hệ lõi: bảng lõi đã nằm trong danh
  // sách viết tay bên trên và được xoá đúng thứ tự khoá ngoại. Tính cả chúng
  // thì tiền tố `album_` sẽ tóm luôn `album_photos` — một bảng lõi — và xoá nó
  // ngoài thứ tự đã tính.
  let khoa = [];
  try {
    const mods = require('./modules');
    const loi = new Set((mods.CORE || []).map(m => m.key));
    for (const ten of fs.readdirSync(mods.MODULES_DIR)) {
      const tep = path.join(mods.MODULES_DIR, ten, 'module.json');
      if (!fs.existsSync(tep)) continue;
      let mj = null;
      try { mj = JSON.parse(fs.readFileSync(tep, 'utf8')); } catch (_) { continue; }
      const k = (mj && mj.key) || ten;
      if (k && !loi.has(k)) khoa.push(k);
    }
  } catch (_) {
    return [];   // đọc không được thì thà bỏ qua còn hơn xoá nhầm bảng lõi
  }
  if (!khoa.length) return [];

  let ten = [];
  try {
    ten = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
      .map(r => r.name);
  } catch (_) { return []; }

  // Chỉ nhận tên khớp ĐÚNG `<mã>_...`. `nhatky_ngay` thì nhận; `students` thì
  // không, và `nhatkyngay` cũng không — thiếu dấu gạch dưới là không phải bảng
  // do phân hệ đó tạo ra.
  return ten.filter(t => khoa.some(k => t.startsWith(`${k}_`)));
}

function importSnapshot(snap, { clear = true } = {}) {
  const stats = {};
  const bump = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

  db.tx(() => {
    if (clear) {
      // Xóa theo thứ tự ngược khóa ngoại. Bảng con có ON DELETE CASCADE nhưng
      // xóa tường minh cho chắc chắn và dễ đọc.
      for (const t of [
        // `record_edits` (cờ đã-sửa/đã-thu-hồi của lib/sua-thu-hoi.js) KHÔNG có
        // khoá ngoại nên không tự sạch theo bảng cha như class_teachers hay
        // student_class_periods. Bỏ sót nó là để lại cờ thu hồi mồ côi có thể
        // ẩn nhầm bản ghi MỚI trùng mã sau khi seed/nhập lại.
        // `test/nhap-xoa-sach.test.mjs` so danh sách này với chính sqlite_master
        // để lần thêm bảng sau không lặp lại đúng lỗi này.
        'record_edits',
        'audit_log', 'sessions', 'messages', 'conversation_members', 'conversations',
        'notification_reads', 'notifications', 'album_photos', 'albums',
        'survey_responses', 'surveys', 'bus_students', 'bus_routes', 'edu_plans',
        'timetable', 'menus', 'medicine_requests', 'health', 'conduct', 'reports',
        'remarks', 'leave_requests', 'attendance', 'student_parents', 'students',
        'photo_students', 'student_consent',
        'student_emergency_contacts', 'student_profile', 'user_profile',
        'users', 'classes', 'user_campus', 'class_campus', 'campuses', 'settings',
      ]) db.run(`DELETE FROM ${t}`);

      // Rồi tới bảng của các phân hệ cắm thêm. Xoá SAU bảng lõi vì thứ tự ở đây
      // không quan trọng (không bảng nào của phân hệ có bảng con), nhưng đặt
      // sau cho rõ: đây là phần thêm vào, không phải phần lõi.
      //
      // Nuốt lỗi từng bảng một là CÓ CHỦ Ý: một phân hệ vừa bị gỡ thì bảng của
      // nó có thể không còn, và việc nhập dữ liệu lõi không được chết theo.
      for (const t of bangCuaPhanHe()) {
        try { db.run(`DELETE FROM ${t}`); } catch (_) { /* bảng đã bị gỡ */ }
      }
    }

    if (snap.school) db.setSchool(snap.school);

    // Cơ sở: nhập TRƯỚC nhóm lớp, vì `class_campus` trỏ tới `campuses(id)`.
    for (const cs of snap.campuses || []) {
      db.insert('campuses', {
        id: cs.id, name: cs.name, address: cs.address || '', phone: cs.phone || '',
        email: cs.email || '', active: cs.active === undefined ? true : !!cs.active,
        taoLuc: cs.taoLuc || new Date().toISOString(),
      });
      bump('campuses');
    }

    for (const c of snap.classes || []) {
      db.insert('classes', {
        id: c.id, name: c.name, teacherId: c.teacherId || null, room: c.room || '',
        year: c.year || (snap.school && snap.school.currentYear) || '',
        grade: c.grade != null ? c.grade : gradeOf(c.name),
        active: c.active === undefined ? true : !!c.active,
      });
      bump('classes');
    }

    for (const u of snap.users || []) {
      db.insert('users', {
        id: u.id, username: String(u.username).toLowerCase(), passwordHash: u.passwordHash,
        role: u.role, name: u.name, title: u.title || '', phone: u.phone || '',
        email: u.email || '', classId: u.classId || null, avatar: u.avatar || null,
        mustChangePassword: !!u.mustChangePassword,
        active: u.active === undefined ? true : !!u.active,
        createdAt: u.createdAt || nowIso(),
      });
      bump('users');
    }

    for (const s of snap.students || []) {
      db.insert('students', {
        id: s.id, code: s.code || null, name: s.name, dob: s.dob || null,
        gender: s.gender || null, classId: s.classId || null, avatar: s.avatar || null,
        address: s.address || '', ethnicity: s.ethnicity || '', bloodType: s.bloodType || '',
        allergies: s.allergies || '', active: s.active === undefined ? true : !!s.active,
        leftAt: s.leftAt || null, createdAt: s.createdAt || nowIso(),
      });
      bump('students');
      for (const pid of s.parentIds || []) {
        db.run('INSERT OR IGNORE INTO student_parents (studentId, parentId) VALUES (?, ?)', [s.id, pid]);
        bump('student_parents');
      }
    }

    for (const a of snap.attendance || []) {
      db.upsert('attendance', {
        id: a.id, studentId: a.studentId, date: a.date, status: a.status,
        checkIn: a.checkIn || null, checkOut: a.checkOut || null,
        note: a.note || '', markedBy: a.markedBy || null,
      }, ['studentId', 'date']);
      bump('attendance');
    }

    for (const l of snap.leaveRequests || []) {
      db.insert('leave_requests', {
        id: l.id, studentId: l.studentId, parentId: l.parentId || null,
        fromDate: l.fromDate, toDate: l.toDate, reason: l.reason,
        status: l.status || 'pending', createdAt: l.createdAt || nowIso(),
        reviewedBy: l.reviewedBy || null, reviewNote: l.reviewNote || '',
      });
      bump('leave_requests');
    }

    for (const r of snap.remarks || []) {
      db.insert('remarks', {
        id: r.id, studentId: r.studentId, teacherId: r.teacherId || null, date: r.date,
        content: r.content, rating: r.rating || null, skills: r.skills || [],
        parentSeen: !!r.parentSeen,
      });
      bump('remarks');
    }

    for (const r of snap.reports || []) {
      db.insert('reports', {
        id: r.id, studentId: r.studentId, term: r.term, year: r.year,
        subjects: r.subjects || [], conduct: r.conduct || null, overall: r.overall || null,
        attendanceSummary: r.attendanceSummary || null, teacherComment: r.teacherComment || '',
      });
      bump('reports');
    }

    for (const c of snap.conduct || []) {
      db.insert('conduct', {
        id: c.id, studentId: c.studentId, date: c.date, type: c.type,
        title: c.title, content: c.content || '', points: c.points || 0,
        byTeacherId: c.byTeacherId || null,
      });
      bump('conduct');
    }

    for (const h of snap.health || []) {
      db.insert('health', {
        id: h.id, studentId: h.studentId, date: h.date, type: h.type, title: h.title,
        detail: h.detail || '', height: h.height ?? null, weight: h.weight ?? null,
        vision: h.vision || null, bmiNote: h.bmiNote || null,
      });
      bump('health');
    }

    for (const m of snap.medicineRequests || []) {
      db.insert('medicine_requests', {
        id: m.id, studentId: m.studentId, parentId: m.parentId || null,
        fromDate: m.fromDate, toDate: m.toDate, medicines: m.medicines || [],
        note: m.note || '', status: m.status || 'pending', createdAt: m.createdAt || nowIso(),
        confirmedBy: m.confirmedBy || null, confirmedAt: m.confirmedAt || null,
        log: m.log || [],
      });
      bump('medicine_requests');
    }

    for (const m of snap.menus || []) {
      db.upsert('menus', { id: m.id, date: m.date, meals: m.meals || [] }, ['date']);
      bump('menus');
    }

    for (const t of snap.timetable || []) {
      db.insert('timetable', {
        classId: t.classId, periodTimes: t.periodTimes || [], days: t.days || {},
      });
      bump('timetable');
    }

    for (const p of snap.eduPlans || []) {
      db.insert('edu_plans', {
        id: p.id, classId: p.classId, month: p.month, year: p.year, theme: p.theme || '',
        goals: p.goals || [], weeks: p.weeks || [], note: p.note || '',
        createdBy: p.createdBy || null,
      });
      bump('edu_plans');
    }

    for (const b of snap.busRoutes || []) {
      db.insert('bus_routes', {
        id: b.id, name: b.name, plate: b.plate || '', driver: b.driver || null,
        monitor: b.monitor || null, stops: b.stops || [], log: b.log || [],
      });
      bump('bus_routes');
      for (const sid of b.studentIds || []) {
        db.run('INSERT OR IGNORE INTO bus_students (routeId, studentId) VALUES (?, ?)', [b.id, sid]);
      }
    }

    for (const sv of snap.surveys || []) {
      db.insert('surveys', {
        id: sv.id, title: sv.title, description: sv.description || '',
        createdBy: sv.createdBy || null, createdAt: sv.createdAt || nowIso(),
        deadline: sv.deadline || null, audience: sv.audience || 'all',
        status: sv.status || 'open', questions: sv.questions || [],
      });
      bump('surveys');
      for (const r of sv.responses || []) {
        db.run(
          `INSERT OR IGNORE INTO survey_responses (id, surveyId, userId, studentId, submittedAt, answers)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [db.nextId('sr'), sv.id, r.userId, r.studentId || null, r.submittedAt || nowIso(), JSON.stringify(r.answers || {})]);
        bump('survey_responses');
      }
    }

    for (const al of snap.albums || []) {
      db.insert('albums', {
        id: al.id, classId: al.classId, title: al.title, date: al.date,
        description: al.description || '', createdBy: al.createdBy || null,
      });
      bump('albums');
      (al.photos || []).forEach((p, i) => {
        db.insert('album_photos', {
          id: p.id || db.nextId('ph'), albumId: al.id, file: p.file || null,
          emoji: p.emoji || null, g: p.g || null, caption: p.caption || '', position: i,
        });
        bump('album_photos');
      });
    }

    for (const n of snap.notifications || []) {
      db.insert('notifications', {
        id: n.id, title: n.title, body: n.body, category: n.category || 'Khác',
        audience: n.audience || 'all', createdBy: n.createdBy || null,
        createdAt: n.createdAt || nowIso(), pinned: !!n.pinned,
      });
      bump('notifications');
      for (const uid of n.readBy || []) {
        db.run('INSERT OR IGNORE INTO notification_reads (notificationId, userId, readAt) VALUES (?, ?, ?)',
          [n.id, uid, n.createdAt || nowIso()]);
      }
    }

    for (const cv of snap.conversations || []) {
      db.insert('conversations', {
        id: cv.id, type: cv.type, name: cv.name || null, classId: cv.classId || null,
      });
      bump('conversations');
      for (const uid of cv.participantIds || []) {
        db.run('INSERT OR IGNORE INTO conversation_members (conversationId, userId, lastRead) VALUES (?, ?, ?)',
          [cv.id, uid, (cv.lastRead && cv.lastRead[uid]) || null]);
      }
      for (const m of cv.messages || []) {
        db.insert('messages', {
          id: m.id, conversationId: cv.id, senderId: m.senderId,
          text: m.text, createdAt: m.createdAt,
        });
        bump('messages');
      }
    }

    // Nhóm lớp có NHIỀU cô cùng phụ trách: `classes[].teacherIds`.
    //
    // Hai cột đời cũ chỉ chứa nổi cô phụ trách chính, nên một bản chụp muốn tả
    // đúng nhóm mầm non 2–3 cô phải nói ra bằng trường này. Chạy SAU vòng nhập
    // users, vì `setClassTeachers` từ chối mã không phải tài khoản giáo viên.
    for (const c of snap.classes || []) {
      if (Array.isArray(c.teacherIds) && c.teacherIds.length) {
        db.setClassTeachers(c.id, c.teacherIds, c.teacherId || c.teacherIds[0]);
      }
    }

    // Dựng bảng `class_teachers` từ hai cột đời cũ vừa nhập vào.
    //
    // `lib/db.js` cũng chạy đúng hàm này, nhưng chỉ ở lúc KHỞI ĐỘNG. Dữ liệu
    // xuất hiện SAU đó — máy chủ tự sinh dữ liệu mẫu ở lần chạy đầu, hoặc nhà
    // trường nhập kho JSON đời cũ — thì lúc ấy nó đã chạy xong trên một cơ sở dữ
    // liệu rỗng. Thiếu dòng này là cô đăng nhập vào thấy nhóm trống trơn, mà
    // không có gì báo cho ai biết.
    // Hồ sơ mở rộng và người liên hệ khẩn cấp. Chạy SAU vòng nhập students, vì
    // cả hai bảng trỏ tới `students(id)`.
    for (const hs of snap.studentProfiles || []) {
      db.luuHoSoBe(hs.studentId, hs);
      bump('student_profile');
    }
    // Giấy đồng ý của gia đình. Chạy SAU vòng nhập students.
    for (const c of snap.consents || []) {
      db.datDongY(c.studentId, {
        hoSoHocTap: c.hoSoHocTap == null ? null : !!c.hoSoHocTap,
        chiaSeGiaDinh: c.chiaSeGiaDinh == null ? null : !!c.chiaSeGiaDinh,
        truyenThong: c.truyenThong == null ? null : !!c.truyenThong,
        nguoiKy: c.nguoiKy || '', ngayKy: c.ngayKy || '', ghiChu: c.ghiChu || '',
      });
      bump('student_consent');
    }

    // Bé được gắn thẻ trong ảnh. Chạy SAU vòng nhập album.
    {
      const theoAnh = new Map();
      for (const t of snap.photoStudents || []) {
        if (!theoAnh.has(t.photoId)) theoAnh.set(t.photoId, []);
        theoAnh.get(t.photoId).push(t.studentId);
      }
      for (const [photoId, ids] of theoAnh) {
        db.datBeTrongAnh(photoId, ids);
        ids.forEach(() => bump('photo_students'));
      }
    }

    // Hồ sơ mở rộng của người lớn — hiện chỉ có số CCCD của phụ huynh.
    for (const hs of snap.userProfiles || []) {
      db.luuHoSoNguoiDung(hs.userId, hs);
      bump('user_profile');
    }
    {
      const theoBe = new Map();
      for (const lh of snap.emergencyContacts || []) {
        if (!theoBe.has(lh.studentId)) theoBe.set(lh.studentId, []);
        theoBe.get(lh.studentId).push(lh);
      }
      for (const [studentId, ds] of theoBe) {
        db.datLienHeKhanCap(studentId, ds);
        ds.forEach(() => bump('student_emergency_contacts'));
      }
    }

    db.backfillClassTeachers();

    // Nhóm lớp thuộc cơ sở nào: `classes[].campusId`. Chạy sau vòng nhập nhóm.
    for (const c of snap.classes || []) {
      if (c.campusId) db.setClassCampus(c.id, c.campusId);
    }
    // Tài khoản bị khoá vào một cơ sở (Cấp 3): `users[].campusId`.
    for (const u of snap.users || []) {
      if (u.campusId) db.setUserCampus(u.id, u.campusId);
    }
    // Nối nốt những nhóm chưa được gắn mà tên phòng đã nói rõ cơ sở. Cùng lý do
    // với dòng trên: `lib/db.js` chạy hàm này lúc KHỞI ĐỘNG, tức trên một cơ sở
    // dữ liệu còn rỗng.
    db.backfillClassCampus();
  });

  return stats;
}

module.exports = { importSnapshot, gradeOf, bangCuaPhanHe };
