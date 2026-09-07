package com.cmc.restaurant.counter;

import com.cmc.restaurant.counter.domain.CounterShift;
import com.cmc.restaurant.counter.domain.CounterShiftStatus;
import com.cmc.restaurant.shared.ApiException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Mirrors {@code CounterShiftEndpoints.cs} (.NET). Cash rules live in {@link CounterShift}. */
@Service
public class CounterService {

	private final CounterShiftRepository shifts;
	private final CounterShiftTransactionRepository transactions;

	public CounterService(CounterShiftRepository shifts, CounterShiftTransactionRepository transactions) {
		this.shifts = shifts;
		this.transactions = transactions;
	}

	public Optional<CounterDtos.ShiftSummaryResponse> current() {
		return shifts.findFirstByStatusOrderByOpenedAtDesc(CounterShiftStatus.Open).map(this::toSummary);
	}

	@Transactional
	public CounterDtos.ShiftSummaryResponse open(CounterDtos.OpenShiftRequest request, String userId) {
		// One drawer, one open shift. Two open shifts would each count the same cash payments, and
		// neither variance would mean anything.
		if (shifts.findFirstByStatusOrderByOpenedAtDesc(CounterShiftStatus.Open).isPresent()) {
			throw ApiException.conflict(
					"COUNTER_SHIFT_ALREADY_OPEN", "Close the current shift before opening a new one.");
		}

		OffsetDateTime now = OffsetDateTime.now();
		CounterShift shift = CounterShift.open(
				"cs_" + UUID.randomUUID().toString().replace("-", ""), userId,
				request == null ? null : request.openingCashBalance(), now);
		return toSummary(shifts.save(new CounterShiftEntity(shift, now)));
	}

	@Transactional
	public CounterDtos.ShiftSummaryResponse close(
			String shiftId, CounterDtos.CloseShiftRequest request, String userId) {
		CounterShiftEntity entity = requireShift(shiftId);
		CounterShift shift = entity.toDomain();
		shift.close(userId, request == null ? null : request.actualCashTotal(),
				request == null ? null : request.closeNote(), OffsetDateTime.now());
		entity.applyFrom(shift);
		return toSummary(shifts.save(entity));
	}

	@Transactional
	public CounterDtos.ShiftSummaryResponse adjust(
			String shiftId, CounterDtos.AdjustmentRequest request, String userId) {
		CounterShiftEntity entity = requireShift(shiftId);
		CounterShift shift = entity.toDomain();
		OffsetDateTime now = OffsetDateTime.now();
		BigDecimal amount = request == null || request.amount() == null ? BigDecimal.ZERO : request.amount();

		shift.recordAdjustment(request == null ? null : request.reasonCode(), amount, now);
		entity.applyFrom(shift);
		shifts.save(entity);

		// Written only after the aggregate accepted the change, so the ledger never holds an entry
		// for an adjustment that was rejected.
		transactions.save(new CounterShiftTransactionEntity(
				"cst_" + UUID.randomUUID().toString().replace("-", ""), shiftId, "Adjustment", amount,
				request.reasonCode().trim(),
				request.note() == null || request.note().isBlank() ? null : request.note().trim(),
				userId, now));
		return toSummary(entity);
	}

