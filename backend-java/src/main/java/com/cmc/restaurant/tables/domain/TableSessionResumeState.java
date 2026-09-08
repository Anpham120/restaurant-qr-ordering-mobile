package com.cmc.restaurant.tables.domain;

/** Mirrors {@code TableSessionResumeState} (.NET) enum values exactly (used as a JSON string). */
public enum TableSessionResumeState {
	New,
	CartPending,
	OrderInProgress,
	ReadyForPayment,
	PaymentPending,
	Paid;

	/**
	 * Phiên còn tiền chưa thu xong.
	 *
	 * <p>Luật này ở ĐÂY, không viết lại ở mỗi chỗ cần: đóng phiên bằng tay và hết hạn tự động đều
	 * phải hỏi đúng một câu, và hai bản sao của cùng một câu hỏi là hình dạng lỗi đã xảy ra bốn
	 * lần trong kho này (xem docs/THIET_KE_NGHIEP_VU.md §23).
	 *
	 * <p>{@code PaymentPending} tính là CÒN NỢ: hoá đơn đã lập nhưng tiền chưa vào. Đóng phiên lúc
	 * đó là bỏ dở một lần chuyển khoản đang bay — người trả tiền vẫn có thể chuyển thành công vài
	 * giây sau.
	 *
	 * <p>{@code CartPending} KHÔNG tính: giỏ hàng chưa gửi đi thì chưa có món nào được làm, chưa ai
	 * nợ ai. Đó đúng là trường hợp hạn 4 giờ sinh ra để dọn.
	 */
	public boolean conNoTien() {
		return this == OrderInProgress || this == ReadyForPayment || this == PaymentPending;
	}
}
