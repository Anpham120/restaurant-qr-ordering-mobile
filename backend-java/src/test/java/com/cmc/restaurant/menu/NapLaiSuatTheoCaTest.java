package com.cmc.restaurant.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * NẠP LẠI SỐ SUẤT KHI MỘT CA MỞ.
 *
 * <p>Tác vụ này GHI ĐÈ số suất sống, nên nó là đoạn mã nguy hiểm nhất của tính năng: chạy nhầm một
 * lần giữa ca là xoá sạch phần đã bán, và quán bán vượt số suất mà không ai biết. Mỗi ca dưới đây
 * canh một cách mà nó có thể chạy nhầm.
 */
class NapLaiSuatTheoCaTest {

	private static final OffsetDateTime LUC = OffsetDateTime.parse("2026-01-01T00:00:00Z");

	private ServingPeriodRepository caRepo;
	private MenuItemPeriodStockRepository suatRepo;
	private ServingPeriodResetRepository soGhi;
	private MenuItemRepository monRepo;
	private NapLaiSuatTheoCaJob job;

	@BeforeEach
	void setUp() {
		caRepo = mock(ServingPeriodRepository.class);
		suatRepo = mock(MenuItemPeriodStockRepository.class);
		soGhi = mock(ServingPeriodResetRepository.class);
		monRepo = mock(MenuItemRepository.class);
		job = new NapLaiSuatTheoCaJob(caRepo, suatRepo, soGhi, monRepo);

		when(soGhi.existsByServingPeriodIdAndNgayPhucVu(anyString(), any())).thenReturn(false);
		when(suatRepo.findByServingPeriodId(anyString())).thenReturn(List.of());
		when(monRepo.datTonKho(anyString(), anyInt())).thenReturn(1);
	}

	private static ServingPeriodEntity ca(String id, String tu, String den) {
		return new ServingPeriodEntity(id, id, LocalTime.parse(tu), LocalTime.parse(den), 0, LUC);
	}

	private static LocalDateTime luc(String moc) {
		return LocalDateTime.parse(moc);
	}

