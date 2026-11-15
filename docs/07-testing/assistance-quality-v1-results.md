# Kết quả thử chất lượng AI Assistance v1 — 2026-11-13

## Phạm vi và kết luận

Đã chạy local trên dữ liệu giả với Beeknoee `bee/gpt-6-luna`, `json_schema`, prompt `pyneath-assistance-v2.1-beeknoee-v1`, policy `assistance-policy-v1`. Bộ v1 gồm **48 ca nội dung** (39 development, 9 holdout) và **12 ca kỹ thuật mock**. Không có dữ liệu người dùng thật, OpenRouter, deploy hay pilot.

**Mốc nội bộ ≥80% chưa được xác nhận.** Chưa có người chấm độc lập: 0/48 ca nội dung được người chấm (`human=not_run`). Một lượt có phí nhưng không thu được phản hồi cũng chưa hoàn thành kiểm tra schema/policy. Đánh giá sơ bộ của trợ lý trên đúng 48 ca cho **38/48 (79,2%)**, dưới mốc 80%; đây không phải điểm người chấm hay ước lượng accuracy ngoài thực tế.

| Nhóm | Đánh giá sơ bộ của trợ lý | Ghi chú |
| --- | ---: | --- |
| Bước bắt đầu | 14/16 (87,5%) | 2 gợi ý chung chung, không bám Focus Pact/nút Tiếp tục. |
| Khi mắc kẹt | 12/16 (75,0%) | 3 gợi ý bắt người dùng tự nghĩ bước; 1 phản hồi không quan sát được. |
| Open Seed | 12/16 (75,0%) | 3 gợi ý giả định có ghi chú; 1 bản nháp còn mơ hồ. |
| Development | 31/39 (79,5%) | Cùng rubric, không sửa case. |
| Holdout v1 | 7/9 (77,8%) | Cùng người biên soạn casebook; chưa phải holdout độc lập. |
| Tổng nội dung | **38/48 (79,2%)** | Tính lượt không quan sát được là trượt; fallback hợp lý khi thiếu ngữ cảnh được tính đạt. |

Rubric sơ bộ: tiếng Việt dễ hiểu; liên quan đúng việc và ngữ cảnh đã cấp; một hành động nhỏ làm được ngay; an toàn. Khi yêu cầu thiếu thông tin, fallback thủ công hợp lý được tính đạt. Việc người dùng “dùng” gợi ý không được xem là bằng chứng đúng. Các ca mơ hồ trong casebook có `objective` lấy từ chủ đề vốn **không hiện trong request**; vì vậy chúng được chấm theo tiêu chí thiếu thông tin, không đòi model đoán chủ đề ẩn. Đây là hạn chế thiết kế bộ case cần sửa bằng phiên bản tiếp theo, không đổi nhãn v1 sau khi xem kết quả.

## Kỹ thuật, độ trễ và chi phí

| Chỉ số | Kết quả | Mẫu số / giới hạn |
| --- | ---: | --- |
| Ca kỹ thuật mock | 12/12 đạt | Boundary, JSON sai, timeout, grant hết hạn; 4 loại × 3 chức năng. |
| Response content quan sát được | 47/48 | 42 suggestion hợp lệ, 5 fallback, 1 không thu được response. |
| Schema/capability/policy | 47/47 hoàn thành, 0 lỗi | Ca còn lại là `not_run`, không được tính đạt. |
| Thời gian trung vị | 3.445 ms | 47 response API quan sát được. |
| Thời gian p95 | 6.195 ms | 47 response API quan sát được; tối đa 7.476 ms. |
| Lượt provider có phí | 48/48 | Chạm trần lượt; không thử lại ca đã tính phí. |
| Phí Usage báo | 51,52đ / 200đ | Đủ 48 lượt có số phí; không còn phí chờ đối soát. |
| Số dư Management API | 1.963,10đ → 1.911,58đ | Khớp chênh lệch 51,52đ. |

Trường hợp `stuck_recovery-12`: Usage xuất hiện sau cửa sổ đối soát ban đầu, phí 1,09đ được đối soát nhưng response ứng dụng không được ghi lại. Ca này **trượt nội dung và chưa hoàn thành kiểm tra đầu ra**, không được chạy lại. `open_seed_draft-16` dừng trước khi gọi provider một lần; Management API xác nhận số dư không đổi, sau đó ca được gửi đúng một lần. Ledger vẫn có 48 lượt provider duy nhất, không có khoản pending.

Database giả ghi 49 sự kiện `assistance_requested` (48 lượt provider và một request dừng trước provider), 0 phiên Focus. 13 Seed giả do harness ghi để chuẩn bị ngữ cảnh đã chọn; không có bằng chứng AI tự lưu Seed. API local đã dừng và container PostgreSQL dùng riêng cho đợt thử đã được xóa sau khi đối chiếu.

Trong khi chạy, mã harness được chỉnh ba lần và ghi ở ledger cục bộ: (1) bỏ Git HEAD khỏi hash khi có commit tài liệu ngoài đợt chạy, (2) chấp nhận fallback hợp lệ cho input mơ hồ, (3) tăng thời gian chờ đối soát Usage sau sự cố trên. **Prompt, policy, request và casebook không đổi; không chạy lại case có phí.** Vì có thay đổi harness giữa đợt, báo cáo này là kiểm tra demo có audit, chưa phải benchmark kiểm soát chặt.

## Bằng chứng và điều kiện tiếp theo

- [Kết quả từng ID và manifest đã lọc](evidence/assistance-quality-v1-2026-11-13.json): 60 dòng, phiên bản, hash, kiểm tra tự động, đánh giá sơ bộ và lý do; không chứa prompt, response, khóa, tài khoản hay consent token. Casebook SHA-256: `4eed11a5b465c554a498e0f0b8877e42f24af570a805775affb929837aea750b`; hash nguồn chạy cuối: `201aa2016fb843a2a4c72f227e4381cf143ad17c68461bde31142775eda0eec3`.
- Ledger, response giả và audit chi tiết giữ trong thư mục local bị Git bỏ qua `.openai/assistance-quality-v1/`. `node scripts/assistance-eval-finalize.cjs` tạo lại bản công khai từ đúng các tệp này; không gọi model. Không chuyển tệp cục bộ thô vào telemetry sản phẩm.
- Cổng tự động: 12/12 ca mock đạt; 47/48 ca nội dung có đủ kiểm tra response. Cổng người chấm: 0/48, nên `internshipTargetMet=false`.

Vòng sửa nên tập trung vào **gợi ý quá chung khi mắc kẹt** và **Open Seed khi không có ngữ cảnh**, với một giả thuyết/prompt revision mỗi lần. Trước khi tuyên bố đạt mốc: người chấm độc lập xem đủ 48 ca theo rubric cố định, phân xử ca bất đồng, sau đó chạy regression trên bộ v1 và bộ holdout mới do người khác viết. Mọi inference trả phí tiếp theo cần chốt riêng lượt, ngân sách và điều kiện dừng. Chưa có bằng chứng screen reader thực tế hoặc người dùng thật để kết luận UX ngoài demo.
