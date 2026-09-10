package com.cmc.restaurant.menu;

import com.cmc.restaurant.menu.MenuDtos.ServingPeriodRequest;
import com.cmc.restaurant.shared.ApiException;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quán tự khai ca phục vụ: "Trưa 10:00-14:00", "Lẩu đêm 18:00-02:00".
 *
 * <p>Không đóng cứng sáng/trưa/chiều/tối vì quán này mở 10:00-14:00 và 18:00-22:00 — hai trong bốn
 * khung cố định sẽ chết ngay từ đầu.
 */
@Service
public class ServingPeriodService {

	private final ServingPeriodRepository servingPeriodRepository;
	private final MenuItemPeriodStockRepository suatTheoCaRepository;

	public ServingPeriodService(
			ServingPeriodRepository servingPeriodRepository,
			MenuItemPeriodStockRepository suatTheoCaRepository) {
		this.suatTheoCaRepository = suatTheoCaRepository;
		this.servingPeriodRepository = servingPeriodRepository;
	}

	public List<ServingPeriodEntity> danhSach() {
		return servingPeriodRepository.findAllByOrderByDisplayOrderAscStartTimeAsc();
	}

	public ServingPeriodEntity tao(ServingPeriodRequest yeuCau) {
		kiemTra(yeuCau);
		return servingPeriodRepository.save(new ServingPeriodEntity(
				"sp_" + UUID.randomUUID().toString().substring(0, 8),
				yeuCau.name().trim(), yeuCau.startTime(), yeuCau.endTime(),
				yeuCau.displayOrder() == null ? 0 : yeuCau.displayOrder(),
				OffsetDateTime.now()));
	}

	public ServingPeriodEntity sua(String id, ServingPeriodRequest yeuCau) {
		kiemTra(yeuCau);
		ServingPeriodEntity ca = servingPeriodRepository.findById(id)
				.orElseThrow(() -> ApiException.notFound(
						"SERVING_PERIOD_NOT_FOUND", "Không thấy ca phục vụ này."));

		ca.setName(yeuCau.name().trim());
		ca.setStartTime(yeuCau.startTime());
		ca.setEndTime(yeuCau.endTime());
		if (yeuCau.displayOrder() != null) {
			ca.setDisplayOrder(yeuCau.displayOrder());
		}
		ca.setUpdatedAt(OffsetDateTime.now());
		return servingPeriodRepository.save(ca);
	}

	/**
	 * Xoá một ca.
	 *
	 * <p>Không dọn tay phần gán món. {@code ON DELETE CASCADE} của V38 lo việc đó, và món quay về
	 * "không gán ca nào" = bán cả ngày, tức là VẪN HIỆN trong thực đơn khách. Đó là hướng hỏng an
	 * toàn, và để cơ sở dữ liệu bảo đảm nó thay vì trông vào việc mọi chỗ xoá đều nhớ dọn.
	 */
	public void xoa(String id) {
		if (!servingPeriodRepository.existsById(id)) {
			throw ApiException.notFound("SERVING_PERIOD_NOT_FOUND", "Không thấy ca phục vụ này.");
		}
		servingPeriodRepository.deleteById(id);
	}

	public List<MenuItemPeriodStockEntity> suatTheoCa() {
		return suatTheoCaRepository.findAll();
	}

	/**
	 * Đặt số suất dự kiến cho CẢ MỘT CA, một lượt.
	 *
	 * <p>{@code plannedQuantity == null} là XOÁ dòng cấu hình: ca này không quản số suất cho món
	 * đó, và tác vụ nạp lại sẽ không đụng tới nó. Khác hẳn 0, vốn là một lệnh có nghĩa — ca mở ra
	 * với 0 suất, tức món không bán trong ca này.
	 *
	 * @return số dòng cấu hình còn lại của ca
	 */
	@Transactional
	public int datSuatTheoCa(String caId, List<MenuDtos.SuatTheoCaDong> dong) {
		if (!servingPeriodRepository.existsById(caId)) {
			throw ApiException.notFound("SERVING_PERIOD_NOT_FOUND", "Không thấy ca phục vụ này.");
		}
		if (dong == null) {
			throw ApiException.badRequest("REQUEST_INVALID", "Danh sách món trống.");
		}

		for (MenuDtos.SuatTheoCaDong d : dong) {
			Integer so = d.plannedQuantity();
			if (so != null && so < 0) {
				throw ApiException.badRequest(
						"MENU_ITEM_QUANTITY_INVALID", "Số suất không được âm.");
			}
			var dangCo = suatTheoCaRepository
					.findByMenuItemIdAndServingPeriodId(d.menuItemId(), caId);
			if (so == null) {
				dangCo.ifPresent(suatTheoCaRepository::delete);
			} else if (dangCo.isPresent()) {
				dangCo.get().setPlannedQuantity(so);
				suatTheoCaRepository.save(dangCo.get());
			} else {
				suatTheoCaRepository.save(new MenuItemPeriodStockEntity(
						UUID.randomUUID().toString(), d.menuItemId(), caId, so));
			}
		}
		return suatTheoCaRepository.findByServingPeriodId(caId).size();
	}

	/**
	 * KHÔNG chặn {@code startTime > endTime} — đó là ca bọc qua nửa đêm, hợp lệ.
	 *
	 * <p>Chỉ chặn hai giờ BẰNG nhau: ca dài 0 phút không phục vụ được gì và gần như chắc chắn là
	 * lỗi gõ. Cùng luật với ràng buộc {@code ck_serving_periods_khac_gio} trong V38.
	 */
	private void kiemTra(ServingPeriodRequest yeuCau) {
		if (yeuCau == null || yeuCau.name() == null || yeuCau.name().isBlank()) {
			throw ApiException.badRequest("SERVING_PERIOD_NAME_REQUIRED", "Ca phục vụ phải có tên.");
		}
		LocalTime tu = yeuCau.startTime();
		LocalTime den = yeuCau.endTime();
		if (tu == null || den == null) {
			throw ApiException.badRequest(
					"SERVING_PERIOD_TIME_REQUIRED", "Ca phục vụ phải có giờ bắt đầu và giờ kết thúc.");
		}
		if (tu.equals(den)) {
			throw ApiException.badRequest(
					"SERVING_PERIOD_TIME_INVALID", "Giờ bắt đầu và giờ kết thúc không được trùng nhau.");
		}
	}

	static MenuDtos.ServingPeriodResponse toResponse(ServingPeriodEntity ca) {
		return new MenuDtos.ServingPeriodResponse(
				ca.getId(), ca.getName(), ca.getStartTime(), ca.getEndTime(), ca.getDisplayOrder());
	}
}
