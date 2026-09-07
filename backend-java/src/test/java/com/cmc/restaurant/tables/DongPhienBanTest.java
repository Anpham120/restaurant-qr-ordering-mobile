package com.cmc.restaurant.tables;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.auth.JwtProperties;
import com.cmc.restaurant.shared.ApiException;
import com.cmc.restaurant.tables.domain.TableSessionResumeState;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Đóng phiên bàn khi còn tiền chưa thu.
 *
 * <p><b>Nghiệp vụ được canh ở đây.</b> Trước bản này {@code closeSession} chỉ đặt {@code Closed}
 * rồi thôi. Một lần bấm nhầm ở sơ đồ bàn là một bàn đóng với tiền chưa thu — và vì đã đóng, khách
 * quét QR sẽ mở phiên MỚI, để lại toàn bộ món đã ăn ở phiên cũ mà không màn hình nào hiện ra.
 */
class DongPhienBanTest {
	private final TableSessionRepository sessions = mock(TableSessionRepository.class);
	private final ResumeStateQueryService resumeState = mock(ResumeStateQueryService.class);
	private TableSessionService service;
	private TableSessionEntity phien;

	@BeforeEach
	void setup() {
		RestaurantTableRepository tables = mock(RestaurantTableRepository.class);
		when(tables.findById(any())).thenReturn(Optional.empty());
		service = new TableSessionService(tables, sessions, resumeState,
				mock(TableSessionCapability.class), mock(JwtProperties.class));

		OffsetDateTime now = OffsetDateTime.now();
		phien = new TableSessionEntity("ts_1", "tbl_1", "B01", "qr", now, now.plusHours(4));
		when(sessions.findById("ts_1")).thenReturn(Optional.of(phien));
	}

	@Test
	@DisplayName("bàn còn món chưa thanh toán thì KHÔNG đóng được")
	void conNoTienThiKhongDongDuoc() {
		when(resumeState.resolve("ts_1")).thenReturn(TableSessionResumeState.ReadyForPayment);

		assertThatThrownBy(() -> service.closeSession("ts_1", false, null))
				.isInstanceOfSatisfying(ApiException.class,
						e -> assertThat(e.getCode()).isEqualTo("TABLE_SESSION_HAS_UNPAID_ITEMS"));

		// Quan trọng hơn cả mã lỗi: phiên phải còn NGUYÊN. Một chốt chặn ném lỗi sau khi đã kịp
		// đổi trạng thái thì chẳng chặn được gì.
		assertThat(phien.getStatus()).isEqualTo(TableSessionStatus.Open);
		verify(sessions, never()).save(any());
	}

	@Test
	@DisplayName("ép đóng mà không nêu lý do cũng bị chặn")
	void epDongPhaiCoLyDo() {
		when(resumeState.resolve("ts_1")).thenReturn(TableSessionResumeState.OrderInProgress);

		for (String lyDo : new String[] {null, "", "   "}) {
			assertThatThrownBy(() -> service.closeSession("ts_1", true, lyDo))
					.isInstanceOfSatisfying(ApiException.class,
							e -> assertThat(e.getCode()).isEqualTo("TABLE_SESSION_CLOSE_REASON_REQUIRED"));
		}
		assertThat(phien.getStatus()).isEqualTo(TableSessionStatus.Open);
	}

	@Test
	@DisplayName("ép đóng kèm lý do thì được, và lý do được GHI LẠI")
	void epDongCoLyDoThiGhiLai() {
		when(resumeState.resolve("ts_1")).thenReturn(TableSessionResumeState.PaymentPending);

		service.closeSession("ts_1", true, "  Khách bỏ về, quản lý duyệt miễn  ");

		assertThat(phien.getStatus()).isEqualTo(TableSessionStatus.Closed);
		// Ghi lại là toàn bộ giá trị của việc cho ép đóng: nó biến một lần bấm im lặng thành một
		// quyết định có thể tra lại được.
		assertThat(phien.getCloseReason()).isEqualTo("Khách bỏ về, quản lý duyệt miễn");
	}

	@Test
	@DisplayName("bàn đã thu đủ tiền thì đóng bình thường, không cần lý do")
	void thuDuTienThiDongBinhThuong() {
		when(resumeState.resolve("ts_1")).thenReturn(TableSessionResumeState.Paid);

		service.closeSession("ts_1", false, null);

		assertThat(phien.getStatus()).isEqualTo(TableSessionStatus.Closed);
		assertThat(phien.getCloseReason()).isNull();
	}

	@Test
	@DisplayName("giỏ hàng chưa gửi KHÔNG tính là nợ tiền")
	void gioHangChuaGuiKhongPhaiLaNo() {
		// Đây đúng là trường hợp hạn 4 giờ sinh ra để dọn: khách quét QR, bấm vài món vào giỏ rồi
		// đi. Chưa món nào được làm, chưa ai nợ ai. Chặn cả ca này là biến chốt chặn thành phiền.
		assertThat(TableSessionResumeState.CartPending.conNoTien()).isFalse();
		assertThat(TableSessionResumeState.New.conNoTien()).isFalse();
		assertThat(TableSessionResumeState.Paid.conNoTien()).isFalse();

		assertThat(TableSessionResumeState.OrderInProgress.conNoTien()).isTrue();
		assertThat(TableSessionResumeState.ReadyForPayment.conNoTien()).isTrue();
		// Hoá đơn đã lập nhưng tiền chưa vào — đóng lúc này là bỏ dở một lần chuyển khoản đang bay.
		assertThat(TableSessionResumeState.PaymentPending.conNoTien()).isTrue();
	}
}
