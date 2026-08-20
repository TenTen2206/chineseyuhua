# HSK 3 Learning Hub v7

## Thay đổi chính
- Bài 1–14: đủ Bài khóa 1–4 theo PDF đính kèm.
- Bài 15: có Bài khóa 1–3; PDF kết thúc trước Bài khóa 4.
- Bài 16–18: không tự bịa nội dung vì nguồn đính kèm không có các trang này.
- Ôn tập từ vựng: flashcard lật thẻ. Mặt trước là chữ Hán; mặt sau là chữ Hán + pinyin + nghĩa tiếng Việt + phát âm.
- Dịch câu: câu dài Việt → Trung dựa trên bài khóa.
- Điền từ: mỗi bài khóa 10 từ/cụm từ bị khuyết, có ngân hàng từ và chấm điểm 10/10.

## Upload lên GitHub Pages
Upload 4 file:
- index.html
- style-v4.css
- data-v4.js
- app-v5.js

Có thể giữ các file v3. index.html mới chỉ gọi file v4.


## AI chấm phần dịch câu

Frontend `app-v6.js` đã có nút **AI chấm & nhận xét** và giao diện:
- Điểm /10
- Nhận xét tổng quát
- Điểm làm tốt
- Danh sách lỗi
- Câu sai → câu nên sửa
- Giải thích lý do
- Câu hoàn chỉnh gợi ý

### Quan trọng
GitHub Pages là website tĩnh. Không được đặt API key của AI trực tiếp trong JavaScript frontend vì học sinh có thể xem và lấy key.

Cần một endpoint bảo mật ở:
- Cloudflare Worker
- Vercel Function
- hoặc backend riêng

File `ai-grader-worker-example.js` là mẫu endpoint.
File `ai-config-example.js` là mẫu cấu hình URL endpoint.

Khi có endpoint, đặt:
`window.AI_GRADER_ENDPOINT = "https://..."`

trước khi `app-v6.js` chạy.


## Bổ sung trong v7
- Trang chủ có thêm hình ảnh/logo `hero-yuhua.png`.
- Phần flashcard đã làm rõ kiểu **Mặt trước / Mặt sau**:
  - Mặt trước: chữ Hán
  - Mặt sau: chữ Hán + pinyin + nghĩa
- Có nút riêng:
  - `Xem mặt trước`
  - `Xem mặt sau`
  - `Lật thẻ`
