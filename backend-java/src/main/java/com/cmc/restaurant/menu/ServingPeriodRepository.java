package com.cmc.restaurant.menu;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServingPeriodRepository extends JpaRepository<ServingPeriodEntity, String> {

	List<ServingPeriodEntity> findAllByOrderByDisplayOrderAscStartTimeAsc();
}
