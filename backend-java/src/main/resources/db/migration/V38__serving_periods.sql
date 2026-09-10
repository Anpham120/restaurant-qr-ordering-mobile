-- CA PHỤC VỤ: sáng bán phở, trưa bán cơm, tối bán lẩu.
--
-- ---------------------------------------------------------------------------------------------
-- VÌ SAO KHÔNG ĐÓNG CỨNG BỐN KHUNG SÁNG / TRƯA / CHIỀU / TỐI
--
-- Quán này mở 10:00-14:00 và 18:00-22:00. Đóng cứng bốn khung thì hai khung chết ngay từ đầu, và
-- quán nào mở khác giờ lại phải sửa mã. Bảng này để quán tự khai: muốn bốn ca thì tạo bốn dòng,
-- muốn hai ca thì hai dòng.
--
-- ---------------------------------------------------------------------------------------------
-- MÓN KHÔNG GÁN CA NÀO = BÁN CẢ NGÀY
--
-- Đây là quy ước quan trọng nhất của bản này, và nó là lý do migration này KHÔNG gán ca cho món
-- nào. 91 món đang có giữ nguyên hành vi sau khi chạy; quán chỉ gán ca cho những món thật sự theo
-- buổi. Quy ước ngược lại — không gán nghĩa là không bán — sẽ làm cả thực đơn biến mất khỏi màn
-- hình khách ngay giây migration chạy xong.
--
-- ---------------------------------------------------------------------------------------------
-- CA QUA ĐÊM ĐƯỢC PHÉP (start_time > end_time)
--
-- "Lẩu đêm 18:00-02:00" là ca hợp lệ, không phải dữ liệu rác. Nên ở đây KHÔNG có
-- `CHECK (start_time < end_time)`. Việc so giờ hiện tại với ca phải biết bọc qua nửa đêm, và đó là
-- phép so được kiểm riêng trong ServingPeriodWindowTest.
CREATE TABLE public.serving_periods (
    id            text PRIMARY KEY,
    name          text        NOT NULL,
    start_time    time        NOT NULL,
    end_time      time        NOT NULL,
    display_order integer     NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL,
    updated_at    timestamptz NOT NULL,

    -- Ca dài 0 phút không phục vụ được gì, và gần như chắc chắn là lỗi gõ.
    CONSTRAINT ck_serving_periods_khac_gio CHECK (start_time <> end_time)
);

COMMENT ON TABLE public.serving_periods IS
    'Ca phục vụ do quán tự khai. start_time > end_time nghĩa là ca bọc qua nửa đêm.';

-- ---------------------------------------------------------------------------------------------
-- BẢNG NỐI, KHÔNG PHẢI CỘT MẢNG
--
-- `menu_items.tags` là `text[]`, nên cột mảng sẽ khớp lối có sẵn và tốn ít mã hơn. Vẫn chọn bảng
-- nối vì HƯỚNG HỎNG của nó an toàn hơn:
--
--   Cột mảng   xoá một ca -> món còn giữ id mồ côi, không khớp ca nào -> món BIẾN MẤT khỏi thực
--              đơn khách, im lặng, và không ai hiểu vì sao.
--   Bảng nối   xoá một ca -> ON DELETE CASCADE dọn luôn phần gán -> món quay về "không gán ca
--              nào" = bán cả ngày -> món VẪN HIỆN.
--
-- Một món biến mất khỏi thực đơn là lỗi không ai phát hiện cho tới lúc khách gọi điện hỏi. Một món
-- hiện thừa ra thì nhân viên thấy ngay. Cho cơ sở dữ liệu tự bảo đảm hướng hỏng đó, thay vì trông
-- vào việc mọi chỗ xoá ca đều nhớ dọn tay.
CREATE TABLE public.menu_item_serving_periods (
    id                text PRIMARY KEY,
    menu_item_id      text NOT NULL REFERENCES public.menu_items(id)      ON DELETE CASCADE,
    serving_period_id text NOT NULL REFERENCES public.serving_periods(id) ON DELETE CASCADE,

    CONSTRAINT uq_menu_item_serving_period UNIQUE (menu_item_id, serving_period_id)
);

-- Đường đọc nóng là "ca đang mở có những món nào", nên đánh chỉ mục theo ca.
CREATE INDEX ix_menu_item_serving_periods_ca
    ON public.menu_item_serving_periods (serving_period_id);

-- ---------------------------------------------------------------------------------------------
-- HAI CA KHỞI TẠO theo đúng giờ mở cửa đang ghi trong tài liệu: 10:00-14:00 và 18:00-22:00.
--
-- Chỉ tạo CA, không gán món nào. Thực đơn sau migration này giống hệt trước nó.
INSERT INTO public.serving_periods (id, name, start_time, end_time, display_order, created_at, updated_at)
VALUES
    ('sp_trua', 'Trưa', '10:00', '14:00', 1, now(), now()),
    ('sp_toi',  'Tối',  '18:00', '22:00', 2, now(), now())
ON CONFLICT (id) DO NOTHING;
