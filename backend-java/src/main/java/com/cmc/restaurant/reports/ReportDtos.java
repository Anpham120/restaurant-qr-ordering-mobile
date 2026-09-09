package com.cmc.restaurant.reports;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Mirrors the report contracts of .NET. */
public final class ReportDtos {

	private ReportDtos() {
	}

	public record TopItemResponse(String menuItemId, String name, int quantitySold, BigDecimal revenue) {
	}

	public record DailyRevenueResponse(String date, int orderCount, BigDecimal revenue) {
	}

	/**
	 * Hao hụt vì huỷ món — món bị huỷ TRONG LÚC bếp đang nấu.
	 *
	 * <p>Ba con số, không phải một, vì gộp chúng lại là mất đúng thứ cần biết:
	 *
	 * <ul>
	 *   <li>{@code huyKhiDangNau} — bếp đã bắt tay vào, nguyên liệu mất. Đây là hao hụt thật.
	 *   <li>{@code huyTruocKhiNau} — huỷ lúc còn chờ, không mất gì. Có mặt ở đây để so sánh: một
	 *       quán huỷ nhiều nhưng toàn huỷ sớm là chuyện khác hẳn quán huỷ ít mà toàn huỷ muộn.
	 *   <li>{@code khongRoNguonGoc} — món bị huỷ TRƯỚC migration V33, không ai biết nó đang ở đâu.
	 *       Đếm riêng chứ KHÔNG gộp vào nhóm "không hao hụt" cho gọn — làm thế là bịa ra một con
	 *       số. Nhóm này sẽ tự teo đi theo thời gian.
	 * </ul>
	 *
	 * <p>HAI CON SỐ TIỀN, đo hai thứ khác nhau:
	 *
	 * <ul>
	 *   <li>{@code giaTriHuyKhiDangNau} — theo GIÁ BÁN. "Doanh thu đáng lẽ có".
	 *   <li>{@code giaVonHuyKhiDangNau} — theo GIÁ VỐN. "Tiền nguyên liệu đã mất". Đây mới là con
	 *       số quán cần, nhưng nó chỉ cộng những món ĐÃ ĐƯỢC NHẬP giá vốn.
	 * </ul>
	 *
	 * <p>{@code monChuaCoGiaVon} là số món bị huỷ lúc đang nấu mà KHÔNG có giá vốn để cộng. Phải
	 * hiện con số này cạnh {@code giaVonHuyKhiDangNau}, nếu không người đọc sẽ tưởng đã thấy toàn
	 * bộ thiệt hại. Cộng 0 cho những món đó là báo cáo hao hụt THẤP hơn sự thật — và sai theo hướng
	 * làm người ta yên tâm là hướng sai nguy hiểm nhất.
	 */
	public record WasteResponse(
			int huyKhiDangNau, int huyTruocKhiNau, int khongRoNguonGoc,
			BigDecimal giaTriHuyKhiDangNau, BigDecimal giaVonHuyKhiDangNau, int monChuaCoGiaVon) {
	}

	public record SummaryResponse(
			OffsetDateTime from, OffsetDateTime to, int totalOrders, int paidOrders,
			BigDecimal grossRevenue, BigDecimal totalDiscount, BigDecimal netRevenue,
			List<TopItemResponse> topItems, List<DailyRevenueResponse> dailyRevenue,
			WasteResponse waste) {
	}
}
