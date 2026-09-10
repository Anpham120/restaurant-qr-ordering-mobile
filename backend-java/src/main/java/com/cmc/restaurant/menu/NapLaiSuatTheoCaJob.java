package com.cmc.restaurant.menu;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * NẠP LẠI SỐ SUẤT KHI MỘT CA MỞ — trưa bán hết mẻ thì tối vẫn bán được mẻ mới.
 *
 * <p><b>Vì sao cần.</b> {@code menu_items.remaining_quantity} là một con số cho cả ngày và không
 * bao giờ tự nạp lại. Bán hết mẻ trưa là món khoá luôn tới tối, dù tối bếp nấu mẻ mới. Cách duy
 * nhất để mở lại là có người nhớ vào gõ số — và "có người nhớ" chính là thứ đã làm ô số suất nằm
 * im suốt từ lúc nó được thêm vào.
 *
 * <p><b>Tác vụ này GHI ĐÈ số suất sống, nên nó là đoạn mã nguy hiểm nhất của tính năng.</b> Chạy
 * nhầm một lần giữa ca là xoá sạch phần đã bán, và quán bán vượt số suất mà không ai biết. Hai
 * thứ giữ nó khỏi làm vậy:
 *
 * <ol>
 *   <li><b>Sổ ghi đã nạp</b> khoá theo (ca, ngày phục vụ). Ghi TRƯỚC khi nạp, nên lần chạy thứ hai
 *       đụng khoá trùng và dừng. Đúng cả khi tác vụ chạy mỗi 5 phút, cả khi có hai tiến trình máy
 *       chủ cùng chạy.
 *   <li><b>Ngày phục vụ là ngày ca BẮT ĐẦU</b>, không phải ngày trên lịch. Ca lẩu đêm 18:00-02:00
 *       giữ nguyên ngày đó tới lúc đóng, nên đúng nửa đêm sổ vẫn có dòng và tác vụ không nạp lại
 *       giữa ca.
 * </ol>
 *
 * <p><b>Món KHÔNG cấu hình số suất cho ca này thì KHÔNG bị đụng tới.</b> Không có dòng trong
 * {@code menu_item_period_stock} nghĩa là ca đó không quản số suất cho món đó. Bảng ấy rỗng sau
 * migration, nên tác vụ này không làm gì cả cho tới khi quán thật sự cấu hình.
 *
 * <p><b>Vì sao 5 phút.</b> Ca tính bằng giờ, nên độ chính xác dưới phút không mang thêm thông tin.
 * Đổi lại, một ca có thể được nạp muộn nhất 5 phút sau giờ mở. Đó là đánh đổi có chủ ý: nạp muộn
 * vài phút thì vài khách đầu ca thấy món chưa mở lại, còn quét mỗi giây thì mỗi giây là một cơ hội
 * cho một lần ghi đè sai.
 */
@Component
public class NapLaiSuatTheoCaJob {

	private static final Logger log = LoggerFactory.getLogger(NapLaiSuatTheoCaJob.class);

	/** Ca phục vụ là giờ treo tường của quán, không phải giờ máy chủ (máy chủ chạy UTC). */
	private static final ZoneId MUI_GIO_QUAN = ZoneId.of("Asia/Ho_Chi_Minh");

	private final ServingPeriodRepository caRepository;
	private final MenuItemPeriodStockRepository suatTheoCaRepository;
	private final ServingPeriodResetRepository soGhiRepository;
	private final MenuItemRepository monRepository;

	public NapLaiSuatTheoCaJob(
			ServingPeriodRepository caRepository,
			MenuItemPeriodStockRepository suatTheoCaRepository,
			ServingPeriodResetRepository soGhiRepository,
			MenuItemRepository monRepository) {
		this.caRepository = caRepository;
		this.suatTheoCaRepository = suatTheoCaRepository;
		this.soGhiRepository = soGhiRepository;
		this.monRepository = monRepository;
	}

	@Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
	public void chay() {
		chayLuc(LocalDateTime.now(MUI_GIO_QUAN));
	}

	/**
	 * Tách khỏi {@link #chay()} để gọi được với một mốc thời gian bất kỳ.
	 *
	 * <p>Một tác vụ chỉ chạy được khi đồng hồ tới đúng lúc là một tác vụ không kiểm chứng được — và
	 * tác vụ này thì phải kiểm được ở đúng nửa đêm.
	 *
	 * @return số món thật sự được nạp lại
	 */
	@Transactional
	public int chayLuc(LocalDateTime luc) {
		int daNap = 0;

		for (ServingPeriodEntity ca : caRepository.findAll()) {
			if (!ca.dangMoLuc(luc.toLocalTime())) {
				continue;
			}
			LocalDate ngay = ca.ngayPhucVu(luc);
			if (soGhiRepository.existsByServingPeriodIdAndNgayPhucVu(ca.getId(), ngay)) {
				continue;
			}
			daNap += napMotCa(ca, ngay);
		}
		return daNap;
	}

	private int napMotCa(ServingPeriodEntity ca, LocalDate ngay) {
		List<MenuItemPeriodStockEntity> canNap = suatTheoCaRepository.findByServingPeriodId(ca.getId());

		int soMon = 0;
		for (MenuItemPeriodStockEntity suat : canNap) {
			// Ghi thẳng con số dự kiến, KHÔNG cộng dồn vào phần còn thừa của ca trước. Ca mới là
			// mẻ nguyên liệu mới; cộng dồn sẽ làm số suất phình dần qua từng ca cho tới lúc nó
			// không còn nói lên điều gì.
			if (monRepository.datTonKho(suat.getMenuItemId(), suat.getPlannedQuantity()) == 1) {
				soMon++;
			}
		}

		// Ghi sổ KỂ CẢ khi không món nào được nạp. Sổ ghi trả lời câu "ca này đã tới lượt nạp
		// chưa", không phải "có nạp được gì không". Bỏ qua khi rỗng thì mỗi vòng quét 5 phút lại
		// thử lại cả ca đó suốt ngày.
		soGhiRepository.save(new ServingPeriodResetEntity(
				ca.getId(), ngay, OffsetDateTime.now(), soMon));

		if (soMon > 0) {
			log.info("Ca {} ({}) mở: đã nạp lại số suất cho {} món.", ca.getName(), ngay, soMon);
		}
		return soMon;
	}
}
