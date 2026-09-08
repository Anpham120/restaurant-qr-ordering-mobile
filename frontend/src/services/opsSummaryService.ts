import type { AdminTableSessionSummary, Order, OrderListResponse } from "@cmc/shared-types";
import { buildTableOrdersLink } from "../components/operations/opsDeepLinkUtils";
import { api } from "./apiClient";
import { getCurrentCounterShift } from "./counterShiftService";
import { listTableInvoices } from "./orderService";
export type OpsNavBadges = {
  orders: number;
  counter: number;
  tables: number;
  kitchen: number;
};

export type OpsUrgentItem =
  | { kind: "order"; label: string; href: string }
  | { kind: "payment"; label: string; href: string }
  | { kind: "table"; label: string; href: string };

export type OpsCommandSummary = {
  badges: OpsNavBadges;
  urgentItems: OpsUrgentItem[];
  todayRevenue: number;
  shiftOpen: boolean;
  servingTables: AdminTableSessionSummary[];
  /**
   * Bàn ĐÃ QUÁ GIỜ mà CHƯA THU TIỀN, và tổng số tiền đang nằm ngoài đó.
   *
   * Suy ra từ `sessions` — dữ liệu tóm tắt này VỐN ĐÃ TẢI. Không thêm một lời gọi mạng cho một
   * con số mà dữ liệu để tính nó đang nằm sẵn trong tay.
   *
   * Lọc theo `overdueSince` chứ không theo `isExpired`: máy chủ gia hạn phiên còn nợ tiền thay vì
   * đóng nó, nên `isExpired` của bàn còn nợ luôn là `false` và một bộ lọc theo trường đó sẽ báo
   * "không có bàn nào quá giờ" đúng lúc có bàn quá giờ. Xem `overdueTableService.locBanQuaGio`.
   */
  overdueTables: { count: number; unpaidTotal: number };
};

function countServingTables(sessions: AdminTableSessionSummary[]) {
  return new Set(
    sessions.filter((session) => session.status === "Open" && !session.isExpired).map((s) => s.tableCode),
  ).size;
}

export async function fetchOpsCommandSummary(): Promise<OpsCommandSummary> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [orderData, invoices, sessions, reportData, shiftData] = await Promise.all([
    api.orders.list(),
    listTableInvoices().catch(() => []),
    api.tables.listAdminSessions("Open"),
    api.reports.summary({
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      to: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()).toISOString(),
    }),
    getCurrentCounterShift().catch(() => null),
  ]);

  const orders = (orderData as OrderListResponse).orders;
  const urgentOrders = orders.filter((order: Order) => ["Placed", "Ready"].includes(order.status));
  const pendingPayments = invoices.filter((invoice) => invoice.status === "Pending");
  const preparingCount = orders.filter((order: Order) => order.status === "Preparing").length;
  const openSessions = sessions.items.filter((session) => session.status === "Open" && !session.isExpired);

  const urgentItems: OpsUrgentItem[] = [
    ...urgentOrders.slice(0, 3).map((order) => ({
      kind: "order" as const,
      label: `${order.orderCode} · Bàn ${order.tableCode ?? "-"}`,
      href: order.tableCode
        ? buildTableOrdersLink(order.tableCode)
        : `/orders?tab=kanban`,
    })),
    ...pendingPayments.slice(0, 3).map((invoice) => ({
      kind: "payment" as const,
      label: `${invoice.invoiceCode ?? "Hóa đơn"} · Bàn ${invoice.tableCode ?? "-"}`,
      href: invoice.tableCode
        ? `/counter?tab=payments&table=${encodeURIComponent(invoice.tableCode)}`
        : "/counter?tab=payments",
    })),
    ...openSessions.slice(0, 2).map((session) => ({
      kind: "table" as const,
      label: `Bàn ${session.tableCode} · ${session.activeOrderCount} đơn`,
      href: `/tables?tab=sessions&table=${session.tableCode}`,
    })),
  ].slice(0, 5);

  return {
    badges: {
      orders: urgentOrders.length,
      counter: pendingPayments.length,
      tables: countServingTables(sessions.items),
      kitchen: preparingCount,
    },
    urgentItems,
    todayRevenue: reportData.netRevenue,
    shiftOpen: shiftData?.status === "Open",
    servingTables: openSessions.slice(0, 8),
    overdueTables: tomTatQuaGio(sessions.items),
  };
}

/**
 * Đếm bàn quá giờ chưa thu và cộng số tiền đang nằm ngoài đó.
 *
 * Tách thành hàm thuần để kiểm được: đây là con số nói cho quản lý biết có bao nhiêu tiền đang ở
 * ngoài quầy, và một phép đếm sai ở đây là một khoản tiền không ai đi đòi.
 */
export function tomTatQuaGio(
  sessions: AdminTableSessionSummary[],
): { count: number; unpaidTotal: number } {
  const quaGio = sessions.filter((s) => s.status === "Open" && !!s.overdueSince);
  return {
    count: quaGio.length,
    unpaidTotal: quaGio.reduce((tong, s) => tong + (s.unpaidAmount ?? 0), 0),
  };
}

let badgesCache: { value: OpsNavBadges; fetchedAt: number } | null = null;
const BADGES_CACHE_MS = 10_000;

export async function fetchOpsNavBadges(): Promise<OpsNavBadges> {
  if (badgesCache && Date.now() - badgesCache.fetchedAt < BADGES_CACHE_MS) {
    return badgesCache.value;
  }
  const summary = await fetchOpsCommandSummary();
  badgesCache = { value: summary.badges, fetchedAt: Date.now() };
  return summary.badges;
}

export async function hasPendingCounterPayments(): Promise<boolean> {
  const invoices = await listTableInvoices().catch(() => []);
  return invoices.some((invoice) => invoice.status === "Pending");
}
