-- THÊM CA SÁNG: sáng bán phở, trưa bán cơm, tối bán lẩu.
--
-- Migration V38 khởi tạo 2 ca: Trưa (10:00-14:00) và Tối (18:00-22:00).
-- Bổ sung ca Sáng (06:00-10:00) làm ca mở đầu ngày mặc định.
INSERT INTO public.serving_periods (id, name, start_time, end_time, display_order, created_at, updated_at)
SELECT 'sp_sang', 'Sáng', '06:00', '10:00', 1, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM public.serving_periods WHERE id = 'sp_sang' OR name = 'Sáng'
);

-- Điều chỉnh thứ tự hiển thị của Trưa và Tối sau Sáng
UPDATE public.serving_periods SET display_order = 2 WHERE id = 'sp_trua' AND display_order = 1;
UPDATE public.serving_periods SET display_order = 3 WHERE id = 'sp_toi' AND display_order = 2;
