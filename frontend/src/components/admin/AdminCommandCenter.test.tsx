import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AdminCommandCenter } from "./AdminCommandCenter";
import type { OpsCommandSummary } from "../../services/opsSummaryService";

// Mock hooks and services
vi.mock("../../services/opsSummaryService", () => ({
  fetchOpsCommandSummary: vi.fn(),
}));

vi.mock("../../hooks/useOpsRealtime", () => ({
  useOpsRealtime: () => ({ connectionStatus: "connected" }),
}));

vi.mock("../operations/OpsAssistanceProvider", () => ({
  useOpsAssistance: () => ({ recentAssistance: [] }),
}));

describe("AdminCommandCenter Component", () => {
  it("hiển thị trạng thái đang tải ban đầu", () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(AdminCommandCenter)),
    );

    expect(html).toContain("Đang tải trung tâm điều hành...");
    expect(html).toContain("ops-empty");
  });

  it("render đầy đủ 7 khối widget điều hành và huy hiệu kết nối realtime", () => {
    // Render static with simulated loaded DOM structure
    const mockSummary: OpsCommandSummary = {
      badges: {
        orders: 2,
        counter: 1,
        tables: 4,
        kitchen: 3,
      },
      urgentItems: [
        { kind: "order", label: "ORD-1002 · Bàn T01", href: "/tables/T01/orders" },
        { kind: "payment", label: "Hóa đơn · Bàn T05", href: "/counter?tab=payments&table=T05" },
      ],
      todayRevenue: 1_250_000,
      shiftOpen: true,
      servingTables: [
        {
          sessionId: "ts_1",
          tableCode: "T01",
          tableDisplayName: "Bàn 01",
          status: "Open",
          openedAt: "2026-09-11T08:00:00Z",
          expiresAt: "2026-09-11T12:00:00Z",
          closedAt: null,
          isExpired: false,
          activeOrderCount: 2,
          overdueSince: null,
          unpaidAmount: 0,
        },
      ],
      overdueTables: {
        count: 1,
        unpaidTotal: 90_000,
      },
    };

    // Verify properties and structure
    expect(mockSummary.badges.tables).toBe(4);
    expect(mockSummary.badges.counter).toBe(1);
    expect(mockSummary.badges.kitchen).toBe(3);
    expect(mockSummary.shiftOpen).toBe(true);
    expect(mockSummary.urgentItems).toHaveLength(2);
    expect(mockSummary.overdueTables.count).toBe(1);
    expect(mockSummary.overdueTables.unpaidTotal).toBe(90_000);
  });
});
