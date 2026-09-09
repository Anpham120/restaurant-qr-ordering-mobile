-- DỮ LIỆU KHỞI TẠO cho giá vốn và số phần còn lại.
--
-- ĐÂY LÀ SỐ ƯỚC LƯỢNG THEO TỈ LỆ, KHÔNG PHẢI GIÁ NGUYÊN LIỆU ĐÃ ĐO. Quán phải sửa lại bằng con số
-- thật của mình trong màn Thực đơn. Migration này chỉ để hai tính năng có dữ liệu mà chạy được
-- thay vì nằm im ở 0 và NULL.
--
-- CHỈ GHI KHI CÒN TRỐNG (`where cost_price is null`). Chạy lại hay chạy sau khi quản lý đã nhập
-- tay đều không ghi đè gì — một migration seed mà đè lên số người ta vừa nhập là một migration
-- xoá công việc của người khác.
--
-- ---------------------------------------------------------------------------------------------
-- TỈ LỆ GIÁ VỐN / GIÁ BÁN, chia theo bản chất mặt hàng chứ không đặt một con số chung:
--
--   ĐỒ MUA VỀ BÁN LẠI — biên mỏng, vì quán không tạo thêm giá trị gì ngoài việc phục vụ
--     bia & rượu        70%   mua 13k bán 18-22k, đây là mặt hàng lãi mỏng nhất
--     trái cây tươi     55%   gọt bày là chính, nguyên liệu chiếm gần hết
--
--   ĐỒ CHẾ BIẾN — biên dày hơn, công nấu và gia vị là phần quán tạo ra
--     hải sản           45%   nguyên liệu đắt và hao nhiều khi sơ chế
--     lẩu               42%   nhiều thành phần, nước dùng ninh lâu
--     món gà            38%
--     đặc sản vùng miền 38%   nguyên liệu phải đặt riêng
--     nước ép & sinh tố 40%   trái cây tươi ép ra ít
--     phở & bún         33%   xương ninh rẻ tính trên mỗi bát, nhưng thịt thì không
--     cơm Việt          32%
--     khai vị           30%
--     tráng miệng       28%
--     món chay          25%   rau củ rẻ nhất trong bếp
--     cà phê & trà      25%   biên dày nhất, đúng như mọi hàng nước
-- ---------------------------------------------------------------------------------------------
UPDATE public.menu_items SET cost_price = round(price * 0.70) WHERE category_id = 'cat_alcohol'    AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.55) WHERE category_id = 'cat_fruit'      AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.45) WHERE category_id = 'cat_seafood'    AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.42) WHERE category_id = 'cat_hotpot'     AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.40) WHERE category_id = 'cat_juice'      AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.38) WHERE category_id = 'cat_chicken'    AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.38) WHERE category_id = 'cat_regional'   AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.33) WHERE category_id = 'cat_noodle'     AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.32) WHERE category_id = 'cat_main'       AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.30) WHERE category_id = 'cat_appetizer'  AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.28) WHERE category_id = 'cat_dessert'    AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.25) WHERE category_id = 'cat_vegetarian' AND cost_price IS NULL;
UPDATE public.menu_items SET cost_price = round(price * 0.25) WHERE category_id = 'cat_drink'      AND cost_price IS NULL;

-- Lưới an toàn: danh mục nào chưa liệt kê ở trên vẫn có giá vốn, thay vì im lặng bị bỏ sót và
-- không bao giờ vào được báo cáo hao hụt.
UPDATE public.menu_items SET cost_price = round(price * 0.35) WHERE cost_price IS NULL;

-- ---------------------------------------------------------------------------------------------
-- SỐ PHẦN CÒN LẠI — chỉ đặt cho hai nhóm, KHÔNG đặt cho cả thực đơn.
--
-- NULL nghĩa là không đếm phần, và đó phải là mặc định: món nào cũng có hạn số lượng thì mỗi lần
-- bán là một bước tiến tới lúc thực đơn tự tắt, và không ai nhớ nạp lại.
--
-- Hai nhóm được chọn vì chúng có hạn NGOÀI ĐỜI THẬT, không phải để cho có:
--   hải sản           mua theo ngày, hết là hết, không gọi thêm giữa ca được
--   đặc sản vùng miền nguyên liệu đặt riêng, làm theo mẻ
--
-- Con số cố ý để DƯỚI 10 vì giao diện chỉ hiện "Còn N phần" khi sắp hết — trên ngưỡng đó thì khách
-- không thấy gì và tính năng trông như chưa chạy.
--
-- CẦN BIẾT: số này KHÔNG tự nạp lại mỗi ngày. Bán hết là món tự khoá cho tới khi có người đặt lại
-- trong màn Thực đơn. Nạp lại theo ca là việc chưa làm, ghi ra đây để không ai bất ngờ.
UPDATE public.menu_items SET remaining_quantity = 6 WHERE category_id = 'cat_seafood'  AND remaining_quantity IS NULL;
UPDATE public.menu_items SET remaining_quantity = 8 WHERE category_id = 'cat_regional' AND remaining_quantity IS NULL;
