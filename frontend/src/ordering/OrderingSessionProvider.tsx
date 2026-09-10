import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  clearCustomerSession,
  loadOrderContext,
  saveOrderContext,
  type CustomerOrderContext,
} from "../components/customer/customerMenuStorage";
import { validateDineInSession } from "../services/tableSessionService";
import { matchSessionCapability } from "./sessionCapabilityStore";
import {
  appendQrToSessionPath,
  recoverTableSession,
  replaceSessionInPath,
} from "./sessionRecovery";

export type OrderingSessionState =
  | "loading" | "ready" | "missing" | "invalid" | "expired" | "settled" | "error";

type OrderingSessionValue = {
  context: Required<CustomerOrderContext> | null;
  refresh: () => Promise<void>;
  state: OrderingSessionState;
};

type ActiveOrderingSessionValue = Omit<OrderingSessionValue, "context"> & {
  context: Required<CustomerOrderContext>;
};

const OrderingSessionContext = createContext<OrderingSessionValue | null>(null);

function buildSessionRedirectPath(
  pathname: string,
  search: string,
  nextSessionId: string,
  qrToken: string,
): string {
  let path = appendQrToSessionPath(replaceSessionInPath(pathname, nextSessionId), qrToken);
  const focus = new URLSearchParams(search).get("focus");
  if (!focus) {
    return path;
  }

  const url = new URL(path, "http://local");
  url.searchParams.set("focus", focus);
  return `${url.pathname}${url.search}`;
}

async function validateCapability(
  capability: Required<CustomerOrderContext>,
): Promise<OrderingSessionState> {
  const validation = await validateDineInSession(
    capability.sessionId,
    capability.sessionToken,
    capability.tableCode,
  );

  if (validation.status === "open") {
    return "ready";
  }
  if (validation.status === "settled") {
    return "settled";
  }
  if (validation.status === "expired") {
    return "expired";
  }
  return validation.status === "error" ? "error" : "invalid";
}

export function OrderingSessionProvider({ children, sessionId }: { children: ReactNode; sessionId: string }) {
  const [context, setContext] = useState<Required<CustomerOrderContext> | null>(null);
  const [state, setState] = useState<OrderingSessionState>("loading");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const refresh = useCallback(async () => {
    setState("loading");

    const stored = loadOrderContext();
    const capabilityMatch = matchSessionCapability(stored, sessionId);
    let activeCapability = capabilityMatch === "matching"
      ? stored as Required<CustomerOrderContext>
      : null;

    if (!activeCapability) {
      const qrToken = searchParams.get("qr") ?? stored.qrToken ?? null;
      if (qrToken) {
        const recovery = await recoverTableSession(qrToken, stored.tableCode);
        if (recovery.status === "open") {
          activeCapability = recovery.capability;
        } else {
          setContext(null);
          setState(recovery.status === "expired" ? "expired" : recovery.status === "error" ? "error" : "invalid");
          return;
        }
      }
    }

    if (!activeCapability) {
      setContext(null);
      setState(capabilityMatch === "mismatch" ? "invalid" : "missing");
      return;
    }

    if (activeCapability.sessionId !== sessionId) {
      navigate(
        buildSessionRedirectPath(
          location.pathname,
          location.search,
          activeCapability.sessionId,
          activeCapability.qrToken,
        ),
        { replace: true },
      );
      return;
    }

    let nextState = await validateCapability(activeCapability);

    // ĐÃ THANH TOÁN THÌ DỪNG Ở ĐÂY, KHÔNG MỞ PHIÊN MỚI.
    //
    // Đường "cứu" bên dưới tồn tại cho phiên hết hạn hay mất quyền: mở lại một phiên từ mã QR đã
    // lưu là đúng việc cần làm khi khách vẫn đang ngồi ăn dở.
    //
    // Nhưng khách vừa trả tiền xong thì đó là việc SAI. Chỉ cần tab còn mở và trang tự làm mới là
    // một hoá đơn mới được sinh ra, bàn trông như có người ngồi, và không ai bấm gì cả.
    if (nextState === "settled") {
      setContext(null);
      setState("settled");
      return;
    }
    if (nextState !== "ready") {
      const qrToken = searchParams.get("qr") ?? activeCapability.qrToken ?? null;
      if (qrToken) {
        const recovery = await recoverTableSession(qrToken, activeCapability.tableCode);
        if (recovery.status === "open") {
          activeCapability = recovery.capability;
          if (activeCapability.sessionId !== sessionId) {
            navigate(
              buildSessionRedirectPath(
                location.pathname,
                location.search,
                activeCapability.sessionId,
                activeCapability.qrToken,
              ),
              { replace: true },
            );
            return;
          }
          nextState = await validateCapability(activeCapability);
        } else if (recovery.status === "expired") {
          clearCustomerSession();
          setContext(null);
          setState("expired");
          return;
        }
      }
    }

    if (nextState === "ready") {
      saveOrderContext(activeCapability);
      setContext(activeCapability);
      setState("ready");
      return;
    }

    if (nextState === "expired") {
      clearCustomerSession();
    }
    setContext(null);
    setState(nextState);
  }, [location.pathname, location.search, navigate, searchParams, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<OrderingSessionValue>(() => ({ context, refresh, state }), [context, refresh, state]);

  return (
    <OrderingSessionContext.Provider value={value}>
      {children}
    </OrderingSessionContext.Provider>
  );
}

export function useOrderingSession(): ActiveOrderingSessionValue {
  const value = useContext(OrderingSessionContext);
  if (!value || value.state !== "ready" || !value.context) {
    throw new Error("Ordering session is not ready.");
  }
  return value as ActiveOrderingSessionValue;
}

export function useOrderingSessionBoundary(): OrderingSessionValue {
  const value = useContext(OrderingSessionContext);
  if (!value) {
    throw new Error("Ordering session provider is missing.");
  }
  return value;
}
