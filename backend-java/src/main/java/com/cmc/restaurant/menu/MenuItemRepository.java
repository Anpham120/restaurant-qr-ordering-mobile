package com.cmc.restaurant.menu;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MenuItemRepository extends JpaRepository<MenuItemEntity, String> {

	List<MenuItemEntity> findByCategoryIdInAndAvailableTrue(List<String> categoryIds);

	List<MenuItemEntity> findByCategoryIdInOrderByNameAsc(List<String> categoryIds);

	List<MenuItemEntity> findAllByOrderByNameAsc();

	/**
	 * Trừ số phần còn lại, CÓ ĐIỀU KIỆN, trong một câu lệnh.
	 *
	 * <p>ĐỌC RỒI GHI LÀ SAI Ở ĐÂY. Hai khách cùng gọi phần cuối cùng: cả hai đọc thấy "còn 1", cả
	 * hai thấy đủ, cả hai ghi "còn 0", và bếp nhận hai đơn cho một phần. Cửa sổ giữa lần đọc và lần
	 * ghi nhỏ tới mức không ai gặp lúc thử tay — nó chỉ xuất hiện vào giờ đông khách, tức đúng lúc
	 * món sắp hết và đúng lúc chuyện này quan trọng nhất.
	 *
	 * <p>Điều kiện nằm TRONG câu {@code UPDATE}: cơ sở dữ liệu tự khoá hàng đó khi ghi, nên hai lần
	 * chạy song song thành hai lần tuần tự và người thứ hai thấy {@code 0 hàng được cập nhật}.
	 *
	 * <p>{@code remaining_quantity IS NULL} là món KHÔNG đếm phần — luôn cho qua, và không ghi gì.
	 *
	 * @return số hàng được cập nhật: 1 là trừ được, 0 là không đủ phần.
	 */
	@Modifying
	@Query(value = """
			update menu_items
			   set remaining_quantity = case
			                              when remaining_quantity is null then null
			                              else remaining_quantity - :soLuong
			                            end,
			       updated_at = now()
			 where id = :id
			   and (remaining_quantity is null or remaining_quantity >= :soLuong)
			""", nativeQuery = true)
	int truTonKho(@Param("id") String menuItemId, @Param("soLuong") int soLuong);

	/**
	 * Trả phần về kho khi món bị huỷ lúc CHƯA NẤU.
	 *
	 * <p>Chỉ gọi cho món huỷ từ {@code Pending}. Huỷ từ {@code Preparing} thì nguyên liệu đã mất —
	 * trả phần về là nói rằng quán vẫn bán được nó, và bán tiếp một phần không còn nguyên liệu.
	 * Cùng ranh giới mà báo cáo hao hụt (V33) đang dùng.
	 */
	@Modifying
	@Query(value = """
			update menu_items
			   set remaining_quantity = remaining_quantity + :soLuong,
			       updated_at = now()
			 where id = :id
			   and remaining_quantity is not null
			""", nativeQuery = true)
	int traTonKho(@Param("id") String menuItemId, @Param("soLuong") int soLuong);
}
