// Quản trị — tab Nhật ký: thao tác gần đây, kèm bảng TEN đổi mã thao tác ra
// tiếng Việt.
//
// Gắn thêm vào App.views.admin; lõi (dải tab, render, hàm dùng chung) ở
// admin.js và phải tải trước tệp này. Tệp này không tải được thì chỉ phần
// này báo "chưa tải được", các tab khác vẫn chạy.
Object.assign(App.views.admin, {
  // ---------- Nhật ký ----------
  async tabNhatKy(body) {
    const rows = await API.get('/api/admin/audit');
    // MỌI DÒNG Ở ĐÂY PHẢI ĐỌC ĐƯỢC BẰNG TIẾNG VIỆT.
    //
    // Màn này là chỗ tra khi có khiếu nại về dữ liệu — đúng lúc người đọc đang
    // căng thẳng và cần hiểu ngay. Bản đầu chỉ dịch 18 mã trong hơn một trăm mã
    // đang được ghi, còn lại rơi thẳng ra màn hình dưới dạng `student-create`,
    // `hocphi-uudai-dat`, `baocaohoctap-mo-khoa-o`. Đó đúng là thứ CLAUDE.md
    // cấm: thuật ngữ kỹ thuật lọt ra màn hình của cô và của văn phòng.
    //
    // `test:goi-ten` canh cho bảng này phủ hết mã đang được ghi trong kho mã:
    // thêm một `db.audit(...)` mới mà quên đặt tên tiếng Việt là bài đỏ.
    const TEN = {
      // Tài khoản và đăng nhập
      login: 'Đăng nhập',
      'change-password': 'Đổi mật khẩu',
      'set-new-password': 'Đặt mật khẩu mới',
      'reset-password': 'Cấp lại mật khẩu',
      'teacher-create': 'Tạo tài khoản cho cô',
      'admin-create': 'Tạo tài khoản quản trị',
      'manager-campus': 'Đổi cơ sở phụ trách',
      'manager-chuc-vu': 'Đổi chức vụ',
      'push-doi-khoa': 'Thay khoá thông báo đẩy',
      'push-go-may': 'Gỡ một máy khỏi thông báo đẩy',
      'parent-cccd': 'Ghi căn cước phụ huynh',

      // Bé, nhóm lớp, cơ sở
      'student-create': 'Nhận một bé vào trường',
      'student-update': 'Sửa hồ sơ của bé',
      'student-deactivate': 'Cho bé nghỉ học',
      'student-bao-luu': 'Cho bé nghỉ học bảo lưu',
      'student-thoi-bao-luu': 'Thôi bảo lưu, cho bé nghỉ hẳn',
      'phu-huynh-them': 'Thêm tài khoản phụ huynh cho bé',
      'students-export': 'Xuất danh sách bé',
      'import-students': 'Nhập danh sách bé',
      'import-teachers': 'Nhập cô từ tệp',
      'nhan-danh-gia-de-xuat': 'Quản lý cơ sở đề xuất đổi bộ chữ đánh giá',
      'nhan-danh-gia-duyet': 'Ban giám hiệu xem đề xuất đổi bộ chữ đánh giá',
      'nhan-danh-gia-rut': 'Rút đề xuất đổi bộ chữ đánh giá',
      'class-create': 'Tạo nhóm lớp',
      'class-update': 'Sửa nhóm lớp',
      'class-teachers-set': 'Phân công cô phụ trách',
      'co-chuyen-nhom': 'Chuyển cô sang nhóm khác',
      'sua-quyen-chu-nhiem': 'Đổi cô phụ trách chính',
      'class-campus': 'Xếp nhóm vào cơ sở',
      'campus-create': 'Tạo cơ sở',
      'campus-update': 'Sửa cơ sở',
      'schoolyear-promote': 'Chuyển năm học',
      'truong-lien-he': 'Sửa thông tin liên hệ của trường',
      'nhan-danh-gia-sua': 'Sửa bộ chữ đánh giá dùng chung cả trường',
      'nhom-lua-tuoi-khai': 'Khai lứa tuổi của nhóm lớp',
      'nhom-lua-tuoi-go': 'Gỡ lời khai lứa tuổi của nhóm lớp',
      'tin-nhan-thu-hoi': 'Thu hồi một lời nhắn đã gửi',
      'tin-nhan-gui-nhieu-nha': 'Nhắn một tin cho nhiều gia đình, mỗi nhà một cuộc riêng',
      'nhantin-co-nuoc-ngoai': 'Bật hoặc tắt phần gia đình nhắn tin với cô nước ngoài',
      'phong-chung-tao': 'Lập một phòng chung trong Nhắn tin',
      'hoi-thoai-dong': 'Đóng một cuộc trò chuyện với gia đình',
      'hoi-thoai-mo-lai': 'Mở lại một cuộc trò chuyện đã đóng',
      'hoi-thoai-da-dong-mo': 'Xem lại một cuộc trò chuyện đã đóng',
      'hoi-thoai-quan-ly-xem': 'Quản lý xem một cuộc trò chuyện giữa cô và gia đình',
      'module-enable': 'Bật tính năng',
      'module-disable': 'Tắt tính năng',

      // Đồng ý của gia đình, sức khoẻ
      'consent-update': 'Ghi giấy đồng ý của gia đình',
      'consent-rut-lai': 'Gia đình rút lại đồng ý',
      'health-update': 'Ghi hồ sơ sức khoẻ',
      'health-can-do-nhom': 'Cân đo cả nhóm',
      'health-withdraw': 'Thu hồi ghi chép sức khoẻ',

      // Điểm danh, xin phép, đón trả bé
      'leave-review': 'Duyệt đơn xin phép',
      'leave-sua-ngay': 'Sửa kết quả từng ngày của đơn xin phép',
      'chot-vang': 'Chốt sổ vắng trong ngày',
      'diemdanh-gio-ra-soat': 'Đổi mốc giờ rà soát điểm danh',
      'anh-toi-lop': 'Chụp ảnh bé tới lớp',
      'go-anh-toi-lop': 'Gỡ ảnh bé tới lớp',
      'lich-nghi-them': 'Thêm ngày nghỉ của trường',
      'lich-nghi-sua': 'Sửa ngày nghỉ của trường',
      'lich-nghi-xoa': 'Xoá ngày nghỉ của trường',
      'dontra-tra-be': 'Ghi đã trả bé',
      'dontra-tra-bang-anh': 'Trả bé bằng ảnh',
      'dontra-anh-tra': 'Chụp ảnh lúc trả bé',
      'dontra-go-anh-tra': 'Gỡ ảnh lúc trả bé',
      'dontra-them-nguoi': 'Thêm người được đón bé',
      'dontra-sua-nguoi': 'Sửa người được đón bé',
      'dontra-uy-quyen': 'Uỷ quyền đón bé một lần',
      'dontra-huy-uy-quyen': 'Huỷ uỷ quyền đón bé',

      // Thông báo, khảo sát, thực đơn, lịch sinh hoạt
      'notification-create': 'Tạo thông báo',
      'notification-update': 'Sửa thông báo',
      'notification-withdraw': 'Thu hồi thông báo',
      'survey-create': 'Tạo khảo sát',
      'menu-update': 'Sửa thực đơn',
      'menu-update-tuan': 'Sửa thực đơn cả tuần',
      'menu-mau-excel': 'Tải tệp Excel mẫu thực đơn',
      'cong-anh-vao': 'Chụp ảnh chấm công — giờ vào',
      'cong-anh-ra': 'Chụp ảnh chấm công — giờ ra',
      'cong-anh-go': 'Gỡ lần chụp chấm công',
      'menu-nap-excel': 'Nạp thực đơn từ tệp Excel',
      'menu-copy-week': 'Chép thực đơn tuần trước',
      'menu-tep-them': 'Thêm tệp thực đơn',
      'menu-tep-xoa': 'Xoá tệp thực đơn',
      'timetable-update': 'Sửa lịch sinh hoạt',
      'timetable-chep': 'Chép lịch sinh hoạt',
      'plan-update': 'Sửa kế hoạch giáo dục',
      'plan-tuan-luu': 'Soạn kế hoạch giáo dục tuần (cả trường)',

      // Ảnh và album
      'album-delete': 'Xoá album',
      'album-doi-che-do': 'Đổi chế độ xem album',
      'album-tu-cau-chuyen': 'Thêm ảnh câu chuyện đã kể vào album',
      'photo-tag': 'Gắn tên bé vào ảnh',
      'photo-tag-nhieu': 'Gắn tên bé vào nhiều ảnh',

      // Ghi chép về bé
      'nhatky-ghi': 'Ghi nhật ký ngày',
      'nhatky-ghi-bua': 'Ghi nhật ký một bữa',
      'nhatky-gui': 'Gửi nhật ký ngày cho gia đình',
      'nhatky-ve-sinh': 'Ghi giờ thay bỉm / đi vệ sinh',
      'nhatky-ve-sinh-bo': 'Bỏ một mốc giờ vệ sinh ghi nhầm',
      'remark-update': 'Ghi nhận xét',
      'remark-withdraw': 'Thu hồi nhận xét',
      'report-update': 'Ghi phiếu đánh giá',
      'conduct-update': 'Ghi nền nếp',
      'conduct-withdraw': 'Thu hồi ghi chép nền nếp',
      'thuchup-sua-chu': 'Sửa lời ghi nhanh',
      'thuchup-xoa': 'Xoá một bài ghi nhanh',

      // Hành trình học tập
      'hanhtrinh-quan-sat': 'Ghi một quan sát',
      'hanhtrinh-nhap': 'Ghi nháp quan sát chưa gắn bé',
      'hanhtrinh-nhap-gan': 'Gắn bé cho một nháp quan sát',
      'hanhtrinh-nhap-bo': 'Bỏ một nháp quan sát',
      'hanhtrinh-suy-ngam': 'Ghi suy ngẫm của cô',
      'hanhtrinh-cong-bo': 'Công bố câu chuyện cho gia đình',
      'hanhtrinh-thu-hoi': 'Thu hồi câu chuyện đã công bố',
      'hanhtrinh-xoa': 'Xoá một ghi chép hành trình',
      'hanhtrinh-chu-de': 'Đặt chủ đề hành trình',
      'hanhtrinh-chu-de-chep': 'Chép chủ đề hành trình',
      'health-tai-mau-can-do': 'Tải mẫu cân đo của nhóm',
      'health-nap-can-do': 'Nạp cân đo cả nhóm bằng tệp',
      // TÊN MÃ VIẾT LIỀN 'diemdanh-', KHÔNG tách bằng gạch nối. Bộ canh QUY
      // TẮC 4 dò tên trường dữ liệu theo ranh giới từ, mà gạch nối chính là
      // một ranh giới — nên bản tách rời báo đỏ. Đó là báo nhầm (sổ đón bé
      // không xếp trẻ trên dưới nhau), nhưng luật của kho là SỬA MÃ chứ không
      // nới bộ canh, và tệp máy chủ vốn đã viết liền ('diemdanh-gio-ra-soat')
      // nên đổi theo là về đúng nếp sẵn có.
      //
      // Chú thích này cũng cố ý không đánh vần lại chuỗi bị cấm: bộ canh đọc
      // CHỮ chứ không đọc ý, nên một câu giải thích cũng đủ làm nó đỏ.
      'diemdanh-luu-y': 'Ghi lưu ý nội bộ cho một ngày của bé',
      'diemdanh-luu-y-go': 'Gỡ lưu ý nội bộ của một ngày',
      'hocphi-doi-tai-khoan': 'ĐỔI TÀI KHOẢN NHẬN TIỀN CỦA TRƯỜNG',
      'hocphi-tai-qr-anh': 'TẢI ẢNH MÃ QR NHẬN TIỀN CỦA TRƯỜNG',
      'hocphi-go-qr-anh': 'GỠ ẢNH MÃ QR NHẬN TIỀN CỦA TRƯỜNG',
      'ghi-gio-ra-ve': 'Ghi giờ bé ra về',
      'go-gio-ra-ve': 'Gỡ giờ bé ra về',
      'hanhtrinh-chu-de-tep-them': 'Treo tệp kế hoạch tuần',
      'hanhtrinh-chu-de-tep-xoa': 'Gỡ tệp kế hoạch tuần',
      'hanhtrinh-anh-ve-album': 'Đưa ảnh hành trình về album',

      // Kế hoạch của bé và báo cáo học tập
      'kehoachbe-luu': 'Lưu kế hoạch của bé',
      'kehoachbe-gui-duyet': 'Gửi kế hoạch chờ duyệt',
      'kehoachbe-duyet': 'Duyệt kế hoạch của bé',
      'kehoachbe-rut-lai': 'Rút lại kế hoạch',
      'kehoachbe-de-xuat': 'Đề xuất sửa kế hoạch',
      'kehoachbe-duyet-de-xuat': 'Duyệt đề xuất sửa kế hoạch',
      'kehoachbe-dat-ca-nhom': 'Đặt kế hoạch cho cả nhóm',
      'kehoachbe-chep-thang': 'Chép kế hoạch tháng trước',
      'kehoachbe-nhin-lai': 'Ghi nhìn lại cuối tháng',
      'kehoachbe-sap-xep-bai': 'Sắp xếp thứ tự bài trong kho bài học',
      'baocaohoctap-gui': 'Gửi báo cáo học tập chờ duyệt',
      'baocaohoctap-duyet': 'Duyệt báo cáo học tập',
      'baocaohoctap-tra-lai': 'Trả lại báo cáo cho cô',
      'baocaohoctap-thu-hoi': 'Thu hồi báo cáo đã gửi',
      'baocaohoctap-mo-ban': 'Mở lại một bản báo cáo',
      'baocaohoctap-mo-khoa-o': 'Mở khoá một ô trong báo cáo',

      // Cambridge
      'cambridge-tao': 'Tạo bài Cambridge',
      'cambridge-sua': 'Sửa bài Cambridge',
      'cambridge-cong-bo': 'Công bố bài Cambridge',
      'cambridge-thu-hoi': 'Thu hồi bài Cambridge',
      'cambridge-block-tao': 'Tạo block Cambridge',
      'cambridge-block-sua': 'Sửa block Cambridge',
      'cambridge-tep-them': 'Thêm tệp Cambridge',
      'cambridge-tep-xoa': 'Xoá tệp Cambridge',

      // Học phí và tiền ăn
      'hocphi-create': 'Ghi một khoản thu',
      'hocphi-dot': 'Ghi sổ cho cả nhóm hoặc cả trường',
      'hocphi-confirm': 'Xác nhận đã nhận tiền',
      'hocphi-huy-xac-nhan': 'Huỷ xác nhận đã nhận tiền',
      'hocphi-thu-hoi': 'Thu hồi một khoản thu',
      'hocphi-uudai-dat': 'Đặt ưu đãi học phí',
      'hocphi-uudai-go': 'Gỡ ưu đãi học phí',
      'hocphi-bieuphi-tao': 'Soạn biểu phí mới',
      'hocphi-bieuphi-sua': 'Sửa biểu phí đang soạn',
      'hocphi-bieuphi-gui-duyet': 'Gửi biểu phí lên chờ duyệt',
      'hocphi-bieuphi-duyet': 'Duyệt và khoá biểu phí',
      'hocphi-bieuphi-tra-lai': 'Trả biểu phí lại cho kế toán',
      'hocphi-bieuphi-xin-mo': 'Xin mở khoá biểu phí',
      'hocphi-bieuphi-mo-khoa': 'Mở khoá biểu phí',
      'hocphi-bieuphi-tu-choi-mo': 'Chưa mở khoá biểu phí',
      'tienan-chot': 'Chốt bảng tiền ăn',
      'tienan-xuat': 'Xuất bảng tiền ăn',

      // Nhân sự và chấm công
      'nhansu-sua-ho-so': 'Sửa hồ sơ nhân sự',
      'nhansu-xem-ho-so': 'Xem hồ sơ nhân sự',
      'nhansu-cham-cong': 'Chấm công',
      'nhansu-cham-ca-truong': 'Chấm công cả trường',
      'nhansu-xoa-cong': 'Xoá một dòng chấm công',
      'nhansu-xuat-cong': 'Xuất bảng chấm công',
      'nhansu-giai-trinh-gui': 'Gửi giải trình ngày công',
      'nhansu-giai-trinh-rut': 'Rút giải trình ngày công',
      'nhansu-giai-trinh-duyet': 'Duyệt giải trình ngày công',
      'nhansu-giai-trinh-tu-choi': 'Từ chối giải trình ngày công',
      'nhansu-quy-tac-cong-bat': 'Bật hoặc đổi cách tính công theo giờ ở cổng',
      'nhansu-quy-tac-cong-tat': 'Tắt cách tính công theo giờ ở cổng',

      // Xuất báo cáo (Đ239c)
      'xuatbaocao-diemdanh-be': 'Xuất báo cáo điểm danh của bé',
      'xuatbaocao-diemdanh-co': 'Xuất báo cáo điểm danh cô và nhân viên',
      'xuatbaocao-baocao-hoctap': 'Xuất báo cáo tháng / 6 tháng',
      'xuatbaocao-kehoach-be': 'Xuất kế hoạch của bé',
    };
    body.innerHTML = rows.length ? `
      <div class="card">
        <p class="muted small mb-8">200 thao tác gần nhất. Dùng để tra khi có khiếu nại về dữ liệu.</p>
        ${rows.map(r => `
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">${UI.esc(TEN[r.action] || r.action)}</div>
              <div class="row-sub">${UI.esc(r.who)} · ${UI.fmtDate(r.at, { weekday: false })} ${UI.fmtTime(r.at)}</div>
            </div>
          </div>`).join('')}
      </div>` : UI.emptyState('📋', 'Chưa có thao tác nào được ghi lại');
  },
});
