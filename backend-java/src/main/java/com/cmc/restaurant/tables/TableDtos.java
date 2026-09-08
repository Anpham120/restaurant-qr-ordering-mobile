package com.cmc.restaurant.tables;

import java.time.OffsetDateTime;

/** Mirrors {@code RestaurantQrAiOrdering.Api.Tables.TableContracts} (.NET) — public surface only
 * (admin table management is out of scope for this issue, see PR description). */
public final class TableDtos {

	private TableDtos() {
	}

	/** Phân giải QR — chỉ mã bàn và tên hiển thị, đúng {@code TableQrResponse} của bản .NET (#97). */
	public record TableQrResponse(String tableCode, String displayName) {
	}

	public record TableResponse(String tableCode, String displayName, boolean isActive) {
	}

	public record OpenTableSessionRequest(String qrToken, String tableCode) {
	}

	/** Ghi chú khách nhập khi bấm gọi nhân viên — để trống thì dùng câu mặc định (#96). */
	/**
	 * Đóng phiên bàn. Cả hai trường đều tuỳ chọn — thân request vắng mặt nghĩa là đóng bình thường.
	 *
	 * @param force  ép đóng dù bàn còn tiền chưa thu
	 * @param reason bắt buộc khi {@code force}, và được ghi lại vào {@code table_sessions.close_reason}
	 */
	public record CloseSessionRequest(boolean force, String reason) {
	}

	public record TableAssistanceRequest(String note) {
	}

	public record TableAssistanceResponse(boolean requested, String tableCode) {
	}

	public record TableSessionResponse(
			String sessionId, String orderType, String status, String tableCode, String tableDisplayName,
			OffsetDateTime openedAt, OffsetDateTime expiresAt, OffsetDateTime closedAt, boolean isExpired) {
	}

	public record OpenTableSessionResponse(
			String sessionId, String orderType, String status, String tableCode, String tableDisplayName,
			OffsetDateTime openedAt, OffsetDateTime expiresAt, OffsetDateTime closedAt, boolean isExpired,
			String tableSessionToken, String resumeState) {
	}
}
