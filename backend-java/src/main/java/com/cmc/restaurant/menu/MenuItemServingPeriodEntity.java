package com.cmc.restaurant.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Món này được bán trong ca này.
 *
 * <p>Bảng nối chứ không phải cột mảng trên {@code menu_items}, dù {@code tags} đã là {@code text[]}
 * và cột mảng sẽ tốn ít mã hơn. Lý do là HƯỚNG HỎNG: xoá một ca mà món còn giữ id mồ côi thì món
 * biến mất khỏi thực đơn khách, im lặng. Với bảng nối, {@code ON DELETE CASCADE} dọn phần gán và
 * món quay về "không gán ca nào" = bán cả ngày, tức là VẪN HIỆN.
 *
 * <p>Khoá chính thay thế thay vì khoá kép, để khớp lối ánh xạ của mọi entity khác trong mã này —
 * không có {@code @IdClass} nào ở đâu cả. Tính duy nhất do ràng buộc
 * {@code uq_menu_item_serving_period} bảo đảm.
 */
@Entity
@Table(name = "menu_item_serving_periods")
public class MenuItemServingPeriodEntity {

	@Id
	private String id;

	@Column(name = "menu_item_id", nullable = false)
	private String menuItemId;

	@Column(name = "serving_period_id", nullable = false)
	private String servingPeriodId;

	protected MenuItemServingPeriodEntity() {
		// JPA
	}

	public MenuItemServingPeriodEntity(String id, String menuItemId, String servingPeriodId) {
		this.id = id;
		this.menuItemId = menuItemId;
		this.servingPeriodId = servingPeriodId;
	}

	public String getId() {
		return id;
	}

	public String getMenuItemId() {
		return menuItemId;
	}

	public String getServingPeriodId() {
		return servingPeriodId;
	}
}
