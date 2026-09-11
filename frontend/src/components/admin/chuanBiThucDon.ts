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

/**
 * Giờ hiện tại THEO ĐỒNG HỒ CỦA QUÁN, dạng "HH:MM".
 *
 * Không dùng giờ máy người xem. Quản lý mở màn hình từ máy đặt sai múi giờ, hay từ điện thoại đang
 * roaming, sẽ thấy cảnh báo về một ca không hề đang mở. Ca phục vụ là giờ treo tường của quán, nên
 * phải hỏi đúng múi giờ đó — cùng múi giờ mà máy chủ dùng.
 *
 * `hourCycle: "h23"` là bắt buộc. Với `hour12: false`, một số môi trường trả về "24:00" cho nửa
 * đêm thay vì "00:00", và "24:00" thì lớn hơn mọi giờ bắt đầu nên mọi ca qua đêm sẽ trông như đang
 * mở. Vẫn chuẩn hoá thêm một lần cho chắc.
 */
export function gioQuanHienTai(luc: Date = new Date()): string {
  const tho = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(luc);
  return tho.startsWith("24") ? `00${tho.slice(2)}` : tho;
}

/**
 * Những ca đang mở vào lúc `gio`.
 *
 * Cùng luật với máy chủ: đầu ca tính vào, cuối ca không, và ca kết thúc sớm hơn giờ bắt đầu là ca
 * bọc qua nửa đêm. Phép so thẳng `tu <= t && t < den` trả về SAI cho MỌI thời điểm với ca qua đêm,
 * nên ca đó sẽ im lặng không bao giờ được coi là đang mở.
 */
export function caDangMo<T extends { startTime: string; endTime: string }>(
  ca: T[],
  gio: string,
): T[] {
  return ca.filter((c) => {
    const tu = gioNgan(c.startTime);
    const den = gioNgan(c.endTime);
    return tu < den ? gio >= tu && gio < den : gio >= tu || gio < den;
  });
}

/**
 * Món của một ca đang HẾT SUẤT, tức đang bị ẩn khỏi thực đơn khách.
 *
 * Đây là thứ đáng cảnh báo, không phải "chưa ai nhập số suất": nó là một HẬU QUẢ nhìn thấy được
 * (khách không thấy món), tự biến mất khi có người nhập lại, và suy ra được từ dữ liệu đang có nên
 * không cần bảng nào ghi lại "ca này đã nhập chưa".
 *
 * `remainingQuantity === 0` chứ không phải giá trị falsy: `null` là KHÔNG đếm suất, món bán thoải
 * mái, hoàn toàn bình thường. Gộp hai cái lại thì cảnh báo sẽ kêu về gần hết thực đơn.
 *
 * Món đã tắt công tắc KHÔNG tính: đó là quyết định có chủ ý của người, không phải sự cố.
 */
export function monHetSuatTrongCa<
  T extends { id: string; isAvailable: boolean; remainingQuantity: number | null },
>(mon: T[], ganCa: Record<string, string[]>, caId: string): T[] {
  return locTheoCa(mon, ganCa, caId)
    .filter((m) => m.isAvailable && m.remainingQuantity === 0);
}
