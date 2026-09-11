package com.cmc.restaurant.menu;

import com.cmc.restaurant.menu.MenuDtos.MenuItemRequest;
import com.cmc.restaurant.menu.MenuDtos.AdminMenuItemResponse;
import com.cmc.restaurant.menu.MenuDtos.ToggleAvailabilityRequest;
import com.cmc.restaurant.shared.ApiException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Mirrors the admin half of {@code RestaurantQrAiOrdering.Api.Menu.MenuEndpoints} (.NET), Admin-only. */
@RestController
@RequestMapping("/api/admin/menu-items")
@PreAuthorize("hasRole('Admin')")
public class AdminMenuItemController {

	private final MenuItemRepository menuItemRepository;
	private final CategoryRepository categoryRepository;
	private final MenuItemService menuItemService;
	/** Qua CỔNG ứng dụng, không chọc thẳng vào repository của module orders — cùng lối mà
	 * {@code AdminTableController} đã dùng, và là thứ ArchUnit đang canh. */
	private final com.cmc.restaurant.orders.application.OrderLookup orderLookup;
	private final MenuItemServingPeriodRepository ganCaRepository;

	public AdminMenuItemController(
			MenuItemRepository menuItemRepository, CategoryRepository categoryRepository,
			MenuItemService menuItemService,
			com.cmc.restaurant.orders.application.OrderLookup orderLookup,
			MenuItemServingPeriodRepository ganCaRepository) {
		this.ganCaRepository = ganCaRepository;
		this.menuItemRepository = menuItemRepository;
		this.categoryRepository = categoryRepository;
		this.menuItemService = menuItemService;
		this.orderLookup = orderLookup;
	}

	/**
	 * Đọc danh mục MỘT LẦN vào map thay vì tra theo từng món.
	 *
	 * <p>Bản trước gọi {@code toResponse} cho từng món, và mỗi lượt tra danh mục chạy trong một
	 * giao dịch RIÊNG (phương thức này không có {@code @Transactional}, nên mỗi lời gọi repository
	 * tự mở một cái). Đo trên cơ sở dữ liệu thật với 91 món:
	 *
	 * <pre>
	 *   trước:  274 câu SQL  =  1 (danh sách) + 91 × (BEGIN + SELECT + COMMIT)
	 *   sau:      2 câu SQL  =  1 (danh sách) + 1 (toàn bộ danh mục)
	 * </pre>
	 *
	 * <p>Số danh mục là 13 và bị chặn bởi nghiệp vụ (thực đơn nhà hàng), nên nạp hết vào bộ nhớ ở
	 * đây là an toàn — khác với việc nạp hết MÓN, thứ có thể phình.
	 */
	@GetMapping
	public List<AdminMenuItemResponse> list() {
		Map<String, String> tenDanhMuc = categoryRepository.findAll().stream()
				.collect(Collectors.toMap(CategoryEntity::getId, CategoryEntity::getName));
		return menuItemRepository.findAllByOrderByNameAsc().stream()
				.map(item -> MenuQueryService.toAdminResponse(
						item, tenDanhMuc.getOrDefault(item.getCategoryId(), "")))
				.toList();
	}

	/**
	 * Số phần đang chờ bếp, theo từng món.
	 *
	 * <p>Endpoint RIÊNG chứ không thêm trường vào {@code MenuItemResponse}: bản ghi ĐÓ dùng chung
	 * với thực đơn CÔNG KHAI, và số món đang trong hàng đợi bếp là thông tin vận hành — khách
	 * không cần biết, và không nên biết.
	 *
	 * <p>Quản lý cần nó ở đúng một lúc: trước khi tắt một món. Tắt món chỉ nói "khách sẽ không
	 * thấy nữa" là thiếu vế quyết định — bỏ dở ba bát đang nấu là một việc khác hẳn tắt một món
	 * chưa ai gọi.
	 */
	@GetMapping("/pending-quantities")
	public java.util.Map<String, Integer> pendingQuantities() {
		return orderLookup.soPhanDangChoTheoMon();
	}

