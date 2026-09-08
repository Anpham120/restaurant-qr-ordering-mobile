package com.cmc.restaurant.promotions;

import com.cmc.restaurant.promotions.domain.Promotion;
import com.cmc.restaurant.shared.ApiException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Mirrors {@code PromotionCalculator.TryApplyAsync} (.NET). The rules live in {@link Promotion};
 * this only looks the code up. */
@Service
public class PromotionService {

	private final PromotionRepository promotionRepository;

	public PromotionService(PromotionRepository promotionRepository) {
		this.promotionRepository = promotionRepository;
	}

	public PromotionDtos.ValidatePromotionResponse validate(PromotionDtos.ValidatePromotionRequest request) {
		BigDecimal subtotal = request == null || request.subtotalAmount() == null
				? BigDecimal.ZERO : request.subtotalAmount();
		PromotionEntity entity = requireByCode(request == null ? null : request.code());
		Promotion.Discount discount = entity.toDomain().applyTo(subtotal, OffsetDateTime.now());

		return new PromotionDtos.ValidatePromotionResponse(
				entity.getCode(), entity.getName(), entity.getDescription(), entity.isFlashSale(),
				subtotal, discount.discountAmount(), discount.totalAmount());
	}

	/**
	 * Danh sách khuyến mãi đang chạy, sắp flash sale lên trước (§9.10 M1 mục 3).
	 *
	 * <p>Lọc bằng {@link Promotion#isActiveAt} ở tầng domain chứ KHÔNG viết điều kiện ngày vào câu
	 * truy vấn. Viết vào SQL thì nhanh hơn, nhưng luật "đang chạy" sẽ nằm ở hai nơi — SQL và
	 * domain — và chúng sẽ lệch nhau đúng vào lúc ai đó sửa một bên. Bảng khuyến mãi có vài chục
	 * dòng; đổi vài mili giây lấy MỘT định nghĩa duy nhất là đáng.
	 *
	 * <p>Dùng lại {@code findAllByOrderByFlashSaleDescCodeAsc} để thứ tự giống hệt màn admin — hai
	 * màn hình cùng nói về một danh sách thì không nên xếp khác nhau.
	 */
	public PromotionDtos.ActivePromotionListResponse listActive() {
		OffsetDateTime now = OffsetDateTime.now();
		return new PromotionDtos.ActivePromotionListResponse(
				promotionRepository.findAllByOrderByFlashSaleDescCodeAsc().stream()
						.filter(entity -> entity.toDomain().isActiveAt(now))
						.map(entity -> new PromotionDtos.ActivePromotionResponse(
								entity.getCode(), entity.getName(), entity.getDescription(),
								entity.getType().name(), entity.getDiscountValue(),
								entity.getMinOrderAmount(), entity.getMaxDiscountAmount(),
								entity.isFlashSale(), entity.getEndsAt()))
						.toList());
	}

	/**
	 * Applies a code during checkout. Returns empty when no code was supplied — an order without a
	 * promotion is normal, so that must not be an error; only a code that was given and is unusable
	 * throws.
	 */
	/**
	 * Áp một mã, và TIÊU một lượt của nó.
	 *
	 * <p>Việc tiêu lượt là một câu UPDATE có điều kiện ở cơ sở dữ liệu, không phải kiểm rồi ghi ở
	 * đây — xem {@link PromotionRepository#ghiNhanMotLuot}. Mã bị chia sẻ ra ngoài thì hai người
	 * bấm cùng lúc là chuyện thường, và một phép kiểm ở tầng Java sẽ cho cả hai cùng qua.
	 *
	 * <p><b>Đánh đổi phải nói rõ:</b> lượt bị tiêu ngay khi ÁP, không phải khi tiền vào. Khách yêu
	 * cầu thanh toán rồi huỷ rồi yêu cầu lại sẽ ăn hai lượt. Chọn hướng này vì nó sai về phía CHẶT
	 * hơn: với một mã đã lọt ra ngoài, tiêu sớm giới hạn thiệt hại, còn tiêu muộn thì trong lúc chờ
	 * vẫn ai cũng dùng được. Muốn chính xác từng lượt thì phải tách thành giữ chỗ rồi chốt, và đó
	 * là một đợt việc riêng.
	 */
	public Optional<Promotion.Discount> tryApply(String promotionCode, BigDecimal subtotal, OffsetDateTime now) {
		if (Promotion.normalizeCode(promotionCode) == null) {
			return Optional.empty();
		}
		PromotionEntity entity = requireByCode(promotionCode);
		Promotion.Discount giamGia = entity.toDomain().applyTo(subtotal, now);

		if (promotionRepository.ghiNhanMotLuot(entity.getId()) == 0) {
			throw ApiException.conflict("PROMOTION_USAGE_EXHAUSTED",
					"Mã khuyến mãi đã hết lượt sử dụng.");
		}
		return Optional.of(giamGia);
	}

	private PromotionEntity requireByCode(String promotionCode) {
		String normalized = Promotion.normalizeCode(promotionCode);
		if (normalized == null) {
			throw ApiException.badRequest("PROMOTION_CODE_REQUIRED", "Promotion code is required.");
		}
		return promotionRepository.findByCode(normalized)
				.orElseThrow(() -> ApiException.notFound("PROMOTION_NOT_FOUND", "Promotion code was not found."));
	}
}
