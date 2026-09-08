-- Mốc thời điểm một phiên bàn lần đầu quá giờ mà vẫn còn tiền chưa thu.
--
-- Vì sao cần cột này chứ không suy ra được từ `expires_at`:
--
-- Từ nay một phiên còn nợ tiền sẽ KHÔNG hết hạn — nó được gia hạn thay vì chuyển `Expired`. Nghĩa
-- là `expires_at` của nó cứ bị đẩy về tương lai mỗi lần có ai chạm vào, và nhìn vào đó thì không
-- thể biết bàn này đã quá giờ từ bao giờ, hay có quá giờ hay không.
--
-- `overdue_since` ghi lại mốc hết hạn GỐC, đúng một lần. Nó trả lời được câu quầy cần hỏi: "bàn
-- này ngồi quá giờ bao lâu rồi mà chưa trả tiền", và là thứ để lọc ra danh sách bàn cần đi đòi.
--
-- NULL = phiên chưa bao giờ quá giờ. Đó là đại đa số, và sự vắng mặt của giá trị nói đúng điều đó.
ALTER TABLE public.table_sessions
    ADD COLUMN overdue_since timestamp with time zone;

-- Chỉ lọc các phiên đang mở và đã quá giờ — phần rất nhỏ của bảng, nên chỉ mục một phần là đủ và
-- rẻ hơn chỉ mục đầy đủ.
CREATE INDEX ix_table_sessions_overdue
    ON public.table_sessions (overdue_since)
    WHERE overdue_since IS NOT NULL;

COMMENT ON COLUMN public.table_sessions.overdue_since IS
    'Mốc hết hạn gốc của phiên còn nợ tiền. NULL nghĩa là phiên chưa từng quá giờ.';
