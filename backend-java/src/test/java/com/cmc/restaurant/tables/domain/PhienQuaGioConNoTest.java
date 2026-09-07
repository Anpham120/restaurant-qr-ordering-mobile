package com.cmc.restaurant.tables.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.cmc.restaurant.tables.TableSessionStatus;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Bàn quá giờ mà còn tiền chưa thu thì KHÔNG hết hạn.
 *
 * <p><b>Nghiệp vụ được canh ở đây, và đây là chỗ mất tiền im lặng.</b> Chuỗi sự việc trước bản sửa:
 *
 * <pre>
 * 1. Bàn 6 người, tiệc sinh nhật, ngồi hơn 4 giờ.
 * 2. Phiên hết hạn theo DEFAULT_SESSION_LIFETIME.
 * 3. Khách mở điện thoại để trả tiền  ->  410 GONE, "quét lại QR".
 * 4. Quét lại  ->  phiên cũ đã Expired nên hệ thống mở phiên MỚI.
 * 5. Phiên mới: giỏ rỗng, không đơn nào, hoá đơn 0đ.
 * 6. Toàn bộ món đã ăn nằm ở phiên cũ, đã Expired.
 * </pre>
 *
 * <p>Không hoá đơn nào được lập nên danh sách chờ thu của quầy trống; trung tâm điều hành lọc thẳng
 * phiên hết hạn ra khỏi màn hình. Món đã ăn, không ai được hỏi tiền, và không màn hình nào hiện.
 */
class PhienQuaGioConNoTest {

	private static final OffsetDateTime MO = OffsetDateTime.parse("2026-09-07T10:00:00Z");
	private static final OffsetDateTime HAN = MO.plusHours(4);
	private static final OffsetDateTime QUA_HAN = HAN.plusMinutes(30);

	private TableSession phienQuaGio() {
		return new TableSession("ts_1", "tbl_1", "T01", TableSessionStatus.Open, HAN, null, MO);
	}

	@Test
	@DisplayName("còn nợ tiền thì được GIA HẠN, không chuyển Expired")
	void conNoThiGiaHanChuKhongHetHan() {
		TableSession phien = phienQuaGio();

		assertThat(phien.isExpiredAt(QUA_HAN)).isTrue();
		assertThat(phien.expireIfPast(QUA_HAN, true)).isTrue();

		// Ba điều phải cùng đúng, và điều thứ ba là điều quan trọng nhất:
		assertThat(phien.status()).isEqualTo(TableSessionStatus.Open);
		assertThat(phien.isExpiredAt(QUA_HAN)).isFalse();
		// isActiveAt đúng trở lại nghĩa là MỌI đường đi đã hỏi câu đó — giỏ hàng, yêu cầu thanh
		// toán, mở lại phiên — tự chạy được, không nơi nào phải sửa.
		assertThat(phien.isActiveAt(QUA_HAN)).isTrue();
	}

	@Test
	@DisplayName("mốc quá giờ ghi lại HẠN GỐC, và chỉ ghi một lần")
	void mocQuaGioGhiHanGocVaChiMotLan() {
		TableSession phien = phienQuaGio();

		phien.expireIfPast(QUA_HAN, true);
		assertThat(phien.overdueSince()).isEqualTo(HAN);

		// Lần gia hạn thứ hai KHÔNG được đẩy mốc theo, nếu không quầy sẽ luôn thấy "vừa mới quá
		// giờ" và không biết bàn này đã nợ bao lâu.
		OffsetDateTime muonHon = QUA_HAN.plusHours(2);
		phien.expireIfPast(muonHon, true);
		assertThat(phien.overdueSince()).isEqualTo(HAN);
	}

