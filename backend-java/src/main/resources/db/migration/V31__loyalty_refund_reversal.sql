-- Hoàn tiền phải trừ lại điểm và trừ lại chi tiêu xét hạng.
--
-- Trước bản này: khách trả tiền -> cộng điểm; quầy hoàn tiền -> `payment.refund(now)` và HẾT.
-- Dòng ACCRUE vẫn nằm nguyên trong sổ. Vì tác vụ xét hạng hằng tháng tính lại `spend_12m` TỪ SỔ,
-- nó không những không sửa mà còn XÁC NHẬN LẠI con số sai — khách lên hạng bằng tiền chưa từng trả.
--
-- Vì sao không dùng lại `REVERSE` có sẵn: hai ràng buộc dưới đây chặn.
--
--   1. `ck_loyalty_ledger_amount` (V14) bắt mọi dòng KHÁC ACCRUE phải có `amount_vnd IS NULL`.
--   2. Truy vấn xếp hạng chỉ cộng `reason = 'ACCRUE'`.
--
-- Nghĩa là một dòng REVERSE không thể mang số tiền, và kể cả mang được thì cũng không ai đọc.
-- Nó trừ được ĐIỂM nhưng không trừ được CHI TIÊU — mà chi tiêu mới là cơ sở xếp hạng.
--
-- `REVERSE` giữ nguyên nghĩa cũ của nó: hoàn lại điểm đã tiêu khi một lần đổi ưu đãi bị huỷ. Đó là
-- chiều TIÊU điểm. `REFUND` là chiều ngược của TÍCH điểm. Hai việc khác nhau, và gộp chúng vào một
-- tên sẽ làm mọi truy vấn sau này phải phân biệt bằng dấu của `delta` — một thứ dễ đọc nhầm.

ALTER TABLE public.loyalty_point_ledger
    DROP CONSTRAINT ck_loyalty_ledger_reason;
ALTER TABLE public.loyalty_point_ledger
    ADD CONSTRAINT ck_loyalty_ledger_reason
        CHECK (reason IN ('ACCRUE', 'REDEEM', 'EXPIRE', 'REVERSE', 'REFUND'));

-- REFUND mang số tiền ÂM: nó là dòng đối ứng của một dòng ACCRUE dương, và tổng của cả hai bằng 0.
-- Nhờ vậy truy vấn xếp hạng chỉ cần CỘNG thêm REFUND vào là tự đúng, không cần biết trừ ở đâu.
ALTER TABLE public.loyalty_point_ledger
    DROP CONSTRAINT ck_loyalty_ledger_amount;
ALTER TABLE public.loyalty_point_ledger
    ADD CONSTRAINT ck_loyalty_ledger_amount
        CHECK ((reason = 'ACCRUE' AND amount_vnd IS NOT NULL AND amount_vnd >= 0)
            OR (reason = 'REFUND' AND amount_vnd IS NOT NULL AND amount_vnd <= 0)
            OR (reason NOT IN ('ACCRUE', 'REFUND') AND amount_vnd IS NULL));

-- Tra dòng ACCRUE của một chứng từ để đảo đúng số điểm và đúng số tiền của nó.
--
-- Đảo theo dòng đã ghi chứ không tính lại từ số tiền: hệ số tích điểm phụ thuộc HẠNG lúc tích, mà
-- hạng thì đổi theo thời gian. Tính lại lúc hoàn tiền sẽ ra số khác với số đã cộng, và sổ lệch.
CREATE INDEX ix_loyalty_ledger_chung_tu
    ON public.loyalty_point_ledger (member_id, order_code)
    WHERE order_code IS NOT NULL;

COMMENT ON COLUMN public.loyalty_point_ledger.order_code IS
    'Mã chứng từ sinh ra dòng sổ này: mã đơn hoặc mã hoá đơn bàn. Cần cho việc đảo khi hoàn tiền.';