	/**
	 * Ghi một khoản tiền mặt từ hoá đơn bàn vào ca quầy đang mở (#96).
	 *
	 * <p>KHÔNG ném khi không có ca nào mở — bản .NET cũng vậy ({@code if (shift is null) return;}).
	 * Lý do: khách đã trả tiền rồi. Chặn việc tất toán chỉ vì quầy quên mở ca sẽ biến một sai sót
	 * hành chính thành lỗi chặn khách ra về. Sổ quỹ lệch thì đối soát cuối ca xử lý được; khách
	 * đứng chờ thì không.
	 */
	@Transactional
	public void recordTableInvoiceCash(
			BigDecimal amount, String tableSessionId, String invoiceCode, String userId) {
		Optional<CounterShiftEntity> open = shifts.findFirstByStatusOrderByOpenedAtDesc(CounterShiftStatus.Open);
		if (open.isEmpty()) {
			return;
		}
		CounterShiftEntity entity = open.get();
		OffsetDateTime now = OffsetDateTime.now();

		CounterShift shift = entity.toDomain();
		shift.recordCashPayment(amount, now);
		entity.applyFrom(shift);
		shifts.save(entity);

		transactions.save(new CounterShiftTransactionEntity(
				"cst_" + UUID.randomUUID().toString().replace("-", ""), entity.getId(), amount,
				"Table invoice " + invoiceCode, userId, now, tableSessionId, invoiceCode));
	}

	/**
	 * Trả tiền mặt ra khỏi két vì một hoá đơn bị hoàn.
	 *
	 * <p>Bắt buộc phải có, không phải tuỳ chọn: {@link #recordTableInvoiceCash} đã CỘNG số tiền đó
	 * vào ca lúc thu. Hoàn tiền mà không trừ lại thì lúc chốt ca hệ thống vẫn chờ số tiền không
	 * còn trong két, và thu ngân thấy một khoản thiếu mình không giải thích được — đúng loại lệch
	 * quỹ mà việc đối chiếu cuối ca sinh ra để phát hiện, nhưng lần này hệ thống là bên sai.
	 *
	 * <p>Dùng {@code recordAdjustment} chứ không phải một số âm của {@code recordCashPayment}: điều
	 * chỉnh BẮT BUỘC có mã lý do, nên khoản trừ này luôn tra lại được nó từ đâu ra.
	 *
	 * <p>Không ném khi chưa mở ca — cùng lý do với chiều thu: tiền đã trả lại cho khách rồi, chặn
	 * việc ghi sổ chỉ vì quầy quên mở ca là biến một sai sót hành chính thành lỗi chặn người dùng.
	 */
	@Transactional
	public void hoanTienMatChoHoaDon(
			BigDecimal amount, String tableSessionId, String invoiceCode, String userId) {
		Optional<CounterShiftEntity> open = shifts.findFirstByStatusOrderByOpenedAtDesc(CounterShiftStatus.Open);
		if (open.isEmpty() || amount == null || amount.signum() <= 0) {
			return;
		}
		CounterShiftEntity entity = open.get();
		OffsetDateTime now = OffsetDateTime.now();

		CounterShift shift = entity.toDomain();
		shift.recordAdjustment("REFUND", amount.negate(), now);
		entity.applyFrom(shift);
		shifts.save(entity);

		// Kiểu "Adjustment", KHÔNG phải "CashPayment": constructor kia đặt cứng CashPayment, và ghi
		// một lần trả tiền ra là một lần thu tiền vào sẽ làm sổ quỹ nói ngược hẳn sự thật.
		transactions.save(new CounterShiftTransactionEntity(
				"cst_" + UUID.randomUUID().toString().replace("-", ""), entity.getId(), "Adjustment",
				amount.negate(), "REFUND", "Hoàn tiền hoá đơn " + invoiceCode, userId, now));
	}

	private CounterShiftEntity requireShift(String shiftId) {
		return shifts.findById(shiftId.trim())
				.orElseThrow(() -> ApiException.notFound("COUNTER_SHIFT_NOT_FOUND", "Counter shift was not found."));
	}

	private CounterDtos.ShiftSummaryResponse toSummary(CounterShiftEntity entity) {
		CounterShift shift = entity.toDomain();
		return new CounterDtos.ShiftSummaryResponse(
				shift.id(), shift.status().name(), shift.openingCashBalance(), shift.expectedCashTotal(),
				shift.actualCashTotal(), shift.cashVariance(), shift.closeNote(),
				entity.getOpenedAt(), shift.closedAt());
	}
}
