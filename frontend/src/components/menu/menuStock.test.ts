import { describe, expect, it } from "vitest";
import { NGUONG_SAP_HET, trangThaiTonKho } from "./menuStock";

const mon = (remainingQuantity: number | null, isAvailable = true) =>
  ({ isAvailable, remainingQuantity });

describe("tồn kho món", () => {
  /**
   * `null` LÀ KHÔNG ĐẾM PHẦN, KHÔNG PHẢI BẰNG 0.
   *
   * Đây là giá trị của cả 91 món ngay sau khi tính năng lên. Nhầm hai thứ này là khoá sạch thực
   * đơn — và nó khoá theo cách trông rất giống "quán hết hàng thật", nên không ai nghi ngờ ngay.
   *
   * Bẫy cụ thể trong JavaScript: `null <= 0` là `true`. Kiểm `con <= 0` trước khi kiểm `null` sẽ
   * báo hết cho mọi món. Ca này neo đúng chỗ đó.
   */
  it("null = không giới hạn, không khoá gì", () => {
    expect(trangThaiTonKho(mon(null))).toEqual({ hetMon: false, khoaThem: false, nhan: null });
    expect(trangThaiTonKho(mon(null), 99)).toEqual({ hetMon: false, khoaThem: false, nhan: null });
  });

  it("0 = hết, khoá nút thêm", () => {
    const kq = trangThaiTonKho(mon(0));
    expect(kq.hetMon).toBe(true);
    expect(kq.khoaThem).toBe(true);
    expect(kq.nhan).toBe("Hết món");
  });

  it("bếp tắt món thì khoá, bất kể còn bao nhiêu phần", () => {
    const kq = trangThaiTonKho(mon(50, false));
    expect(kq.hetMon).toBe(true);
    expect(kq.khoaThem).toBe(true);
  });

  /**
   * KHOÁ THEO CẢ SỐ ĐÃ CÓ TRONG GIỎ.
   *
   * Món còn 2 phần mà giỏ đã có 2 thì "+" phải khoá. Chỉ nhìn `remainingQuantity > 0` thì khách
   * bấm thêm được tới vô hạn và chỉ biết mình gọi hụt khi máy chủ từ chối CẢ lượt gọi — lỗi báo
   * muộn nhất có thể, sau khi khách đã chọn xong và bấm gửi.
   */
  it("khoá khi giỏ đã lấy hết số phần còn lại", () => {
    expect(trangThaiTonKho(mon(2), 1).khoaThem).toBe(false);
    expect(trangThaiTonKho(mon(2), 2).khoaThem).toBe(true);
    expect(trangThaiTonKho(mon(2), 3).khoaThem).toBe(true);

    // Vẫn KHÔNG phải "hết món": người khác vẫn gọi được, chỉ giỏ này thì thôi.
    expect(trangThaiTonKho(mon(2), 2).hetMon).toBe(false);
  });

  /** Số chỉ đáng hiện khi nó sắp thành 0. "Còn 47 phần" không giúp ai quyết định gì. */
  it("chỉ hiện số khi sắp hết", () => {
    expect(trangThaiTonKho(mon(NGUONG_SAP_HET)).nhan).toBe(`Còn ${NGUONG_SAP_HET} phần`);
    expect(trangThaiTonKho(mon(NGUONG_SAP_HET + 1)).nhan).toBeNull();
    expect(trangThaiTonKho(mon(3)).nhan).toBe("Còn 3 phần");
  });
});
