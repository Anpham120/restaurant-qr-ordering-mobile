package com.cmc.restaurant;

import static org.assertj.core.api.Assertions.assertThat;

import com.cmc.restaurant.audit.AuditLogService;
import com.cmc.restaurant.auth.JwtService;
import com.cmc.restaurant.auth.UserEntity;
import com.cmc.restaurant.auth.UserRepository;
import com.cmc.restaurant.shared.ActorContext;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RestaurantApplicationTests {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

	@Autowired
	private TestRestTemplate restTemplate;

	@Autowired
	private AuditLogService auditLogService;

	@Autowired
	private UserRepository users;

	@Autowired
	private JwtService jwtService;

	@Test
	void contextLoadsAndFlywayMigratesAgainstRealPostgres() {
		var response = restTemplate.getForEntity("/api/health", String.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody()).contains("\"status\":\"ok\"");
	}

	@Test
	@SuppressWarnings("unchecked")
	void adminCanReadTodaysSelfLoyaltyAccrualWithStaffNameMoneyAndPoints() {
		OffsetDateTime now = OffsetDateTime.now();
		String suffix = UUID.randomUUID().toString().replace("-", "");
		UserEntity staff = users.save(new UserEntity("u_staff_" + suffix, "staff-" + suffix + "@example.test",
				"Quầy kiểm thử", "hash", "CounterStaff", now));
		staff.setPhoneNumber("090" + suffix.substring(0, 7));
		users.save(staff);
		UserEntity admin = users.save(new UserEntity("u_admin_" + suffix, "admin-" + suffix + "@example.test",
				"Quản lý kiểm thử", "hash", "Admin", now));

		auditLogService.record(new ActorContext(staff.getId(), "CounterStaff"),
				"STAFF_SELF_LOYALTY_ACCRUAL", "TableSession", "ts_" + suffix, "T12",
				new BigDecimal("120000"), null, null, Map.of("points", 12));

		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth(jwtService.issueToken(admin).accessToken());
		var response = restTemplate.exchange("/api/audit-log/self-loyalty-report", HttpMethod.GET,
				new HttpEntity<>(headers), List.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody()).anySatisfy(row -> {
			Map<String, Object> report = (Map<String, Object>) row;
			assertThat(report).containsEntry("actorName", "Quầy kiểm thử");
			assertThat(report).containsEntry("totalPoints", 12);
			assertThat(new BigDecimal(report.get("totalAmount").toString())).isEqualByComparingTo("120000");
		});
	}
}
