package com.cmc.restaurant.menu;

import com.cmc.restaurant.menu.MenuDtos.MenuItemRequest;
import com.cmc.restaurant.shared.ApiException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Mirrors the admin CRUD half of {@code RestaurantQrAiOrdering.Api.Menu.MenuEndpoints} (.NET). */
@Service
public class MenuItemService {

	/** Ngưỡng chặn lỗi gõ cho thời gian lên món (phút). */
	private static final int MAX_PREP_MINUTES = 240;

	private final MenuItemRepository menuItemRepository;
	private final CategoryRepository categoryRepository;

	private final MenuItemServingPeriodRepository ganCaRepository;
	private final ServingPeriodRepository servingPeriodRepository;

	public MenuItemService(
			MenuItemRepository menuItemRepository, CategoryRepository categoryRepository,
			MenuItemServingPeriodRepository ganCaRepository,
			ServingPeriodRepository servingPeriodRepository) {
		this.menuItemRepository = menuItemRepository;
		this.categoryRepository = categoryRepository;
		this.ganCaRepository = ganCaRepository;
		this.servingPeriodRepository = servingPeriodRepository;
	}

	public MenuItemEntity create(MenuItemRequest request) {
		validate(request);

		MenuItemEntity item = new MenuItemEntity(
				createUniqueId(),
				request.categoryId().trim(),
				request.name().trim(),
				request.description() == null ? "" : request.description().trim(),
				request.price(),
				normalizeOptional(request.imageUrl()),
				request.isAvailable() == null || request.isAvailable(),
				normalizeTags(request.tags()),
				OffsetDateTime.now());
		item.setPrepMinutes(request.prepMinutes());
		item.setCostPrice(request.costPrice());
		item.setRemainingQuantity(request.remainingQuantity());

		return menuItemRepository.save(item);
	}

	public MenuItemEntity update(String menuItemId, MenuItemRequest request) {
		validate(request);

		MenuItemEntity item = menuItemRepository.findById(menuItemId)
				.orElseThrow(() -> ApiException.notFound("MENU_ITEM_NOT_FOUND", "Menu item was not found."));

		item.setCategoryId(request.categoryId().trim());
		item.setName(request.name().trim());
		item.setDescription(request.description() == null ? "" : request.description().trim());
		item.setPrice(request.price());
		item.setImageUrl(normalizeOptional(request.imageUrl()));
		item.setAvailable(request.isAvailable() == null || request.isAvailable());
		item.setTags(normalizeTags(request.tags()));
		// null = GIỮ NGUYÊN, không phải xoá. Xem ghi chú ở MenuItemRequest: PUT thay toàn bộ bản ghi,
		// nên coi null là xoá thì một lần sửa TÊN món bằng client cũ sẽ thổi bay con số bếp đã khai và
		// mọi ước lượng của món đó, không một tiếng động.
		if (request.prepMinutes() != null) {
			item.setPrepMinutes(request.prepMinutes());
		}
		// Cùng luật, cùng lý do: một lần sửa TÊN món bằng client cũ không được thổi bay giá vốn,
		// vì báo cáo hao hụt sẽ tụt xuống mà không ai biết vì sao.
		if (request.costPrice() != null) {
			item.setCostPrice(request.costPrice());
		}
		// null = GIỮ NGUYÊN, cùng luật với prepMinutes và costPrice. Đặt 0 để báo hết thì gửi số 0,
		// không gửi null — hai thứ đó khác nhau và trộn chúng là mất đường báo hết.
		if (request.remainingQuantity() != null) {
			item.setRemainingQuantity(request.remainingQuantity());
		}
		item.setUpdatedAt(OffsetDateTime.now());

		return menuItemRepository.save(item);
	}

	public MenuItemEntity toggleAvailability(String menuItemId, boolean available) {
		MenuItemEntity item = menuItemRepository.findById(menuItemId)
				.orElseThrow(() -> ApiException.notFound("MENU_ITEM_NOT_FOUND", "Menu item was not found."));

		item.setAvailable(available);
		item.setUpdatedAt(OffsetDateTime.now());

		return menuItemRepository.save(item);
	}

	public void delete(String menuItemId) {
		MenuItemEntity item = menuItemRepository.findById(menuItemId)
				.orElseThrow(() -> ApiException.notFound("MENU_ITEM_NOT_FOUND", "Menu item was not found."));

		menuItemRepository.delete(item);
	}

	public MenuItemEntity getOrThrow(String menuItemId) {
		return menuItemRepository.findById(menuItemId)
				.orElseThrow(() -> ApiException.notFound("MENU_ITEM_NOT_FOUND", "Menu item was not found."));
	}

