import { describe, expect, it } from "vitest";
import {
  caDangMo, caKhacNhau, docSoSuat, gioNgan, gioQuanHienTai, locTheoCa, monHetSuatTrongCa,
  tinhThayDoi, type NhapChuanBi,
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

describe("lọc bảng Hôm nay theo ca", () => {
  const ds = [{ id: "m_pho" }, { id: "m_lau" }, { id: "m_nuoc" }];
  const gan = { m_pho: ["sp_sang"], m_lau: ["sp_toi"] };

  it("không lọc thì hiện cả thực đơn", () => {
    expect(locTheoCa(ds, gan, null)).toHaveLength(3);
  });

  /**
   * MÓN BÁN CẢ NGÀY PHẢI HIỆN TRONG MỌI CA.
   *
   * Món không gán ca nào được bán trong mọi ca. Loại nó ra khỏi danh sách "món của ca tối" là nói
   * sai với người đang nhập: họ sẽ tưởng món đó không bán buổi tối và bỏ qua không nhập số suất,
   * rồi tối đó món hết mà không ai biết vì sao.
   */
  it("món bán cả ngày hiện trong mọi ca", () => {
    expect(locTheoCa(ds, gan, "sp_toi").map((m) => m.id)).toEqual(["m_lau", "m_nuoc"]);
    expect(locTheoCa(ds, gan, "sp_sang").map((m) => m.id)).toEqual(["m_pho", "m_nuoc"]);
  });

  it("ca chưa có món nào gán vẫn hiện món bán cả ngày", () => {
    expect(locTheoCa(ds, gan, "sp_trua").map((m) => m.id)).toEqual(["m_nuoc"]);
  });
});

describe("giờ theo đồng hồ của quán", () => {
  /**
   * Không dùng giờ máy người xem. Quản lý mở màn hình từ máy đặt sai múi giờ sẽ thấy cảnh báo về
   * một ca không hề đang mở, rồi nhập số suất cho sai ca.
   */
  it("đổi sang giờ Việt Nam, không phải giờ máy", () => {
    expect(gioQuanHienTai(new Date("2026-03-02T11:30:00Z"))).toBe("18:30");
    expect(gioQuanHienTai(new Date("2026-03-02T03:00:00Z"))).toBe("10:00");
  });

  /**
   * BẪY: với `hour12: false`, một số môi trường trả về "24:00" cho nửa đêm thay vì "00:00". Chuỗi
   * "24:00" lớn hơn mọi giờ bắt đầu, nên MỌI ca qua đêm sẽ trông như đang mở suốt.
   */
  it("nửa đêm là 00:00, KHÔNG phải 24:00", () => {
    expect(gioQuanHienTai(new Date("2026-03-02T17:00:00Z"))).toBe("00:00");
  });
});

describe("ca nào đang mở", () => {
  const ds = [
    { startTime: "10:00:00", endTime: "14:00:00" },
    { startTime: "18:00:00", endTime: "22:00:00" },
  ];

  it("chỉ ca chứa giờ đó", () => {
    expect(caDangMo(ds, "12:00")).toHaveLength(1);
    expect(caDangMo(ds, "12:00")[0].startTime).toBe("10:00:00");
    expect(caDangMo(ds, "16:00")).toHaveLength(0);
  });

  it("đầu ca tính vào, cuối ca không", () => {
    expect(caDangMo(ds, "10:00")).toHaveLength(1);
    expect(caDangMo(ds, "14:00")).toHaveLength(0);
  });

  /** Phép so thẳng trả về sai cho MỌI thời điểm với ca qua đêm, nên ca đó không bao giờ mở. */
  it("CA QUA ĐÊM mở cả trước lẫn sau nửa đêm", () => {
    const dem = [{ startTime: "18:00:00", endTime: "02:00:00" }];
    expect(caDangMo(dem, "23:00")).toHaveLength(1);
    expect(caDangMo(dem, "01:00")).toHaveLength(1);
    expect(caDangMo(dem, "03:00")).toHaveLength(0);
    expect(caDangMo(dem, "15:00")).toHaveLength(0);
  });
});

describe("món hết suất trong ca đang mở", () => {
  const m = (id: string, isAvailable: boolean, remainingQuantity: number | null) =>
    ({ id, isAvailable, remainingQuantity });

  it("bắt món đã về 0", () => {
    const ds = [m("m_lau", true, 0), m("m_com", true, 5)];
    const kq = monHetSuatTrongCa(ds, { m_lau: ["sp_toi"], m_com: ["sp_toi"] }, "sp_toi");

    expect(kq.map((x) => x.id)).toEqual(["m_lau"]);
  });

  /**
   * `null` là KHÔNG đếm suất — món bán thoải mái, hoàn toàn bình thường. Gộp nó với 0 thì cảnh báo
   * sẽ kêu về gần hết thực đơn, và một cảnh báo lúc nào cũng kêu là một cảnh báo không ai đọc.
   */
  it("null KHÔNG phải hết suất", () => {
    const ds = [m("m_nuoc", true, null)];
    expect(monHetSuatTrongCa(ds, {}, "sp_toi")).toEqual([]);
  });

  /** Món đã tắt công tắc là quyết định có chủ ý của người, không phải sự cố cần nhắc. */
  it("món đã tắt không tính là sự cố", () => {
    const ds = [m("m_lau", false, 0)];
    expect(monHetSuatTrongCa(ds, { m_lau: ["sp_toi"] }, "sp_toi")).toEqual([]);
  });

  it("món bán cả ngày hết suất cũng được nhắc", () => {
    const ds = [m("m_nuoc", true, 0)];
    expect(monHetSuatTrongCa(ds, {}, "sp_toi").map((x) => x.id)).toEqual(["m_nuoc"]);
  });
});
