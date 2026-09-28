package com.cmc.restaurant.audit;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Immutable record of a money-affecting operation. */
@Entity
@Table(name = "audit_log")
public class AuditLogEntity {

	@Id
	private String id;

	@Column(name = "occurred_at", nullable = false)
	private OffsetDateTime occurredAt;

	@Column(name = "actor_user_id")
	private String actorUserId;

	@Column(name = "actor_role", nullable = false)
	private String actorRole;

	@Column(nullable = false)
	private String action;

	@Column(name = "subject_type", nullable = false)
	private String subjectType;

	@Column(name = "subject_id", nullable = false)
	private String subjectId;

	@Column(name = "table_code")
	private String tableCode;

	private BigDecimal amount;
	private String reason;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "before_data", columnDefinition = "jsonb")
	private JsonNode beforeData;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "after_data", columnDefinition = "jsonb")
	private JsonNode afterData;

	@Column(name = "ip_address")
	private String ipAddress;

	protected AuditLogEntity() {
	}

	public AuditLogEntity(String id, OffsetDateTime occurredAt, String actorUserId, String actorRole,
			String action, String subjectType, String subjectId, String tableCode, BigDecimal amount, String reason,
			JsonNode beforeData, JsonNode afterData, String ipAddress) {
		this.id = id;
		this.occurredAt = occurredAt;
		this.actorUserId = actorUserId;
		this.actorRole = actorRole;
		this.action = action;
		this.subjectType = subjectType;
		this.subjectId = subjectId;
		this.tableCode = tableCode;
		this.amount = amount;
		this.reason = reason;
		this.beforeData = beforeData;
		this.afterData = afterData;
		this.ipAddress = ipAddress;
	}

	public String getId() { return id; }
	public OffsetDateTime getOccurredAt() { return occurredAt; }
	public String getActorUserId() { return actorUserId; }
	public String getActorRole() { return actorRole; }
	public String getAction() { return action; }
	public String getSubjectType() { return subjectType; }
	public String getSubjectId() { return subjectId; }
	public String getTableCode() { return tableCode; }
	public BigDecimal getAmount() { return amount; }
	public String getReason() { return reason; }
	public JsonNode getBeforeData() { return beforeData; }
	public JsonNode getAfterData() { return afterData; }
}
