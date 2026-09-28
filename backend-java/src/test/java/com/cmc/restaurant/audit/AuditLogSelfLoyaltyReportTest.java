package com.cmc.restaurant.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.auth.UserEntity;
import com.cmc.restaurant.auth.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class AuditLogSelfLoyaltyReportTest {

	@Test
	void groupsTodaySelfAccrualByStaffWithMoneyAndExactPoints() {
		OffsetDateTime now = OffsetDateTime.parse("2026-09-20T10:00:00+07:00");
		ObjectMapper json = new ObjectMapper();
		AuditLogRepository logs = mock(AuditLogRepository.class);
		UserRepository users = mock(UserRepository.class);
		AuditLogEntity entry = new AuditLogEntity("aud_1", now, "u_counter", "CounterStaff",
				"STAFF_SELF_LOYALTY_ACCRUAL", "TableSession", "ts_1", "T12",
				new BigDecimal("120000"), null, null,
				json.valueToTree(java.util.Map.of("points", 12)), "127.0.0.1");
		when(logs.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(Sort.class)))
				.thenReturn(List.of(entry));
		UserEntity staff = new UserEntity("u_counter", "counter@example.test", "Quầy A", "hash",
				"CounterStaff", now);
		when(users.findAllById(List.of("u_counter"))).thenReturn(List.of(staff));

		AuditLogService service = new AuditLogService(logs, users, json);

		var report = service.selfLoyaltyReport(now.toLocalDate().atStartOfDay().atOffset(now.getOffset()),
				now.toLocalDate().plusDays(1).atStartOfDay().atOffset(now.getOffset()));

		assertThat(report).singleElement().satisfies(row -> {
			assertThat(row.actorName()).isEqualTo("Quầy A");
			assertThat(row.occurrenceCount()).isEqualTo(1);
			assertThat(row.totalAmount()).isEqualByComparingTo("120000");
			assertThat(row.totalPoints()).isEqualTo(12);
		});
	}
}
