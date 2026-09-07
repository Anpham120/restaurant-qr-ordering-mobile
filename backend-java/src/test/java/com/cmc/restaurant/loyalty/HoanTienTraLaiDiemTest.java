package com.cmc.restaurant.loyalty;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Hoàn tiền phải trả lại cả ĐIỂM lẫn CHI TIÊU xét hạng.
 *
 * <p><b>Nghiệp vụ được canh ở đây.</b> Trước bản này: khách trả tiền thì cộng điểm, quầy hoàn tiền
 * thì chỉ đổi trạng thái thanh toán — dòng ACCRUE nằm nguyên. Tác vụ xét hạng hằng tháng tính lại
 * {@code spend_12m} TỪ SỔ, nên nó không những không sửa mà còn xác nhận lại con số sai mỗi kỳ.
 * Khách lên hạng bằng tiền chưa từng trả.
 *
 * <p>Phép kiểm ở mức dòng sổ vì đó là nơi sai lệch sống: số dư có thể sửa tay, sổ thì không.
 */
class HoanTienTraLaiDiemTest {

	private static final OffsetDateTime LUC = OffsetDateTime.parse("2026-09-07T10:00:00Z");

	@Test
	@DisplayName("dòng hoàn tiền đảo ĐÚNG số điểm và ĐÚNG số tiền của dòng tích")
	void daoDungDiemVaDungTien() {
		LoyaltyLedgerEntity tich = LoyaltyLedgerEntity.tich(
				"lgr_1", "loy_1", 41, new BigDecimal("330000"), "ORD-1", LUC);

		LoyaltyLedgerEntity hoan = LoyaltyLedgerEntity.hoanTien(
				"lgr_2", "loy_1", tich.getDelta(), tich.getAmountVnd(), "ORD-1", LUC.plusHours(1));

		// Tổng hai dòng bằng 0 ở CẢ HAI trục. Đó là toàn bộ ý tưởng: truy vấn xếp hạng chỉ cần
		// cộng thêm REFUND vào là tự đúng, không cần biết trừ ở đâu.
		assertThat(tich.getDelta() + hoan.getDelta()).isZero();
		assertThat(tich.getAmountVnd().add(hoan.getAmountVnd())).isEqualByComparingTo("0");

		assertThat(hoan.getReason()).isEqualTo("REFUND");
		assertThat(hoan.getAmountVnd()).isEqualByComparingTo("-330000");
	}

	@Test
	@DisplayName("số tiền của dòng hoàn LUÔN âm, dù truyền vào dương hay âm")
	void soTienLuonAm() {
		// Ràng buộc ck_loyalty_ledger_amount của V31 đòi REFUND phải <= 0. Một dấu sai ở đây là
		// migration ném lỗi lúc chạy thật chứ không phải lúc build.
		for (BigDecimal vao : new BigDecimal[] {new BigDecimal("330000"), new BigDecimal("-330000")}) {
			LoyaltyLedgerEntity hoan =
					LoyaltyLedgerEntity.hoanTien("lgr_x", "loy_1", 41, vao, "ORD-1", LUC);
			assertThat(hoan.getAmountVnd()).isEqualByComparingTo("-330000");
			assertThat(hoan.getDelta()).isNegative();
		}
	}

	@Test
	@DisplayName("dòng tích GHI mã chứng từ — không có nó thì không tra ngược được")
	void dongTichGhiMaChungTu() {
		// Đây là lý do bản sửa này cần một thay đổi ở chiều CỘNG, không chỉ chiều trừ. Trước đây
		// ACCRUE không ghi gì, nên lúc hoàn tiền không có cách nào biết đảo dòng nào.
		LoyaltyLedgerEntity tich = LoyaltyLedgerEntity.tich(
				"lgr_1", "loy_1", 33, new BigDecimal("330000"), "INV-9", LUC);

		assertThat(tich.getReason()).isEqualTo("ACCRUE");
		assertThat(tich.getAmountVnd()).isEqualByComparingTo("330000");
	}

	@Test
	@DisplayName("đảo theo dòng đã ghi, KHÔNG tính lại từ số tiền")
	void daoTheoDongDaGhiChuKhongTinhLai() {
		// Hệ số tích phụ thuộc HẠNG lúc tích: cùng 330.000đ, hạng Bạc cho 33 điểm còn hạng Vàng
		// cho 41. Nếu lúc hoàn tiền mới tính lại từ số tiền, khách đã lên hạng trong thời gian đó
		// sẽ bị trừ 41 trong khi chỉ được cộng 33 — sổ lệch 8 điểm, im lặng.
		LoyaltyLedgerEntity tichHangBac = LoyaltyLedgerEntity.tich(
				"lgr_1", "loy_1", 33, new BigDecimal("330000"), "ORD-1", LUC);

		LoyaltyLedgerEntity hoan = LoyaltyLedgerEntity.hoanTien("lgr_2", "loy_1",
				tichHangBac.getDelta(), tichHangBac.getAmountVnd(), "ORD-1", LUC.plusMonths(3));

		assertThat(hoan.getDelta()).isEqualTo(-33);
	}
}
