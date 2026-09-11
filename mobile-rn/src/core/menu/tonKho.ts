/**
 * Dưới ngưỡng này thì hiện số phần còn lại. Trên ngưỡng thì không — "còn 47 phần" không giúp khách
 * quyết định gì, nó chỉ chiếm chỗ và làm loãng đúng lúc con số THẬT SỰ quan trọng xuất hiện. Con số
 * chỉ đáng hiện khi nó sắp thành 0.
 */
export const NGUONG_SAP_HET = 10;

export interface TrangThaiTonKho {
  /** Hết sạch: bếp tắt món, hoặc số phần về 0. */
  readonly hetMon: boolean;
  /** Không thêm được nữa — hết món, HOẶC giỏ đã lấy hết số phần còn lại. */
  readonly khoaThem: boolean;
  /** Chữ hiện trên thẻ; `null` là không hiện gì. */
  readonly nhan: string | null;
}

/**
 * TÍNH THEO CẢ SỐ ĐÃ CÓ TRONG GIỎ, KHÔNG CHỈ THEO SỐ CÒN LẠI.
 *
 * Món còn 2 phần mà giỏ đã có 2 thì nút thêm phải khoá. Chỉ nhìn "còn lớn hơn 0" thì khách bấm
 * thêm được tới vô hạn và chỉ biết mình gọi hụt khi máy chủ từ chối cả lượt gọi — lỗi báo muộn
 * nhất có thể, sau khi khách đã chọn xong và bấm gửi.
 *
 * Luật này CHÉP NGUYÊN từ bản web (`frontend/src/components/menu/menuStock.ts`) để hai đầu nói
 * cùng một điều. Lệch nhau ở đây nghĩa là cùng một món hiện "còn 3 phần" trên web và "hết món"
 * trên app, và không ai biết bên nào đúng.
 */
export function trangThaiTonKho(
  mon: { readonly isAvailable: boolean; readonly remainingQuantity: number | null },
  soTrongGio = 0,
): TrangThaiTonKho {
  const con = mon.remainingQuantity;

  if (!mon.isAvailable) {
    return { hetMon: true, khoaThem: true, nhan: 'Tạm hết' };
  }

  // `null` phải kiểm TRƯỚC phép so với 0: `null <= 0` là `true` trong JavaScript, nên đảo thứ tự
  // sẽ báo hết cho mọi món không đếm phần — tức toàn bộ thực đơn.
  if (con === null || con === undefined) {
    return { hetMon: false, khoaThem: false, nhan: null };
  }
  if (con <= 0) {
    return { hetMon: true, khoaThem: true, nhan: 'Hết món' };
  }

  if (soTrongGio >= con) {
    return { hetMon: false, khoaThem: true, nhan: `Bạn đã lấy hết ${con} phần cuối` };
  }
  if (con <= NGUONG_SAP_HET) {
    return { hetMon: false, khoaThem: false, nhan: `Còn ${con} phần` };
  }
  return { hetMon: false, khoaThem: false, nhan: null };
}
