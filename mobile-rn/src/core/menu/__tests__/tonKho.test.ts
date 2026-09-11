import { NGUONG_SAP_HET, trangThaiTonKho } from '../tonKho';

const mon = (isAvailable: boolean, remainingQuantity: number | null) => ({
  isAvailable,
  remainingQuantity,
});

describe('tồn kho hiển thị cho khách', () => {
  /**
   * BẪY: `null <= 0` LÀ `true` TRONG JAVASCRIPT.
   *
   * `null` nghĩa là món KHÔNG đếm phần — trạng thái của mọi món cho tới khi có người nhập số. Kiểm
   * phép so với 0 trước khi kiểm `null` sẽ báo "hết món" cho cả thực đơn, và khoá sạch nút thêm.
   */
  it('không đếm phần thì KHÔNG phải hết món', () => {
    expect(trangThaiTonKho(mon(true, null))).toEqual({
      hetMon: false,
      khoaThem: false,
      nhan: null,
    });
  });

  it('về 0 là hết món và khoá nút thêm', () => {
    const t = trangThaiTonKho(mon(true, 0));

    expect(t.hetMon).toBe(true);
    expect(t.khoaThem).toBe(true);
  });

  it('bếp tắt món thì hết, bất kể còn bao nhiêu phần', () => {
    expect(trangThaiTonKho(mon(false, 50)).khoaThem).toBe(true);
  });

  /**
   * Ca đáng giá nhất của bộ này. Món còn 2 mà giỏ đã có 2 thì nút thêm phải khoá NGAY, không đợi
   * máy chủ từ chối cả lượt gọi sau khi khách đã chọn xong.
   */
  it('giỏ đã lấy hết phần cuối thì khoá thêm', () => {
    const t = trangThaiTonKho(mon(true, 2), 2);

    expect(t.khoaThem).toBe(true);
    expect(t.hetMon).toBe(false);
    expect(t.nhan).toContain('2 phần cuối');
  });

  it('còn nhiều hơn số trong giỏ thì vẫn thêm được', () => {
    expect(trangThaiTonKho(mon(true, 5), 2).khoaThem).toBe(false);
  });

  /** Trên ngưỡng thì im lặng: "còn 47 phần" không giúp khách quyết định gì. */
  it('chỉ hiện số khi sắp hết', () => {
    expect(trangThaiTonKho(mon(true, NGUONG_SAP_HET)).nhan).toBe(`Còn ${NGUONG_SAP_HET} phần`);
    expect(trangThaiTonKho(mon(true, NGUONG_SAP_HET + 1)).nhan).toBeNull();
  });
});
