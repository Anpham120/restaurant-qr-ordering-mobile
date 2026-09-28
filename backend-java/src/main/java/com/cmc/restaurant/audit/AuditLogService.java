package com.cmc.restaurant.audit;

import com.cmc.restaurant.auth.UserEntity;
import com.cmc.restaurant.auth.UserRepository;
import com.cmc.restaurant.shared.ActorContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** One append-only ledger for staff actions that can affect money or explain a discrepancy. */
@Service
public class AuditLogService {

	private final AuditLogRepository logs;
	private final UserRepository users;
	private final ObjectMapper json;

	public AuditLogService(AuditLogRepository logs, UserRepository users, ObjectMapper json) {
		this.logs = logs;
		this.users = users;
		this.json = json;
	}

	public void record(ActorContext actor, String action, String subjectType, String subjectId,
			BigDecimal amount, String reason, Object before, Object after) {
		record(actor, action, subjectType, subjectId, null, amount, reason, before, after);
	}

	public void record(ActorContext actor, String action, String subjectType, String subjectId,
			String tableCode, BigDecimal amount, String reason, Object before, Object after) {
		ActorContext effectiveActor = actor == null ? new ActorContext(null, "System") : actor;
		logs.save(new AuditLogEntity("aud_" + UUID.randomUUID().toString().replace("-", ""),
				OffsetDateTime.now(), effectiveActor.userId(), effectiveActor.role(), action, subjectType,
				subjectId, normalizeTableCode(tableCode), amount, trim(reason), asJson(before), asJson(after), requestIp()));
	}

	@Transactional(readOnly = true)
	public AuditDtos.AuditLogListResponse find(OffsetDateTime from, OffsetDateTime to, String actorUserId,
			String tableCode, String action) {
		Specification<AuditLogEntity> spec = Specification.where(null);
		if (from != null) spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
		if (to != null) spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("occurredAt"), to));
		if (hasText(actorUserId)) spec = spec.and((root, query, cb) -> cb.equal(root.get("actorUserId"), actorUserId.trim()));
		if (hasText(tableCode)) spec = spec.and((root, query, cb) -> cb.equal(root.get("tableCode"), normalizeTableCode(tableCode)));
		if (hasText(action)) spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), action.trim()));
		var entries = logs.findAll(spec, Sort.by(Sort.Direction.DESC, "occurredAt"));
		Map<String, String> names = users.findAllById(entries.stream().map(AuditLogEntity::getActorUserId)
				.filter(java.util.Objects::nonNull).toList()).stream()
				.collect(java.util.stream.Collectors.toMap(UserEntity::getId, UserEntity::getFullName));
		return new AuditDtos.AuditLogListResponse(entries.stream().map(entry -> toResponse(entry, names)).toList(), entries.size());
	}

	@Transactional(readOnly = true)
	public java.util.List<AuditDtos.SelfLoyaltyAccrualReportResponse> selfLoyaltyReport(
			OffsetDateTime from, OffsetDateTime to) {
		Specification<AuditLogEntity> spec = Specification.where((root, query, cb) ->
				cb.equal(root.get("action"), "STAFF_SELF_LOYALTY_ACCRUAL"));
		if (from != null) spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
		if (to != null) spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("occurredAt"), to));
		var entries = logs.findAll(spec, Sort.by(Sort.Direction.DESC, "occurredAt"));
		Map<String, String> names = users.findAllById(entries.stream().map(AuditLogEntity::getActorUserId)
				.filter(java.util.Objects::nonNull).toList()).stream()
				.collect(java.util.stream.Collectors.toMap(UserEntity::getId, UserEntity::getFullName));
		Map<ReportKey, ReportTotal> grouped = new LinkedHashMap<>();
		for (AuditLogEntity entry : entries) {
			ReportKey key = new ReportKey(YearMonth.from(entry.getOccurredAt().atZoneSameInstant(ZoneOffset.ofHours(7))),
					entry.getActorUserId());
			ReportTotal total = grouped.computeIfAbsent(key, unused -> new ReportTotal());
			total.count++;
			total.amount = total.amount.add(entry.getAmount() == null ? BigDecimal.ZERO : entry.getAmount());
			total.points += entry.getAfterData() == null ? 0 : entry.getAfterData().path("points").asInt(0);
		}
		return grouped.entrySet().stream().map(entry -> new AuditDtos.SelfLoyaltyAccrualReportResponse(
				entry.getKey().month().toString(), entry.getKey().actorUserId(),
				names.get(entry.getKey().actorUserId()), entry.getValue().count, entry.getValue().amount,
				entry.getValue().points)).toList();
	}

	private AuditDtos.AuditLogResponse toResponse(AuditLogEntity entry, Map<String, String> names) {
		return new AuditDtos.AuditLogResponse(entry.getId(), entry.getOccurredAt(), entry.getActorUserId(),
			names.get(entry.getActorUserId()), entry.getActorRole(), entry.getAction(), entry.getSubjectType(),
			entry.getSubjectId(), entry.getTableCode(), entry.getAmount(), entry.getReason(), entry.getBeforeData(), entry.getAfterData());
	}

	private JsonNode asJson(Object value) { return value == null ? null : json.valueToTree(value); }
	private static boolean hasText(String value) { return value != null && !value.isBlank(); }
	private static String normalizeTableCode(String value) {
		return hasText(value) ? value.trim().toUpperCase(java.util.Locale.ROOT) : null;
	}
	private static String trim(String value) { return hasText(value) ? value.trim() : null; }
	private static String requestIp() {
		var attributes = RequestContextHolder.getRequestAttributes();
		if (!(attributes instanceof ServletRequestAttributes servlet)) return null;
		HttpServletRequest request = servlet.getRequest();
		String forwarded = request.getHeader("X-Forwarded-For");
		return hasText(forwarded) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
	}

	private record ReportKey(YearMonth month, String actorUserId) {
	}

	private static final class ReportTotal {
		private int count;
		private BigDecimal amount = BigDecimal.ZERO;
		private int points;
	}
}
