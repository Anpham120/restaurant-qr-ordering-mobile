import type { AdminMenuItem } from "../../types";
import type { ChuanBiMon } from "../../services/adminMenuService";

export type NhapChuanBi = { isAvailable: boolean; soSuat: string; caIds: string[] };

/**
 * Đọc ô số suất: chuỗi rỗng là KHÔNG ĐẾM SUẤT, không phải bằng 0.
 *
 * Ba giá trị, ba nghĩa khác nhau, và hai trong ba trông giống nhau khi đọc vội:
 *
 *   ""    -> null   không đếm suất, món bán thoải mái
 *   "0"   -> 0      hết suất, món ẩn khỏi thực đơn khách
 *   "12"  -> 12     còn 12 suất
 *
 * `Number("")` trong JavaScript trả về 0, không phải NaN. Nên `soSuat.trim() === ""` phải được
 * kiểm TRƯỚC — nếu không, mọi ô để trống sẽ được gửi đi là "hết suất" và cả thực đơn biến mất
 * khỏi màn hình khách sau một lần bấm Lưu.
 */
export function docSoSuat(tho: string): number | null {
  const sach = tho.trim();
  if (sach === "") return null;
  const so = Number(sach);
  return Number.isFinite(so) && so >= 0 ? Math.floor(so) : null;
}

/**
 * Hai danh sách ca có khác nhau không, BỎ QUA THỨ TỰ.
 *
 * So thẳng bằng `join(",")` sẽ báo có thay đổi mỗi khi máy chủ trả về hai ca theo thứ tự khác lần
 * trước — và máy chủ KHÔNG hứa thứ tự nào cả, vì phần gán ca gom nhóm từ một bảng nối. Hậu quả là
 * nút Lưu lúc nào cũng sáng, và mỗi lần lưu lại ghi đè toàn bộ phần gán ca của mọi món.
 */
export function caKhacNhau(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return true;
  const sapA = [...a].sort();
  const sapB = [...b].sort();
  return sapA.some((x, i) => x !== sapB[i]);
}

/**
 * Chỉ những món THẬT SỰ đổi so với dữ liệu đang có.
 *
 * Gửi cả 91 món thì mọi bản ghi đều bị chạm `updated_at`, và bảng bếp sẽ trông như cả thực đơn
 * vừa thay đổi trong khi không có gì đổi — bếp nhìn một màn hình nhấp nháy vô cớ giữa giờ đông
 * khách.
 */
export function tinhThayDoi(
  mon: AdminMenuItem[],
  nhap: Record<string, NhapChuanBi>,
  caBanDau: Record<string, string[]>,
): ChuanBiMon[] {
  const ra: ChuanBiMon[] = [];
  for (const m of mon) {
    const n = nhap[m.id];
    if (!n) continue;
    const soSuatMoi = docSoSuat(n.soSuat);
    const soSuatCu = m.remainingQuantity ?? null;
    const caCu = caBanDau[m.id] ?? [];
    if (
      n.isAvailable !== m.isAvailable
      || soSuatMoi !== soSuatCu
      || caKhacNhau(n.caIds, caCu)
    ) {
      ra.push({
        menuItemId: m.id,
        isAvailable: n.isAvailable,
        remainingQuantity: soSuatMoi,
        servingPeriodIds: n.caIds,
      });
    }
  }
  return ra;
}

/** "10:00:00" -> "10:00". Máy chủ trả về giây, ô nhập giờ và mắt người thì không cần. */
export function gioNgan(gio: string): string {
  return gio.slice(0, 5);
}

/** Bộ lọc theo ca ở bảng "Hôm nay". `null` là không lọc, hiện cả thực đơn. */
export type LocCa = string | null;

/**
 * Lọc danh sách món theo ca đang chọn, để người nhập tìm nhanh món của ca sắp mở.
 *
 * MÓN BÁN CẢ NGÀY LUÔN HIỆN, kể cả khi đang lọc theo một ca. Món không gán ca nào thì nó được bán
 * trong MỌI ca, nên loại nó ra khỏi danh sách "món của ca tối" là nói sai: người nhập sẽ tưởng
 * món đó không bán buổi tối và không nhập số suất cho nó.
 */
export function locTheoCa<T extends { id: string }>(
  mon: T[],
  ganCa: Record<string, string[]>,
  ca: LocCa,
): T[] {
  if (ca === null) return mon;
  return mon.filter((m) => {
    const cua = ganCa[m.id] ?? [];
    return cua.length === 0 || cua.includes(ca);
  });
}
