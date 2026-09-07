import { describe, expect, it } from "vitest";
import type { AdminTableSessionSummary } from "@cmc/shared-types";
import { docPhut, locBanQuaGio } from "./overdueTableService";

const BAY_GIO = Date.parse("2026-09-07T16:00:00Z");

function phien(p: Partial<AdminTableSessionSummary>): AdminTableSessionSummary {
  return {
    sessionId: "ts_1", tableCode: "T01", tableDisplayName: "Bàn 1", status: "Open",
    openedAt: "2026-09-07T10:00:00Z", expiresAt: "2026-09-07T17:00:00Z", closedAt: null,
    isExpired: false, activeOrderCount: 2, overdueSince: null, ...p,
  };
}

describe("bàn quá giờ chưa thu tiền", () => {
  /**
   * Lọc theo `overdueSince`, KHÔNG theo `isExpired`.
   *
   * <p>Đây là chỗ dễ làm sai nhất. Máy chủ nay không cho phiên còn nợ tiền hết hạn — nó gia hạn
   * thay vì đóng — nên đúng những bàn cần đòi tiền lại là những bàn có `isExpired = false` và
   * `expiresAt` nằm ở tương lai. Lọc theo hai trường đó sẽ cho ra danh sách RỖNG, đúng lúc nó phải
   * có người.
   */
  it("bắt bàn còn nợ dù isExpired là false và expiresAt ở tương lai", () => {
    const ra = locBanQuaGio([
      phien({ sessionId: "ts_no", overdueSince: "2026-09-07T14:00:00Z" }),
      phien({ sessionId: "ts_thuong", overdueSince: null }),
    ], BAY_GIO);

    expect(ra.map((b) => b.sessionId)).toEqual(["ts_no"]);
    expect(ra[0]!.phutQuaGio).toBe(120);
  });

  it("cũ nhất lên đầu — đây là danh sách việc, không phải bảng thống kê", () => {
    const ra = locBanQuaGio([
      phien({ sessionId: "moi", overdueSince: "2026-09-07T15:30:00Z" }),
      phien({ sessionId: "cu_nhat", overdueSince: "2026-09-07T11:00:00Z" }),
      phien({ sessionId: "giua", overdueSince: "2026-09-07T13:00:00Z" }),
    ], BAY_GIO);

    expect(ra.map((b) => b.sessionId)).toEqual(["cu_nhat", "giua", "moi"]);
  });

  it("bàn đã đóng không còn là việc phải làm", () => {
    const ra = locBanQuaGio([
      phien({ status: "Closed", overdueSince: "2026-09-07T11:00:00Z" }),
      phien({ status: "Expired", overdueSince: "2026-09-07T11:00:00Z" }),
    ], BAY_GIO);

    expect(ra).toEqual([]);
  });

  it("không âm khi đồng hồ máy chạy lệch", () => {
    // Máy quầy chậm hơn máy chủ vài giây là chuyện thường. "-1 phút quá giờ" thì vô nghĩa.
    const ra = locBanQuaGio([phien({ overdueSince: "2026-09-07T16:00:30Z" })], BAY_GIO);
    expect(ra[0]!.phutQuaGio).toBe(0);
  });

  it("đọc số phút thành giờ cho người, không bắt nhẩm", () => {
    expect(docPhut(45)).toBe("45 phút");
    expect(docPhut(60)).toBe("1 giờ");
    expect(docPhut(135)).toBe("2 giờ 15 phút");
  });
});
