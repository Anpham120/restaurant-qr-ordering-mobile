import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "../operations/operations.css";

export type OpsHubTab = {
  id: string;
  label: string;
  adminOnly?: boolean;
  /** Ẩn với Admin — dành cho nhân viên quầy/bếp thao tác trực tiếp */
  counterOnly?: boolean;
  /**
   * Số việc đang chờ trong tab này.
   *
   * Vì sao cần: sáu panel của quầy đều dựng sẵn rồi ẩn, nên việc nằm trong tab KHÔNG mở là việc
   * không ai thấy. Người ở quầy phải bấm lần lượt qua từng tab mới biết chỗ nào có việc — và lúc
   * đông khách thì họ không bấm.
   *
   * `undefined` hoặc 0 thì không hiện gì. Một số 0 hiển thị ra là nhiễu: nó chiếm chỗ và bắt mắt
   * dừng lại để đọc một tin "không có gì".
   */
  badge?: number;
};

type OpsHubTabsProps = {
  tabs: OpsHubTab[];
  param?: string;
  isAdmin?: boolean;
  sticky?: boolean;
  defaultTabId?: string;
};

export function OpsHubTabs({ tabs, param = "tab", isAdmin = true, sticky = false, defaultTabId }: OpsHubTabsProps) {
  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.counterOnly && isAdmin) return false;
    return true;
  });
  const fallbackTab = visibleTabs.some((tab) => tab.id === defaultTabId)
    ? defaultTabId!
    : visibleTabs[0]?.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(param);
  const activeTab = visibleTabs.some((tab) => tab.id === requested) ? requested! : fallbackTab;

  const selectTab = useCallback((id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(param, id);
    setSearchParams(next, { replace: true });
  }, [param, searchParams, setSearchParams]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      const index = visibleTabs.findIndex((tab) => tab.id === activeTab);
      if (index === -1) return;
      event.preventDefault();
      const nextIndex = event.key === "ArrowRight"
        ? (index + 1) % visibleTabs.length
        : (index - 1 + visibleTabs.length) % visibleTabs.length;
      selectTab(visibleTabs[nextIndex]!.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, selectTab, visibleTabs]);

  return (
    <div className={`ops-hub-tabs${sticky ? " ops-hub-tabs--sticky" : ""}`} role="tablist" aria-label="Chuyển tab">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`ops-hub-tab${activeTab === tab.id ? " is-active" : ""}`}
          onClick={() => selectTab(tab.id)}
        >
          {tab.label}
          {/*
            Số đi kèm NHÃN CHỮ trong `aria-label`, không chỉ là con số trần: trình đọc màn hình đọc
            "Chờ thanh toán 3" nghe như một mã, còn "Chờ thanh toán, 3 việc đang chờ" là một câu.
          */}
          {tab.badge && tab.badge > 0 ? (
            <span className="ops-hub-tab-badge" aria-label={`${tab.badge} việc đang chờ`}>
              {tab.badge > 99 ? "99+" : tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function useOpsHubTab(
  tabs: OpsHubTab[],
  param = "tab",
  isAdmin = true,
  defaultTabId?: string,
) {
  const [searchParams] = useSearchParams();
  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.counterOnly && isAdmin) return false;
    return true;
  });
  const requested = searchParams.get(param);
  const fallbackTab = visibleTabs.some((tab) => tab.id === defaultTabId)
    ? defaultTabId!
    : visibleTabs[0]?.id ?? "";
  const activeTab = visibleTabs.some((tab) => tab.id === requested)
    ? requested!
    : fallbackTab;
  return { activeTab, visibleTabs };
}
