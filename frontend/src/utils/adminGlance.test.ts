import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AdminTableSessionSummary } from "@cmc/shared-types";
import { tomTatQuaGio } from "../services/opsSummaryService";
import { labelOrderItemStatus, labelOrderStatus, labelPaymentStatus } from "./opsStatusLabels";

const srcRoot = new URL("../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, srcRoot)), "utf8");
const css = () => doc("components/operations/operations.css");

function phien(x: Partial<AdminTableSessionSummary>): AdminTableSessionSummary {
  return { status: "Open", overdueSince: null, unpaidAmount: 0, ...x } as AdminTableSessionSummary;
}

/** Đợt 5 của `docs/DAC_TA_THIET_KE_VAN_HANH.md`. Câu hỏi: HÔM NAY CÓ GÌ BẤT THƯỜNG? */
describe("mặt quản trị", () => {
  /**
   * TRẠNG THÁI TIẾNG ANH KHÔNG ĐƯỢC LỌT RA MÀN HÌNH TIẾNG VIỆT.
   *
   * Các màn quản trị in thẳng giá trị enum — `Confirmed`, `Pending`, `Preparing` — giữa một giao
   * diện tiếng Việt, dù bộ nhãn dịch sẵn đã tồn tại trong `opsStatusLabels`. Chúng chỉ là không
   * được gọi.
   */
  it("không màn quản trị nào in thẳng giá trị trạng thái", () => {
    const pham: string[] = [];
    const goc = fileURLToPath(srcRoot);
    const quet = (thuMuc: string) => {
      for (const muc of readdirSync(thuMuc)) {
        const duong = join(thuMuc, muc);
        if (statSync(duong).isDirectory()) {
          if (/\b(admin|counter)\b/.test(muc) || /pages|components/.test(muc)) quet(duong);
          continue;
        }
        if (!/\.tsx$/.test(muc) || /\.test\./.test(muc)) continue;
        const noiDung = readFileSync(duong, "utf8");
        // `>{x.status}<` — in thẳng giá trị vào chỗ người đọc nhìn thấy.
        for (const m of noiDung.matchAll(/>\{\s*\w+(?:\.\w+)*\.status\s*\}</g)) {
          pham.push(`${duong.slice(goc.length).replace(/\\/g, "/")}: ${m[0]}`);
        }
      }
    };
    quet(join(goc, "pages"));
    quet(join(goc, "components"));

    expect(pham, "dùng labelOrderStatus / labelOrderItemStatus / labelPaymentStatus").toEqual([]);
  });

  /**
   * TRẠNG THÁI ĐƠN VÀ TRẠNG THÁI MÓN LÀ HAI BỘ KHÁC NHAU.
   *
   *     đơn : Draft · Placed · Confirmed · Preparing · Ready · Served · Completed · Cancelled
   *     món : Pending · Preparing · Ready · Served · Cancelled
   *
   * `Pending` chỉ có ở món. Dùng nhầm `labelOrderStatus` cho món thì nó rơi qua nhánh `?? status`
   * và hiện nguyên chữ tiếng Anh — im lặng, vì hàm vẫn trả về một chuỗi.
   */
  it("nhãn món khác nhãn đơn, và phủ hết trạng thái món", () => {
    expect(labelOrderStatus("Pending"), "đơn không có trạng thái Pending").toBe("Pending");
    expect(labelOrderItemStatus("Pending")).toBe("Chờ làm");

    for (const s of ["Pending", "Preparing", "Ready", "Served", "Cancelled"]) {
      expect(labelOrderItemStatus(s), `thiếu nhãn cho trạng thái món ${s}`).not.toBe(s);
    }
  });

  it("nhãn thanh toán phủ hết trạng thái hoá đơn", () => {
    for (const s of ["Pending", "Paid", "Confirmed", "Cancelled", "Refunded"]) {
      expect(labelPaymentStatus(s), `thiếu nhãn thanh toán cho ${s}`).not.toBe(s);
    }
  });

  /**
   * LỌC THEO `overdueSince`, KHÔNG THEO `isExpired`.
   *
   * Máy chủ GIA HẠN phiên còn nợ tiền thay vì đóng nó, nên `isExpired` của một bàn còn nợ luôn là
   * `false`. Một bộ lọc theo trường đó sẽ báo "không có bàn nào quá giờ" đúng vào lúc có bàn quá
   * giờ — và tiền thì vẫn ở ngoài quầy.
   */
  it("đếm bàn quá giờ theo overdueSince, kể cả khi isExpired là false", () => {
    const ra = tomTatQuaGio([
      phien({ overdueSince: "2026-09-08T10:00:00Z", unpaidAmount: 120_000, isExpired: false }),
      phien({ overdueSince: "2026-09-08T11:00:00Z", unpaidAmount: 80_000, isExpired: false }),
      phien({ overdueSince: null, unpaidAmount: 500_000, isExpired: true }),
      phien({ overdueSince: "2026-09-08T09:00:00Z", unpaidAmount: 50_000, status: "Closed" }),
    ]);

    expect(ra.count, "phiên đã đóng và phiên chưa quá giờ không được tính").toBe(2);
    expect(ra.unpaidTotal).toBe(200_000);
  });

  it("không có bàn quá giờ thì trả về 0, không phải NaN", () => {
    expect(tomTatQuaGio([])).toEqual({ count: 0, unpaidTotal: 0 });
    expect(tomTatQuaGio([phien({ overdueSince: "2026-09-08T10:00:00Z" })]).unpaidTotal).toBe(0);
  });

  /** Ô báo "không có gì" chiếm đúng chỗ của một ô có việc trên một lưới dùng để quét tìm việc. */
  it("ô bàn quá giờ ẩn hẳn khi bằng 0", () => {
    expect(doc("components/admin/AdminCommandCenter.tsx")).toMatch(
      /summary\.overdueTables\.count > 0 \?/,
    );
  });

  /**
   * Đánh dấu cột tiền bằng `data-money` chứ không bằng chỉ số cột: bảng khác nhau có cột tiền ở vị
   * trí khác nhau, và `td:nth-child(6)` sẽ trỏ sai ngay lần đầu ai đó chèn thêm một cột.
   */
  it("cột tiền canh phải và canh chữ số", () => {
    const c = css();
    const m = c.match(/\.ops-table td\[data-money\][\s\S]*?\{([^}]*)\}/);

    expect(m, "thiếu quy tắc cho cột tiền").not.toBeNull();
    expect(m![1]).toMatch(/text-align:\s*right/);
    expect(m![1]).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it("số liệu trên thẻ thống kê canh chữ số", () => {
    const m = css().match(/\.ops-stat-value\s*\{([^}]*)\}/);

    expect(m).not.toBeNull();
    expect(m![1], "hai con số cùng số chữ số phải cùng bề rộng").toMatch(
      /font-variant-numeric:\s*tabular-nums/,
    );
  });
});