	private void validate(MenuItemRequest request) {
		if (request == null || isBlank(request.categoryId())) {
			throw ApiException.badRequest("CATEGORY_REQUIRED", "Category is required.");
		}

		boolean categoryActive = categoryRepository.findById(request.categoryId().trim())
				.map(CategoryEntity::isActive)
				.orElse(false);
		if (!categoryActive) {
			throw ApiException.badRequest("CATEGORY_INVALID", "Category must exist and be active.");
		}

		if (isBlank(request.name())) {
			throw ApiException.badRequest("MENU_ITEM_NAME_REQUIRED", "Menu item name is required.");
		}

		if (request.price() == null || request.price().compareTo(BigDecimal.ZERO) <= 0) {
			throw ApiException.badRequest("MENU_ITEM_PRICE_INVALID", "Menu item price must be greater than zero.");
		}

		// Chặn LỖI GÕ, không phải chặn nghiệp vụ. Món lâu nhất trong thực đơn hiện tại là 35 phút
		// (quay nguyên con); ngưỡng để rộng gấp nhiều lần để không cãi nhau với bếp. Nhưng 0 hay số âm
		// thì không có nghĩa nào cả, và một con số ba chữ số gõ nhầm sẽ đẩy ước lượng của cả bếp đi xa.
		Integer prepMinutes = request.prepMinutes();
		if (prepMinutes != null && (prepMinutes < 1 || prepMinutes > MAX_PREP_MINUTES)) {
			throw ApiException.badRequest(
					"MENU_ITEM_PREP_MINUTES_INVALID",
					"Prep minutes must be between 1 and " + MAX_PREP_MINUTES + ".");
		}

		// Giá vốn ÂM là lỗi gõ. Bằng 0 thì HỢP LỆ — có món lấy nguyên liệu từ nguồn khác.
		//
		// KHÔNG chặn giá vốn cao hơn giá bán: quán bán lỗ một món để kéo khách là chuyện thật, và
		// chặn nó là để phần mềm cãi nghiệp vụ. Chặn LỖI GÕ, không chặn quyết định kinh doanh.
		if (request.costPrice() != null && request.costPrice().compareTo(BigDecimal.ZERO) < 0) {
			throw ApiException.badRequest(
					"MENU_ITEM_COST_PRICE_INVALID", "Menu item cost price must not be negative.");
		}
	}

	private String createUniqueId() {
		int lastNumber = menuItemRepository.findAll().stream()
				.map(MenuItemEntity::getId)
				.filter(id -> id.startsWith("m_"))
				.map(id -> {
					try {
						return Integer.parseInt(id.substring(2));
					} catch (NumberFormatException e) {
						return 0;
					}
				})
				.max(Integer::compareTo)
				.orElse(0);

		return "m_%03d".formatted(lastNumber + 1);
	}

	private static String normalizeOptional(String value) {
		return isBlank(value) ? null : value.trim();
	}

	/** Case-insensitive dedup that keeps the first occurrence's casing, matching the .NET
	 * {@code Distinct(StringComparer.OrdinalIgnoreCase)} behavior. */
	private static List<String> normalizeTags(List<String> tags) {
		if (tags == null) {
			return List.of();
		}
		java.util.Set<String> seenLowercase = new java.util.HashSet<>();
		List<String> result = new java.util.ArrayList<>();
		for (String tag : tags) {
			if (isBlank(tag)) {
				continue;
			}
			String trimmed = tag.trim();
			if (seenLowercase.add(trimmed.toLowerCase(java.util.Locale.ROOT))) {
				result.add(trimmed);
			}
		}
		return List.copyOf(result);
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}

	/** Trần 60 phút, giống `kitchen_delay`. Chậm hơn một tiếng thì câu trả lời trung thực là TẮT món. */
	public static final int TRAN_DO_TRE_MON = 60;

	/** Mặc định giữ hiệu lực 60 phút — đủ dài để không phải bấm lại liên tục, đủ ngắn để một lần
	 *  quên không cộng oan cho khách cả buổi. */
	public static final int GIU_MAC_DINH_PHUT = 60;

	/**
	 * Bếp khai độ trễ riêng cho một món.
	 *
	 * <p>{@code phut == 0} là XOÁ: đặt luôn mốc hết hạn về null để trạng thái chỉ có một cách biểu
	 * diễn. Để lại mốc cũ với số 0 là tạo ra hai kiểu "không có độ trễ", rồi chờ chỗ đọc phân biệt
	 * nhầm.
	 */
	public MenuItemEntity khaiDoTreMon(String menuItemId, int phut, Integer giuPhut) {
		if (phut < 0 || phut > TRAN_DO_TRE_MON) {
			throw ApiException.badRequest(
					"MENU_ITEM_DELAY_INVALID",
					"Độ trễ phải trong khoảng 0 tới " + TRAN_DO_TRE_MON + " phút.");
		}
		MenuItemEntity item = menuItemRepository.findById(menuItemId)
				.orElseThrow(() -> ApiException.notFound("MENU_ITEM_NOT_FOUND", "Menu item not found."));

		OffsetDateTime now = OffsetDateTime.now();
		int giu = giuPhut == null || giuPhut <= 0 ? GIU_MAC_DINH_PHUT : giuPhut;
		item.khaiDoTre(phut, phut == 0 ? null : now.plusMinutes(giu));
		item.setUpdatedAt(now);
		return menuItemRepository.save(item);
	}

