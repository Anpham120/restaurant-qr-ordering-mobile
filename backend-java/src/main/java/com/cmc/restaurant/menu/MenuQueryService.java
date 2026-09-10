package com.cmc.restaurant.menu;

import com.cmc.restaurant.menu.MenuDtos.MenuCategoryResponse;
import com.cmc.restaurant.menu.MenuDtos.MenuItemResponse;
import com.cmc.restaurant.menu.MenuDtos.MenuResponse;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Mirrors the {@code GET /api/menu} handler in {@code MenuEndpoints.cs} (.NET). */
@Service
public class MenuQueryService {

	/**
	 * Ca phục vụ là GIỜ TREO TƯỜNG CỦA QUÁN, không phải giờ máy chủ.
	 *
	 * <p>Máy chủ chạy UTC. Đọc {@code LocalTime.now()} thẳng thì ca trưa 10:00-14:00 sẽ mở lúc 5 giờ
	 * chiều giờ Việt Nam — thực đơn sai bảy tiếng, mỗi ngày, và không có lỗi nào được ném ra. Cùng
	 * múi giờ mà {@code XetLaiHangJob} đã dùng.
	 */
	private static final ZoneId MUI_GIO_QUAN = ZoneId.of("Asia/Ho_Chi_Minh");

	private final CategoryRepository categoryRepository;
	private final MenuItemRepository menuItemRepository;
	private final ServingPeriodRepository servingPeriodRepository;
	private final MenuItemServingPeriodRepository ganCaRepository;

	public MenuQueryService(
			CategoryRepository categoryRepository, MenuItemRepository menuItemRepository,
			ServingPeriodRepository servingPeriodRepository,
			MenuItemServingPeriodRepository ganCaRepository) {
		this.categoryRepository = categoryRepository;
		this.menuItemRepository = menuItemRepository;
		this.servingPeriodRepository = servingPeriodRepository;
		this.ganCaRepository = ganCaRepository;
	}

	public MenuResponse getPublicMenu() {
		return layThucDon(LocalTime.now(MUI_GIO_QUAN));
	}

	/** Nhận thời điểm làm tham số để kiểm được ca phục vụ mà không phải chờ tới đúng 18:00. */
	MenuResponse layThucDon(LocalTime luc) {
		List<CategoryEntity> activeCategories = categoryRepository.findByActiveTrueOrderByDisplayOrderAscNameAsc();
		Map<String, CategoryEntity> categoryLookup = new LinkedHashMap<>();
		for (CategoryEntity category : activeCategories) {
			categoryLookup.put(category.getId(), category);
		}

		List<String> activeCategoryIds = activeCategories.stream().map(CategoryEntity::getId).toList();
		List<MenuItemEntity> availableItems = menuItemRepository.findByCategoryIdInAndAvailableTrue(activeCategoryIds);

		// MÓN HẾT SUẤT KHÔNG HIỆN TRONG THỰC ĐƠN KHÁCH.
		//
		// Lọc lúc HIỂN THỊ, không ghi `is_available = false`. Hai sự thật khác nhau và phải giữ
		// riêng: "bán hết mẻ hôm nay" là một phép ĐẾM, còn công tắc là một QUYẾT ĐỊNH của người.
		// Ghi phép đếm vào công tắc thì sáng mai lúc quản trị viên đặt lại thực đơn, hệ thống không
		// còn phân biệt được đâu là món hết mẻ, đâu là món quán cố ý không bán — và báo cáo mất
		// vĩnh viễn khả năng nói "món này hết sớm" khác "món này hôm nay không phục vụ".
		//
		// `remainingQuantity == null` là KHÔNG đếm suất, luôn hiện. Không phải bằng 0.
		// CA PHỤC VỤ: sáng bán phở, trưa bán cơm, tối bán lẩu.
		//
		// Món KHÔNG gán ca nào thì bán cả ngày — xem LichPhucVu. Nhờ luật đó, quán chưa khai ca nào
		// thì lọc này không loại gì cả và thực đơn chạy y như trước khi có tính năng.
		LichPhucVu lich = LichPhucVu.tai(
				servingPeriodRepository.findAll(), ganCaRepository.findAll(), luc);

		List<MenuItemResponse> sortedItems = availableItems.stream()
				.filter(item -> item.getRemainingQuantity() == null || item.getRemainingQuantity() > 0)
				.filter(item -> lich.dangTrongCa(item.getId()))
				.sorted(Comparator
						.<MenuItemEntity>comparingInt(item -> categoryLookup.get(item.getCategoryId()).getDisplayOrder())
						.thenComparing(item -> item.getName().toLowerCase(java.util.Locale.ROOT)))
				.map(item -> toResponse(item, categoryLookup.get(item.getCategoryId()).getName()))
				.toList();

		List<MenuCategoryResponse> sortedCategories = activeCategories.stream()
				.map(category -> new MenuCategoryResponse(category.getId(), category.getName()))
				.toList();

		return new MenuResponse(sortedCategories, sortedItems);
	}

	static MenuItemResponse toResponse(MenuItemEntity item, String categoryName) {
		return new MenuItemResponse(
				item.getId(), item.getName(), item.getDescription(), item.getPrice(), item.getCategoryId(),
				categoryName, item.getImageUrl(), item.isAvailable(), item.getTags(), item.getPrepMinutes(),
				item.getRemainingQuantity(),
				item.delayConHieuLuc(java.time.OffsetDateTime.now()));
	}

	/**
	 * Bản có giá vốn, CHỈ dùng sau lớp {@code hasRole('Admin')}.
	 *
	 * <p>Hàm trên không bao giờ trả giá vốn vì kiểu trả về của nó không có trường đó — đường công
	 * khai an toàn theo kiểu dữ liệu, không theo việc ai đó nhớ xoá trường trước khi trả.
	 */
	static MenuDtos.AdminMenuItemResponse toAdminResponse(MenuItemEntity item, String categoryName) {
		return new MenuDtos.AdminMenuItemResponse(
				item.getId(), item.getName(), item.getDescription(), item.getPrice(), item.getCategoryId(),
				categoryName, item.getImageUrl(), item.isAvailable(), item.getTags(), item.getPrepMinutes(),
				item.getCostPrice(), item.getRemainingQuantity(),
				item.delayConHieuLuc(java.time.OffsetDateTime.now()));
	}
}
