package com.cmc.restaurant.menu;

import com.cmc.restaurant.menu.MenuDtos.ServingPeriodRequest;
import com.cmc.restaurant.menu.MenuDtos.ServingPeriodResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Ca phục vụ do quán tự khai — sáng bán phở, trưa bán cơm, tối bán lẩu. Admin-only. */
@RestController
@RequestMapping("/api/admin/serving-periods")
@PreAuthorize("hasRole('Admin')")
public class AdminServingPeriodController {

	private final ServingPeriodService servingPeriodService;

	public AdminServingPeriodController(ServingPeriodService servingPeriodService) {
		this.servingPeriodService = servingPeriodService;
	}

	@GetMapping
	public List<ServingPeriodResponse> list() {
		return servingPeriodService.danhSach().stream()
				.map(ServingPeriodService::toResponse)
				.toList();
	}

	@PostMapping
	public ResponseEntity<ServingPeriodResponse> create(@RequestBody ServingPeriodRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ServingPeriodService.toResponse(servingPeriodService.tao(request)));
	}

	@PutMapping("/{periodId}")
	public ServingPeriodResponse update(
			@PathVariable String periodId, @RequestBody ServingPeriodRequest request) {
		return ServingPeriodService.toResponse(servingPeriodService.sua(periodId, request));
	}

	@DeleteMapping("/{periodId}")
	public ResponseEntity<Void> delete(@PathVariable String periodId) {
		servingPeriodService.xoa(periodId);
		return ResponseEntity.noContent().build();
	}
}