	@Test
	@DisplayName("không nợ gì thì vẫn hết hạn như cũ")
	void khongNoThiVanHetHan() {
		TableSession phien = phienQuaGio();

		assertThat(phien.expireIfPast(QUA_HAN, false)).isTrue();

		// Hạn 4 giờ giữ nguyên tác dụng ban đầu: dọn bàn khách đã đi mà không gọi món. Bản sửa này
		// chỉ cắt đúng một trường hợp ra khỏi nó, không vô hiệu hoá nó.
		assertThat(phien.status()).isEqualTo(TableSessionStatus.Expired);
		assertThat(phien.overdueSince()).isNull();
	}

	@Test
	@DisplayName("chưa tới hạn thì không đụng gì, dù còn nợ")
	void chuaToiHanThiKhongDungGi() {
		TableSession phien = phienQuaGio();
		OffsetDateTime conSom = HAN.minusMinutes(10);

		assertThat(phien.expireIfPast(conSom, true)).isFalse();
		assertThat(phien.overdueSince()).isNull();
		assertThat(phien.expiresAt()).isEqualTo(HAN);
	}

	/**
	 * Bàn quá giờ mà KHÔNG AI CHẠM VÀO vẫn phải hiện ra ở danh sách của quầy.
	 *
	 * <p>`expireIfPast` chỉ chạy khi có ai chạm vào phiên — mở phiên mới cho bàn đó, khách mở lại
	 * app, bấm gọi nhân viên. Bàn không ai chạm thì `overdue_since` mãi mãi null, và đó chính là
	 * bàn cần chú ý nhất: bàn khách đã bỏ đi.
	 *
	 * <p>Đo được trên cơ sở dữ liệu thật khi chạy hệ thống: 3 phiên đang mở và đã quá hạn, 0 phiên
	 * có mốc. Danh sách hiện rỗng trong khi có ba bàn cần đòi tiền.
	 */
	@Test
	@DisplayName("quá giờ mà chưa ai chạm vào vẫn có mốc — suy lúc đọc")
	void quaGioMaChuaAiChamVanCoMoc() {
		TableSession chuaAiCham = phienQuaGio();

		assertThat(chuaAiCham.overdueSince()).isNull();
		assertThat(chuaAiCham.mocQuaGio(QUA_HAN, true)).isEqualTo(HAN);
	}

	@Test
	@DisplayName("không nợ tiền thì không phải việc của quầy")
	void khongNoThiKhongPhaiViecCuaQuay() {
		// Bàn quá giờ mà đã trả đủ chỉ là bàn cần dọn, không phải bàn cần đòi tiền. Đưa nó vào
		// danh sách công việc là làm loãng đúng thứ danh sách đó sinh ra để nêu bật.
		assertThat(phienQuaGio().mocQuaGio(QUA_HAN, false)).isNull();
	}

	@Test
	@DisplayName("mốc đã ghi được ưu tiên hơn giá trị suy ra")
	void mocDaGhiDuocUuTien() {
		// Sau vài lần gia hạn, `expiresAt` bị đẩy tới tương lai và không còn nói được bàn quá giờ
		// từ bao giờ. Cột đã ghi giữ hạn GỐC, nên nó phải thắng.
		TableSession phien = phienQuaGio();
		phien.expireIfPast(QUA_HAN, true);

		assertThat(phien.mocQuaGio(QUA_HAN.plusHours(3), true)).isEqualTo(HAN);
	}

	@Test
	@DisplayName("phiên đã đóng thì không gia hạn ngược trở lại")
	void phienDaDongThiKhongSongLai() {
		// Nếu thiếu chốt này, một bàn đã đóng mà sổ sách còn treo nợ sẽ bị hồi sinh thành phiên
		// đang mở — và bàn đó có thể đang có khách khác ngồi.
		TableSession daDong = new TableSession(
				"ts_2", "tbl_1", "T01", TableSessionStatus.Closed, HAN, QUA_HAN, QUA_HAN);

		assertThat(daDong.expireIfPast(QUA_HAN.plusHours(1), true)).isFalse();
		assertThat(daDong.status()).isEqualTo(TableSessionStatus.Closed);
	}
}
