package com.cmc.restaurant.menu;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemPeriodStockRepository
		extends JpaRepository<MenuItemPeriodStockEntity, String> {

	List<MenuItemPeriodStockEntity> findByServingPeriodId(String servingPeriodId);

	Optional<MenuItemPeriodStockEntity> findByMenuItemIdAndServingPeriodId(
			String menuItemId, String servingPeriodId);
}
