package com.cmc.restaurant.menu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cmc.restaurant.menu.MenuDtos.ChuanBiMonRequest;
import com.cmc.restaurant.shared.ApiException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * CHUẨN BỊ THỰC ĐƠN HÔM NAY — việc quản trị viên làm mỗi sáng trước giờ mở cửa: hôm nay bán món
 * gì, và nguyên liệu vừa nhập làm được mấy suất.
 *
 * <p><b>Nghiệp vụ được canh ở đây.</b> Trước bản này, cột {@code remaining_quantity} có tồn tại
 * nhưng cách duy nhất để đặt nó là mở hộp thoại sửa món — 91 lần mở-gõ-lưu-đóng mỗi sáng. Không ai
 * làm việc đó, nên con số nằm im ở {@code NULL} và tính năng "còn mấy suất" không bao giờ chạy.
 */
class ChuanBiThucDonHomNayTest {

	private MenuItemRepository monAn;
	private MenuItemService service;

	@BeforeEach
	void setUp() {
		monAn = mock(MenuItemRepository.class);
		service = new MenuItemService(monAn, mock(CategoryRepository.class));
		when(monAn.save(any(MenuItemEntity.class))).thenAnswer(call -> call.getArgument(0));
	}

	private MenuItemEntity mon(String id, boolean banHomNay, Integer soSuat) {
		MenuItemEntity item = new MenuItemEntity(
				id, "cat_pho", "Phở bò", "", new BigDecimal("65000"), null, banHomNay,
				List.of(), OffsetDateTime.now());
		item.setRemainingQuantity(soSuat);
		when(monAn.findById(id)).thenReturn(Optional.of(item));
		return item;
	}

	@Test
	@DisplayName("đặt được cả công tắc lẫn số suất trong MỘT lượt")
	void datDuocCaHaiTrongMotLuot() {
		MenuItemEntity pho = mon("m_pho", false, null);
		MenuItemEntity com = mon("m_com", true, null);

		int daSua = service.chuanBiThucDonHomNay(List.of(
				new ChuanBiMonRequest("m_pho", true, 40),
				new ChuanBiMonRequest("m_com", false, null)));

		assertThat(daSua).isEqualTo(2);
		assertThat(pho.isAvailable()).isTrue();
		assertThat(pho.getRemainingQuantity()).isEqualTo(40);
		assertThat(com.isAvailable()).isFalse();
	}

	@Test
	@DisplayName("SỐ SUẤT VỀ 0 KHÔNG ĐƯỢC TỰ TẮT CÔNG TẮC")
	void hetSuatKhongDungToiCongTac() {
		// Ca quan trọng nhất của bản này, và là thứ dễ bị "dọn cho gọn" nhất về sau.
		//
		// "Bán hết mẻ hôm nay" là một phép ĐẾM. "Hôm nay quán không bán món này" là một QUYẾT ĐỊNH
		// của người. Chúng trông giống nhau trên màn hình khách — món biến mất trong cả hai ca —
		// nhưng đó là chỗ duy nhất chúng giống nhau.
		//
		// Nếu hết suất ghi luôn `is_available = false`, thì sáng hôm sau lúc quản trị viên ngồi
		// xuống đặt lại thực đơn, hệ thống không còn phân biệt được đâu là món cháy hàng đâu là món
		// mình cố ý tắt. Thông tin đó mất VĨNH VIỄN, và báo cáo hết khả năng nói "món này hết sớm,
		// mai nhập thêm".
		//
		// Khách vẫn không gọi được món hết suất — việc ẩn đó do bộ lọc lúc hiển thị của
		// MenuQueryService làm, cộng thêm phép trừ tồn kho nguyên tử trong OrderService chặn lần
		// cuối. Không cần đụng tới công tắc để đạt điều đó.
		MenuItemEntity pho = mon("m_pho", true, 5);

		service.chuanBiThucDonHomNay(List.of(new ChuanBiMonRequest("m_pho", true, 0)));

		assertThat(pho.getRemainingQuantity()).isZero();
		assertThat(pho.isAvailable()).as("công tắc là quyết định của người, không phải phép đếm").isTrue();
	}

	@Test
	@DisplayName("null là GIỮ NGUYÊN, không phải xoá")
	void nullLaGiuNguyen() {
		// Cùng luật với `prepMinutes` ở MenuItemPrepMinutesTest. Một client chưa biết trường mới —
		// script nhập liệu, lệnh curl, bản giao diện cũ — không được im lặng thổi bay số suất chỉ
		// vì nó bật/tắt một món.
		MenuItemEntity pho = mon("m_pho", true, 40);

		service.chuanBiThucDonHomNay(List.of(new ChuanBiMonRequest("m_pho", false, null)));

		assertThat(pho.isAvailable()).isFalse();
		assertThat(pho.getRemainingQuantity()).as("số suất phải còn nguyên").isEqualTo(40);
	}

	@Test
	@DisplayName("món không đổi gì thì KHÔNG ghi — bảng bếp không nhấp nháy vô cớ")
	void khongDoiThiKhongGhi() {
		// Giao diện chỉ gửi món đã sửa, nhưng máy chủ không được tin điều đó. Ghi lại cả 91 món thì
		// bản ghi nào cũng bị chạm `updated_at`, và mọi màn hình đang nghe thay đổi thực đơn sẽ vẽ
		// lại toàn bộ giữa giờ đông khách.
		mon("m_pho", true, 40);

		int daSua = service.chuanBiThucDonHomNay(List.of(new ChuanBiMonRequest("m_pho", true, 40)));

		assertThat(daSua).isZero();
		verify(monAn, never()).save(any(MenuItemEntity.class));
	}

	@Test
	@DisplayName("số suất âm bị chặn")
	void chanSoAm() {
		mon("m_pho", true, 40);

		assertThatThrownBy(() -> service.chuanBiThucDonHomNay(
				List.of(new ChuanBiMonRequest("m_pho", true, -1))))
				.isInstanceOf(ApiException.class)
				.hasMessageContaining("âm");
	}

	@Test
	@DisplayName("món không tồn tại làm HỎNG CẢ LƯỢT, không âm thầm bỏ qua")
	void monLaLamHongCaLuot() {
		// Cả lượt nằm trong một giao dịch. Món lạ nghĩa là giao diện và cơ sở dữ liệu đang bất đồng
		// về thực đơn đang có — lưu một nửa danh sách trong tình huống đó thì thực đơn hôm nay ở
		// một trạng thái không ai chọn, và người sửa không biết mình dừng ở đâu.
		mon("m_pho", true, null);
		when(monAn.findById("m_khong_co")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.chuanBiThucDonHomNay(List.of(
				new ChuanBiMonRequest("m_pho", true, 40),
				new ChuanBiMonRequest("m_khong_co", true, 10))))
				.isInstanceOf(ApiException.class);
	}

	@Test
	@DisplayName("danh sách rỗng bị chặn thay vì trả về 'đã sửa 0 món'")
	void chanDanhSachRong() {
		assertThatThrownBy(() -> service.chuanBiThucDonHomNay(List.of()))
				.isInstanceOf(ApiException.class);
	}
}
