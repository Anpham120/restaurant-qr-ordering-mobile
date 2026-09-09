package com.cmc.restaurant.orders.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * A line of an order. Part of the {@link Order} aggregate — never loaded or changed on its own,
 * which is why every mutator here is package-private: the only way to move an item is through the
 * aggregate root, so the order-level invariants cannot be bypassed.
 */
public class OrderItem {

	private final String id;
	private final String menuItemId;
	private final String menuItemName;
	private final BigDecimal unitPrice;
	private final int quantity;
	private OrderItemStatus status;
	private OffsetDateTime updatedAt;
	private OffsetDateTime readyAt;

	/**
	 * Trạng thái ngay TRƯỚC khi món bị huỷ, hoặc {@code null} nếu món không bị huỷ.
	 *
	 * <p>Chỉ có hai giá trị có thể xảy ra, và đó là do {@link #canTransitionTo} quy định chứ không
	 * phải do chọn: huỷ chỉ hợp lệ từ {@code Pending} hoặc {@code Preparing}. Huỷ một món đã
	 * {@code Ready} hay {@code Served} bị máy trạng thái từ chối.
	 *
	 * <p>Đây là toàn bộ tín hiệu hao hụt mà hệ thống có: {@code Preparing -> Cancelled} là bếp đã
	 * bắt tay vào và nguyên liệu đã mất; {@code Pending -> Cancelled} thì chưa ai động tới.
	 */
	private OrderItemStatus cancelledFromStatus;

	public OrderItem(
			String id, String menuItemId, String menuItemName, BigDecimal unitPrice, int quantity,
			OrderItemStatus status, OffsetDateTime updatedAt, OffsetDateTime readyAt,
			OrderItemStatus cancelledFromStatus) {
		this.id = id;
		this.menuItemId = menuItemId;
		this.menuItemName = menuItemName;
		this.unitPrice = unitPrice;
		this.quantity = quantity;
		this.status = status;
		this.updatedAt = updatedAt;
		this.readyAt = readyAt;
		this.cancelledFromStatus = cancelledFromStatus;
	}

	/** A brand-new line, always {@code Pending}. */
	public static OrderItem create(
			String id, String menuItemId, String menuItemName, BigDecimal unitPrice, int quantity,
			OffsetDateTime now) {
		return new OrderItem(
				id, menuItemId, menuItemName, unitPrice, quantity, OrderItemStatus.Pending, now, null, null);
	}

	/**
	 * Items move forward only; skips such as {@code Pending -> Ready} are allowed because a fast
	 * kitchen legitimately finishes a dish without anyone marking it as started. Backward moves,
	 * no-ops, and any change out of a terminal state are rejected.
	 */
	boolean canTransitionTo(OrderItemStatus next) {
		if (next == OrderItemStatus.Cancelled) {
			return status == OrderItemStatus.Pending || status == OrderItemStatus.Preparing;
		}
		return switch (status) {
			case Pending -> next == OrderItemStatus.Preparing || next == OrderItemStatus.Ready
					|| next == OrderItemStatus.Served;
			case Preparing -> next == OrderItemStatus.Ready || next == OrderItemStatus.Served;
			case Ready -> next == OrderItemStatus.Served;
			default -> false;
		};
	}

	void moveTo(OrderItemStatus next, OffsetDateTime now) {
		// Ghi trạng thái cũ TRƯỚC khi ghi đè nó. Đây là chỗ duy nhất biết được món đang ở đâu lúc
		// bị huỷ — sau dòng dưới thì thông tin đó không còn ở đâu cả.
		if (next == OrderItemStatus.Cancelled) {
			this.cancelledFromStatus = this.status;
		}
		this.status = next;
		this.updatedAt = now;
		// Recorded once, on the first transition into Ready. Not overwritten by the later move to
		// Served, so `readyAt - createdAt` stays a real "time to ready" sample (hạn chế #10).
		if (next == OrderItemStatus.Ready && readyAt == null) {
			this.readyAt = now;
		}
	}

	public String id() {
		return id;
	}

	public String menuItemId() {
		return menuItemId;
	}

	public String menuItemName() {
		return menuItemName;
	}

	public BigDecimal unitPrice() {
		return unitPrice;
	}

	public int quantity() {
		return quantity;
	}

	public OrderItemStatus status() {
		return status;
	}

	public OffsetDateTime updatedAt() {
		return updatedAt;
	}

	/**
	 * {@code Preparing} nghĩa là bếp đã bắt tay vào — nguyên liệu mất. {@code Pending} thì không.
	 * {@code null} nghĩa là món không bị huỷ, HOẶC bị huỷ trước migration V33 nên không ai biết.
	 * Hai nghĩa đó khác nhau, và báo cáo phải đếm riêng thay vì gộp cho gọn.
	 */
	public OrderItemStatus cancelledFromStatus() {
		return cancelledFromStatus;
	}

	public OffsetDateTime readyAt() {
		return readyAt;
	}

	public BigDecimal lineTotal() {
		return unitPrice.multiply(BigDecimal.valueOf(quantity));
	}

	public boolean isActive() {
		return status != OrderItemStatus.Cancelled;
	}
}
