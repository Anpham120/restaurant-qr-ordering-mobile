package com.cmc.restaurant.orders;

import static org.assertj.core.api.Assertions.assertThat;

import com.cmc.restaurant.auth.XacMinhGia;
import com.cmc.restaurant.menu.LichPhucVu;
import com.cmc.restaurant.menu.MenuItemEntity;
import com.cmc.restaurant.menu.MenuItemRepository;
import com.cmc.restaurant.menu.MenuItemServingPeriodEntity;
import com.cmc.restaurant.menu.MenuItemServingPeriodRepository;
import com.cmc.restaurant.menu.ServingPeriodEntity;
import com.cmc.restaurant.menu.ServingPeriodRepository;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * CA PHỤC VỤ PHẢI CHẶN Ở LÚC ĐẶT MÓN, không chỉ lọc lúc hiển thị.
 *
 * <p><b>Lỗ hổng lớp này canh.</b> Bộ lọc trong {@code MenuQueryService} làm món biến khỏi thực đơn
 * khi hết ca, nhưng ai mở trang từ trước, hoặc còn món trong giỏ, vẫn gửi đơn được: chọn món cơm
 * lúc 13:55, bấm đặt lúc 14:05, ca trưa đã đóng mà đơn vẫn vào và bếp vẫn nhận.
 *
 * <p><b>Vì sao phải là test tích hợp.</b> {@code LichPhucVuTest} kiểm luật và xanh hết, nhưng nó
 * kiểm một lớp THUẦN. Đúng loại lỗi này đã xảy ra một lần trong nhánh: phần nối lớp đó vào
 * {@code MenuQueryService} thất bại âm thầm, mã vẫn biên dịch, mọi test vẫn xanh. Chỗ nối chỉ có
 * một lời gọi HTTP thật mới kiểm được.
 *
 * <p>Ca dùng trong test được dựng TƯƠNG ĐỐI so với giờ hiện tại, nên kết quả không phụ thuộc vào
 * lúc nào chạy test.
 */
