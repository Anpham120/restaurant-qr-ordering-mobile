import { BrandWordmark } from "@cmc/brand-ui";
import { LanguageSwitcher, useI18n } from "@cmc/i18n";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { OrderingSessionProvider, useOrderingSession, useOrderingSessionBoundary } from "./OrderingSessionProvider";
import { orderingNavigation } from "./orderingRoutes";
import { OrderingCallStaffFab } from "./OrderingCallStaffFab";
import "./ordering-layout.css";

type UnavailableSessionState = "missing" | "invalid" | "expired" | "settled" | "error";

function SessionState({
  onRetry,
  state,
}: {
  onRetry: () => Promise<void>;
  state: UnavailableSessionState;
}) {
  const { t } = useI18n();
  // Thanh toán xong là KẾT THÚC ĐẸP, không phải sự cố. Dùng chung khung màn hình này nhưng đổi
  // hẳn lời: một câu báo lỗi sau khi khách vừa trả tiền là nói sai chuyện vừa xảy ra.
  const daThanhToan = state === "settled";
  const copy = daThanhToan
    ? "Cảm ơn quý khách. Phiên gọi món của bàn đã kết thúc. Quét lại mã QR trên bàn nếu quý khách muốn gọi thêm."
    : state === "expired"
    ? "Phiên bàn đã hết hạn hoặc đã được nhân viên đóng. Vui lòng quét QR tại bàn để mở phiên mới."
    : state === "error"
      ? "Không thể xác minh phiên bàn lúc này. Hãy kiểm tra kết nối và thử lại."
      : state === "missing"
        ? "Liên kết này chưa có quyền truy cập phiên. Vui lòng mở lại bằng mã QR trên bàn."
        : "Liên kết này chưa có quyền truy cập phiên. Hãy quét mã QR trên bàn hoặc mở lại liên kết có kèm mã QR.";
  const marketingBaseUrl = import.meta.env.VITE_MARKETING_BASE_URL ?? "https://cmcrestaurant.app";

  return (
    <main className="ordering-state" aria-live="polite">
      <p className="ordering-state-kicker">CMC Restaurant</p>
      <LanguageSwitcher variant="toggle" />
      <h1>{t(daThanhToan ? "Đã thanh toán xong" : "Phiên gọi món chưa sẵn sàng")}</h1>
      <p>{t(copy)}</p>
      <div className="ordering-state-actions">
        {state === "error" ? <button type="button" onClick={() => void onRetry()}>{t("Thử lại")}</button> : null}
        <a href="/">{t("Quét QR để bắt đầu")}</a>
        <a className="ordering-state-secondary" href={marketingBaseUrl}>{t("Trang giới thiệu")}</a>
      </div>
    </main>
  );
}

function OrderingShell() {
  const { t } = useI18n();
  const { context } = useOrderingSession();
  const base = `/table-session/${context.sessionId}`;

  return (
    <div className="ordering-shell">
      <div className="ordering-chrome">
        <header className="ordering-header">
          <a className="ordering-brand" href={base}><BrandWordmark /></a>
          <LanguageSwitcher variant="toggle" />
          <div className="ordering-table" aria-label={t("Phiên bàn {table}", { table: context.tableCode })}>
            <span>{t("Phiên đang mở")}</span>
            <strong>{context.tableCode}</strong>
          </div>
        </header>
        <nav className="ordering-nav" aria-label={t("Điều hướng gọi món")}>
          {orderingNavigation.map(({ path, label }) => (
            <NavLink key={path} to={path} className={({ isActive }) => isActive ? "active" : undefined}>
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <OrderingCallStaffFab />
      <main className="ordering-main"><Outlet /></main>
    </div>
  );
}

function OrderingBoundary() {
  const { sessionId } = useParams();
  if (!sessionId) return <SessionState state="missing" onRetry={async () => {}} />;

  return (
    <OrderingSessionProvider sessionId={sessionId}>
      <OrderingBoundaryContent />
    </OrderingSessionProvider>
  );
}

function OrderingBoundaryContent() {
  const { t } = useI18n();
  const { refresh, state } = useOrderingSessionBoundary();
  if (state === "loading") return <main className="ordering-state">{t("Đang xác minh phiên bàn…")}</main>;
  if (state !== "ready") return <SessionState state={state} onRetry={refresh} />;
  return <OrderingShell />;
}

export { OrderingBoundary as OrderingLayout };
