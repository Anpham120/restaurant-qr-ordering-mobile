package com.cmc.restaurant.menu;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Mirrors {@code RestaurantQrAiOrdering.Api.Menu.MenuContracts} (.NET) field-for-field. */
public final class MenuDtos {

	private MenuDtos() {
	}

	public record MenuResponse(List<MenuCategoryResponse> categories, List<MenuItemResponse> items) {
	}

	public record MenuCategoryResponse(String categoryId, String name) {
	}

	public record AdminCategoryResponse(
			String categoryId, String name, int displayOrder, boolean isActive,
			OffsetDateTime createdAt, OffsetDateTime updatedAt) {
	}

	/**
	 * @param prepMinutes phút từ lúc bếp nhận món tới lúc món sẵn sàng; {@code null} = chưa khai.
	 *     Có mặt cả ở thực đơn công khai — đây là con số vô hại và là thứ duy nhất giải thích được
	 *     vì sao món này ước lượng lâu hơn món kia.
	 */
	/**
	 * @param remainingQuantity số phần còn bán được; {@code null} = KHÔNG giới hạn.
	 *     <p>Trường này CÓ ở thực đơn công khai, và đó là chủ ý — ngược với {@code costPrice}.
	 *     Khách cần biết món sắp hết để đổi ý trước khi gọi, chứ không phải nhận lỗi sau khi gửi.
	 *     Nó không tiết lộ gì về chi phí hay vận hành nội bộ.
	 */
	public record MenuItemResponse(
			String id, String name, String description, BigDecimal price, String categoryId,
			String categoryName, String imageUrl, boolean isAvailable, List<String> tags,
			Integer prepMinutes, Integer remainingQuantity) {
	}

	/**
	 * Bản dành cho ADMIN — có thêm giá vốn.
	 *
	 * <p>MỘT RECORD RIÊNG, KHÔNG PHẢI THÊM TRƯỜNG VÀO {@link MenuItemResponse}. Record kia là thứ
	 * {@code GET /api/menu} trả về cho KHÁCH quét QR. Thêm {@code costPrice} vào đó rồi nhớ xoá nó
	 * ở đường công khai là đặt cược vào trí nhớ: một lần quên là giá vốn của cả 91 món nằm trong
	 * JSON mà bất kỳ ai mở DevTools cũng đọc được, và không có gì báo động.
	 *
	 * <p>Tách kiểu thì đường công khai KHÔNG THỂ trả giá vốn — nó không có trường đó để mà trả.
	 * An toàn theo kiểu dữ liệu, không theo kỷ luật.
	 */
	public record AdminMenuItemResponse(
			String id, String name, String description, BigDecimal price, String categoryId,
			String categoryName, String imageUrl, boolean isAvailable, List<String> tags,
			Integer prepMinutes, BigDecimal costPrice, Integer remainingQuantity) {
	}

	public record CategoryRequest(String name, int displayOrder, Boolean isActive) {
	}

	/**
	 * @param prepMinutes phút từ lúc nhận món tới lúc món sẵn sàng.
	 *     <p>Khi SỬA món, {@code null} nghĩa là GIỮ NGUYÊN giá trị đang có, không phải xoá. Đây là
	 *     điểm khác với mọi trường khác của bản ghi này, và là chủ ý: {@code PUT} thay toàn bộ bản
	 *     ghi, nên nếu {@code null} là xoá thì bất kỳ ai sửa TÊN món bằng một client cũ — hay bằng
	 *     curl — cũng xoá luôn con số bếp đã khai, im lặng, và mọi ước lượng của món đó biến mất.
	 *     <p>Chưa có đường XOÁ giá trị. Sửa sai thì đặt số khác; "không còn biết nữa" là ca chưa gặp.
	 */
	/**
	 * @param costPrice giá vốn. Cùng luật "{@code null} = GIỮ NGUYÊN" với {@code prepMinutes}, và
	 *     cùng một lý do: {@code PUT} thay toàn bộ bản ghi, nên nếu {@code null} là xoá thì bất kỳ
	 *     ai sửa TÊN món bằng một client cũ cũng xoá luôn giá vốn — im lặng, và báo cáo hao hụt
	 *     tụt xuống mà không ai biết vì sao.
	 */
	public record MenuItemRequest(
			String categoryId, String name, String description, BigDecimal price, String imageUrl,
			Boolean isAvailable, List<String> tags, Integer prepMinutes, BigDecimal costPrice,
			Integer remainingQuantity) {
	}

	public record ToggleAvailabilityRequest(boolean isAvailable) {
	}
}
