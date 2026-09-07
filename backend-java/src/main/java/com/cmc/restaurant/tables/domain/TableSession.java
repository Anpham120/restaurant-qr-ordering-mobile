package com.cmc.restaurant.tables.domain;

import com.cmc.restaurant.tables.TableSessionStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

/**
 * The table-session aggregate: the QR "sitting at a table" lifecycle, and the resume state a
 * returning customer lands in (invariants V51–V52).
 *
 * <p>Given the hexagonal split at Orders (issue #61) the same question was asked of every module in
 * issue #62, and answered with counts rather than uniformly. Tables earned a domain model — 25
 * rule-bearing lines, a five-way resume-state machine, expiry, and a one-open-session-per-table
 * constraint. Menu (6 rules, all field validation) and Auth (2) did not; see the PR for that call.
 *
 * <p>As with {@code Order}, nothing here imports Spring, JPA or HTTP, so the lifecycle and the
 * resume rules are testable with {@code new TableSession(...)} alone.
 */
public class TableSession {

	/** An order that still keeps the table "in progress". Mirrors the .NET resolver exactly. */
	private static final Set<String> IN_PROGRESS_ORDER_STATUSES =
			Set.of("Draft", "Placed", "Confirmed", "Preparing", "Ready");

	/**
	 * Gia hạn mỗi lần chạm vào một phiên quá giờ mà còn nợ tiền.
	 *
	 * <p>Một giờ, và nó lặp lại: chừng nào bàn còn nợ thì phiên còn sống. Đó là chủ đích — hạn 4
	 * giờ sinh ra để dọn bàn khách đã đi mà không gọi món, không phải để cắt đường trả tiền của
	 * bàn đang ăn dở.
	 */
	private static final java.time.Duration GIA_HAN_KHI_CON_NO = java.time.Duration.ofHours(1);

	private final String id;
	private final String restaurantTableId;
	private final String tableCode;
	private OffsetDateTime expiresAt;
	private TableSessionStatus status;
	private OffsetDateTime closedAt;
	private OffsetDateTime updatedAt;
	private OffsetDateTime overdueSince;

	public TableSession(
			String id, String restaurantTableId, String tableCode, TableSessionStatus status,
			OffsetDateTime expiresAt, OffsetDateTime closedAt, OffsetDateTime updatedAt) {
		this(id, restaurantTableId, tableCode, status, expiresAt, closedAt, updatedAt, null);
	}

	public TableSession(
			String id, String restaurantTableId, String tableCode, TableSessionStatus status,
			OffsetDateTime expiresAt, OffsetDateTime closedAt, OffsetDateTime updatedAt,
			OffsetDateTime overdueSince) {
		this.id = id;
		this.restaurantTableId = restaurantTableId;
		this.tableCode = tableCode;
		this.status = status;
		this.expiresAt = expiresAt;
		this.closedAt = closedAt;
		this.updatedAt = updatedAt;
		this.overdueSince = overdueSince;
	}

	// --- lifecycle ---------------------------------------------------------------------------

	/** Usable right now: still open, not closed, not past its expiry. */
	public boolean isActiveAt(OffsetDateTime now) {
		return status == TableSessionStatus.Open && closedAt == null && expiresAt.isAfter(now);
	}

	/**
	 * Past its expiry, whether or not anyone has written that down yet. Deliberately separate from
	 * {@link #isActiveAt}: a session whose row still says {@code Open} but whose {@code expiresAt}
	 * has passed is already expired in every sense that matters to the customer, and answering
	 * "still open" because a sweeper has not run yet would be wrong.
	 */
	public boolean isExpiredAt(OffsetDateTime now) {
		return status == TableSessionStatus.Expired
				|| (status == TableSessionStatus.Open && !expiresAt.isAfter(now));
	}

	/**
	 * Ghi lại việc hết hạn — TRỪ KHI bàn còn tiền chưa thu.
	 *
	 * <p><b>Nghiệp vụ được canh ở đây, và nó là chỗ mất tiền.</b> Trước bản này, một bàn ngồi quá
	 * 4 giờ bị chuyển {@code Expired} bất kể đã trả tiền hay chưa. Sau đó khách mở điện thoại ra
	 * trả thì nhận 410, quét lại QR thì hệ thống mở phiên MỚI với hoá đơn 0đ — còn toàn bộ món đã
	 * ăn nằm lại phiên cũ. Không hoá đơn nào được lập, nên danh sách chờ thu của quầy trống, và
	 * trung tâm điều hành thì lọc thẳng phiên hết hạn ra khỏi màn hình. Món đã ăn, không ai được
	 * hỏi tiền, và không màn hình nào hiện việc đó.
	 *
	 * <p>Nay bàn còn nợ thì được GIA HẠN thay vì đóng. Chọn cách này thay vì thêm một trạng thái
	 * mới vì nó không đụng tới bất kỳ nơi nào khác: mọi đường đi đều đã hỏi {@code isActiveAt}, và
	 * gia hạn làm câu trả lời đó đúng trở lại. Thêm trạng thái thứ tư sẽ bắt từng nơi phải học nó.
	 *
	 * @param conNoTien bàn còn tiền chưa thu — xem
	 *     {@link TableSessionResumeState#conNoTien()}. Là tham số bắt buộc chứ không phải mặc định,
	 *     để không ai gọi được hàm này mà chưa trả lời câu hỏi đó.
	 * @return có gì đó đổi và cần lưu — ĐÚNG cho cả hai nhánh, hết hạn lẫn gia hạn
	 */
	public boolean expireIfPast(OffsetDateTime now, boolean conNoTien) {
		if (!isExpiredAt(now) || status != TableSessionStatus.Open) {
			return false;
		}
		if (conNoTien) {
			// Ghi mốc quá giờ GỐC đúng một lần: `expiresAt` từ đây sẽ bị đẩy tới liên tục, nên nó
			// không còn trả lời được "bàn này quá giờ từ bao giờ" nữa.
			if (overdueSince == null) {
				overdueSince = expiresAt;
			}
			expiresAt = now.plus(GIA_HAN_KHI_CON_NO);
			updatedAt = now;
			return true;
		}
		status = TableSessionStatus.Expired;
		closedAt = now;
		updatedAt = now;
		return true;
	}

