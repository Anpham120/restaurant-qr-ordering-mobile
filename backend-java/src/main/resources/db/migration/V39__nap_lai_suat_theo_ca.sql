-- NẠP LẠI SỐ SUẤT THEO CA: mỗi ca có số suất riêng, và tự nạp lại khi ca mở.
--
-- ---------------------------------------------------------------------------------------------
-- VẤN ĐỀ ĐANG CÓ
--
-- `menu_items.remaining_quantity` là MỘT con số cho cả ngày, đặt tay ở tab "Hôm nay", và không
-- bao giờ tự nạp lại. Bán hết mẻ trưa là món khoá luôn tới tối, dù tối bếp nấu mẻ mới. Cách duy
-- nhất để mở lại là có người nhớ vào gõ số — và "có người nhớ" chính là thứ đã làm ô số suất nằm
-- im suốt từ lúc nó được thêm vào.
--
-- ---------------------------------------------------------------------------------------------
-- SỐ SUẤT DỰ KIẾN THEO (MÓN, CA)
--
-- NULL / không có dòng = ca này KHÔNG quản số suất cho món đó. Đây là mặc định, và nó giữ nguyên
-- hành vi hiện tại: bảng này rỗng sau migration, nên không có gì được nạp lại và mọi món chạy y
-- như trước.
--
-- Số suất SỐNG vẫn nằm ở `menu_items.remaining_quantity`, không chuyển vào đây. Lý do là phép trừ
-- tồn kho nguyên tử của OrderService đang khoá đúng một hàng `menu_items`; tách con số sống ra
-- bảng khác nghĩa là viết lại phép trừ đó, và đó là chỗ duy nhất trong hệ thống chặn được hai
-- khách cùng gọi phần cuối cùng. Bảng này chỉ giữ số DỰ KIẾN — cái được chép sang khi ca mở.
CREATE TABLE public.menu_item_period_stock (
    id                text    PRIMARY KEY,
    menu_item_id      text    NOT NULL REFERENCES public.menu_items(id)      ON DELETE CASCADE,
    serving_period_id text    NOT NULL REFERENCES public.serving_periods(id) ON DELETE CASCADE,
    planned_quantity  integer NOT NULL,

    CONSTRAINT uq_menu_item_period_stock UNIQUE (menu_item_id, serving_period_id),
    CONSTRAINT ck_menu_item_period_stock_khong_am CHECK (planned_quantity >= 0)
);

CREATE INDEX ix_menu_item_period_stock_ca
    ON public.menu_item_period_stock (serving_period_id);

COMMENT ON COLUMN public.menu_item_period_stock.planned_quantity IS
    'Số suất DỰ KIẾN của ca này. Chép sang menu_items.remaining_quantity khi ca mở.';

-- ---------------------------------------------------------------------------------------------
-- SỔ GHI ĐÃ NẠP — thứ giữ cho tác vụ nạp lại KHÔNG chạy hai lần
--
-- Tác vụ nạp lại GHI ĐÈ số suất sống. Chạy nhầm một lần giữa ca là xoá sạch phần đã bán, và quán
-- bán vượt số suất mà không ai biết. Nên "đã nạp chưa" phải là một sự thật ĐƯỢC GHI LẠI, không
-- phải một suy đoán từ đồng hồ.
--
-- Khoá chính (ca, ngày phục vụ) làm việc đó: tác vụ chèn một dòng trước khi nạp, và lần chạy thứ
-- hai đụng khoá trùng nên dừng. Đúng cả khi tác vụ chạy mỗi 5 phút, cả khi có hai tiến trình máy
-- chủ cùng chạy.
--
-- ---------------------------------------------------------------------------------------------
-- `ngay_phuc_vu` LÀ NGÀY CA BẮT ĐẦU, KHÔNG PHẢI NGÀY TRÊN LỊCH
--
-- Ca lẩu đêm 18:00-02:00 mở tối thứ Hai và đóng lúc 2 giờ sáng thứ Ba. Suốt khoảng đó nó là MỘT
-- ca, một mẻ nguyên liệu, một lần nạp.
--
-- Nếu dùng ngày trên lịch thì đúng nửa đêm, ngày đổi, sổ ghi không có dòng nào cho ngày mới, và
-- tác vụ nạp lại số suất GIỮA CA — 0 giờ sáng, quán đang đông, phần đã bán bị xoá sạch. Đây là
-- cái bẫy chính của bản này, và nó chỉ hiện ra ở đúng một thời điểm trong ngày.
CREATE TABLE public.serving_period_resets (
    serving_period_id text        NOT NULL REFERENCES public.serving_periods(id) ON DELETE CASCADE,
    ngay_phuc_vu      date        NOT NULL,
    applied_at        timestamptz NOT NULL,
    so_mon_da_nap     integer     NOT NULL,

    PRIMARY KEY (serving_period_id, ngay_phuc_vu)
);

COMMENT ON COLUMN public.serving_period_resets.ngay_phuc_vu IS
    'Ngày ca BẮT ĐẦU. Ca qua đêm giữ nguyên ngày này cho tới khi đóng, nên không nạp lại lúc 0 giờ.';