@Testcontainers
@Import(XacMinhGia.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DatDonNgoaiCaTest {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

	@Autowired
	private TestRestTemplate rest;

	@Autowired
	private MenuItemRepository monRepository;

	@Autowired
	private ServingPeriodRepository caRepository;

	@Autowired
	private MenuItemServingPeriodRepository ganCaRepository;

	private static String soNgauNhien() {
		return "09" + String.format("%08d", (int) (Math.random() * 100000000));
	}

	private static HttpEntity<Map<String, String>> json(Map<String, String> body) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		return new HttpEntity<>(body, headers);
	}

	private String dangNhap() {
		String so = soNgauNhien();
		rest.postForEntity("/api/auth/register", json(Map.of(
				"fullName", "K", "phoneIdToken", so, "password", "MatKhauProbe12345")), Map.class);
		@SuppressWarnings("unchecked")
		Map<String, Object> body = rest.postForEntity("/api/auth/login",
				json(Map.of("identifier", so, "password", "MatKhauProbe12345")), Map.class).getBody();
		return (String) body.get("accessToken");
	}

	/**
	 * Dựng một ca TƯƠNG ĐỐI so với bây giờ, để test không phụ thuộc vào lúc nào chạy.
	 *
	 * @param tuLechGio  giờ bắt đầu, lệch so với bây giờ
	 * @param denLechGio giờ kết thúc, lệch so với bây giờ
	 */
	private ServingPeriodEntity taoCa(String ten, long tuLechGio, long denLechGio) {
		LocalTime bayGio = LocalTime.now(LichPhucVu.MUI_GIO_QUAN);
		return caRepository.save(new ServingPeriodEntity(
				"sp_test_" + UUID.randomUUID().toString().substring(0, 8), ten,
				bayGio.plusHours(tuLechGio), bayGio.plusHours(denLechGio), 9, OffsetDateTime.now()));
	}

	/**
	 * Gán một món CỤ THỂ vào ca, theo id cố định từ dữ liệu khởi tạo.
	 *
	 * <p>Không lấy theo chỉ số của {@code findAll()}: các ca test này có trừ tồn kho, mà một lệnh
	 * UPDATE trong Postgres đổi được vị trí vật lý của hàng, nên thứ tự trả về không bảo đảm giữ
	 * nguyên giữa hai lần gọi. Mỗi ca test dùng một món riêng để không đụng vào nhau — cả lớp dùng
	 * chung MỘT cơ sở dữ liệu.
	 */
	private void ganMonVaoCa(ServingPeriodEntity ca, String monId) {
		MenuItemEntity mon = monRepository.findById(monId).orElseThrow();
		ganCaRepository.save(new MenuItemServingPeriodEntity(
				UUID.randomUUID().toString(), mon.getId(), ca.getId()));
	}

	/**
	 * Mỗi ca test dùng MỘT bàn riêng trong dải T01-T30 của dữ liệu khởi tạo.
	 *
	 * <p>Bàn riêng vì mở phiên cho một bàn đã có phiên mở thì hệ thống DÙNG LẠI phiên cũ, và hai ca
	 * test sẽ đặt đơn chung một phiên. Dải T25-T28 tránh T21-T24 mà MyOrderHistoryTest đang dùng.
	 */
	@SuppressWarnings("unchecked")
	private ResponseEntity<Map> datDon(String monId, String tableCode) {
		String token = dangNhap();
		String qrToken = "cmc-table-" + tableCode.toLowerCase(java.util.Locale.ROOT) + "-qr";

		HttpHeaders mo = new HttpHeaders();
		mo.setContentType(MediaType.APPLICATION_JSON);
		mo.setBearerAuth(token);
		Map<String, Object> phien = rest.exchange("/api/table-sessions", HttpMethod.POST,
				new HttpEntity<>(Map.of("qrToken", qrToken, "tableCode", tableCode), mo), Map.class)
				.getBody();

		HttpHeaders dat = new HttpHeaders();
		dat.setContentType(MediaType.APPLICATION_JSON);
		dat.set("X-Table-Session-Token", (String) phien.get("tableSessionToken"));
		dat.set("Idempotency-Key", "it." + UUID.randomUUID());
		return rest.exchange("/api/orders", HttpMethod.POST, new HttpEntity<>(Map.of(
				"orderType", "DineIn",
				"tableSessionId", phien.get("sessionId"),
				"tableCode", tableCode,
				"qrToken", qrToken,
				"items", List.of(Map.of("menuItemId", monId, "quantity", 1))), dat), Map.class);
	}

	/** Thân lỗi LỒNG trong khoá "error" — xem GlobalExceptionHandler, không phẳng ở gốc. */
	@SuppressWarnings("unchecked")
	private static String maLoi(ResponseEntity<Map> kq) {
		return (String) ((Map<String, Object>) kq.getBody().get("error")).get("code");
	}

	@SuppressWarnings("unchecked")
	private static String thongDiep(ResponseEntity<Map> kq) {
		return (String) ((Map<String, Object>) kq.getBody().get("error")).get("message");
	}

	@Test
	@DisplayName("ĐẶT MÓN NGOÀI CA BỊ TỪ CHỐI, kể cả khi giỏ hàng còn món từ trước")
	void ngoaiCaBiTuChoi() {
		// Ca mở sau đây hai tiếng, tức BÂY GIỜ đang đóng. Món gán vào ca đó không đặt được.
		ServingPeriodEntity caDaDong = taoCa("Ca đã đóng", 2, 3);
		ganMonVaoCa(caDaDong, "m_001");

		ResponseEntity<Map> kq = datDon("m_001", "T25");

		assertThat(kq.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(maLoi(kq)).isEqualTo("MENU_ITEM_OUTSIDE_SERVING_PERIOD");
	}

	@Test
	@DisplayName("câu từ chối phải nói món đó bán LÚC NÀO")
	void noiRoBanLucNao() {
		// Một lời từ chối không nói khi nào thì được là lời từ chối bắt khách đi hỏi nhân viên.
		ServingPeriodEntity caDaDong = taoCa("Lẩu đêm", 3, 5);
		ganMonVaoCa(caDaDong, "m_002");

		ResponseEntity<Map> kq = datDon("m_002", "T26");

		assertThat(thongDiep(kq)).contains("Lẩu đêm");
	}

	@Test
	@DisplayName("món trong ca ĐANG MỞ đặt được bình thường")
	void trongCaThiDatDuoc() {
		// Đối chứng. Thiếu ca này thì một bản sửa sai chặn sạch mọi đơn vẫn xanh.
		ServingPeriodEntity caDangMo = taoCa("Ca đang mở", -1, 1);
		ganMonVaoCa(caDangMo, "m_003");

		assertThat(datDon("m_003", "T27").getStatusCode()).isEqualTo(HttpStatus.CREATED);
	}

	@Test
	@DisplayName("MÓN KHÔNG GÁN CA NÀO ĐẶT ĐƯỢC MỌI LÚC — 91 món hiện tại không đổi hành vi")
	void monCaNgayVanDatDuoc() {
		// Quy ước quan trọng nhất của tính năng ca phục vụ. Thiếu ca này thì một bản sửa sai coi
		// "không gán ca" là "không bán" sẽ chặn sạch cả thực đơn, và không có gì đỏ để báo.
		taoCa("Ca đã đóng", 2, 3);

		assertThat(datDon("m_004", "T28").getStatusCode()).isEqualTo(HttpStatus.CREATED);
	}
}
