-- Lý do khi đóng phiên bàn còn nợ tiền.
--
-- Đóng một bàn chưa thu tiền là việc CÓ THẬT: khách bỏ đi, quán quyết định miễn, hoặc máy lỗi và
-- tiền đã nhận bằng đường khác. Nhưng nó phải là một quyết định có tên người và có lý do, không
-- phải một lần bấm im lặng — vì hệ quả của nó là một khoản tiền không ai đòi nữa.
--
-- Nullable có chủ ý: đại đa số phiên đóng khi đã thu đủ, và bắt nhập lý do cho những lần đó là
-- bắt người ở quầy gõ một câu vô nghĩa vài chục lần mỗi ca. Cột này chỉ có giá trị đúng ở những
-- lần ép đóng, và chính sự vắng mặt của nó nói rằng lần đóng đó không có gì bất thường.
ALTER TABLE public.table_sessions
    ADD COLUMN close_reason text;

COMMENT ON COLUMN public.table_sessions.close_reason IS
    'Lý do ép đóng phiên khi còn tiền chưa thu. NULL nghĩa là phiên đóng bình thường.';
