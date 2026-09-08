import { describe, expect, it } from "vitest";
import { PHIM, TRAN_CHU_SO, bamPhim, nhanPhim } from "./posNumpadKeys";

describe("bàn phím số ở quầy", () => {
  it("gõ được một số tiền bình thường", () => {
    let v = "";
    for (const phim of ["2", "5", "000"]) v = bamPhim(v, phim);
    expect(v).toBe("25000");
  });

  /**
   * `000` là lý do bàn phím này đáng có: tiền Việt Nam luôn kết thúc bằng nhiều số 0, nên một hoá
   * đơn 250.000đ là ba lần bấm thay vì sáu.
   */
  it("phím 000 thêm đúng ba số không", () => {
    expect(bamPhim("25", "000")).toBe("25000");
  });

  /**
   * SỐ 0 ĐỨNG ĐẦU BỊ CHẶN.
   *
   * `0250000` là chuỗi người đang vội đọc nhầm, và cũng không phải cách ai viết số tiền.
   */
  it("không cho số 0 đứng đầu", () => {
    expect(bamPhim("", "0")).toBe("");
    expect(bamPhim("", "000")).toBe("");
    expect(bamPhim("5", "0")).toBe("50");
  });

  it("xoá lùi từng chữ số, và xoá ô trống không lỗi", () => {
    expect(bamPhim("250", "⌫")).toBe("25");
    expect(bamPhim("", "⌫")).toBe("");
  });

  /**
   * QUÁ TRẦN THÌ BỎ QUA PHÍM, KHÔNG CẮT BỚT CHUỖI.
   *
   * Cắt bớt là im lặng đổi con số người ta vừa gõ thành một con số khác — trên một màn hình thu
   * tiền thì đó là cách tệ nhất để xử lý việc gõ thừa.
   */
  it("chạm trần thì bỏ qua phím thay vì cắt bớt", () => {
    const day = "1".repeat(TRAN_CHU_SO);

    expect(bamPhim(day, "7")).toBe(day);
    expect(day.length).toBe(TRAN_CHU_SO);
  });

  /**
   * `000` phải TÔN TRỌNG trần một cách trọn vẹn: thêm một phần của phím là kết quả không ai đoán
   * được. Bấm `000` khi chỉ còn chỗ cho 2 chữ số thì không thêm gì.
   */
  it("phím 000 không thêm một phần khi sát trần", () => {
    const conCho2 = "1".repeat(TRAN_CHU_SO - 2);

    expect(bamPhim(conCho2, "000")).toBe(conCho2);
    expect(bamPhim("1".repeat(TRAN_CHU_SO - 3), "000")).toBe("1".repeat(TRAN_CHU_SO - 3) + "000");
  });

  it("có đủ 12 phím, và bố cục ba cột", () => {
    expect(PHIM.flat()).toHaveLength(12);
    for (const hang of PHIM) expect(hang).toHaveLength(3);
    expect(PHIM.flat()).toContain("⌫");
    expect(PHIM.flat()).toContain("000");
  });

  /** `⌫` đọc lên nghe như một ký hiệu lạ; trình đọc màn hình cần một câu. */
  it("mọi phím có nhãn đọc được", () => {
    for (const phim of PHIM.flat()) {
      expect(nhanPhim(phim).length, `phím ${phim} thiếu nhãn`).toBeGreaterThan(3);
    }
    expect(nhanPhim("⌫")).toBe("Xoá một chữ số");
  });
});
