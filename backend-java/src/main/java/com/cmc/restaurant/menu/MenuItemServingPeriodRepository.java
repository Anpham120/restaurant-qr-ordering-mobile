package com.cmc.restaurant.menu;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemServingPeriodRepository
		extends JpaRepository<MenuItemServingPeriodEntity, String> {

	List<MenuItemServingPeriodEntity> findByMenuItemId(String menuItemId);

	void deleteByMenuItemId(String menuItemId);
}
