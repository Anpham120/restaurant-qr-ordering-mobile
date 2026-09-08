import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@cmc/auth";
import { AdminInvoicesPanel } from "../AdminInvoicesPage";
import { StaffPaymentsPage } from "../StaffPaymentsPage";
import { CounterOverduePanel } from "./CounterOverduePanel";
import { CounterShiftPanel } from "./CounterShiftPanel";
import { CounterVoucherPanel } from "./CounterVoucherPanel";
import { OpsHubShell } from "../../components/operations/OpsHubShell";
import { OpsAssistancePanel } from "../../components/operations/OpsAssistancePanel";
import { useOpsAssistance } from "../../components/operations/OpsAssistanceProvider";
import { phutDaCho } from "../../components/operations/opsAssistanceQueue";
import { BellRing, Radio } from "lucide-react";
import { useOpsHubTab } from "../../components/operations/OpsHubTabs";
import { useOpsConnectionStatus } from "../../components/operations/OpsRealtimeProvider";
import { useOpsNavBadges } from "../../components/operations/OpsNavBadgesProvider";
import { hasPendingCounterPayments } from "../../services/opsSummaryService";
import "../../components/operations/operations.css";
import "./counter-hub.css";

const COUNTER_STAFF_TABS = [
  { id: "shift", label: "Ca làm việc" },
  { id: "vouchers", label: "Phiếu tặng món" },
  { id: "assistance", label: "Gọi nhân viên" },
  { id: "payments", label: "Chờ thanh toán" },
  { id: "overdue", label: "Bàn quá giờ" },
  { id: "invoices", label: "Lịch sử hóa đơn" },
];

const COUNTER_SUPERVISOR_TABS = [
  { id: "shift", label: "Giám sát ca" },
  { id: "overdue", label: "Bàn quá giờ" },
  { id: "invoices", label: "Lịch sử hóa đơn" },
];

