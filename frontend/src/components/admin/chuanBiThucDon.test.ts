import { describe, expect, it } from "vitest";
import {
  caKhacNhau, docSoSuat, gioNgan, tinhThayDoi, tinhThayDoiSuatCa, type NhapChuanBi,
} from "./chuanBiThucDon";
import type { AdminMenuItem } from "../../types";

const mon = (id: string, isAvailable: boolean, remainingQuantity: number | null): AdminMenuItem =>
  ({
    id, name: id, description: "", price: 50000, categoryId: "cat_main", categoryName: "Cơm Việt",
    imageUrl: "", isAvailable, tags: [], prepMinutes: null, remainingQuantity, delayMinutes: 0,
    costPrice: null,
  }) as AdminMenuItem;

const nhap = (isAvailable: boolean, soSuat: string, caIds: string[] = []): NhapChuanBi =>
  ({ isAvailable, soSuat, caIds });

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

describe("so sánh ca phục vụ", () => {
  /**
   * THỨ TỰ KHÔNG TÍNH LÀ THAY ĐỔI.
   *
   * Máy chủ gom phần gán ca từ một bảng nối và KHÔNG hứa thứ tự nào. So thẳng bằng chuỗi thì mỗi
   * lần tải lại có thể báo "có thay đổi" trong khi không có gì đổi: nút Lưu lúc nào cũng sáng, và
   * mỗi lần bấm lại ghi đè toàn bộ phần gán ca của cả thực đơn.
   */
  it("khác thứ tự KHÔNG phải là thay đổi", () => {
    expect(caKhacNhau(["sp_toi", "sp_trua"], ["sp_trua", "sp_toi"])).toBe(false);
  });

  it("thêm, bớt, đổi ca đều là thay đổi", () => {
    expect(caKhacNhau([], ["sp_trua"])).toBe(true);
    expect(caKhacNhau(["sp_trua"], [])).toBe(true);
    expect(caKhacNhau(["sp_trua"], ["sp_toi"])).toBe(true);
  });
});

describe("chỉ gửi món thật sự đổi", () => {
  it("không đổi gì thì gửi danh sách rỗng", () => {
    const ds = [mon("m1", true, 10), mon("m2", false, null)];
    const n = { m1: nhap(true, "10"), m2: nhap(false, "") };

    expect(tinhThayDoi(ds, n, {})).toEqual([]);
  });

  it("bắt được đổi công tắc", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(ds, { m1: nhap(false, "") }, {});

    expect(kq).toEqual([
      { menuItemId: "m1", isAvailable: false, remainingQuantity: null, servingPeriodIds: [] },
    ]);
  });

  it("bắt được đổi số suất", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(ds, { m1: nhap(true, "20") }, {});

    expect(kq[0].remainingQuantity).toBe(20);
  });

  /**
   * Xoá ô số suất (từ có số về trống) LÀ một thay đổi: nó chuyển món từ "giới hạn suất" sang "bán
   * thoải mái". Bỏ sót ca này thì người dùng xoá ô, bấm Lưu, và không có gì xảy ra.
   */
  it("xoá ô số suất cũng là một thay đổi", () => {
    const ds = [mon("m1", true, 10)];
    const kq = tinhThayDoi(ds, { m1: nhap(true, "") }, {});

    expect(kq[0].remainingQuantity).toBeNull();
  });

  /** `null` và `0` phải phân biệt được ở đây, nếu không "hết suất" và "không đếm" thành một. */
  it("phân biệt null với 0", () => {
    expect(tinhThayDoi([mon("m1", true, null)], { m1: nhap(true, "0") }, {})).toHaveLength(1);
    expect(tinhThayDoi([mon("m1", true, 0)], { m1: nhap(true, "") }, {})).toHaveLength(1);
    expect(tinhThayDoi([mon("m1", true, 0)], { m1: nhap(true, "0") }, {})).toHaveLength(0);
  });

  it("bắt được đổi ca phục vụ", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(ds, { m1: nhap(true, "", ["sp_trua"]) }, {});

    expect(kq).toEqual([
      {
        menuItemId: "m1", isAvailable: true, remainingQuantity: null,
        servingPeriodIds: ["sp_trua"],
      },
    ]);
  });

  it("ca giống hệt, chỉ khác thứ tự, KHÔNG gửi đi", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(
      ds,
      { m1: nhap(true, "", ["sp_toi", "sp_trua"]) },
      { m1: ["sp_trua", "sp_toi"] },
    );

    expect(kq).toEqual([]);
  });

  /**
   * Bỏ hết ca của một món LÀ một thay đổi — nó trả món về "bán cả ngày". Máy chủ phân biệt mảng
   * rỗng (một lệnh) với `null` (giữ nguyên), và chỗ này phải gửi mảng rỗng.
   */
  it("bỏ hết ca là một thay đổi, và gửi mảng rỗng", () => {
    const ds = [mon("m1", true, null)];
    const kq = tinhThayDoi(ds, { m1: nhap(true, "", []) }, { m1: ["sp_trua"] });

    expect(kq).toHaveLength(1);
    expect(kq[0].servingPeriodIds).toEqual([]);
  });
});

describe("hiển thị giờ", () => {
  it("bỏ phần giây máy chủ trả về", () => {
    expect(gioNgan("10:00:00")).toBe("10:00");
    expect(gioNgan("18:30")).toBe("18:30");
  });
});

describe("số suất dự kiến theo ca", () => {
  /**
   * CÙNG BẪY `Number("") === 0`, NHƯNG HẬU QUẢ KHÁC.
   *
   * Ở đây chuỗi rỗng nghĩa là "ca này không quản số suất cho món đó". Đọc nhầm thành 0 sẽ làm mọi
   * món chưa cấu hình bị đặt về 0 suất mỗi khi ca mở — cả ca đó không bán được gì, và không có lỗi
   * nào được ném ra.
   */
  it("ô trống = không quản, KHÔNG phải 0 suất", () => {
    expect(tinhThayDoiSuatCa({ m1: "" }, {})).toEqual([]);
    expect(tinhThayDoiSuatCa({ m1: "0" }, {})).toEqual([
      { menuItemId: "m1", plannedQuantity: 0 },
    ]);
  });

  it("không đổi thì không gửi", () => {
    expect(tinhThayDoiSuatCa({ m1: "25" }, { m1: 25 })).toEqual([]);
  });

  it("đổi số thì gửi số mới", () => {
    expect(tinhThayDoiSuatCa({ m1: "30" }, { m1: 25 })).toEqual([
      { menuItemId: "m1", plannedQuantity: 30 },
    ]);
  });

  /** Xoá ô là một lệnh: bỏ món khỏi diện quản số suất của ca này. */
  it("xoá ô đang có số là một thay đổi, gửi null", () => {
    expect(tinhThayDoiSuatCa({ m1: "" }, { m1: 25 })).toEqual([
      { menuItemId: "m1", plannedQuantity: null },
    ]);
  });

  /** 0 và "chưa cấu hình" phải phân biệt được, nếu không hai lệnh khác nhau thành một. */
  it("phân biệt 0 với chưa cấu hình", () => {
    expect(tinhThayDoiSuatCa({ m1: "0" }, { m1: 0 })).toEqual([]);
    expect(tinhThayDoiSuatCa({ m1: "" }, { m1: 0 })).toEqual([
      { menuItemId: "m1", plannedQuantity: null },
    ]);
  });
});
