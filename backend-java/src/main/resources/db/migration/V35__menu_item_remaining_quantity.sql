-- SỐ PHẦN CÒN LẠI: để khách biết món sắp hết, và để hệ thống TỪ CHỐI khi đã hết.
--
-- NULL = KHÔNG GIỚI HẠN, không phải bằng 0.
--
-- Đây là giá trị của mọi món ngay sau migration này, và nó giữ nguyên hành vi cũ: quán nào không
-- muốn đếm phần thì không phải nhập gì. Chọn 0 làm mặc định sẽ khoá sạch thực đơn ngay khi triển
-- khai — một migration không được phép làm nhà hàng ngừng bán.
--
-- KHÔNG có `CHECK (remaining_quantity >= 0)` mà chỉ chặn ÂM ở chỗ trừ. Lý do: ràng buộc CSDL bắn
-- ra một lỗi kỹ thuật không dịch được thành câu cho khách, còn chỗ trừ thì biết đang nói về món
-- nào và còn mấy phần. Vẫn đặt trần dưới ở đây để một lần UPDATE tay sai không âm thầm ghi số âm.
ALTER TABLE public.menu_items
    ADD COLUMN remaining_quantity integer;

ALTER TABLE public.menu_items
    ADD CONSTRAINT ck_menu_items_remaining_quantity_non_negative
    CHECK (remaining_quantity IS NULL OR remaining_quantity >= 0);

COMMENT ON COLUMN public.menu_items.remaining_quantity IS
    'Số phần còn bán được. NULL = không giới hạn (mặc định). 0 = hết, khách không đặt được.';

-- Chỉ mục một phần cho đường đọc nóng: thực đơn công khai lọc món còn bán được, và món CÓ đếm phần
-- là thiểu số. Không đánh chỉ mục trên cột toàn NULL thì truy vấn đó quét cả bảng.
CREATE INDEX ix_menu_items_remaining_quantity
    ON public.menu_items (remaining_quantity)
    WHERE remaining_quantity IS NOT NULL;