export function CounterHubPage() {
  const { user } = useAuth();
  const isSupervisor = user?.role === "Admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const connectionStatus = useOpsConnectionStatus();
  const { recentAssistance, daDieuPhoiYeuCau } = useOpsAssistance();
  const { badges } = useOpsNavBadges();

  /*
    SỐ VIỆC CHỜ NGAY TRÊN NHÃN TAB.

    Sáu panel đều dựng sẵn rồi ẩn — quyết định đó đúng và được giữ, vì đổi tab không được xoá chữ
    người dùng đang gõ. Nhưng nó có một hệ quả: việc nằm trong tab KHÔNG mở là việc không ai thấy.
    Người ở quầy phải bấm lần lượt qua từng tab mới biết chỗ nào có việc, và lúc đông khách thì họ
    không bấm.

    Chỉ lấy con số từ dữ liệu ĐÃ CÓ trên máy khách. Thêm một lời gọi mạng cho mỗi tab là đổi một
    vấn đề hiển thị lấy một vấn đề tải — và hai tab còn lại (ca, phiếu tặng) không có khái niệm
    "đang chờ" nào rõ ràng để đếm, nên để trống thay vì bịa ra một con số.
  */
  const counterTabs = useMemo(() => {
    const goc = isSupervisor ? COUNTER_SUPERVISOR_TABS : COUNTER_STAFF_TABS;
    return goc.map((tab) => {
      if (tab.id === "assistance") return { ...tab, badge: recentAssistance.length };
      if (tab.id === "payments") return { ...tab, badge: badges.counter };
      return tab;
    });
  }, [isSupervisor, recentAssistance.length, badges.counter]);

  const { activeTab } = useOpsHubTab(counterTabs);
  const coTab = (id: string) => counterTabs.some((tab) => tab.id === id);

  useEffect(() => {
    if (isSupervisor || searchParams.get("tab")) return;
    let active = true;
    void hasPendingCounterPayments()
      .then((hasPending) => {
        if (!active || !hasPending) return;
        setSearchParams({ tab: "payments" }, { replace: true });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isSupervisor, searchParams, setSearchParams]);

  return (
    <OpsHubShell
      className="ops-hub-shell--counter"
      title={isSupervisor ? "Giám sát quầy" : "Quầy thu ngân"}
      description={isSupervisor
        ? "Xem tiền theo ca và lịch sử hóa đơn — không thao tác thu/chốt ca tại đây."
        : "Mở ca, thu tiền và tra cứu hóa đơn phiên bàn."}
      tabs={counterTabs}
      connectionStatus={connectionStatus}
    >
      {/*
        DẢI ĐIỀU PHỐI — nằm NGOÀI mọi tab, thấy được kể cả khi đang thu tiền ở tab khác.

        Nghiệp vụ: phục vụ bàn không cầm điện thoại, họ nhận lệnh qua bộ đàm. Quầy là điểm điều
        phối — nhận yêu cầu của khách, bấm bộ đàm, cử người tới bàn.

        Việc này ĐÃ có thông báo nổi (OpsToastProvider), nhưng thông báo đó tự tắt sau 5 GIÂY. Đủ
        cho một tin "có đơn mới"; quá ngắn cho một việc phải làm. Người ở quầy đang đếm tiền cho
        khách khác thì 5 giây trôi qua trước khi họ ngẩng lên, và yêu cầu rơi lại vào một tab bị
        động mà không ai đang mở.

        Nên dải này KHÔNG tự tắt: nó chỉ mất khi có người bấm "Đã điều phối", tức khi đã thật sự
        bấm bộ đàm. Số phút chờ hiện kèm vì đó là thứ quyết định bàn nào đi trước khi nhiều bàn
        cùng gọi — và là con số người đang bận không tự tính được.
      */}
      {recentAssistance.length > 0 ? (
        <section aria-live="assertive" className="counter-dispatch" role="status">
          <h2><BellRing aria-hidden="true" size={16} /> Bàn đang gọi nhân viên</h2>
          <ul>
            {recentAssistance.map((yc) => (
              <li key={yc.id}>
                <strong>Bàn {yc.tableCode}</strong>
                <span className="counter-dispatch-wait">
                  {phutDaCho(yc.requestedAt) === 0
                    ? "vừa gọi"
                    : `chờ ${phutDaCho(yc.requestedAt)} phút`}
                </span>
                {yc.note && yc.note !== "Yêu cầu gọi nhân viên" ? (
                  <span className="ops-muted">{yc.note}</span>
                ) : null}
                <button
                  className="ops-btn ops-btn--primary"
                  onClick={() => daDieuPhoiYeuCau(yc.id)}
                  type="button"
                >
                  <Radio aria-hidden="true" size={14} /> Đã điều phối
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/*
        DỰNG CẢ SÁU TAB, ẩn cái không hoạt động — KHÔNG dựng theo điều kiện.

        Dựng theo điều kiện thì đổi tab là HUỶ component, và mọi thứ đang gõ dở biến mất. Tình
        huống thật: đang gõ số tiền khách đưa, có bàn gọi nhân viên, bấm sang tab điều phối rồi
        quay lại — số đã gõ mất sạch, và người ở quầy phải hỏi lại khách đưa bao nhiêu.

        Không phải một chỗ: NĂM trong sáu panel giữ chữ người dùng đang gõ (ca, phiếu tặng, chờ
        thanh toán, bàn quá giờ, hoá đơn). Sửa riêng tab ca sẽ để lại đúng lỗi đó ở bốn chỗ còn
        lại, và người sau thêm tab thứ bảy lại rơi vào nó lần nữa.

        Giá phải trả: mỗi panel tải dữ liệu một lần lúc mở màn, và panel bàn quá giờ vẫn chạy nhịp
        60 giây khi đang ẩn. Một request mỗi phút cho một màn hình một người dùng — rẻ hơn nhiều so
        với việc bắt thu ngân gõ lại số tiền.

        Bọc bằng `div` trần chứ không đặt `hidden` lên chính panel: panel có class riêng, mà một
        luật CSS đặt `display` sẽ ĐÈ được thuộc tính `hidden` và làm nó vô hiệu trong im lặng.
      */}
      {/*
        `coTab` chứ không phải dựng tất: quản lý chỉ có ba tab, và mount cả sáu sẽ khiến trình
        duyệt của họ tải dữ liệu của những panel họ không được xem.
      */}
      {coTab("shift") ? (
        <div hidden={activeTab !== "shift"}>
          <CounterShiftPanel embedded supervisorMode={isSupervisor} />
        </div>
      ) : null}
      {coTab("vouchers") ? <div hidden={activeTab !== "vouchers"}><CounterVoucherPanel /></div> : null}
      {coTab("assistance") ? (
        <div hidden={activeTab !== "assistance"}>
          <OpsAssistancePanel
            emptyLabel="Chưa có bàn nào gọi nhân viên trong phiên này."
            title="Yêu cầu gọi nhân viên"
            items={recentAssistance}
          />
        </div>
      ) : null}
      {coTab("payments") ? <div hidden={activeTab !== "payments"}><StaffPaymentsPage embedded /></div> : null}
      {coTab("overdue") ? <div hidden={activeTab !== "overdue"}><CounterOverduePanel /></div> : null}
      {coTab("invoices") ? <div hidden={activeTab !== "invoices"}><AdminInvoicesPanel embedded /></div> : null}
    </OpsHubShell>
  );
}
