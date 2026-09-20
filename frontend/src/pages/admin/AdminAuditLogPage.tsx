import { useCallback, useEffect, useState } from "react";
import type { AuditLogEntry, SelfLoyaltyAccrualReport } from "@cmc/shared-types";
import { api } from "../../services/apiClient";
import "../../components/operations/operations.css";

const actions = ["", "ORDER_ITEM_CANCELLED", "ORDER_PROMOTION_APPLIED", "TABLE_SESSION_FORCE_CLOSED", "LOYALTY_ACCRUED", "MENU_ITEM_PRICE_CHANGED", "ORDER_PAYMENT_REFUNDED", "TABLE_INVOICE_REFUNDED"];

function money(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString("vi-VN")}đ`;
}

function when(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function points(entry: AuditLogEntry) {
  if (!entry.afterData || typeof entry.afterData !== "object" || !("points" in entry.afterData)) return "—";
  const value = (entry.afterData as { points?: unknown }).points;
  return typeof value === "number" ? String(value) : "—";
}

export function AdminAuditLogPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [selfAccruals, setSelfAccruals] = useState<SelfLoyaltyAccrualReport[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.auditLog.list({
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        tableCode: tableCode || undefined,
        action: action || undefined,
      });
      setItems(result.items);
      setSelfAccruals(await api.auditLog.selfLoyaltyReport({
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      }));
    } catch {
      setError("Không tải được nhật ký thao tác.");
    } finally {
      setLoading(false);
    }
  }, [action, from, tableCode, to]);

  useEffect(() => { void load(); }, [load]);

  return <div>
    <div className="ops-page-header"><h1>Nhật ký thao tác</h1><p>Tra cứu ai đã làm gì với tiền và phiên bàn.</p></div>
    {error ? <div className="ops-notice ops-notice--danger">{error}</div> : null}
    <div className="ops-reports-toolbar">
      <div className="ops-form-group ops-flush"><label className="ops-form-label">Từ ngày</label><input className="ops-form-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
      <div className="ops-form-group ops-flush"><label className="ops-form-label">Đến ngày</label><input className="ops-form-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
      <div className="ops-form-group ops-flush"><label className="ops-form-label">Bàn</label><input className="ops-form-input" value={tableCode} onChange={(event) => setTableCode(event.target.value)} placeholder="T12" /></div>
      <div className="ops-form-group ops-flush"><label className="ops-form-label">Loại thao tác</label><select className="ops-form-input" value={action} onChange={(event) => setAction(event.target.value)}>{actions.map((value) => <option key={value} value={value}>{value || "Tất cả"}</option>)}</select></div>
      <button className="ops-btn ops-btn--primary" type="button" onClick={() => void load()}>Tra cứu</button>
    </div>
    {loading ? <div className="ops-empty">Đang tải...</div> : <>
      <div className="ops-page-header ops-page-header--section"><h2>Tự tích điểm cần theo dõi</h2><p>Chỉ ghi lại; không chặn hoặc cảnh báo nhân viên tại quầy.</p></div>
      <table className="ops-table"><thead><tr><th>Tháng</th><th>Người thao tác</th><th>Số lần</th><th>Tổng hoá đơn</th><th>Tổng điểm</th></tr></thead><tbody>
        {selfAccruals.map((entry) => <tr key={`${entry.month}-${entry.actorUserId}`}><td>{entry.month}</td><td>{entry.actorName ?? entry.actorUserId ?? "Không xác định"}</td><td>{entry.occurrenceCount}</td><td>{money(entry.totalAmount)}</td><td>{entry.totalPoints}</td></tr>)}
        {selfAccruals.length === 0 ? <tr><td colSpan={5}><div className="ops-empty">Chưa có lượt tự tích điểm trong khoảng thời gian này.</div></td></tr> : null}
      </tbody></table>
      <div className="ops-page-header ops-page-header--section"><h2>Chi tiết thao tác</h2></div>
      <table className="ops-table"><thead><tr><th>Thời điểm</th><th>Người thao tác</th><th>Hành động</th><th>Bàn</th><th>Số tiền</th><th>Điểm</th><th>Lý do</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td>{when(item.occurredAt)}</td><td><strong>{item.actorName ?? "Hệ thống"}</strong><br /><small>{item.actorRole}</small></td><td>{item.action}</td><td>{item.tableCode ?? "—"}</td><td>{money(item.amount)}</td><td>{points(item)}</td><td>{item.reason ?? "—"}</td></tr>)}
      {items.length === 0 ? <tr><td colSpan={7}><div className="ops-empty">Không có thao tác khớp bộ lọc.</div></td></tr> : null}
      </tbody></table>
    </>}
  </div>;
}
