package com.cmc.restaurant.tables;

import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quét phiên bàn đã quá hạn, định kỳ — thay cho việc chỉ xử lý khi có ai chạm vào phiên.
 *
 * <p><b>Vì sao cần.</b> {@code expireIfPast} là đường xử lý duy nhất, và nó chỉ chạy khi có người
 * CHẠM vào phiên: mở phiên mới cho bàn đó, khách mở lại app, quầy bấm gọi nhân viên. Bàn không ai
 * chạm thì không bao giờ được đánh dấu — <b>mà đó chính là bàn cần chú ý nhất: bàn khách đã bỏ
 * đi</b>.
 *
 * <p>Đo được trên cơ sở dữ liệu thật trước bản này: 3 phiên đang mở và đã quá hạn, 0 phiên có
 * {@code overdue_since}. Danh sách "bàn quá giờ" hiện RỖNG trong khi có ba bàn cần đi đòi tiền —
 * một cái đèn báo chỉ sáng khi có người đi ngang qua nó.
 *
 * <p><b>KHÔNG thay thế phần suy lúc đọc.</b> {@code TableSession.mocQuaGio} vẫn suy ra mốc quá giờ
 * khi đọc, và đó là chủ ý: tác vụ này chết, bị tắt, hay chưa kịp chạy thì màn quầy vẫn đúng. Một
 * cơ chế cứu mà màn hình phụ thuộc hoàn toàn vào nó là một cơ chế cứu có thể im lặng biến mất.
 * Hai lớp nói cùng một sự thật; lớp này chỉ làm cho nó được GHI LẠI thay vì tính đi tính lại.
 *
 * <p><b>Vì sao 5 phút.</b> Hạn phiên tính bằng giờ và bước gia hạn là 1 giờ, nên độ chính xác dưới
 * phút không mang thêm thông tin gì. 5 phút là chậm nhất mà người trực quầy vẫn coi danh sách là
 * "đang sống", và đủ thưa để truy vấn không đáng kể.
 */
@Component
public class QuetPhienQuaHanJob {

	private static final Logger log = LoggerFactory.getLogger(QuetPhienQuaHanJob.class);

	private final TableSessionRepository sessions;
	private final ResumeStateQueryService resumeState;

	public QuetPhienQuaHanJob(
			TableSessionRepository sessions, ResumeStateQueryService resumeState) {
		this.sessions = sessions;
		this.resumeState = resumeState;
	}

	@Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
	public void chay() {
		chayLuc(OffsetDateTime.now());
	}

	/**
	 * Tách khỏi {@link #chay()} để gọi được với một mốc thời gian bất kỳ.
	 *
	 * <p>Một tác vụ chỉ chạy được khi đồng hồ tới đúng lúc là một tác vụ không kiểm chứng được.
	 *
	 * @return số phiên thật sự đổi trạng thái
	 */
	@Transactional
	public int chayLuc(OffsetDateTime now) {
		int daSua = 0;

		for (TableSessionEntity phien : sessions.timPhienQuaHan(TableSessionStatus.Open, now)) {
			// Dùng lại ĐÚNG hàm mà đường chạm-vào-phiên dùng. Viết một nhánh riêng cho tác vụ nền
			// là tạo bản thứ hai của luật hết hạn, rồi chờ hai bản lệch nhau — và lệch ở đây nghĩa
			// là hai người nhìn cùng một bàn thấy hai trạng thái khác nhau.
			boolean conNo = resumeState.resolve(phien.getId()).conNoTien();
			if (phien.expireIfPast(now, conNo)) {
				sessions.save(phien);
				daSua++;
				log.info(
						"Phiên {} bàn {} quá hạn: {}",
						phien.getId(), phien.getTableCode(), conNo ? "còn nợ -> gia hạn + đánh dấu" : "đóng");
			}
		}

		if (daSua > 0) {
			log.info("Quét phiên quá hạn: xử lý {} phiên.", daSua);
		}
		return daSua;
	}
}
