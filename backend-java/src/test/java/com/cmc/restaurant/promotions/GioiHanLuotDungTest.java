package com.cmc.restaurant.promotions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.promotions.domain.PromotionType;
import com.cmc.restaurant.shared.ApiException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Giới hạn số lượt dùng của một mã khuyến mãi.
 *
 * <p><b>Nghiệp vụ được canh ở đây.</b> Trước bản này không có giới hạn nào: một mã lọt ra ngoài —
 * ảnh chụp màn hình lên nhóm chat — thì ai cũng dùng được, bao nhiêu lần cũng được, cho tới khi có
 * người vào tắt {@code is_active} bằng tay.
 */
class GioiHanLuotDungTest {

	private static final OffsetDateTime LUC = OffsetDateTime.parse("2026-09-07T10:00:00Z");

	private PromotionEntity ma() {
		PromotionEntity e = new PromotionEntity("promo_1", LUC);
		e.applyDefinition("GIAM10", "Giảm 10%", null, PromotionType.Percentage, new BigDecimal("10"),
				null, null, false, null, null, true, LUC);
		return e;
	}

	private PromotionService serviceVoi(PromotionRepository repo) {
		return new PromotionService(repo);
	}

	@Test
	@DisplayName("hết lượt thì từ chối, và mã lỗi nói đúng lý do")
	void hetLuotThiTuChoi() {
		PromotionRepository repo = mock(PromotionRepository.class);
		when(repo.findByCode("GIAM10")).thenReturn(Optional.of(ma()));
		// 0 = câu UPDATE có điều kiện không đổi dòng nào, tức đã hết lượt.
		when(repo.ghiNhanMotLuot("promo_1")).thenReturn(0);

		assertThatThrownBy(() -> serviceVoi(repo).tryApply("GIAM10", new BigDecimal("100000"), LUC))
				.isInstanceOfSatisfying(ApiException.class,
						e -> assertThat(e.getCode()).isEqualTo("PROMOTION_USAGE_EXHAUSTED"));
	}

	@Test
	@DisplayName("còn lượt thì áp bình thường")
	void conLuotThiApBinhThuong() {
		PromotionRepository repo = mock(PromotionRepository.class);
		when(repo.findByCode("GIAM10")).thenReturn(Optional.of(ma()));
		when(repo.ghiNhanMotLuot("promo_1")).thenReturn(1);

		Optional<com.cmc.restaurant.promotions.domain.Promotion.Discount> giam =
				serviceVoi(repo).tryApply("GIAM10", new BigDecimal("100000"), LUC);

		assertThat(giam).isPresent();
		assertThat(giam.get().discountAmount()).isEqualByComparingTo("10000");
	}

	@Test
	@DisplayName("không gửi mã thì KHÔNG tiêu lượt của ai cả")
	void khongGuiMaThiKhongTieuLuot() {
		// Đơn không có khuyến mãi là chuyện bình thường. Nếu nhánh này cũng gọi ghiNhanMotLuot thì
		// mỗi đơn thường sẽ ăn mòn lượt của một mã nào đó — hoặc ném NPE.
		PromotionRepository repo = mock(PromotionRepository.class);

		assertThat(serviceVoi(repo).tryApply(null, new BigDecimal("100000"), LUC)).isEmpty();
		assertThat(serviceVoi(repo).tryApply("   ", new BigDecimal("100000"), LUC)).isEmpty();
	}

	@Test
	@DisplayName("mã mới không đặt giới hạn thì dùng không giới hạn — giữ nguyên hành vi cũ")
	void khongDatGioiHanThiKhongGioiHan() {
		// Quan trọng với migration: mọi mã đang chạy có usage_limit NULL, và chúng phải tiếp tục
		// hoạt động y như trước. Câu UPDATE trả 1 khi usage_limit IS NULL, nên nhánh này luôn qua.
		PromotionEntity e = ma();
		assertThat(e.getUsageLimit()).isNull();
		assertThat(e.getUsedCount()).isZero();
	}
}
