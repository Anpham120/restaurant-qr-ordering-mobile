package com.cmc.restaurant.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * SỔ GHI ĐÃ NẠP — thứ giữ cho tác vụ nạp lại số suất KHÔNG chạy hai lần cho cùng một ca.
 *
 * <p>Tác vụ nạp lại GHI ĐÈ số suất sống. Chạy nhầm một lần giữa ca là xoá sạch phần đã bán, và
 * quán bán vượt số suất mà không ai biết. Nên "đã nạp chưa" phải là một sự thật ĐƯỢC GHI LẠI trong
 * cơ sở dữ liệu, không phải một suy đoán từ đồng hồ.
 *
 * <p>Khoá kép (ca, ngày phục vụ) là thứ làm việc đó, và đây là lớp DUY NHẤT trong mã dùng
 * {@code @IdClass} — vì bản chất của bản ghi này là "một lần nạp cho một ca trong một ngày", và
 * một khoá thay thế sẽ cho phép ghi hai dòng cho cùng một cặp.
 *
 * <p>{@code ngayPhucVu} là ngày ca BẮT ĐẦU, không phải ngày trên lịch — xem
 * {@link ServingPeriodEntity#ngayPhucVu}.
 */
@Entity
@Table(name = "serving_period_resets")
@IdClass(ServingPeriodResetEntity.Khoa.class)
public class ServingPeriodResetEntity {

	@Id
	@Column(name = "serving_period_id", nullable = false)
	private String servingPeriodId;

	@Id
	@Column(name = "ngay_phuc_vu", nullable = false)
	private LocalDate ngayPhucVu;

	@Column(name = "applied_at", nullable = false)
	private OffsetDateTime appliedAt;

	@Column(name = "so_mon_da_nap", nullable = false)
	private int soMonDaNap;

	protected ServingPeriodResetEntity() {
		// JPA
	}

	public ServingPeriodResetEntity(
			String servingPeriodId, LocalDate ngayPhucVu, OffsetDateTime appliedAt, int soMonDaNap) {
		this.servingPeriodId = servingPeriodId;
		this.ngayPhucVu = ngayPhucVu;
		this.appliedAt = appliedAt;
		this.soMonDaNap = soMonDaNap;
	}

	public String getServingPeriodId() {
		return servingPeriodId;
	}

	public LocalDate getNgayPhucVu() {
		return ngayPhucVu;
	}

	public int getSoMonDaNap() {
		return soMonDaNap;
	}

	/** Khoá kép cho JPA. */
	public static class Khoa implements Serializable {
		private String servingPeriodId;
		private LocalDate ngayPhucVu;

		public Khoa() {
		}

		public Khoa(String servingPeriodId, LocalDate ngayPhucVu) {
			this.servingPeriodId = servingPeriodId;
			this.ngayPhucVu = ngayPhucVu;
		}

		@Override
		public boolean equals(Object khac) {
			if (this == khac) {
				return true;
			}
			if (!(khac instanceof Khoa kia)) {
				return false;
			}
			return Objects.equals(servingPeriodId, kia.servingPeriodId)
					&& Objects.equals(ngayPhucVu, kia.ngayPhucVu);
		}

		@Override
		public int hashCode() {
			return Objects.hash(servingPeriodId, ngayPhucVu);
		}
	}
}
