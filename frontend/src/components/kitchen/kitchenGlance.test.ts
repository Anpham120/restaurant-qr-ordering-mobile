import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getKitchenPriority } from "./kitchenOrderPipeline";
import type { Order } from "@cmc/shared-types";

const frontendRoot = new URL("../../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, frontendRoot)), "utf8");

const css = () => doc("src/components/operations/operations.css");
const board = () => doc("src/components/kitchen/KitchenBoard.tsx");
const page = () => doc("src/pages/kitchen/KitchenRealtimePage.tsx");

function donHang(phutTruoc: number): Order {
  return {
    createdAt: new Date(Date.now() - phutTruoc * 60_000).toISOString(),
    items: [],
  } as unknown as Order;
}

/**
 * Đợt 3 của `docs/DAC_TA_THIET_KE_VAN_HANH.md`.
 *
 * Câu hỏi màn bếp phải trả lời trong 2 giây, từ 1 mét: MÓN NÀO LÀM TRƯỚC? Mỗi khẳng định dưới đây
 * canh một điều kiện để câu đó trả lời được.
 */
describe("bảng bếp — đọc được trong 2 giây", () => {
  /**
   * BA TẦNG MÃ HOÁ CHO MỘT TRẠNG THÁI: cỡ chữ, màu, và NHÃN CHỮ.
   *
   * Chỉ dùng màu là mã hoá một tầng. Bếp bị chói làm mất phân biệt màu, và có người mù màu — với
   * họ một thẻ khẩn trông y hệt thẻ thường. Nhãn chữ đọc được trong cả hai trường hợp.
   */
  it("thẻ quá giờ có nhãn CHỮ, không chỉ có màu", () => {
    const tsx = board();

    expect(tsx, "thiếu nhãn chữ cho mức khẩn").toContain("QUÁ 20 PHÚT");
    expect(tsx, "thiếu nhãn chữ cho mức cảnh báo").toContain("QUÁ 12 PHÚT");
  });

  /** Nhãn chữ phải khớp ngưỡng thật trong `kitchenOrderPipeline`, không phải một con số chép tay. */
  it("nhãn chữ khớp đúng ngưỡng của kitchenOrderPipeline", () => {
    expect(getKitchenPriority(donHang(11))).toBe("normal");
    expect(getKitchenPriority(donHang(12))).toBe("warning");
    expect(getKitchenPriority(donHang(19))).toBe("warning");
    expect(getKitchenPriority(donHang(20))).toBe("urgent");
  });

  it("thời gian chờ là con số lớn nhất trên thẻ, và canh cột", () => {
    const c = css();

    expect(c).toMatch(/\.kitchen-wait-value\s*\{[^}]*font-size:\s*var\(--ops-text-xl\)/);
    expect(c, "số phút không canh cột thì mắt phải đọc thay vì quét").toMatch(
      /\.kitchen-wait\s*\{[^}]*font-variant-numeric:\s*tabular-nums/,
    );
  });

  /**
   * Bếp KHÔNG thu tiền. Tổng tiền đơn trên thẻ bếp chiếm chỗ của thứ bếp thật sự cần và làm loãng
   * đúng chỗ mắt phải nhìn đầu tiên. Nó vẫn còn trong hộp chi tiết — chỗ người ta mở ra để tra cứu,
   * không phải chỗ quét trong hai giây.
   */
  it("thẻ bếp không hiện tổng tiền đơn", () => {
    const tsx = board();
    const theBatDau = tsx.indexOf("function OrderCard(");
    const theKetThuc = tsx.indexOf("function OrderDetailModal(");

    expect(theBatDau, "không thấy OrderCard").toBeGreaterThan(-1);
    expect(theKetThuc, "không thấy OrderDetailModal").toBeGreaterThan(theBatDau);
    expect(
      tsx.slice(theBatDau, theKetThuc),
      "tổng tiền quay lại thẻ bếp — bếp không thu tiền",
    ).not.toContain("formatVnd(order.totalAmount)");
  });

  /**
   * KHÔNG NHẤP NHÁY VÔ HẠN.
   *
   * Bản trước chạy `kitchen-pulse` liên tục trên thẻ khẩn. Màn hình người ta nhìn suốt ca mà có vật
   * thể động vĩnh viễn thì mắt học cách lờ nó đi — càng nhấp nháy càng mất tác dụng. Nó cũng không
   * nằm trong khối `prefers-reduced-motion` nào.
   */
  it("không có animation vô hạn trong vùng thẻ", () => {
    const c = css();

    expect(c, "`kitchen-pulse` quay lại").not.toMatch(/@keyframes\s+kitchen-pulse/);
    const vongLap = [...c.matchAll(/animation:[^;]*infinite/g)].map((m) => m[0]);
    expect(vongLap, "animation lặp vô hạn trên màn nhìn cả ca").toEqual([]);
  });

  /**
   * Sàn chạm phải áp ở MỌI bậc. Bản trước đặt 36px cho chip và 44px cho nút, cả hai chỉ trong
   * `@media (max-width: 768px)` — nên ở bậc `pos` (768–1279), đúng bậc bếp chạy, không có sàn nào.
   */
  it("chip món và nút chính có sàn chạm ở mọi bậc", () => {
    const c = css();
    const ngoaiMedia = c.split(/@media/)[0]!;

    expect(
      ngoaiMedia,
      "sàn chạm của chip nằm trong @media thì bậc `pos` không có sàn",
    ).toMatch(/\.kitchen-item-chip\s*\{[^}]*min-height:\s*var\(--ops-touch\)/);
    expect(c).toMatch(
      /\.ops-board--kitchen \.ops-card-actions \.ops-btn\s*\{[^}]*min-height:\s*var\(--ops-touch-lg\)/,
    );
  });

  it("trang bếp không còn style rời", () => {
    expect(page(), "`style={{` quay lại — mỗi cái là một chỗ hệ thiết kế không phủ tới")
      .not.toContain("style={{");
  });

  /**
   * `data-theme` nằm trên `<html>` nên nó áp cho CẢ bundle, mà ba vai dùng chung một bundle. Rời
   * bảng bếp mà không gỡ là mang nền tối sang quầy.
   */
  it("chế độ tối của bếp được gỡ khi rời trang", () => {
    const hook = doc("src/pages/kitchen/useKitchenDarkTheme.ts");

    expect(hook).toContain('setAttribute("data-theme", "dark")');
    expect(hook, "thiếu hàm dọn — nền tối theo người dùng sang màn khác").toContain(
      'removeAttribute("data-theme")',
    );
    // Không ghi đè lựa chọn người dùng đã tự đặt.
    expect(hook).toMatch(/getAttribute\("data-theme"\)\)?\s*\)?\s*return/);
  });
});
