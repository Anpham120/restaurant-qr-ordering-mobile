package com.cmc.restaurant.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Số suất DỰ KIẾN của một món trong một ca — cái được chép sang khi ca mở.
 *
 * <p>Không có dòng nghĩa là ca đó KHÔNG quản số suất cho món này, và món giữ nguyên con số đang
 * có. Đó là mặc định, và nó giữ hành vi cũ cho mọi món chưa được cấu hình.
 *
 * <p>Số suất SỐNG vẫn nằm ở {@code menu_items.remaining_quantity}, không chuyển vào đây: phép trừ
 * tồn kho nguyên tử của module orders khoá đúng một hàng {@code menu_items}, và đó là chỗ duy nhất
 * chặn được hai khách cùng gọi phần cuối cùng.
 */
@Entity
@Table(name = "menu_item_period_stock")
public class MenuItemPeriodStockEntity {

	@Id
	private String id;

	@Column(name = "menu_item_id", nullable = false)
	private String menuItemId;

	@Column(name = "serving_period_id", nullable = false)
	private String servingPeriodId;

	@Column(name = "planned_quantity", nullable = false)
	private int plannedQuantity;

	protected MenuItemPeriodStockEntity() {
		// JPA
	}

	public MenuItemPeriodStockEntity(
			String id, String menuItemId, String servingPeriodId, int plannedQuantity) {
		this.id = id;
		this.menuItemId = menuItemId;
		this.servingPeriodId = servingPeriodId;
		this.plannedQuantity = plannedQuantity;
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

	public int getPlannedQuantity() {
		return plannedQuantity;
	}

	public void setPlannedQuantity(int plannedQuantity) {
		this.plannedQuantity = plannedQuantity;
	}
}
