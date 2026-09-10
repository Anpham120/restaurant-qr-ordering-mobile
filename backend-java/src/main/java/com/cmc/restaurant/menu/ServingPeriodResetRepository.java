package com.cmc.restaurant.menu;

import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServingPeriodResetRepository
		extends JpaRepository<ServingPeriodResetEntity, ServingPeriodResetEntity.Khoa> {

	boolean existsByServingPeriodIdAndNgayPhucVu(String servingPeriodId, LocalDate ngayPhucVu);
}
