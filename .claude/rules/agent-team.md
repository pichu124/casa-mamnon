# Đội agent (Agents-Team-coding)

- Task không tầm thường thì dùng `/team-lead <task>`. Chốt điều kiện xong dạng pass/fail trước khi làm.
- "Xong" nghĩa là `./scripts/check.sh` exit 0 cộng bằng chứng hành vi. Không chạy được check thì nói "inconclusive".
- Bug: tái hiện trước bằng test fail, rồi mới sửa nguyên nhân gốc.
- Người viết không tự kiểm: verify và review bằng subagent mới (`verifier`, `reviewer`).
- Bị người dùng sửa cùng một lỗi lần thứ hai thì đề xuất `/correct`.
- Cuối ngày làm việc: `./scripts/audit-agent.sh --all --since 1` dò sự cố từ file phiên của mọi dự án trên máy; có mục A, B, H hoặc F thì chạy `/agent-audit`; mục I có lớp lỗi lặp từ 2 lần thì `/correct`.
- Cuối tuần: `./scripts/audit-agent.sh --all --since 28` xem mục J (xu hướng).
- Cứ làm: đọc, sửa trong branch hoặc worktree, commit cục bộ, chạy test. Luôn hỏi người: force-push, push hoặc merge vào nhánh chính, xoá dữ liệu, deploy, publish.

| Rule | Thực thi bởi |
|---|---|
| Không kết thúc lượt khi check đỏ | `.claude/hooks/stop-gate.sh` (Stop) |
| Hỏi người trước hành động không đảo ngược được | `.claude/hooks/guard-irreversible.sh` (PreToolUse) |
| Không đọc file bí mật (`.env`, `*.pem`, `secrets/`) | `permissions.deny` trong `.claude/settings.json` |
| Format theo cấu hình của dự án | `.claude/hooks/post-edit-format.sh` (PostToolUse) |
| Không bớt ca "phải hỏi" của guard để cho dễ | `scripts/guard-ask-floor` (test-hooks đỏ khi số ca dưới sàn) |

## Riêng CASA Mầm non

- `./scripts/check.sh` (và Stop gate) chạy **bộ nhanh** vài giây, chỉ gồm bài chỉ đọc: cú pháp JS vừa đổi, dữ liệu lạc trong kho, khế ước tệp dùng chung, QUY TẮC 3, phân quyền ảnh và dữ liệu của bé, VERSION service worker, hướng dẫn thử gửi trường (bảng mật khẩu trống, không tên người). Bộ nhanh **không** thay được `npm test`: cô lập lỗi (Nguyên tắc số 1), QUY TẮC 1, 2, 4, 5, bảo mật và mọi bài luồng chỉ chạy ở bộ đầy đủ.
- Trước mỗi commit chạy **`CHECK_FULL=1 ./scripts/check.sh`** (= `npm test` đầy đủ, ~12 phút, có khoá chống chạy chồng). Không gọi `npm test` trần trong lúc phiên khác hay Stop gate có thể đang chạy test: nhiều bài ghi tạm vào kho mã và dùng cổng cố định. Đổi `public/` thì thêm `npm run test:giao-dien`.
- Hợp đồng của `/team-lead` ghi cả hai lệnh: bộ nhanh cho mỗi vòng sửa, `CHECK_FULL=1 ./scripts/check.sh` cho cổng cuối.
