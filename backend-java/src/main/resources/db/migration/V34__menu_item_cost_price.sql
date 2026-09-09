-- GIÁ VỐN: để báo cáo hao hụt nói được "mất bao nhiêu TIỀN NGUYÊN LIỆU", không chỉ "mất bao nhiêu
-- DOANH THU đáng lẽ có".
--
-- HAI CỘT, KHÔNG PHẢI MỘT, và đó là điều bắt buộc chứ không phải cho đủ:
--
--   menu_items.cost_price   — giá vốn HIỆN TẠI, người quản lý nhập và sửa được
--   order_items.unit_cost   — giá vốn CHỤP LẠI lúc đặt món, không bao giờ đổi
--
-- Vì sao phải chụp: `order_items.unit_price` đã chụp giá bán theo đúng cách này. Nếu báo cáo hao
-- hụt đọc thẳng `menu_items.cost_price` lúc chạy, thì sửa giá vốn một món hôm nay sẽ VIẾT LẠI con
-- số hao hụt của mọi tháng trước. Một báo cáo tự đổi quá khứ thì không dùng để đối chiếu được.
--
-- NULL nghĩa là CHƯA NHẬP, không phải "bằng 0". Không món nào có giá vốn ngay sau migration này —
-- hệ thống chưa từng lưu con số đó và không có cách nào đoán. Báo cáo phải đếm riêng phần chưa có
-- giá vốn thay vì cộng 0 vào cho gọn: cộng 0 là báo cáo hao hụt THẤP hơn sự thật, và sai theo
-- hướng làm người ta yên tâm là hướng sai nguy hiểm nhất.
ALTER TABLE public.menu_items
    ADD COLUMN cost_price numeric(18,2);

ALTER TABLE public.order_items
    ADD COLUMN unit_cost numeric(18,2);

COMMENT ON COLUMN public.menu_items.cost_price IS
    'Giá vốn hiện tại của món. NULL = chưa nhập, KHÔNG phải bằng 0.';

COMMENT ON COLUMN public.order_items.unit_cost IS
    'Giá vốn chụp lại lúc đặt món. NULL = món này đặt trước khi có giá vốn, hoặc món chưa được nhập giá vốn.';

-- Trần dưới: giá vốn âm là lỗi nhập liệu, không phải một trạng thái nghiệp vụ. Đặt ở tầng CSDL vì
-- nó đúng bất kể lời gọi đến từ đường nào.
ALTER TABLE public.menu_items
    ADD CONSTRAINT ck_menu_items_cost_price_non_negative
    CHECK (cost_price IS NULL OR cost_price >= 0);

ALTER TABLE public.order_items
    ADD CONSTRAINT ck_order_items_unit_cost_non_negative
    CHECK (unit_cost IS NULL OR unit_cost >= 0);
