# Tiến độ tự học — trạng thái triển khai

Candidate local cho phép người dùng ghi nhận một bước học Solo, trạng thái do họ chọn, ghi chú tùy chọn và Open Seed. Dashboard hiển thị số bước hoàn thành, số phiên được ghi nhận trong bảy ngày theo múi giờ hồ sơ, các bước gần đây và điểm tiếp tục. Các phiên cũ không được tự chuyển thành bước hoàn thành. Chỉ số thể hiện ghi nhận của người học, không đo mức tập trung hay kết quả học tập.

Migration `0006_study_steps.sql` và [rollback](../04-engineering/study-steps-migration-rollback.md) đã được chuẩn bị. Ngày 2026-11-13 migration đã chạy trên PostgreSQL tạm riêng `pyneath_study_progress_test` (localhost:55439); database thử và server tạm đã dọn. Sau phê duyệt riêng, migration cũng đã chạy trên `btp_review` tại localhost:5433. Trước đó sáu hash migration cũ khớp, archive backup định dạng custom được kiểm tra danh mục và checksum sau sao chép; sau đó journal có bảy migration, hash mới khớp, bảng `study_steps` tồn tại và API readiness trả database `UP`. Bản ghi cascade khi xóa tài khoản và được bổ sung vào export.

Backup trước migration nằm tại `.openai/backups/btp-review-before-0006-20261113.dump` (Git bỏ qua). Archive đã kiểm tra đọc danh mục và checksum; **chưa thử phục hồi toàn bộ**, nên không coi đây là bằng chứng phục hồi thành công. Không đưa backup chứa dữ liệu người dùng vào Git. Container `beneath-the-pine-local-postgres-1` được dừng lại như trước khi kiểm tra; volume được giữ nguyên. Để chạy lại local, khởi động container đó rồi chạy API và web theo README, tránh tạo volume khác bằng cấu hình Compose khác.

```powershell
docker start beneath-the-pine-local-postgres-1
pnpm dev:api
# Trong terminal thứ hai:
pnpm dev -- --host 127.0.0.1
```

Test PostgreSQL tạm đã kiểm tra check-out sớm, ghi nhận sau hết giờ, quyền sở hữu, rollback giao dịch với Seed, sửa và giữ thời điểm gốc, ranh giới bảy ngày theo múi giờ Việt Nam, đếm hơn 100 bản ghi, phân trang, export và cascade. Bộ API với PostgreSQL tạm: **130 đạt, 3 bỏ qua, 0 lỗi**; bộ web: **114 đạt**. Build và lint đạt, còn cảnh báo kích thước bundle và chú thích Zod. Kiểm tra screen reader và nghiên cứu người dùng thật chưa có.

Bản nháp bước học, trạng thái và ghi chú của phiên Solo dùng cùng cơ chế lưu nháp riêng theo tài khoản như nội dung check-out hiện có; chỉ xóa sau khi xác nhận thành công. Kiểm thử contract và xử lý sau phiên không cần database đã chạy, nhưng không thay thế test giao dịch PostgreSQL hoặc kiểm tra reload thực tế.

Kiểm tra browser bằng dữ liệu giả: dashboard có dữ liệu và trạng thái rỗng/lỗi hiển thị; khi lưu lỗi, bản sửa vẫn trong textarea. Ở 320px, sáng/tối không tràn ngang (`scrollWidth=320`) trong preview mock. Với API và database tạm thật, đã tạo phiên Solo, check-out ghi nhận một phần và Seed, reload thấy dữ liệu, sửa sang hoàn thành thấy số đếm cập nhật và tiếp tục từ Seed. Một phiên giả được cho hết giờ bằng cách sửa thời gian trong database thử; sau reload người dùng chọn `chưa thực hiện` và dashboard giữ đúng trạng thái. Kiểm tra thật ở 320px không tràn ngang. AI tắt trong đợt thử nên không phát sinh credit; không phải kiểm chứng screen reader.
