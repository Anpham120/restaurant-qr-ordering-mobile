package com.cmc.restaurant.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.time.OffsetDateTime;

/**
 * Một ca phục vụ do quán tự khai: "Trưa 10:00-14:00", "Lẩu đêm 18:00-02:00".
 *
 * <p>Không đóng cứng sáng/trưa/chiều/tối vì quán này mở 10:00-14:00 và 18:00-22:00 — hai trong bốn
 * khung cố định sẽ chết ngay từ đầu, và quán nào mở khác giờ lại phải sửa mã.
 */
@Entity
@Table(name = "serving_periods")
public class ServingPeriodEntity {

	@Id
	private String id;

	@Column(nullable = false)
	private String name;

	@Column(name = "start_time", nullable = false)
	private LocalTime startTime;

	/**
	 * Giờ kết thúc. NHỎ HƠN {@link #startTime} nghĩa là ca bọc qua nửa đêm — xem
	 * {@link #dangMoLuc(LocalTime)}.
	 */
	@Column(name = "end_time", nullable = false)
	private LocalTime endTime;

	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	protected ServingPeriodEntity() {
		// JPA
	}

	public ServingPeriodEntity(
			String id, String name, LocalTime startTime, LocalTime endTime, int displayOrder,
			OffsetDateTime now) {
		this.id = id;
		this.name = name;
		this.startTime = startTime;
		this.endTime = endTime;
		this.displayOrder = displayOrder;
		this.createdAt = now;
		this.updatedAt = now;
	}

	/**
	 * Ca này có đang mở vào lúc {@code luc} không.
	 *
	 * <p><b>Đầu ca tính vào, cuối ca không.</b> 14:00 đúng KHÔNG thuộc ca 10:00-14:00. Phải như vậy
	 * thì hai ca liền nhau — 10:00-14:00 và 14:00-18:00 — mới không cùng mở tại đúng 14:00, và một
	 * món gán cho cả hai không bị đếm hai lần.
	 *
	 * <p><b>Ca bọc qua nửa đêm.</b> "Lẩu đêm 18:00-02:00" có {@code startTime > endTime}. Phép so
	 * thẳng {@code start <= t && t < end} trả về SAI cho MỌI thời điểm với ca như vậy — ca đó im
	 * lặng không bao giờ mở, và món lẩu đêm không bao giờ hiện. Nên phải tách hai nhánh.
	 */
	public boolean dangMoLuc(LocalTime luc) {
		if (startTime.isBefore(endTime)) {
			return !luc.isBefore(startTime) && luc.isBefore(endTime);
		}
		// Bọc qua nửa đêm: từ giờ bắt đầu tới hết ngày, HOẶC từ đầu ngày hôm sau tới giờ kết thúc.
		return !luc.isBefore(startTime) || luc.isBefore(endTime);
	}

	public String getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public LocalTime getStartTime() {
		return startTime;
	}

	public void setStartTime(LocalTime startTime) {
		this.startTime = startTime;
	}

	public LocalTime getEndTime() {
		return endTime;
	}

	public void setEndTime(LocalTime endTime) {
		this.endTime = endTime;
	}

	public void setName(String name) {
		this.name = name;
	}

	public int getDisplayOrder() {
		return displayOrder;
	}

	public void setDisplayOrder(int displayOrder) {
		this.displayOrder = displayOrder;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(OffsetDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
