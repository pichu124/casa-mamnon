// Nạp một khối dữ liệu dạng JSON (hình dạng của db.json đời cũ) vào SQLite.
//
// Dùng chung cho hai việc: sinh dữ liệu mẫu (data/seed.js) và chuyển đổi dữ liệu
// thật của trường từ bản JSON cũ sang (scripts/migrate-json-to-sqlite.js).
// Toàn bộ nằm trong một giao dịch: hoặc nạp trọn vẹn, hoặc không ghi gì cả.
const db = require('./db');

// "Lớp 3A" → 3, phục vụ thao tác lên lớp cuối năm.
function gradeOf(className) {
  const m = String(className || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

const nowIso = () => new Date().toISOString();

function importSnapshot(snap, { clear = true } = {}) {
  const stats = {};
  const bump = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

  db.tx(() => {
    if (clear) {
      // Xóa theo thứ tự ngược khóa ngoại. Bảng con có ON DELETE CASCADE nhưng
      // xóa tường minh cho chắc chắn và dễ đọc.
      for (const t of [
        'audit_log', 'sessions', 'messages', 'conversation_members', 'conversations',
        'notification_reads', 'notifications', 'album_photos', 'albums',
        'survey_responses', 'surveys', 'bus_students', 'bus_routes', 'edu_plans',
        'timetable', 'menus', 'medicine_requests', 'health', 'conduct', 'reports',
        'remarks', 'leave_requests', 'attendance', 'student_parents', 'students',
        'users', 'classes', 'settings',
      ]) db.run(`DELETE FROM ${t}`);
    }

    if (snap.school) db.setSchool(snap.school);

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

    // Dựng bảng `class_teachers` từ hai cột đời cũ vừa nhập vào.
    //
    // `lib/db.js` cũng làm đúng việc này, nhưng chỉ ở lúc KHỞI ĐỘNG. Dữ liệu
    // xuất hiện SAU đó — máy chủ tự sinh dữ liệu mẫu ở lần chạy đầu, hoặc nhà
    // trường nhập kho JSON đời cũ — thì lúc ấy phần chuyển đổi đã chạy xong trên
    // một cơ sở dữ liệu rỗng. Thiếu mấy dòng này là cô đăng nhập vào thấy nhóm
    // trống trơn, mà không có gì báo cho ai biết.
    //
    // CHỈ THÊM, không xóa và không sửa hai cột cũ — y hệt bản ở lib/db.js.
    db.run(`INSERT OR IGNORE INTO class_teachers (classId, teacherId, vaiTro)
            SELECT c.id, c.teacherId, 'chinh' FROM classes c
            JOIN users u ON u.id = c.teacherId
            WHERE c.teacherId IS NOT NULL AND u.role = 'teacher'`);
    db.run(`INSERT OR IGNORE INTO class_teachers (classId, teacherId, vaiTro)
            SELECT u.classId, u.id, 'chinh' FROM users u
            JOIN classes c ON c.id = u.classId
            WHERE u.role = 'teacher' AND u.classId IS NOT NULL`);
  });

  return stats;
}

module.exports = { importSnapshot, gradeOf };
