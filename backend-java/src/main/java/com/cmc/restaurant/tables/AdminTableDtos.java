package com.cmc.restaurant.tables;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Hợp đồng của 5 endpoint quản trị bàn (#91).
 *
 * <p>Tên trường lấy từ {@code frontend/packages/shared-types}: danh sách bọc trong
 * {@code {items, total}}, còn tạo/sửa/xoay QR trả về THẲNG một {@code AdminTableResponse} chứ
 * không bọc — đúng như bản .NET.
 */
public final class AdminTableDtos {

	private AdminTableDtos() {
	}

	public record AdminTableResponse(
			String tableCode, String displayName, boolean isActive, String qrToken, String customerPath) {
	}

	public record AdminTableListResponse(List<AdminTableResponse> items, int total) {
	}

	public record CreateTableRequest(String tableCode, String displayName) {
	}

	public record UpdateTableRequest(String displayName, Boolean isActive) {
	}

	/**
	 * @param overdueSince mốc bàn lần đầu quá giờ mà VẪN CÒN tiền chưa thu; {@code null} là bình
	 *     thường. Phiên như vậy không hết hạn nữa mà được gia hạn, nên {@code expiresAt} của nó bị
	 *     đẩy tới liên tục và không nói được gì. Đây là trường để quầy lọc ra bàn cần đi đòi.
	 */
	public record AdminTableSessionSummary(
			String sessionId, String tableCode, String tableDisplayName, String status,
			OffsetDateTime openedAt, OffsetDateTime expiresAt, OffsetDateTime closedAt,
			boolean isExpired, int activeOrderCount, OffsetDateTime overdueSince,
			java.math.BigDecimal unpaidAmount) {
	}

	public record AdminTableSessionListResponse(List<AdminTableSessionSummary> items, int total) {
	}
}
