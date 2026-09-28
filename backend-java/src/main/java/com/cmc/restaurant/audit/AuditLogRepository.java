package com.cmc.restaurant.audit;

import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, String>, JpaSpecificationExecutor<AuditLogEntity> {
	long deleteByOccurredAtBefore(OffsetDateTime cutoff);
}
