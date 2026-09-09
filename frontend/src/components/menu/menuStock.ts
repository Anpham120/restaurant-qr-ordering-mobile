import type { MenuItem } from "@cmc/shared-types";

/**
 * Dưới ngưỡng này thì hiện số phần còn lại. Trên ngưỡng thì không — "còn 47 phần" không giúp khách
 * quyết định gì, nó chỉ chiếm chỗ trên thẻ và làm loãng đúng lúc con số THẬT SỰ quan trọng xuất
 * hiện. Con số chỉ đáng hiện khi nó sắp thành 0.
 */
export const NGUONG_SAP_HET = 10;

export type TrangThaiTonKho = {
  /** Hết sạch: bếp tắt món, hoặc số phần về 0. */
  hetMon: boolean;
  /** Không thêm được nữa — hết món, HOẶC giỏ đã lấy hết số phần còn lại. */
  khoaThem: boolean;
  /** Chữ hiện trên thẻ; `null` là không hiện gì. */
  nhan: string | null;
};

/**
 * TÍNH THEO CẢ SỐ ĐÃ CÓ TRONG GIỎ, KHÔNG CHỈ THEO SỐ CÒN LẠI.
 *
 * Món còn 2 phần mà giỏ đã có 2 thì nút "+" phải khoá — nếu chỉ nhìn `remainingQuantity > 0` thì
 * khách bấm thêm được tới vô hạn và chỉ biết mình gọi hụt khi máy chủ từ chối cả lượt gọi. Đó là
 * lỗi báo MUỘN nhất có thể: sau khi khách đã chọn xong và bấm gửi.
 *
 * `remainingQuantity === null` là món KHÔNG đếm phần — hành vi y như trước khi có tính năng này,
 * và đó là trạng thái của mọi món cho tới khi có người nhập số.
 */
export function trangThaiTonKho(
  item: Pick<MenuItem, "isAvailable" | "remainingQuantity">,
  soTrongGio = 0,
): TrangThaiTonKho {
  const con = item.remainingQuantity;

  if (!item.isAvailable) {
    return { hetMon: true, khoaThem: true, nhan: "Tạm hết" };
  }
  // `null` phải kiểm TRƯỚC `<= 0`: `null <= 0` là `true` trong JavaScript, nên đảo thứ tự sẽ báo
  // hết cho mọi món không đếm phần — tức toàn bộ thực đơn.
  if (con === null || con === undefined) {
    return { hetMon: false, khoaThem: false, nhan: null };
  }
  if (con <= 0) {
    return { hetMon: true, khoaThem: true, nhan: "Hết món" };
  }

  const khoaThem = soTrongGio >= con;
  if (khoaThem) {
    return { hetMon: false, khoaThem: true, nhan: `Bạn đã lấy hết ${con} phần cuối` };
  }
  if (con <= NGUONG_SAP_HET) {
    return { hetMon: false, khoaThem: false, nhan: `Còn ${con} phần` };
  }
  return { hetMon: false, khoaThem: false, nhan: null };
}
