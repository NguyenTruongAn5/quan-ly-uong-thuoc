# MediMây

Ứng dụng theo dõi lịch uống thuốc, tối ưu cho điện thoại. Người dùng có thể thêm thuốc cùng giờ uống, liều lượng và ghi chú; chọn ngày hoặc chuyển tuần để xem tiến độ và đánh dấu hoặc bỏ đánh dấu thuốc đã uống.

## Chạy ứng dụng

Đây là website tĩnh, không cần cài thư viện hay chạy bước build. Mở `index.html` trong trình duyệt hoặc dùng một static file server tại thư mục dự án để chạy thử.

## Triển khai lên Vercel

1. Đưa mã nguồn lên GitHub.
2. Tạo một dự án mới trên Vercel và kết nối repository.
3. Chọn framework preset **Other**, để trống build command và output directory, sau đó triển khai.

Vercel sẽ phục vụ `index.html` trực tiếp từ thư mục gốc của dự án.

## Lưu trữ và riêng tư

Lịch thuốc và trạng thái đã uống được lưu trong `localStorage` của trình duyệt trên thiết bị hiện tại. Mỗi lần đánh dấu được lưu theo ngày lịch địa phương. Dữ liệu không đồng bộ sang thiết bị khác và sẽ không được giữ lại nếu người dùng xóa dữ liệu trình duyệt.
