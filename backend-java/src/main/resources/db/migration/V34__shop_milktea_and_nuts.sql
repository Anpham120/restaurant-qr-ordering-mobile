-- Hai thay đổi thực đơn: thêm nhóm Trà sữa, và đổi nhóm Ăn nhẹ thành Hạt rang.
--
-- Đi kèm một thay đổi BẮT BUỘC ở TramChuanBi.java, cùng commit này:
--   - `shop_milktea` vào DANH_MUC_QUAY. Danh mục lạ rơi về BEP, tức mỗi ly trà sữa bị xếp sau
--     toàn bộ hàng đợi bếp — đúng lỗi mà enum đó được viết ra để chữa.
--   - `shop_snack` chuyển từ (mặc định) BEP sang DANH_MUC_SAN. Khi nhóm này còn khoai chiên và
--     gà viên thì BEP đúng — chúng qua chảo dầu. Giờ nhóm chỉ còn hạt rang đóng sẵn, và rót một
--     phần hạt không phải là xếp hàng.

-- ---------------------------------------------------------------------------
-- Trà sữa
-- ---------------------------------------------------------------------------

INSERT INTO public.categories(id,name,display_order,is_active,created_at,updated_at) VALUES
('shop_milktea','Trà sữa',104,true,now(),now());

-- Dời bốn danh mục sau xuống một bậc để Trà sữa đứng liền sau Trà trái cây.
--
-- Nhóm đồ uống nên nằm cạnh nhau: khách vào quán nước cuộn tới đồ uống trước, và đặt Trà sữa sau
-- Hạt rang là bắt họ đi qua đồ nhấm để tới thứ bán chạy nhất.
UPDATE public.categories SET display_order = display_order + 1, updated_at = now()
WHERE id IN ('shop_che','shop_icecream','shop_bakery','shop_snack');

INSERT INTO public.menu_items(id,category_id,name,description,price,image_url,is_available,tags,prep_minutes,created_at,updated_at) VALUES
('shop_milktea_classic','shop_milktea','Trà sữa truyền thống','Trà đen ủ đậm và sữa béo, công thức quen thuộc không cần sửa gì.',35000,'/shop-assets/tea.png',true,ARRAY['Quen mà ngon'],5,now(),now()),
('shop_milktea_pearl','shop_milktea','Trà sữa trân châu đường đen','Trân châu nấu đường đen còn ấm, sữa tươi và trà đậm.',45000,'/shop-assets/tea.png',true,ARRAY['Bán chạy'],6,now(),now()),
('shop_milktea_oolong','shop_milktea','Trà sữa ô long nướng','Ô long nướng thơm khói nhẹ, hậu vị chát dịu, ít ngọt.',42000,'/shop-assets/tea.png',true,ARRAY['Thanh nhẹ'],6,now(),now()),
('shop_milktea_taro','shop_milktea','Trà sữa khoai môn','Khoai môn nghiền mịn, sữa thơm và những viên khoai mềm.',45000,'/shop-assets/tea.png',true,ARRAY['Món mới'],6,now(),now()),
('shop_milktea_matcha','shop_milktea','Trà sữa matcha','Matcha đắng nhẹ hoà sữa, xanh mát và không gắt.',45000,'/shop-assets/matcha.png',true,ARRAY['Bán chạy'],6,now(),now());

-- Nhóm tuỳ chọn như các món pha tại quầy, thêm trân châu đen: trà sữa mà không chọn được trân
-- châu thì thiếu đúng thứ khách tới quán để gọi.
UPDATE public.menu_items SET option_groups_json = '[
 {"id":"size","name":"Kích cỡ","minSelections":1,"maxSelections":1,"options":[{"id":"size_m","name":"Vừa · M","price":0,"isAvailable":true},{"id":"size_l","name":"Lớn · L","price":10000,"isAvailable":true}]},
 {"id":"sugar","name":"Đường","minSelections":1,"maxSelections":1,"options":[{"id":"sugar_0","name":"Không đường","price":0,"isAvailable":true},{"id":"sugar_50","name":"50% đường","price":0,"isAvailable":true},{"id":"sugar_100","name":"100% đường","price":0,"isAvailable":true}]},
 {"id":"ice","name":"Đá","minSelections":1,"maxSelections":1,"options":[{"id":"ice_0","name":"Không đá","price":0,"isAvailable":true},{"id":"ice_50","name":"Ít đá","price":0,"isAvailable":true},{"id":"ice_100","name":"Đá bình thường","price":0,"isAvailable":true}]},
 {"id":"topping","name":"Thêm chút ngon","minSelections":0,"maxSelections":2,"options":[{"id":"topping_pearl_black","name":"Trân châu đen","price":5000,"isAvailable":true},{"id":"topping_pearl","name":"Trân châu trắng","price":5000,"isAvailable":true},{"id":"topping_cream","name":"Kem cheese","price":10000,"isAvailable":true}]}
]', updated_at = now()
WHERE id IN ('shop_milktea_classic','shop_milktea_pearl','shop_milktea_oolong',
             'shop_milktea_taro','shop_milktea_matcha');

