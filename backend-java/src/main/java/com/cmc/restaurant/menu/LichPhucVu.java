package com.cmc.restaurant.menu;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Set;

/**
 * Món nào được bán vào lúc nào, theo đúng ca mà QUẢN LÝ đã đặt. Không có buổi nào mặc định bán
 * món gì; ví dụ "sáng phở, trưa cơm, tối lẩu" chỉ là một cách quán CÓ THỂ cấu hình.
 *
 * <p>Lớp thuần, không đụng cơ sở dữ liệu và không đọc đồng hồ. Thời điểm là tham số, nên mọi luật
 * ở đây kiểm được bằng test thường thay vì phải chờ tới đúng 18:00.
 *
 * <p><b>Luật:</b> món KHÔNG gán ca nào thì bán CẢ NGÀY. Đây là quy ước quan trọng nhất, và là thứ
 * giữ cho 91 món đang có không đổi hành vi sau migration. Quy ước ngược lại — không gán nghĩa là
 * không bán — làm cả thực đơn biến mất khỏi màn hình khách ngay giây migration chạy xong.
 */
public final class LichPhucVu {

	/**
	 * Ca phục vụ là GIỜ TREO TƯỜNG CỦA QUÁN, không phải giờ máy chủ.
	 *
	 * <p>Máy chủ chạy UTC. Đọc giờ máy chủ thẳng thì ca trưa 10:00-14:00 sẽ mở lúc 5 giờ chiều giờ
	 * Việt Nam — thực đơn sai bảy tiếng, mỗi ngày, và không có lỗi nào được ném ra.
	 *
	 * <p>Đặt ở đây, KHÔNG lặp lại ở từng nơi dùng. Hai bản sao của một múi giờ là hai thứ có thể
	 * lệch nhau, và lúc lệch thì thực đơn khách nhìn khác với thứ máy chủ cho phép đặt.
	 */
	public static final ZoneId MUI_GIO_QUAN = ZoneId.of("Asia/Ho_Chi_Minh");

	/** Món -> các ca nó được gán. Món vắng mặt ở đây là món bán cả ngày. */
	private final Map<String, Set<String>> caCuaMon;

	/** Mọi ca, tra theo id — để nói được TÊN và GIỜ của ca trong câu báo lỗi. */
	private final Map<String, ServingPeriodEntity> moiCa;

	/** Các ca đang mở tại thời điểm đang xét. */
	private final Set<String> caDangMo;

	private LichPhucVu(
			Map<String, Set<String>> caCuaMon, Set<String> caDangMo,
			Map<String, ServingPeriodEntity> moiCa) {
		this.moiCa = moiCa;
		this.caCuaMon = caCuaMon;
		this.caDangMo = caDangMo;
	}

	public static LichPhucVu tai(
			List<ServingPeriodEntity> tatCaCa,
			List<MenuItemServingPeriodEntity> phanGan,
			LocalTime luc) {
		Set<String> dangMo = new HashSet<>();
		for (ServingPeriodEntity ca : tatCaCa) {
			if (ca.dangMoLuc(luc)) {
				dangMo.add(ca.getId());
			}
		}

		Map<String, Set<String>> theoMon = new HashMap<>();
		for (MenuItemServingPeriodEntity gan : phanGan) {
			theoMon.computeIfAbsent(gan.getMenuItemId(), k -> new HashSet<>())
					.add(gan.getServingPeriodId());
		}

		Map<String, ServingPeriodEntity> tra = tatCaCa.stream()
				.collect(Collectors.toMap(ServingPeriodEntity::getId, c -> c, (a, b) -> a));
		return new LichPhucVu(theoMon, dangMo, tra);
	}

	/**
	 * Món này có đang trong ca phục vụ của nó không.
	 *
	 * <p>Ba ca, và ca giữa là ca dễ làm sai nhất:
	 *
	 * <pre>
	 *   không gán ca nào     -> LUÔN bán  (91 món hiện tại nằm hết ở đây)
	 *   gán ca, ca đang mở   -> bán
	 *   gán ca, ca đã đóng   -> không bán
	 * </pre>
	 *
	 * <p>Ngoài giờ mở cửa thì không ca nào đang mở, nên món có gán ca đều ẩn còn món bán cả ngày
	 * vẫn hiện. Đó là hành vi đúng và nó tự rơi ra từ hai luật trên, không cần ca riêng: quán chưa
	 * khai ca nào thì thực đơn chạy y như trước khi có tính năng này.
	 */
	public boolean dangTrongCa(String menuItemId) {
		Set<String> ca = caCuaMon.get(menuItemId);
		if (ca == null || ca.isEmpty()) {
			return true;
		}
		return ca.stream().anyMatch(caDangMo::contains);
	}

	/**
	 * Mô tả các ca của một món, để câu báo lỗi nói được món đó bán lúc nào.
	 *
	 * <p>"Món này không phục vụ lúc này" mà không nói lúc nào thì phục vụ là một lời từ chối bắt
	 * người ta đi hỏi. Trả về chuỗi rỗng nếu món không gán ca nào — khi đó nó bán cả ngày và câu
	 * này không bao giờ được dùng tới.
	 */
	public String moTaCa(String menuItemId) {
		Set<String> ca = caCuaMon.get(menuItemId);
		if (ca == null || ca.isEmpty()) {
			return "";
		}
		return ca.stream()
				.map(moiCa::get)
				.filter(java.util.Objects::nonNull)
				.sorted(java.util.Comparator.comparing(ServingPeriodEntity::getStartTime))
				.map(c -> c.getName() + " (" + c.getStartTime() + "-" + c.getEndTime() + ")")
				.collect(Collectors.joining(", "));
	}
}
