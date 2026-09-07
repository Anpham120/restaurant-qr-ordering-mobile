package com.cmc.restaurant.orders.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Món xếp hàng SAU những món nào.
 *
 * <p><b>Nghiệp vụ được canh ở đây.</b> Bản trước dùng một hàng đợi cho cả quán, nên ly bia phải
 * xếp sau toàn bộ việc bếp. Đo trên thực đơn thật, ca tối 31 món với 195 phút việc bếp: ly bia ra
 * <b>30–49 phút</b> — trong khi việc thật là mở tủ lạnh.
 */
class TramChuanBiTest {

	@Test
	@DisplayName("có nhãn method: là qua BẾP — nhãn đó chính là dấu hiệu")
	void coNhanMethodLaQuaBep() {
		// 57/91 món của thực đơn thật rơi vào nhánh này. Không cần tra danh mục: món đã khai cách
		// chế biến thì đương nhiên có người đứng bếp làm nó.
		assertThat(TramChuanBi.cua(List.of("method:simmered", "region:north"), "cat_noodle"))
				.isEqualTo(TramChuanBi.BEP);
		assertThat(TramChuanBi.cua(List.of("method:whole_roast"), "cat_chicken"))
				.isEqualTo(TramChuanBi.BEP);
	}

	@Test
	@DisplayName("cà phê và nước ép về QUẦY PHA CHẾ")
	void phaCheVeQuay() {
		assertThat(TramChuanBi.cua(List.of("price:budget"), "cat_drink")).isEqualTo(TramChuanBi.QUAY);
		assertThat(TramChuanBi.cua(List.of(), "cat_juice")).isEqualTo(TramChuanBi.QUAY);
	}

	@Test
	@DisplayName("bia, trái cây, tráng miệng là LẤY SẴN — và lớp này KHÔNG xếp hàng")
	void laySanThiKhongXepHang() {
		// Đây là lớp thứ ba, và nó tồn tại vì một phép đo. Bản nháp đầu chỉ tách hai trạm — bếp và
		// quầy — thì ly bia vẫn ra 14–24 phút, vì mô hình hàng đợi giả định việc làm NỐI TIẾP.
		// Người pha chế lấy sáu chai bia là mở tủ MỘT lần, không phải sáu lần.
		for (String danhMuc : List.of("cat_alcohol", "cat_fruit", "cat_dessert")) {
			assertThat(TramChuanBi.cua(List.of(), danhMuc)).isEqualTo(TramChuanBi.SAN);
		}
		assertThat(TramChuanBi.SAN.coHangDoi()).isFalse();
		assertThat(TramChuanBi.BEP.coHangDoi()).isTrue();
		assertThat(TramChuanBi.QUAY.coHangDoi()).isTrue();
	}

	@Test
	@DisplayName("nhãn method THẮNG danh mục")
	void nhanThangDanhMuc() {
		// Thực đơn thật có ĐÚNG một ca như vậy: "Bánh chuối nướng" nằm ở Tráng miệng nhưng mang
		// `method:grilled` — nó ra lò, không phải múc từ mẻ làm sẵn. Sáu món tráng miệng còn lại
		// (chè, bánh flan, sương sa) đều không có nhãn nào và đúng là lấy sẵn.
		//
		// Tra danh mục TRƯỚC thì món này bị xếp vào lớp không hàng đợi, và khách được hứa một con
		// số quán không giữ được.
		assertThat(TramChuanBi.cua(List.of("method:grilled"), "cat_dessert"))
				.isEqualTo(TramChuanBi.BEP);
	}

	@Test
	@DisplayName("danh mục LẠ rơi về BẾP — sai theo hướng an toàn")
	void danhMucLaVeBep() {
		// Quán thêm danh mục mới mà quên khai trạm là chuyện sẽ xảy ra. Báo lâu hơn thực tế thì
		// khách ngạc nhiên dễ chịu; báo nhanh hơn thực tế thì khách ngồi đợi và mất tin.
		assertThat(TramChuanBi.cua(List.of(), "cat_danh_muc_moi")).isEqualTo(TramChuanBi.BEP);
		assertThat(TramChuanBi.cua(List.of(), null)).isEqualTo(TramChuanBi.BEP);
		assertThat(TramChuanBi.cua(null, null)).isEqualTo(TramChuanBi.BEP);
	}

	@Test
	@DisplayName("nhãn rỗng hoặc nhãn lạ không làm đổi kết luận")
	void nhanLaKhongDoiKetLuan() {
		// Đối chứng: hàm chỉ được nhìn tiền tố `method:`. Một hàm quét cả nhãn khác sẽ xếp nhầm
		// "Bia Hà Nội" mang nhãn `region:north` vào bếp.
		assertThat(TramChuanBi.cua(List.of("region:north", "price:budget"), "cat_alcohol"))
				.isEqualTo(TramChuanBi.SAN);
	}

	/**
	 * Mọi danh mục {@code shop_} trong seed phải được khai trạm, không rơi vào nhánh mặc định.
	 *
	 * <p>Nhánh mặc định trả {@link TramChuanBi#BEP} — an toàn theo hướng báo lâu hơn, nhưng với
	 * một ly trà sữa thì "an toàn" nghĩa là khách bị báo phải đợi sau cả hàng đợi bếp. Đúng loại
	 * sai mà enum này được viết ra để chữa, nên với thực đơn quán nó không còn là mặc định chấp
	 * nhận được mà là một chỗ quên.
	 *
	 * <p>Phép kiểm đọc thẳng migration chứ không chép lại danh sách: một danh sách chép tay ở đây
	 * sẽ quên đúng lúc có người thêm danh mục — tức đúng lúc cần nó nhất.
	 */
	@Test
	@DisplayName("mọi danh mục shop_ trong seed đều được khai trạm")
	void moiDanhMucShopDeuDuocKhaiTram() throws IOException {
		Pattern khaiDanhMuc = Pattern.compile("\\('(shop_[a-z_]+)','[^']+',\\d+,true,now");
		List<String> danhMuc = new ArrayList<>();
		try (Stream<Path> tep = Files.list(Path.of("src/main/resources/db/migration"))) {
			for (Path p : tep.filter(f -> f.toString().endsWith(".sql")).sorted().toList()) {
				Matcher m = khaiDanhMuc.matcher(Files.readString(p));
				while (m.find()) {
					danhMuc.add(m.group(1));
				}
			}
		}

		assertThat(danhMuc).isNotEmpty();
		for (String cat : danhMuc) {
			assertThat(TramChuanBi.cua(List.of(), cat))
					.describedAs("%s chưa được khai trong DANH_MUC_QUAY hay DANH_MUC_SAN", cat)
					.isNotEqualTo(TramChuanBi.BEP);
		}
	}
}
