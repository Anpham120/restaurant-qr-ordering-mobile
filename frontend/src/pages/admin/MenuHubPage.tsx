import { AdminCategoryManager } from "../../components/admin/AdminCategoryManager";
import { AdminMenuManager } from "../../components/admin/AdminMenuManager";
import { CaPhucVuPanel } from "../../components/admin/CaPhucVuPanel";
import { ChuanBiThucDonPanel } from "../../components/admin/ChuanBiThucDonPanel";
import { OpsHubShell } from "../../components/operations/OpsHubShell";
import { useOpsHubTab } from "../../components/operations/OpsHubTabs";
import "../../components/operations/operations.css";
import "./menu-hub.css";

const MENU_TABS = [
  // Đặt ĐẦU TIÊN vì đây là việc làm mỗi ngày; hai tab kia là việc vài lần một năm.
  { id: "today", label: "Hôm nay" },
  { id: "items", label: "Món" },
  { id: "categories", label: "Danh mục" },
  // Khai ca là việc cấu hình một lần, nên đứng cuối — không phải việc mỗi ngày.
  { id: "periods", label: "Ca phục vụ" },
];

export function MenuHubPage() {
  const { activeTab } = useOpsHubTab(MENU_TABS);

  return (
    <OpsHubShell
      className="ops-hub-shell--menu"
      title="Thực đơn"
      description="Chuẩn bị thực đơn hôm nay, quản lý món và danh mục trên cùng một màn hình."
      tabs={MENU_TABS}
    >
      {activeTab === "today" ? <ChuanBiThucDonPanel /> : null}
      {activeTab === "items" ? <AdminMenuManager embedded /> : null}
      {activeTab === "categories" ? <AdminCategoryManager embedded /> : null}
      {activeTab === "periods" ? <CaPhucVuPanel /> : null}
    </OpsHubShell>
  );
}
