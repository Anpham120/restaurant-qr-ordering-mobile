package com.cmc.restaurant.loyalty;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.auth.UserEntity;
import com.cmc.restaurant.auth.UserRepository;
import com.cmc.restaurant.shared.ActorContext;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class NhanVienTuTichDiemTest {

	private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-09-20T10:00:00+07:00");

	@Test
	void stillAccruesWhenCounterStaffUsesTheirOwnPhoneSoItCanBeAudited() {
		LoyaltyMemberRepository members = mock(LoyaltyMemberRepository.class);
		LoyaltyLedgerRepository ledger = mock(LoyaltyLedgerRepository.class);
		UserRepository users = mock(UserRepository.class);
		when(members.findByPhoneNumber("0901234567")).thenReturn(Optional.empty());
		when(members.save(any(LoyaltyMemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
		UserEntity staff = new UserEntity("u_counter", "counter@example.test", "Quầy A", "hash", "CounterStaff", NOW);
		staff.setPhoneNumber("0901234567");
		when(users.findById("u_counter")).thenReturn(Optional.of(staff));
		when(users.findByPhoneNumber("0901234567")).thenReturn(Optional.of(staff));

		LoyaltyService service = new LoyaltyService(members, mock(LoyaltyRewardRepository.class), ledger,
				mock(LoyaltyRedemptionRepository.class), users);

		var result = service.accrue("0901 234 567", new BigDecimal("120000"), "INV-1", NOW);

		assertThat(result).hasValueSatisfying(accrual -> {
			assertThat(accrual.phoneNumber()).isEqualTo("0901234567");
			assertThat(accrual.points()).isEqualTo(12);
		});
		assertThat(service.actorOwnsPhone(new ActorContext("u_counter", "CounterStaff"), "0901234567")).isTrue();
		verify(ledger).save(any(LoyaltyLedgerEntity.class));
	}
}
