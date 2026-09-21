package com.cmc.restaurant.audit;

import java.time.OffsetDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-log")
@PreAuthorize("hasRole('Admin')")
public class AuditLogController {

	private final AuditLogService auditLogService;

	public AuditLogController(AuditLogService auditLogService) { this.auditLogService = auditLogService; }

	@GetMapping
	public AuditDtos.AuditLogListResponse find(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
			@RequestParam(required = false) String actorUserId,
			@RequestParam(required = false) String tableCode,
			@RequestParam(required = false) String action) {
		return auditLogService.find(from, to, actorUserId, tableCode, action);
	}

	@GetMapping("/self-loyalty-report")
	public java.util.List<AuditDtos.SelfLoyaltyAccrualReportResponse> selfLoyaltyReport(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
		return auditLogService.selfLoyaltyReport(from, to);
	}
}
