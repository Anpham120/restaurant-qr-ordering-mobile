package com.cmc.restaurant.menu;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Món nào được bán vào lúc nào — sáng bán phở, trưa bán cơm, tối bán lẩu.
 *
 * <p>Lớp thuần, không đụng cơ sở dữ liệu và không đọc đồng hồ. Thời điểm là tham số, nên mọi luật
 * ở đây kiểm được bằng test thường thay vì phải chờ tới đúng 18:00.
 *
 * <p><b>Luật:</b> món KHÔNG gán ca nào thì bán CẢ NGÀY. Đây là quy ước quan trọng nhất, và là thứ
 * giữ cho 91 món đang có không đổi hành vi sau migration. Quy ước ngược lại — không gán nghĩa là
 * không bán — làm cả thực đơn biến mất khỏi màn hình khách ngay giây migration chạy xong.
 */
public final class LichPhucVu {

	/** Món -> các ca nó được gán. Món vắng mặt ở đây là món bán cả ngày. */
	private final Map<String, Set<String>> caCuaMon;

	/** Các ca đang mở tại thời điểm đang xét. */
	private final Set<String> caDangMo;

	private LichPhucVu(Map<String, Set<String>> caCuaMon, Set<String> caDangMo) {
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

		return new LichPhucVu(theoMon, dangMo);
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
}
