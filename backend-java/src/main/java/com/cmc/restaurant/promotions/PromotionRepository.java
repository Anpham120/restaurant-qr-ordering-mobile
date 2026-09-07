package com.cmc.restaurant.promotions;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionRepository extends JpaRepository<PromotionEntity, String> {

	Optional<PromotionEntity> findByCode(String code);

	// --- quản trị khuyến mãi (#93) ---------------------------------------------------------------

	/** Flash sale lên đầu rồi tới mã thường, mỗi nhóm sắp theo mã — đúng thứ tự bản .NET. */
	List<PromotionEntity> findAllByOrderByFlashSaleDescCodeAsc();

	boolean existsByCode(String code);

	/** Trùng mã với một khuyến mãi KHÁC — dùng khi sửa, để không tự báo trùng với chính nó. */
	boolean existsByCodeAndIdNot(String code, String id);

	/**
	 * Ghi nhận một lượt dùng. Trả về 1 nếu còn lượt, 0 nếu đã hết.
	 *
	 * <p>Một câu UPDATE có điều kiện chứ không phải đọc-rồi-ghi: hai người cùng dùng nốt lượt
	 * cuối trong một phần nghìn giây là tình huống CÓ THẬT với mã bị chia sẻ, và kiểm ở tầng Java
	 * rồi mới ghi sẽ cho cả hai cùng qua. Ràng buộc ở đây phải do cơ sở dữ liệu giữ.
	 */
	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.data.jpa.repository.Query("""
			update PromotionEntity p set p.usedCount = p.usedCount + 1
			where p.id = :id and (p.usageLimit is null or p.usedCount < p.usageLimit)
			""")
	int ghiNhanMotLuot(@org.springframework.data.repository.query.Param("id") String id);
}
