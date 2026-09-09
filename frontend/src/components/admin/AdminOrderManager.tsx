import { labelOrderEventStatus, labelOrderItemStatus, labelOrderStatus } from "../../utils/opsStatusLabels";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@cmc/auth";
import type { Order, OrderListResponse, OrderStatus } from "@cmc/shared-types";
import { confirmOrderPayment, refundOrderPayment } from "../../services/orderService";
import { failOrderPayment } from "../../services/adminOrderService";
import { api } from "../../services/apiClient";
import { useOpsRealtime } from "../../hooks/useOpsRealtime";
import { normalizeTableCode } from "../operations/opsDeepLinkUtils";
import { Package, RefreshCw, X } from "lucide-react";
import "../operations/operations.css";

const formatVnd = (v: number) => v.toLocaleString("vi-VN") + "đ";
const ALL_STATUSES: OrderStatus[] = ["Placed", "Confirmed", "Preparing", "Ready", "Served", "Completed", "Cancelled"];

export function AdminOrderManager({
  embedded = false,
  scopedTableCode,
}: {
  embedded?: boolean;
  /** When set, only orders for this table; hides global table filter and table column. */
  scopedTableCode?: string;
}) {
  const { user } = useAuth();
  const lockedTable = scopedTableCode ? normalizeTableCode(scopedTableCode) : "";

  /**
   * QUẦY CHỈ XEM. Vòng đời đơn thuộc về BẾP, không thuộc về quầy.
   *
   * Màn này trước đây cho quầy bấm "Xác nhận", "Phục vụ", "Hoàn tất", "Hủy" — tức đổi trạng thái
   * đơn từ một màn hình KHÔNG nhìn thấy bếp. Hai người cùng đẩy một đơn từ hai chỗ, và người thua
   * cuộc không biết mình vừa thua.
   *
   * Thanh toán cũng ẩn ở đây, dù đó LÀ việc của quầy: nó có màn riêng ("Quầy thu ngân"), và trang
   * này đã có sẵn nút dẫn sang. Một thao tác tiền có hai lối vào là hai lối phải cùng đúng.
   */
  const chiXem = user?.role === "CounterStaff" || user?.role === "Staff";
  // Dem cot MOT lan roi dung cho ca <thead> lan colSpan cua dong trong. Hai cho tu dem la hai cho
  // lech nhau ngay khi them mot cot — va dong trong la thu it ai mo ra xem nhat.
  const soCot = 5 + (lockedTable ? 0 : 1) + (chiXem ? 0 : 1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTable, setFilterTable] = useState(lockedTable);
  /**
   * GIỮ MÃ ĐƠN, KHÔNG GIỮ BẢN SAO CỦA ĐƠN.
   *
   * Bản trước để `useState<Order | null>` và chỉ gán một lần lúc bấm mở. Từ đó ngăn chi tiết ĐÓNG
   * BĂNG: `load()` chạy lại trên mọi sự kiện realtime và cập nhật `orders`, nhưng bản sao trong
   * `selectedOrder` thì không ai đụng tới.
   *
   * Hệ quả đúng bằng thứ người trực quầy nhìn thấy: bếp chuyển món sang "Đang nấu", "Chờ ra món",
   * màn bếp đổi ngay, còn ngăn chi tiết bên quầy vẫn hiện trạng thái lúc mở — cho tới khi có người
   * đóng ra mở lại. Không lỗi nào hiện lên, vì mọi thứ khác trên màn hình VẪN cập nhật.
   *
   * Giữ mã rồi tra lại từ danh sách sống thì không còn hai bản để mà lệch nhau.
   */
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.orders.list({
        status: filterStatus || undefined,
        tableCode: filterTable || undefined,
      }) as OrderListResponse;
      setOrders(data.orders);
    } catch {
      setError("Không tải được đơn hàng.");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterTable]);

  useEffect(() => {
    if (lockedTable) setFilterTable(lockedTable);
  }, [lockedTable]);

  useEffect(() => { setIsLoading(true); load(); }, [load]);

  useOpsRealtime({ refresh: load });

  // Tra lại từ danh sách VỪA tải. Đơn biến mất khỏi kết quả lọc (đổi trạng thái, đổi bộ lọc) thì
  // ngăn chi tiết tự đóng — đúng hơn là treo một bản ghi không còn trong tầm nhìn.
  const selectedOrder = useMemo(
    () => (selectedCode ? orders.find((o) => o.orderCode === selectedCode) ?? null : null),
    [orders, selectedCode],
  );

  const stats = useMemo(() => {
    const active = orders.filter((o) => !["Completed", "Cancelled"].includes(o.status)).length;
    const total = orders.reduce((s, o) => s + o.totalAmount, 0);
    return [
      { label: lockedTable ? `Đơn bàn ${lockedTable}` : "Tổng đơn", value: String(orders.length), detail: lockedTable ? "Theo bàn này" : "Trong kết quả filter" },
      { label: "Đang xử lý", value: String(active), detail: "Placed -> Served" },
      { label: "Tổng giá trị", value: formatVnd(total), detail: lockedTable ? "Phiên / lịch sử bàn" : "Cộng dồn" },
    ];
  }, [orders, lockedTable]);

  async function handleStatusChange(orderCode: string, status: OrderStatus) {
    setPendingCode(orderCode);
    setNotice("");
    try {
      await api.orders.updateStatus(orderCode, status);
      setNotice(`${orderCode} -> ${status}`);
      await load();
    } catch {
      setNotice("Cập nhật thất bại.");
    } finally {
      setPendingCode(null);
    }
  }

  async function handlePaymentAction(orderCode: string, action: "confirm" | "fail" | "refund") {
    setPendingCode(orderCode);
    try {
      if (action === "confirm") await confirmOrderPayment(orderCode, "Admin xác nhận");
      else if (action === "fail") await failOrderPayment(orderCode, "Admin từ chối");
      else await refundOrderPayment(orderCode, "Admin hoàn tiền");
      setNotice(`${orderCode}: ${action}`);
      await load();
    } catch {
      setNotice("Thao tác thanh toán thất bại.");
    } finally {
      setPendingCode(null);
    }
  }

  if (isLoading) return <div className="ops-empty"><div className="ops-empty-icon"><Package aria-hidden="true" /></div>Đang tải...</div>;

  return (
    <div>
      {!embedded ? (
        <div className="ops-page-header">
          <h1>Quản lý đơn hàng</h1>
          <p>Xem, lọc, cập nhật trạng thái và thanh toán cho tất cả đơn</p>
        </div>
      ) : null}

      {error ? <div className="ops-notice ops-notice--danger">{error}</div> : null}
      {notice ? <div className="ops-notice ops-notice--info">{notice}</div> : null}

      <div className="ops-stats">
        {stats.map((s) => (
          <div className="ops-stat-card" key={s.label}>
            <div className="ops-stat-label">{s.label}</div>
            <div className="ops-stat-value">{s.value}</div>
            <div className="ops-stat-detail">{s.detail}</div>
          </div>
        ))}
      </div>

      <div className="ops-toolbar">
        <select className="ops-form-select ops-filter--status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!lockedTable ? (
          <input className="ops-form-input ops-filter--code" placeholder="Mã bàn (vd: T01)" value={filterTable} onChange={(e) => setFilterTable(e.target.value)} />
        ) : null}
        <button className="ops-btn ops-btn--ghost" onClick={load} type="button"><RefreshCw aria-hidden="true" size={15} /> Làm mới</button>
      </div>

      <table className="ops-table">
        <thead>
          <tr>
            <th>Mã đơn</th>
            {!lockedTable ? <th>Bàn</th> : null}
            <th>Trạng thái</th>
            <th>TT toán</th>
            <th data-money>Tổng tiền</th>
            <th>Thời gian</th>
            {!chiXem ? <th>Thao tác</th> : null}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td>
                <button className="ops-btn ops-btn--ghost" onClick={() => setSelectedCode(order.orderCode)} type="button">
                  {order.orderCode}
                </button>
              </td>
              {!lockedTable ? <td>{order.tableCode ?? "-"}</td> : null}
              <td><span className={`ops-badge ops-badge--${order.status.toLowerCase()}`}>{labelOrderStatus(order.status)}</span></td>
              <td>
                {order.tableSessionId ? <span className="ops-badge">Theo phiên bàn</span> : (
                  <span className={`ops-badge ops-badge--${order.paymentStatus.toLowerCase()}`}>{order.paymentMethod} · {order.paymentStatus}</span>
                )}
              </td>
              <td data-money>{formatVnd(order.totalAmount)}</td>
              <td className="ops-note">{new Date(order.createdAt).toLocaleString("vi-VN")}</td>
              {!chiXem ? (
              <td>
                <div className="ops-row ops-row--tight ops-row--wrap">
                  {order.status === "Placed" ? <button className="ops-btn ops-btn--primary" disabled={pendingCode === order.orderCode} onClick={() => handleStatusChange(order.orderCode, "Confirmed")} type="button">Xác nhận</button> : null}
                  {order.status === "Ready" ? <button className="ops-btn ops-btn--success" disabled={pendingCode === order.orderCode} onClick={() => handleStatusChange(order.orderCode, "Served")} type="button">Phục vụ</button> : null}
                  {order.status === "Served" && (order.paymentStatus === "Confirmed" || order.paymentStatus === "Paid") ? (
                    <button className="ops-btn ops-btn--success" disabled={pendingCode === order.orderCode} onClick={() => handleStatusChange(order.orderCode, "Completed")} type="button">Hoàn tất</button>
                  ) : null}
                  {!["Completed", "Cancelled"].includes(order.status) ? (
                    <button className="ops-btn ops-btn--ghost" disabled={pendingCode === order.orderCode} onClick={() => handleStatusChange(order.orderCode, "Cancelled")} type="button">Hủy</button>
                  ) : null}
                </div>
              </td>
              ) : null}
            </tr>
          ))}
          {orders.length === 0 ? <tr><td colSpan={soCot}><div className="ops-empty">Không có đơn{lockedTable ? ` cho bàn ${lockedTable}` : ""}</div></td></tr> : null}
        </tbody>
      </table>

      {/* Detail modal */}
      {selectedOrder ? (
        <div className="ops-modal-overlay" onClick={() => setSelectedCode(null)}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <h2>{selectedOrder.orderCode}</h2>
              <button aria-label="Đóng" className="ops-modal-close" onClick={() => setSelectedCode(null)} type="button"><X aria-hidden="true" size={18} /></button>
            </div>
            <div className="ops-modal-body">
              <div className="ops-card-meta ops-card-meta--spaced">
                <span className={`ops-badge ops-badge--${selectedOrder.status.toLowerCase()}`}>{labelOrderStatus(selectedOrder.status)}</span>
                {selectedOrder.tableSessionId ? <span className="ops-badge">Thanh toán theo phiên bàn</span> : <span className={`ops-badge ops-badge--${selectedOrder.paymentStatus.toLowerCase()}`}>{selectedOrder.paymentMethod} · {selectedOrder.paymentStatus}</span>}
                {selectedOrder.tableCode ? <span className="ops-card-table">Bàn {selectedOrder.tableCode}</span> : null}
              </div>

              <h4 className="ops-subhead">Món ({selectedOrder.items.length})</h4>
              <div className="ops-item-list">
                {selectedOrder.items.map((item) => (
                  <div className="ops-item-row" key={item.orderItemId}>
                    <div className="ops-item-info">
                      <div className="ops-item-name">
                        {item.quantity}× {item.name}
                        <span className={`ops-badge ops-badge--${item.status.toLowerCase()}`}>{labelOrderItemStatus(item.status)}</span>
                      </div>
                      <span className="ops-item-qty">{formatVnd(item.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ops-inset">
                <strong>Tổng: {formatVnd(selectedOrder.totalAmount)}</strong>
              </div>

              {/* Events */}
              {selectedOrder.events.length > 0 ? (
                <div className="ops-block">
                  <h4 className="ops-subhead">Lịch sử</h4>
                  {selectedOrder.events.map((ev, i) => (
                    <div key={i} className="ops-note">
                      <span className={`ops-badge ops-badge--${ev.status.toLowerCase()}`}>{labelOrderEventStatus(ev.status, ev.source)}</span>
                      {" "}{new Date(ev.createdAt).toLocaleString("vi-VN")}
                      {ev.note ? ` - ${ev.note}` : ""}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="ops-modal-footer">
              {!chiXem && !selectedOrder.tableSessionId && (selectedOrder.paymentStatus === "Pending" || selectedOrder.paymentStatus === "Unpaid") ? (
                <>
                  <button className="ops-btn ops-btn--success" disabled={pendingCode === selectedOrder.orderCode} onClick={() => handlePaymentAction(selectedOrder.orderCode, "confirm")} type="button">Xác nhận thu</button>
                  <button className="ops-btn ops-btn--ghost" disabled={pendingCode === selectedOrder.orderCode} onClick={() => handlePaymentAction(selectedOrder.orderCode, "fail")} type="button">Từ chối</button>
                </>
              ) : null}
              {!chiXem && !selectedOrder.tableSessionId && (selectedOrder.paymentStatus === "Confirmed" || selectedOrder.paymentStatus === "Paid") ? (
                <button className="ops-btn ops-btn--danger" disabled={pendingCode === selectedOrder.orderCode} onClick={() => handlePaymentAction(selectedOrder.orderCode, "refund")} type="button">Hoàn tiền</button>
              ) : null}
              <button className="ops-btn ops-btn--ghost" onClick={() => setSelectedCode(null)} type="button">Đóng</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
