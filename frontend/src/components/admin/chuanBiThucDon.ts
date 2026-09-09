import type { AdminMenuItem } from "../../types";
import type { ChuanBiMon } from "../../services/adminMenuService";

export type NhapChuanBi = { isAvailable: boolean; soSuat: string };

/**
 * Đọc ô số suất: chuỗi rỗng là KHÔNG ĐẾM SUẤT, không phải bằng 0.
 *
 * <p>Ba giá trị, ba nghĩa khác nhau, và hai trong ba trông giống nhau khi đọc vội:
 *
 * <pre>
 *   ""    -> null   không đếm suất, món bán thoải mái
 *   "0"   -> 0      hết suất, món ẩn khỏi thực đơn khách
 *   "12"  -> 12     còn 12 suất
 * </pre>
 *
 * <p>{@code Number("")} trong JavaScript trả về <b>0</b>, không phải {@code NaN}. Nên
 * {@code soSuat.trim() === ""} phải được kiểm TRƯỚC — nếu không, mọi ô để trống sẽ được gửi đi là
 * "hết suất" và cả thực đơn biến mất khỏi màn hình khách sau một lần bấm Lưu.
 */
export function docSoSuat(tho: string): number | null {
  const sach = tho.trim();
  if (sach === "") return null;
  const so = Number(sach);
  return Number.isFinite(so) && so >= 0 ? Math.floor(so) : null;
}

/**
 * Chỉ những món THẬT SỰ đổi so với dữ liệu đang có.
 *
 * <p>Gửi cả 91 món thì mọi bản ghi đều bị chạm {@code updated_at}, và bảng bếp sẽ trông như cả
 * thực đơn vừa thay đổi trong khi không có gì đổi — bếp nhìn một màn hình nhấp nháy vô cớ giữa giờ
 * đông khách.
 */
export function tinhThayDoi(
  mon: AdminMenuItem[],
  nhap: Record<string, NhapChuanBi>,
): ChuanBiMon[] {
  const ra: ChuanBiMon[] = [];
  for (const m of mon) {
    const n = nhap[m.id];
    if (!n) continue;
    const soSuatMoi = docSoSuat(n.soSuat);
    const soSuatCu = m.remainingQuantity ?? null;
    if (n.isAvailable !== m.isAvailable || soSuatMoi !== soSuatCu) {
      ra.push({ menuItemId: m.id, isAvailable: n.isAvailable, remainingQuantity: soSuatMoi });
    }
  }
  return ra;
}