	/**
	 * Chuẩn bị thực đơn hôm nay: bật/tắt món và đặt số suất, MỘT GIAO DỊCH cho cả danh sách.
	 *
	 * <p><b>Vì sao một giao dịch.</b> Quản trị viên làm việc này mỗi sáng trước giờ mở cửa. Nửa
	 * chừng mất mạng mà 40 món đã lưu còn 51 món chưa thì thực đơn hôm đó ở một trạng thái không
	 * ai chọn — và người sửa không biết mình dừng ở đâu trong danh sách. Hoặc cả thực đơn hôm nay
	 * được đặt, hoặc không gì cả.
	 *
	 * <p><b>{@code null} là KHÔNG ĐỔI, không phải xoá</b> — cùng luật với mọi trường khác của
	 * module này. Gửi thiếu một trường không được im lặng thổi bay giá trị đang có.
	 *
	 * <p><b>Số suất KHÔNG tự tắt món.</b> Đặt 0 là hết suất; công tắc {@code isAvailable} vẫn là
	 * quyết định riêng của người. Hai sự thật khác nhau — "bán hết mẻ hôm nay" và "hôm nay quán
	 * không bán món này" — nên báo cáo phân biệt được chúng. Gộp vào một cờ là mất vĩnh viễn.
	 *
	 * @return số món thật sự đổi
	 */
	@Transactional
	public int chuanBiThucDonHomNay(List<MenuDtos.ChuanBiMonRequest> dong) {
		if (dong == null || dong.isEmpty()) {
			throw ApiException.badRequest("REQUEST_INVALID", "Danh sách món trống.");
		}

		OffsetDateTime now = OffsetDateTime.now();
		int daSua = 0;
		Set<String> caCoThat = servingPeriodRepository.findAll().stream()
				.map(ServingPeriodEntity::getId)
				.collect(Collectors.toSet());

		for (MenuDtos.ChuanBiMonRequest yeuCau : dong) {
			if (yeuCau.remainingQuantity() != null && yeuCau.remainingQuantity() < 0) {
				throw ApiException.badRequest(
						"MENU_ITEM_QUANTITY_INVALID", "Số suất không được âm.");
			}
			MenuItemEntity mon = menuItemRepository.findById(yeuCau.menuItemId())
					.orElseThrow(() -> ApiException.notFound(
							"MENU_ITEM_NOT_FOUND", "Không thấy món " + yeuCau.menuItemId() + "."));

			boolean coDoi = false;
			if (yeuCau.isAvailable() != null && mon.isAvailable() != yeuCau.isAvailable()) {
				mon.setAvailable(yeuCau.isAvailable());
				coDoi = true;
			}
			if (yeuCau.remainingQuantity() != null
					&& !yeuCau.remainingQuantity().equals(mon.getRemainingQuantity())) {
				mon.setRemainingQuantity(yeuCau.remainingQuantity());
				coDoi = true;
			}
			if (ganCa(yeuCau, caCoThat)) {
				coDoi = true;
			}
			if (coDoi) {
				mon.setUpdatedAt(now);
				menuItemRepository.save(mon);
				daSua++;
			}
		}
		return daSua;
	}

	/**
	 * Gán món vào các ca phục vụ. Trả về {@code true} nếu có thay đổi thật.
	 *
	 * <p>{@code null} là GIỮ NGUYÊN. Danh sách RỖNG là "bán cả ngày" — đó là một lệnh, khác hẳn
	 * với việc không gửi trường này.
	 *
	 * <p><b>Ca lạ bị TỪ CHỐI, không bỏ qua.</b> Một id ca không có thật sẽ không khớp ca nào đang
	 * mở, nên món đó biến mất khỏi thực đơn khách — im lặng, không lỗi, và không ai phát hiện cho
	 * tới lúc khách hỏi. Thà hỏng ngay tại lượt lưu.
	 */
	private boolean ganCa(MenuDtos.ChuanBiMonRequest yeuCau, Set<String> caCoThat) {
		if (yeuCau.servingPeriodIds() == null) {
			return false;
		}
		Set<String> moi = new HashSet<>(yeuCau.servingPeriodIds());
		for (String caId : moi) {
			if (!caCoThat.contains(caId)) {
				throw ApiException.badRequest(
						"SERVING_PERIOD_NOT_FOUND", "Không thấy ca phục vụ " + caId + ".");
			}
		}

		Set<String> cu = ganCaRepository.findByMenuItemId(yeuCau.menuItemId()).stream()
				.map(MenuItemServingPeriodEntity::getServingPeriodId)
				.collect(Collectors.toSet());
		if (cu.equals(moi)) {
			return false;
		}

		ganCaRepository.deleteByMenuItemId(yeuCau.menuItemId());
		for (String caId : moi) {
			ganCaRepository.save(new MenuItemServingPeriodEntity(
					UUID.randomUUID().toString(), yeuCau.menuItemId(), caId));
		}
		return true;
	}
}
