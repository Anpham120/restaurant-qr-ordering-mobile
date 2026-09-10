package com.cmc.restaurant.menu;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * CA PHỤC VỤ — sáng bán phở, trưa bán cơm, tối bán lẩu.
 *
 * <p>Mọi luật ở đây nhận thời điểm làm THAM SỐ chứ không đọc đồng hồ, nên ca qua đêm kiểm được
 * bằng test thường thay vì phải chờ tới 1 giờ sáng.
 */
class LichPhucVuTest {

	private static final OffsetDateTime LUC = OffsetDateTime.parse("2026-01-01T00:00:00Z");

	private static ServingPeriodEntity ca(String id, String tu, String den) {
		return new ServingPeriodEntity(id, id, LocalTime.parse(tu), LocalTime.parse(den), 0, LUC);
	}

	private static MenuItemServingPeriodEntity gan(String mon, String ca) {
		return new MenuItemServingPeriodEntity(mon + "_" + ca, mon, ca);
	}

	private static final ServingPeriodEntity SANG = ca("sang", "06:00", "10:00");
	private static final ServingPeriodEntity TRUA = ca("trua", "10:00", "14:00");
	private static final ServingPeriodEntity TOI = ca("toi", "18:00", "22:00");

	@Test
	@DisplayName("MÓN KHÔNG GÁN CA NÀO BÁN CẢ NGÀY — luật giữ 91 món hiện tại không đổi hành vi")
	void khongGanCaThiBanCaNgay() {
		// Ca quan trọng nhất của bản này. Quy ước ngược lại — không gán nghĩa là không bán — làm cả
		// thực đơn biến mất khỏi màn hình khách ngay giây migration chạy xong, không báo lỗi gì.
		LichPhucVu lich = LichPhucVu.tai(List.of(SANG, TRUA, TOI), List.of(), LocalTime.parse("03:00"));

		assertThat(lich.dangTrongCa("m_pho")).isTrue();
	}

	@Test
	@DisplayName("quán chưa khai ca nào thì thực đơn chạy y như trước khi có tính năng này")
	void chuaKhaiCaNaoThiNhuCu() {
		LichPhucVu lich = LichPhucVu.tai(List.of(), List.of(), LocalTime.parse("15:00"));

		assertThat(lich.dangTrongCa("m_pho")).isTrue();
	}

	@Test
	@DisplayName("phở sáng hiện lúc 07:00, ẩn lúc 12:00")
	void monTheoCaChiHienTrongCa() {
		List<MenuItemServingPeriodEntity> ganCa = List.of(gan("m_pho", "sang"));

		assertThat(LichPhucVu.tai(List.of(SANG, TRUA), ganCa, LocalTime.parse("07:00"))
				.dangTrongCa("m_pho")).isTrue();
		assertThat(LichPhucVu.tai(List.of(SANG, TRUA), ganCa, LocalTime.parse("12:00"))
				.dangTrongCa("m_pho")).isFalse();
	}

	@Test
	@DisplayName("một món gán được NHIỀU ca")
	void monGanNhieuCa() {
		List<MenuItemServingPeriodEntity> ganCa = List.of(gan("m_com", "trua"), gan("m_com", "toi"));

		assertThat(LichPhucVu.tai(List.of(TRUA, TOI), ganCa, LocalTime.parse("11:00"))
				.dangTrongCa("m_com")).isTrue();
		assertThat(LichPhucVu.tai(List.of(TRUA, TOI), ganCa, LocalTime.parse("19:00"))
				.dangTrongCa("m_com")).isTrue();
		assertThat(LichPhucVu.tai(List.of(TRUA, TOI), ganCa, LocalTime.parse("16:00"))
				.dangTrongCa("m_com")).isFalse();
	}

	@Test
	@DisplayName("CA QUA ĐÊM: lẩu 18:00-02:00 phải mở lúc 23:00 VÀ lúc 01:00")
	void caQuaDem() {
		// Bẫy: phép so thẳng `start <= t && t < end` trả về SAI cho MỌI thời điểm khi
		// start > end. Ca lẩu đêm sẽ im lặng không bao giờ mở, món lẩu không bao giờ hiện, và
		// không có lỗi nào được ném ra để ai đó nhận ra.
		ServingPeriodEntity lauDem = ca("lau_dem", "18:00", "02:00");
		List<MenuItemServingPeriodEntity> ganCa = List.of(gan("m_lau", "lau_dem"));

		assertThat(LichPhucVu.tai(List.of(lauDem), ganCa, LocalTime.parse("23:00"))
				.dangTrongCa("m_lau")).as("23:00 — trước nửa đêm").isTrue();
		assertThat(LichPhucVu.tai(List.of(lauDem), ganCa, LocalTime.parse("01:00"))
				.dangTrongCa("m_lau")).as("01:00 — sau nửa đêm").isTrue();
		assertThat(LichPhucVu.tai(List.of(lauDem), ganCa, LocalTime.parse("18:00"))
				.dangTrongCa("m_lau")).as("18:00 — đúng lúc mở").isTrue();
		assertThat(LichPhucVu.tai(List.of(lauDem), ganCa, LocalTime.parse("15:00"))
				.dangTrongCa("m_lau")).as("15:00 — chiều, chưa tới ca").isFalse();
		assertThat(LichPhucVu.tai(List.of(lauDem), ganCa, LocalTime.parse("03:00"))
				.dangTrongCa("m_lau")).as("03:00 — đã qua ca").isFalse();
	}

	@Test
	@DisplayName("ĐẦU CA TÍNH VÀO, CUỐI CA KHÔNG — hai ca liền nhau không chồng nhau")
	void bienCa() {
		// 10:00 đúng phải thuộc ca trưa và KHÔNG thuộc ca sáng. Nếu cuối ca cũng tính vào thì tại
		// đúng 10:00 cả hai ca cùng mở, và một món gán cho cả hai bị đếm hai lần ở mọi chỗ đếm.
		List<MenuItemServingPeriodEntity> ganCa = List.of(gan("m_pho", "sang"), gan("m_com", "trua"));
		LichPhucVu luc10 = LichPhucVu.tai(List.of(SANG, TRUA), ganCa, LocalTime.parse("10:00"));

		assertThat(luc10.dangTrongCa("m_pho")).as("10:00 — ca sáng đã đóng").isFalse();
		assertThat(luc10.dangTrongCa("m_com")).as("10:00 — ca trưa vừa mở").isTrue();
	}

	@Test
	@DisplayName("ngoài giờ mở cửa: món theo ca ẩn, món cả ngày vẫn hiện")
	void ngoaiGioMoCua() {
		// Không cần nhánh riêng cho "quán đang đóng cửa" — hành vi này tự rơi ra từ hai luật.
		List<MenuItemServingPeriodEntity> ganCa = List.of(gan("m_com", "trua"));
		LichPhucVu luc16 = LichPhucVu.tai(List.of(TRUA, TOI), ganCa, LocalTime.parse("16:00"));

		assertThat(luc16.dangTrongCa("m_com")).as("cơm trưa — đã hết ca").isFalse();
		assertThat(luc16.dangTrongCa("m_nuoc")).as("nước — không gán ca, bán cả ngày").isTrue();
	}
}
