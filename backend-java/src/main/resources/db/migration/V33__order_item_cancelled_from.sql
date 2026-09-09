-- HAO HỤT KHI HUỶ MÓN: ghi lại món ĐANG NẤU thì bị huỷ.
--
-- Trước đây `order_items.status` chuyển thành 'Cancelled' và trạng thái cũ biến mất. Báo cáo gộp
-- chung mọi lần huỷ, nên quán không đo được mình mất bao nhiêu nguyên liệu.
--
-- CHỈ CÓ HAI GIÁ TRỊ ĐÁNG GHI, và đó là do máy trạng thái quy định chứ không phải do chọn:
-- `OrderItem.canTransitionTo` chỉ cho huỷ từ 'Pending' hoặc 'Preparing'. Huỷ một món đã 'Ready'
-- hay 'Served' là KHÔNG HỢP LỆ, nên "huỷ sau khi bếp nấu xong" không xảy ra được qua đường thường.
--
--   Pending   -> Cancelled : chưa ai động tới, không mất gì
--   Preparing -> Cancelled : bếp đã bắt tay vào, nguyên liệu đã mất
--
-- NULL nghĩa là KHÔNG BIẾT, không phải "không hao hụt". Mọi hàng đã huỷ trước migration này đều
-- NULL — dữ liệu đó không tồn tại và không đoán được. Báo cáo phải đếm riêng, đừng gộp chúng vào
-- nhóm "không hao hụt" cho gọn: đó là bịa ra một con số.
ALTER TABLE public.order_items
    ADD COLUMN cancelled_from_status character varying(20);

COMMENT ON COLUMN public.order_items.cancelled_from_status IS
    'Trạng thái ngay TRƯỚC khi món bị huỷ. NULL = không phải món bị huỷ, hoặc bị huỷ trước V33.';

-- Chỉ mục một phần: báo cáo hao hụt chỉ hỏi những hàng đã huỷ, và số đó nhỏ hơn hẳn tổng số hàng.
CREATE INDEX ix_order_items_cancelled_from
    ON public.order_items (cancelled_from_status)
    WHERE cancelled_from_status IS NOT NULL;