	@GetMapping("/{menuItemId}")
	public AdminMenuItemResponse get(@PathVariable String menuItemId) {
		return toResponse(menuItemService.getOrThrow(menuItemId));
	}

	@PostMapping
	public ResponseEntity<AdminMenuItemResponse> create(@RequestBody MenuItemRequest request) {
		MenuItemEntity created = menuItemService.create(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
	}

	@PutMapping("/{menuItemId}")
	public AdminMenuItemResponse update(@PathVariable String menuItemId, @RequestBody MenuItemRequest request) {
		return toResponse(menuItemService.update(menuItemId, request));
	}

	@PatchMapping("/{menuItemId}/availability")
	public AdminMenuItemResponse toggleAvailability(
			@PathVariable String menuItemId, @RequestBody ToggleAvailabilityRequest request) {
		return toResponse(menuItemService.toggleAvailability(menuItemId, request.isAvailable()));
	}

	@DeleteMapping("/{menuItemId}")
	public ResponseEntity<Void> delete(@PathVariable String menuItemId) {
		menuItemService.delete(menuItemId);
		return ResponseEntity.noContent().build();
	}

	private AdminMenuItemResponse toResponse(MenuItemEntity item) {
		String categoryName = categoryRepository.findById(item.getCategoryId())
				.map(CategoryEntity::getName)
				.orElse("");
		return MenuQueryService.toAdminResponse(item, categoryName);
	}

	/**
	 * CHUẨN BỊ THỰC ĐƠN HÔM NAY — bật/tắt món và đặt số suất cho cả thực đơn, MỘT LƯỢT.
	 *
	 * <p>Đây là việc quản trị viên làm mỗi sáng trước giờ mở cửa: hôm nay bán món gì, và nguyên
	 * liệu vừa nhập làm được mấy suất mỗi món.
	 *
	 * <p>Endpoint RIÊNG chứ không bắt gọi {@code PUT /{id}} 91 lần. Sửa từng món qua modal là hình
	 * dạng đúng cho việc đổi giá hay đổi mô tả — mỗi năm vài lần, mỗi lần một món. Nó là hình dạng
	 * SAI cho một việc chạm vào cả thực đơn mỗi ngày, và đó là lý do tính năng số suất nằm im: cách
	 * duy nhất để dùng nó tốn 91 lần mở-gõ-lưu-đóng.
	 */
	/**
	 * Món nào đang gán vào ca nào: {@code {"m_pho": ["sp_sang"], ...}}.
	 *
	 * <p>Endpoint riêng thay vì thêm trường vào {@code AdminMenuItemResponse}. Bảng chuẩn bị thực
	 * đơn là chỗ DUY NHẤT cần dữ liệu này; nhét vào DTO chung thì mọi màn hình khác đều phải tải
	 * thêm, và hàm ánh xạ tĩnh {@code toAdminResponse} sẽ phải nhận thêm một tham số mà gần như mọi
	 * chỗ gọi truyền rỗng. Cùng lối mà {@code /pending-quantities} ngay trên đã dùng.
	 *
	 * <p>Món KHÔNG có mặt trong bản đồ này là món bán CẢ NGÀY.
	 */
	@GetMapping("/serving-periods")
	public Map<String, List<String>> ganCaTheoMon() {
		return ganCaRepository.findAll().stream()
				.collect(Collectors.groupingBy(
						MenuItemServingPeriodEntity::getMenuItemId,
						Collectors.mapping(
								MenuItemServingPeriodEntity::getServingPeriodId, Collectors.toList())));
	}

	@PutMapping("/chuan-bi-hom-nay")
	public Map<String, Integer> chuanBiHomNay(
			@RequestBody(required = false) MenuDtos.ChuanBiThucDonRequest request) {
		if (request == null) {
			throw ApiException.badRequest("REQUEST_INVALID", "Request body is required.");
		}
		int daSua = menuItemService.chuanBiThucDonHomNay(request.items());
		return Map.of("daSua", daSua);
	}
}
