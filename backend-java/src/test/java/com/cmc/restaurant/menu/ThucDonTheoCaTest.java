package com.cmc.restaurant.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.menu.MenuDtos.MenuItemResponse;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * THỰC ĐƠN KHÁCH PHẢI THẬT SỰ LỌC THEO CA PHỤC VỤ.
 *
 * <p><b>Vì sao lớp test này tồn tại.</b> {@link LichPhucVuTest} kiểm luật "món nào bán lúc nào" và
 * xanh hết — nhưng nó kiểm một lớp THUẦN. Trong lần viết đầu, phần nối lớp đó vào
 * {@link MenuQueryService} thất bại âm thầm: mã vẫn biên dịch, mọi test vẫn xanh, và thực đơn khách
 * bỏ qua ca phục vụ hoàn toàn. Không có gì đỏ để báo.
 *
 * <p>Nên đây là ca canh CHỖ NỐI, không phải canh luật. Gỡ bộ lọc khỏi {@code MenuQueryService} thì
 * lớp này phải đỏ.
 */
class ThucDonTheoCaTest {

	private static final OffsetDateTime LUC = OffsetDateTime.parse("2026-01-01T00:00:00Z");

	private MenuItemRepository monAn;
	private ServingPeriodRepository caRepo;
	private MenuItemServingPeriodRepository ganCa;
	private MenuQueryService service;

	@BeforeEach
	void setUp() {
		CategoryRepository danhMuc = mock(CategoryRepository.class);
		monAn = mock(MenuItemRepository.class);
		caRepo = mock(ServingPeriodRepository.class);
		ganCa = mock(MenuItemServingPeriodRepository.class);
		service = new MenuQueryService(danhMuc, monAn, caRepo, ganCa);

		CategoryEntity danh = mock(CategoryEntity.class);
		when(danh.getId()).thenReturn("cat_main");
		when(danh.getName()).thenReturn("Cơm Việt");
		when(danh.getDisplayOrder()).thenReturn(1);
		when(danhMuc.findByActiveTrueOrderByDisplayOrderAscNameAsc()).thenReturn(List.of(danh));

		when(caRepo.findAll()).thenReturn(List.of(
				new ServingPeriodEntity("sp_sang", "Sáng", LocalTime.parse("06:00"),
						LocalTime.parse("10:00"), 1, LUC),
				new ServingPeriodEntity("sp_toi", "Tối", LocalTime.parse("18:00"),
						LocalTime.parse("22:00"), 2, LUC)));
		when(ganCa.findAll()).thenReturn(List.of());
		when(monAn.findByCategoryIdInAndAvailableTrue(any())).thenReturn(List.of());
	}

	private MenuItemEntity mon(String id, String ten) {
		return new MenuItemEntity(
				id, "cat_main", ten, "", new BigDecimal("50000"), null, true, List.of(), LUC);
	}

	private List<String> tenMonLuc(String gio) {
		return service.layThucDon(LocalTime.parse(gio)).items().stream()
				.map(MenuItemResponse::name)
				.toList();
	}

	@Test
	@DisplayName("phở chỉ hiện trong ca sáng, lẩu chỉ hiện trong ca tối")
	void locTheoCa() {
		when(monAn.findByCategoryIdInAndAvailableTrue(any()))
				.thenReturn(List.of(mon("m_pho", "Phở bò"), mon("m_lau", "Lẩu thái")));
		when(ganCa.findAll()).thenReturn(List.of(
				new MenuItemServingPeriodEntity("g1", "m_pho", "sp_sang"),
				new MenuItemServingPeriodEntity("g2", "m_lau", "sp_toi")));

		assertThat(tenMonLuc("07:00")).containsExactly("Phở bò");
		assertThat(tenMonLuc("19:00")).containsExactly("Lẩu thái");
	}

	@Test
	@DisplayName("MÓN KHÔNG GÁN CA VẪN HIỆN MỌI LÚC — 91 món hiện tại không đổi hành vi")
	void monCaNgayVanHien() {
		when(monAn.findByCategoryIdInAndAvailableTrue(any()))
				.thenReturn(List.of(mon("m_nuoc", "Trà đá")));

		assertThat(tenMonLuc("03:00")).containsExactly("Trà đá");
		assertThat(tenMonLuc("12:00")).containsExactly("Trà đá");
	}

	@Test
	@DisplayName("ngoài giờ mở cửa: món theo ca ẩn, món cả ngày vẫn hiện")
	void ngoaiGioMoCua() {
		when(monAn.findByCategoryIdInAndAvailableTrue(any()))
				.thenReturn(List.of(mon("m_pho", "Phở bò"), mon("m_nuoc", "Trà đá")));
		when(ganCa.findAll()).thenReturn(List.of(
				new MenuItemServingPeriodEntity("g1", "m_pho", "sp_sang")));

		assertThat(tenMonLuc("15:00")).containsExactly("Trà đá");
	}

	@Test
	@DisplayName("hết suất vẫn ẩn, kể cả khi đang trong ca")
	void hetSuatVanAn() {
		// Hai bộ lọc phải CÙNG chạy. Nối thêm bộ lọc ca mà làm gãy bộ lọc số suất thì khách gọi
		// được món bếp đã hết.
		MenuItemEntity het = mon("m_pho", "Phở bò");
		het.setRemainingQuantity(0);
		when(monAn.findByCategoryIdInAndAvailableTrue(any())).thenReturn(List.of(het));
		when(ganCa.findAll()).thenReturn(List.of(
				new MenuItemServingPeriodEntity("g1", "m_pho", "sp_sang")));

		assertThat(tenMonLuc("07:00")).isEmpty();
	}
}