	@Test
	@DisplayName("ca mở thì số suất được ĐẶT về con số dự kiến của ca đó")
	void caMoThiNapLai() {
		when(caRepo.findAll()).thenReturn(List.of(ca("sp_toi", "18:00", "22:00")));
		when(suatRepo.findByServingPeriodId("sp_toi")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_lau", "sp_toi", 25)));

		int daNap = job.chayLuc(luc("2026-03-02T18:01"));

		assertThat(daNap).isEqualTo(1);
		verify(monRepo).datTonKho("m_lau", 25);
	}

	@Test
	@DisplayName("ca CHƯA mở thì không đụng gì")
	void caChuaMoThiKhongLam() {
		when(caRepo.findAll()).thenReturn(List.of(ca("sp_toi", "18:00", "22:00")));
		when(suatRepo.findByServingPeriodId("sp_toi")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_lau", "sp_toi", 25)));

		assertThat(job.chayLuc(luc("2026-03-02T15:00"))).isZero();
		verify(monRepo, never()).datTonKho(anyString(), anyInt());
	}

	@Test
	@DisplayName("ĐÃ NẠP RỒI THÌ KHÔNG NẠP LẠI — tác vụ quét mỗi 5 phút suốt cả ca")
	void daNapRoiThiThoi() {
		// Không có ca này thì cứ 5 phút số suất lại bị đặt về con số dự kiến, tức là phần đã bán bị
		// xoá sạch mỗi 5 phút và quán bán vượt số suất suốt cả ca mà không có dấu hiệu gì.
		when(caRepo.findAll()).thenReturn(List.of(ca("sp_toi", "18:00", "22:00")));
		when(suatRepo.findByServingPeriodId("sp_toi")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_lau", "sp_toi", 25)));
		when(soGhi.existsByServingPeriodIdAndNgayPhucVu("sp_toi", LocalDate.parse("2026-03-02")))
				.thenReturn(true);

		assertThat(job.chayLuc(luc("2026-03-02T20:00"))).isZero();
		verify(monRepo, never()).datTonKho(anyString(), anyInt());
	}

	@Test
	@DisplayName("CA QUA ĐÊM KHÔNG ĐƯỢC NẠP LẠI LÚC NỬA ĐÊM")
	void caQuaDemKhongNapLaiLucNuaDem() {
		// BẪY CHÍNH CỦA BẢN NÀY, và nó chỉ hiện ra ở đúng một thời điểm trong ngày.
		//
		// Ca lẩu đêm 18:00-02:00 mở tối thứ Hai, đóng 2 giờ sáng thứ Ba. Suốt khoảng đó nó là MỘT
		// ca, một mẻ nguyên liệu, một lần nạp.
		//
		// Nếu sổ ghi khoá theo ngày TRÊN LỊCH thì đúng 00:00 ngày đổi, sổ không có dòng nào cho
		// ngày mới, và tác vụ nạp lại số suất giữa ca — 0 giờ sáng, quán đang đông, phần đã bán bị
		// xoá sạch.
		//
		// Ngày phục vụ phải là ngày ca BẮT ĐẦU, nên lúc 00:30 thứ Ba nó vẫn là thứ Hai.
		ServingPeriodEntity lauDem = ca("sp_dem", "18:00", "02:00");
		when(caRepo.findAll()).thenReturn(List.of(lauDem));
		when(suatRepo.findByServingPeriodId("sp_dem")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_lau", "sp_dem", 25)));
		// Đã nạp lúc 18:00 thứ Hai (ngày 2 tháng 3).
		when(soGhi.existsByServingPeriodIdAndNgayPhucVu("sp_dem", LocalDate.parse("2026-03-02")))
				.thenReturn(true);

		// 00:30 thứ Ba, ngày trên lịch đã sang mồng 3 — nhưng ngày phục vụ vẫn là mồng 2.
		assertThat(job.chayLuc(luc("2026-03-03T00:30"))).isZero();
		verify(monRepo, never()).datTonKho(anyString(), anyInt());
	}

	@Test
	@DisplayName("ca qua đêm VẪN nạp lại vào tối hôm sau")
	void caQuaDemVanNapToiHomSau() {
		// Đối chứng cho ca trên: nếu sửa sai thành "ca qua đêm không bao giờ nạp lại" thì ca này đỏ.
		ServingPeriodEntity lauDem = ca("sp_dem", "18:00", "02:00");
		when(caRepo.findAll()).thenReturn(List.of(lauDem));
		when(suatRepo.findByServingPeriodId("sp_dem")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_lau", "sp_dem", 25)));
		when(soGhi.existsByServingPeriodIdAndNgayPhucVu("sp_dem", LocalDate.parse("2026-03-02")))
				.thenReturn(true);

		// 18:01 thứ Ba — ca mới, ngày phục vụ là mồng 3, sổ chưa có dòng.
		assertThat(job.chayLuc(luc("2026-03-03T18:01"))).isEqualTo(1);
		verify(monRepo).datTonKho("m_lau", 25);
	}

	@Test
	@DisplayName("món KHÔNG cấu hình số suất cho ca này thì KHÔNG bị đụng tới")
	void monKhongCauHinhThiKhongDung() {
		// Bảng số suất theo ca RỖNG sau migration, nên tác vụ này không được làm gì cả cho tới khi
		// quán thật sự cấu hình. Thiếu ca này thì một bản sửa sai có thể đặt mọi món về 0.
		when(caRepo.findAll()).thenReturn(List.of(ca("sp_toi", "18:00", "22:00")));

		assertThat(job.chayLuc(luc("2026-03-02T18:01"))).isZero();
		verify(monRepo, never()).datTonKho(anyString(), anyInt());
	}

	@Test
	@DisplayName("ghi sổ KỂ CẢ khi không món nào được nạp")
	void vanGhiSoKhiRong() {
		// Sổ ghi trả lời câu "ca này đã tới lượt nạp chưa", không phải "có nạp được gì không". Bỏ
		// qua khi rỗng thì mỗi vòng quét 5 phút lại thử lại cả ca đó suốt ngày.
		when(caRepo.findAll()).thenReturn(List.of(ca("sp_toi", "18:00", "22:00")));

		job.chayLuc(luc("2026-03-02T18:01"));

		ArgumentCaptor<ServingPeriodResetEntity> ghi =
				ArgumentCaptor.forClass(ServingPeriodResetEntity.class);
		verify(soGhi).save(ghi.capture());
		assertThat(ghi.getValue().getServingPeriodId()).isEqualTo("sp_toi");
		assertThat(ghi.getValue().getNgayPhucVu()).isEqualTo(LocalDate.parse("2026-03-02"));
		assertThat(ghi.getValue().getSoMonDaNap()).isZero();
	}

	@Test
	@DisplayName("hai ca cùng mở thì nạp cả hai, mỗi ca một dòng sổ")
	void haiCaCungMo() {
		// Ca chồng nhau là cấu hình hợp lệ: "Cả ngày 10:00-22:00" và "Tối 18:00-22:00" có thể cùng
		// tồn tại, mỗi ca quản một nhóm món khác nhau.
		when(caRepo.findAll()).thenReturn(List.of(
				ca("sp_ngay", "10:00", "22:00"), ca("sp_toi", "18:00", "22:00")));
		when(suatRepo.findByServingPeriodId("sp_ngay")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_com", "sp_ngay", 30)));
		when(suatRepo.findByServingPeriodId("sp_toi")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s2", "m_lau", "sp_toi", 25)));

		assertThat(job.chayLuc(luc("2026-03-02T19:00"))).isEqualTo(2);
		verify(monRepo).datTonKho("m_com", 30);
		verify(monRepo).datTonKho("m_lau", 25);
		verify(soGhi, org.mockito.Mockito.times(2)).save(any(ServingPeriodResetEntity.class));
	}

	@Test
	@DisplayName("số suất được ĐẶT chứ không CỘNG vào phần thừa của ca trước")
	void datChuKhongCong() {
		// Cộng dồn sẽ làm số suất phình dần qua từng ca cho tới lúc nó không còn nói lên điều gì.
		// Ca này khoá `datTonKho` chứ không phải `traTonKho`.
		when(caRepo.findAll()).thenReturn(List.of(ca("sp_toi", "18:00", "22:00")));
		when(suatRepo.findByServingPeriodId("sp_toi")).thenReturn(List.of(
				new MenuItemPeriodStockEntity("s1", "m_lau", "sp_toi", 25)));

		job.chayLuc(luc("2026-03-02T18:01"));

		verify(monRepo).datTonKho("m_lau", 25);
		verify(monRepo, never()).traTonKho(anyString(), anyInt());
		verify(monRepo, never()).truTonKho(eq("m_lau"), anyInt());
	}
}
