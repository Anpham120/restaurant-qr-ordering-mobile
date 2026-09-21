package com.cmc.restaurant.audit;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class AuditDtos {
	private AuditDtos() {
	}

	public record AuditLogResponse(String id, OffsetDateTime occurredAt, String actorUserId,
			String actorName, String actorRole, String action, String subjectType, String subjectId, String tableCode,
			BigDecimal amount, String reason, JsonNode beforeData, JsonNode afterData) {
	}

	public record AuditLogListResponse(List<AuditLogResponse> items, int total) {
	}

	public record SelfLoyaltyAccrualReportResponse(String month, String actorUserId, String actorName,
			int occurrenceCount, BigDecimal totalAmount, int totalPoints) {
	}
}
