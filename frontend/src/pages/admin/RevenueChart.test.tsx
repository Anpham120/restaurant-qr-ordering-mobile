import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RevenueChart,
  formatCompactVnd,
  formatDisplayDate,
  generateContinuousDays,
} from "./RevenueChart";

describe("RevenueChart helpers", () => {
  describe("formatCompactVnd", () => {
    it("định dạng tiền tệ ngắn gọn dễ nhìn trên trục Y", () => {
      expect(formatCompactVnd(0)).toBe("0");
      expect(formatCompactVnd(500)).toBe("500");
      expect(formatCompactVnd(1_000)).toBe("1k");
      expect(formatCompactVnd(50_000)).toBe("50k");
      expect(formatCompactVnd(1_000_000)).toBe("1 tr");
      expect(formatCompactVnd(2_500_000)).toBe("2.5 tr");
      expect(formatCompactVnd(1_000_000_000)).toBe("1 tỷ");
    });
  });

  describe("formatDisplayDate", () => {
    it("chuyển YYYY-MM-DD sang DD/MM để nhãn gọn gàng", () => {
      expect(formatDisplayDate("2026-09-11")).toBe("11/09");
      expect(formatDisplayDate("2026-01-01")).toBe("01/01");
      expect(formatDisplayDate("invalid")).toBe("invalid");
    });
  });

  describe("generateContinuousDays", () => {
    it("trả về rỗng khi không có dữ liệu và không có khoảng ngày", () => {
      expect(generateContinuousDays(undefined, undefined, [])).toEqual([]);
    });

    it("bù đủ các ngày khuyết doanh thu giữa from và to", () => {
      const data = [
        { date: "2026-09-01", orderCount: 2, revenue: 200_000 },
        { date: "2026-09-03", orderCount: 5, revenue: 500_000 },
      ];

      const days = generateContinuousDays("2026-09-01", "2026-09-04", data);
      expect(days).toHaveLength(4);
      expect(days[0]).toEqual({
        date: "2026-09-01",
        displayDate: "01/09",
        revenue: 200_000,
        orderCount: 2,
      });
      // Ngày 02/09 khuyết được bù với revenue = 0
      expect(days[1]).toEqual({
        date: "2026-09-02",
        displayDate: "02/09",
        revenue: 0,
        orderCount: 0,
      });
      expect(days[2]).toEqual({
        date: "2026-09-03",
        displayDate: "03/09",
        revenue: 500_000,
        orderCount: 5,
      });
      // Ngày 04/09 khuyết được bù với revenue = 0
      expect(days[3]).toEqual({
        date: "2026-09-04",
        displayDate: "04/09",
        revenue: 0,
        orderCount: 0,
      });
    });

    it("tự suy diễn khoảng ngày từ dữ liệu nếu from và to không truyền", () => {
      const data = [
        { date: "2026-09-10", orderCount: 1, revenue: 100_000 },
        { date: "2026-09-12", orderCount: 2, revenue: 200_000 },
      ];

      const days = generateContinuousDays(undefined, undefined, data);
      expect(days.map((d) => d.date)).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
    });
  });
});

describe("RevenueChart Component Rendering", () => {
  it("hiển thị trạng thái rỗng khi không có dữ liệu", () => {
    const html = renderToStaticMarkup(createElement(RevenueChart, { dailyRevenue: [] }));
    expect(html).toContain("Chưa có dữ liệu doanh thu theo ngày");
    expect(html).toContain("ops-empty");
  });

  it("render trục tọa độ Y-axis và nhãn ngày X-axis khi có dữ liệu", () => {
    const data = [
      { date: "2026-09-01", orderCount: 3, revenue: 300_000 },
      { date: "2026-09-02", orderCount: 6, revenue: 600_000 },
      { date: "2026-09-03", orderCount: 1, revenue: 150_000 },
    ];

    const html = renderToStaticMarkup(
      createElement(RevenueChart, { dailyRevenue: data, from: "2026-09-01", to: "2026-09-03" }),
    );

    expect(html).toContain("ops-reports-chart");
    expect(html).toContain("ops-reports-chart-scroll");
    expect(html).toContain("ops-chart-y-text");
    expect(html).toContain("ops-chart-x-text");
    expect(html).toContain("01/09");
    expect(html).toContain("02/09");
    expect(html).toContain("03/09");
  });

  it("hỗ trợ khoảng ngày dài (> 30 ngày) mà không bị lỗi viewBox", () => {
    // 40 ngày liên tục
    const data = Array.from({ length: 40 }, (_, i) => {
      const dayNum = String(i + 1).padStart(2, "0");
      return {
        date: `2026-08-${dayNum}`,
        orderCount: 1,
        revenue: 100_000,
      };
    });

    const html = renderToStaticMarkup(
      createElement(RevenueChart, {
        dailyRevenue: data,
        from: "2026-08-01",
        to: "2026-08-40", // Fallback test
      }),
    );

    // Phải render ra SVG với viewbox đủ rộng cho 40 cột, không bị kẹp 640px
    expect(html).toContain("viewBox=\"0 0");
    expect(html).toContain("ops-reports-chart-scroll");
  });

  it("render vạch mờ cho ngày có doanh thu = 0đ thay vì biến mất", () => {
    const data = [
      { date: "2026-09-01", orderCount: 2, revenue: 200_000 },
      { date: "2026-09-02", orderCount: 0, revenue: 0 },
    ];

    const html = renderToStaticMarkup(
      createElement(RevenueChart, { dailyRevenue: data, from: "2026-09-01", to: "2026-09-02" }),
    );

    expect(html).toContain("ops-chart-bar--zero");
  });
});
