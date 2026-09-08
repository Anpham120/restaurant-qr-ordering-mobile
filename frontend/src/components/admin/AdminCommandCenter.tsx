import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Armchair, BarChart3, ChefHat, Clock3, Receipt, ShoppingBag } from "lucide-react";
import { fetchOpsCommandSummary, type OpsCommandSummary } from "../../services/opsSummaryService";
import { useOpsRealtime } from "../../hooks/useOpsRealtime";
import { OpsConnectionBadge } from "../operations/OpsConnectionBadge";
import { OpsAssistancePanel } from "../operations/OpsAssistancePanel";
import { useOpsAssistance } from "../operations/OpsAssistanceProvider";
import "../operations/operations.css";

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

export function AdminCommandCenter() {
  const [summary, setSummary] = useState<OpsCommandSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { recentAssistance } = useOpsAssistance();

  const load = useCallback(async () => {
    try {
      setSummary(await fetchOpsCommandSummary());
      setError("");
    } catch {
      setError("Không tải được trung tâm điều hành.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { connectionStatus } = useOpsRealtime({ refresh: load, pollIntervalMs: 15_000 });

  if (isLoading) {
    return (
      <div className="ops-empty">
        <div className="ops-empty-icon"><Activity aria-hidden="true" /></div>
        Đang tải trung tâm điều hành...
      </div>
    );
  }

  if (!summary) {
    return <div className="ops-notice ops-notice--danger">{error || "Không có dữ liệu."}</div>;
  }

  return (
    <div className="ops-command-center">
      <div className="ops-page-header ops-page-header--compact">
        <div className="ops-page-header-row">
          <div>
            <h1>Trung tâm điều hành</h1>
            <p>Tình hình vận hành realtime và các việc cần xử lý ngay</p>
          </div>
          <OpsConnectionBadge status={connectionStatus} />
        </div>
      </div>

      {error ? <div className="ops-notice ops-notice--danger">{error}</div> : null}

      <div className="ops-command-grid">
        <section className="ops-command-widget">
          <div className="ops-command-widget-head">
            <h2><ShoppingBag size={18} /> Cần xử lý ngay</h2>
            <Link className="ops-btn ops-btn--ghost" to="/orders?tab=table">Xem tất cả</Link>
          </div>
          {summary.urgentItems.length > 0 ? (
            <ul className="ops-command-list">
              {summary.urgentItems.map((item) => (
                <li key={`${item.kind}-${item.label}`}>
                  <Link to={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ops-command-empty">Không có việc khẩn cấp.</p>
          )}
        </section>

        <section className="ops-command-widget">
          <div className="ops-command-widget-head">
            <h2><Armchair size={18} /> Sơ đồ bàn</h2>
            <Link className="ops-btn ops-btn--ghost" to="/tables?tab=sessions">Mở sơ đồ</Link>
          </div>
          <div className="ops-stats ops-stats--compact">
            <div className="ops-stat-card">
              <div className="ops-stat-label">Đang phục vụ</div>
              <div className="ops-stat-value">{summary.badges.tables}</div>
            </div>
            <div className="ops-stat-card">
              <div className="ops-stat-label">Chờ thu</div>
              <div className="ops-stat-value">{summary.badges.counter}</div>
            </div>
          </div>
          <ul className="ops-command-list">
            {summary.servingTables.map((session) => (
              <li key={session.sessionId}>
                <Link to={`/tables?tab=sessions&table=${session.tableCode}`}>
                  Bàn {session.tableCode} · {session.activeOrderCount} đơn
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="ops-command-widget">
          <div className="ops-command-widget-head">
            <h2><Receipt size={18} /> Quầy thu ngân</h2>
            <Link className="ops-btn ops-btn--ghost" to="/counter?tab=shift">Giám sát ca</Link>
          </div>
          <div className="ops-stat-card">
            <div className="ops-stat-label">Ca quầy</div>
            <div className="ops-stat-value">{summary.shiftOpen ? "Đang mở" : "Chưa mở"}</div>
            <div className="ops-stat-detail">{summary.badges.counter} hóa đơn chờ thu</div>
          </div>
          <Link className="ops-btn ops-btn--primary" to={summary.badges.counter > 0 ? "/reports" : "/counter?tab=shift"}>
            {summary.badges.counter > 0 ? "Xem báo cáo thu" : "Xem ca quầy"}
          </Link>
        </section>

        <section className="ops-command-widget">
          <div className="ops-command-widget-head">
            <h2><BarChart3 size={18} /> Doanh thu hôm nay</h2>
            <Link className="ops-btn ops-btn--ghost" to="/reports">Báo cáo</Link>
          </div>
          <div className="ops-stat-card">
            <div className="ops-stat-value">{formatVnd(summary.todayRevenue)}</div>
            <div className="ops-stat-detail">Thực thu trong ngày</div>
          </div>
        </section>

        {/*
          BÀN QUÁ GIỜ CHƯA THU — con số nói cho quản lý biết có bao nhiêu TIỀN đang ở ngoài quầy.

          Ẩn hẳn khi bằng 0 chứ không hiện một ô "0 bàn": trung tâm điều hành là chỗ quét để tìm
          việc, và một ô báo "không có gì" chiếm đúng chỗ của một ô có việc.

          Đây là thứ DUY NHẤT trong danh sách ở §4.3 của đặc tả thật sự còn thiếu — bốn con số kia
          (doanh thu, bàn đang mở, hoá đơn chờ, đơn đang nấu) đã có sẵn từ trước.
        */}
        {summary.overdueTables.count > 0 ? (
          <section className="ops-command-widget ops-command-widget--alert">
            <div className="ops-command-widget-head">
              <h2><Clock3 size={18} /> Bàn quá giờ chưa thu</h2>
              <Link className="ops-btn ops-btn--ghost" to="/counter?tab=overdue">Xử lý</Link>
            </div>
            <div className="ops-stat-card">
              <div className="ops-stat-value">{summary.overdueTables.count}</div>
              <div className="ops-stat-detail">
                {formatVnd(summary.overdueTables.unpaidTotal)} chưa thu
              </div>
            </div>
          </section>
        ) : null}

        <section className="ops-command-widget">
          <div className="ops-command-widget-head">
            <h2><ChefHat size={18} /> Bếp</h2>
            <span className="ops-stat-detail">Nhân viên bếp dùng bảng bếp riêng</span>
          </div>
          <div className="ops-stat-card">
            <div className="ops-stat-label">Đang nấu</div>
            <div className="ops-stat-value">{summary.badges.kitchen}</div>
            <div className="ops-stat-detail">Đơn đang chế biến</div>
          </div>
        </section>

        <OpsAssistancePanel items={recentAssistance} />
      </div>
    </div>
  );
}
