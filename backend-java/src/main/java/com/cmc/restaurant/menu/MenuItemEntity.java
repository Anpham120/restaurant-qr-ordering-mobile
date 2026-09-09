package com.cmc.restaurant.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "menu_items")
public class MenuItemEntity {

	@Id
	private String id;

	@Column(name = "category_id", nullable = false)
	private String categoryId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String description;

	@Column(nullable = false, precision = 18, scale = 2)
	private BigDecimal price;

	/**
	 * Giá vốn. NULL nghĩa là CHƯA NHẬP, không phải bằng 0 — xem V34.
	 *
	 * <p>Nullable có chủ ý: bắt buộc nhập sẽ khoá mọi thao tác sửa món cho tới khi ai đó ngồi điền
	 * 91 con số, và một con số điền vội cho qua còn tệ hơn một ô để trống.
	 */
	@Column(name = "cost_price", precision = 18, scale = 2)
	private BigDecimal costPrice;

	/**
	 * Số phần còn bán được. {@code null} = KHÔNG GIỚI HẠN, không phải bằng 0.
	 *
	 * <p>Mặc định null cho mọi món: quán nào không muốn đếm phần thì không phải nhập gì, và hành vi
	 * cũ giữ nguyên. Chọn 0 làm mặc định sẽ khoá sạch thực đơn ngay lúc triển khai.
	 */
	@Column(name = "remaining_quantity")
	private Integer remainingQuantity;

	/**
	 * Số phút bếp khai thêm RIÊNG cho món này, chỉ có hiệu lực tới {@link #delayExpiresAt}.
	 *
	 * <p>Khác với {@code kitchen_delay} (độ trễ của CẢ bếp) và CỘNG DỒN với nó: một cái nói "cả bếp
	 * đang chậm", cái này nói "riêng món này đang chậm".
	 *
	 * <p>Đọc qua {@link #delayConHieuLuc}, KHÔNG đọc thẳng trường này — quá hạn thì con số phải là
	 * 0, và mọi chỗ tự so mốc là mọi chỗ có thể quên so.
	 */
	@Column(name = "delay_minutes", nullable = false)
	private int delayMinutes;

	@Column(name = "delay_expires_at")
	private OffsetDateTime delayExpiresAt;

	@Column(name = "image_url")
	private String imageUrl;

	/**
	 * Phút từ lúc bếp nhận món tới lúc món sẵn sàng. {@code null} = chưa khai.
	 *
	 * <p>V11 tạo cột này và điền giá trị khởi tạo suy từ nhãn {@code method:}, kèm lời hứa "bếp sửa
	 * lại qua PATCH khi thấy sai". Lời hứa đó chưa bao giờ thành: entity KHÔNG ánh xạ cột, DTO không
	 * có trường, giao diện không có ô. Suốt từ V11 tới nay chỉ migration ghi được con số mà mọi ước
	 * lượng thời gian lên món đều dựa vào.
	 *
	 * <p>ĐÂY LÀ THỜI GIAN LÊN MÓN, KHÔNG PHẢI THỜI GIAN NẤU. Phở ninh nước dùng cả đêm nhưng múc ra
	 * bát chỉ vài phút.
	 */
	@Column(name = "prep_minutes")
	private Integer prepMinutes;

	@Column(name = "is_available", nullable = false)
	private boolean available;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(nullable = false, columnDefinition = "text[]")
	private List<String> tags;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	protected MenuItemEntity() {
		// JPA
	}

	public MenuItemEntity(String id, String categoryId, String name, String description, BigDecimal price,
			String imageUrl, boolean available, List<String> tags, OffsetDateTime now) {
		this.id = id;
		this.categoryId = categoryId;
		this.name = name;
		this.description = description;
		this.price = price;
		this.imageUrl = imageUrl;
		this.available = available;
		this.tags = tags;
		this.createdAt = now;
		this.updatedAt = now;
	}

	public String getId() {
		return id;
	}

	public String getCategoryId() {
		return categoryId;
	}

	public void setCategoryId(String categoryId) {
		this.categoryId = categoryId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public BigDecimal getPrice() {
		return price;
	}

	public void setPrice(BigDecimal price) {
		this.price = price;
	}

	public Integer getRemainingQuantity() {
		return remainingQuantity;
	}

	public void setRemainingQuantity(Integer remainingQuantity) {
		this.remainingQuantity = remainingQuantity;
	}

	public int getDelayMinutes() {
		return delayMinutes;
	}

	public OffsetDateTime getDelayExpiresAt() {
		return delayExpiresAt;
	}

	/**
	 * Độ trễ CÒN HIỆU LỰC tại thời điểm {@code now} — 0 nếu chưa khai hoặc đã quá hạn.
	 *
	 * <p>Một hàm, một chỗ so mốc. Trả trường thô ra ngoài rồi để người gọi tự so là mời mỗi nơi gọi
	 * quên một kiểu, và quên ở đây nghĩa là cộng oan phút cho khách sau khi độ trễ đã hết.
	 */
	public int delayConHieuLuc(OffsetDateTime now) {
		if (delayExpiresAt == null || !delayExpiresAt.isAfter(now)) {
			return 0;
		}
		return delayMinutes;
	}

	public void khaiDoTre(int phut, OffsetDateTime hetHanLuc) {
		this.delayMinutes = phut;
		this.delayExpiresAt = hetHanLuc;
	}

	public BigDecimal getCostPrice() {
		return costPrice;
	}

	public void setCostPrice(BigDecimal costPrice) {
		this.costPrice = costPrice;
	}

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	public boolean isAvailable() {
		return available;
	}

	public void setAvailable(boolean available) {
		this.available = available;
	}

	public List<String> getTags() {
		return tags;
	}

	public void setTags(List<String> tags) {
		this.tags = tags;
	}

	public Integer getPrepMinutes() {
		return prepMinutes;
	}

	public void setPrepMinutes(Integer prepMinutes) {
		this.prepMinutes = prepMinutes;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(OffsetDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
