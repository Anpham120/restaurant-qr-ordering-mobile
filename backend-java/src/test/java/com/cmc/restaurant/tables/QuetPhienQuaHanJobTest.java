package com.cmc.restaurant.tables;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.tables.domain.TableSessionResumeState;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Tác vụ nền quét phiên quá hạn.
 *
 * <p><b>Vì sao tác vụ này tồn tại.</b> {@code expireIfPast} chỉ chạy khi có người CHẠM vào phiên:
 * mở phiên mới cho bàn đó, khách mở lại app, quầy bấm gọi nhân viên. Bàn không ai chạm thì không
 * bao giờ được đánh dấu — mà đó chính là bàn cần chú ý nhất: bàn khách đã bỏ đi.
 *
 * <p>Đo được trên cơ sở dữ liệu thật trước bản này: 3 phiên đang mở và đã quá hạn, 0 phiên có
 * {@code overdue_since}. Danh sách "bàn quá giờ" hiện RỖNG trong khi có ba bàn cần đi đòi tiền.
 */
class QuetPhienQuaHanJobTest {

	private static final OffsetDateTime MO = OffsetDateTime.parse("2026-09-09T10:00:00Z");
	private static final OffsetDateTime HAN = MO.plusHours(4);
	private static final OffsetDateTime QUA_HAN = HAN.plusMinutes(30);

	private TableSessionRepository sessions;
	private ResumeStateQueryService resumeState;
	private QuetPhienQuaHanJob job;

	@BeforeEach
	void setUp() {
		sessions = mock(TableSessionRepository.class);
		resumeState = mock(ResumeStateQueryService.class);
		job = new QuetPhienQuaHanJob(sessions, resumeState);
	}

	private TableSessionEntity phienQuaHan(String id) {
		return new TableSessionEntity(id, "tbl_1", "T01", "qr_1", MO, HAN);
	}

	@Test
	@DisplayName("bàn còn nợ: được đánh dấu quá giờ và gia hạn, KHÔNG đóng")
	void banConNoDuocDanhDau() {
		TableSessionEntity phien = phienQuaHan("ts_1");
		when(sessions.timPhienQuaHan(eq(TableSessionStatus.Open), any())).thenReturn(List.of(phien));
		when(resumeState.resolve("ts_1")).thenReturn(TableSessionResumeState.ReadyForPayment);

		int daSua = job.chayLuc(QUA_HAN);

		assertThat(daSua).isEqualTo(1);
		verify(sessions).save(phien);
		assertThat(phien.getStatus())
				.as("còn nợ thì phải giữ Open — đóng là làm mất dấu món đã ăn")
				.isEqualTo(TableSessionStatus.Open);
		assertThat(phien.getOverdueSince())
				.as("đây chính là thứ tác vụ này sinh ra để ghi")
				.isEqualTo(HAN);
	}

	@Test
	@DisplayName("bàn không nợ: đóng lại, đúng việc hạn 4 giờ sinh ra để làm")
	void banKhongNoThiDong() {
		TableSessionEntity phien = phienQuaHan("ts_2");
		when(sessions.timPhienQuaHan(eq(TableSessionStatus.Open), any())).thenReturn(List.of(phien));
		// Giỏ chưa gửi KHÔNG tính là nợ: chưa món nào được làm, chưa ai nợ ai.
		when(resumeState.resolve("ts_2")).thenReturn(TableSessionResumeState.CartPending);

		job.chayLuc(QUA_HAN);

		assertThat(phien.getStatus()).isEqualTo(TableSessionStatus.Expired);
		assertThat(phien.getOverdueSince()).isNull();
	}

	/**
	 * Chạy lại trên một phiên đã xử lý thì KHÔNG ghi thêm gì.
	 *
	 * <p>Tác vụ chạy mỗi 5 phút trên cùng một tập bàn. Nếu mỗi lượt đều ghi thì mốc quá giờ GỐC bị
	 * đẩy đi theo, và câu "bàn này quá giờ từ bao giờ" mất câu trả lời — đúng thứ mà
	 * {@code overdueSince} sinh ra để giữ, vì {@code expiresAt} đã bị gia hạn liên tục.
	 */
	@Test
	@DisplayName("chạy lại không đẩy mốc quá giờ gốc đi")
	void chayLaiKhongDoiMocGoc() {
		TableSessionEntity phien = phienQuaHan("ts_3");
		when(sessions.timPhienQuaHan(eq(TableSessionStatus.Open), any())).thenReturn(List.of(phien));
		when(resumeState.resolve("ts_3")).thenReturn(TableSessionResumeState.OrderInProgress);

		job.chayLuc(QUA_HAN);
		OffsetDateTime mocGoc = phien.getOverdueSince();

		job.chayLuc(QUA_HAN.plusHours(2));

		assertThat(phien.getOverdueSince())
				.as("mốc GỐC phải đứng yên qua mọi lần gia hạn")
				.isEqualTo(mocGoc);
	}

	@Test
	@DisplayName("không có phiên nào quá hạn thì không ghi gì")
	void khongCoGiThiKhongGhi() {
		when(sessions.timPhienQuaHan(any(), any())).thenReturn(List.of());

		assertThat(job.chayLuc(QUA_HAN)).isZero();
		verify(sessions, never()).save(any());
	}
}
