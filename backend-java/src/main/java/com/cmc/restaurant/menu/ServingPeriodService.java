package com.cmc.restaurant.menu;

import com.cmc.restaurant.menu.MenuDtos.ServingPeriodRequest;
import com.cmc.restaurant.shared.ApiException;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Quán tự khai ca phục vụ: "Trưa 10:00-14:00", "Lẩu đêm 18:00-02:00".
 *
 * <p>Không đóng cứng sáng/trưa/chiều/tối vì quán này mở 10:00-14:00 và 18:00-22:00 — hai trong bốn
 * khung cố định sẽ chết ngay từ đầu.
 */
@Service
public class ServingPeriodService {

	private final ServingPeriodRepository servingPeriodRepository;

	public ServingPeriodService(ServingPeriodRepository servingPeriodRepository) {
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