	public OffsetDateTime overdueSince() {
		return overdueSince;
	}

	/**
	 * Mốc bàn quá giờ mà vẫn còn tiền chưa thu, hoặc {@code null} khi không phải.
	 *
	 * <p><b>Vì sao SUY LÚC ĐỌC chứ không chỉ đọc cột đã ghi.</b> {@code overdueSince} được đặt
	 * trong {@link #expireIfPast}, mà hàm đó chỉ chạy khi có ai CHẠM vào phiên — mở phiên mới cho
	 * bàn đó, khách mở lại app, bấm gọi nhân viên. Bàn không ai chạm thì không bao giờ được đánh
	 * dấu, và đó chính là bàn cần chú ý nhất: bàn khách đã bỏ đi.
	 *
	 * <p>Đo được trên cơ sở dữ liệu thật: 3 phiên đang mở và đã quá hạn, 0 phiên có
	 * {@code overdue_since}. Danh sách "bàn quá giờ" khi đó hiện RỖNG trong khi có ba bàn cần đòi
	 * tiền — một cái đèn báo chỉ sáng khi có người đi ngang qua nó.
	 *
	 * <p>Cột đã ghi vẫn được ưu tiên khi có, vì nó giữ hạn GỐC — thứ mà {@code expiresAt} không
	 * còn nói được sau khi bị gia hạn nhiều lần.
	 */
	public OffsetDateTime mocQuaGio(OffsetDateTime now, boolean conNoTien) {
		if (overdueSince != null) {
			return overdueSince;
		}
		if (status == TableSessionStatus.Open && !expiresAt.isAfter(now) && conNoTien) {
			return expiresAt;
		}
		return null;
	}

	/** Staff closing the table. Closing an already-closed session is a no-op rather than an error:
	 * two staff pressing the same button must not produce a failure for the second one. */
	public boolean close(OffsetDateTime now) {
		if (status != TableSessionStatus.Open) {
			return false;
		}
		status = TableSessionStatus.Closed;
		closedAt = now;
		updatedAt = now;
		return true;
	}

	public void touch(OffsetDateTime now) {
		updatedAt = now;
	}

	// --- resume state (V51-V52) ---------------------------------------------------------------

	/**
	 * Where a customer who re-scans the QR should land. Ported from
	 * {@code TableSessionResumeStateResolver.Resolve} (.NET).
	 *
	 * <p>Order matters and is not arbitrary: a settled invoice wins over anything still in the
	 * cart, and a payment in progress wins over order state, because sending a customer back to
	 * "add more dishes" while their payment is pending is how a table ends up paying twice.
	 */
	public static TableSessionResumeState resolveResumeState(
			long cartItemCount, List<String> orderStatuses, String invoiceStatus) {
		if ("Paid".equals(invoiceStatus) || "Confirmed".equals(invoiceStatus)) {
			return TableSessionResumeState.Paid;
		}
		if ("Pending".equals(invoiceStatus)) {
			return TableSessionResumeState.PaymentPending;
		}

		List<String> activeOrders = orderStatuses.stream().filter(s -> !"Cancelled".equals(s)).toList();
		if (activeOrders.isEmpty()) {
			return cartItemCount > 0 ? TableSessionResumeState.CartPending : TableSessionResumeState.New;
		}
		return activeOrders.stream().anyMatch(IN_PROGRESS_ORDER_STATUSES::contains)
				? TableSessionResumeState.OrderInProgress
				: TableSessionResumeState.ReadyForPayment;
	}

	// --- state -------------------------------------------------------------------------------

	public String id() {
		return id;
	}

	public String restaurantTableId() {
		return restaurantTableId;
	}

	public String tableCode() {
		return tableCode;
	}

	public TableSessionStatus status() {
		return status;
	}

	public OffsetDateTime expiresAt() {
		return expiresAt;
	}

	public OffsetDateTime closedAt() {
		return closedAt;
	}

	public OffsetDateTime updatedAt() {
		return updatedAt;
	}
}
