-- Giới hạn số lượt dùng của một mã khuyến mãi.
--
-- Trước bản này KHÔNG có giới hạn nào. Một mã lọt ra ngoài — ảnh chụp màn hình lên nhóm chat, một
-- người khoe trên mạng — thì ai cũng dùng được, bao nhiêu lần cũng được, cho tới khi có người vào
-- tắt `is_active` bằng tay. Ba tầng trần giảm giá ở §9 chặn cho thiệt hại không thành vô hạn,
-- nhưng "mỗi hoá đơn giảm tối đa 50%" áp cho MỌI hoá đơn thì vẫn là một khoản rất lớn — và không
-- ai biết cho tới khi đọc báo cáo cuối kỳ.
--
-- `usage_limit` NULL = không giới hạn. Đó là hành vi CŨ, nên mọi mã đang chạy giữ nguyên cách hoạt
-- động sau khi migration này chạy: không mã nào đột ngột ngừng dùng được.
ALTER TABLE public.promotions
    ADD COLUMN usage_limit integer,
    ADD COLUMN used_count integer NOT NULL DEFAULT 0;

-- Giới hạn phải dương nếu có đặt. `usage_limit = 0` là một mã không ai dùng được — nếu muốn vậy
-- thì tắt `is_active`, đó mới là cách nói đúng ý.
ALTER TABLE public.promotions
    ADD CONSTRAINT ck_promotions_usage_limit
        CHECK (usage_limit IS NULL OR usage_limit > 0);

ALTER TABLE public.promotions
    ADD CONSTRAINT ck_promotions_used_count
        CHECK (used_count >= 0);

COMMENT ON COLUMN public.promotions.usage_limit IS
    'Số lượt dùng tối đa. NULL = không giới hạn.';
COMMENT ON COLUMN public.promotions.used_count IS
    'Số lượt đã dùng. Tăng bằng UPDATE có điều kiện để hai người dùng cùng lúc không vượt trần.';