-- ---------------------------------------------------------------------------
-- Ăn nhẹ -> Hạt rang
-- ---------------------------------------------------------------------------

UPDATE public.categories SET name = 'Hạt rang', updated_at = now() WHERE id = 'shop_snack';

-- XOÁ HẲN bốn món chiên nướng, không chỉ tắt cờ `is_available`.
--
-- Đã kiểm hai chỗ trước khi chọn cách này:
--   1. `ShopController.menu()` KHÔNG lọc theo `is_available` — nó trả cả món hết hàng kèm cờ.
--      Tắt cờ thì bốn món vẫn nằm nguyên trên thực đơn, chỉ mờ đi. Đó không phải là thay.
--   2. `FK_order_items_menu_items_menu_item_id` khai `ON DELETE SET NULL`. Đơn hàng cũ đã CHỤP
--      LẠI tên và giá vào chính dòng `order_items`, nên xoá món chỉ gỡ liên kết chứ không mất
--      chứng từ. Khoá ngoại được thiết kế đúng cho tình huống này.
DELETE FROM public.menu_items
WHERE id IN ('shop_fries','shop_chicken','shop_snack_bantrangtron','shop_snack_sausage');

-- Hạt để cắn lai rai trong lúc trò chuyện — thứ khách ngồi lâu thật sự gọi, và cũng là thứ
-- không cần ai đứng bếp.
INSERT INTO public.menu_items(id,category_id,name,description,price,image_url,is_available,tags,prep_minutes,created_at,updated_at) VALUES
('shop_nuts_sunflower','shop_snack','Hạt hướng dương','Hướng dương rang vừa lửa, cắn tí tách được cả buổi.',20000,'/shop-assets/snack.png',true,ARRAY['Lai rai'],2,now(),now()),
('shop_nuts_watermelon','shop_snack','Hạt dưa','Hạt dưa đỏ rang thơm, mặn nhẹ.',20000,'/shop-assets/snack.png',true,ARRAY['Lai rai'],2,now(),now()),
('shop_nuts_peanut','shop_snack','Đậu phộng rang tỏi ớt','Đậu phộng giòn, tỏi phi thơm và chút ớt cay.',25000,'/shop-assets/snack.png',true,ARRAY['Lai rai'],2,now(),now()),
('shop_nuts_cashew','shop_snack','Hạt điều rang muối','Hạt điều nguyên vỏ lụa, rang muối vừa miệng.',49000,'/shop-assets/snack.png',true,ARRAY['Bán chạy'],2,now(),now()),
('shop_nuts_pistachio','shop_snack','Hạt dẻ cười','Hạt dẻ cười tách sẵn miệng, rang muối nhẹ.',55000,'/shop-assets/snack.png',true,ARRAY['Món mới'],2,now(),now());

-- Hạt bán theo phần, nên chỉ cần chọn cỡ. Không đường, không đá, không topping.
UPDATE public.menu_items SET option_groups_json = '[
 {"id":"portion","name":"Phần","minSelections":1,"maxSelections":1,"options":[{"id":"portion_small","name":"Phần nhỏ","price":0,"isAvailable":true},{"id":"portion_large","name":"Phần lớn","price":15000,"isAvailable":true}]}
]', updated_at = now()
WHERE id IN ('shop_nuts_sunflower','shop_nuts_watermelon','shop_nuts_peanut',
             'shop_nuts_cashew','shop_nuts_pistachio');
