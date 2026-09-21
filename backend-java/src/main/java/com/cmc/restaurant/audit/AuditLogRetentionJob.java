package com.cmc.restaurant.audit;

import java.time.OffsetDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Keeps the audit ledger bounded until the owner replaces the provisional 24-month policy. */
@Component
public class AuditLogRetentionJob {

	private final AuditLogRepository logs;
	private final int retentionMonths;

	public AuditLogRetentionJob(AuditLogRepository logs,
			@Value("${audit-log.retention-months:24}") int retentionMonths) {
		this.logs = logs;
		this.retentionMonths = retentionMonths;
	}

	@Scheduled(cron = "0 30 3 * * *", zone = "Asia/Ho_Chi_Minh")
	@Transactional
	public void purgeExpired() {
		if (retentionMonths <= 0) {
			return;
		}
		logs.deleteByOccurredAtBefore(OffsetDateTime.now().minusMonths(retentionMonths));
	}
}
