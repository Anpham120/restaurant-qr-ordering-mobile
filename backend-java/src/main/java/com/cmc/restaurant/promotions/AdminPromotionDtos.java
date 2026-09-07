package com.cmc.restaurant.promotions;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Hợp đồng của 5 endpoint quản trị khuyến mãi (#93).
 *
 * <p>Tên trường theo {@code frontend/packages/shared-types}: khoá chính ra ngoài là
 * {@code promotionId} chứ không phải {@code id}.
 */
public final class AdminPromotionDtos {

	private AdminPromotionDtos() {
	}

	/**
	 * @param usageLimit số lượt tối đa; {@code null} = không giới hạn, và đó là hành vi cũ nên mã
	 *     đang chạy không đổi cách hoạt động.
	 */
	public record PromotionRequest(
			String code, String name, String description, String type, BigDecimal discountValue,
			BigDecimal minOrderAmount, BigDecimal maxDiscountAmount, Boolean isFlashSale,
			OffsetDateTime startsAt, OffsetDateTime endsAt, Boolean isActive, Integer usageLimit) {
	}

	public record PromotionResponse(
			String promotionId, String code, String name, String description, String type,
			BigDecimal discountValue, BigDecimal minOrderAmount, BigDecimal maxDiscountAmount,
			boolean isFlashSale, OffsetDateTime startsAt, OffsetDateTime endsAt, boolean isActive,
			OffsetDateTime createdAt, OffsetDateTime updatedAt, Integer usageLimit, int usedCount) {
	}
}
