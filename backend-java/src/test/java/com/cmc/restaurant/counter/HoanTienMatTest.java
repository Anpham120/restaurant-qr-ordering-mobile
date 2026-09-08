package com.cmc.restaurant.counter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.counter.domain.CounterShift;
import com.cmc.restaurant.counter.domain.CounterShiftStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Hoàn tiền mặt phải TRỪ quỹ ca, không phải cộng.
 *
 * <p><b>Vì sao có phép kiểm này.</b> {@code recordTableInvoiceCash} đã cộng số tiền vào ca lúc
 * thu. Nếu đường hoàn tiền quên dấu trừ, quỹ ca bị cộng thêm một lần nữa — và lúc chốt ca hệ
 * thống chờ số tiền GẤP ĐÔI khoản thực có. Thu ngân thấy một khoản thiếu rất lớn mà mình không
 * giải thích được, còn việc đối chiếu cuối ca thì được sinh ra để phát hiện lệch quỹ, nên nó sẽ
 * đổ lỗi cho người chứ không cho hệ thống.
 *
 * <p>Một ký tự `.negate()` là toàn bộ khác biệt giữa hai kết quả đó.
 */
class HoanTienMatTest {
	private final CounterShiftRepository shifts = mock(CounterShiftRepository.class);
	private final CounterShiftTransactionRepository transactions =
			mock(CounterShiftTransactionRepository.class);
	private CounterService service;
	private CounterShiftEntity ca;

	@BeforeEach
	void setup() {
		service = new CounterService(shifts, transactions);
		OffsetDateTime luc = OffsetDateTime.now();
		ca = new CounterShiftEntity(new CounterShift("cs_1", "u_1", CounterShiftStatus.Open,
				new BigDecimal("500000"), new BigDecimal("500000"), null, null, null, null, null, luc), luc);
		when(shifts.findFirstByStatusOrderByOpenedAtDesc(CounterShiftStatus.Open))
				.thenReturn(Optional.of(ca));
		when(shifts.save(any())).thenAnswer(i -> i.getArgument(0));
	}

	@Test
	@DisplayName("hoàn tiền LÀM GIẢM số tiền ca đang chờ")
	void hoanTienLamGiamQuy() {
		service.recordTableInvoiceCash(new BigDecimal("300000"), "ts_1", "INV-1", "u_1");
		BigDecimal sauKhiThu = ca.toDomain().expectedCashTotal();

		service.hoanTienMatChoHoaDon(new BigDecimal("300000"), "ts_1", "INV-1", "u_1");

		assertThat(ca.toDomain().expectedCashTotal()).isLessThan(sauKhiThu);
		// Thu 300k rồi hoàn 300k phải về đúng chỗ cũ — không dư, không thiếu.
		assertThat(ca.toDomain().expectedCashTotal()).isEqualByComparingTo(new BigDecimal("500000"));
	}

	@Test
	@DisplayName("chưa mở ca thì bỏ qua, KHÔNG ném lỗi")
	void chuaMoCaThiBoQua() {
		// Cùng lý do với chiều thu: tiền đã trả lại cho khách rồi. Chặn việc ghi sổ chỉ vì quầy
		// quên mở ca là biến một sai sót hành chính thành lỗi chặn người dùng.
		when(shifts.findFirstByStatusOrderByOpenedAtDesc(CounterShiftStatus.Open))
				.thenReturn(Optional.empty());

		service.hoanTienMatChoHoaDon(new BigDecimal("300000"), "ts_1", "INV-1", "u_1");

		verify(transactions, never()).save(any());
	}

	@Test
	@DisplayName("số tiền không hợp lệ thì không đụng vào quỹ")
	void soTienKhongHopLeThiKhongDungQuy() {
		BigDecimal truoc = ca.toDomain().expectedCashTotal();

		service.hoanTienMatChoHoaDon(null, "ts_1", "INV-1", "u_1");
		service.hoanTienMatChoHoaDon(BigDecimal.ZERO, "ts_1", "INV-1", "u_1");
		service.hoanTienMatChoHoaDon(new BigDecimal("-1000"), "ts_1", "INV-1", "u_1");

		assertThat(ca.toDomain().expectedCashTotal()).isEqualByComparingTo(truoc);
		verify(transactions, never()).save(any());
	}
}
