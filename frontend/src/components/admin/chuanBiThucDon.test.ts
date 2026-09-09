import { describe, expect, it } from "vitest";
import { docSoSuat, tinhThayDoi, type NhapChuanBi } from "./chuanBiThucDon";
import type { AdminMenuItem } from "../../types";

const mon = (id: string, isAvailable: boolean, remainingQuantity: number | null): AdminMenuItem =>
  ({
    id, name: id, description: "", price: 50000, categoryId: "cat_main", categoryName: "Cơm Việt",
    imageUrl: "", isAvailable, tags: [], prepMinutes: null, remainingQuantity, delayMinutes: 0,
    costPrice: null,
  }) as AdminMenuItem;

const nhap = (isAvailable: boolean, soSuat: string): NhapChuanBi => ({ isAvailable, soSuat });

describe("đọc ô số suất", () => {
  /**
   * BẪY: `Number("")` TRONG JAVASCRIPT TRẢ VỀ 0, KHÔNG PHẢI NaN.
   *
   * Nếu không kiểm chuỗi rỗng TRƯỚC, mọi ô để trống sẽ được gửi đi là "hết suất" — và vì món hết
   * suất bị ẩn khỏi thực đơn khách, cả thực đơn sẽ biến mất sau một lần bấm Lưu.
   *
   * Hỏng theo kiểu tệ nhất: người bấm thấy "Đã áp dụng 91 món", không có lỗi nào, và chỉ phát hiện
   * khi khách gọi điện hỏi sao quét QR không thấy gì.
   */
  it("chuỗi rỗng = không đếm suất, KHÔNG phải 0", () => {
    expect(docSoSuat("")).toBeNull();
    expect(docSoSuat("   ")).toBeNull();
    expect(docSoSuat("0")).toBe(0);
  });

  it("đọc số bình thường", () => {
    expect(docSoSuat("12")).toBe(12);
    expect(docSoSuat(" 7 ")).toBe(7);
  });

  /** Số âm và rác đọc thành "không đếm suất" — an toàn hơn là đọc thành 0 rồi ẩn mất món. */
  it("giá trị không hợp lệ rơi về không đếm suất", () => {
    expect(docSoSuat("-3")).toBeNull();
    expect(docSoSuat("abc")).toBeNull();
  });
});

describe("chỉ gửi món thật sự đổi", () => {
  it("không đổi gì thì gửi danh sách rỗng", () => {
    const ds = [mon("m1", true, 10), mon("m2", false, null)];
    const n = { m1: nhap(true, "10"), m2: nhap(false, "") };

    expect(tinhThayDoi(ds, n)).toEqual([]);
  });

  it("bắt được đổi công tắc", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(ds, { m1: nhap(false, "") });

    expect(kq).toEqual([{ menuItemId: "m1", isAvailable: false, remainingQuantity: null }]);
  });

  it("bắt được đổi số suất", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(ds, { m1: nhap(true, "20") });

    expect(kq).toEqual([{ menuItemId: "m1", isAvailable: true, remainingQuantity: 20 }]);
  });

  /**
   * Xoá ô số suất (từ có số về trống) LÀ một thay đổi: nó chuyển món từ "giới hạn suất" sang "bán
   * thoải mái". Bỏ sót ca này thì người dùng xoá ô, bấm Lưu, và không có gì xảy ra.
   */
  it("xoá ô số suất cũng là một thay đổi", () => {
    const ds = [mon("m1", true, 10)];
    const kq = tinhThayDoi(ds, { m1: nhap(true, "") });

    expect(kq).toEqual([{ menuItemId: "m1", isAvailable: true, remainingQuantity: null }]);
  });

  /** `null` và `0` phải phân biệt được ở đây, nếu không "hết suất" và "không đếm" thành một. */
  it("phân biệt null với 0", () => {
    expect(tinhThayDoi([mon("m1", true, null)], { m1: nhap(true, "0") })).toHaveLength(1);
    expect(tinhThayDoi([mon("m1", true, 0)], { m1: nhap(true, "") })).toHaveLength(1);
    expect(tinhThayDoi([mon("m1", true, 0)], { m1: nhap(true, "0") })).toHaveLength(0);
  });
});
