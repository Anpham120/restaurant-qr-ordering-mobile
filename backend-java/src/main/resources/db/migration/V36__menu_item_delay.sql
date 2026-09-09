-- ĐỘ TRỄ THEO MÓN — khác với `kitchen_delay` (độ trễ của CẢ bếp), và hai cái CỘNG DỒN.
--
-- Hai câu hỏi khác nhau:
--   kitchen_delay             "cả bếp đang chậm N phút"      — đông khách, đầu bếp nghỉ
--   menu_items.delay_minutes  "riêng món này đang chậm N phút" — hỏng lò, hết nguyên liệu phải mua
--
-- VÌ SAO THEO MÓN CHỨ KHÔNG THEO ĐƠN: đặt theo món là CHẶN TRƯỚC — mọi khách gọi món đó từ giờ trở
-- đi đều đọc đúng con số, kể cả người chưa gọi. Đặt theo đơn chỉ sửa được ước lượng của một bàn đã
-- lỡ, mà tới lúc bấm được thì khách đã chờ quá giờ rồi. Và nguyên nhân thật — hỏng lò, hết nguyên
-- liệu, hôm nay phải ướp lâu hơn — đều gắn với MÓN, không gắn với đơn.
--
-- TỰ HẾT HẠN, cùng khuôn với `kitchen_delay`: `delay_expires_at` là mốc, quá mốc thì đọc ra 0. Đây
-- là phần khiến tính năng dùng được trong giờ đông khách — bếp khai xong không phải nhớ quay lại
-- xoá, và một lần khai bị quên sẽ không cộng oan cho khách mãi mãi.
--
-- Trần 60 phút giống `kitchen_delay`: bếp chậm hơn một tiếng thì câu trả lời trung thực là tắt món,
-- không phải hiện một con số to hơn cho khách đang ngồi chờ.
ALTER TABLE public.menu_items
    ADD COLUMN delay_minutes integer NOT NULL DEFAULT 0,
    ADD COLUMN delay_expires_at timestamptz;

ALTER TABLE public.menu_items
    ADD CONSTRAINT ck_menu_items_delay_minutes_range
    CHECK (delay_minutes >= 0 AND delay_minutes <= 60);

COMMENT ON COLUMN public.menu_items.delay_minutes IS
    'Số phút bếp khai thêm RIÊNG cho món này. Chỉ có hiệu lực tới delay_expires_at.';

COMMENT ON COLUMN public.menu_items.delay_expires_at IS
    'Mốc hết hiệu lực. NULL hoặc đã qua = độ trễ của món này đọc ra 0.';
